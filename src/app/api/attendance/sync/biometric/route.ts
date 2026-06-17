import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getEsslConfig, punchTable, buildDeviceDirMap, resolveDirection, esslDateToUtc, testEsslConnection } from "@/lib/essl";
import { attendanceDateFromParts, getEsslMonthWindow, toAttendanceDateString } from "@/lib/attendance-date";
import { intimateAdminsOffline, resolveOfflineNotifications } from "@/modules/notifications/service";
import { calculateOtForPunch } from "@/lib/ot";
import mssql from "mssql";
import { z } from "zod";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const syncSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

// GET /api/attendance/sync/biometric — Returns config status and sync log history
export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  await requirePermission(session!.user.id, "attendance.punch.manage");

  const config = getEsslConfig();
  const configured = !!config;
  let connected = false;

  if (config) {
    connected = await testEsslConnection(config);
    if (!connected) {
      await intimateAdminsOffline(session!.user.orgId ?? "", "eSSL database host is unreachable.");
    } else {
      await resolveOfflineNotifications(session!.user.orgId ?? "");
    }
  }

  const dbLogs = await db.biometricSyncLog.findMany({
    where: { orgId: session!.user.orgId ?? "" },
    include: { triggeredBy: true },
    orderBy: { syncTime: "desc" },
    take: 100,
  });

  const logs = dbLogs.map((row) => {
    if (row.errorMessage && row.errorMessage.startsWith("{")) {
      try {
        const parsed = JSON.parse(row.errorMessage);
        return {
          ...parsed,
          id: row.id,
          time: row.syncTime.toISOString(),
        };
      } catch {}
    }
    // Fallback if not JSON or parsing fails
    return {
      id: row.id,
      time: row.syncTime.toISOString(),
      month: row.type === "AUTO" ? "TODAY" : "Manual",
      punchTable: "DeviceLogs",
      totalPunches: row.recordsSynced,
      uniqueEmployees: row.recordsSynced,
      matchedInHrms: row.recordsSynced,
      synced: row.recordsSynced,
      updated: 0,
      skipped: 0,
      status: row.status === "SUCCESS" ? 200 : 500,
      timeTakenMs: 0,
      triggeredBy: row.triggeredBy?.name ?? row.triggeredBy?.email ?? (row.type === "AUTO" ? "LIVE_AUTO" : "System"),
    };
  });

  return ok({
    configured,
    connected,
    logs,
  });
}

// POST /api/attendance/sync/biometric — Run manual sync for a month
export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  await requirePermission(session!.user.id, "attendance.punch.manage");

  const orgId = session!.user.orgId;
  if (!orgId) return err("User does not belong to an organisation");

  const body = await req.json();
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return err("Invalid input: month format must be YYYY-MM", 400);

  const syncStart = Date.now();

  const config = getEsslConfig();
  if (!config) return err("eSSL database not configured.", 503);

  // Fast connection test to fail early if host is offline
  const connected = await testEsslConnection(config);
  if (!connected) {
    const errorMsg = "Biometric sync failed: eSSL database host is offline or unreachable.";
    await db.biometricSyncLog.create({
      data: {
        orgId,
        status: "FAILED",
        type: "MANUAL",
        triggeredById: session!.user.id,
        recordsSynced: 0,
        errorMessage: errorMsg,
      },
    });
    await intimateAdminsOffline(orgId, errorMsg);
    return err(errorMsg, 503);
  }

  const [yearStr, monthStr] = parsed.data.month.split("-");
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10);

  const { start: paddedStart, endExclusive: paddedEnd } = getEsslMonthWindow(year, month);

  const tableName = punchTable(year, month);
  let pool: mssql.ConnectionPool | null = null;

  try {
    pool = await mssql.connect(config);

    // Verify partitioned table exists
    const tableCheck = await pool.request()
      .input("tbl", mssql.VarChar, tableName)
      .query<{ cnt: number }>(`
        SELECT COUNT(*) AS cnt
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = @tbl
      `);

    if (tableCheck.recordset[0]!.cnt === 0) {
      const fallbackCheck = await pool.request()
        .query<{ cnt: number }>(`
          SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = 'DeviceLogs'
        `);

      if (fallbackCheck.recordset[0]!.cnt === 0) {
        // Log failure in BiometricSyncLog
        await db.biometricSyncLog.create({
          data: {
            orgId,
            status: "FAILED",
            type: "MANUAL",
            triggeredById: session!.user.id,
            recordsSynced: 0,
            errorMessage: `Punch table "${tableName}" and DeviceLogs fallback not found.`,
          },
        });
        return err(`Punch table "${tableName}" not found and no DeviceLogs fallback exists.`, 422);
      }
    }

    const actualTable = tableCheck.recordset[0]!.cnt > 0 ? tableName : "DeviceLogs";

    // Build device dir map
    const deviceDirMap = await buildDeviceDirMap(pool);

    // Fetch punches
    const punchResult = await pool.request()
      .input("start", mssql.DateTime, paddedStart)
      .input("end", mssql.DateTime, paddedEnd)
      .query<{ UserId: string; LogDate: Date; Direction: string; DeviceId: number }>(`
        SELECT UserId, LogDate, Direction, DeviceId
        FROM [${actualTable}]
        WHERE LogDate >= @start AND LogDate < @end
        ORDER BY UserId ASC, LogDate ASC
      `);

    const punches = punchResult.recordset;

    // Group punches by employee + date
    const punchMap = new Map<string, { time: Date; dir: string }[]>();
    for (const row of punches) {
      const empId = String(row.UserId ?? "").trim();
      if (!empId) continue;

      const punchTime = esslDateToUtc(new Date(row.LogDate));
      const dateStr = toAttendanceDateString(punchTime);
      const key = `${empId}|${dateStr}`;

      if (!punchMap.has(key)) punchMap.set(key, []);
      const dir = resolveDirection(row.DeviceId, row.Direction, deviceDirMap);
      punchMap.get(key)!.push({ time: punchTime, dir });
    }

    // Match eSSL employee IDs to HRMS users
    const allEmpIds = [...new Set(punches.map((p) => String(p.UserId).trim()))];
    const numericIds = allEmpIds.map(Number).filter((n) => !isNaN(n) && n > 0);

    const hrmsEmployees = await db.user.findMany({
      where: { employeeNumber: { in: numericIds }, orgId },
      select: { id: true, employeeNumber: true },
    });

    const empNumberToId = new Map<number, string>();
    for (const emp of hrmsEmployees) {
      if (emp.employeeNumber !== null) empNumberToId.set(emp.employeeNumber, emp.id);
    }

    let synced = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Save attendance punches
    for (const [key, dayPunches] of punchMap) {
      const [esslEmpId, dateStr] = key.split("|") as [string, string];
      const empNumber = parseInt(esslEmpId, 10);
      const hrmsId = empNumberToId.get(empNumber);

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
      const checkOut = outs[outs.length - 1]?.time ?? null;

      try {
        const [attendanceYear, attendanceMonth, attendanceDay] = dateStr.split("-").map(Number);
        const attendanceDate = attendanceDateFromParts(attendanceYear!, attendanceMonth!, attendanceDay!);

        // Calculate working hours if both exist
        let workingHours = null;
        if (checkIn && checkOut) {
          workingHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          workingHours = Math.round(workingHours * 100) / 100;
        }

        const existing = await db.attendancePunch.findUnique({
          where: { userId_date: { userId: hrmsId, date: attendanceDate } },
          select: { id: true },
        });

        // Upsert punch record
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

        // Recalculate OT and Comp-Off for this punch
        await calculateOtForPunch(hrmsId, attendanceDate);

        if (existing) updated++;
        else synced++;
      } catch (syncError: unknown) {
        skipped++;
        if (errors.length < 20) {
          errors.push(`emp ${esslEmpId} on ${dateStr}: ${getErrorMessage(syncError)}`);
        }
      }
    }

    const timeTakenMs = Date.now() - syncStart;

    const logEntry = {
      time: new Date().toISOString(),
      month: parsed.data.month,
      punchTable: actualTable,
      totalPunches: punches.length,
      uniqueEmployees: allEmpIds.length,
      matchedInHrms: hrmsEmployees.length,
      synced,
      updated,
      skipped,
      status: 200,
      timeTakenMs,
      triggeredBy: session!.user.name ?? session!.user.email ?? "unknown",
    };

    // Log the sync log record
    await db.biometricSyncLog.create({
      data: {
        orgId,
        status: "SUCCESS",
        type: "MANUAL",
        triggeredById: session!.user.id,
        recordsSynced: synced,
        errorMessage: JSON.stringify(logEntry),
      },
    });

    return ok({
      success: true,
      month: parsed.data.month,
      punchTable: actualTable,
      totalPunches: punches.length,
      uniqueEmployees: allEmpIds.length,
      matchedInHrms: hrmsEmployees.length,
      synced,
      updated,
      skipped,
      errors,
      totalErrors: errors.length,
      timeTakenMs,
    });

  } catch (syncError: unknown) {
    const msg = getErrorMessage(syncError);
    await db.biometricSyncLog.create({
      data: {
        orgId,
        status: "FAILED",
        type: "MANUAL",
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
