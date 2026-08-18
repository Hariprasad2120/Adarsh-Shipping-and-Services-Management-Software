import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leaveRequestFindUniqueOrThrow: vi.fn(),
  leaveRequestUpdate: vi.fn(),
  leavePolicyVersionFindUnique: vi.fn(),
  postLedgerEntry: vi.fn(),
  removeLeaveFromAttendance: vi.fn(),
  reverseLopFromLeaveRequest: vi.fn(),
  writeLeaveAudit: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    leaveRequest: {
      findUniqueOrThrow: mocks.leaveRequestFindUniqueOrThrow,
      update: mocks.leaveRequestUpdate,
    },
    leavePolicyVersion: { findUnique: mocks.leavePolicyVersionFindUnique },
  },
}));

vi.mock("@/lib/notify", () => ({ notify: mocks.notify, notifyMany: vi.fn() }));
vi.mock("@/modules/notifications/service", () => ({ getUsersWithPermission: vi.fn(async () => []) }));
vi.mock("@/modules/leave/audit", () => ({ writeLeaveAudit: mocks.writeLeaveAudit }));
vi.mock("@/modules/leave/ledger", async () => {
  const actual = await vi.importActual<typeof import("../ledger")>("../ledger");
  return { ...actual, postLedgerEntry: mocks.postLedgerEntry };
});
vi.mock("@/modules/leave/attendance-bridge", () => ({
  applyLeaveToAttendance: vi.fn(),
  removeLeaveFromAttendance: mocks.removeLeaveFromAttendance,
}));
vi.mock("@/modules/leave/payroll-bridge", () => ({
  applyLopFromLeaveRequest: vi.fn(),
  reverseLopFromLeaveRequest: mocks.reverseLopFromLeaveRequest,
  PayrollLockedError: class PayrollLockedError extends Error {},
}));
vi.mock("@/modules/leave/policy", () => ({
  getActivePolicyVersion: vi.fn(),
  parsePolicyConfig: (config: unknown) => config,
}));
vi.mock("@/modules/leave/calculation", () => ({
  calculateLeaveRequest: vi.fn(async ({ fromDate, toDate }: { fromDate: Date; toDate: Date }) => {
    // Simplified: 1 unit per calendar day in the recalculated (remaining) range.
    const days = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
    return {
      requestedUnits: days, paidUnits: days, lopUnits: 0, partialPaidUnits: 0,
      balanceReserved: days, balanceBefore: 10, balanceAfter: 10 - days,
      warnings: [], violations: [], weekendUnits: 0, holidayUnits: 0,
      sandwichUnits: 0, calendarWorkingUnits: days, eligibleUnits: days,
      sandwichBreakdown: null, explanation: [], partialPaySlabBreakdown: [],
    };
  }),
}));

import { cancelLeaveRequestPartial } from "../request";

describe("partial cancellation (spec §9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.leavePolicyVersionFindUnique.mockResolvedValue({
      id: "version-1",
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
      configuration: {},
    });
    mocks.leaveRequestUpdate.mockResolvedValue({});
    mocks.postLedgerEntry.mockResolvedValue({ id: "entry-1" });
  });

  it("cancelling the trailing 2 days of a 5-day approved request leaves 3 days and reverses 2", async () => {
    // Original: 1 Aug - 5 Aug (5 days). Cancel: 4 Aug - 5 Aug (2 days).
    // Expected remaining: 1 Aug - 3 Aug (3 days), 2 days reversed.
    mocks.leaveRequestFindUniqueOrThrow
      .mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "approved",
        leaveTypeId: "lt-1",
        policyVersionId: "version-1",
        fromDate: new Date("2026-08-01"),
        toDate: new Date("2026-08-05"),
        halfDay: false,
        paidUnits: 5,
        lopUnits: 0,
        user: { orgId: "org-1" },
        leaveType: { name: "Annual Leave" },
      })
      .mockResolvedValueOnce({
        id: "req-1",
        fromDate: new Date("2026-08-01"),
        toDate: new Date("2026-08-03"),
        paidUnits: 3,
        lopUnits: 0,
      });

    const { remainingCalculation } = await cancelLeaveRequestPartial({
      requestId: "req-1",
      actorId: "actor-1",
      reason: "Plans changed",
      cancelFromDate: new Date("2026-08-04"),
      cancelToDate: new Date("2026-08-05"),
    });

    expect(remainingCalculation.requestedUnits).toBe(3);

    const updateCall = mocks.leaveRequestUpdate.mock.calls[0][0];
    expect(updateCall.data.fromDate).toEqual(new Date("2026-08-01"));
    expect(updateCall.data.toDate).toEqual(new Date("2026-08-03"));
    expect(updateCall.data.paidUnits.toNumber()).toBe(3);

    const ledgerCall = mocks.postLedgerEntry.mock.calls[0][0];
    expect(ledgerCall.type).toBe("CANCELLATION_REVERSAL");
    expect(ledgerCall.quantity.toNumber()).toBe(2); // 5 - 3 = 2 reversed

    expect(mocks.removeLeaveFromAttendance).toHaveBeenCalledWith({
      userId: "user-1",
      fromDate: new Date("2026-08-04"),
      toDate: new Date("2026-08-05"),
    });
  });

  it("cancelling the leading edge shrinks the request from the front", async () => {
    // Original: 1 Aug - 5 Aug. Cancel: 1 Aug - 2 Aug (leading 2 days).
    // Expected remaining: 3 Aug - 5 Aug (3 days).
    mocks.leaveRequestFindUniqueOrThrow
      .mockResolvedValueOnce({
        id: "req-2",
        userId: "user-1",
        status: "approved",
        leaveTypeId: "lt-1",
        policyVersionId: "version-1",
        fromDate: new Date("2026-08-01"),
        toDate: new Date("2026-08-05"),
        halfDay: false,
        paidUnits: 5,
        lopUnits: 0,
        user: { orgId: "org-1" },
        leaveType: { name: "Annual Leave" },
      })
      .mockResolvedValueOnce({});

    await cancelLeaveRequestPartial({
      requestId: "req-2",
      actorId: "actor-1",
      reason: "Starting later",
      cancelFromDate: new Date("2026-08-01"),
      cancelToDate: new Date("2026-08-02"),
    });

    const updateCall = mocks.leaveRequestUpdate.mock.calls[0][0];
    expect(updateCall.data.fromDate).toEqual(new Date("2026-08-03"));
    expect(updateCall.data.toDate).toEqual(new Date("2026-08-05"));
  });

  it("rejects an interior-gap cancellation (neither leading nor trailing edge)", async () => {
    mocks.leaveRequestFindUniqueOrThrow.mockResolvedValueOnce({
      id: "req-3",
      userId: "user-1",
      status: "approved",
      leaveTypeId: "lt-1",
      policyVersionId: "version-1",
      fromDate: new Date("2026-08-01"),
      toDate: new Date("2026-08-05"),
      halfDay: false,
      paidUnits: 5,
      lopUnits: 0,
      user: { orgId: "org-1" },
      leaveType: { name: "Annual Leave" },
    });

    await expect(
      cancelLeaveRequestPartial({
        requestId: "req-3",
        actorId: "actor-1",
        reason: "just the middle day",
        cancelFromDate: new Date("2026-08-03"),
        cancelToDate: new Date("2026-08-03"),
      }),
    ).rejects.toThrow(/leading or trailing/);
  });

  it("rejects partial cancellation of a request that is not yet approved", async () => {
    mocks.leaveRequestFindUniqueOrThrow.mockResolvedValueOnce({
      id: "req-4",
      userId: "user-1",
      status: "pending",
      fromDate: new Date("2026-08-01"),
      toDate: new Date("2026-08-05"),
      user: { orgId: "org-1" },
    });

    await expect(
      cancelLeaveRequestPartial({
        requestId: "req-4",
        actorId: "actor-1",
        reason: "test",
        cancelFromDate: new Date("2026-08-04"),
        cancelToDate: new Date("2026-08-05"),
      }),
    ).rejects.toThrow(/only available for approved/);
  });
});
