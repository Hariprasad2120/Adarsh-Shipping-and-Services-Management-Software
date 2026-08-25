/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getValidAccessToken } from "@/lib/workspace-oauth";
import { isCurrentGoogleChatUser, resolveGoogleWorkspacePerson } from "@/lib/google-chat-client";

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
    select: { googleUserId: true, googleEmail: true }
  });
  const myGoogleId = conn?.googleUserId;
  const myGoogleEmail = conn?.googleEmail?.toLowerCase() ?? session.user.email?.toLowerCase() ?? null;

  const connections = await db.googleWorkspaceConnection.findMany({
    select: {
      googleUserId: true,
      googleEmail: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  const userByGoogleId = new Map<string, string>();
  const userByEmail = new Map<string, string>();
  for (const connection of connections) {
    if (connection.googleUserId && connection.user?.name) {
      userByGoogleId.set(connection.googleUserId, connection.user.name);
    }
    if (connection.googleEmail && connection.user?.name) {
      userByEmail.set(connection.googleEmail.toLowerCase(), connection.user.name);
    }
    if (connection.user?.email && connection.user?.name) {
      userByEmail.set(connection.user.email.toLowerCase(), connection.user.name);
    }
  }

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
        const senderResourceName = msg.sender?.name || null;
        const isMe = isCurrentGoogleChatUser({
          memberName: senderResourceName,
          memberEmail: msg.sender?.email || null,
          googleUserId: myGoogleId,
          googleEmail: myGoogleEmail,
          userEmail: session.user.email ?? null,
        });
        const senderEmail = msg.sender?.email?.toLowerCase?.() ?? null;
        const resolvedSender = await resolveGoogleWorkspacePerson({
          actorUserId: session.user.id,
          googleUserId: senderId,
          email: senderEmail,
          displayName: msg.sender?.displayName || null,
          orgId: session.user.orgId || null,
        });
        const senderDisplayName =
          (isMe ? session.user.name : undefined) ||
          (senderId ? userByGoogleId.get(senderId) : undefined) ||
          (senderEmail ? userByEmail.get(senderEmail) : undefined) ||
          resolvedSender.name ||
          msg.sender?.displayName ||
          "Chat Member";

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
          senderDisplayName,
          snippet: (msg.text || msg.formattedText || "").slice(0, 100),
          isMe: isMe || Boolean(senderEmail && myGoogleEmail && senderEmail === myGoogleEmail),
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
