import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSpaceReadState, markSpaceRead } from "@/lib/google-chat-client";

// GET — the other DM participant's own read marker (requires their own
// connected OAuth token; returns null if they've never connected).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spaceId = req.nextUrl.searchParams.get("spaceId");
  const partnerUserId = req.nextUrl.searchParams.get("partnerUserId");
  if (!spaceId || !partnerUserId) {
    return NextResponse.json({ lastReadTime: null });
  }

  try {
    const { lastReadTime } = await getSpaceReadState(spaceId, partnerUserId);
    return NextResponse.json({ lastReadTime });
  } catch {
    return NextResponse.json({ lastReadTime: null });
  }
}

// POST — mark the current user's own read marker forward (call when viewing a space).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const spaceId: string | undefined = body?.spaceId;
  if (!spaceId) {
    return NextResponse.json({ error: "Missing spaceId" }, { status: 400 });
  }

  try {
    await markSpaceRead(spaceId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
