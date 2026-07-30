export const ACCOUNTING_IMPORT_CONTRACT_VERSION = "accounting-import/v1" as const;

export const ACCOUNTING_MIGRATION_RECORD_TYPES = [
  "LEGAL_ENTITY",
  "ORGANIZATION",
  "ACCOUNTING_PERIOD",
  "ACCOUNT",
  "CUSTOMER",
  "SUPPLIER",
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
  "ATTACHMENT",
] as const;

export type AccountingMigrationRecordType =
  (typeof ACCOUNTING_MIGRATION_RECORD_TYPES)[number];

export const ACCOUNTING_MAPPING_TYPES = [
  "ORGANIZATION",
  "LEGAL_ENTITY",
  "ACCOUNT",
  "COUNTERPARTY",
  "DOCUMENT_TYPE",
  "DOCUMENT_STATE",
  "CURRENCY",
  "NUMBER_SERIES",
  "TAX_CODE",
  "PAYMENT_METHOD",
  "AUDIT_ACTOR",
  "LINEAGE",
] as const;

export type AccountingMappingType = (typeof ACCOUNTING_MAPPING_TYPES)[number];

export type AccountingImportAttachment = {
  sourceIdentifier: string;
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

export type AccountingImportRecord = {
  sourceSystem: string;
  sourceRecordType: AccountingMigrationRecordType;
  sourceIdentifier: string;
  sourceVersion?: string;
  targetOrganizationRef: string;
  targetLegalEntityRef: string;
  importBatch: string;
  dependencies: string[];
  payload: Record<string, unknown>;
  attachments: AccountingImportAttachment[];
};

export type OpeningHistoryPolicy = {
  decisionStatus: "ACCEPTED";
  decisionReference: string;
  migrationEffectiveDate: string;
  historicalDepth: string;
  openingReceivables: string;
  openingPayables: string;
  openingBankAndCash: string;
  openingAccountBalances: string;
  outstandingAllocations: string;
  retainedEarningsTreatment: string;
  comparativeReporting: string;
  settledHistoricalDocuments: string;
  taxAndStatutoryHistory: string;
  foreignCurrencyBalances: string;
};

export type AccountingImportContract = {
  schemaVersion: typeof ACCOUNTING_IMPORT_CONTRACT_VERSION;
  sourceSystem: string;
  sourceBatchIdentifier: string;
  extractedAt: string;
  targetOrganizationRef: string;
  records: AccountingImportRecord[];
  openingHistoryPolicy?: OpeningHistoryPolicy;
};

export type AccountingMapping = {
  sourceSystem: string;
  targetOrganizationId: string;
  targetLegalEntityId?: string;
  mappingType: AccountingMappingType;
  sourceValue: string;
  targetType: string;
  targetId: string;
  version: number;
  status: "APPROVED" | "DISABLED";
  decisionReference: string;
};

export type MigrationErrorClassification =
  | "STRUCTURAL_VALIDATION"
  | "MISSING_MAPPING"
  | "AMBIGUOUS_MAPPING"
  | "MISSING_DEPENDENCY"
  | "DEPENDENCY_CYCLE"
  | "POLICY_GATED"
  | "SCOPE_VIOLATION"
  | "DUPLICATE_SOURCE"
  | "DOMAIN_VALIDATION"
  | "CLOSED_PERIOD"
  | "UNSUPPORTED_CURRENCY"
  | "POSTING_FAILURE"
  | "ALLOCATION_FAILURE"
  | "ATTACHMENT_FAILURE"
  | "RECONCILIATION_MISMATCH"
  | "IDEMPOTENCY_CONFLICT"
  | "PRODUCTION_BLOCKED"
  | "PROVIDER_DISABLED"
  | "INTERNAL";

export type MigrationIssue = {
  code: string;
  classification: MigrationErrorClassification;
  safeMessage: string;
  recordKey?: string;
  retryable: boolean;
  manualReview: boolean;
};

export type NormalizedMigrationRecord = AccountingImportRecord & {
  deterministicKey: string;
  normalizedSourceVersion: string;
  mappedOrganizationId: string;
  mappedLegalEntityId: string;
  resolvedMappings: Partial<Record<AccountingMappingType, string>>;
};

export type MigrationRecordOutcome = {
  deterministicKey: string;
  sourceRecordType: AccountingMigrationRecordType;
  status: "READY" | "SUCCEEDED" | "SKIPPED" | "FAILED" | "BLOCKED";
  canonicalTargetIdentifier?: string;
  validationStatus: "VALID" | "INVALID" | "BLOCKED";
  reconciliationStatus: "PENDING" | "MATCHED" | "MISMATCH" | "NOT_APPLICABLE";
  migratedAt?: string;
  issue?: MigrationIssue;
};

export type MigrationExecutionMode = "DRY_RUN" | "EXECUTE";

export type MigrationPipelineResult = {
  contractVersion: string;
  batchIdentifier: string;
  mode: MigrationExecutionMode;
  status: "DRY_RUN_READY" | "COMPLETED" | "FAILED" | "BLOCKED";
  correlationId: string;
  orderedRecordKeys: string[];
  outcomes: MigrationRecordOutcome[];
  issues: MigrationIssue[];
  reconciliation: AccountingMigrationReconciliation;
  certification?: {
    certifiedAt: string;
    manifestHash: string;
    outcomeHash: string;
    complete: boolean;
  };
};

export type CurrencyReconciliation = {
  organizationId: string;
  legalEntityId: string;
  currencyCode: string;
  sourceDocumentTotal: string;
  targetDocumentTotal: string;
  sourceReceiptPaymentTotal: string;
  targetReceiptPaymentTotal: string;
  allocatedTotal: string;
  unallocatedTotal: string;
  debitTotal: string;
  creditTotal: string;
};

export type ScopedTotalMeasure =
  | "documentTotal"
  | "receiptPaymentTotal"
  | "allocatedTotal"
  | "unallocatedTotal"
  | "debitTotal"
  | "creditTotal";

export type ScopedTotalReconciliation = {
  organizationId: string;
  legalEntityId: string;
  sourceRecordType: AccountingMigrationRecordType;
  currencyCode: string;
  measure: ScopedTotalMeasure;
  sourceTotal: string | null;
  targetTotal: string | null;
  status: "MATCHED" | "MISMATCH" | "NOT_EVALUATED";
  mismatchCodes: string[];
};

export type AccountingMigrationReconciliation = {
  sourceRecordCount: number;
  importedRecordCount: number;
  skippedRecordCount: number;
  failedRecordCount: number;
  blockedRecordCount: number;
  duplicateSourceIdentifiers: string[];
  missingMappings: number;
  orphanAllocations: number;
  lineageComplete: boolean;
  journalBalanced: boolean;
  totalsComplete: boolean;
  totalsMatch: boolean;
  totalMismatchCount: number;
  outboxItemsCreated: number;
  unresolvedManualReviewItems: number;
  currencies: CurrencyReconciliation[];
  scopedTotals: ScopedTotalReconciliation[];
};

export type CanonicalMigrationExecutor = {
  execute(record: NormalizedMigrationRecord): Promise<{
    canonicalTargetIdentifier: string;
    currencyCode?: string;
    documentTotal?: string;
    receiptPaymentTotal?: string;
    allocatedTotal?: string;
    unallocatedTotal?: string;
    debitTotal?: string;
    creditTotal?: string;
    outboxItemsCreated?: number;
  }>;
};
