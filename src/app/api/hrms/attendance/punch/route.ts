import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { punchAction } from "@/modules/hrms/service";
import { PunchSchema } from "@/modules/hrms/validators";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }

    const body = await request.json();
    const result = PunchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: result.error.format() } }, { status: 400 });
    }

    const data = await punchAction(
      session.user.id,
      session.user.orgId,
      result.data.action,
      result.data.source,
      result.data.note,
      result.data.deviceId
    );

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}
