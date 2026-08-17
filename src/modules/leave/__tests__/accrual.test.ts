import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leavePolicyVersionFindMany: vi.fn(),
  leavePolicyVersionFindUniqueOrThrow: vi.fn(),
  userFindMany: vi.fn(),
  userFindUniqueOrThrow: vi.fn(),
  employmentRecordFindUnique: vi.fn(),
  postLedgerEntry: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    leavePolicyVersion: {
      findMany: mocks.leavePolicyVersionFindMany,
      findUniqueOrThrow: mocks.leavePolicyVersionFindUniqueOrThrow,
    },
    user: { findMany: mocks.userFindMany, findUniqueOrThrow: mocks.userFindUniqueOrThrow },
    employmentRecord: { findUnique: mocks.employmentRecordFindUnique },
  },
}));

vi.mock("@/modules/leave/ledger", () => ({
  postLedgerEntry: mocks.postLedgerEntry,
}));

import { runMonthlyAccrual } from "../accrual";

const USER = {
  id: "user-1",
  branchId: null,
  departmentId: null,
  divisionId: null,
  designation: null,
  employmentType: null,
};

function fixedVersion(overrides: Record<string, unknown> = {}) {
  return {
    id: "version-1",
    leaveTypeId: "lt-1",
    roundingMode: "NONE",
    roundingIncrement: null,
    leaveType: { id: "lt-1", orgId: "org-1" },
    applicabilityRules: [],
    configuration: {
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
    },
  };
}

describe("runMonthlyAccrual — entitlement models (spec §7 end-to-end)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindMany.mockResolvedValue([USER]);
    mocks.userFindUniqueOrThrow.mockResolvedValue(USER);
    mocks.postLedgerEntry.mockResolvedValue({ id: "entry-1" });
  });

  it("credits FIXED/MONTHLY entitlement as annual amount / 12", async () => {
    const version = fixedVersion();
    mocks.leavePolicyVersionFindMany.mockResolvedValue([version]);
    mocks.leavePolicyVersionFindUniqueOrThrow.mockResolvedValue(version);

    const result = await runMonthlyAccrual("org-1", new Date("2026-03-01"));

    expect(result.creditedCount).toBe(1);
    expect(mocks.postLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ACCRUAL", quantity: 1, idempotencyKey: "accrual:user-1:lt-1:2026-03" }),
    );
  });

  it("credits EXPERIENCE_BASED entitlement using the tier matching the employee's service months", async () => {
    const version = fixedVersion({
      entitlement: {
        model: "EXPERIENCE_BASED",
        creditFrequency: "MONTHLY",
        tiers: [
          { minServiceMonths: 0, maxServiceMonths: 12, amount: 12 },
          { minServiceMonths: 12, maxServiceMonths: null, amount: 24 },
        ],
      },
    });
    mocks.leavePolicyVersionFindMany.mockResolvedValue([version]);
    mocks.leavePolicyVersionFindUniqueOrThrow.mockResolvedValue(version);
    // Joined 2 years before the accrual run — squarely in the second tier (24/yr = 2/mo).
    mocks.employmentRecordFindUnique.mockResolvedValue({ joinDate: new Date("2024-03-01") });

    const result = await runMonthlyAccrual("org-1", new Date("2026-03-01"));

    expect(result.creditedCount).toBe(1);
    expect(mocks.postLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2 }));
  });

  it("skips EXPERIENCE_BASED accrual when service months fall in a gap between tiers", async () => {
    const version = fixedVersion({
      entitlement: {
        model: "EXPERIENCE_BASED",
        creditFrequency: "MONTHLY",
        // Deliberate gap: nothing covers 6-11 months.
        tiers: [
          { minServiceMonths: 0, maxServiceMonths: 6, amount: 12 },
          { minServiceMonths: 12, maxServiceMonths: null, amount: 24 },
        ],
      },
    });
    mocks.leavePolicyVersionFindMany.mockResolvedValue([version]);
    mocks.leavePolicyVersionFindUniqueOrThrow.mockResolvedValue(version);
    // 8 months of service — lands in the gap.
    mocks.employmentRecordFindUnique.mockResolvedValue({ joinDate: new Date("2025-07-01") });

    const result = await runMonthlyAccrual("org-1", new Date("2026-03-01"));

    expect(result.creditedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(mocks.postLedgerEntry).not.toHaveBeenCalled();
  });

  it("skips EXPERIENCE_BASED accrual entirely when the employee has no employment record", async () => {
    const version = fixedVersion({
      entitlement: {
        model: "EXPERIENCE_BASED",
        creditFrequency: "MONTHLY",
        tiers: [{ minServiceMonths: 0, maxServiceMonths: null, amount: 12 }],
      },
    });
    mocks.leavePolicyVersionFindMany.mockResolvedValue([version]);
    mocks.leavePolicyVersionFindUniqueOrThrow.mockResolvedValue(version);
    mocks.employmentRecordFindUnique.mockResolvedValue(null);

    const result = await runMonthlyAccrual("org-1", new Date("2026-03-01"));

    expect(result.creditedCount).toBe(0);
    expect(mocks.postLedgerEntry).not.toHaveBeenCalled();
  });

  it("never auto-credits GRANT_BASED policies — grants are always manual (grants.ts)", async () => {
    const version = fixedVersion({ entitlement: { model: "GRANT_BASED", maxGrantsPerYear: null, requiresApproval: true } });
    mocks.leavePolicyVersionFindMany.mockResolvedValue([version]);

    const result = await runMonthlyAccrual("org-1", new Date("2026-03-01"));

    expect(result.creditedCount).toBe(0);
    expect(mocks.postLedgerEntry).not.toHaveBeenCalled();
  });

  it("never auto-credits ATTENDANCE_BASED policies — no attendance-linked accrual engine exists yet", async () => {
    const version = fixedVersion({
      entitlement: { model: "ATTENDANCE_BASED", metric: "WORKED_DAYS", creditFrequency: "MONTHLY", ratio: 0.1 },
    });
    mocks.leavePolicyVersionFindMany.mockResolvedValue([version]);

    const result = await runMonthlyAccrual("org-1", new Date("2026-03-01"));

    expect(result.creditedCount).toBe(0);
    expect(mocks.postLedgerEntry).not.toHaveBeenCalled();
  });

  it("skips FIXED policies with a non-MONTHLY/INSTANT credit frequency (e.g. QUARTERLY/YEARLY are handled elsewhere, not by this monthly run)", async () => {
    const version = fixedVersion({ entitlement: { model: "FIXED", amount: 12, creditFrequency: "YEARLY" } });
    mocks.leavePolicyVersionFindMany.mockResolvedValue([version]);

    const result = await runMonthlyAccrual("org-1", new Date("2026-03-01"));

    expect(result.creditedCount).toBe(0);
    expect(mocks.postLedgerEntry).not.toHaveBeenCalled();
  });

  it("is idempotent: the same user/leaveType/period always produces the same idempotencyKey regardless of how many times it runs", async () => {
    const version = fixedVersion();
    mocks.leavePolicyVersionFindMany.mockResolvedValue([version]);
    mocks.leavePolicyVersionFindUniqueOrThrow.mockResolvedValue(version);

    await runMonthlyAccrual("org-1", new Date("2026-03-05"));
    await runMonthlyAccrual("org-1", new Date("2026-03-28")); // same month, different day

    const keys = mocks.postLedgerEntry.mock.calls.map((call) => call[0].idempotencyKey);
    expect(keys).toEqual(["accrual:user-1:lt-1:2026-03", "accrual:user-1:lt-1:2026-03"]);
    // postLedgerEntry itself owns the actual dedup (tested in ledger.test.ts);
    // this test only proves the key accrual.ts generates is stable per period.
  });
});
