import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  getEsslConfig,
  punchTable,
  buildDeviceDirMap,
  resolveDirection,
  esslDateToUtc,
  testEsslConnection,
} from "@/lib/essl";
import { attendanceDateFromParts, getAttendanceDayBounds, getAttendanceDateParts, getEsslDayWindow } from "@/lib/attendance-date";
import { intimateAdminsOffline, createNotification } from "@/modules/notifications/service";
import { getNow } from "@/lib/clock";
import { calculateOtForPunch } from "@/lib/ot";
import mssql from "mssql";

type LiveStatus = "IN" | "OUT" | "NOT_ARRIVED" | "IDLE";

type LiveEmployeeRow = {
  id: string;
  name: string;
  employeeNumber: number | null;
  department: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number | null;
  status: LiveStatus;
  checkInPlace: string | null;
  checkOutPlace: string | null;
};

type ActiveEmployee = {
  id: string;
  name: string;
  employeeNumber: number | null;
  department: { name: string } | null;
};

type EsslPunch = {
  time: Date;
  dir: string;
  deviceName: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function summarizeEsslPunches(
  punches: EsslPunch[],
  nowClock: Date
): Omit<LiveEmployeeRow, "id" | "name" | "employeeNumber" | "department"> {
  if (punches.length === 0) {
    return {
      checkIn: null,
      checkOut: null,
      workingHours: null,
      status: "NOT_ARRIVED",
      checkInPlace: null,
      checkOutPlace: null,
    };
  }

  const sorted = [...punches].sort((left, right) => left.time.getTime() - right.time.getTime());
  const ins = sorted.filter((punch) => punch.dir === "in");
  const outs = sorted.filter((punch) => punch.dir === "out");
  const firstPunch = sorted[0] ?? null;
  const checkInPunch = ins[0] ?? firstPunch;
  const lastPunch = sorted[sorted.length - 1] ?? null;
  const checkOutPunch =
    lastPunch?.dir === "out" ? (outs[outs.length - 1] ?? lastPunch) : null;

  let workingHours: number | null = null;
  let status: LiveStatus = "NOT_ARRIVED";

  if (checkInPunch && checkOutPunch) {
    workingHours = roundHours(
      (checkOutPunch.time.getTime() - checkInPunch.time.getTime()) / 3600000
    );
    status = "OUT";
  } else if (checkInPunch) {
    workingHours = roundHours(
      Math.max(0, nowClock.getTime() - checkInPunch.time.getTime()) / 3600000
    );
    const idleThresholdMs = 4 * 60 * 60 * 1000;
    const sinceLastPunchMs = lastPunch
      ? nowClock.getTime() - lastPunch.time.getTime()
      : nowClock.getTime() - checkInPunch.time.getTime();
    status = sinceLastPunchMs >= idleThresholdMs ? "IDLE" : "IN";
  }

  return {
    checkIn: checkInPunch?.time.toISOString() ?? null,
    checkOut: checkOutPunch?.time.toISOString() ?? null,
    workingHours,
    status,
    checkInPlace: checkInPunch?.deviceName ?? null,
    checkOutPlace: checkOutPunch?.deviceName ?? null,
  };
}

async function listActiveEmployees(orgId: string): Promise<ActiveEmployee[]> {
  return db.user.findMany({
    where: { active: true, orgId, isPlatformAdmin: false },
    select: {
      id: true,
      name: true,
      employeeNumber: true,
      department: { select: { name: true } },
    },
    orderBy: [{ name: "asc" }],
  });
}

async function buildDbFallbackSnapshot(orgId: string, nowClock: Date) {
  const { date: attendanceDate, dateString } = getAttendanceDayBounds(nowClock);

  const employees = await db.user.findMany({
    where: { active: true, orgId, isPlatformAdmin: false },
    select: {
      id: true,
      name: true,
      employeeNumber: true,
      department: { select: { name: true } },
      punches: {
        where: { date: attendanceDate },
        select: { inAt: true, outAt: true, workingHours: true },
        take: 1,
      },
    },
    orderBy: [{ name: "asc" }],
  });

  const snapshot = employees.map((employee) => {
    const punch = employee.punches[0] ?? null;
    let status: LiveStatus = "NOT_ARRIVED";
    let checkIn: string | null = null;
    let checkOut: string | null = null;
    let workingHours: number | null = null;

    if (punch?.inAt) {
      checkIn = punch.inAt.toISOString();
      if (punch.outAt) {
        checkOut = punch.outAt.toISOString();
        workingHours = punch.workingHours ?? roundHours((punch.outAt.getTime() - punch.inAt.getTime()) / 3600000);
        status = "OUT";
      } else {
        workingHours = punch.workingHours ?? roundHours(Math.max(0, nowClock.getTime() - punch.inAt.getTime()) / 3600000);
        status = nowClock.getTime() - punch.inAt.getTime() >= 4 * 60 * 60 * 1000 ? "IDLE" : "IN";
      }
    }

    return {
      id: employee.id,
      name: employee.name,
      employeeNumber: employee.employeeNumber,
      department: employee.department?.name ?? null,
      checkIn,
      checkOut,
      workingHours,
      status,
      checkInPlace: null,
      checkOutPlace: null,
    };
  });

  return {
    date: dateString,
    employees: snapshot,
    source: "db-fallback" as const,
    degraded: true,
  };
}

async function fetchTodayEsslSnapshot(orgId: string, nowClock: Date) {
  const config = getEsslConfig();
  if (!config) {
    const fallback = await buildDbFallbackSnapshot(orgId, nowClock);
    return {
      ...fallback,
      message: "eSSL database is not configured. Showing local attendance records.",
    };
  }

  const connected = await testEsslConnection(config);
  if (!connected) {
    const fallback = await buildDbFallbackSnapshot(orgId, nowClock);
    return {
      ...fallback,
      message: "eSSL is offline. Showing the latest local attendance records.",
    };
  }

  const employees = await listActiveEmployees(orgId);
  const today = getAttendanceDateParts(nowClock);
  const { start: todayStart, end: todayEnd, dateString } = getEsslDayWindow(nowClock);
  const tableName = punchTable(today.year, today.month);

  let pool: mssql.ConnectionPool | null = null;

  try {
    pool = await mssql.connect(config);

    const tableCheck = await pool.request()
      .input("tbl", mssql.VarChar, tableName)
      .query<{ cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_NAME=@tbl"
      );
    const actualTable = tableCheck.recordset[0]!.cnt > 0 ? tableName : "DeviceLogs";

    const deviceDirMap = await buildDeviceDirMap(pool);
    const punchResult = await pool.request()
      .input("start", mssql.DateTime, todayStart)
      .input("end", mssql.DateTime, todayEnd)
      .query<{ UserId: string; LogDate: Date; Direction: string; DeviceId: number; DeviceSName: string | null }>(`
        SELECT dl.UserId, dl.LogDate, dl.Direction, dl.DeviceId, d.DeviceSName
        FROM [${actualTable}] dl
        LEFT JOIN Devices d ON d.DeviceId = dl.DeviceId
        WHERE dl.LogDate >= @start AND dl.LogDate <= @end
        ORDER BY dl.UserId ASC, dl.LogDate ASC
      `);

    const punchesByEmployeeNumber = new Map<number, EsslPunch[]>();
    for (const row of punchResult.recordset) {
      const employeeNumber = Number(String(row.UserId ?? "").trim());
      if (!Number.isFinite(employeeNumber) || employeeNumber <= 0) continue;

      const normalizedPunch = {
        time: esslDateToUtc(new Date(row.LogDate)),
        dir: resolveDirection(row.DeviceId, row.Direction, deviceDirMap),
        deviceName: row.DeviceSName ?? "Unknown Device",
      };

      const existing = punchesByEmployeeNumber.get(employeeNumber) ?? [];
      existing.push(normalizedPunch);
      punchesByEmployeeNumber.set(employeeNumber, existing);
    }

    const result = employees.map((employee) => {
      const summary = employee.employeeNumber
        ? summarizeEsslPunches(punchesByEmployeeNumber.get(employee.employeeNumber) ?? [], nowClock)
        : summarizeEsslPunches([], nowClock);

      return {
        id: employee.id,
        name: employee.name,
        employeeNumber: employee.employeeNumber,
        department: employee.department?.name ?? null,
        ...summary,
      };
    });

    return {
      date: dateString,
      employees: result,
      source: "essl" as const,
      degraded: false,
    };
  } catch {
    const fallback = await buildDbFallbackSnapshot(orgId, nowClock);
    return {
      ...fallback,
      message: `Live eSSL query failed. Showing local attendance records instead.`,
    };
  } finally {
    if (pool) await pool.close();
  }
}

async function getLastLiveSync(orgId: string) {
  const lastSyncLog = await db.biometricSyncLog.findFirst({
    where: { orgId, type: "AUTO" },
    orderBy: { syncTime: "desc" },
  });
  return lastSyncLog?.syncTime?.toISOString() ?? null;
}

// GET /api/attendance/sync/biometric/live — Returns today's attendance snapshot for all active employees
export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  await requirePermission(session!.user.id, "attendance.punch.manage");

  const orgId = session!.user.orgId;
  if (!orgId) return err("User does not belong to an organisation");

  const nowClock = await getNow();
  const snapshot = await fetchTodayEsslSnapshot(orgId, nowClock);
  const lastLiveSync = await getLastLiveSync(orgId);

  return ok({
    ...snapshot,
    lastLiveSync,
    presentCount: snapshot.employees.filter((employee) => employee.status === "IN" || employee.status === "IDLE").length,
    outCount: snapshot.employees.filter((employee) => employee.status === "OUT").length,
    notArrivedCount: snapshot.employees.filter((employee) => employee.status === "NOT_ARRIVED").length,
  });
}

// POST /api/attendance/sync/biometric/live — Lightweight sync of TODAY's punch data
export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  await requirePermission(session!.user.id, "attendance.punch.manage");

  const orgId = session!.user.orgId;
  if (!orgId) return err("User does not belong to an organisation");

  const body = await req.json().catch(() => ({}));
  const triggeredByLabel = body.triggeredBy ?? "LIVE_AUTO";

  const config = getEsslConfig();
  if (!config) {
    return err("eSSL database not configured.", 503);
  }

  const connected = await testEsslConnection(config);
  if (!connected) {
    const errorMessage = "Live biometric sync failed: eSSL database host is offline or unreachable.";
    await db.biometricSyncLog.create({
      data: {
        orgId,
        status: "FAILED",
        type: "AUTO",
        triggeredById: session!.user.id,
        recordsSynced: 0,
        errorMessage,
      },
    });
    await intimateAdminsOffline(orgId, errorMessage);
    return err(errorMessage, 503);
  }

  const startTs = Date.now();
  const nowClock = await getNow();
  const today = getAttendanceDateParts(nowClock);
  const attendanceDate = attendanceDateFromParts(today.year, today.month, today.day);
  const { start: todayStart, end: todayEnd, dateString: todayString } = getEsslDayWindow(nowClock);
  const tableName = punchTable(today.year, today.month);

  let pool: mssql.ConnectionPool | null = null;

  try {
    pool = await mssql.connect(config);

    const tableCheck = await pool.request()
      .input("tbl", mssql.VarChar, tableName)
      .query<{ cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_NAME=@tbl"
      );
    const actualTable = tableCheck.recordset[0]!.cnt > 0 ? tableName : "DeviceLogs";
    const deviceDirMap = await buildDeviceDirMap(pool);

    const punchResult = await pool.request()
      .input("start", mssql.DateTime, todayStart)
      .input("end", mssql.DateTime, todayEnd)
      .query<{ UserId: string; LogDate: Date; Direction: string; DeviceId: number; DeviceSName: string | null }>(`
        SELECT dl.UserId, dl.LogDate, dl.Direction, dl.DeviceId, d.DeviceSName
        FROM [${actualTable}] dl
        LEFT JOIN Devices d ON d.DeviceId = dl.DeviceId
        WHERE dl.LogDate >= @start AND dl.LogDate <= @end
        ORDER BY dl.UserId ASC, dl.LogDate ASC
      `);

    const punchMap = new Map<string, EsslPunch[]>();
    for (const row of punchResult.recordset) {
      const employeeId = String(row.UserId ?? "").trim();
      if (!employeeId) continue;

      const normalized = {
        time: esslDateToUtc(new Date(row.LogDate)),
        dir: resolveDirection(row.DeviceId, row.Direction, deviceDirMap),
        deviceName: row.DeviceSName ?? "Unknown Device",
      };

      const existing = punchMap.get(employeeId) ?? [];
      existing.push(normalized);
      punchMap.set(employeeId, existing);
    }

    const allEmployeeNumbers = [...punchMap.keys()];
    const numericIds = allEmployeeNumbers.map(Number).filter((value) => !Number.isNaN(value) && value > 0);
    const hrmsEmployees = await db.user.findMany({
      where: { employeeNumber: { in: numericIds }, orgId },
      select: { id: true, employeeNumber: true },
    });

    const employeeNumberToUserId = new Map<number, string>();
    for (const employee of hrmsEmployees) {
      if (employee.employeeNumber !== null) {
        employeeNumberToUserId.set(employee.employeeNumber, employee.id);
      }
    }

    const hrmsUserIds = hrmsEmployees.map((employee) => employee.id);
    const existingPunches = await db.attendancePunch.findMany({
      where: {
        userId: { in: hrmsUserIds },
        date: attendanceDate,
      },
      select: {
        id: true,
        userId: true,
        inAt: true,
        outAt: true,
        workingHours: true,
      },
    });
    const existingPunchByUserId = new Map(existingPunches.map((punch) => [punch.userId, punch]));

    const existingIdleNotifications = await db.notification.findMany({
      where: {
        userId: { in: hrmsUserIds },
        kind: "IDLE_BREAK_REMINDER",
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      select: { userId: true },
    });
    const idleReminderUsers = new Set(existingIdleNotifications.map((notification) => notification.userId));

    let synced = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [esslEmployeeId, dayPunches] of punchMap) {
      const hrmsId = employeeNumberToUserId.get(parseInt(esslEmployeeId, 10));
      if (!hrmsId) {
        skipped++;
        if (errors.length < 20) {
          errors.push(`emp ${esslEmployeeId}: not found in HRMS (no matching employeeNumber)`);
        }
        continue;
      }

      if (dayPunches.length === 0) continue;

      const sortedPunches = [...dayPunches].sort((left, right) => left.time.getTime() - right.time.getTime());
      const ins = sortedPunches.filter((punch) => punch.dir === "in");
      const outs = sortedPunches.filter((punch) => punch.dir === "out");
      const checkIn = ins[0]?.time ?? sortedPunches[0]?.time ?? null;
      const lastDayPunch = sortedPunches[sortedPunches.length - 1] ?? null;
      const checkOut = outs[outs.length - 1]?.time ?? null;

      try {
        const workingHours =
          checkIn && checkOut
            ? roundHours((checkOut.getTime() - checkIn.getTime()) / 3600000)
            : null;

        const existing = existingPunchByUserId.get(hrmsId);
        const unchanged =
          existing &&
          existing.inAt?.getTime() === checkIn?.getTime() &&
          existing.outAt?.getTime() === checkOut?.getTime() &&
          existing.workingHours === workingHours;

        if (!unchanged) {
          await db.attendancePunch.upsert({
            where: { userId_date: { userId: hrmsId, date: attendanceDate } },
            update: {
              inAt: checkIn,
              outAt: checkOut,
              workingHours,
              source: "biometric",
              biometricSynced: true,
            },
            create: {
              userId: hrmsId,
              date: attendanceDate,
              inAt: checkIn,
              outAt: checkOut,
              workingHours,
              source: "biometric",
              biometricSynced: true,
            },
          });

          await calculateOtForPunch(hrmsId, attendanceDate);
        }

        if (lastDayPunch?.dir === "in") {
          const timeDiffMs = nowClock.getTime() - lastDayPunch.time.getTime();
          if (timeDiffMs >= 4 * 60 * 60 * 1000 && !idleReminderUsers.has(hrmsId)) {
            await createNotification({
              userId: hrmsId,
              orgId,
              kind: "IDLE_BREAK_REMINDER",
              title: "Time for a Stretch!",
              body: "You are working hard but small breaks won't make any dent. Go for a walk and stretch your legs!",
              link: "/attendance/punch",
              priority: "normal",
              email: false,
            });
            idleReminderUsers.add(hrmsId);
          }
        }

        if (existing) updated++;
        else synced++;
      } catch (syncError: unknown) {
        skipped++;
        if (errors.length < 20) {
          errors.push(`emp ${esslEmployeeId}: ${getErrorMessage(syncError)}`);
        }
      }
    }

    const timeTakenMs = Date.now() - startTs;
    const logEntry = {
      time: new Date().toISOString(),
      month: `TODAY (${todayString})`,
      punchTable: actualTable,
      totalPunches: punchResult.recordset.length,
      uniqueEmployees: allEmployeeNumbers.length,
      matchedInHrms: hrmsEmployees.length,
      synced,
      updated,
      skipped,
      status: 200,
      timeTakenMs,
      triggeredBy: triggeredByLabel,
    };

    await db.biometricSyncLog.create({
      data: {
        orgId,
        status: "SUCCESS",
        type: "AUTO",
        triggeredById: session!.user.id,
        recordsSynced: synced,
        errorMessage: JSON.stringify(logEntry),
      },
    });

    return ok({
      success: true,
      month: `TODAY (${todayString})`,
      punchTable: actualTable,
      totalPunches: punchResult.recordset.length,
      uniqueEmployees: allEmployeeNumbers.length,
      matchedInHrms: hrmsEmployees.length,
      synced,
      updated,
      skipped,
      errors,
      timeTakenMs,
    });
  } catch (syncError: unknown) {
    const message = getErrorMessage(syncError);
    await db.biometricSyncLog.create({
      data: {
        orgId,
        status: "FAILED",
        type: "AUTO",
        triggeredById: session!.user.id,
        recordsSynced: 0,
        errorMessage: message.substring(0, 500),
      },
    });
    return err("eSSL SQL Server error: " + message, 500);
  } finally {
    if (pool) await pool.close();
  }
}
