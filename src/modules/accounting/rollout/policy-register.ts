export const ACCOUNTING_POLICY_REGISTER_VERSION =
  "accounting-rollout-policy-register/v1" as const;

export const REQUIRED_ACCOUNTING_POLICY_DECISIONS = [
  "POL-MIGRATION-EFFECTIVE-DATE",
  "POL-HISTORICAL-DEPTH",
  "POL-OPENING-BALANCES",
  "POL-OUTSTANDING-AR-AP",
  "POL-RETAINED-EARNINGS",
  "POL-FOREIGN-CURRENCY-BALANCES",
  "POL-EXCHANGE-RATE-SOURCE-TIMING",
  "POL-TAX-STATUTORY-MIGRATION",
  "POL-DEPRECIATION-TREATMENT",
  "POL-PARTNER-TRANSACTIONS",
  "POL-MIGRATED-MAKER-CHECKER",
  "POL-AUDIT-ACTOR-IDENTITY",
  "POL-NUMBER-SERIES-CONTINUATION",
  "POL-CLOSED-PERIOD-TREATMENT",
  "POL-SOURCE-SYSTEM-FREEZE",
  "POL-ATTACHMENT-RETENTION",
  "POL-PROVIDER-AUTHORITY-SYNC",
  "POL-ROLLBACK-CANONICAL-REVERSAL",
  "POL-FINANCIAL-RETENTION",
  "POL-OPERATIONAL-RETENTION",
] as const;

export type AccountingPolicyDecisionId =
  (typeof REQUIRED_ACCOUNTING_POLICY_DECISIONS)[number];

export type AccountingPolicyDecisionStatus =
  | "AWAITING_DECISION"
  | "AWAITING_EVIDENCE"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "NOT_APPLICABLE";

export type AccountingPolicyDecision = {
  id: AccountingPolicyDecisionId;
  description: string;
  affectedWorkflows: string[];
  permissibleChoices: string[];
  decisionOwnerRole: string;
  evidenceRequired: string[];
  status: AccountingPolicyDecisionStatus;
  approvalReference: string | null;
  effectiveDate: string | null;
  implementationImpact: string;
  verificationMethod: string;
  blockingSeverity: "CRITICAL" | "HIGH" | "MEDIUM";
};

export type AccountingPolicyDecisionRegister = {
  version: typeof ACCOUNTING_POLICY_REGISTER_VERSION;
  updatedAt: string;
  decisions: AccountingPolicyDecision[];
};

const STABLE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set<AccountingPolicyDecisionStatus>([
  "AWAITING_DECISION",
  "AWAITING_EVIDENCE",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "NOT_APPLICABLE",
]);

function requiredText(
  value: unknown,
  code: string,
  maximum = 1_024,
): string {
  if (typeof value !== "string") throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new Error(code);
  return normalized;
}

function requiredTextList(
  value: unknown,
  code: string,
  maximumEntries = 32,
): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > maximumEntries
  ) {
    throw new Error(code);
  }
  const values = value.map((entry) => requiredText(entry, code, 512));
  if (new Set(values).size !== values.length) throw new Error(code);
  return values;
}

export function parseAccountingPolicyDecisionRegister(
  value: unknown,
): AccountingPolicyDecisionRegister {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("POLICY_REGISTER_INVALID");
  }
  const register = value as Record<string, unknown>;
  if (register.version !== ACCOUNTING_POLICY_REGISTER_VERSION) {
    throw new Error("POLICY_REGISTER_VERSION_UNSUPPORTED");
  }
  const updatedAt = requiredText(
    register.updatedAt,
    "POLICY_REGISTER_UPDATED_AT_INVALID",
    64,
  );
  if (Number.isNaN(Date.parse(updatedAt))) {
    throw new Error("POLICY_REGISTER_UPDATED_AT_INVALID");
  }
  if (!Array.isArray(register.decisions)) {
    throw new Error("POLICY_REGISTER_DECISIONS_INVALID");
  }

  const requiredIds = new Set<string>(REQUIRED_ACCOUNTING_POLICY_DECISIONS);
  const seen = new Set<string>();
  const decisions = register.decisions.map((candidate) => {
    if (!candidate || Array.isArray(candidate) || typeof candidate !== "object") {
      throw new Error("POLICY_DECISION_INVALID");
    }
    const decision = candidate as Record<string, unknown>;
    const id = requiredText(decision.id, "POLICY_DECISION_ID_INVALID", 64);
    if (!requiredIds.has(id)) {
      throw new Error(`POLICY_DECISION_UNKNOWN:${id}`);
    }
    if (seen.has(id)) throw new Error(`POLICY_DECISION_DUPLICATE:${id}`);
    seen.add(id);
    if (!STATUSES.has(decision.status as AccountingPolicyDecisionStatus)) {
      throw new Error(`POLICY_DECISION_STATUS_INVALID:${id}`);
    }
    const status = decision.status as AccountingPolicyDecisionStatus;
    const approvalReference =
      decision.approvalReference == null
        ? null
        : requiredText(
            decision.approvalReference,
            `POLICY_DECISION_APPROVAL_REFERENCE_INVALID:${id}`,
            128,
          );
    const effectiveDate =
      decision.effectiveDate == null
        ? null
        : requiredText(
            decision.effectiveDate,
            `POLICY_DECISION_EFFECTIVE_DATE_INVALID:${id}`,
            10,
          );
    if (
      approvalReference != null &&
      !STABLE_REFERENCE.test(approvalReference)
    ) {
      throw new Error(`POLICY_DECISION_APPROVAL_REFERENCE_INVALID:${id}`);
    }
    if (
      effectiveDate != null &&
      (!ISO_DATE.test(effectiveDate) ||
        Number.isNaN(Date.parse(`${effectiveDate}T00:00:00.000Z`)) ||
        new Date(`${effectiveDate}T00:00:00.000Z`)
          .toISOString()
          .slice(0, 10) !== effectiveDate)
    ) {
      throw new Error(`POLICY_DECISION_EFFECTIVE_DATE_INVALID:${id}`);
    }
    if (
      (status === "APPROVED" || status === "NOT_APPLICABLE") &&
      (!approvalReference || !effectiveDate)
    ) {
      throw new Error(`POLICY_DECISION_APPROVAL_EVIDENCE_REQUIRED:${id}`);
    }
    return {
      id: id as AccountingPolicyDecisionId,
      description: requiredText(
        decision.description,
        `POLICY_DECISION_DESCRIPTION_REQUIRED:${id}`,
      ),
      affectedWorkflows: requiredTextList(
        decision.affectedWorkflows,
        `POLICY_DECISION_WORKFLOWS_REQUIRED:${id}`,
      ),
      permissibleChoices: requiredTextList(
        decision.permissibleChoices,
        `POLICY_DECISION_CHOICES_REQUIRED:${id}`,
      ),
      decisionOwnerRole: requiredText(
        decision.decisionOwnerRole,
        `POLICY_DECISION_OWNER_REQUIRED:${id}`,
        128,
      ),
      evidenceRequired: requiredTextList(
        decision.evidenceRequired,
        `POLICY_DECISION_EVIDENCE_REQUIRED:${id}`,
      ),
      status,
      approvalReference,
      effectiveDate,
      implementationImpact: requiredText(
        decision.implementationImpact,
        `POLICY_DECISION_IMPACT_REQUIRED:${id}`,
      ),
      verificationMethod: requiredText(
        decision.verificationMethod,
        `POLICY_DECISION_VERIFICATION_REQUIRED:${id}`,
      ),
      blockingSeverity: (() => {
        if (!["CRITICAL", "HIGH", "MEDIUM"].includes(String(decision.blockingSeverity))) {
          throw new Error(`POLICY_DECISION_SEVERITY_INVALID:${id}`);
        }
        return decision.blockingSeverity as "CRITICAL" | "HIGH" | "MEDIUM";
      })(),
    };
  });

  const missing = REQUIRED_ACCOUNTING_POLICY_DECISIONS.filter(
    (id) => !seen.has(id),
  );
  if (missing.length > 0) {
    throw new Error(`POLICY_DECISION_REQUIRED_MISSING:${missing.join(",")}`);
  }
  if (seen.size !== REQUIRED_ACCOUNTING_POLICY_DECISIONS.length) {
    throw new Error("POLICY_REGISTER_CARDINALITY_INVALID");
  }
  return {
    version: ACCOUNTING_POLICY_REGISTER_VERSION,
    updatedAt,
    decisions,
  };
}

export function summarizeAccountingPolicyDecisions(
  register: AccountingPolicyDecisionRegister,
) {
  const unresolved = register.decisions.filter(
    (decision) =>
      decision.status !== "APPROVED" &&
      decision.status !== "NOT_APPLICABLE",
  );
  const blocking = unresolved;
  return {
    ready: blocking.length === 0,
    total: register.decisions.length,
    approved: register.decisions.filter(
      (decision) => decision.status === "APPROVED",
    ).length,
    notApplicable: register.decisions.filter(
      (decision) => decision.status === "NOT_APPLICABLE",
    ).length,
    unresolvedDecisionIds: unresolved.map((decision) => decision.id).sort(),
    blockingDecisionIds: blocking.map((decision) => decision.id).sort(),
  };
}
