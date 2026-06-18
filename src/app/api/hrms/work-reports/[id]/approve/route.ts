import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitWorkReportApproval } from "@/modules/hrms/service";
import { WorkReportApprovalSchema } from "@/modules/hrms/validators";
import { requirePermission, apiError } from "@/lib/rbac";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.workreport.approve");

    const { id: reportId } = await params;
    const body = await request.json();
    const result = WorkReportApprovalSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: result.error.format() } }, { status: 400 });
    }

    const data = await submitWorkReportApproval(
      session.user.id,
      session.user.orgId,
      reportId,
      result.data.status,
      result.data.comments
    );

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
