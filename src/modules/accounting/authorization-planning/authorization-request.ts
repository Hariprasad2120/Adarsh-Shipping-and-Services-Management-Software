import { addDecimalStrings } from "../operational-helpers";
import {
  REQUIRED_ACCOUNTING_POLICY_DECISIONS,
} from "../rollout/policy-register";
import type { AccountingCutoverState } from "../rollout/cutover-state-machine";
import {
  validateProductionConfigurationDeclaration,
  verifyRealSourceManifest,
} from "./configuration-manifest";
import {
  createAwaitingPhase8PolicyDecisions,
  validateEvidenceForGate,
  validatePolicyApproval,
} from "./evidence-policy";
import { validateReadinessException } from "./exceptions-audit";
import {
  validateBackupRestoreCertification,
  validateResponsibilityMatrix,
} from "./responsibility-backup";
import {
  assertMakerChecker,
  assertProductionIdentity,
  assertProductionScope,
  requireMaterialSha256,
  requireTimestamp,
  sha256,
} from "./shared";
import {
  PHASE8_READINESS_LOGIC_VERSION,
  type AuthorizationRequestPackage,
  type ManifestVerificationExpectation,
  type Phase8ReadinessSnapshot,
  type ProductionIdentity,
  type ProductionScope,
} from "./types";

export type Phase8VerificationContext = {
  now: Date;
  identities: ReadonlyMap<string, ProductionIdentity>;
  independentlyComputedEvidenceDigests: ReadonlyMap<string, string>;
  expectedEvidenceRequirements: ReadonlyMap<string, string>;
  manifestExpectation: ManifestVerificationExpectation | null;
};

export const REQUIRED_PHASE8_GATE_IDS = [
  "PRODUCTION_EVIDENCE",
  "POLICY_GOVERNANCE",
  "RESPONSIBILITY_ASSIGNMENTS",
  "BACKUP_RESTORE",
  "PRODUCTION_CONFIGURATION",
  "REAL_SOURCE_MANIFEST",
  "AUTHORIZATION_BOUNDARY",
] as const;

export function phase8ReadinessSnapshotDigest(
  snapshot: Phase8ReadinessSnapshot,
  context?: Phase8VerificationContext,
) {
  return sha256({
    snapshot,
    verificationDependencies: context
      ? {
          identities: [...context.identities.values()]
            .map((identity) => ({
              ...identity,
              legalEntityIds: [...identity.legalEntityIds].sort(),
              permissions: [...identity.permissions].sort(),
            }))
            .sort((left, right) =>
              left.identityId.localeCompare(right.identityId),
            ),
          independentlyComputedEvidenceDigests: [
            ...context.independentlyComputedEvidenceDigests,
          ].sort(([left], [right]) => left.localeCompare(right)),
          expectedEvidenceRequirements: [
            ...context.expectedEvidenceRequirements,
          ].sort(([left], [right]) => left.localeCompare(right)),
          manifestExpectation: context.manifestExpectation,
        }
      : null,
  });
}

export async function assessPhase8Readiness(
  snapshot: Phase8ReadinessSnapshot,
  context: Phase8VerificationContext,
) {
  const blockers: string[] = [];
  const scope: ProductionScope = {
    organizationId: snapshot.organizationId,
    legalEntityId: snapshot.legalEntityId,
    environment: snapshot.environment,
  };
  try {
    assertProductionScope(snapshot, scope);
    if (snapshot.readinessLogicVersion !== PHASE8_READINESS_LOGIC_VERSION) {
      throw new Error("READINESS_LOGIC_VERSION_UNSUPPORTED");
    }
    if (!/^[a-f0-9]{40}$/.test(snapshot.releaseCommit)) {
      throw new Error("RELEASE_COMMIT_INVALID");
    }
    if (Number.isNaN(context.now.getTime())) {
      throw new Error("READINESS_ASSESSMENT_TIME_INVALID");
    }
    requireMaterialSha256(
      snapshot.releaseArtifactDigest,
      "RELEASE_ARTIFACT_DIGEST_INVALID",
    );
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : "SNAPSHOT_INVALID");
  }

  if (snapshot.evidence.length === 0) blockers.push("EVIDENCE_MISSING");
  const validAcceptedEvidenceIds = new Set<string>();
  const evidenceIds = new Set<string>();
  const evidenceById = new Map(
    snapshot.evidence.map((evidence) => [evidence.evidenceId, evidence]),
  );
  for (const evidence of snapshot.evidence) {
    if (evidenceIds.has(evidence.evidenceId)) {
      blockers.push(`${evidence.evidenceId}:EVIDENCE_DUPLICATE`);
    }
    evidenceIds.add(evidence.evidenceId);
    const computedDigest =
      context.independentlyComputedEvidenceDigests.get(evidence.evidenceId) ?? "";
    const expectedRequirementId =
      context.expectedEvidenceRequirements.get(evidence.evidenceId);
    if (!expectedRequirementId) {
      blockers.push(`${evidence.evidenceId}:EVIDENCE_EXPECTED_REQUIREMENT_MISSING`);
    }
    const result = validateEvidenceForGate({
      evidence,
      expectedScope: scope,
      expectedRequirementId: expectedRequirementId ?? "MISSING-REQUIREMENT",
      independentlyComputedDigest: computedDigest,
      owner: context.identities.get(evidence.ownerIdentityId),
      submitter: context.identities.get(evidence.submittedByIdentityId),
      reviewer: evidence.reviewedByIdentityId
        ? context.identities.get(evidence.reviewedByIdentityId)
        : undefined,
      now: context.now,
    });
    if (result.valid) validAcceptedEvidenceIds.add(evidence.evidenceId);
    blockers.push(...result.issues.map((issue) => `${evidence.evidenceId}:${issue}`));
  }
  const acceptedEvidenceIds = validAcceptedEvidenceIds;

  const policyIds = new Set(snapshot.policies.map((decision) => decision.policyId));
  if (snapshot.policies.length !== REQUIRED_ACCOUNTING_POLICY_DECISIONS.length) {
    blockers.push("POLICY_REGISTER_CARDINALITY_INVALID");
  }
  if (policyIds.size !== snapshot.policies.length) {
    blockers.push("POLICY_REGISTER_DUPLICATE");
  }
  for (const policyId of REQUIRED_ACCOUNTING_POLICY_DECISIONS) {
    if (!policyIds.has(policyId)) blockers.push(`POLICY_MISSING:${policyId}`);
  }
  for (const decision of snapshot.policies) {
    const maker = decision.makerIdentityId
      ? context.identities.get(decision.makerIdentityId)
      : undefined;
    const checker = decision.checkerIdentityId
      ? context.identities.get(decision.checkerIdentityId)
      : undefined;
    const owner = decision.authoritativeOwnerIdentityId
      ? context.identities.get(decision.authoritativeOwnerIdentityId)
      : undefined;
    if (!maker || !checker || !owner) {
      blockers.push(`${decision.policyId}:POLICY_IDENTITIES_INCOMPLETE`);
      continue;
    }
    const result = validatePolicyApproval({
      decision,
      expectedScope: scope,
      maker,
      checker,
      owner,
      acceptedEvidenceIds,
      now: context.now,
    });
    blockers.push(
      ...result.issues.map((issue) => `${decision.policyId}:${issue}`),
    );
    for (const evidenceId of decision.supportingEvidenceIds) {
      if (evidenceById.get(evidenceId)?.requirementId !== "POLICY_GOVERNANCE") {
        blockers.push(
          `${decision.policyId}:POLICY_EVIDENCE_REQUIREMENT_MISMATCH`,
        );
      }
    }
  }

  const responsibility = validateResponsibilityMatrix({
    assignments: snapshot.assignments,
    identities: context.identities,
    scope,
    now: context.now,
  });
  blockers.push(...responsibility.issues);

  if (!snapshot.backupRestore) {
    blockers.push("BACKUP_RESTORE_CERTIFICATION_MISSING");
  } else {
    for (const [role, identityId] of [
      ["BACKUP_RESTORE_OWNER", snapshot.backupRestore.restoreOwnerIdentityId],
      [
        "INDEPENDENT_CHECKER",
        snapshot.backupRestore.independentVerifierIdentityId,
      ],
      ["ROLLBACK_AUTHORITY", snapshot.backupRestore.rollbackAuthorityIdentityId],
    ] as const) {
      if (responsibility.assignmentsByRole.get(role)?.identityId !== identityId) {
        blockers.push(`BACKUP_ROLE_ASSIGNMENT_MISMATCH:${role}`);
      }
    }
    for (const [evidenceId, requirementId] of [
      [snapshot.backupRestore.encryptionEvidenceId, "BACKUP_ENCRYPTION"],
      [snapshot.backupRestore.retentionEvidenceId, "BACKUP_RETENTION"],
      [
        snapshot.backupRestore.integrityVerificationEvidenceId,
        "BACKUP_INTEGRITY",
      ],
      [
        snapshot.backupRestore.isolatedRestoreEvidenceId,
        "BACKUP_RESTORE",
      ],
      [
        snapshot.backupRestore.accountingConsistencyEvidenceId,
        "BACKUP_ACCOUNTING_CONSISTENCY",
      ],
      [
        snapshot.backupRestore.attachmentConsistencyEvidenceId,
        "BACKUP_ATTACHMENT_CONSISTENCY",
      ],
    ] as const) {
      if (evidenceById.get(evidenceId)?.requirementId !== requirementId) {
        blockers.push(`BACKUP_EVIDENCE_REQUIREMENT_MISMATCH:${requirementId}`);
      }
    }
    blockers.push(
      ...validateBackupRestoreCertification({
        certification: snapshot.backupRestore,
        scope,
        identities: context.identities,
        acceptedEvidenceIds,
        now: context.now,
      }).issues,
    );
  }

  if (!snapshot.configuration) {
    blockers.push("CONFIGURATION_DECLARATION_MISSING");
  } else {
    if (
      snapshot.configuration.releaseArtifactDigest !==
      snapshot.releaseArtifactDigest
    ) {
      blockers.push("CONFIGURATION_RELEASE_DIGEST_MISMATCH");
    }
    blockers.push(
      ...validateProductionConfigurationDeclaration({
        declaration: snapshot.configuration,
        scope,
        acceptedEvidenceIds,
        identities: context.identities,
        now: context.now,
      }).issues,
    );
    for (const attestation of snapshot.configuration.ownerAttestations) {
      if (
        evidenceById.get(attestation.evidenceId)?.requirementId !==
        "PRODUCTION_CONFIGURATION"
      ) {
        blockers.push("CONFIGURATION_EVIDENCE_REQUIREMENT_MISMATCH");
      }
    }
  }

  let manifestDigest: string | null = null;
  if (!snapshot.manifest || !context.manifestExpectation) {
    blockers.push("REAL_SOURCE_MANIFEST_MISSING");
  } else {
    const manifest = await verifyRealSourceManifest({
      manifest: snapshot.manifest,
      expected: context.manifestExpectation,
      now: context.now,
    });
    manifestDigest = manifest.manifestDigest;
    blockers.push(...manifest.issues);
    const manifestEvidence =
      evidenceById.get(snapshot.manifest.makerAttestation.evidenceId);
    if (
      !manifestEvidence ||
      manifestEvidence.requirementId !== "REAL_SOURCE_MANIFEST" ||
      manifestEvidence.origin !== "PRODUCTION_EXTERNAL" ||
      !acceptedEvidenceIds.has(manifestEvidence.evidenceId)
    ) {
      blockers.push("MANIFEST_PRODUCTION_PROVENANCE_EVIDENCE_REQUIRED");
    }
    for (const [identityId, permission, code] of [
      [
        snapshot.manifest.extractionOperatorIdentityId,
        "accounting.readiness.manifest.extract",
        "MANIFEST_EXTRACTION_OPERATOR_INVALID",
      ],
      [
        snapshot.manifest.makerAttestation.ownerIdentityId,
        "accounting.readiness.manifest.attest",
        "MANIFEST_MAKER_INVALID",
      ],
      [
        snapshot.manifest.makerAttestation.checkerIdentityId,
        "accounting.readiness.manifest.review",
        "MANIFEST_CHECKER_INVALID",
      ],
    ] as const) {
      const identity = context.identities.get(identityId);
      try {
        if (!identity) throw new Error(code);
        assertProductionIdentity({
          identity,
          scope,
          requiredPermission: permission,
          code,
        });
      } catch (error) {
        blockers.push(error instanceof Error ? error.message : code);
      }
    }
  }

  for (const exception of snapshot.exceptions) {
    const maker = context.identities.get(exception.makerIdentityId);
    const checker = context.identities.get(exception.checkerIdentityId);
    const owner = context.identities.get(exception.ownerIdentityId);
    if (!maker || !checker || !owner) {
      blockers.push(`${exception.exceptionId}:EXCEPTION_IDENTITIES_INCOMPLETE`);
      continue;
    }
    const result = validateReadinessException({
      exception,
      scope,
      maker,
      checker,
      owner,
      acceptedEvidenceIds,
      now: context.now,
    });
    blockers.push(
      ...result.issues.map((issue) => `${exception.exceptionId}:${issue}`),
    );
  }
  for (const gate of snapshot.gates) {
    if (gate.critical && !gate.satisfied) {
      blockers.push(`CRITICAL_GATE_BLOCKED:${gate.gateId}:${gate.safeReason}`);
    }
  }
  const gateIds = new Set(snapshot.gates.map((gate) => gate.gateId));
  if (gateIds.size !== snapshot.gates.length) {
    blockers.push("CRITICAL_GATE_DUPLICATE");
  }
  for (const gateId of REQUIRED_PHASE8_GATE_IDS) {
    const gate = snapshot.gates.find((candidate) => candidate.gateId === gateId);
    if (!gate) {
      blockers.push(`CRITICAL_GATE_MISSING:${gateId}`);
    } else if (!gate.critical || !gate.satisfied) {
      blockers.push(`CRITICAL_GATE_NOT_SATISFIED:${gateId}`);
    }
  }
  return {
    ready: blockers.length === 0,
    blockers: [...new Set(blockers)].sort(),
    manifestDigest,
    snapshotDigest: phase8ReadinessSnapshotDigest(snapshot, context),
  };
}

export async function buildAuthorizationRequest(input: {
  snapshot: Phase8ReadinessSnapshot;
  context: Phase8VerificationContext;
  maker: ProductionIdentity;
  proposedIndependentChecker: ProductionIdentity;
  generatedAt: string;
  expiresAt: string;
}): Promise<AuthorizationRequestPackage> {
  const scope: ProductionScope = {
    organizationId: input.snapshot.organizationId,
    legalEntityId: input.snapshot.legalEntityId,
    environment: input.snapshot.environment,
  };
  assertProductionIdentity({
    identity: input.maker,
    scope,
    requiredPermission: "accounting.readiness.authorization-request.prepare",
    code: "AUTHORIZATION_REQUEST_MAKER_UNAUTHORIZED",
  });
  assertProductionIdentity({
    identity: input.proposedIndependentChecker,
    scope,
    requiredPermission: "accounting.readiness.authorization-request.review",
    code: "AUTHORIZATION_REQUEST_CHECKER_UNAUTHORIZED",
  });
  assertMakerChecker(
    input.maker.identityId,
    input.proposedIndependentChecker.identityId,
    "AUTHORIZATION_REQUEST_SELF_REVIEW_FORBIDDEN",
  );
  const generatedAt = requireTimestamp(
    input.generatedAt,
    "AUTHORIZATION_REQUEST_GENERATED_AT_INVALID",
  );
  const expiresAt = requireTimestamp(
    input.expiresAt,
    "AUTHORIZATION_REQUEST_EXPIRY_INVALID",
  );
  if (
    Number.isNaN(input.context.now.getTime()) ||
    generatedAt >= expiresAt ||
    generatedAt > input.context.now ||
    expiresAt <= input.context.now
  ) {
    throw new Error("AUTHORIZATION_REQUEST_DATE_WINDOW_INVALID");
  }

  const assessment = await assessPhase8Readiness(
    input.snapshot,
    input.context,
  );
  const state = assessment.ready
    ? ("AUTHORIZATION_REQUEST_READY" as const)
    : ("NOT_READY" as const);
  if (assessment.ready) {
    const dependencyExpiryTimes = [
      ...input.snapshot.evidence.map((item) =>
        requireTimestamp(item.validUntil, "EVIDENCE_VALID_UNTIL_INVALID").getTime(),
      ),
      ...input.snapshot.policies.map((decision) =>
        requireTimestamp(
          decision.reviewDate,
          "POLICY_REVIEW_DATE_INVALID",
        ).getTime(),
      ),
      ...input.snapshot.assignments.map((assignment) =>
        requireTimestamp(
          assignment.validUntil,
          "ROLE_EXPIRY_INVALID",
        ).getTime(),
      ),
      ...input.snapshot.exceptions.map((exception) =>
        requireTimestamp(
          exception.expiresAt,
          "EXCEPTION_EXPIRY_INVALID",
        ).getTime(),
      ),
      ...(input.snapshot.backupRestore
        ? [
            requireTimestamp(
              input.snapshot.backupRestore.backupTimestamp,
              "BACKUP_TIMESTAMP_INVALID",
            ).getTime() +
              input.snapshot.backupRestore.maximumBackupAgeMinutes * 60_000,
          ]
        : []),
      ...(input.snapshot.manifest
        ? [
            requireTimestamp(
              input.snapshot.manifest.extractionTimestamp,
              "MANIFEST_EXTRACTION_TIMESTAMP_INVALID",
            ).getTime() +
              input.snapshot.manifest.freshnessLimitMinutes * 60_000,
          ]
        : []),
    ];
    if (
      dependencyExpiryTimes.length === 0 ||
      expiresAt.getTime() > Math.min(...dependencyExpiryTimes)
    ) {
      throw new Error(
        "AUTHORIZATION_REQUEST_EXCEEDS_DEPENDENCY_VALIDITY",
      );
    }
  }
  const requestId = `p8-${sha256({
    scope,
    readinessSnapshotDigest: assessment.snapshotDigest,
    makerIdentityId: input.maker.identityId,
    generatedAt: input.generatedAt,
  }).slice(0, 40)}`;
  return {
    ...scope,
    requestId,
    state,
    releaseCommit: input.snapshot.releaseCommit,
    releaseArtifactDigest: input.snapshot.releaseArtifactDigest,
    approvedPolicyVersions: input.snapshot.policies
      .filter((decision) => decision.status === "APPROVED")
      .map((decision) => ({
        policyId: decision.policyId,
        version: decision.version,
      }))
      .sort((left, right) => left.policyId.localeCompare(right.policyId)),
    acceptedEvidenceVersions: input.snapshot.evidence
      .filter((evidence) => evidence.reviewStatus === "ACCEPTED")
      .map((evidence) => ({
        evidenceId: evidence.evidenceId,
        version: evidence.version,
      }))
      .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId)),
    configurationDeclarationVersion: input.snapshot.configuration?.version ?? null,
    realSourceManifestDigest: assessment.manifestDigest,
    roleAssignments: input.snapshot.assignments
      .map((assignment) => ({
        role: assignment.role,
        assignmentId: assignment.assignmentId,
        rowVersion: assignment.rowVersion,
      }))
      .sort((left, right) => left.role.localeCompare(right.role)),
    openRisksAndExceptions: input.snapshot.exceptions.map((exception) => ({
      exceptionId: exception.exceptionId,
      controlId: exception.controlId,
      status: exception.status,
    })),
    goNoGoAssessment: assessment.ready
      ? "AUTHORIZATION_REQUEST_READY"
      : "NO_GO",
    blockers: assessment.blockers,
    generatedAt: input.generatedAt,
    expiresAt: input.expiresAt,
    makerIdentityId: input.maker.identityId,
    proposedIndependentCheckerIdentityId:
      input.proposedIndependentChecker.identityId,
    readinessSnapshotDigest: assessment.snapshotDigest,
    productionAuthorizationGranted: false,
    cutoverExecutionAvailable: false,
  };
}

export function invalidateAuthorizationRequest(input: {
  request: AuthorizationRequestPackage;
  currentSnapshot: Phase8ReadinessSnapshot;
  currentContext: Phase8VerificationContext;
  now: Date;
}): AuthorizationRequestPackage {
  const currentDigest = phase8ReadinessSnapshotDigest(
    input.currentSnapshot,
    input.currentContext,
  );
  const expiresAt = new Date(input.request.expiresAt);
  const expired =
    Number.isNaN(expiresAt.getTime()) || expiresAt <= input.now;
  if (
    input.request.readinessSnapshotDigest === currentDigest &&
    !expired
  ) {
    return input.request;
  }
  return {
    ...input.request,
    state: "INVALIDATED",
    goNoGoAssessment: "NO_GO",
    blockers: [
      ...(expired ? ["AUTHORIZATION_REQUEST_EXPIRED"] : []),
      ...(input.request.readinessSnapshotDigest !== currentDigest
        ? ["AUTHORIZATION_REQUEST_DEPENDENCY_CHANGED"]
        : []),
    ],
    productionAuthorizationGranted: false,
    cutoverExecutionAvailable: false,
  };
}

const PHASE8_FORBIDDEN_CUTOVER_STATES = new Set<AccountingCutoverState>([
  "ProductionAuthorized",
  "CutoverRunning",
  "Hypercare",
  "Completed",
]);

export function assertPhase8CutoverStateUnreachable(
  state: AccountingCutoverState,
) {
  if (PHASE8_FORBIDDEN_CUTOVER_STATES.has(state)) {
    throw new Error(`PHASE8_CUTOVER_STATE_FORBIDDEN:${state}`);
  }
}

export function createDefaultPhase8Snapshot(
  scope: ProductionScope,
): Phase8ReadinessSnapshot {
  return {
    ...scope,
    readinessLogicVersion: PHASE8_READINESS_LOGIC_VERSION,
    releaseCommit: "7848ec22b21288ac927271fd73ed927319b96269",
    releaseArtifactDigest: "0".repeat(64),
    evidence: [],
    policies: createAwaitingPhase8PolicyDecisions(scope),
    assignments: [],
    backupRestore: null,
    configuration: null,
    manifest: null,
    exceptions: [],
    gates: [
      {
        gateId: "PRODUCTION_EVIDENCE",
        critical: true,
        satisfied: false,
        safeReason: "Accepted production evidence is missing.",
      },
      {
        gateId: "POLICY_GOVERNANCE",
        critical: true,
        satisfied: false,
        safeReason: "All 20 policy decisions await authorized human decisions.",
      },
      {
        gateId: "RESPONSIBILITY_ASSIGNMENTS",
        critical: true,
        satisfied: false,
        safeReason: "Production roles are unassigned.",
      },
      {
        gateId: "BACKUP_RESTORE",
        critical: true,
        satisfied: false,
        safeReason: "Independent backup and isolated restore evidence is missing.",
      },
      {
        gateId: "PRODUCTION_CONFIGURATION",
        critical: true,
        satisfied: false,
        safeReason: "No independently attested configuration declaration exists.",
      },
      {
        gateId: "REAL_SOURCE_MANIFEST",
        critical: true,
        satisfied: false,
        safeReason: "No verified real-source manifest exists.",
      },
      {
        gateId: "AUTHORIZATION_BOUNDARY",
        critical: true,
        satisfied: true,
        safeReason:
          "Phase 8 can prepare requests only; production authorization and cutover remain unreachable.",
      },
    ],
  };
}

export function exactTotalsAreInternallyConsistent(input: {
  receiptPaymentTotal: string;
  allocatedTotal: string;
  unallocatedTotal: string;
}) {
  return (
    addDecimalStrings(input.allocatedTotal, input.unallocatedTotal) ===
    addDecimalStrings(input.receiptPaymentTotal)
  );
}
