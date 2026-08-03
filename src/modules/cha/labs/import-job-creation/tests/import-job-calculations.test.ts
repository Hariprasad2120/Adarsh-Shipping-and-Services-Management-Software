import { describe, expect, it } from "vitest";
import {
  DemoImportCalculationEngine,
  calculateChargeInr,
  calculateInvoiceInr,
  calculateItemAmountFc,
  calculateItemAmountInr,
} from "../domain/import-job-calculations";
import { createSampleImportJobDraft } from "../domain/import-job.defaults";

describe("DemoImportCalculationEngine", () => {
  it("calculates invoice currency conversion", () => {
    expect(calculateInvoiceInr("125.50", "83.2")).toBe(10441.6);
  });

  it("calculates item amounts from quantity, unit price and linked invoice rate", () => {
    expect(calculateItemAmountFc("10", "12.5")).toBe(125);
    expect(calculateItemAmountInr("10", "12.5", "83.2")).toBe(10400);
  });

  it("calculates charge INR", () => {
    expect(calculateChargeInr({ amount: "75", exchangeRate: "83.2" })).toBe(6240);
  });

  it("aggregates duty totals", () => {
    const draft = createSampleImportJobDraft();
    const totals = new DemoImportCalculationEngine().aggregateDraft(draft);

    expect(totals.items.totalDuty).toBeGreaterThan(0);
    expect(totals.items.byDuty.bcd).toBeGreaterThan(0);
    expect(totals.items.byDuty.igst).toBeGreaterThan(0);
  });
});
