import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
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
  /** Structured payroll contract data (spec §17) — only genuinely partial
   *  slabs (0 < payPercentage < 100), empty unless classification is
   *  PARTIALLY_PAID. Payroll consumes this via LeavePartialPayRecord. */
  partialPaySlabBreakdown: { payPercentage: number; units: number }[];
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysToDate(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function* eachDateKey(fromKey: string, toKey: string): Generator<string> {
  let cursor = fromKey;
  while (cursor <= toKey) {
    yield cursor;
    const [y, m, d] = cursor.split("-").map(Number);
    cursor = new Date(Date.UTC(y!, m! - 1, d! + 1)).toISOString().slice(0, 10);
  }
}

/**
 * Resolves the working-days calendar a leave request should be judged
 * against (spec §22 multi-shift support). A real Shift/ShiftAssignment
 * system already exists in Monolith (contrary to an earlier, incorrect
 * closure-pass finding that no multi-shift infrastructure existed at
 * all) — Shift.workingDays uses the exact same comma-separated day-number
 * format as WorkingCalendar.workingDays, so calendarFromDb() already
 * parses it correctly with no format translation needed. Resolution
 * order: the employee's active ShiftAssignment covering fromDate (their
 * actual working pattern) → the org-wide WorkingCalendar fallback (no
 * shift assigned). A request could in principle span a shift change
 * mid-range; using the shift active on fromDate is a deliberate, narrow
 * simplification — the same one already implicit in every other single-
 * calendar day-counting loop in this function (holidays, sandwich rule),
 * not a new limitation introduced here.
 */
async function buildCalendarConfig(
  orgId: string,
  holidayDateKeys: string[],
  userId: string,
  fromDate: Date,
): Promise<WorkingCalendarConfig> {
  const activeShiftAssignment = await db.shiftAssignment.findFirst({
    where: {
      userId,
      startDate: { lte: fromDate },
      OR: [{ endDate: null }, { endDate: { gte: fromDate } }],
    },
    orderBy: { startDate: "desc" },
    include: { shift: true },
  });

  if (activeShiftAssignment?.shift.isActive) {
    return calendarFromDb(
      {
        workStart: activeShiftAssignment.shift.startTime,
        workEnd: activeShiftAssignment.shift.endTime,
        timezone: "Asia/Kolkata",
        graceMinutes: activeShiftAssignment.shift.graceAfterEndMins,
        workingDays: activeShiftAssignment.shift.workingDays,
        breaks: activeShiftAssignment.shift.breakRules,
      },
      holidayDateKeys,
    );
  }

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
 * roundingIncrement comes from Prisma as Decimal | null; accepted here as
 * number | Decimal | null since rounding granularity (e.g. 0.25, 0.5) is
 * always exactly representable in IEEE-754 and this is a display/policy
 * concern, not an accumulation-prone balance operation — unlike the
 * balance math in calculateLeaveRequest, which stays in Decimal throughout.
 */
export function applyRounding(
  value: number,
  mode: string,
  increment?: number | Prisma.Decimal | null,
): number {
  const incrementNumber = increment == null ? null : Number(increment);
  if (mode === "NONE" || !incrementNumber || incrementNumber <= 0) return value;
  const steps = value / incrementNumber;
  switch (mode) {
    case "NEAREST":
      return Math.round(steps) * incrementNumber;
    case "UP":
      return Math.ceil(steps) * incrementNumber;
    case "DOWN":
      return Math.floor(steps) * incrementNumber;
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
  /** LeavePolicyVersion.unit — "HOUR" takes an entirely different, simpler
   *  path (fromTime/toTime, no day-counting/sandwich concept) than "DAY". */
  unit?: "DAY" | "HOUR";
  roundingMode: string;
  roundingIncrement: number | Prisma.Decimal | null;
  fromDate: Date;
  toDate: Date;
  /** DAY-unit only. FULL = whole working-day count; HALF = exactly 0.5;
   *  QUARTER = exactly 0.25. Multi-day requests are always FULL — a
   *  day-part fraction only makes sense for a single-day request. */
  dayPart?: "FULL" | "HALF" | "QUARTER";
  /** HOUR-unit only. "HH:MM" 24-hour, same day as fromDate. */
  fromTime?: string;
  toTime?: string;
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

  if (input.unit === "HOUR") {
    return calculateHourlyLeaveRequest(input, fromKey, explanation, warnings, violations);
  }

  const holidays = await db.holiday.findMany({
    where: {
      orgId: input.orgId,
      date: { gte: input.fromDate, lte: input.toDate },
      OR: [{ branchId: null }, { branchId: input.branchId ?? null }],
    },
  });
  const holidayDateKeys = holidays.map((h) => toDateKey(h.date));

  const calendar = await buildCalendarConfig(input.orgId, holidayDateKeys, input.userId, input.fromDate);

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

  const dayPart = input.dayPart ?? "FULL";
  let requestedUnits =
    dayPart === "HALF" ? 0.5 : dayPart === "QUARTER" ? 0.25 : workingDayCount;
  explanation.push(
    `Requested range ${fromKey} to ${toKey}: ${calendarDayCount} calendar day(s), ` +
      `${workingDayCount} working day(s), ${weekendCount} weekend day(s), ${holidayCount} holiday(s).`,
  );

  // ─── Sandwich rule ────────────────────────────────────────────────────
  let sandwichBreakdown: SandwichBreakdown | null = null;
  if (
    input.config.sandwich.enabled &&
    dayPart === "FULL" &&
    requestedUnits > input.config.sandwich.activationThresholdUnits
  ) {
    const sandwichKeyMatches = (key: string) => {
      const isHoliday = holidayDateKeys.includes(key);
      const isWorking = isWorkingDate(key, calendar);
      if (isWorking) return false;
      if (isHoliday && !input.config.sandwich.includeHolidays) return false;
      if (!isHoliday && !isWorking && !input.config.sandwich.includeWeekends) return false;
      return true;
    };

    const sandwichedDates: string[] = [];
    for (const key of allDateKeys) {
      if (sandwichKeyMatches(key)) sandwichedDates.push(key);
    }

    // Cross-request boundary case: this request's own range has zero
    // non-working days inside it (e.g. a single Friday), but it is directly
    // adjacent to an existing approved/pending request of the SAME leave
    // type across the weekend/holiday gap (e.g. a separate Monday request)
    // — splitting one sandwich into two single-day requests must not let it
    // escape the rule (spec closure-pass sandwich/clubbing edge cases).
    // Only counts the gap once, attributed to whichever request is
    // calculated later, so the two requests never double-deduct the same
    // gap days between them.
    const neighbours = await db.leaveRequest.findMany({
      where: {
        userId: input.userId,
        leaveTypeId: input.leaveTypeId,
        status: { in: ["pending", "PENDING_APPROVAL", "approved", "APPROVED"] },
        OR: [
          { toDate: { gte: addDaysToDate(input.fromDate, -7), lt: input.fromDate } },
          { fromDate: { gt: input.toDate, lte: addDaysToDate(input.toDate, 7) } },
        ],
      },
    });

    const scanGap = (start: string, end: string, direction: 1 | -1) => {
      const gapDates: string[] = [];
      let cursor = start;
      while (direction === 1 ? cursor < end : cursor > end) {
        if (!sandwichKeyMatches(cursor)) return null; // gap broken by a real working day
        gapDates.push(cursor);
        const [y, m, d] = cursor.split("-").map(Number);
        cursor = new Date(Date.UTC(y!, m! - 1, d! + direction)).toISOString().slice(0, 10);
      }
      return gapDates;
    };

    const before = neighbours.find((r) => toDateKey(r.toDate) < fromKey);
    if (before) {
      const gapStart = toDateKey(addDaysToDate(before.toDate, 1));
      const gap = scanGap(gapStart, fromKey, 1);
      if (gap) for (const key of gap) if (!sandwichedDates.includes(key)) sandwichedDates.push(key);
    }
    const after = neighbours.find((r) => toDateKey(r.fromDate) > toKey);
    if (after) {
      const gapStart = toDateKey(addDaysToDate(input.toDate, 1));
      const gap = scanGap(gapStart, toDateKey(after.fromDate), 1);
      if (gap) for (const key of gap) if (!sandwichedDates.includes(key)) sandwichedDates.push(key);
    }

    if (sandwichedDates.length > 0) {
      const totalDeduction = requestedUnits + sandwichedDates.length;
      sandwichBreakdown = {
        requestedUnits,
        sandwichedUnits: sandwichedDates.length,
        totalDeduction,
        dates: sandwichedDates.sort(),
      };
      explanation.push(
        `Sandwich rule active: ${sandwichedDates.length} non-working day(s) between/adjacent to ` +
          `requested leave (including any adjacent existing request of the same leave type) are counted, ` +
          `total deduction = ${totalDeduction}.`,
      );
      requestedUnits = totalDeduction;
    }
  }

  requestedUnits = applyRounding(requestedUnits, input.roundingMode, input.roundingIncrement);

  const split = await applyBalanceSplit(input, requestedUnits, explanation, warnings, violations);

  return {
    requestedUnits,
    eligibleUnits: requestedUnits,
    calendarWorkingUnits: workingDayCount,
    weekendUnits: weekendCount,
    holidayUnits: holidayCount,
    sandwichUnits: sandwichBreakdown?.sandwichedUnits ?? 0,
    ...split,
    warnings,
    violations,
    sandwichBreakdown,
    explanation,
  };
}

/**
 * The balance/paid/partial-pay/LOP split, shared verbatim between the
 * DAY-unit path above and the HOUR-unit path below — this logic is unit-
 * agnostic, it only cares about a requestedUnits number and the policy's
 * classification/negativeLeave config, not how that number was derived.
 * Decimal used throughout for the same reason noted at every other
 * balance-touching call site in this module: repeated accrual/consumption
 * over years cannot drift the way JS float arithmetic can.
 */
async function applyBalanceSplit(
  input: Pick<CalculateLeaveRequestInput, "userId" | "leaveTypeId" | "fromDate" | "classification" | "config">,
  requestedUnits: number,
  explanation: string[],
  warnings: CalculationWarning[],
  violations: CalculationViolation[],
) {
  const year = input.fromDate.getFullYear();
  const balanceBefore = await getMaterializedBalance(input.userId, input.leaveTypeId, year);
  const requestedUnitsDecimal = new Prisma.Decimal(requestedUnits);

  let paidUnitsDecimal = new Prisma.Decimal(0);
  let partialPaidUnitsDecimal = new Prisma.Decimal(0);
  let lopUnitsDecimal = new Prisma.Decimal(0);
  // Structured payroll contract (spec §17): only the slabs that are
  // GENUINELY partial (0 < payPercentage < 100) go here — the 100%-paid
  // and 0%-paid (LOP) slabs are already fully represented by
  // paidUnitsDecimal/lopUnitsDecimal, Payroll doesn't need a redundant
  // breakdown entry for those.
  const partialPaySlabBreakdown: { payPercentage: number; units: number }[] = [];

  if (input.classification === "UNPAID") {
    lopUnitsDecimal = requestedUnitsDecimal;
    explanation.push(`Policy is Unpaid: all ${requestedUnits} unit(s) are LOP.`);
  } else if (input.classification === "ON_DUTY" || input.classification === "RESTRICTED_HOLIDAY") {
    paidUnitsDecimal = requestedUnitsDecimal;
    explanation.push(`Policy classification ${input.classification}: does not draw from paid balance.`);
  } else if (input.classification === "PARTIALLY_PAID" && input.config.partialPaySlabs.length > 0) {
    let remaining = requestedUnitsDecimal;
    let cumulative = new Prisma.Decimal(0);
    for (const slab of input.config.partialPaySlabs) {
      if (remaining.lessThanOrEqualTo(0)) break;
      const slabCapacity = Prisma.Decimal.max(0, new Prisma.Decimal(slab.uptoUnits).minus(cumulative));
      const unitsInSlab = Prisma.Decimal.min(remaining, slabCapacity);
      if (unitsInSlab.lessThanOrEqualTo(0)) continue;
      if (slab.payPercentage >= 100) {
        paidUnitsDecimal = paidUnitsDecimal.plus(unitsInSlab);
      } else if (slab.payPercentage <= 0) {
        lopUnitsDecimal = lopUnitsDecimal.plus(unitsInSlab);
      } else {
        partialPaidUnitsDecimal = partialPaidUnitsDecimal.plus(unitsInSlab);
        partialPaySlabBreakdown.push({ payPercentage: slab.payPercentage, units: unitsInSlab.toNumber() });
      }
      cumulative = cumulative.plus(unitsInSlab);
      remaining = remaining.minus(unitsInSlab);
    }
    if (remaining.greaterThan(0)) {
      lopUnitsDecimal = lopUnitsDecimal.plus(remaining);
    }
    explanation.push(
      `Partial-pay slabs applied: ${paidUnitsDecimal} fully paid, ${partialPaidUnitsDecimal} partially paid, ${lopUnitsDecimal} LOP.`,
    );
  } else {
    // PAID — subject to balance/negative-leave rules
    if (requestedUnitsDecimal.lessThanOrEqualTo(balanceBefore)) {
      paidUnitsDecimal = requestedUnitsDecimal;
    } else {
      const shortfall = requestedUnitsDecimal.minus(balanceBefore);
      switch (input.config.negativeLeave.mode) {
        case "REJECT":
          violations.push({
            code: "INSUFFICIENT_BALANCE",
            message: `You have ${balanceBefore} unit(s) available. This request requires ${requestedUnits}.`,
          });
          paidUnitsDecimal = balanceBefore;
          lopUnitsDecimal = shortfall;
          break;
        case "ALLOW_UNLIMITED":
          paidUnitsDecimal = requestedUnitsDecimal;
          warnings.push({
            code: "NEGATIVE_BALANCE",
            message: `This request will take your balance negative by ${shortfall} unit(s).`,
          });
          break;
        case "ALLOW_WITHIN_LIMIT": {
          const limit = new Prisma.Decimal(input.config.negativeLeave.limit ?? 0);
          if (shortfall.lessThanOrEqualTo(limit)) {
            paidUnitsDecimal = requestedUnitsDecimal;
            warnings.push({
              code: "NEGATIVE_BALANCE_WITHIN_LIMIT",
              message: `This request will take your balance negative by ${shortfall} unit(s), within the allowed limit of ${limit}.`,
            });
          } else {
            paidUnitsDecimal = balanceBefore.plus(limit);
            lopUnitsDecimal = requestedUnitsDecimal.minus(paidUnitsDecimal);
            warnings.push({
              code: "EXCEEDS_NEGATIVE_LIMIT",
              message: `Negative balance limit is ${limit}. ${lopUnitsDecimal} unit(s) will become Loss of Pay.`,
            });
          }
          break;
        }
        case "CONVERT_EXCESS_TO_LOP":
        default:
          paidUnitsDecimal = balanceBefore;
          lopUnitsDecimal = shortfall;
          explanation.push(
            `Paid Leave: ${paidUnitsDecimal} unit(s). LOP: ${lopUnitsDecimal} unit(s) — only ${balanceBefore} unit(s) are available for a ${requestedUnits}-unit request.`,
          );
          break;
      }
    }
  }

  const balanceReservedDecimal = paidUnitsDecimal.plus(partialPaidUnitsDecimal);
  const balanceAfterDecimal = balanceBefore.minus(balanceReservedDecimal);

  return {
    paidUnits: paidUnitsDecimal.toNumber(),
    partialPaidUnits: partialPaidUnitsDecimal.toNumber(),
    lopUnits: lopUnitsDecimal.toNumber(),
    balanceBefore: balanceBefore.toNumber(),
    balanceReserved: balanceReservedDecimal.toNumber(),
    balanceAfter: balanceAfterDecimal.toNumber(),
    partialPaySlabBreakdown,
  };
}

/**
 * HOUR-unit calculation path (spec §8): a policy configured with
 * unit: "HOUR" is requested via clock times (fromTime/toTime, same day as
 * fromDate) instead of a day range. No day-counting, sandwich rule, or
 * weekend/holiday concept applies at hour granularity — those are
 * DAY-unit concepts. Shares the same balance/paid/LOP split as the
 * DAY path via applyBalanceSplit.
 */
async function calculateHourlyLeaveRequest(
  input: CalculateLeaveRequestInput,
  fromKey: string,
  explanation: string[],
  warnings: CalculationWarning[],
  violations: CalculationViolation[],
): Promise<LeaveCalculationResult> {
  if (!input.fromTime || !input.toTime) {
    violations.push({
      code: "MISSING_TIME_RANGE",
      message: "This leave type is configured in hours — a start and end time are required.",
    });
  }
  const toKey = toDateKey(input.toDate);
  if (fromKey !== toKey) {
    violations.push({
      code: "HOUR_UNIT_MUST_BE_SAME_DAY",
      message: "Hourly leave requests must start and end on the same day.",
    });
  }

  let requestedUnits = 0;
  if (input.fromTime && input.toTime) {
    const [fromH, fromM] = input.fromTime.split(":").map(Number);
    const [toH, toM] = input.toTime.split(":").map(Number);
    if (
      fromH == null || fromM == null || toH == null || toM == null ||
      Number.isNaN(fromH) || Number.isNaN(fromM) || Number.isNaN(toH) || Number.isNaN(toM)
    ) {
      violations.push({ code: "INVALID_TIME_FORMAT", message: "Times must be in HH:MM format." });
    } else {
      const fromMinutes = fromH * 60 + fromM;
      const toMinutes = toH * 60 + toM;
      if (toMinutes <= fromMinutes) {
        violations.push({ code: "INVALID_TIME_RANGE", message: "End time must be after start time." });
      } else {
        requestedUnits = (toMinutes - fromMinutes) / 60;
        explanation.push(`Hourly request: ${input.fromTime}–${input.toTime} = ${requestedUnits} hour(s).`);
      }
    }
  }

  requestedUnits = applyRounding(requestedUnits, input.roundingMode, input.roundingIncrement);

  const split = await applyBalanceSplit(input, requestedUnits, explanation, warnings, violations);

  return {
    requestedUnits,
    eligibleUnits: requestedUnits,
    calendarWorkingUnits: 0,
    weekendUnits: 0,
    holidayUnits: 0,
    sandwichUnits: 0,
    ...split,
    warnings,
    violations,
    sandwichBreakdown: null,
    explanation,
  };
}
