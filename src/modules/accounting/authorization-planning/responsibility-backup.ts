import {
  PRODUCTION_RESPONSIBILITY_ROLES,
  type BackupRestoreCertification,
  type ProductionIdentity,
  type ProductionResponsibilityRole,
  type ProductionScope,
  type ResponsibilityAssignment,
} from "./types";
import {
  assertMakerChecker,
  assertPositiveRowVersion,
  assertProductionIdentity,
  assertProductionScope,
  assertSecureExternalReference,
  requireStableId,
  requireTimestamp,
} from "./shared";

const ROLE_CONFLICTS: ReadonlyArray<
  readonly [ProductionResponsibilityRole, ProductionResponsibilityRole]
> = [
  ["MIGRATION_OPERATOR", "INDEPENDENT_CHECKER"],
  ["BACKUP_RESTORE_OWNER", "INDEPENDENT_CHECKER"],
  ["ROLLBACK_AUTHORITY", "MIGRATION_OPERATOR"],
  ["STATUTORY_TAX_APPROVER", "MIGRATION_OPERATOR"],
  ["SECURITY_OWNER", "MIGRATION_OPERATOR"],
];
const RESPONSIBILITY_PERMISSION = "accounting.readiness.role";

export function validateResponsibilityMatrix(input: {
  assignments: readonly ResponsibilityAssignment[];
  identities: ReadonlyMap<string, ProductionIdentity>;
  scope: ProductionScope;
  now: Date;
}) {
  const issues: string[] = [];
  const byRole = new Map<ProductionResponsibilityRole, ResponsibilityAssignment>();
  const assignmentIds = new Set<string>();
  for (const assignment of input.assignments) {
    try {
      assertProductionScope(
        assignment,
        input.scope,
        "ROLE_ASSIGNMENT_SCOPE_MISMATCH",
      );
      requireStableId(assignment.assignmentId, "ROLE_ASSIGNMENT_ID_INVALID");
      requireStableId(assignment.identityId, "ROLE_IDENTITY_ID_INVALID");
      requireStableId(assignment.assignedByIdentityId, "ROLE_ASSIGNER_ID_INVALID");
      requireStableId(
        assignment.requiredPermission,
        "ROLE_REQUIRED_PERMISSION_INVALID",
      );
      if (
        !PRODUCTION_RESPONSIBILITY_ROLES.includes(
          assignment.role as ProductionResponsibilityRole,
        )
      ) {
        throw new Error("ROLE_ASSIGNMENT_ROLE_INVALID");
      }
      if (assignment.requiredPermission !== RESPONSIBILITY_PERMISSION) {
        throw new Error(`ROLE_REQUIRED_PERMISSION_INVALID:${assignment.role}`);
      }
      assertPositiveRowVersion(assignment.rowVersion);
      if (assignmentIds.has(assignment.assignmentId)) {
        throw new Error("ROLE_ASSIGNMENT_ID_DUPLICATE");
      }
      assignmentIds.add(assignment.assignmentId);
      if (byRole.has(assignment.role)) {
        throw new Error(`ROLE_ASSIGNMENT_DUPLICATE:${assignment.role}`);
      }
      byRole.set(assignment.role, assignment);
      const identity = input.identities.get(assignment.identityId);
      if (!identity) throw new Error(`ROLE_IDENTITY_MISSING:${assignment.role}`);
      assertProductionIdentity({
        identity,
        scope: input.scope,
        requiredPermission: assignment.requiredPermission,
        code: `ROLE_IDENTITY_INVALID:${assignment.role}`,
      });
      const assigner = input.identities.get(assignment.assignedByIdentityId);
      if (!assigner) {
        throw new Error(`ROLE_ASSIGNER_MISSING:${assignment.role}`);
      }
      assertProductionIdentity({
        identity: assigner,
        scope: input.scope,
        requiredPermission: "accounting.readiness.role.assign",
        code: `ROLE_ASSIGNER_INVALID:${assignment.role}`,
      });
      const assignedAt = requireTimestamp(
        assignment.assignedAt,
        `ROLE_ASSIGNED_AT_INVALID:${assignment.role}`,
      );
      const acknowledgedAt = requireTimestamp(
        assignment.acknowledgedAt,
        `ROLE_ACKNOWLEDGEMENT_REQUIRED:${assignment.role}`,
      );
      const validUntil = requireTimestamp(
        assignment.validUntil,
        `ROLE_EXPIRY_INVALID:${assignment.role}`,
      );
      if (
        assignedAt > acknowledgedAt ||
        acknowledgedAt > input.now ||
        validUntil <= input.now
      ) {
        throw new Error(`ROLE_DATE_WINDOW_INVALID:${assignment.role}`);
      }
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "ROLE_ASSIGNMENT_INVALID",
      );
    }
  }
  for (const role of PRODUCTION_RESPONSIBILITY_ROLES) {
    if (!byRole.has(role)) issues.push(`ROLE_REQUIRED_MISSING:${role}`);
  }
  for (const [left, right] of ROLE_CONFLICTS) {
    if (
      byRole.get(left)?.identityId &&
      byRole.get(left)?.identityId === byRole.get(right)?.identityId
    ) {
      issues.push(`ROLE_SEPARATION_CONFLICT:${left}:${right}`);
    }
  }
  return {
    ready: issues.length === 0,
    issues: [...new Set(issues)].sort(),
    assignmentsByRole: byRole,
  };
}

export function validateBackupRestoreCertification(input: {
  certification: BackupRestoreCertification;
  scope: ProductionScope;
  identities: ReadonlyMap<string, ProductionIdentity>;
  acceptedEvidenceIds: ReadonlySet<string>;
  now: Date;
}) {
  const issues: string[] = [];
  const requireEvidence = (evidenceId: string, code: string) => {
    if (!input.acceptedEvidenceIds.has(evidenceId)) issues.push(code);
  };
  try {
    assertProductionScope(
      input.certification,
      input.scope,
      "BACKUP_SCOPE_MISMATCH",
    );
    requireStableId(
      input.certification.certificationId,
      "BACKUP_CERTIFICATION_ID_INVALID",
    );
    if (
      !Number.isSafeInteger(input.certification.version) ||
      input.certification.version < 1
    ) {
      throw new Error("BACKUP_CERTIFICATION_VERSION_INVALID");
    }
    assertPositiveRowVersion(input.certification.rowVersion);
    assertSecureExternalReference(
      input.certification.backupScopeReference,
      "BACKUP_SCOPE_REFERENCE_INVALID",
    );
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "BACKUP_SCOPE_MISMATCH");
  }
  if (input.certification.evidenceOrigin !== "PRODUCTION_EXTERNAL") {
    issues.push("BACKUP_SYNTHETIC_EVIDENCE_FORBIDDEN");
  }
  if (
    !input.certification.databaseCovered ||
    !input.certification.attachmentsCovered
  ) {
    issues.push("BACKUP_COVERAGE_INCOMPLETE");
  }
  for (const [evidenceId, code] of [
    [input.certification.encryptionEvidenceId, "BACKUP_ENCRYPTION_EVIDENCE_REQUIRED"],
    [input.certification.retentionEvidenceId, "BACKUP_RETENTION_EVIDENCE_REQUIRED"],
    [
      input.certification.integrityVerificationEvidenceId,
      "BACKUP_INTEGRITY_EVIDENCE_REQUIRED",
    ],
    [
      input.certification.isolatedRestoreEvidenceId,
      "BACKUP_ISOLATED_RESTORE_EVIDENCE_REQUIRED",
    ],
    [
      input.certification.accountingConsistencyEvidenceId,
      "BACKUP_ACCOUNTING_CONSISTENCY_EVIDENCE_REQUIRED",
    ],
    [
      input.certification.attachmentConsistencyEvidenceId,
      "BACKUP_ATTACHMENT_CONSISTENCY_EVIDENCE_REQUIRED",
    ],
  ] as const) {
    try {
      requireStableId(evidenceId, code);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : code);
    }
    requireEvidence(evidenceId, code);
  }
  let backupTimestamp: Date | null = null;
  let restorationTimestamp: Date | null = null;
  let certifiedAt: Date | null = null;
  try {
    backupTimestamp = requireTimestamp(
      input.certification.backupTimestamp,
      "BACKUP_TIMESTAMP_INVALID",
    );
    restorationTimestamp = requireTimestamp(
      input.certification.restorationTimestamp,
      "RESTORATION_TIMESTAMP_INVALID",
    );
    certifiedAt = requireTimestamp(
      input.certification.certifiedAt,
      "BACKUP_CERTIFIED_AT_INVALID",
    );
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "BACKUP_DATE_INVALID");
  }
  if (
    !Number.isSafeInteger(input.certification.maximumBackupAgeMinutes) ||
    input.certification.maximumBackupAgeMinutes < 1 ||
    !backupTimestamp ||
    backupTimestamp > input.now ||
    input.now.getTime() - backupTimestamp.getTime() >
      input.certification.maximumBackupAgeMinutes * 60_000
  ) {
    issues.push("BACKUP_STALE");
  }
  if (
    !restorationTimestamp ||
    !backupTimestamp ||
    restorationTimestamp < backupTimestamp ||
    restorationTimestamp > input.now ||
    !certifiedAt ||
    certifiedAt < restorationTimestamp ||
    certifiedAt > input.now ||
    !input.certification.isolatedRestorePassed
  ) {
    issues.push("ISOLATED_RESTORE_NOT_VERIFIED");
  }
  if (
    !Number.isSafeInteger(input.certification.recoveryPointObjectiveMinutes) ||
    !Number.isSafeInteger(input.certification.recoveryPointObservedMinutes) ||
    input.certification.recoveryPointObjectiveMinutes < 1 ||
    input.certification.recoveryPointObservedMinutes < 0 ||
    input.certification.recoveryPointObservedMinutes >
      input.certification.recoveryPointObjectiveMinutes
  ) {
    issues.push("RPO_NOT_SATISFIED");
  }
  if (
    !Number.isSafeInteger(input.certification.recoveryTimeObjectiveMinutes) ||
    !Number.isSafeInteger(input.certification.recoveryTimeObservedMinutes) ||
    input.certification.recoveryTimeObjectiveMinutes < 1 ||
    input.certification.recoveryTimeObservedMinutes < 0 ||
    input.certification.recoveryTimeObservedMinutes >
      input.certification.recoveryTimeObjectiveMinutes
  ) {
    issues.push("RTO_NOT_SATISFIED");
  }
  if (
    !input.certification.accountingConsistencyPassed ||
    !input.certification.attachmentConsistencyPassed
  ) {
    issues.push("RESTORE_CONSISTENCY_NOT_VERIFIED");
  }
  const restoreOwner = input.identities.get(
    input.certification.restoreOwnerIdentityId,
  );
  const verifier = input.identities.get(
    input.certification.independentVerifierIdentityId,
  );
  const rollbackAuthority = input.identities.get(
    input.certification.rollbackAuthorityIdentityId,
  );
  try {
    if (!restoreOwner || !verifier || !rollbackAuthority) {
      throw new Error("BACKUP_RESPONSIBILITY_IDENTITY_MISSING");
    }
    assertProductionIdentity({
      identity: restoreOwner,
      scope: input.scope,
      requiredPermission: "accounting.readiness.backup.restore",
      code: "BACKUP_RESTORE_OWNER_INVALID",
    });
    assertProductionIdentity({
      identity: verifier,
      scope: input.scope,
      requiredPermission: "accounting.readiness.backup.verify",
      code: "BACKUP_VERIFIER_INVALID",
    });
    assertProductionIdentity({
      identity: rollbackAuthority,
      scope: input.scope,
      requiredPermission: "accounting.readiness.rollback.authorize",
      code: "BACKUP_ROLLBACK_AUTHORITY_INVALID",
    });
    assertMakerChecker(
      restoreOwner.identityId,
      verifier.identityId,
      "BACKUP_RESTORE_INDEPENDENCE_REQUIRED",
    );
  } catch (error) {
    issues.push(
      error instanceof Error
        ? error.message
        : "BACKUP_RESPONSIBILITY_IDENTITY_INVALID",
    );
  }
  if (
    input.certification.postedEffectsStrategy !==
    "CANONICAL_REVERSAL_CANCELLATION_OR_ADJUSTMENT_ONLY"
  ) {
    issues.push("POSTED_EFFECTS_CANONICAL_REVERSAL_REQUIRED");
  }
  return { ready: issues.length === 0, issues: [...new Set(issues)].sort() };
}
