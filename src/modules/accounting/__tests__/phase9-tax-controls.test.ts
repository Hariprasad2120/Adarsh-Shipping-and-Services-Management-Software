import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    accountingTaxProfile: { findFirst: vi.fn() },
    accountingTaxRule: { findFirst: vi.fn() },
    accountingStatutoryReturnProfile: { findFirst: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import {
  assertStatutoryReportAvailability,
  resolveActiveTaxProfile,
  resolveDocumentTaxConfiguration,
} from "../tax-controls";

const mockedDb = db as unknown as {
  accountingTaxProfile: { findFirst: ReturnType<typeof vi.fn> };
  accountingTaxRule: { findFirst: ReturnType<typeof vi.fn> };
  accountingStatutoryReturnProfile: { findFirst: ReturnType<typeof vi.fn> };
};

describe("Phase 9 tax/statutory configuration resolvers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers an exact legal-entity tax profile before the registration default", async () => {
    mockedDb.accountingTaxProfile.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "profile-default", statutoryValidated: true });

    const result = await resolveActiveTaxProfile({
      orgId: "org_1",
      taxRegistrationId: "reg_1",
      legalEntityId: "entity_1",
      date: "2026-07-31",
    });

    expect(result).toEqual({ id: "profile-default", statutoryValidated: true });
    expect(mockedDb.accountingTaxProfile.findFirst).toHaveBeenCalledTimes(2);
  });

  it("fails closed when a statutory report profile is missing", async () => {
    mockedDb.accountingStatutoryReturnProfile.findFirst.mockResolvedValue(null);

    await expect(
      assertStatutoryReportAvailability({
        orgId: "org_1",
        taxRegistrationId: "reg_1",
        returnType: "GSTR1",
        date: "2026-07-31",
      }),
    ).rejects.toThrow(/no active statutory return profile/i);
  });

  it("returns the validated tax profile and rule for document resolution", async () => {
    mockedDb.accountingTaxProfile.findFirst.mockResolvedValue({
      id: "profile_1",
      statutoryValidated: true,
    });
    mockedDb.accountingTaxRule.findFirst.mockResolvedValue({
      id: "rule_1",
      statutoryValidated: true,
      components: [{ componentCode: "CGST_STANDARD" }],
    });

    const resolved = await resolveDocumentTaxConfiguration({
      orgId: "org_1",
      taxRegistrationId: "reg_1",
      legalEntityId: "entity_1",
      documentType: "SALES_INVOICE",
      placeOfSupplyType: "INTRA_STATE",
      counterpartyTreatment: "REGISTERED_BUSINESS",
      supplyCategory: "SERVICE",
      date: "2026-07-31",
    });

    expect(resolved.profile.id).toBe("profile_1");
    expect(resolved.rule.id).toBe("rule_1");
  });
});
