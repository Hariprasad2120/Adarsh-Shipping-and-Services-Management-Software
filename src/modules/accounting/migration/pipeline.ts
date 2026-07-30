import { createHash, randomUUID } from "node:crypto";

import { canonicalPayload } from "../request-integrity";
import { deterministicDependencyOrder } from "./dependency-order";
import { resolveRecordMappings, validateMappings } from "./mapping";
import {
  assertPolicySafeRecord,
  openingHistoryPolicyIssues,
} from "./policy-gates";
import { reconcileMigration } from "./reconciliation";
import {
  deterministicMigrationKey,
  migrationManifestHash,
  normalizedSourceVersion,
  parseAccountingImportContract,
} from "./source-contract";
import { boundedSafeMessage } from "./security";
import type {
  AccountingMapping,
  CanonicalMigrationExecutor,
  MigrationErrorClassification,
  MigrationIssue,
  MigrationPipelineResult,
  MigrationRecordOutcome,
  NormalizedMigrationRecord,
} from "./types";

export const PHASE6_SYNTHETIC_EXECUTION_PROOF =
  "PHASE6_SYNTHETIC_STAGING_ONLY" as const;

type PreviousOutcome = Pick<
  MigrationRecordOutcome,
  "deterministicKey" | "status" | "canonicalTargetIdentifier"
>;

function classifyError(error: unknown): {
  classification: MigrationErrorClassification;
  code: string;
  retryable: boolean;
  manualReview: boolean;
} {
  const message = error instanceof Error ? error.message : "INTERNAL";
  const prefix = message.split(":")[0];
  const classification: MigrationErrorClassification =
    prefix === "MISSING_MAPPING"
      ? "MISSING_MAPPING"
      : prefix === "AMBIGUOUS_MAPPING" ||
          prefix === "AMBIGUOUS_APPROVED_MAPPING"
        ? "AMBIGUOUS_MAPPING"
        : prefix === "MISSING_DEPENDENCY"
          ? "MISSING_DEPENDENCY"
          : prefix === "DEPENDENCY_CYCLE"
            ? "DEPENDENCY_CYCLE"
            : prefix === "POLICY_GATED" || prefix.includes("POLICY")
              ? "POLICY_GATED"
              : prefix.includes("SCOPE")
                ? "SCOPE_VIOLATION"
                : prefix.includes("DUPLICATE")
                  ? "DUPLICATE_SOURCE"
                  : prefix.includes("IDEMPOTENCY")
                    ? "IDEMPOTENCY_CONFLICT"
              : prefix.includes("CLOSED_PERIOD")
                      ? "CLOSED_PERIOD"
                      : prefix.includes("CURRENCY")
                        ? "UNSUPPORTED_CURRENCY"
                        : prefix.includes("POSTING") ||
                            prefix.includes("CANONICAL_SERVICE")
                          ? "POSTING_FAILURE"
                          : prefix.includes("ALLOCATION")
                            ? "ALLOCATION_FAILURE"
                        : prefix.includes("ATTACHMENT")
                          ? "ATTACHMENT_FAILURE"
                          : prefix.includes("RECONCILIATION")
                            ? "RECONCILIATION_MISMATCH"
                          : "DOMAIN_VALIDATION";
  return {
    classification,
    code: prefix.replace(/[^A-Z0-9_]/gi, "_").toUpperCase().slice(0, 64),
    retryable: ["POSTING_FAILURE", "INTERNAL"].includes(classification),
    manualReview: [
      "AMBIGUOUS_MAPPING",
      "POLICY_GATED",
      "SCOPE_VIOLATION",
      "RECONCILIATION_MISMATCH",
    ].includes(classification),
  };
}

function issueFromError(error: unknown, recordKey?: string): MigrationIssue {
  const classified = classifyError(error);
  return {
    ...classified,
    recordKey,
    safeMessage: boundedSafeMessage(error),
  };
}

async function boundedMap<T, R>(
  values: readonly T[],
  concurrency: number,
  task: (value: T, index: number) => Promise<R>,
) {
  const output = new Array<R>(values.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      output[index] = await task(values[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  return output;
}

export async function runAccountingMigrationPipeline(input: {
  contract: unknown;
  mappings: readonly AccountingMapping[];
  mode?: "DRY_RUN" | "EXECUTE";
  target?: "synthetic-staging" | "production";
  executionProof?: string;
  executor?: CanonicalMigrationExecutor;
  concurrency?: number;
  previousOutcomes?: readonly PreviousOutcome[];
  now?: () => Date;
}): Promise<MigrationPipelineResult> {
  const mode = input.mode ?? "DRY_RUN";
  const target = input.target ?? "synthetic-staging";
  const concurrency = input.concurrency ?? 1;
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error("CONCURRENCY_OUT_OF_BOUNDS");
  }
  if (target === "production") {
    throw new Error("PRODUCTION_BLOCKED");
  }
  if (
    mode === "EXECUTE" &&
    (input.executionProof !== PHASE6_SYNTHETIC_EXECUTION_PROOF ||
      !input.executor)
  ) {
    throw new Error("EXECUTION_GUARD_REQUIRED");
  }

  const contract = parseAccountingImportContract(input.contract);
  validateMappings(input.mappings);
  const correlationId = `migration-${randomUUID()}`;
  const issues: MigrationIssue[] = [];
  const outcomes: MigrationRecordOutcome[] = [];
  const normalized: NormalizedMigrationRecord[] = [];
  const seen = new Set<string>();

  for (const record of contract.records) {
    const deterministicKey = deterministicMigrationKey(record);
    if (seen.has(deterministicKey)) {
      const issue = issueFromError(
        new Error("DUPLICATE_SOURCE_IDENTIFIER"),
        deterministicKey,
      );
      issues.push(issue);
      outcomes.push({
        deterministicKey,
        sourceRecordType: record.sourceRecordType,
        status: "BLOCKED",
        validationStatus: "INVALID",
        reconciliationStatus: "PENDING",
        issue,
      });
      continue;
    }
    seen.add(deterministicKey);
    try {
      assertPolicySafeRecord(record);
      const policyIssues = openingHistoryPolicyIssues(contract, record).map(
        (entry) => ({ ...entry, recordKey: deterministicKey }),
      );
      if (policyIssues.length) {
        issues.push(...policyIssues);
        outcomes.push({
          deterministicKey,
          sourceRecordType: record.sourceRecordType,
          status: "BLOCKED",
          validationStatus: "BLOCKED",
          reconciliationStatus: "PENDING",
          issue: policyIssues[0],
        });
        continue;
      }
      const mapping = resolveRecordMappings({
        record,
        mappings: input.mappings,
      });
      normalized.push({
        ...record,
        deterministicKey,
        normalizedSourceVersion: normalizedSourceVersion(record),
        mappedOrganizationId: mapping.organizationId,
        mappedLegalEntityId: mapping.legalEntityId,
        resolvedMappings: mapping.resolved,
      });
    } catch (error) {
      const issue = issueFromError(error, deterministicKey);
      issues.push(issue);
      outcomes.push({
        deterministicKey,
        sourceRecordType: record.sourceRecordType,
        status: "BLOCKED",
        validationStatus:
          issue.classification === "POLICY_GATED" ? "BLOCKED" : "INVALID",
        reconciliationStatus: "PENDING",
        issue,
      });
    }
  }

  let ordered: NormalizedMigrationRecord[];
  try {
    ordered = deterministicDependencyOrder(normalized);
  } catch (error) {
    const issue = issueFromError(error);
    issues.push(issue);
    ordered = [];
    for (const record of normalized) {
      outcomes.push({
        deterministicKey: record.deterministicKey,
        sourceRecordType: record.sourceRecordType,
        status: "BLOCKED",
        validationStatus: "BLOCKED",
        reconciliationStatus: "PENDING",
        issue: { ...issue, recordKey: record.deterministicKey },
      });
    }
  }

  const prior = new Map(
    (input.previousOutcomes ?? []).map((entry) => [
      entry.deterministicKey,
      entry,
    ]),
  );
  const executionEvidence: Array<{
    deterministicKey: string;
    currencyCode?: string;
    documentTotal?: string;
    receiptPaymentTotal?: string;
    allocatedTotal?: string;
    unallocatedTotal?: string;
    debitTotal?: string;
    creditTotal?: string;
    outboxItemsCreated?: number;
  }> = [];
  const readyOutcomes = await boundedMap(
    ordered,
    mode === "EXECUTE" ? concurrency : 1,
    async (record): Promise<MigrationRecordOutcome> => {
      const previous = prior.get(record.deterministicKey);
      if (mode === "DRY_RUN") {
        return {
          deterministicKey: record.deterministicKey,
          sourceRecordType: record.sourceRecordType,
          status: "READY",
          validationStatus: "VALID",
          reconciliationStatus: "PENDING",
        };
      }
      try {
        const evidence = await input.executor!.execute(record);
        executionEvidence.push({
          deterministicKey: record.deterministicKey,
          ...evidence,
        });
        return {
          deterministicKey: record.deterministicKey,
          sourceRecordType: record.sourceRecordType,
          status: previous?.status === "SUCCEEDED" ? "SKIPPED" : "SUCCEEDED",
          canonicalTargetIdentifier: evidence.canonicalTargetIdentifier,
          validationStatus: "VALID",
          reconciliationStatus: "PENDING",
          migratedAt: (input.now ?? (() => new Date()))().toISOString(),
        };
      } catch (error) {
        const issue = issueFromError(error, record.deterministicKey);
        issues.push(issue);
        return {
          deterministicKey: record.deterministicKey,
          sourceRecordType: record.sourceRecordType,
          status: "FAILED",
          validationStatus: "VALID",
          reconciliationStatus: "MISMATCH",
          issue,
        };
      }
    },
  );
  outcomes.push(...readyOutcomes);
  outcomes.sort((left, right) =>
    left.deterministicKey.localeCompare(right.deterministicKey),
  );
  const reconciliation = reconcileMigration({
    records: normalized,
    outcomes,
    evidence: executionEvidence,
    mode,
  });
  const reconciliationIssues = reconciliation.scopedTotals
    .filter((entry) => entry.status === "MISMATCH")
    .map(
      (entry): MigrationIssue => ({
        code: entry.mismatchCodes[0] ?? "RECONCILIATION_TOTAL_MISMATCH",
        classification: "RECONCILIATION_MISMATCH",
        safeMessage: [
          "Migration totals did not reconcile",
          entry.organizationId,
          entry.legalEntityId,
          entry.sourceRecordType,
          entry.currencyCode,
          entry.measure,
        ].join(":"),
        retryable: false,
        manualReview: true,
      }),
    );
  issues.push(...reconciliationIssues);
  if (reconciliationIssues.length > 0) {
    const mismatchedTypes = new Set(
      reconciliation.scopedTotals
        .filter((entry) => entry.status === "MISMATCH")
        .map((entry) => entry.sourceRecordType),
    );
    for (const outcome of outcomes) {
      if (
        mismatchedTypes.has(outcome.sourceRecordType) &&
        (outcome.status === "SUCCEEDED" || outcome.status === "SKIPPED")
      ) {
        outcome.reconciliationStatus = "MISMATCH";
      }
    }
  } else if (mode === "EXECUTE") {
    for (const outcome of outcomes) {
      if (outcome.status === "SUCCEEDED" || outcome.status === "SKIPPED") {
        outcome.reconciliationStatus = "MATCHED";
      }
    }
  }
  const complete =
    mode === "EXECUTE" &&
    issues.length === 0 &&
    outcomes.length === contract.records.length &&
    outcomes.every((outcome) =>
      ["SUCCEEDED", "SKIPPED"].includes(outcome.status),
    ) &&
    reconciliation.journalBalanced &&
    reconciliation.lineageComplete &&
    reconciliation.totalsComplete &&
    reconciliation.totalsMatch;
  const status =
    mode === "DRY_RUN"
      ? issues.length
        ? "BLOCKED"
        : "DRY_RUN_READY"
      : complete
        ? "COMPLETED"
        : issues.some((entry) => !entry.retryable)
          ? "BLOCKED"
          : "FAILED";
  const manifestHash = migrationManifestHash(contract);
  return {
    contractVersion: contract.schemaVersion,
    batchIdentifier: contract.sourceBatchIdentifier,
    mode,
    status,
    correlationId,
    orderedRecordKeys: ordered.map((record) => record.deterministicKey),
    outcomes,
    issues,
    reconciliation,
    certification: complete
      ? {
          certifiedAt: (input.now ?? (() => new Date()))().toISOString(),
          manifestHash,
          outcomeHash: createHash("sha256")
            .update(canonicalPayload(outcomes))
            .digest("hex"),
          complete,
        }
      : undefined,
  };
}
