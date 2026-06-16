import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadCaps } from "@/lib/rbac";
import { getPendingApprovals, executeApprovalDecision } from "@/modules/hrms/peopleplus/service";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const caps = await loadCaps(session.user.id);
    const isAdmin = !!(caps["hrms.peopleplus.admin"] || caps["admin.org.manage"]);

    const data = await getPendingApprovals(session.user.id, session.user.orgId!, isAdmin);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { requestId, type, decision, remarks } = await req.json();
    if (!requestId || !type || !decision) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } }, { status: 400 });
    }

    const data = await executeApprovalDecision(session.user.id, requestId, type, decision, remarks);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
