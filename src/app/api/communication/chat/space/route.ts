import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSpace, createMembership, updateSpace } from "@/lib/google-chat-client";

// GET /api/communication/chat/space?spaceId=spaces/XXX - Fetch settings
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
    const space = await db.googleChatSpace.findUnique({
      where: { spaceResourceName: spaceId }
    });

    const settings = (space?.notificationProfile as any) || {};

    return NextResponse.json({
      name: spaceId,
      displayName: space?.displayName || (spaceId.includes("mock-") ? "Internal Office Work" : "Google Space"),
      spaceType: space?.spaceType || "SPACE",
      access: settings.access || "Private",
      requestToJoin: settings.requestToJoin !== undefined ? settings.requestToJoin : true,
      membershipPermissions: settings.membershipPermissions || "all"
    });
  } catch (err: any) {
    console.error("[SpaceSettingsAPI] Error fetching space settings:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch settings" }, { status: 500 });
  }
}

// POST /api/communication/chat/space - Create a space
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.orgId!;

  try {
    const body = await req.json();
    const { displayName, spaceType, access, requestToJoin, invitees } = body;

    if (!displayName) {
      return NextResponse.json({ error: "Missing displayName parameter" }, { status: 400 });
    }

    // Call google client helper to create the space
    const chatSpace = await createSpace({
      displayName,
      spaceType: spaceType || "SPACE",
      userId: session.user.id
    });

    // Store settings in notificationProfile JSON
    const settings = {
      access: access || "Private",
      requestToJoin: requestToJoin !== undefined ? requestToJoin : true,
      membershipPermissions: "all",
      invitees: invitees || []
    };

    // Save space in database
    const dbSpace = await db.googleChatSpace.create({
      data: {
        orgId,
        spaceResourceName: chatSpace.name,
        displayName: displayName,
        spaceType: spaceType || "SPACE",
        linkedByUserId: session.user.id,
        notificationProfile: settings,
        linkStatus: "active"
      }
    });

    // If there are invitees, invite them
    if (invitees && Array.isArray(invitees)) {
      for (const inviteeId of invitees) {
        // Find their workspace connection googleUserId
        const inviteeConn = await db.googleWorkspaceConnection.findFirst({
          where: {
            OR: [
              { userId: inviteeId },
              { googleUserId: inviteeId }
            ]
          },
          select: { googleUserId: true }
        });
        const targetGoogleId = inviteeConn?.googleUserId || inviteeId;
        
        try {
          await createMembership({
            spaceResourceName: chatSpace.name,
            googleUserId: targetGoogleId,
            userId: session.user.id
          });
        } catch (err) {
          console.error(`Failed to add invitee ${targetGoogleId} to space:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      space: {
        name: dbSpace.spaceResourceName,
        displayName: dbSpace.displayName,
        spaceType: dbSpace.spaceType
      }
    });
  } catch (err: any) {
    console.error("[SpaceSettingsAPI] Error creating space:", err);
    return NextResponse.json({ error: err.message || "Failed to create space" }, { status: 500 });
  }
}

// PATCH /api/communication/chat/space - Update space settings
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { spaceId, displayName, access, requestToJoin, membershipPermissions } = body;

    if (!spaceId) {
      return NextResponse.json({ error: "Missing spaceId parameter" }, { status: 400 });
    }

    // Try to find the local space
    let dbSpace = await db.googleChatSpace.findUnique({
      where: { spaceResourceName: spaceId }
    });

    if (!dbSpace) {
      // If not in database, create a stub for it
      dbSpace = await db.googleChatSpace.create({
        data: {
          orgId: session.user.orgId!,
          spaceResourceName: spaceId,
          displayName: displayName || "Google Space",
          linkStatus: "active"
        }
      });
    }

    // Update display name on Google Chat if changed
    if (displayName && displayName !== dbSpace.displayName && !spaceId.includes("mock-")) {
      try {
        await updateSpace({
          spaceResourceName: spaceId,
          spaceBody: { displayName },
          updateMask: "displayName",
          userId: session.user.id
        });
      } catch (err) {
        console.error("Failed to update space display name on Google:", err);
      }
    }

    const currentSettings = (dbSpace.notificationProfile as any) || {};
    const updatedSettings = {
      ...currentSettings,
      access: access || currentSettings.access || "Private",
      requestToJoin: requestToJoin !== undefined ? requestToJoin : (currentSettings.requestToJoin !== undefined ? currentSettings.requestToJoin : true),
      membershipPermissions: membershipPermissions || currentSettings.membershipPermissions || "all"
    };

    await db.googleChatSpace.update({
      where: { id: dbSpace.id },
      data: {
        displayName: displayName || dbSpace.displayName,
        notificationProfile: updatedSettings
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[SpaceSettingsAPI] Error updating settings:", err);
    return NextResponse.json({ error: err.message || "Failed to update settings" }, { status: 500 });
  }
}
