import { createHash } from "node:crypto";

import { canonicalPayload } from "../request-integrity";

export const ACCOUNTING_ROLLOUT_MANIFEST_VERSION =
  "accounting-rollout-manifest/v1" as const;

export type AccountingRolloutManifest = {
  manifestVersion: typeof ACCOUNTING_ROLLOUT_MANIFEST_VERSION;
  sourceContractVersion: string;
  mappingVersion: string;
  sourceRecordCounts: Record<string, number>;
  sourceChecksums: Array<{
    artifactId: string;
    sha256: string;
  }>;
  extractionTimestamp: string;
  organizationId: string;
  legalEntityIds: string[];
  dependencyGraphHash: string;
  attachmentInventory: {
    count: number;
    totalBytes: number;
    inventoryHash: string;
    verificationStatus: "VERIFIED" | "NOT_APPLICABLE";
  };
  policyDecisionVersion: string;
  policyDecisionHash: string;
  dryRun: {
    status: "PASSED";
    manifestHash: string;
    outcomeHash: string;
  };
  reconciliation: {
    status: "PASSED";
    evidenceHash: string;
    exceptionCount: number;
  };
  executionToolVersion: string;
  targetApplicationVersion: string;
};

const STABLE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function stable(value: unknown, code: string): string {
  if (typeof value !== "string") throw new Error(code);
  const normalized = value.trim();
  if (!STABLE_IDENTIFIER.test(normalized)) throw new Error(code);
  return normalized;
}

function hash(value: unknown, code: string): string {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new Error(code);
  }
  return value;
}

function nonNegativeInteger(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(code);
  }
  return Number(value);
}

export function parseAccountingRolloutManifest(
  value: unknown,
): AccountingRolloutManifest {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("ROLLOUT_MANIFEST_INVALID");
  }
  const manifest = value as Record<string, unknown>;
  if (manifest.manifestVersion !== ACCOUNTING_ROLLOUT_MANIFEST_VERSION) {
    throw new Error("ROLLOUT_MANIFEST_VERSION_UNSUPPORTED");
  }
  if (
    !manifest.sourceRecordCounts ||
    Array.isArray(manifest.sourceRecordCounts) ||
    typeof manifest.sourceRecordCounts !== "object"
  ) {
    throw new Error("ROLLOUT_MANIFEST_RECORD_COUNTS_INVALID");
  }
  const sourceRecordCountEntries: Array<[string, number]> = Object.entries(
    manifest.sourceRecordCounts as Record<string, unknown>,
  )
      .map(([recordType, count]): [string, number] => [
        stable(recordType, "ROLLOUT_MANIFEST_RECORD_TYPE_INVALID"),
        nonNegativeInteger(count, "ROLLOUT_MANIFEST_RECORD_COUNT_INVALID"),
      ])
      .sort(([left], [right]) => left.localeCompare(right));
  const sourceRecordCounts: Record<string, number> = Object.fromEntries(
    sourceRecordCountEntries,
  );
  if (
    Object.keys(sourceRecordCounts).length === 0 ||
    Object.values(sourceRecordCounts).reduce((sum, count) => sum + count, 0) ===
      0
  ) {
    throw new Error("ROLLOUT_MANIFEST_RECORD_COUNTS_EMPTY");
  }
  if (!Array.isArray(manifest.sourceChecksums) || manifest.sourceChecksums.length === 0) {
    throw new Error("ROLLOUT_MANIFEST_SOURCE_CHECKSUMS_INVALID");
  }
  const sourceChecksums = manifest.sourceChecksums.map((candidate) => {
    if (!candidate || Array.isArray(candidate) || typeof candidate !== "object") {
      throw new Error("ROLLOUT_MANIFEST_SOURCE_CHECKSUM_INVALID");
    }
    const checksum = candidate as Record<string, unknown>;
    return {
      artifactId: stable(
        checksum.artifactId,
        "ROLLOUT_MANIFEST_SOURCE_ARTIFACT_INVALID",
      ),
      sha256: hash(
        checksum.sha256,
        "ROLLOUT_MANIFEST_SOURCE_CHECKSUM_INVALID",
      ),
    };
  });
  if (
    new Set(sourceChecksums.map((entry) => entry.artifactId)).size !==
    sourceChecksums.length
  ) {
    throw new Error("ROLLOUT_MANIFEST_SOURCE_ARTIFACT_DUPLICATE");
  }
  if (
    !Array.isArray(manifest.legalEntityIds) ||
    manifest.legalEntityIds.length === 0
  ) {
    throw new Error("ROLLOUT_MANIFEST_LEGAL_ENTITY_SCOPE_INVALID");
  }
  const legalEntityIds = manifest.legalEntityIds.map((entry) =>
    stable(entry, "ROLLOUT_MANIFEST_LEGAL_ENTITY_SCOPE_INVALID"),
  );
  if (new Set(legalEntityIds).size !== legalEntityIds.length) {
    throw new Error("ROLLOUT_MANIFEST_LEGAL_ENTITY_SCOPE_DUPLICATE");
  }
  const extractionTimestamp =
    typeof manifest.extractionTimestamp === "string"
      ? manifest.extractionTimestamp
      : "";
  if (!extractionTimestamp || Number.isNaN(Date.parse(extractionTimestamp))) {
    throw new Error("ROLLOUT_MANIFEST_EXTRACTION_TIMESTAMP_INVALID");
  }

  const attachments = manifest.attachmentInventory as
    | Record<string, unknown>
    | undefined;
  if (!attachments || Array.isArray(attachments)) {
    throw new Error("ROLLOUT_MANIFEST_ATTACHMENT_INVENTORY_INVALID");
  }
  const attachmentCount = nonNegativeInteger(
    attachments.count,
    "ROLLOUT_MANIFEST_ATTACHMENT_COUNT_INVALID",
  );
  const attachmentBytes = nonNegativeInteger(
    attachments.totalBytes,
    "ROLLOUT_MANIFEST_ATTACHMENT_BYTES_INVALID",
  );
  if (
    !["VERIFIED", "NOT_APPLICABLE"].includes(
      String(attachments.verificationStatus),
    ) ||
    (attachments.verificationStatus === "NOT_APPLICABLE" &&
      (attachmentCount !== 0 || attachmentBytes !== 0))
  ) {
    throw new Error("ROLLOUT_MANIFEST_ATTACHMENT_STATUS_INVALID");
  }

  const dryRun = manifest.dryRun as Record<string, unknown> | undefined;
  if (!dryRun || Array.isArray(dryRun) || dryRun.status !== "PASSED") {
    throw new Error("ROLLOUT_MANIFEST_DRY_RUN_NOT_PASSED");
  }
  const reconciliation = manifest.reconciliation as
    | Record<string, unknown>
    | undefined;
  if (
    !reconciliation ||
    Array.isArray(reconciliation) ||
    reconciliation.status !== "PASSED"
  ) {
    throw new Error("ROLLOUT_MANIFEST_RECONCILIATION_NOT_PASSED");
  }

  return {
    manifestVersion: ACCOUNTING_ROLLOUT_MANIFEST_VERSION,
    sourceContractVersion: stable(
      manifest.sourceContractVersion,
      "ROLLOUT_MANIFEST_SOURCE_CONTRACT_INVALID",
    ),
    mappingVersion: stable(
      manifest.mappingVersion,
      "ROLLOUT_MANIFEST_MAPPING_VERSION_INVALID",
    ),
    sourceRecordCounts,
    sourceChecksums,
    extractionTimestamp,
    organizationId: stable(
      manifest.organizationId,
      "ROLLOUT_MANIFEST_ORGANIZATION_SCOPE_INVALID",
    ),
    legalEntityIds,
    dependencyGraphHash: hash(
      manifest.dependencyGraphHash,
      "ROLLOUT_MANIFEST_DEPENDENCY_HASH_INVALID",
    ),
    attachmentInventory: {
      count: attachmentCount,
      totalBytes: attachmentBytes,
      inventoryHash: hash(
        attachments.inventoryHash,
        "ROLLOUT_MANIFEST_ATTACHMENT_HASH_INVALID",
      ),
      verificationStatus: attachments.verificationStatus as
        | "VERIFIED"
        | "NOT_APPLICABLE",
    },
    policyDecisionVersion: stable(
      manifest.policyDecisionVersion,
      "ROLLOUT_MANIFEST_POLICY_VERSION_INVALID",
    ),
    policyDecisionHash: hash(
      manifest.policyDecisionHash,
      "ROLLOUT_MANIFEST_POLICY_HASH_INVALID",
    ),
    dryRun: {
      status: "PASSED",
      manifestHash: hash(
        dryRun.manifestHash,
        "ROLLOUT_MANIFEST_DRY_RUN_MANIFEST_HASH_INVALID",
      ),
      outcomeHash: hash(
        dryRun.outcomeHash,
        "ROLLOUT_MANIFEST_DRY_RUN_OUTCOME_HASH_INVALID",
      ),
    },
    reconciliation: {
      status: "PASSED",
      evidenceHash: hash(
        reconciliation.evidenceHash,
        "ROLLOUT_MANIFEST_RECONCILIATION_HASH_INVALID",
      ),
      exceptionCount: nonNegativeInteger(
        reconciliation.exceptionCount,
        "ROLLOUT_MANIFEST_EXCEPTION_COUNT_INVALID",
      ),
    },
    executionToolVersion: stable(
      manifest.executionToolVersion,
      "ROLLOUT_MANIFEST_TOOL_VERSION_INVALID",
    ),
    targetApplicationVersion: stable(
      manifest.targetApplicationVersion,
      "ROLLOUT_MANIFEST_APPLICATION_VERSION_INVALID",
    ),
  };
}

export function accountingRolloutManifestHash(
  manifest: AccountingRolloutManifest,
) {
  return createHash("sha256")
    .update(canonicalPayload(manifest))
    .digest("hex");
}

export function verifyAccountingRolloutManifest(input: {
  manifest: unknown;
  expectedSourceContractVersion: string;
  expectedMappingVersion: string;
  expectedSourceRecordCounts: Readonly<Record<string, number>>;
  expectedSourceChecksums: ReadonlyArray<{
    artifactId: string;
    sha256: string;
  }>;
  expectedOrganizationId: string;
  expectedLegalEntityIds: readonly string[];
  expectedExtractionTimestamp: string;
  expectedDependencyGraphHash: string;
  expectedAttachmentInventory: {
    count: number;
    totalBytes: number;
    inventoryHash: string;
    verificationStatus: "VERIFIED" | "NOT_APPLICABLE";
  };
  expectedPolicyDecisionVersion: string;
  expectedPolicyDecisionHash: string;
  expectedDryRunManifestHash: string;
  expectedDryRunOutcomeHash: string;
  expectedReconciliationEvidenceHash: string;
  expectedReconciliationExceptionCount: number;
  expectedExecutionToolVersion: string;
  expectedTargetApplicationVersion: string;
}) {
  const manifest = parseAccountingRolloutManifest(input.manifest);
  const mismatches: string[] = [];
  if (manifest.sourceContractVersion !== input.expectedSourceContractVersion) {
    mismatches.push("SOURCE_CONTRACT_VERSION_MISMATCH");
  }
  if (manifest.mappingVersion !== input.expectedMappingVersion) {
    mismatches.push("MAPPING_VERSION_MISMATCH");
  }
  if (
    canonicalPayload(manifest.sourceRecordCounts) !==
    canonicalPayload(input.expectedSourceRecordCounts)
  ) {
    mismatches.push("SOURCE_RECORD_COUNTS_MISMATCH");
  }
  const sourceChecksums = [...manifest.sourceChecksums].sort((left, right) =>
    left.artifactId.localeCompare(right.artifactId),
  );
  const expectedSourceChecksums = [...input.expectedSourceChecksums].sort(
    (left, right) => left.artifactId.localeCompare(right.artifactId),
  );
  if (
    canonicalPayload(sourceChecksums) !==
    canonicalPayload(expectedSourceChecksums)
  ) {
    mismatches.push("SOURCE_CHECKSUM_MISMATCH");
  }
  if (manifest.organizationId !== input.expectedOrganizationId) {
    mismatches.push("ORGANIZATION_SCOPE_MISMATCH");
  }
  if (manifest.extractionTimestamp !== input.expectedExtractionTimestamp) {
    mismatches.push("EXTRACTION_TIMESTAMP_MISMATCH");
  }
  if (
    [...manifest.legalEntityIds].sort().join("\u001f") !==
    [...input.expectedLegalEntityIds].sort().join("\u001f")
  ) {
    mismatches.push("LEGAL_ENTITY_SCOPE_MISMATCH");
  }
  if (manifest.dependencyGraphHash !== input.expectedDependencyGraphHash) {
    mismatches.push("DEPENDENCY_GRAPH_HASH_MISMATCH");
  }
  if (
    canonicalPayload(manifest.attachmentInventory) !==
    canonicalPayload(input.expectedAttachmentInventory)
  ) {
    mismatches.push("ATTACHMENT_INVENTORY_HASH_MISMATCH");
  }
  if (manifest.policyDecisionVersion !== input.expectedPolicyDecisionVersion) {
    mismatches.push("POLICY_VERSION_MISMATCH");
  }
  if (manifest.policyDecisionHash !== input.expectedPolicyDecisionHash) {
    mismatches.push("POLICY_HASH_MISMATCH");
  }
  if (manifest.dryRun.manifestHash !== input.expectedDryRunManifestHash) {
    mismatches.push("DRY_RUN_MANIFEST_HASH_MISMATCH");
  }
  if (manifest.dryRun.outcomeHash !== input.expectedDryRunOutcomeHash) {
    mismatches.push("DRY_RUN_OUTCOME_HASH_MISMATCH");
  }
  if (
    manifest.reconciliation.evidenceHash !==
    input.expectedReconciliationEvidenceHash
  ) {
    mismatches.push("RECONCILIATION_EVIDENCE_HASH_MISMATCH");
  }
  if (
    manifest.reconciliation.exceptionCount !==
    input.expectedReconciliationExceptionCount
  ) {
    mismatches.push("RECONCILIATION_EXCEPTION_COUNT_MISMATCH");
  }
  if (manifest.executionToolVersion !== input.expectedExecutionToolVersion) {
    mismatches.push("EXECUTION_TOOL_VERSION_MISMATCH");
  }
  if (manifest.targetApplicationVersion !== input.expectedTargetApplicationVersion) {
    mismatches.push("TARGET_APPLICATION_VERSION_MISMATCH");
  }
  return {
    valid: mismatches.length === 0,
    mismatches,
    manifestHash: accountingRolloutManifestHash(manifest),
    sourceRecordCount: Object.values(manifest.sourceRecordCounts).reduce(
      (sum, count) => sum + count,
      0,
    ),
  };
}
