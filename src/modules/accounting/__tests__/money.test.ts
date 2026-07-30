import { describe, expect, it } from "vitest";

import {
  AccountingMoneyError,
  add,
  assertBalanced,
  compare,
  decimal,
  divide,
  isZero,
  multiply,
  quantize,
  serialize,
  subtract,
} from "../money";

describe("Accounting decimal contract", () => {
  it("adds 0.1 and 0.2 exactly", () => {
    expect(serialize(add("0.1", "0.2"))).toBe("0.3");
  });

  it("preserves large values without binary floating point", () => {
    expect(serialize(add("999999999999999999.9999", "0.0001"))).toBe("1000000000000000000");
  });

  it("supports negative values and exact comparison", () => {
    expect(serialize(subtract("1", "2.5"))).toBe("-1.5");
    expect(compare("-1.5", "-1.50")).toBe(0);
  });

  it("recognizes exact zero", () => {
    expect(isZero("0.000000")).toBe(true);
    expect(isZero("0.000001")).toBe(false);
  });

  it("rejects excess precision unless policy explicitly allows rounding", () => {
    expect(() => quantize("1.005", { scale: 2, allowRounding: false })).toThrowError(
      expect.objectContaining({ code: "EXCESS_PRECISION" }),
    );
    expect(serialize(quantize("1.005", { scale: 2, allowRounding: true }), 2)).toBe("1.01");
  });

  it("quantizes repeating division under an explicit rule", () => {
    expect(serialize(divide("1", "3", { scale: 6 }), 6)).toBe("0.333333");
  });

  it("converts an exchange rate using decimal multiplication", () => {
    expect(serialize(quantize(multiply("12.34", "83.5000000000"), { scale: 2, allowRounding: true }), 2)).toBe(
      "1030.39",
    );
  });

  it("does not hide cumulative line rounding imbalance", () => {
    expect(() =>
      assertBalanced([
        { debit: "0.33", credit: "0" },
        { debit: "0.33", credit: "0" },
        { debit: "0.33", credit: "0" },
        { debit: "0", credit: "1.00" },
      ]),
    ).toThrowError(expect.objectContaining({ code: "UNBALANCED_ENTRY" }));
  });

  it("requires exact debit and credit equality", () => {
    const totals = assertBalanced([
      { debit: "1000000000000.0001", credit: "0" },
      { debit: "0", credit: "1000000000000.0001" },
    ]);
    expect(totals.debit.eq(totals.credit)).toBe(true);
  });

  it("rejects invalid input and JavaScript number input", () => {
    expect(() => decimal("NaN")).toThrow(AccountingMoneyError);
    expect(() => decimal("1e3")).toThrow(AccountingMoneyError);
    expect(() => decimal(0.1 as never)).toThrowError(
      expect.objectContaining({ code: "INVALID_NUMERIC_INPUT" }),
    );
  });

  it("serializes deterministic decimal strings", () => {
    expect(serialize(decimal("0012.3400"))).toBe("12.34");
    expect(serialize(decimal("12.34"), 4)).toBe("12.3400");
  });
});

