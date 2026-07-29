import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    user: { create: vi.fn() },
    userRole: { createMany: vi.fn() },
    employmentRecord: { create: vi.fn() },
    employeeHrmsProfile: { create: vi.fn() },
    employeeInvitation: { create: vi.fn() },
  };

  return {
    tx,
    db: {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        aggregate: vi.fn(),
      },
      organisation: { findUnique: vi.fn() },
      role: { findMany: vi.fn() },
      branch: { findFirst: vi.fn() },
      department: { findFirst: vi.fn() },
      division: { findFirst: vi.fn() },
      employeeInvitation: { update: vi.fn() },
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    },
    getNow: vi.fn(),
    hashPassword: vi.fn(),
    sendEmail: vi.fn(),
    invalidateRbacCache: vi.fn(),
    logSecurityEvent: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/clock", () => ({ getNow: mocks.getNow }));
vi.mock("bcryptjs", () => ({ hash: mocks.hashPassword }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/rbac", () => ({
  invalidateRbacCache: mocks.invalidateRbacCache,
}));
vi.mock("@/lib/session-service", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
}));
vi.mock("@/modules/ams/service", () => ({
  syncEmployeeAppraisalSchedule: vi.fn(),
}));

import {
  basicEmployeeInvitationInputSchema,
  getEmployeeNumberSuggestion,
  inviteBasicEmployee,
} from "../employee-invitation";

const now = new Date("2026-07-29T12:00:00.000Z");

describe("basic employee invitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getNow.mockResolvedValue(now);
    mocks.hashPassword.mockResolvedValue("placeholder-password-hash");
    mocks.sendEmail.mockResolvedValue({ id: "email-1" });
    mocks.db.user.findFirst.mockResolvedValue(null);
    mocks.db.user.findUnique.mockResolvedValue(null);
    mocks.db.organisation.findUnique.mockResolvedValue({
      id: "org-1",
      name: "Adarsh Shipping & Services",
    });
    mocks.db.role.findMany.mockResolvedValue([{ id: "employee-role" }]);
    mocks.tx.user.create.mockResolvedValue({
      id: "employee-1",
      email: "new.employee@example.com",
      passwordHash: "placeholder-password-hash",
      name: "New Employee",
    });
    mocks.tx.userRole.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.employeeHrmsProfile.create.mockResolvedValue({
      id: "profile-1",
    });
    mocks.tx.employeeInvitation.create.mockResolvedValue({
      id: "invitation-1",
      orgId: "org-1",
      userId: "employee-1",
      email: "new.employee@example.com",
      expiresAt: new Date("2026-08-01T12:00:00.000Z"),
    });
    mocks.db.employeeInvitation.update.mockResolvedValue({
      id: "invitation-1",
    });
  });

  it("requires exactly the four basic employee details", () => {
    expect(
      basicEmployeeInvitationInputSchema.parse({
        employeeNumber: 194,
        firstName: " New ",
        lastName: " Employee ",
        email: " NEW.EMPLOYEE@example.com ",
      }),
    ).toEqual({
      employeeNumber: 194,
      firstName: "New",
      lastName: "Employee",
      email: "new.employee@example.com",
    });

    expect(
      basicEmployeeInvitationInputSchema.safeParse({
        employeeNumber: 194,
        firstName: "New",
        lastName: "",
        email: "new.employee@example.com",
      }).success,
    ).toBe(false);
  });

  it("creates a pending employee and profile without inventing employment details", async () => {
    const result = await inviteBasicEmployee({
      orgId: "org-1",
      actorId: "hr-1",
      input: {
        employeeNumber: 194,
        firstName: "New",
        lastName: "Employee",
        email: "new.employee@example.com",
      },
    });

    expect(mocks.db.role.findMany).toHaveBeenCalledWith({
      where: { orgId: "org-1", name: "Employee" },
      select: { id: true },
      take: 1,
    });
    expect(mocks.tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        active: false,
        employeeNumber: 194,
        firstName: "New",
        lastName: "Employee",
        name: "New Employee",
        email: "new.employee@example.com",
      }),
    });
    expect(mocks.tx.userRole.createMany).toHaveBeenCalledWith({
      data: [{ userId: "employee-1", roleId: "employee-role" }],
    });
    expect(mocks.tx.employmentRecord.create).not.toHaveBeenCalled();
    expect(mocks.tx.employeeHrmsProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "employee-1",
        data: expect.objectContaining({ onboardingStatus: "Not started" }),
      }),
    });
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(result.invitation.deliveryStatus).toBe("SENT");
  });

  it("suggests an unused ID above both organisation and global maxima", async () => {
    mocks.db.user.aggregate
      .mockResolvedValueOnce({ _max: { employeeNumber: 193 } })
      .mockResolvedValueOnce({ _max: { employeeNumber: 212 } });

    await expect(getEmployeeNumberSuggestion("org-1")).resolves.toEqual({
      lastEmployeeNumber: 193,
      nextEmployeeNumber: 213,
    });
  });
});
