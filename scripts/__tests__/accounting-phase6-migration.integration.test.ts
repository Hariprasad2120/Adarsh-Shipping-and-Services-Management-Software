import { describe, expect, it, vi } from "vitest";

import {
  PHASE6_SYNTHETIC_EXECUTION_PROOF,
  runAccountingMigrationPipeline,
} from "../../src/modules/accounting/migration/pipeline";
import type {
  AccountingImportContract,
  AccountingMapping,
} from "../../src/modules/accounting/migration/types";

const records: AccountingImportContract["records"] = [
  {
    sourceSystem: "SYNTHETIC_LEDGER",
    sourceRecordType: "SALES_INVOICE",
    sourceIdentifier: "sales-1",
    sourceVersion: "1",
    targetOrganizationRef: "source-org",
    targetLegalEntityRef: "source-entity",
    importBatch: "integration-batch",
    dependencies: [],
    payload: {
      currencyCode: "INR",
      acceptedCurrencyPolicyReference: "POLICY-CURRENCY-1",
      totals: { documentTotal: "100", debitTotal: "100", creditTotal: "100" },
    },
    attachments: [],
  },
  {
    sourceSystem: "SYNTHETIC_LEDGER",
    sourceRecordType: "PURCHASE_INVOICE",
    sourceIdentifier: "purchase-1",
    sourceVersion: "1",
    targetOrganizationRef: "source-org",
    targetLegalEntityRef: "source-entity",
    importBatch: "integration-batch",
    dependencies: [],
    payload: {
      currencyCode: "INR",
      acceptedCurrencyPolicyReference: "POLICY-CURRENCY-1",
      totals: { documentTotal: "40", debitTotal: "40", creditTotal: "40" },
    },
    attachments: [],
  },
];

const contract: AccountingImportContract = {
  schemaVersion: "accounting-import/v1",
  sourceSystem: "SYNTHETIC_LEDGER",
  sourceBatchIdentifier: "integration-batch",
  extractedAt: "2026-07-30T00:00:00.000Z",
  targetOrganizationRef: "source-org",
  records,
};

const mappings: AccountingMapping[] = [
  {
    sourceSystem: "SYNTHETIC_LEDGER",
    targetOrganizationId: "target-org",
    mappingType: "ORGANIZATION",
    sourceValue: "source-org",
    targetType: "Organisation",
    targetId: "target-org",
    version: 1,
    status: "APPROVED",
    decisionReference: "MAP-ORG",
  },
  {
    sourceSystem: "SYNTHETIC_LEDGER",
    targetOrganizationId: "target-org",
    targetLegalEntityId: "target-entity",
    mappingType: "LEGAL_ENTITY",
    sourceValue: "source-entity",
    targetType: "AccountingLegalEntity",
    targetId: "target-entity",
    version: 1,
    status: "APPROVED",
    decisionReference: "MAP-ENTITY",
  },
];

describe("Accounting Phase 6 guarded synthetic pipeline", () => {
  it("dry-runs without effects and detects a missing mapping", async () => {
    const executor = { execute: vi.fn() };
    const dryRun = await runAccountingMigrationPipeline({
      contract,
      mappings,
      executor,
    });
    expect(dryRun.status).toBe("DRY_RUN_READY");
    expect(executor.execute).not.toHaveBeenCalled();
    const missing = await runAccountingMigrationPipeline({
      contract,
      mappings: mappings.slice(0, 1),
    });
    expect(missing.status).toBe("BLOCKED");
    expect(missing.issues.some((issue) => issue.code === "MISSING_MAPPING")).toBe(
      true,
    );
  });

  it("resumes an interrupted batch and replays without duplicates", async () => {
    const created = new Map<string, string>();
    let calls = 0;
    const executor = {
      execute: vi.fn(async (record: { deterministicKey: string }) => {
        calls += 1;
        if (calls === 2) throw new Error("POSTING_FAILURE:INTERRUPTED");
        const id = created.get(record.deterministicKey) ?? `target-${created.size + 1}`;
        created.set(record.deterministicKey, id);
        const source = records.find(
          (entry) =>
            entry.sourceIdentifier ===
            (record as { sourceIdentifier?: string }).sourceIdentifier,
        );
        const total = String(
          (source?.payload.totals as { documentTotal?: string } | undefined)
            ?.documentTotal ?? "0",
        );
        return {
          canonicalTargetIdentifier: id,
          currencyCode: "INR",
          documentTotal: total,
          debitTotal: total,
          creditTotal: total,
          outboxItemsCreated: 0,
        };
      }),
    };
    const first = await runAccountingMigrationPipeline({
      contract,
      mappings,
      mode: "EXECUTE",
      executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
      executor,
    });
    expect(first.status).toBe("FAILED");
    const resume = await runAccountingMigrationPipeline({
      contract,
      mappings,
      mode: "EXECUTE",
      executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
      executor: {
        execute: async (record) => {
          const id =
            created.get(record.deterministicKey) ?? `target-${created.size + 1}`;
          created.set(record.deterministicKey, id);
          const total = String(
            (
              record.payload.totals as
                | { documentTotal?: string }
                | undefined
            )?.documentTotal ?? "0",
          );
          return {
            canonicalTargetIdentifier: id,
            currencyCode: "INR",
            documentTotal: total,
            debitTotal: total,
            creditTotal: total,
            outboxItemsCreated: 0,
          };
        },
      },
      previousOutcomes: first.outcomes,
    });
    expect(resume.status).toBe("COMPLETED");
    expect(created.size).toBe(2);
  });
});
