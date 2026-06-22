// ─── Mona Chat Mobile API Route ───────────────────────────────────────────────
import { getMobileUser } from "@/lib/mobile-auth";
import { loadUserPermissions } from "@/lib/rbac";
import { chatWithMona, clearConversation } from "@/modules/mona/service";
import type { MonaContext } from "@/modules/mona/types";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";

export async function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  try {
    // Authenticate mobile user
    const user = await getMobileUser(request);
    if (!user) {
      return mobileJson({ error: "Unauthorized" }, 401);
    }

    const body = await request.json();
    const { message, currentPath, sessionId, action } = body as {
      message?: string;
      currentPath?: string;
      sessionId?: string;
      action?: "chat" | "clear";
    };

    const userId = user.id;
    const chatSessionId = sessionId || "default";

    // Handle clear action
    if (action === "clear") {
      clearConversation(userId, chatSessionId);
      return mobileJson({ ok: true });
    }

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return mobileJson(
        { error: "Message is required" },
        400
      );
    }

    if (message.length > 2000) {
      return mobileJson(
        { error: "Message too long (max 2000 characters)" },
        400
      );
    }

    // Load user permissions
    const permissionsSet = await loadUserPermissions(userId);
    const permissions = Array.from(permissionsSet);

    // Build context
    const context: MonaContext = {
      userId,
      userName: user.name || "User",
      orgId: user.orgId ?? undefined,
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

    return mobileJson({
      content: response.content,
      toolsUsed: response.toolsUsed,
    });
  } catch (err) {
    console.error("[Mona Mobile API] Error:", err);
    return mobileJson(
      {
        error: "Internal server error",
        content:
          "I encountered an issue processing your request. Please try again.",
      },
      500
    );
  }
}
