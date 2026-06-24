/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createDmWithUser } from "@/lib/google-chat-client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { targetGoogleUserId, targetEmployeeId } = body;

    // Resolve the target user's Google User ID
    let googleUserResourceName: string | null = null;

    // Case 1: Direct Google User ID provided (from workspace connection)
    if (targetGoogleUserId && !targetGoogleUserId.startsWith("cm") && !targetGoogleUserId.startsWith("cl")) {
      // Looks like a real Google User ID (not a Monolith CUID)
      googleUserResourceName = targetGoogleUserId.startsWith("users/")
        ? targetGoogleUserId
        : `users/${targetGoogleUserId}`;
    }

    // Case 2: Monolith user ID was passed — look up their Google User ID from DB
    const employeeId = targetEmployeeId || targetGoogleUserId;
    if (!googleUserResourceName && employeeId) {
      // Try GoogleWorkspaceConnection first
      const conn = await db.googleWorkspaceConnection.findFirst({
        where: { userId: employeeId },
        select: { googleUserId: true, googleEmail: true }
      });

      if (conn?.googleUserId) {
        googleUserResourceName = `users/${conn.googleUserId}`;
      } else {
        // Try to find the user's work email to use as identifier
        const user = await db.user.findUnique({
          where: { id: employeeId },
          select: { name: true, email: true }
        });

        // Also check if they have a GoogleWorkspaceConnection with email
        const targetConn = conn || await db.googleWorkspaceConnection.findFirst({
          where: { userId: employeeId },
          select: { googleUserId: true, googleEmail: true }
        });

        const workEmail = targetConn?.googleEmail || user?.email;
        if (workEmail && workEmail.includes("@")) {
          // Google Chat API accepts email-based user resource names
          googleUserResourceName = `users/${workEmail}`;
        } else {
          return NextResponse.json({
            error: `Cannot create DM: ${user?.name || "This employee"} does not have a Google Workspace account linked. They need to connect their Google account in Settings.`,
            success: false
          }, { status: 400 });
        }
      }
    }

    if (!googleUserResourceName) {
      return NextResponse.json({
        error: "Missing target user information. Cannot determine Google Chat user ID.",
        success: false
      }, { status: 400 });
    }

    const dmSpace = await createDmWithUser(googleUserResourceName, session.user.id);

    // Cache the DM space → employee mapping for name resolution
    const targetUser = await db.user.findUnique({
      where: { id: employeeId },
      select: { name: true, orgId: true }
    });
    if (dmSpace.name && targetUser) {
      await db.googleChatSpace.upsert({
        where: { spaceResourceName: dmSpace.name },
        update: {
          displayName: targetUser.name,
          spaceType: "DIRECT_MESSAGE",
          linkedRecordType: "User",
          linkedRecordId: employeeId,
          linkStatus: "active",
          lastVerifiedAt: new Date()
        },
        create: {
          orgId: targetUser.orgId || session.user.orgId!,
          spaceResourceName: dmSpace.name,
          displayName: targetUser.name,
          spaceType: "DIRECT_MESSAGE",
          linkedRecordType: "User",
          linkedRecordId: employeeId,
          linkStatus: "active",
          lastVerifiedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      spaceId: dmSpace.name,
      spaceType: dmSpace.spaceType
    });
  } catch (err: any) {
    console.error("[ChatDmAPI] Error creating direct message space:", err);
    
    // Provide user-friendly error messages
    const message = err.message || "Failed to create DM space";
    if (message.includes("403") || message.includes("permission")) {
      return NextResponse.json({
        error: "You don't have permission to message this person. They may not be on the same Google Workspace domain.",
        success: false
      }, { status: 403 });
    }
    if (message.includes("404") || message.includes("not found")) {
      return NextResponse.json({
        error: "This person's Google Chat account was not found. Verify they have a Google Workspace account.",
        success: false
      }, { status: 404 });
    }

    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
