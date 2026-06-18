import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTimesheetProjects, getTimeLogs, createTimeLog } from "@/modules/hrms/service";
import { TimeLogSchema } from "@/modules/hrms/validators";
import { requirePermission, apiError } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "logs";

    await requirePermission(session.user.id, "hrms.timetracker.self");

    if (mode === "projects") {
      const data = await getTimesheetProjects(session.user.orgId);
      return NextResponse.json({ ok: true, data });
    } else {
      const data = await getTimeLogs(session.user.id, session.user.orgId);
      return NextResponse.json({ ok: true, data });
    }
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.timetracker.self");

    const body = await request.json();
    const result = TimeLogSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: result.error.format() } }, { status: 400 });
    }

    const data = await createTimeLog(session.user.id, session.user.orgId, result.data);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
