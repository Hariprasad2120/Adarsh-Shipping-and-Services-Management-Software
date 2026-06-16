import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTravelRequests, createTravelRequest, createTravelExpense } from "@/modules/hrms/peopleplus/service";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const data = await getTravelRequests(session.user.id, session.user.orgId!);
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

    const body = await req.json();
    const { action } = body;

    if (action === "create_request") {
      const { purpose, destination, fromDate, toDate } = body;
      const data = await createTravelRequest(session.user.id, session.user.orgId!, purpose, destination, new Date(fromDate), new Date(toDate));
      return NextResponse.json({ ok: true, data });
    }

    if (action === "submit_expense") {
      const { travelRequestId, amount, category, billFileKey } = body;
      const data = await createTravelExpense(travelRequestId, Number(amount), category, billFileKey);
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid action" } }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
