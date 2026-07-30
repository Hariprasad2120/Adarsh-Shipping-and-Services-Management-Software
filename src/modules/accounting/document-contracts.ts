import { Prisma } from "@/generated/prisma/client";

import {
  add,
  compare,
  decimal,
  isPositive,
  multiply,
  serialize,
  subtract,
  type AccountingDecimalInput,
} from "./money";
import { payloadHash } from "./request-integrity";

export const ACCOUNTING_DOCUMENT_SCHEMA_VERSION = 1;
export const ACCOUNTING_PAYMENT_SCHEMA_VERSION = 1;
export const ACCOUNTING_PAYROLL_PAYMENT_SCHEMA_VERSION = 1;
export const ACCOUNTING_PAYROLL_CORRECTION_SCHEMA_VERSION = 1;

type ContractIdentity = {
  orgId: string;
  legalEntityId: string;
  sourceSystem: string;
  sourceType: string;
  sourceId: string;
  sourceVersion: number;
  makerId: string;
  correlationId: string;
  causationId?: string | null;
};

export type AccountingDocumentLineInput = {
  sourceLineRef?: string | null;
  description: string;
  quantity: AccountingDecimalInput;
  unitAmount: AccountingDecimalInput;
  discountAmount?: AccountingDecimalInput;
  taxCategoryRef?: string | null;
  taxAmount?: AccountingDecimalInput;
  accountId: string;
  dimensions?: Array<{ definitionId: string; dimensionValueId: string }>;
};

export type AccountingDocumentContractInput = ContractIdentity & {
  documentType: string;
  documentDate: Date | string;
  postingDate: Date | string;
  dueDate?: Date | string | null;
  counterpartyType?: "CUSTOMER" | "SUPPLIER" | "EMPLOYEE" | "PARTNER" | null;
  counterpartyId?: string | null;
  transactionCurrencyCode: string;
  baseCurrencyCode: string;
  exchangeRateId?: string | null;
  policyId: string;
  policyVersion: number;
  approvalPolicyId: string;
  approvalPolicyVersion: number;
  numberSeriesId: string;
  roundingPolicyId: string;
  roundingPolicyVersion: number;
  sourceApprovalVersion?: number | null;
  supportingDocumentRefs?: string[];
  lines: AccountingDocumentLineInput[];
};

export type NormalizedAccountingDocumentContract = ReturnType<
  typeof normalizeAccountingDocumentContract
>;

export type AccountingPaymentAllocationInput = {
  targetType?: "ACCOUNTING_DOCUMENT" | "SOURCE_SNAPSHOT";
  targetDocumentId?: string | null;
  targetSourceSnapshotId?: string | null;
  targetVersion: number;
  targetCurrencyCode: string;
  eligibleOpenAmount: AccountingDecimalInput;
  amount: AccountingDecimalInput;
};

export type AccountingPaymentContractInput = ContractIdentity & {
  paymentType:
    | "CUSTOMER_RECEIPT"
    | "VENDOR_PAYMENT"
    | "GENERAL_PAYMENT"
    | "PAYROLL_PAYMENT"
    | "BANK_TRANSFER";
  payerPayeeType: "CUSTOMER" | "SUPPLIER" | "EMPLOYEE" | "OTHER";
  payerPayeeId: string;
  bankOrCashAccountId: string;
  controlAccountId: string;
  transactionDate: Date | string;
  valueDate?: Date | string | null;
  transactionCurrencyCode: string;
  baseCurrencyCode: string;
  exchangeRateId?: string | null;
  amount: AccountingDecimalInput;
  unappliedAmount: AccountingDecimalInput;
  paymentMethod: string;
  externalReference?: string | null;
  policyId: string;
  policyVersion: number;
  supportingDocumentRefs?: string[];
  dimensions?: Array<{ definitionId: string; dimensionValueId: string }>;
  allocations: AccountingPaymentAllocationInput[];
};

function required(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function version(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer`);
  }
  return value;
}

function date(value: Date | string, label: string) {
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} is invalid`);
  return parsed.toISOString();
}

function optionalDate(value: Date | string | null | undefined, label: string) {
  return value == null ? null : date(value, label);
}

function currency(value: string, label: string) {
  const normalized = required(value, label).toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error(`${label} must be a three-letter currency code`);
  }
  return normalized;
}

function sortedDimensions(
  values: Array<{ definitionId: string; dimensionValueId: string }> | undefined,
) {
  const normalized = (values ?? []).map((entry) => ({
    definitionId: required(entry.definitionId, "dimension definition"),
    dimensionValueId: required(entry.dimensionValueId, "dimension value"),
  }));
  const keys = new Set<string>();
  for (const entry of normalized) {
    if (keys.has(entry.definitionId)) {
      throw new Error(`Dimension ${entry.definitionId} is assigned more than once`);
    }
    keys.add(entry.definitionId);
  }
  return normalized.sort((left, right) =>
    `${left.definitionId}:${left.dimensionValueId}`.localeCompare(
      `${right.definitionId}:${right.dimensionValueId}`,
    ),
  );
}

export function normalizeAccountingDocumentContract(input: AccountingDocumentContractInput) {
  if (input.lines.length === 0) throw new Error("At least one document line is required");
  const transactionCurrencyCode = currency(
    input.transactionCurrencyCode,
    "transactionCurrencyCode",
  );
  const baseCurrencyCode = currency(input.baseCurrencyCode, "baseCurrencyCode");
  if (transactionCurrencyCode !== baseCurrencyCode && !input.exchangeRateId) {
    throw new Error("Foreign-currency documents require approved exchange-rate evidence");
  }
  if ((input.counterpartyType == null) !== (input.counterpartyId == null)) {
    throw new Error("Counterparty type and ID must be supplied together");
  }

  const lines = input.lines.map((line, index) => {
    const quantity = decimal(line.quantity, `lines[${index}].quantity`);
    const unitAmount = decimal(line.unitAmount, `lines[${index}].unitAmount`);
    const discountAmount = decimal(
      line.discountAmount ?? "0",
      `lines[${index}].discountAmount`,
    );
    const taxAmount = decimal(line.taxAmount ?? "0", `lines[${index}].taxAmount`);
    if (!isPositive(quantity)) throw new Error(`lines[${index}].quantity must be positive`);
    if (unitAmount.isNegative() || discountAmount.isNegative() || taxAmount.isNegative()) {
      throw new Error(`lines[${index}] amounts cannot be negative`);
    }
    const gross = multiply(quantity, unitAmount);
    if (compare(discountAmount, gross) > 0) {
      throw new Error(`lines[${index}].discountAmount cannot exceed its gross amount`);
    }
    const taxableAmount = subtract(gross, discountAmount);
    const totalAmount = add(taxableAmount, taxAmount);
    if (isPositive(taxAmount) && !line.taxCategoryRef) {
      throw new Error(`lines[${index}] tax requires a configured tax-category reference`);
    }
    return {
      lineNumber: index + 1,
      sourceLineRef: line.sourceLineRef?.trim() || null,
      description: required(line.description, `lines[${index}].description`),
      quantity: serialize(quantity),
      unitAmount: serialize(unitAmount),
      discountAmount: serialize(discountAmount),
      taxableAmount: serialize(taxableAmount),
      taxCategoryRef: line.taxCategoryRef?.trim() || null,
      taxAmount: serialize(taxAmount),
      totalAmount: serialize(totalAmount),
      accountId: required(line.accountId, `lines[${index}].accountId`),
      dimensions: sortedDimensions(line.dimensions),
    };
  });
  const subtotal = add(
    ...lines.map((line) => add(line.taxableAmount, line.discountAmount)),
  );
  const discountAmount = add(...lines.map((line) => line.discountAmount));
  const taxAmount = add(...lines.map((line) => line.taxAmount));
  const totalAmount = add(...lines.map((line) => line.totalAmount));

  const contract = {
    schemaVersion: ACCOUNTING_DOCUMENT_SCHEMA_VERSION,
    orgId: required(input.orgId, "orgId"),
    legalEntityId: required(input.legalEntityId, "legalEntityId"),
    sourceSystem: required(input.sourceSystem, "sourceSystem"),
    sourceType: required(input.sourceType, "sourceType"),
    sourceId: required(input.sourceId, "sourceId"),
    sourceVersion: version(input.sourceVersion, "sourceVersion"),
    documentType: required(input.documentType, "documentType"),
    documentDate: date(input.documentDate, "documentDate"),
    postingDate: date(input.postingDate, "postingDate"),
    dueDate: optionalDate(input.dueDate, "dueDate"),
    counterpartyType: input.counterpartyType ?? null,
    counterpartyId: input.counterpartyId
      ? required(input.counterpartyId, "counterpartyId")
      : null,
    transactionCurrencyCode,
    baseCurrencyCode,
    exchangeRateId: input.exchangeRateId?.trim() || null,
    policyId: required(input.policyId, "policyId"),
    policyVersion: version(input.policyVersion, "policyVersion"),
    approvalPolicyId: required(input.approvalPolicyId, "approvalPolicyId"),
    approvalPolicyVersion: version(
      input.approvalPolicyVersion,
      "approvalPolicyVersion",
    ),
    numberSeriesId: required(input.numberSeriesId, "numberSeriesId"),
    roundingPolicyId: required(input.roundingPolicyId, "roundingPolicyId"),
    roundingPolicyVersion: version(
      input.roundingPolicyVersion,
      "roundingPolicyVersion",
    ),
    sourceApprovalVersion:
      input.sourceApprovalVersion == null
        ? null
        : version(input.sourceApprovalVersion, "sourceApprovalVersion"),
    supportingDocumentRefs: [...new Set(input.supportingDocumentRefs ?? [])].sort(),
    subtotal: serialize(subtotal),
    discountAmount: serialize(discountAmount),
    taxAmount: serialize(taxAmount),
    totalAmount: serialize(totalAmount),
    lines,
    makerId: required(input.makerId, "makerId"),
    correlationId: required(input.correlationId, "correlationId"),
    causationId: input.causationId?.trim() || null,
  };
  return { ...contract, payloadHash: payloadHash(contract) };
}

export function normalizeAccountingPaymentContract(input: AccountingPaymentContractInput) {
  const paymentCurrency = currency(
    input.transactionCurrencyCode,
    "transactionCurrencyCode",
  );
  const baseCurrencyCode = currency(input.baseCurrencyCode, "baseCurrencyCode");
  if (paymentCurrency !== baseCurrencyCode && !input.exchangeRateId) {
    throw new Error("Foreign-currency payments require approved exchange-rate evidence");
  }
  const amount = decimal(input.amount, "amount");
  const unappliedAmount = decimal(input.unappliedAmount, "unappliedAmount");
  if (!isPositive(amount)) throw new Error("Payment amount must be positive");
  if (unappliedAmount.isNegative()) throw new Error("Unapplied amount cannot be negative");

  const targetIds = new Set<string>();
  const allocations = input.allocations.map((allocation, index) => {
    const targetType = allocation.targetType ?? "ACCOUNTING_DOCUMENT";
    const targetDocumentId =
      targetType === "ACCOUNTING_DOCUMENT"
        ? required(
            allocation.targetDocumentId ?? "",
            `allocations[${index}].targetDocumentId`,
          )
        : null;
    const targetSourceSnapshotId =
      targetType === "SOURCE_SNAPSHOT"
        ? required(
            allocation.targetSourceSnapshotId ?? "",
            `allocations[${index}].targetSourceSnapshotId`,
          )
        : null;
    const targetKey = `${targetType}:${targetDocumentId ?? targetSourceSnapshotId}`;
    if (targetIds.has(targetKey)) {
      throw new Error(`Allocation target ${targetKey} is allocated more than once`);
    }
    targetIds.add(targetKey);
    const targetCurrencyCode = currency(
      allocation.targetCurrencyCode,
      `allocations[${index}].targetCurrencyCode`,
    );
    if (targetCurrencyCode !== paymentCurrency) {
      throw new Error("Currency-mismatched allocation requires an explicit configured FX treatment");
    }
    const eligibleOpenAmount = decimal(
      allocation.eligibleOpenAmount,
      `allocations[${index}].eligibleOpenAmount`,
    );
    const allocated = decimal(allocation.amount, `allocations[${index}].amount`);
    if (!isPositive(allocated)) {
      throw new Error(`allocations[${index}].amount must be positive`);
    }
    if (compare(allocated, eligibleOpenAmount) > 0) {
      throw new Error(`allocations[${index}] exceeds the eligible open balance`);
    }
    return {
      targetDocumentId,
      targetSourceSnapshotId,
      targetType,
      targetVersion: version(allocation.targetVersion, "targetVersion"),
      targetCurrencyCode,
      eligibleOpenAmount: serialize(eligibleOpenAmount),
      amount: serialize(allocated),
    };
  });
  const allocatedAmount = add(...allocations.map((allocation) => allocation.amount));
  if (!add(allocatedAmount, unappliedAmount).equals(amount)) {
    throw new Error("Allocations plus unapplied amount must equal the payment amount exactly");
  }

  const contract = {
    schemaVersion: ACCOUNTING_PAYMENT_SCHEMA_VERSION,
    orgId: required(input.orgId, "orgId"),
    legalEntityId: required(input.legalEntityId, "legalEntityId"),
    sourceSystem: required(input.sourceSystem, "sourceSystem"),
    sourceType: required(input.sourceType, "sourceType"),
    sourceId: required(input.sourceId, "sourceId"),
    sourceVersion: version(input.sourceVersion, "sourceVersion"),
    paymentType: input.paymentType,
    payerPayeeType: input.payerPayeeType,
    payerPayeeId: required(input.payerPayeeId, "payerPayeeId"),
    bankOrCashAccountId: required(input.bankOrCashAccountId, "bankOrCashAccountId"),
    controlAccountId: required(input.controlAccountId, "controlAccountId"),
    transactionDate: date(input.transactionDate, "transactionDate"),
    valueDate: optionalDate(input.valueDate, "valueDate"),
    transactionCurrencyCode: paymentCurrency,
    baseCurrencyCode,
    exchangeRateId: input.exchangeRateId?.trim() || null,
    amount: serialize(amount),
    allocatedAmount: serialize(allocatedAmount),
    unappliedAmount: serialize(unappliedAmount),
    paymentMethod: required(input.paymentMethod, "paymentMethod"),
    externalReference: input.externalReference?.trim() || null,
    policyId: required(input.policyId, "policyId"),
    policyVersion: version(input.policyVersion, "policyVersion"),
    supportingDocumentRefs: [...new Set(input.supportingDocumentRefs ?? [])].sort(),
    dimensions: sortedDimensions(input.dimensions),
    allocations,
    makerId: required(input.makerId, "makerId"),
    correlationId: required(input.correlationId, "correlationId"),
    causationId: input.causationId?.trim() || null,
  };
  return { ...contract, payloadHash: payloadHash(contract) };
}

export function payrollPaymentIdentity(input: {
  runId: string;
  runVersion: number;
  instructionId: string;
  instructionVersion: number;
}) {
  return `HRMS:PAYROLL_RUN:${required(input.runId, "runId")}:${version(
    input.runVersion,
    "runVersion",
  )}:PAYMENT:${required(input.instructionId, "instructionId")}:${version(
    input.instructionVersion,
    "instructionVersion",
  )}`;
}

export function normalizePayrollCorrection(input: {
  orgId: string;
  legalEntityId: string;
  originalRunId: string;
  originalRunVersion: number;
  correctionId: string;
  correctionVersion: number;
  approvedById: string;
  approvedAt: Date | string;
  mode: "DELTA" | "REPLACEMENT";
  totalDebit: AccountingDecimalInput;
  totalCredit: AccountingDecimalInput;
  reasonCode: string;
}) {
  const totalDebit = decimal(input.totalDebit, "totalDebit");
  const totalCredit = decimal(input.totalCredit, "totalCredit");
  if (!totalDebit.equals(totalCredit) || !isPositive(totalDebit)) {
    throw new Error("Approved payroll correction totals must be positive and exactly balanced");
  }
  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(input.reasonCode)) {
    throw new Error("Payroll correction reasonCode must be stable and non-sensitive");
  }
  const contract = {
    schemaVersion: ACCOUNTING_PAYROLL_CORRECTION_SCHEMA_VERSION,
    orgId: required(input.orgId, "orgId"),
    legalEntityId: required(input.legalEntityId, "legalEntityId"),
    originalRunId: required(input.originalRunId, "originalRunId"),
    originalRunVersion: version(input.originalRunVersion, "originalRunVersion"),
    correctionId: required(input.correctionId, "correctionId"),
    correctionVersion: version(input.correctionVersion, "correctionVersion"),
    approvedById: required(input.approvedById, "approvedById"),
    approvedAt: date(input.approvedAt, "approvedAt"),
    mode: input.mode,
    totalDebit: serialize(totalDebit),
    totalCredit: serialize(totalCredit),
    reasonCode: input.reasonCode,
  };
  return {
    ...contract,
    idempotencyKey: `HRMS:PAYROLL_CORRECTION:${contract.correctionId}:${contract.correctionVersion}`,
    payloadHash: payloadHash(contract),
  };
}

export function recurringOccurrenceIdentity(input: {
  templateType: string;
  templateId: string;
  templateVersion: number;
  scheduledFor: Date | string;
}) {
  return `ACCOUNTING:${required(input.templateType, "templateType")}:${required(
    input.templateId,
    "templateId",
  )}:V${version(input.templateVersion, "templateVersion")}:${date(
    input.scheduledFor,
    "scheduledFor",
  ).slice(0, 10)}`;
}

export function depreciationRunIdentity(input: {
  assetId: string;
  bookId: string;
  periodId: string;
  runVersion: number;
}) {
  return `AMS:ASSET:${required(input.assetId, "assetId")}:BOOK:${required(
    input.bookId,
    "bookId",
  )}:PERIOD:${required(input.periodId, "periodId")}:RUN:${version(
    input.runVersion,
    "runVersion",
  )}`;
}

export function asDecimalJson(value: AccountingDecimalInput): Prisma.InputJsonValue {
  return serialize(value);
}
