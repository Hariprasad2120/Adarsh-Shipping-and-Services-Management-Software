import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHRLetterTemplates, getHRLetterRequests, createHRLetterRequest } from "@/modules/hrms/service";
import { requirePermission, apiError } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "templates") {
      const data = await getHRLetterTemplates(session.user.orgId!);
      return NextResponse.json({ ok: true, data });
    }

    const data = await getHRLetterRequests(session.user.id, session.user.orgId!);
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

    await requirePermission(session.user.id, "hrms.letters.manage");

    const { templateId, details } = await req.json();
    if (!templateId) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing templateId" } }, { status: 400 });
    }

    const data = await createHRLetterRequest(session.user.id, session.user.orgId!, templateId, details);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
