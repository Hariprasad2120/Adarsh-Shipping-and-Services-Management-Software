import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { evaluateAccountingBackupReadiness } from "../rollout/backup-readiness";
import {
  transitionAccountingCutoverState,
  type AccountingCutoverTransitionEvidence,
} from "../rollout/cutover-state-machine";
import {
  ACCOUNTING_ROLLOUT_GATE_CODES,
  assessAccountingRolloutReadiness,
  type AccountingRolloutGate,
} from "../rollout/go-no-go";
import {
  parseAccountingRolloutManifest,
  verifyAccountingRolloutManifest,
} from "../rollout/migration-manifest";
import { migrationManifestHash } from "../migration/source-contract";
import { canonicalPayload } from "../request-integrity";
import {
  validateOperationalControlCatalogue,
  ACCOUNTING_ALERT_DEFINITIONS,
  ACCOUNTING_OPERATIONAL_MONITORS,
} from "../rollout/operational-controls";
import {
  parseAccountingPolicyDecisionRegister,
  summarizeAccountingPolicyDecisions,
} from "../rollout/policy-register";
import {
  validateProductionConfiguration,
  type ProductionConfigurationIntent,
} from "../rollout/production-configuration";
import {
  ACCOUNTING_REHEARSAL_PROFILES,
  ACCOUNTING_REHEARSAL_SCENARIOS,
  accountingRehearsalAttachmentInventory,
  accountingRehearsalDependencyGraphHash,
  createDeterministicAccountingRehearsalFixture,
  PHASE7_IN_MEMORY_EXECUTION_PROOF,
  PHASE7_REHEARSAL_MARKER,
  runGuardedAccountingRehearsal,
  type AccountingRehearsalGuard,
} from "../rollout/rehearsal";
import type {
  CanonicalMigrationExecutor,
  NormalizedMigrationRecord,
} from "../migration/types";

const root = process.cwd();
const policyRegisterRaw = readFileSync(
    resolve(
      root,
      "docs/accounting/contracts/accounting-phase7-policy-register.v1.json",
    ),
    "utf8",
);
const policyRegister = JSON.parse(policyRegisterRaw);
const manifest = JSON.parse(
  readFileSync(
    resolve(
      root,
      "docs/accounting/contracts/accounting-phase7-manifest.synthetic.v1.json",
    ),
    "utf8",
  ),
);

const guard: AccountingRehearsalGuard = {
  environmentMarker: PHASE7_REHEARSAL_MARKER,
  target: "synthetic-staging",
  storageTarget: "EPHEMERAL_IN_MEMORY",
  databaseAccess: "NONE",
  databasePort: null,
  providerMode: "disabled",
  outboundDeliveryMode: "disabled",
  datasetClassification: "SYNTHETIC",
  operatorId: "synthetic-operator",
  checkerId: "synthetic-checker",
  productionAuthorizationPresent: false,
};

function evidence(record: NormalizedMigrationRecord) {
  const totals = record.payload.totals as Record<string, string>;
  return {
    canonicalTargetIdentifier: `synthetic-${record.deterministicKey}`,
    currencyCode: String(record.payload.currencyCode),
    ...totals,
    outboxItemsCreated: 0,
  };
}

function idempotentExecutor(input?: {
  failOnceAt?: number;
  mismatch?: boolean;
}) {
  const targets = new Map<string, string>();
  let calls = 0;
  let interrupted = false;
  const execute = vi.fn(async (record: NormalizedMigrationRecord) => {
    calls += 1;
    if (
      input?.failOnceAt === calls &&
      !interrupted
    ) {
      interrupted = true;
      throw new Error("POSTING_FAILURE:SYNTHETIC_INTERRUPTION");
    }
    targets.set(
      record.deterministicKey,
      targets.get(record.deterministicKey) ??
        `synthetic-${record.deterministicKey}`,
    );
    const result = evidence(record);
    if (input?.mismatch && calls === 1 && result.documentTotal) {
      result.documentTotal = "999999";
    }
    return result;
  });
  return { executor: { execute } satisfies CanonicalMigrationExecutor, targets };
}

function productionEnvironment(
  intent: ProductionConfigurationIntent = "PROVIDER_DISABLED_STARTUP",
) {
  const environment: Record<string, string> = {
    MONOLITH_ENV: "production",
    DATABASE_URL: "postgresql://rollout_user@db.example.invalid:6543/rollout_db",
    ACCOUNTING_PRODUCTION_DATABASE_HOST: "db.example.invalid",
    ACCOUNTING_PRODUCTION_DATABASE_PORT: "6543",
    ACCOUNTING_PRODUCTION_DATABASE_NAME: "rollout_db",
    ACCOUNTING_PRODUCTION_DATABASE_USER: "rollout_user",
    ACCOUNTING_PRODUCTION_DATABASE_MARKER: "PRODUCTION-IDENTITY-EVIDENCE",
    ACCOUNTING_ORGANIZATION_ID: "org-approved",
    ACCOUNTING_LEGAL_ENTITY_IDS: "entity-a,entity-b",
    ACCOUNTING_PROVIDER_MODE: "disabled",
    ACCOUNTING_OUTBOUND_DELIVERY_MODE: "disabled",
    ACCOUNTING_SCHEDULER_MODE: "disabled",
    ACCOUNTING_STORAGE_MODE: "disabled",
    ACCOUNTING_OBSERVABILITY_MODE: "redacted",
    ACCOUNTING_MIGRATION_MODE: "disabled",
  };
  if (intent === "MIGRATION_EXECUTION") {
    Object.assign(environment, {
      ACCOUNTING_BACKUP_EVIDENCE_REFERENCE: "BACKUP-EVIDENCE-1",
      ACCOUNTING_RESTORE_REHEARSAL_REFERENCE: "RESTORE-EVIDENCE-1",
      ACCOUNTING_MIGRATION_TECHNICAL_APPROVAL: "TECH-APPROVAL-1",
      ACCOUNTING_MIGRATION_BUSINESS_APPROVAL: "BUSINESS-APPROVAL-1",
      ACCOUNTING_MIGRATION_SECURITY_APPROVAL: "SECURITY-APPROVAL-1",
      ACCOUNTING_MIGRATION_OPERATOR_ID: "operator-a",
      ACCOUNTING_MIGRATION_CHECKER_ID: "checker-b",
      ACCOUNTING_PRODUCTION_AUTHORIZATION_REFERENCE: "PROD-AUTH-1",
      ACCOUNTING_PRODUCTION_AUTHORIZATION_MARKER:
        "SEPARATE_PRODUCTION_AUTHORIZATION_GRANTED",
    });
  }
  return environment;
}

describe("Accounting Phase 7 policy and configuration contracts", () => {
  it("tracks every required decision and fails closed while policies are unresolved", () => {
    const parsed = parseAccountingPolicyDecisionRegister(policyRegister);
    const summary = summarizeAccountingPolicyDecisions(parsed);
    expect(summary.total).toBe(20);
    expect(summary.ready).toBe(false);
    expect(summary.blockingDecisionIds).toHaveLength(20);
  });

  it("rejects a missing required policy decision", () => {
    expect(() =>
      parseAccountingPolicyDecisionRegister({
        ...policyRegister,
        decisions: policyRegister.decisions.slice(1),
      }),
    ).toThrow("POLICY_DECISION_REQUIRED_MISSING");
  });

  it("rejects malformed policy approval records and calendar dates", () => {
    const approvedWithoutEvidence = structuredClone(policyRegister);
    approvedWithoutEvidence.decisions[0].status = "APPROVED";
    expect(() =>
      parseAccountingPolicyDecisionRegister(approvedWithoutEvidence),
    ).toThrow("POLICY_DECISION_APPROVAL_EVIDENCE_REQUIRED");

    const impossibleDate = structuredClone(policyRegister);
    impossibleDate.decisions[0].effectiveDate = "2026-99-99";
    expect(() =>
      parseAccountingPolicyDecisionRegister(impossibleDate),
    ).toThrow("POLICY_DECISION_EFFECTIVE_DATE_INVALID");
  });

  it("validates provider-disabled startup without returning values", () => {
    const report = validateProductionConfiguration(productionEnvironment());
    expect(report.ready).toBe(true);
    expect(report.providersDisabled).toBe(true);
    expect(report.valuesDisclosed).toBe(false);
    expect(JSON.stringify(report)).not.toContain("synthetic@");
  });

  it("rejects port 5432, provider enablement, staging fallback, and ambiguous scheduler ownership", () => {
    const environment = {
      ...productionEnvironment(),
      DATABASE_URL:
        "postgresql://rollout_user@db.example.invalid:5432/rollout_db",
      ACCOUNTING_PRODUCTION_DATABASE_PORT: "5432",
      ACCOUNTING_PROVIDER_MODE: "enabled",
      ACCOUNTING_SCHEDULER_MODE: "disabled",
      ACCOUNTING_SCHEDULER_OWNER: "unexpected-owner",
      STAGING_MARKER: "unexpected",
    };
    const report = validateProductionConfiguration(environment);
    expect(report.ready).toBe(false);
    expect(report.issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "DATABASE_PORT_5432_FORBIDDEN",
        "DATABASE_URL_PORT_5432_OR_IMPLICIT_FORBIDDEN",
        "PROVIDER_MODE_MUST_BE_DISABLED",
        "STAGING_FALLBACK_FORBIDDEN",
        "SCHEDULER_OWNER_AMBIGUOUS",
      ]),
    );
  });

  it("rejects loopback and staging-shaped identities even when MONOLITH_ENV says production", () => {
    const report = validateProductionConfiguration({
      ...productionEnvironment(),
      DATABASE_URL:
        "postgresql://staging_user@127.0.0.1:6543/staging_accounting",
      ACCOUNTING_PRODUCTION_DATABASE_HOST: "127.0.0.1",
      ACCOUNTING_PRODUCTION_DATABASE_NAME: "staging_accounting",
      ACCOUNTING_PRODUCTION_DATABASE_USER: "staging_user",
      ACCOUNTING_PRODUCTION_DATABASE_MARKER: "staging-identity-evidence",
      ACCOUNTING_ORGANIZATION_ID: "synthetic-org",
      ACCOUNTING_LEGAL_ENTITY_IDS: "dev-entity",
    });
    expect(report.ready).toBe(false);
    expect(report.issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "LOOPBACK_DATABASE_IDENTITY_FORBIDDEN",
        "NON_PRODUCTION_IDENTITY_FORBIDDEN",
        "PRODUCTION_DATABASE_MARKER_AMBIGUOUS",
      ]),
    );
  });

  it("keeps production execution disabled even with a complete synthetic authorization shape", () => {
    const report = validateProductionConfiguration(
      productionEnvironment("MIGRATION_EXECUTION"),
      "MIGRATION_EXECUTION",
    );
    expect(report.ready).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: "PHASE7_PRODUCTION_EXECUTION_DISABLED" }),
    );
  });
});

describe("Accounting Phase 7 manifest, readiness, backup, and cutover", () => {
  it("independently recomputes manifest evidence and detects tampering", async () => {
    expect(parseAccountingRolloutManifest(manifest).manifestVersion).toBe(
      "accounting-rollout-manifest/v1",
    );
    const fixture =
      createDeterministicAccountingRehearsalFixture("small-functional");
    const dryRun = await runGuardedAccountingRehearsal({
      guard,
      profileId: "small-functional",
    });
    const executionState = idempotentExecutor();
    const execution = await runGuardedAccountingRehearsal({
      guard,
      profileId: "small-functional",
      mode: "SYNTHETIC_EXECUTE",
      executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
      executor: executionState.executor,
    });
    const hash = (value: string) =>
      createHash("sha256").update(value).digest("hex");
    const attachmentInventory = accountingRehearsalAttachmentInventory(
      fixture.contract,
    );
    const sourceRecordCounts = Object.fromEntries(
      [...new Set(
        fixture.contract.records.map((record) => record.sourceRecordType),
      )]
        .sort()
        .map((recordType) => [
          recordType,
          fixture.contract.records.filter(
            (record) => record.sourceRecordType === recordType,
          ).length,
        ]),
    );
    const verificationInput = {
      manifest,
      expectedSourceContractVersion: fixture.contract.schemaVersion,
      expectedMappingVersion: "synthetic-mapping/v1",
      expectedSourceRecordCounts: sourceRecordCounts,
      expectedSourceChecksums: [
        {
          artifactId: "phase7-small-functional-contract",
          sha256: fixture.fixtureHash,
        },
      ],
      expectedOrganizationId: "stg_org_monolith_accounting",
      expectedLegalEntityIds: ["stg_accounting_legal_entity"],
      expectedExtractionTimestamp: fixture.contract.extractedAt,
      expectedDependencyGraphHash: accountingRehearsalDependencyGraphHash(
        fixture.contract,
      ),
      expectedAttachmentInventory: {
        ...attachmentInventory,
        verificationStatus: "NOT_APPLICABLE" as const,
      },
      expectedPolicyDecisionVersion: policyRegister.version,
      expectedPolicyDecisionHash: hash(canonicalPayload(policyRegister)),
      expectedDryRunManifestHash: migrationManifestHash(fixture.contract),
      expectedDryRunOutcomeHash: hash(
        canonicalPayload(dryRun.result.outcomes),
      ),
      expectedReconciliationEvidenceHash: hash(
        canonicalPayload(execution.result.reconciliation),
      ),
      expectedReconciliationExceptionCount: execution.result.issues.length,
      expectedExecutionToolVersion: "accounting-phase7-rehearsal/v1",
      expectedTargetApplicationVersion:
        "498eb8364858da2c45e2b4c86d09098ae05f2443",
    };
    expect(verifyAccountingRolloutManifest(verificationInput).valid).toBe(true);

    const tampered = verifyAccountingRolloutManifest({
      ...verificationInput,
      manifest: {
        ...manifest,
        dependencyGraphHash: "0".repeat(64),
      },
    });
    expect(tampered.valid).toBe(false);
    expect(tampered.mismatches).toContain("DEPENDENCY_GRAPH_HASH_MISMATCH");
  });

  it("returns deterministic no-go when critical gates are unresolved", () => {
    const gates: AccountingRolloutGate[] = ACCOUNTING_ROLLOUT_GATE_CODES.map(
      (code) => ({
        code,
        critical: true,
        classification:
          code === "POLICY_APPROVAL" ? "blocked by policy" : "ready",
        evidenceReferences: ["SYNTHETIC-EVIDENCE-1"],
        safeDetail: code,
      }),
    );
    const result = assessAccountingRolloutReadiness(gates);
    expect(result.decision).toBe("NO_GO");
    expect(result.primaryClassification).toBe("blocked by policy");
  });

  it("rejects a gate that claims readiness without evidence", () => {
    const gates: AccountingRolloutGate[] = ACCOUNTING_ROLLOUT_GATE_CODES.map(
      (code) => ({
        code,
        critical: true,
        classification: "ready",
        evidenceReferences: code === "SECURITY" ? [] : ["SYNTHETIC-EVIDENCE-1"],
        safeDetail: code,
      }),
    );
    expect(() => assessAccountingRolloutReadiness(gates)).toThrow(
      "ROLLOUT_GATE_EVIDENCE_REQUIRED_OR_INVALID:SECURITY",
    );
  });

  it("reports backup readiness blocked when no accepted mechanism exists", () => {
    const result = evaluateAccountingBackupReadiness({
      ownerRole: null,
      scopeReference: null,
      createdAt: null,
      maximumAgeMinutes: null,
      encrypted: false,
      restoreAccessAuthorizationReference: null,
      verificationEvidenceReference: null,
      retentionPolicyReference: null,
      recoveryPointObjectiveMinutes: null,
      recoveryTimeObjectiveMinutes: null,
      restoreRehearsalEvidenceReference: null,
      databaseAttachmentConsistencyVerified: false,
      rollbackDecisionAuthorityRole: null,
    });
    expect(result.ready).toBe(false);
    expect(result.classification).toBe("blocked by infrastructure");
  });

  it("permits evidence-backed rehearsal transitions but blocks Phase 7 production authorization", () => {
    const evidence: AccountingCutoverTransitionEvidence = {
      evidenceReferences: ["REHEARSAL-EVIDENCE-1"],
      authorizationReferences: ["TECH-APPROVAL-1"],
      auditRecordReference: "AUDIT-1",
      actorRole: "Migration operator",
      occurredAt: "2026-07-30T00:00:00.000Z",
    };
    expect(
      transitionAccountingCutoverState({
        current: "ReadyForRehearsal",
        next: "RehearsalRunning",
        phase: "PHASE7_PREPARATION",
        evidence,
      }).state,
    ).toBe("RehearsalRunning");
    expect(() =>
      transitionAccountingCutoverState({
        current: "ReadyForProductionAuthorization",
        next: "ProductionAuthorized",
        phase: "PHASE7_PREPARATION",
        evidence,
      }),
    ).toThrow("CUTOVER_PHASE7_STATE_FORBIDDEN");
  });
});

describe("Accounting Phase 7 guarded synthetic rehearsal", () => {
  it("defines bounded profiles and every required rehearsal scenario", () => {
    expect(ACCOUNTING_REHEARSAL_PROFILES).toHaveLength(3);
    expect(
      ACCOUNTING_REHEARSAL_PROFILES.every(
        (profile) =>
          Object.values(profile.recordCounts).reduce(
            (total, count) => total + count,
            0,
          ) <= 10_000 &&
          profile.concurrencyCeiling <= 8,
      ),
    ).toBe(true);
    expect(ACCOUNTING_REHEARSAL_SCENARIOS).toHaveLength(21);
  });

  it("generates the same bounded fixture deterministically", () => {
    const first = createDeterministicAccountingRehearsalFixture(
      "small-functional",
    );
    const second = createDeterministicAccountingRehearsalFixture(
      "small-functional",
    );
    expect(first.fixtureHash).toBe(second.fixtureHash);
    expect(first.contract.records).toHaveLength(28);
    expect(
      first.contract.records
        .filter((record) =>
          ["ALLOCATION", "CREDIT_NOTE", "DEBIT_NOTE"].includes(
            record.sourceRecordType,
          ),
        )
        .every((record) => record.dependencies.length > 0),
    ).toBe(true);
  });

  it("dry-runs with zero executor calls and zero database queries", async () => {
    const executor = idempotentExecutor();
    const result = await runGuardedAccountingRehearsal({
      guard,
      profileId: "small-functional",
      executor: executor.executor,
    });
    expect(result.result.status).toBe("DRY_RUN_READY");
    expect(result.databaseQueries).toBe(0);
    expect(executor.executor.execute).not.toHaveBeenCalled();
  });

  it("executes in memory, resumes an interruption, and replays idempotently", async () => {
    const state = idempotentExecutor({ failOnceAt: 2 });
    const interrupted = await runGuardedAccountingRehearsal({
      guard,
      profileId: "small-functional",
      mode: "SYNTHETIC_EXECUTE",
      executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
      executor: state.executor,
    });
    expect(["FAILED", "BLOCKED"]).toContain(interrupted.result.status);

    const resumed = await runGuardedAccountingRehearsal({
      guard,
      profileId: "small-functional",
      mode: "SYNTHETIC_EXECUTE",
      executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
      executor: state.executor,
      previousOutcomes: interrupted.result.outcomes,
    });
    expect(resumed.result.status).toBe("COMPLETED");
    expect(state.targets.size).toBe(28);

    const replay = await runGuardedAccountingRehearsal({
      guard,
      profileId: "small-functional",
      mode: "SYNTHETIC_EXECUTE",
      executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
      executor: state.executor,
      previousOutcomes: resumed.result.outcomes,
    });
    expect(replay.result.status).toBe("COMPLETED");
    expect(
      replay.result.outcomes.every((outcome) =>
        ["SUCCEEDED", "SKIPPED"].includes(outcome.status),
      ),
    ).toBe(true);
    expect(state.targets.size).toBe(28);
  });

  it("fails closed on reconciliation mismatch", async () => {
    const state = idempotentExecutor({ mismatch: true });
    const result = await runGuardedAccountingRehearsal({
      guard,
      profileId: "small-functional",
      mode: "SYNTHETIC_EXECUTE",
      executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
      executor: state.executor,
    });
    expect(result.result.status).toBe("BLOCKED");
    expect(result.result.reconciliation.totalsMatch).toBe(false);
  });

  it("rejects missing authorization guard and maker-checker self-approval", async () => {
    const state = idempotentExecutor();
    await expect(
      runGuardedAccountingRehearsal({
        guard,
        profileId: "small-functional",
        mode: "SYNTHETIC_EXECUTE",
        executor: state.executor,
      }),
    ).rejects.toThrow("PHASE7_REHEARSAL_EXECUTION_GUARD_REQUIRED");
    await expect(
      runGuardedAccountingRehearsal({
        guard: { ...guard, checkerId: guard.operatorId },
        profileId: "small-functional",
      }),
    ).rejects.toThrow("PHASE7_REHEARSAL_MAKER_CHECKER_REQUIRED");
  });
});

describe("Accounting Phase 7 operational controls", () => {
  it("defines safe monitors, disconnected alerts, acceptance roles, and authorization-labelled deployment steps", () => {
    expect(ACCOUNTING_OPERATIONAL_MONITORS).toHaveLength(14);
    expect(ACCOUNTING_ALERT_DEFINITIONS).toHaveLength(12);
    expect(validateOperationalControlCatalogue()).toEqual(
      expect.objectContaining({
        acceptanceRoles: 9,
        deploymentSteps: 17,
        liveRoutesConnected: false,
      }),
    );
  });
});
