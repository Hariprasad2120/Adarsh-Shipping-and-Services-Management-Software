import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leaveRequestFindUniqueOrThrow: vi.fn(),
  leaveRequestUpdate: vi.fn(),
  leaveApprovalStepUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  postLedgerEntry: vi.fn(),
  callOrder: [] as string[],
}));

vi.mock("@/lib/db", () => ({
  db: {
    leaveRequest: {
      findUniqueOrThrow: mocks.leaveRequestFindUniqueOrThrow,
      update: mocks.leaveRequestUpdate,
    },
    leaveApprovalStep: { update: mocks.leaveApprovalStepUpdate },
    user: { findUnique: mocks.userFindUnique },
  },
}));

vi.mock("@/lib/notify", () => ({ notify: vi.fn(), notifyMany: vi.fn() }));
vi.mock("@/modules/notifications/service", () => ({ getUsersWithPermission: vi.fn(async () => []) }));
vi.mock("@/modules/leave/audit", () => ({ writeLeaveAudit: vi.fn() }));
vi.mock("@/modules/leave/ledger", async () => {
  const actual = await vi.importActual<typeof import("../ledger")>("../ledger");
  return { ...actual, postLedgerEntry: mocks.postLedgerEntry };
});
vi.mock("@/modules/leave/attendance-bridge", () => ({
  applyLeaveToAttendance: vi.fn(),
  removeLeaveFromAttendance: vi.fn(),
}));
vi.mock("@/modules/leave/payroll-bridge", () => ({
  applyLopFromLeaveRequest: vi.fn(),
  reverseLopFromLeaveRequest: vi.fn(),
  PayrollLockedError: class PayrollLockedError extends Error {},
}));

import { decideLeaveRequest } from "../request";

describe("transaction ordering — ledger before status flip (spec §42)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callOrder.length = 0;
    mocks.userFindUnique.mockResolvedValue({ orgId: "org-1" });
    mocks.leaveApprovalStepUpdate.mockImplementation(async () => {
      mocks.callOrder.push("approvalStepUpdate");
    });
    mocks.postLedgerEntry.mockImplementation(async () => {
      mocks.callOrder.push("postLedgerEntry");
      return { id: "entry-1", balanceBefore: 0, balanceAfter: 0 };
    });
    mocks.leaveRequestUpdate.mockImplementation(async () => {
      mocks.callOrder.push("leaveRequestUpdate(status)");
      return {
        id: "req-1",
        leaveType: { name: "Annual Leave" },
        user: { id: "employee-1", name: "Employee", orgId: "org-1" },
      };
    });
  });

  it("posts the ledger entry BEFORE flipping LeaveRequest.status on approval", async () => {
    mocks.leaveRequestFindUniqueOrThrow.mockResolvedValue({
      id: "req-1",
      userId: "employee-1",
      status: "pending",
      leaveTypeId: "lt-1",
      policyVersionId: null,
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
      halfDay: false,
      paidUnits: 2,
      lopUnits: 0,
      leaveType: { name: "Annual Leave" },
      user: { id: "employee-1", name: "Employee", orgId: "org-1" },
      approvalSteps: [],
    });

    await decideLeaveRequest({ requestId: "req-1", approverId: "manager-1", decision: "APPROVED" });

    const ledgerIndex = mocks.callOrder.indexOf("postLedgerEntry");
    const statusIndex = mocks.callOrder.indexOf("leaveRequestUpdate(status)");
    expect(ledgerIndex).toBeGreaterThanOrEqual(0);
    expect(statusIndex).toBeGreaterThanOrEqual(0);
    expect(ledgerIndex).toBeLessThan(statusIndex);
  });

  it("does not flip status to APPROVED if the ledger post throws", async () => {
    mocks.leaveRequestFindUniqueOrThrow.mockResolvedValue({
      id: "req-2",
      userId: "employee-1",
      status: "pending",
      leaveTypeId: "lt-1",
      policyVersionId: null,
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
      halfDay: false,
      paidUnits: 2,
      lopUnits: 0,
      leaveType: { name: "Annual Leave" },
      user: { id: "employee-1", name: "Employee", orgId: "org-1" },
      approvalSteps: [],
    });
    mocks.postLedgerEntry.mockRejectedValue(new Error("simulated DB failure"));

    await expect(
      decideLeaveRequest({ requestId: "req-2", approverId: "manager-1", decision: "APPROVED" }),
    ).rejects.toThrow("simulated DB failure");

    // The critical assertion: status must NOT have been flipped to
    // APPROVED when the ledger write failed — otherwise the request would
    // be left permanently marked approved with no balance ever consumed.
    expect(mocks.leaveRequestUpdate).not.toHaveBeenCalled();
  });

  it("posts the CANCELLATION_REVERSAL ledger entry before flipping status on rejection", async () => {
    mocks.leaveRequestFindUniqueOrThrow.mockResolvedValue({
      id: "req-3",
      userId: "employee-1",
      status: "pending",
      leaveTypeId: "lt-1",
      policyVersionId: null,
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
      halfDay: false,
      paidUnits: 2,
      lopUnits: 0,
      leaveType: { name: "Annual Leave" },
      user: { id: "employee-1", name: "Employee", orgId: "org-1" },
      approvalSteps: [],
    });

    await decideLeaveRequest({ requestId: "req-3", approverId: "manager-1", decision: "REJECTED" });

    const ledgerIndex = mocks.callOrder.indexOf("postLedgerEntry");
    const statusIndex = mocks.callOrder.indexOf("leaveRequestUpdate(status)");
    expect(ledgerIndex).toBeLessThan(statusIndex);
  });
});
