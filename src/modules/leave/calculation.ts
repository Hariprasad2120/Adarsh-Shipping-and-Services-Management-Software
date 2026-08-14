import { db } from "@/lib/db";
import { calendarFromDb, isWorkingDate, type WorkingCalendarConfig } from "@/lib/working-hours";
import { getMaterializedBalance } from "@/modules/leave/ledger";
import type { LeavePolicyConfig } from "@/modules/leave/policy-config.schema";

export interface CalculationWarning {
  code: string;
  message: string;
}

export interface CalculationViolation {
  code: string;
  message: string;
}

export interface SandwichBreakdown {
  requestedUnits: number;
  sandwichedUnits: number;
  totalDeduction: number;
  dates: string[]; // ISO dates that are sandwiched (non-working days counted as leave)
}

export interface LeaveCalculationResult {
  requestedUnits: number;
  eligibleUnits: number;
  calendarWorkingUnits: number;
  weekendUnits: number;
  holidayUnits: number;
  sandwichUnits: number;
  paidUnits: number;
  partialPaidUnits: number;
  lopUnits: number;
  balanceBefore: number;
  balanceReserved: number;
  balanceAfter: number;
  warnings: CalculationWarning[];
  violations: CalculationViolation[];
  sandwichBreakdown: SandwichBreakdown | null;
  explanation: string[];
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function* eachDateKey(fromKey: string, toKey: string): Generator<string> {
  let cursor = fromKey;
  while (cursor <= toKey) {
    yield cursor;
    const [y, m, d] = cursor.split("-").map(Number);
    cursor = new Date(Date.UTC(y!, m! - 1, d! + 1)).toISOString().slice(0, 10);
  }
}

async function buildCalendarConfig(orgId: string, holidayDateKeys: string[]): Promise<WorkingCalendarConfig> {
  const record = await db.workingCalendar.findUnique({ where: { orgId } });
  return calendarFromDb(
    record
      ? {
          workStart: record.workStart,
          workEnd: record.workEnd,
          timezone: record.timezone,
          graceMinutes: record.graceMinutes,
          workingDays: record.workingDays,
          breaks: record.breaks,
        }
      : null,
    holidayDateKeys,
  );
}

/**
 * Applies rounding per the policy's roundingMode/roundingIncrement.
 */
export function applyRounding(value: number, mode: string, increment?: number | null): number {
  if (mode === "NONE" || !increment || increment <= 0) return value;
  const steps = value / increment;
  switch (mode) {
    case "NEAREST":
      return Math.round(steps) * increment;
    case "UP":
      return Math.ceil(steps) * increment;
    case "DOWN":
      return Math.floor(steps) * increment;
    default:
      return value;
  }
}

export interface CalculateLeaveRequestInput {
  orgId: string;
  userId: string;
  leaveTypeId: string;
  policyVersionId: string;
  config: LeavePolicyConfig;
  classification: "PAID" | "UNPAID" | "ON_DUTY" | "RESTRICTED_HOLIDAY" | "PARTIALLY_PAID";
  roundingMode: string;
  roundingIncrement: number | null;
  fromDate: Date;
  toDate: Date;
  halfDay: boolean;
  branchId?: string | null;
}

/**
 * The one authoritative leave calculation service (spec §38). Both the
 * frontend preview and the server-side submission path call this — never
 * trust a browser-computed duration.
 */
export async function calculateLeaveRequest(
  input: CalculateLeaveRequestInput,
): Promise<LeaveCalculationResult> {
  const explanation: string[] = [];
  const warnings: CalculationWarning[] = [];
  const violations: CalculationViolation[] = [];

  const fromKey = toDateKey(input.fromDate);
  const toKey = toDateKey(input.toDate);

  const holidays = await db.holiday.findMany({
    where: {
      orgId: input.orgId,
      date: { gte: input.fromDate, lte: input.toDate },
      OR: [{ branchId: null }, { branchId: input.branchId ?? null }],
    },
  });
  const holidayDateKeys = holidays.map((h) => toDateKey(h.date));

  const calendar = await buildCalendarConfig(input.orgId, holidayDateKeys);

  const allDateKeys = [...eachDateKey(fromKey, toKey)];
  const calendarDayCount = allDateKeys.length;

  let workingDayCount = 0;
  let weekendCount = 0;
  let holidayCount = 0;

  for (const key of allDateKeys) {
    const isHoliday = holidayDateKeys.includes(key);
    const isWorking = isWorkingDate(key, calendar);
    if (isHoliday) holidayCount++;
    else if (!isWorking) weekendCount++;
    else workingDayCount++;
  }

  let requestedUnits = input.halfDay ? 0.5 : workingDayCount;
  explanation.push(
    `Requested range ${fromKey} to ${toKey}: ${calendarDayCount} calendar day(s), ` +
      `${workingDayCount} working day(s), ${weekendCount} weekend day(s), ${holidayCount} holiday(s).`,
  );

  // ─── Sandwich rule ────────────────────────────────────────────────────
  let sandwichBreakdown: SandwichBreakdown | null = null;
  if (
    input.config.sandwich.enabled &&
    !input.halfDay &&
    requestedUnits > input.config.sandwich.activationThresholdUnits
  ) {
    const sandwichedDates: string[] = [];
    for (const key of allDateKeys) {
      const isHoliday = holidayDateKeys.includes(key);
      const isWorking = isWorkingDate(key, calendar);
      if (isWorking) continue;
      if (isHoliday && !input.config.sandwich.includeHolidays) continue;
      if (!isHoliday && !isWorking && !input.config.sandwich.includeWeekends) continue;
      sandwichedDates.push(key);
    }
    if (sandwichedDates.length > 0) {
      const totalDeduction = requestedUnits + sandwichedDates.length;
      sandwichBreakdown = {
        requestedUnits,
        sandwichedUnits: sandwichedDates.length,
        totalDeduction,
        dates: sandwichedDates,
      };
      explanation.push(
        `Sandwich rule active: ${sandwichedDates.length} non-working day(s) between/adjacent to ` +
          `requested leave are counted, total deduction = ${totalDeduction}.`,
      );
      requestedUnits = totalDeduction;
    }
  }

  requestedUnits = applyRounding(requestedUnits, input.roundingMode, input.roundingIncrement);

  // ─── Balance / paid / LOP split ───────────────────────────────────────
  const year = input.fromDate.getFullYear();
  const balanceBefore = await getMaterializedBalance(input.userId, input.leaveTypeId, year);

  let paidUnits = 0;
  let partialPaidUnits = 0;
  let lopUnits = 0;

  if (input.classification === "UNPAID") {
    lopUnits = requestedUnits;
    explanation.push(`Policy is Unpaid: all ${requestedUnits} unit(s) are LOP.`);
  } else if (input.classification === "ON_DUTY" || input.classification === "RESTRICTED_HOLIDAY") {
    paidUnits = requestedUnits;
    explanation.push(`Policy classification ${input.classification}: does not draw from paid balance.`);
  } else if (input.classification === "PARTIALLY_PAID" && input.config.partialPaySlabs.length > 0) {
    let remaining = requestedUnits;
    let cumulative = 0;
    for (const slab of input.config.partialPaySlabs) {
      if (remaining <= 0) break;
      const slabCapacity = Math.max(0, slab.uptoUnits - cumulative);
      const unitsInSlab = Math.min(remaining, slabCapacity);
      if (unitsInSlab <= 0) continue;
      if (slab.payPercentage >= 100) paidUnits += unitsInSlab;
      else if (slab.payPercentage <= 0) lopUnits += unitsInSlab;
      else partialPaidUnits += unitsInSlab;
      cumulative += unitsInSlab;
      remaining -= unitsInSlab;
    }
    if (remaining > 0) {
      lopUnits += remaining;
    }
    explanation.push(
      `Partial-pay slabs applied: ${paidUnits} fully paid, ${partialPaidUnits} partially paid, ${lopUnits} LOP.`,
    );
  } else {
    // PAID — subject to balance/negative-leave rules
    if (requestedUnits <= balanceBefore) {
      paidUnits = requestedUnits;
    } else {
      const shortfall = requestedUnits - balanceBefore;
      switch (input.config.negativeLeave.mode) {
        case "REJECT":
          violations.push({
            code: "INSUFFICIENT_BALANCE",
            message: `You have ${balanceBefore} unit(s) available. This request requires ${requestedUnits}.`,
          });
          paidUnits = balanceBefore;
          lopUnits = shortfall;
          break;
        case "ALLOW_UNLIMITED":
          paidUnits = requestedUnits;
          warnings.push({
            code: "NEGATIVE_BALANCE",
            message: `This request will take your balance negative by ${shortfall} unit(s).`,
          });
          break;
        case "ALLOW_WITHIN_LIMIT": {
          const limit = input.config.negativeLeave.limit ?? 0;
          if (shortfall <= limit) {
            paidUnits = requestedUnits;
            warnings.push({
              code: "NEGATIVE_BALANCE_WITHIN_LIMIT",
              message: `This request will take your balance negative by ${shortfall} unit(s), within the allowed limit of ${limit}.`,
            });
          } else {
            paidUnits = balanceBefore + limit;
            lopUnits = requestedUnits - paidUnits;
            warnings.push({
              code: "EXCEEDS_NEGATIVE_LIMIT",
              message: `Negative balance limit is ${limit}. ${lopUnits} unit(s) will become Loss of Pay.`,
            });
          }
          break;
        }
        case "CONVERT_EXCESS_TO_LOP":
        default:
          paidUnits = balanceBefore;
          lopUnits = shortfall;
          explanation.push(
            `Paid Leave: ${paidUnits} unit(s). LOP: ${lopUnits} unit(s) — only ${balanceBefore} unit(s) are available for a ${requestedUnits}-unit request.`,
          );
          break;
      }
    }

    if (input.config.maxBalance != null && balanceBefore - paidUnits < 0) {
      // no-op placeholder: max balance affects accrual, not consumption; kept
      // here only as a documented non-issue for consumption-time calculation.
    }
  }

  const balanceReserved = paidUnits + partialPaidUnits;
  const balanceAfter = balanceBefore - balanceReserved;

  return {
    requestedUnits,
    eligibleUnits: requestedUnits,
    calendarWorkingUnits: workingDayCount,
    weekendUnits: weekendCount,
    holidayUnits: holidayCount,
    sandwichUnits: sandwichBreakdown?.sandwichedUnits ?? 0,
    paidUnits,
    partialPaidUnits,
    lopUnits,
    balanceBefore,
    balanceReserved,
    balanceAfter,
    warnings,
    violations,
    sandwichBreakdown,
    explanation,
  };
}
