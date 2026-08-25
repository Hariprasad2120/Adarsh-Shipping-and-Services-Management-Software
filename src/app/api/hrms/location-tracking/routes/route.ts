/**
 * Route History & Replay API
 * GET ?userId=&date=YYYY-MM-DD — returns the filtered/cleaned route for one
 * employee on one day: points, geofence entries/exits, visits, and summary
 * metrics (distance, travel/stationary/customer/office time, stop count).
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
    const userId = url.searchParams.get("userId");
    const dateStr = url.searchParams.get("date");
    if (!userId || !dateStr) return NextResponse.json({ error: "userId and date are required" }, { status: 400 });

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const sessions = await db.locationTrackingSession.findMany({
      where: { orgId, userId, startedAt: { lte: dayEnd }, OR: [{ stoppedAt: null }, { stoppedAt: { gte: dayStart } }] },
      include: { locationPoints: { where: { timestamp: { gte: dayStart, lte: dayEnd } }, orderBy: { timestamp: "asc" } } },
    });

    const rawPoints = sessions.flatMap((s) => s.locationPoints);
    const points = filterNoisyPoints(rawPoints);
    const distanceKm = computeRouteDistanceKm(points);

    const [geofenceEvents, visits] = await Promise.all([
      db.locationGeofenceEvent.findMany({ where: { orgId, userId, occurredAt: { gte: dayStart, lte: dayEnd } }, orderBy: { occurredAt: "asc" }, include: { geofence: { select: { id: true, name: true, type: true } } } }),
      db.customerVisit.findMany({ where: { orgId, userId, arrivalAt: { gte: dayStart, lte: dayEnd } }, orderBy: { arrivalAt: "asc" } }),
    ]);

    const customerMinutes = visits.reduce((sum, v) => sum + (v.durationMinutes ?? 0), 0);
    const gaps = [];
    for (let i = 1; i < points.length; i++) {
      const gapMinutes = (points[i].timestamp.getTime() - points[i - 1].timestamp.getTime()) / 60000;
      if (gapMinutes > 20) gaps.push({ fromTimestamp: points[i - 1].timestamp, toTimestamp: points[i].timestamp, minutes: Math.round(gapMinutes) });
    }

    const firstPoint = points[0] ?? null;
    const lastPoint = points[points.length - 1] ?? null;
    const totalTrackedMinutes = firstPoint && lastPoint ? Math.round((lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime()) / 60000) : 0;

    return NextResponse.json({
      ok: true,
      data: {
        date: dateStr,
        userId,
        points: points.map((p) => ({ latitude: p.latitude, longitude: p.longitude, timestamp: p.timestamp, accuracy: p.accuracy, speed: p.speed })),
        rawPointCount: rawPoints.length,
        filteredPointCount: points.length,
        start: firstPoint,
        end: lastPoint,
        geofenceEvents,
        visits,
        gaps,
        summary: {
          distanceKm,
          totalTrackedMinutes,
          customerMinutes,
          stopCount: gaps.length,
          visitCount: visits.length,
        },
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
