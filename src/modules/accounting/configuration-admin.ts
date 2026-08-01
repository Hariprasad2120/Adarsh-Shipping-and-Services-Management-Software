/* eslint-disable @typescript-eslint/no-explicit-any */

import { createHash } from "node:crypto";

import { db as prismaDb } from "@/lib/db";

const db: any = prismaDb;

const ACCOUNTING_ENTITY_TYPES = [
  "SOLE_PROPRIETORSHIP",
  "PARTNERSHIP",
  "LLP",
  "PRIVATE_LIMITED",
  "PUBLIC_LIMITED",
] as const;

const ACCOUNTING_INVENTORY_MODES = [
  "DISABLED",
  "SERVICE_ONLY",
  "INVENTORY_ONLY",
  "MIXED",
] as const;

const ACCOUNTING_LEGAL_ENTITY_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
] as const;

const ACCOUNTING_REGISTRATION_TYPES = ["GST"] as const;
const ACCOUNTING_DIMENSION_VALUE_SOURCES = [
  "MANUAL",
  "CHA_JOB",
  "CUSTOMER",
  "VENDOR",
  "BRANCH",
  "DEPARTMENT",
  "EMPLOYEE",
  "ASSET",
  "PARTNER",
] as const;
const ACCOUNTING_APPROVAL_DOCUMENT_TYPES = [
  "SALES_INVOICE",
  "PURCHASE_INVOICE",
  "CUSTOMER_RECEIPT",
  "VENDOR_PAYMENT",
  "PAYROLL_PAYMENT",
  "JOURNAL_ENTRY",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
] as const;
const ACCOUNTING_COUNTERPARTY_TYPES = ["CUSTOMER", "SUPPLIER"] as const;
const ACCOUNTING_DOCUMENT_POLICY_TYPES = [
  "SALES_INVOICE",
  "PURCHASE_INVOICE",
  "CUSTOMER_RECEIPT",
  "VENDOR_PAYMENT",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
  "PAYROLL_PAYMENT",
  "JOURNAL_ENTRY",
] as const;
const ACCOUNTING_TAX_RULE_DOCUMENT_TYPES = [
  "SALES_INVOICE",
  "PURCHASE_INVOICE",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
  "CUSTOMER_RECEIPT",
  "VENDOR_PAYMENT",
  "JOURNAL_ENTRY",
] as const;
const ACCOUNTING_TAX_RULE_PLACE_OF_SUPPLY_TYPES = [
  "INTRA_STATE",
  "INTER_STATE",
  "IMPORT",
  "EXPORT",
  "SEZ",
  "DEEMED_EXPORT",
] as const;
const ACCOUNTING_TAX_RULE_COUNTERPARTY_TREATMENTS = [
  "REGISTERED_BUSINESS",
  "UNREGISTERED_BUSINESS",
  "CONSUMER",
  "EXPORT_CUSTOMER",
  "GOVERNMENT",
  "EMPLOYEE",
] as const;
const ACCOUNTING_TAX_RULE_SUPPLY_CATEGORIES = [
  "SERVICE",
  "GOODS",
  "MIXED",
  "EXEMPT",
  "ZERO_RATED",
  "REVERSE_CHARGE",
] as const;
const ACCOUNTING_TAX_COMPONENT_TYPES = [
  "CGST",
  "SGST",
  "IGST",
  "CESS",
  "TDS",
  "TCS",
  "WITHHOLDING",
] as const;
const ACCOUNTING_STATUTORY_RETURN_TYPES = [
  "GSTR1",
  "GSTR2B",
  "GST_LEDGER",
  "E_INVOICE",
  "E_WAY_BILL",
] as const;
const ACCOUNTING_STATUTORY_FILING_FREQUENCIES = [
  "MONTHLY",
  "QUARTERLY",
  "ANNUAL",
  "ON_DEMAND",
] as const;
const ACCOUNTING_STATUTORY_FILING_STATUSES = [
  "OPEN",
  "READY",
  "FILED",
  "SUPERSEDED",
] as const;
const ACCOUNTING_BANK_STATEMENT_IMPORT_STATUSES = [
  "PENDING_REVIEW",
  "VERIFIED",
  "REJECTED",
] as const;
const ACCOUNTING_RECONCILIATION_SESSION_STATUSES = [
  "OPEN",
  "BALANCED",
  "EXCEPTION",
] as const;
const ACCOUNTING_BANK_RECONCILIATION_LINE_STATUSES = [
  "UNMATCHED",
  "PARTIAL_MATCHED",
  "FULL_MATCHED",
  "EXCEPTION",
] as const;
const ACCOUNTING_BANK_MATCH_TARGET_TYPES = [
  "DOCUMENT",
  "JOURNAL_ENTRY",
] as const;
const ACCOUNTING_RECURRING_SOURCE_TYPES = [
  "RECURRING_EXPENSE",
  "RECURRING_JOURNAL",
  "CANONICAL_TEMPLATE",
] as const;
const ACCOUNTING_RECURRING_DOCUMENT_TYPES = [
  "PURCHASE_INVOICE",
  "JOURNAL_ENTRY",
  "VENDOR_PAYMENT",
] as const;
const ACCOUNTING_RECURRING_SCHEDULE_MODES = [
  "FIXED",
  "RELATIVE",
  "CALENDAR",
] as const;
const ACCOUNTING_RECURRING_CADENCES = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUAL",
] as const;
const ACCOUNTING_RECURRING_CATCH_UP_MODES = [
  "SKIP",
  "CATCH_UP",
  "MANUAL_ONLY",
] as const;
const ACCOUNTING_RECURRING_RUN_STATUSES = [
  "PENDING",
  "GENERATED",
  "SKIPPED",
  "FAILED",
  "MANUAL_REVIEW",
] as const;
const ACCOUNTING_FINANCIAL_ASSET_STATUSES = [
  "ACTIVE",
  "FULLY_DEPRECIATED",
  "DISPOSED",
  "SCRAPPED",
] as const;
const ACCOUNTING_ASSET_BOOK_TYPES = [
  "COMPANIES_ACT",
  "INCOME_TAX",
  "MANAGEMENT",
] as const;
const ACCOUNTING_ASSET_DEPRECIATION_METHODS = [
  "STRAIGHT_LINE",
  "WRITTEN_DOWN_VALUE",
] as const;
const ACCOUNTING_DEPRECIATION_RUN_STATUSES = [
  "PENDING",
  "POSTED",
  "SKIPPED",
  "FAILED",
  "MANUAL_REVIEW",
] as const;
const ACCOUNTING_PARTNER_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "RETIRED",
] as const;
const ACCOUNTING_APPROPRIATION_TYPES = [
  "CAPITAL_INTRODUCED",
  "DRAWINGS",
  "SALARY",
  "INTEREST_ON_CAPITAL",
  "INTEREST_ON_DRAWINGS",
  "PROFIT_SHARE",
] as const;
const ACCOUNTING_APPROPRIATION_STATUSES = [
  "DRAFT",
  "APPROVED",
  "POSTED",
  "REVERSED",
] as const;
const ACCOUNTING_BUDGET_SCENARIO_CODES = [
  "BASE",
  "STRETCH",
  "REFORECAST",
  "ROLLING_FORECAST",
  "BOARD_APPROVED",
] as const;
const ACCOUNTING_BUDGET_PERIOD_GRANULARITIES = [
  "MONTHLY",
  "QUARTERLY",
  "ANNUAL",
] as const;
const ACCOUNTING_CUSTOMER_STATEMENT_DELIVERY_MODES = [
  "EMAIL",
  "PORTAL",
  "MANUAL",
] as const;
const ACCOUNTING_SOURCE_TARGET_MODULES = [
  "CRM",
  "HRMS",
  "CHA",
  "AMS",
  "BANKING",
] as const;
const ACCOUNTING_PERIOD_CLOSE_RUN_STATUSES = [
  "OPEN",
  "READY",
  "CLOSED",
  "REOPENED",
] as const;
const ACCOUNTING_REPORT_EXPORT_FORMATS = [
  "CSV",
  "XLSX",
  "PDF",
  "JSON",
] as const;
const ACCOUNTING_DELIVERY_MODES = [
  "DOWNLOAD",
  "EMAIL",
  "PORTAL",
] as const;
const ACCOUNTING_PORTAL_AUDIENCE_TYPES = [
  "CUSTOMER",
  "VENDOR",
  "INTERNAL",
] as const;
const ACCOUNTING_PAYMENT_METHOD_TYPES = [
  "BANK_TRANSFER",
  "CASH",
  "CHEQUE",
  "CARD",
  "UPI",
  "OTHER",
] as const;
const ACCOUNTING_PRICE_LIST_ADJUSTMENT_MODES = [
  "MANUAL_OVERRIDE",
  "PERCENT_UP",
  "PERCENT_DOWN",
] as const;
const ACCOUNTING_INTEGRATION_DESTINATIONS = [
  { code: "SYNTHETIC_CRM", status: "ENABLED_SYNTHETIC", kind: "synthetic" },
  { code: "SYNTHETIC_CHA", status: "ENABLED_SYNTHETIC", kind: "synthetic" },
  { code: "SYNTHETIC_HRMS", status: "ENABLED_SYNTHETIC", kind: "synthetic" },
  { code: "SYNTHETIC_AMS", status: "ENABLED_SYNTHETIC", kind: "synthetic" },
  { code: "ZOHO", status: "DISABLED", kind: "external" },
  { code: "BANK_API", status: "DISABLED", kind: "external" },
  { code: "GST_FILING", status: "DISABLED", kind: "external" },
  { code: "E_INVOICE", status: "DISABLED", kind: "external" },
  { code: "E_WAY_BILL", status: "DISABLED", kind: "external" },
] as const;

const AUDITED_CONFIGURATION_ENTITY_TYPES = new Set([
  "AccountingOrganisationProfile",
  "AccountingLegalEntity",
  "AccountingTaxRegistration",
  "AccountingCurrency",
  "AccountingExchangeRate",
  "AccountingAccountControl",
  "AccountingCounterpartyEntityScope",
  "AccountingDimensionDefinition",
  "AccountingDimensionValue",
  "AccountingNumberSeries",
  "AccountingApprovalPolicy",
  "AccountingDocumentPolicy",
  "AccountingTaxProfile",
  "AccountingTaxRule",
  "AccountingStatutoryReturnProfile",
  "AccountingStatutoryFilingPeriod",
  "AccountingBankAccount",
  "AccountingBankStatementImport",
  "AccountingBankStatementLine",
  "AccountingReconciliationSession",
  "AccountingBankMatch",
  "AccountingRecurringTemplate",
  "AccountingRecurringSchedule",
  "AccountingRecurringRun",
  "AccountingFinancialAsset",
  "AccountingAssetBook",
  "AccountingDepreciationRun",
  "AccountingPartner",
  "AccountingPartnerTerm",
  "AccountingAppropriation",
  "AccountingBudget",
  "AccountingBudgetLine",
  "AccountingCustomerProfile",
  "AccountingVendorProfile",
  "AccountingPaymentTerm",
  "AccountingPaymentMethod",
  "AccountingPriceList",
  "AccountingUnitOfMeasure",
  "AccountingReportingTag",
  "AccountingSourceMappingProfile",
  "AccountingPeriodCloseRun",
  "AccountingReportExportProfile",
  "AccountingPortalPublicationProfile",
  "FiscalYear",
  "AccountingPeriod",
  "AccountingPeriodLockRequest",
]);

type InventoryMode = (typeof ACCOUNTING_INVENTORY_MODES)[number];
type LegalEntityStatus = (typeof ACCOUNTING_LEGAL_ENTITY_STATUSES)[number];
export function requireConfigurationRowVersion(
  currentVersion: number,
  expectedVersion?: number,
) {
  if (expectedVersion == null) {
    throw new Error("CONFIGURATION_ROW_VERSION_REQUIRED");
  }
  if (currentVersion !== expectedVersion) {
    throw new Error("CONFIGURATION_ROW_VERSION_CONFLICT");
  }
}

export function assertExchangeRateApprovalAllowed(input: {
  status: string;
  makerId: string | null;
  approverId: string;
}) {
  if (input.status !== "DRAFT") {
    throw new Error("EXCHANGE_RATE_APPROVAL_STATE_INVALID");
  }
  if (input.makerId && input.makerId === input.approverId) {
    throw new Error("EXCHANGE_RATE_SELF_APPROVAL_FORBIDDEN");
  }
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function parseDate(value: string | null | undefined, code: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(code);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(code);
  return parsed;
}

function parseRequiredDate(value: string | null | undefined, code: string) {
  const parsed = parseDate(value, code);
  if (!parsed) throw new Error(code);
  return parsed;
}

function normalizeReason(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error("CONFIGURATION_REASON_REQUIRED");
  return normalized;
}

function assertCurrencyCode(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error("CONFIGURATION_CURRENCY_CODE_INVALID");
  }
  return normalized;
}

function assertInventoryMode(value: string): InventoryMode {
  if (!(ACCOUNTING_INVENTORY_MODES as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_INVENTORY_MODE_INVALID");
  }
  return value as InventoryMode;
}

function assertEntityType(value: string) {
  if (!(ACCOUNTING_ENTITY_TYPES as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_LEGAL_ENTITY_TYPE_INVALID");
  }
  return value;
}

function assertLegalEntityStatus(value: string): LegalEntityStatus {
  if (
    !(ACCOUNTING_LEGAL_ENTITY_STATUSES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_LEGAL_ENTITY_STATUS_INVALID");
  }
  return value as LegalEntityStatus;
}

function assertRegistrationType(value: string) {
  if (
    !(ACCOUNTING_REGISTRATION_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_REGISTRATION_TYPE_INVALID");
  }
  return value;
}

function assertDimensionCode(value: string, code: string) {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(normalized)) {
    throw new Error(code);
  }
  return normalized;
}

function assertDimensionValueSource(value: string) {
  if (
    !(ACCOUNTING_DIMENSION_VALUE_SOURCES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_DIMENSION_VALUE_SOURCE_INVALID");
  }
  return value;
}

function assertApprovalDocumentType(value: string) {
  if (
    !(ACCOUNTING_APPROVAL_DOCUMENT_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_APPROVAL_POLICY_DOCUMENT_TYPE_INVALID");
  }
  return value;
}

function assertCounterpartyType(value: string) {
  if (
    !(ACCOUNTING_COUNTERPARTY_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_COUNTERPARTY_TYPE_INVALID");
  }
  return value;
}

function assertDocumentPolicyType(value: string) {
  if (
    !(ACCOUNTING_DOCUMENT_POLICY_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_DOCUMENT_POLICY_TYPE_INVALID");
  }
  return value;
}

function assertTaxRuleDocumentType(value: string) {
  if (
    !(ACCOUNTING_TAX_RULE_DOCUMENT_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_TAX_RULE_DOCUMENT_TYPE_INVALID");
  }
  return value;
}

function assertTaxRulePlaceOfSupplyType(value: string) {
  if (
    !(ACCOUNTING_TAX_RULE_PLACE_OF_SUPPLY_TYPES as readonly string[]).includes(
      value,
    )
  ) {
    throw new Error("CONFIGURATION_TAX_RULE_PLACE_OF_SUPPLY_INVALID");
  }
  return value;
}

function assertTaxRuleCounterpartyTreatment(value: string) {
  if (
    !(
      ACCOUNTING_TAX_RULE_COUNTERPARTY_TREATMENTS as readonly string[]
    ).includes(value)
  ) {
    throw new Error("CONFIGURATION_TAX_RULE_COUNTERPARTY_TREATMENT_INVALID");
  }
  return value;
}

function assertTaxRuleSupplyCategory(value: string) {
  if (
    !(ACCOUNTING_TAX_RULE_SUPPLY_CATEGORIES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_TAX_RULE_SUPPLY_CATEGORY_INVALID");
  }
  return value;
}

function assertTaxComponentType(value: string) {
  if (
    !(ACCOUNTING_TAX_COMPONENT_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_TAX_COMPONENT_TYPE_INVALID");
  }
  return value;
}

function assertStatutoryReturnType(value: string) {
  if (
    !(ACCOUNTING_STATUTORY_RETURN_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_STATUTORY_RETURN_TYPE_INVALID");
  }
  return value;
}

function assertStatutoryFilingFrequency(value: string) {
  if (
    !(ACCOUNTING_STATUTORY_FILING_FREQUENCIES as readonly string[]).includes(
      value,
    )
  ) {
    throw new Error("CONFIGURATION_STATUTORY_FILING_FREQUENCY_INVALID");
  }
  return value;
}

function assertStatutoryFilingStatus(value: string) {
  if (
    !(ACCOUNTING_STATUTORY_FILING_STATUSES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_STATUTORY_FILING_STATUS_INVALID");
  }
  return value;
}

function decimalString(value: string) {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("CONFIGURATION_DECIMAL_INVALID");
  }
  return normalized;
}

function signedDecimalString(value: string, code: string) {
  const normalized = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(code);
  }
  return normalized;
}

function optionalDecimalString(
  value: string | null | undefined,
  code: string,
) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return signedDecimalString(normalized, code);
}

function positiveOptionalDecimalString(
  value: string | null | undefined,
  code: string,
) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return signedDecimalString(normalized, code);
}

function parseJsonObject(value: string | null | undefined, code: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  try {
    return JSON.parse(normalized);
  } catch {
    throw new Error(code);
  }
}

function assertBankStatementImportStatus(value: string) {
  if (
    !(ACCOUNTING_BANK_STATEMENT_IMPORT_STATUSES as readonly string[]).includes(
      value,
    )
  ) {
    throw new Error("CONFIGURATION_BANK_STATEMENT_IMPORT_STATUS_INVALID");
  }
  return value;
}

function assertReconciliationSessionStatus(value: string) {
  if (
    !(
      ACCOUNTING_RECONCILIATION_SESSION_STATUSES as readonly string[]
    ).includes(value)
  ) {
    throw new Error("CONFIGURATION_RECONCILIATION_SESSION_STATUS_INVALID");
  }
  return value;
}

function assertBankMatchTargetType(value: string) {
  if (
    !(ACCOUNTING_BANK_MATCH_TARGET_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_BANK_MATCH_TARGET_TYPE_INVALID");
  }
  return value;
}

function assertRecurringSourceType(value: string) {
  if (
    !(ACCOUNTING_RECURRING_SOURCE_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_RECURRING_SOURCE_TYPE_INVALID");
  }
  return value;
}

function assertRecurringDocumentType(value: string) {
  if (
    !(ACCOUNTING_RECURRING_DOCUMENT_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_RECURRING_DOCUMENT_TYPE_INVALID");
  }
  return value;
}

function assertRecurringScheduleMode(value: string) {
  if (
    !(ACCOUNTING_RECURRING_SCHEDULE_MODES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_RECURRING_SCHEDULE_MODE_INVALID");
  }
  return value;
}

function assertRecurringCadence(value: string) {
  if (!(ACCOUNTING_RECURRING_CADENCES as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_RECURRING_CADENCE_INVALID");
  }
  return value;
}

function assertRecurringCatchUpMode(value: string) {
  if (
    !(ACCOUNTING_RECURRING_CATCH_UP_MODES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_RECURRING_CATCH_UP_MODE_INVALID");
  }
  return value;
}

function assertRecurringRunStatus(value: string) {
  if (
    !(ACCOUNTING_RECURRING_RUN_STATUSES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_RECURRING_RUN_STATUS_INVALID");
  }
  return value;
}

function assertFinancialAssetStatus(value: string) {
  if (
    !(ACCOUNTING_FINANCIAL_ASSET_STATUSES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_FINANCIAL_ASSET_STATUS_INVALID");
  }
  return value;
}

function assertAssetBookType(value: string) {
  if (!(ACCOUNTING_ASSET_BOOK_TYPES as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_ASSET_BOOK_TYPE_INVALID");
  }
  return value;
}

function assertAssetDepreciationMethod(value: string) {
  if (
    !(ACCOUNTING_ASSET_DEPRECIATION_METHODS as readonly string[]).includes(
      value,
    )
  ) {
    throw new Error("CONFIGURATION_ASSET_DEPRECIATION_METHOD_INVALID");
  }
  return value;
}

function assertDepreciationRunStatus(value: string) {
  if (
    !(ACCOUNTING_DEPRECIATION_RUN_STATUSES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_DEPRECIATION_RUN_STATUS_INVALID");
  }
  return value;
}

function assertPartnerStatus(value: string) {
  if (!(ACCOUNTING_PARTNER_STATUSES as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_PARTNER_STATUS_INVALID");
  }
  return value;
}

function assertAppropriationType(value: string) {
  if (
    !(ACCOUNTING_APPROPRIATION_TYPES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_APPROPRIATION_TYPE_INVALID");
  }
  return value;
}

function assertAppropriationStatus(value: string) {
  if (
    !(ACCOUNTING_APPROPRIATION_STATUSES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_APPROPRIATION_STATUS_INVALID");
  }
  return value;
}

function assertBudgetScenarioCode(value: string) {
  if (!(ACCOUNTING_BUDGET_SCENARIO_CODES as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_BUDGET_SCENARIO_CODE_INVALID");
  }
  return value;
}

function assertBudgetPeriodGranularity(value: string) {
  if (
    !(
      ACCOUNTING_BUDGET_PERIOD_GRANULARITIES as readonly string[]
    ).includes(value)
  ) {
    throw new Error("CONFIGURATION_BUDGET_PERIOD_GRANULARITY_INVALID");
  }
  return value;
}

function assertCustomerStatementDeliveryMode(value: string) {
  if (
    !(
      ACCOUNTING_CUSTOMER_STATEMENT_DELIVERY_MODES as readonly string[]
    ).includes(value)
  ) {
    throw new Error(
      "CONFIGURATION_CUSTOMER_PROFILE_STATEMENT_DELIVERY_MODE_INVALID",
    );
  }
  return value;
}

function assertSourceTargetModule(value: string) {
  if (!(ACCOUNTING_SOURCE_TARGET_MODULES as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_SOURCE_MAPPING_TARGET_MODULE_INVALID");
  }
  return value;
}

function assertPeriodCloseRunStatus(value: string) {
  if (
    !(ACCOUNTING_PERIOD_CLOSE_RUN_STATUSES as readonly string[]).includes(value)
  ) {
    throw new Error("CONFIGURATION_PERIOD_CLOSE_STATUS_INVALID");
  }
  return value;
}

function assertReportExportFormat(value: string) {
  if (!(ACCOUNTING_REPORT_EXPORT_FORMATS as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_REPORT_EXPORT_FORMAT_INVALID");
  }
  return value;
}

function assertDeliveryMode(value: string) {
  if (!(ACCOUNTING_DELIVERY_MODES as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_DELIVERY_MODE_INVALID");
  }
  return value;
}

function assertPortalAudienceType(value: string) {
  if (!(ACCOUNTING_PORTAL_AUDIENCE_TYPES as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_PORTAL_AUDIENCE_TYPE_INVALID");
  }
  return value;
}

function assertPaymentMethodType(value: string) {
  if (!(ACCOUNTING_PAYMENT_METHOD_TYPES as readonly string[]).includes(value)) {
    throw new Error("CONFIGURATION_PAYMENT_METHOD_TYPE_INVALID");
  }
  return value;
}

function assertPriceListAdjustmentMode(value: string) {
  if (
    !(ACCOUNTING_PRICE_LIST_ADJUSTMENT_MODES as readonly string[]).includes(
      value,
    )
  ) {
    throw new Error("CONFIGURATION_PRICE_LIST_ADJUSTMENT_MODE_INVALID");
  }
  return value;
}

function formatStatementLineAmount(line: {
  debitAmount?: { toString(): string } | null;
  creditAmount?: { toString(): string } | null;
}) {
  return line.debitAmount?.toString() ?? line.creditAmount?.toString() ?? "0";
}

function normalizeStatementLineStatus(input: {
  importExceptionCode?: string | null;
  statementAmount: string;
  matchedAmount: string;
}) {
  if (input.importExceptionCode) return "EXCEPTION";
  if (input.matchedAmount === "0") return "UNMATCHED";
  if (input.statementAmount === input.matchedAmount) return "FULL_MATCHED";
  return "PARTIAL_MATCHED";
}

function buildStatementImportHash(input: {
  sourceFileName: string;
  sourceFormat: string;
  statementStart: string | null;
  statementEnd: string | null;
  openingBalance: string | null;
  closingBalance: string | null;
  linesJson: string;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        sourceFileName: input.sourceFileName,
        sourceFormat: input.sourceFormat,
        statementStart: input.statementStart,
        statementEnd: input.statementEnd,
        openingBalance: input.openingBalance,
        closingBalance: input.closingBalance,
        linesJson: input.linesJson,
      }),
    )
    .digest("hex");
}

function parseBankStatementLinesJson(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error("CONFIGURATION_BANK_STATEMENT_LINES_REQUIRED");
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error("CONFIGURATION_BANK_STATEMENT_LINES_JSON_INVALID");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("CONFIGURATION_BANK_STATEMENT_LINES_REQUIRED");
  }
  return parsed.map((entry, index) => {
    const row = entry as Record<string, unknown>;
    const lineDate = parseRequiredDate(
      String(row.lineDate ?? "").trim(),
      "CONFIGURATION_BANK_STATEMENT_LINE_DATE_REQUIRED",
    );
    const valueDate = parseDate(
      String(row.valueDate ?? "").trim() || null,
      "CONFIGURATION_BANK_STATEMENT_VALUE_DATE_INVALID",
    );
    const description = String(row.description ?? "").trim();
    if (!description) {
      throw new Error("CONFIGURATION_BANK_STATEMENT_DESCRIPTION_REQUIRED");
    }
    const debitAmount = positiveOptionalDecimalString(
      row.debitAmount == null ? null : String(row.debitAmount),
      "CONFIGURATION_BANK_STATEMENT_DEBIT_INVALID",
    );
    const creditAmount = positiveOptionalDecimalString(
      row.creditAmount == null ? null : String(row.creditAmount),
      "CONFIGURATION_BANK_STATEMENT_CREDIT_INVALID",
    );
    if (!debitAmount && !creditAmount) {
      throw new Error("CONFIGURATION_BANK_STATEMENT_AMOUNT_REQUIRED");
    }
    if (debitAmount && creditAmount) {
      throw new Error("CONFIGURATION_BANK_STATEMENT_AMOUNT_SIDE_INVALID");
    }
    const sequenceNumber =
      Number(row.sequenceNumber) > 0
        ? Number(row.sequenceNumber)
        : index + 1;
    return {
      sequenceNumber,
      lineDate,
      valueDate,
      reference: String(row.reference ?? "").trim() || null,
      description,
      debitAmount,
      creditAmount,
      runningBalance: optionalDecimalString(
        row.runningBalance == null ? null : String(row.runningBalance),
        "CONFIGURATION_BANK_STATEMENT_BALANCE_INVALID",
      ),
      importExceptionCode:
        String(row.importExceptionCode ?? "").trim() || null,
      canonicalTargetType:
        String(row.canonicalTargetType ?? "").trim() || null,
      canonicalTargetIdentifier:
        String(row.canonicalTargetIdentifier ?? "").trim() || null,
      rawPayload:
        row.rawPayload == null ? row : (row.rawPayload as Record<string, unknown>),
    };
  });
}

function positiveBigIntString(value: string, code: string) {
  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new Error(code);
  }
  return BigInt(normalized);
}

async function createConfigurationAuditLog(input: {
  orgId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValues?: unknown;
  afterValues?: unknown;
}) {
  await db.accountingAuditLog.create({
    data: {
      orgId: input.orgId,
      userId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeValues:
        input.beforeValues == null ? undefined : (input.beforeValues as object),
      afterValues:
        input.afterValues == null ? undefined : (input.afterValues as object),
    },
  });
}

export async function getAccountingConfigurationAdminSnapshot(orgId: string) {
  const [profile, legalEntities, currencies, exchangeRates, accounts, accountControls, bankAccounts, bankStatementImports, bankStatementLines, reconciliationSessions, bankMatches, recurringTemplates, recurringSchedules, recurringRuns, legacyAssets, financialAssets, assetBooks, depreciationRuns, legacyPartners, partners, partnerTerms, appropriations, budgets, budgetLines, customerProfiles, vendorProfiles, paymentTerms, paymentMethods, priceLists, unitsOfMeasure, reportingTags, sourceMappingProfiles, integrationInbox, integrationOutbox, postingAttempts, payrollRunSnapshots, periodCloseRuns, reportExportProfiles, portalPublicationProfiles, recentDocuments, recentJournalEntries, customers, vendors, counterpartyScopes, dimensionDefinitions, numberSeries, approvalPolicies, documentPolicies, taxProfiles, taxRules, statutoryReturnProfiles, statutoryFilingPeriods, liveOutboxDestinations, audit] =
    await Promise.all([
      db.accountingOrganisationProfile.findUnique({ where: { orgId } }),
      db.accountingLegalEntity.findMany({
        where: { orgId },
        orderBy: [{ isDefault: "desc" }, { code: "asc" }],
        include: {
          taxRegistrations: {
            orderBy: [{ registrationType: "asc" }, { registrationCode: "asc" }],
          },
        },
      }),
      db.accountingCurrency.findMany({
        where: { orgId },
        orderBy: [{ isFunctional: "desc" }, { code: "asc" }],
      }),
      db.accountingExchangeRate.findMany({
        where: { orgId },
        orderBy: [{ rateDate: "desc" }, { updatedAt: "desc" }],
        take: 50,
        include: {
          fromCurrency: { select: { code: true } },
          toCurrency: { select: { code: true } },
        },
      }),
      db.account.findMany({
        where: { orgId },
        orderBy: [{ accountCode: "asc" }],
        select: {
          id: true,
          accountCode: true,
          accountName: true,
          accountType: true,
          rootType: true,
          isActive: true,
        },
      }),
      db.accountingAccountControl.findMany({
        where: { orgId },
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
        include: {
          account: {
            select: {
              id: true,
              accountCode: true,
              accountName: true,
              accountType: true,
            },
          },
          defaultCurrency: {
            select: {
              id: true,
              code: true,
            },
          },
        },
      }),
      db.accountingBankAccount.findMany({
        where: { orgId },
        orderBy: [{ isPrimary: "desc" }, { code: "asc" }],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
          taxRegistration: {
            select: {
              id: true,
              registrationCode: true,
              registrationType: true,
            },
          },
          ledgerAccount: {
            select: {
              id: true,
              accountCode: true,
              accountName: true,
            },
          },
        },
      }),
      db.accountingBankStatementImport.findMany({
        where: { orgId },
        orderBy: [{ createdAt: "desc" }],
        include: {
          bankAccount: { select: { code: true, name: true } },
          lines: {
            orderBy: [{ sequenceNumber: "asc" }],
          },
        },
        take: 40,
      }),
      db.accountingBankStatementLine.findMany({
        where: { orgId },
        orderBy: [{ lineDate: "desc" }, { sequenceNumber: "desc" }],
        include: {
          bankAccount: { select: { code: true, name: true } },
          import: { select: { sourceFileName: true } },
        },
        take: 120,
      }),
      db.accountingReconciliationSession.findMany({
        where: { orgId },
        orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
        include: {
          bankAccount: { select: { code: true, name: true } },
          statementImport: { select: { sourceFileName: true } },
          completedBy: { select: { name: true, email: true } },
          matches: {
            select: { id: true, matchedAmount: true },
          },
        },
        take: 40,
      }),
      db.accountingBankMatch.findMany({
        where: { orgId },
        orderBy: [{ createdAt: "desc" }],
        include: {
          session: {
            select: {
              bankAccount: { select: { code: true, name: true } },
              statementImport: { select: { sourceFileName: true } },
            },
          },
          statementLine: {
            select: {
              id: true,
              sequenceNumber: true,
              description: true,
              reference: true,
              debitAmount: true,
              creditAmount: true,
            },
          },
          targetDocument: {
            select: {
              id: true,
              documentType: true,
              sourceId: true,
              totalAmount: true,
            },
          },
          targetJournalEntry: {
            select: {
              id: true,
              voucherNo: true,
              totalDebit: true,
            },
          },
          createdBy: {
            select: { name: true, email: true },
          },
        },
        take: 120,
      }),
      db.accountingRecurringTemplate.findMany({
        where: { orgId },
        orderBy: [{ code: "asc" }, { version: "desc" }],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
          createdBy: { select: { name: true, email: true } },
        },
      }),
      db.accountingRecurringSchedule.findMany({
        where: { orgId },
        orderBy: [{ nextDueDate: "asc" }, { createdAt: "desc" }],
        include: {
          template: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
      db.accountingRecurringRun.findMany({
        where: { orgId },
        orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
        include: {
          template: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          schedule: {
            select: {
              id: true,
              cadence: true,
            },
          },
          processedBy: { select: { name: true, email: true } },
        },
        take: 80,
      }),
      db.asset.findMany({
        where: { orgId },
        orderBy: [{ assetCode: "asc" }],
        select: {
          id: true,
          assetCode: true,
          assetName: true,
          purchaseDate: true,
          purchaseValue: true,
          bookValue: true,
          status: true,
        },
      }),
      db.accountingFinancialAsset.findMany({
        where: { orgId },
        orderBy: [{ assetCode: "asc" }],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
          legacyAsset: {
            select: {
              id: true,
              assetCode: true,
              assetName: true,
            },
          },
          createdBy: { select: { name: true, email: true } },
        },
      }),
      db.accountingAssetBook.findMany({
        where: { orgId },
        orderBy: [{ bookCode: "asc" }, { effectiveFrom: "desc" }],
        include: {
          financialAsset: {
            select: {
              id: true,
              assetCode: true,
              assetName: true,
            },
          },
          assetAccount: { select: { accountCode: true, accountName: true } },
          depreciationExpenseAccount: {
            select: { accountCode: true, accountName: true },
          },
          accumulatedDepAccount: {
            select: { accountCode: true, accountName: true },
          },
        },
      }),
      db.accountingDepreciationRun.findMany({
        where: { orgId },
        orderBy: [{ depreciationDate: "desc" }, { createdAt: "desc" }],
        include: {
          assetBook: {
            select: {
              id: true,
              bookCode: true,
              financialAsset: {
                select: {
                  assetCode: true,
                  assetName: true,
                },
              },
            },
          },
          journalEntry: { select: { voucherNo: true } },
          processedBy: { select: { name: true, email: true } },
        },
        take: 80,
      }),
      db.partnerAccount.findMany({
        where: { orgId },
        orderBy: [{ partnerCode: "asc" }],
        include: {
          capitalAccount: { select: { accountCode: true, accountName: true } },
          currentAccount: { select: { accountCode: true, accountName: true } },
        },
      }),
      db.accountingPartner.findMany({
        where: { orgId },
        orderBy: [{ partnerCode: "asc" }],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
          legacyPartner: { select: { id: true, partnerCode: true, partnerName: true } },
          capitalAccount: { select: { accountCode: true, accountName: true } },
          currentAccount: { select: { accountCode: true, accountName: true } },
          drawingsAccount: { select: { accountCode: true, accountName: true } },
          createdBy: { select: { name: true, email: true } },
        },
      }),
      db.accountingPartnerTerm.findMany({
        where: { orgId },
        orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
        include: {
          partner: { select: { partnerCode: true, partnerName: true } },
          salaryExpenseAccount: { select: { accountCode: true, accountName: true } },
          interestExpenseAccount: { select: { accountCode: true, accountName: true } },
          interestIncomeAccount: { select: { accountCode: true, accountName: true } },
        },
      }),
      db.accountingAppropriation.findMany({
        where: { orgId },
        orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
        include: {
          partner: { select: { partnerCode: true, partnerName: true } },
          term: { select: { version: true } },
          journalEntry: { select: { voucherNo: true } },
          createdBy: { select: { name: true, email: true } },
        },
        take: 80,
      }),
      db.accountingBudget.findMany({
        where: { orgId },
        orderBy: [
          { effectiveFrom: "desc" },
          { scenarioCode: "asc" },
          { version: "desc" },
        ],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
          fiscalYear: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
          createdBy: { select: { name: true, email: true } },
          lines: { select: { id: true } },
        },
      }),
      db.accountingBudgetLine.findMany({
        where: { orgId },
        orderBy: [{ periodStart: "desc" }, { lineNumber: "asc" }],
        include: {
          budget: {
            select: {
              id: true,
              name: true,
              scenarioCode: true,
              version: true,
            },
          },
          legalEntity: { select: { code: true, legalName: true } },
          account: {
            select: {
              id: true,
              accountCode: true,
              accountName: true,
            },
          },
          dimensionValue: {
            select: {
              id: true,
              code: true,
              name: true,
              definition: { select: { code: true, name: true } },
            },
          },
        },
        take: 200,
      }),
      db.accountingCustomerProfile.findMany({
        where: { orgId },
        orderBy: [{ isActive: "desc" }, { crmAccount: { name: "asc" } }],
        include: {
          crmAccount: {
            select: {
              id: true,
              name: true,
              gstin: true,
              currency: true,
              paymentTerms: true,
            },
          },
          receivableAccount: {
            select: { id: true, accountCode: true, accountName: true },
          },
        },
      }),
      db.accountingVendorProfile.findMany({
        where: { orgId },
        orderBy: [{ isActive: "desc" }, { crmVendor: { name: "asc" } }],
        include: {
          crmVendor: {
            select: {
              id: true,
              name: true,
              gstin: true,
            },
          },
          payableAccount: {
            select: { id: true, accountCode: true, accountName: true },
          },
          taxProfile: {
            select: { id: true, code: true, name: true, version: true },
          },
        },
      }),
      db.accountingPaymentTerm.findMany({
        where: { orgId },
        orderBy: [{ code: "asc" }],
      }),
      db.accountingPaymentMethod.findMany({
        where: { orgId },
        orderBy: [{ code: "asc" }],
        include: {
          clearingAccount: {
            select: { accountCode: true, accountName: true },
          },
        },
      }),
      db.accountingPriceList.findMany({
        where: { orgId },
        orderBy: [{ code: "asc" }],
      }),
      db.accountingUnitOfMeasure.findMany({
        where: { orgId },
        orderBy: [{ code: "asc" }],
      }),
      db.accountingReportingTag.findMany({
        where: { orgId },
        orderBy: [{ code: "asc" }],
      }),
      db.accountingSourceMappingProfile.findMany({
        where: { orgId },
        orderBy: [{ sourceSystem: "asc" }, { sourceType: "asc" }, { profileCode: "asc" }],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
        },
      }),
      db.accountingIntegrationInbox.findMany({
        where: { orgId },
        orderBy: [{ createdAt: "desc" }],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
        },
        take: 80,
      }),
      db.accountingIntegrationOutbox.findMany({
        where: { orgId },
        orderBy: [{ createdAt: "desc" }],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
        },
        take: 80,
      }),
      db.accountingPostingAttempt.findMany({
        where: { orgId },
        orderBy: [{ startedAt: "desc" }],
        include: {
          inbox: { select: { sourceSystem: true, sourceType: true, sourceId: true } },
          journalEntry: { select: { voucherNo: true } },
        },
        take: 80,
      }),
      db.accountingPayrollRunSnapshot.findMany({
        where: { orgId },
        orderBy: [{ approvedAt: "desc" }],
        take: 40,
      }),
      db.accountingPeriodCloseRun.findMany({
        where: { orgId },
        orderBy: [{ closeDate: "desc" }, { createdAt: "desc" }],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
          period: { select: { name: true, periodNumber: true, startDate: true, endDate: true } },
        },
        take: 60,
      }),
      db.accountingReportExportProfile.findMany({
        where: { orgId },
        orderBy: [{ reportCode: "asc" }, { name: "asc" }],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
        },
      }),
      db.accountingPortalPublicationProfile.findMany({
        where: { orgId },
        orderBy: [{ documentType: "asc" }, { audienceType: "asc" }],
        include: {
          legalEntity: { select: { code: true, legalName: true } },
          exportProfile: { select: { id: true, name: true, reportCode: true } },
        },
      }),
      db.accountingDocument.findMany({
        where: { orgId, status: "POSTED" },
        orderBy: [{ postingDate: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          documentType: true,
          sourceId: true,
          totalAmount: true,
          postingDate: true,
        },
        take: 30,
      }),
      db.journalEntry.findMany({
        where: { orgId, status: "POSTED" },
        orderBy: [{ postingDate: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          voucherNo: true,
          postingDate: true,
          totalDebit: true,
        },
        take: 30,
      }),
      db.crmAccount.findMany({
        where: { orgId, status: "ACTIVE" },
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          gstin: true,
          currency: true,
          paymentTerms: true,
          creditLimit: true,
        },
      }),
      db.crmVendor.findMany({
        where: { orgId, status: "ACTIVE" },
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          gstin: true,
        },
      }),
      db.accountingCounterpartyEntityScope.findMany({
        where: { orgId },
        orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
        include: {
          legalEntity: {
            select: {
              id: true,
              code: true,
              legalName: true,
            },
          },
        },
      }),
      db.accountingDimensionDefinition.findMany({
        where: { orgId },
        orderBy: [{ isRequired: "desc" }, { code: "asc" }],
        include: {
          values: {
            orderBy: [{ code: "asc" }],
          },
        },
      }),
      db.accountingNumberSeries.findMany({
        where: { orgId },
        orderBy: [{ documentType: "asc" }, { effectiveFrom: "desc" }],
        include: {
          taxRegistration: {
            select: {
              id: true,
              registrationCode: true,
              registrationType: true,
            },
          },
        },
      }),
      db.accountingApprovalPolicy.findMany({
        where: { orgId },
        orderBy: [{ documentType: "asc" }, { version: "desc" }],
      }),
      db.accountingDocumentPolicy.findMany({
        where: { orgId },
        orderBy: [{ documentType: "asc" }, { version: "desc" }],
        include: {
          legalEntity: {
            select: { code: true, legalName: true },
          },
        },
      }),
      db.accountingTaxProfile.findMany({
        where: { orgId },
        orderBy: [{ code: "asc" }, { version: "desc" }],
        include: {
          taxRegistration: {
            select: {
              id: true,
              registrationCode: true,
              registrationType: true,
            },
          },
          legalEntity: {
            select: { code: true, legalName: true },
          },
        },
      }),
      db.accountingTaxRule.findMany({
        where: { orgId },
        orderBy: [{ code: "asc" }, { version: "desc" }],
        include: {
          taxProfile: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          taxRegistration: {
            select: {
              id: true,
              registrationCode: true,
              registrationType: true,
            },
          },
          legalEntity: {
            select: { code: true, legalName: true },
          },
          components: {
            orderBy: [{ position: "asc" }, { componentCode: "asc" }],
          },
        },
      }),
      db.accountingStatutoryReturnProfile.findMany({
        where: { orgId },
        orderBy: [{ returnType: "asc" }, { effectiveFrom: "desc" }],
        include: {
          taxRegistration: {
            select: {
              id: true,
              registrationCode: true,
              registrationType: true,
            },
          },
          legalEntity: {
            select: { code: true, legalName: true },
          },
        },
      }),
      db.accountingStatutoryFilingPeriod.findMany({
        where: { orgId },
        orderBy: [{ periodStart: "desc" }, { returnType: "asc" }],
        include: {
          profile: {
            select: { id: true, returnType: true, filingFrequency: true },
          },
          taxRegistration: {
            select: {
              id: true,
              registrationCode: true,
              registrationType: true,
            },
          },
          legalEntity: {
            select: { code: true, legalName: true },
          },
          filedBy: { select: { name: true, email: true } },
        },
        take: 60,
      }),
      db.accountingIntegrationOutbox.findMany({
        where: { orgId },
        distinct: ["destination"],
        select: { destination: true },
      }),
      db.accountingAuditLog.findMany({
        where: { orgId },
        orderBy: [{ timestamp: "desc" }, { id: "desc" }],
        include: { user: { select: { name: true, email: true } } },
        take: 50,
      }),
    ]);

  return {
    profile: profile
      ? {
          id: profile.id,
          functionalCurrencyCode: profile.functionalCurrencyCode,
          fiscalYearStartMonth: profile.fiscalYearStartMonth,
          fiscalYearStartDay: profile.fiscalYearStartDay,
          inventoryMode: profile.inventoryMode,
          moneyScale: profile.moneyScale,
          quantityScale: profile.quantityScale,
          exchangeRateScale: profile.exchangeRateScale,
          percentageScale: profile.percentageScale,
          roundingMode: profile.roundingMode,
          correctionPolicyJson: profile.correctionPolicy
            ? JSON.stringify(profile.correctionPolicy, null, 2)
            : "",
          correctionPolicyVersion: profile.correctionPolicyVersion,
          rowVersion: profile.rowVersion,
          updatedAt: profile.updatedAt.toISOString(),
        }
      : null,
    fiscalYears: await db.fiscalYear.findMany({
      where: { orgId },
      orderBy: [{ startDate: "desc" }, { endDate: "desc" }],
    }).then((rows: any[]) =>
      rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        startDate: iso(row.startDate)!,
        endDate: iso(row.endDate)!,
        closed: row.closed,
        rowVersion: row.rowVersion,
      })),
    ),
    periods: await db.accountingPeriod.findMany({
      where: { orgId },
      orderBy: [{ startDate: "desc" }, { periodNumber: "desc" }],
      include: { fiscalYear: { select: { name: true } } },
      take: 60,
    }).then((rows: any[]) =>
      rows.map((row: any) => ({
        id: row.id,
        fiscalYearId: row.fiscalYearId,
        fiscalYearName: row.fiscalYear.name,
        periodNumber: row.periodNumber,
        name: row.name,
        startDate: iso(row.startDate)!,
        endDate: iso(row.endDate)!,
        status: row.status,
        hardLockedAt: row.hardLockedAt?.toISOString() ?? null,
        rowVersion: row.rowVersion,
      })),
    ),
    periodLockRequests: await db.accountingPeriodLockRequest.findMany({
      where: { orgId },
      orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
      include: {
        period: { select: { name: true, periodNumber: true } },
        requestedBy: { select: { name: true, email: true } },
        decidedBy: { select: { name: true, email: true } },
      },
      take: 50,
    }).then((rows: any[]) =>
      rows.map((row: any) => ({
        id: row.id,
        periodId: row.periodId,
        periodLabel: `P${row.period.periodNumber} · ${row.period.name}`,
        reason: row.reason,
        status: row.status,
        requestedAt: row.requestedAt.toISOString(),
        decidedAt: row.decidedAt?.toISOString() ?? null,
        reopenFrom: iso(row.reopenFrom),
        reopenUntil: iso(row.reopenUntil),
        appliedAt: row.appliedAt?.toISOString() ?? null,
        relockedAt: row.relockedAt?.toISOString() ?? null,
        requestedBy:
          row.requestedBy.name || row.requestedBy.email || "Unknown user",
        decidedBy: row.decidedBy
          ? row.decidedBy.name || row.decidedBy.email || "Unknown user"
          : null,
        rowVersion: row.rowVersion,
      })),
    ),
    legalEntities: legalEntities.map((entity: any) => ({
      id: entity.id,
      code: entity.code,
      legalName: entity.legalName,
      entityType: entity.entityType,
      status: entity.status,
      isDefault: entity.isDefault,
      effectiveFrom: iso(entity.effectiveFrom),
      effectiveTo: iso(entity.effectiveTo),
      rowVersion: entity.rowVersion,
      registrations: entity.taxRegistrations.map((registration: any) => ({
        id: registration.id,
        registrationCode: registration.registrationCode,
        registrationType: registration.registrationType,
        gstin: registration.gstin,
        stateCode: registration.stateCode,
        legalName: registration.legalName,
        tradeName: registration.tradeName,
        effectiveFrom: iso(registration.effectiveFrom),
        effectiveTo: iso(registration.effectiveTo),
        isActive: registration.isActive,
        rowVersion: registration.rowVersion,
      })),
    })),
    currencies: currencies.map((currency: any) => ({
      id: currency.id,
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimalPlaces: currency.decimalPlaces,
      isFunctional: currency.isFunctional,
      isEnabled: currency.isEnabled,
      rowVersion: currency.rowVersion,
    })),
    exchangeRates: exchangeRates.map((rate: any) => ({
      id: rate.id,
      pair: `${rate.fromCurrency.code}/${rate.toCurrency.code}`,
      fromCurrencyId: rate.fromCurrencyId,
      toCurrencyId: rate.toCurrencyId,
      rateDate: iso(rate.rateDate)!,
      rate: rate.rate.toString(),
      source: rate.source,
      status: rate.status,
      approvedById: rate.approvedById,
      approvedAt: rate.approvedAt?.toISOString() ?? null,
      rowVersion: rate.rowVersion,
    })),
    accounts: accounts.map((account: any) => ({
      id: account.id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      rootType: account.rootType,
      isActive: account.isActive,
    })),
    accountControls: accountControls.map((control: any) => ({
      id: control.id,
      accountId: control.accountId,
      accountLabel: `${control.account.accountCode} — ${control.account.accountName}`,
      accountType: control.account.accountType,
      defaultCurrencyId: control.defaultCurrencyId,
      defaultCurrencyCode: control.defaultCurrency?.code ?? null,
      systemRole: control.systemRole,
      isSystemLocked: control.isSystemLocked,
      allowDirectPosting: control.allowDirectPosting,
      requiresParty: control.requiresParty,
      requiresChaJob: control.requiresChaJob,
      requiresCostCentre: control.requiresCostCentre,
      effectiveFrom: iso(control.effectiveFrom)!,
      rowVersion: control.rowVersion,
    })),
    bankAccounts: bankAccounts.map((account: any) => ({
      id: account.id,
      legalEntityId: account.legalEntityId,
      legalEntityLabel: `${account.legalEntity.code} — ${account.legalEntity.legalName}`,
      taxRegistrationId: account.taxRegistrationId,
      taxRegistrationLabel: account.taxRegistration
        ? `${account.taxRegistration.registrationType} · ${account.taxRegistration.registrationCode}`
        : "Optional",
      ledgerAccountId: account.ledgerAccountId,
      ledgerAccountLabel: `${account.ledgerAccount.accountCode} — ${account.ledgerAccount.accountName}`,
      code: account.code,
      name: account.name,
      bankName: account.bankName,
      branchName: account.branchName,
      accountNumberMasked: account.accountNumberMasked,
      ifsc: account.ifsc,
      currencyCode: account.currencyCode,
      isPrimary: account.isPrimary,
      configurationJson: account.configuration
        ? JSON.stringify(account.configuration, null, 2)
        : "",
      statutoryValidated: account.statutoryValidated,
      effectiveFrom: iso(account.effectiveFrom)!,
      effectiveTo: iso(account.effectiveTo),
      isActive: account.isActive,
      rowVersion: account.rowVersion,
    })),
    bankStatementImports: bankStatementImports.map((entry: any) => ({
      id: entry.id,
      bankAccountId: entry.bankAccountId,
      legalEntityId: entry.legalEntityId,
      bankAccountLabel: `${entry.bankAccount.code} — ${entry.bankAccount.name}`,
      sourceFileName: entry.sourceFileName,
      sourceFormat: entry.sourceFormat,
      sourceFileHash: entry.sourceFileHash,
      statementStart: iso(entry.statementStart),
      statementEnd: iso(entry.statementEnd),
      openingBalance: entry.openingBalance?.toString() ?? null,
      closingBalance: entry.closingBalance?.toString() ?? null,
      importStatus: entry.importStatus,
      importExceptionsJson: entry.importExceptions
        ? JSON.stringify(entry.importExceptions, null, 2)
        : "",
      linesJson: JSON.stringify(
        entry.lines.map((line: any) => ({
          sequenceNumber: line.sequenceNumber,
          lineDate: iso(line.lineDate),
          valueDate: iso(line.valueDate),
          reference: line.reference,
          description: line.description,
          debitAmount: line.debitAmount?.toString() ?? null,
          creditAmount: line.creditAmount?.toString() ?? null,
          runningBalance: line.runningBalance?.toString() ?? null,
          importExceptionCode: line.importExceptionCode,
          canonicalTargetType: line.canonicalTargetType,
          canonicalTargetIdentifier: line.canonicalTargetIdentifier,
          rawPayload: line.rawPayload ?? null,
        })),
        null,
        2,
      ),
      lineCount: entry.lines.length,
      rowVersion: entry.rowVersion,
      createdAt: entry.createdAt.toISOString(),
    })),
    bankStatementLines: bankStatementLines.map((line: any) => ({
      id: line.id,
      importId: line.importId,
      bankAccountId: line.bankAccountId,
      bankAccountLabel: `${line.bankAccount.code} — ${line.bankAccount.name}`,
      sourceFileName: line.import.sourceFileName,
      lineDate: iso(line.lineDate)!,
      valueDate: iso(line.valueDate),
      sequenceNumber: line.sequenceNumber,
      reference: line.reference,
      description: line.description,
      debitAmount: line.debitAmount?.toString() ?? null,
      creditAmount: line.creditAmount?.toString() ?? null,
      runningBalance: line.runningBalance?.toString() ?? null,
      importExceptionCode: line.importExceptionCode,
      reconciliationStatus: line.reconciliationStatus,
      canonicalTargetType: line.canonicalTargetType,
      canonicalTargetIdentifier: line.canonicalTargetIdentifier,
      rowVersion: line.rowVersion,
    })),
    reconciliationSessions: reconciliationSessions.map((session: any) => ({
      id: session.id,
      bankAccountId: session.bankAccountId,
      statementImportId: session.statementImportId,
      legalEntityId: session.legalEntityId,
      bankAccountLabel: `${session.bankAccount.code} — ${session.bankAccount.name}`,
      statementImportLabel: session.statementImport.sourceFileName,
      periodStart: iso(session.periodStart)!,
      periodEnd: iso(session.periodEnd)!,
      statementClosingBalance: session.statementClosingBalance?.toString() ?? null,
      ledgerClosingBalance: session.ledgerClosingBalance?.toString() ?? null,
      differenceAmount: session.differenceAmount?.toString() ?? null,
      status: session.status,
      proofJson: session.proof ? JSON.stringify(session.proof, null, 2) : "",
      matchCount: session.matches.length,
      completedBy:
        session.completedBy?.name || session.completedBy?.email || null,
      completedAt: session.completedAt?.toISOString() ?? null,
      rowVersion: session.rowVersion,
    })),
    bankMatches: bankMatches.map((match: any) => ({
      id: match.id,
      sessionId: match.sessionId,
      statementLineId: match.statementLineId,
      sessionLabel: `${match.session.bankAccount.code} — ${match.session.statementImport.sourceFileName}`,
      statementLineLabel: `#${match.statementLine.sequenceNumber} · ${match.statementLine.reference || match.statementLine.description} · ${formatStatementLineAmount(match.statementLine)}`,
      targetType: match.targetType,
      targetDocumentId: match.targetDocumentId,
      targetDocumentLabel: match.targetDocument
        ? `${match.targetDocument.documentType} · ${match.targetDocument.sourceId} · ${match.targetDocument.totalAmount.toString()}`
        : null,
      targetJournalEntryId: match.targetJournalEntryId,
      targetJournalEntryLabel: match.targetJournalEntry
        ? `${match.targetJournalEntry.voucherNo} · ${match.targetJournalEntry.totalDebit.toString()}`
        : null,
      matchedAmount: match.matchedAmount.toString(),
      confidenceScore: match.confidenceScore?.toString() ?? null,
      reasonCode: match.reasonCode,
      createdBy: match.createdBy.name || match.createdBy.email || "Unknown user",
      rowVersion: match.rowVersion,
      createdAt: match.createdAt.toISOString(),
    })),
    recurringTemplates: recurringTemplates.map((template: any) => ({
      id: template.id,
      legalEntityId: template.legalEntityId,
      legalEntityLabel: `${template.legalEntity.code} — ${template.legalEntity.legalName}`,
      code: template.code,
      name: template.name,
      sourceType: template.sourceType,
      documentType: template.documentType,
      version: template.version,
      scheduleMode: template.scheduleMode,
      scheduleConfigJson: template.scheduleConfig
        ? JSON.stringify(template.scheduleConfig, null, 2)
        : "",
      generationPolicyJson: template.generationPolicy
        ? JSON.stringify(template.generationPolicy, null, 2)
        : "",
      approvalMode: template.approvalMode,
      autoSubmit: template.autoSubmit,
      isActive: template.isActive,
      effectiveFrom: iso(template.effectiveFrom)!,
      effectiveTo: iso(template.effectiveTo),
      createdBy:
        template.createdBy.name || template.createdBy.email || "Unknown user",
      rowVersion: template.rowVersion,
    })),
    recurringSchedules: recurringSchedules.map((schedule: any) => ({
      id: schedule.id,
      templateId: schedule.templateId,
      templateLabel: `${schedule.template.code} — ${schedule.template.name}`,
      cadence: schedule.cadence,
      anchorDate: iso(schedule.anchorDate)!,
      nextDueDate: iso(schedule.nextDueDate)!,
      lastProcessedDueDate: iso(schedule.lastProcessedDueDate),
      catchUpMode: schedule.catchUpMode,
      scheduleConfigJson: schedule.scheduleConfig
        ? JSON.stringify(schedule.scheduleConfig, null, 2)
        : "",
      isActive: schedule.isActive,
      rowVersion: schedule.rowVersion,
    })),
    recurringRuns: recurringRuns.map((run: any) => ({
      id: run.id,
      templateId: run.templateId,
      templateLabel: `${run.template.code} — ${run.template.name}`,
      scheduleId: run.scheduleId,
      scheduleLabel: run.schedule
        ? `${run.schedule.cadence} schedule`
        : "Ad hoc run",
      dueDate: iso(run.dueDate)!,
      runStatus: run.runStatus,
      generatedRecordType: run.generatedRecordType,
      generatedRecordId: run.generatedRecordId,
      resultJson: run.result ? JSON.stringify(run.result, null, 2) : "",
      idempotencyKey: run.idempotencyKey,
      processedBy:
        run.processedBy?.name || run.processedBy?.email || null,
      processedAt: run.processedAt?.toISOString() ?? null,
      rowVersion: run.rowVersion,
    })),
    legacyAssets: legacyAssets.map((asset: any) => ({
      id: asset.id,
      label: `${asset.assetCode} — ${asset.assetName}`,
      purchaseDate: iso(asset.purchaseDate),
      purchaseValue: asset.purchaseValue.toString(),
      bookValue: asset.bookValue.toString(),
      status: asset.status,
    })),
    financialAssets: financialAssets.map((asset: any) => ({
      id: asset.id,
      legalEntityId: asset.legalEntityId,
      legalEntityLabel: `${asset.legalEntity.code} — ${asset.legalEntity.legalName}`,
      legacyAssetId: asset.legacyAssetId,
      legacyAssetLabel: `${asset.legacyAsset.assetCode} — ${asset.legacyAsset.assetName}`,
      assetCode: asset.assetCode,
      assetName: asset.assetName,
      capitalizationDate: iso(asset.capitalizationDate)!,
      capitalizationAmount: asset.capitalizationAmount.toString(),
      salvageValue: asset.salvageValue?.toString() ?? null,
      usefulLifeMonths: asset.usefulLifeMonths,
      sourceAssetVersion: asset.sourceAssetVersion,
      policyJson: asset.policyJson ? JSON.stringify(asset.policyJson, null, 2) : "",
      status: asset.status,
      createdBy: asset.createdBy.name || asset.createdBy.email || "Unknown user",
      rowVersion: asset.rowVersion,
    })),
    assetBooks: assetBooks.map((book: any) => ({
      id: book.id,
      legalEntityId: book.legalEntityId,
      financialAssetId: book.financialAssetId,
      financialAssetLabel: `${book.financialAsset.assetCode} — ${book.financialAsset.assetName}`,
      bookCode: book.bookCode,
      bookType: book.bookType,
      depreciationMethod: book.depreciationMethod,
      depreciationRate: book.depreciationRate?.toString() ?? null,
      usefulLifeMonths: book.usefulLifeMonths,
      capitalizationAmount: book.capitalizationAmount.toString(),
      salvageValue: book.salvageValue?.toString() ?? null,
      accumulatedDepreciation: book.accumulatedDepreciation.toString(),
      netBookValue: book.netBookValue.toString(),
      assetAccountId: book.assetAccountId,
      assetAccountLabel: book.assetAccount
        ? `${book.assetAccount.accountCode} — ${book.assetAccount.accountName}`
        : null,
      depreciationExpenseAccountId: book.depreciationExpenseAccountId,
      depreciationExpenseAccountLabel: book.depreciationExpenseAccount
        ? `${book.depreciationExpenseAccount.accountCode} — ${book.depreciationExpenseAccount.accountName}`
        : null,
      accumulatedDepAccountId: book.accumulatedDepAccountId,
      accumulatedDepAccountLabel: book.accumulatedDepAccount
        ? `${book.accumulatedDepAccount.accountCode} — ${book.accumulatedDepAccount.accountName}`
        : null,
      policyJson: book.policyJson ? JSON.stringify(book.policyJson, null, 2) : "",
      effectiveFrom: iso(book.effectiveFrom)!,
      effectiveTo: iso(book.effectiveTo),
      isActive: book.isActive,
      rowVersion: book.rowVersion,
    })),
    depreciationRuns: depreciationRuns.map((run: any) => ({
      id: run.id,
      legalEntityId: run.legalEntityId,
      assetBookId: run.assetBookId,
      assetBookLabel: `${run.assetBook.financialAsset.assetCode} — ${run.assetBook.bookCode}`,
      periodStart: iso(run.periodStart)!,
      periodEnd: iso(run.periodEnd)!,
      depreciationDate: iso(run.depreciationDate)!,
      depreciationAmount: run.depreciationAmount.toString(),
      accumulatedAfter: run.accumulatedAfter.toString(),
      netBookValueAfter: run.netBookValueAfter.toString(),
      runStatus: run.runStatus,
      journalEntryId: run.journalEntryId,
      journalEntryLabel: run.journalEntry?.voucherNo ?? null,
      policySnapshotJson: run.policySnapshot
        ? JSON.stringify(run.policySnapshot, null, 2)
        : "",
      idempotencyKey: run.idempotencyKey,
      processedBy: run.processedBy?.name || run.processedBy?.email || null,
      processedAt: run.processedAt?.toISOString() ?? null,
      rowVersion: run.rowVersion,
    })),
    legacyPartners: legacyPartners.map((partner: any) => ({
      id: partner.id,
      label: `${partner.partnerCode} — ${partner.partnerName}`,
      capitalAccountLabel: `${partner.capitalAccount.accountCode} — ${partner.capitalAccount.accountName}`,
      currentAccountLabel: `${partner.currentAccount.accountCode} — ${partner.currentAccount.accountName}`,
    })),
    partners: partners.map((partner: any) => ({
      id: partner.id,
      legalEntityId: partner.legalEntityId,
      legalEntityLabel: `${partner.legalEntity.code} — ${partner.legalEntity.legalName}`,
      legacyPartnerId: partner.legacyPartnerId,
      legacyPartnerLabel: `${partner.legacyPartner.partnerCode} — ${partner.legacyPartner.partnerName}`,
      partnerCode: partner.partnerCode,
      partnerName: partner.partnerName,
      capitalAccountId: partner.capitalAccountId,
      capitalAccountLabel: `${partner.capitalAccount.accountCode} — ${partner.capitalAccount.accountName}`,
      currentAccountId: partner.currentAccountId,
      currentAccountLabel: `${partner.currentAccount.accountCode} — ${partner.currentAccount.accountName}`,
      drawingsAccountId: partner.drawingsAccountId,
      drawingsAccountLabel: partner.drawingsAccount
        ? `${partner.drawingsAccount.accountCode} — ${partner.drawingsAccount.accountName}`
        : null,
      status: partner.status,
      policyJson: partner.policyJson ? JSON.stringify(partner.policyJson, null, 2) : "",
      createdBy: partner.createdBy.name || partner.createdBy.email || "Unknown user",
      rowVersion: partner.rowVersion,
    })),
    partnerTerms: partnerTerms.map((term: any) => ({
      id: term.id,
      legalEntityId: term.legalEntityId,
      partnerId: term.partnerId,
      partnerLabel: `${term.partner.partnerCode} — ${term.partner.partnerName}`,
      version: term.version,
      profitSharingRatio: term.profitSharingRatio.toString(),
      interestOnCapitalRate: term.interestOnCapitalRate?.toString() ?? null,
      interestOnDrawingsRate: term.interestOnDrawingsRate?.toString() ?? null,
      salaryAmount: term.salaryAmount?.toString() ?? null,
      salaryExpenseAccountId: term.salaryExpenseAccountId,
      salaryExpenseAccountLabel: term.salaryExpenseAccount
        ? `${term.salaryExpenseAccount.accountCode} — ${term.salaryExpenseAccount.accountName}`
        : null,
      interestExpenseAccountId: term.interestExpenseAccountId,
      interestExpenseAccountLabel: term.interestExpenseAccount
        ? `${term.interestExpenseAccount.accountCode} — ${term.interestExpenseAccount.accountName}`
        : null,
      interestIncomeAccountId: term.interestIncomeAccountId,
      interestIncomeAccountLabel: term.interestIncomeAccount
        ? `${term.interestIncomeAccount.accountCode} — ${term.interestIncomeAccount.accountName}`
        : null,
      configurationJson: term.configuration ? JSON.stringify(term.configuration, null, 2) : "",
      approvedByCA: term.approvedByCA,
      effectiveFrom: iso(term.effectiveFrom)!,
      effectiveTo: iso(term.effectiveTo),
      isActive: term.isActive,
      rowVersion: term.rowVersion,
    })),
    appropriations: appropriations.map((entry: any) => ({
      id: entry.id,
      legalEntityId: entry.legalEntityId,
      partnerId: entry.partnerId,
      termId: entry.termId,
      partnerLabel: `${entry.partner.partnerCode} — ${entry.partner.partnerName}`,
      termLabel: `v${entry.term.version}`,
      appropriationType: entry.appropriationType,
      periodStart: iso(entry.periodStart)!,
      periodEnd: iso(entry.periodEnd)!,
      amount: entry.amount.toString(),
      basisJson: entry.basis ? JSON.stringify(entry.basis, null, 2) : "",
      status: entry.status,
      journalEntryId: entry.journalEntryId,
      journalEntryLabel: entry.journalEntry?.voucherNo ?? null,
      idempotencyKey: entry.idempotencyKey,
      createdBy: entry.createdBy.name || entry.createdBy.email || "Unknown user",
      rowVersion: entry.rowVersion,
    })),
    budgets: budgets.map((budget: any) => ({
      id: budget.id,
      legalEntityId: budget.legalEntityId,
      legalEntityLabel: `${budget.legalEntity.code} — ${budget.legalEntity.legalName}`,
      fiscalYearId: budget.fiscalYearId,
      fiscalYearLabel: budget.fiscalYear.name,
      fiscalYearStart: iso(budget.fiscalYear.startDate)!,
      fiscalYearEnd: iso(budget.fiscalYear.endDate)!,
      scenarioCode: budget.scenarioCode,
      name: budget.name,
      version: budget.version,
      currencyCode: budget.currencyCode,
      periodGranularity: budget.periodGranularity,
      configurationJson: budget.configuration
        ? JSON.stringify(budget.configuration, null, 2)
        : "",
      approvedByMgmt: budget.approvedByMgmt,
      isActive: budget.isActive,
      effectiveFrom: iso(budget.effectiveFrom)!,
      effectiveTo: iso(budget.effectiveTo),
      lineCount: budget.lines.length,
      createdBy: budget.createdBy.name || budget.createdBy.email || "Unknown user",
      rowVersion: budget.rowVersion,
    })),
    budgetLines: budgetLines.map((line: any) => ({
      id: line.id,
      budgetId: line.budgetId,
      budgetLabel: `${line.budget.name} · ${line.budget.scenarioCode} · v${line.budget.version}`,
      legalEntityId: line.legalEntityId,
      legalEntityLabel: `${line.legalEntity.code} — ${line.legalEntity.legalName}`,
      lineNumber: line.lineNumber,
      periodStart: iso(line.periodStart)!,
      periodEnd: iso(line.periodEnd)!,
      accountId: line.accountId,
      accountLabel: `${line.account.accountCode} — ${line.account.accountName}`,
      dimensionValueId: line.dimensionValueId,
      dimensionValueLabel: line.dimensionValue
        ? `${line.dimensionValue.definition.code} · ${line.dimensionValue.code} — ${line.dimensionValue.name}`
        : null,
      amount: line.amount.toString(),
      quantity: line.quantity?.toString() ?? null,
      assumptionsJson: line.assumptions
        ? JSON.stringify(line.assumptions, null, 2)
        : "",
      rowVersion: line.rowVersion,
    })),
    customerProfiles: customerProfiles.map((profile: any) => ({
      id: profile.id,
      crmAccountId: profile.crmAccountId,
      customerLabel: profile.crmAccount.name,
      customerGstin: profile.crmAccount.gstin,
      receivableAccountId: profile.receivableAccountId,
      receivableAccountLabel: `${profile.receivableAccount.accountCode} — ${profile.receivableAccount.accountName}`,
      currencyCode: profile.currencyCode,
      creditLimit: profile.creditLimit?.toString() ?? null,
      paymentTermsDays: profile.paymentTermsDays,
      collectionPolicyVersion: profile.collectionPolicyVersion,
      dunningPolicyCode: profile.dunningPolicyCode,
      creditHold: profile.creditHold,
      statementDeliveryMode: profile.statementDeliveryMode,
      configurationJson: profile.configuration
        ? JSON.stringify(profile.configuration, null, 2)
        : "",
      isActive: profile.isActive,
      rowVersion: profile.rowVersion,
    })),
    vendorProfiles: vendorProfiles.map((profile: any) => ({
      id: profile.id,
      crmVendorId: profile.crmVendorId,
      vendorLabel: profile.crmVendor.name,
      vendorGstin: profile.crmVendor.gstin,
      payableAccountId: profile.payableAccountId,
      payableAccountLabel: `${profile.payableAccount.accountCode} — ${profile.payableAccount.accountName}`,
      currencyCode: profile.currencyCode,
      paymentTermsDays: profile.paymentTermsDays,
      paymentPolicyVersion: profile.paymentPolicyVersion,
      taxProfileId: profile.taxProfileId,
      taxProfileLabel: profile.taxProfile
        ? `${profile.taxProfile.code} — ${profile.taxProfile.name} · v${profile.taxProfile.version}`
        : null,
      paymentHold: profile.paymentHold,
      paymentMethod: profile.paymentMethod,
      configurationJson: profile.configuration
        ? JSON.stringify(profile.configuration, null, 2)
        : "",
      isActive: profile.isActive,
      rowVersion: profile.rowVersion,
    })),
    paymentTerms: paymentTerms.map((term: any) => ({
      id: term.id,
      code: term.code,
      name: term.name,
      dueDays: term.dueDays,
      earlyDiscountDays: term.earlyDiscountDays,
      earlyDiscountPercent: term.earlyDiscountPercent?.toString() ?? null,
      configurationJson: term.configuration
        ? JSON.stringify(term.configuration, null, 2)
        : "",
      isActive: term.isActive,
      rowVersion: term.rowVersion,
    })),
    paymentMethods: paymentMethods.map((method: any) => ({
      id: method.id,
      code: method.code,
      name: method.name,
      methodType: method.methodType,
      clearingAccountId: method.clearingAccountId,
      clearingAccountLabel: method.clearingAccount
        ? `${method.clearingAccount.accountCode} — ${method.clearingAccount.accountName}`
        : null,
      configurationJson: method.configuration
        ? JSON.stringify(method.configuration, null, 2)
        : "",
      isActive: method.isActive,
      rowVersion: method.rowVersion,
    })),
    priceLists: priceLists.map((priceList: any) => ({
      id: priceList.id,
      code: priceList.code,
      name: priceList.name,
      currencyCode: priceList.currencyCode,
      adjustmentMode: priceList.adjustmentMode,
      defaultAdjustmentPercent:
        priceList.defaultAdjustmentPercent?.toString() ?? null,
      configurationJson: priceList.configuration
        ? JSON.stringify(priceList.configuration, null, 2)
        : "",
      isActive: priceList.isActive,
      rowVersion: priceList.rowVersion,
    })),
    unitsOfMeasure: unitsOfMeasure.map((unit: any) => ({
      id: unit.id,
      code: unit.code,
      name: unit.name,
      symbol: unit.symbol,
      decimalPlaces: unit.decimalPlaces,
      configurationJson: unit.configuration
        ? JSON.stringify(unit.configuration, null, 2)
        : "",
      isActive: unit.isActive,
      rowVersion: unit.rowVersion,
    })),
    reportingTags: reportingTags.map((tag: any) => ({
      id: tag.id,
      code: tag.code,
      name: tag.name,
      description: tag.description,
      configurationJson: tag.configuration
        ? JSON.stringify(tag.configuration, null, 2)
        : "",
      isActive: tag.isActive,
      rowVersion: tag.rowVersion,
    })),
    sourceMappingProfiles: sourceMappingProfiles.map((profile: any) => ({
      id: profile.id,
      legalEntityId: profile.legalEntityId,
      legalEntityLabel: profile.legalEntity
        ? `${profile.legalEntity.code} — ${profile.legalEntity.legalName}`
        : "Organisation scope",
      sourceSystem: profile.sourceSystem,
      sourceType: profile.sourceType,
      profileCode: profile.profileCode,
      targetModule: profile.targetModule,
      targetDocumentType: profile.targetDocumentType,
      configurationJson: profile.configuration
        ? JSON.stringify(profile.configuration, null, 2)
        : "",
      isActive: profile.isActive,
      rowVersion: profile.rowVersion,
    })),
    integrationInbox: integrationInbox.map((entry: any) => ({
      id: entry.id,
      legalEntityLabel: entry.legalEntity
        ? `${entry.legalEntity.code} — ${entry.legalEntity.legalName}`
        : "Organisation scope",
      sourceSystem: entry.sourceSystem,
      messageType: entry.messageType,
      messageVersion: entry.messageVersion,
      sourceSnapshotId: entry.sourceSnapshotId,
      requestId: entry.requestId,
      idempotencyKey: entry.idempotencyKey,
      status: entry.status,
      attemptCount: entry.attemptCount,
      processedRecordType: entry.processedRecordType,
      processedRecordId: entry.processedRecordId,
      lastErrorCode: entry.lastErrorCode,
      createdAt: entry.createdAt.toISOString(),
      availableAt: entry.availableAt.toISOString(),
      rowVersion: entry.rowVersion,
    })),
    integrationOutbox: integrationOutbox.map((entry: any) => ({
      id: entry.id,
      legalEntityLabel: entry.legalEntity
        ? `${entry.legalEntity.code} — ${entry.legalEntity.legalName}`
        : "Organisation scope",
      destination: entry.destination,
      eventType: entry.eventType,
      aggregateType: entry.aggregateType,
      aggregateId: entry.aggregateId,
      status: entry.status,
      attemptCount: entry.attemptCount,
      publicationResultCode: entry.publicationResultCode,
      lastErrorCode: entry.lastErrorCode,
      createdAt: entry.createdAt.toISOString(),
      availableAt: entry.availableAt.toISOString(),
      publishedAt: entry.publishedAt?.toISOString() ?? null,
      rowVersion: entry.rowVersion,
    })),
    postingAttempts: postingAttempts.map((attempt: any) => ({
      id: attempt.id,
      requestId: attempt.requestId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      sourceLabel: `${attempt.inbox.sourceSystem} · ${attempt.inbox.sourceType} · ${attempt.inbox.sourceId}`,
      journalLabel: attempt.journalEntry?.voucherNo ?? null,
      errorCode: attempt.errorCode,
      errorClassification: attempt.errorClassification,
      startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString() ?? null,
    })),
    payrollRunSnapshots: payrollRunSnapshots.map((snapshot: any) => ({
      id: snapshot.id,
      runId: snapshot.runId,
      runVersion: snapshot.runVersion,
      payPeriodStart: iso(snapshot.payPeriodStart)!,
      payPeriodEnd: iso(snapshot.payPeriodEnd)!,
      currencyCode: snapshot.currencyCode,
      totalDebit: snapshot.totalDebit.toString(),
      totalCredit: snapshot.totalCredit.toString(),
      approvedById: snapshot.approvedById,
      approvedAt: snapshot.approvedAt.toISOString(),
    })),
    periodCloseRuns: periodCloseRuns.map((run: any) => ({
      id: run.id,
      legalEntityId: run.legalEntityId,
      legalEntityLabel: `${run.legalEntity.code} — ${run.legalEntity.legalName}`,
      accountingPeriodId: run.accountingPeriodId,
      periodLabel: `P${run.period.periodNumber} · ${run.period.name}`,
      closeDate: iso(run.closeDate)!,
      status: run.status,
      checklistJson: run.checklist ? JSON.stringify(run.checklist, null, 2) : "",
      reportBundleJson: run.reportBundle
        ? JSON.stringify(run.reportBundle, null, 2)
        : "",
      notes: run.notes,
      closedById: run.closedById,
      closedAt: run.closedAt?.toISOString() ?? null,
      reopenedById: run.reopenedById,
      reopenedAt: run.reopenedAt?.toISOString() ?? null,
      rowVersion: run.rowVersion,
    })),
    reportExportProfiles: reportExportProfiles.map((profile: any) => ({
      id: profile.id,
      legalEntityId: profile.legalEntityId,
      legalEntityLabel: profile.legalEntity
        ? `${profile.legalEntity.code} — ${profile.legalEntity.legalName}`
        : "Organisation scope",
      reportCode: profile.reportCode,
      name: profile.name,
      exportFormat: profile.exportFormat,
      deliveryMode: profile.deliveryMode,
      filtersJson: profile.filters ? JSON.stringify(profile.filters, null, 2) : "",
      isPortalVisible: profile.isPortalVisible,
      isActive: profile.isActive,
      rowVersion: profile.rowVersion,
    })),
    portalPublicationProfiles: portalPublicationProfiles.map((profile: any) => ({
      id: profile.id,
      legalEntityId: profile.legalEntityId,
      legalEntityLabel: profile.legalEntity
        ? `${profile.legalEntity.code} — ${profile.legalEntity.legalName}`
        : "Organisation scope",
      documentType: profile.documentType,
      audienceType: profile.audienceType,
      exportProfileId: profile.exportProfileId,
      exportProfileLabel: profile.exportProfile
        ? `${profile.exportProfile.name} · ${profile.exportProfile.reportCode}`
        : null,
      deliveryMode: profile.deliveryMode,
      retentionDays: profile.retentionDays,
      configurationJson: profile.configuration
        ? JSON.stringify(profile.configuration, null, 2)
        : "",
      isActive: profile.isActive,
      rowVersion: profile.rowVersion,
    })),
    recentDocuments: recentDocuments.map((document: any) => ({
      id: document.id,
      label: `${document.documentType} · ${document.sourceId} · ${document.totalAmount.toString()} · ${iso(document.postingDate)}`,
    })),
    recentJournalEntries: recentJournalEntries.map((entry: any) => ({
      id: entry.id,
      label: `${entry.voucherNo} · ${entry.totalDebit.toString()} · ${iso(entry.postingDate)}`,
    })),
    customers: customers.map((customer: any) => ({
      id: customer.id,
      name: customer.name,
      gstin: customer.gstin,
      currency: customer.currency,
      paymentTerms: customer.paymentTerms,
      creditLimit: customer.creditLimit,
    })),
    vendors: vendors.map((vendor: any) => ({
      id: vendor.id,
      name: vendor.name,
      gstin: vendor.gstin,
    })),
    counterpartyScopes: counterpartyScopes.map((scope: any) => ({
      id: scope.id,
      legalEntityId: scope.legalEntityId,
      legalEntityLabel: `${scope.legalEntity.code} — ${scope.legalEntity.legalName}`,
      partyType: scope.partyType,
      partyId: scope.partyId,
      partyLabel:
        scope.partyType === "CUSTOMER"
          ? customers.find((customer: any) => customer.id === scope.partyId)?.name ??
            scope.partyId
          : vendors.find((vendor: any) => vendor.id === scope.partyId)?.name ??
            scope.partyId,
      version: scope.version,
      isActive: scope.isActive,
      effectiveFrom: iso(scope.effectiveFrom)!,
      effectiveTo: iso(scope.effectiveTo),
      approvedById: scope.approvedById,
      approvedAt: scope.approvedAt.toISOString(),
      rowVersion: scope.rowVersion,
    })),
    dimensionDefinitions: dimensionDefinitions.map((definition: any) => ({
      id: definition.id,
      code: definition.code,
      name: definition.name,
      valueSource: definition.valueSource,
      isRequired: definition.isRequired,
      isActive: definition.isActive,
      rowVersion: definition.rowVersion,
      values: definition.values.map((value: any) => ({
        id: value.id,
        definitionId: value.definitionId,
        code: value.code,
        name: value.name,
        canonicalType: value.canonicalType,
        canonicalId: value.canonicalId,
        effectiveFrom: iso(value.effectiveFrom),
        effectiveTo: iso(value.effectiveTo),
        isActive: value.isActive,
        rowVersion: value.rowVersion,
      })),
    })),
    numberSeries: numberSeries.map((series: any) => ({
      id: series.id,
      taxRegistrationId: series.taxRegistrationId,
      taxRegistrationLabel: series.taxRegistration
        ? `${series.taxRegistration.registrationType} · ${series.taxRegistration.registrationCode}`
        : "Organisation-wide",
      documentType: series.documentType,
      prefixTemplate: series.prefixTemplate,
      nextNumber: series.nextNumber.toString(),
      padding: series.padding,
      effectiveFrom: iso(series.effectiveFrom)!,
      effectiveTo: iso(series.effectiveTo),
      isActive: series.isActive,
      rowVersion: series.rowVersion,
    })),
    approvalPolicies: approvalPolicies.map((policy: any) => ({
      id: policy.id,
      code: policy.code,
      documentType: policy.documentType,
      version: policy.version,
      configurationJson: JSON.stringify(policy.configuration, null, 2),
      isActive: policy.isActive,
      effectiveFrom: iso(policy.effectiveFrom),
      effectiveTo: iso(policy.effectiveTo),
      rowVersion: policy.rowVersion,
    })),
    documentPolicies: documentPolicies.map((policy: any) => ({
      id: policy.id,
      legalEntityId: policy.legalEntityId,
      legalEntityLabel: `${policy.legalEntity.code} — ${policy.legalEntity.legalName}`,
      documentType: policy.documentType,
      version: policy.version,
      configurationJson: JSON.stringify(policy.configuration, null, 2),
      configurationHash: policy.configurationHash,
      statutoryValidated: policy.statutoryValidated,
      effectiveFrom: iso(policy.effectiveFrom)!,
      effectiveTo: iso(policy.effectiveTo),
      isActive: policy.isActive,
      rowVersion: policy.rowVersion,
    })),
    taxProfiles: taxProfiles.map((profile: any) => ({
      id: profile.id,
      legalEntityId: profile.legalEntityId,
      legalEntityLabel: profile.legalEntity
        ? `${profile.legalEntity.code} — ${profile.legalEntity.legalName}`
        : "Registration default",
      taxRegistrationId: profile.taxRegistrationId,
      taxRegistrationLabel: `${profile.taxRegistration.registrationType} · ${profile.taxRegistration.registrationCode}`,
      code: profile.code,
      name: profile.name,
      version: profile.version,
      configurationJson: profile.configuration
        ? JSON.stringify(profile.configuration, null, 2)
        : "",
      statutoryValidated: profile.statutoryValidated,
      effectiveFrom: iso(profile.effectiveFrom)!,
      effectiveTo: iso(profile.effectiveTo),
      isActive: profile.isActive,
      rowVersion: profile.rowVersion,
    })),
    taxRules: taxRules.map((rule: any) => ({
      id: rule.id,
      taxProfileId: rule.taxProfileId,
      taxProfileLabel: `${rule.taxProfile.code} — ${rule.taxProfile.name}`,
      legalEntityId: rule.legalEntityId,
      legalEntityLabel: rule.legalEntity
        ? `${rule.legalEntity.code} — ${rule.legalEntity.legalName}`
        : "Registration default",
      taxRegistrationId: rule.taxRegistrationId,
      taxRegistrationLabel: `${rule.taxRegistration.registrationType} · ${rule.taxRegistration.registrationCode}`,
      code: rule.code,
      documentType: rule.documentType,
      placeOfSupplyType: rule.placeOfSupplyType,
      counterpartyTreatment: rule.counterpartyTreatment,
      supplyCategory: rule.supplyCategory,
      version: rule.version,
      configurationJson: JSON.stringify(rule.configuration, null, 2),
      statutoryValidated: rule.statutoryValidated,
      effectiveFrom: iso(rule.effectiveFrom)!,
      effectiveTo: iso(rule.effectiveTo),
      isActive: rule.isActive,
      rowVersion: rule.rowVersion,
      componentsJson: JSON.stringify(
        rule.components.map((component: any) => ({
          componentCode: component.componentCode,
          componentType: component.componentType,
          ratePercent: component.ratePercent.toString(),
          recoverablePercent: component.recoverablePercent?.toString() ?? null,
          ledgerAccountRole: component.ledgerAccountRole,
          position: component.position,
          configuration: component.configuration ?? null,
          rowVersion: component.rowVersion,
        })),
        null,
        2,
      ),
      components: rule.components.map((component: any) => ({
        id: component.id,
        componentCode: component.componentCode,
        componentType: component.componentType,
        ratePercent: component.ratePercent.toString(),
        recoverablePercent: component.recoverablePercent?.toString() ?? null,
        ledgerAccountRole: component.ledgerAccountRole,
        position: component.position,
        rowVersion: component.rowVersion,
      })),
    })),
    statutoryReturnProfiles: statutoryReturnProfiles.map((profile: any) => ({
      id: profile.id,
      legalEntityId: profile.legalEntityId,
      legalEntityLabel: profile.legalEntity
        ? `${profile.legalEntity.code} — ${profile.legalEntity.legalName}`
        : "Registration default",
      taxRegistrationId: profile.taxRegistrationId,
      taxRegistrationLabel: `${profile.taxRegistration.registrationType} · ${profile.taxRegistration.registrationCode}`,
      returnType: profile.returnType,
      filingFrequency: profile.filingFrequency,
      dueDayOfMonth: profile.dueDayOfMonth,
      configurationJson: profile.configuration
        ? JSON.stringify(profile.configuration, null, 2)
        : "",
      statutoryValidated: profile.statutoryValidated,
      effectiveFrom: iso(profile.effectiveFrom)!,
      effectiveTo: iso(profile.effectiveTo),
      isActive: profile.isActive,
      rowVersion: profile.rowVersion,
    })),
    statutoryFilingPeriods: statutoryFilingPeriods.map((period: any) => ({
      id: period.id,
      profileId: period.profileId,
      profileLabel: `${period.profile.returnType} · ${period.profile.filingFrequency}`,
      legalEntityId: period.legalEntityId,
      legalEntityLabel: period.legalEntity
        ? `${period.legalEntity.code} — ${period.legalEntity.legalName}`
        : "Registration default",
      taxRegistrationId: period.taxRegistrationId,
      taxRegistrationLabel: `${period.taxRegistration.registrationType} · ${period.taxRegistration.registrationCode}`,
      returnType: period.returnType,
      periodStart: iso(period.periodStart)!,
      periodEnd: iso(period.periodEnd)!,
      dueDate: iso(period.dueDate),
      status: period.status,
      acknowledgementRef: period.acknowledgementRef,
      filedAt: period.filedAt?.toISOString() ?? null,
      filedBy:
        period.filedBy?.name || period.filedBy?.email || null,
      configurationJson: period.configuration
        ? JSON.stringify(period.configuration, null, 2)
        : "",
      rowVersion: period.rowVersion,
    })),
    audit: audit
      .filter((entry: any) => AUDITED_CONFIGURATION_ENTITY_TYPES.has(entry.entityType))
      .map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actor: entry.user.name || entry.user.email || "Unknown user",
        timestamp: entry.timestamp.toISOString(),
        beforeValues: entry.beforeValues ?? null,
        afterValues: entry.afterValues ?? null,
      })),
    integrationDestinations: ACCOUNTING_INTEGRATION_DESTINATIONS.map(
      (destination) => ({
        code: destination.code,
        kind: destination.kind,
        status: destination.status,
        seenInOutbox: liveOutboxDestinations.some(
          (row: any) => row.destination === destination.code,
        ),
      }),
    ),
    entityTypes: ACCOUNTING_ENTITY_TYPES,
    inventoryModes: ACCOUNTING_INVENTORY_MODES,
    legalEntityStatuses: ACCOUNTING_LEGAL_ENTITY_STATUSES,
    registrationTypes: ACCOUNTING_REGISTRATION_TYPES,
    dimensionValueSources: ACCOUNTING_DIMENSION_VALUE_SOURCES,
    approvalPolicyDocumentTypes: ACCOUNTING_APPROVAL_DOCUMENT_TYPES,
    counterpartyTypes: ACCOUNTING_COUNTERPARTY_TYPES,
    documentPolicyTypes: ACCOUNTING_DOCUMENT_POLICY_TYPES,
    taxRuleDocumentTypes: ACCOUNTING_TAX_RULE_DOCUMENT_TYPES,
    taxRulePlaceOfSupplyTypes: ACCOUNTING_TAX_RULE_PLACE_OF_SUPPLY_TYPES,
    taxRuleCounterpartyTreatments:
      ACCOUNTING_TAX_RULE_COUNTERPARTY_TREATMENTS,
    taxRuleSupplyCategories: ACCOUNTING_TAX_RULE_SUPPLY_CATEGORIES,
    taxComponentTypes: ACCOUNTING_TAX_COMPONENT_TYPES,
    statutoryReturnTypes: ACCOUNTING_STATUTORY_RETURN_TYPES,
    statutoryFilingFrequencies: ACCOUNTING_STATUTORY_FILING_FREQUENCIES,
    statutoryFilingStatuses: ACCOUNTING_STATUTORY_FILING_STATUSES,
    bankStatementImportStatuses: ACCOUNTING_BANK_STATEMENT_IMPORT_STATUSES,
    reconciliationSessionStatuses: ACCOUNTING_RECONCILIATION_SESSION_STATUSES,
    bankReconciliationLineStatuses: ACCOUNTING_BANK_RECONCILIATION_LINE_STATUSES,
    bankMatchTargetTypes: ACCOUNTING_BANK_MATCH_TARGET_TYPES,
    recurringSourceTypes: ACCOUNTING_RECURRING_SOURCE_TYPES,
    recurringDocumentTypes: ACCOUNTING_RECURRING_DOCUMENT_TYPES,
    recurringScheduleModes: ACCOUNTING_RECURRING_SCHEDULE_MODES,
    recurringCadences: ACCOUNTING_RECURRING_CADENCES,
    recurringCatchUpModes: ACCOUNTING_RECURRING_CATCH_UP_MODES,
    recurringRunStatuses: ACCOUNTING_RECURRING_RUN_STATUSES,
    financialAssetStatuses: ACCOUNTING_FINANCIAL_ASSET_STATUSES,
    assetBookTypes: ACCOUNTING_ASSET_BOOK_TYPES,
    assetDepreciationMethods: ACCOUNTING_ASSET_DEPRECIATION_METHODS,
    depreciationRunStatuses: ACCOUNTING_DEPRECIATION_RUN_STATUSES,
    partnerStatuses: ACCOUNTING_PARTNER_STATUSES,
    appropriationTypes: ACCOUNTING_APPROPRIATION_TYPES,
    appropriationStatuses: ACCOUNTING_APPROPRIATION_STATUSES,
    budgetScenarioCodes: ACCOUNTING_BUDGET_SCENARIO_CODES,
    budgetPeriodGranularities: ACCOUNTING_BUDGET_PERIOD_GRANULARITIES,
    customerStatementDeliveryModes:
      ACCOUNTING_CUSTOMER_STATEMENT_DELIVERY_MODES,
    paymentMethodTypes: ACCOUNTING_PAYMENT_METHOD_TYPES,
    priceListAdjustmentModes: ACCOUNTING_PRICE_LIST_ADJUSTMENT_MODES,
    sourceTargetModules: ACCOUNTING_SOURCE_TARGET_MODULES,
    periodCloseRunStatuses: ACCOUNTING_PERIOD_CLOSE_RUN_STATUSES,
    reportExportFormats: ACCOUNTING_REPORT_EXPORT_FORMATS,
    deliveryModes: ACCOUNTING_DELIVERY_MODES,
    portalAudienceTypes: ACCOUNTING_PORTAL_AUDIENCE_TYPES,
  };
}

export async function saveAccountingBankAccount(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  taxRegistrationId?: string | null;
  ledgerAccountId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  bankName: string;
  branchName?: string | null;
  accountNumberMasked: string;
  ifsc?: string | null;
  currencyCode: string;
  isPrimary: boolean;
  configurationJson?: string | null;
  statutoryValidated: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_BANK_ACCOUNT_CODE_INVALID",
  );
  const name = String(input.name ?? "").trim();
  const bankName = String(input.bankName ?? "").trim();
  const accountNumberMasked = String(input.accountNumberMasked ?? "").trim();
  if (!name) throw new Error("CONFIGURATION_BANK_ACCOUNT_NAME_REQUIRED");
  if (!bankName) throw new Error("CONFIGURATION_BANK_NAME_REQUIRED");
  if (!accountNumberMasked) {
    throw new Error("CONFIGURATION_BANK_ACCOUNT_MASK_REQUIRED");
  }
  const currencyCode = assertCurrencyCode(input.currencyCode);
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_BANK_ACCOUNT_EFFECTIVE_FROM_REQUIRED",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_BANK_ACCOUNT_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_BANK_ACCOUNT_EFFECTIVE_RANGE_INVALID");
  }
  const configuration = String(input.configurationJson ?? "").trim()
    ? JSON.parse(String(input.configurationJson))
    : null;
  const legalEntity = await db.accountingLegalEntity.findFirst({
    where: { id: input.legalEntityId, orgId: input.orgId },
  });
  if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  if (input.taxRegistrationId) {
    const registration = await db.accountingTaxRegistration.findFirst({
      where: {
        id: input.taxRegistrationId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
      },
    });
    if (!registration) {
      throw new Error("CONFIGURATION_TAX_REGISTRATION_NOT_FOUND");
    }
  }
  const ledgerAccount = await db.account.findFirst({
    where: {
      id: input.ledgerAccountId,
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      isActive: true,
      isGroup: false,
      accountType: "BANK",
    },
  });
  if (!ledgerAccount) {
    throw new Error("CONFIGURATION_BANK_LEDGER_ACCOUNT_INVALID");
  }

  if (input.id) {
    const existing = await db.accountingBankAccount.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_BANK_ACCOUNT_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingBankAccount.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId,
        taxRegistrationId: input.taxRegistrationId || null,
        ledgerAccountId: input.ledgerAccountId,
        code,
        name,
        bankName,
        branchName: String(input.branchName ?? "").trim() || null,
        accountNumberMasked,
        ifsc: String(input.ifsc ?? "").trim() || null,
        currencyCode,
        isPrimary: input.isPrimary,
        configuration: configuration ?? undefined,
        statutoryValidated: input.statutoryValidated,
        effectiveFrom,
        effectiveTo,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_BANK_ACCOUNT_UPDATED",
      entityType: "AccountingBankAccount",
      entityId: updated.id,
      beforeValues: {
        code: existing.code,
        name: existing.name,
        bankName: existing.bankName,
        currencyCode: existing.currencyCode,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        code: updated.code,
        name: updated.name,
        bankName: updated.bankName,
        currencyCode: updated.currencyCode,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingBankAccount.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      taxRegistrationId: input.taxRegistrationId || null,
      ledgerAccountId: input.ledgerAccountId,
      code,
      name,
      bankName,
      branchName: String(input.branchName ?? "").trim() || null,
      accountNumberMasked,
      ifsc: String(input.ifsc ?? "").trim() || null,
      currencyCode,
      isPrimary: input.isPrimary,
      configuration: configuration ?? undefined,
      statutoryValidated: input.statutoryValidated,
      effectiveFrom,
      effectiveTo,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_BANK_ACCOUNT_CREATED",
    entityType: "AccountingBankAccount",
    entityId: created.id,
    afterValues: {
      code: created.code,
      name: created.name,
      bankName: created.bankName,
      currencyCode: created.currencyCode,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingBankStatementImport(input: {
  id?: string;
  orgId: string;
  actorId: string;
  bankAccountId: string;
  expectedVersion?: number;
  sourceFileName: string;
  sourceFileHash?: string | null;
  sourceFormat: string;
  statementStart?: string | null;
  statementEnd?: string | null;
  openingBalance?: string | null;
  closingBalance?: string | null;
  importStatus: string;
  linesJson: string;
  importExceptionsJson?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const sourceFileName = String(input.sourceFileName ?? "").trim();
  const sourceFormat = String(input.sourceFormat ?? "").trim().toUpperCase();
  if (!sourceFileName) {
    throw new Error("CONFIGURATION_BANK_STATEMENT_SOURCE_FILE_REQUIRED");
  }
  if (!sourceFormat) {
    throw new Error("CONFIGURATION_BANK_STATEMENT_SOURCE_FORMAT_REQUIRED");
  }
  const importStatus = assertBankStatementImportStatus(input.importStatus);
  const statementStart = parseDate(
    input.statementStart,
    "CONFIGURATION_BANK_STATEMENT_START_INVALID",
  );
  const statementEnd = parseDate(
    input.statementEnd,
    "CONFIGURATION_BANK_STATEMENT_END_INVALID",
  );
  if (statementStart && statementEnd && statementEnd < statementStart) {
    throw new Error("CONFIGURATION_BANK_STATEMENT_RANGE_INVALID");
  }
  const openingBalance = optionalDecimalString(
    input.openingBalance,
    "CONFIGURATION_BANK_STATEMENT_OPENING_BALANCE_INVALID",
  );
  const closingBalance = optionalDecimalString(
    input.closingBalance,
    "CONFIGURATION_BANK_STATEMENT_CLOSING_BALANCE_INVALID",
  );
  const lines = parseBankStatementLinesJson(input.linesJson);
  const importExceptions =
    parseJsonObject(
      input.importExceptionsJson,
      "CONFIGURATION_BANK_STATEMENT_IMPORT_EXCEPTIONS_JSON_INVALID",
    ) ??
    (lines.some((line) => line.importExceptionCode)
      ? {
          exceptionCount: lines.filter((line) => line.importExceptionCode).length,
          exceptions: lines
            .filter((line) => line.importExceptionCode)
            .map((line) => ({
              sequenceNumber: line.sequenceNumber,
              code: line.importExceptionCode,
            })),
        }
      : null);
  const bankAccount = await db.accountingBankAccount.findFirst({
    where: { id: input.bankAccountId, orgId: input.orgId },
  });
  if (!bankAccount) throw new Error("CONFIGURATION_BANK_ACCOUNT_NOT_FOUND");
  const sourceFileHash =
    String(input.sourceFileHash ?? "").trim() ||
    buildStatementImportHash({
      sourceFileName,
      sourceFormat,
      statementStart: input.statementStart ?? null,
      statementEnd: input.statementEnd ?? null,
      openingBalance,
      closingBalance,
      linesJson: input.linesJson,
    });

  const lineCreateData = lines.map((line) => ({
    orgId: input.orgId,
    legalEntityId: bankAccount.legalEntityId,
    bankAccountId: bankAccount.id,
    lineDate: line.lineDate,
    valueDate: line.valueDate,
    sequenceNumber: line.sequenceNumber,
    reference: line.reference,
    description: line.description,
    debitAmount: line.debitAmount,
    creditAmount: line.creditAmount,
    runningBalance: line.runningBalance,
    importExceptionCode: line.importExceptionCode,
    reconciliationStatus: line.importExceptionCode ? "EXCEPTION" : "UNMATCHED",
    canonicalTargetType: line.canonicalTargetType,
    canonicalTargetIdentifier: line.canonicalTargetIdentifier,
    rawPayload: line.rawPayload,
  }));

  if (input.id) {
    const existing = await db.accountingBankStatementImport.findFirst({
      where: { id: input.id, orgId: input.orgId },
      include: {
        reconciliationSessions: { select: { id: true } },
        lines: {
          include: {
            matches: { select: { id: true } },
          },
        },
      },
    });
    if (!existing) {
      throw new Error("CONFIGURATION_BANK_STATEMENT_IMPORT_NOT_FOUND");
    }
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    if (
      existing.reconciliationSessions.length > 0 ||
      existing.lines.some((line: any) => line.matches.length > 0)
    ) {
      throw new Error("CONFIGURATION_BANK_STATEMENT_IMPORT_LOCKED");
    }
    const updated = await db.$transaction(async (tx: any) => {
      await tx.accountingBankStatementLine.deleteMany({
        where: { importId: existing.id },
      });
      const importRecord = await tx.accountingBankStatementImport.update({
        where: { id: existing.id },
        data: {
          legalEntityId: bankAccount.legalEntityId,
          bankAccountId: bankAccount.id,
          sourceFileName,
          sourceFileHash,
          sourceFormat,
          statementStart,
          statementEnd,
          openingBalance,
          closingBalance,
          importStatus,
          importExceptions: importExceptions ?? undefined,
          rowVersion: { increment: 1 },
        },
      });
      await tx.accountingBankStatementLine.createMany({
        data: lineCreateData.map((line) => ({
          ...line,
          importId: existing.id,
        })),
      });
      return importRecord;
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_BANK_STATEMENT_IMPORT_UPDATED",
      entityType: "AccountingBankStatementImport",
      entityId: updated.id,
      beforeValues: {
        sourceFileName: existing.sourceFileName,
        sourceFileHash: existing.sourceFileHash,
        importStatus: existing.importStatus,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        sourceFileName: updated.sourceFileName,
        sourceFileHash: updated.sourceFileHash,
        importStatus: updated.importStatus,
        lineCount: lines.length,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.$transaction(async (tx: any) => {
    const importRecord = await tx.accountingBankStatementImport.create({
      data: {
        orgId: input.orgId,
        legalEntityId: bankAccount.legalEntityId,
        bankAccountId: bankAccount.id,
        sourceFileName,
        sourceFileHash,
        sourceFormat,
        statementStart,
        statementEnd,
        openingBalance,
        closingBalance,
        importStatus,
        importExceptions: importExceptions ?? undefined,
        importedById: input.actorId,
      },
    });
    await tx.accountingBankStatementLine.createMany({
      data: lineCreateData.map((line) => ({
        ...line,
        importId: importRecord.id,
      })),
    });
    return importRecord;
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_BANK_STATEMENT_IMPORT_CREATED",
    entityType: "AccountingBankStatementImport",
    entityId: created.id,
    afterValues: {
      sourceFileName: created.sourceFileName,
      sourceFileHash: created.sourceFileHash,
      importStatus: created.importStatus,
      lineCount: lines.length,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingReconciliationSession(input: {
  id?: string;
  orgId: string;
  actorId: string;
  bankAccountId: string;
  statementImportId: string;
  expectedVersion?: number;
  periodStart: string;
  periodEnd: string;
  statementClosingBalance?: string | null;
  ledgerClosingBalance?: string | null;
  status: string;
  proofJson?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const periodStart = parseRequiredDate(
    input.periodStart,
    "CONFIGURATION_RECONCILIATION_PERIOD_START_REQUIRED",
  );
  const periodEnd = parseRequiredDate(
    input.periodEnd,
    "CONFIGURATION_RECONCILIATION_PERIOD_END_REQUIRED",
  );
  if (periodEnd < periodStart) {
    throw new Error("CONFIGURATION_RECONCILIATION_PERIOD_RANGE_INVALID");
  }
  const status = assertReconciliationSessionStatus(input.status);
  const proof = parseJsonObject(
    input.proofJson,
    "CONFIGURATION_RECONCILIATION_PROOF_JSON_INVALID",
  );
  const bankAccount = await db.accountingBankAccount.findFirst({
    where: { id: input.bankAccountId, orgId: input.orgId },
  });
  if (!bankAccount) throw new Error("CONFIGURATION_BANK_ACCOUNT_NOT_FOUND");
  const statementImport = await db.accountingBankStatementImport.findFirst({
    where: {
      id: input.statementImportId,
      orgId: input.orgId,
      bankAccountId: input.bankAccountId,
    },
  });
  if (!statementImport) {
    throw new Error("CONFIGURATION_BANK_STATEMENT_IMPORT_NOT_FOUND");
  }
  const statementClosingBalance =
    optionalDecimalString(
      input.statementClosingBalance,
      "CONFIGURATION_RECONCILIATION_STATEMENT_BALANCE_INVALID",
    ) ?? statementImport.closingBalance?.toString() ?? null;
  const ledgerClosingBalance = optionalDecimalString(
    input.ledgerClosingBalance,
    "CONFIGURATION_RECONCILIATION_LEDGER_BALANCE_INVALID",
  );
  const differenceAmount =
    statementClosingBalance != null && ledgerClosingBalance != null
      ? (
          Number(statementClosingBalance) - Number(ledgerClosingBalance)
        ).toFixed(8)
      : null;
  if (status === "BALANCED" && differenceAmount !== "0.00000000") {
    throw new Error("CONFIGURATION_RECONCILIATION_BALANCE_PROOF_REQUIRED");
  }

  const completionData =
    status === "OPEN"
      ? { completedById: null, completedAt: null }
      : { completedById: input.actorId, completedAt: new Date() };

  if (input.id) {
    const existing = await db.accountingReconciliationSession.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) {
      throw new Error("CONFIGURATION_RECONCILIATION_SESSION_NOT_FOUND");
    }
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingReconciliationSession.update({
      where: { id: existing.id },
      data: {
        legalEntityId: bankAccount.legalEntityId,
        bankAccountId: bankAccount.id,
        statementImportId: statementImport.id,
        periodStart,
        periodEnd,
        statementClosingBalance,
        ledgerClosingBalance,
        differenceAmount,
        status,
        proof: proof ?? undefined,
        ...completionData,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_RECONCILIATION_SESSION_UPDATED",
      entityType: "AccountingReconciliationSession",
      entityId: updated.id,
      beforeValues: {
        statementImportId: existing.statementImportId,
        status: existing.status,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        statementImportId: updated.statementImportId,
        status: updated.status,
        differenceAmount: updated.differenceAmount?.toString() ?? null,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingReconciliationSession.create({
    data: {
      orgId: input.orgId,
      legalEntityId: bankAccount.legalEntityId,
      bankAccountId: bankAccount.id,
      statementImportId: statementImport.id,
      periodStart,
      periodEnd,
      statementClosingBalance,
      ledgerClosingBalance,
      differenceAmount,
      status,
      proof: proof ?? undefined,
      ...completionData,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_RECONCILIATION_SESSION_CREATED",
    entityType: "AccountingReconciliationSession",
    entityId: created.id,
    afterValues: {
      statementImportId: created.statementImportId,
      status: created.status,
      differenceAmount: created.differenceAmount?.toString() ?? null,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingBankMatch(input: {
  id?: string;
  orgId: string;
  actorId: string;
  sessionId: string;
  statementLineId: string;
  expectedVersion?: number;
  targetType: string;
  targetDocumentId?: string | null;
  targetJournalEntryId?: string | null;
  matchedAmount: string;
  confidenceScore?: string | null;
  reasonCode?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const targetType = assertBankMatchTargetType(input.targetType);
  const matchedAmount = decimalString(input.matchedAmount);
  const confidenceScore = positiveOptionalDecimalString(
    input.confidenceScore,
    "CONFIGURATION_BANK_MATCH_CONFIDENCE_INVALID",
  );
  if (confidenceScore != null && Number(confidenceScore) > 1) {
    throw new Error("CONFIGURATION_BANK_MATCH_CONFIDENCE_RANGE_INVALID");
  }
  const session = await db.accountingReconciliationSession.findFirst({
    where: { id: input.sessionId, orgId: input.orgId },
  });
  if (!session) {
    throw new Error("CONFIGURATION_RECONCILIATION_SESSION_NOT_FOUND");
  }
  const statementLine = await db.accountingBankStatementLine.findFirst({
    where: {
      id: input.statementLineId,
      orgId: input.orgId,
      importId: session.statementImportId,
      bankAccountId: session.bankAccountId,
    },
    include: {
      matches: {
        where: input.id ? { id: { not: input.id } } : undefined,
        select: { matchedAmount: true },
      },
    },
  });
  if (!statementLine) {
    throw new Error("CONFIGURATION_BANK_STATEMENT_LINE_NOT_FOUND");
  }
  const targetDocumentId =
    targetType === "DOCUMENT"
      ? String(input.targetDocumentId ?? "").trim()
      : null;
  const targetJournalEntryId =
    targetType === "JOURNAL_ENTRY"
      ? String(input.targetJournalEntryId ?? "").trim()
      : null;
  if (targetType === "DOCUMENT") {
    if (!targetDocumentId) {
      throw new Error("CONFIGURATION_BANK_MATCH_TARGET_DOCUMENT_REQUIRED");
    }
    const document = await db.accountingDocument.findFirst({
      where: {
        id: targetDocumentId,
        orgId: input.orgId,
        legalEntityId: session.legalEntityId,
        status: "POSTED",
      },
    });
    if (!document) {
      throw new Error("CONFIGURATION_BANK_MATCH_TARGET_DOCUMENT_INVALID");
    }
  }
  if (targetType === "JOURNAL_ENTRY") {
    if (!targetJournalEntryId) {
      throw new Error("CONFIGURATION_BANK_MATCH_TARGET_JOURNAL_REQUIRED");
    }
    const journal = await db.journalEntry.findFirst({
      where: {
        id: targetJournalEntryId,
        orgId: input.orgId,
        legalEntityId: session.legalEntityId,
        status: "POSTED",
      },
    });
    if (!journal) {
      throw new Error("CONFIGURATION_BANK_MATCH_TARGET_JOURNAL_INVALID");
    }
  }
  const existingTotal = statementLine.matches.reduce(
    (sum: number, match: any) => sum + Number(match.matchedAmount.toString()),
    0,
  );
  const nextTotal = (existingTotal + Number(matchedAmount)).toFixed(8);
  const statementAmount = formatStatementLineAmount(statementLine);
  if (Number(nextTotal) - Number(statementAmount) > 0.0000001) {
    throw new Error("CONFIGURATION_BANK_MATCH_AMOUNT_EXCEEDS_STATEMENT_LINE");
  }

  let persisted: any;
  if (input.id) {
    const existing = await db.accountingBankMatch.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_BANK_MATCH_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    persisted = await db.accountingBankMatch.update({
      where: { id: existing.id },
      data: {
        sessionId: session.id,
        statementLineId: statementLine.id,
        targetType,
        targetDocumentId,
        targetJournalEntryId,
        matchedAmount,
        confidenceScore,
        reasonCode: String(input.reasonCode ?? "").trim() || null,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_BANK_MATCH_UPDATED",
      entityType: "AccountingBankMatch",
      entityId: persisted.id,
      beforeValues: {
        targetType: existing.targetType,
        matchedAmount: existing.matchedAmount.toString(),
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        targetType: persisted.targetType,
        matchedAmount: persisted.matchedAmount.toString(),
        rowVersion: persisted.rowVersion,
        reason,
      },
    });
  } else {
    persisted = await db.accountingBankMatch.create({
      data: {
        orgId: input.orgId,
        sessionId: session.id,
        statementLineId: statementLine.id,
        targetType,
        targetDocumentId,
        targetJournalEntryId,
        matchedAmount,
        confidenceScore,
        reasonCode: String(input.reasonCode ?? "").trim() || null,
        createdById: input.actorId,
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_BANK_MATCH_CREATED",
      entityType: "AccountingBankMatch",
      entityId: persisted.id,
      afterValues: {
        targetType: persisted.targetType,
        matchedAmount: persisted.matchedAmount.toString(),
        rowVersion: persisted.rowVersion,
        reason,
      },
    });
  }

  const freshMatches = await db.accountingBankMatch.findMany({
    where: {
      orgId: input.orgId,
      sessionId: session.id,
      statementLineId: statementLine.id,
    },
    select: { matchedAmount: true },
  });
  const matchedTotal = freshMatches
    .reduce(
      (sum: number, match: any) => sum + Number(match.matchedAmount.toString()),
      0,
    )
    .toFixed(8);
  await db.accountingBankStatementLine.update({
    where: { id: statementLine.id },
    data: {
      reconciliationStatus: normalizeStatementLineStatus({
        importExceptionCode: statementLine.importExceptionCode,
        statementAmount,
        matchedAmount: matchedTotal,
      }),
      rowVersion: { increment: 1 },
    },
  });
  return persisted;
}

export async function saveAccountingRecurringTemplate(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  sourceType: string;
  documentType: string;
  version: number;
  scheduleMode: string;
  scheduleConfigJson?: string | null;
  generationPolicyJson?: string | null;
  approvalMode?: string | null;
  autoSubmit: boolean;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_RECURRING_TEMPLATE_CODE_INVALID",
  );
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("CONFIGURATION_RECURRING_TEMPLATE_NAME_REQUIRED");
  if (!Number.isInteger(input.version) || input.version <= 0) {
    throw new Error("CONFIGURATION_RECURRING_TEMPLATE_VERSION_INVALID");
  }
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_RECURRING_TEMPLATE_EFFECTIVE_FROM_REQUIRED",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_RECURRING_TEMPLATE_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_RECURRING_TEMPLATE_EFFECTIVE_RANGE_INVALID");
  }
  const legalEntity = await db.accountingLegalEntity.findFirst({
    where: { id: input.legalEntityId, orgId: input.orgId },
  });
  if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  const sourceType = assertRecurringSourceType(input.sourceType);
  const documentType = assertRecurringDocumentType(input.documentType);
  const scheduleMode = assertRecurringScheduleMode(input.scheduleMode);
  const scheduleConfig = parseJsonObject(
    input.scheduleConfigJson,
    "CONFIGURATION_RECURRING_SCHEDULE_CONFIG_JSON_INVALID",
  );
  const generationPolicy = parseJsonObject(
    input.generationPolicyJson,
    "CONFIGURATION_RECURRING_GENERATION_POLICY_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingRecurringTemplate.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) {
      throw new Error("CONFIGURATION_RECURRING_TEMPLATE_NOT_FOUND");
    }
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingRecurringTemplate.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId,
        code,
        name,
        sourceType,
        documentType,
        version: input.version,
        scheduleMode,
        scheduleConfig: scheduleConfig ?? undefined,
        generationPolicy: generationPolicy ?? undefined,
        approvalMode: String(input.approvalMode ?? "").trim() || null,
        autoSubmit: input.autoSubmit,
        isActive: input.isActive,
        effectiveFrom,
        effectiveTo,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_RECURRING_TEMPLATE_UPDATED",
      entityType: "AccountingRecurringTemplate",
      entityId: updated.id,
      beforeValues: {
        code: existing.code,
        version: existing.version,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        code: updated.code,
        version: updated.version,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingRecurringTemplate.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      code,
      name,
      sourceType,
      documentType,
      version: input.version,
      scheduleMode,
      scheduleConfig: scheduleConfig ?? undefined,
      generationPolicy: generationPolicy ?? undefined,
      approvalMode: String(input.approvalMode ?? "").trim() || null,
      autoSubmit: input.autoSubmit,
      isActive: input.isActive,
      effectiveFrom,
      effectiveTo,
      createdById: input.actorId,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_RECURRING_TEMPLATE_CREATED",
    entityType: "AccountingRecurringTemplate",
    entityId: created.id,
    afterValues: {
      code: created.code,
      version: created.version,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingRecurringSchedule(input: {
  id?: string;
  orgId: string;
  actorId: string;
  templateId: string;
  expectedVersion?: number;
  cadence: string;
  anchorDate: string;
  nextDueDate: string;
  lastProcessedDueDate?: string | null;
  catchUpMode: string;
  scheduleConfigJson?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const template = await db.accountingRecurringTemplate.findFirst({
    where: { id: input.templateId, orgId: input.orgId },
  });
  if (!template) {
    throw new Error("CONFIGURATION_RECURRING_TEMPLATE_NOT_FOUND");
  }
  const cadence = assertRecurringCadence(input.cadence);
  const anchorDate = parseRequiredDate(
    input.anchorDate,
    "CONFIGURATION_RECURRING_ANCHOR_DATE_REQUIRED",
  );
  const nextDueDate = parseRequiredDate(
    input.nextDueDate,
    "CONFIGURATION_RECURRING_NEXT_DUE_DATE_REQUIRED",
  );
  const lastProcessedDueDate = parseDate(
    input.lastProcessedDueDate,
    "CONFIGURATION_RECURRING_LAST_PROCESSED_DATE_INVALID",
  );
  const catchUpMode = assertRecurringCatchUpMode(input.catchUpMode);
  const scheduleConfig = parseJsonObject(
    input.scheduleConfigJson,
    "CONFIGURATION_RECURRING_SCHEDULE_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingRecurringSchedule.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) {
      throw new Error("CONFIGURATION_RECURRING_SCHEDULE_NOT_FOUND");
    }
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingRecurringSchedule.update({
      where: { id: existing.id },
      data: {
        templateId: input.templateId,
        cadence,
        anchorDate,
        nextDueDate,
        lastProcessedDueDate,
        catchUpMode,
        scheduleConfig: scheduleConfig ?? undefined,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_RECURRING_SCHEDULE_UPDATED",
      entityType: "AccountingRecurringSchedule",
      entityId: updated.id,
      beforeValues: {
        cadence: existing.cadence,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        cadence: updated.cadence,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingRecurringSchedule.create({
    data: {
      orgId: input.orgId,
      templateId: input.templateId,
      cadence,
      anchorDate,
      nextDueDate,
      lastProcessedDueDate,
      catchUpMode,
      scheduleConfig: scheduleConfig ?? undefined,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_RECURRING_SCHEDULE_CREATED",
    entityType: "AccountingRecurringSchedule",
    entityId: created.id,
    afterValues: {
      cadence: created.cadence,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingRecurringRun(input: {
  id?: string;
  orgId: string;
  actorId: string;
  templateId: string;
  scheduleId?: string | null;
  expectedVersion?: number;
  dueDate: string;
  runStatus: string;
  generatedRecordType?: string | null;
  generatedRecordId?: string | null;
  resultJson?: string | null;
  idempotencyKey: string;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const template = await db.accountingRecurringTemplate.findFirst({
    where: { id: input.templateId, orgId: input.orgId },
  });
  if (!template) {
    throw new Error("CONFIGURATION_RECURRING_TEMPLATE_NOT_FOUND");
  }
  const scheduleId = String(input.scheduleId ?? "").trim() || null;
  if (scheduleId) {
    const schedule = await db.accountingRecurringSchedule.findFirst({
      where: { id: scheduleId, orgId: input.orgId, templateId: input.templateId },
    });
    if (!schedule) {
      throw new Error("CONFIGURATION_RECURRING_SCHEDULE_NOT_FOUND");
    }
  }
  const dueDate = parseRequiredDate(
    input.dueDate,
    "CONFIGURATION_RECURRING_RUN_DUE_DATE_REQUIRED",
  );
  const runStatus = assertRecurringRunStatus(input.runStatus);
  const idempotencyKey = String(input.idempotencyKey ?? "").trim();
  if (!idempotencyKey) {
    throw new Error("CONFIGURATION_RECURRING_RUN_IDEMPOTENCY_REQUIRED");
  }
  const result = parseJsonObject(
    input.resultJson,
    "CONFIGURATION_RECURRING_RUN_RESULT_JSON_INVALID",
  );
  const completionData =
    runStatus === "PENDING"
      ? { processedById: null, processedAt: null }
      : { processedById: input.actorId, processedAt: new Date() };

  if (input.id) {
    const existing = await db.accountingRecurringRun.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) {
      throw new Error("CONFIGURATION_RECURRING_RUN_NOT_FOUND");
    }
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingRecurringRun.update({
      where: { id: existing.id },
      data: {
        templateId: input.templateId,
        scheduleId,
        dueDate,
        runStatus,
        generatedRecordType: String(input.generatedRecordType ?? "").trim() || null,
        generatedRecordId: String(input.generatedRecordId ?? "").trim() || null,
        result: result ?? undefined,
        idempotencyKey,
        ...completionData,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_RECURRING_RUN_UPDATED",
      entityType: "AccountingRecurringRun",
      entityId: updated.id,
      beforeValues: {
        runStatus: existing.runStatus,
        dueDate: iso(existing.dueDate),
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        runStatus: updated.runStatus,
        dueDate: iso(updated.dueDate),
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingRecurringRun.create({
    data: {
      orgId: input.orgId,
      templateId: input.templateId,
      scheduleId,
      dueDate,
      runStatus,
      generatedRecordType: String(input.generatedRecordType ?? "").trim() || null,
      generatedRecordId: String(input.generatedRecordId ?? "").trim() || null,
      result: result ?? undefined,
      idempotencyKey,
      ...completionData,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_RECURRING_RUN_CREATED",
    entityType: "AccountingRecurringRun",
    entityId: created.id,
    afterValues: {
      runStatus: created.runStatus,
      dueDate: iso(created.dueDate),
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingFinancialAsset(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  legacyAssetId: string;
  expectedVersion?: number;
  assetCode: string;
  assetName: string;
  capitalizationDate: string;
  capitalizationAmount: string;
  salvageValue?: string | null;
  usefulLifeMonths?: number | null;
  sourceAssetVersion?: number | null;
  policyJson?: string | null;
  status: string;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const assetCode = assertDimensionCode(
    input.assetCode,
    "CONFIGURATION_FINANCIAL_ASSET_CODE_INVALID",
  );
  const assetName = String(input.assetName ?? "").trim();
  if (!assetName) throw new Error("CONFIGURATION_FINANCIAL_ASSET_NAME_REQUIRED");
  const capitalizationDate = parseRequiredDate(
    input.capitalizationDate,
    "CONFIGURATION_FINANCIAL_ASSET_CAPITALIZATION_DATE_REQUIRED",
  );
  const capitalizationAmount = decimalString(input.capitalizationAmount);
  const salvageValue = positiveOptionalDecimalString(
    input.salvageValue,
    "CONFIGURATION_FINANCIAL_ASSET_SALVAGE_VALUE_INVALID",
  );
  const legalEntity = await db.accountingLegalEntity.findFirst({
    where: { id: input.legalEntityId, orgId: input.orgId },
  });
  if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  const legacyAsset = await db.asset.findFirst({
    where: { id: input.legacyAssetId, orgId: input.orgId },
  });
  if (!legacyAsset) throw new Error("CONFIGURATION_LEGACY_ASSET_NOT_FOUND");
  const policy = parseJsonObject(
    input.policyJson,
    "CONFIGURATION_FINANCIAL_ASSET_POLICY_JSON_INVALID",
  );
  const status = assertFinancialAssetStatus(input.status);

  if (input.id) {
    const existing = await db.accountingFinancialAsset.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_FINANCIAL_ASSET_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingFinancialAsset.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId,
        legacyAssetId: input.legacyAssetId,
        assetCode,
        assetName,
        capitalizationDate,
        capitalizationAmount,
        salvageValue,
        usefulLifeMonths: input.usefulLifeMonths ?? null,
        sourceAssetVersion: input.sourceAssetVersion ?? null,
        policyJson: policy ?? undefined,
        status,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_FINANCIAL_ASSET_UPDATED",
      entityType: "AccountingFinancialAsset",
      entityId: updated.id,
      beforeValues: {
        assetCode: existing.assetCode,
        status: existing.status,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        assetCode: updated.assetCode,
        status: updated.status,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingFinancialAsset.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      legacyAssetId: input.legacyAssetId,
      assetCode,
      assetName,
      capitalizationDate,
      capitalizationAmount,
      salvageValue,
      usefulLifeMonths: input.usefulLifeMonths ?? null,
      sourceAssetVersion: input.sourceAssetVersion ?? null,
      policyJson: policy ?? undefined,
      status,
      createdById: input.actorId,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_FINANCIAL_ASSET_CREATED",
    entityType: "AccountingFinancialAsset",
    entityId: created.id,
    afterValues: {
      assetCode: created.assetCode,
      status: created.status,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingAssetBook(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  financialAssetId: string;
  expectedVersion?: number;
  bookCode: string;
  bookType: string;
  depreciationMethod: string;
  depreciationRate?: string | null;
  usefulLifeMonths?: number | null;
  capitalizationAmount: string;
  salvageValue?: string | null;
  accumulatedDepreciation: string;
  netBookValue: string;
  assetAccountId?: string | null;
  depreciationExpenseAccountId?: string | null;
  accumulatedDepAccountId?: string | null;
  policyJson?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const bookCode = assertDimensionCode(
    input.bookCode,
    "CONFIGURATION_ASSET_BOOK_CODE_INVALID",
  );
  const financialAsset = await db.accountingFinancialAsset.findFirst({
    where: { id: input.financialAssetId, orgId: input.orgId },
  });
  if (!financialAsset) throw new Error("CONFIGURATION_FINANCIAL_ASSET_NOT_FOUND");
  if (financialAsset.legalEntityId !== input.legalEntityId) {
    throw new Error("CONFIGURATION_ASSET_BOOK_SCOPE_INVALID");
  }
  const legalEntity = await db.accountingLegalEntity.findFirst({
    where: { id: input.legalEntityId, orgId: input.orgId },
  });
  if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  const accountFilter = {
    orgId: input.orgId,
    legalEntityId: input.legalEntityId,
    isActive: true,
    isGroup: false,
  };
  for (const accountId of [
    input.assetAccountId,
    input.depreciationExpenseAccountId,
    input.accumulatedDepAccountId,
  ]) {
    if (accountId) {
      const account = await db.account.findFirst({
        where: { id: accountId, ...accountFilter },
      });
      if (!account) throw new Error("CONFIGURATION_ASSET_BOOK_ACCOUNT_INVALID");
    }
  }
  const bookType = assertAssetBookType(input.bookType);
  const depreciationMethod = assertAssetDepreciationMethod(
    input.depreciationMethod,
  );
  const depreciationRate = positiveOptionalDecimalString(
    input.depreciationRate,
    "CONFIGURATION_ASSET_BOOK_RATE_INVALID",
  );
  const capitalizationAmount = decimalString(input.capitalizationAmount);
  const salvageValue = positiveOptionalDecimalString(
    input.salvageValue,
    "CONFIGURATION_ASSET_BOOK_SALVAGE_VALUE_INVALID",
  );
  const accumulatedDepreciation = positiveOptionalDecimalString(
    input.accumulatedDepreciation,
    "CONFIGURATION_ASSET_BOOK_ACCUMULATED_INVALID",
  );
  const netBookValue = positiveOptionalDecimalString(
    input.netBookValue,
    "CONFIGURATION_ASSET_BOOK_NBV_INVALID",
  );
  const policy = parseJsonObject(
    input.policyJson,
    "CONFIGURATION_ASSET_BOOK_POLICY_JSON_INVALID",
  );
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_ASSET_BOOK_EFFECTIVE_FROM_REQUIRED",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_ASSET_BOOK_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_ASSET_BOOK_EFFECTIVE_RANGE_INVALID");
  }

  if (input.id) {
    const existing = await db.accountingAssetBook.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_ASSET_BOOK_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingAssetBook.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId,
        financialAssetId: input.financialAssetId,
        bookCode,
        bookType,
        depreciationMethod,
        depreciationRate,
        usefulLifeMonths: input.usefulLifeMonths ?? null,
        capitalizationAmount,
        salvageValue,
        accumulatedDepreciation,
        netBookValue,
        assetAccountId: input.assetAccountId || null,
        depreciationExpenseAccountId: input.depreciationExpenseAccountId || null,
        accumulatedDepAccountId: input.accumulatedDepAccountId || null,
        policyJson: policy ?? undefined,
        effectiveFrom,
        effectiveTo,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_ASSET_BOOK_UPDATED",
      entityType: "AccountingAssetBook",
      entityId: updated.id,
      beforeValues: {
        bookCode: existing.bookCode,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        bookCode: updated.bookCode,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingAssetBook.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      financialAssetId: input.financialAssetId,
      bookCode,
      bookType,
      depreciationMethod,
      depreciationRate,
      usefulLifeMonths: input.usefulLifeMonths ?? null,
      capitalizationAmount,
      salvageValue,
      accumulatedDepreciation,
      netBookValue,
      assetAccountId: input.assetAccountId || null,
      depreciationExpenseAccountId: input.depreciationExpenseAccountId || null,
      accumulatedDepAccountId: input.accumulatedDepAccountId || null,
      policyJson: policy ?? undefined,
      effectiveFrom,
      effectiveTo,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_ASSET_BOOK_CREATED",
    entityType: "AccountingAssetBook",
    entityId: created.id,
    afterValues: {
      bookCode: created.bookCode,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingDepreciationRun(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  assetBookId: string;
  expectedVersion?: number;
  periodStart: string;
  periodEnd: string;
  depreciationDate: string;
  depreciationAmount: string;
  accumulatedAfter: string;
  netBookValueAfter: string;
  runStatus: string;
  journalEntryId?: string | null;
  policySnapshotJson?: string | null;
  idempotencyKey: string;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const assetBook = await db.accountingAssetBook.findFirst({
    where: { id: input.assetBookId, orgId: input.orgId },
  });
  if (!assetBook) throw new Error("CONFIGURATION_ASSET_BOOK_NOT_FOUND");
  if (assetBook.legalEntityId !== input.legalEntityId) {
    throw new Error("CONFIGURATION_DEPRECIATION_RUN_SCOPE_INVALID");
  }
  const periodStart = parseRequiredDate(
    input.periodStart,
    "CONFIGURATION_DEPRECIATION_PERIOD_START_REQUIRED",
  );
  const periodEnd = parseRequiredDate(
    input.periodEnd,
    "CONFIGURATION_DEPRECIATION_PERIOD_END_REQUIRED",
  );
  if (periodEnd < periodStart) {
    throw new Error("CONFIGURATION_DEPRECIATION_PERIOD_RANGE_INVALID");
  }
  const depreciationDate = parseRequiredDate(
    input.depreciationDate,
    "CONFIGURATION_DEPRECIATION_DATE_REQUIRED",
  );
  const depreciationAmount = decimalString(input.depreciationAmount);
  const accumulatedAfter = positiveOptionalDecimalString(
    input.accumulatedAfter,
    "CONFIGURATION_DEPRECIATION_ACCUMULATED_INVALID",
  );
  const netBookValueAfter = positiveOptionalDecimalString(
    input.netBookValueAfter,
    "CONFIGURATION_DEPRECIATION_NBV_INVALID",
  );
  const runStatus = assertDepreciationRunStatus(input.runStatus);
  const policySnapshot = parseJsonObject(
    input.policySnapshotJson,
    "CONFIGURATION_DEPRECIATION_POLICY_JSON_INVALID",
  );
  const idempotencyKey = String(input.idempotencyKey ?? "").trim();
  if (!idempotencyKey) {
    throw new Error("CONFIGURATION_DEPRECIATION_IDEMPOTENCY_REQUIRED");
  }
  const journalEntryId = String(input.journalEntryId ?? "").trim() || null;
  if (journalEntryId) {
    const journal = await db.journalEntry.findFirst({
      where: {
        id: journalEntryId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
      },
    });
    if (!journal) throw new Error("CONFIGURATION_DEPRECIATION_JOURNAL_INVALID");
  }
  const completionData =
    runStatus === "PENDING"
      ? { processedById: null, processedAt: null }
      : { processedById: input.actorId, processedAt: new Date() };

  if (input.id) {
    const existing = await db.accountingDepreciationRun.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_DEPRECIATION_RUN_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingDepreciationRun.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId,
        assetBookId: input.assetBookId,
        periodStart,
        periodEnd,
        depreciationDate,
        depreciationAmount,
        accumulatedAfter,
        netBookValueAfter,
        runStatus,
        journalEntryId,
        policySnapshot: policySnapshot ?? undefined,
        idempotencyKey,
        ...completionData,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_DEPRECIATION_RUN_UPDATED",
      entityType: "AccountingDepreciationRun",
      entityId: updated.id,
      beforeValues: {
        runStatus: existing.runStatus,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        runStatus: updated.runStatus,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingDepreciationRun.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      assetBookId: input.assetBookId,
      periodStart,
      periodEnd,
      depreciationDate,
      depreciationAmount,
      accumulatedAfter,
      netBookValueAfter,
      runStatus,
      journalEntryId,
      policySnapshot: policySnapshot ?? undefined,
      idempotencyKey,
      ...completionData,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_DEPRECIATION_RUN_CREATED",
    entityType: "AccountingDepreciationRun",
    entityId: created.id,
    afterValues: {
      runStatus: created.runStatus,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingPartner(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  legacyPartnerId: string;
  expectedVersion?: number;
  partnerCode: string;
  partnerName: string;
  capitalAccountId: string;
  currentAccountId: string;
  drawingsAccountId?: string | null;
  status: string;
  policyJson?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const partnerCode = assertDimensionCode(
    input.partnerCode,
    "CONFIGURATION_PARTNER_CODE_INVALID",
  );
  const partnerName = String(input.partnerName ?? "").trim();
  if (!partnerName) throw new Error("CONFIGURATION_PARTNER_NAME_REQUIRED");
  const legalEntity = await db.accountingLegalEntity.findFirst({
    where: { id: input.legalEntityId, orgId: input.orgId },
  });
  if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  const legacyPartner = await db.partnerAccount.findFirst({
    where: { id: input.legacyPartnerId, orgId: input.orgId },
  });
  if (!legacyPartner) throw new Error("CONFIGURATION_LEGACY_PARTNER_NOT_FOUND");
  for (const accountId of [
    input.capitalAccountId,
    input.currentAccountId,
    input.drawingsAccountId,
  ]) {
    if (!accountId) continue;
    const account = await db.account.findFirst({
      where: {
        id: accountId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        isActive: true,
        isGroup: false,
      },
    });
    if (!account) throw new Error("CONFIGURATION_PARTNER_ACCOUNT_INVALID");
  }
  const status = assertPartnerStatus(input.status);
  const policy = parseJsonObject(
    input.policyJson,
    "CONFIGURATION_PARTNER_POLICY_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingPartner.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_PARTNER_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingPartner.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId,
        legacyPartnerId: input.legacyPartnerId,
        partnerCode,
        partnerName,
        capitalAccountId: input.capitalAccountId,
        currentAccountId: input.currentAccountId,
        drawingsAccountId: input.drawingsAccountId || null,
        status,
        policyJson: policy ?? undefined,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_PARTNER_UPDATED",
      entityType: "AccountingPartner",
      entityId: updated.id,
      beforeValues: {
        partnerCode: existing.partnerCode,
        status: existing.status,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        partnerCode: updated.partnerCode,
        status: updated.status,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingPartner.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      legacyPartnerId: input.legacyPartnerId,
      partnerCode,
      partnerName,
      capitalAccountId: input.capitalAccountId,
      currentAccountId: input.currentAccountId,
      drawingsAccountId: input.drawingsAccountId || null,
      status,
      policyJson: policy ?? undefined,
      createdById: input.actorId,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_PARTNER_CREATED",
    entityType: "AccountingPartner",
    entityId: created.id,
    afterValues: {
      partnerCode: created.partnerCode,
      status: created.status,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingPartnerTerm(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  partnerId: string;
  expectedVersion?: number;
  version: number;
  profitSharingRatio: string;
  interestOnCapitalRate?: string | null;
  interestOnDrawingsRate?: string | null;
  salaryAmount?: string | null;
  salaryExpenseAccountId?: string | null;
  interestExpenseAccountId?: string | null;
  interestIncomeAccountId?: string | null;
  configurationJson?: string | null;
  approvedByCA: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  if (!Number.isInteger(input.version) || input.version <= 0) {
    throw new Error("CONFIGURATION_PARTNER_TERM_VERSION_INVALID");
  }
  const partner = await db.accountingPartner.findFirst({
    where: { id: input.partnerId, orgId: input.orgId },
  });
  if (!partner) throw new Error("CONFIGURATION_PARTNER_NOT_FOUND");
  if (partner.legalEntityId !== input.legalEntityId) {
    throw new Error("CONFIGURATION_PARTNER_TERM_SCOPE_INVALID");
  }
  for (const accountId of [
    input.salaryExpenseAccountId,
    input.interestExpenseAccountId,
    input.interestIncomeAccountId,
  ]) {
    if (!accountId) continue;
    const account = await db.account.findFirst({
      where: {
        id: accountId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        isActive: true,
        isGroup: false,
      },
    });
    if (!account) throw new Error("CONFIGURATION_PARTNER_TERM_ACCOUNT_INVALID");
  }
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_PARTNER_TERM_EFFECTIVE_FROM_REQUIRED",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_PARTNER_TERM_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_PARTNER_TERM_EFFECTIVE_RANGE_INVALID");
  }
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_PARTNER_TERM_CONFIGURATION_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingPartnerTerm.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_PARTNER_TERM_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingPartnerTerm.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId,
        partnerId: input.partnerId,
        version: input.version,
        profitSharingRatio: decimalString(input.profitSharingRatio),
        interestOnCapitalRate: positiveOptionalDecimalString(
          input.interestOnCapitalRate,
          "CONFIGURATION_PARTNER_TERM_INTEREST_CAPITAL_INVALID",
        ),
        interestOnDrawingsRate: positiveOptionalDecimalString(
          input.interestOnDrawingsRate,
          "CONFIGURATION_PARTNER_TERM_INTEREST_DRAWINGS_INVALID",
        ),
        salaryAmount: positiveOptionalDecimalString(
          input.salaryAmount,
          "CONFIGURATION_PARTNER_TERM_SALARY_INVALID",
        ),
        salaryExpenseAccountId: input.salaryExpenseAccountId || null,
        interestExpenseAccountId: input.interestExpenseAccountId || null,
        interestIncomeAccountId: input.interestIncomeAccountId || null,
        configuration: configuration ?? undefined,
        approvedByCA: input.approvedByCA,
        effectiveFrom,
        effectiveTo,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_PARTNER_TERM_UPDATED",
      entityType: "AccountingPartnerTerm",
      entityId: updated.id,
      beforeValues: {
        version: existing.version,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        version: updated.version,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingPartnerTerm.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      partnerId: input.partnerId,
      version: input.version,
      profitSharingRatio: decimalString(input.profitSharingRatio),
      interestOnCapitalRate: positiveOptionalDecimalString(
        input.interestOnCapitalRate,
        "CONFIGURATION_PARTNER_TERM_INTEREST_CAPITAL_INVALID",
      ),
      interestOnDrawingsRate: positiveOptionalDecimalString(
        input.interestOnDrawingsRate,
        "CONFIGURATION_PARTNER_TERM_INTEREST_DRAWINGS_INVALID",
      ),
      salaryAmount: positiveOptionalDecimalString(
        input.salaryAmount,
        "CONFIGURATION_PARTNER_TERM_SALARY_INVALID",
      ),
      salaryExpenseAccountId: input.salaryExpenseAccountId || null,
      interestExpenseAccountId: input.interestExpenseAccountId || null,
      interestIncomeAccountId: input.interestIncomeAccountId || null,
      configuration: configuration ?? undefined,
      approvedByCA: input.approvedByCA,
      effectiveFrom,
      effectiveTo,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_PARTNER_TERM_CREATED",
    entityType: "AccountingPartnerTerm",
    entityId: created.id,
    afterValues: {
      version: created.version,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingAppropriation(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  partnerId: string;
  termId: string;
  expectedVersion?: number;
  appropriationType: string;
  periodStart: string;
  periodEnd: string;
  amount: string;
  basisJson?: string | null;
  status: string;
  journalEntryId?: string | null;
  idempotencyKey: string;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const partner = await db.accountingPartner.findFirst({
    where: { id: input.partnerId, orgId: input.orgId },
  });
  if (!partner) throw new Error("CONFIGURATION_PARTNER_NOT_FOUND");
  if (partner.legalEntityId !== input.legalEntityId) {
    throw new Error("CONFIGURATION_APPROPRIATION_SCOPE_INVALID");
  }
  const term = await db.accountingPartnerTerm.findFirst({
    where: { id: input.termId, orgId: input.orgId, partnerId: input.partnerId },
  });
  if (!term) throw new Error("CONFIGURATION_PARTNER_TERM_NOT_FOUND");
  const appropriationType = assertAppropriationType(input.appropriationType);
  const status = assertAppropriationStatus(input.status);
  const periodStart = parseRequiredDate(
    input.periodStart,
    "CONFIGURATION_APPROPRIATION_PERIOD_START_REQUIRED",
  );
  const periodEnd = parseRequiredDate(
    input.periodEnd,
    "CONFIGURATION_APPROPRIATION_PERIOD_END_REQUIRED",
  );
  if (periodEnd < periodStart) {
    throw new Error("CONFIGURATION_APPROPRIATION_PERIOD_RANGE_INVALID");
  }
  const amount = decimalString(input.amount);
  const basis = parseJsonObject(
    input.basisJson,
    "CONFIGURATION_APPROPRIATION_BASIS_JSON_INVALID",
  );
  const idempotencyKey = String(input.idempotencyKey ?? "").trim();
  if (!idempotencyKey) {
    throw new Error("CONFIGURATION_APPROPRIATION_IDEMPOTENCY_REQUIRED");
  }
  const journalEntryId = String(input.journalEntryId ?? "").trim() || null;
  if (journalEntryId) {
    const journal = await db.journalEntry.findFirst({
      where: {
        id: journalEntryId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
      },
    });
    if (!journal) throw new Error("CONFIGURATION_APPROPRIATION_JOURNAL_INVALID");
  }

  if (input.id) {
    const existing = await db.accountingAppropriation.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_APPROPRIATION_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingAppropriation.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId,
        partnerId: input.partnerId,
        termId: input.termId,
        appropriationType,
        periodStart,
        periodEnd,
        amount,
        basis: basis ?? undefined,
        status,
        journalEntryId,
        idempotencyKey,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_APPROPRIATION_UPDATED",
      entityType: "AccountingAppropriation",
      entityId: updated.id,
      beforeValues: {
        appropriationType: existing.appropriationType,
        status: existing.status,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        appropriationType: updated.appropriationType,
        status: updated.status,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingAppropriation.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      partnerId: input.partnerId,
      termId: input.termId,
      appropriationType,
      periodStart,
      periodEnd,
      amount,
      basis: basis ?? undefined,
      status,
      journalEntryId,
      idempotencyKey,
      createdById: input.actorId,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_APPROPRIATION_CREATED",
    entityType: "AccountingAppropriation",
    entityId: created.id,
    afterValues: {
      appropriationType: created.appropriationType,
      status: created.status,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingCustomerProfile(input: {
  id?: string;
  orgId: string;
  actorId: string;
  crmAccountId: string;
  receivableAccountId: string;
  expectedVersion?: number;
  currencyCode: string;
  creditLimit?: string | null;
  paymentTermsDays?: number | null;
  collectionPolicyVersion: number;
  dunningPolicyCode?: string | null;
  creditHold: boolean;
  statementDeliveryMode: string;
  configurationJson?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const customer = await db.crmAccount.findFirst({
    where: { id: input.crmAccountId, orgId: input.orgId, status: "ACTIVE" },
  });
  if (!customer) throw new Error("CONFIGURATION_CUSTOMER_PROFILE_CUSTOMER_NOT_FOUND");
  const receivableAccount = await db.account.findFirst({
    where: {
      id: input.receivableAccountId,
      orgId: input.orgId,
      isActive: true,
      isGroup: false,
    },
  });
  if (!receivableAccount) {
    throw new Error("CONFIGURATION_CUSTOMER_PROFILE_RECEIVABLE_ACCOUNT_INVALID");
  }
  const currencyCode = assertCurrencyCode(input.currencyCode);
  const currency = await db.accountingCurrency.findFirst({
    where: { orgId: input.orgId, code: currencyCode, isEnabled: true },
  });
  if (!currency) throw new Error("CONFIGURATION_CUSTOMER_PROFILE_CURRENCY_INVALID");
  if (
    input.paymentTermsDays != null &&
    (!Number.isInteger(input.paymentTermsDays) || input.paymentTermsDays < 0)
  ) {
    throw new Error("CONFIGURATION_CUSTOMER_PROFILE_PAYMENT_TERMS_INVALID");
  }
  if (
    !Number.isInteger(input.collectionPolicyVersion) ||
    input.collectionPolicyVersion <= 0
  ) {
    throw new Error("CONFIGURATION_CUSTOMER_PROFILE_POLICY_VERSION_INVALID");
  }
  const creditLimit = positiveOptionalDecimalString(
    input.creditLimit,
    "CONFIGURATION_CUSTOMER_PROFILE_CREDIT_LIMIT_INVALID",
  );
  const statementDeliveryMode = assertCustomerStatementDeliveryMode(
    input.statementDeliveryMode,
  );
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_CUSTOMER_PROFILE_CONFIGURATION_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingCustomerProfile.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_CUSTOMER_PROFILE_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingCustomerProfile.update({
      where: { id: existing.id },
      data: {
        crmAccountId: input.crmAccountId,
        receivableAccountId: input.receivableAccountId,
        currencyCode,
        creditLimit,
        paymentTermsDays: input.paymentTermsDays ?? null,
        collectionPolicyVersion: input.collectionPolicyVersion,
        dunningPolicyCode: String(input.dunningPolicyCode ?? "").trim() || null,
        creditHold: input.creditHold,
        statementDeliveryMode,
        configuration: configuration ?? undefined,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_CUSTOMER_PROFILE_UPDATED",
      entityType: "AccountingCustomerProfile",
      entityId: updated.id,
      beforeValues: {
        crmAccountId: existing.crmAccountId,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        crmAccountId: updated.crmAccountId,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingCustomerProfile.create({
    data: {
      orgId: input.orgId,
      crmAccountId: input.crmAccountId,
      receivableAccountId: input.receivableAccountId,
      currencyCode,
      creditLimit,
      paymentTermsDays: input.paymentTermsDays ?? null,
      collectionPolicyVersion: input.collectionPolicyVersion,
      dunningPolicyCode: String(input.dunningPolicyCode ?? "").trim() || null,
      creditHold: input.creditHold,
      statementDeliveryMode,
      configuration: configuration ?? undefined,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_CUSTOMER_PROFILE_CREATED",
    entityType: "AccountingCustomerProfile",
    entityId: created.id,
    afterValues: {
      crmAccountId: created.crmAccountId,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingVendorProfile(input: {
  id?: string;
  orgId: string;
  actorId: string;
  crmVendorId: string;
  payableAccountId: string;
  expectedVersion?: number;
  currencyCode: string;
  paymentTermsDays?: number | null;
  paymentPolicyVersion: number;
  taxProfileId?: string | null;
  paymentHold: boolean;
  paymentMethod?: string | null;
  configurationJson?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const vendor = await db.crmVendor.findFirst({
    where: { id: input.crmVendorId, orgId: input.orgId, status: "ACTIVE" },
  });
  if (!vendor) throw new Error("CONFIGURATION_VENDOR_PROFILE_VENDOR_NOT_FOUND");
  const payableAccount = await db.account.findFirst({
    where: {
      id: input.payableAccountId,
      orgId: input.orgId,
      isActive: true,
      isGroup: false,
    },
  });
  if (!payableAccount) {
    throw new Error("CONFIGURATION_VENDOR_PROFILE_PAYABLE_ACCOUNT_INVALID");
  }
  const currencyCode = assertCurrencyCode(input.currencyCode);
  const currency = await db.accountingCurrency.findFirst({
    where: { orgId: input.orgId, code: currencyCode, isEnabled: true },
  });
  if (!currency) throw new Error("CONFIGURATION_VENDOR_PROFILE_CURRENCY_INVALID");
  if (
    input.paymentTermsDays != null &&
    (!Number.isInteger(input.paymentTermsDays) || input.paymentTermsDays < 0)
  ) {
    throw new Error("CONFIGURATION_VENDOR_PROFILE_PAYMENT_TERMS_INVALID");
  }
  if (
    !Number.isInteger(input.paymentPolicyVersion) ||
    input.paymentPolicyVersion <= 0
  ) {
    throw new Error("CONFIGURATION_VENDOR_PROFILE_POLICY_VERSION_INVALID");
  }
  if (input.taxProfileId) {
    const taxProfile = await db.accountingTaxProfile.findFirst({
      where: { id: input.taxProfileId, orgId: input.orgId },
    });
    if (!taxProfile) throw new Error("CONFIGURATION_VENDOR_PROFILE_TAX_PROFILE_INVALID");
  }
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_VENDOR_PROFILE_CONFIGURATION_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingVendorProfile.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_VENDOR_PROFILE_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingVendorProfile.update({
      where: { id: existing.id },
      data: {
        crmVendorId: input.crmVendorId,
        payableAccountId: input.payableAccountId,
        currencyCode,
        paymentTermsDays: input.paymentTermsDays ?? null,
        paymentPolicyVersion: input.paymentPolicyVersion,
        taxProfileId: input.taxProfileId || null,
        paymentHold: input.paymentHold,
        paymentMethod: String(input.paymentMethod ?? "").trim() || null,
        configuration: configuration ?? undefined,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_VENDOR_PROFILE_UPDATED",
      entityType: "AccountingVendorProfile",
      entityId: updated.id,
      beforeValues: {
        crmVendorId: existing.crmVendorId,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        crmVendorId: updated.crmVendorId,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingVendorProfile.create({
    data: {
      orgId: input.orgId,
      crmVendorId: input.crmVendorId,
      payableAccountId: input.payableAccountId,
      currencyCode,
      paymentTermsDays: input.paymentTermsDays ?? null,
      paymentPolicyVersion: input.paymentPolicyVersion,
      taxProfileId: input.taxProfileId || null,
      paymentHold: input.paymentHold,
      paymentMethod: String(input.paymentMethod ?? "").trim() || null,
      configuration: configuration ?? undefined,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_VENDOR_PROFILE_CREATED",
    entityType: "AccountingVendorProfile",
    entityId: created.id,
    afterValues: {
      crmVendorId: created.crmVendorId,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingPaymentTerm(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  dueDays: number;
  earlyDiscountDays?: number | null;
  earlyDiscountPercent?: string | null;
  configurationJson?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_PAYMENT_TERM_CODE_INVALID",
  );
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("CONFIGURATION_PAYMENT_TERM_NAME_REQUIRED");
  if (!Number.isInteger(input.dueDays) || input.dueDays < 0) {
    throw new Error("CONFIGURATION_PAYMENT_TERM_DUE_DAYS_INVALID");
  }
  if (
    input.earlyDiscountDays != null &&
    (!Number.isInteger(input.earlyDiscountDays) || input.earlyDiscountDays < 0)
  ) {
    throw new Error("CONFIGURATION_PAYMENT_TERM_DISCOUNT_DAYS_INVALID");
  }
  const earlyDiscountPercent = positiveOptionalDecimalString(
    input.earlyDiscountPercent,
    "CONFIGURATION_PAYMENT_TERM_DISCOUNT_PERCENT_INVALID",
  );
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_PAYMENT_TERM_CONFIGURATION_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingPaymentTerm.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_PAYMENT_TERM_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingPaymentTerm.update({
      where: { id: existing.id },
      data: {
        code,
        name,
        dueDays: input.dueDays,
        earlyDiscountDays: input.earlyDiscountDays ?? null,
        earlyDiscountPercent,
        configuration: configuration ?? undefined,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_PAYMENT_TERM_UPDATED",
      entityType: "AccountingPaymentTerm",
      entityId: updated.id,
      beforeValues: { code: existing.code, rowVersion: existing.rowVersion },
      afterValues: { code: updated.code, rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingPaymentTerm.create({
    data: {
      orgId: input.orgId,
      code,
      name,
      dueDays: input.dueDays,
      earlyDiscountDays: input.earlyDiscountDays ?? null,
      earlyDiscountPercent,
      configuration: configuration ?? undefined,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_PAYMENT_TERM_CREATED",
    entityType: "AccountingPaymentTerm",
    entityId: created.id,
    afterValues: { code: created.code, rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingPaymentMethod(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  methodType: string;
  clearingAccountId?: string | null;
  configurationJson?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_PAYMENT_METHOD_CODE_INVALID",
  );
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("CONFIGURATION_PAYMENT_METHOD_NAME_REQUIRED");
  const methodType = assertPaymentMethodType(input.methodType);
  if (input.clearingAccountId) {
    const account = await db.account.findFirst({
      where: {
        id: input.clearingAccountId,
        orgId: input.orgId,
        isActive: true,
        isGroup: false,
      },
    });
    if (!account) {
      throw new Error("CONFIGURATION_PAYMENT_METHOD_CLEARING_ACCOUNT_INVALID");
    }
  }
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_PAYMENT_METHOD_CONFIGURATION_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingPaymentMethod.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_PAYMENT_METHOD_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingPaymentMethod.update({
      where: { id: existing.id },
      data: {
        code,
        name,
        methodType,
        clearingAccountId: input.clearingAccountId || null,
        configuration: configuration ?? undefined,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_PAYMENT_METHOD_UPDATED",
      entityType: "AccountingPaymentMethod",
      entityId: updated.id,
      beforeValues: { code: existing.code, rowVersion: existing.rowVersion },
      afterValues: { code: updated.code, rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingPaymentMethod.create({
    data: {
      orgId: input.orgId,
      code,
      name,
      methodType,
      clearingAccountId: input.clearingAccountId || null,
      configuration: configuration ?? undefined,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_PAYMENT_METHOD_CREATED",
    entityType: "AccountingPaymentMethod",
    entityId: created.id,
    afterValues: { code: created.code, rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingPriceList(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  currencyCode: string;
  adjustmentMode: string;
  defaultAdjustmentPercent?: string | null;
  configurationJson?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_PRICE_LIST_CODE_INVALID",
  );
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("CONFIGURATION_PRICE_LIST_NAME_REQUIRED");
  const currencyCode = assertCurrencyCode(input.currencyCode);
  const currency = await db.accountingCurrency.findFirst({
    where: { orgId: input.orgId, code: currencyCode, isEnabled: true },
  });
  if (!currency) throw new Error("CONFIGURATION_PRICE_LIST_CURRENCY_INVALID");
  const adjustmentMode = assertPriceListAdjustmentMode(input.adjustmentMode);
  const defaultAdjustmentPercent = optionalDecimalString(
    input.defaultAdjustmentPercent,
    "CONFIGURATION_PRICE_LIST_ADJUSTMENT_PERCENT_INVALID",
  );
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_PRICE_LIST_CONFIGURATION_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingPriceList.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_PRICE_LIST_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingPriceList.update({
      where: { id: existing.id },
      data: {
        code,
        name,
        currencyCode,
        adjustmentMode,
        defaultAdjustmentPercent,
        configuration: configuration ?? undefined,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_PRICE_LIST_UPDATED",
      entityType: "AccountingPriceList",
      entityId: updated.id,
      beforeValues: { code: existing.code, rowVersion: existing.rowVersion },
      afterValues: { code: updated.code, rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingPriceList.create({
    data: {
      orgId: input.orgId,
      code,
      name,
      currencyCode,
      adjustmentMode,
      defaultAdjustmentPercent,
      configuration: configuration ?? undefined,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_PRICE_LIST_CREATED",
    entityType: "AccountingPriceList",
    entityId: created.id,
    afterValues: { code: created.code, rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingUnitOfMeasure(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  symbol?: string | null;
  decimalPlaces: number;
  configurationJson?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_UNIT_OF_MEASURE_CODE_INVALID",
  );
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("CONFIGURATION_UNIT_OF_MEASURE_NAME_REQUIRED");
  if (
    !Number.isInteger(input.decimalPlaces) ||
    input.decimalPlaces < 0 ||
    input.decimalPlaces > 6
  ) {
    throw new Error("CONFIGURATION_UNIT_OF_MEASURE_DECIMALS_INVALID");
  }
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_UNIT_OF_MEASURE_CONFIGURATION_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingUnitOfMeasure.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_UNIT_OF_MEASURE_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingUnitOfMeasure.update({
      where: { id: existing.id },
      data: {
        code,
        name,
        symbol: String(input.symbol ?? "").trim() || null,
        decimalPlaces: input.decimalPlaces,
        configuration: configuration ?? undefined,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_UNIT_OF_MEASURE_UPDATED",
      entityType: "AccountingUnitOfMeasure",
      entityId: updated.id,
      beforeValues: { code: existing.code, rowVersion: existing.rowVersion },
      afterValues: { code: updated.code, rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingUnitOfMeasure.create({
    data: {
      orgId: input.orgId,
      code,
      name,
      symbol: String(input.symbol ?? "").trim() || null,
      decimalPlaces: input.decimalPlaces,
      configuration: configuration ?? undefined,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_UNIT_OF_MEASURE_CREATED",
    entityType: "AccountingUnitOfMeasure",
    entityId: created.id,
    afterValues: { code: created.code, rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingReportingTag(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  description?: string | null;
  configurationJson?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_REPORTING_TAG_CODE_INVALID",
  );
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("CONFIGURATION_REPORTING_TAG_NAME_REQUIRED");
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_REPORTING_TAG_CONFIGURATION_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingReportingTag.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_REPORTING_TAG_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingReportingTag.update({
      where: { id: existing.id },
      data: {
        code,
        name,
        description: String(input.description ?? "").trim() || null,
        configuration: configuration ?? undefined,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_REPORTING_TAG_UPDATED",
      entityType: "AccountingReportingTag",
      entityId: updated.id,
      beforeValues: { code: existing.code, rowVersion: existing.rowVersion },
      afterValues: { code: updated.code, rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingReportingTag.create({
    data: {
      orgId: input.orgId,
      code,
      name,
      description: String(input.description ?? "").trim() || null,
      configuration: configuration ?? undefined,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_REPORTING_TAG_CREATED",
    entityType: "AccountingReportingTag",
    entityId: created.id,
    afterValues: { code: created.code, rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingSourceMappingProfile(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId?: string | null;
  expectedVersion?: number;
  sourceSystem: string;
  sourceType: string;
  profileCode: string;
  targetModule: string;
  targetDocumentType?: string | null;
  configurationJson?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  if (input.legalEntityId) {
    const legalEntity = await db.accountingLegalEntity.findFirst({
      where: { id: input.legalEntityId, orgId: input.orgId },
    });
    if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  }
  const sourceSystem = assertDimensionCode(
    input.sourceSystem,
    "CONFIGURATION_SOURCE_MAPPING_SOURCE_SYSTEM_INVALID",
  );
  const sourceType = assertDimensionCode(
    input.sourceType,
    "CONFIGURATION_SOURCE_MAPPING_SOURCE_TYPE_INVALID",
  );
  const profileCode = assertDimensionCode(
    input.profileCode,
    "CONFIGURATION_SOURCE_MAPPING_PROFILE_CODE_INVALID",
  );
  const targetModule = assertSourceTargetModule(input.targetModule);
  const targetDocumentType =
    String(input.targetDocumentType ?? "").trim().toUpperCase() || null;
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_SOURCE_MAPPING_CONFIGURATION_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingSourceMappingProfile.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_SOURCE_MAPPING_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingSourceMappingProfile.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId || null,
        sourceSystem,
        sourceType,
        profileCode,
        targetModule,
        targetDocumentType,
        configuration: configuration ?? undefined,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_SOURCE_MAPPING_UPDATED",
      entityType: "AccountingSourceMappingProfile",
      entityId: updated.id,
      beforeValues: { rowVersion: existing.rowVersion },
      afterValues: { rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingSourceMappingProfile.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId || null,
      sourceSystem,
      sourceType,
      profileCode,
      targetModule,
      targetDocumentType,
      configuration: configuration ?? undefined,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_SOURCE_MAPPING_CREATED",
    entityType: "AccountingSourceMappingProfile",
    entityId: created.id,
    afterValues: { rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingPeriodCloseRun(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  accountingPeriodId: string;
  expectedVersion?: number;
  closeDate: string;
  status: string;
  checklistJson?: string | null;
  reportBundleJson?: string | null;
  notes?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const legalEntity = await db.accountingLegalEntity.findFirst({
    where: { id: input.legalEntityId, orgId: input.orgId },
  });
  if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  const period = await db.accountingPeriod.findFirst({
    where: { id: input.accountingPeriodId, orgId: input.orgId },
  });
  if (!period) throw new Error("CONFIGURATION_PERIOD_NOT_FOUND");
  const closeDate = parseRequiredDate(
    input.closeDate,
    "CONFIGURATION_PERIOD_CLOSE_DATE_REQUIRED",
  );
  const status = assertPeriodCloseRunStatus(input.status);
  const checklist = parseJsonObject(
    input.checklistJson,
    "CONFIGURATION_PERIOD_CLOSE_CHECKLIST_JSON_INVALID",
  );
  const reportBundle = parseJsonObject(
    input.reportBundleJson,
    "CONFIGURATION_PERIOD_CLOSE_REPORT_BUNDLE_JSON_INVALID",
  );
  const notes = String(input.notes ?? "").trim() || null;
  const closeMeta =
    status === "CLOSED"
      ? { closedById: input.actorId, closedAt: new Date() }
      : status === "REOPENED"
        ? { reopenedById: input.actorId, reopenedAt: new Date() }
        : {};

  if (input.id) {
    const existing = await db.accountingPeriodCloseRun.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_PERIOD_CLOSE_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingPeriodCloseRun.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId,
        accountingPeriodId: input.accountingPeriodId,
        closeDate,
        status,
        checklist: checklist ?? undefined,
        reportBundle: reportBundle ?? undefined,
        notes,
        ...closeMeta,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_PERIOD_CLOSE_UPDATED",
      entityType: "AccountingPeriodCloseRun",
      entityId: updated.id,
      beforeValues: { status: existing.status, rowVersion: existing.rowVersion },
      afterValues: { status: updated.status, rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingPeriodCloseRun.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      accountingPeriodId: input.accountingPeriodId,
      closeDate,
      status,
      checklist: checklist ?? undefined,
      reportBundle: reportBundle ?? undefined,
      notes,
      ...closeMeta,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_PERIOD_CLOSE_CREATED",
    entityType: "AccountingPeriodCloseRun",
    entityId: created.id,
    afterValues: { status: created.status, rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingReportExportProfile(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId?: string | null;
  expectedVersion?: number;
  reportCode: string;
  name: string;
  exportFormat: string;
  deliveryMode: string;
  filtersJson?: string | null;
  isPortalVisible: boolean;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  if (input.legalEntityId) {
    const legalEntity = await db.accountingLegalEntity.findFirst({
      where: { id: input.legalEntityId, orgId: input.orgId },
    });
    if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  }
  const reportCode = assertDimensionCode(
    input.reportCode,
    "CONFIGURATION_REPORT_CODE_INVALID",
  );
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("CONFIGURATION_REPORT_PROFILE_NAME_REQUIRED");
  const exportFormat = assertReportExportFormat(input.exportFormat);
  const deliveryMode = assertDeliveryMode(input.deliveryMode);
  const filters = parseJsonObject(
    input.filtersJson,
    "CONFIGURATION_REPORT_PROFILE_FILTERS_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingReportExportProfile.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_REPORT_PROFILE_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingReportExportProfile.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId || null,
        reportCode,
        name,
        exportFormat,
        deliveryMode,
        filters: filters ?? undefined,
        isPortalVisible: input.isPortalVisible,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_REPORT_PROFILE_UPDATED",
      entityType: "AccountingReportExportProfile",
      entityId: updated.id,
      beforeValues: { rowVersion: existing.rowVersion },
      afterValues: { rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingReportExportProfile.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId || null,
      reportCode,
      name,
      exportFormat,
      deliveryMode,
      filters: filters ?? undefined,
      isPortalVisible: input.isPortalVisible,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_REPORT_PROFILE_CREATED",
    entityType: "AccountingReportExportProfile",
    entityId: created.id,
    afterValues: { rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingPortalPublicationProfile(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId?: string | null;
  expectedVersion?: number;
  documentType: string;
  audienceType: string;
  exportProfileId?: string | null;
  deliveryMode: string;
  retentionDays?: number | null;
  configurationJson?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  if (input.legalEntityId) {
    const legalEntity = await db.accountingLegalEntity.findFirst({
      where: { id: input.legalEntityId, orgId: input.orgId },
    });
    if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  }
  if (input.exportProfileId) {
    const exportProfile = await db.accountingReportExportProfile.findFirst({
      where: { id: input.exportProfileId, orgId: input.orgId },
    });
    if (!exportProfile) {
      throw new Error("CONFIGURATION_PORTAL_PUBLICATION_EXPORT_PROFILE_INVALID");
    }
  }
  const documentType = String(input.documentType ?? "").trim().toUpperCase();
  if (!documentType) throw new Error("CONFIGURATION_PORTAL_PUBLICATION_DOCUMENT_TYPE_REQUIRED");
  const audienceType = assertPortalAudienceType(input.audienceType);
  const deliveryMode = assertDeliveryMode(input.deliveryMode);
  if (
    input.retentionDays != null &&
    (!Number.isInteger(input.retentionDays) || input.retentionDays < 0)
  ) {
    throw new Error("CONFIGURATION_PORTAL_PUBLICATION_RETENTION_DAYS_INVALID");
  }
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_PORTAL_PUBLICATION_CONFIGURATION_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingPortalPublicationProfile.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_PORTAL_PUBLICATION_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingPortalPublicationProfile.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId || null,
        documentType,
        audienceType,
        exportProfileId: input.exportProfileId || null,
        deliveryMode,
        retentionDays: input.retentionDays ?? null,
        configuration: configuration ?? undefined,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_PORTAL_PUBLICATION_UPDATED",
      entityType: "AccountingPortalPublicationProfile",
      entityId: updated.id,
      beforeValues: { rowVersion: existing.rowVersion },
      afterValues: { rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingPortalPublicationProfile.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId || null,
      documentType,
      audienceType,
      exportProfileId: input.exportProfileId || null,
      deliveryMode,
      retentionDays: input.retentionDays ?? null,
      configuration: configuration ?? undefined,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_PORTAL_PUBLICATION_CREATED",
    entityType: "AccountingPortalPublicationProfile",
    entityId: created.id,
    afterValues: { rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingBudget(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  fiscalYearId: string;
  expectedVersion?: number;
  scenarioCode: string;
  name: string;
  version: number;
  currencyCode: string;
  periodGranularity: string;
  configurationJson?: string | null;
  approvedByMgmt: boolean;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const legalEntity = await db.accountingLegalEntity.findFirst({
    where: { id: input.legalEntityId, orgId: input.orgId },
  });
  if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  const fiscalYear = await db.fiscalYear.findFirst({
    where: { id: input.fiscalYearId, orgId: input.orgId },
  });
  if (!fiscalYear) throw new Error("CONFIGURATION_FISCAL_YEAR_NOT_FOUND");
  const scenarioCode = assertBudgetScenarioCode(input.scenarioCode);
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("CONFIGURATION_BUDGET_NAME_REQUIRED");
  if (!Number.isInteger(input.version) || input.version <= 0) {
    throw new Error("CONFIGURATION_BUDGET_VERSION_INVALID");
  }
  const currencyCode = assertCurrencyCode(input.currencyCode);
  const currency = await db.accountingCurrency.findFirst({
    where: { orgId: input.orgId, code: currencyCode, isEnabled: true },
  });
  if (!currency) throw new Error("CONFIGURATION_BUDGET_CURRENCY_INVALID");
  const periodGranularity = assertBudgetPeriodGranularity(
    input.periodGranularity,
  );
  const configuration = parseJsonObject(
    input.configurationJson,
    "CONFIGURATION_BUDGET_CONFIGURATION_JSON_INVALID",
  );
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_BUDGET_EFFECTIVE_FROM_REQUIRED",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_BUDGET_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_BUDGET_EFFECTIVE_RANGE_INVALID");
  }
  if (
    effectiveFrom < fiscalYear.startDate ||
    effectiveFrom > fiscalYear.endDate ||
    (effectiveTo &&
      (effectiveTo < fiscalYear.startDate || effectiveTo > fiscalYear.endDate))
  ) {
    throw new Error("CONFIGURATION_BUDGET_FISCAL_YEAR_SCOPE_INVALID");
  }

  if (input.id) {
    const existing = await db.accountingBudget.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_BUDGET_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.$transaction(async (tx: any) => {
      if (input.isActive) {
        await tx.accountingBudget.updateMany({
          where: {
            orgId: input.orgId,
            legalEntityId: input.legalEntityId,
            fiscalYearId: input.fiscalYearId,
            scenarioCode,
            id: { not: existing.id },
            isActive: true,
          },
          data: { isActive: false, rowVersion: { increment: 1 } },
        });
      }
      return tx.accountingBudget.update({
        where: { id: existing.id },
        data: {
          legalEntityId: input.legalEntityId,
          fiscalYearId: input.fiscalYearId,
          scenarioCode,
          name,
          version: input.version,
          currencyCode,
          periodGranularity,
          configuration: configuration ?? undefined,
          approvedByMgmt: input.approvedByMgmt,
          isActive: input.isActive,
          effectiveFrom,
          effectiveTo,
          rowVersion: { increment: 1 },
        },
      });
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_BUDGET_UPDATED",
      entityType: "AccountingBudget",
      entityId: updated.id,
      beforeValues: {
        scenarioCode: existing.scenarioCode,
        version: existing.version,
        isActive: existing.isActive,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        scenarioCode: updated.scenarioCode,
        version: updated.version,
        isActive: updated.isActive,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.$transaction(async (tx: any) => {
    if (input.isActive) {
      await tx.accountingBudget.updateMany({
        where: {
          orgId: input.orgId,
          legalEntityId: input.legalEntityId,
          fiscalYearId: input.fiscalYearId,
          scenarioCode,
          isActive: true,
        },
        data: { isActive: false, rowVersion: { increment: 1 } },
      });
    }
    return tx.accountingBudget.create({
      data: {
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        fiscalYearId: input.fiscalYearId,
        scenarioCode,
        name,
        version: input.version,
        currencyCode,
        periodGranularity,
        configuration: configuration ?? undefined,
        approvedByMgmt: input.approvedByMgmt,
        isActive: input.isActive,
        effectiveFrom,
        effectiveTo,
        createdById: input.actorId,
      },
    });
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_BUDGET_CREATED",
    entityType: "AccountingBudget",
    entityId: created.id,
    afterValues: {
      scenarioCode: created.scenarioCode,
      version: created.version,
      isActive: created.isActive,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingBudgetLine(input: {
  id?: string;
  orgId: string;
  actorId: string;
  budgetId: string;
  legalEntityId: string;
  expectedVersion?: number;
  lineNumber: number;
  periodStart: string;
  periodEnd: string;
  accountId: string;
  dimensionValueId?: string | null;
  amount: string;
  quantity?: string | null;
  assumptionsJson?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  if (!Number.isInteger(input.lineNumber) || input.lineNumber <= 0) {
    throw new Error("CONFIGURATION_BUDGET_LINE_NUMBER_INVALID");
  }
  const budget = await db.accountingBudget.findFirst({
    where: { id: input.budgetId, orgId: input.orgId },
    include: { fiscalYear: true },
  });
  if (!budget) throw new Error("CONFIGURATION_BUDGET_NOT_FOUND");
  if (budget.legalEntityId !== input.legalEntityId) {
    throw new Error("CONFIGURATION_BUDGET_LINE_SCOPE_INVALID");
  }
  const periodStart = parseRequiredDate(
    input.periodStart,
    "CONFIGURATION_BUDGET_LINE_PERIOD_START_REQUIRED",
  );
  const periodEnd = parseRequiredDate(
    input.periodEnd,
    "CONFIGURATION_BUDGET_LINE_PERIOD_END_REQUIRED",
  );
  if (periodEnd < periodStart) {
    throw new Error("CONFIGURATION_BUDGET_LINE_PERIOD_RANGE_INVALID");
  }
  if (
    periodStart < budget.fiscalYear.startDate ||
    periodEnd > budget.fiscalYear.endDate
  ) {
    throw new Error("CONFIGURATION_BUDGET_LINE_FISCAL_YEAR_SCOPE_INVALID");
  }
  if (
    periodStart < budget.effectiveFrom ||
    (budget.effectiveTo && periodEnd > budget.effectiveTo)
  ) {
    throw new Error("CONFIGURATION_BUDGET_LINE_EFFECTIVE_SCOPE_INVALID");
  }
  const account = await db.account.findFirst({
    where: {
      id: input.accountId,
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      isActive: true,
      isGroup: false,
    },
  });
  if (!account) throw new Error("CONFIGURATION_BUDGET_LINE_ACCOUNT_INVALID");
  if (input.dimensionValueId) {
    const dimensionValue = await db.accountingDimensionValue.findFirst({
      where: {
        id: input.dimensionValueId,
        definition: { orgId: input.orgId },
        isActive: true,
      },
    });
    if (!dimensionValue) {
      throw new Error("CONFIGURATION_BUDGET_LINE_DIMENSION_VALUE_INVALID");
    }
  }
  const amount = signedDecimalString(
    input.amount,
    "CONFIGURATION_BUDGET_LINE_AMOUNT_INVALID",
  );
  const quantity = optionalDecimalString(
    input.quantity,
    "CONFIGURATION_BUDGET_LINE_QUANTITY_INVALID",
  );
  const assumptions = parseJsonObject(
    input.assumptionsJson,
    "CONFIGURATION_BUDGET_LINE_ASSUMPTIONS_JSON_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingBudgetLine.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_BUDGET_LINE_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingBudgetLine.update({
      where: { id: existing.id },
      data: {
        budgetId: input.budgetId,
        legalEntityId: input.legalEntityId,
        lineNumber: input.lineNumber,
        periodStart,
        periodEnd,
        accountId: input.accountId,
        dimensionValueId: input.dimensionValueId || null,
        amount,
        quantity,
        assumptions: assumptions ?? undefined,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_BUDGET_LINE_UPDATED",
      entityType: "AccountingBudgetLine",
      entityId: updated.id,
      beforeValues: {
        lineNumber: existing.lineNumber,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        lineNumber: updated.lineNumber,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingBudgetLine.create({
    data: {
      orgId: input.orgId,
      budgetId: input.budgetId,
      legalEntityId: input.legalEntityId,
      lineNumber: input.lineNumber,
      periodStart,
      periodEnd,
      accountId: input.accountId,
      dimensionValueId: input.dimensionValueId || null,
      amount,
      quantity,
      assumptions: assumptions ?? undefined,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_BUDGET_LINE_CREATED",
    entityType: "AccountingBudgetLine",
    entityId: created.id,
    afterValues: {
      lineNumber: created.lineNumber,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingTaxProfile(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId?: string | null;
  taxRegistrationId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  version: number;
  configurationJson?: string | null;
  statutoryValidated: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_TAX_PROFILE_CODE_INVALID",
  );
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("CONFIGURATION_TAX_PROFILE_NAME_REQUIRED");
  if (!Number.isInteger(input.version) || input.version <= 0) {
    throw new Error("CONFIGURATION_TAX_PROFILE_VERSION_INVALID");
  }
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_TAX_PROFILE_EFFECTIVE_FROM_REQUIRED",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_TAX_PROFILE_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_TAX_PROFILE_EFFECTIVE_RANGE_INVALID");
  }
  const configuration = String(input.configurationJson ?? "").trim()
    ? JSON.parse(String(input.configurationJson))
    : null;
  const taxRegistration = await db.accountingTaxRegistration.findFirst({
    where: { id: input.taxRegistrationId, orgId: input.orgId },
  });
  if (!taxRegistration) {
    throw new Error("CONFIGURATION_TAX_REGISTRATION_NOT_FOUND");
  }
  if (input.legalEntityId && input.legalEntityId !== taxRegistration.legalEntityId) {
    throw new Error("CONFIGURATION_TAX_PROFILE_LEGAL_ENTITY_SCOPE_INVALID");
  }

  if (input.id) {
    const existing = await db.accountingTaxProfile.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_TAX_PROFILE_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingTaxProfile.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId || null,
        taxRegistrationId: taxRegistration.id,
        code,
        name,
        version: input.version,
        configuration: configuration ?? undefined,
        statutoryValidated: input.statutoryValidated,
        effectiveFrom,
        effectiveTo,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_TAX_PROFILE_UPDATED",
      entityType: "AccountingTaxProfile",
      entityId: updated.id,
      beforeValues: {
        legalEntityId: existing.legalEntityId,
        taxRegistrationId: existing.taxRegistrationId,
        code: existing.code,
        name: existing.name,
        version: existing.version,
        statutoryValidated: existing.statutoryValidated,
        effectiveFrom: iso(existing.effectiveFrom),
        effectiveTo: iso(existing.effectiveTo),
        isActive: existing.isActive,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        legalEntityId: updated.legalEntityId,
        taxRegistrationId: updated.taxRegistrationId,
        code: updated.code,
        name: updated.name,
        version: updated.version,
        statutoryValidated: updated.statutoryValidated,
        effectiveFrom: iso(updated.effectiveFrom),
        effectiveTo: iso(updated.effectiveTo),
        isActive: updated.isActive,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingTaxProfile.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId || null,
      taxRegistrationId: taxRegistration.id,
      code,
      name,
      version: input.version,
      configuration: configuration ?? undefined,
      statutoryValidated: input.statutoryValidated,
      effectiveFrom,
      effectiveTo,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_TAX_PROFILE_CREATED",
    entityType: "AccountingTaxProfile",
    entityId: created.id,
    afterValues: {
      legalEntityId: created.legalEntityId,
      taxRegistrationId: created.taxRegistrationId,
      code: created.code,
      name: created.name,
      version: created.version,
      statutoryValidated: created.statutoryValidated,
      effectiveFrom: iso(created.effectiveFrom),
      effectiveTo: iso(created.effectiveTo),
      isActive: created.isActive,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingTaxRule(input: {
  id?: string;
  orgId: string;
  actorId: string;
  taxProfileId: string;
  legalEntityId?: string | null;
  taxRegistrationId: string;
  expectedVersion?: number;
  code: string;
  documentType: string;
  placeOfSupplyType: string;
  counterpartyTreatment: string;
  supplyCategory: string;
  version: number;
  configurationJson: string;
  componentsJson: string;
  statutoryValidated: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_TAX_RULE_CODE_INVALID",
  );
  const documentType = assertTaxRuleDocumentType(input.documentType);
  const placeOfSupplyType = assertTaxRulePlaceOfSupplyType(
    input.placeOfSupplyType,
  );
  const counterpartyTreatment = assertTaxRuleCounterpartyTreatment(
    input.counterpartyTreatment,
  );
  const supplyCategory = assertTaxRuleSupplyCategory(input.supplyCategory);
  if (!Number.isInteger(input.version) || input.version <= 0) {
    throw new Error("CONFIGURATION_TAX_RULE_VERSION_INVALID");
  }
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_TAX_RULE_EFFECTIVE_FROM_REQUIRED",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_TAX_RULE_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_TAX_RULE_EFFECTIVE_RANGE_INVALID");
  }
  const configuration = JSON.parse(String(input.configurationJson ?? "{}"));
  const parsedComponents = JSON.parse(String(input.componentsJson ?? "[]"));
  if (!Array.isArray(parsedComponents) || parsedComponents.length === 0) {
    throw new Error("CONFIGURATION_TAX_COMPONENTS_REQUIRED");
  }
  const components = parsedComponents.map((component: any, index: number) => ({
    componentCode: assertDimensionCode(
      String(component?.componentCode ?? ""),
      "CONFIGURATION_TAX_COMPONENT_CODE_INVALID",
    ),
    componentType: assertTaxComponentType(String(component?.componentType ?? "")),
    ratePercent: decimalString(String(component?.ratePercent ?? "")),
    recoverablePercent:
      component?.recoverablePercent == null ||
      String(component.recoverablePercent).trim() === ""
        ? null
        : decimalString(String(component.recoverablePercent)),
    ledgerAccountRole:
      String(component?.ledgerAccountRole ?? "").trim() || null,
    position:
      Number.isInteger(component?.position) && component.position > 0
        ? component.position
        : index + 1,
    configuration:
      component?.configuration && typeof component.configuration === "object"
        ? component.configuration
        : null,
  }));

  const taxProfile = await db.accountingTaxProfile.findFirst({
    where: { id: input.taxProfileId, orgId: input.orgId },
  });
  if (!taxProfile) throw new Error("CONFIGURATION_TAX_PROFILE_NOT_FOUND");
  if (taxProfile.taxRegistrationId !== input.taxRegistrationId) {
    throw new Error("CONFIGURATION_TAX_RULE_PROFILE_REGISTRATION_MISMATCH");
  }
  if (
    input.legalEntityId &&
    taxProfile.legalEntityId &&
    input.legalEntityId !== taxProfile.legalEntityId
  ) {
    throw new Error("CONFIGURATION_TAX_RULE_LEGAL_ENTITY_SCOPE_INVALID");
  }

  return db.$transaction(async (tx: any) => {
    if (input.id) {
      const existing = await tx.accountingTaxRule.findFirst({
        where: { id: input.id, orgId: input.orgId },
        include: { components: true },
      });
      if (!existing) throw new Error("CONFIGURATION_TAX_RULE_NOT_FOUND");
      requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
      const updated = await tx.accountingTaxRule.update({
        where: { id: existing.id },
        data: {
          taxProfileId: taxProfile.id,
          legalEntityId: input.legalEntityId || null,
          taxRegistrationId: input.taxRegistrationId,
          code,
          documentType,
          placeOfSupplyType,
          counterpartyTreatment,
          supplyCategory,
          version: input.version,
          configuration,
          statutoryValidated: input.statutoryValidated,
          effectiveFrom,
          effectiveTo,
          isActive: input.isActive,
          rowVersion: { increment: 1 },
        },
      });
      await tx.accountingTaxComponent.deleteMany({
        where: { taxRuleId: existing.id },
      });
      await tx.accountingTaxComponent.createMany({
        data: components.map((component) => ({
          orgId: input.orgId,
          taxRuleId: existing.id,
          componentCode: component.componentCode,
          componentType: component.componentType,
          ratePercent: component.ratePercent,
          recoverablePercent: component.recoverablePercent,
          ledgerAccountRole: component.ledgerAccountRole,
          position: component.position,
          configuration: component.configuration ?? undefined,
        })),
      });
      await createConfigurationAuditLog({
        orgId: input.orgId,
        actorId: input.actorId,
        action: "ACCOUNTING_CONFIGURATION_TAX_RULE_UPDATED",
        entityType: "AccountingTaxRule",
        entityId: updated.id,
        beforeValues: {
          code: existing.code,
          documentType: existing.documentType,
          placeOfSupplyType: existing.placeOfSupplyType,
          counterpartyTreatment: existing.counterpartyTreatment,
          supplyCategory: existing.supplyCategory,
          version: existing.version,
          statutoryValidated: existing.statutoryValidated,
          effectiveFrom: iso(existing.effectiveFrom),
          effectiveTo: iso(existing.effectiveTo),
          isActive: existing.isActive,
          rowVersion: existing.rowVersion,
          components: existing.components.map((component: any) => ({
            componentCode: component.componentCode,
            componentType: component.componentType,
            ratePercent: component.ratePercent.toString(),
            recoverablePercent:
              component.recoverablePercent?.toString() ?? null,
            ledgerAccountRole: component.ledgerAccountRole,
            position: component.position,
          })),
        },
        afterValues: {
          code: updated.code,
          documentType: updated.documentType,
          placeOfSupplyType: updated.placeOfSupplyType,
          counterpartyTreatment: updated.counterpartyTreatment,
          supplyCategory: updated.supplyCategory,
          version: updated.version,
          statutoryValidated: updated.statutoryValidated,
          effectiveFrom: iso(updated.effectiveFrom),
          effectiveTo: iso(updated.effectiveTo),
          isActive: updated.isActive,
          rowVersion: updated.rowVersion,
          components,
          reason,
        },
      });
      return updated;
    }

    const created = await tx.accountingTaxRule.create({
      data: {
        orgId: input.orgId,
        taxProfileId: taxProfile.id,
        legalEntityId: input.legalEntityId || null,
        taxRegistrationId: input.taxRegistrationId,
        code,
        documentType,
        placeOfSupplyType,
        counterpartyTreatment,
        supplyCategory,
        version: input.version,
        configuration,
        statutoryValidated: input.statutoryValidated,
        effectiveFrom,
        effectiveTo,
        isActive: input.isActive,
        components: {
          create: components.map((component) => ({
            orgId: input.orgId,
            componentCode: component.componentCode,
            componentType: component.componentType,
            ratePercent: component.ratePercent,
            recoverablePercent: component.recoverablePercent,
            ledgerAccountRole: component.ledgerAccountRole,
            position: component.position,
            configuration: component.configuration ?? undefined,
          })),
        },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_TAX_RULE_CREATED",
      entityType: "AccountingTaxRule",
      entityId: created.id,
      afterValues: {
        taxProfileId: created.taxProfileId,
        legalEntityId: created.legalEntityId,
        taxRegistrationId: created.taxRegistrationId,
        code: created.code,
        documentType: created.documentType,
        placeOfSupplyType: created.placeOfSupplyType,
        counterpartyTreatment: created.counterpartyTreatment,
        supplyCategory: created.supplyCategory,
        version: created.version,
        statutoryValidated: created.statutoryValidated,
        effectiveFrom: iso(created.effectiveFrom),
        effectiveTo: iso(created.effectiveTo),
        isActive: created.isActive,
        rowVersion: created.rowVersion,
        components,
        reason,
      },
    });
    return created;
  });
}

export async function saveAccountingStatutoryReturnProfile(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId?: string | null;
  taxRegistrationId: string;
  expectedVersion?: number;
  returnType: string;
  filingFrequency: string;
  dueDayOfMonth?: number | null;
  configurationJson?: string | null;
  statutoryValidated: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const returnType = assertStatutoryReturnType(input.returnType);
  const filingFrequency = assertStatutoryFilingFrequency(input.filingFrequency);
  const dueDayOfMonth =
    input.dueDayOfMonth == null || Number.isNaN(input.dueDayOfMonth)
      ? null
      : input.dueDayOfMonth;
  if (dueDayOfMonth != null && (dueDayOfMonth < 1 || dueDayOfMonth > 31)) {
    throw new Error("CONFIGURATION_STATUTORY_DUE_DAY_INVALID");
  }
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_STATUTORY_RETURN_EFFECTIVE_FROM_REQUIRED",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_STATUTORY_RETURN_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_STATUTORY_RETURN_EFFECTIVE_RANGE_INVALID");
  }
  const configuration = String(input.configurationJson ?? "").trim()
    ? JSON.parse(String(input.configurationJson))
    : null;
  const taxRegistration = await db.accountingTaxRegistration.findFirst({
    where: { id: input.taxRegistrationId, orgId: input.orgId },
  });
  if (!taxRegistration) {
    throw new Error("CONFIGURATION_TAX_REGISTRATION_NOT_FOUND");
  }
  if (input.legalEntityId && input.legalEntityId !== taxRegistration.legalEntityId) {
    throw new Error("CONFIGURATION_STATUTORY_RETURN_LEGAL_ENTITY_SCOPE_INVALID");
  }

  if (input.id) {
    const existing = await db.accountingStatutoryReturnProfile.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) {
      throw new Error("CONFIGURATION_STATUTORY_RETURN_PROFILE_NOT_FOUND");
    }
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingStatutoryReturnProfile.update({
      where: { id: existing.id },
      data: {
        legalEntityId: input.legalEntityId || null,
        taxRegistrationId: input.taxRegistrationId,
        returnType,
        filingFrequency,
        dueDayOfMonth,
        configuration: configuration ?? undefined,
        statutoryValidated: input.statutoryValidated,
        effectiveFrom,
        effectiveTo,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_STATUTORY_RETURN_PROFILE_UPDATED",
      entityType: "AccountingStatutoryReturnProfile",
      entityId: updated.id,
      beforeValues: {
        returnType: existing.returnType,
        filingFrequency: existing.filingFrequency,
        dueDayOfMonth: existing.dueDayOfMonth,
        statutoryValidated: existing.statutoryValidated,
        effectiveFrom: iso(existing.effectiveFrom),
        effectiveTo: iso(existing.effectiveTo),
        isActive: existing.isActive,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        returnType: updated.returnType,
        filingFrequency: updated.filingFrequency,
        dueDayOfMonth: updated.dueDayOfMonth,
        statutoryValidated: updated.statutoryValidated,
        effectiveFrom: iso(updated.effectiveFrom),
        effectiveTo: iso(updated.effectiveTo),
        isActive: updated.isActive,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingStatutoryReturnProfile.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId || null,
      taxRegistrationId: input.taxRegistrationId,
      returnType,
      filingFrequency,
      dueDayOfMonth,
      configuration: configuration ?? undefined,
      statutoryValidated: input.statutoryValidated,
      effectiveFrom,
      effectiveTo,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_STATUTORY_RETURN_PROFILE_CREATED",
    entityType: "AccountingStatutoryReturnProfile",
    entityId: created.id,
    afterValues: {
      returnType: created.returnType,
      filingFrequency: created.filingFrequency,
      dueDayOfMonth: created.dueDayOfMonth,
      statutoryValidated: created.statutoryValidated,
      effectiveFrom: iso(created.effectiveFrom),
      effectiveTo: iso(created.effectiveTo),
      isActive: created.isActive,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingStatutoryFilingPeriod(input: {
  id?: string;
  orgId: string;
  actorId: string;
  profileId: string;
  legalEntityId?: string | null;
  taxRegistrationId: string;
  expectedVersion?: number;
  returnType: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
  status: string;
  acknowledgementRef?: string | null;
  configurationJson?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const returnType = assertStatutoryReturnType(input.returnType);
  const status = assertStatutoryFilingStatus(input.status);
  const periodStart = parseRequiredDate(
    input.periodStart,
    "CONFIGURATION_STATUTORY_FILING_PERIOD_START_REQUIRED",
  );
  const periodEnd = parseRequiredDate(
    input.periodEnd,
    "CONFIGURATION_STATUTORY_FILING_PERIOD_END_REQUIRED",
  );
  if (periodEnd < periodStart) {
    throw new Error("CONFIGURATION_STATUTORY_FILING_PERIOD_RANGE_INVALID");
  }
  const dueDate = parseDate(
    input.dueDate,
    "CONFIGURATION_STATUTORY_FILING_DUE_DATE_INVALID",
  );
  const configuration = String(input.configurationJson ?? "").trim()
    ? JSON.parse(String(input.configurationJson))
    : null;
  const profile = await db.accountingStatutoryReturnProfile.findFirst({
    where: { id: input.profileId, orgId: input.orgId },
  });
  if (!profile) {
    throw new Error("CONFIGURATION_STATUTORY_RETURN_PROFILE_NOT_FOUND");
  }
  if (profile.taxRegistrationId !== input.taxRegistrationId) {
    throw new Error("CONFIGURATION_STATUTORY_FILING_PROFILE_REGISTRATION_MISMATCH");
  }
  if (profile.returnType !== returnType) {
    throw new Error("CONFIGURATION_STATUTORY_FILING_PROFILE_RETURN_TYPE_MISMATCH");
  }

  const baseData = {
    profileId: input.profileId,
    legalEntityId: input.legalEntityId || null,
    taxRegistrationId: input.taxRegistrationId,
    returnType,
    periodStart,
    periodEnd,
    dueDate,
    status,
    acknowledgementRef:
      String(input.acknowledgementRef ?? "").trim() || null,
    filedAt: status === "FILED" ? new Date() : null,
    filedById: status === "FILED" ? input.actorId : null,
    configuration: configuration ?? undefined,
  };

  if (input.id) {
    const existing = await db.accountingStatutoryFilingPeriod.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) {
      throw new Error("CONFIGURATION_STATUTORY_FILING_PERIOD_NOT_FOUND");
    }
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingStatutoryFilingPeriod.update({
      where: { id: existing.id },
      data: {
        ...baseData,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_STATUTORY_FILING_PERIOD_UPDATED",
      entityType: "AccountingStatutoryFilingPeriod",
      entityId: updated.id,
      beforeValues: {
        periodStart: iso(existing.periodStart),
        periodEnd: iso(existing.periodEnd),
        dueDate: iso(existing.dueDate),
        status: existing.status,
        acknowledgementRef: existing.acknowledgementRef,
        rowVersion: existing.rowVersion,
      },
      afterValues: {
        periodStart: iso(updated.periodStart),
        periodEnd: iso(updated.periodEnd),
        dueDate: iso(updated.dueDate),
        status: updated.status,
        acknowledgementRef: updated.acknowledgementRef,
        filedAt: updated.filedAt?.toISOString() ?? null,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingStatutoryFilingPeriod.create({
    data: {
      orgId: input.orgId,
      ...baseData,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_STATUTORY_FILING_PERIOD_CREATED",
    entityType: "AccountingStatutoryFilingPeriod",
    entityId: created.id,
    afterValues: {
      periodStart: iso(created.periodStart),
      periodEnd: iso(created.periodEnd),
      dueDate: iso(created.dueDate),
      status: created.status,
      acknowledgementRef: created.acknowledgementRef,
      filedAt: created.filedAt?.toISOString() ?? null,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function requestAccountingPeriodLock(input: {
  orgId: string;
  actorId: string;
  periodId: string;
  reason: string;
  reopenFrom?: string | null;
  reopenUntil?: string | null;
}) {
  const reason = normalizeReason(input.reason);
  const period = await db.accountingPeriod.findFirst({
    where: { id: input.periodId, orgId: input.orgId },
  });
  if (!period) throw new Error("CONFIGURATION_PERIOD_NOT_FOUND");
  const reopenFrom = parseDate(
    input.reopenFrom,
    "CONFIGURATION_PERIOD_REOPEN_FROM_INVALID",
  );
  const reopenUntil = parseDate(
    input.reopenUntil,
    "CONFIGURATION_PERIOD_REOPEN_UNTIL_INVALID",
  );
  if ((reopenFrom && !reopenUntil) || (!reopenFrom && reopenUntil)) {
    throw new Error("CONFIGURATION_PERIOD_REOPEN_RANGE_REQUIRED");
  }
  if (reopenFrom && reopenUntil && reopenUntil < reopenFrom) {
    throw new Error("CONFIGURATION_PERIOD_REOPEN_RANGE_INVALID");
  }
  const created = await db.accountingPeriodLockRequest.create({
    data: {
      orgId: input.orgId,
      periodId: period.id,
      requestedById: input.actorId,
      reason,
      reopenFrom,
      reopenUntil,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_PERIOD_LOCK_REQUESTED",
    entityType: "AccountingPeriodLockRequest",
    entityId: created.id,
    afterValues: {
      periodId: created.periodId,
      status: created.status,
      rowVersion: created.rowVersion,
      reopenFrom: iso(created.reopenFrom),
      reopenUntil: iso(created.reopenUntil),
      reason,
    },
  });
  return created;
}

export async function decideAccountingPeriodLock(input: {
  orgId: string;
  actorId: string;
  requestId: string;
  expectedVersion: number;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
}) {
  const request = await db.accountingPeriodLockRequest.findFirst({
    where: { id: input.requestId, orgId: input.orgId },
    include: { period: true },
  });
  if (!request) throw new Error("CONFIGURATION_PERIOD_LOCK_REQUEST_NOT_FOUND");
  requireConfigurationRowVersion(request.rowVersion, input.expectedVersion);
  if (request.status !== "PENDING") {
    throw new Error("CONFIGURATION_PERIOD_LOCK_REQUEST_STATE_INVALID");
  }
  if (request.requestedById === input.actorId) {
    throw new Error("CONFIGURATION_PERIOD_LOCK_SELF_APPROVAL_FORBIDDEN");
  }
  const decisionReason =
    input.decision === "REJECTED" ? normalizeReason(input.reason) : null;

  return db.$transaction(async (tx: any) => {
    let appliedAt: Date | null = null;
    let relockedAt: Date | null = null;
    if (input.decision === "APPROVED") {
      if (request.reopenFrom && request.reopenUntil) {
        appliedAt = new Date();
        await tx.accountingPeriod.update({
          where: { id: request.periodId },
          data: {
            status: "OPEN",
            hardLockedAt: null,
            rowVersion: { increment: 1 },
          },
        });
      } else {
        appliedAt = new Date();
        relockedAt = new Date();
        await tx.accountingPeriod.update({
          where: { id: request.periodId },
          data: {
            status:
              request.period.status === "HARD_LOCKED" ? "HARD_LOCKED" : "SOFT_LOCKED",
            hardLockedAt:
              request.period.status === "HARD_LOCKED" ? request.period.hardLockedAt ?? new Date() : null,
            rowVersion: { increment: 1 },
          },
        });
      }
    }
    const updated = await tx.accountingPeriodLockRequest.update({
      where: { id: request.id },
      data: {
        status: input.decision,
        decidedById: input.actorId,
        decidedAt: new Date(),
        appliedAt,
        relockedAt,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action:
        input.decision === "APPROVED"
          ? "ACCOUNTING_CONFIGURATION_PERIOD_LOCK_APPROVED"
          : "ACCOUNTING_CONFIGURATION_PERIOD_LOCK_REJECTED",
      entityType: "AccountingPeriodLockRequest",
      entityId: updated.id,
      beforeValues: {
        status: request.status,
        rowVersion: request.rowVersion,
      },
      afterValues: {
        status: updated.status,
        rowVersion: updated.rowVersion,
        reason: decisionReason,
      },
    });
    return updated;
  });
}

export async function saveAccountingFiscalYear(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  name: string;
  startDate: string;
  endDate: string;
  closed: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const name = input.name.trim();
  if (!name) throw new Error("CONFIGURATION_FISCAL_YEAR_NAME_REQUIRED");
  const startDate = parseRequiredDate(
    input.startDate,
    "CONFIGURATION_FISCAL_YEAR_START_INVALID",
  );
  const endDate = parseRequiredDate(
    input.endDate,
    "CONFIGURATION_FISCAL_YEAR_END_INVALID",
  );
  if (endDate < startDate) {
    throw new Error("CONFIGURATION_FISCAL_YEAR_RANGE_INVALID");
  }

  if (input.id) {
    const existing = await db.fiscalYear.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_FISCAL_YEAR_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.fiscalYear.update({
      where: { id: existing.id },
      data: {
        name,
        startDate,
        endDate,
        closed: input.closed,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_FISCAL_YEAR_UPDATED",
      entityType: "FiscalYear",
      entityId: updated.id,
      beforeValues: { name: existing.name, rowVersion: existing.rowVersion, reason },
      afterValues: { name: updated.name, rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.fiscalYear.create({
    data: {
      orgId: input.orgId,
      name,
      startDate,
      endDate,
      closed: input.closed,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_FISCAL_YEAR_CREATED",
    entityType: "FiscalYear",
    entityId: created.id,
    afterValues: { name: created.name, rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingPeriod(input: {
  id?: string;
  orgId: string;
  actorId: string;
  fiscalYearId: string;
  expectedVersion?: number;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const periodNumber = Number(input.periodNumber);
  const name = input.name.trim();
  if (!Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > 24) {
    throw new Error("CONFIGURATION_PERIOD_NUMBER_INVALID");
  }
  if (!name) throw new Error("CONFIGURATION_PERIOD_NAME_REQUIRED");
  const startDate = parseRequiredDate(
    input.startDate,
    "CONFIGURATION_PERIOD_START_INVALID",
  );
  const endDate = parseRequiredDate(
    input.endDate,
    "CONFIGURATION_PERIOD_END_INVALID",
  );
  if (endDate < startDate) {
    throw new Error("CONFIGURATION_PERIOD_RANGE_INVALID");
  }
  if (!["OPEN", "SOFT_LOCKED", "HARD_LOCKED", "CLOSED"].includes(input.status)) {
    throw new Error("CONFIGURATION_PERIOD_STATUS_INVALID");
  }
  const fiscalYear = await db.fiscalYear.findFirst({
    where: { id: input.fiscalYearId, orgId: input.orgId },
    select: { id: true },
  });
  if (!fiscalYear) throw new Error("CONFIGURATION_FISCAL_YEAR_NOT_FOUND");

  if (input.id) {
    const existing = await db.accountingPeriod.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_PERIOD_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingPeriod.update({
      where: { id: existing.id },
      data: {
        fiscalYearId: fiscalYear.id,
        periodNumber,
        name,
        startDate,
        endDate,
        status: input.status,
        hardLockedAt: input.status === "HARD_LOCKED" ? new Date() : null,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_PERIOD_UPDATED",
      entityType: "AccountingPeriod",
      entityId: updated.id,
      beforeValues: { name: existing.name, status: existing.status, rowVersion: existing.rowVersion, reason },
      afterValues: { name: updated.name, status: updated.status, rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingPeriod.create({
    data: {
      orgId: input.orgId,
      fiscalYearId: fiscalYear.id,
      periodNumber,
      name,
      startDate,
      endDate,
      status: input.status,
      hardLockedAt: input.status === "HARD_LOCKED" ? new Date() : null,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_PERIOD_CREATED",
    entityType: "AccountingPeriod",
    entityId: created.id,
    afterValues: { name: created.name, status: created.status, rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingOrganisationProfile(input: {
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  functionalCurrencyCode: string;
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
  inventoryMode: string;
  moneyScale: number;
  quantityScale: number;
  exchangeRateScale: number;
  percentageScale: number;
  correctionPolicyJson?: string;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const functionalCurrencyCode = assertCurrencyCode(input.functionalCurrencyCode);
  const inventoryMode = assertInventoryMode(input.inventoryMode);
  const fiscalYearStartMonth = Number(input.fiscalYearStartMonth);
  const fiscalYearStartDay = Number(input.fiscalYearStartDay);
  const moneyScale = Number(input.moneyScale);
  const quantityScale = Number(input.quantityScale);
  const exchangeRateScale = Number(input.exchangeRateScale);
  const percentageScale = Number(input.percentageScale);
  if (
    !Number.isInteger(fiscalYearStartMonth) ||
    fiscalYearStartMonth < 1 ||
    fiscalYearStartMonth > 12
  ) {
    throw new Error("CONFIGURATION_FISCAL_YEAR_START_MONTH_INVALID");
  }
  if (
    !Number.isInteger(fiscalYearStartDay) ||
    fiscalYearStartDay < 1 ||
    fiscalYearStartDay > 31
  ) {
    throw new Error("CONFIGURATION_FISCAL_YEAR_START_DAY_INVALID");
  }
  for (const [value, code] of [
    [moneyScale, "CONFIGURATION_MONEY_SCALE_INVALID"],
    [quantityScale, "CONFIGURATION_QUANTITY_SCALE_INVALID"],
    [exchangeRateScale, "CONFIGURATION_EXCHANGE_RATE_SCALE_INVALID"],
    [percentageScale, "CONFIGURATION_PERCENTAGE_SCALE_INVALID"],
  ] as const) {
    if (!Number.isInteger(value) || value < 0 || value > 12) {
      throw new Error(code);
    }
  }
  const correctionPolicy =
    input.correctionPolicyJson && input.correctionPolicyJson.trim()
      ? JSON.parse(input.correctionPolicyJson)
      : null;

  const existing = await db.accountingOrganisationProfile.findUnique({
    where: { orgId: input.orgId },
  });
  if (existing) {
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingOrganisationProfile.update({
      where: { orgId: input.orgId },
      data: {
        functionalCurrencyCode,
        fiscalYearStartMonth,
        fiscalYearStartDay,
        inventoryMode,
        moneyScale,
        quantityScale,
        exchangeRateScale,
        percentageScale,
        correctionPolicy,
        correctionPolicyVersion: correctionPolicy ? existing.rowVersion + 1 : null,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_PROFILE_UPDATED",
      entityType: "AccountingOrganisationProfile",
      entityId: updated.id,
      beforeValues: {
        functionalCurrencyCode: existing.functionalCurrencyCode,
        inventoryMode: existing.inventoryMode,
        rowVersion: existing.rowVersion,
        reason,
      },
      afterValues: {
        functionalCurrencyCode: updated.functionalCurrencyCode,
        inventoryMode: updated.inventoryMode,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }
  const created = await db.accountingOrganisationProfile.create({
    data: {
      orgId: input.orgId,
      functionalCurrencyCode,
      fiscalYearStartMonth,
      fiscalYearStartDay,
      inventoryMode,
      moneyScale,
      quantityScale,
      exchangeRateScale,
      percentageScale,
      correctionPolicy,
      correctionPolicyVersion: correctionPolicy ? 1 : null,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_PROFILE_CREATED",
    entityType: "AccountingOrganisationProfile",
    entityId: created.id,
    afterValues: {
      functionalCurrencyCode: created.functionalCurrencyCode,
      inventoryMode: created.inventoryMode,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingLegalEntity(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  code: string;
  legalName: string;
  entityType: string;
  status: string;
  isDefault: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = input.code.trim().toUpperCase();
  const legalName = input.legalName.trim();
  if (!code) throw new Error("CONFIGURATION_LEGAL_ENTITY_CODE_REQUIRED");
  if (!legalName) throw new Error("CONFIGURATION_LEGAL_ENTITY_NAME_REQUIRED");
  const entityType = assertEntityType(input.entityType);
  const status = assertLegalEntityStatus(input.status);
  const effectiveFrom = parseDate(
    input.effectiveFrom,
    "CONFIGURATION_EFFECTIVE_FROM_INVALID",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_EFFECTIVE_TO_INVALID",
  );
  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_EFFECTIVE_RANGE_INVALID");
  }

  return db.$transaction(async (tx: any) => {
    if (input.isDefault) {
      await tx.accountingLegalEntity.updateMany({
        where: { orgId: input.orgId, isDefault: true },
        data: { isDefault: false, rowVersion: { increment: 1 } },
      });
    }
    if (input.id) {
      const existing = await tx.accountingLegalEntity.findFirst({
        where: { id: input.id, orgId: input.orgId },
      });
      if (!existing) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
      requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
      const updated = await tx.accountingLegalEntity.update({
        where: { id: existing.id },
        data: {
          code,
          legalName,
          entityType,
          status,
          isDefault: input.isDefault,
          effectiveFrom,
          effectiveTo,
          rowVersion: { increment: 1 },
        },
      });
      await createConfigurationAuditLog({
        orgId: input.orgId,
        actorId: input.actorId,
        action: "ACCOUNTING_CONFIGURATION_LEGAL_ENTITY_UPDATED",
        entityType: "AccountingLegalEntity",
        entityId: updated.id,
        beforeValues: { code: existing.code, status: existing.status, rowVersion: existing.rowVersion, reason },
        afterValues: { code: updated.code, status: updated.status, rowVersion: updated.rowVersion, reason },
      });
      return updated;
    }
    const created = await tx.accountingLegalEntity.create({
      data: {
        orgId: input.orgId,
        code,
        legalName,
        entityType,
        status,
        isDefault: input.isDefault,
        effectiveFrom,
        effectiveTo,
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_LEGAL_ENTITY_CREATED",
      entityType: "AccountingLegalEntity",
      entityId: created.id,
      afterValues: { code: created.code, status: created.status, rowVersion: created.rowVersion, reason },
    });
    return created;
  });
}

export async function saveAccountingTaxRegistration(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  expectedVersion?: number;
  registrationCode: string;
  registrationType: string;
  gstin?: string | null;
  stateCode?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const registrationCode = input.registrationCode.trim().toUpperCase();
  if (!registrationCode) {
    throw new Error("CONFIGURATION_REGISTRATION_CODE_REQUIRED");
  }
  const registrationType = assertRegistrationType(input.registrationType);
  const effectiveFrom = parseDate(
    input.effectiveFrom,
    "CONFIGURATION_REGISTRATION_EFFECTIVE_FROM_INVALID",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_REGISTRATION_EFFECTIVE_TO_INVALID",
  );
  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_EFFECTIVE_RANGE_INVALID");
  }
  const entity = await db.accountingLegalEntity.findFirst({
    where: { id: input.legalEntityId, orgId: input.orgId },
    select: { id: true },
  });
  if (!entity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");

  if (input.id) {
    const existing = await db.accountingTaxRegistration.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_REGISTRATION_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingTaxRegistration.update({
      where: { id: existing.id },
      data: {
        legalEntityId: entity.id,
        registrationCode,
        registrationType,
        gstin: input.gstin?.trim() || null,
        stateCode: input.stateCode?.trim() || null,
        legalName: input.legalName?.trim() || null,
        tradeName: input.tradeName?.trim() || null,
        effectiveFrom,
        effectiveTo,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_TAX_REGISTRATION_UPDATED",
      entityType: "AccountingTaxRegistration",
      entityId: updated.id,
      beforeValues: { registrationCode: existing.registrationCode, rowVersion: existing.rowVersion, reason },
      afterValues: { registrationCode: updated.registrationCode, rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }

  const created = await db.accountingTaxRegistration.create({
    data: {
      orgId: input.orgId,
      legalEntityId: entity.id,
      registrationCode,
      registrationType,
      gstin: input.gstin?.trim() || null,
      stateCode: input.stateCode?.trim() || null,
      legalName: input.legalName?.trim() || null,
      tradeName: input.tradeName?.trim() || null,
      effectiveFrom,
      effectiveTo,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_TAX_REGISTRATION_CREATED",
    entityType: "AccountingTaxRegistration",
    entityId: created.id,
    afterValues: { registrationCode: created.registrationCode, rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function saveAccountingDimensionDefinition(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  valueSource: string;
  isRequired: boolean;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_DIMENSION_CODE_INVALID",
  );
  const name = input.name.trim();
  if (!name) throw new Error("CONFIGURATION_DIMENSION_NAME_REQUIRED");
  const valueSource = assertDimensionValueSource(input.valueSource);

  if (input.id) {
    const existing = await db.accountingDimensionDefinition.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_DIMENSION_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingDimensionDefinition.update({
      where: { id: existing.id },
      data: {
        code,
        name,
        valueSource,
        isRequired: input.isRequired,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_DIMENSION_UPDATED",
      entityType: "AccountingDimensionDefinition",
      entityId: updated.id,
      beforeValues: {
        code: existing.code,
        valueSource: existing.valueSource,
        rowVersion: existing.rowVersion,
        reason,
      },
      afterValues: {
        code: updated.code,
        valueSource: updated.valueSource,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingDimensionDefinition.create({
    data: {
      orgId: input.orgId,
      code,
      name,
      valueSource,
      isRequired: input.isRequired,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_DIMENSION_CREATED",
    entityType: "AccountingDimensionDefinition",
    entityId: created.id,
    afterValues: {
      code: created.code,
      valueSource: created.valueSource,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingDimensionValue(input: {
  id?: string;
  orgId: string;
  actorId: string;
  definitionId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  canonicalType?: string | null;
  canonicalId?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_DIMENSION_VALUE_CODE_INVALID",
  );
  const name = input.name.trim();
  if (!name) throw new Error("CONFIGURATION_DIMENSION_VALUE_NAME_REQUIRED");
  const effectiveFrom = parseDate(
    input.effectiveFrom,
    "CONFIGURATION_DIMENSION_VALUE_EFFECTIVE_FROM_INVALID",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_DIMENSION_VALUE_EFFECTIVE_TO_INVALID",
  );
  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_EFFECTIVE_RANGE_INVALID");
  }
  const canonicalType = input.canonicalType?.trim().toUpperCase() || null;
  const canonicalId = input.canonicalId?.trim() || null;
  if ((canonicalType && !canonicalId) || (!canonicalType && canonicalId)) {
    throw new Error("CONFIGURATION_DIMENSION_VALUE_CANONICAL_PAIR_REQUIRED");
  }
  const definition = await db.accountingDimensionDefinition.findFirst({
    where: { id: input.definitionId, orgId: input.orgId },
    select: { id: true },
  });
  if (!definition) throw new Error("CONFIGURATION_DIMENSION_NOT_FOUND");

  if (input.id) {
    const existing = await db.accountingDimensionValue.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_DIMENSION_VALUE_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingDimensionValue.update({
      where: { id: existing.id },
      data: {
        definitionId: definition.id,
        code,
        name,
        canonicalType,
        canonicalId,
        effectiveFrom,
        effectiveTo,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_DIMENSION_VALUE_UPDATED",
      entityType: "AccountingDimensionValue",
      entityId: updated.id,
      beforeValues: {
        code: existing.code,
        definitionId: existing.definitionId,
        rowVersion: existing.rowVersion,
        reason,
      },
      afterValues: {
        code: updated.code,
        definitionId: updated.definitionId,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingDimensionValue.create({
    data: {
      orgId: input.orgId,
      definitionId: definition.id,
      code,
      name,
      canonicalType,
      canonicalId,
      effectiveFrom,
      effectiveTo,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_DIMENSION_VALUE_CREATED",
    entityType: "AccountingDimensionValue",
    entityId: created.id,
    afterValues: {
      code: created.code,
      definitionId: created.definitionId,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingApprovalPolicy(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  code: string;
  documentType: string;
  configurationJson: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertDimensionCode(
    input.code,
    "CONFIGURATION_APPROVAL_POLICY_CODE_INVALID",
  );
  const documentType = assertApprovalDocumentType(input.documentType);
  const configurationText = input.configurationJson.trim();
  if (!configurationText) {
    throw new Error("CONFIGURATION_APPROVAL_POLICY_CONFIGURATION_REQUIRED");
  }
  let configuration: unknown;
  try {
    configuration = JSON.parse(configurationText);
  } catch {
    throw new Error("CONFIGURATION_APPROVAL_POLICY_CONFIGURATION_INVALID");
  }
  const effectiveFrom = parseDate(
    input.effectiveFrom,
    "CONFIGURATION_APPROVAL_POLICY_EFFECTIVE_FROM_INVALID",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_APPROVAL_POLICY_EFFECTIVE_TO_INVALID",
  );
  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_EFFECTIVE_RANGE_INVALID");
  }

  if (input.id) {
    const existing = await db.accountingApprovalPolicy.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_APPROVAL_POLICY_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingApprovalPolicy.update({
      where: { id: existing.id },
      data: {
        code,
        documentType,
        configuration: configuration as object,
        isActive: input.isActive,
        effectiveFrom,
        effectiveTo,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_APPROVAL_POLICY_UPDATED",
      entityType: "AccountingApprovalPolicy",
      entityId: updated.id,
      beforeValues: {
        code: existing.code,
        documentType: existing.documentType,
        version: existing.version,
        rowVersion: existing.rowVersion,
        reason,
      },
      afterValues: {
        code: updated.code,
        documentType: updated.documentType,
        version: updated.version,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const latest = await db.accountingApprovalPolicy.findFirst({
    where: {
      orgId: input.orgId,
      code,
    },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const created = await db.accountingApprovalPolicy.create({
    data: {
      orgId: input.orgId,
      code,
      documentType,
      version: (latest?.version ?? 0) + 1,
      configuration: configuration as object,
      isActive: input.isActive,
      effectiveFrom,
      effectiveTo,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_APPROVAL_POLICY_CREATED",
    entityType: "AccountingApprovalPolicy",
    entityId: created.id,
    afterValues: {
      code: created.code,
      documentType: created.documentType,
      version: created.version,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingAccountControl(input: {
  id?: string;
  orgId: string;
  actorId: string;
  accountId: string;
  expectedVersion?: number;
  defaultCurrencyId?: string | null;
  systemRole?: string | null;
  isSystemLocked: boolean;
  allowDirectPosting: boolean;
  requiresParty: boolean;
  requiresChaJob: boolean;
  requiresCostCentre: boolean;
  effectiveFrom: string;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const account = await db.account.findFirst({
    where: { id: input.accountId, orgId: input.orgId },
    select: { id: true },
  });
  if (!account) throw new Error("CONFIGURATION_ACCOUNT_NOT_FOUND");
  const defaultCurrencyId = input.defaultCurrencyId?.trim() || null;
  if (defaultCurrencyId) {
    const currency = await db.accountingCurrency.findFirst({
      where: { id: defaultCurrencyId, orgId: input.orgId },
      select: { id: true },
    });
    if (!currency) throw new Error("CONFIGURATION_CURRENCY_NOT_FOUND");
  }
  const systemRole = input.systemRole?.trim().toUpperCase() || null;
  if (systemRole && !/^[A-Z][A-Z0-9_]{1,63}$/.test(systemRole)) {
    throw new Error("CONFIGURATION_ACCOUNT_CONTROL_SYSTEM_ROLE_INVALID");
  }
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_ACCOUNT_CONTROL_EFFECTIVE_FROM_INVALID",
  );

  if (input.id) {
    const existing = await db.accountingAccountControl.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_ACCOUNT_CONTROL_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingAccountControl.update({
      where: { id: existing.id },
      data: {
        accountId: account.id,
        defaultCurrencyId,
        systemRole,
        isSystemLocked: input.isSystemLocked,
        allowDirectPosting: input.allowDirectPosting,
        requiresParty: input.requiresParty,
        requiresChaJob: input.requiresChaJob,
        requiresCostCentre: input.requiresCostCentre,
        effectiveFrom,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_ACCOUNT_CONTROL_UPDATED",
      entityType: "AccountingAccountControl",
      entityId: updated.id,
      beforeValues: {
        accountId: existing.accountId,
        systemRole: existing.systemRole,
        rowVersion: existing.rowVersion,
        reason,
      },
      afterValues: {
        accountId: updated.accountId,
        systemRole: updated.systemRole,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingAccountControl.create({
    data: {
      orgId: input.orgId,
      accountId: account.id,
      defaultCurrencyId,
      systemRole,
      isSystemLocked: input.isSystemLocked,
      allowDirectPosting: input.allowDirectPosting,
      requiresParty: input.requiresParty,
      requiresChaJob: input.requiresChaJob,
      requiresCostCentre: input.requiresCostCentre,
      effectiveFrom,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_ACCOUNT_CONTROL_CREATED",
    entityType: "AccountingAccountControl",
    entityId: created.id,
    afterValues: {
      accountId: created.accountId,
      systemRole: created.systemRole,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingCounterpartyEntityScope(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  partyType: string;
  partyId: string;
  expectedVersion?: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const partyType = assertCounterpartyType(input.partyType);
  const legalEntity = await db.accountingLegalEntity.findFirst({
    where: { id: input.legalEntityId, orgId: input.orgId },
    select: { id: true },
  });
  if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  const partyId = input.partyId.trim();
  if (!partyId) throw new Error("CONFIGURATION_COUNTERPARTY_ID_REQUIRED");
  const party =
    partyType === "CUSTOMER"
      ? await db.crmAccount.findFirst({
          where: { id: partyId, orgId: input.orgId, status: "ACTIVE" },
          select: { id: true },
        })
      : await db.crmVendor.findFirst({
          where: { id: partyId, orgId: input.orgId, status: "ACTIVE" },
          select: { id: true },
        });
  if (!party) throw new Error("CONFIGURATION_COUNTERPARTY_NOT_FOUND");
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_COUNTERPARTY_SCOPE_EFFECTIVE_FROM_INVALID",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_COUNTERPARTY_SCOPE_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_EFFECTIVE_RANGE_INVALID");
  }

  if (input.id) {
    const existing = await db.accountingCounterpartyEntityScope.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_COUNTERPARTY_SCOPE_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingCounterpartyEntityScope.update({
      where: { id: existing.id },
      data: {
        legalEntityId: legalEntity.id,
        partyType,
        partyId,
        isActive: input.isActive,
        effectiveFrom,
        effectiveTo,
        approvedById: input.actorId,
        approvedAt: new Date(),
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_COUNTERPARTY_SCOPE_UPDATED",
      entityType: "AccountingCounterpartyEntityScope",
      entityId: updated.id,
      beforeValues: {
        legalEntityId: existing.legalEntityId,
        partyType: existing.partyType,
        partyId: existing.partyId,
        version: existing.version,
        rowVersion: existing.rowVersion,
        reason,
      },
      afterValues: {
        legalEntityId: updated.legalEntityId,
        partyType: updated.partyType,
        partyId: updated.partyId,
        version: updated.version,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const latest = await db.accountingCounterpartyEntityScope.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: legalEntity.id,
      partyType,
      partyId,
    },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const created = await db.accountingCounterpartyEntityScope.create({
    data: {
      orgId: input.orgId,
      legalEntityId: legalEntity.id,
      partyType,
      partyId,
      version: (latest?.version ?? 0) + 1,
      isActive: input.isActive,
      effectiveFrom,
      effectiveTo,
      approvedById: input.actorId,
      approvedAt: new Date(),
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_COUNTERPARTY_SCOPE_CREATED",
    entityType: "AccountingCounterpartyEntityScope",
    entityId: created.id,
    afterValues: {
      legalEntityId: created.legalEntityId,
      partyType: created.partyType,
      partyId: created.partyId,
      version: created.version,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingDocumentPolicy(input: {
  id?: string;
  orgId: string;
  actorId: string;
  legalEntityId: string;
  expectedVersion?: number;
  documentType: string;
  configurationJson: string;
  statutoryValidated: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const legalEntity = await db.accountingLegalEntity.findFirst({
    where: { id: input.legalEntityId, orgId: input.orgId },
    select: { id: true },
  });
  if (!legalEntity) throw new Error("CONFIGURATION_LEGAL_ENTITY_NOT_FOUND");
  const documentType = assertDocumentPolicyType(input.documentType);
  const configurationText = input.configurationJson.trim();
  if (!configurationText) {
    throw new Error("CONFIGURATION_DOCUMENT_POLICY_CONFIGURATION_REQUIRED");
  }
  let configuration: unknown;
  try {
    configuration = JSON.parse(configurationText);
  } catch {
    throw new Error("CONFIGURATION_DOCUMENT_POLICY_CONFIGURATION_INVALID");
  }
  const configurationHash = createHash("sha256")
    .update(JSON.stringify(configuration))
    .digest("hex");
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_DOCUMENT_POLICY_EFFECTIVE_FROM_INVALID",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_DOCUMENT_POLICY_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_EFFECTIVE_RANGE_INVALID");
  }

  if (input.id) {
    const existing = await db.accountingDocumentPolicy.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_DOCUMENT_POLICY_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingDocumentPolicy.update({
      where: { id: existing.id },
      data: {
        legalEntityId: legalEntity.id,
        documentType,
        configuration: configuration as object,
        configurationHash,
        statutoryValidated: input.statutoryValidated,
        effectiveFrom,
        effectiveTo,
        isActive: input.isActive,
        approvedById: input.actorId,
        approvedAt: new Date(),
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_DOCUMENT_POLICY_UPDATED",
      entityType: "AccountingDocumentPolicy",
      entityId: updated.id,
      beforeValues: {
        legalEntityId: existing.legalEntityId,
        documentType: existing.documentType,
        version: existing.version,
        rowVersion: existing.rowVersion,
        reason,
      },
      afterValues: {
        legalEntityId: updated.legalEntityId,
        documentType: updated.documentType,
        version: updated.version,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const latest = await db.accountingDocumentPolicy.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: legalEntity.id,
      documentType,
    },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const created = await db.accountingDocumentPolicy.create({
    data: {
      orgId: input.orgId,
      legalEntityId: legalEntity.id,
      documentType,
      version: (latest?.version ?? 0) + 1,
      configuration: configuration as object,
      configurationHash,
      statutoryValidated: input.statutoryValidated,
      approvedById: input.actorId,
      approvedAt: new Date(),
      effectiveFrom,
      effectiveTo,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_DOCUMENT_POLICY_CREATED",
    entityType: "AccountingDocumentPolicy",
    entityId: created.id,
    afterValues: {
      legalEntityId: created.legalEntityId,
      documentType: created.documentType,
      version: created.version,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingNumberSeries(input: {
  id?: string;
  orgId: string;
  actorId: string;
  taxRegistrationId?: string | null;
  expectedVersion?: number;
  documentType: string;
  prefixTemplate: string;
  nextNumber: string;
  padding: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const documentType = assertDimensionCode(
    input.documentType,
    "CONFIGURATION_NUMBER_SERIES_DOCUMENT_TYPE_INVALID",
  );
  const prefixTemplate = input.prefixTemplate.trim();
  if (!prefixTemplate) {
    throw new Error("CONFIGURATION_NUMBER_SERIES_PREFIX_REQUIRED");
  }
  const nextNumber = positiveBigIntString(
    input.nextNumber,
    "CONFIGURATION_NUMBER_SERIES_NEXT_NUMBER_INVALID",
  );
  const padding = Number(input.padding);
  if (!Number.isInteger(padding) || padding < 1 || padding > 12) {
    throw new Error("CONFIGURATION_NUMBER_SERIES_PADDING_INVALID");
  }
  const effectiveFrom = parseRequiredDate(
    input.effectiveFrom,
    "CONFIGURATION_NUMBER_SERIES_EFFECTIVE_FROM_INVALID",
  );
  const effectiveTo = parseDate(
    input.effectiveTo,
    "CONFIGURATION_NUMBER_SERIES_EFFECTIVE_TO_INVALID",
  );
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("CONFIGURATION_EFFECTIVE_RANGE_INVALID");
  }
  const taxRegistrationId = input.taxRegistrationId?.trim() || null;
  if (taxRegistrationId) {
    const registration = await db.accountingTaxRegistration.findFirst({
      where: { id: taxRegistrationId, orgId: input.orgId },
      select: { id: true },
    });
    if (!registration) {
      throw new Error("CONFIGURATION_REGISTRATION_NOT_FOUND");
    }
  }

  if (input.id) {
    const existing = await db.accountingNumberSeries.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_NUMBER_SERIES_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    const updated = await db.accountingNumberSeries.update({
      where: { id: existing.id },
      data: {
        taxRegistrationId,
        documentType,
        prefixTemplate,
        nextNumber,
        padding,
        effectiveFrom,
        effectiveTo,
        isActive: input.isActive,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_NUMBER_SERIES_UPDATED",
      entityType: "AccountingNumberSeries",
      entityId: updated.id,
      beforeValues: {
        documentType: existing.documentType,
        taxRegistrationId: existing.taxRegistrationId,
        rowVersion: existing.rowVersion,
        reason,
      },
      afterValues: {
        documentType: updated.documentType,
        taxRegistrationId: updated.taxRegistrationId,
        rowVersion: updated.rowVersion,
        reason,
      },
    });
    return updated;
  }

  const created = await db.accountingNumberSeries.create({
    data: {
      orgId: input.orgId,
      taxRegistrationId,
      documentType,
      prefixTemplate,
      nextNumber,
      padding,
      effectiveFrom,
      effectiveTo,
      isActive: input.isActive,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_NUMBER_SERIES_CREATED",
    entityType: "AccountingNumberSeries",
    entityId: created.id,
    afterValues: {
      documentType: created.documentType,
      taxRegistrationId: created.taxRegistrationId,
      rowVersion: created.rowVersion,
      reason,
    },
  });
  return created;
}

export async function saveAccountingCurrency(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  code: string;
  name: string;
  symbol?: string | null;
  decimalPlaces: number;
  isFunctional: boolean;
  isEnabled: boolean;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const code = assertCurrencyCode(input.code);
  const name = input.name.trim();
  const decimalPlaces = Number(input.decimalPlaces);
  if (!name) throw new Error("CONFIGURATION_CURRENCY_NAME_REQUIRED");
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 8) {
    throw new Error("CONFIGURATION_CURRENCY_DECIMALS_INVALID");
  }

  return db.$transaction(async (tx: any) => {
    if (input.isFunctional) {
      await tx.accountingCurrency.updateMany({
        where: { orgId: input.orgId, isFunctional: true },
        data: { isFunctional: false, rowVersion: { increment: 1 } },
      });
    }
    if (input.id) {
      const existing = await tx.accountingCurrency.findFirst({
        where: { id: input.id, orgId: input.orgId },
      });
      if (!existing) throw new Error("CONFIGURATION_CURRENCY_NOT_FOUND");
      requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
      const updated = await tx.accountingCurrency.update({
        where: { id: existing.id },
        data: {
          code,
          name,
          symbol: input.symbol?.trim() || null,
          decimalPlaces,
          isFunctional: input.isFunctional,
          isEnabled: input.isEnabled,
          rowVersion: { increment: 1 },
        },
      });
      if (updated.isFunctional) {
        await tx.accountingOrganisationProfile.updateMany({
          where: { orgId: input.orgId },
          data: {
            functionalCurrencyCode: updated.code,
            rowVersion: { increment: 1 },
          },
        });
      }
      await createConfigurationAuditLog({
        orgId: input.orgId,
        actorId: input.actorId,
        action: "ACCOUNTING_CONFIGURATION_CURRENCY_UPDATED",
        entityType: "AccountingCurrency",
        entityId: updated.id,
        beforeValues: { code: existing.code, rowVersion: existing.rowVersion, reason },
        afterValues: { code: updated.code, rowVersion: updated.rowVersion, reason },
      });
      return updated;
    }
    const created = await tx.accountingCurrency.create({
      data: {
        orgId: input.orgId,
        code,
        name,
        symbol: input.symbol?.trim() || null,
        decimalPlaces,
        isFunctional: input.isFunctional,
        isEnabled: input.isEnabled,
      },
    });
    if (created.isFunctional) {
      await tx.accountingOrganisationProfile.updateMany({
        where: { orgId: input.orgId },
        data: {
          functionalCurrencyCode: created.code,
          rowVersion: { increment: 1 },
        },
      });
    }
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_CURRENCY_CREATED",
      entityType: "AccountingCurrency",
      entityId: created.id,
      afterValues: { code: created.code, rowVersion: created.rowVersion, reason },
    });
    return created;
  });
}

export async function saveAccountingExchangeRateDraft(input: {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  fromCurrencyId: string;
  toCurrencyId: string;
  rateDate: string;
  rate: string;
  source: string;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  if (input.fromCurrencyId === input.toCurrencyId) {
    throw new Error("CONFIGURATION_EXCHANGE_RATE_PAIR_INVALID");
  }
  const rateDate = parseRequiredDate(
    input.rateDate,
    "CONFIGURATION_EXCHANGE_RATE_DATE_INVALID",
  );
  const rate = decimalString(input.rate);
  const source = input.source.trim();
  if (!source) throw new Error("CONFIGURATION_EXCHANGE_RATE_SOURCE_REQUIRED");

  const [fromCurrency, toCurrency] = await Promise.all([
    db.accountingCurrency.findFirst({
      where: { id: input.fromCurrencyId, orgId: input.orgId },
      select: { id: true, code: true },
    }),
    db.accountingCurrency.findFirst({
      where: { id: input.toCurrencyId, orgId: input.orgId },
      select: { id: true, code: true },
    }),
  ]);
  if (!fromCurrency || !toCurrency) {
    throw new Error("CONFIGURATION_EXCHANGE_RATE_CURRENCY_NOT_FOUND");
  }

  if (input.id) {
    const existing = await db.accountingExchangeRate.findFirst({
      where: { id: input.id, orgId: input.orgId },
    });
    if (!existing) throw new Error("CONFIGURATION_EXCHANGE_RATE_NOT_FOUND");
    requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
    if (existing.status !== "DRAFT") {
      throw new Error("CONFIGURATION_EXCHANGE_RATE_ONLY_DRAFT_EDITABLE");
    }
    const updated = await db.accountingExchangeRate.update({
      where: { id: existing.id },
      data: {
        fromCurrencyId: fromCurrency.id,
        toCurrencyId: toCurrency.id,
        rateDate,
        rate,
        source,
        rowVersion: { increment: 1 },
      },
    });
    await createConfigurationAuditLog({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "ACCOUNTING_CONFIGURATION_EXCHANGE_RATE_UPDATED",
      entityType: "AccountingExchangeRate",
      entityId: updated.id,
      beforeValues: { status: existing.status, rowVersion: existing.rowVersion, reason },
      afterValues: { status: updated.status, rowVersion: updated.rowVersion, reason },
    });
    return updated;
  }
  const created = await db.accountingExchangeRate.create({
    data: {
      orgId: input.orgId,
      fromCurrencyId: fromCurrency.id,
      toCurrencyId: toCurrency.id,
      rateDate,
      rate,
      source,
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_EXCHANGE_RATE_CREATED",
    entityType: "AccountingExchangeRate",
    entityId: created.id,
    afterValues: { status: created.status, rowVersion: created.rowVersion, reason },
  });
  return created;
}

export async function approveAccountingExchangeRate(input: {
  orgId: string;
  actorId: string;
  rateId: string;
  expectedVersion: number;
}) {
  const existing = await db.accountingExchangeRate.findFirst({
    where: { id: input.rateId, orgId: input.orgId },
  });
  if (!existing) throw new Error("CONFIGURATION_EXCHANGE_RATE_NOT_FOUND");
  requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
  const makerAudit = await db.accountingAuditLog.findFirst({
    where: {
      orgId: input.orgId,
      entityType: "AccountingExchangeRate",
      entityId: existing.id,
      action: {
        in: [
          "ACCOUNTING_CONFIGURATION_EXCHANGE_RATE_CREATED",
          "ACCOUNTING_CONFIGURATION_EXCHANGE_RATE_UPDATED",
        ],
      },
    },
    orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    select: { userId: true },
  });
  assertExchangeRateApprovalAllowed({
    status: existing.status,
    makerId: makerAudit?.userId ?? null,
    approverId: input.actorId,
  });
  const updated = await db.accountingExchangeRate.update({
    where: { id: existing.id },
    data: {
      status: "APPROVED",
      approvedById: input.actorId,
      approvedAt: new Date(),
      rowVersion: { increment: 1 },
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_EXCHANGE_RATE_APPROVED",
    entityType: "AccountingExchangeRate",
    entityId: updated.id,
    beforeValues: { status: existing.status, rowVersion: existing.rowVersion },
    afterValues: { status: updated.status, rowVersion: updated.rowVersion },
  });
  return updated;
}

export async function rejectAccountingExchangeRate(input: {
  orgId: string;
  actorId: string;
  rateId: string;
  expectedVersion: number;
  reason: string;
}) {
  const reason = normalizeReason(input.reason);
  const existing = await db.accountingExchangeRate.findFirst({
    where: { id: input.rateId, orgId: input.orgId },
  });
  if (!existing) throw new Error("CONFIGURATION_EXCHANGE_RATE_NOT_FOUND");
  requireConfigurationRowVersion(existing.rowVersion, input.expectedVersion);
  if (existing.status !== "DRAFT") {
    throw new Error("CONFIGURATION_EXCHANGE_RATE_REJECTION_STATE_INVALID");
  }
  const updated = await db.accountingExchangeRate.update({
    where: { id: existing.id },
    data: {
      status: "REJECTED",
      rowVersion: { increment: 1 },
    },
  });
  await createConfigurationAuditLog({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "ACCOUNTING_CONFIGURATION_EXCHANGE_RATE_REJECTED",
    entityType: "AccountingExchangeRate",
    entityId: updated.id,
    beforeValues: { status: existing.status, rowVersion: existing.rowVersion },
    afterValues: { status: updated.status, rowVersion: updated.rowVersion, reason },
  });
  return updated;
}
