import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ACCOUNTING_ROLLOUT_GATE_CODES,
  assessAccountingRolloutReadiness,
  type AccountingRolloutGate,
} from "../src/modules/accounting/rollout/go-no-go";
import {
  parseAccountingPolicyDecisionRegister,
  summarizeAccountingPolicyDecisions,
} from "../src/modules/accounting/rollout/policy-register";
import { evaluateAccountingBackupReadiness } from "../src/modules/accounting/rollout/backup-readiness";
import { verifyAccountingRolloutManifest } from "../src/modules/accounting/rollout/migration-manifest";
import { migrationManifestHash } from "../src/modules/accounting/migration/source-contract";
import type { NormalizedMigrationRecord } from "../src/modules/accounting/migration/types";
import { canonicalPayload } from "../src/modules/accounting/request-integrity";
import {
  accountingRehearsalAttachmentInventory,
  accountingRehearsalDependencyGraphHash,
  createDeterministicAccountingRehearsalFixture,
  PHASE7_IN_MEMORY_EXECUTION_PROOF,
  PHASE7_REHEARSAL_MARKER,
  runGuardedAccountingRehearsal,
  type AccountingRehearsalGuard,
} from "../src/modules/accounting/rollout/rehearsal";

const root = process.cwd();
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const policyRegisterRaw = readFileSync(
  resolve(
    root,
    "docs/accounting/contracts/accounting-phase7-policy-register.v1.json",
  ),
  "utf8",
);
const policyRegister = parseAccountingPolicyDecisionRegister(
  JSON.parse(policyRegisterRaw),
);
const policy = summarizeAccountingPolicyDecisions(policyRegister);
const manifest = JSON.parse(
  readFileSync(
    resolve(
      root,
      "docs/accounting/contracts/accounting-phase7-manifest.synthetic.v1.json",
    ),
    "utf8",
  ),
);
const backup = evaluateAccountingBackupReadiness({
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

const guard: AccountingRehearsalGuard = {
  environmentMarker: PHASE7_REHEARSAL_MARKER,
  target: "synthetic-staging",
  storageTarget: "EPHEMERAL_IN_MEMORY",
  databaseAccess: "NONE",
  databasePort: null,
  providerMode: "disabled",
  outboundDeliveryMode: "disabled",
  datasetClassification: "SYNTHETIC",
  operatorId: "synthetic-readiness-operator",
  checkerId: "synthetic-readiness-checker",
  productionAuthorizationPresent: false,
};

async function main() {
const fixture = createDeterministicAccountingRehearsalFixture("small-functional");
const dryRun = await runGuardedAccountingRehearsal({
  guard,
  profileId: "small-functional",
});
const controlledExecution = await runGuardedAccountingRehearsal({
  guard,
  profileId: "small-functional",
  mode: "SYNTHETIC_EXECUTE",
  executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
  executor: {
    async execute(record: NormalizedMigrationRecord) {
      return {
        canonicalTargetIdentifier: `synthetic-${record.deterministicKey}`,
        currencyCode: String(record.payload.currencyCode),
        ...(record.payload.totals as Record<string, string>),
        outboxItemsCreated: 0,
      };
    },
  },
});
const sourceRecordCounts = Object.fromEntries(
  [...new Set(fixture.contract.records.map((record) => record.sourceRecordType))]
    .sort()
    .map((recordType) => [
      recordType,
      fixture.contract.records.filter(
        (record) => record.sourceRecordType === recordType,
      ).length,
    ]),
);
const attachmentInventory =
  accountingRehearsalAttachmentInventory(fixture.contract);
const computedSyntheticEvidence = {
  sourceRecordCounts,
  sourceChecksum: fixture.fixtureHash,
  dependencyGraphHash: accountingRehearsalDependencyGraphHash(
    fixture.contract,
  ),
  attachmentInventory: {
    ...attachmentInventory,
    verificationStatus: "NOT_APPLICABLE" as const,
  },
  policyDecisionHash: sha256(canonicalPayload(policyRegister)),
  dryRunManifestHash: migrationManifestHash(fixture.contract),
  dryRunOutcomeHash: sha256(canonicalPayload(dryRun.result.outcomes)),
  reconciliationEvidenceHash: sha256(
    canonicalPayload(controlledExecution.result.reconciliation),
  ),
  reconciliationExceptionCount: controlledExecution.result.issues.length,
};
const manifestResult = verifyAccountingRolloutManifest({
  manifest,
  expectedSourceContractVersion: fixture.contract.schemaVersion,
  expectedMappingVersion: "synthetic-mapping/v1",
  expectedSourceRecordCounts: sourceRecordCounts,
  expectedSourceChecksums: [
    {
      artifactId: "phase7-small-functional-contract",
      sha256: computedSyntheticEvidence.sourceChecksum,
    },
  ],
  expectedOrganizationId: "stg_org_monolith_accounting",
  expectedLegalEntityIds: ["stg_accounting_legal_entity"],
  expectedExtractionTimestamp: fixture.contract.extractedAt,
  expectedDependencyGraphHash: computedSyntheticEvidence.dependencyGraphHash,
  expectedAttachmentInventory: computedSyntheticEvidence.attachmentInventory,
  expectedPolicyDecisionVersion: policyRegister.version,
  expectedPolicyDecisionHash: computedSyntheticEvidence.policyDecisionHash,
  expectedDryRunManifestHash: computedSyntheticEvidence.dryRunManifestHash,
  expectedDryRunOutcomeHash: computedSyntheticEvidence.dryRunOutcomeHash,
  expectedReconciliationEvidenceHash:
    computedSyntheticEvidence.reconciliationEvidenceHash,
  expectedReconciliationExceptionCount:
    computedSyntheticEvidence.reconciliationExceptionCount,
  expectedExecutionToolVersion: "accounting-phase7-rehearsal/v1",
  expectedTargetApplicationVersion:
    "498eb8364858da2c45e2b4c86d09098ae05f2443",
});

const statusByCode: Record<
  (typeof ACCOUNTING_ROLLOUT_GATE_CODES)[number],
  AccountingRolloutGate["classification"]
> = {
  ACCEPTED_CHECKPOINT: "ready",
  CLEAN_REPOSITORY: "incomplete",
  POLICY_APPROVAL: policy.ready ? "ready" : "blocked by policy",
  CONFIGURATION_VALIDATION: "blocked by configuration",
  BACKUP_VERIFICATION: backup.classification,
  MIGRATION_MANIFEST: "blocked by data",
  DRY_RUN: "ready",
  REHEARSAL: "ready",
  RECONCILIATION: "ready",
  SECURITY: "ready",
  PERFORMANCE: "ready",
  OPERATIONAL_STAFFING: "incomplete",
  MONITORING: "ready",
  BUSINESS_ACCEPTANCE: "incomplete",
  ROLLBACK_DECISION_AUTHORITY: "blocked by policy",
};
const gates: AccountingRolloutGate[] = ACCOUNTING_ROLLOUT_GATE_CODES.map(
  (code) => ({
    code,
    critical: true,
    classification: statusByCode[code],
    evidenceReferences: [
      code === "ACCEPTED_CHECKPOINT"
        ? "498eb8364858da2c45e2b4c86d09098ae05f2443"
        : `PHASE7-${code}`,
    ],
    safeDetail: code,
  }),
);
const assessment = assessAccountingRolloutReadiness(gates);
process.stdout.write(
  `${JSON.stringify(
    {
      ...assessment,
      policy: {
        version: policyRegister.version,
        blockingDecisionIds: policy.blockingDecisionIds,
      },
      backup: {
        ready: backup.ready,
        failedCheckCodes: backup.failedCheckCodes,
      },
      manifest: manifestResult,
      syntheticManifestIntegrityValid: manifestResult.valid,
      syntheticManifestCannotSatisfyProductionDataReadiness: true,
      computedSyntheticEvidence,
      productionAuthorizationGranted: false,
      productionExecutionAvailable: false,
    },
    null,
    2,
  )}\n`,
);
}

void main();
