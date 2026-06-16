import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkReports, createWorkReport } from "@/modules/hrms/peopleplus/service";
import { WorkReportSchema } from "@/modules/hrms/peopleplus/validators";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = (searchParams.get("filter") || "my") as "my" | "reportees" | "all";

    const data = await getWorkReports(session.user.id, session.user.orgId, filter);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } }, { status: 401 });
    }

    const body = await request.json();
    const result = WorkReportSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: result.error.format() } }, { status: 400 });
    }

    const data = await createWorkReport(
      session.user.id,
      session.user.orgId,
      result.data
    );

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}
