import { createHash } from "node:crypto";

import {
  PHASE6_SYNTHETIC_EXECUTION_PROOF,
  runAccountingMigrationPipeline,
} from "../migration/pipeline";
import type {
  AccountingImportContract,
  AccountingImportRecord,
  AccountingMapping,
  CanonicalMigrationExecutor,
  MigrationPipelineResult,
} from "../migration/types";
import { canonicalPayload } from "../request-integrity";

export const PHASE7_REHEARSAL_MARKER =
  "MONOLITH_ACCOUNTING_PHASE7_SYNTHETIC_ONLY" as const;
export const PHASE7_IN_MEMORY_EXECUTION_PROOF =
  "PHASE7_IN_MEMORY_REHEARSAL_ONLY" as const;

export type AccountingRehearsalProfile = {
  id: "small-functional" | "medium-operational" | "large-bounded";
  recordCounts: {
    salesInvoices: number;
    purchaseInvoices: number;
    receipts: number;
    payments: number;
    allocations: number;
    creditNotes: number;
    debitNotes: number;
  };
  dependencyDistribution: string;
  currencyDistribution: Record<string, number>;
  attachmentAssumptions: string;
  expectedRuntimeRange: string;
  concurrencyCeiling: number;
  memoryCeilingBytes: number;
  maximumDatabaseQueries: number;
  reconciliationExpectation: string;
};

export const ACCOUNTING_REHEARSAL_PROFILES: readonly AccountingRehearsalProfile[] =
  [
    {
      id: "small-functional",
      recordCounts: {
        salesInvoices: 8,
        purchaseInvoices: 6,
        receipts: 3,
        payments: 3,
        allocations: 4,
        creditNotes: 2,
        debitNotes: 2,
      },
      dependencyDistribution: "Allocations reference existing synthetic invoices and payments; corrections carry deterministic lineage.",
      currencyDistribution: { INR: 24, USD: 4 },
      attachmentAssumptions: "Metadata-only; no attachment bytes and no storage provider.",
      expectedRuntimeRange: "under 5 seconds for validation and in-memory execution",
      concurrencyCeiling: 2,
      memoryCeilingBytes: 128 * 1024 * 1024,
      maximumDatabaseQueries: 0,
      reconciliationExpectation: "All scoped totals exact by legal entity, record type, and currency.",
    },
    {
      id: "medium-operational",
      recordCounts: {
        salesInvoices: 420,
        purchaseInvoices: 300,
        receipts: 180,
        payments: 180,
        allocations: 240,
        creditNotes: 90,
        debitNotes: 90,
      },
      dependencyDistribution: "Eighty percent of payments have one allocation; twenty percent remain partially unallocated.",
      currencyDistribution: { INR: 1_200, USD: 240, EUR: 60 },
      attachmentAssumptions: "Metadata inventory only, capped at one item per tenth document; no bytes are read.",
      expectedRuntimeRange: "under 30 seconds for validation and in-memory execution",
      concurrencyCeiling: 4,
      memoryCeilingBytes: 512 * 1024 * 1024,
      maximumDatabaseQueries: 0,
      reconciliationExpectation: "Zero mismatches, duplicates, or unresolved manual-review items.",
    },
    {
      id: "large-bounded",
      recordCounts: {
        salesInvoices: 2_200,
        purchaseInvoices: 1_600,
        receipts: 900,
        payments: 900,
        allocations: 1_400,
        creditNotes: 500,
        debitNotes: 500,
      },
      dependencyDistribution: "Bounded fan-out of at most four dependencies per record; no cycles.",
      currencyDistribution: { INR: 6_400, USD: 1_280, EUR: 320 },
      attachmentAssumptions: "Metadata inventory only, maximum 800 entries; malware scanning and storage stay gated.",
      expectedRuntimeRange: "under 120 seconds for validation and in-memory execution",
      concurrencyCeiling: 8,
      memoryCeilingBytes: 1024 * 1024 * 1024,
      maximumDatabaseQueries: 0,
      reconciliationExpectation: "Every applicable Decimal-safe total matches; no scope is combined.",
    },
  ] as const;

export const ACCOUNTING_REHEARSAL_SCENARIOS = [
  ["REH-001", "clean first-time batch"],
  ["REH-002", "dry-run with zero financial effects"],
  ["REH-003", "interrupted batch and resume"],
  ["REH-004", "duplicate batch replay"],
  ["REH-005", "duplicate source identifier"],
  ["REH-006", "missing mapping"],
  ["REH-007", "ambiguous mapping"],
  ["REH-008", "cross-entity attempt"],
  ["REH-009", "closed-period conflict"],
  ["REH-010", "unsupported currency operation"],
  ["REH-011", "policy-gated opening balance"],
  ["REH-012", "sales and purchase invoices"],
  ["REH-013", "receipts and payments"],
  ["REH-014", "allocations"],
  ["REH-015", "credit and debit note lineage"],
  ["REH-016", "attachment failure"],
  ["REH-017", "reconciliation mismatch"],
  ["REH-018", "outbox provider-disabled behavior"],
  ["REH-019", "scheduler duplicate-prevention behavior"],
  ["REH-020", "rollback decision requiring canonical reversal"],
  ["REH-021", "partial infrastructure failure"],
] as const;

export type AccountingRehearsalGuard = {
  environmentMarker: typeof PHASE7_REHEARSAL_MARKER;
  target: "synthetic-staging";
  storageTarget: "EPHEMERAL_IN_MEMORY";
  databaseAccess: "NONE";
  databasePort: null;
  providerMode: "disabled";
  outboundDeliveryMode: "disabled";
  datasetClassification: "SYNTHETIC";
  operatorId: string;
  checkerId: string;
  productionAuthorizationPresent: false;
};

export function assertAccountingRehearsalGuard(
  guard: AccountingRehearsalGuard,
) {
  if (
    guard.environmentMarker !== PHASE7_REHEARSAL_MARKER ||
    guard.target !== "synthetic-staging" ||
    guard.storageTarget !== "EPHEMERAL_IN_MEMORY" ||
    guard.databaseAccess !== "NONE" ||
    guard.databasePort !== null ||
    guard.providerMode !== "disabled" ||
    guard.outboundDeliveryMode !== "disabled" ||
    guard.datasetClassification !== "SYNTHETIC" ||
    guard.productionAuthorizationPresent !== false
  ) {
    throw new Error("PHASE7_REHEARSAL_GUARD_INVALID");
  }
  if (
    !guard.operatorId.trim() ||
    !guard.checkerId.trim() ||
    guard.operatorId === guard.checkerId
  ) {
    throw new Error("PHASE7_REHEARSAL_MAKER_CHECKER_REQUIRED");
  }
}

function profileById(id: AccountingRehearsalProfile["id"]) {
  const profile = ACCOUNTING_REHEARSAL_PROFILES.find(
    (candidate) => candidate.id === id,
  );
  if (!profile) throw new Error("PHASE7_REHEARSAL_PROFILE_INVALID");
  return profile;
}

function totalsFor(
  sourceRecordType: AccountingImportRecord["sourceRecordType"],
  amount: string,
) {
  if (["RECEIPT", "PAYMENT"].includes(sourceRecordType)) {
    return {
      receiptPaymentTotal: amount,
      allocatedTotal: amount,
      unallocatedTotal: "0",
      debitTotal: amount,
      creditTotal: amount,
    };
  }
  if (sourceRecordType === "ALLOCATION") return { allocatedTotal: amount };
  return {
    documentTotal: amount,
    debitTotal: amount,
    creditTotal: amount,
  };
}

function syntheticRecordReference(
  type: AccountingImportRecord["sourceRecordType"],
  index: number,
) {
  return `SYNTHETIC_PHASE7:${type}:${type.toLowerCase()}-${String(index + 1).padStart(6, "0")}:1`;
}

function dependenciesFor(
  type: AccountingImportRecord["sourceRecordType"],
  index: number,
  profile: AccountingRehearsalProfile,
) {
  if (type === "ALLOCATION") {
    return [
      syntheticRecordReference(
        "SALES_INVOICE",
        index % profile.recordCounts.salesInvoices,
      ),
      syntheticRecordReference(
        "PAYMENT",
        index % profile.recordCounts.payments,
      ),
    ];
  }
  if (type === "CREDIT_NOTE") {
    return [
      syntheticRecordReference(
        "SALES_INVOICE",
        index % profile.recordCounts.salesInvoices,
      ),
    ];
  }
  if (type === "DEBIT_NOTE") {
    return [
      syntheticRecordReference(
        "PURCHASE_INVOICE",
        index % profile.recordCounts.purchaseInvoices,
      ),
    ];
  }
  return [];
}

export function createDeterministicAccountingRehearsalFixture(
  profileId: AccountingRehearsalProfile["id"],
) {
  const profile = profileById(profileId);
  const definitions: Array<{
    type: AccountingImportRecord["sourceRecordType"];
    count: number;
  }> = [
    { type: "SALES_INVOICE", count: profile.recordCounts.salesInvoices },
    { type: "PURCHASE_INVOICE", count: profile.recordCounts.purchaseInvoices },
    { type: "RECEIPT", count: profile.recordCounts.receipts },
    { type: "PAYMENT", count: profile.recordCounts.payments },
    { type: "ALLOCATION", count: profile.recordCounts.allocations },
    { type: "CREDIT_NOTE", count: profile.recordCounts.creditNotes },
    { type: "DEBIT_NOTE", count: profile.recordCounts.debitNotes },
  ];
  const currencySequence = Object.entries(profile.currencyDistribution).flatMap(
    ([currency, count]) => Array.from({ length: count }, () => currency),
  );
  const records: AccountingImportRecord[] = [];
  let sequence = 0;
  for (const definition of definitions) {
    for (let index = 0; index < definition.count; index += 1) {
      const currencyCode = currencySequence[sequence % currencySequence.length];
      const amount = `${100 + (sequence % 97)}.${String(sequence % 100).padStart(2, "0")}`;
      const sourceIdentifier = `${definition.type.toLowerCase()}-${String(index + 1).padStart(6, "0")}`;
      const dependencies = dependenciesFor(definition.type, index, profile);
      records.push({
        sourceSystem: "SYNTHETIC_PHASE7",
        sourceRecordType: definition.type,
        sourceIdentifier,
        sourceVersion: "1",
        targetOrganizationRef: "synthetic-org",
        targetLegalEntityRef: "synthetic-entity",
        importBatch: `phase7-${profile.id}`,
        dependencies,
        payload: {
          currencyCode,
          acceptedCurrencyPolicyReference: "SYNTHETIC-POL-CURRENCY-1",
          totals: totalsFor(definition.type, amount),
          lineageReference:
            dependencies[0] ?? `synthetic-lineage-${sequence + 1}`,
        },
        attachments: [],
      });
      sequence += 1;
    }
  }
  const contract: AccountingImportContract = {
    schemaVersion: "accounting-import/v1",
    sourceSystem: "SYNTHETIC_PHASE7",
    sourceBatchIdentifier: `phase7-${profile.id}`,
    extractedAt: "2026-07-30T00:00:00.000Z",
    targetOrganizationRef: "synthetic-org",
    records,
  };
  const mappings: AccountingMapping[] = [
    {
      sourceSystem: "SYNTHETIC_PHASE7",
      targetOrganizationId: "stg_org_monolith_accounting",
      mappingType: "ORGANIZATION",
      sourceValue: "synthetic-org",
      targetType: "Organisation",
      targetId: "stg_org_monolith_accounting",
      version: 1,
      status: "APPROVED",
      decisionReference: "SYNTHETIC-MAP-ORG-1",
    },
    {
      sourceSystem: "SYNTHETIC_PHASE7",
      targetOrganizationId: "stg_org_monolith_accounting",
      targetLegalEntityId: "stg_accounting_legal_entity",
      mappingType: "LEGAL_ENTITY",
      sourceValue: "synthetic-entity",
      targetType: "AccountingLegalEntity",
      targetId: "stg_accounting_legal_entity",
      version: 1,
      status: "APPROVED",
      decisionReference: "SYNTHETIC-MAP-ENTITY-1",
    },
  ];
  return {
    profile,
    contract,
    mappings,
    fixtureHash: createHash("sha256")
      .update(canonicalPayload({ contract, mappings }))
      .digest("hex"),
  };
}

export function accountingRehearsalDependencyGraphHash(
  contract: AccountingImportContract,
) {
  return createHash("sha256")
    .update(
      canonicalPayload(
        contract.records.map((record) => ({
          sourceSystem: record.sourceSystem,
          sourceRecordType: record.sourceRecordType,
          sourceIdentifier: record.sourceIdentifier,
          sourceVersion: record.sourceVersion?.trim() || "1",
          dependencies: record.dependencies,
        })),
      ),
    )
    .digest("hex");
}

export function accountingRehearsalAttachmentInventory(
  contract: AccountingImportContract,
) {
  const attachments = contract.records
    .flatMap((record) =>
      record.attachments.map((attachment) => ({
        recordReference: syntheticRecordReference(
          record.sourceRecordType,
          Math.max(
            0,
            Number(record.sourceIdentifier.match(/(\d+)$/)?.[1] ?? "1") - 1,
          ),
        ),
        ...attachment,
      })),
    )
    .sort((left, right) =>
      canonicalPayload(left).localeCompare(canonicalPayload(right)),
    );
  return {
    count: attachments.length,
    totalBytes: attachments.reduce(
      (total, attachment) => total + attachment.sizeBytes,
      0,
    ),
    inventoryHash: createHash("sha256")
      .update(canonicalPayload(attachments))
      .digest("hex"),
  };
}

export async function runGuardedAccountingRehearsal(input: {
  guard: AccountingRehearsalGuard;
  profileId: AccountingRehearsalProfile["id"];
  mode?: "DRY_RUN" | "SYNTHETIC_EXECUTE";
  executionProof?: string;
  executor?: CanonicalMigrationExecutor;
  previousOutcomes?: MigrationPipelineResult["outcomes"];
}) {
  assertAccountingRehearsalGuard(input.guard);
  const fixture = createDeterministicAccountingRehearsalFixture(input.profileId);
  const mode = input.mode ?? "DRY_RUN";
  if (
    mode === "SYNTHETIC_EXECUTE" &&
    (input.executionProof !== PHASE7_IN_MEMORY_EXECUTION_PROOF ||
      !input.executor)
  ) {
    throw new Error("PHASE7_REHEARSAL_EXECUTION_GUARD_REQUIRED");
  }
  const result = await runAccountingMigrationPipeline({
    contract: fixture.contract,
    mappings: fixture.mappings,
    mode: mode === "DRY_RUN" ? "DRY_RUN" : "EXECUTE",
    target: "synthetic-staging",
    executionProof:
      mode === "SYNTHETIC_EXECUTE"
        ? PHASE6_SYNTHETIC_EXECUTION_PROOF
        : undefined,
    executor: mode === "SYNTHETIC_EXECUTE" ? input.executor : undefined,
    concurrency: fixture.profile.concurrencyCeiling,
    previousOutcomes: input.previousOutcomes,
    now: () => new Date("2026-07-30T00:05:00.000Z"),
  });
  return {
    fixtureHash: fixture.fixtureHash,
    profileId: fixture.profile.id,
    storageTarget: input.guard.storageTarget,
    databaseQueries: 0,
    providerMode: input.guard.providerMode,
    result,
  };
}
