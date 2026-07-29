import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findInvitation: vi.fn(),
  consumeInvitation: vi.fn(),
  updateUser: vi.fn(),
  transaction: vi.fn(),
  getNow: vi.fn(),
  hashPassword: vi.fn(),
  logSecurityEvent: vi.fn(),
  syncAppraisal: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    employeeInvitation: {
      findUnique: mocks.findInvitation,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/clock", () => ({
  getNow: mocks.getNow,
}));

vi.mock("bcryptjs", () => ({
  hash: mocks.hashPassword,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  invalidateRbacCache: vi.fn(),
}));

vi.mock("@/lib/session-service", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
}));

vi.mock("@/modules/ams/service", () => ({
  syncEmployeeAppraisalSchedule: mocks.syncAppraisal,
}));

import { acceptEmployeeInvitation } from "../employee-invitation";

const now = new Date("2026-07-29T12:00:00.000Z");
const invitation = {
  id: "invitation-1",
  orgId: "org-1",
  userId: "employee-1",
  email: "employee@example.com",
  consumedAt: null,
  revokedAt: null,
  expiresAt: new Date("2026-07-30T12:00:00.000Z"),
  org: { name: "Adarsh Shipping & Services" },
  user: {
    employmentRecord: null,
  },
};

describe("employee invitation acceptance lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getNow.mockResolvedValue(now);
    mocks.hashPassword.mockResolvedValue("secure-password-hash");
    mocks.findInvitation.mockResolvedValue(invitation);
    mocks.consumeInvitation.mockResolvedValue({ count: 1 });
    mocks.updateUser.mockResolvedValue({ id: invitation.userId });
    mocks.transaction.mockImplementation(
      async (
        callback: (tx: {
          employeeInvitation: { updateMany: typeof mocks.consumeInvitation };
          user: { update: typeof mocks.updateUser };
        }) => Promise<unknown>,
      ) =>
        callback({
          employeeInvitation: { updateMany: mocks.consumeInvitation },
          user: { update: mocks.updateUser },
        }),
    );
  });

  it("consumes the invitation and activates the account in one transaction", async () => {
    await expect(
      acceptEmployeeInvitation({
        token: "single-use-invitation-token-that-is-long-enough",
        password: "ReadyToJoin2026",
      }),
    ).resolves.toEqual({
      organisationName: "Adarsh Shipping & Services",
      userId: "employee-1",
    });

    expect(mocks.consumeInvitation).toHaveBeenCalledWith({
      where: {
        id: invitation.id,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: invitation.userId },
      data: {
        passwordHash: "secure-password-hash",
        active: true,
        emailVerifiedAt: now,
        activatedAt: now,
      },
    });
  });

  it("rejects a replay before changing the employee account", async () => {
    mocks.consumeInvitation.mockResolvedValue({ count: 0 });

    await expect(
      acceptEmployeeInvitation({
        token: "single-use-invitation-token-that-is-long-enough",
        password: "ReadyToJoin2026",
      }),
    ).rejects.toThrow("This invitation link has already been used");

    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.logSecurityEvent).not.toHaveBeenCalled();
  });
});
