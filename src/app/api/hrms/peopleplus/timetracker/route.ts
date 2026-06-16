import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTimesheetProjects, getTimeLogs, createTimeLog } from "@/modules/hrms/peopleplus/service";
import { TimeLogSchema } from "@/modules/hrms/peopleplus/validators";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "logs";

    if (mode === "projects") {
      const data = await getTimesheetProjects(session.user.orgId);
      return NextResponse.json({ ok: true, data });
    } else {
      const data = await getTimeLogs(session.user.id, session.user.orgId);
      return NextResponse.json({ ok: true, data });
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const result = TimeLogSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: result.error.format() } }, { status: 400 });
    }

    const data = await createTimeLog(session.user.id, session.user.orgId, result.data);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}
