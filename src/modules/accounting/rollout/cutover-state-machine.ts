export const ACCOUNTING_CUTOVER_STATES = [
  "Draft",
  "AwaitingPolicy",
  "AwaitingTechnicalApproval",
  "AwaitingBusinessApproval",
  "ReadyForRehearsal",
  "RehearsalRunning",
  "RehearsalFailed",
  "RehearsalPassed",
  "ReadyForProductionAuthorization",
  "ProductionAuthorized",
  "CutoverRunning",
  "ReconciliationRequired",
  "VerificationRequired",
  "Hypercare",
  "Completed",
  "Aborted",
] as const;

export type AccountingCutoverState = (typeof ACCOUNTING_CUTOVER_STATES)[number];

const PHASE7_FORBIDDEN_STATES = new Set<AccountingCutoverState>([
  "ProductionAuthorized",
  "CutoverRunning",
  "Hypercare",
  "Completed",
]);

export const ACCOUNTING_CUTOVER_TRANSITIONS: Readonly<
  Record<AccountingCutoverState, readonly AccountingCutoverState[]>
> = {
  Draft: ["AwaitingPolicy", "Aborted"],
  AwaitingPolicy: ["AwaitingTechnicalApproval", "Aborted"],
  AwaitingTechnicalApproval: ["AwaitingBusinessApproval", "Aborted"],
  AwaitingBusinessApproval: ["ReadyForRehearsal", "Aborted"],
  ReadyForRehearsal: ["RehearsalRunning", "Aborted"],
  RehearsalRunning: ["RehearsalFailed", "RehearsalPassed", "Aborted"],
  RehearsalFailed: ["ReadyForRehearsal", "Aborted"],
  RehearsalPassed: ["ReadyForProductionAuthorization", "Aborted"],
  ReadyForProductionAuthorization: ["ProductionAuthorized", "Aborted"],
  ProductionAuthorized: ["CutoverRunning", "Aborted"],
  CutoverRunning: ["ReconciliationRequired", "Aborted"],
  ReconciliationRequired: ["VerificationRequired", "Aborted"],
  VerificationRequired: ["Hypercare", "Aborted"],
  Hypercare: ["Completed", "Aborted"],
  Completed: [],
  Aborted: [],
};

export type AccountingCutoverTransitionEvidence = {
  evidenceReferences: string[];
  authorizationReferences: string[];
  auditRecordReference: string;
  actorRole: string;
  occurredAt: string;
};

function validReference(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value);
}

export function transitionAccountingCutoverState(input: {
  current: AccountingCutoverState;
  next: AccountingCutoverState;
  phase: "PHASE7_PREPARATION" | "FUTURE_SEPARATELY_AUTHORIZED";
  evidence: AccountingCutoverTransitionEvidence;
}) {
  if (!ACCOUNTING_CUTOVER_TRANSITIONS[input.current].includes(input.next)) {
    throw new Error(`CUTOVER_TRANSITION_INVALID:${input.current}:${input.next}`);
  }
  if (
    input.phase === "PHASE7_PREPARATION" &&
    PHASE7_FORBIDDEN_STATES.has(input.next)
  ) {
    throw new Error(`CUTOVER_PHASE7_STATE_FORBIDDEN:${input.next}`);
  }
  if (
    input.evidence.evidenceReferences.length === 0 ||
    input.evidence.authorizationReferences.length === 0 ||
    !validReference(input.evidence.auditRecordReference) ||
    !input.evidence.evidenceReferences.every(validReference) ||
    !input.evidence.authorizationReferences.every(validReference) ||
    !input.evidence.actorRole.trim() ||
    Number.isNaN(Date.parse(input.evidence.occurredAt))
  ) {
    throw new Error("CUTOVER_TRANSITION_EVIDENCE_REQUIRED");
  }
  return {
    previousState: input.current,
    state: input.next,
    auditRecordReference: input.evidence.auditRecordReference,
    occurredAt: input.evidence.occurredAt,
  };
}
