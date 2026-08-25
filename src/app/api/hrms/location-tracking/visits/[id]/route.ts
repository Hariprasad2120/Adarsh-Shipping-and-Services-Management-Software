import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, apiError } from "@/lib/rbac";
import { confirmVisit, dismissVisit, completeVisit } from "@/modules/hrms/location-tracking";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    await requirePermission(session.user.id, "hrms.tracking.visits.manage");

    const { id } = await params;
    const body = await request.json();
    const action = body?.action;

    if (action === "confirm") {
      const visit = await confirmVisit(id, orgId, session.user.id, {
        purpose: body.purpose,
        contactPerson: body.contactPerson,
        notes: body.notes,
      });
      return NextResponse.json({ ok: true, data: visit });
    }
    if (action === "dismiss") {
      const visit = await dismissVisit(id, orgId);
      return NextResponse.json({ ok: true, data: visit });
    }
    if (action === "complete") {
      const visit = await completeVisit(id, orgId, {
        outcome: body.outcome,
        notes: body.notes,
        followUpAt: body.followUpAt ? new Date(body.followUpAt) : undefined,
      });
      return NextResponse.json({ ok: true, data: visit });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}
