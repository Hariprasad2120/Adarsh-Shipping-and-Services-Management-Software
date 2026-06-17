import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLeaveTrackerSummary } from "@/modules/hrms/service";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }

    const data = await getLeaveTrackerSummary(session.user.id, session.user.orgId);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
