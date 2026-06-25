/**
 * Mobile Attendance Service
 *
 * Handles check-in/check-out with face verification, attendance session
 * management, and integration with location tracking.
 */
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { isWorkingTime, calendarFromDb, type WorkingCalendarConfig } from "@/lib/working-hours";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LocationData = {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  timestamp: string;
  address?: string;
};

export type CheckInParams = {
  userId: string;
  orgId: string;
  location: LocationData;
  faceVerified: boolean;
  faceConfidence?: number;
  deviceId?: string;
  source?: string;
  ip?: string;
};

export type CheckOutParams = {
  userId: string;
  orgId: string;
  sessionId: string;
  location: LocationData;
  faceVerified: boolean;
  faceConfidence?: number;
  deviceId?: string;
  source?: string;
  ip?: string;
};

// ─── Working Hours Config ─────────────────────────────────────────────────────

async function getWorkingCalendar(orgId: string): Promise<WorkingCalendarConfig> {
  const settings = await db.workingCalendar.findUnique({ where: { orgId } });
  const holidays = await db.holiday.findMany({
    where: { orgId },
    select: { date: true },
  });
  const holidayDates = holidays.map((h) => {
    const d = new Date(h.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  return calendarFromDb(settings as any, holidayDates);
}

// ─── Check-In ─────────────────────────────────────────────────────────────────

export async function checkIn(params: CheckInParams) {
  const now = await getNow();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check for existing active session
  const existingSession = await db.attendanceSession.findFirst({
    where: {
      userId: params.userId,
      orgId: params.orgId,
      status: "ACTIVE",
    },
  });

  if (existingSession) {
    throw new Error("You already have an active attendance session. Please check out first.");
  }

  // Check for duplicate check-in today
  const todaySession = await db.attendanceSession.findFirst({
    where: {
      userId: params.userId,
      orgId: params.orgId,
      date: todayDate,
    },
  });

  if (todaySession && todaySession.status === "CLOSED") {
    throw new Error("You have already checked in and out today. Contact admin for corrections.");
  }

  // Create attendance session
  const session = await db.attendanceSession.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      date: todayDate,
      checkInAt: now,
      checkInLocation: params.location as any,
      checkInFaceVerified: params.faceVerified,
      checkInFaceConfidence: params.faceConfidence,
      checkInDeviceId: params.deviceId,
      checkInSource: params.source ?? "MOBILE",
      checkInIp: params.ip,
      status: "ACTIVE",
      trackingEnabled: true,
    },
  });

  // Also create/update AttendancePunch for backward compatibility
  await db.attendancePunch.upsert({
    where: {
      userId_date: {
        userId: params.userId,
        date: todayDate,
      },
    },
    create: {
      userId: params.userId,
      date: todayDate,
      inAt: now,
      source: params.source ?? "MOBILE",
      status: "PRESENT",
    },
    update: {
      inAt: now,
      source: params.source ?? "MOBILE",
      status: "PRESENT",
    },
  });

  // Create location tracking session for hourly tracking during working hours
  const calendar = await getWorkingCalendar(params.orgId);
  if (isWorkingTime(now, calendar)) {
    await db.locationTrackingSession.create({
      data: {
        orgId: params.orgId,
        userId: params.userId,
        attendanceSessionId: session.id,
        intervalMinutes: 60,
        status: "ACTIVE",
      },
    });
  }

  // Log audit event
  await db.hrmsAuditLog.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      action: "MOBILE_CHECK_IN",
      details: {
        sessionId: session.id,
        location: params.location,
        faceVerified: params.faceVerified,
        faceConfidence: params.faceConfidence,
        source: params.source ?? "MOBILE",
        deviceId: params.deviceId,
        timestamp: now.toISOString(),
      },
    },
  });

  // Store the check-in location point
  const trackingSession = await db.locationTrackingSession.findFirst({
    where: { attendanceSessionId: session.id, status: "ACTIVE" },
  });

  if (trackingSession) {
    await db.locationPoint.create({
      data: {
        trackingSessionId: trackingSession.id,
        latitude: params.location.lat,
        longitude: params.location.lng,
        accuracy: params.location.accuracy,
        altitude: params.location.altitude,
        timestamp: now,
        deviceId: params.deviceId,
        source: "CHECK_IN",
      },
    });
  }

  return session;
}

// ─── Check-Out ────────────────────────────────────────────────────────────────

export async function checkOut(params: CheckOutParams) {
  const now = await getNow();

  const session = await db.attendanceSession.findFirst({
    where: {
      id: params.sessionId,
      userId: params.userId,
      orgId: params.orgId,
      status: "ACTIVE",
    },
  });

  if (!session) {
    throw new Error("No active attendance session found.");
  }

  // Calculate working minutes
  const checkInTime = session.checkInAt.getTime();
  const checkOutTime = now.getTime();
  const workingMinutes = Math.round((checkOutTime - checkInTime) / 60000);

  // Close attendance session
  const updated = await db.attendanceSession.update({
    where: { id: session.id },
    data: {
      checkOutAt: now,
      checkOutLocation: params.location as any,
      checkOutFaceVerified: params.faceVerified,
      checkOutFaceConfidence: params.faceConfidence,
      checkOutDeviceId: params.deviceId,
      checkOutSource: params.source ?? "MOBILE",
      checkOutIp: params.ip,
      status: "CLOSED",
      closedReason: "checkout",
      workingMinutes,
    },
  });

  // Update AttendancePunch for backward compatibility
  await db.attendancePunch.updateMany({
    where: {
      userId: params.userId,
      date: session.date,
    },
    data: {
      outAt: now,
    },
  });

  // Stop all active tracking sessions
  await db.locationTrackingSession.updateMany({
    where: {
      attendanceSessionId: session.id,
      status: "ACTIVE",
    },
    data: {
      status: "STOPPED",
      stoppedAt: now,
      stopReason: "checkout",
    },
  });

  // Store checkout location point
  const trackingSession = await db.locationTrackingSession.findFirst({
    where: { attendanceSessionId: session.id },
    orderBy: { createdAt: "desc" },
  });

  if (trackingSession) {
    await db.locationPoint.create({
      data: {
        trackingSessionId: trackingSession.id,
        latitude: params.location.lat,
        longitude: params.location.lng,
        accuracy: params.location.accuracy,
        altitude: params.location.altitude,
        timestamp: now,
        deviceId: params.deviceId,
        source: "CHECK_OUT",
      },
    });
  }

  // Log audit event
  await db.hrmsAuditLog.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      action: "MOBILE_CHECK_OUT",
      details: {
        sessionId: session.id,
        workingMinutes,
        location: params.location,
        faceVerified: params.faceVerified,
        source: params.source ?? "MOBILE",
        timestamp: now.toISOString(),
      },
    },
  });

  return updated;
}

// ─── Dashboard Queries ────────────────────────────────────────────────────────

export async function getAttendanceStatus(userId: string, orgId: string) {
  const now = await getNow();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [activeSession, todaySession, activeTracking, pendingOnDuty, activeOnDuty] = await Promise.all([
    db.attendanceSession.findFirst({
      where: { userId, orgId, status: "ACTIVE" },
    }),
    db.attendanceSession.findFirst({
      where: { userId, orgId, date: todayDate },
      orderBy: { createdAt: "desc" },
    }),
    db.locationTrackingSession.findFirst({
      where: { userId, orgId, status: "ACTIVE" },
    }),
    db.onDutyRequest.count({
      where: { userId, orgId, status: "PENDING" },
    }),
    db.onDutyRequest.findFirst({
      where: { userId, orgId, status: "ACTIVE" },
    }),
  ]);

  const calendar = await getWorkingCalendar(orgId);
  const isWithinWorkingHours = isWorkingTime(now, calendar);

  return {
    isCheckedIn: !!activeSession,
    activeSession,
    todaySession,
    isTracking: !!activeTracking,
    trackingSession: activeTracking,
    isWithinWorkingHours,
    pendingOnDutyCount: pendingOnDuty,
    activeOnDuty,
    serverTime: now.toISOString(),
    workStartTime: calendar.workStartTime,
    workEndTime: calendar.workEndTime,
  };
}

export async function getAttendanceHistory(userId: string, orgId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [sessions, total] = await Promise.all([
    db.attendanceSession.findMany({
      where: { userId, orgId },
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
    }),
    db.attendanceSession.count({
      where: { userId, orgId },
    }),
  ]);

  return {
    sessions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── Biometric Integration ────────────────────────────────────────────────────

/**
 * Called when a biometric punch is imported — creates an attendance session
 * so the mobile app can start hourly tracking.
 */
export async function createSessionFromBiometric(userId: string, orgId: string, punchTime: Date) {
  const todayDate = new Date(punchTime.getFullYear(), punchTime.getMonth(), punchTime.getDate());

  const existingSession = await db.attendanceSession.findFirst({
    where: { userId, orgId, date: todayDate, status: "ACTIVE" },
  });

  if (existingSession) return existingSession;

  return db.attendanceSession.create({
    data: {
      orgId,
      userId,
      date: todayDate,
      checkInAt: punchTime,
      checkInSource: "BIOMETRIC",
      status: "ACTIVE",
      trackingEnabled: true,
    },
  });
}

// ─── Auto-Close Expired Sessions ──────────────────────────────────────────────

/**
 * Close sessions that are still active but past working hours.
 * Intended to be called by a cron job.
 */
export async function autoCloseExpiredSessions(orgId: string) {
  const now = await getNow();
  const calendar = await getWorkingCalendar(orgId);

  if (isWorkingTime(now, calendar)) return 0;

  const activeSessions = await db.attendanceSession.findMany({
    where: { orgId, status: "ACTIVE" },
  });

  let closed = 0;
  for (const session of activeSessions) {
    const workingMinutes = Math.round((now.getTime() - session.checkInAt.getTime()) / 60000);

    await db.attendanceSession.update({
      where: { id: session.id },
      data: {
        status: "AUTO_CLOSED",
        closedReason: "shift_end",
        checkOutAt: now,
        workingMinutes,
      },
    });

    // Stop tracking
    await db.locationTrackingSession.updateMany({
      where: { attendanceSessionId: session.id, status: "ACTIVE" },
      data: { status: "STOPPED", stoppedAt: now, stopReason: "shift_end" },
    });

    closed++;
  }

  return closed;
}
