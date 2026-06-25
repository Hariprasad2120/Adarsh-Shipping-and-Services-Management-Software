/**
 * On-Duty Service
 *
 * Full lifecycle management for on-duty requests:
 * create → approve → start → track → complete → reimbursement
 *
 * Includes live tracking, route recording, distance calculation,
 * offline alert detection, and fuel reimbursement integration.
 */
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { createNotification } from "@/modules/notifications/service";
import { getUsersWithPermission } from "@/modules/notifications/service";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LocationData = {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  bearing?: number;
  timestamp: string;
  address?: string;
};

export type CreateOnDutyParams = {
  orgId: string;
  userId: string;
  fromDate: string;
  toDate: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  purpose?: string;
  clientReference?: string;
  visitLocation?: string;
  visitAddress?: string;
  remarks?: string;
  attachmentUrl?: string;
};

// ─── Haversine Distance ───────────────────────────────────────────────────────

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateTotalDistance(
  points: Array<{ latitude: number; longitude: number }>
): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude
    );
  }
  return Math.round(total * 100) / 100; // 2 decimal places
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createOnDutyRequest(params: CreateOnDutyParams) {
  const now = await getNow();

  const request = await db.onDutyRequest.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      fromDate: new Date(params.fromDate),
      toDate: new Date(params.toDate),
      startTime: params.startTime,
      endTime: params.endTime,
      reason: params.reason,
      purpose: params.purpose,
      clientReference: params.clientReference,
      visitLocation: params.visitLocation,
      visitAddress: params.visitAddress,
      remarks: params.remarks,
      attachmentUrl: params.attachmentUrl,
      status: "PENDING",
    },
  });

  // Notify manager
  const user = await db.user.findFirst({
    where: { id: params.userId },
    select: { name: true, managerId: true },
  });

  if (user?.managerId) {
    await createNotification({
      userId: user.managerId,
      orgId: params.orgId,
      kind: "HRMS_ON_DUTY_SUBMITTED",
      title: "On-Duty Request Submitted",
      body: `${user.name} has submitted an on-duty request for ${params.fromDate} to ${params.toDate}. Purpose: ${params.purpose || params.reason}`,
      link: `/hrms/on-duty-admin`,
      priority: "important",
    });
  }

  // Audit
  await db.hrmsAuditLog.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      action: "ON_DUTY_CREATED",
      details: { requestId: request.id, purpose: params.purpose },
    },
  });

  return request;
}

export async function approveOnDutyRequest(
  requestId: string,
  orgId: string,
  approverId: string
) {
  const now = await getNow();
  const request = await db.onDutyRequest.findFirst({
    where: { id: requestId, orgId, status: "PENDING" },
    include: { user: { select: { name: true } } },
  });

  if (!request) throw new Error("On-duty request not found or not pending.");

  const updated = await db.onDutyRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED", approvedById: approverId, approvedAt: now },
  });

  await createNotification({
    userId: request.userId,
    orgId,
    kind: "HRMS_ON_DUTY_APPROVED",
    title: "On-Duty Request Approved",
    body: `Your on-duty request for ${request.fromDate.toISOString().split("T")[0]} has been approved.`,
    link: `/hrms/on-duty-admin`,
  });

  await db.hrmsAuditLog.create({
    data: {
      orgId,
      userId: approverId,
      action: "ON_DUTY_APPROVED",
      details: { requestId, employeeId: request.userId },
    },
  });

  return updated;
}

export async function rejectOnDutyRequest(
  requestId: string,
  orgId: string,
  rejecterId: string,
  reason?: string
) {
  const request = await db.onDutyRequest.findFirst({
    where: { id: requestId, orgId, status: "PENDING" },
  });

  if (!request) throw new Error("On-duty request not found or not pending.");

  const updated = await db.onDutyRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", rejectedReason: reason },
  });

  await createNotification({
    userId: request.userId,
    orgId,
    kind: "HRMS_ON_DUTY_REJECTED",
    title: "On-Duty Request Rejected",
    body: `Your on-duty request has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
    link: `/hrms/on-duty-admin`,
  });

  await db.hrmsAuditLog.create({
    data: {
      orgId,
      userId: rejecterId,
      action: "ON_DUTY_REJECTED",
      details: { requestId, reason },
    },
  });

  return updated;
}

// ─── Trip Lifecycle ───────────────────────────────────────────────────────────

export async function startOnDutyTrip(
  requestId: string,
  userId: string,
  orgId: string,
  location: LocationData
) {
  const now = await getNow();

  const request = await db.onDutyRequest.findFirst({
    where: { id: requestId, userId, orgId, status: "APPROVED" },
  });

  if (!request) throw new Error("No approved on-duty request found.");

  // Start the trip
  const updated = await db.onDutyRequest.update({
    where: { id: requestId },
    data: {
      status: "ACTIVE",
      startedAt: now,
      startLocation: location as any,
    },
  });

  // Create on-duty tracking session (more frequent than hourly)
  const trackingSession = await db.locationTrackingSession.create({
    data: {
      orgId,
      userId,
      onDutyRequestId: requestId,
      intervalMinutes: 5, // Every 5 minutes for on-duty
      status: "ACTIVE",
    },
  });

  // Save start location point
  await db.locationPoint.create({
    data: {
      trackingSessionId: trackingSession.id,
      latitude: location.lat,
      longitude: location.lng,
      accuracy: location.accuracy,
      altitude: location.altitude,
      timestamp: now,
      source: "ON_DUTY",
    },
  });

  // Notify manager
  const user = await db.user.findFirst({
    where: { id: userId },
    select: { name: true, managerId: true },
  });

  if (user?.managerId) {
    await createNotification({
      userId: user.managerId,
      orgId,
      kind: "HRMS_ON_DUTY_STARTED",
      title: "On-Duty Trip Started",
      body: `${user.name} has started their on-duty trip. Purpose: ${request.purpose || request.reason}`,
      link: `/hrms/on-duty-admin`,
    });
  }

  await db.hrmsAuditLog.create({
    data: {
      orgId,
      userId,
      action: "ON_DUTY_STARTED",
      details: { requestId, location },
    },
  });

  return updated;
}

export async function completeOnDutyTrip(
  requestId: string,
  userId: string,
  orgId: string,
  location: LocationData
) {
  const now = await getNow();

  const request = await db.onDutyRequest.findFirst({
    where: { id: requestId, userId, orgId, status: "ACTIVE" },
  });

  if (!request) throw new Error("No active on-duty trip found.");

  // Get the tracking session and calculate distance
  const trackingSession = await db.locationTrackingSession.findFirst({
    where: { onDutyRequestId: requestId, status: "ACTIVE" },
  });

  let totalDistanceKm = 0;
  let routeSummary: any[] = [];

  if (trackingSession) {
    // Save final location point
    await db.locationPoint.create({
      data: {
        trackingSessionId: trackingSession.id,
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy,
        altitude: location.altitude,
        timestamp: now,
        source: "ON_DUTY",
      },
    });

    // Get all points for distance calculation
    const points = await db.locationPoint.findMany({
      where: { trackingSessionId: trackingSession.id },
      orderBy: { timestamp: "asc" },
      select: { latitude: true, longitude: true, timestamp: true },
    });

    totalDistanceKm = calculateTotalDistance(points);

    // Build route summary (sample key waypoints)
    routeSummary = points.map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
      time: p.timestamp.toISOString(),
    }));

    // Stop tracking session
    await db.locationTrackingSession.update({
      where: { id: trackingSession.id },
      data: {
        status: "STOPPED",
        stoppedAt: now,
        stopReason: "on_duty_complete",
      },
    });
  }

  // Complete the trip
  const updated = await db.onDutyRequest.update({
    where: { id: requestId },
    data: {
      status: "COMPLETED",
      completedAt: now,
      endLocation: location as any,
      totalDistanceKm,
      routeSummary,
    },
  });

  // Notify manager
  const user = await db.user.findFirst({
    where: { id: userId },
    select: { name: true, managerId: true },
  });

  if (user?.managerId) {
    await createNotification({
      userId: user.managerId,
      orgId,
      kind: "HRMS_ON_DUTY_COMPLETED",
      title: "On-Duty Trip Completed",
      body: `${user.name} has completed their on-duty trip. Distance: ${totalDistanceKm} km`,
      link: `/hrms/on-duty-admin`,
    });
  }

  await db.hrmsAuditLog.create({
    data: {
      orgId,
      userId,
      action: "ON_DUTY_COMPLETED",
      details: { requestId, totalDistanceKm, location },
    },
  });

  return { request: updated, totalDistanceKm, routeSummary };
}

// ─── Location Heartbeat ───────────────────────────────────────────────────────

export async function recordLocationHeartbeat(
  userId: string,
  orgId: string,
  location: LocationData & {
    batteryLevel?: number;
    deviceId?: string;
    networkStatus?: string;
    isMocked?: boolean;
  },
  source: string = "HOURLY"
) {
  const now = await getNow();

  // Find active tracking session
  const trackingSession = await db.locationTrackingSession.findFirst({
    where: { userId, orgId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!trackingSession) {
    return { recorded: false, reason: "No active tracking session" };
  }

  // Detect mocked location
  if (location.isMocked) {
    await db.trackingAlert.create({
      data: {
        orgId,
        userId,
        trackingSessionId: trackingSession.id,
        onDutyRequestId: trackingSession.onDutyRequestId,
        alertType: "MOCK_DETECTED",
        lastKnownLat: location.lat,
        lastKnownLng: location.lng,
        lastUpdateAt: now,
        message: "Mock/spoofed location detected",
      },
    });

    // Notify admin
    const user = await db.user.findFirst({
      where: { id: userId },
      select: { name: true, managerId: true },
    });

    if (user?.managerId) {
      await createNotification({
        userId: user.managerId,
        orgId,
        kind: "HRMS_GPS_DISABLED",
        title: "Mock Location Detected",
        body: `${user.name}'s device is reporting a mock/spoofed GPS location.`,
        link: `/hrms/tracking`,
        priority: "important",
      });
    }
  }

  // Record location point
  const point = await db.locationPoint.create({
    data: {
      trackingSessionId: trackingSession.id,
      latitude: location.lat,
      longitude: location.lng,
      accuracy: location.accuracy,
      altitude: location.altitude,
      speed: location.speed,
      bearing: location.bearing,
      timestamp: now,
      batteryLevel: location.batteryLevel,
      deviceId: location.deviceId,
      networkStatus: location.networkStatus,
      source,
      isMocked: location.isMocked ?? false,
    },
  });

  return { recorded: true, pointId: point.id };
}

// ─── Tracking Alert Detection ─────────────────────────────────────────────────

/**
 * Check for employees who haven't sent a location heartbeat within the
 * configured threshold. Should be called by a cron job.
 */
export async function detectOfflineEmployees(
  orgId: string,
  thresholdMinutes: number = 10
) {
  const now = await getNow();
  const threshold = new Date(now.getTime() - thresholdMinutes * 60 * 1000);

  // Find active tracking sessions
  const activeSessions = await db.locationTrackingSession.findMany({
    where: { orgId, status: "ACTIVE" },
    include: {
      user: { select: { id: true, name: true, managerId: true } },
    },
  });

  let alertCount = 0;

  for (const session of activeSessions) {
    // Get last location point
    const lastPoint = await db.locationPoint.findFirst({
      where: { trackingSessionId: session.id },
      orderBy: { timestamp: "desc" },
    });

    if (!lastPoint || lastPoint.timestamp < threshold) {
      // Check if alert already exists (avoid duplicate alerts)
      const existingAlert = await db.trackingAlert.findFirst({
        where: {
          userId: session.userId,
          trackingSessionId: session.id,
          alertType: "OFFLINE",
          resolvedAt: null,
        },
      });

      if (!existingAlert) {
        const alert = await db.trackingAlert.create({
          data: {
            orgId,
            userId: session.userId,
            trackingSessionId: session.id,
            onDutyRequestId: session.onDutyRequestId,
            alertType: "OFFLINE",
            lastKnownLat: lastPoint?.latitude,
            lastKnownLng: lastPoint?.longitude,
            lastUpdateAt: lastPoint?.timestamp,
            message: `No location update received for ${thresholdMinutes}+ minutes`,
          },
        });

        // Notify manager
        if (session.user.managerId) {
          await createNotification({
            userId: session.user.managerId,
            orgId,
            kind: "HRMS_TRACKING_OFFLINE",
            title: "Employee Offline Alert",
            body: `${session.user.name} has not sent a location update for ${thresholdMinutes}+ minutes. Last known location at ${lastPoint?.timestamp?.toISOString() || "unknown"}.`,
            link: `/hrms/tracking`,
            priority: "important",
            requiresAck: true,
          });
        }

        // Notify admins
        const adminIds = await getUsersWithPermission(orgId, "hrms.tracking.admin");
        for (const adminId of adminIds) {
          if (adminId !== session.user.managerId) {
            await createNotification({
              userId: adminId,
              orgId,
              kind: "HRMS_TRACKING_OFFLINE",
              title: "Employee Offline Alert",
              body: `${session.user.name} has gone offline during active tracking.`,
              link: `/hrms/tracking`,
              priority: "important",
            });
          }
        }

        alertCount++;
      }
    }
  }

  return alertCount;
}

// ─── Fuel Reimbursement ───────────────────────────────────────────────────────

export async function getActiveReimbursementRate(orgId: string) {
  const policy = await db.fuelReimbursementPolicy.findFirst({
    where: { orgId, isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });

  return policy ?? { ratePerKm: 3.75, currency: "INR" };
}

export async function createFuelReimbursementClaim(
  onDutyRequestId: string,
  userId: string,
  orgId: string
) {
  const request = await db.onDutyRequest.findFirst({
    where: { id: onDutyRequestId, userId, orgId, status: "COMPLETED" },
  });

  if (!request) throw new Error("Completed on-duty request not found.");
  if (!request.totalDistanceKm || request.totalDistanceKm <= 0) {
    throw new Error("No tracked distance available for reimbursement.");
  }

  // Check for existing claim
  const existingClaim = await db.fuelReimbursementClaim.findFirst({
    where: { onDutyRequestId },
  });

  if (existingClaim) throw new Error("A reimbursement claim already exists for this trip.");

  const policy = await getActiveReimbursementRate(orgId);
  const amount = Math.round(request.totalDistanceKm * policy.ratePerKm * 100) / 100;

  const claim = await db.fuelReimbursementClaim.create({
    data: {
      orgId,
      userId,
      onDutyRequestId,
      distanceKm: request.totalDistanceKm,
      ratePerKm: policy.ratePerKm,
      amount,
      status: "PENDING",
    },
  });

  // Notify manager for approval
  const user = await db.user.findFirst({
    where: { id: userId },
    select: { name: true, managerId: true },
  });

  if (user?.managerId) {
    await createNotification({
      userId: user.managerId,
      orgId,
      kind: "HRMS_REIMBURSEMENT_SUBMITTED",
      title: "Fuel Reimbursement Claim",
      body: `${user.name} has submitted a fuel reimbursement claim of ₹${amount.toFixed(2)} for ${request.totalDistanceKm} km.`,
      link: `/hrms/reimbursement`,
    });
  }

  await db.hrmsAuditLog.create({
    data: {
      orgId,
      userId,
      action: "REIMBURSEMENT_CLAIMED",
      details: {
        claimId: claim.id,
        onDutyRequestId,
        distanceKm: request.totalDistanceKm,
        ratePerKm: policy.ratePerKm,
        amount,
      },
    },
  });

  return claim;
}

export async function approveReimbursementClaim(
  claimId: string,
  orgId: string,
  approverId: string
) {
  const now = await getNow();
  const claim = await db.fuelReimbursementClaim.findFirst({
    where: { id: claimId, orgId, status: "PENDING" },
  });

  if (!claim) throw new Error("Pending claim not found.");

  const updated = await db.fuelReimbursementClaim.update({
    where: { id: claimId },
    data: { status: "APPROVED", approvedById: approverId, approvedAt: now },
  });

  await createNotification({
    userId: claim.userId,
    orgId,
    kind: "HRMS_REIMBURSEMENT_APPROVED",
    title: "Fuel Reimbursement Approved",
    body: `Your fuel reimbursement claim of ₹${claim.amount.toFixed(2)} has been approved.`,
    link: `/hrms/reimbursement`,
  });

  return updated;
}

export async function rejectReimbursementClaim(
  claimId: string,
  orgId: string,
  rejecterId: string,
  reason?: string
) {
  const claim = await db.fuelReimbursementClaim.findFirst({
    where: { id: claimId, orgId, status: "PENDING" },
  });

  if (!claim) throw new Error("Pending claim not found.");

  const updated = await db.fuelReimbursementClaim.update({
    where: { id: claimId },
    data: { status: "REJECTED", rejectedReason: reason },
  });

  await createNotification({
    userId: claim.userId,
    orgId,
    kind: "HRMS_REIMBURSEMENT_REJECTED",
    title: "Fuel Reimbursement Rejected",
    body: `Your fuel reimbursement claim has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
    link: `/hrms/reimbursement`,
  });

  return updated;
}

export async function markReimbursementPaid(
  claimId: string,
  orgId: string,
  paidById: string
) {
  const now = await getNow();
  const claim = await db.fuelReimbursementClaim.findFirst({
    where: { id: claimId, orgId, status: "APPROVED" },
  });

  if (!claim) throw new Error("Approved claim not found.");

  const updated = await db.fuelReimbursementClaim.update({
    where: { id: claimId },
    data: { status: "PAID", paidAt: now, paidById },
  });

  await createNotification({
    userId: claim.userId,
    orgId,
    kind: "HRMS_REIMBURSEMENT_PAID",
    title: "Fuel Reimbursement Paid",
    body: `Your fuel reimbursement of ₹${claim.amount.toFixed(2)} has been processed for payment.`,
    link: `/hrms/reimbursement`,
  });

  return updated;
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

export async function listOnDutyRequests(userId: string, orgId: string) {
  return db.onDutyRequest.findMany({
    where: { userId, orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listPendingApprovals(managerId: string, orgId: string) {
  // Find employees reporting to this manager
  const reports = await db.user.findMany({
    where: { managerId, orgId },
    select: { id: true },
  });
  const reportIds = reports.map((r) => r.id);

  return db.onDutyRequest.findMany({
    where: { userId: { in: reportIds }, orgId, status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveOnDutyEmployees(orgId: string) {
  return db.onDutyRequest.findMany({
    where: { orgId, status: "ACTIVE" },
    include: {
      user: { select: { id: true, name: true, email: true, designation: true } },
      trackingSessions: {
        where: { status: "ACTIVE" },
        include: {
          locationPoints: {
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
      },
    },
  });
}

export async function getOnDutyRouteHistory(requestId: string, orgId: string) {
  const request = await db.onDutyRequest.findFirst({
    where: { id: requestId, orgId },
    include: {
      user: { select: { id: true, name: true } },
      trackingSessions: {
        include: {
          locationPoints: {
            orderBy: { timestamp: "asc" },
          },
        },
      },
    },
  });

  return request;
}

export async function getTrackingAlerts(orgId: string, resolved: boolean = false) {
  return db.trackingAlert.findMany({
    where: {
      orgId,
      resolvedAt: resolved ? { not: null } : null,
    },
    include: {
      user: { select: { id: true, name: true, email: true, designation: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function resolveTrackingAlert(alertId: string, orgId: string) {
  const now = await getNow();
  return db.trackingAlert.updateMany({
    where: { id: alertId, orgId },
    data: { resolvedAt: now },
  });
}

export async function listReimbursementClaims(orgId: string, status?: string) {
  return db.fuelReimbursementClaim.findMany({
    where: { orgId, ...(status ? { status } : {}) },
    include: {
      user: { select: { id: true, name: true, email: true } },
      onDutyRequest: { select: { id: true, fromDate: true, toDate: true, purpose: true, totalDistanceKm: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listUserReimbursements(userId: string, orgId: string) {
  return db.fuelReimbursementClaim.findMany({
    where: { userId, orgId },
    include: {
      onDutyRequest: { select: { id: true, fromDate: true, toDate: true, purpose: true, totalDistanceKm: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
