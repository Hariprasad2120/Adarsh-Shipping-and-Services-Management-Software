import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordMonaAuditEvent } from "@/modules/mona/persistence";
import { sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    conversationId?: string;
    currentPath?: string;
    feedback?: "helpful" | "unhelpful";
    reason?: string;
    responseExcerpt?: string;
    sessionId?: string;
  };

  if (body.feedback !== "helpful" && body.feedback !== "unhelpful") {
    return NextResponse.json({ error: "Invalid feedback value" }, { status: 400 });
  }

  const currentPath =
    typeof body.currentPath === "string" && body.currentPath.trim().length > 0
      ? body.currentPath.trim()
      : "/dashboard";
  const reason =
    typeof body.reason === "string" && body.reason.trim().length > 0
      ? sanitizeText(body.reason.trim(), 300)
      : undefined;
  const responseExcerpt =
    typeof body.responseExcerpt === "string" && body.responseExcerpt.trim().length > 0
      ? sanitizeText(body.responseExcerpt.trim(), 500)
      : "";

  await recordMonaAuditEvent({
    orgId: session.user.orgId,
    userId: session.user.id,
    conversationId: body.conversationId,
    channel: "web",
    sessionKey:
      typeof body.sessionId === "string" && body.sessionId.trim().length > 0
        ? body.sessionId.trim()
        : undefined,
    eventType: "feedback.submitted",
    status: body.feedback,
    responseMessage: responseExcerpt,
    routePath: currentPath,
    details: {
      feedback: body.feedback,
      reason,
      responseExcerpt,
    },
  });

  return NextResponse.json({ ok: true });
}
