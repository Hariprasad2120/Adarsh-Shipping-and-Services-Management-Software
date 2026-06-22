"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";
import { notifyFileShared } from "./communication-notification.service";
import { createCommunicationAuditLog } from "./communication-audit.service";

export async function listDriveContents(
  userId: string,
  orgId: string,
  folderId: string | null,
  scope: "personal" | "organization" | "employee"
) {
  await requirePermission(userId, "communication.files.access");

  // Load folders in this level
  const folders = await db.fileFolder.findMany({
    where: {
      orgId,
      parentId: folderId,
      scope,
      OR: [
        { scope: "personal", createdById: userId },
        { scope: { in: ["organization", "employee"] } },
      ],
    },
    orderBy: { name: "asc" },
  });

  // Load file assets in this level
  const files = await db.fileAsset.findMany({
    where: {
      orgId,
      folderId,
      scope,
      OR: [
        { scope: "personal", createdById: userId },
        { scope: { in: ["organization", "employee"] } },
      ],
    },
    orderBy: { name: "asc" },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  return { folders, files };
}

export async function createDriveFolder(
  userId: string,
  orgId: string,
  name: string,
  parentId: string | null,
  scope: string
) {
  await requirePermission(userId, "communication.files.access");

  const folder = await db.fileFolder.create({
    data: {
      orgId,
      name,
      parentId,
      scope,
      createdById: userId,
    },
  });

  await createCommunicationAuditLog(orgId, userId, "CREATE_DRIVE_FOLDER", {
    folderId: folder.id,
    name,
  });

  return folder;
}

export async function uploadDriveFile(
  userId: string,
  orgId: string,
  data: {
    name: string;
    fileKey: string;
    mimeType: string;
    sizeBytes: number;
    folderId: string | null;
    scope: string;
  }
) {
  await requirePermission(userId, "communication.files.access");

  const file = await db.$transaction(async (tx) => {
    // 1. Create FileAsset record
    const file = await tx.fileAsset.create({
      data: {
        orgId,
        name: data.name,
        fileKey: data.fileKey,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        folderId: data.folderId,
        scope: data.scope,
        createdById: userId,
      },
    });

    // 2. Create the first FileVersion record
    await tx.fileVersion.create({
      data: {
        orgId,
        fileAssetId: file.id,
        version: 1,
        fileKey: data.fileKey,
        sizeBytes: data.sizeBytes,
        createdById: userId,
      },
    });

    return file;
  });

  await createCommunicationAuditLog(orgId, userId, "UPLOAD_DRIVE_FILE", {
    fileId: file.id,
    name: data.name,
  });

  return file;
}

export async function uploadNewVersion(
  userId: string,
  orgId: string,
  fileAssetId: string,
  data: {
    fileKey: string;
    sizeBytes: number;
  }
) {
  await requirePermission(userId, "communication.files.access");

  const asset = await db.fileAsset.findUniqueOrThrow({
    where: { id: fileAssetId, orgId },
  });

  let nextVer = 1;

  const updated = await db.$transaction(async (tx) => {
    // Find highest version number
    const versions = await tx.fileVersion.findMany({
      where: { fileAssetId },
      orderBy: { version: "desc" },
      take: 1,
    });

    nextVer = (versions[0]?.version || 0) + 1;

    // Create file version
    await tx.fileVersion.create({
      data: {
        orgId,
        fileAssetId,
        version: nextVer,
        fileKey: data.fileKey,
        sizeBytes: data.sizeBytes,
        createdById: userId,
      },
    });

    // Update main asset pointer and sizes
    const updated = await tx.fileAsset.update({
      where: { id: fileAssetId },
      data: {
        fileKey: data.fileKey,
        sizeBytes: data.sizeBytes,
      },
    });

    return updated;
  });

  await createCommunicationAuditLog(orgId, userId, "UPLOAD_FILE_VERSION", {
    fileAssetId,
    version: nextVer,
  });

  return updated;
}

export async function shareFile(
  userId: string,
  orgId: string,
  fileId: string,
  targetUserId: string,
  role: "VIEWER" | "EDITOR"
) {
  await requirePermission(userId, "communication.files.access");

  const owner = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true },
  });
  const file = await db.fileAsset.findUniqueOrThrow({
    where: { id: fileId, orgId },
  });

  const perm = await db.$transaction(async (tx) => {
    const perm = await tx.filePermission.create({
      data: {
        orgId,
        fileAssetId: fileId,
        userId: targetUserId,
        role,
      },
    });

    await notifyFileShared(orgId, owner.name, targetUserId, file.name, fileId);
    return perm;
  });

  await createCommunicationAuditLog(orgId, userId, "SHARE_DRIVE_FILE", {
    fileId,
    targetUserId,
    role,
  });

  return perm;
}

export async function generateShareLink(
  userId: string,
  orgId: string,
  fileAssetId: string,
  isPublic: boolean,
  expiresDays?: number
) {
  await requirePermission(userId, "communication.files.access");

  const token = `share-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
  let expiresAt: Date | null = null;

  if (expiresDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresDays);
  }

  return db.fileShareLink.create({
    data: {
      orgId,
      fileAssetId,
      token,
      isPublic,
      expiresAt,
      createdById: userId,
    },
  });
}

export async function deleteDriveFile(userId: string, orgId: string, fileId: string) {
  await requirePermission(userId, "communication.files.access");

  const file = await db.fileAsset.findUniqueOrThrow({
    where: { id: fileId, orgId },
  });

  if (file.createdById !== userId) {
    throw new Error("Unauthorized to delete this file");
  }

  await db.fileAsset.delete({
    where: { id: fileId },
  });

  await createCommunicationAuditLog(orgId, userId, "DELETE_DRIVE_FILE", { fileId });
  return { success: true };
}
