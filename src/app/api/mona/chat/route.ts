// ─── Mona Chat API Route ─────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import { chatWithMona, clearConversation } from "@/modules/mona/service";
import type { MonaContext } from "@/modules/mona/types";

export async function POST(request: Request) {
  try {
    // Authenticate
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, currentPath, sessionId, action } = body as {
      message?: string;
      currentPath?: string;
      sessionId?: string;
      action?: "chat" | "clear";
    };

    const userId = session.user.id;
    const chatSessionId = sessionId || "default";

    // Handle clear action
    if (action === "clear") {
      clearConversation(userId, chatSessionId);
      return NextResponse.json({ ok: true });
    }

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // Load user permissions
    const permissionsSet = await loadUserPermissions(userId);
    const permissions = Array.from(permissionsSet);

    // Build context
    const context: MonaContext = {
      userId,
      userName: session.user.name || "User",
      orgId: session.user.orgId,
      currentPath: currentPath || "/dashboard",
      permissions,
      isAdmin: permissions.includes("admin.org.manage"),
    };

    // Call Mona
    const response = await chatWithMona(
      context,
      message.trim(),
      chatSessionId
    );

    return NextResponse.json({
      content: response.content,
      toolsUsed: response.toolsUsed,
    });
  } catch (err) {
    console.error("[Mona API] Error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        content:
          "I encountered an issue processing your request. Please try again.",
      },
      { status: 500 }
    );
  }
}
