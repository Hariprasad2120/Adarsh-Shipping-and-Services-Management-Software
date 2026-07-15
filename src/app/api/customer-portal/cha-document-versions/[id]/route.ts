import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { getPortalChaDocumentVersion } from "@/modules/customer-portal/service";

function getDriveFileId(fileKey: string): string | null {
  const match = fileKey.match(/\/file\/d\/([^/]+)\//);
  return match ? match[1] : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const version = await getPortalChaDocumentVersion(session.portalUserId, id);
  if (!version) {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const forceDownload = searchParams.get("download") === "true";
  const fileKey = version.fileKey ?? "";

  if (fileKey.startsWith("https://drive.google.com/")) {
    const fileId = getDriveFileId(fileKey);
    if (fileId) {
      const driveUrl = forceDownload
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : `https://drive.google.com/file/d/${fileId}/preview`;
      return Response.redirect(driveUrl, 302);
    }
  }

  const absolutePath = path.join(process.cwd(), "public", fileKey);
  const buffer = await fs.readFile(absolutePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": version.mimeType || "application/octet-stream",
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${version.fileName}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
