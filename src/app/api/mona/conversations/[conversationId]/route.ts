import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  extractActionsFromMetadata,
  extractCitationsFromMetadata,
  getMonaConversationForUser,
} from "@/modules/mona/persistence";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await context.params;
    const conversation = await getMonaConversationForUser({
      conversationId,
      userId: session.user.id,
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        channel: conversation.channel,
        sessionKey: conversation.sessionKey,
        title:
          conversation.title ||
          conversation.lastPageLabel ||
          "Mona conversation",
        lastPageLabel: conversation.lastPageLabel || "Workspace",
        lastPath: conversation.lastPath || "/dashboard",
        messages: conversation.messages.map((message) => ({
          id: message.id,
          role: message.role === "user" ? "user" : "mona",
          content: message.content,
          timestamp: message.createdAt.getTime(),
          toolsUsed: Array.isArray(message.toolNames)
            ? message.toolNames.filter(
                (value): value is string => typeof value === "string",
              )
            : undefined,
          citations: extractCitationsFromMetadata(message.metadata),
          actions: extractActionsFromMetadata(message.metadata),
        })),
      },
    });
  } catch (error) {
    console.error("[Mona Conversation Detail API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
