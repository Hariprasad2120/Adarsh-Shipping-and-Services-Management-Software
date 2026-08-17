import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import type { LeavePolicyConfig } from "../policy-config.schema";

const mocks = vi.hoisted(() => ({
  leaveBalanceFindMany: vi.fn(),
  leaveBalanceUpdate: vi.fn(),
  leavePolicyVersionFindUnique: vi.fn(),
  employmentRecordFindUnique: vi.fn(),
  postLedgerEntry: vi.fn(),
  getMaterializedBalance: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    leaveBalance: { findMany: mocks.leaveBalanceFindMany, update: mocks.leaveBalanceUpdate },
    leavePolicyVersion: { findUnique: mocks.leavePolicyVersionFindUnique },
    employmentRecord: { findUnique: mocks.employmentRecordFindUnique },
  },
}));

vi.mock("@/modules/leave/ledger", () => ({
  postLedgerEntry: mocks.postLedgerEntry,
  getMaterializedBalance: mocks.getMaterializedBalance,
}));

import { runDueResets, computeNextResetDate } from "../reset";

function fixedMaxConfig(fixedMax: number): LeavePolicyConfig {
  return {
    entitlement: { model: "FIXED", amount: 12, creditFrequency: "MONTHLY" },
    proration: { strategy: "NONE", rounding: "NEAREST" },
    reset: { cadence: "CALENDAR_YEAR" },
    carryForward: { mode: "FIXED_MAX", fixedMax, expiryAfterDays: 90 },
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
  };
}

describe("runDueResets — carry-forward year (spec §25 real-DB E2E finding, round 17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.employmentRecordFindUnique.mockResolvedValue(null);
    mocks.leaveBalanceUpdate.mockResolvedValue({});
    mocks.leavePolicyVersionFindUnique.mockResolvedValue({
      id: "v-1",
      configuration: fixedMaxConfig(3),
    });
  });

  it("posts the CARRY_FORWARD ledger entry into the year the reset boundary itself lands in, not asOf's year + 1", async () => {
    // Reproduces the real bug found via live E2E testing: a CALENDAR_YEAR
    // reset with nextResetDate = 2027-01-01, processed by a cron running
    // exactly ON that date (asOf = 2027-01-01, so asOf.getUTCFullYear()
    // is ALREADY 2027) — the old code computed year: asOf.getUTCFullYear()
    // + 1 = 2028, silently losing the carried-forward balance for a full
    // year (it landed nowhere the app would ever look for it as "current").
    mocks.leaveBalanceFindMany.mockResolvedValue([
      {
        id: "bal-1",
        userId: "user-1",
        leaveTypeId: "lt-1",
        year: 2026,
        nextResetDate: new Date("2027-01-01"),
        leaveType: { activeVersionId: "v-1" },
      },
    ]);
    mocks.getMaterializedBalance.mockResolvedValue(new Prisma.Decimal(5));

    await runDueResets("org-1", new Date("2027-01-01"));

    const carryForwardCall = mocks.postLedgerEntry.mock.calls.find((c) => c[0].type === "CARRY_FORWARD");
    expect(carryForwardCall).toBeDefined();
    expect(carryForwardCall![0].year).toBe(2027);
    expect((carryForwardCall![0].quantity as Prisma.Decimal).toString()).toBe("3");
  });

  it("still uses the reset-boundary year even when the cron runs a day late into the new year", async () => {
    mocks.leaveBalanceFindMany.mockResolvedValue([
      {
        id: "bal-1",
        userId: "user-1",
        leaveTypeId: "lt-1",
        year: 2026,
        nextResetDate: new Date("2027-01-01"),
        leaveType: { activeVersionId: "v-1" },
      },
    ]);
    mocks.getMaterializedBalance.mockResolvedValue(new Prisma.Decimal(5));

    // Cron actually runs 2 days late.
    await runDueResets("org-1", new Date("2027-01-03"));

    const carryForwardCall = mocks.postLedgerEntry.mock.calls.find((c) => c[0].type === "CARRY_FORWARD");
    expect(carryForwardCall![0].year).toBe(2027);
  });

  it("posts CARRY_FORWARD_EXPIRY for the forfeited remainder into the OLD (pre-reset) balance year", async () => {
    mocks.leaveBalanceFindMany.mockResolvedValue([
      {
        id: "bal-1",
        userId: "user-1",
        leaveTypeId: "lt-1",
        year: 2026,
        nextResetDate: new Date("2027-01-01"),
        leaveType: { activeVersionId: "v-1" },
      },
    ]);
    mocks.getMaterializedBalance.mockResolvedValue(new Prisma.Decimal(5)); // 5 - fixedMax(3) = 2 forfeited

    await runDueResets("org-1", new Date("2027-01-01"));

    const expiryCall = mocks.postLedgerEntry.mock.calls.find((c) => c[0].type === "CARRY_FORWARD_EXPIRY");
    expect(expiryCall).toBeDefined();
    expect(expiryCall![0].year).toBe(2026); // the year being reset OUT of, unchanged by this fix
    expect((expiryCall![0].quantity as Prisma.Decimal).toString()).toBe("-2");
  });

  it("computeNextResetDate for CALENDAR_YEAR returns Jan 1 of the year after asOf", () => {
    const result = computeNextResetDate(fixedMaxConfig(3), new Date("2026-06-15"), null);
    expect(result?.toISOString().slice(0, 10)).toBe("2027-01-01");
  });
});
