import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  REQUIRED_PHASE8_GATE_IDS,
  assertAtomicPhase8Mutation,
  assertEvidenceAcceptance,
  assertPhase8CutoverStateUnreachable,
  assessPhase8Readiness,
  buildAuthorizationRequest,
  createDefaultPhase8Snapshot,
  createPhase8AuditEvent,
  invalidateAuthorizationRequest,
  sha256,
  validateBackupRestoreCertification,
  validateEvidenceForGate,
  validatePolicyApproval,
  validateProductionConfigurationDeclaration,
  validateReadinessException,
  validateResponsibilityMatrix,
  verifyAuditChain,
  verifyRealSourceManifest,
  type BackupRestoreCertification,
  type GovernedPolicyDecision,
  type ManifestVerificationExpectation,
  type Phase8ReadinessSnapshot,
  type ProductionConfigurationDeclaration,
  type ProductionEvidenceItem,
  type ProductionIdentity,
  type ProductionResponsibilityRole,
  type ProductionScope,
  type ReadinessException,
  type RealSourceManifest,
  type ResponsibilityAssignment,
} from "../authorization-planning";
import {
  REQUIRED_ACCOUNTING_POLICY_DECISIONS,
} from "../rollout/policy-register";

const NOW = new Date("2026-07-31T10:00:00.000Z");
const scope: ProductionScope = {
  organizationId: "ORG-PRODUCTION-1",
  legalEntityId: "ENTITY-PRODUCTION-1",
  environment: "PRODUCTION",
};

function identity(
  identityId: string,
  permissions: string[] = [],
  overrides: Partial<ProductionIdentity> = {},
): ProductionIdentity {
  return {
    identityId,
    organizationId: scope.organizationId,
    legalEntityIds: [scope.legalEntityId],
    active: true,
    classification: "PRODUCTION_HUMAN",
    permissions,
    ...overrides,
  };
}

const maker = identity("PERSON-MAKER", [
  "accounting.readiness.authorization-request.prepare",
  "accounting.readiness.policy.own",
  "accounting.readiness.exception.own",
  "accounting.readiness.role.assign",
]);
const checker = identity("PERSON-CHECKER", [
  "accounting.readiness.evidence.review",
  "accounting.readiness.policy.review",
  "accounting.readiness.exception.review",
  "accounting.readiness.configuration.review",
  "accounting.readiness.authorization-request.review",
]);

function evidence(
  evidenceId = "EVIDENCE-CORE",
  overrides: Partial<ProductionEvidenceItem> = {},
): ProductionEvidenceItem {
  const digest = sha256({ evidenceId });
  return {
    ...scope,
    evidenceId,
    evidenceType: "PRODUCTION-CERTIFICATION",
    requirementId: "GATE-PRODUCTION-CERTIFICATION",
    version: 1,
    contentDigest: digest,
    issuingSystemOrAuthority: "Independent production authority",
    ownerIdentityId: maker.identityId,
    submittedByIdentityId: maker.identityId,
    submittedAt: "2026-07-31T08:00:00.000Z",
    validFrom: "2026-07-31T08:00:00.000Z",
    validUntil: "2026-08-01T10:00:00.000Z",
    secureExternalReference: `evidence://registry/${evidenceId.toLowerCase()}`,
    dataClassification: "RESTRICTED",
    reviewStatus: "ACCEPTED",
    reviewedByIdentityId: checker.identityId,
    reviewedAt: "2026-07-31T09:00:00.000Z",
    rejectionReason: null,
    supersededByEvidenceId: null,
    revoked: false,
    revokedAt: null,
    revocationReason: null,
    retentionClassification: "FINANCIAL-AUDIT",
    verificationMethod: "Independent checksum and authority verification",
    verificationResult: "PASSED",
    verificationTimestamp: "2026-07-31T09:00:00.000Z",
    origin: "PRODUCTION_EXTERNAL",
    rowVersion: 1,
    ...overrides,
  };
}

function policy(
  policyId = REQUIRED_ACCOUNTING_POLICY_DECISIONS[0],
  overrides: Partial<GovernedPolicyDecision> = {},
): GovernedPolicyDecision {
  return {
    ...scope,
    policyId,
    version: 1,
    authoritativeOwnerIdentityId: maker.identityId,
    decisionText: "Authorized human selection",
    structuredSelection: null,
    rationale: "Documented production rationale",
    effectiveDate: "2026-07-31T00:00:00.000Z",
    reviewDate: "2026-08-31T00:00:00.000Z",
    supportingEvidenceIds: ["EVIDENCE-CORE"],
    makerIdentityId: maker.identityId,
    checkerIdentityId: checker.identityId,
    submittedAt: "2026-07-31T08:10:00.000Z",
    approvedAt: "2026-07-31T09:10:00.000Z",
    status: "APPROVED",
    supersededByVersion: null,
    revokedAt: null,
    revocationReason: null,
    statutoryJurisdiction:
      policyId === "POL-TAX-STATUTORY-MIGRATION" ? "IN" : null,
    sourceAuthorityReference:
      policyId === "POL-TAX-STATUTORY-MIGRATION"
        ? "evidence://authority/statutory-source"
        : null,
    rowVersion: 1,
    ...overrides,
  };
}

function assignment(
  role: ProductionResponsibilityRole,
  identityId = `PERSON-${role}`,
): ResponsibilityAssignment {
  return {
    ...scope,
    assignmentId: `ASSIGNMENT-${role}`,
    role,
    identityId,
    requiredPermission: "accounting.readiness.role",
    assignedAt: "2026-07-31T07:00:00.000Z",
    acknowledgedAt: "2026-07-31T08:00:00.000Z",
    validUntil: "2026-08-31T10:00:00.000Z",
    assignedByIdentityId: maker.identityId,
    rowVersion: 1,
  };
}

const roles: ProductionResponsibilityRole[] = [
  "EXECUTIVE_BUSINESS_SPONSOR",
  "ACCOUNTING_OWNER",
  "MIGRATION_OPERATOR",
  "INDEPENDENT_CHECKER",
  "DATABASE_OWNER",
  "BACKUP_RESTORE_OWNER",
  "INFRASTRUCTURE_OWNER",
  "SECURITY_OWNER",
  "STATUTORY_TAX_APPROVER",
  "BUSINESS_ACCEPTANCE_OWNER",
  "SCHEDULER_OWNER",
  "PROVIDER_INTEGRATION_OWNER",
  "SUPPORT_LEAD",
  "INCIDENT_COMMANDER",
  "ROLLBACK_AUTHORITY",
  "COMMUNICATIONS_OWNER",
];

function backup(overrides: Partial<BackupRestoreCertification> = {}) {
  return {
    ...scope,
    certificationId: "BACKUP-CERT-1",
    version: 1,
    backupScopeReference: "evidence://registry/backup-scope",
    databaseCovered: true,
    attachmentsCovered: true,
    encryptionEvidenceId: "EVIDENCE-ENCRYPTION",
    backupTimestamp: "2026-07-31T09:00:00.000Z",
    maximumBackupAgeMinutes: 180,
    retentionEvidenceId: "EVIDENCE-RETENTION",
    integrityVerificationEvidenceId: "EVIDENCE-INTEGRITY",
    isolatedRestoreEvidenceId: "EVIDENCE-RESTORE",
    isolatedRestorePassed: true,
    restorationTimestamp: "2026-07-31T09:30:00.000Z",
    recoveryPointObjectiveMinutes: 60,
    recoveryPointObservedMinutes: 30,
    recoveryTimeObjectiveMinutes: 90,
    recoveryTimeObservedMinutes: 45,
    accountingConsistencyEvidenceId: "EVIDENCE-ACCOUNTING",
    accountingConsistencyPassed: true,
    attachmentConsistencyEvidenceId: "EVIDENCE-ATTACHMENTS",
    attachmentConsistencyPassed: true,
    restoreOwnerIdentityId: "PERSON-BACKUP_RESTORE_OWNER",
    independentVerifierIdentityId: "PERSON-INDEPENDENT_CHECKER",
    rollbackAuthorityIdentityId: "PERSON-ROLLBACK_AUTHORITY",
    postedEffectsStrategy:
      "CANONICAL_REVERSAL_CANCELLATION_OR_ADJUSTMENT_ONLY" as const,
    evidenceOrigin: "PRODUCTION_EXTERNAL" as const,
    certifiedAt: "2026-07-31T09:40:00.000Z",
    rowVersion: 1,
    ...overrides,
  };
}

function configuration(
  overrides: Partial<ProductionConfigurationDeclaration> = {},
): ProductionConfigurationDeclaration {
  return {
    ...scope,
    declarationId: "CONFIGURATION-1",
    version: 1,
    productionDatabaseIdentityReference: "evidence://registry/database-identity",
    expectedEnvironmentClassification: "PRODUCTION",
    allowedHostPolicyReference: "evidence://registry/host-policy",
    databaseHostClassification: "APPROVED_NON_LOOPBACK",
    databasePort: 6432,
    canonicalServiceEndpointReferences: [
      "evidence://registry/canonical-service-endpoints",
    ],
    providerDeclarations: [
      {
        providerName: "ACCOUNTING-PROVIDER",
        configurationReference: "evidence://registry/provider-configuration",
        activationState: "DISABLED",
      },
    ],
    schedulerOwnershipReference: "evidence://registry/scheduler-owner",
    schedulerMode: "DISABLED",
    outboundDeliveryMode: "DISABLED",
    attachmentStorageReference: "evidence://registry/attachment-storage",
    encryptionKeyManagementReference: "evidence://registry/key-management",
    observabilityDestinationReference: "evidence://registry/observability",
    alertOwnershipReference: "evidence://registry/alert-owner",
    retentionConfigurationReference: "evidence://registry/retention",
    authenticationAuthorizationIssuerReference:
      "evidence://registry/auth-issuer",
    deploymentIdentityReference: "evidence://registry/deployment-identity",
    releaseArtifactDigest: "a".repeat(64),
    featureFlagDeclarationReference: "evidence://registry/feature-flags",
    killSwitchReference: "evidence://registry/kill-switch",
    sensitiveValueReferences: ["vault://secret-store/database-credential"],
    executionMode: "PLANNING_ONLY",
    ownerAttestations: [
      {
        ownerIdentityId: "PERSON-INFRASTRUCTURE_OWNER",
        checkerIdentityId: checker.identityId,
        evidenceId: "EVIDENCE-CONFIGURATION",
        signedAt: "2026-07-31T09:30:00.000Z",
      },
      {
        ownerIdentityId: "PERSON-SECURITY_OWNER",
        checkerIdentityId: "PERSON-INDEPENDENT_CHECKER",
        evidenceId: "EVIDENCE-CONFIGURATION",
        signedAt: "2026-07-31T09:35:00.000Z",
      },
    ],
    rowVersion: 1,
    ...overrides,
  };
}

const exactTotals = {
  INR: {
    documentTotal: "100.00",
    receiptPaymentTotal: "100.00",
    allocatedTotal: "75.00",
    unallocatedTotal: "25.00",
    debitTotal: "100.00",
    creditTotal: "100.00",
  },
};

function manifest(overrides: Partial<RealSourceManifest> = {}): RealSourceManifest {
  return {
    ...scope,
    manifestVersion: "accounting-real-source-manifest/v1",
    manifestId: "MANIFEST-1",
    sourceSystemIdentity: "ERP-PRODUCTION",
    extractionTimestamp: "2026-07-31T09:00:00.000Z",
    extractionOperatorIdentityId: maker.identityId,
    classification: "PRODUCTION_REAL_SOURCE",
    recordTypeCounts: { SALES_INVOICE: 2 },
    currencyTotals: exactTotals,
    dependencyCounts: { ALLOCATION_LINKS: 1 },
    attachmentCount: 1,
    rejectedCount: 0,
    excludedCount: 0,
    sourceChecksum: "b".repeat(64),
    immutableExtractionReference: "evidence://registry/extraction-1",
    policyVersionReferences: ["POLICY-REGISTER-V1"],
    mappingVersionReferences: ["MAPPING-V1"],
    canonicalContractVersion: "ACCOUNTING-IMPORT-V1",
    makerAttestation: {
      ownerIdentityId: maker.identityId,
      checkerIdentityId: checker.identityId,
      evidenceId: "EVIDENCE-MANIFEST",
      signedAt: "2026-07-31T09:30:00.000Z",
    },
    freshnessLimitMinutes: 180,
    reconciliationTolerance: "EXACT_ZERO",
    rowVersion: 1,
    ...overrides,
  };
}

function manifestExpectation(
  overrides: Partial<ManifestVerificationExpectation> = {},
): ManifestVerificationExpectation {
  return {
    ...scope,
    independentlyComputedSourceChecksum: "b".repeat(64),
    expectedRecordTypeCounts: { SALES_INVOICE: 2 },
    expectedCurrencyTotals: exactTotals,
    expectedDependencyCounts: { ALLOCATION_LINKS: 1 },
    expectedAttachmentCount: 1,
    expectedRejectedCount: 0,
    expectedExcludedCount: 0,
    ...overrides,
  };
}

function exception(
  overrides: Partial<ReadinessException> = {},
): ReadinessException {
  return {
    ...scope,
    exceptionId: "EXCEPTION-1",
    version: 1,
    controlClass: "DOCUMENTATION",
    controlId: "DOC-OPTIONAL-1",
    ownerIdentityId: maker.identityId,
    rationale: "Bounded temporary documentation gap",
    impact: "No security, scope, money, backup, canonical, or statutory impact",
    compensatingControl: "Independent manual checklist",
    evidenceIds: ["EVIDENCE-CORE"],
    expiresAt: "2026-08-01T10:00:00.000Z",
    makerIdentityId: maker.identityId,
    checkerIdentityId: checker.identityId,
    status: "ACCEPTED",
    reviewedAt: "2026-07-31T09:00:00.000Z",
    revokedAt: null,
    rowVersion: 1,
    ...overrides,
  };
}

function readyFixture() {
  const evidenceItems = [
    evidence("EVIDENCE-CORE", { requirementId: "POLICY_GOVERNANCE" }),
    evidence("EVIDENCE-CONFIGURATION", {
      requirementId: "PRODUCTION_CONFIGURATION",
    }),
    evidence("EVIDENCE-MANIFEST", {
      requirementId: "REAL_SOURCE_MANIFEST",
    }),
    evidence("EVIDENCE-ENCRYPTION", { requirementId: "BACKUP_ENCRYPTION" }),
    evidence("EVIDENCE-RETENTION", { requirementId: "BACKUP_RETENTION" }),
    evidence("EVIDENCE-INTEGRITY", { requirementId: "BACKUP_INTEGRITY" }),
    evidence("EVIDENCE-RESTORE", { requirementId: "BACKUP_RESTORE" }),
    evidence("EVIDENCE-ACCOUNTING", {
      requirementId: "BACKUP_ACCOUNTING_CONSISTENCY",
    }),
    evidence("EVIDENCE-ATTACHMENTS", {
      requirementId: "BACKUP_ATTACHMENT_CONSISTENCY",
    }),
  ];
  const assignments = roles.map((role) => assignment(role));
  const identities = new Map<string, ProductionIdentity>([
    [maker.identityId, maker],
    [checker.identityId, checker],
    ...roles.map(
      (role) =>
        [
          `PERSON-${role}`,
          identity(`PERSON-${role}`, [
            "accounting.readiness.role",
            ...(role === "BACKUP_RESTORE_OWNER"
              ? ["accounting.readiness.backup.restore"]
              : []),
            ...(role === "INDEPENDENT_CHECKER"
              ? [
                  "accounting.readiness.backup.verify",
                  "accounting.readiness.configuration.review",
                ]
              : []),
            ...(role === "ROLLBACK_AUTHORITY"
              ? ["accounting.readiness.rollback.authorize"]
              : []),
            ...(role === "INFRASTRUCTURE_OWNER" || role === "SECURITY_OWNER"
              ? ["accounting.readiness.configuration.own"]
              : []),
          ]),
        ] as const,
    ),
  ]);
  identities.set(
    maker.identityId,
    identity(maker.identityId, [
      ...maker.permissions,
      "accounting.readiness.manifest.extract",
      "accounting.readiness.manifest.attest",
    ]),
  );
  identities.set(
    checker.identityId,
    identity(checker.identityId, [
      ...checker.permissions,
      "accounting.readiness.manifest.review",
    ]),
  );
  const snapshot: Phase8ReadinessSnapshot = {
    ...createDefaultPhase8Snapshot(scope),
    releaseArtifactDigest: "a".repeat(64),
    evidence: evidenceItems,
    policies: REQUIRED_ACCOUNTING_POLICY_DECISIONS.map((policyId) =>
      policy(policyId),
    ),
    assignments,
    backupRestore: backup(),
    configuration: configuration(),
    manifest: manifest(),
    gates: REQUIRED_PHASE8_GATE_IDS.map((gateId) => ({
      gateId,
      critical: true,
      satisfied: true,
      safeReason: "Independently verified for authorization request preparation.",
    })),
  };
  const independentlyComputedEvidenceDigests = new Map(
    evidenceItems.map((item) => [item.evidenceId, item.contentDigest]),
  );
  return {
    snapshot,
    context: {
      now: NOW,
      identities,
      independentlyComputedEvidenceDigests,
      expectedEvidenceRequirements: new Map(
        evidenceItems.map((item) => [item.evidenceId, item.requirementId]),
      ),
      manifestExpectation: manifestExpectation(),
    },
    identities,
    evidenceIds: new Set(evidenceItems.map((item) => item.evidenceId)),
  };
}

describe("Accounting Phase 8 evidence and policy governance", () => {
  it("blocks missing, placeholder, synthetic, mismatched, stale, revoked and superseded evidence", async () => {
    const empty = createDefaultPhase8Snapshot(scope);
    const emptyAssessment = await assessPhase8Readiness(empty, {
      now: NOW,
      identities: new Map(),
      independentlyComputedEvidenceDigests: new Map(),
      expectedEvidenceRequirements: new Map(),
      manifestExpectation: null,
    });
    expect(emptyAssessment.ready).toBe(false);
    expect(emptyAssessment.blockers).toContain("EVIDENCE_MISSING");

    for (const candidate of [
      evidence("EVIDENCE-PLACEHOLDER", { origin: "METADATA_ONLY" }),
      evidence("EVIDENCE-SYNTHETIC", { origin: "SYNTHETIC" }),
      evidence("EVIDENCE-EXPIRED", {
        validUntil: "2026-07-31T09:59:59.000Z",
        reviewStatus: "EXPIRED",
      }),
      evidence("EVIDENCE-REVOKED", {
        revoked: true,
        revokedAt: "2026-07-31T09:30:00.000Z",
        reviewStatus: "REVOKED",
      }),
      evidence("EVIDENCE-SUPERSEDED", {
        supersededByEvidenceId: "EVIDENCE-NEW",
        reviewStatus: "SUPERSEDED",
      }),
    ]) {
      expect(
        validateEvidenceForGate({
          evidence: candidate,
          expectedScope: scope,
          expectedRequirementId: candidate.requirementId,
          independentlyComputedDigest: candidate.contentDigest,
          owner: maker,
          submitter: maker,
          reviewer: checker,
          now: NOW,
        }).valid,
      ).toBe(false);
    }
    expect(
      validateEvidenceForGate({
        evidence: evidence(),
        expectedScope: scope,
        expectedRequirementId: "GATE-PRODUCTION-CERTIFICATION",
        independentlyComputedDigest: "f".repeat(64),
        owner: maker,
        submitter: maker,
        reviewer: checker,
        now: NOW,
      }).issues,
    ).toContain("EVIDENCE_DIGEST_MISMATCH");
  });

  it("rejects cross-organization, wrong-legal-entity, self and unauthorized review", () => {
    for (const expectedScope of [
      { ...scope, organizationId: "ORG-PRODUCTION-2" },
      { ...scope, legalEntityId: "ENTITY-PRODUCTION-2" },
    ]) {
      expect(
        validateEvidenceForGate({
          evidence: evidence(),
          expectedScope,
          expectedRequirementId: "GATE-PRODUCTION-CERTIFICATION",
          independentlyComputedDigest: evidence().contentDigest,
          owner: maker,
          submitter: maker,
          reviewer: checker,
          now: NOW,
        }).issues,
      ).toContain("EVIDENCE_SCOPE_MISMATCH");
    }
    expect(() =>
      assertEvidenceAcceptance({
        evidence: evidence("EVIDENCE-SUBMITTED", {
          reviewStatus: "SUBMITTED",
          reviewedAt: null,
          reviewedByIdentityId: null,
          verificationResult: "NOT_VERIFIED",
          verificationTimestamp: null,
        }),
        reviewer: identity(maker.identityId, [
          "accounting.readiness.evidence.review",
        ]),
        submitter: maker,
        expectedScope: scope,
        independentlyComputedDigest: evidence("EVIDENCE-SUBMITTED").contentDigest,
        reviewedAt: NOW.toISOString(),
        now: NOW,
      }),
    ).toThrow("EVIDENCE_SELF_REVIEW_FORBIDDEN");
    expect(() =>
      assertEvidenceAcceptance({
        evidence: evidence("EVIDENCE-SUBMITTED", {
          reviewStatus: "SUBMITTED",
        }),
        reviewer: identity("PERSON-NO-PERMISSION"),
        submitter: maker,
        expectedScope: scope,
        independentlyComputedDigest: evidence("EVIDENCE-SUBMITTED").contentDigest,
        reviewedAt: NOW.toISOString(),
        now: NOW,
      }),
    ).toThrow("EVIDENCE_REVIEWER_UNAUTHORIZED");
  });

  it("rejects empty, malformed, credential-bearing and future-dated evidence references", () => {
    for (const secureExternalReference of [
      "",
      "   ",
      "../evidence.pdf",
      "file:///evidence.pdf",
      "https://user:password@evidence.example/item",
    ]) {
      const result = validateEvidenceForGate({
        evidence: evidence("EVIDENCE-BAD-REF", { secureExternalReference }),
        expectedScope: scope,
        expectedRequirementId: "GATE-PRODUCTION-CERTIFICATION",
        independentlyComputedDigest: evidence("EVIDENCE-BAD-REF").contentDigest,
        owner: maker,
        submitter: maker,
        reviewer: checker,
        now: NOW,
      });
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("SECURE_REFERENCE_INVALID");
    }
    expect(
      validateEvidenceForGate({
        evidence: evidence("EVIDENCE-FUTURE", {
          submittedAt: "2026-07-31T11:00:00.000Z",
          validFrom: "2026-07-31T11:00:00.000Z",
        }),
        expectedScope: scope,
        expectedRequirementId: "GATE-PRODUCTION-CERTIFICATION",
        independentlyComputedDigest: evidence("EVIDENCE-FUTURE").contentDigest,
        owner: maker,
        submitter: maker,
        reviewer: checker,
        now: NOW,
      }).issues,
    ).toContain("EVIDENCE_DATE_WINDOW_INVALID");
  });

  it("keeps all 20 policies awaiting decision by default", () => {
    const policies = createDefaultPhase8Snapshot(scope).policies;
    expect(policies).toHaveLength(20);
    expect(policies.every((entry) => entry.status === "AWAITING_DECISION")).toBe(
      true,
    );
  });

  it("rejects policy self-approval, missing rationale/evidence, impossible dates and revoked policy", () => {
    const accepted = new Set(["EVIDENCE-CORE"]);
    const cases = [
      policy(undefined, {
        checkerIdentityId: maker.identityId,
      }),
      policy(undefined, { rationale: null }),
      policy(undefined, { supportingEvidenceIds: [] }),
      policy(undefined, {
        effectiveDate: "2026-09-01T00:00:00.000Z",
        reviewDate: "2026-08-01T00:00:00.000Z",
      }),
      policy(undefined, {
        status: "REVOKED",
        revokedAt: "2026-07-31T09:30:00.000Z",
      }),
    ];
    const selfChecker = identity(maker.identityId, [
      "accounting.readiness.policy.review",
    ]);
    expect(
      validatePolicyApproval({
        decision: cases[0],
        expectedScope: scope,
        maker,
        checker: selfChecker,
        owner: maker,
        acceptedEvidenceIds: accepted,
        now: NOW,
      }).valid,
    ).toBe(false);
    for (const candidate of cases.slice(1)) {
      expect(
        validatePolicyApproval({
          decision: candidate,
          expectedScope: scope,
          maker,
          checker,
          owner: maker,
          acceptedEvidenceIds: accepted,
          now: NOW,
        }).valid,
      ).toBe(false);
    }
  });
});

describe("Accounting Phase 8 responsibilities, backup and configuration", () => {
  it("rejects conflicting, missing, inactive and synthetic production assignments", () => {
    const valid = readyFixture();
    const conflictAssignments = valid.snapshot.assignments.map((item) =>
      item.role === "INDEPENDENT_CHECKER"
        ? { ...item, identityId: "PERSON-MIGRATION_OPERATOR" }
        : item,
    );
    expect(
      validateResponsibilityMatrix({
        assignments: conflictAssignments,
        identities: valid.identities,
        scope,
        now: NOW,
      }).issues.some((issue) => issue.startsWith("ROLE_SEPARATION_CONFLICT")),
    ).toBe(true);
    expect(
      validateResponsibilityMatrix({
        assignments: valid.snapshot.assignments.filter(
          (item) =>
            !["SCHEDULER_OWNER", "ROLLBACK_AUTHORITY", "BACKUP_RESTORE_OWNER"].includes(
              item.role,
            ),
        ),
        identities: valid.identities,
        scope,
        now: NOW,
      }).ready,
    ).toBe(false);
    for (const classification of ["SYNTHETIC", "PLACEHOLDER"] as const) {
      const identities = new Map(valid.identities);
      identities.set(
        "PERSON-SCHEDULER_OWNER",
        identity("PERSON-SCHEDULER_OWNER", ["accounting.readiness.role"], {
          classification,
        }),
      );
      expect(
        validateResponsibilityMatrix({
          assignments: valid.snapshot.assignments,
          identities,
          scope,
          now: NOW,
        }).ready,
      ).toBe(false);
    }
    const inactive = new Map(valid.identities);
    inactive.set(
      "PERSON-SCHEDULER_OWNER",
      identity("PERSON-SCHEDULER_OWNER", ["accounting.readiness.role"], {
        active: false,
      }),
    );
    expect(
      validateResponsibilityMatrix({
        assignments: valid.snapshot.assignments,
        identities: inactive,
        scope,
        now: NOW,
      }).ready,
    ).toBe(false);
  });

  it("requires isolated restore, RPO/RTO, independent verification and canonical reversal", () => {
    const valid = readyFixture();
    for (const candidate of [
      backup({ isolatedRestorePassed: false }),
      backup({ recoveryPointObservedMinutes: 61 }),
      backup({ recoveryTimeObservedMinutes: 91 }),
      backup({
        independentVerifierIdentityId: "PERSON-BACKUP_RESTORE_OWNER",
      }),
      backup({ evidenceOrigin: "SYNTHETIC" }),
      {
        ...backup(),
        postedEffectsStrategy: "DELETE_POSTED_EFFECTS",
      } as unknown as BackupRestoreCertification,
    ]) {
      expect(
        validateBackupRestoreCertification({
          certification: candidate,
          scope,
          identities: valid.identities,
          acceptedEvidenceIds: valid.evidenceIds,
          now: NOW,
        }).ready,
      ).toBe(false);
    }
  });

  it("rejects loopback, staging/development identities, port 5432, inline secrets and one enablement Boolean", () => {
    const valid = readyFixture();
    const accepted = new Set(["EVIDENCE-CONFIGURATION"]);
    for (const candidate of [
      configuration({ databaseHostClassification: "LOOPBACK" }),
      configuration({ databaseHostClassification: "STAGING" }),
      configuration({ databaseHostClassification: "DEVELOPMENT" }),
      configuration({ databasePort: 5432 }),
      configuration({
        productionDatabaseIdentityReference:
          ["postgresql", "://user:placeholder@database.invalid:6432/app"].join(
            "",
          ),
      }),
      configuration({ productionEnablementFlag: false }),
    ]) {
      expect(
        validateProductionConfigurationDeclaration({
          declaration: candidate,
          scope,
          acceptedEvidenceIds: accepted,
          identities: valid.identities,
          now: NOW,
        }).ready,
      ).toBe(false);
    }
  });

  it("keeps providers, outbound delivery and scheduling disabled", () => {
    const valid = readyFixture();
    const result = validateProductionConfigurationDeclaration({
      declaration: configuration(),
      scope,
      acceptedEvidenceIds: new Set(["EVIDENCE-CONFIGURATION"]),
      identities: valid.identities,
      now: NOW,
    });
    expect(result.ready).toBe(true);
    expect(configuration().providerDeclarations[0].activationState).toBe(
      "DISABLED",
    );
    expect(configuration().outboundDeliveryMode).toBe("DISABLED");
    expect(configuration().schedulerMode).toBe("DISABLED");
    expect(configuration().executionMode).toBe("PLANNING_ONLY");
  });
});

describe("Accounting Phase 8 real-source manifest", () => {
  it("allows synthetic manifests to be structurally examined but never satisfy production", async () => {
    const result = await verifyRealSourceManifest({
      manifest: manifest({ classification: "SYNTHETIC" }),
      expected: manifestExpectation(),
      now: NOW,
    });
    expect(result.productionGateSatisfied).toBe(false);
    expect(result.issues).toContain("MANIFEST_NON_PRODUCTION_CLASSIFICATION");
  });

  it("rejects tampering, cross-scope reuse, count/total mismatch and staleness", async () => {
    const candidates = [
      {
        candidate: manifest({ sourceChecksum: "c".repeat(64) }),
        expected: manifestExpectation(),
        code: "MANIFEST_CHECKSUM_MISMATCH",
      },
      {
        candidate: manifest(),
        expected: manifestExpectation({ organizationId: "ORG-PRODUCTION-2" }),
        code: "MANIFEST_SCOPE_MISMATCH",
      },
      {
        candidate: manifest({ recordTypeCounts: { SALES_INVOICE: 3 } }),
        expected: manifestExpectation(),
        code: "MANIFEST_RECORD_COUNTS_MISMATCH",
      },
      {
        candidate: manifest({
          currencyTotals: {
            INR: { ...exactTotals.INR, creditTotal: "99.00" },
          },
        }),
        expected: manifestExpectation(),
        code: "MANIFEST_CURRENCY_TOTALS_MISMATCH",
      },
      {
        candidate: manifest({
          extractionTimestamp: "2026-07-30T00:00:00.000Z",
          freshnessLimitMinutes: 60,
        }),
        expected: manifestExpectation(),
        code: "MANIFEST_STALE_OR_FUTURE_DATED",
      },
    ];
    for (const { candidate, expected, code } of candidates) {
      expect(
        (
          await verifyRealSourceManifest({
            manifest: candidate,
            expected,
            now: NOW,
          })
        ).issues,
      ).toContain(code);
    }
  });

  it("rejects formula, traversal, SQL and executable-serialization content", async () => {
    for (const value of [
      "=HYPERLINK(\"bad\")",
      "../../source",
      "DROP TABLE ledger",
      "rO0ABXNy",
    ]) {
      const result = await verifyRealSourceManifest({
        manifest: manifest({ mappingVersionReferences: [value] }),
        expected: manifestExpectation(),
        now: NOW,
      });
      expect(result.issues).toContain("MANIFEST_EXECUTABLE_CONTENT_FORBIDDEN");
    }
  });
});

describe("Accounting Phase 8 exceptions, authorization and audit", () => {
  it("makes critical controls non-waivable and expires exceptions fail closed", () => {
    for (const candidate of [
      exception({ controlClass: "SECURITY" }),
      exception({ controlClass: "SCOPE_ISOLATION" }),
      exception({ controlClass: "RECONCILIATION" }),
      exception({ controlClass: "BACKUP_RESTORE" }),
      exception({ controlClass: "CANONICAL_FINANCIAL_BOUNDARY" }),
      exception({ controlClass: "STATUTORY" }),
      exception({ expiresAt: "2026-07-31T09:00:00.000Z" }),
    ]) {
      expect(
        validateReadinessException({
          exception: candidate,
          scope,
          maker,
          checker,
          owner: maker,
          acceptedEvidenceIds: new Set(["EVIDENCE-CORE"]),
          now: NOW,
        }).valid,
      ).toBe(false);
    }
  });

  it("builds request readiness without authorization or cutover capability", async () => {
    const fixture = readyFixture();
    const request = await buildAuthorizationRequest({
      snapshot: fixture.snapshot,
      context: fixture.context,
      maker,
      proposedIndependentChecker: checker,
      generatedAt: NOW.toISOString(),
      expiresAt: "2026-07-31T12:00:00.000Z",
    });
    expect(request.state).toBe("AUTHORIZATION_REQUEST_READY");
    expect(request.goNoGoAssessment).toBe("AUTHORIZATION_REQUEST_READY");
    expect(request.productionAuthorizationGranted).toBe(false);
    expect(request.cutoverExecutionAvailable).toBe(false);
  });

  it("rejects forged accepted reviewers and future-dated review metadata", async () => {
    for (const mutate of [
      (fixture: ReturnType<typeof readyFixture>) => {
        fixture.snapshot.evidence[0].reviewedByIdentityId = "PERSON-FORGED";
      },
      (fixture: ReturnType<typeof readyFixture>) => {
        fixture.snapshot.evidence[0].reviewedAt =
          "2026-07-31T11:00:00.000Z";
        fixture.snapshot.evidence[0].verificationTimestamp =
          "2026-07-31T11:00:00.000Z";
      },
    ]) {
      const fixture = readyFixture();
      mutate(fixture);
      const assessment = await assessPhase8Readiness(
        fixture.snapshot,
        fixture.context,
      );
      expect(assessment.ready).toBe(false);
    }
  });

  it("rejects a synthetic manifest relabelled as production", async () => {
    const fixture = readyFixture();
    const manifestEvidence = fixture.snapshot.evidence.find(
      (item) => item.evidenceId === "EVIDENCE-MANIFEST",
    )!;
    manifestEvidence.origin = "SYNTHETIC";
    fixture.snapshot.manifest!.classification = "PRODUCTION_REAL_SOURCE";
    const assessment = await assessPhase8Readiness(
      fixture.snapshot,
      fixture.context,
    );
    expect(assessment.ready).toBe(false);
    expect(assessment.blockers).toContain(
      "MANIFEST_PRODUCTION_PROVENANCE_EVIDENCE_REQUIRED",
    );
  });

  it("rejects placeholder digests, duplicate gates and duplicate policies", async () => {
    expect(
      validateEvidenceForGate({
        evidence: evidence("EVIDENCE-ZERO-DIGEST", {
          contentDigest: "0".repeat(64),
        }),
        expectedScope: scope,
        expectedRequirementId: "GATE-PRODUCTION-CERTIFICATION",
        independentlyComputedDigest: "0".repeat(64),
        owner: maker,
        submitter: maker,
        reviewer: checker,
        now: NOW,
      }).valid,
    ).toBe(false);

    const fixture = readyFixture();
    fixture.snapshot.gates.push(fixture.snapshot.gates[0]);
    fixture.snapshot.policies.push(fixture.snapshot.policies[0]);
    const assessment = await assessPhase8Readiness(
      fixture.snapshot,
      fixture.context,
    );
    expect(assessment.ready).toBe(false);
    expect(assessment.blockers).toContain("CRITICAL_GATE_DUPLICATE");
    expect(assessment.blockers).toContain("POLICY_REGISTER_DUPLICATE");
  });

  it("rejects forged configuration owners and future attestations", () => {
    const fixture = readyFixture();
    const forgedIdentities = new Map(fixture.identities);
    forgedIdentities.delete("PERSON-INFRASTRUCTURE_OWNER");
    expect(
      validateProductionConfigurationDeclaration({
        declaration: configuration(),
        scope,
        acceptedEvidenceIds: fixture.evidenceIds,
        identities: forgedIdentities,
        now: NOW,
      }).ready,
    ).toBe(false);
    expect(
      validateProductionConfigurationDeclaration({
        declaration: configuration({
          ownerAttestations: configuration().ownerAttestations.map(
            (attestation, index) =>
              index === 0
                ? { ...attestation, signedAt: "2026-07-31T11:00:00.000Z" }
                : attestation,
          ),
        }),
        scope,
        acceptedEvidenceIds: fixture.evidenceIds,
        identities: fixture.identities,
        now: NOW,
      }).issues,
    ).toContain("CONFIGURATION_ATTESTATION_FUTURE_DATED");
  });

  it("rejects same maker/checker and forged or unauthorized approvers", async () => {
    const fixture = readyFixture();
    await expect(
      buildAuthorizationRequest({
        snapshot: fixture.snapshot,
        context: fixture.context,
        maker,
        proposedIndependentChecker: identity(maker.identityId, [
          "accounting.readiness.authorization-request.review",
        ]),
        generatedAt: NOW.toISOString(),
        expiresAt: "2026-07-31T12:00:00.000Z",
      }),
    ).rejects.toThrow("AUTHORIZATION_REQUEST_SELF_REVIEW_FORBIDDEN");
    await expect(
      buildAuthorizationRequest({
        snapshot: fixture.snapshot,
        context: fixture.context,
        maker,
        proposedIndependentChecker: identity("PERSON-FORGED"),
        generatedAt: NOW.toISOString(),
        expiresAt: "2026-07-31T12:00:00.000Z",
      }),
    ).rejects.toThrow("AUTHORIZATION_REQUEST_CHECKER_UNAUTHORIZED");
  });

  it("invalidates a prepared request after policy or any dependency mutation and on replay after expiry", async () => {
    const fixture = readyFixture();
    const request = await buildAuthorizationRequest({
      snapshot: fixture.snapshot,
      context: fixture.context,
      maker,
      proposedIndependentChecker: checker,
      generatedAt: NOW.toISOString(),
      expiresAt: "2026-07-31T12:00:00.000Z",
    });
    const policyMutation = structuredClone(fixture.snapshot);
    policyMutation.policies[0].rowVersion += 1;
    expect(
      invalidateAuthorizationRequest({
        request,
        currentSnapshot: policyMutation,
        currentContext: fixture.context,
        now: NOW,
      }).state,
    ).toBe("INVALIDATED");
    for (const mutate of [
      (snapshot: Phase8ReadinessSnapshot) => snapshot.evidence[0].rowVersion++,
      (snapshot: Phase8ReadinessSnapshot) => snapshot.assignments[0].rowVersion++,
      (snapshot: Phase8ReadinessSnapshot) => snapshot.manifest!.rowVersion++,
      (snapshot: Phase8ReadinessSnapshot) => snapshot.configuration!.rowVersion++,
      (snapshot: Phase8ReadinessSnapshot) =>
        (snapshot.releaseArtifactDigest = "f".repeat(64)),
      (snapshot: Phase8ReadinessSnapshot) =>
        (snapshot.readinessLogicVersion =
          "changed" as Phase8ReadinessSnapshot["readinessLogicVersion"]),
    ]) {
      const changed = structuredClone(fixture.snapshot);
      mutate(changed);
      expect(
        invalidateAuthorizationRequest({
          request,
          currentSnapshot: changed,
          currentContext: fixture.context,
          now: NOW,
        }).state,
      ).toBe("INVALIDATED");
    }
    expect(
      invalidateAuthorizationRequest({
        request,
        currentSnapshot: fixture.snapshot,
        currentContext: fixture.context,
        now: new Date("2026-07-31T12:00:01.000Z"),
      }).state,
    ).toBe("INVALIDATED");
  });

  it("binds prepared requests to complete dependency content and independent verification inputs", async () => {
    const fixture = readyFixture();
    const request = await buildAuthorizationRequest({
      snapshot: fixture.snapshot,
      context: fixture.context,
      maker,
      proposedIndependentChecker: checker,
      generatedAt: NOW.toISOString(),
      expiresAt: "2026-07-31T12:00:00.000Z",
    });
    for (const mutate of [
      (snapshot: Phase8ReadinessSnapshot) =>
        (snapshot.evidence[0].secureExternalReference =
          "evidence://registry/changed-evidence"),
      (snapshot: Phase8ReadinessSnapshot) =>
        (snapshot.policies[0].rationale = "Changed rationale"),
      (snapshot: Phase8ReadinessSnapshot) =>
        (snapshot.assignments[0].acknowledgedAt =
          "2026-07-31T08:01:00.000Z"),
      (snapshot: Phase8ReadinessSnapshot) =>
        (snapshot.backupRestore!.recoveryPointObservedMinutes = 31),
      (snapshot: Phase8ReadinessSnapshot) =>
        (snapshot.configuration!.killSwitchReference =
          "evidence://registry/changed-kill-switch"),
      (snapshot: Phase8ReadinessSnapshot) =>
        (snapshot.manifest!.attachmentCount = 2),
    ]) {
      const changed = structuredClone(fixture.snapshot);
      mutate(changed);
      expect(
        invalidateAuthorizationRequest({
          request,
          currentSnapshot: changed,
          currentContext: fixture.context,
          now: NOW,
        }).state,
      ).toBe("INVALIDATED");
    }

    const changedContext = {
      ...fixture.context,
      independentlyComputedEvidenceDigests: new Map(
        fixture.context.independentlyComputedEvidenceDigests,
      ),
    };
    changedContext.independentlyComputedEvidenceDigests.set(
      "EVIDENCE-CORE",
      "f".repeat(64),
    );
    expect(
      invalidateAuthorizationRequest({
        request,
        currentSnapshot: fixture.snapshot,
        currentContext: changedContext,
        now: NOW,
      }).state,
    ).toBe("INVALIDATED");
  });

  it("cannot enter production-authorized, cutover, hypercare or completed states", () => {
    for (const state of [
      "ProductionAuthorized",
      "CutoverRunning",
      "Hypercare",
      "Completed",
    ] as const) {
      expect(() => assertPhase8CutoverStateUnreachable(state)).toThrow(
        `PHASE8_CUTOVER_STATE_FORBIDDEN:${state}`,
      );
    }
    expect(() =>
      assertPhase8CutoverStateUnreachable("ReadyForProductionAuthorization"),
    ).not.toThrow();
  });

  it("creates redacted, tamper-evident audit events and rejects log injection", () => {
    const first = createPhase8AuditEvent({
      ...scope,
      eventId: "AUDIT-1",
      actorIdentityId: maker.identityId,
      action: "EVIDENCE_SUBMITTED",
      occurredAt: "2026-07-31T09:00:00.000Z",
      objectId: "EVIDENCE-CORE",
      outcome: "SUCCEEDED",
      safeDetailCode: "EVIDENCE_SUBMITTED",
      previousEventHash: null,
      safeDetail:
        ["postgresql", "://user:placeholder@database.invalid:6432/app", " token=placeholder"].join(
          "",
        ),
    });
    const second = createPhase8AuditEvent({
      ...scope,
      eventId: "AUDIT-2",
      actorIdentityId: checker.identityId,
      action: "EVIDENCE_REVIEWED",
      occurredAt: "2026-07-31T09:10:00.000Z",
      objectId: "EVIDENCE-CORE",
      outcome: "SUCCEEDED",
      safeDetailCode: "EVIDENCE_ACCEPTED",
      previousEventHash: first.eventHash,
    });
    expect(JSON.stringify(first)).not.toContain(
      ["postgresql", "://"].join(""),
    );
    expect(JSON.stringify(first)).not.toContain("placeholder");
    expect(verifyAuditChain([first, second])).toBe(true);
    expect(
      verifyAuditChain([{ ...first, outcome: "REJECTED" }, second]),
    ).toBe(false);
    expect(() =>
      createPhase8AuditEvent({
        ...first,
        action: "DELETE_LEDGER" as typeof first.action,
      }),
    ).toThrow("AUDIT_ACTION_INVALID");
    expect(() =>
      createPhase8AuditEvent({
        ...first,
        outcome: "AUTHORIZED" as typeof first.outcome,
      }),
    ).toThrow("AUDIT_OUTCOME_INVALID");
  });

  it("requires full scope, object and row-version predicates and exactly one updated row", () => {
    const command = {
      where: { ...scope, objectId: "EVIDENCE-CORE", expectedRowVersion: 1 },
      next: evidence(),
      actorIdentityId: maker.identityId,
      occurredAt: NOW.toISOString(),
    };
    expect(() =>
      assertAtomicPhase8Mutation({
        command,
        authorizedScope: scope,
        result: { count: 1 },
      }),
    ).not.toThrow();
    for (const count of [0, 2]) {
      expect(() =>
        assertAtomicPhase8Mutation({
          command,
          authorizedScope: scope,
          result: { count },
        }),
      ).toThrow("ATOMIC_MUTATION_COUNT_INVALID");
    }
    expect(() =>
      assertAtomicPhase8Mutation({
        command: {
          ...command,
          where: { ...command.where, legalEntityId: "ENTITY-PRODUCTION-2" },
        },
        authorizedScope: scope,
        result: { count: 1 },
      }),
    ).toThrow("PHASE8_MUTATION_SCOPE_MISMATCH");
    expect(() =>
      assertAtomicPhase8Mutation({
        command: {
          ...command,
          next: {
            ...command.next,
            legalEntityId: "ENTITY-PRODUCTION-2",
          },
        },
        authorizedScope: scope,
        result: { count: 1 },
      }),
    ).toThrow("PHASE8_MUTATION_PAYLOAD_SCOPE_MISMATCH");
  });
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("Accounting Phase 8 architecture boundaries", () => {
  it("contains no database client, external delivery, arbitrary SQL or direct financial writer", () => {
    const directory = resolve(
      process.cwd(),
      "src/modules/accounting/authorization-planning",
    );
    for (const path of sourceFiles(directory).filter((file) =>
      file.endsWith(".ts"),
    )) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toMatch(/from\s+["']@\/lib\/db["']/);
      expect(source).not.toMatch(/\b(?:fetch|axios)\s*\(/);
      expect(source).not.toMatch(/\$(?:queryRaw|executeRaw)(?:Unsafe)?/);
      expect(source).not.toMatch(
        /\b(?:generalLedgerEntry|journalEntryLine|journalEntry)\s*\.\s*(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/,
      );
    }
  });

  it("prevents client modules from importing internal authorization services", () => {
    for (const directory of ["src/app", "src/components"]) {
      for (const path of sourceFiles(resolve(process.cwd(), directory)).filter(
        (file) => /\.[cm]?[jt]sx?$/.test(file),
      )) {
        const source = readFileSync(path, "utf8");
        if (/^\s*["']use client["'];/m.test(source)) {
          expect(source).not.toMatch(
            /from\s+["']@\/modules\/accounting\/authorization-planning/,
          );
        }
      }
    }
  });
});

describe("Accounting Phase 8 independently named adversarial matrix", () => {
  it.each([
    ["loopback host", { databaseHostClassification: "LOOPBACK" } as const],
    ["staging host", { databaseHostClassification: "STAGING" } as const],
    ["development host", { databaseHostClassification: "DEVELOPMENT" } as const],
    ["guarded port 5432", { databasePort: 5432 } as const],
    ["single false enablement flag", { productionEnablementFlag: false } as const],
    ["single true enablement flag", { productionEnablementFlag: true } as const],
  ])("fails closed for configuration alias: %s", (_label, overrides) => {
    const valid = readyFixture();
    expect(
      validateProductionConfigurationDeclaration({
        declaration: configuration(overrides),
        scope,
        acceptedEvidenceIds: new Set(["EVIDENCE-CONFIGURATION"]),
        identities: valid.identities,
        now: NOW,
      }).ready,
    ).toBe(false);
  });

  it.each([
    "ProductionAuthorized",
    "CutoverRunning",
    "Hypercare",
    "Completed",
  ] as const)("rejects direct Phase 8 transition to %s", (state) => {
    expect(() => assertPhase8CutoverStateUnreachable(state)).toThrow();
  });

  it.each([
    ["formula injection", "=2+2"],
    ["path traversal", "../../manifest"],
    ["arbitrary SQL", "DELETE FROM journal"],
    ["serialized executable", "rO0ABXNy"],
  ])("rejects manifest %s", async (_label, maliciousValue) => {
    const result = await verifyRealSourceManifest({
      manifest: manifest({ mappingVersionReferences: [maliciousValue] }),
      expected: manifestExpectation(),
      now: NOW,
    });
    expect(result.issues).toContain("MANIFEST_EXECUTABLE_CONTENT_FORBIDDEN");
  });

  it.each([
    "SECURITY",
    "SCOPE_ISOLATION",
    "RECONCILIATION",
    "BACKUP_RESTORE",
    "CANONICAL_FINANCIAL_BOUNDARY",
    "STATUTORY",
  ] as const)("rejects waiver of non-waivable %s control", (controlClass) => {
    expect(
      validateReadinessException({
        exception: exception({ controlClass }),
        scope,
        maker,
        checker,
        owner: maker,
        acceptedEvidenceIds: new Set(["EVIDENCE-CORE"]),
        now: NOW,
      }).issues,
    ).toContain("EXCEPTION_CONTROL_NON_WAIVABLE");
  });

  it.each([0, 2])(
    "rejects atomic mutation result count %i",
    (count) => {
      expect(() =>
        assertAtomicPhase8Mutation({
          command: {
            where: {
              ...scope,
              objectId: "EVIDENCE-CORE",
              expectedRowVersion: 1,
            },
            next: evidence(),
            actorIdentityId: maker.identityId,
            occurredAt: NOW.toISOString(),
          },
          authorizedScope: scope,
          result: { count },
        }),
      ).toThrow("ATOMIC_MUTATION_COUNT_INVALID");
    },
  );
});
