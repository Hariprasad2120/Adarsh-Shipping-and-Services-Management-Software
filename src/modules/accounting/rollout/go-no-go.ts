export const ACCOUNTING_ROLLOUT_GATE_CODES = [
  "ACCEPTED_CHECKPOINT",
  "CLEAN_REPOSITORY",
  "POLICY_APPROVAL",
  "CONFIGURATION_VALIDATION",
  "BACKUP_VERIFICATION",
  "MIGRATION_MANIFEST",
  "DRY_RUN",
  "REHEARSAL",
  "RECONCILIATION",
  "SECURITY",
  "PERFORMANCE",
  "OPERATIONAL_STAFFING",
  "MONITORING",
  "BUSINESS_ACCEPTANCE",
  "ROLLBACK_DECISION_AUTHORITY",
] as const;

export type AccountingRolloutGateCode =
  (typeof ACCOUNTING_ROLLOUT_GATE_CODES)[number];

export type AccountingRolloutGateClassification =
  | "ready"
  | "incomplete"
  | "blocked by policy"
  | "blocked by configuration"
  | "blocked by infrastructure"
  | "blocked by data"
  | "blocked by security"
  | "blocked by failed rehearsal"
  | "not applicable";

export type AccountingRolloutGate = {
  code: AccountingRolloutGateCode;
  classification: AccountingRolloutGateClassification;
  critical: boolean;
  evidenceReferences: string[];
  safeDetail: string;
};

const CLASSIFICATION_PRIORITY: AccountingRolloutGateClassification[] = [
  "blocked by security",
  "blocked by policy",
  "blocked by configuration",
  "blocked by infrastructure",
  "blocked by data",
  "blocked by failed rehearsal",
  "incomplete",
  "ready",
  "not applicable",
];

export function assessAccountingRolloutReadiness(
  gates: readonly AccountingRolloutGate[],
) {
  const byCode = new Map<AccountingRolloutGateCode, AccountingRolloutGate>();
  for (const gate of gates) {
    if (byCode.has(gate.code)) {
      throw new Error(`ROLLOUT_GATE_DUPLICATE:${gate.code}`);
    }
    if (
      gate.evidenceReferences.length === 0 ||
      gate.evidenceReferences.some(
        (reference) =>
          !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(reference),
      )
    ) {
      throw new Error(`ROLLOUT_GATE_EVIDENCE_REQUIRED_OR_INVALID:${gate.code}`);
    }
    byCode.set(gate.code, gate);
  }
  const missing = ACCOUNTING_ROLLOUT_GATE_CODES.filter(
    (code) => !byCode.has(code),
  );
  if (missing.length > 0) {
    throw new Error(`ROLLOUT_GATE_REQUIRED_MISSING:${missing.join(",")}`);
  }
  const unresolvedCritical = [...byCode.values()].filter(
    (gate) =>
      gate.critical &&
      gate.classification !== "ready" &&
      gate.classification !== "not applicable",
  );
  const primaryClassification =
    CLASSIFICATION_PRIORITY.find((classification) =>
      unresolvedCritical.some(
        (gate) => gate.classification === classification,
      ),
    ) ?? "ready";
  return {
    decision: unresolvedCritical.length === 0 ? ("GO" as const) : ("NO_GO" as const),
    ready: unresolvedCritical.length === 0,
    primaryClassification,
    unresolvedCriticalGateCodes: unresolvedCritical
      .map((gate) => gate.code)
      .sort(),
    counts: [...byCode.values()].reduce<
      Record<AccountingRolloutGateClassification, number>
    >(
      (counts, gate) => {
        counts[gate.classification] += 1;
        return counts;
      },
      {
        ready: 0,
        incomplete: 0,
        "blocked by policy": 0,
        "blocked by configuration": 0,
        "blocked by infrastructure": 0,
        "blocked by data": 0,
        "blocked by security": 0,
        "blocked by failed rehearsal": 0,
        "not applicable": 0,
      },
    ),
    gates: ACCOUNTING_ROLLOUT_GATE_CODES.map((code) => byCode.get(code)!),
  };
}
