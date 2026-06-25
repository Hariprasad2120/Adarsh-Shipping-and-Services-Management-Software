/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getValidAccessToken } from "@/lib/workspace-oauth";

const CHAT_API_BASE = "https://chat.googleapis.com/v1";

/**
 * GET /api/communication/chat/check-new
 * 
 * Lightweight endpoint that checks the most recent message for a batch of spaces.
 * Returns { spaceId, latestMessageName, latestTime, senderName, snippet, isMe } per space.
 * 
 * Query params:
 *   spaces: comma-separated space IDs to check (max 10)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spacesParam = req.nextUrl.searchParams.get("spaces") || "";
  const spaceIds = spacesParam.split(",").filter(Boolean).slice(0, 10); // max 10 per batch

  if (spaceIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  let token: string;
  try {
    token = await getValidAccessToken(session.user.id);
  } catch {
    return NextResponse.json({ results: [], error: "auth" });
  }

  // Get the admin user's Google ID to determine "isMe"
  const { db } = await import("@/lib/db");
  const conn = await db.googleWorkspaceConnection.findUnique({
    where: { userId: session.user.id },
    select: { googleUserId: true }
  });
  const myGoogleId = conn?.googleUserId;

  const results = await Promise.allSettled(
    spaceIds.map(async (spaceId) => {
      try {
        const res = await fetch(
          `${CHAT_API_BASE}/${spaceId}/messages?pageSize=1&orderBy=createTime%20desc`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) return null;

        const data = await res.json();
        const messages = data.messages || [];
        if (messages.length === 0) return null;

        const msg = messages[0];
        const senderId = msg.sender?.name?.replace("users/", "");
        const isMe = senderId === myGoogleId;

        // Detect @mention via structured annotations (most reliable)
        const hasMention = myGoogleId
          ? (msg.annotations || []).some(
              (a: any) =>
                a.type === "USER_MENTION" &&
                a.userMention?.user?.name === `users/${myGoogleId}`
            )
          : false;

        return {
          spaceId,
          latestMessageName: msg.name,
          latestTime: msg.createTime,
          senderDisplayName: msg.sender?.displayName || "Unknown",
          snippet: (msg.text || msg.formattedText || "").slice(0, 100),
          isMe,
          hasMention,
        };
      } catch {
        return null;
      }
    })
  );

  const items = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value);

  return NextResponse.json({ results: items });
}
