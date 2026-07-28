import { describe, expect, it } from "vitest";
import {
  generateLeadKey,
  parseJustdialEnquiryDate,
} from "../crm-lead-conversion.service";

describe("Justdial enquiry dates", () => {
  it("parses Justdial's yearless date using the current year", () => {
    const parsed = parseJustdialEnquiryDate(
      "27 Jul, 09:23 AM",
      new Date("2026-07-27T12:00:00+05:30"),
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(6);
    expect(parsed?.getDate()).toBe(27);
    expect(parsed?.getHours()).toBe(9);
    expect(parsed?.getMinutes()).toBe(23);
  });

  it("uses the previous year for a future-looking December date in January", () => {
    const parsed = parseJustdialEnquiryDate(
      "31 Dec, 11:45 PM",
      new Date("2026-01-01T10:00:00+05:30"),
    );

    expect(parsed?.getFullYear()).toBe(2025);
  });

  it("accepts ISO timestamps and rejects unrecognized text", () => {
    expect(
      parseJustdialEnquiryDate("2026-07-27T04:00:00.000Z")?.toISOString(),
    ).toBe("2026-07-27T04:00:00.000Z");
    expect(parseJustdialEnquiryDate("not a date")).toBeNull();
  });

  it("uses the corrected calendar date in duplicate keys", () => {
    expect(
      generateLeadKey(
        "+91 98765 43210",
        "Example",
        "Cargo",
        "27 Jul, 09:23 AM",
      ),
    ).toContain("_2026-07-27");
  });
});
