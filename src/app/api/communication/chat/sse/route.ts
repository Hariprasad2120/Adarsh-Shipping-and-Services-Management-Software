/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/workspace-oauth";
import {
  listMemberships,
  resolveGoogleWorkspacePerson,
  isCurrentGoogleChatUser,
  getSpaceReadState,
} from "@/lib/google-chat-client";

const CHAT_API_BASE = "https://chat.googleapis.com/v1";

// Known org profile names that should never be shown as sender names
const ORG_PROFILE_NAMES = new Set([
  "Adarsh Operations",
  "adarsh operations",
  "ADARSH OPERATIONS",
  "Adarsh Shipping",
  "adarsh shipping",
  "Google User",
  "Google Chat DM",
  "Direct message",
  "Chat Member",
]);

/**
 * SSE endpoint for live Google Chat updates.
 * 
 * The browser connects via EventSource and receives:
 * - `message:new` — new messages in the active space
 * - `spaces:updated` — refreshed spaces list
 * - `sync:status` — connection health
 * - `ping` — keepalive heartbeat
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const url = new URL(req.url);
  const activeSpaceId = url.searchParams.get("spaceId") || "";
  const dmPartnerHint = url.searchParams.get("dmPartnerName") || null;
  const dmPartnerUserId = url.searchParams.get("dmPartnerUserId") || null;
  const dmPartnerEmail = url.searchParams.get("dmPartnerEmail") || null;

  // Track the latest message we've seen to detect new ones
  let lastMessageName: string | null = null;
  let lastSpaceCount = 0;
  let isAborted = false;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: any) {
        if (isAborted) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          isAborted = true;
        }
      }

      // Send initial connection status
      send("sync:status", { status: "connected", timestamp: new Date().toISOString() });

      // Poll for messages in the active space
      async function pollMessages() {
        if (isAborted || !activeSpaceId) return;

        try {
          const token = await getValidAccessToken(userId);
          const msgParams = new URLSearchParams({
            pageSize: "25",
            orderBy: "createTime desc",
          });
          const res = await fetch(
            `${CHAT_API_BASE}/${activeSpaceId}/messages?${msgParams}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!res.ok) {
            send("sync:status", {
              status: "error",
              error: `Messages API returned ${res.status}`,
              timestamp: new Date().toISOString()
            });
            return;
          }

          const data = (await res.json()) as { messages?: any[] };
          const messages = data.messages || [];

          if (messages.length > 0) {
            // With orderBy=createTime desc, messages[0] is the LATEST message
            const latestName = messages[0]?.name;
            if (latestName && latestName !== lastMessageName) {
              // Reverse to chronological order (oldest → newest) for display
              const chronological = [...messages].reverse();
              const enriched = await enrichMessages(
                chronological,
                userId,
                activeSpaceId,
                dmPartnerHint,
                dmPartnerUserId,
                dmPartnerEmail,
              );
              send("message:new", {
                spaceId: activeSpaceId,
                messages: enriched,
                timestamp: new Date().toISOString()
              });
              lastMessageName = latestName;
            }
          }
        } catch (err: any) {
          const msg = err.message || String(err);
          if (msg.includes("not connected") || msg.includes("token")) {
            send("sync:status", {
              status: "auth_error",
              error: "Google account token expired. Please reconnect.",
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Poll spaces list
      async function pollSpaces() {
        if (isAborted) return;

        try {
          const token = await getValidAccessToken(userId);
          const res = await fetch(`${CHAT_API_BASE}/spaces?pageSize=200`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!res.ok) return;

          const data = (await res.json()) as { spaces?: any[] };
          const count = data.spaces?.length || 0;

          if (count !== lastSpaceCount) {
            send("spaces:updated", {
              count,
              timestamp: new Date().toISOString()
            });
            lastSpaceCount = count;
          }
        } catch {
          // Silent — spaces poll failure is non-critical
        }
      }

      // Heartbeat
      function heartbeat() {
        if (isAborted) return;
        send("ping", { timestamp: new Date().toISOString() });
      }

      // Poll the DM partner's in-app typing signal + real Chat spaceReadState.
      // Only meaningful for the active DM space; only emits on change.
      let lastTypingState = false;
      let lastReadTimeSent: string | null = null;
      async function pollPresence() {
        if (isAborted || !activeSpaceId || !dmPartnerUserId) return;

        try {
          const typingRow = await db.chatTypingState.findUnique({
            where: {
              spaceResourceName_userId: {
                spaceResourceName: activeSpaceId,
                userId: dmPartnerUserId,
              },
            },
          });
          const typing = typingRow ? Date.now() - typingRow.updatedAt.getTime() < 4000 : false;
          if (typing !== lastTypingState) {
            lastTypingState = typing;
            send("typing", { typing });
          }
        } catch {
          // Non-critical
        }

        try {
          const { lastReadTime } = await getSpaceReadState(activeSpaceId, dmPartnerUserId);
          if (lastReadTime && lastReadTime !== lastReadTimeSent) {
            lastReadTimeSent = lastReadTime;
            send("read-state", { lastReadTime });
          }
        } catch {
          // Non-critical — partner may not have their own Workspace connection
        }
      }

      // Initial poll
      await pollMessages();
      await pollSpaces();
      await pollPresence();

      // Set up intervals
      const msgInterval = setInterval(pollMessages, 3000);
      const spaceInterval = setInterval(pollSpaces, 60000);
      const presenceInterval = setInterval(pollPresence, 2000);
      const heartbeatInterval = setInterval(heartbeat, 15000);

      // Clean up when connection closes
      req.signal.addEventListener("abort", () => {
        isAborted = true;
        clearInterval(msgInterval);
        clearInterval(spaceInterval);
        clearInterval(presenceInterval);
        clearInterval(heartbeatInterval);
        try { controller.close(); } catch { /* already closed */ }
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}

/**
 * Enrich messages with resolved sender display names from the database.
 * Uses membership-based email lookup to handle the "Adarsh Operations" org profile name.
 */
async function enrichMessages(
  messages: any[],
  userId: string,
  spaceId: string,
  dmPartnerHint?: string | null,
  dmPartnerUserId?: string | null,
  dmPartnerEmail?: string | null,
): Promise<any[]> {
  // Build lookup maps from GoogleWorkspaceConnection
  const connections = await db.googleWorkspaceConnection.findMany({
    select: {
      googleUserId: true,
      googleEmail: true,
      user: { select: { name: true, email: true } }
    }
  });

  const byGoogleId = new Map<string, string>();
  const byEmail = new Map<string, string>();
  for (const conn of connections) {
    if (conn.googleUserId && conn.user?.name) byGoogleId.set(conn.googleUserId, conn.user.name);
    if (conn.googleEmail && conn.user?.name) byEmail.set(conn.googleEmail.toLowerCase(), conn.user.name);
    if (conn.user?.email && conn.user?.name) byEmail.set(conn.user.email.toLowerCase(), conn.user.name);
  }

  // Current user's connection
  const myConnection = await db.googleWorkspaceConnection.findUnique({
    where: { userId },
    select: { googleUserId: true, googleEmail: true }
  });
  const myGoogleUserId = myConnection?.googleUserId;

  // ── DM Partner Resolution ──
  // For DM spaces: identify the partner once, use for all non-me messages
  let spaceType: string | null = null;
  let dmPartnerName: string | null = null;

  if (!dmPartnerName && dmPartnerUserId) {
    const localPartner = await db.user.findUnique({
      where: { id: dmPartnerUserId },
      select: { name: true, email: true },
    });
    if (localPartner?.name) {
      dmPartnerName = localPartner.name;
    } else if (localPartner?.email) {
      dmPartnerName = byEmail.get(localPartner.email.toLowerCase()) || null;
    }
  }

  if (!dmPartnerName && dmPartnerEmail) {
    dmPartnerName = byEmail.get(dmPartnerEmail.toLowerCase()) || null;
  }

  try {
    const token = await getValidAccessToken(userId);
    const spaceRes = await fetch(`${CHAT_API_BASE}/${spaceId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (spaceRes.ok) {
      const spaceData = await spaceRes.json();
      spaceType = spaceData.spaceType;
    }
  } catch { /* non-critical */ }

  if (spaceType === "DIRECT_MESSAGE") {
    try {
      const membersData = await listMemberships(spaceId, userId);
      const otherMember = membersData.memberships?.find((m) =>
        m.member
          ? !isCurrentGoogleChatUser({
              memberName: m.member.name,
              memberEmail: m.member.email,
              googleUserId: myGoogleUserId,
              googleEmail: myConnection?.googleEmail ?? null,
            })
          : false,
      );
      if (otherMember?.member) {
        const otherId = otherMember.member.name?.replace("users/", "");
        const resolved = await resolveGoogleWorkspacePerson({
          actorUserId: userId,
          googleUserId: otherId,
          email: otherMember.member.email || null,
          displayName: otherMember.member.displayName || null,
        });
        if (resolved.name) {
          dmPartnerName = resolved.name;
        } else if (otherId && byGoogleId.has(otherId)) {
          dmPartnerName = byGoogleId.get(otherId)!;
        } else if (otherMember.member.email) {
          const email = otherMember.member.email.toLowerCase();
          dmPartnerName = byEmail.get(email) || email.split("@")[0]
            .replace(/[._]/g, " ").split(" ")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        } else if (otherMember.member.displayName && 
                   !ORG_PROFILE_NAMES.has(otherMember.member.displayName)) {
          dmPartnerName = otherMember.member.displayName;
        }
      }
    } catch { /* non-critical */ }

    // Fallback: use frontend-supplied hint
    if (!dmPartnerName && dmPartnerHint && !ORG_PROFILE_NAMES.has(dmPartnerHint)) {
      dmPartnerName = dmPartnerHint;
    }
  }

  return Promise.all(messages.map(async (msg: any) => {
    const senderName = msg.sender?.name || "";
    const match = senderName.match(/^users\/([a-zA-Z0-9_-]+)$/);
    const googleId = match ? match[1] : null;

    const isMe = googleId && myGoogleUserId
      ? googleId === myGoogleUserId
      : false;

    let displayName: string;

    if (isMe) {
      displayName = byGoogleId.get(myGoogleUserId!) || "You";
    } else if (googleId && byGoogleId.has(googleId)) {
      displayName = byGoogleId.get(googleId)!;
    } else if (spaceType === "DIRECT_MESSAGE" && dmPartnerName) {
      // DM: non-me message = partner
      displayName = dmPartnerName;
    } else {
      const resolvedSender = await resolveGoogleWorkspacePerson({
        actorUserId: userId,
        googleUserId: googleId,
        email: msg.sender?.email || null,
        displayName: msg.sender?.displayName || null,
      });
      const raw = resolvedSender.name || msg.sender?.displayName || "";
      if (raw && !ORG_PROFILE_NAMES.has(raw)) {
        displayName = raw;
      } else {
        displayName = dmPartnerName || "Teammate";
      }
    }

    return {
      ...msg,
      isMe,
      sender: { ...msg.sender, displayName }
    };
  }));
}
