import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, apiError } from "@/lib/rbac";
import { listPolicies, upsertPolicy } from "@/modules/hrms/location-tracking";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    await requirePermission(session.user.id, "hrms.tracking.admin");

    const policies = await listPolicies(orgId);
    return NextResponse.json({ ok: true, data: policies });
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
    if (!body?.scopeType) return NextResponse.json({ error: "scopeType is required" }, { status: 400 });
    if (body.scopeType !== "ORG" && !body.scopeId) {
      return NextResponse.json({ error: "scopeId is required unless scopeType is ORG" }, { status: 400 });
    }

    const { scopeType, scopeId, ...settings } = body;
    const policy = await upsertPolicy({ orgId, scopeType, scopeId: scopeType === "ORG" ? null : scopeId, createdById: session.user.id, settings });
    return NextResponse.json({ ok: true, data: policy });
  } catch (error) {
    return apiError(error);
  }
}
