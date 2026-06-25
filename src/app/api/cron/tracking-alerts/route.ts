/**
 * Tracking Alerts Cron Endpoint
 *
 * Detects employees who have gone offline during active tracking
 * and auto-closes expired attendance sessions.
 *
 * Intended to be called by an external cron (e.g., Vercel Cron Jobs)
 * every 5-10 minutes.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { detectOfflineEmployees } from "@/modules/hrms/on-duty";
import { autoCloseExpiredSessions } from "@/modules/hrms/mobile-attendance";

export async function GET(request: Request) {
  try {
    // Simple auth via cron secret
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all organizations with active tracking
    const orgs = await db.locationTrackingSession.findMany({
      where: { status: "ACTIVE" },
      select: { orgId: true },
      distinct: ["orgId"],
    });

    let totalAlerts = 0;
    let totalClosed = 0;

    for (const { orgId } of orgs) {
      const alerts = await detectOfflineEmployees(orgId, 10);
      const closed = await autoCloseExpiredSessions(orgId);
      totalAlerts += alerts;
      totalClosed += closed;
    }

    return NextResponse.json({
      ok: true,
      data: {
        orgsProcessed: orgs.length,
        alertsCreated: totalAlerts,
        sessionsClosed: totalClosed,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("tracking alerts cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
