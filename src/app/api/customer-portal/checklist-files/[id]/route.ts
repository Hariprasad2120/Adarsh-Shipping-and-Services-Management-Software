import { getPortalSession } from "@/modules/customer-portal/auth";
import { db } from "@/lib/db";
import { createFileResponseHeaders, createPlaceholderImageBuffer, createPreviewPdfBuffer } from "@/lib/document-preview";
import { resolveInside } from "@/lib/security";
import * as driveClient from "@/lib/google-drive-client";
import fs from "fs/promises";
import path from "path";

const PORTAL_UPLOAD_ROOT = path.resolve(
  process.env.CUSTOMER_PORTAL_UPLOAD_ROOT || path.join(process.cwd(), "storage", "customer-portal-uploads"),
);

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
};

function getDriveFileId(fileKey: string): string | null {
  const match = fileKey.match(/\/file\/d\/([^/]+)\//);
  return match ? match[1] : null;
}

type PortalChecklistFileVersion =
  | {
    id: string;
    fileKey: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
  }
  | null;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id?: string; versionId?: string }> },
) {
  try {
    const session = await getPortalSession();
    if (!session?.portalUser?.id || !session.portalUser.customerId || !session.orgId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id, versionId } = await params;
    const checklistVersionId = id ?? versionId;
    if (!checklistVersionId) {
      return new Response("Checklist version not found", { status: 404 });
    }
    const fileVersion = await findPortalChecklistVersion(session.orgId, session.portalUser.customerId, checklistVersionId);

    if (!fileVersion) {
      return new Response("Checklist version not found", { status: 404 });
    }

    const filename = fileVersion.originalFileName;
    const mimeType = fileVersion.mimeType || inferMimeType(filename);
    const fileKey = fileVersion.fileKey || "";
    const { searchParams } = new URL(request.url);
    const forceDownload = searchParams.get("download") === "true";

    let contentBuffer: Buffer;
    const driveFileId = fileKey.startsWith("https://drive.google.com/") ? getDriveFileId(fileKey) : null;
    if (fileKey.startsWith("customer-portal-local:")) {
      let filePath: string;
      try {
        filePath = resolveInside(PORTAL_UPLOAD_ROOT, fileKey.slice("customer-portal-local:".length));
      } catch {
        return new Response("Invalid file path", { status: 400 });
      }
      const file = await fs.readFile(filePath).catch(() => null);
      if (!file) {
        return new Response("Checklist file not found", { status: 404 });
      }
      contentBuffer = file;
    } else if (!fileKey.startsWith("http") && fileKey.trim()) {
      let filePath: string;
      try {
        filePath = resolveInside(path.join(process.cwd(), "public"), fileKey);
      } catch {
        return new Response("Invalid file path", { status: 400 });
      }
      const file = await fs.readFile(filePath).catch(() => null);
      if (file) {
        contentBuffer = file;
      } else if (process.env.NODE_ENV === "production") {
        return new Response("Checklist file not found", { status: 404 });
      } else {
        contentBuffer = buildDevelopmentPreviewBuffer(filename, mimeType, fileVersion.fileSize);
      }
    } else if (driveFileId && !driveFileId.startsWith("mock-")) {
      contentBuffer = await driveClient.downloadFile(driveFileId);
    } else if (process.env.NODE_ENV === "production") {
      return new Response("Checklist file not found", { status: 404 });
    } else if (mimeType === "application/pdf") {
      contentBuffer = buildDevelopmentPreviewBuffer(filename, mimeType, fileVersion.fileSize);
    } else {
      contentBuffer = buildDevelopmentPreviewBuffer(filename, mimeType, fileVersion.fileSize);
    }

    const headers = createFileResponseHeaders({
      filename,
      mimeType,
      contentLength: contentBuffer.length,
      forceDownload,
    });

    return new Response(new Uint8Array(contentBuffer), { headers });
  } catch (error) {
    console.error("Error serving customer portal checklist file:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

function inferMimeType(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

function buildDevelopmentPreviewBuffer(filename: string, mimeType: string, sizeBytes: number) {
  if (mimeType === "application/pdf") {
    return createPreviewPdfBuffer({
      title: `Customer portal checklist - ${filename}`,
      detail: "This is a secure mock preview of the checklist file.",
      sizeBytes,
    });
  }
  if (mimeType.startsWith("image/")) {
    return createPlaceholderImageBuffer();
  }
  return Buffer.from(`Mock Content of ${filename}\nSize: ${sizeBytes} bytes`);
}

async function findPortalChecklistVersion(orgId: string, customerId: string, versionId: string): Promise<PortalChecklistFileVersion> {
  return db.chaChecklistFileVersion.findFirst({
    where: {
      id: versionId,
      checklist: {
        job: {
          orgId,
          customerId,
          deletedAt: null,
        },
        customerApprovalVisibleAt: { not: null },
      },
    },
    select: {
      id: true,
      fileKey: true,
      originalFileName: true,
      mimeType: true,
      fileSize: true,
    },
  });
}
