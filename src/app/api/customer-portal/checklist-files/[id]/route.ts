import { getPortalSession } from "@/modules/customer-portal/auth";
import { db } from "@/lib/db";
import { createFileResponseHeaders, createPlaceholderImageBuffer, createPreviewPdfBuffer } from "@/lib/document-preview";
import * as driveClient from "@/lib/google-drive-client";

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
    const mimeType = fileVersion.mimeType || "application/octet-stream";
    const fileKey = fileVersion.fileKey || "";
    const { searchParams } = new URL(request.url);
    const forceDownload = searchParams.get("download") === "true";

    let contentBuffer: Buffer;
    const driveFileId = fileKey.startsWith("https://drive.google.com/") ? getDriveFileId(fileKey) : null;
    if (driveFileId && !driveFileId.startsWith("mock-")) {
      contentBuffer = await driveClient.downloadFile(driveFileId);
    } else if (mimeType === "application/pdf") {
      contentBuffer = createPreviewPdfBuffer({
        title: `Customer portal checklist - ${filename}`,
        detail: "This is a secure mock preview of the checklist file.",
        sizeBytes: fileVersion.fileSize,
      });
    } else if (mimeType.startsWith("image/")) {
      contentBuffer = createPlaceholderImageBuffer();
    } else {
      contentBuffer = Buffer.from(`Mock Content of ${filename}\nSize: ${fileVersion.fileSize} bytes`);
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
