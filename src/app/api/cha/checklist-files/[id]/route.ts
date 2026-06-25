import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

function getDriveFileId(fileKey: string): string | null {
  const match = fileKey.match(/\/file\/d\/([^/]+)\//);
  return match ? match[1] : null;
}

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

    // Serve real file from Google Drive when fileKey is a Drive URL
    if (fileKey.startsWith("https://drive.google.com/")) {
      const fileId = getDriveFileId(fileKey);
      if (fileId) {
        const driveUrl = forceDownload
          ? `https://drive.google.com/uc?export=download&id=${fileId}`
          : `https://drive.google.com/file/d/${fileId}/preview`;
        return Response.redirect(driveUrl, 302);
      }
    }

    // Dev/mock fallback — synthetic content for placeholder keys
    let contentBuffer: Buffer;
    if (mimeType === "application/pdf") {
      contentBuffer = Buffer.from(
        `%PDF-1.4\n` +
        `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
        `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n` +
        `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n` +
        `5 0 obj\n<< /Length 100 >>\nstream\n` +
        `BT\n/F1 14 Tf\n50 750 Td\n(Simulated PDF Document - ${filename}) Tj\n` +
        `0 -20 Td\n(This is a secure mock preview of the uploaded checklist version.) Tj\n` +
        `0 -20 Td\n(Size: ${(fileVersion.fileSize / 1024).toFixed(1)} KB) Tj\n` +
        `ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000244 00000 n \n0000000314 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n465\n%%EOF`
      );
    } else if (mimeType.startsWith("image/")) {
      contentBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64"
      );
    } else {
      contentBuffer = Buffer.from(`Mock Content of ${filename}\nSize: ${fileVersion.fileSize} bytes`);
    }

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Content-Length", contentBuffer.length.toString());
    headers.set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'self';");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("X-Content-Type-Options", "nosniff");

    if (forceDownload) {
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
      headers.set("Content-Disposition", `inline; filename="${filename}"`);
    }

    return new Response(new Uint8Array(contentBuffer), { headers });
  } catch (error) {
    console.error("Error serving checklist preview:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
