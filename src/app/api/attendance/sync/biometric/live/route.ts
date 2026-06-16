import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getEsslConfig, punchTable, buildDeviceDirMap, resolveDirection, esslDateToUtc, testEsslConnection } from "@/lib/essl";
import { intimateAdminsOffline, createNotification } from "@/modules/notifications/service";
import { getNow } from "@/lib/clock";
import { calculateOtForPunch } from "@/lib/ot";
import mssql from "mssql";

function toDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeToISTMidnight(date: Date): Date {
  const dateStr = toDateString(date);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0));
}

// GET /api/attendance/sync/biometric/live — Returns today's attendance snapshot for all active employees
export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  await requirePermission(session!.user.id, "attendance.punch.manage");

  const orgId = session!.user.orgId;
  if (!orgId) return err("User does not belong to an organisation");

  const nowClock = await getNow();
  const nowIst = new Date(nowClock.getTime() + 5.5 * 60 * 60 * 1000);
  const year = nowIst.getUTCFullYear();
  const month = nowIst.getUTCMonth() + 1;
  const day = nowIst.getUTCDate();
  const todayIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const todayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  // Fetch all active employees + today's attendance punches
  const employees = await db.user.findMany({
    where: { active: true, orgId, isPlatformAdmin: false },
    select: {
      id: true,
      name: true,
      employeeNumber: true,
      department: { select: { name: true } },
      punches: {
        where: { date: todayStart },
        select: { inAt: true, outAt: true, workingHours: true, status: true },
        take: 1,
      },
    },
    orderBy: [{ name: "asc" }],
  });

  const lastSyncLog = await db.biometricSyncLog.findFirst({
    where: { orgId, type: "AUTO" },
    orderBy: { syncTime: "desc" },
  });

  const result = employees.map((emp) => {
    let status: "IN" | "OUT" | "NOT_ARRIVED" | "IDLE" = "NOT_ARRIVED";
    let checkIn: string | null = null;
    let checkOut: string | null = null;
    let checkInPlace: string | null = null;
    let checkOutPlace: string | null = null;
    let workingHours: number | null = null;

    const punch = emp.punches[0] ?? null;
    if (punch?.inAt) {
      checkIn = punch.inAt.toISOString();
      if (punch.outAt) {
        checkOut = punch.outAt.toISOString();
        status = "OUT";
      } else {
        const timeDiffMs = nowClock.getTime() - punch.inAt.getTime();
        const fourHoursMs = 4 * 60 * 60 * 1000;
        status = timeDiffMs >= fourHoursMs ? "IDLE" : "IN";
      }
      workingHours = punch.workingHours ?? null;
    }

    return {
      id: emp.id,
      name: emp.name,
      employeeNumber: emp.employeeNumber,
      department: emp.department?.name ?? null,
      checkIn,
      checkOut,
      workingHours,
      status,
      checkInPlace,
      checkOutPlace,
    };
  });

  return ok({
    date: todayIso,
    employees: result,
    lastLiveSync: lastSyncLog?.syncTime?.toISOString() ?? null,
    presentCount: result.filter((e) => e.status === "IN" || e.status === "IDLE").length,
    outCount: result.filter((e) => e.status === "OUT").length,
    notArrivedCount: result.filter((e) => e.status === "NOT_ARRIVED").length,
  });
}

// POST /api/attendance/sync/biometric/live — Lightweight sync of TODAY's punch data
export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const orgId = session!.user.orgId;
  if (!orgId) return err("User does not belong to an organisation");

  const body = await req.json().catch(() => ({}));
  const triggeredByLabel = body.triggeredBy ?? "LIVE_AUTO";

  const config = getEsslConfig();
  if (!config) {
    return err("eSSL database not configured.", 503);
  }

  // Fast connection test to fail early if host is offline
  const connected = await testEsslConnection(config);
  if (!connected) {
    const errorMsg = "Live biometric sync failed: eSSL database host is offline or unreachable.";
    await db.biometricSyncLog.create({
      data: {
        orgId,
        status: "FAILED",
        type: "AUTO",
        triggeredById: session!.user.id,
        recordsSynced: 0,
        errorMessage: errorMsg,
      },
    });
    await intimateAdminsOffline(orgId, errorMsg);
    return err(errorMsg, 503);
  }

  const startTs = Date.now();
  const nowClock = await getNow();

  // Today's date in IST
  const nowUtc = new Date();
  const nowIst = new Date(nowUtc.getTime() + 5.5 * 60 * 60 * 1000);
  const year = nowIst.getUTCFullYear();
  const month = nowIst.getUTCMonth() + 1;
  const day = nowIst.getUTCDate();
  const todayIst = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const todayIstStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const todayIstEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  const tableName = punchTable(year, month);
  let pool: mssql.ConnectionPool | null = null;

  try {
    pool = await mssql.connect(config);

    // Check partition table
    const tableCheck = await pool.request()
      .input("tbl", mssql.VarChar, tableName)
      .query<{ cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_NAME=@tbl"
      );
    const actualTable = tableCheck.recordset[0]!.cnt > 0 ? tableName : "DeviceLogs";

    // Build device dir map
    const deviceDirMap = await buildDeviceDirMap(pool);

    // Fetch today's punches
    const punchResult = await pool.request()
      .input("start", mssql.DateTime, todayIstStart)
      .input("end", mssql.DateTime, todayIstEnd)
      .query<{ UserId: string; LogDate: Date; Direction: string; DeviceId: number; DeviceSName: string | null }>(`
        SELECT dl.UserId, dl.LogDate, dl.Direction, dl.DeviceId, d.DeviceSName
        FROM [${actualTable}] dl
        LEFT JOIN Devices d ON d.DeviceId = dl.DeviceId
        WHERE dl.LogDate >= @start AND dl.LogDate <= @end
        ORDER BY dl.UserId ASC, dl.LogDate ASC
      `);

    const punches = punchResult.recordset;

    // Group punches by employee
    const punchMap = new Map<string, { time: Date; dir: string; deviceName: string }[]>();
    for (const row of punches) {
      const empId = String(row.UserId ?? "").trim();
      if (!empId) continue;
      const punchTime = esslDateToUtc(new Date(row.LogDate));
      if (!punchMap.has(empId)) punchMap.set(empId, []);
      const dir = resolveDirection(row.DeviceId, row.Direction, deviceDirMap);
      punchMap.get(empId)!.push({ time: punchTime, dir, deviceName: row.DeviceSName ?? "Unknown Device" });
    }

    // Match eSSL employee IDs to HRMS
    const allEmpIds = [...punchMap.keys()];
    const numericIds = allEmpIds.map(Number).filter((n) => !isNaN(n) && n > 0);
    const hrmsEmployees = await db.user.findMany({
      where: { employeeNumber: { in: numericIds }, orgId },
      select: { id: true, employeeNumber: true },
    });
    const empNumberToId = new Map<number, string>();
    for (const emp of hrmsEmployees) {
      if (emp.employeeNumber !== null) empNumberToId.set(emp.employeeNumber, emp.id);
    }

    const hrmsUserIds = hrmsEmployees.map((emp) => emp.id);
    const existingPunches = await db.attendancePunch.findMany({
      where: {
        userId: { in: hrmsUserIds },
        date: todayIstStart,
      },
      select: {
        id: true,
        userId: true,
        inAt: true,
        outAt: true,
        workingHours: true,
      },
    });
    const existingPunchByUserId = new Map(existingPunches.map((p) => [p.userId, p]));

    const existingIdleNotifications = await db.notification.findMany({
      where: {
        userId: { in: hrmsUserIds },
        kind: "IDLE_BREAK_REMINDER",
        createdAt: { gte: todayIstStart, lte: todayIstEnd },
      },
      select: { userId: true },
    });
    const idleReminderUsers = new Set(existingIdleNotifications.map((n) => n.userId));

    let synced = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Save punches
    for (const [esslEmpId, dayPunches] of punchMap) {
      const hrmsId = empNumberToId.get(parseInt(esslEmpId, 10));
      if (!hrmsId) {
        skipped++;
        if (errors.length < 20) {
          errors.push(`emp ${esslEmpId}: not found in HRMS (no matching employeeNumber)`);
        }
        continue;
      }
      if (dayPunches.length === 0) continue;

      dayPunches.sort((a, b) => a.time.getTime() - b.time.getTime());
      const ins = dayPunches.filter((p) => p.dir === "in");
      const outs = dayPunches.filter((p) => p.dir === "out");
      const checkIn = ins[0]?.time ?? dayPunches[0]?.time ?? null;
      // Only mark checked-out if the last punch of the day was "out".
      // If employee returned after lunch (last punch = "in"), keep outAt null.
      const lastDayPunch = dayPunches[dayPunches.length - 1];
      const checkOut = lastDayPunch?.dir === "out" ? (outs[outs.length - 1]?.time ?? null) : null;

      try {
        const attendanceDate = normalizeToISTMidnight(new Date(todayIst));

        let workingHours = null;
        if (checkIn && checkOut) {
          workingHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          workingHours = Math.round(workingHours * 100) / 100;
        }

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

        // Check if employee is IDLE and trigger break reminder
        const lastPunch = dayPunches[dayPunches.length - 1]!;
        if (lastPunch.dir === "in") {
          const timeDiffMs = nowClock.getTime() - lastPunch.time.getTime();
          const fourHoursMs = 4 * 60 * 60 * 1000;
          if (timeDiffMs >= fourHoursMs && !idleReminderUsers.has(hrmsId)) {
            const funnyNote = "You are working hard but small breaks won't make any dent. Go for a walk and stretch your legs!";
            await createNotification({
              userId: hrmsId,
              orgId,
              kind: "IDLE_BREAK_REMINDER",
              title: "Time for a Stretch!",
              body: funnyNote,
              link: "/attendance/punch",
              priority: "normal",
              email: false,
            });
            idleReminderUsers.add(hrmsId);
          }
        }

        if (existing) updated++;
        else synced++;
      } catch (syncError: any) {
        skipped++;
        errors.push(`emp ${esslEmpId}: ${syncError.message || String(syncError)}`);
      }
    }

    const timeTakenMs = Date.now() - startTs;

    const logEntry = {
      time: new Date().toISOString(),
      month: `TODAY (${todayIst})`,
      punchTable: actualTable,
      totalPunches: punches.length,
      uniqueEmployees: allEmpIds.length,
      matchedInHrms: hrmsEmployees.length,
      synced,
      updated,
      skipped,
      status: 200,
      timeTakenMs,
      triggeredBy: "LIVE_AUTO",
    };

    // Log the sync log record
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
      month: `TODAY (${todayIst})`,
      punchTable: actualTable,
      totalPunches: punches.length,
      uniqueEmployees: allEmpIds.length,
      matchedInHrms: hrmsEmployees.length,
      synced,
      updated,
      skipped,
      timeTakenMs,
    });
  } catch (syncError: any) {
    const msg = syncError.message || String(syncError);
    await db.biometricSyncLog.create({
      data: {
        orgId,
        status: "FAILED",
        type: "AUTO",
        triggeredById: session!.user.id,
        recordsSynced: 0,
        errorMessage: msg.substring(0, 500),
      },
    });
    return err("eSSL SQL Server error: " + msg, 500);
  } finally {
    if (pool) await pool.close();
  }
}
