import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { createFileResponseHeaders } from "@/lib/document-preview";

function resolvePreviewFilePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !normalized.startsWith("import-output/letters/") ||
    normalized.includes("..")
  ) {
    throw new Error("Invalid file path");
  }

  return path.join(process.cwd(), "public", normalized);
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.orgId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const relativePath = url.searchParams.get("path");
    if (!relativePath) {
      return new Response("Missing file path", { status: 400 });
    }

    const absolutePath = resolvePreviewFilePath(relativePath);
    if (!fs.existsSync(absolutePath)) {
      return new Response("Preview file not found", { status: 404 });
    }

    const buffer = fs.readFileSync(absolutePath);
    const fileName = path.basename(absolutePath);
    const headers = createFileResponseHeaders({
      filename: fileName,
      mimeType: "application/pdf",
      contentLength: buffer.length,
      forceDownload: url.searchParams.get("download") === "true",
    });
    headers.set("Cache-Control", "private, no-store");

    return new Response(new Uint8Array(buffer), { headers });
  } catch (error) {
    console.error("HR letter preview file failed:", error);
    return new Response("The preview file could not be loaded.", {
      status: 500,
    });
  }
}
