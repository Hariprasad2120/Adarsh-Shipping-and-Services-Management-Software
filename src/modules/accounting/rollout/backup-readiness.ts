export type AccountingBackupReadinessSnapshot = {
  ownerRole: string | null;
  scopeReference: string | null;
  createdAt: string | null;
  maximumAgeMinutes: number | null;
  encrypted: boolean;
  restoreAccessAuthorizationReference: string | null;
  verificationEvidenceReference: string | null;
  retentionPolicyReference: string | null;
  recoveryPointObjectiveMinutes: number | null;
  recoveryTimeObjectiveMinutes: number | null;
  restoreRehearsalEvidenceReference: string | null;
  databaseAttachmentConsistencyVerified: boolean;
  rollbackDecisionAuthorityRole: string | null;
};

export function evaluateAccountingBackupReadiness(
  snapshot: AccountingBackupReadinessSnapshot,
  now = new Date(),
) {
  const checks: Array<{ code: string; ready: boolean }> = [];
  const add = (code: string, ready: boolean) => checks.push({ code, ready });
  add("BACKUP_OWNER", Boolean(snapshot.ownerRole?.trim()));
  add("BACKUP_SCOPE", Boolean(snapshot.scopeReference?.trim()));
  const createdAt = snapshot.createdAt ? new Date(snapshot.createdAt) : null;
  const maximumAge = snapshot.maximumAgeMinutes;
  add(
    "BACKUP_FRESHNESS",
    Boolean(
      createdAt &&
        !Number.isNaN(createdAt.getTime()) &&
        Number.isSafeInteger(maximumAge) &&
        Number(maximumAge) > 0 &&
        now.getTime() >= createdAt.getTime() &&
        now.getTime() - createdAt.getTime() <= Number(maximumAge) * 60_000,
    ),
  );
  add("BACKUP_ENCRYPTION", snapshot.encrypted);
  add(
    "RESTORE_ACCESS_AUTHORIZATION",
    Boolean(snapshot.restoreAccessAuthorizationReference?.trim()),
  );
  add(
    "BACKUP_VERIFICATION_EVIDENCE",
    Boolean(snapshot.verificationEvidenceReference?.trim()),
  );
  add(
    "BACKUP_RETENTION",
    Boolean(snapshot.retentionPolicyReference?.trim()),
  );
  add(
    "RECOVERY_POINT_OBJECTIVE",
    Number.isSafeInteger(snapshot.recoveryPointObjectiveMinutes) &&
      Number(snapshot.recoveryPointObjectiveMinutes) >= 0,
  );
  add(
    "RECOVERY_TIME_OBJECTIVE",
    Number.isSafeInteger(snapshot.recoveryTimeObjectiveMinutes) &&
      Number(snapshot.recoveryTimeObjectiveMinutes) > 0,
  );
  add(
    "RESTORE_REHEARSAL",
    Boolean(snapshot.restoreRehearsalEvidenceReference?.trim()),
  );
  add(
    "DATABASE_ATTACHMENT_CONSISTENCY",
    snapshot.databaseAttachmentConsistencyVerified,
  );
  add(
    "ROLLBACK_DECISION_AUTHORITY",
    Boolean(snapshot.rollbackDecisionAuthorityRole?.trim()),
  );
  return {
    ready: checks.every((check) => check.ready),
    classification: checks.every((check) => check.ready)
      ? ("ready" as const)
      : ("blocked by infrastructure" as const),
    failedCheckCodes: checks
      .filter((check) => !check.ready)
      .map((check) => check.code),
    checks,
  };
}
