import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardWidgets, updateDashboardWidgets } from "@/modules/hrms/service";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }

    const data = await getDashboardWidgets(session.user.id, session.user.orgId);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }

    const body = await request.json();
    if (!body || !Array.isArray(body.widgets)) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid widgets array" } }, { status: 400 });
    }

    await updateDashboardWidgets(session.user.id, body.widgets);
    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
