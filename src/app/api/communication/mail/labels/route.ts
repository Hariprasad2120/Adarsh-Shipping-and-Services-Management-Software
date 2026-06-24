import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listLabels, createLabel, deleteLabel } from "@/lib/google-gmail-client";

// GET /api/communication/mail/labels
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await listLabels(session.user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[MailLabelsAPI] Error listing labels:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list labels" },
      { status: 500 }
    );
  }
}

// POST /api/communication/mail/labels
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Missing name parameter" }, { status: 400 });
    }

    const result = await createLabel(session.user.id, name);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[MailLabelsAPI] Error creating label:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create label" },
      { status: 500 }
    );
  }
}

// DELETE /api/communication/mail/labels
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    await deleteLabel(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[MailLabelsAPI] Error deleting label:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete label" },
      { status: 500 }
    );
  }
}
