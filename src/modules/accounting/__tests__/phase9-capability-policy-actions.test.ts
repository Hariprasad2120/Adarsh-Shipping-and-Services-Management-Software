import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/modules/accounting/capability-policies", () => ({
  assertAccountingCapabilityCode: (value: string) => value,
  saveAccountingCapabilityPolicyDraft: vi.fn(),
  submitAccountingCapabilityPolicyForApproval: vi.fn(),
  approveAccountingCapabilityPolicy: vi.fn(),
  rejectAccountingCapabilityPolicy: vi.fn(),
  revokeAccountingCapabilityPolicy: vi.fn(),
  supersedeAccountingCapabilityPolicy: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { saveAccountingCapabilityPolicyDraftAction } from "@/modules/accounting/actions";

describe("Phase 9 capability-policy actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", orgId: "org-1" },
    } as never);
  });

  it("returns a permission error when the actor lacks draft-management access", async () => {
    vi.mocked(requirePermission).mockRejectedValue(
      new Error("Forbidden: missing permission accounting.capability-policy.manage"),
    );

    const formData = new FormData();
    formData.set("capabilityCode", "RECURRING_GENERATION");
    formData.set("effectiveFrom", "2026-07-31");
    formData.set(
      "configurationJson",
      JSON.stringify({
        enabled: false,
        checklist: [
          { code: "APPROVAL", label: "Approval", status: "PENDING" },
        ],
        blockers: ["Approval required"],
        warnings: [],
      }),
    );

    const result = await saveAccountingCapabilityPolicyDraftAction(formData);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected permission rejection");
    }
    expect(result.error).toContain(
      "You do not have permission to perform this Accounting action.",
    );
  });
});
