import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addCaseComment } from "@/modules/hrms/peopleplus/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    if (!body || !body.message) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Message is required" } }, { status: 400 });
    }

    const data = await addCaseComment(id, session.user.id, body.message);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}
