import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listMemberships, createMembership, deleteMembership } from "@/lib/google-chat-client";

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

    // Query database employees to resolve user profiles
    const connections = await db.googleWorkspaceConnection.findMany({
      select: {
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

    const userMap = new Map<string, any>();
    for (const conn of connections) {
      if (conn.googleUserId && conn.user) {
        userMap.set(conn.googleUserId, conn.user);
      }
    }

    const resolvedMemberships = memberships.map((m: any) => {
      const memberName = m.member?.name || "";
      const googleUserIdMatch = memberName.match(/^users\/([a-zA-Z0-9_-]+)$/);
      const googleUserId = googleUserIdMatch ? googleUserIdMatch[1] : null;

      let employee = null;
      if (googleUserId) {
        employee = userMap.get(googleUserId);
      }

      return {
        name: m.name, // e.g. spaces/XXX/members/YYY
        role: m.role || "ROLE_MEMBER",
        member: {
          name: memberName,
          displayName: employee?.name || m.member?.displayName || "Google User",
          email: employee?.email || "",
          designation: employee?.designation || "Staff",
          employeeId: employee?.id || null,
          googleUserId: googleUserId
        }
      };
    });

    return NextResponse.json({ memberships: resolvedMemberships });
  } catch (err: any) {
    console.error("[SpaceMembersAPI] Error listing members:", err);
    return NextResponse.json({ error: err.message || "Failed to list members" }, { status: 500 });
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
  } catch (err: any) {
    console.error("[SpaceMembersAPI] Error adding member:", err);
    return NextResponse.json({ error: err.message || "Failed to add member" }, { status: 500 });
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
  } catch (err: any) {
    console.error("[SpaceMembersAPI] Error removing member:", err);
    return NextResponse.json({ error: err.message || "Failed to remove member" }, { status: 500 });
  }
}
