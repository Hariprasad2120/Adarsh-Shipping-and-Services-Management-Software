/**
 * OT and comp-off calculation engine.
 * Computes hours, rates, penalties, and grace periods based on attendance punches,
 * holidays, and LOP parameters.
 */

import { db } from "@/lib/db";
import { isWorkingDate, calendarFromDb } from "@/lib/working-hours";

export interface CompOffSlab {
  minHours: number;
  compOffDays: number;
}

export const DEFAULT_COMPOFF_SLABS: CompOffSlab[] = [
  { minHours: 4, compOffDays: 0.5 },
  { minHours: 8, compOffDays: 1.0 },
  { minHours: 11, compOffDays: 1.5 },
];

export const DEFAULT_OT_SETTINGS = {
  standardHours: 8.0,
  otRate: 1.5,
  graceMinutes: 15,
  compOffSlabs: DEFAULT_COMPOFF_SLABS,
};

export function toDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function normalizeToISTMidnight(date: Date): Date {
  const dateStr = toDateString(date);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0));
}

/**
 * Counts the number of working days in a selected month.
 * Excludes weekend off-days and public holidays.
 */
export function countWorkingDaysInMonth(
  year: number,
  month: number,
  calendarConfig: any
): number {
  const lastDay = new Date(year, month, 0).getDate();
  let total = 0;

  for (let d = 1; d <= lastDay; d++) {
    const current = new Date(Date.UTC(year, month - 1, d, 12, 0, 0));
    const dateKey = toDateString(current);
    if (isWorkingDate(dateKey, calendarConfig)) {
      total++;
    }
  }

  return total || 24; // fallback to standard 24 working days if 0
}

/**
 * Resolves the employee's dynamic OT rate per hour based on CTC.
 * Fallback to standard OT rate multiplier if CTC or payroll information is missing.
 */
export async function getEmployeeHourlyOtRate(
  userId: string,
  date: Date,
  settings: typeof DEFAULT_OT_SETTINGS,
  calendarConfig: any
): Promise<number> {
  const empRecord = await db.employmentRecord.findUnique({
    where: { userId },
  });

  const annualCtc = empRecord?.ctc;
  if (!annualCtc || annualCtc <= 0) {
    // Fallback standard rate per hour (rate index * standard 100 base or settings.otRate base)
    return settings.otRate * 100;
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const workingDays = countWorkingDaysInMonth(year, month, calendarConfig);
  const standardMonthlyHours = workingDays * settings.standardHours;

  if (standardMonthlyHours <= 0) return settings.otRate * 100;

  const monthlyGross = annualCtc / 12;
  const hourlyRate = monthlyGross / standardMonthlyHours;
  return Number(hourlyRate.toFixed(2));
}

/**
 * Calculates overtime and comp-off allocations for a single punch date.
 */
export async function calculateOtForPunch(userId: string, date: Date): Promise<boolean> {
  const attendanceDate = normalizeToISTMidnight(date);

  const punch = await db.attendancePunch.findUnique({
    where: { userId_date: { userId, date: attendanceDate } },
  });

  // If no check-in/out or workingHours is recorded, check and delete existing OT record
  if (!punch || !punch.inAt || !punch.outAt || !punch.workingHours || punch.workingHours <= 0) {
    await db.otRecord.deleteMany({
      where: { userId, date: attendanceDate },
    });
    return false;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });

  if (!user?.orgId) return false;
  const orgId = user.orgId;

  // Retrieve configurations
  const [dbCalendar, dbSettings, dbHolidays] = await Promise.all([
    db.workingCalendar.findUnique({ where: { orgId } }),
    db.otSettings.findUnique({ where: { orgId } }),
    db.holiday.findMany({
      where: {
        orgId,
        date: {
          gte: new Date(date.getFullYear(), date.getMonth(), 1),
          lte: new Date(date.getFullYear(), date.getMonth() + 1, 0),
        },
      },
    }),
  ]);

  const holidayDateStrings = dbHolidays.map((h) => toDateString(h.date));
  const calendarConfig = calendarFromDb(dbCalendar as any, holidayDateStrings);

  const settings = {
    standardHours: dbSettings?.standardHours ?? DEFAULT_OT_SETTINGS.standardHours,
    otRate: dbSettings?.otRate ?? DEFAULT_OT_SETTINGS.otRate,
    graceMinutes: dbSettings?.graceMinutes ?? DEFAULT_OT_SETTINGS.graceMinutes,
    compOffSlabs: Array.isArray(dbSettings?.compOffSlabs)
      ? (dbSettings?.compOffSlabs as unknown as CompOffSlab[])
      : DEFAULT_OT_SETTINGS.compOffSlabs,
  };

  // Determine day type
  const dateKey = toDateString(attendanceDate);
  const isWorking = isWorkingDate(dateKey, calendarConfig);
  let dayType: "WORKING_DAY" | "HOLIDAY" | "WEEKEND" = "WORKING_DAY";

  if (!isWorking) {
    if (holidayDateStrings.includes(dateKey)) {
      dayType = "HOLIDAY";
    } else {
      dayType = "WEEKEND";
    }
  }

  // Check regularization penalty
  const regularization = await db.attendanceRegularization.findUnique({
    where: { userId_date: { userId, date: attendanceDate } },
  });
  const isRegularized = regularization?.status === "APPROVED";

  const hoursWorked = punch.workingHours;
  const minutesWorked = Math.round(hoursWorked * 60);
  const standardMinutes = Math.round(settings.standardHours * 60);

  let otHours = 0;
  let otRatePerHour = 0;
  let otAmount = 0;
  let compOffDays = 0;
  let earlyLeavingMins = 0;

  if (dayType === "HOLIDAY" || dayType === "WEEKEND") {
    // Non-working day: Comp-Off Slab Calculation
    if (hoursWorked > 0) {
      const applicableSlabs = settings.compOffSlabs
        .filter((s) => hoursWorked >= s.minHours)
        .sort((a, b) => b.minHours - a.minHours);

      if (applicableSlabs.length > 0) {
        compOffDays = applicableSlabs[0]!.compOffDays;
      }

      if (isRegularized && compOffDays > 0) {
        // Apply 75% regularization penalty on comp-offs
        compOffDays = compOffDays * 0.25;
      }
    }
  } else {
    // Regular working day: Overtime Calculation
    if (minutesWorked < standardMinutes) {
      earlyLeavingMins = standardMinutes - minutesWorked;
    } else if (minutesWorked >= standardMinutes + settings.graceMinutes) {
      // Overtime calculation starts strictly after the grace period threshold
      let otMins = minutesWorked - (standardMinutes + settings.graceMinutes);

      if (isRegularized && otMins > 0) {
        // Apply 75% regularization penalty on OT minutes
        otMins = Math.floor(otMins * 0.25);
      }

      if (otMins > 0) {
        otHours = Number((otMins / 60).toFixed(2));
        const hourlyRate = await getEmployeeHourlyOtRate(userId, attendanceDate, settings, calendarConfig);
        otRatePerHour = hourlyRate;
        otAmount = Number((otHours * hourlyRate).toFixed(2));
      }
    }
  }

  // Preserve existing approved status if already adjusted or modified
  const existingRecord = await db.otRecord.findUnique({
    where: { userId_date: { userId, date: attendanceDate } },
  });

  const approvalStatus = existingRecord?.approvalStatus ?? "PENDING";
  const approvedById = existingRecord?.approvedById ?? null;
  const rejectionRemarks = existingRecord?.rejectionRemarks ?? null;

  await db.otRecord.upsert({
    where: { userId_date: { userId, date: attendanceDate } },
    update: {
      dayType,
      hoursWorked,
      otHours,
      otRatePerHour,
      otAmount,
      compOffDays,
      earlyLeavingMins,
    },
    create: {
      userId,
      date: attendanceDate,
      dayType,
      hoursWorked,
      otHours,
      otRatePerHour,
      otAmount,
      compOffDays,
      earlyLeavingMins,
      approvalStatus,
      approvedById,
      rejectionRemarks,
    },
  });

  return true;
}

/**
 * Calculates OT records for all employees within a selected month.
 */
export async function processMonthOt(orgId: string, monthDate: Date): Promise<{
  processed: number;
}> {
  const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  const users = await db.user.findMany({
    where: { orgId, active: true, isPlatformAdmin: false },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const punches = await db.attendancePunch.findMany({
    where: {
      userId: { in: userIds },
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    select: { userId: true, date: true },
  });

  let processed = 0;
  for (const punch of punches) {
    await calculateOtForPunch(punch.userId, punch.date);
    processed++;
  }

  return { processed };
}

export interface PayrollSummaryRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: number | null;
  department: string | null;
  totalOtHours: number;
  totalOtAmount: number;
  totalCompOffDays: number;
  lopDays: number;
}

/**
 * Generates final payroll consolidated figures merging LOP and approved OT records.
 */
export async function generatePayrollSummary(
  orgId: string,
  monthDate: Date
): Promise<PayrollSummaryRow[]> {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  const [otRecords, lopRecords] = await Promise.all([
    db.otRecord.findMany({
      where: {
        user: { orgId },
        date: { gte: monthStart, lte: monthEnd },
        approvalStatus: "APPROVED",
      },
      include: {
        user: {
          select: { id: true, name: true, employeeNumber: true, department: { select: { name: true } } },
        },
      },
    }),
    db.employeeLop.findMany({
      where: {
        user: { orgId },
        payrollMonth: monthStart,
      },
      include: {
        user: {
          select: { id: true, name: true, employeeNumber: true, department: { select: { name: true } } },
        },
      },
    }),
  ]);

  const payrollMap = new Map<string, PayrollSummaryRow>();

  for (const ot of otRecords) {
    const existing = payrollMap.get(ot.userId) ?? {
      employeeId: ot.userId,
      employeeName: ot.user.name,
      employeeNumber: ot.user.employeeNumber,
      department: ot.user.department?.name ?? null,
      totalOtHours: 0,
      totalOtAmount: 0,
      totalCompOffDays: 0,
      lopDays: 0,
    };

    existing.totalOtHours += ot.otHours;
    existing.totalOtAmount += ot.otAmount;
    existing.totalCompOffDays += ot.compOffDays;
    payrollMap.set(ot.userId, existing);
  }

  for (const lop of lopRecords) {
    const existing = payrollMap.get(lop.userId) ?? {
      employeeId: lop.userId,
      employeeName: lop.user.name,
      employeeNumber: lop.user.employeeNumber,
      department: lop.user.department?.name ?? null,
      totalOtHours: 0,
      totalOtAmount: 0,
      totalCompOffDays: 0,
      lopDays: 0,
    };
    existing.lopDays += lop.lopDays;
    payrollMap.set(lop.userId, existing);
  }

  return [...payrollMap.values()].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName)
  );
}
