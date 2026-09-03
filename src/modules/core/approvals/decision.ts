/**
 * Stage 2 — enterprise platform: approval-chain decision logic (PURE).
 *
 * No DB, no imports. Given the policy steps and the decisions recorded so far,
 * work out whether a level is cleared and what the request's overall status and
 * current level should be. The engine (`./engine`) owns persistence and
 * eligibility; this module owns the state machine so it can be unit-tested.
 */

export type ApprovalAction = "APPROVE" | "REJECT";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type LevelStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PolicyStepShape = {
  level: number;
  requiredApprovals: number;
};

export type DecisionShape = {
  level: number;
  actorUserId: string;
  action: ApprovalAction;
};

/** Outcome of a single level given the decisions recorded against it. */
export function levelStatus(
  step: PolicyStepShape,
  decisionsAtLevel: readonly DecisionShape[],
): LevelStatus {
  if (decisionsAtLevel.some((d) => d.action === "REJECT")) return "REJECTED";
  const distinctApprovers = new Set(
    decisionsAtLevel.filter((d) => d.action === "APPROVE").map((d) => d.actorUserId),
  );
  return distinctApprovers.size >= Math.max(step.requiredApprovals, 1)
    ? "APPROVED"
    : "PENDING";
}

/**
 * Fold the whole chain: walk levels in ascending order. A rejection anywhere
 * fails the request; every level must be APPROVED to move past it; clearing the
 * last level approves the request.
 *
 * Returns the status the request should now have and the level still awaiting
 * decisions (unchanged from the last pending level when still PENDING).
 */
export function foldChain(
  steps: readonly PolicyStepShape[],
  decisions: readonly DecisionShape[],
): { status: ApprovalStatus; currentLevel: number } {
  const ordered = [...steps].sort((a, b) => a.level - b.level);
  if (ordered.length === 0) return { status: "APPROVED", currentLevel: 1 };

  for (const step of ordered) {
    const atLevel = decisions.filter((d) => d.level === step.level);
    const st = levelStatus(step, atLevel);
    if (st === "REJECTED") return { status: "REJECTED", currentLevel: step.level };
    if (st === "PENDING") return { status: "PENDING", currentLevel: step.level };
  }
  return { status: "APPROVED", currentLevel: ordered[ordered.length - 1].level };
}

export class ApprovalRuleError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_PENDING"
      | "WRONG_LEVEL"
      | "NOT_ELIGIBLE"
      | "SELF_APPROVAL"
      | "ALREADY_DECIDED"
      | "NO_STEP" = "NOT_ELIGIBLE",
  ) {
    super(message);
    this.name = "ApprovalRuleError";
  }
}

/**
 * Enforce segregation of duties for a prospective decision. Throws
 * `ApprovalRuleError` when the actor may not act.
 */
export function assertMayDecide(params: {
  requireDistinctApprover: boolean;
  requesterUserId: string;
  actorUserId: string;
  priorDecisionsThisRequest: readonly DecisionShape[];
  level: number;
}): void {
  const { requireDistinctApprover, requesterUserId, actorUserId, priorDecisionsThisRequest, level } =
    params;

  if (
    priorDecisionsThisRequest.some((d) => d.level === level && d.actorUserId === actorUserId)
  ) {
    throw new ApprovalRuleError("You have already decided on this level.", "ALREADY_DECIDED");
  }

  if (!requireDistinctApprover) return;

  if (actorUserId === requesterUserId) {
    throw new ApprovalRuleError(
      "You cannot approve a request you raised.",
      "SELF_APPROVAL",
    );
  }
  if (priorDecisionsThisRequest.some((d) => d.actorUserId === actorUserId)) {
    throw new ApprovalRuleError(
      "You have already acted on this request at another level.",
      "SELF_APPROVAL",
    );
  }
}
