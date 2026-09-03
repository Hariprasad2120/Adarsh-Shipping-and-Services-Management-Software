/**
 * Stage 2 — enterprise platform: approval engine.
 *
 * Modules call `openApprovalRequest` when a business action needs sign-off and
 * `submitApprovalDecision` from the approver's UI. If the organisation has no
 * active policy for the subject type the request auto-approves, so a module can
 * route through the engine unconditionally.
 */

import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import {
  ApprovalRuleError,
  assertMayDecide,
  foldChain,
  type ApprovalAction,
  type DecisionShape,
} from "./decision";
import { getEffectiveApprovalPolicy } from "./policy";

export type OpenRequestInput = {
  orgId: string;
  subjectType: string;
  subjectId: string;
  requestedByUserId: string;
  scopeKey?: string;
  context?: Record<string, unknown>;
};

export type ApprovalRequestState = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  currentLevel: number;
  autoApproved: boolean;
};

/**
 * Open (or return the existing) approval request for a subject. Idempotent on
 * (org, subjectType, subjectId, scopeKey).
 */
export async function openApprovalRequest(input: OpenRequestInput): Promise<ApprovalRequestState> {
  const scopeKey = input.scopeKey ?? "";

  const existing = await db.approvalRequest.findUnique({
    where: {
      orgId_subjectType_subjectId_scopeKey: {
        orgId: input.orgId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        scopeKey,
      },
    },
  });
  if (existing) {
    return {
      id: existing.id,
      status: existing.status as ApprovalRequestState["status"],
      currentLevel: existing.currentLevel,
      autoApproved: existing.status === "APPROVED" && existing.policyId === null,
    };
  }

  const policy = await getEffectiveApprovalPolicy(input.orgId, input.subjectType, scopeKey);
  const autoApprove = !policy || policy.steps.length === 0;

  const created = await db.approvalRequest.create({
    data: {
      orgId: input.orgId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      scopeKey,
      policyId: policy?.id ?? null,
      status: autoApprove ? "APPROVED" : "PENDING",
      currentLevel: 1,
      requestedByUserId: input.requestedByUserId,
      context: (input.context ?? undefined) as object | undefined,
      decidedAt: autoApprove ? new Date() : null,
    },
  });

  return {
    id: created.id,
    status: created.status as ApprovalRequestState["status"],
    currentLevel: created.currentLevel,
    autoApproved: autoApprove,
  };
}

async function actorEligibleForStep(
  step: { approverMode: string; permissionKey: string | null; approverUserId: string | null },
  actorUserId: string,
): Promise<boolean> {
  if (step.approverMode === "USER") return step.approverUserId === actorUserId;
  if (step.approverMode === "PERMISSION") {
    return step.permissionKey ? can(actorUserId, step.permissionKey) : false;
  }
  return false;
}

export async function submitApprovalDecision(input: {
  requestId: string;
  actorUserId: string;
  action: ApprovalAction;
  note?: string;
}): Promise<ApprovalRequestState> {
  const { requestId, actorUserId, action, note } = input;

  const request = await db.approvalRequest.findUnique({
    where: { id: requestId },
    include: {
      decisions: true,
      // policy steps are loaded separately (policyId may be null)
    },
  });
  if (!request) throw new ApprovalRuleError("Approval request not found.", "NO_STEP");
  if (request.status !== "PENDING") {
    throw new ApprovalRuleError(`Request is already ${request.status.toLowerCase()}.`, "NOT_PENDING");
  }
  if (!request.policyId) {
    throw new ApprovalRuleError("Request has no policy to act on.", "NO_STEP");
  }

  const policy = await db.approvalPolicy.findUnique({
    where: { id: request.policyId },
    include: { steps: { orderBy: { level: "asc" } } },
  });
  if (!policy) throw new ApprovalRuleError("Approval policy was removed.", "NO_STEP");

  const step = policy.steps.find((s) => s.level === request.currentLevel);
  if (!step) throw new ApprovalRuleError("No step for the current level.", "NO_STEP");

  const priorDecisions: DecisionShape[] = request.decisions.map((d) => ({
    level: d.level,
    actorUserId: d.actorUserId,
    action: d.action as ApprovalAction,
  }));

  assertMayDecide({
    requireDistinctApprover: policy.requireDistinctApprover,
    requesterUserId: request.requestedByUserId,
    actorUserId,
    priorDecisionsThisRequest: priorDecisions,
    level: request.currentLevel,
  });

  if (!(await actorEligibleForStep(step, actorUserId))) {
    throw new ApprovalRuleError("You are not an eligible approver for this level.", "NOT_ELIGIBLE");
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.approvalDecision.create({
      data: { requestId, level: request.currentLevel, actorUserId, action, note: note ?? null },
    });

    const allDecisions: DecisionShape[] = [
      ...priorDecisions,
      { level: request.currentLevel, actorUserId, action },
    ];
    const folded = foldChain(policy.steps, allDecisions);

    return tx.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: folded.status,
        currentLevel: folded.currentLevel,
        decidedAt: folded.status === "PENDING" ? null : new Date(),
      },
    });
  });

  return {
    id: updated.id,
    status: updated.status as ApprovalRequestState["status"],
    currentLevel: updated.currentLevel,
    autoApproved: false,
  };
}

export async function cancelApprovalRequest(requestId: string, byUserId: string) {
  const request = await db.approvalRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ApprovalRuleError("Approval request not found.", "NO_STEP");
  if (request.status !== "PENDING") {
    throw new ApprovalRuleError(`Request is already ${request.status.toLowerCase()}.`, "NOT_PENDING");
  }
  if (request.requestedByUserId !== byUserId) {
    throw new ApprovalRuleError("Only the requester can cancel this request.", "NOT_ELIGIBLE");
  }
  return db.approvalRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED", decidedAt: new Date() },
  });
}

export async function getApprovalRequest(requestId: string) {
  return db.approvalRequest.findUnique({
    where: { id: requestId },
    include: { decisions: { orderBy: { createdAt: "asc" } } },
  });
}

/** Approval requests still awaiting a decision, optionally filtered by subject type. */
export async function listOpenApprovalRequests(orgId: string, subjectType?: string) {
  return db.approvalRequest.findMany({
    where: { orgId, status: "PENDING", ...(subjectType ? { subjectType } : {}) },
    orderBy: { createdAt: "asc" },
    include: { decisions: true },
  });
}
