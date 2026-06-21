import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHRLetterSettings, updateHRLetterSettings } from "@/modules/hrms/letters-service";
import { requirePermission, apiError } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const data = await getHRLetterSettings(session.user.orgId!);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.letters.settings");

    const body = await req.json();
    const data = await updateHRLetterSettings(session.user.orgId!, body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

// POST is equivalent to PUT for convenience
export async function POST(req: Request) {
  return PUT(req);
}
