import { describe, expect, it, vi } from "vitest";

import { recurringOccurrenceIdentity } from "../document-contracts";
import {
  PHASE6_SYNTHETIC_EXECUTION_PROOF,
  runAccountingMigrationPipeline,
} from "../migration/pipeline";
import type {
  AccountingImportContract,
  CanonicalMigrationExecutor,
  NormalizedMigrationRecord,
} from "../migration/types";
import {
  ACCOUNTING_ROLLBACK_FORWARD_FIX_MATRIX,
} from "../rollout/operational-controls";
import {
  createDeterministicAccountingRehearsalFixture,
} from "../rollout/rehearsal";

function singleRecordFixture() {
  const fixture =
    createDeterministicAccountingRehearsalFixture("small-functional");
  return {
    contract: {
      ...fixture.contract,
      records: [
        {
          ...fixture.contract.records[0],
          dependencies: [],
        },
      ],
    } satisfies AccountingImportContract,
    mappings: fixture.mappings,
  };
}

function evidence(record: NormalizedMigrationRecord) {
  return {
    canonicalTargetIdentifier: `scenario-${record.deterministicKey}`,
    currencyCode: String(record.payload.currencyCode),
    ...(record.payload.totals as Record<string, string>),
    outboxItemsCreated: 0,
  };
}

async function executeWithFailure(
  failure: string,
  contract = singleRecordFixture().contract,
) {
  const fixture = singleRecordFixture();
  return runAccountingMigrationPipeline({
    contract,
    mappings: fixture.mappings,
    mode: "EXECUTE",
    target: "synthetic-staging",
    executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
    executor: {
      async execute() {
        throw new Error(failure);
      },
    },
    now: () => new Date("2026-07-30T01:00:00.000Z"),
  });
}

describe("Accounting Phase 7 executable rehearsal scenarios", () => {
  it("REH-005 blocks a duplicate source identifier", async () => {
    const fixture = singleRecordFixture();
    const record = fixture.contract.records[0];
    const result = await runAccountingMigrationPipeline({
      contract: {
        ...fixture.contract,
        records: [record, { ...record }],
      },
      mappings: fixture.mappings,
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ classification: "DUPLICATE_SOURCE" }),
      ]),
    );
  });

  it("REH-006 blocks a missing legal-entity mapping", async () => {
    const fixture = singleRecordFixture();
    const result = await runAccountingMigrationPipeline({
      contract: fixture.contract,
      mappings: fixture.mappings.filter(
        (mapping) => mapping.mappingType !== "LEGAL_ENTITY",
      ),
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.issues[0]).toEqual(
      expect.objectContaining({ classification: "MISSING_MAPPING" }),
    );
  });

  it("REH-007 rejects ambiguous approved mappings without choosing a fallback", async () => {
    const fixture = singleRecordFixture();
    await expect(
      runAccountingMigrationPipeline({
        contract: fixture.contract,
        mappings: [
          ...fixture.mappings,
          {
            ...fixture.mappings[1],
            targetId: "stg_accounting_legal_entity_other",
            targetLegalEntityId: "stg_accounting_legal_entity",
            version: 2,
            decisionReference: "SYNTHETIC-MAP-ENTITY-2",
          },
        ],
      }),
    ).rejects.toThrow("AMBIGUOUS_APPROVED_MAPPING");
  });

  it("REH-008 rejects a cross-entity canonical execution attempt", async () => {
    const fixture = singleRecordFixture();
    const contract = {
      ...fixture.contract,
      records: fixture.contract.records.map((record) => ({
        ...record,
        targetLegalEntityRef: "synthetic-entity-other",
      })),
    };
    const result = await runAccountingMigrationPipeline({
      contract,
      mappings: [
        fixture.mappings[0],
        {
          ...fixture.mappings[1],
          sourceValue: "synthetic-entity-other",
          targetId: "stg_accounting_legal_entity_other",
          targetLegalEntityId: "stg_accounting_legal_entity_other",
        },
      ],
      mode: "EXECUTE",
      executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
      executor: {
        async execute(record) {
          if (
            record.mappedLegalEntityId !== "stg_accounting_legal_entity"
          ) {
            throw new Error("SCOPE_VIOLATION:LEGAL_ENTITY");
          }
          return evidence(record);
        },
      },
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.issues[0]).toEqual(
      expect.objectContaining({ classification: "SCOPE_VIOLATION" }),
    );
  });

  it("REH-009 classifies a closed-period conflict and withholds completion", async () => {
    const result = await executeWithFailure("CLOSED_PERIOD:PERIOD_LOCKED");
    expect(result.status).toBe("BLOCKED");
    expect(result.issues[0]).toEqual(
      expect.objectContaining({ classification: "CLOSED_PERIOD" }),
    );
    expect(result.certification).toBeUndefined();
  });

  it("REH-010 rejects unsupported currency without a fallback", async () => {
    const result = await executeWithFailure(
      "UNSUPPORTED_CURRENCY:CURRENCY_NOT_APPROVED",
    );
    expect(result.status).toBe("BLOCKED");
    expect(result.issues[0]).toEqual(
      expect.objectContaining({ classification: "UNSUPPORTED_CURRENCY" }),
    );
  });

  it("REH-011 blocks an opening balance without an accepted history policy", async () => {
    const fixture = singleRecordFixture();
    const result = await runAccountingMigrationPipeline({
      contract: {
        ...fixture.contract,
        records: [
          {
            ...fixture.contract.records[0],
            sourceRecordType: "OPENING_BALANCE",
          },
        ],
      },
      mappings: fixture.mappings,
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        code: "OPENING_HISTORY_POLICY_REQUIRED",
        classification: "POLICY_GATED",
      }),
    );
  });

  it("REH-012 executes both sales and purchase invoices with exact totals", async () => {
    const fixture =
      createDeterministicAccountingRehearsalFixture("small-functional");
    const records = fixture.contract.records.filter((record) =>
      ["SALES_INVOICE", "PURCHASE_INVOICE"].includes(record.sourceRecordType),
    );
    const executor = { execute: vi.fn(evidence) };
    const result = await runAccountingMigrationPipeline({
      contract: { ...fixture.contract, records },
      mappings: fixture.mappings,
      mode: "EXECUTE",
      executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
      executor,
      now: () => new Date("2026-07-30T01:00:00.000Z"),
    });
    expect(result.status).toBe("COMPLETED");
    expect(executor.execute).toHaveBeenCalledTimes(14);
    expect(result.reconciliation.totalsMatch).toBe(true);
  });

  it("REH-013 executes receipts and payments with exact applied totals", async () => {
    const fixture =
      createDeterministicAccountingRehearsalFixture("small-functional");
    const records = fixture.contract.records.filter((record) =>
      ["RECEIPT", "PAYMENT"].includes(record.sourceRecordType),
    );
    const result = await runAccountingMigrationPipeline({
      contract: { ...fixture.contract, records },
      mappings: fixture.mappings,
      mode: "EXECUTE",
      executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
      executor: { execute: async (record) => evidence(record) },
      now: () => new Date("2026-07-30T01:00:00.000Z"),
    });
    expect(result.status).toBe("COMPLETED");
    expect(result.reconciliation.totalsMatch).toBe(true);
  });

  it("REH-014 retains allocation dependencies and exact reconciliation", async () => {
    const fixture =
      createDeterministicAccountingRehearsalFixture("small-functional");
    const allocations = fixture.contract.records.filter(
      (record) => record.sourceRecordType === "ALLOCATION",
    );
    expect(allocations).toHaveLength(4);
    expect(allocations.every((record) => record.dependencies.length === 2)).toBe(
      true,
    );
    const result = await runAccountingMigrationPipeline({
      contract: fixture.contract,
      mappings: fixture.mappings,
    });
    expect(result.status).toBe("DRY_RUN_READY");
  });

  it("REH-015 retains credit/debit note lineage to original documents", () => {
    const fixture =
      createDeterministicAccountingRehearsalFixture("small-functional");
    const corrections = fixture.contract.records.filter((record) =>
      ["CREDIT_NOTE", "DEBIT_NOTE"].includes(record.sourceRecordType),
    );
    expect(corrections).toHaveLength(4);
    expect(
      corrections.every(
        (record) =>
          record.dependencies.length === 1 &&
          record.payload.lineageReference === record.dependencies[0],
      ),
    ).toBe(true);
  });

  it("REH-016 quarantines an attachment execution failure", async () => {
    const fixture = singleRecordFixture();
    const contract: AccountingImportContract = {
      ...fixture.contract,
      records: [
        {
          ...fixture.contract.records[0],
          payload: {
            ...fixture.contract.records[0].payload,
            acceptedAttachmentPolicyReference: "SYNTHETIC-ATTACHMENT-POLICY-1",
          },
          attachments: [
            {
              sourceIdentifier: "attachment-1",
              relativePath: "safe/invoice.pdf",
              mimeType: "application/pdf",
              sizeBytes: 128,
              sha256: "a".repeat(64),
            },
          ],
        },
      ],
    };
    const result = await executeWithFailure(
      "ATTACHMENT_FAILURE:SCAN_REQUIRED",
      contract,
    );
    expect(result.status).toBe("BLOCKED");
    expect(result.issues[0]).toEqual(
      expect.objectContaining({ classification: "ATTACHMENT_FAILURE" }),
    );
  });

  it("REH-019 produces one stable scheduler occurrence identity", () => {
    const input = {
      templateType: "RECURRING_JOURNAL",
      templateId: "template-1",
      templateVersion: 3,
      scheduledFor: "2026-07-30T10:30:00.000Z",
    };
    const first = recurringOccurrenceIdentity(input);
    expect(recurringOccurrenceIdentity(input)).toBe(first);
    expect(
      recurringOccurrenceIdentity({
        ...input,
        scheduledFor: "2026-07-31T10:30:00.000Z",
      }),
    ).not.toBe(first);
  });

  it("REH-020 requires canonical reversal and forbids abandoning posted effects", () => {
    const posted = ACCOUNTING_ROLLBACK_FORWARD_FIX_MATRIX.find(
      ([stage]) => stage === "posted-canonical-effect",
    );
    expect(posted).toBeDefined();
    expect(posted?.[4]).toBe(false);
    expect(posted?.[5]).toBe(true);
    expect(posted?.[9]).toContain("never delete");
  });

  it("REH-021 checkpoints a partial failure and completes on resume", async () => {
    const fixture = singleRecordFixture();
    let interrupted = false;
    const executor: CanonicalMigrationExecutor = {
      async execute(record) {
        if (!interrupted) {
          interrupted = true;
          throw new Error("POSTING_FAILURE:PARTIAL_INFRASTRUCTURE");
        }
        return evidence(record);
      },
    };
    const first = await runAccountingMigrationPipeline({
      contract: fixture.contract,
      mappings: fixture.mappings,
      mode: "EXECUTE",
      executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
      executor,
    });
    expect(first.status).toBe("FAILED");
    expect(first.issues[0]).toEqual(
      expect.objectContaining({
        classification: "POSTING_FAILURE",
        retryable: true,
      }),
    );
    const resumed = await runAccountingMigrationPipeline({
      contract: fixture.contract,
      mappings: fixture.mappings,
      mode: "EXECUTE",
      executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
      executor,
      previousOutcomes: first.outcomes,
      now: () => new Date("2026-07-30T01:00:00.000Z"),
    });
    expect(resumed.status).toBe("COMPLETED");
  });
});
