import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import type { LeavePolicyConfig } from "../policy-config.schema";

const mocks = vi.hoisted(() => ({
  holidayFindMany: vi.fn(),
  workingCalendarFindUnique: vi.fn(),
  leaveBalanceFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    holiday: { findMany: mocks.holidayFindMany },
    workingCalendar: { findUnique: mocks.workingCalendarFindUnique },
    leaveBalance: { findUnique: mocks.leaveBalanceFindUnique },
  },
}));

import { calculateLeaveRequest } from "../calculation";

function baseConfig(overrides: Partial<LeavePolicyConfig> = {}): LeavePolicyConfig {
  return {
    entitlement: { model: "FIXED", amount: 12, creditFrequency: "MONTHLY" },
    proration: { strategy: "NONE", rounding: "NEAREST" },
    reset: { cadence: "CALENDAR_YEAR" },
    carryForward: { mode: "NONE", expiryAfterDays: null },
    encashment: { mode: "DISABLED", minBalanceRetained: 0 },
    negativeLeave: { mode: "REJECT" },
    maxBalance: null,
    effectiveAfterServiceMonths: 0,
    partialPaySlabs: [],
    restrictions: {
      allowPastDated: false,
      allowSameDay: true,
      allowDuringProbation: true,
      waitingPeriodAfterJoiningDays: 0,
      minBalanceRequired: 0,
      requireAttachment: "NEVER",
      requireReason: true,
    },
    sandwich: { enabled: false, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 0 },
    clubbingRules: [],
    approvalRouting: { autoApprove: false, routes: [], mandatoryApprovalComment: false, mandatoryRejectionComment: true },
    availabilityStatus: "OUT_OF_OFFICE",
    ...overrides,
  };
}

const WORKWEEK_MON_SAT = {
  workStart: "09:00",
  workEnd: "18:00",
  timezone: "Asia/Kolkata",
  graceMinutes: 15,
  workingDays: "1,2,3,4,5,6",
  breaks: [],
};

describe("calculateLeaveRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.holidayFindMany.mockResolvedValue([]);
    mocks.workingCalendarFindUnique.mockResolvedValue(WORKWEEK_MON_SAT);
    mocks.leaveBalanceFindUnique.mockResolvedValue({ balance: new Prisma.Decimal(10), version: 0 });
  });

  it("counts a Mon-Fri request as 5 working days with no weekend/holiday", async () => {
    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config: baseConfig(),
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-17"), // Monday
      toDate: new Date("2026-08-21"), // Friday
      halfDay: false,
    });

    expect(result.requestedUnits).toBe(5);
    expect(result.weekendUnits).toBe(0);
    expect(result.paidUnits).toBe(5);
    expect(result.lopUnits).toBe(0);
  });

  it("excludes Sunday from the working-day count (calendar has Mon-Sat as working)", async () => {
    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config: baseConfig(),
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-15"), // Saturday
      toDate: new Date("2026-08-17"), // Monday (Sunday 8/16 in between)
      halfDay: false,
    });

    // Sat + Mon are working, Sun is not
    expect(result.requestedUnits).toBe(2);
    expect(result.weekendUnits).toBe(1);
  });

  it("excludes a holiday from the working-day count and reports it separately", async () => {
    mocks.holidayFindMany.mockResolvedValue([{ date: new Date("2026-08-19") }]); // Wednesday holiday

    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config: baseConfig(),
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-17"),
      toDate: new Date("2026-08-21"),
      halfDay: false,
    });

    expect(result.requestedUnits).toBe(4); // 5 weekdays minus the 1 holiday
    expect(result.holidayUnits).toBe(1);
  });

  it("applies sandwich rule: Friday+Monday leave counts the weekend in between", async () => {
    const config = baseConfig({
      sandwich: { enabled: true, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 0 },
    });

    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config,
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-21"), // Friday
      toDate: new Date("2026-08-24"), // Monday (Sat/Sun off in between under Mon-Fri calendar)
      halfDay: false,
    });

    mocks.workingCalendarFindUnique.mockResolvedValue({
      ...WORKWEEK_MON_SAT,
      workingDays: "1,2,3,4,5", // Mon-Fri only, so Sat+Sun are both non-working
    });

    // Requested working days: Fri(21) + Mon(24) = 2. Sandwiched: Sat(22)+Sun(23) = 2.
    // Sandwich only activates with a Sat+Sun-off calendar; re-run with that calendar.
    const resultWithWeekendOff = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config,
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-21"),
      toDate: new Date("2026-08-24"),
      halfDay: false,
    });

    expect(resultWithWeekendOff.sandwichBreakdown).not.toBeNull();
    expect(resultWithWeekendOff.requestedUnits).toBe(4); // 2 working + 2 sandwiched
    void result;
  });

  it("does not apply sandwich rule when disabled, even across a weekend", async () => {
    mocks.workingCalendarFindUnique.mockResolvedValue({
      ...WORKWEEK_MON_SAT,
      workingDays: "1,2,3,4,5",
    });

    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config: baseConfig({ sandwich: { enabled: false, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 0 } }),
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-21"),
      toDate: new Date("2026-08-24"),
      halfDay: false,
    });

    expect(result.sandwichBreakdown).toBeNull();
    expect(result.requestedUnits).toBe(2); // Fri + Mon only, weekend not counted
  });

  it("converts excess over balance to LOP when negativeLeave.mode is CONVERT_EXCESS_TO_LOP", async () => {
    mocks.leaveBalanceFindUnique.mockResolvedValue({ balance: new Prisma.Decimal(2), version: 0 });

    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config: baseConfig({ negativeLeave: { mode: "CONVERT_EXCESS_TO_LOP" } }),
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-17"),
      toDate: new Date("2026-08-21"), // 5 working days requested
      halfDay: false,
    });

    expect(result.balanceBefore).toBe(2);
    expect(result.paidUnits).toBe(2);
    expect(result.lopUnits).toBe(3);
  });

  it("rejects (violation, not silent LOP) when negativeLeave.mode is REJECT and balance is insufficient", async () => {
    mocks.leaveBalanceFindUnique.mockResolvedValue({ balance: new Prisma.Decimal(1), version: 0 });

    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config: baseConfig({ negativeLeave: { mode: "REJECT" } }),
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-17"),
      toDate: new Date("2026-08-21"),
      halfDay: false,
    });

    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].code).toBe("INSUFFICIENT_BALANCE");
  });

  it("allows unlimited negative balance and warns instead of blocking", async () => {
    mocks.leaveBalanceFindUnique.mockResolvedValue({ balance: new Prisma.Decimal(0), version: 0 });

    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config: baseConfig({ negativeLeave: { mode: "ALLOW_UNLIMITED" } }),
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-17"),
      toDate: new Date("2026-08-21"),
      halfDay: false,
    });

    expect(result.violations.length).toBe(0);
    expect(result.warnings.some((w) => w.code === "NEGATIVE_BALANCE")).toBe(true);
    expect(result.paidUnits).toBe(5);
  });

  it("treats UNPAID classification as 100% LOP regardless of balance", async () => {
    mocks.leaveBalanceFindUnique.mockResolvedValue({ balance: new Prisma.Decimal(100), version: 0 });

    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config: baseConfig(),
      classification: "UNPAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-17"),
      toDate: new Date("2026-08-21"),
      halfDay: false,
    });

    expect(result.paidUnits).toBe(0);
    expect(result.lopUnits).toBe(5);
  });

  it("splits PARTIALLY_PAID leave across slabs correctly", async () => {
    mocks.leaveBalanceFindUnique.mockResolvedValue({ balance: new Prisma.Decimal(100), version: 0 });

    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config: baseConfig({
        partialPaySlabs: [
          { uptoUnits: 2, payPercentage: 100 },
          { uptoUnits: 4, payPercentage: 50 },
        ],
      }),
      classification: "PARTIALLY_PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-17"),
      toDate: new Date("2026-08-21"), // 5 days
      halfDay: false,
    });

    // First 2 days @ 100%, next 2 days @ 50%, remaining 1 day uncovered -> LOP
    expect(result.paidUnits).toBe(2);
    expect(result.partialPaidUnits).toBe(2);
    expect(result.lopUnits).toBe(1);
  });

  it("half-day request is always 0.5 units regardless of date span", async () => {
    const result = await calculateLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      policyVersionId: "v-1",
      config: baseConfig(),
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      fromDate: new Date("2026-08-17"),
      toDate: new Date("2026-08-17"),
      halfDay: true,
    });

    expect(result.requestedUnits).toBe(0.5);
    expect(result.paidUnits).toBe(0.5);
  });
});
