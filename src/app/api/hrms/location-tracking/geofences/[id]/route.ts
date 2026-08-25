import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, apiError } from "@/lib/rbac";
import { updateGeofence, deactivateGeofence } from "@/modules/hrms/location-tracking";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    await requirePermission(session.user.id, "hrms.tracking.geofence.manage");

    const { id } = await params;
    const body = await request.json();
    const { orgId: _ignoreOrg, id: _ignoreId, createdById: _ignoreCreator, ...patch } = body ?? {};
    const geofence = await updateGeofence(id, orgId, patch);
    return NextResponse.json({ ok: true, data: geofence });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    await requirePermission(session.user.id, "hrms.tracking.geofence.manage");

    const { id } = await params;
    const geofence = await deactivateGeofence(id, orgId);
    return NextResponse.json({ ok: true, data: geofence });
  } catch (error) {
    return apiError(error);
  }
}
