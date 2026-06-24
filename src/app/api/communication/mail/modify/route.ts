import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { modifyThreadLabels } from "@/lib/google-gmail-client";

// POST /api/communication/mail/modify
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { threadId, addLabelIds = [], removeLabelIds = [] } = await req.json();

    if (!threadId) {
      return NextResponse.json({ error: "Missing threadId parameter" }, { status: 400 });
    }

    const result = await modifyThreadLabels({
      userId: session.user.id,
      threadId,
      addLabelIds,
      removeLabelIds
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("[MailModifyAPI] Error modifying thread labels:", err);
    return NextResponse.json({ error: err.message || "Failed to modify thread labels" }, { status: 500 });
  }
}
