import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendDraft } from "@/lib/google-gmail-client";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const draftId = typeof body.draftId === "string" ? body.draftId.trim() : "";

    if (!draftId) {
      return NextResponse.json({ error: "Missing draft ID" }, { status: 400 });
    }

    const result = await sendDraft({
      userId: session.user.id,
      draftId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    console.error("[MailDraftSendAPI] Error sending draft:", err);
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to send draft") },
      { status: 500 },
    );
  }
}
