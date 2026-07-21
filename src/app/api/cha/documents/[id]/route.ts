import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import fs from "fs/promises";
import path from "path";
import { createFileResponseHeaders, createPlaceholderImageBuffer, createPreviewPdfBuffer } from "@/lib/document-preview";
import { downloadFile, extractDriveFileId } from "@/lib/google-drive-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const documentVersion = await db.chaDocumentVersion.findFirst({
      where: {
        id,
        requirement: {
          job: {
            orgId: session.user.orgId,
          },
        },
      },
      include: {
        requirement: {
          include: {
            job: {
              include: {
                assignments: true,
              },
            },
          },
        },
      },
    });

    if (!documentVersion) {
      return new Response("Document version not found", { status: 404 });
    }

    const actorId = session.user.id;
    const job = documentVersion.requirement.job;
    const isConcernedUser =
      job.primaryOwnerId === actorId ||
      job.assignments.some((a) => a.userId === actorId);

    const hasViewAll = await can(actorId, "cha.job.view_all");

    if (!isConcernedUser && !hasViewAll) {
      return new Response("Access Denied", { status: 403 });
    }

    const filename = documentVersion.fileName;
    const mimeType = documentVersion.mimeType || "application/octet-stream";
    const fileKey = documentVersion.fileKey || "";

    const { searchParams } = new URL(request.url);
    const forceDownload = searchParams.get("download") === "true";

    const localFilePath = path.join(process.cwd(), "public", fileKey);
    const localFileStat = await fs.stat(localFilePath).catch(() => null);
    if (localFileStat?.isFile()) {
      const fileBuffer = await fs.readFile(localFilePath);
      const headers = createFileResponseHeaders({
        filename,
        mimeType,
        contentLength: fileBuffer.length,
        forceDownload,
      });
      return new Response(fileBuffer, { headers });
    }

    const driveFileId = extractDriveFileId(fileKey);
    if (driveFileId && !driveFileId.startsWith("mock-")) {
      try {
        const fileBuffer = await downloadFile(driveFileId);
        const headers = createFileResponseHeaders({
          filename,
          mimeType,
          contentLength: fileBuffer.length,
          forceDownload,
        });
        return new Response(new Uint8Array(fileBuffer), { headers });
      } catch (error) {
        console.error("Error downloading Drive document preview:", error);
      }
    }

    // Dev/mock fallback — synthetic content for placeholder keys
    let contentBuffer: Buffer;
    if (mimeType === "application/pdf") {
      contentBuffer = createPreviewPdfBuffer({
        title: `Document preview - ${filename}`,
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
    console.error("Error serving document preview:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
