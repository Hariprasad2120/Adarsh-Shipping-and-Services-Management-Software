"use server";

import { db } from "@/lib/db";
import { provisionJobWorkspace } from "@/lib/workspace-provisioning";
import * as driveClient from "@/lib/google-drive-client";
import { resolveDriveFolderForCategory } from "@/modules/cha/service";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getValidAccessToken } from "@/lib/workspace-oauth";

const CHECKLIST_DOCUMENT_CATEGORY = "Checklist Documents";
const FILING_DOCUMENT_CATEGORY = "Filing Documents";
const CUSTOMS_VALIDITY_CATEGORY = "Customs Validity Documents";

function isUnsyncedFileKey(fileKey: string | null | undefined) {
  if (!fileKey) return true;
  return (
    fileKey.startsWith("blob:") ||
    fileKey.startsWith("cha/docs/") ||
    fileKey.includes("mock-")
  );
}

async function uploadPlaceholderFile(params: {
  parentFolderId: string;
  name: string;
  uploadedById?: string | null;
  uploadedAt?: Date | null;
  sizeBytes?: number | null;
  mimeType?: string | null;
  note: string;
  accessToken?: string;
}) {
  const fileContent =
    `Document Name: ${params.name}\n` +
    `Uploaded By ID: ${params.uploadedById || "Unknown"}\n` +
    `Upload Date: ${params.uploadedAt?.toISOString() || "Unknown"}\n` +
    `File Size: ${params.sizeBytes ?? 0} bytes\n` +
    `Mime Type: ${params.mimeType || "application/octet-stream"}\n\n` +
    `${params.note}`;

  const buffer = Buffer.from(fileContent, "utf8");
  return driveClient.uploadFile({
    name: params.name.endsWith(".txt") ? params.name : `${params.name}.txt`,
    mimeType: "text/plain",
    parentFolderId: params.parentFolderId,
    fileBuffer: buffer,
    accessToken: params.accessToken,
  });
}

async function syncStoredFile(params: {
  fileKey: string | null | undefined;
  fileName: string;
  mimeType: string;
  uploadedById?: string | null;
  uploadedAt?: Date | null;
  sizeBytes?: number | null;
  parentFolderId: string;
  accessToken?: string;
  placeholderNote: string;
}) {
  const currentFileKey = params.fileKey || "";
  const driveFileId = driveClient.extractDriveFileId(currentFileKey);

  if (driveFileId) {
    const metadata = await driveClient.getFileMetadata(driveFileId, params.accessToken);
    if (metadata?.parents?.includes(params.parentFolderId) && metadata.webViewLink) {
      return { fileKey: metadata.webViewLink, mode: "already-synced" as const };
    }
    if (metadata) {
      const copied = await driveClient.copyFileToFolder({
        fileId: metadata.id,
        parentFolderId: params.parentFolderId,
        name: params.fileName,
        accessToken: params.accessToken,
      });
      return { fileKey: copied.webViewLink, mode: "copied-drive-file" as const };
    }
  }

  if (!isUnsyncedFileKey(currentFileKey) && /^https?:\/\//i.test(currentFileKey)) {
    try {
      const response = await fetch(currentFileKey);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const uploaded = await driveClient.uploadFile({
          name: params.fileName,
          mimeType: params.mimeType || "application/octet-stream",
          parentFolderId: params.parentFolderId,
          fileBuffer: buffer,
          accessToken: params.accessToken,
        });
        return { fileKey: uploaded.webViewLink, mode: "re-uploaded-from-url" as const };
      }
    } catch (error) {
      console.warn("[SyncJobWorkspaceAction] Failed to fetch existing file URL for resync:", error);
    }
  }

  const placeholder = await uploadPlaceholderFile({
    parentFolderId: params.parentFolderId,
    name: params.fileName,
    uploadedById: params.uploadedById,
    uploadedAt: params.uploadedAt,
    sizeBytes: params.sizeBytes,
    mimeType: params.mimeType,
    note: params.placeholderNote,
    accessToken: params.accessToken,
  });
  return { fileKey: placeholder.webViewLink, mode: "placeholder" as const };
}

export async function syncJobWorkspaceAction(jobId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const userId = session.user.id;

    await provisionJobWorkspace(jobId, true, userId);

    let userAccessToken: string | undefined;
    try {
      userAccessToken = await getValidAccessToken(userId);
    } catch (e) {
      console.warn("[SyncJobWorkspaceAction] Could not get user access token:", e);
    }

    const profile = await db.jobWorkspaceProfile.findUnique({
      where: { jobId },
    });

    if (!profile || !profile.rootFolderId || profile.rootFolderId.startsWith("mock-")) {
      throw new Error("Workspace folder provisioning failed or returned mock folder ID.");
    }

    const categoryFolders = (profile.categoryFolders as Record<string, string>) || {};
    const resolveFolderId = (category: string) =>
      resolveDriveFolderForCategory(categoryFolders, profile.rootFolderId, category) || profile.rootFolderId!;

    let syncedCount = 0;
    let placeholderCount = 0;

    const documentVersions = await db.chaDocumentVersion.findMany({
      where: {
        requirement: {
          jobId,
        },
      },
      include: {
        requirement: {
          select: {
            category: true,
            name: true,
          },
        },
      },
    });

    for (const version of documentVersions) {
      const result = await syncStoredFile({
        fileKey: version.fileKey,
        fileName: version.fileName,
        mimeType: version.mimeType,
        uploadedById: version.uploadedById,
        uploadedAt: version.uploadedAt,
        sizeBytes: version.sizeBytes,
        parentFolderId: resolveFolderId(version.requirement.category),
        accessToken: userAccessToken,
        placeholderNote:
          `[Monolith Sync] Placeholder created while syncing historical CHA document "${version.requirement.name}". Original file bytes were not available on the server.`,
      });

      if (result.fileKey !== version.fileKey) {
        await db.chaDocumentVersion.update({
          where: { id: version.id },
          data: { fileKey: result.fileKey },
        });
      }
      syncedCount += 1;
      if (result.mode === "placeholder") placeholderCount += 1;
    }

    const checklistVersions = await db.chaChecklistFileVersion.findMany({
      where: {
        checklist: {
          jobId,
        },
      },
    });

    for (const version of checklistVersions) {
      const result = await syncStoredFile({
        fileKey: version.fileKey,
        fileName: version.originalFileName,
        mimeType: version.mimeType,
        uploadedById: version.uploadedById,
        uploadedAt: version.uploadedAt,
        sizeBytes: version.fileSize,
        parentFolderId: resolveFolderId(CHECKLIST_DOCUMENT_CATEGORY),
        accessToken: userAccessToken,
        placeholderNote:
          "[Monolith Sync] Placeholder created while syncing a historical checklist approval file. Original file bytes were not available on the server.",
      });

      if (result.fileKey !== version.fileKey) {
        await db.chaChecklistFileVersion.update({
          where: { id: version.id },
          data: { fileKey: result.fileKey },
        });
      }
      syncedCount += 1;
      if (result.mode === "placeholder") placeholderCount += 1;
    }

    const filingAttachments = await db.filingAttachment.findMany({
      where: {
        instance: {
          jobId,
        },
      },
    });

    for (const attachment of filingAttachments) {
      const result = await syncStoredFile({
        fileKey: attachment.fileKey,
        fileName: attachment.fileName,
        mimeType: attachment.fileType,
        uploadedById: attachment.uploadedById,
        uploadedAt: attachment.uploadedAt,
        sizeBytes: attachment.fileSize,
        parentFolderId: resolveFolderId(FILING_DOCUMENT_CATEGORY),
        accessToken: userAccessToken,
        placeholderNote:
          "[Monolith Sync] Placeholder created while syncing a historical filing attachment. Original file bytes were not available on the server.",
      });

      if (result.fileKey !== attachment.fileKey) {
        await db.filingAttachment.update({
          where: { id: attachment.id },
          data: { fileKey: result.fileKey },
        });
      }
      syncedCount += 1;
      if (result.mode === "placeholder") placeholderCount += 1;
    }

    const additionalData = await db.chaJobAdditionalData.findFirst({
      where: { jobId },
      select: {
        id: true,
        doDocumentFileKey: true,
        doDocumentFileName: true,
        doDocumentUploadedAt: true,
        doDocumentUploadedById: true,
      },
    });

    if (additionalData?.doDocumentFileKey && additionalData.doDocumentFileName) {
      const result = await syncStoredFile({
        fileKey: additionalData.doDocumentFileKey,
        fileName: additionalData.doDocumentFileName,
        mimeType: "application/octet-stream",
        uploadedById: additionalData.doDocumentUploadedById,
        uploadedAt: additionalData.doDocumentUploadedAt,
        parentFolderId: resolveFolderId(CUSTOMS_VALIDITY_CATEGORY),
        accessToken: userAccessToken,
        placeholderNote:
          "[Monolith Sync] Placeholder created while syncing the historical Delivery Order document. Original file bytes were not available on the server.",
      });

      if (result.fileKey !== additionalData.doDocumentFileKey) {
        await db.chaJobAdditionalData.update({
          where: { id: additionalData.id },
          data: { doDocumentFileKey: result.fileKey },
        });
      }
      syncedCount += 1;
      if (result.mode === "placeholder") placeholderCount += 1;
    }

    const doExtensions = await db.chaDoExtension.findMany({
      where: { jobId },
    });

    for (const extension of doExtensions) {
      if (!extension.fileKey || !extension.fileName) continue;
      const result = await syncStoredFile({
        fileKey: extension.fileKey,
        fileName: extension.fileName,
        mimeType: "application/octet-stream",
        uploadedById: extension.appliedById,
        uploadedAt: extension.createdAt,
        parentFolderId: resolveFolderId(CUSTOMS_VALIDITY_CATEGORY),
        accessToken: userAccessToken,
        placeholderNote:
          "[Monolith Sync] Placeholder created while syncing a historical Delivery Order extension file. Original file bytes were not available on the server.",
      });

      if (result.fileKey !== extension.fileKey) {
        await db.chaDoExtension.update({
          where: { id: extension.id },
          data: { fileKey: result.fileKey },
        });
      }
      syncedCount += 1;
      if (result.mode === "placeholder") placeholderCount += 1;
    }

    const section49Extensions = await db.filingSection49Extension.findMany({
      where: { jobId },
    });

    for (const extension of section49Extensions) {
      if (!extension.fileKey || !extension.fileName) continue;
      const result = await syncStoredFile({
        fileKey: extension.fileKey,
        fileName: extension.fileName,
        mimeType: "application/octet-stream",
        uploadedById: extension.appliedById,
        uploadedAt: extension.createdAt,
        parentFolderId: resolveFolderId(CUSTOMS_VALIDITY_CATEGORY),
        accessToken: userAccessToken,
        placeholderNote:
          "[Monolith Sync] Placeholder created while syncing a historical Section 49 extension file. Original file bytes were not available on the server.",
      });

      if (result.fileKey !== extension.fileKey) {
        await db.filingSection49Extension.update({
          where: { id: extension.id },
          data: { fileKey: result.fileKey },
        });
      }
      syncedCount += 1;
      if (result.mode === "placeholder") placeholderCount += 1;
    }

    revalidatePath(`/communication/drive`);
    revalidatePath(`/cha/jobs/${jobId}`);
    return {
      ok: true,
      syncedCount,
      placeholderCount,
    };
  } catch (err: any) {
    console.error("[SyncJobWorkspaceAction] Error:", err);
    return { ok: false, error: err.message || "Failed to sync workspace" };
  }
}
