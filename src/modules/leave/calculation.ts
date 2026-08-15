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
  roundingMode: string;
  roundingIncrement: number | Prisma.Decimal | null;
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

  // ─── Balance / paid / LOP split ───────────────────────────────────────
  // Decimal used for every operation touching the balance itself, so
  // repeated accrual/consumption over years cannot drift the way JS float
  // arithmetic can (e.g. 0.1 + 0.2 !== 0.3 exactly). requestedUnits and day
  // counts above stay plain numbers — they're derived from integer
  // date-range walks and quarter/half fractions, which are exact in
  // IEEE-754, so converting them adds no safety, only friction. The
  // requestedUnits value IS converted to Decimal right where it's compared
  // against the balance, so that comparison and every downstream
  // paid/LOP split is done in exact decimal arithmetic.
  const year = input.fromDate.getFullYear();
  const balanceBefore = await getMaterializedBalance(input.userId, input.leaveTypeId, year);
  const requestedUnitsDecimal = new Prisma.Decimal(requestedUnits);

  let paidUnitsDecimal = new Prisma.Decimal(0);
  let partialPaidUnitsDecimal = new Prisma.Decimal(0);
  let lopUnitsDecimal = new Prisma.Decimal(0);
  let paidUnits: number;
  let partialPaidUnits: number;
  let lopUnits: number;

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
      if (slab.payPercentage >= 100) paidUnitsDecimal = paidUnitsDecimal.plus(unitsInSlab);
      else if (slab.payPercentage <= 0) lopUnitsDecimal = lopUnitsDecimal.plus(unitsInSlab);
      else partialPaidUnitsDecimal = partialPaidUnitsDecimal.plus(unitsInSlab);
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

  paidUnits = paidUnitsDecimal.toNumber();
  partialPaidUnits = partialPaidUnitsDecimal.toNumber();
  lopUnits = lopUnitsDecimal.toNumber();

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
    balanceBefore: balanceBefore.toNumber(),
    balanceReserved: balanceReservedDecimal.toNumber(),
    balanceAfter: balanceAfterDecimal.toNumber(),
    warnings,
    violations,
    sandwichBreakdown,
    explanation,
  };
}
