import { getPortalSession } from "@/modules/customer-portal/auth";
import { db } from "@/lib/db";
import { createFileResponseHeaders, createPlaceholderImageBuffer, createPreviewPdfBuffer } from "@/lib/document-preview";
import * as driveClient from "@/lib/google-drive-client";
import { resolveInside } from "@/lib/security";
import fs from "fs/promises";
import path from "path";

const PORTAL_UPLOAD_ROOT = path.resolve(
  process.env.CUSTOMER_PORTAL_UPLOAD_ROOT || path.join(process.cwd(), "storage", "customer-portal-uploads"),
);

function getDriveFileId(fileKey: string): string | null {
  const match = fileKey.match(/\/file\/d\/([^/]+)\//);
  return match ? match[1] : null;
}

type PortalDocumentVersion =
  | {
    id: string;
    fileKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }
  | null;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    const session = await getPortalSession();
    if (!session?.portalUser?.id || !session.portalUser.customerId || !session.orgId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { versionId } = await params;
    const documentVersion = await findPortalDocumentVersion(session.orgId, session.portalUser.customerId, versionId);

    if (!documentVersion) {
      return new Response("Document version not found", { status: 404 });
    }

    const filename = documentVersion.fileName;
    const mimeType = documentVersion.mimeType || "application/octet-stream";
    const fileKey = documentVersion.fileKey || "";
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
        return new Response("Document file not found", { status: 404 });
      }
      contentBuffer = file;
    } else if (driveFileId && !driveFileId.startsWith("mock-")) {
      contentBuffer = await driveClient.downloadFile(driveFileId);
    } else if (process.env.NODE_ENV === "production") {
      return new Response("Document file not found", { status: 404 });
    } else if (mimeType === "application/pdf") {
      contentBuffer = createPreviewPdfBuffer({
        title: `Customer portal document - ${filename}`,
        detail: "This is a secure mock preview of the uploaded document.",
        sizeBytes: documentVersion.sizeBytes,
      });
    } else if (mimeType.startsWith("image/")) {
      contentBuffer = createPlaceholderImageBuffer();
    } else {
      contentBuffer = Buffer.from(`Mock Content of ${filename}\nSize: ${documentVersion.sizeBytes} bytes`);
    }

    const headers = createFileResponseHeaders({
      filename,
      mimeType,
      contentLength: contentBuffer.length,
      forceDownload,
    });

    return new Response(new Uint8Array(contentBuffer), { headers });
  } catch (error) {
    console.error("Error serving customer portal document:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

async function findPortalDocumentVersion(orgId: string, customerId: string, versionId: string): Promise<PortalDocumentVersion> {
  const chaDocumentVersion = await db.chaDocumentVersion.findFirst({
    where: {
      id: versionId,
      requirement: {
        job: {
          orgId,
          customerId,
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      fileKey: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
    },
  });

  if (chaDocumentVersion) {
    return chaDocumentVersion;
  }

  return db.customerDocumentVersion.findFirst({
    where: {
      id: versionId,
      submission: {
        orgId,
        customerId,
        job: {
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      fileKey: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
    },
  });
}
