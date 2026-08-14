import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LeavePolicyConfig } from "../policy-config.schema";

const mocks = vi.hoisted(() => ({
  employmentRecordFindUnique: vi.fn(),
  leaveRequestCount: vi.fn(),
  leaveRequestFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    employmentRecord: { findUnique: mocks.employmentRecordFindUnique },
    leaveRequest: { count: mocks.leaveRequestCount, findMany: mocks.leaveRequestFindMany },
  },
}));

import { validateRestrictions } from "../restrictions";

function baseConfig(overrides: Partial<LeavePolicyConfig["restrictions"]> = {}): LeavePolicyConfig {
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
      ...overrides,
    },
    sandwich: { enabled: false, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 0 },
    clubbingRules: [],
    approvalRouting: { autoApprove: false, routes: [], mandatoryApprovalComment: false, mandatoryRejectionComment: true },
    availabilityStatus: "OUT_OF_OFFICE",
  };
}

describe("validateRestrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.employmentRecordFindUnique.mockResolvedValue(null);
    mocks.leaveRequestCount.mockResolvedValue(0);
    mocks.leaveRequestFindMany.mockResolvedValue([]);
  });

  it("returns no violations for a clean request against a permissive config", async () => {
    const violations = await validateRestrictions({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
      config: baseConfig({ allowPastDated: true }),
      now: new Date("2026-08-14"),
    });
    expect(violations).toEqual([]);
  });

  it("flags a past-dated request when allowPastDated is false", async () => {
    const violations = await validateRestrictions({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-08-01"),
      toDate: new Date("2026-08-02"),
      config: baseConfig({ allowPastDated: false }),
      now: new Date("2026-08-14"),
    });
    expect(violations.some((v) => v.code === "PAST_DATED_NOT_ALLOWED")).toBe(true);
  });

  it("flags insufficient notice when minNoticeDays is not met", async () => {
    const violations = await validateRestrictions({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-08-15"), // 1 day notice
      toDate: new Date("2026-08-16"),
      config: (() => {
        const c = baseConfig({ allowPastDated: true });
        c.restrictions.minNoticeDays = 5;
        return c;
      })(),
      now: new Date("2026-08-14"),
    });
    expect(violations.some((v) => v.code === "INSUFFICIENT_NOTICE")).toBe(true);
  });

  it("flags exceeding max consecutive units", async () => {
    const violations = await validateRestrictions({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-20"), // 20 calendar days
      config: (() => {
        const c = baseConfig({ allowPastDated: true });
        c.restrictions.maxConsecutiveUnits = 10;
        return c;
      })(),
      now: new Date("2026-08-14"),
    });
    expect(violations.some((v) => v.code === "EXCEEDS_MAX_CONSECUTIVE")).toBe(true);
  });

  it("flags waiting period not met based on EmploymentRecord.joinDate", async () => {
    mocks.employmentRecordFindUnique.mockResolvedValue({ joinDate: new Date("2026-08-01") });

    const violations = await validateRestrictions({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-08-20"),
      toDate: new Date("2026-08-21"),
      config: (() => {
        const c = baseConfig({ allowPastDated: true });
        c.restrictions.waitingPeriodAfterJoiningDays = 90;
        return c;
      })(),
      now: new Date("2026-08-20"), // only 19 days since joining
    });
    expect(violations.some((v) => v.code === "WAITING_PERIOD_NOT_MET")).toBe(true);
  });

  it("flags max occurrences per year when the count query returns the limit", async () => {
    mocks.leaveRequestCount.mockResolvedValue(3);

    const violations = await validateRestrictions({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
      config: (() => {
        const c = baseConfig({ allowPastDated: true });
        c.restrictions.maxOccurrencesPerYear = 3;
        return c;
      })(),
      now: new Date("2026-08-14"),
    });
    expect(violations.some((v) => v.code === "MAX_OCCURRENCES_EXCEEDED")).toBe(true);
  });

  it("flags FORBID_COMBINE clubbing violation when an overlapping request of the other type exists", async () => {
    mocks.leaveRequestFindMany.mockResolvedValue([
      {
        leaveTypeId: "other-lt",
        fromDate: new Date("2026-09-01"),
        toDate: new Date("2026-09-03"),
      },
    ]);

    const config = baseConfig({ allowPastDated: true });
    config.clubbingRules = [{ otherLeaveTypeId: "other-lt", mode: "FORBID_COMBINE" }];

    const violations = await validateRestrictions({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-09-02"),
      toDate: new Date("2026-09-04"), // overlaps 9/2-9/3 with the other request
      config,
      now: new Date("2026-08-14"),
    });
    expect(violations.some((v) => v.code === "CLUBBING_FORBIDDEN")).toBe(true);
  });

  it("does not flag clubbing when requests of the other type don't overlap or are far apart", async () => {
    mocks.leaveRequestFindMany.mockResolvedValue([]);

    const config = baseConfig({ allowPastDated: true });
    config.clubbingRules = [{ otherLeaveTypeId: "other-lt", mode: "FORBID_COMBINE" }];

    const violations = await validateRestrictions({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-09-02"),
      toDate: new Date("2026-09-04"),
      config,
      now: new Date("2026-08-14"),
    });
    expect(violations.some((v) => v.code === "CLUBBING_FORBIDDEN")).toBe(false);
  });
});
