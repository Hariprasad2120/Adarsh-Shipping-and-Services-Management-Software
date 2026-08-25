import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, apiError } from "@/lib/rbac";
import { listGeofences, createGeofence } from "@/modules/hrms/location-tracking";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    await requirePermission(session.user.id, "hrms.tracking.admin");

    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? undefined;
    const geofences = await listGeofences(orgId, { type });
    return NextResponse.json({ ok: true, data: geofences });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    await requirePermission(session.user.id, "hrms.tracking.geofence.manage");

    const body = await request.json();
    if (!body?.name || !body?.type) {
      return NextResponse.json({ error: "name and type are required" }, { status: 400 });
    }
    if (body.shape === "POLYGON") {
      if (!Array.isArray(body.polygon) || body.polygon.length < 3) {
        return NextResponse.json({ error: "polygon requires at least 3 points" }, { status: 400 });
      }
    } else if (
      typeof body.centerLat !== "number" ||
      typeof body.centerLng !== "number" ||
      typeof body.radiusMeters !== "number" ||
      body.radiusMeters <= 0
    ) {
      return NextResponse.json({ error: "centerLat, centerLng and a positive radiusMeters are required for a circle geofence" }, { status: 400 });
    }

    if (body.type === "CUSTOMER" && body.crmAccountId) {
      const account = await db.crmAccount.findFirst({ where: { id: body.crmAccountId, orgId } });
      if (!account) return NextResponse.json({ error: "Customer account not found in this organization" }, { status: 404 });
    }

    const geofence = await createGeofence({ ...body, orgId, createdById: session.user.id });
    return NextResponse.json({ ok: true, data: geofence });
  } catch (error) {
    return apiError(error);
  }
}
