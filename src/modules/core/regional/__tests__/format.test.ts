import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatNumber,
  formatDate,
  formatDateTime,
  zonedNow,
  NEUTRAL_FORMAT_CONTEXT,
} from "../format";

describe("regional/format — no hardcoded currency or locale", () => {
  it("formats money in the currency the caller passes", () => {
    expect(formatMoney(1234.5, { currency: "USD", locale: "en-US" })).toBe("$1,234.50");
    expect(formatMoney(1234.5, { currency: "EUR", locale: "de-DE" })).toContain("€");
    // Indian grouping is a per-org locale choice, never the platform default.
    expect(formatMoney(1234567, { currency: "INR", locale: "en-IN" })).toBe("₹12,34,567.00");
  });

  it("compact notation drops fraction digits", () => {
    expect(formatMoney(2_500_000, { currency: "USD", locale: "en-US", compact: true })).toBe("$2.5M");
  });

  it("degrades gracefully on an unknown currency code", () => {
    const out = formatMoney(10, { currency: "XTS", locale: "en-US" });
    expect(out).toContain("XTS");
    expect(out).toContain("10");
  });

  it("formatNumber honours the locale grouping", () => {
    expect(formatNumber(1234567.89, { locale: "en-US" })).toBe("1,234,567.89");
    expect(formatNumber(1234567.89, { locale: "de-DE" })).toBe("1.234.567,89");
  });

  it("formats a date in the requested timezone", () => {
    // 2024-01-01T00:30:00Z is still 2023-12-31 in New York.
    const iso = "2024-01-01T00:30:00.000Z";
    const ny = formatDate(iso, { locale: "en-US", timezone: "America/New_York", dateStyle: "short" });
    expect(ny).toBe("12/31/23");
    const kolkata = formatDate(iso, { locale: "en-GB", timezone: "Asia/Kolkata", dateStyle: "short" });
    expect(kolkata).toBe("01/01/2024");
  });

  it("formatDateTime can include a time component", () => {
    const out = formatDateTime("2024-06-15T12:00:00.000Z", {
      locale: "en-GB",
      timezone: "UTC",
      dateStyle: "short",
      timeStyle: "short",
    });
    expect(out).toMatch(/12:00/);
  });

  it("the neutral fallback context is not India-shaped", () => {
    expect(NEUTRAL_FORMAT_CONTEXT.baseCurrency).toBe("USD");
    expect(NEUTRAL_FORMAT_CONTEXT.timezone).toBe("UTC");
    expect(NEUTRAL_FORMAT_CONTEXT.locale).toBe("en-US");
  });

  it("zonedNow returns a Date and does not throw on a bad zone", () => {
    expect(zonedNow("UTC")).toBeInstanceOf(Date);
    expect(zonedNow("Not/AZone")).toBeInstanceOf(Date);
  });
});
