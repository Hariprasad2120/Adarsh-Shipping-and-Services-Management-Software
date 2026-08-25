/**
 * Location & Field Tracking reports.
 * Covers 3 of the requested report set with real data (Daily Employee
 * Movement, Customer Visits, Geofence Events); the remaining report types
 * (route deviation, territory coverage, GPS failure trend, etc.) need either
 * territory/deviation-threshold modeling or historical volume this pass didn't
 * build — see module Settings for the tracked list of what's outstanding.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, apiError } from "@/lib/rbac";
import { computeRouteDistanceKm, filterNoisyPoints } from "@/modules/hrms/location-tracking";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    await requirePermission(session.user.id, "hrms.tracking.admin");

    const url = new URL(request.url);
    const report = url.searchParams.get("report") ?? "daily-movement";
    const dateStr = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    if (report === "customer-visits") {
      const visits = await db.customerVisit.findMany({
        where: { orgId, arrivalAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { arrivalAt: "asc" },
      });
      const accountIds = [...new Set(visits.map((v) => v.crmAccountId))];
      const userIds = [...new Set(visits.map((v) => v.userId))];
      const [accounts, users] = await Promise.all([
        accountIds.length ? db.crmAccount.findMany({ where: { id: { in: accountIds } }, select: { id: true, name: true } }) : [],
        userIds.length ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
      ]);
      const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
      const userMap = new Map(users.map((u) => [u.id, u.name]));
      return NextResponse.json({
        ok: true,
        data: { report, date: dateStr, rows: visits.map((v) => ({ employee: userMap.get(v.userId) ?? v.userId, customer: accountMap.get(v.crmAccountId) ?? v.crmAccountId, status: v.status, arrivalAt: v.arrivalAt, durationMinutes: v.durationMinutes })) },
      });
    }

    if (report === "geofence-events") {
      const events = await db.locationGeofenceEvent.findMany({
        where: { orgId, occurredAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { occurredAt: "asc" },
        include: { geofence: { select: { name: true, type: true } } },
      });
      const userIds = [...new Set(events.map((e) => e.userId))];
      const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
      const userMap = new Map(users.map((u) => [u.id, u.name]));
      return NextResponse.json({
        ok: true,
        data: { report, date: dateStr, rows: events.map((e) => ({ employee: userMap.get(e.userId) ?? e.userId, geofence: e.geofence.name, type: e.geofence.type, eventType: e.eventType, occurredAt: e.occurredAt })) },
      });
    }

    // daily-movement (default)
    const sessions = await db.locationTrackingSession.findMany({
      where: { orgId, startedAt: { lte: dayEnd }, OR: [{ stoppedAt: null }, { stoppedAt: { gte: dayStart } }] },
      include: { locationPoints: { where: { timestamp: { gte: dayStart, lte: dayEnd } }, orderBy: { timestamp: "asc" } } },
    });
    const byUser = new Map<string, typeof sessions[number]["locationPoints"]>();
    for (const s of sessions) {
      byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), ...s.locationPoints]);
    }
    const userIds = [...byUser.keys()];
    const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, designation: true } }) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const rows = userIds.map((userId) => {
      const points = filterNoisyPoints(byUser.get(userId) ?? []);
      const distanceKm = computeRouteDistanceKm(points);
      const first = points[0];
      const last = points[points.length - 1];
      return {
        employee: userMap.get(userId)?.name ?? userId,
        designation: userMap.get(userId)?.designation ?? "—",
        pointCount: points.length,
        distanceKm,
        firstSeen: first?.timestamp ?? null,
        lastSeen: last?.timestamp ?? null,
      };
    });

    return NextResponse.json({ ok: true, data: { report, date: dateStr, rows } });
  } catch (error) {
    return apiError(error);
  }
}
