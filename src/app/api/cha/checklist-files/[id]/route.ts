import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
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
    const fileVersion = await db.chaChecklistFileVersion.findFirst({
      where: {
        id,
        checklist: {
          job: {
            orgId: session.user.orgId,
          },
        },
      },
      include: {
        checklist: {
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

    if (!fileVersion) {
      return new Response("Checklist version not found", { status: 404 });
    }

    const actorId = session.user.id;
    const job = fileVersion.checklist.job;
    const isConcernedUser =
      job.primaryOwnerId === actorId ||
      job.assignments.some((a) => a.userId === actorId);

    const hasViewAll = await can(actorId, "cha.job.view_all");

    if (!isConcernedUser && !hasViewAll) {
      return new Response("Access Denied", { status: 403 });
    }

    const filename = fileVersion.originalFileName;
    const mimeType = fileVersion.mimeType || "application/octet-stream";
    const fileKey = fileVersion.fileKey || "";

    const { searchParams } = new URL(request.url);
    const forceDownload = searchParams.get("download") === "true";

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
        console.error("Error downloading Drive checklist preview:", error);
      }
    }

    // Dev/mock fallback — synthetic content for placeholder keys
    let contentBuffer: Buffer;
    if (mimeType === "application/pdf") {
      contentBuffer = createPreviewPdfBuffer({
        title: `Checklist preview - ${filename}`,
        detail: "This is a secure mock preview of the uploaded checklist version.",
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
    console.error("Error serving checklist preview:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
