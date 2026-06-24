/**
 * Location Tracking Heartbeat API
 *
 * POST: Receive periodic location updates from mobile app
 * GET: Get current tracking status
 */
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import { recordLocationHeartbeat } from "@/modules/hrms/on-duty";
import { db } from "@/lib/db";

export async function OPTIONS() {
  return mobileOptions();
}

export async function GET(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    const activeTracking = await db.locationTrackingSession.findFirst({
      where: { userId: user.id, orgId: user.orgId, status: "ACTIVE" },
      include: {
        locationPoints: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });

    return mobileJson({
      ok: true,
      data: {
        isTracking: !!activeTracking,
        session: activeTracking
          ? {
              id: activeTracking.id,
              intervalMinutes: activeTracking.intervalMinutes,
              startedAt: activeTracking.startedAt,
              lastPoint: activeTracking.locationPoints[0] ?? null,
            }
          : null,
      },
    });
  } catch (error: any) {
    return mobileJson({ error: error.message ?? "Failed to get tracking status" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    const body = await request.json();
    const { location, batteryLevel, deviceId, networkStatus, isMocked, source } = body;

    if (!location?.lat || !location?.lng) {
      return mobileJson({ error: "Location data is required" }, 400);
    }

    const result = await recordLocationHeartbeat(
      user.id,
      user.orgId,
      {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        bearing: location.bearing,
        timestamp: location.timestamp || new Date().toISOString(),
        batteryLevel,
        deviceId,
        networkStatus,
        isMocked: isMocked ?? false,
      },
      source ?? "HOURLY"
    );

    return mobileJson({ ok: true, data: result });
  } catch (error: any) {
    console.error("tracking heartbeat API error:", error);
    return mobileJson({ error: error.message ?? "Failed to record location" }, 500);
  }
}
