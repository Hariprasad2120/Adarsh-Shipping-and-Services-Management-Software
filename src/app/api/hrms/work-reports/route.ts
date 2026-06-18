import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkReports, createWorkReport } from "@/modules/hrms/service";
import { WorkReportSchema } from "@/modules/hrms/validators";
import { requirePermission, apiError } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = (searchParams.get("filter") || "my") as "my" | "reportees" | "all";

    if (filter === "all") {
      await requirePermission(session.user.id, "hrms.workreport.view_all");
    } else if (filter === "reportees") {
      await requirePermission(session.user.id, "hrms.workreport.approve");
    } else {
      await requirePermission(session.user.id, "hrms.workreport.submit");
    }

    const data = await getWorkReports(session.user.id, session.user.orgId, filter);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.workreport.submit");

    const body = await request.json();
    const result = WorkReportSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: result.error.format() } }, { status: 400 });
    }

    const data = await createWorkReport(session.user.id, session.user.orgId, result.data);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
