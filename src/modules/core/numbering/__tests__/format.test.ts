import { describe, expect, it } from "vitest";
import {
  fiscalYearLabel,
  formatSequenceNumber,
  isResetPolicy,
  periodLabelFor,
  resolveTemplateTokens,
} from "../format";

describe("fiscalYearLabel", () => {
  it("April start — date in April..Dec belongs to that FY", () => {
    expect(fiscalYearLabel(new Date("2026-06-15T00:00:00Z"), 4)).toBe("2026-27");
  });
  it("April start — date in Jan..Mar belongs to the previous FY", () => {
    expect(fiscalYearLabel(new Date("2026-02-15T00:00:00Z"), 4)).toBe("2025-26");
  });
  it("January start collapses to a single calendar year", () => {
    expect(fiscalYearLabel(new Date("2026-09-01T00:00:00Z"), 1)).toBe("2026-26");
  });
  it("style variants", () => {
    const d = new Date("2026-06-15T00:00:00Z");
    expect(fiscalYearLabel(d, 4, "range4")).toBe("2026-2027");
    expect(fiscalYearLabel(d, 4, "startYY")).toBe("26");
    expect(fiscalYearLabel(d, 4, "startYYYY")).toBe("2026");
  });
});

describe("periodLabelFor", () => {
  it("NEVER → empty", () => {
    expect(periodLabelFor("NEVER", new Date())).toBe("");
  });
  it("ANNUALLY → fiscal-year label", () => {
    expect(periodLabelFor("ANNUALLY", new Date("2026-06-15T00:00:00Z"), 4)).toBe("2026-27");
  });
  it("MONTHLY → YYYY-MM", () => {
    expect(periodLabelFor("MONTHLY", new Date("2026-09-03T00:00:00Z"))).toBe("2026-09");
  });
});

describe("resolveTemplateTokens", () => {
  it("substitutes date tokens", () => {
    const d = new Date("2026-06-05T00:00:00Z");
    expect(resolveTemplateTokens("INV-{FY}-", d, 4)).toBe("INV-2026-27-");
    expect(resolveTemplateTokens("{YYYY}{MM}{DD}", d, 4)).toBe("20260605");
    expect(resolveTemplateTokens("{YY}/{MMM}/", d, 4)).toBe("26/Jun/");
  });
  it("leaves unknown text intact", () => {
    expect(resolveTemplateTokens("JOB/", new Date(), 1)).toBe("JOB/");
  });
});

describe("formatSequenceNumber", () => {
  it("pads the body and applies prefix/suffix", () => {
    expect(
      formatSequenceNumber({ prefix: "INV-", suffix: "", padding: 6 }, 42n),
    ).toBe("INV-000042");
  });
  it("resolves tokens in prefix using the supplied date", () => {
    expect(
      formatSequenceNumber(
        { prefix: "INV-{FY}-", suffix: "/X", padding: 4 },
        7,
        { date: new Date("2026-06-15T00:00:00Z"), fiscalYearStartMonth: 4 },
      ),
    ).toBe("INV-2026-27-0007/X");
  });
  it("does not truncate a value longer than padding", () => {
    expect(formatSequenceNumber({ prefix: "", suffix: "", padding: 3 }, 12345n)).toBe("12345");
  });
});

describe("isResetPolicy", () => {
  it("accepts the three known policies, rejects others", () => {
    expect(isResetPolicy("NEVER")).toBe(true);
    expect(isResetPolicy("ANNUALLY")).toBe(true);
    expect(isResetPolicy("MONTHLY")).toBe(true);
    expect(isResetPolicy("YEARLY")).toBe(false);
  });
});
