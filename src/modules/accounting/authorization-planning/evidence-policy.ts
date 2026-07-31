import {
  REQUIRED_ACCOUNTING_POLICY_DECISIONS,
} from "../rollout/policy-register";
import {
  assertMakerChecker,
  assertPositiveRowVersion,
  assertProductionIdentity,
  assertProductionScope,
  assertSecureExternalReference,
  requireMaterialSha256,
  requireStableId,
  requireText,
  requireTimestamp,
} from "./shared";
import type {
  GovernedPolicyDecision,
  ProductionEvidenceItem,
  ProductionIdentity,
  ProductionScope,
} from "./types";

export const EVIDENCE_REVIEW_PERMISSION =
  "accounting.readiness.evidence.review" as const;
export const POLICY_REVIEW_PERMISSION =
  "accounting.readiness.policy.review" as const;
export const POLICY_OWNER_PERMISSION =
  "accounting.readiness.policy.own" as const;

export function validateEvidenceForGate(input: {
  evidence: ProductionEvidenceItem;
  expectedScope: ProductionScope;
  expectedRequirementId: string;
  independentlyComputedDigest: string;
  owner: ProductionIdentity | undefined;
  submitter: ProductionIdentity | undefined;
  reviewer: ProductionIdentity | undefined;
  now: Date;
}): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const check = (fn: () => void) => {
    try {
      fn();
    } catch (error) {
      issues.push(error instanceof Error ? error.message : "EVIDENCE_INVALID");
    }
  };

  check(() =>
    assertProductionScope(
      input.evidence,
      input.expectedScope,
      "EVIDENCE_SCOPE_MISMATCH",
    ),
  );
  check(() => requireStableId(input.evidence.evidenceId, "EVIDENCE_ID_INVALID"));
  check(() =>
    requireStableId(input.evidence.evidenceType, "EVIDENCE_TYPE_INVALID"),
  );
  check(() =>
    requireStableId(input.evidence.requirementId, "EVIDENCE_REQUIREMENT_INVALID"),
  );
  if (input.evidence.requirementId !== input.expectedRequirementId) {
    issues.push("EVIDENCE_REQUIREMENT_SCOPE_MISMATCH");
  }
  if (
    !Number.isSafeInteger(input.evidence.version) ||
    input.evidence.version < 1
  ) {
    issues.push("EVIDENCE_VERSION_INVALID");
  }
  check(() => assertPositiveRowVersion(input.evidence.rowVersion));
  check(() =>
    requireMaterialSha256(input.evidence.contentDigest, "EVIDENCE_DIGEST_INVALID"),
  );
  check(() =>
    requireMaterialSha256(
      input.independentlyComputedDigest,
      "EVIDENCE_COMPUTED_DIGEST_INVALID",
    ),
  );
  if (input.evidence.contentDigest !== input.independentlyComputedDigest) {
    issues.push("EVIDENCE_DIGEST_MISMATCH");
  }
  check(() =>
    assertSecureExternalReference(input.evidence.secureExternalReference),
  );
  check(() =>
    requireText(
      input.evidence.issuingSystemOrAuthority,
      "EVIDENCE_ISSUER_REQUIRED",
      256,
    ),
  );
  check(() =>
    requireStableId(input.evidence.ownerIdentityId, "EVIDENCE_OWNER_INVALID"),
  );
  check(() => {
    if (!input.owner || input.owner.identityId !== input.evidence.ownerIdentityId) {
      throw new Error("EVIDENCE_OWNER_UNAUTHORIZED");
    }
    assertProductionIdentity({
      identity: input.owner,
      scope: input.expectedScope,
      code: "EVIDENCE_OWNER_UNAUTHORIZED",
    });
  });
  check(() =>
    requireStableId(
      input.evidence.submittedByIdentityId,
      "EVIDENCE_SUBMITTER_INVALID",
    ),
  );
  check(() => {
    if (
      !input.submitter ||
      input.submitter.identityId !== input.evidence.submittedByIdentityId
    ) {
      throw new Error("EVIDENCE_SUBMITTER_UNAUTHORIZED");
    }
    assertProductionIdentity({
      identity: input.submitter,
      scope: input.expectedScope,
      code: "EVIDENCE_SUBMITTER_UNAUTHORIZED",
    });
  });
  check(() =>
    requireText(
      input.evidence.retentionClassification,
      "EVIDENCE_RETENTION_REQUIRED",
      128,
    ),
  );
  check(() =>
    requireText(
      input.evidence.verificationMethod,
      "EVIDENCE_VERIFICATION_METHOD_REQUIRED",
      256,
    ),
  );

  let submittedAt: Date | null = null;
  let validFrom: Date | null = null;
  let validUntil: Date | null = null;
  let reviewedAt: Date | null = null;
  let verifiedAt: Date | null = null;
  try {
    submittedAt = requireTimestamp(
      input.evidence.submittedAt,
      "EVIDENCE_SUBMITTED_AT_INVALID",
    );
    validFrom = requireTimestamp(
      input.evidence.validFrom,
      "EVIDENCE_VALID_FROM_INVALID",
    );
    validUntil = requireTimestamp(
      input.evidence.validUntil,
      "EVIDENCE_VALID_UNTIL_INVALID",
    );
    reviewedAt = requireTimestamp(
      input.evidence.reviewedAt,
      "EVIDENCE_REVIEWED_AT_INVALID",
    );
    verifiedAt = requireTimestamp(
      input.evidence.verificationTimestamp,
      "EVIDENCE_VERIFIED_AT_INVALID",
    );
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "EVIDENCE_DATE_INVALID");
  }
  if (
    submittedAt &&
    validFrom &&
    validUntil &&
    (validFrom > validUntil ||
      submittedAt > input.now ||
      validFrom > input.now ||
      validUntil <= input.now ||
      !reviewedAt ||
      !verifiedAt ||
      reviewedAt < submittedAt ||
      reviewedAt > input.now ||
      verifiedAt < submittedAt ||
      verifiedAt > input.now)
  ) {
    issues.push("EVIDENCE_DATE_WINDOW_INVALID");
  }
  if (input.evidence.origin !== "PRODUCTION_EXTERNAL") {
    issues.push("EVIDENCE_NON_PRODUCTION_OR_PLACEHOLDER");
  }
  if (
    input.evidence.reviewStatus !== "ACCEPTED" ||
    input.evidence.revoked ||
    input.evidence.supersededByEvidenceId ||
    input.evidence.verificationResult !== "PASSED" ||
    !input.evidence.verificationTimestamp ||
    !input.evidence.reviewedByIdentityId ||
    !input.evidence.reviewedAt
  ) {
    issues.push("EVIDENCE_NOT_ACCEPTED_OR_ACTIVE");
  }
  check(() => {
    if (
      !input.reviewer ||
      input.reviewer.identityId !== input.evidence.reviewedByIdentityId
    ) {
      throw new Error("EVIDENCE_REVIEWER_UNAUTHORIZED");
    }
    assertProductionIdentity({
      identity: input.reviewer,
      scope: input.expectedScope,
      requiredPermission: EVIDENCE_REVIEW_PERMISSION,
      code: "EVIDENCE_REVIEWER_UNAUTHORIZED",
    });
  });
  if (
    input.evidence.reviewedByIdentityId ===
    input.evidence.submittedByIdentityId
  ) {
    issues.push("EVIDENCE_SELF_REVIEW_FORBIDDEN");
  }
  if (
    (!input.evidence.revoked &&
      (input.evidence.revokedAt || input.evidence.revocationReason)) ||
    (input.evidence.revoked &&
      (!input.evidence.revokedAt || !input.evidence.revocationReason))
  ) {
    issues.push("EVIDENCE_REVOCATION_STATE_INVALID");
  }
  if (input.evidence.reviewStatus === "REJECTED" && !input.evidence.rejectionReason) {
    issues.push("EVIDENCE_REJECTION_REASON_REQUIRED");
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)].sort() };
}

export function assertEvidenceAcceptance(input: {
  evidence: ProductionEvidenceItem;
  submitter: ProductionIdentity;
  reviewer: ProductionIdentity;
  expectedScope: ProductionScope;
  independentlyComputedDigest: string;
  reviewedAt: string;
  now: Date;
}): void {
  assertProductionScope(input.evidence, input.expectedScope, "EVIDENCE_SCOPE_MISMATCH");
  assertProductionIdentity({
    identity: input.submitter,
    scope: input.expectedScope,
    code: "EVIDENCE_SUBMITTER_UNAUTHORIZED",
  });
  if (input.submitter.identityId !== input.evidence.submittedByIdentityId) {
    throw new Error("EVIDENCE_SUBMITTER_UNAUTHORIZED");
  }
  assertProductionIdentity({
    identity: input.reviewer,
    scope: input.expectedScope,
    requiredPermission: EVIDENCE_REVIEW_PERMISSION,
    code: "EVIDENCE_REVIEWER_UNAUTHORIZED",
  });
  assertMakerChecker(
    input.evidence.submittedByIdentityId,
    input.reviewer.identityId,
    "EVIDENCE_SELF_REVIEW_FORBIDDEN",
  );
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(input.evidence.reviewStatus)) {
    throw new Error("EVIDENCE_REVIEW_STATE_INVALID");
  }
  if (input.evidence.origin !== "PRODUCTION_EXTERNAL") {
    throw new Error("EVIDENCE_PLACEHOLDER_ACCEPTANCE_FORBIDDEN");
  }
  if (input.evidence.revoked || input.evidence.supersededByEvidenceId) {
    throw new Error("EVIDENCE_INACTIVE");
  }
  assertSecureExternalReference(input.evidence.secureExternalReference);
  requireMaterialSha256(input.evidence.contentDigest, "EVIDENCE_DIGEST_INVALID");
  requireMaterialSha256(
    input.independentlyComputedDigest,
    "EVIDENCE_COMPUTED_DIGEST_INVALID",
  );
  if (input.evidence.contentDigest !== input.independentlyComputedDigest) {
    throw new Error("EVIDENCE_DIGEST_MISMATCH");
  }
  const reviewedAt = requireTimestamp(
    input.reviewedAt,
    "EVIDENCE_REVIEWED_AT_INVALID",
  );
  const submittedAt = requireTimestamp(
    input.evidence.submittedAt,
    "EVIDENCE_SUBMITTED_AT_INVALID",
  );
  if (reviewedAt < submittedAt || reviewedAt > input.now) {
    throw new Error("EVIDENCE_DATE_WINDOW_INVALID");
  }
}

export function createAwaitingPhase8PolicyDecisions(
  scope: ProductionScope,
): GovernedPolicyDecision[] {
  return REQUIRED_ACCOUNTING_POLICY_DECISIONS.map((policyId) => ({
    ...scope,
    policyId,
    version: 1,
    authoritativeOwnerIdentityId: null,
    decisionText: null,
    structuredSelection: null,
    rationale: null,
    effectiveDate: null,
    reviewDate: null,
    supportingEvidenceIds: [],
    makerIdentityId: null,
    checkerIdentityId: null,
    submittedAt: null,
    approvedAt: null,
    status: "AWAITING_DECISION",
    supersededByVersion: null,
    revokedAt: null,
    revocationReason: null,
    statutoryJurisdiction: null,
    sourceAuthorityReference: null,
    rowVersion: 1,
  }));
}

export function validatePolicyApproval(input: {
  decision: GovernedPolicyDecision;
  expectedScope: ProductionScope;
  maker: ProductionIdentity;
  checker: ProductionIdentity;
  owner: ProductionIdentity;
  acceptedEvidenceIds: ReadonlySet<string>;
  now: Date;
}): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const attempt = (fn: () => void) => {
    try {
      fn();
    } catch (error) {
      issues.push(error instanceof Error ? error.message : "POLICY_INVALID");
    }
  };
  attempt(() =>
    assertProductionScope(
      input.decision,
      input.expectedScope,
      "POLICY_SCOPE_MISMATCH",
    ),
  );
  attempt(() =>
    assertProductionIdentity({
      identity: input.maker,
      scope: input.expectedScope,
      code: "POLICY_MAKER_INVALID",
    }),
  );
  attempt(() =>
    assertProductionIdentity({
      identity: input.owner,
      scope: input.expectedScope,
      requiredPermission: POLICY_OWNER_PERMISSION,
      code: "POLICY_OWNER_UNAUTHORIZED",
    }),
  );
  attempt(() =>
    assertProductionIdentity({
      identity: input.checker,
      scope: input.expectedScope,
      requiredPermission: POLICY_REVIEW_PERMISSION,
      code: "POLICY_CHECKER_UNAUTHORIZED",
    }),
  );
  attempt(() =>
    assertMakerChecker(
      input.decision.makerIdentityId,
      input.decision.checkerIdentityId,
      "POLICY_SELF_APPROVAL_FORBIDDEN",
    ),
  );
  if (
    input.decision.makerIdentityId !== input.maker.identityId ||
    input.decision.checkerIdentityId !== input.checker.identityId ||
    input.decision.authoritativeOwnerIdentityId !== input.owner.identityId
  ) {
    issues.push("POLICY_APPROVAL_IDENTITY_MISMATCH");
  }
  attempt(() => requireStableId(input.decision.policyId, "POLICY_ID_INVALID"));
  if (!Number.isSafeInteger(input.decision.version) || input.decision.version < 1) {
    issues.push("POLICY_VERSION_INVALID");
  }
  attempt(() => assertPositiveRowVersion(input.decision.rowVersion));
  if (input.decision.status !== "APPROVED") {
    issues.push("POLICY_NOT_APPROVED");
  }
  if (
    !input.decision.decisionText?.trim() &&
    (!input.decision.structuredSelection ||
      Object.keys(input.decision.structuredSelection).length === 0)
  ) {
    issues.push("POLICY_DECISION_REQUIRED");
  }
  if (!input.decision.rationale?.trim()) {
    issues.push("POLICY_RATIONALE_REQUIRED");
  }
  if (
    input.decision.supportingEvidenceIds.length === 0 ||
    input.decision.supportingEvidenceIds.some(
      (evidenceId) => !input.acceptedEvidenceIds.has(evidenceId),
    )
  ) {
    issues.push("POLICY_ACCEPTED_EVIDENCE_REQUIRED");
  }
  let effectiveDate: Date | null = null;
  let reviewDate: Date | null = null;
  let submittedAt: Date | null = null;
  let approvedAt: Date | null = null;
  try {
    effectiveDate = requireTimestamp(
      input.decision.effectiveDate,
      "POLICY_EFFECTIVE_DATE_INVALID",
    );
    reviewDate = requireTimestamp(
      input.decision.reviewDate,
      "POLICY_REVIEW_DATE_INVALID",
    );
    submittedAt = requireTimestamp(
      input.decision.submittedAt,
      "POLICY_SUBMITTED_AT_INVALID",
    );
    approvedAt = requireTimestamp(
      input.decision.approvedAt,
      "POLICY_APPROVED_AT_INVALID",
    );
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "POLICY_DATE_INVALID");
  }
  if (
    effectiveDate &&
    reviewDate &&
    submittedAt &&
    approvedAt &&
    (effectiveDate >= reviewDate ||
      reviewDate <= input.now ||
      submittedAt > approvedAt ||
      approvedAt > input.now)
  ) {
    issues.push("POLICY_DATE_WINDOW_INVALID");
  }
  if (
    input.decision.policyId === "POL-TAX-STATUTORY-MIGRATION" &&
    (!input.decision.statutoryJurisdiction?.trim() ||
      !input.decision.sourceAuthorityReference)
  ) {
    issues.push("POLICY_STATUTORY_AUTHORITY_REQUIRED");
  }
  if (input.decision.sourceAuthorityReference) {
    attempt(() =>
      assertSecureExternalReference(
        input.decision.sourceAuthorityReference,
        "POLICY_SOURCE_AUTHORITY_REFERENCE_INVALID",
      ),
    );
  }
  if (
    input.decision.supersededByVersion ||
    input.decision.revokedAt ||
    ["EXPIRED", "SUPERSEDED", "REVOKED", "REJECTED"].includes(
      input.decision.status,
    )
  ) {
    issues.push("POLICY_INACTIVE");
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)].sort() };
}
