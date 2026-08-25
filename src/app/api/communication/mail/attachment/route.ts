import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAttachment } from "@/lib/google-gmail-client";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const messageId = url.searchParams.get("messageId");
  const attachmentId = url.searchParams.get("attachmentId");
  const filename = url.searchParams.get("filename") || "attachment";
  const mimeType =
    url.searchParams.get("mimeType") || "application/octet-stream";
  const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  if (!messageId || !attachmentId) {
    return NextResponse.json(
      { error: "Missing attachment parameters" },
      { status: 400 },
    );
  }

  try {
    const buffer = await getAttachment({
      userId: session.user.id,
      messageId,
      attachmentId,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${disposition}; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err: unknown) {
    console.error("[MailAttachmentAPI] Error downloading attachment:", err);
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to download attachment") },
      { status: 500 },
    );
  }
}
