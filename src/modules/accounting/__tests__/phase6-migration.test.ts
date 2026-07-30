import { describe, expect, it, vi } from "vitest";

import { deterministicDependencyOrder } from "../migration/dependency-order";
import {
  mappingConfigurationHash,
  resolveRecordMappings,
  validateMappings,
} from "../migration/mapping";
import {
  PHASE6_SYNTHETIC_EXECUTION_PROOF,
  runAccountingMigrationPipeline,
} from "../migration/pipeline";
import { verifyPostCutoverSnapshot } from "../migration/post-cutover";
import {
  assertAcceptedPolicyReference,
  assertPolicySafeRecord,
  openingHistoryPolicyIssues,
} from "../migration/policy-gates";
import { parseAccountingReadinessSnapshot } from "../migration/readiness";
import { reconcileMigration } from "../migration/reconciliation";
import {
  deterministicMigrationKey,
  parseAccountingImportContract,
} from "../migration/source-contract";
import {
  assertNoSensitiveFields,
  assertSafeRelativePath,
  boundedSafeMessage,
  redactSensitiveFields,
  safeSpreadsheetCell,
  validateAttachmentMetadata,
} from "../migration/security";
import type {
  AccountingImportContract,
  AccountingImportRecord,
  AccountingMapping,
  NormalizedMigrationRecord,
} from "../migration/types";

const record = (
  overrides: Partial<AccountingImportRecord> = {},
): AccountingImportRecord => {
  const payload = {
    currencyCode: "INR",
    acceptedCurrencyPolicyReference: "POLICY-CURRENCY-1",
    totals: {
      documentTotal: "9007199254740993.12345678",
      debitTotal: "9007199254740993.12345678",
      creditTotal: "9007199254740993.12345678",
    },
  };
  return {
    sourceSystem: "SYNTHETIC_LEDGER",
    sourceRecordType: "SALES_INVOICE",
    sourceIdentifier: "invoice-1",
    sourceVersion: "1",
    targetOrganizationRef: "source-org",
    targetLegalEntityRef: "source-entity",
    importBatch: "batch-1",
    dependencies: [],
    attachments: [],
    ...overrides,
    payload: { ...payload, ...overrides.payload },
  };
};

const contract = (
  records: AccountingImportRecord[] = [record()],
): AccountingImportContract => ({
  schemaVersion: "accounting-import/v1",
  sourceSystem: "SYNTHETIC_LEDGER",
  sourceBatchIdentifier: "batch-1",
  extractedAt: "2026-07-30T00:00:00.000Z",
  targetOrganizationRef: "source-org",
  records,
});

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
    decisionReference: "MAP-ORG-1",
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
    decisionReference: "MAP-ENTITY-1",
  },
];

function normalized(input: AccountingImportRecord): NormalizedMigrationRecord {
  return {
    ...input,
    deterministicKey: deterministicMigrationKey(input),
    normalizedSourceVersion: input.sourceVersion ?? "1",
    mappedOrganizationId: "target-org",
    mappedLegalEntityId: "target-entity",
    resolvedMappings: {
      ORGANIZATION: "target-org",
      LEGAL_ENTITY: "target-entity",
    },
  };
}

describe("Accounting Phase 6 source contract and mapping", () => {
  it("validates the versioned contract and deterministic idempotency key", () => {
    const parsed = parseAccountingImportContract(contract());
    expect(parsed.schemaVersion).toBe("accounting-import/v1");
    expect(deterministicMigrationKey(parsed.records[0])).toBe(
      deterministicMigrationKey(parsed.records[0]),
    );
    expect(deterministicMigrationKey(parsed.records[0])).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects secret-like fields without revealing their values", () => {
    const unsafe = contract([
      record({ payload: { apiToken: "must-not-appear" } }),
    ]);
    expect(() => parseAccountingImportContract(unsafe)).toThrow(
      "SENSITIVE_FIELD_FORBIDDEN",
    );
  });

  it("resolves exact scoped mappings and rejects missing or ambiguous matches", () => {
    validateMappings(mappings);
    expect(
      resolveRecordMappings({ record: record(), mappings }).legalEntityId,
    ).toBe("target-entity");
    expect(() =>
      resolveRecordMappings({ record: record(), mappings: mappings.slice(0, 1) }),
    ).toThrow("MISSING_MAPPING:LEGAL_ENTITY");
    expect(() => validateMappings([...mappings, { ...mappings[1], version: 2 }])).toThrow(
      "AMBIGUOUS_APPROVED_MAPPING",
    );
    expect(mappingConfigurationHash(mappings[0])).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("Accounting Phase 6 dependency and policy gates", () => {
  it("orders dependencies deterministically and reports missing nodes/cycles", () => {
    const organization = normalized(
      record({
        sourceRecordType: "ORGANIZATION",
        sourceIdentifier: "org-1",
      }),
    );
    const invoice = normalized(
      record({
        dependencies: [
          `${organization.sourceSystem}:${organization.sourceRecordType}:${organization.sourceIdentifier}:1`,
        ],
      }),
    );
    expect(deterministicDependencyOrder([invoice, organization])).toEqual([
      organization,
      invoice,
    ]);
    expect(() =>
      deterministicDependencyOrder([
        { ...invoice, dependencies: ["missing-record"] },
      ]),
    ).toThrow("MISSING_DEPENDENCY");

    const left = normalized(
      record({ sourceIdentifier: "left", dependencies: [] }),
    );
    const right = normalized(
      record({ sourceIdentifier: "right", dependencies: [] }),
    );
    left.dependencies = [right.deterministicKey];
    right.dependencies = [left.deterministicKey];
    expect(() => deterministicDependencyOrder([left, right])).toThrow(
      "DEPENDENCY_CYCLE",
    );
  });

  it("keeps opening balances blocked until every policy decision is accepted", () => {
    const opening = record({ sourceRecordType: "OPENING_BALANCE" });
    expect(openingHistoryPolicyIssues(contract([opening]), opening)[0]?.code).toBe(
      "OPENING_HISTORY_POLICY_REQUIRED",
    );
  });
});

describe("Accounting Phase 6 pipeline and reconciliation", () => {
  it("defaults to dry run and never calls the canonical executor", async () => {
    const execute = vi.fn();
    const result = await runAccountingMigrationPipeline({
      contract: contract(),
      mappings,
      executor: { execute },
    });
    expect(result.mode).toBe("DRY_RUN");
    expect(result.status).toBe("DRY_RUN_READY");
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects production and explicit execution without its guard", async () => {
    await expect(
      runAccountingMigrationPipeline({
        contract: contract(),
        mappings,
        target: "production",
      }),
    ).rejects.toThrow("PRODUCTION_BLOCKED");
    await expect(
      runAccountingMigrationPipeline({
        contract: contract(),
        mappings,
        mode: "EXECUTE",
      }),
    ).rejects.toThrow("EXECUTION_GUARD_REQUIRED");
  });

  it("executes through an injected canonical boundary and resumes successes", async () => {
    const execute = vi.fn().mockResolvedValue({
      canonicalTargetIdentifier: "canonical-document-1",
      currencyCode: "INR",
      documentTotal: "9007199254740993.12345678",
      debitTotal: "9007199254740993.12345678",
      creditTotal: "9007199254740993.12345678",
    });
    const first = await runAccountingMigrationPipeline({
      contract: contract(),
      mappings,
      mode: "EXECUTE",
      executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
      executor: { execute },
    });
    expect(first.status).toBe("COMPLETED");
    expect(first.certification?.complete).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);

    const replay = await runAccountingMigrationPipeline({
      contract: contract(),
      mappings,
      mode: "EXECUTE",
      executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
      executor: { execute },
      previousOutcomes: first.outcomes,
    });
    expect(replay.outcomes[0]?.status).toBe("SKIPPED");
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("never certifies the confirmed 100-versus-999 target-total defect", async () => {
    const source = record({
      payload: {
        currencyCode: "INR",
        totals: {
          documentTotal: "100",
          debitTotal: "100",
          creditTotal: "100",
        },
      },
    });
    const result = await runAccountingMigrationPipeline({
      contract: contract([source]),
      mappings,
      mode: "EXECUTE",
      executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
      executor: {
        execute: async () => ({
          canonicalTargetIdentifier: "canonical-document-1",
          currencyCode: "INR",
          documentTotal: "999",
          debitTotal: "100",
          creditTotal: "100",
        }),
      },
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.certification).toBeUndefined();
    expect(result.reconciliation.totalsMatch).toBe(false);
    expect(result.reconciliation.scopedTotals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceTotal: "100",
          targetTotal: "999",
          status: "MISMATCH",
          mismatchCodes: ["SOURCE_TARGET_TOTAL_MISMATCH"],
        }),
      ]),
    );
  });

  it.each([
    ["rounding-equivalent", "100.0", "100.00000000", "INR"],
    ["negative", "-12.500", "-12.5", "USD"],
    ["zero", "0.00000000", "0", "INR"],
  ])(
    "reconciles exact decimal %s totals without binary rounding",
    async (_label, sourceTotal, targetTotal, currencyCode) => {
      const source = record({
        payload: {
          currencyCode,
          totals: {
            documentTotal: sourceTotal,
            debitTotal: sourceTotal,
            creditTotal: sourceTotal,
          },
        },
      });
      const result = await runAccountingMigrationPipeline({
        contract: contract([source]),
        mappings,
        mode: "EXECUTE",
        executionProof: PHASE6_SYNTHETIC_EXECUTION_PROOF,
        executor: {
          execute: async () => ({
            canonicalTargetIdentifier: "canonical-document-1",
            currencyCode,
            documentTotal: targetTotal,
            debitTotal: targetTotal,
            creditTotal: targetTotal,
          }),
        },
      });
      expect(result.status).toBe("COMPLETED");
      expect(result.reconciliation.totalsMatch).toBe(true);
    },
  );

  it("blocks missing and malformed applicable totals", async () => {
    const result = await runAccountingMigrationPipeline({
      contract: contract([
        record({
          payload: {
            currencyCode: "INR",
            totals: {
              documentTotal: "not-a-decimal",
              debitTotal: "100",
            },
          },
        }),
      ]),
      mappings,
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.reconciliation.totalsComplete).toBe(false);
    expect(
      result.reconciliation.scopedTotals.flatMap(
        (entry) => entry.mismatchCodes,
      ),
    ).toContain("SOURCE_TOTAL_MISSING_OR_INVALID");
  });

  it("uses exact decimal strings and never combines currencies", () => {
    const inr = normalized(record());
    const usd = normalized(
      record({
        sourceIdentifier: "invoice-usd",
        payload: {
          currencyCode: "USD",
          totals: {
            documentTotal: "0.00000002",
            debitTotal: "0.00000002",
            creditTotal: "0.00000002",
          },
        },
      }),
    );
    const result = reconcileMigration({
      records: [inr, usd],
      outcomes: [inr, usd].map((entry) => ({
        deterministicKey: entry.deterministicKey,
        sourceRecordType: entry.sourceRecordType,
        status: "READY" as const,
        validationStatus: "VALID" as const,
        reconciliationStatus: "PENDING" as const,
      })),
    });
    expect(result.currencies.map((entry) => entry.currencyCode)).toEqual([
      "INR",
      "USD",
    ]);
    expect(result.currencies[0]?.sourceDocumentTotal).toBe(
      "9007199254740993.12345678",
    );
    expect(result.journalBalanced).toBe(true);
  });
});

describe("Accounting Phase 6 security output", () => {
  it("redacts sensitive values and neutralizes spreadsheet formulas", () => {
    expect(redactSensitiveFields({ password: "value", ok: "safe" })).toEqual({
      password: "[REDACTED]",
      ok: "safe",
    });
    expect(safeSpreadsheetCell("=CMD()")).toBe("'=CMD()");
    const credentialBearingUrl = ["postgresql://user", "value@host/db"].join(":");
    expect(boundedSafeMessage(new Error(credentialBearingUrl))).not.toContain("value");
    expect(() => assertNoSensitiveFields({ databaseUrl: "hidden" })).toThrow();
  });

  it("rejects traversal and invalid attachment metadata", () => {
    expect(() => assertSafeRelativePath("../../secret")).toThrow(
      "ATTACHMENT_PATH_TRAVERSAL",
    );
    expect(() =>
      validateAttachmentMetadata({
        relativePath: "invoices/source.pdf",
        mimeType: "application/x-msdownload",
        sizeBytes: 100,
        sha256: "a".repeat(64),
      }),
    ).toThrow("ATTACHMENT_TYPE_UNSUPPORTED");
    expect(
      validateAttachmentMetadata({
        relativePath: "invoices/source.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        sha256: "A".repeat(64),
      }).scanStatus,
    ).toBe("SCAN_REQUIRED");
  });
});

describe("Accounting Phase 6 fail-closed policy references", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty", ""],
    ["whitespace", "   "],
    ["malformed-leading-symbol", "#POLICY"],
    ["malformed-space", "POLICY 1"],
    ["structured-value", { id: "POLICY-1" }],
  ])("rejects %s references", (_label, value) => {
    expect(() =>
      assertAcceptedPolicyReference(value, "POLICY_REQUIRED"),
    ).toThrow("POLICY_GATED:POLICY_REQUIRED");
  });

  it("accepts a bounded stable policy reference", () => {
    expect(
      assertAcceptedPolicyReference(" POLICY/2026-07:v1 ", "POLICY_REQUIRED"),
    ).toBe("POLICY/2026-07:v1");
  });

  it.each([
    ["DEPRECIATION_SOURCE", "acceptedPolicyReference"],
    ["PARTNER_TRANSACTION", "acceptedPolicyReference"],
    ["CURRENCY", "acceptedCurrencyPolicyReference"],
    ["EXCHANGE_RATE_REFERENCE", "acceptedExchangeRatePolicyReference"],
    ["ATTACHMENT", "acceptedAttachmentPolicyReference"],
  ] as const)("fails closed for %s policy gates", (sourceRecordType, field) => {
    expect(() =>
      assertPolicySafeRecord(
        record({
          sourceRecordType,
          payload: { [field]: " " },
        }),
      ),
    ).toThrow("POLICY_GATED");
  });

  it("fails closed for malformed tax and inline exchange-rate references", () => {
    expect(() =>
      assertPolicySafeRecord(
        record({
          payload: {
            taxCode: "GST",
            acceptedTaxPolicyReference: "",
          },
        }),
      ),
    ).toThrow("POLICY_GATED:TAX_POLICY_REQUIRED");
    expect(() =>
      assertPolicySafeRecord(
        record({
          payload: {
            exchangeRate: "1.25",
            acceptedExchangeRatePolicyReference: "invalid reference",
          },
        }),
      ),
    ).toThrow("POLICY_GATED:EXCHANGE_RATE_POLICY_REQUIRED");
  });

  it("rejects incomplete or structurally invalid readiness evidence", () => {
    expect(() => parseAccountingReadinessSnapshot({})).toThrow(
      "READINESS_SNAPSHOT_FIELD_INVALID",
    );
    expect(() =>
      parseAccountingReadinessSnapshot({
        schemaConsistent: true,
        migrationsCurrent: true,
        requiredPermissionsPresent: true,
        organizationConfigured: true,
        legalEntitiesConfigured: true,
        numberSeriesConfigured: true,
        openPeriodsConfigured: true,
        accountMappingsComplete: true,
        currencyPolicyAccepted: true,
        exchangeRatePolicyAccepted: true,
        openingBalancePolicyAccepted: true,
        taxPolicyAccepted: true,
        depreciationPolicyAccepted: true,
        partnerPolicyAccepted: true,
        providersDisabled: true,
        backupVerified: true,
        schedulerState: "UNKNOWN",
        outboxUnsafeDestinations: 0,
        migrationIncompleteBatches: 0,
        unresolvedPolicyGates: [],
      }),
    ).toThrow("READINESS_SNAPSHOT_FIELD_INVALID:schedulerState");
  });
});

describe("Accounting Phase 6 post-cutover verification", () => {
  it("is read-only evidence evaluation and fails closed on imbalance/provider state", () => {
    const result = verifyPostCutoverSnapshot({
      authenticationReadable: true,
      accountingNavigationReadable: true,
      permissionBoundariesVerified: true,
      representativeDocumentsReadable: true,
      journalDebitTotal: "10.00",
      journalCreditTotal: "9.99",
      generalLedgerReadable: true,
      invoicePaymentLineageComplete: true,
      allocationTotalsMatch: true,
      outboxHealthy: true,
      schedulerHealthy: true,
      configurationComplete: true,
      migrationReconciliationPassed: true,
      providerState: "ENABLED",
      p95ReadMilliseconds: 50,
      acceptedP95ReadMilliseconds: 100,
    });
    expect(result.ready).toBe(false);
    expect(
      result.checks.filter((check) => check.status === "blocked").map(
        (check) => check.code,
      ),
    ).toEqual(["JOURNAL_BALANCE", "PROVIDER_DISABLED"]);
  });
});
