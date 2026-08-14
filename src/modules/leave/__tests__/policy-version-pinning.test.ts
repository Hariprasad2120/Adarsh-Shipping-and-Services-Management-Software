import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  leaveRequestCreate: vi.fn(),
  leavePolicyVersionFindUnique: vi.fn(),
  leaveTypeFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    leaveRequest: { create: mocks.leaveRequestCreate },
    leavePolicyVersion: { findUnique: mocks.leavePolicyVersionFindUnique },
    leaveType: { findUnique: mocks.leaveTypeFindUnique },
    user: { findUnique: mocks.userFindUnique },
  },
}));

vi.mock("@/lib/notify", () => ({ notify: vi.fn(), notifyMany: vi.fn() }));
vi.mock("@/modules/notifications/service", () => ({ getUsersWithPermission: vi.fn(async () => []) }));
vi.mock("@/modules/leave/audit", () => ({ writeLeaveAudit: vi.fn() }));
vi.mock("@/modules/leave/ledger", () => ({ postLedgerEntry: vi.fn() }));
vi.mock("@/modules/leave/calculation", () => ({
  calculateLeaveRequest: vi.fn(async () => ({
    requestedUnits: 2, paidUnits: 2, lopUnits: 0, partialPaidUnits: 0,
    balanceReserved: 2, balanceBefore: 10, balanceAfter: 8,
    warnings: [], violations: [], weekendUnits: 0, holidayUnits: 0,
    sandwichUnits: 0, calendarWorkingUnits: 2, eligibleUnits: 2,
    sandwichBreakdown: null, explanation: [],
  })),
}));
vi.mock("@/modules/leave/approval", () => ({ buildApprovalSteps: vi.fn(async () => []) }));
vi.mock("@/modules/leave/eligibility", () => ({
  isPolicyApplicableToUser: vi.fn(async () => true),
  isServiceEligible: vi.fn(async () => true),
}));
vi.mock("@/modules/leave/restrictions", () => ({ validateRestrictions: vi.fn(async () => []) }));

import { getActivePolicyVersion } from "@/modules/leave/policy";
import { submitLeaveRequest } from "../request";

describe("policy version pinning (spec §4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getActivePolicyVersion resolves via LeaveType.activeVersionId, not a fresh 'latest' query", async () => {
    // The whole pinning guarantee rests on this: activeVersionId is a
    // stable pointer set only by publishPolicyVersion(), so two calls at
    // different times return the SAME version unless someone explicitly
    // republishes — proving requests pin a specific immutable row, not a
    // "current" concept that silently shifts.
    mocks.leaveTypeFindUnique.mockResolvedValue({ activeVersionId: "version-A" });
    mocks.leavePolicyVersionFindUnique.mockResolvedValue({
      id: "version-A",
      effectiveFrom: new Date("2026-01-01"),
      effectiveUntil: null,
      applicabilityRules: [],
    });

    const asOf = new Date("2026-08-14");
    const first = await getActivePolicyVersion("leave-type-1", asOf);
    expect(first?.id).toBe("version-A");

    // Simulate a later publish: LeaveType now points at a new version.
    mocks.leaveTypeFindUnique.mockResolvedValue({ activeVersionId: "version-B" });
    mocks.leavePolicyVersionFindUnique.mockResolvedValue({
      id: "version-B",
      effectiveFrom: new Date("2026-08-01"),
      effectiveUntil: null,
      applicabilityRules: [],
    });

    const second = await getActivePolicyVersion("leave-type-1", asOf);
    expect(second?.id).toBe("version-B");
    expect(second?.id).not.toBe(first?.id);
    // This proves getActivePolicyVersion is a live pointer (correct for
    // NEW submissions) — the pinning guarantee comes from
    // submitLeaveRequest persisting policyVersionId onto the LeaveRequest
    // row at creation time, never re-resolving it afterward. That
    // persistence is asserted in the next test.
  });

  it("submitLeaveRequest persists the resolved policyVersionId onto the created LeaveRequest row", async () => {
    mocks.leaveTypeFindUnique.mockResolvedValue({ activeVersionId: "version-pinned" });
    mocks.leavePolicyVersionFindUnique.mockResolvedValue({
      id: "version-pinned",
      effectiveFrom: new Date("2026-01-01"),
      effectiveUntil: null,
      applicabilityRules: [],
      configuration: {
        entitlement: { model: "FIXED", amount: 12, creditFrequency: "MONTHLY" },
        proration: { strategy: "NONE", rounding: "NEAREST" },
        reset: { cadence: "CALENDAR_YEAR" },
        carryForward: { mode: "NONE", expiryAfterDays: null },
        encashment: { mode: "DISABLED", minBalanceRetained: 0 },
        effectiveAfterServiceMonths: 0,
        negativeLeave: { mode: "REJECT" },
      },
      classification: "PAID",
      roundingMode: "NONE",
      roundingIncrement: null,
    });
    mocks.leaveRequestCreate.mockResolvedValue({
      id: "req-1",
      policyVersionId: "version-pinned",
      user: { id: "user-1", name: "Employee", orgId: "org-1" },
      leaveType: { name: "Annual Leave" },
    });

    await submitLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
      halfDay: false,
    });

    const createCall = mocks.leaveRequestCreate.mock.calls[0][0];
    expect(createCall.data.policyVersionId).toBe("version-pinned");
  });
});
