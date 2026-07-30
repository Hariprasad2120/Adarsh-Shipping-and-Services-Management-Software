import { Prisma } from "@/generated/prisma/client";

export type AccountingDecimalInput = Prisma.Decimal | string | bigint;

export type QuantizeOptions = {
  scale: number;
  allowRounding?: boolean;
  label?: string;
};

export type AllocationOptions = {
  scale: number;
  parts: number;
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

  const text = typeof value === "bigint" ? value.toString() : value;
  if (typeof value === "string" && value !== value.trim()) {
    throw new AccountingMoneyError(
      "INVALID_NUMERIC_INPUT",
      `${label} must not contain leading or trailing whitespace`,
    );
  }
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

export function absolute(value: AccountingDecimalInput): Prisma.Decimal {
  return decimal(value).abs();
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

export function validateCurrencyPrecision(
  value: AccountingDecimalInput,
  decimalPlaces: number,
  label = "amount",
): Prisma.Decimal {
  return quantize(value, {
    scale: decimalPlaces,
    allowRounding: false,
    label,
  });
}

export function convertToBaseCurrency(
  transactionAmount: AccountingDecimalInput,
  exchangeRate: AccountingDecimalInput,
  options: QuantizeOptions,
): Prisma.Decimal {
  const rate = decimal(exchangeRate, "exchangeRate");
  if (!rate.isPositive() || rate.isZero()) {
    throw new AccountingMoneyError(
      "INVALID_NUMERIC_INPUT",
      "exchangeRate must be positive",
    );
  }
  return quantize(multiply(transactionAmount, rate), options);
}

export function allocateEqual(
  total: AccountingDecimalInput,
  options: AllocationOptions,
): Prisma.Decimal[] {
  assertScale(options.scale);
  if (!Number.isSafeInteger(options.parts) || options.parts < 1) {
    throw new AccountingMoneyError(
      "INVALID_NUMERIC_INPUT",
      "Allocation parts must be a positive safe integer",
    );
  }

  const exactTotal = validateCurrencyPrecision(total, options.scale, options.label ?? "allocation total");
  const partCount = new Prisma.Decimal(options.parts);
  const base = exactTotal.div(partCount).toDecimalPlaces(options.scale, Prisma.Decimal.ROUND_DOWN);
  const allocations = Array.from({ length: options.parts }, () => base);
  const unit = new Prisma.Decimal(1).div(new Prisma.Decimal(10).pow(options.scale));
  let remainder = exactTotal.sub(base.mul(partCount));

  for (let index = 0; !remainder.isZero() && index < allocations.length; index += 1) {
    const adjustment = remainder.isPositive() ? unit : unit.neg();
    allocations[index] = allocations[index].add(adjustment);
    remainder = remainder.sub(adjustment);
  }

  if (!remainder.isZero()) {
    throw new AccountingMoneyError(
      "INVALID_NUMERIC_INPUT",
      "Allocation remainder could not be distributed exactly",
    );
  }
  return allocations;
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
  const parsed = decimal(value);
  return parsed.isPositive() && !parsed.isZero();
}

export function isNegative(value: AccountingDecimalInput): boolean {
  return decimal(value).isNegative();
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
