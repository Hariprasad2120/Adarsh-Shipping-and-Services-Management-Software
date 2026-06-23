import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listMessages, sendMessage } from "@/lib/google-chat-client";

// GET /api/communication/chat/messages?spaceId=spaces/XXX - Load messages
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const spaceId = url.searchParams.get("spaceId");

  if (!spaceId) {
    return NextResponse.json({ error: "Missing spaceId parameter" }, { status: 400 });
  }

  try {
    const messages = await listMessages(spaceId);
    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error("[ChatMessagesAPI] Error listing messages:", err);
    return NextResponse.json({ error: err.message || "Failed to list messages" }, { status: 500 });
  }
}

// POST /api/communication/chat/messages - Send message to space
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { spaceId, text } = body;

    if (!spaceId || !text) {
      return NextResponse.json({ error: "Missing spaceId or text parameter" }, { status: 400 });
    }

    const message = await sendMessage({
      spaceResourceName: spaceId,
      text
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    console.error("[ChatMessagesAPI] Error sending message:", err);
    return NextResponse.json({ error: err.message || "Failed to send message" }, { status: 500 });
  }
}
