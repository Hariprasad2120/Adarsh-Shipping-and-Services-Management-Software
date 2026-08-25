/**
 * Location & Field Tracking — Overview API
 * GET: KPI counters + latest per-employee location (efficient read model, no
 * full-history scan) for the command-center dashboard.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, apiError } from "@/lib/rbac";
import { getLatestLocationsForOrg, classifyFreshness } from "@/modules/hrms/location-tracking";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    await requirePermission(session.user.id, "hrms.tracking.admin");

    const now = new Date();

    const [latestLocations, checkedInCount, activeOnDutyCount, unresolvedAlerts, openExceptions, activeVisits, todayVisits] = await Promise.all([
      getLatestLocationsForOrg(orgId),
      db.attendanceSession.count({ where: { orgId, status: "ACTIVE" } }),
      db.onDutyRequest.count({ where: { orgId, status: "ACTIVE" } }),
      db.trackingAlert.count({ where: { orgId, resolvedAt: null } }),
      db.locationException.count({ where: { orgId, status: { in: ["OPEN", "UNDER_REVIEW", "EXPLANATION_REQUESTED"] } } }),
      db.customerVisit.count({ where: { orgId, status: "IN_PROGRESS" } }),
      db.customerVisit.count({ where: { orgId, arrivalAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } }),
    ]);

    let live = 0, recent = 0, stale = 0, offline = 0;
    const employees = latestLocations.map((loc) => {
      const state = classifyFreshness(loc.latestPoint?.timestamp ?? null, now);
      if (state === "LIVE") live++;
      else if (state === "RECENT") recent++;
      else if (state === "STALE") stale++;
      else offline++;
      return { ...loc, freshness: state };
    });

    return NextResponse.json({
      ok: true,
      data: {
        kpis: {
          trackingNow: latestLocations.length,
          checkedIn: checkedInCount,
          locationAvailable: live + recent,
          gpsOffline: offline,
          gpsStale: stale,
          activeFieldEmployees: activeOnDutyCount,
          activeSalesExecutives: activeOnDutyCount, // same underlying pool today — no distinct "sales" designation flag yet
          customerVisitsToday: todayVisits,
          activeVisitsNow: activeVisits,
          trackingExceptions: openExceptions,
          unresolvedAlerts,
        },
        employees,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
