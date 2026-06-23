"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";
import { createCommunicationAuditLog } from "./communication-audit.service";

export async function listDocuments(userId: string, orgId: string) {
  await requirePermission(userId, "communication.docs.access");

  return db.commDocument.findMany({
    where: { orgId },
    include: {
      createdBy: { select: { id: true, name: true } },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createDocument(
  userId: string,
  orgId: string,
  name: string,
  type: "DOCUMENT" | "SPREADSHEET" | "PRESENTATION",
  linkedRecordType?: string,
  linkedRecordId?: string
) {
  await requirePermission(userId, "communication.docs.access");

  const fileKey = `docs/${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;

  const doc = await db.$transaction(async (tx) => {
    const doc = await tx.commDocument.create({
      data: {
        orgId,
        name,
        fileKey,
        type,
        createdById: userId,
        linkedRecordType,
        linkedRecordId,
      },
    });

    // Create version 1
    await tx.commDocumentVersion.create({
      data: {
        orgId,
        documentId: doc.id,
        version: 1,
        fileKey,
        createdById: userId,
      },
    });

    return doc;
  });

  await createCommunicationAuditLog(orgId, userId, "CREATE_COLLAB_DOCUMENT", {
    documentId: doc.id,
    name,
    type,
  });

  return doc;
}

export async function getOnlyOfficeConfig(userId: string, orgId: string, documentId: string) {
  await requirePermission(userId, "communication.docs.access");

  const [doc, user, settings] = await Promise.all([
    db.commDocument.findUniqueOrThrow({
      where: { id: documentId, orgId },
    }),
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    }),
    db.communicationSetting.findUnique({
      where: { orgId },
    }),
  ]);

  // Return configurations mapping to ONLYOFFICE editor initiation keys
  return {
    document: {
      fileType: doc.type === "SPREADSHEET" ? "xlsx" : doc.type === "PRESENTATION" ? "pptx" : "docx",
      key: doc.fileKey.replace(/\//g, "_"),
      title: doc.name,
      url: `${settings?.onlyOfficeUrl || "https://documentserver.monolithengine.com"}/files/${doc.fileKey}`,
    },
    editorConfig: {
      mode: "edit",
      user: {
        id: user.id,
        name: user.name,
      },
      callbackUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/communication/docs/callback?id=${doc.id}`,
    },
    documentServerUrl: settings?.onlyOfficeUrl || "https://documentserver.monolithengine.com",
  };
}

export async function saveDocumentVersion(
  userId: string,
  orgId: string,
  documentId: string,
  fileKey: string
) {
  await requirePermission(userId, "communication.docs.access");

  let nextVer = 1;

  const updatedDoc = await db.$transaction(async (tx) => {
    const versions = await tx.commDocumentVersion.findMany({
      where: { documentId },
      orderBy: { version: "desc" },
      take: 1,
    });

    nextVer = (versions[0]?.version || 0) + 1;

    await tx.commDocumentVersion.create({
      data: {
        orgId,
        documentId,
        version: nextVer,
        fileKey,
        createdById: userId,
      },
    });

    const updatedDoc = await tx.commDocument.update({
      where: { id: documentId },
      data: {
        fileKey,
        updatedAt: await getNow(),
      },
    });

    return updatedDoc;
  });

  await createCommunicationAuditLog(orgId, userId, "SAVE_DOCUMENT_VERSION", {
    documentId,
    version: nextVer,
  });

  return updatedDoc;
}
