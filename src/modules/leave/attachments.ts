import { db } from "@/lib/db";
import {
  createFolder,
  findFolders,
  getDriveAccessTokenForOrg,
  uploadFile,
} from "@/lib/google-drive-client";
import { writeLeaveAudit } from "@/modules/leave/audit";

const ROOT_FOLDER_NAME = "Monolith Leave Attachments";
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

const cachedRootFolderId: Map<string, string> = new Map();

async function getOrCreateLeaveAttachmentsFolder(orgId: string, accessToken: string) {
  const cached = cachedRootFolderId.get(orgId);
  if (cached) return cached;

  const existing = await findFolders({ name: ROOT_FOLDER_NAME, accessToken });
  const folderId = existing[0]?.id ?? (await createFolder({ name: ROOT_FOLDER_NAME, accessToken }));
  cachedRootFolderId.set(orgId, folderId);
  return folderId;
}

export interface UploadLeaveAttachmentInput {
  orgId: string;
  requestId: string;
  uploadedById: string;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}

/**
 * Persists a leave request attachment via the existing Google-Drive-backed
 * storage layer (reused from src/modules/hrms/document-drive.ts's provider,
 * not its category-specific folder logic) rather than a new storage system
 * (closes audit gap §9 — the attachmentIds field was previously accepted
 * but never persisted).
 */
export async function uploadLeaveAttachment(input: UploadLeaveAttachmentInput) {
  if (input.fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Attachment exceeds maximum size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
  }

  const accessToken = await getDriveAccessTokenForOrg(input.orgId);
  const folderId = await getOrCreateLeaveAttachmentsFolder(input.orgId, accessToken);

  const uploaded = await uploadFile({
    name: `${input.requestId}-${input.fileName}`,
    mimeType: input.mimeType,
    parentFolderId: folderId,
    fileBuffer: input.fileBuffer,
    accessToken,
  });

  const attachment = await db.leaveRequestAttachment.create({
    data: {
      requestId: input.requestId,
      driveFileId: uploaded.id,
      fileName: input.fileName,
      uploadedById: input.uploadedById,
    },
  });

  await writeLeaveAudit({
    orgId: input.orgId,
    userId: input.uploadedById,
    action: "LEAVE_ATTACHMENT_UPLOADED",
    details: { requestId: input.requestId, attachmentId: attachment.id, fileName: input.fileName },
  });

  return attachment;
}

export async function listLeaveAttachments(requestId: string) {
  return db.leaveRequestAttachment.findMany({ where: { requestId }, orderBy: { createdAt: "asc" } });
}
