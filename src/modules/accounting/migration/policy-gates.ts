import type {
  AccountingImportContract,
  AccountingImportRecord,
  MigrationIssue,
} from "./types";

const OPENING_POLICY_FIELDS = [
  "migrationEffectiveDate",
  "historicalDepth",
  "openingReceivables",
  "openingPayables",
  "openingBankAndCash",
  "openingAccountBalances",
  "outstandingAllocations",
  "retainedEarningsTreatment",
  "comparativeReporting",
  "settledHistoricalDocuments",
  "taxAndStatutoryHistory",
  "foreignCurrencyBalances",
] as const;

const POLICY_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const CURRENCY_POLICY_RECORD_TYPES = new Set<
  AccountingImportRecord["sourceRecordType"]
>([
  "CURRENCY",
  "EXCHANGE_RATE_REFERENCE",
  "OPENING_BALANCE",
  "SALES_INVOICE",
  "PURCHASE_INVOICE",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
  "RECEIPT",
  "PAYMENT",
  "ALLOCATION",
  "JOURNAL_REFERENCE",
  "RECURRING_TEMPLATE",
  "DEPRECIATION_SOURCE",
  "PARTNER_TRANSACTION",
]);

export function assertAcceptedPolicyReference(
  value: unknown,
  errorCode: string,
): string {
  if (typeof value !== "string") {
    throw new Error(`POLICY_GATED:${errorCode}`);
  }
  const normalized = value.trim();
  if (!POLICY_REFERENCE_PATTERN.test(normalized)) {
    throw new Error(`POLICY_GATED:${errorCode}`);
  }
  return normalized;
}

export function openingHistoryPolicyIssues(
  contract: AccountingImportContract,
  record: AccountingImportRecord,
): MigrationIssue[] {
  if (record.sourceRecordType !== "OPENING_BALANCE") return [];
  const policy = contract.openingHistoryPolicy;
  if (!policy || policy.decisionStatus !== "ACCEPTED") {
    return [
      {
        code: "OPENING_HISTORY_POLICY_REQUIRED",
        classification: "POLICY_GATED",
        safeMessage:
          "Opening balances are blocked until an accepted history policy is supplied.",
        retryable: false,
        manualReview: true,
      },
    ];
  }
  try {
    assertAcceptedPolicyReference(
      policy.decisionReference,
      "OPENING_HISTORY_POLICY_REFERENCE_INVALID",
    );
  } catch {
    return [
      {
        code: "OPENING_HISTORY_POLICY_REFERENCE_INVALID",
        classification: "POLICY_GATED",
        safeMessage:
          "Opening balances are blocked until the accepted history policy has a valid reference.",
        retryable: false,
        manualReview: true,
      },
    ];
  }
  const missing = OPENING_POLICY_FIELDS.filter(
    (field) => !String(policy[field]).trim(),
  );
  return missing.length
    ? [
        {
          code: "OPENING_HISTORY_POLICY_INCOMPLETE",
          classification: "POLICY_GATED",
          safeMessage: `Opening history policy is incomplete: ${missing.join(", ")}.`,
          retryable: false,
          manualReview: true,
        },
      ]
    : [];
}

export function assertPolicySafeRecord(record: AccountingImportRecord) {
  if (record.sourceRecordType === "DEPRECIATION_SOURCE") {
    assertAcceptedPolicyReference(
      record.payload.acceptedPolicyReference,
      "DEPRECIATION_POLICY_REQUIRED",
    );
  }
  if (record.sourceRecordType === "PARTNER_TRANSACTION") {
    assertAcceptedPolicyReference(
      record.payload.acceptedPolicyReference,
      "PARTNER_POLICY_REQUIRED",
    );
  }
  if (
    CURRENCY_POLICY_RECORD_TYPES.has(record.sourceRecordType) &&
    record.payload.currencyCode != null
  ) {
    assertAcceptedPolicyReference(
      record.payload.acceptedCurrencyPolicyReference,
      "CURRENCY_POLICY_REQUIRED",
    );
  }
  if (
    record.sourceRecordType === "EXCHANGE_RATE_REFERENCE" ||
    record.payload.exchangeRate != null ||
    record.payload.exchangeRateReference != null
  ) {
    assertAcceptedPolicyReference(
      record.payload.acceptedExchangeRatePolicyReference,
      "EXCHANGE_RATE_POLICY_REQUIRED",
    );
  }
  if (
    record.payload.taxCode != null ||
    record.payload.taxAmount != null ||
    (Array.isArray(record.payload.taxLines) &&
      record.payload.taxLines.length > 0)
  ) {
    assertAcceptedPolicyReference(
      record.payload.acceptedTaxPolicyReference,
      "TAX_POLICY_REQUIRED",
    );
  }
  if (
    record.sourceRecordType === "ATTACHMENT" ||
    record.attachments.length > 0
  ) {
    assertAcceptedPolicyReference(
      record.payload.acceptedAttachmentPolicyReference,
      "ATTACHMENT_POLICY_REQUIRED",
    );
  }
}
