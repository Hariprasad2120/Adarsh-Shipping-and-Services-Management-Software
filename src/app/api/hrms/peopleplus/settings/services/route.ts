import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getServiceDefinitions, updateServiceSettings } from "@/modules/hrms/peopleplus/service";
import { ServiceSettingsSchema } from "@/modules/hrms/peopleplus/validators";
import { requirePermission } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const data = await getServiceDefinitions(session.user.orgId);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.settings.manage");

    const body = await request.json();
    const result = ServiceSettingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: result.error.format() } }, { status: 400 });
    }

    const data = await updateServiceSettings(session.user.orgId, result.data.services);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}
