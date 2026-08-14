import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leaveRequestFindUniqueOrThrow: vi.fn(),
  leaveRequestUpdate: vi.fn(),
  leaveApprovalStepUpdate: vi.fn(),
  notify: vi.fn(),
  notifyMany: vi.fn(),
  writeLeaveAudit: vi.fn(),
  postLedgerEntry: vi.fn(),
  applyLeaveToAttendance: vi.fn(),
  applyLopFromLeaveRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    leaveRequest: {
      findUniqueOrThrow: mocks.leaveRequestFindUniqueOrThrow,
      update: mocks.leaveRequestUpdate,
    },
    leaveApprovalStep: { update: mocks.leaveApprovalStepUpdate },
  },
}));

vi.mock("@/lib/notify", () => ({
  notify: mocks.notify,
  notifyMany: mocks.notifyMany,
}));

vi.mock("@/modules/notifications/service", () => ({
  getUsersWithPermission: vi.fn(async () => []),
}));

vi.mock("@/modules/leave/audit", () => ({
  writeLeaveAudit: mocks.writeLeaveAudit,
}));

vi.mock("@/modules/leave/ledger", () => ({
  postLedgerEntry: mocks.postLedgerEntry,
}));

vi.mock("@/modules/leave/policy", () => ({
  getActivePolicyVersion: vi.fn(),
  parsePolicyConfig: vi.fn(),
}));

vi.mock("@/modules/leave/calculation", () => ({
  calculateLeaveRequest: vi.fn(),
}));

vi.mock("@/modules/leave/approval", () => ({
  buildApprovalSteps: vi.fn(async () => []),
}));

vi.mock("@/modules/leave/eligibility", () => ({
  isPolicyApplicableToUser: vi.fn(async () => true),
  isServiceEligible: vi.fn(async () => true),
}));

vi.mock("@/modules/leave/restrictions", () => ({
  validateRestrictions: vi.fn(async () => []),
}));

vi.mock("@/modules/leave/attendance-bridge", () => ({
  applyLeaveToAttendance: mocks.applyLeaveToAttendance,
  removeLeaveFromAttendance: vi.fn(),
}));

vi.mock("@/modules/leave/payroll-bridge", () => ({
  applyLopFromLeaveRequest: mocks.applyLopFromLeaveRequest,
  reverseLopFromLeaveRequest: vi.fn(),
  PayrollLockedError: class PayrollLockedError extends Error {},
}));

import { decideLeaveRequest } from "../request";

describe("decideLeaveRequest — authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses to let a requester approve their own leave request", async () => {
    mocks.leaveRequestFindUniqueOrThrow.mockResolvedValue({
      id: "req-1",
      userId: "user-self",
      status: "pending",
      leaveTypeId: "lt-1",
      policyVersionId: null,
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
      halfDay: false,
      paidUnits: 2,
      lopUnits: 0,
      leaveType: { name: "Annual Leave" },
      user: { id: "user-self", name: "Self Approver", orgId: "org-1" },
      approvalSteps: [],
    });

    await expect(
      decideLeaveRequest({ requestId: "req-1", approverId: "user-self", decision: "APPROVED" }),
    ).rejects.toThrow(/own requester/);

    // No mutation should have happened — reject before any write.
    expect(mocks.leaveRequestUpdate).not.toHaveBeenCalled();
    expect(mocks.postLedgerEntry).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("refuses to let a requester reject their own leave request too (not just approve)", async () => {
    mocks.leaveRequestFindUniqueOrThrow.mockResolvedValue({
      id: "req-2",
      userId: "user-self",
      status: "pending",
      leaveTypeId: "lt-1",
      policyVersionId: null,
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
      halfDay: false,
      paidUnits: 2,
      lopUnits: 0,
      leaveType: { name: "Annual Leave" },
      user: { id: "user-self", name: "Self Approver", orgId: "org-1" },
      approvalSteps: [],
    });

    await expect(
      decideLeaveRequest({ requestId: "req-2", approverId: "user-self", decision: "REJECTED" }),
    ).rejects.toThrow(/own requester/);
  });

  it("allows a different user to approve the request", async () => {
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
      user: { id: "employee-1", name: "Employee One", orgId: "org-1" },
      approvalSteps: [],
    });
    mocks.leaveRequestUpdate.mockResolvedValue({
      id: "req-3",
      leaveType: { name: "Annual Leave" },
      user: { id: "employee-1", name: "Employee One", orgId: "org-1" },
      userId: "employee-1",
      leaveTypeId: "lt-1",
      policyVersionId: null,
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
    });

    await expect(
      decideLeaveRequest({ requestId: "req-3", approverId: "manager-1", decision: "APPROVED" }),
    ).resolves.toBeDefined();

    expect(mocks.leaveRequestUpdate).toHaveBeenCalled();
  });
});
