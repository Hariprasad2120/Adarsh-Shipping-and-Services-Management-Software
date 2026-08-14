import { describe, expect, it } from "vitest";
import { LeavePolicyConfigSchema } from "../policy-config.schema";

function baseConfig(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    entitlement: { model: "FIXED", amount: 12, creditFrequency: "YEARLY" },
    proration: { strategy: "START_OF_POLICY", rounding: "NEAREST" },
    reset: { cadence: "CALENDAR_YEAR" },
    carryForward: { mode: "FIXED_MAX", fixedMax: 5, expiryAfterDays: 90 },
    encashment: { mode: "DISABLED", minBalanceRetained: 0 },
    negativeLeave: { mode: "REJECT" },
    maxBalance: 30,
    ...overrides,
  };
}

describe("LeavePolicyConfigSchema", () => {
  it("parses a minimal valid FIXED-entitlement config with defaults filled in", () => {
    const parsed = LeavePolicyConfigSchema.parse(baseConfig());
    expect(parsed.entitlement.model).toBe("FIXED");
    expect(parsed.sandwich.enabled).toBe(false);
    expect(parsed.restrictions.requireReason).toBe(true);
    expect(parsed.approvalRouting.mandatoryRejectionComment).toBe(true);
  });

  it("rejects an entitlement model with a missing discriminated field", () => {
    expect(() =>
      LeavePolicyConfigSchema.parse(baseConfig({ entitlement: { model: "EXPERIENCE_BASED" } })),
    ).toThrow();
  });

  it("validates EXPERIENCE_BASED tiers", () => {
    const parsed = LeavePolicyConfigSchema.parse(
      baseConfig({
        entitlement: {
          model: "EXPERIENCE_BASED",
          creditFrequency: "YEARLY",
          tiers: [
            { minServiceMonths: 0, maxServiceMonths: 12, amount: 10 },
            { minServiceMonths: 12, maxServiceMonths: null, amount: 18 },
          ],
        },
      }),
    );
    expect(parsed.entitlement.model).toBe("EXPERIENCE_BASED");
  });

  it("rejects a negative maxBalance", () => {
    expect(() => LeavePolicyConfigSchema.parse(baseConfig({ maxBalance: -1 }))).toThrow();
  });

  it("accepts partial-pay slabs summing above 100 total units without error (validated at calc time, not schema time)", () => {
    const parsed = LeavePolicyConfigSchema.parse(
      baseConfig({
        partialPaySlabs: [
          { uptoUnits: 5, payPercentage: 100 },
          { uptoUnits: 10, payPercentage: 50 },
        ],
      }),
    );
    expect(parsed.partialPaySlabs).toHaveLength(2);
  });
});
