import fs from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createFileResponseHeaders, createPlaceholderImageBuffer, createPreviewPdfBuffer } from "@/lib/document-preview";
import { downloadFile, extractDriveFileId } from "@/lib/google-drive-client";
import { can } from "@/lib/rbac";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const documentVersion = await db.customerDocumentVersion.findFirst({
    where: {
      id,
      submission: {
        orgId: session.user.orgId,
      },
    },
    include: {
      submission: {
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
  const job = documentVersion.submission.job;
  const isConcernedUser = job.primaryOwnerId === actorId || job.assignments.some((assignment) => assignment.userId === actorId);
  const hasViewAll = await can(actorId, "cha.job.view_all");

  if (!isConcernedUser && !hasViewAll) {
    return new Response("Access Denied", { status: 403 });
  }

  const filename = documentVersion.fileName;
  const mimeType = documentVersion.mimeType || "application/octet-stream";
  const fileKey = documentVersion.fileKey || "";
  const { searchParams } = new URL(request.url);
  const forceDownload = searchParams.get("download") === "true";

  const absolutePath = path.join(process.cwd(), "public", fileKey);
  const localFileStat = await fs.stat(absolutePath).catch(() => null);
  if (localFileStat?.isFile()) {
    const fileBuffer = await fs.readFile(absolutePath);
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
      console.error("Error downloading Drive customer document preview:", error);
    }
  }

  const contentBuffer = mimeType === "application/pdf"
    ? createPreviewPdfBuffer({
      title: `Customer document preview - ${filename}`,
      detail: "This is a secure mock preview of the uploaded customer document.",
      sizeBytes: documentVersion.sizeBytes,
    })
    : mimeType.startsWith("image/")
      ? createPlaceholderImageBuffer()
      : Buffer.from(`Mock Content of ${filename}\nSize: ${documentVersion.sizeBytes} bytes`);

  const headers = createFileResponseHeaders({
    filename,
    mimeType,
    contentLength: contentBuffer.length,
    forceDownload,
  });

  return new Response(new Uint8Array(contentBuffer), { headers });
}
