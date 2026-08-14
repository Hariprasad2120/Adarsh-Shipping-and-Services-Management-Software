import { describe, expect, it } from "vitest";

import {
  addDecimalStrings,
  compareDecimalStrings,
  deriveAccountingActionState,
  divideDecimalStrings,
  formatAccountingMoney,
  mapAccountingError,
  minimumDecimalString,
  multiplyDecimalStrings,
  normalizeDecimalString,
  subtractDecimalStrings,
} from "../operational-helpers";

describe("Phase 5 decimal-safe UI helpers", () => {
  it("keeps monetary arithmetic in exact decimal strings", () => {
    expect(addDecimalStrings("0.1", "0.2")).toBe("0.3");
    expect(subtractDecimalStrings("100.0000", "0.0001")).toBe("99.9999");
    expect(multiplyDecimalStrings("12.50", "3", "1.25")).toBe("46.875");
    expect(divideDecimalStrings("1", "3", 4)).toBe("0.3333");
    expect(divideDecimalStrings("2", "3", 4)).toBe("0.6667");
    expect(compareDecimalStrings("10.0000", "10")).toBe(0);
    expect(minimumDecimalString("9.9999", "10")).toBe("9.9999");
  });

  it("rejects exponents, commas, negatives, and excess precision", () => {
    expect(() => normalizeDecimalString("1e3")).toThrow(/plain decimal/i);
    expect(() => normalizeDecimalString("1,000")).toThrow(/plain decimal/i);
    expect(() => normalizeDecimalString("-1")).toThrow(/negative/i);
    expect(() =>
      normalizeDecimalString("1.00001", { maxScale: 4 }),
    ).toThrow(/decimal places/i);
  });

  it("formats exact values without converting to JavaScript Number", () => {
    expect(formatAccountingMoney("123456789012345.1200", "inr", 4)).toBe(
      "INR 12,34,56,78,90,12,345.12",
    );
  });
});

describe("Phase 5 action-state and error policy", () => {
  it("enforces maker-checker separation for pending records", () => {
    expect(
      deriveAccountingActionState({
        status: "PENDING_APPROVAL",
        isMaker: true,
        hasApprovePermission: true,
        hasPostPermission: true,
        hasPreparePermission: true,
        hasReversePermission: true,
      }),
    ).toMatchObject({
      canApprove: false,
      canPost: false,
      canReverse: false,
    });
  });

  it("keeps posted records immutable and exposes only controlled reversal", () => {
    expect(
      deriveAccountingActionState({
        status: "POSTED",
        isMaker: false,
        hasApprovePermission: true,
        hasPostPermission: true,
        hasPreparePermission: true,
        hasReversePermission: true,
      }),
    ).toMatchObject({
      canEdit: false,
      canPost: false,
      canReverse: true,
    });
  });

  it("maps internal failures to stable, non-sensitive messages", () => {
    expect(mapAccountingError(new Error("row version changed or not found"))).toEqual({
      code: "STALE_STATE",
      message:
        "This record changed or was already processed. Refresh and review its current state.",
    });
    expect(
      mapAccountingError(
        new Error("This bank ledger is already mapped to another Banking account."),
      ),
    ).toEqual({
      code: "INVALID_SELECTION",
      message:
        "This bank ledger is already linked to another bank account. Create a new BANK ledger or edit the existing account instead.",
    });
    expect(mapAccountingError(new Error("password=secret database exploded"))).toEqual({
      code: "ACCOUNTING_OPERATION_FAILED",
      message: "The Accounting operation could not be completed safely.",
    });
  });
});
