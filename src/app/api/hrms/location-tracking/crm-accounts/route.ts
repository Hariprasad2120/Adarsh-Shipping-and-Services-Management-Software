/**
 * Minimal CRM account lookup for the Location & Field Tracking module
 * (geofence "link to customer" picker, planned-visit customer picker).
 * No dedicated CrmAccount list API existed to reuse (CRM module drives its
 * own UI off server actions) — this is intentionally narrow: id/name/geo only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();

    const accounts = await db.crmAccount.findMany({
      where: { orgId, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
      select: { id: true, name: true, geoLatitude: true, geoLongitude: true, geoVisitRadiusMeters: true, billingAddress: true },
      orderBy: { name: "asc" },
      take: 25,
    });

    return NextResponse.json({ ok: true, data: accounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
