/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listSpaces } from "@/lib/google-chat-client";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // listSpaces now calls Google Chat API directly, resolves DM names,
    // and caches everything in GoogleChatSpace table automatically.
    const spaces = await listSpaces(userId);

    return NextResponse.json({
      success: true,
      count: spaces.length,
      spaces: spaces.map((s) => ({
        name: s.name,
        displayName: s.displayName,
        spaceType: s.spaceType
      }))
    });
  } catch (err: any) {
    console.error("[ChatSyncAPI] Error syncing spaces:", err);

    // Provide actionable error messages
    const message = err.message || "Failed to sync spaces";
    const isAuthError = message.includes("not connected") || message.includes("token") || message.includes("credentials");

    return NextResponse.json(
      {
        error: message,
        actionRequired: isAuthError ? "reconnect_google" : "retry",
        hint: isAuthError
          ? "Go to Settings > Google Workspace and reconnect your account."
          : "Try again in a few seconds. If the problem persists, check the server logs."
      },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
