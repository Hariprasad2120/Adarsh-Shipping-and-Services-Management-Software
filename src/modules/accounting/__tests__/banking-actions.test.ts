import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  auth,
  requirePermission,
  revalidatePath,
  saveManualBankAccount,
  markBankAccountInactive,
} = vi.hoisted(() => ({
  auth: vi.fn(),
  requirePermission: vi.fn(),
  revalidatePath: vi.fn(),
  saveManualBankAccount: vi.fn(),
  markBankAccountInactive: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rbac", () => ({
  requirePermission,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("../banking-service", async () => {
  const actual = await vi.importActual("../banking-service");
  return {
    ...actual,
    saveManualBankAccount,
    markBankAccountInactive,
  };
});

import { db } from "@/lib/db";
import {
  markBankAccountInactiveAction,
  saveManualBankAccountAction,
} from "../banking-actions";

const mockedDb = db as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
};

describe("banking-actions", () => {
  const permissionError =
    "You do not have permission to perform this Accounting action.";

  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockReset();
    requirePermission.mockReset();
    revalidatePath.mockReset();
    saveManualBankAccount.mockReset();
    markBankAccountInactive.mockReset();
  });

  it("rejects unauthenticated Banking mutations", async () => {
    auth.mockResolvedValue(null);

    const result = await saveManualBankAccountAction({
      ledgerAccountId: "ledger_1",
      name: "Bank Alpha",
      bankName: "Bank Alpha",
      branchName: "Chennai",
      accountNumberMasked: "••••7890",
      ifsc: "",
      currencyCode: "INR",
      accountKind: "CURRENT",
      description: "",
      isActive: true,
      reason: "create",
    });

    expect(result).toEqual({ ok: false, error: permissionError });
    expect(requirePermission).not.toHaveBeenCalled();
  });

  it("enforces manage permission before saving a bank account", async () => {
    auth.mockResolvedValue({
      user: { id: "user_1", orgId: "org_1" },
    });
    mockedDb.user.findUnique.mockResolvedValue({
      id: "user_1",
      orgId: "org_1",
      branchId: "branch_1",
    });
    requirePermission.mockRejectedValue(new Error("Forbidden"));

    const result = await saveManualBankAccountAction({
      ledgerAccountId: "ledger_1",
      name: "Bank Alpha",
      bankName: "Bank Alpha",
      branchName: "Chennai",
      accountNumberMasked: "••••7890",
      ifsc: "",
      currencyCode: "INR",
      accountKind: "CURRENT",
      description: "",
      isActive: true,
      reason: "create",
    });

    expect(result).toEqual({ ok: false, error: permissionError });
    expect(saveManualBankAccount).not.toHaveBeenCalled();
  });

  it("passes tenant and location scope to manual save mutations", async () => {
    auth.mockResolvedValue({
      user: { id: "user_1", orgId: "org_1" },
    });
    mockedDb.user.findUnique.mockResolvedValue({
      id: "user_1",
      orgId: "org_1",
      branchId: "branch_1",
    });
    requirePermission.mockResolvedValue(undefined);
    saveManualBankAccount.mockResolvedValue({ id: "bank_1" });

    const result = await saveManualBankAccountAction({
      bankAccountId: "bank_1",
      expectedVersion: 4,
      ledgerAccountId: "ledger_1",
      name: "Bank Alpha",
      bankName: "Bank Alpha",
      branchName: "Chennai",
      accountNumberMasked: "••••7890",
      ifsc: "",
      currencyCode: "INR",
      accountKind: "CURRENT",
      description: "",
      isActive: true,
      reason: "edit",
    });

    expect(result).toEqual({ ok: true, data: { id: "bank_1" } });
    expect(requirePermission).toHaveBeenCalledWith("user_1", "accounting.settings.manage");
    expect(saveManualBankAccount).toHaveBeenCalledWith(
      "org_1",
      "user_1",
      "branch_1",
      expect.objectContaining({ bankAccountId: "bank_1" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/accounting/banking");
    expect(revalidatePath).toHaveBeenCalledWith("/accounting/banking/bank_1");
  });

  it("enforces manage permission before inactivation", async () => {
    auth.mockResolvedValue({
      user: { id: "user_1", orgId: "org_1" },
    });
    mockedDb.user.findUnique.mockResolvedValue({
      id: "user_1",
      orgId: "org_1",
      branchId: "branch_1",
    });
    requirePermission.mockRejectedValue(new Error("Forbidden"));

    const result = await markBankAccountInactiveAction({
      bankAccountId: "bank_1",
      reason: "inactive",
    });

    expect(result).toEqual({ ok: false, error: permissionError });
    expect(markBankAccountInactive).not.toHaveBeenCalled();
  });
});
