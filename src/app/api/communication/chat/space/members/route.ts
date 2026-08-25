import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listMemberships,
  createMembership,
  deleteMembership,
  isCurrentGoogleChatUser,
} from "@/lib/google-chat-client";

type ChatMembership = Awaited<ReturnType<typeof listMemberships>>["memberships"][number];
type ResolvedUser = {
  id: string;
  name: string;
  email: string;
  designation: string | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// GET /api/communication/chat/space/members?spaceId=spaces/XXX - List members
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
    const data = await listMemberships(spaceId, session.user.id);
    const memberships = data.memberships || [];
    const sessionName = session.user.name?.trim() || "You";

    // Query database employees to resolve user profiles
    const connections = await db.googleWorkspaceConnection.findMany({
      select: {
        googleEmail: true,
        googleUserId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true
          }
        }
      }
    });

    const userMap = new Map<string, ResolvedUser>();
    const userByEmail = new Map<string, ResolvedUser>();
    for (const conn of connections) {
      if (conn.googleUserId && conn.user) {
        userMap.set(conn.googleUserId, conn.user);
      }
      if (conn.googleEmail && conn.user) {
        userByEmail.set(conn.googleEmail.toLowerCase(), conn.user);
      }
      if (conn.user?.email) {
        userByEmail.set(conn.user.email.toLowerCase(), conn.user);
      }
    }

    const myConnection = await db.googleWorkspaceConnection.findUnique({
      where: { userId: session.user.id },
      select: { googleUserId: true, googleEmail: true },
    });
    const myGoogleUserId = myConnection?.googleUserId ?? null;
    const myGoogleEmail = myConnection?.googleEmail?.toLowerCase() ?? session.user.email?.toLowerCase() ?? null;

    const resolvedMemberships = memberships.map((m: ChatMembership) => {
      const memberName = m.member?.name || "";
      const googleUserIdMatch = memberName.match(/^users\/([a-zA-Z0-9_-]+)$/);
      const googleUserId = googleUserIdMatch ? googleUserIdMatch[1] : null;

      let employee = null;
      if (googleUserId) {
        employee = userMap.get(googleUserId);
      }
      if (!employee && m.member?.email) {
        employee = userByEmail.get(m.member.email.toLowerCase()) ?? null;
      }

      const isCurrentUser = Boolean(
        isCurrentGoogleChatUser({
          memberName,
          memberEmail: m.member?.email || null,
          googleUserId: myGoogleUserId,
          googleEmail: myGoogleEmail,
          userEmail: session.user.email ?? null,
        }) ||
        employee?.id === session.user.id,
      );

      const rawDisplayName = m.member?.displayName?.trim();
      const displayName = isCurrentUser
        ? sessionName
        : employee?.name || rawDisplayName || "Chat Member";

      return {
        name: m.name, // e.g. spaces/XXX/members/YYY
        role: m.role || "ROLE_MEMBER",
        member: {
          name: memberName,
          displayName,
          email: employee?.email || m.member?.email || "",
          designation: isCurrentUser ? (employee?.designation || "You") : (employee?.designation || "Staff"),
          employeeId: isCurrentUser ? "current-user" : (employee?.id || null),
          googleUserId: googleUserId
        }
      };
    });

    return NextResponse.json({ memberships: resolvedMemberships });
  } catch (err: unknown) {
    console.error("[SpaceMembersAPI] Error listing members:", err);
    return NextResponse.json({ error: getErrorMessage(err, "Failed to list members") }, { status: 500 });
  }
}

// POST /api/communication/chat/space/members - Invite a member
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { spaceId, employeeId, googleUserId } = body;

    if (!spaceId || (!employeeId && !googleUserId)) {
      return NextResponse.json({ error: "Missing spaceId or member identifier" }, { status: 400 });
    }

    let targetGoogleId = googleUserId;

    if (employeeId && !targetGoogleId) {
      const conn = await db.googleWorkspaceConnection.findUnique({
        where: { userId: employeeId },
        select: { googleUserId: true }
      });
      targetGoogleId = conn?.googleUserId;
    }

    if (!targetGoogleId) {
      // If employee has no linked workspace connection in production, it will fail, but in dev we can use their ID
      if (process.env.NODE_ENV === "development") {
        targetGoogleId = employeeId;
      } else {
        return NextResponse.json({ error: "Target employee has no Google Workspace connection" }, { status: 400 });
      }
    }

    await createMembership({
      spaceResourceName: spaceId,
      googleUserId: targetGoogleId,
      userId: session.user.id
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[SpaceMembersAPI] Error adding member:", err);
    return NextResponse.json({ error: getErrorMessage(err, "Failed to add member") }, { status: 500 });
  }
}

// DELETE /api/communication/chat/space/members - Remove a member
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const spaceId = url.searchParams.get("spaceId");
  const memberResourceName = url.searchParams.get("memberResourceName"); // spaces/XXX/members/YYY

  if (!spaceId || !memberResourceName) {
    return NextResponse.json({ error: "Missing spaceId or memberResourceName" }, { status: 400 });
  }

  try {
    await deleteMembership({
      spaceResourceName: spaceId,
      memberResourceName,
      userId: session.user.id
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[SpaceMembersAPI] Error removing member:", err);
    return NextResponse.json({ error: getErrorMessage(err, "Failed to remove member") }, { status: 500 });
  }
}
