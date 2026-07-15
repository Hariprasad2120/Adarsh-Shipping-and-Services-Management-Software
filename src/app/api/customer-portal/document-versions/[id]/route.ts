import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { getPortalDocumentVersion } from "@/modules/customer-portal/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const version = await getPortalDocumentVersion(session.portalUserId, id);
  if (!version) {
    return new Response("Not found", { status: 404 });
  }
  const absolutePath = path.join(process.cwd(), "public", version.fileKey);
  const buffer = await fs.readFile(absolutePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": version.mimeType,
      "Content-Disposition": `inline; filename="${version.fileName}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
