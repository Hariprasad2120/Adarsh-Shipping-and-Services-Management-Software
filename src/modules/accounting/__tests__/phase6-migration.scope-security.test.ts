import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  MigrationPipelineResult,
  NormalizedMigrationRecord,
} from "../migration/types";

const mocks = vi.hoisted(() => ({
  permissionCount: vi.fn(),
  transaction: vi.fn(),
  legalEntityFindFirst: vi.fn(),
  batchFindFirst: vi.fn(),
  batchUpdateMany: vi.fn(),
  recordFindFirst: vi.fn(),
  recordUpdateMany: vi.fn(),
  mappingFindMany: vi.fn(),
  checkpointFindFirst: vi.fn(),
  checkpointCreate: vi.fn(),
  auditCreate: vi.fn(),
  queryRaw: vi.fn(),
  prepareSalesInvoice: vi.fn(),
  preparePurchaseInvoice: vi.fn(),
  preparePayment: vi.fn(),
  prepareCustomerNote: vi.fn(),
  prepareVendorNote: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    permission: { count: mocks.permissionCount },
    accountingLegalEntity: { findFirst: mocks.legalEntityFindFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock("../document-adapters", () => ({
  prepareLegacySalesInvoice: mocks.prepareSalesInvoice,
  prepareLegacyPurchaseInvoice: mocks.preparePurchaseInvoice,
  prepareLegacyPayment: mocks.preparePayment,
  prepareLegacyCustomerNote: mocks.prepareCustomerNote,
  prepareLegacyVendorNote: mocks.prepareVendorNote,
}));

import {
  assertCanonicalMigrationRecordScope,
  createCanonicalMigrationExecutor,
} from "../migration/canonical-executor";
import {
  checkpointingMigrationExecutor,
  finalizePersistentMigrationBatch,
} from "../migration/repository";

const tx = {
  $queryRaw: mocks.queryRaw,
  accountingMigrationBatch: {
    findFirst: mocks.batchFindFirst,
    updateMany: mocks.batchUpdateMany,
  },
  accountingMigrationRecord: {
    findFirst: mocks.recordFindFirst,
    updateMany: mocks.recordUpdateMany,
  },
  accountingMigrationMapping: {
    findMany: mocks.mappingFindMany,
  },
  accountingMigrationCheckpoint: {
    findFirst: mocks.checkpointFindFirst,
    create: mocks.checkpointCreate,
  },
  accountingAuditLog: {
    create: mocks.auditCreate,
  },
};

function normalizedRecord(
  overrides: Partial<NormalizedMigrationRecord> = {},
): NormalizedMigrationRecord {
  return {
    sourceSystem: "SYNTHETIC_LEDGER",
    sourceRecordType: "SALES_INVOICE",
    sourceIdentifier: "invoice-1",
    sourceVersion: "1",
    targetOrganizationRef: "source-org",
    targetLegalEntityRef: "source-entity",
    importBatch: "batch-1",
    dependencies: [],
    payload: {
      legacyRecordId: "legacy-invoice-1",
      currencyCode: "INR",
      acceptedCurrencyPolicyReference: "POLICY-CURRENCY-1",
      totals: {
        documentTotal: "100",
        debitTotal: "100",
        creditTotal: "100",
      },
    },
    attachments: [],
    deterministicKey: "a".repeat(64),
    normalizedSourceVersion: "1",
    mappedOrganizationId: "org-a",
    mappedLegalEntityId: "entity-a",
    resolvedMappings: {
      ORGANIZATION: "org-a",
      LEGAL_ENTITY: "entity-a",
    },
    ...overrides,
  };
}

function failedResult(): MigrationPipelineResult {
  return {
    contractVersion: "accounting-import/v1",
    batchIdentifier: "batch-1",
    mode: "EXECUTE",
    status: "FAILED",
    correlationId: "migration-test",
    orderedRecordKeys: [],
    outcomes: [],
    issues: [],
    reconciliation: {
      sourceRecordCount: 0,
      importedRecordCount: 0,
      skippedRecordCount: 0,
      failedRecordCount: 0,
      blockedRecordCount: 0,
      duplicateSourceIdentifiers: [],
      missingMappings: 0,
      orphanAllocations: 0,
      lineageComplete: false,
      journalBalanced: false,
      totalsComplete: false,
      totalsMatch: false,
      totalMismatchCount: 0,
      outboxItemsCreated: 0,
      unresolvedManualReviewItems: 0,
      currencies: [],
      scopedTotals: [],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissionCount.mockResolvedValue(1);
  mocks.queryRaw.mockResolvedValue([{ allowed: true }]);
  mocks.transaction.mockImplementation(
    async (callback: (client: typeof tx) => unknown) => callback(tx),
  );
  mocks.legalEntityFindFirst.mockResolvedValue({ id: "entity-a" });
  mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
});

describe("Accounting Phase 6 canonical legal-entity boundary", () => {
  it("rejects missing and same-organization wrong legal entities", () => {
    expect(() =>
      createCanonicalMigrationExecutor({
        orgId: "org-a",
        legalEntityId: " ",
        actorId: "actor-a",
      }),
    ).toThrow("SCOPE_VIOLATION:EXECUTION_SCOPE_REQUIRED");
    expect(() =>
      assertCanonicalMigrationRecordScope({
        authorizedOrgId: "org-a",
        authorizedLegalEntityId: "entity-a",
        mappedOrganizationId: "org-a",
        mappedLegalEntityId: "entity-b",
      }),
    ).toThrow("SCOPE_VIOLATION:LEGAL_ENTITY");
  });

  it("rejects a legal entity belonging to another organization", async () => {
    mocks.legalEntityFindFirst.mockResolvedValue(null);
    const executor = createCanonicalMigrationExecutor({
      orgId: "org-a",
      legalEntityId: "entity-a",
      actorId: "actor-a",
    });
    await expect(executor.execute(normalizedRecord())).rejects.toThrow(
      "SCOPE_VIOLATION:LEGAL_ENTITY_NOT_IN_ORGANIZATION",
    );
    expect(mocks.prepareSalesInvoice).not.toHaveBeenCalled();
  });

  it("passes the batch entity explicitly when the adapter default could differ", async () => {
    mocks.prepareSalesInvoice.mockResolvedValue({
      id: "canonical-1",
      orgId: "org-a",
      legalEntityId: "entity-a",
      transactionCurrencyCode: "INR",
      totalAmount: "100",
    });
    const executor = createCanonicalMigrationExecutor({
      orgId: "org-a",
      legalEntityId: "entity-a",
      actorId: "actor-a",
    });
    await expect(executor.execute(normalizedRecord())).resolves.toMatchObject({
      canonicalTargetIdentifier: "canonical-1",
      documentTotal: "100",
    });
    expect(mocks.prepareSalesInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ legalEntityId: "entity-a" }),
    );
  });

  it("rejects a canonical adapter result from a different legal entity", async () => {
    mocks.prepareSalesInvoice.mockResolvedValue({
      id: "canonical-foreign",
      orgId: "org-a",
      legalEntityId: "entity-b",
      transactionCurrencyCode: "INR",
      totalAmount: "100",
    });
    const executor = createCanonicalMigrationExecutor({
      orgId: "org-a",
      legalEntityId: "entity-a",
      actorId: "actor-a",
    });
    await expect(executor.execute(normalizedRecord())).rejects.toThrow(
      "SCOPE_VIOLATION:CANONICAL_TARGET",
    );
  });
});

describe("Accounting Phase 6 scoped repository mutations", () => {
  it.each([
    ["another organization", "org-b", "entity-a"],
    ["another legal entity", "org-a", "entity-b"],
  ])(
    "cannot finalize an identifier collision in %s",
    async (_label, storedOrgId, storedLegalEntityId) => {
      mocks.batchFindFirst.mockImplementation(
        async ({ where }: { where: { orgId: string; legalEntityId: string } }) =>
          where.orgId === storedOrgId &&
          where.legalEntityId === storedLegalEntityId
            ? { id: "shared-batch-id" }
            : null,
      );
      await expect(
        finalizePersistentMigrationBatch({
          orgId: "org-a",
          legalEntityId: "entity-a",
          actorId: "actor-a",
          batchId: "shared-batch-id",
          result: failedResult(),
        }),
      ).rejects.toThrow("MIGRATION_BATCH_FINALIZATION_SCOPE_MISMATCH");
      expect(mocks.batchUpdateMany).not.toHaveBeenCalled();
    },
  );

  it("puts organization, legal entity, batch and row version on the write", async () => {
    const current = {
      id: "batch-a",
      orgId: "org-a",
      legalEntityId: "entity-a",
      sourceBatchIdentifier: "batch-1",
      status: "EXECUTING",
      rowVersion: 7,
      records: [],
    };
    mocks.batchFindFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ ...current, status: "FAILED", rowVersion: 8 });
    mocks.batchUpdateMany.mockResolvedValue({ count: 1 });

    await finalizePersistentMigrationBatch({
      orgId: "org-a",
      legalEntityId: "entity-a",
      actorId: "actor-a",
      batchId: "batch-a",
      result: failedResult(),
    });

    expect(mocks.batchUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "batch-a",
          orgId: "org-a",
          legalEntityId: "entity-a",
          rowVersion: 7,
        }),
      }),
    );
  });

  it("rejects forged, disabled or missing approved execution mappings", async () => {
    mocks.batchFindFirst.mockResolvedValue({
      id: "batch-a",
      orgId: "org-a",
      legalEntityId: "entity-a",
      status: "DRY_RUN_READY",
      rowVersion: 1,
    });
    mocks.mappingFindMany.mockResolvedValue([]);
    const delegate = { execute: vi.fn() };
    const executor = checkpointingMigrationExecutor({
      orgId: "org-a",
      legalEntityId: "entity-a",
      actorId: "actor-a",
      batchId: "batch-a",
      delegate,
    });
    await expect(executor.execute(normalizedRecord())).rejects.toThrow(
      "MIGRATION_APPROVED_MAPPING_SCOPE_REQUIRED",
    );
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it("rejects an approved mapping with stale configuration evidence", async () => {
    mocks.batchFindFirst.mockResolvedValue({
      id: "batch-a",
      orgId: "org-a",
      legalEntityId: "entity-a",
      status: "DRY_RUN_READY",
      rowVersion: 1,
    });
    mocks.mappingFindMany.mockResolvedValue([
      {
        orgId: "org-a",
        legalEntityId: null,
        sourceSystem: "SYNTHETIC_LEDGER",
        mappingType: "ORGANIZATION",
        sourceValue: "source-org",
        targetType: "Organisation",
        targetId: "org-a",
        version: 1,
        status: "APPROVED",
        configurationHash: "stale",
        decisionReference: "MAP-ORG",
        createdById: "maker-a",
        approvedById: "checker-a",
      },
      {
        orgId: "org-a",
        legalEntityId: "entity-a",
        sourceSystem: "SYNTHETIC_LEDGER",
        mappingType: "LEGAL_ENTITY",
        sourceValue: "source-entity",
        targetType: "AccountingLegalEntity",
        targetId: "entity-a",
        version: 1,
        status: "APPROVED",
        configurationHash: "stale",
        decisionReference: "MAP-ENTITY",
        createdById: "maker-a",
        approvedById: "checker-a",
      },
    ]);
    const delegate = { execute: vi.fn() };
    const executor = checkpointingMigrationExecutor({
      orgId: "org-a",
      legalEntityId: "entity-a",
      actorId: "actor-a",
      batchId: "batch-a",
      delegate,
    });
    await expect(executor.execute(normalizedRecord())).rejects.toThrow(
      "MIGRATION_APPROVED_MAPPING_STALE_OR_INVALID",
    );
    expect(delegate.execute).not.toHaveBeenCalled();
  });
});
