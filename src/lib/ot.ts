/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * OT and comp-off calculation engine.
 * Computes hours, rates, penalties, and grace periods based on attendance punches,
 * holidays, and LOP parameters.
 */

import { db } from "@/lib/db";
import { isWorkingDate, calendarFromDb } from "@/lib/working-hours";
import {
  getAttendanceMonthBounds,
  toAttendanceDate as normalizeToISTMidnight,
  toAttendanceDateString as toDateString,
} from "@/lib/attendance-date";

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

export { normalizeToISTMidnight, toDateString };

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
 * Resolves the employee's dynamic minute salary rate based on CTC and actual calendar days of the month.
 * Fallback is based on a standard hourly base of ₹100 (₹1.67/min) if CTC is missing.
 */
export async function getEmployeeMinuteSalary(
  userId: string,
  date: Date,
  settings: typeof DEFAULT_OT_SETTINGS
): Promise<number> {
  const empRecord = await db.employmentRecord.findUnique({
    where: { userId },
  });

  const annualCtc = empRecord?.ctc;
  if (!annualCtc || annualCtc <= 0) {
    // Fallback standard rate per minute (standard 100 base / 60)
    return 100 / 60;
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthlyGross = annualCtc / 12;
  const dailySalary = monthlyGross / daysInMonth;
  const minuteSalary = dailySalary / (settings.standardHours * 60);

  return Number(minuteSalary.toFixed(4));
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
  const minuteSalary = await getEmployeeMinuteSalary(userId, date, settings);
  return Number((minuteSalary * 60).toFixed(2));
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
    (() => {
      const { start, end } = getAttendanceMonthBounds(
        attendanceDate.getUTCFullYear(),
        attendanceDate.getUTCMonth() + 1
      );
      return db.holiday.findMany({
        where: {
          orgId,
          date: {
            gte: start,
            lte: end,
          },
        },
      });
    })(),
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
    const year = attendanceDate.getUTCFullYear();
    const month = attendanceDate.getUTCMonth() + 1;
    const day = attendanceDate.getUTCDate();

    const [startH, startM] = (dbCalendar?.workStart ?? "09:30").split(":").map(Number);
    const [endH, endM] = (dbCalendar?.workEnd ?? "17:30").split(":").map(Number);

    const scheduledShiftStartMs = Date.UTC(year, month - 1, day, startH!, startM!, 0, 0) - (5.5 * 60 * 60 * 1000);
    const scheduledShiftEndMs = Date.UTC(year, month - 1, day, endH!, endM!, 0, 0) - (5.5 * 60 * 60 * 1000);

    const actualIn = new Date(punch.inAt);
    actualIn.setSeconds(0, 0);
    const actualInMs = actualIn.getTime();

    const actualOut = new Date(punch.outAt);
    actualOut.setSeconds(0, 0);
    const actualOutMs = actualOut.getTime();

    // Late arrival shifts the required check-out time to complete compulsory 8 hours
    const latenessMs = Math.max(0, actualInMs - scheduledShiftStartMs);
    const requiredCheckOutMs = scheduledShiftEndMs + latenessMs;

    // Grace period ends 15 mins (or settings.graceMinutes) after required checkout
    const graceEndMs = requiredCheckOutMs + (settings.graceMinutes * 60 * 1000);

    if (actualOutMs < requiredCheckOutMs) {
      earlyLeavingMins = Math.round((requiredCheckOutMs - actualOutMs) / 60000);
    } else if (actualOutMs > graceEndMs) {
      // Overtime calculation starts strictly after the grace period ends
      let otMins = Math.round((actualOutMs - requiredCheckOutMs) / 60000);

      if (isRegularized && otMins > 0) {
        // Apply 75% regularization penalty on OT minutes
        otMins = Math.floor(otMins * 0.25);
      }

      if (otMins > 0) {
        otHours = Number((otMins / 60).toFixed(2));
        const minuteSalary = await getEmployeeMinuteSalary(userId, attendanceDate, settings);
        otRatePerHour = Number((minuteSalary * 60).toFixed(2));
        otAmount = Number((otMins * minuteSalary * settings.otRate).toFixed(2));
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
  const { start: startOfMonth, end: endOfMonth } = getAttendanceMonthBounds(
    monthDate.getUTCFullYear(),
    monthDate.getUTCMonth() + 1
  );

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
  const { start: monthStart, end: monthEnd } = getAttendanceMonthBounds(
    monthDate.getUTCFullYear(),
    monthDate.getUTCMonth() + 1
  );

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
