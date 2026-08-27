import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listMonaConversationsForUser } from "@/modules/mona/persistence";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") || "web";
    const limitParam = Number.parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 20)
      : 10;

    const conversations = await listMonaConversationsForUser({
      userId: session.user.id,
      channel,
      limit,
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[Mona Conversations API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
