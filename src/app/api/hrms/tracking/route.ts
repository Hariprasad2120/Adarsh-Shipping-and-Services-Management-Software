/**
 * HRMS Tracking Admin API
 *
 * GET: Dashboard data for active tracking, alerts, checked-in employees
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTrackingAlerts, getActiveOnDutyEmployees } from "@/modules/hrms/on-duty";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const url = new URL(request.url);
    const section = url.searchParams.get("section");

    if (section === "alerts") {
      const resolved = url.searchParams.get("resolved") === "true";
      const alerts = await getTrackingAlerts(orgId, resolved);
      return NextResponse.json({ ok: true, data: alerts });
    }

    if (section === "active-on-duty") {
      const employees = await getActiveOnDutyEmployees(orgId);
      return NextResponse.json({ ok: true, data: employees });
    }

    // Default: full dashboard data
    const [checkedIn, activeTracking, alerts, activeOnDuty, faceEnrollments] = await Promise.all([
      db.attendanceSession.findMany({
        where: { orgId, status: "ACTIVE" },
        include: { user: { select: { id: true, name: true, designation: true } } },
      }),
      db.locationTrackingSession.findMany({
        where: { orgId, status: "ACTIVE" },
        include: {
          user: { select: { id: true, name: true } },
          locationPoints: { orderBy: { timestamp: "desc" }, take: 1 },
        },
      }),
      getTrackingAlerts(orgId),
      getActiveOnDutyEmployees(orgId),
      db.employeeFaceEnrollment.count({ where: { orgId, isActive: true } }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        checkedInEmployees: checkedIn,
        activeTrackingSessions: activeTracking,
        unresolvedAlerts: alerts,
        activeOnDutyTrips: activeOnDuty,
        faceEnrollmentCount: faceEnrollments,
      },
    });
  } catch (error: any) {
    console.error("tracking admin API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
