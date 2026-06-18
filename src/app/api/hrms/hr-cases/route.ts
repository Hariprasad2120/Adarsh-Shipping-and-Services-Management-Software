import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHelpDeskCases, createHRCase } from "@/modules/hrms/service";
import { HRCaseSchema } from "@/modules/hrms/validators";
import { can, requirePermission, apiError } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.helpdesk.read");
    const isAdmin = await can(session.user.id, "hrms.helpdesk.manage");
    const data = await getHelpDeskCases(session.user.orgId, session.user.id, isAdmin);
    return NextResponse.json({ ok: true, data });
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

    const body = await request.json();
    const result = HRCaseSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: result.error.format() } }, { status: 400 });
    }

    await requirePermission(session.user.id, "hrms.helpdesk.read");

    const data = await createHRCase(session.user.id, session.user.orgId, result.data);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
