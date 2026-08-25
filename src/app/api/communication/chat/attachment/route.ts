import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAttachmentMedia } from "@/lib/google-chat-client";

// GET /api/communication/chat/attachment?name=<attachmentDataRef.resourceName>&filename=<contentName>
// Same-origin proxy: the browser authenticates via session cookie, this route
// does the actual Google OAuth bearer-token fetch server-side. See
// fetchAttachmentMedia for why a direct <img src> to Google's URI doesn't work.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resourceName = req.nextUrl.searchParams.get("name");
  const filename = req.nextUrl.searchParams.get("filename") || "attachment";
  if (!resourceName) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  try {
    const upstream = await fetchAttachmentMedia({ resourceName, userId: session.user.id });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Failed to fetch attachment" }, { status: upstream.status || 502 });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const disposition = req.nextUrl.searchParams.get("download") === "1"
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : `inline; filename="${encodeURIComponent(filename)}"`;

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch attachment" }, { status: 502 });
  }
}
