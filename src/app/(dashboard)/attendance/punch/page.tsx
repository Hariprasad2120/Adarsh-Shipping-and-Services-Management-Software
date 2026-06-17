import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission, loadCaps } from "@/lib/rbac";
import { getMonthAttendance } from "@/modules/attendance/service";
import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { getAttendanceDateParts, getAttendanceMonthBounds, getEsslMonthWindow } from "@/lib/attendance-date";
import { PunchCard } from "./punch-card";
import {
  getEsslConfig,
  esslDateToUtc,
  punchTable,
  buildDeviceDirMap,
  resolveDirection,
  pairPunches,
  IST_OFFSET_MS,
  type PunchSession,
} from "@/lib/essl";
import mssql from "mssql";

async function fetchMonthSessions(
  employeeNumber: number | null,
  year: number,
  month: number
): Promise<Record<string, PunchSession[]>> {
  if (!employeeNumber) return {};
  const config = getEsslConfig();
  if (!config) return {};

  let pool: mssql.ConnectionPool | null = null;
  try {
    pool = await mssql.connect({ ...config, connectionTimeout: 5000, requestTimeout: 10000 });

    const tableName = punchTable(year, month);
    const tableCheck = await pool.request()
      .input("tbl", mssql.VarChar, tableName)
      .query<{ cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_NAME=@tbl"
      );
    const actualTable = tableCheck.recordset[0]!.cnt > 0 ? tableName : "DeviceLogs";

    const deviceDirMap = await buildDeviceDirMap(pool);

    const { start: monthStart, end: monthEnd } = getEsslMonthWindow(year, month);

    const result = await pool.request()
      .input("userId", mssql.NVarChar, String(employeeNumber))
      .input("start", mssql.DateTime, monthStart)
      .input("end", mssql.DateTime, monthEnd)
      .query<{ LogDate: Date; Direction: string; DeviceId: number; DeviceSName: string | null }>(`
        SELECT dl.LogDate, dl.Direction, dl.DeviceId, d.DeviceSName
        FROM [${actualTable}] dl
        LEFT JOIN Devices d ON d.DeviceId = dl.DeviceId
        WHERE dl.UserId = @userId
          AND dl.LogDate >= @start
          AND dl.LogDate <= @end
        ORDER BY dl.LogDate ASC
      `);

    const byDate: Record<string, { time: Date; dir: string; deviceId: number; deviceName: string }[]> = {};

    for (const row of result.recordset) {
      const utcTime = esslDateToUtc(new Date(row.LogDate));
      const dir = resolveDirection(row.DeviceId, row.Direction, deviceDirMap);
      // Group by IST calendar date
      const istMs = utcTime.getTime() + IST_OFFSET_MS;
      const istDate = new Date(istMs);
      const dateStr = `${istDate.getUTCFullYear()}-${String(istDate.getUTCMonth() + 1).padStart(2, "0")}-${String(istDate.getUTCDate()).padStart(2, "0")}`;

      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push({ time: utcTime, dir, deviceId: row.DeviceId, deviceName: String(row.DeviceSName ?? "Unknown") });
    }

    const out: Record<string, PunchSession[]> = {};
    for (const [date, rawPunches] of Object.entries(byDate)) {
      out[date] = pairPunches(rawPunches);
    }
    return out;
  } catch {
    return {};
  } finally {
    if (pool) {
      try { await pool.close(); } catch {}
    }
  }
}

export default async function PunchPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string; year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const now = await getNow();

  const caps = await loadCaps(session.user.id);
  const canManage = Boolean(caps["attendance.punch.manage"]);

  let targetEmployeeId = session.user.id;
  if (sp.employeeId && sp.employeeId !== session.user.id) {
    if (!canManage) {
      redirect("/attendance/punch");
    }
    targetEmployeeId = sp.employeeId;
  } else {
    await requirePermission(session.user.id, "attendance.punch.self");
  }

  const today = getAttendanceDateParts(now);
  const selectedYear = sp.year ? parseInt(sp.year, 10) : today.year;
  const selectedMonth = sp.month ? parseInt(sp.month, 10) : today.month;

  const targetUser = await db.user.findUnique({
    where: { id: targetEmployeeId },
    select: { id: true, name: true, employeeNumber: true },
  });

  if (!targetUser) {
    redirect("/attendance/punch");
  }

  // Load all active employees for switcher if user is admin
  let employees: { id: string; name: string; employeeNumber: number | null }[] = [];
  if (canManage) {
    const dbEmployees = await db.user.findMany({
      where: { orgId: session.user.orgId, active: true },
      select: { id: true, name: true, employeeNumber: true },
      orderBy: { name: "asc" },
    });
    employees = dbEmployees.map((e) => ({
      id: e.id,
      name: e.name,
      employeeNumber: e.employeeNumber ? Number(e.employeeNumber) : null,
    }));
  }

  const { start: from, end: to } = getAttendanceMonthBounds(selectedYear, selectedMonth);

  const [punches, otRecords, monthSessions] = await Promise.all([
    getMonthAttendance(targetEmployeeId, selectedYear, selectedMonth),
    db.otRecord.findMany({
      where: { userId: targetEmployeeId, date: { gte: from, lte: to } },
      select: { date: true, otHours: true, otAmount: true, dayType: true },
    }),
    fetchMonthSessions(targetUser.employeeNumber, selectedYear, selectedMonth),
  ]);

  const punchRows = punches.map((p) => ({
    id: p.id,
    date: p.date.toISOString(),
    inAt: p.inAt?.toISOString() ?? null,
    outAt: p.outAt?.toISOString() ?? null,
  }));

  const otRows = otRecords.map((o) => ({
    date: o.date.toISOString(),
    otHours: o.otHours,
    otAmount: o.otAmount,
    dayType: o.dayType,
  }));

  return (
    <PunchCard
      punches={punchRows}
      otRecords={otRows}
      today={now.toISOString()}
      canManage={canManage}
      employees={employees}
      selectedEmployeeId={targetEmployeeId}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth}
      monthSessions={monthSessions}
    />
  );
}
