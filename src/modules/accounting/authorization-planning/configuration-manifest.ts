import { compare } from "../money";
import { addDecimalStrings } from "../operational-helpers";
import {
  assertMakerChecker,
  assertNoInlineSecret,
  assertPositiveRowVersion,
  assertProductionIdentity,
  assertProductionIdentifier,
  assertProductionScope,
  assertSecureExternalReference,
  requireMaterialSha256,
  requireStableId,
  requireTimestamp,
  sha256,
} from "./shared";
import type {
  ExactCurrencyTotals,
  ManifestVerificationExpectation,
  ProductionConfigurationDeclaration,
  ProductionIdentity,
  ProductionScope,
  RealSourceManifest,
} from "./types";

const INJECTION =
  /(?:^[\s]*[=+\-@]|(?:^|[\\/])\.\.(?:[\\/]|$)|\b(?:select|insert|update|delete|drop|alter|create|execute|exec)\s+(?:from|into|table|database|schema|function|procedure|grant|revoke|[\w"'`])|rO0AB|gASV|O:\d+:"|__reduce__|child_process)/i;

function allDeclarationReferences(
  declaration: ProductionConfigurationDeclaration,
): string[] {
  return [
    declaration.productionDatabaseIdentityReference,
    declaration.allowedHostPolicyReference,
    ...declaration.canonicalServiceEndpointReferences,
    ...declaration.providerDeclarations.flatMap((provider) => [
      provider.configurationReference,
    ]),
    declaration.schedulerOwnershipReference,
    declaration.attachmentStorageReference,
    declaration.encryptionKeyManagementReference,
    declaration.observabilityDestinationReference,
    declaration.alertOwnershipReference,
    declaration.retentionConfigurationReference,
    declaration.authenticationAuthorizationIssuerReference,
    declaration.deploymentIdentityReference,
    declaration.featureFlagDeclarationReference,
    declaration.killSwitchReference,
    ...declaration.sensitiveValueReferences,
  ];
}

export function validateProductionConfigurationDeclaration(input: {
  declaration: ProductionConfigurationDeclaration;
  scope: ProductionScope;
  acceptedEvidenceIds: ReadonlySet<string>;
  identities: ReadonlyMap<string, ProductionIdentity>;
  now: Date;
}) {
  const issues: string[] = [];
  const attempt = (fn: () => void) => {
    try {
      fn();
    } catch (error) {
      issues.push(error instanceof Error ? error.message : "CONFIGURATION_INVALID");
    }
  };
  attempt(() =>
    assertProductionScope(
      input.declaration,
      input.scope,
      "CONFIGURATION_SCOPE_MISMATCH",
    ),
  );
  attempt(() =>
    assertProductionIdentifier(input.declaration.organizationId),
  );
  attempt(() =>
    assertProductionIdentifier(input.declaration.legalEntityId),
  );
  attempt(() =>
    requireStableId(
      input.declaration.declarationId,
      "CONFIGURATION_DECLARATION_ID_INVALID",
    ),
  );
  if (
    !Number.isSafeInteger(input.declaration.version) ||
    input.declaration.version < 1
  ) {
    issues.push("CONFIGURATION_VERSION_INVALID");
  }
  attempt(() => assertPositiveRowVersion(input.declaration.rowVersion));
  attempt(() =>
    requireMaterialSha256(
      input.declaration.releaseArtifactDigest,
      "CONFIGURATION_RELEASE_DIGEST_INVALID",
    ),
  );
  if (
    input.declaration.expectedEnvironmentClassification !== "PRODUCTION" ||
    input.declaration.databaseHostClassification !== "APPROVED_NON_LOOPBACK"
  ) {
    issues.push("CONFIGURATION_NON_PRODUCTION_OR_LOOPBACK_FORBIDDEN");
  }
  if (
    !Number.isSafeInteger(input.declaration.databasePort) ||
    input.declaration.databasePort < 1 ||
    input.declaration.databasePort > 65_535 ||
    input.declaration.databasePort === 5_432
  ) {
    issues.push("CONFIGURATION_PORT_5432_OR_INVALID_FORBIDDEN");
  }
  if (
    input.declaration.executionMode !== "PLANNING_ONLY" ||
    input.declaration.schedulerMode !== "DISABLED" ||
    input.declaration.outboundDeliveryMode !== "DISABLED" ||
    input.declaration.providerDeclarations.length === 0 ||
    input.declaration.providerDeclarations.some(
      (provider) => provider.activationState !== "DISABLED",
    )
  ) {
    issues.push("CONFIGURATION_EXECUTION_OR_PROVIDER_MUST_REMAIN_DISABLED");
  }
  const providerNames = new Set<string>();
  for (const provider of input.declaration.providerDeclarations) {
    attempt(() =>
      assertProductionIdentifier(
        provider.providerName,
        "CONFIGURATION_PROVIDER_NAME_INVALID",
      ),
    );
    if (providerNames.has(provider.providerName)) {
      issues.push("CONFIGURATION_PROVIDER_DUPLICATE");
    }
    providerNames.add(provider.providerName);
  }
  if (typeof input.declaration.productionEnablementFlag === "boolean") {
    issues.push("SINGLE_PRODUCTION_ENABLEMENT_FLAG_FORBIDDEN");
  }
  for (const reference of allDeclarationReferences(input.declaration)) {
    attempt(() => assertSecureExternalReference(reference));
    attempt(() => assertNoInlineSecret(reference));
  }
  if (input.declaration.canonicalServiceEndpointReferences.length === 0) {
    issues.push("CONFIGURATION_CANONICAL_ENDPOINT_REFERENCE_REQUIRED");
  }
  if (input.declaration.sensitiveValueReferences.length === 0) {
    issues.push("CONFIGURATION_EXTERNAL_SECRET_REFERENCES_REQUIRED");
  }
  if (input.declaration.ownerAttestations.length < 2) {
    issues.push("CONFIGURATION_INDEPENDENT_OWNER_ATTESTATIONS_REQUIRED");
  }
  if (
    new Set(
      input.declaration.ownerAttestations.map(
        (attestation) => attestation.ownerIdentityId,
      ),
    ).size < 2
  ) {
    issues.push("CONFIGURATION_DISTINCT_OWNERS_REQUIRED");
  }
  for (const attestation of input.declaration.ownerAttestations) {
    attempt(() =>
      assertMakerChecker(
        attestation.ownerIdentityId,
        attestation.checkerIdentityId,
        "CONFIGURATION_ATTESTATION_SEPARATION_REQUIRED",
      ),
    );
    attempt(() =>
      requireTimestamp(
        attestation.signedAt,
        "CONFIGURATION_ATTESTATION_DATE_INVALID",
      ),
    );
    const signedAt = new Date(attestation.signedAt);
    if (!Number.isNaN(signedAt.getTime()) && signedAt > input.now) {
      issues.push("CONFIGURATION_ATTESTATION_FUTURE_DATED");
    }
    const owner = input.identities.get(attestation.ownerIdentityId);
    const checker = input.identities.get(attestation.checkerIdentityId);
    attempt(() => {
      if (!owner) throw new Error("CONFIGURATION_OWNER_UNAUTHORIZED");
      assertProductionIdentity({
        identity: owner,
        scope: input.scope,
        requiredPermission: "accounting.readiness.configuration.own",
        code: "CONFIGURATION_OWNER_UNAUTHORIZED",
      });
    });
    attempt(() => {
      if (!checker) throw new Error("CONFIGURATION_CHECKER_UNAUTHORIZED");
      assertProductionIdentity({
        identity: checker,
        scope: input.scope,
        requiredPermission: "accounting.readiness.configuration.review",
        code: "CONFIGURATION_CHECKER_UNAUTHORIZED",
      });
    });
    attempt(() =>
      requireStableId(
        attestation.evidenceId,
        "CONFIGURATION_ATTESTATION_EVIDENCE_ID_INVALID",
      ),
    );
    if (!input.acceptedEvidenceIds.has(attestation.evidenceId)) {
      issues.push("CONFIGURATION_ACCEPTED_ATTESTATION_EVIDENCE_REQUIRED");
    }
  }
  return { ready: issues.length === 0, issues: [...new Set(issues)].sort() };
}

function compareCounts(
  actual: Readonly<Record<string, number>>,
  expected: Readonly<Record<string, number>>,
  code: string,
  issues: string[],
) {
  const valid = (values: Readonly<Record<string, number>>) =>
    Object.keys(values).length > 0 &&
    Object.entries(values).every(
      ([key, value]) =>
        /^[A-Z][A-Z0-9_-]{1,63}$/.test(key) &&
        Number.isSafeInteger(value) &&
        value >= 0,
    );
  if (
    !valid(actual) ||
    !valid(expected) ||
    sha256(actual) !== sha256(expected)
  ) {
    issues.push(code);
  }
}

function validateTotals(
  actual: Readonly<Record<string, ExactCurrencyTotals>>,
  expected: Readonly<Record<string, ExactCurrencyTotals>>,
  issues: string[],
) {
  if (
    Object.keys(actual).length === 0 ||
    sha256(actual) !== sha256(expected)
  ) {
    issues.push("MANIFEST_CURRENCY_TOTALS_MISMATCH");
    return;
  }
  for (const [currency, totals] of Object.entries(actual)) {
    try {
      if (!/^[A-Z]{3}$/.test(currency)) throw new Error();
      for (const value of Object.values(totals)) compare(value, value);
      if (compare(totals.debitTotal, totals.creditTotal) !== 0) {
        issues.push(`MANIFEST_DEBIT_CREDIT_MISMATCH:${currency}`);
      }
      const allocatedAndUnallocated = compare(
        addDecimalStrings(totals.allocatedTotal, totals.unallocatedTotal),
        totals.receiptPaymentTotal,
      );
      if (allocatedAndUnallocated !== 0) {
        issues.push(`MANIFEST_ALLOCATION_TOTAL_MISMATCH:${currency}`);
      }
    } catch {
      issues.push(`MANIFEST_MONEY_INVALID:${currency}`);
    }
  }
}

export async function verifyRealSourceManifest(input: {
  manifest: RealSourceManifest;
  expected: ManifestVerificationExpectation;
  now: Date;
}) {
  const issues: string[] = [];
  try {
    assertProductionScope(
      input.manifest,
      input.expected,
      "MANIFEST_SCOPE_MISMATCH",
    );
    requireStableId(input.manifest.manifestId, "MANIFEST_ID_INVALID");
    if (
      input.manifest.manifestVersion !==
      "accounting-real-source-manifest/v1"
    ) {
      throw new Error("MANIFEST_VERSION_INVALID");
    }
    assertPositiveRowVersion(input.manifest.rowVersion);
    requireStableId(
      input.manifest.extractionOperatorIdentityId,
      "MANIFEST_EXTRACTION_OPERATOR_ID_INVALID",
    );
    assertProductionIdentifier(
      input.manifest.sourceSystemIdentity,
      "MANIFEST_SOURCE_IDENTITY_INVALID",
    );
    assertSecureExternalReference(
      input.manifest.immutableExtractionReference,
      "MANIFEST_EXTRACTION_REFERENCE_INVALID",
    );
    requireMaterialSha256(
      input.manifest.sourceChecksum,
      "MANIFEST_CHECKSUM_INVALID",
    );
    requireMaterialSha256(
      input.expected.independentlyComputedSourceChecksum,
      "MANIFEST_COMPUTED_CHECKSUM_INVALID",
    );
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "MANIFEST_INVALID");
  }
  if (input.manifest.classification !== "PRODUCTION_REAL_SOURCE") {
    issues.push("MANIFEST_NON_PRODUCTION_CLASSIFICATION");
  }
  if (
    input.manifest.sourceChecksum !==
    input.expected.independentlyComputedSourceChecksum
  ) {
    issues.push("MANIFEST_CHECKSUM_MISMATCH");
  }
  let extractedAt: Date | null = null;
  try {
    extractedAt = requireTimestamp(
      input.manifest.extractionTimestamp,
      "MANIFEST_EXTRACTION_TIMESTAMP_INVALID",
    );
  } catch (error) {
    issues.push(
      error instanceof Error ? error.message : "MANIFEST_EXTRACTION_TIMESTAMP_INVALID",
    );
  }
  if (
    !extractedAt ||
    extractedAt > input.now ||
    !Number.isSafeInteger(input.manifest.freshnessLimitMinutes) ||
    input.manifest.freshnessLimitMinutes < 1 ||
    input.now.getTime() - extractedAt.getTime() >
      input.manifest.freshnessLimitMinutes * 60_000
  ) {
    issues.push("MANIFEST_STALE_OR_FUTURE_DATED");
  }
  compareCounts(
    input.manifest.recordTypeCounts,
    input.expected.expectedRecordTypeCounts,
    "MANIFEST_RECORD_COUNTS_MISMATCH",
    issues,
  );
  compareCounts(
    input.manifest.dependencyCounts,
    input.expected.expectedDependencyCounts,
    "MANIFEST_DEPENDENCY_COUNTS_MISMATCH",
    issues,
  );
  validateTotals(
    input.manifest.currencyTotals,
    input.expected.expectedCurrencyTotals,
    issues,
  );
  for (const [actual, expected, code] of [
    [
      input.manifest.attachmentCount,
      input.expected.expectedAttachmentCount,
      "MANIFEST_ATTACHMENT_COUNT_MISMATCH",
    ],
    [
      input.manifest.rejectedCount,
      input.expected.expectedRejectedCount,
      "MANIFEST_REJECTED_COUNT_MISMATCH",
    ],
    [
      input.manifest.excludedCount,
      input.expected.expectedExcludedCount,
      "MANIFEST_EXCLUDED_COUNT_MISMATCH",
    ],
  ] as const) {
    if (!Number.isSafeInteger(actual) || actual < 0 || actual !== expected) {
      issues.push(code);
    }
  }
  if (
    input.manifest.policyVersionReferences.length === 0 ||
    input.manifest.mappingVersionReferences.length === 0 ||
    !input.manifest.canonicalContractVersion.trim()
  ) {
    issues.push("MANIFEST_VERSION_REFERENCES_REQUIRED");
  }
  for (const [value, code] of [
    [
      input.manifest.canonicalContractVersion,
      "MANIFEST_CONTRACT_VERSION_INVALID",
    ],
    ...input.manifest.policyVersionReferences.map(
      (value) => [value, "MANIFEST_POLICY_VERSION_INVALID"] as const,
    ),
    ...input.manifest.mappingVersionReferences.map(
      (value) => [value, "MANIFEST_MAPPING_VERSION_INVALID"] as const,
    ),
  ] as const) {
    try {
      requireStableId(value, code);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : code);
    }
  }
  try {
    assertMakerChecker(
      input.manifest.makerAttestation.ownerIdentityId,
      input.manifest.makerAttestation.checkerIdentityId,
      "MANIFEST_MAKER_CHECKER_SEPARATION_REQUIRED",
    );
    requireTimestamp(
      input.manifest.makerAttestation.signedAt,
      "MANIFEST_ATTESTATION_DATE_INVALID",
    );
    requireStableId(
      input.manifest.makerAttestation.evidenceId,
      "MANIFEST_ATTESTATION_EVIDENCE_ID_INVALID",
    );
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "MANIFEST_ATTESTATION_INVALID");
  }
  const attestationDate = new Date(input.manifest.makerAttestation.signedAt);
  if (
    !Number.isNaN(attestationDate.getTime()) &&
    (attestationDate > input.now ||
      (extractedAt != null && attestationDate < extractedAt))
  ) {
    issues.push("MANIFEST_ATTESTATION_DATE_WINDOW_INVALID");
  }
  if (input.manifest.reconciliationTolerance !== "EXACT_ZERO") {
    issues.push("MANIFEST_EXACT_MONEY_TOLERANCE_REQUIRED");
  }
  for (const value of [
    input.manifest.sourceSystemIdentity,
    input.manifest.immutableExtractionReference,
    input.manifest.canonicalContractVersion,
    ...input.manifest.policyVersionReferences,
    ...input.manifest.mappingVersionReferences,
    ...Object.keys(input.manifest.recordTypeCounts),
    ...Object.keys(input.manifest.dependencyCounts),
  ]) {
    if (INJECTION.test(value)) issues.push("MANIFEST_EXECUTABLE_CONTENT_FORBIDDEN");
  }
  return {
    structurallyValid: !issues.some((issue) =>
      issue.includes("INVALID") || issue.includes("FORBIDDEN"),
    ),
    productionGateSatisfied: issues.length === 0,
    issues: [...new Set(issues)].sort(),
    manifestDigest: sha256(input.manifest),
  };
}
