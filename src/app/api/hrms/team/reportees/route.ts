import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTeamReportees } from "@/modules/hrms/service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }

    const data = await getTeamReportees(session.user.id, session.user.orgId);
    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to load team reportees";
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message } }, { status: 500 });
  }
}
