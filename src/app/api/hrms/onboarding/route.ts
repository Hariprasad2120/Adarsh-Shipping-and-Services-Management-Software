import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOnboardingStatus, submitOnboardingDetails } from "@/modules/hrms/service";
import { requirePermission, apiError } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.onboarding.manage");

    const data = await getOnboardingStatus(session.user.id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.onboarding.manage");

    const body = await req.json();
    const data = await submitOnboardingDetails(session.user.id, body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
