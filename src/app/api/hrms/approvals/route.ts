import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadCaps, requirePermission, apiError } from "@/lib/rbac";
import {
  getPendingApprovals,
  executeApprovalDecision,
} from "@/modules/hrms/service";
import { CrossOrgAccessError } from "@/modules/leave/ledger";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 },
      );
    }

    await requirePermission(session.user.id, "hrms.approvals.manage");

    const caps = await loadCaps(session.user.id);
    const isAdmin = !!(
      caps["hrms.peopleplus.admin"] || caps["admin.org.manage"]
    );

    const data = await getPendingApprovals(
      session.user.id,
      session.user.orgId!,
      isAdmin,
    );
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 },
      );
    }

    await requirePermission(session.user.id, "hrms.approvals.manage");

    const { requestId, type, decision, remarks } = await req.json();
    const allowedTypes = [
      "LEAVE",
      "REGULARIZATION",
      "OT",
      "TRAVEL",
      "TIMESHEET",
      "WORKREPORT",
    ] as const;
    if (
      typeof requestId !== "string" ||
      !requestId ||
      !allowedTypes.includes(type) ||
      !["APPROVED", "REJECTED"].includes(decision) ||
      (remarks !== undefined &&
        (typeof remarks !== "string" || remarks.length > 2000))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid approval decision parameters",
          },
        },
        { status: 400 },
      );
    }

    const data = await executeApprovalDecision(
      session.user.id,
      session.user.orgId!,
      requestId,
      type,
      decision,
      remarks,
    );
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof CrossOrgAccessError) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: error.message } },
        { status: 403 },
      );
    }
    return apiError(error);
  }
}
