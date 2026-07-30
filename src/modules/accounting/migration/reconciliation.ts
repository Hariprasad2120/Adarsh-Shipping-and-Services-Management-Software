import {
  addDecimalStrings,
  compareDecimalStrings,
  normalizeDecimalString,
} from "../operational-helpers";
import type {
  AccountingMigrationReconciliation,
  MigrationExecutionMode,
  MigrationRecordOutcome,
  NormalizedMigrationRecord,
  ScopedTotalMeasure,
  ScopedTotalReconciliation,
} from "./types";

type ExecutionEvidence = {
  deterministicKey: string;
  currencyCode?: string;
  documentTotal?: string;
  receiptPaymentTotal?: string;
  allocatedTotal?: string;
  unallocatedTotal?: string;
  debitTotal?: string;
  creditTotal?: string;
  outboxItemsCreated?: number;
};

const REQUIRED_TOTALS: Partial<
  Record<
    NormalizedMigrationRecord["sourceRecordType"],
    readonly ScopedTotalMeasure[]
  >
> = {
  OPENING_BALANCE: ["debitTotal", "creditTotal"],
  SALES_INVOICE: ["documentTotal", "debitTotal", "creditTotal"],
  PURCHASE_INVOICE: ["documentTotal", "debitTotal", "creditTotal"],
  CREDIT_NOTE: ["documentTotal", "debitTotal", "creditTotal"],
  DEBIT_NOTE: ["documentTotal", "debitTotal", "creditTotal"],
  RECEIPT: [
    "receiptPaymentTotal",
    "allocatedTotal",
    "unallocatedTotal",
    "debitTotal",
    "creditTotal",
  ],
  PAYMENT: [
    "receiptPaymentTotal",
    "allocatedTotal",
    "unallocatedTotal",
    "debitTotal",
    "creditTotal",
  ],
  ALLOCATION: ["allocatedTotal"],
  JOURNAL_REFERENCE: ["debitTotal", "creditTotal"],
};

function sourceTotals(record: NormalizedMigrationRecord) {
  return record.payload.totals &&
    !Array.isArray(record.payload.totals) &&
    typeof record.payload.totals === "object"
    ? (record.payload.totals as Record<string, unknown>)
    : null;
}

function normalizeTotal(value: unknown) {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    String(value).trim() === ""
  ) {
    return null;
  }
  try {
    return normalizeDecimalString(String(value), {
      allowNegative: true,
      maxScale: 12,
    });
  } catch {
    return null;
  }
}

function currencyOf(record: NormalizedMigrationRecord) {
  const value = record.payload.currencyCode;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z][A-Z0-9]{2,11}$/.test(normalized) ? normalized : null;
}

function scopedKey(input: {
  organizationId: string;
  legalEntityId: string;
  sourceRecordType: NormalizedMigrationRecord["sourceRecordType"];
  currencyCode: string;
  measure: ScopedTotalMeasure;
}) {
  return [
    input.organizationId,
    input.legalEntityId,
    input.sourceRecordType,
    input.currencyCode,
    input.measure,
  ].join("\u001f");
}

export function reconcileMigration(input: {
  records: readonly NormalizedMigrationRecord[];
  outcomes: readonly MigrationRecordOutcome[];
  evidence?: readonly ExecutionEvidence[];
  mode?: MigrationExecutionMode;
}): AccountingMigrationReconciliation {
  const mode = input.mode ?? "DRY_RUN";
  const evidenceByKey = new Map(
    (input.evidence ?? []).map((entry) => [entry.deterministicKey, entry]),
  );
  const outcomeByKey = new Map(
    input.outcomes.map((entry) => [entry.deterministicKey, entry]),
  );
  const totals = new Map<
    string,
    {
      organizationId: string;
      legalEntityId: string;
      sourceRecordType: NormalizedMigrationRecord["sourceRecordType"];
      currencyCode: string;
      measure: ScopedTotalMeasure;
      sourceValues: string[];
      targetValues: string[];
      mismatchCodes: Set<string>;
      targetRequired: boolean;
    }
  >();

  for (const record of input.records) {
    const measures = REQUIRED_TOTALS[record.sourceRecordType] ?? [];
    if (measures.length === 0) continue;
    const currencyCode = currencyOf(record) ?? "INVALID";
    const evidence = evidenceByKey.get(record.deterministicKey);
    const outcome = outcomeByKey.get(record.deterministicKey);
    const targetRequired =
      mode === "EXECUTE" &&
      (outcome?.status === "SUCCEEDED" || outcome?.status === "SKIPPED");
    const targetCurrency =
      typeof evidence?.currencyCode === "string"
        ? evidence.currencyCode.trim().toUpperCase()
        : null;

    for (const measure of measures) {
      const key = scopedKey({
        organizationId: record.mappedOrganizationId,
        legalEntityId: record.mappedLegalEntityId,
        sourceRecordType: record.sourceRecordType,
        currencyCode,
        measure,
      });
      const group = totals.get(key) ?? {
        organizationId: record.mappedOrganizationId,
        legalEntityId: record.mappedLegalEntityId,
        sourceRecordType: record.sourceRecordType,
        currencyCode,
        measure,
        sourceValues: [],
        targetValues: [],
        mismatchCodes: new Set<string>(),
        targetRequired: false,
      };
      group.targetRequired ||= targetRequired;

      const sourceValue = normalizeTotal(sourceTotals(record)?.[measure]);
      if (sourceValue == null) {
        group.mismatchCodes.add("SOURCE_TOTAL_MISSING_OR_INVALID");
      } else {
        group.sourceValues.push(sourceValue);
      }
      if (currencyCode === "INVALID") {
        group.mismatchCodes.add("SOURCE_CURRENCY_MISSING_OR_INVALID");
      }

      if (targetRequired) {
        const targetValue = normalizeTotal(evidence?.[measure]);
        if (targetValue == null) {
          group.mismatchCodes.add("TARGET_TOTAL_MISSING_OR_INVALID");
        } else {
          group.targetValues.push(targetValue);
        }
        if (!targetCurrency) {
          group.mismatchCodes.add("TARGET_CURRENCY_MISSING_OR_INVALID");
        } else if (targetCurrency !== currencyCode) {
          group.mismatchCodes.add("TARGET_CURRENCY_MISMATCH");
        }
      }
      totals.set(key, group);
    }
  }

  const scopedTotals: ScopedTotalReconciliation[] = [...totals.values()]
    .map((group): ScopedTotalReconciliation => {
      const sourceTotal =
        group.sourceValues.length > 0
          ? addDecimalStrings(...group.sourceValues)
          : null;
      const targetTotal =
        group.targetValues.length > 0
          ? addDecimalStrings(...group.targetValues)
          : null;
      if (
        group.targetRequired &&
        sourceTotal != null &&
        targetTotal != null &&
        compareDecimalStrings(sourceTotal, targetTotal) !== 0
      ) {
        group.mismatchCodes.add("SOURCE_TARGET_TOTAL_MISMATCH");
      }
      const mismatchCodes = [...group.mismatchCodes].sort();
      return {
        organizationId: group.organizationId,
        legalEntityId: group.legalEntityId,
        sourceRecordType: group.sourceRecordType,
        currencyCode: group.currencyCode,
        measure: group.measure,
        sourceTotal,
        targetTotal,
        status:
          mismatchCodes.length > 0
            ? "MISMATCH"
            : group.targetRequired
              ? "MATCHED"
              : "NOT_EVALUATED",
        mismatchCodes,
      };
    })
    .sort(
      (left, right) =>
        left.organizationId.localeCompare(right.organizationId) ||
        left.legalEntityId.localeCompare(right.legalEntityId) ||
        left.sourceRecordType.localeCompare(right.sourceRecordType) ||
        left.currencyCode.localeCompare(right.currencyCode) ||
        left.measure.localeCompare(right.measure),
    );

  const currencyScopes = new Map<
    string,
    { organizationId: string; legalEntityId: string; currencyCode: string }
  >();
  for (const total of scopedTotals) {
    const key = [
      total.organizationId,
      total.legalEntityId,
      total.currencyCode,
    ].join("\u001f");
    currencyScopes.set(key, {
      organizationId: total.organizationId,
      legalEntityId: total.legalEntityId,
      currencyCode: total.currencyCode,
    });
  }
  const sumScoped = (
    scope: {
      organizationId: string;
      legalEntityId: string;
      currencyCode: string;
    },
    measure: ScopedTotalMeasure,
    side: "sourceTotal" | "targetTotal",
  ) =>
    addDecimalStrings(
      ...scopedTotals
        .filter(
          (entry) =>
            entry.organizationId === scope.organizationId &&
            entry.legalEntityId === scope.legalEntityId &&
            entry.currencyCode === scope.currencyCode &&
            entry.measure === measure,
        )
        .map((entry) => entry[side] ?? "0"),
    );
  const currencies = [...currencyScopes.values()]
    .sort(
      (left, right) =>
        left.organizationId.localeCompare(right.organizationId) ||
        left.legalEntityId.localeCompare(right.legalEntityId) ||
        left.currencyCode.localeCompare(right.currencyCode),
    )
    .map((scope) => ({
      ...scope,
      sourceDocumentTotal: sumScoped(scope, "documentTotal", "sourceTotal"),
      targetDocumentTotal: sumScoped(scope, "documentTotal", "targetTotal"),
      sourceReceiptPaymentTotal: sumScoped(
        scope,
        "receiptPaymentTotal",
        "sourceTotal",
      ),
      targetReceiptPaymentTotal: sumScoped(
        scope,
        "receiptPaymentTotal",
        "targetTotal",
      ),
      allocatedTotal: sumScoped(scope, "allocatedTotal", "sourceTotal"),
      unallocatedTotal: sumScoped(scope, "unallocatedTotal", "sourceTotal"),
      debitTotal: sumScoped(scope, "debitTotal", "sourceTotal"),
      creditTotal: sumScoped(scope, "creditTotal", "sourceTotal"),
    }));
  const sourceKeys = input.records.map(
    (record) =>
      `${record.sourceSystem}:${record.sourceRecordType}:${record.sourceIdentifier}:${record.normalizedSourceVersion}`,
  );
  const duplicates = sourceKeys.filter(
    (key, index) => sourceKeys.indexOf(key) !== index,
  );
  const totalsComplete = scopedTotals.every(
    (entry) =>
      !entry.mismatchCodes.some((code) =>
        /(?:MISSING|INVALID)/.test(code),
      ),
  );
  const totalsMatch =
    totalsComplete &&
    (mode === "DRY_RUN"
      ? scopedTotals.every((entry) => entry.status !== "MISMATCH")
      : scopedTotals.every((entry) => entry.status === "MATCHED"));

  return {
    sourceRecordCount: input.records.length,
    importedRecordCount: input.outcomes.filter(
      (outcome) => outcome.status === "SUCCEEDED",
    ).length,
    skippedRecordCount: input.outcomes.filter(
      (outcome) => outcome.status === "SKIPPED",
    ).length,
    failedRecordCount: input.outcomes.filter(
      (outcome) => outcome.status === "FAILED",
    ).length,
    blockedRecordCount: input.outcomes.filter(
      (outcome) => outcome.status === "BLOCKED",
    ).length,
    duplicateSourceIdentifiers: [...new Set(duplicates)].sort(),
    missingMappings: input.outcomes.filter(
      (outcome) => outcome.issue?.classification === "MISSING_MAPPING",
    ).length,
    orphanAllocations: input.outcomes.filter(
      (outcome) =>
        outcome.sourceRecordType === "ALLOCATION" &&
        outcome.issue?.classification === "MISSING_DEPENDENCY",
    ).length,
    lineageComplete: input.outcomes.every(
      (outcome) =>
        outcome.status === "READY" ||
        (outcome.status === "SKIPPED" &&
          Boolean(outcome.canonicalTargetIdentifier)) ||
        (outcome.status === "SUCCEEDED" &&
          Boolean(outcome.canonicalTargetIdentifier)),
    ),
    journalBalanced:
      totalsComplete &&
      currencies.every(
        (currency) =>
          compareDecimalStrings(currency.debitTotal, currency.creditTotal) ===
          0,
      ),
    totalsComplete,
    totalsMatch,
    totalMismatchCount: scopedTotals.filter(
      (entry) => entry.status === "MISMATCH",
    ).length,
    outboxItemsCreated: [...evidenceByKey.values()].reduce(
      (total, entry) => total + (entry.outboxItemsCreated ?? 0),
      0,
    ),
    unresolvedManualReviewItems: input.outcomes.filter(
      (outcome) => outcome.issue?.manualReview,
    ).length,
    currencies,
    scopedTotals,
  };
}
