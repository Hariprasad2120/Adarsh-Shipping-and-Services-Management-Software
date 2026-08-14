import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  compOffCreditFindUniqueOrThrow: vi.fn(),
  compOffCreditUpdate: vi.fn(),
  leaveGrantFindUniqueOrThrow: vi.fn(),
  leaveGrantUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  leaveRequestFindUniqueOrThrow: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    compOffCredit: {
      findUniqueOrThrow: mocks.compOffCreditFindUniqueOrThrow,
      update: mocks.compOffCreditUpdate,
    },
    leaveGrant: {
      findUniqueOrThrow: mocks.leaveGrantFindUniqueOrThrow,
      update: mocks.leaveGrantUpdate,
    },
    leaveType: { findFirst: vi.fn(async () => ({ id: "comp-off-type-1" })) },
    user: { findUnique: mocks.userFindUnique },
    leaveRequest: { findUniqueOrThrow: mocks.leaveRequestFindUniqueOrThrow },
  },
}));

vi.mock("@/modules/leave/ledger", async () => {
  const actual = await vi.importActual<typeof import("../ledger")>("../ledger");
  return { ...actual, postLedgerEntry: vi.fn(async () => ({ id: "ledger-entry-1" })) };
});
vi.mock("@/modules/leave/audit", () => ({ writeLeaveAudit: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notify: vi.fn(), notifyMany: vi.fn() }));
vi.mock("@/modules/notifications/service", () => ({ getUsersWithPermission: vi.fn(async () => []) }));

import { approveCompOffCredit, rejectCompOffCredit, CrossOrgAccessError as CompOffCrossOrgError } from "../compoff";
import { approveLeaveGrant, rejectLeaveGrant, CrossOrgAccessError as GrantCrossOrgError } from "../grants";
import { decideLeaveRequest } from "../request";
import { CrossOrgAccessError } from "../ledger";

describe("cross-org authorization (spec §12/13/21 IDOR)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses to approve a comp-off credit belonging to a different org", async () => {
    mocks.compOffCreditFindUniqueOrThrow.mockResolvedValue({
      id: "credit-1", orgId: "org-B", status: "PENDING_APPROVAL",
    });
    await expect(approveCompOffCredit("credit-1", "approver-1", "org-A")).rejects.toThrow(CompOffCrossOrgError);
  });

  it("refuses to reject a comp-off credit belonging to a different org", async () => {
    mocks.compOffCreditFindUniqueOrThrow.mockResolvedValue({ id: "credit-1", orgId: "org-B" });
    await expect(rejectCompOffCredit("credit-1", "approver-1", "org-A")).rejects.toThrow(CompOffCrossOrgError);
  });

  it("allows approving a comp-off credit belonging to the same org", async () => {
    mocks.compOffCreditFindUniqueOrThrow.mockResolvedValue({
      id: "credit-1", orgId: "org-A", status: "PENDING_APPROVAL", units: 1, userId: "u1", earnedDate: new Date(),
    });
    mocks.compOffCreditUpdate.mockResolvedValue({ id: "credit-1", orgId: "org-A", status: "APPROVED" });
    await expect(approveCompOffCredit("credit-1", "approver-1", "org-A")).resolves.toBeDefined();
  });

  it("refuses to approve a leave grant belonging to a different org", async () => {
    mocks.leaveGrantFindUniqueOrThrow.mockResolvedValue({ id: "grant-1", orgId: "org-B", status: "PENDING" });
    await expect(approveLeaveGrant("grant-1", "approver-1", "org-A")).rejects.toThrow(GrantCrossOrgError);
  });

  it("refuses to reject a leave grant belonging to a different org", async () => {
    mocks.leaveGrantFindUniqueOrThrow.mockResolvedValue({ id: "grant-1", orgId: "org-B" });
    await expect(rejectLeaveGrant("grant-1", "approver-1", "org-A")).rejects.toThrow(GrantCrossOrgError);
  });

  it("refuses to let an approver in a different org decide a leave request", async () => {
    mocks.leaveRequestFindUniqueOrThrow.mockResolvedValue({
      id: "req-1",
      userId: "employee-in-org-B",
      status: "pending",
      leaveTypeId: "lt-1",
      policyVersionId: null,
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
      halfDay: false,
      paidUnits: 2,
      lopUnits: 0,
      leaveType: { name: "Annual Leave" },
      user: { id: "employee-in-org-B", name: "Employee B", orgId: "org-B" },
      approvalSteps: [],
    });
    mocks.userFindUnique.mockResolvedValue({ orgId: "org-A" }); // approver is in org-A

    await expect(
      decideLeaveRequest({ requestId: "req-1", approverId: "approver-in-org-A", decision: "APPROVED" }),
    ).rejects.toThrow(CrossOrgAccessError);
  });
});
