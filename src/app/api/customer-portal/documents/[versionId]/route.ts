import { getPortalSession } from "@/modules/customer-portal/auth";
import { db } from "@/lib/db";
import * as driveClient from "@/lib/google-drive-client";

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
    if (driveFileId && !driveFileId.startsWith("mock-")) {
      contentBuffer = await driveClient.downloadFile(driveFileId);
    } else if (mimeType === "application/pdf") {
      contentBuffer = Buffer.from(
        `%PDF-1.4\n` +
        `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
        `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n` +
        `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n` +
        `5 0 obj\n<< /Length 100 >>\nstream\n` +
        `BT\n/F1 14 Tf\n50 750 Td\n(Customer Portal Document - ${filename}) Tj\n` +
        `0 -20 Td\n(This is a secure mock download of the uploaded document.) Tj\n` +
        `0 -20 Td\n(Size: ${(documentVersion.sizeBytes / 1024).toFixed(1)} KB) Tj\n` +
        `ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000244 00000 n \n0000000314 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n465\n%%EOF`,
      );
    } else if (mimeType.startsWith("image/")) {
      contentBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64",
      );
    } else {
      contentBuffer = Buffer.from(`Mock Content of ${filename}\nSize: ${documentVersion.sizeBytes} bytes`);
    }

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Content-Length", contentBuffer.length.toString());
    headers.set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'self';");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
      "Content-Disposition",
      `${forceDownload ? "attachment" : "inline"}; filename="${filename}"`,
    );

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
