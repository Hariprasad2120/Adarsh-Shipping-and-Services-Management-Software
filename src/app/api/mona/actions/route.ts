import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import { buildMonaContext } from "@/modules/mona/context";
import {
  executeConfirmedMonaAction,
  MonaActionError,
} from "@/modules/mona/actions";
import {
  appendMonaConversationMessage,
  getOrCreateMonaConversation,
} from "@/modules/mona/persistence";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token, currentPath, sessionId } = body as {
      token?: string;
      currentPath?: string;
      sessionId?: string;
    };

    if (typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { error: "Action token is required." },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const permissionsSet = await loadUserPermissions(userId);
    const permissions = Array.from(permissionsSet);
    const path = currentPath || "/dashboard";
    const actionSessionId = sessionId || "default";

    const ctx = await buildMonaContext({
      userId,
      userName: session.user.name || "User",
      orgId: session.user.orgId,
      currentPath: path,
      permissions,
      isAdmin: permissions.includes("admin.org.manage"),
      channel: "web",
    });

    const result = await executeConfirmedMonaAction({
      ctx,
      token: token.trim(),
    });

    try {
      const conversation = await getOrCreateMonaConversation({
        userId,
        orgId: session.user.orgId,
        channel: "web",
        sessionKey: actionSessionId,
        currentPath: path,
        pageLabel: ctx.route.pageLabel,
      });

      await appendMonaConversationMessage({
        conversationId: conversation.id,
        role: "model",
        content: result.content,
        metadata: {
          finish: "action_execute",
          source: "action",
          actionId: result.actionId,
        },
      });
    } catch (persistenceError) {
      console.warn("[Mona Action API] Failed to persist action result.", persistenceError);
    }

    return NextResponse.json({
      ok: true,
      actionId: result.actionId,
      content: result.content,
    });
  } catch (error) {
    console.error("[Mona Action API] Error:", error);
    if (error instanceof MonaActionError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute action.",
      },
      { status: 500 },
    );
  }
}
