/**
 * Stage 2 — enterprise platform: approval policy configuration.
 *
 * A policy is keyed by (org, subjectType, scopeKey). `getEffectiveApprovalPolicy`
 * resolves the most specific active policy: an exact scopeKey match first, then
 * the org-wide default (empty scopeKey).
 */

import { db } from "@/lib/db";

export type ApproverMode = "PERMISSION" | "USER";

export type ApprovalStepInput = {
  level: number;
  approverMode: ApproverMode;
  permissionKey?: string | null;
  approverUserId?: string | null;
  requiredApprovals?: number;
};

export class ApprovalPolicyError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_STEP" | "NOT_FOUND" = "INVALID_STEP",
  ) {
    super(message);
    this.name = "ApprovalPolicyError";
  }
}

function validateSteps(steps: ApprovalStepInput[]) {
  if (steps.length === 0) {
    throw new ApprovalPolicyError("A policy needs at least one level.");
  }
  const sorted = [...steps].sort((a, b) => a.level - b.level);
  sorted.forEach((step, i) => {
    if (step.level !== i + 1) {
      throw new ApprovalPolicyError(`Levels must be 1..N with no gaps (got ${step.level} at position ${i + 1}).`);
    }
    if ((step.requiredApprovals ?? 1) < 1) {
      throw new ApprovalPolicyError(`Level ${step.level}: requiredApprovals must be >= 1.`);
    }
    if (step.approverMode === "PERMISSION" && !step.permissionKey) {
      throw new ApprovalPolicyError(`Level ${step.level}: permissionKey is required for PERMISSION mode.`);
    }
    if (step.approverMode === "USER" && !step.approverUserId) {
      throw new ApprovalPolicyError(`Level ${step.level}: approverUserId is required for USER mode.`);
    }
  });
  return sorted;
}

export async function upsertApprovalPolicy(input: {
  orgId: string;
  subjectType: string;
  scopeKey?: string;
  name: string;
  active?: boolean;
  requireDistinctApprover?: boolean;
  steps: ApprovalStepInput[];
}) {
  const scopeKey = input.scopeKey ?? "";
  const steps = validateSteps(input.steps);

  return db.$transaction(async (tx) => {
    const policy = await tx.approvalPolicy.upsert({
      where: {
        orgId_subjectType_scopeKey: {
          orgId: input.orgId,
          subjectType: input.subjectType,
          scopeKey,
        },
      },
      create: {
        orgId: input.orgId,
        subjectType: input.subjectType,
        scopeKey,
        name: input.name,
        active: input.active ?? true,
        requireDistinctApprover: input.requireDistinctApprover ?? true,
      },
      update: {
        name: input.name,
        active: input.active ?? true,
        requireDistinctApprover: input.requireDistinctApprover ?? true,
      },
    });

    await tx.approvalPolicyStep.deleteMany({ where: { policyId: policy.id } });
    await tx.approvalPolicyStep.createMany({
      data: steps.map((s) => ({
        policyId: policy.id,
        level: s.level,
        approverMode: s.approverMode,
        permissionKey: s.permissionKey ?? null,
        approverUserId: s.approverUserId ?? null,
        requiredApprovals: s.requiredApprovals ?? 1,
      })),
    });

    return tx.approvalPolicy.findUniqueOrThrow({
      where: { id: policy.id },
      include: { steps: { orderBy: { level: "asc" } } },
    });
  });
}

export async function listApprovalPolicies(orgId: string, subjectType?: string) {
  return db.approvalPolicy.findMany({
    where: { orgId, ...(subjectType ? { subjectType } : {}) },
    orderBy: [{ subjectType: "asc" }, { scopeKey: "asc" }],
    include: { steps: { orderBy: { level: "asc" } } },
  });
}

export async function deleteApprovalPolicy(id: string, orgId: string) {
  const found = await db.approvalPolicy.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!found) throw new ApprovalPolicyError("Policy not found.", "NOT_FOUND");
  return db.approvalPolicy.delete({ where: { id } });
}

/** Most specific active policy for a subject: exact scope first, then org-wide. */
export async function getEffectiveApprovalPolicy(
  orgId: string,
  subjectType: string,
  scopeKey = "",
) {
  const candidates = await db.approvalPolicy.findMany({
    where: {
      orgId,
      subjectType,
      active: true,
      scopeKey: scopeKey ? { in: [scopeKey, ""] } : "",
    },
    include: { steps: { orderBy: { level: "asc" } } },
  });
  if (candidates.length === 0) return null;
  return (
    candidates.find((p) => p.scopeKey === scopeKey) ??
    candidates.find((p) => p.scopeKey === "") ??
    null
  );
}
