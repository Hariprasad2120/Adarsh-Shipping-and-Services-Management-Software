// ─── Mona Chat Mobile API Route ───────────────────────────────────────────────
import { getMobileUser } from "@/lib/mobile-auth";
import { loadUserPermissions } from "@/lib/rbac";
import { buildMonaContext } from "@/modules/mona/context";
import { chatWithMona, clearConversation } from "@/modules/mona/service";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import { getClientIp, rateLimit, sanitizeText } from "@/lib/security";

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
    const limited = rateLimit(`mobile-mona:${userId}:${getClientIp(request)}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limited.ok) return limited.response;

    // Handle clear action
    if (action === "clear") {
      await clearConversation(userId, chatSessionId, "mobile");
      return mobileJson({ ok: true });
    }

    // Validate message
    const cleanMessage = typeof message === "string" ? sanitizeText(message, 2000) : "";
    if (!cleanMessage) {
      return mobileJson(
        { error: "Message is required" },
        400
      );
    }

    // Load user permissions
    const permissionsSet = await loadUserPermissions(userId);
    const permissions = Array.from(permissionsSet);

    // Build context
    const context = await buildMonaContext({
      userId,
      userName: user.name || "User",
      orgId: user.orgId ?? undefined,
      currentPath: currentPath || "/dashboard",
      permissions,
      isAdmin: permissions.includes("admin.org.manage"),
      channel: "mobile",
    });

    // Call Mona
    const response = await chatWithMona(
      context,
      cleanMessage,
      chatSessionId
    );

    return mobileJson({
      content: response.content,
      toolsUsed: response.toolsUsed,
      citations: response.citations,
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
