import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { applyLeave } from "@/modules/hrms/service";
import { LeaveRequestSchema } from "@/modules/hrms/validators";
import { requirePermission, apiError } from "@/lib/rbac";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }
    await requirePermission(session.user.id, "attendance.leave.request");

    const body = await request.json();
    const result = LeaveRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: result.error.format() } }, { status: 400 });
    }

    const data = await applyLeave(session.user.id, session.user.orgId, result.data);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return apiError(error);
    }
    const message = error instanceof Error ? error.message : "Bad request";
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message } }, { status: 400 });
  }
}
