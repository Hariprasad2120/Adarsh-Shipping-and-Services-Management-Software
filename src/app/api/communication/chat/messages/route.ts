/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listMessages, sendMessage, listMemberships } from "@/lib/google-chat-client";
import { getValidAccessToken } from "@/lib/workspace-oauth";

const CHAT_API_BASE = "https://chat.googleapis.com/v1";

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
    const messages = await listMessages(spaceId, session.user.id);
    
    // ── Build lookup maps ──
    // Map: Google User ID → Monolith user name
    const connections = await db.googleWorkspaceConnection.findMany({
      select: {
        googleUserId: true,
        googleEmail: true,
        user: { select: { name: true, email: true } }
      }
    });

    const nameByGoogleId = new Map<string, string>();
    const nameByEmail = new Map<string, string>();
    for (const conn of connections) {
      if (conn.googleUserId && conn.user?.name) {
        nameByGoogleId.set(conn.googleUserId, conn.user.name);
      }
      if (conn.googleEmail && conn.user?.name) {
        nameByEmail.set(conn.googleEmail.toLowerCase(), conn.user.name);
      }
      if (conn.user?.email && conn.user?.name) {
        nameByEmail.set(conn.user.email.toLowerCase(), conn.user.name);
      }
    }

    // Also load all active users for email fallback
    const allUsers = await db.user.findMany({
      where: { orgId: session.user.orgId!, active: true },
      select: { name: true, email: true }
    });
    for (const u of allUsers) {
      if (u.email && u.name && !nameByEmail.has(u.email.toLowerCase())) {
        nameByEmail.set(u.email.toLowerCase(), u.name);
      }
    }

    // Get current user's Google User ID
    const myConn = await db.googleWorkspaceConnection.findUnique({
      where: { userId: session.user.id },
      select: { googleUserId: true }
    });
    const myGoogleUserId = myConn?.googleUserId;

    // ── DM Partner Resolution ──
    // For DMs, get the space info to determine the partner's name.
    // A DM has exactly 2 members: me and the partner.
    // Any non-me message must be from the partner.
    let spaceType: string | null = null;
    let dmPartnerName: string | null = null;
    let dmPartnerGoogleId: string | null = null;

    try {
      const token = await getValidAccessToken(session.user.id);
      const spaceRes = await fetch(`${CHAT_API_BASE}/${spaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (spaceRes.ok) {
        const spaceData = await spaceRes.json();
        spaceType = spaceData.spaceType;
      }
    } catch { /* non-critical */ }

    // Accept a name hint from the frontend (the sidebar already resolved the DM partner name)
    const dmPartnerHint = url.searchParams.get("dmPartnerName");

    if (spaceType === "DIRECT_MESSAGE") {
      try {
        const membersData = await listMemberships(spaceId, session.user.id);
        const otherMember = membersData.memberships?.find(
          (m) => m.member && m.member.name !== `users/${myGoogleUserId}`
        );

        if (otherMember?.member) {
          const otherId = otherMember.member.name?.replace("users/", "");
          dmPartnerGoogleId = otherId || null;

          // Priority 1: Google User ID → DB lookup
          if (otherId && nameByGoogleId.has(otherId)) {
            dmPartnerName = nameByGoogleId.get(otherId)!;
          }
          // Priority 2: Member email → DB lookup
          else if (otherMember.member.email) {
            const email = otherMember.member.email.toLowerCase();
            dmPartnerName = nameByEmail.get(email) || null;
            if (!dmPartnerName) {
              dmPartnerName = email.split("@")[0]
                .replace(/[._]/g, " ")
                .split(" ")
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
            }
          }
          // Priority 3: Match member displayName against Monolith users by name
          else if (otherMember.member.displayName) {
            const memberDisplayName = otherMember.member.displayName;
            // Check if this displayName matches any Monolith user name (case-insensitive)
            const matchedUser = allUsers.find(u => 
              u.name.toLowerCase() === memberDisplayName.toLowerCase()
            );
            if (matchedUser) {
              dmPartnerName = matchedUser.name;
            }
          }
          // Priority 4: Use frontend hint (already resolved by listSpaces)
          if (!dmPartnerName && dmPartnerHint) {
            dmPartnerName = dmPartnerHint;
          }
        }
      } catch { /* non-critical */ }

      // Absolute fallback: if still no partner name, use frontend hint
      if (!dmPartnerName && dmPartnerHint) {
        dmPartnerName = dmPartnerHint;
      }
    }

    // ── Enrich Messages ──
    const enrichedMessages = messages.map((msg: any) => {
      const senderName = msg.sender?.name || "";
      const match = senderName.match(/^users\/([a-zA-Z0-9_-]+)$/);
      const msgGoogleUserId = match ? match[1] : null;

      let isMe = false;
      if (msgGoogleUserId && myGoogleUserId && msgGoogleUserId === myGoogleUserId) {
        isMe = true;
      } else if (senderName === "users/current-user") {
        isMe = true;
      }

      let displayName: string;

      if (isMe || senderName === "users/current-user") {
        // Current user — use session name
        displayName = session.user.name || "You";
      } else if (msgGoogleUserId && nameByGoogleId.has(msgGoogleUserId)) {
        // Resolved from GoogleWorkspaceConnection by Google User ID
        displayName = nameByGoogleId.get(msgGoogleUserId)!;
      } else if (spaceType === "DIRECT_MESSAGE" && dmPartnerName) {
        // DM: any non-me message must be from the DM partner
        displayName = dmPartnerName;
      } else if (msg.sender?.email && nameByEmail.has(msg.sender.email.toLowerCase())) {
        // Resolved from email
        displayName = nameByEmail.get(msg.sender.email.toLowerCase())!;
      } else {
        // Fallback: use whatever Google gives us (unless it's the org name)
        const raw = msg.sender?.displayName || "";
        const ORG_NAMES = ["Adarsh Operations", "adarsh operations", "ADARSH OPERATIONS", "Adarsh Shipping"];
        if (raw && !ORG_NAMES.includes(raw)) {
          displayName = raw;
        } else {
          displayName = "Chat Member";
        }
      }

      return {
        ...msg,
        isMe,
        sender: {
          ...msg.sender,
          displayName
        }
      };
    });

    return NextResponse.json({ messages: enrichedMessages });
  } catch (err: any) {
    console.error("[ChatMessagesAPI] Error listing messages:", err);
    return NextResponse.json({ error: err.message || "Failed to list messages" }, { status: 500 });
  }
}

// POST /api/communication/chat/messages - Send a message
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { spaceId, text } = body;

    if (!spaceId || !text) {
      return NextResponse.json({ error: "Missing spaceId or text" }, { status: 400 });
    }

    const result = await sendMessage({ spaceResourceName: spaceId, text, userId: session.user.id });

    return NextResponse.json({
      success: true,
      message: result
    });
  } catch (err: any) {
    console.error("[ChatMessagesAPI] Error sending message:", err);
    return NextResponse.json({ error: err.message || "Failed to send message" }, { status: 500 });
  }
}
