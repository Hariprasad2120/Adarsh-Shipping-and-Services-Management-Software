import { Prisma } from "@/generated/prisma/client";

export type AccountingDecimalInput = Prisma.Decimal | string | bigint;

export type QuantizeOptions = {
  scale: number;
  allowRounding?: boolean;
  label?: string;
};

const DECIMAL_TEXT = /^[+-]?(?:\d+|\d+\.\d+|\.\d+)$/;

function assertScale(scale: number) {
  if (!Number.isInteger(scale) || scale < 0 || scale > 18) {
    throw new AccountingMoneyError("INVALID_SCALE", `Invalid decimal scale: ${scale}`);
  }
}

export class AccountingMoneyError extends Error {
  constructor(
    public readonly code:
      | "INVALID_NUMERIC_INPUT"
      | "INVALID_SCALE"
      | "EXCESS_PRECISION"
      | "DIVISION_BY_ZERO"
      | "UNBALANCED_ENTRY",
    message: string,
  ) {
    super(message);
    this.name = "AccountingMoneyError";
  }
}

export function decimal(value: AccountingDecimalInput, label = "value"): Prisma.Decimal {
  if (typeof value === "number") {
    throw new AccountingMoneyError(
      "INVALID_NUMERIC_INPUT",
      `${label} must be supplied as a decimal string, bigint, or Prisma Decimal; JavaScript number is not accepted`,
    );
  }

  if (value instanceof Prisma.Decimal) {
    if (!value.isFinite()) {
      throw new AccountingMoneyError("INVALID_NUMERIC_INPUT", `${label} must be finite`);
    }
    return value;
  }

  const text = typeof value === "bigint" ? value.toString() : value.trim();
  if (!DECIMAL_TEXT.test(text)) {
    throw new AccountingMoneyError("INVALID_NUMERIC_INPUT", `${label} is not a valid decimal value`);
  }

  try {
    const parsed = new Prisma.Decimal(text);
    if (!parsed.isFinite()) {
      throw new Error("not finite");
    }
    return parsed;
  } catch {
    throw new AccountingMoneyError("INVALID_NUMERIC_INPUT", `${label} is not a valid decimal value`);
  }
}

export function add(...values: AccountingDecimalInput[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (sum, value, index) => sum.add(decimal(value, `addend[${index}]`)),
    new Prisma.Decimal(0),
  );
}

export function subtract(
  minuend: AccountingDecimalInput,
  subtrahend: AccountingDecimalInput,
): Prisma.Decimal {
  return decimal(minuend, "minuend").sub(decimal(subtrahend, "subtrahend"));
}

export function multiply(
  multiplicand: AccountingDecimalInput,
  multiplier: AccountingDecimalInput,
): Prisma.Decimal {
  return decimal(multiplicand, "multiplicand").mul(decimal(multiplier, "multiplier"));
}

export function divide(
  dividend: AccountingDecimalInput,
  divisor: AccountingDecimalInput,
  options: QuantizeOptions,
): Prisma.Decimal {
  const denominator = decimal(divisor, "divisor");
  if (denominator.isZero()) {
    throw new AccountingMoneyError("DIVISION_BY_ZERO", "Cannot divide an accounting value by zero");
  }
  return quantize(decimal(dividend, "dividend").div(denominator), {
    ...options,
    allowRounding: options.allowRounding ?? true,
  });
}

export function compare(left: AccountingDecimalInput, right: AccountingDecimalInput): -1 | 0 | 1 {
  return decimal(left, "left").cmp(decimal(right, "right")) as -1 | 0 | 1;
}

export function quantize(value: AccountingDecimalInput, options: QuantizeOptions): Prisma.Decimal {
  assertScale(options.scale);
  const parsed = decimal(value, options.label);
  if (parsed.decimalPlaces() > options.scale && !options.allowRounding) {
    throw new AccountingMoneyError(
      "EXCESS_PRECISION",
      `${options.label ?? "value"} has more than ${options.scale} decimal places`,
    );
  }
  return parsed.toDecimalPlaces(options.scale, Prisma.Decimal.ROUND_HALF_UP);
}

export function serialize(value: AccountingDecimalInput, scale?: number): string {
  const parsed = decimal(value);
  if (scale == null) {
    return parsed.toFixed(parsed.decimalPlaces());
  }
  assertScale(scale);
  return parsed.toFixed(scale);
}

export function isZero(value: AccountingDecimalInput): boolean {
  return decimal(value).isZero();
}

export function isPositive(value: AccountingDecimalInput): boolean {
  return decimal(value).isPositive() && !decimal(value).isZero();
}

export type BalancedLine = {
  debit: AccountingDecimalInput;
  credit: AccountingDecimalInput;
};

export function debitCreditTotals(lines: BalancedLine[]) {
  const debit = add(...lines.map((line) => line.debit));
  const credit = add(...lines.map((line) => line.credit));
  return { debit, credit };
}

export function assertBalanced(lines: BalancedLine[]) {
  if (lines.length < 2) {
    throw new AccountingMoneyError("UNBALANCED_ENTRY", "A journal requires at least two lines");
  }

  for (const [index, line] of lines.entries()) {
    const debit = decimal(line.debit, `lines[${index}].debit`);
    const credit = decimal(line.credit, `lines[${index}].credit`);
    if (debit.isNegative() || credit.isNegative()) {
      throw new AccountingMoneyError("INVALID_NUMERIC_INPUT", "Journal line values cannot be negative");
    }
    if (debit.isZero() === credit.isZero()) {
      throw new AccountingMoneyError(
        "UNBALANCED_ENTRY",
        "Each journal line must contain exactly one positive debit or credit",
      );
    }
  }

  const totals = debitCreditTotals(lines);
  if (!totals.debit.eq(totals.credit)) {
    throw new AccountingMoneyError(
      "UNBALANCED_ENTRY",
      `Journal is unbalanced: debit ${serialize(totals.debit)} does not equal credit ${serialize(totals.credit)}`,
    );
  }
  return totals;
}

