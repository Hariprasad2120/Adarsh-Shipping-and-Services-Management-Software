import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, apiError } from "@/lib/rbac";
import { transitionHRLetterRequest } from "@/modules/hrms/letters-service";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, notes } = body;

    if (!action) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing action" } }, { status: 400 });
    }

    // RBAC Permission check per action
    if (action === "SUBMIT") {
      await requirePermission(session.user.id, "hrms.letters.manage");
    } else if (action === "HR_APPROVE") {
      await requirePermission(session.user.id, "hrms.letters.manage");
    } else if (action === "LEGAL_APPROVE") {
      await requirePermission(session.user.id, "hrms.letters.legal_review");
    } else if (action === "MGMT_APPROVE") {
      await requirePermission(session.user.id, "hrms.letters.mgmt_approve");
    } else if (action === "ISSUE") {
      await requirePermission(session.user.id, "hrms.letters.manage");
    } else if (action === "REISSUE") {
      await requirePermission(session.user.id, "hrms.letters.manage");
    } else if (action === "CANCEL") {
      await requirePermission(session.user.id, "hrms.letters.manage");
    } else if (action === "REJECT") {
      // Reject can be done by anyone who can review
      const userRoles = await db.userRole.findMany({
        where: { userId: session.user.id },
        include: { role: true }
      });
      const roles = userRoles.map((ur: any) => ur.role.name.toLowerCase());
      const hasPermission = roles.some((r: string) => ["hr", "management", "legal", "admin", "director"].includes(r));
      if (!hasPermission) {
        return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
      }
    } else {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid action" } }, { status: 400 });
    }

    const data = await transitionHRLetterRequest(id, session.user.orgId!, action, session.user.id, notes);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
