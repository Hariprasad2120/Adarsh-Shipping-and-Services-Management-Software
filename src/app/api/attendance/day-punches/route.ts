import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, can } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  getEsslConfig,
  esslDateToUtc,
  punchTable,
  buildDeviceDirMap,
  resolveDirection,
  pairPunches,
  type RawPunch,
} from "@/lib/essl";
import mssql from "mssql";
import { z } from "zod";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employeeId: z.string().optional(),
});

// GET /api/attendance/day-punches?date=YYYY-MM-DD&employeeId=...
export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const parsed = schema.safeParse({
    date: searchParams.get("date") ?? "",
    employeeId: searchParams.get("employeeId") ?? undefined,
  });
  if (!parsed.success) return err("Invalid params");

  let hrmsEmployeeId = session!.user.id;
  if (parsed.data.employeeId && parsed.data.employeeId !== session!.user.id) {
    const isManageable = await can(session!.user.id, "attendance.punch.manage");
    if (!isManageable) return err("Forbidden", 403);
    hrmsEmployeeId = parsed.data.employeeId;
  } else {
    await requirePermission(session!.user.id, "attendance.punch.self");
  }

  // Get the employee's eSSL UserId (= employeeNumber)
  const employee = await db.user.findUnique({
    where: { id: hrmsEmployeeId },
    select: { employeeNumber: true, name: true },
  });
  if (!employee?.employeeNumber) {
    return err("Employee has no employeeNumber linked to eSSL", 404);
  }

  const config = getEsslConfig();
  if (!config) {
    return err("eSSL not configured", 503);
  }

  const [yearStr, monthStr, dayStr] = parsed.data.date.split("-") as [string, string, string];
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Day window (IST stored without tz in eSSL)
  const dayStart = new Date(Date.UTC(year, month - 1, parseInt(dayStr, 10), 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month - 1, parseInt(dayStr, 10), 23, 59, 59));

  const tableName = punchTable(year, month);
  let pool: mssql.ConnectionPool | null = null;

  try {
    pool = await mssql.connect(config);

    const tableCheck = await pool.request()
      .input("tbl", mssql.VarChar, tableName)
      .query<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_NAME=@tbl");
    const actualTable = tableCheck.recordset[0]!.cnt > 0 ? tableName : "DeviceLogs";

    const deviceDirMap = await buildDeviceDirMap(pool);

    const result = await pool.request()
      .input("userId", mssql.NVarChar, String(employee.employeeNumber))
      .input("start",  mssql.DateTime, dayStart)
      .input("end",    mssql.DateTime, dayEnd)
      .query<{ UserId: string; LogDate: Date; Direction: string; DeviceId: number; DeviceSName: string | null }>(`
        SELECT dl.UserId, dl.LogDate, dl.Direction, dl.DeviceId,
               d.DeviceSName
        FROM [${actualTable}] dl
        LEFT JOIN Devices d ON d.DeviceId = dl.DeviceId
        WHERE dl.UserId = @userId
          AND dl.LogDate >= @start
          AND dl.LogDate <= @end
        ORDER BY dl.LogDate ASC
      `);

    const rawPunches: RawPunch[] = result.recordset.map((row) => ({
      time: esslDateToUtc(new Date(row.LogDate)),
      dir: resolveDirection(row.DeviceId, row.Direction, deviceDirMap),
      deviceId: row.DeviceId,
      deviceName: String(row.DeviceSName ?? "Unknown"),
    }));

    const sessions = pairPunches(rawPunches);

    return ok({
      date: parsed.data.date,
      employeeId: hrmsEmployeeId,
      employeeName: employee.name,
      sessions,
      rawPunches: rawPunches.map((p) => ({
        time: p.time.toISOString(),
        dir: p.dir,
        deviceId: p.deviceId,
        deviceName: p.deviceName,
      })),
    });
  } catch (err: any) {
    return err("eSSL error: " + (err.message || String(err)), 500);
  } finally {
    if (pool) await pool.close();
  }
}
