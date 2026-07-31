import {
  NON_WAIVABLE_CONTROL_CLASSES,
  type Phase8AuditEvent,
  type ProductionIdentity,
  type ProductionScope,
  type ReadinessException,
} from "./types";
import {
  SAFE_CODE_PATTERN,
  assertMakerChecker,
  assertPositiveRowVersion,
  assertProductionIdentity,
  assertProductionScope,
  requireStableId,
  requireText,
  requireTimestamp,
  safeIssue,
  sha256,
} from "./shared";

const READINESS_EXCEPTION_CONTROL_CLASSES = new Set([
  ...NON_WAIVABLE_CONTROL_CLASSES,
  "PERFORMANCE",
  "OPERATIONS",
  "DOCUMENTATION",
]);

export function validateReadinessException(input: {
  exception: ReadinessException;
  scope: ProductionScope;
  maker: ProductionIdentity;
  checker: ProductionIdentity;
  owner: ProductionIdentity;
  acceptedEvidenceIds: ReadonlySet<string>;
  now: Date;
}) {
  const issues: string[] = [];
  const attempt = (fn: () => void) => {
    try {
      fn();
    } catch (error) {
      issues.push(error instanceof Error ? error.message : "EXCEPTION_INVALID");
    }
  };
  attempt(() =>
    assertProductionScope(
      input.exception,
      input.scope,
      "EXCEPTION_SCOPE_MISMATCH",
    ),
  );
  if (!READINESS_EXCEPTION_CONTROL_CLASSES.has(input.exception.controlClass)) {
    issues.push("EXCEPTION_CONTROL_CLASS_INVALID");
  }
  attempt(() =>
    requireStableId(input.exception.exceptionId, "EXCEPTION_ID_INVALID"),
  );
  attempt(() =>
    requireStableId(input.exception.controlId, "EXCEPTION_CONTROL_ID_INVALID"),
  );
  if (
    !Number.isSafeInteger(input.exception.version) ||
    input.exception.version < 1
  ) {
    issues.push("EXCEPTION_VERSION_INVALID");
  }
  attempt(() => assertPositiveRowVersion(input.exception.rowVersion));
  if (
    NON_WAIVABLE_CONTROL_CLASSES.includes(
      input.exception.controlClass as (typeof NON_WAIVABLE_CONTROL_CLASSES)[number],
    )
  ) {
    issues.push("EXCEPTION_CONTROL_NON_WAIVABLE");
  }
  for (const [value, code] of [
    [input.exception.ownerIdentityId, "EXCEPTION_OWNER_REQUIRED"],
    [input.exception.rationale, "EXCEPTION_RATIONALE_REQUIRED"],
    [input.exception.impact, "EXCEPTION_IMPACT_REQUIRED"],
    [input.exception.compensatingControl, "EXCEPTION_COMPENSATING_CONTROL_REQUIRED"],
  ] as const) {
    attempt(() => requireText(value, code));
  }
  attempt(() =>
    assertProductionIdentity({
      identity: input.maker,
      scope: input.scope,
      code: "EXCEPTION_MAKER_INVALID",
    }),
  );
  attempt(() =>
    assertProductionIdentity({
      identity: input.owner,
      scope: input.scope,
      requiredPermission: "accounting.readiness.exception.own",
      code: "EXCEPTION_OWNER_UNAUTHORIZED",
    }),
  );
  attempt(() =>
    assertProductionIdentity({
      identity: input.checker,
      scope: input.scope,
      requiredPermission: "accounting.readiness.exception.review",
      code: "EXCEPTION_CHECKER_UNAUTHORIZED",
    }),
  );
  attempt(() =>
    assertMakerChecker(
      input.exception.makerIdentityId,
      input.exception.checkerIdentityId,
      "EXCEPTION_SELF_APPROVAL_FORBIDDEN",
    ),
  );
  if (
    input.exception.makerIdentityId !== input.maker.identityId ||
    input.exception.checkerIdentityId !== input.checker.identityId ||
    input.exception.ownerIdentityId !== input.owner.identityId
  ) {
    issues.push("EXCEPTION_IDENTITY_MISMATCH");
  }
  if (
    input.exception.evidenceIds.length === 0 ||
    input.exception.evidenceIds.some(
      (evidenceId) => !input.acceptedEvidenceIds.has(evidenceId),
    )
  ) {
    issues.push("EXCEPTION_ACCEPTED_EVIDENCE_REQUIRED");
  }
  let expiresAt: Date | null = null;
  let reviewedAt: Date | null = null;
  try {
    expiresAt = requireTimestamp(
      input.exception.expiresAt,
      "EXCEPTION_EXPIRY_INVALID",
    );
    reviewedAt = requireTimestamp(
      input.exception.reviewedAt,
      "EXCEPTION_REVIEWED_AT_INVALID",
    );
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "EXCEPTION_EXPIRY_INVALID");
  }
  if (
    !expiresAt ||
    expiresAt <= input.now ||
    !reviewedAt ||
    reviewedAt > input.now ||
    reviewedAt >= expiresAt
  ) {
    issues.push("EXCEPTION_DATE_WINDOW_INVALID");
  }
  if (
    input.exception.status !== "ACCEPTED" ||
    input.exception.revokedAt
  ) {
    issues.push("EXCEPTION_NOT_ACTIVE");
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)].sort() };
}

export type Phase8AuditEventInput = Omit<
  Phase8AuditEvent,
  "eventHash"
> & {
  safeDetail?: unknown;
};

const PHASE8_AUDIT_ACTIONS = new Set([
  "EVIDENCE_SUBMITTED",
  "EVIDENCE_REVIEWED",
  "EVIDENCE_REJECTED",
  "EVIDENCE_REVOKED",
  "POLICY_SUBMITTED",
  "POLICY_APPROVED",
  "POLICY_REJECTED",
  "POLICY_REVOKED",
  "ROLE_ASSIGNED",
  "ROLE_ACKNOWLEDGED",
  "CONFIGURATION_VERIFIED",
  "MANIFEST_VERIFIED",
  "AUTHORIZATION_REQUEST_CREATED",
  "AUTHORIZATION_REQUEST_INVALIDATED",
  "EXCEPTION_SUBMITTED",
  "EXCEPTION_DISPOSITION",
]);
const PHASE8_AUDIT_OUTCOMES = new Set(["SUCCEEDED", "REJECTED", "BLOCKED"]);

export function createPhase8AuditEvent(
  input: Phase8AuditEventInput,
): Phase8AuditEvent {
  assertProductionScope(input, input, "AUDIT_SCOPE_INVALID");
  requireStableId(input.eventId, "AUDIT_EVENT_ID_INVALID");
  requireStableId(input.actorIdentityId, "AUDIT_ACTOR_INVALID");
  requireStableId(input.objectId, "AUDIT_OBJECT_ID_INVALID");
  requireTimestamp(input.occurredAt, "AUDIT_TIMESTAMP_INVALID");
  if (!PHASE8_AUDIT_ACTIONS.has(input.action)) {
    throw new Error("AUDIT_ACTION_INVALID");
  }
  if (!PHASE8_AUDIT_OUTCOMES.has(input.outcome)) {
    throw new Error("AUDIT_OUTCOME_INVALID");
  }
  if (!SAFE_CODE_PATTERN.test(input.safeDetailCode)) {
    throw new Error("AUDIT_DETAIL_CODE_INVALID");
  }
  if (
    input.previousEventHash != null &&
    !/^[a-f0-9]{64}$/.test(input.previousEventHash)
  ) {
    throw new Error("AUDIT_PREVIOUS_HASH_INVALID");
  }
  const safeDetailCode = safeIssue(input.safeDetailCode);
  const material = {
    eventId: input.eventId,
    organizationId: input.organizationId,
    legalEntityId: input.legalEntityId,
    environment: input.environment,
    actorIdentityId: input.actorIdentityId,
    action: input.action,
    occurredAt: input.occurredAt,
    objectId: input.objectId,
    outcome: input.outcome,
    safeDetailCode,
    previousEventHash: input.previousEventHash,
  };
  return {
    ...material,
    eventHash: sha256(material),
  };
}

export function verifyAuditChain(events: readonly Phase8AuditEvent[]) {
  let previous: string | null = null;
  for (const event of events) {
    if (event.previousEventHash !== previous) return false;
    const expected = createPhase8AuditEvent({
      ...event,
      safeDetail: undefined,
    });
    if (event.eventHash !== expected.eventHash) return false;
    previous = event.eventHash;
  }
  return true;
}

export const PHASE8_DISCONNECTED_ALERT_DEFINITIONS = [
  {
    code: "P8-EVIDENCE-INTEGRITY",
    safeCondition: "Evidence digest or verification mismatch",
    deliveryConnected: false,
  },
  {
    code: "P8-AUTHORIZATION-REQUEST-INVALIDATED",
    safeCondition: "Prepared request dependency changed",
    deliveryConnected: false,
  },
  {
    code: "P8-SCOPE-VIOLATION",
    safeCondition: "Cross-organization or legal-entity reuse rejected",
    deliveryConnected: false,
  },
] as const;
