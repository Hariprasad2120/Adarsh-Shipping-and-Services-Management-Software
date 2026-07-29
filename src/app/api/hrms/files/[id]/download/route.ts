import { auth } from "@/lib/auth";
import { createFileResponseHeaders } from "@/lib/document-preview";
import {
  downloadHrDocument,
  HrDocumentDriveError,
} from "@/modules/hrms/document-drive";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const file = await downloadHrDocument({
      orgId: session.user.orgId,
      actorId: session.user.id,
      documentId: id,
    });
    const inlineSafeMimeTypes = new Set([
      "application/pdf",
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    const forceDownload =
      new URL(request.url).searchParams.get("download") === "true" ||
      !inlineSafeMimeTypes.has(file.mimeType.toLowerCase());
    const headers = createFileResponseHeaders({
      filename: file.name,
      mimeType: file.mimeType,
      contentLength: file.buffer.length,
      forceDownload,
    });
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(new Uint8Array(file.buffer), { headers });
  } catch (error) {
    if (error instanceof HrDocumentDriveError) {
      return new Response(error.message, { status: error.status });
    }
    console.error("HR document download failed:", error);
    return new Response("The document could not be downloaded.", {
      status: 500,
    });
  }
}
