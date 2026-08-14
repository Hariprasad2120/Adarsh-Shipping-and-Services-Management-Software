const DECIMAL_INPUT = /^[+-]?(?:\d+|\d*\.\d+)$/;

type DecimalParts = {
  coefficient: bigint;
  scale: number;
};

function decimalParts(value: string): DecimalParts {
  const normalized = normalizeDecimalString(value, {
    allowNegative: true,
    maxScale: 18,
  });
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart, fractionPart = ""] = unsigned.split(".");
  const coefficient = BigInt(`${integerPart}${fractionPart}` || "0");
  return {
    coefficient: negative ? -coefficient : coefficient,
    scale: fractionPart.length,
  };
}

function powerOfTen(scale: number) {
  return BigInt(`1${"0".repeat(scale)}`);
}

function decimalFromParts(parts: DecimalParts) {
  const negative = parts.coefficient < BigInt(0);
  const digits = (negative ? -parts.coefficient : parts.coefficient)
    .toString()
    .padStart(parts.scale + 1, "0");
  if (parts.scale === 0) return `${negative ? "-" : ""}${digits}`;
  const integerPart = digits.slice(0, -parts.scale);
  const fractionPart = digits.slice(-parts.scale).replace(/0+$/, "");
  return `${negative ? "-" : ""}${integerPart}${
    fractionPart ? `.${fractionPart}` : ""
  }`;
}

function alignDecimalParts(left: DecimalParts, right: DecimalParts) {
  const scale = Math.max(left.scale, right.scale);
  return {
    left: left.coefficient * powerOfTen(scale - left.scale),
    right: right.coefficient * powerOfTen(scale - right.scale),
    scale,
  };
}

export type AccountingActionState = {
  canApprove: boolean;
  canCancel: boolean;
  canEdit: boolean;
  canPost: boolean;
  canReverse: boolean;
  reason: string | null;
};

export function normalizeDecimalString(
  value: string,
  options: { allowNegative?: boolean; maxScale?: number } = {},
) {
  const normalized = value.trim();
  if (!DECIMAL_INPUT.test(normalized)) {
    throw new Error("Enter a plain decimal value without commas or exponents.");
  }
  if (!options.allowNegative && normalized.startsWith("-")) {
    throw new Error("Negative values are not allowed.");
  }
  const [integerPart = "0", fractionPart = ""] = normalized.split(".");
  const maxScale = options.maxScale ?? 8;
  if (fractionPart.length > maxScale) {
    throw new Error(`Enter no more than ${maxScale} decimal places.`);
  }
  const unsignedInteger = integerPart.replace(/^[+-]/, "").replace(/^0+(?=\d)/, "");
  const sign = normalized.startsWith("-") ? "-" : "";
  return `${sign}${unsignedInteger || "0"}${fractionPart ? `.${fractionPart}` : ""}`;
}

export function formatDecimalString(
  value: string,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {},
) {
  const normalized = normalizeDecimalString(value, {
    allowNegative: true,
    maxScale: 18,
  });
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart, rawFraction = ""] = unsigned.split(".");
  const maximumFractionDigits = options.maximumFractionDigits ?? 8;
  const minimumFractionDigits = Math.min(
    options.minimumFractionDigits ?? 2,
    maximumFractionDigits,
  );
  const fraction = rawFraction
    .slice(0, maximumFractionDigits)
    .replace(/0+$/, "")
    .padEnd(minimumFractionDigits, "0");
  const grouped = integerPart.replace(/\B(?=(\d\d)+(\d)(?!\d))/g, ",");
  return `${negative ? "−" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function formatAccountingMoney(
  amount: string,
  currencyCode: string,
  maximumFractionDigits = 8,
) {
  return `${currencyCode.toUpperCase()} ${formatDecimalString(amount, {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  })}`;
}

export function addDecimalStrings(...values: string[]) {
  if (values.length === 0) return "0";
  return values.reduce((sum, value) => {
    const aligned = alignDecimalParts(decimalParts(sum), decimalParts(value));
    return decimalFromParts({
      coefficient: aligned.left + aligned.right,
      scale: aligned.scale,
    });
  }, "0");
}

export function subtractDecimalStrings(left: string, right: string) {
  const aligned = alignDecimalParts(decimalParts(left), decimalParts(right));
  return decimalFromParts({
    coefficient: aligned.left - aligned.right,
    scale: aligned.scale,
  });
}

export function multiplyDecimalStrings(...values: string[]) {
  if (values.length === 0) return "0";
  return values.reduce((product, value) => {
    const leftParts = decimalParts(product);
    const rightParts = decimalParts(value);
    return decimalFromParts({
      coefficient: leftParts.coefficient * rightParts.coefficient,
      scale: leftParts.scale + rightParts.scale,
    });
  }, "1");
}

export function divideDecimalStrings(
  dividend: string,
  divisor: string,
  scale = 8,
) {
  if (!Number.isSafeInteger(scale) || scale < 0 || scale > 18) {
    throw new Error("Decimal scale must be between 0 and 18.");
  }
  const numerator = decimalParts(dividend);
  const denominator = decimalParts(divisor);
  if (denominator.coefficient === BigInt(0)) {
    throw new Error("Cannot divide by zero.");
  }
  const scaledNumerator =
    numerator.coefficient * powerOfTen(scale + denominator.scale);
  const scaledDenominator =
    denominator.coefficient * powerOfTen(numerator.scale);
  let quotient = scaledNumerator / scaledDenominator;
  const remainder = scaledNumerator % scaledDenominator;
  const absoluteRemainder = remainder < BigInt(0) ? -remainder : remainder;
  const absoluteDenominator =
    scaledDenominator < BigInt(0) ? -scaledDenominator : scaledDenominator;
  if (absoluteRemainder * BigInt(2) >= absoluteDenominator) {
    const isNegative =
      (scaledNumerator < BigInt(0)) !== (scaledDenominator < BigInt(0));
    quotient += isNegative ? -BigInt(1) : BigInt(1);
  }
  return decimalFromParts({ coefficient: quotient, scale });
}

export function compareDecimalStrings(left: string, right: string): -1 | 0 | 1 {
  const aligned = alignDecimalParts(decimalParts(left), decimalParts(right));
  if (aligned.left < aligned.right) return -1;
  if (aligned.left > aligned.right) return 1;
  return 0;
}

export function minimumDecimalString(left: string, right: string) {
  return compareDecimalStrings(left, right) <= 0 ? left : right;
}

export function deriveAccountingActionState(input: {
  status: string;
  isMaker: boolean;
  hasApprovePermission: boolean;
  hasPostPermission: boolean;
  hasPreparePermission: boolean;
  hasReversePermission: boolean;
}) : AccountingActionState {
  const status = input.status.toUpperCase();
  if (status === "POSTED") {
    return {
      canApprove: false,
      canCancel: false,
      canEdit: false,
      canPost: false,
      canReverse: input.hasReversePermission,
      reason: input.hasReversePermission
        ? null
        : "Posted records are immutable and require reversal permission.",
    };
  }
  if (status === "PENDING_APPROVAL" || status === "SUBMITTED") {
    const canApprove =
      !input.isMaker && input.hasApprovePermission && input.hasPostPermission;
    return {
      canApprove,
      canCancel: false,
      canEdit: false,
      canPost: canApprove,
      canReverse: false,
      reason: input.isMaker
        ? "Maker-checker separation prevents self-approval."
        : canApprove
          ? null
          : "Approval and posting permissions are required.",
    };
  }
  if (["REJECTED", "CANCELLED", "REVERSED"].includes(status)) {
    return {
      canApprove: false,
      canCancel: false,
      canEdit: false,
      canPost: false,
      canReverse: false,
      reason: "This version is terminal. Prepare a new version or correction.",
    };
  }
  return {
    canApprove: false,
    canCancel: input.hasPreparePermission,
    canEdit: input.hasPreparePermission,
    canPost: false,
    canReverse: false,
    reason: input.hasPreparePermission ? null : "Preparation permission is required.",
  };
}

export type SafeAccountingError = {
  code: string;
  message: string;
};

export function mapAccountingError(error: unknown): SafeAccountingError {
  const message = error instanceof Error ? error.message : "";
  const mappings: Array<[RegExp, SafeAccountingError]> = [
    [/plain decimal|decimal places|invalid numeric|excess precision/i, {
      code: "INVALID_DECIMAL",
      message: "Enter monetary values as plain decimals within the permitted precision.",
    }],
    [/invoice dates|bill dates|posting date is invalid|due date/i, {
      code: "INVALID_DATE",
      message: "Review the posting and due dates before trying again.",
    }],
    [/selected .* not available|active posting account|distinct active posting accounts/i, {
      code: "INVALID_SELECTION",
      message: "A selected party, branch, or posting account is no longer eligible. Refresh and select again.",
    }],
    [/already mapped to another Banking account|already linked to a bank account/i, {
      code: "INVALID_SELECTION",
      message:
        "This bank ledger is already linked to another bank account. Create a new BANK ledger or edit the existing account instead.",
    }],
    [/must be positive|cannot be negative|greater than zero|unbalanced|debit and credit|exactly one positive|at least one invoice line/i, {
      code: "VALIDATION_ERROR",
      message: "Review the required amounts and ensure the Accounting entry is valid and balanced.",
    }],
    [/maker cannot approve|self.approval/i, {
      code: "SELF_APPROVAL_FORBIDDEN",
      message: "You cannot approve a record that you prepared.",
    }],
    [/not found|already processed|eligible .* not found/i, {
      code: "STALE_STATE",
      message: "This record changed or was already processed. Refresh and review its current state.",
    }],
    [/configuration_required|configuration.*incomplete/i, {
      code: "CONFIGURATION_REQUIRED",
      message: "Required Accounting configuration is incomplete.",
    }],
    [/CONFIGURATION_BANK_LEDGER_ACCOUNT_INVALID|CONFIGURATION_LEGAL_ENTITY_NOT_FOUND/i, {
      code: "CONFIGURATION_REQUIRED",
      message:
        "The selected BANK ledger is missing required Accounting legal-entity setup. Refresh and try again after saving the ledger.",
    }],
    [/CONFIGURATION_BANK_ACCOUNT_NAME_REQUIRED|CONFIGURATION_BANK_NAME_REQUIRED|CONFIGURATION_BANK_ACCOUNT_MASK_REQUIRED/i, {
      code: "VALIDATION_ERROR",
      message:
        "Complete the required bank-account fields, including internal name, institution name, and masked account identifier.",
    }],
    [/policy_gated|policy.*not approved/i, {
      code: "POLICY_GATED",
      message: "This operation is blocked until its Accounting policy is approved.",
    }],
    [/ACCOUNTING_PERMISSION_REQUIRED/i, {
      code: "FORBIDDEN",
      message: "You do not have permission to perform this Accounting action.",
    }],
    [/APPROVER_INVALID/i, {
      code: "FORBIDDEN",
      message: "The selected approver is not eligible to approve this Accounting record.",
    }],
    [/permission|forbidden|unauthor/i, {
      code: "FORBIDDEN",
      message: "You do not have permission to perform this Accounting action.",
    }],
    [/allocation|outstanding|capacity/i, {
      code: "ALLOCATION_CONFLICT",
      message: "The eligible balance changed or the allocation is no longer valid. Refresh before retrying.",
    }],
    [/period.*lock|closed period/i, {
      code: "PERIOD_LOCKED",
      message: "The selected Accounting period is locked.",
    }],
    [/idempotency|different payload|duplicate/i, {
      code: "IDEMPOTENCY_CONFLICT",
      message: "A request with this reference already exists with different details.",
    }],
  ];
  return (
    mappings.find(([pattern]) => pattern.test(message))?.[1] ?? {
      code: "ACCOUNTING_OPERATION_FAILED",
      message: "The Accounting operation could not be completed safely.",
    }
  );
}
