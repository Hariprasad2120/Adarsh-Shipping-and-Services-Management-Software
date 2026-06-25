/**
 * On-Duty Admin API
 *
 * GET: List pending approvals, active trips
 * POST: Approve/reject on-duty requests
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listPendingApprovals,
  approveOnDutyRequest,
  rejectOnDutyRequest,
  getOnDutyRouteHistory,
} from "@/modules/hrms/on-duty";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "route") {
      const requestId = url.searchParams.get("requestId");
      if (!requestId) return NextResponse.json({ error: "Request ID required" }, { status: 400 });

      const route = await getOnDutyRouteHistory(requestId, orgId);
      return NextResponse.json({ ok: true, data: route });
    }

    // Default: pending approvals for this manager
    const pending = await listPendingApprovals(session.user.id, orgId);
    return NextResponse.json({ ok: true, data: pending });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await request.json();
    const { action, requestId, reason } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    if (action === "approve") {
      const result = await approveOnDutyRequest(requestId, orgId, session.user.id);
      return NextResponse.json({ ok: true, data: result });
    }

    if (action === "reject") {
      const result = await rejectOnDutyRequest(requestId, orgId, session.user.id, reason);
      return NextResponse.json({ ok: true, data: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("on-duty admin API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
