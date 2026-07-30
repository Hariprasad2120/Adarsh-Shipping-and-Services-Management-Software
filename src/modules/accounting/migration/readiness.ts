export type ReadinessClassification =
  | "ready"
  | "incomplete"
  | "blocked by policy"
  | "blocked by configuration"
  | "blocked by data"
  | "not applicable";

export type AccountingReadinessSnapshot = {
  schemaConsistent: boolean;
  migrationsCurrent: boolean;
  requiredPermissionsPresent: boolean;
  organizationConfigured: boolean;
  legalEntitiesConfigured: boolean;
  numberSeriesConfigured: boolean;
  openPeriodsConfigured: boolean;
  accountMappingsComplete: boolean;
  currencyPolicyAccepted: boolean;
  exchangeRatePolicyAccepted: boolean;
  openingBalancePolicyAccepted: boolean;
  taxPolicyAccepted: boolean;
  depreciationPolicyAccepted: boolean;
  partnerPolicyAccepted: boolean;
  providersDisabled: boolean;
  schedulerState: "DISABLED" | "SYNTHETIC_STAGING_ONLY" | "LIVE";
  outboxUnsafeDestinations: number;
  migrationIncompleteBatches: number;
  backupVerified: boolean;
  unresolvedPolicyGates: string[];
};

export type AccountingReadinessCheck = {
  code: string;
  classification: ReadinessClassification;
  safeDetail: string;
};

const BOOLEAN_READINESS_FIELDS = [
  "schemaConsistent",
  "migrationsCurrent",
  "requiredPermissionsPresent",
  "organizationConfigured",
  "legalEntitiesConfigured",
  "numberSeriesConfigured",
  "openPeriodsConfigured",
  "accountMappingsComplete",
  "currencyPolicyAccepted",
  "exchangeRatePolicyAccepted",
  "openingBalancePolicyAccepted",
  "taxPolicyAccepted",
  "depreciationPolicyAccepted",
  "partnerPolicyAccepted",
  "providersDisabled",
  "backupVerified",
] as const;

export function parseAccountingReadinessSnapshot(
  value: unknown,
): AccountingReadinessSnapshot {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("READINESS_SNAPSHOT_INVALID");
  }
  const snapshot = value as Record<string, unknown>;
  for (const field of BOOLEAN_READINESS_FIELDS) {
    if (typeof snapshot[field] !== "boolean") {
      throw new Error(`READINESS_SNAPSHOT_FIELD_INVALID:${field}`);
    }
  }
  if (
    !["DISABLED", "SYNTHETIC_STAGING_ONLY", "LIVE"].includes(
      String(snapshot.schedulerState),
    )
  ) {
    throw new Error("READINESS_SNAPSHOT_FIELD_INVALID:schedulerState");
  }
  for (const field of [
    "outboxUnsafeDestinations",
    "migrationIncompleteBatches",
  ] as const) {
    if (
      !Number.isSafeInteger(snapshot[field]) ||
      Number(snapshot[field]) < 0
    ) {
      throw new Error(`READINESS_SNAPSHOT_FIELD_INVALID:${field}`);
    }
  }
  if (
    !Array.isArray(snapshot.unresolvedPolicyGates) ||
    snapshot.unresolvedPolicyGates.some(
      (entry) =>
        typeof entry !== "string" ||
        !/^[A-Z][A-Z0-9_]{2,63}$/.test(entry),
    )
  ) {
    throw new Error(
      "READINESS_SNAPSHOT_FIELD_INVALID:unresolvedPolicyGates",
    );
  }
  return snapshot as AccountingReadinessSnapshot;
}

function check(
  code: string,
  ready: boolean,
  blocked: ReadinessClassification,
  safeDetail: string,
): AccountingReadinessCheck {
  return {
    code,
    classification: ready ? "ready" : blocked,
    safeDetail,
  };
}

export function evaluateAccountingReadiness(
  snapshot: AccountingReadinessSnapshot,
): AccountingReadinessCheck[] {
  return [
    check("SCHEMA_CONSISTENCY", snapshot.schemaConsistent, "incomplete", "Schema consistency"),
    check("MIGRATIONS_CURRENT", snapshot.migrationsCurrent, "incomplete", "Migration history"),
    check("ACCOUNTING_PERMISSIONS", snapshot.requiredPermissionsPresent, "blocked by configuration", "Required Accounting permissions"),
    check("ORGANIZATION_CONFIGURATION", snapshot.organizationConfigured, "blocked by configuration", "Organization profile"),
    check("LEGAL_ENTITY_CONFIGURATION", snapshot.legalEntitiesConfigured, "blocked by configuration", "Legal entities"),
    check("NUMBER_SERIES_CONFIGURATION", snapshot.numberSeriesConfigured, "blocked by configuration", "Number series"),
    check("ACCOUNTING_PERIODS", snapshot.openPeriodsConfigured, "blocked by configuration", "Open accounting period"),
    check("ACCOUNT_MAPPINGS", snapshot.accountMappingsComplete, "blocked by data", "Account mappings"),
    check("CURRENCY_POLICY", snapshot.currencyPolicyAccepted, "blocked by policy", "Currency policy"),
    check("EXCHANGE_RATE_POLICY", snapshot.exchangeRatePolicyAccepted, "blocked by policy", "Exchange-rate policy"),
    check("OPENING_BALANCE_POLICY", snapshot.openingBalancePolicyAccepted, "blocked by policy", "Opening-balance policy"),
    check("TAX_POLICY", snapshot.taxPolicyAccepted, "blocked by policy", "Tax/statutory policy"),
    check("DEPRECIATION_POLICY", snapshot.depreciationPolicyAccepted, "blocked by policy", "Depreciation policy"),
    check("PARTNER_POLICY", snapshot.partnerPolicyAccepted, "blocked by policy", "Partner-transaction policy"),
    check("PROVIDER_STATE", snapshot.providersDisabled, "blocked by configuration", "Providers must remain disabled"),
    check(
      "SCHEDULER_STATE",
      snapshot.schedulerState === "DISABLED" ||
        snapshot.schedulerState === "SYNTHETIC_STAGING_ONLY",
      "blocked by configuration",
      "Scheduler ownership",
    ),
    check("OUTBOX_STATE", snapshot.outboxUnsafeDestinations === 0, "blocked by data", "Unsafe outbox destinations"),
    check("MIGRATION_STATUS", snapshot.migrationIncompleteBatches === 0, "incomplete", "Incomplete migration batches"),
    check("BACKUP_VERIFICATION", snapshot.backupVerified, "incomplete", "Backup verification evidence"),
    {
      code: "UNRESOLVED_POLICY_GATES",
      classification:
        snapshot.unresolvedPolicyGates.length === 0
          ? "ready"
          : "blocked by policy",
      safeDetail:
        snapshot.unresolvedPolicyGates.length === 0
          ? "No unresolved policy gates"
          : snapshot.unresolvedPolicyGates.join(", ").slice(0, 512),
    },
  ];
}

export function summarizeReadiness(checks: readonly AccountingReadinessCheck[]) {
  return {
    ready: checks.every(
      (entry) =>
        entry.classification === "ready" ||
        entry.classification === "not applicable",
    ),
    counts: checks.reduce<Record<ReadinessClassification, number>>(
      (counts, entry) => ({
        ...counts,
        [entry.classification]: counts[entry.classification] + 1,
      }),
      {
        ready: 0,
        incomplete: 0,
        "blocked by policy": 0,
        "blocked by configuration": 0,
        "blocked by data": 0,
        "not applicable": 0,
      },
    ),
    checks,
  };
}
