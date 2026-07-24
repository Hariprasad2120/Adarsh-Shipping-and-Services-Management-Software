import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createFileResponseHeaders } from "@/lib/document-preview";
import { resolveInside } from "@/lib/security";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { getPortalDocumentVersion } from "@/modules/customer-portal/service";

const PORTAL_UPLOAD_ROOT = path.resolve(
  process.env.CUSTOMER_PORTAL_UPLOAD_ROOT || path.join(process.cwd(), "storage", "customer-portal-uploads"),
);

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
  let absolutePath: string;
  try {
    absolutePath = version.fileKey.startsWith("customer-portal-local:")
      ? resolveInside(PORTAL_UPLOAD_ROOT, version.fileKey.slice("customer-portal-local:".length))
      : resolveInside(path.join(process.cwd(), "public"), version.fileKey);
  } catch {
    return new Response("Invalid file path", { status: 400 });
  }

  const buffer = await fs.readFile(absolutePath).catch(() => null);
  if (!buffer) {
    return new Response("Not found", { status: 404 });
  }
  const headers = createFileResponseHeaders({
    filename: version.fileName,
    mimeType: version.mimeType,
    contentLength: buffer.length,
    forceDownload: false,
  });
  return new NextResponse(buffer, {
    headers,
  });
}
