import { db } from "@/lib/db";
import { writeLeaveAudit } from "@/modules/leave/audit";

export interface CreateDelegationInput {
  orgId: string;
  delegatorId: string;
  delegateId: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  reason?: string;
  createdById: string;
}

/**
 * Backup approver / delegation (spec §11). While a delegation is active,
 * any approval routed to the delegator resolves to the delegate instead —
 * see resolveActiveApprover() in approval.ts.
 */
export async function createDelegation(input: CreateDelegationInput) {
  if (input.delegatorId === input.delegateId) {
    throw new Error("Cannot delegate approvals to yourself.");
  }

  const delegation = await db.leaveApproverDelegation.create({
    data: {
      orgId: input.orgId,
      delegatorId: input.delegatorId,
      delegateId: input.delegateId,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      reason: input.reason,
      createdById: input.createdById,
    },
  });

  await writeLeaveAudit({
    orgId: input.orgId,
    userId: input.createdById,
    action: "LEAVE_APPROVAL_DELEGATION_CREATED",
    details: {
      delegationId: delegation.id,
      delegatorId: input.delegatorId,
      delegateId: input.delegateId,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
    },
  });

  return delegation;
}

export async function revokeDelegation(delegationId: string, actorId: string, actorOrgId: string) {
  const delegation = await db.leaveApproverDelegation.findUniqueOrThrow({ where: { id: delegationId } });
  if (delegation.orgId !== actorOrgId) {
    throw new Error("This delegation does not belong to your organisation.");
  }

  const updated = await db.leaveApproverDelegation.update({
    where: { id: delegationId },
    data: { revokedAt: new Date() },
  });

  await writeLeaveAudit({
    orgId: actorOrgId,
    userId: actorId,
    action: "LEAVE_APPROVAL_DELEGATION_REVOKED",
    details: { delegationId },
  });

  return updated;
}

/**
 * Resolves the effective approver for a given user at a given date: if an
 * active, non-revoked delegation covers that date, returns the delegate;
 * otherwise returns the original approver unchanged. Called at both
 * routing-materialization time (approval.ts) and decision time
 * (request.ts) so a delegation created after a request was submitted
 * still applies to who may act on it — unlike policy version (which is
 * pinned), delegation is meant to reflect "who can approve on my behalf
 * right now," not a frozen snapshot.
 */
export async function resolveActiveApprover(approverUserId: string, asOf: Date = new Date()): Promise<string> {
  const delegation = await db.leaveApproverDelegation.findFirst({
    where: {
      delegatorId: approverUserId,
      revokedAt: null,
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
    },
    orderBy: { createdAt: "desc" },
  });
  return delegation?.delegateId ?? approverUserId;
}

export async function listActiveDelegations(orgId: string, asOf: Date = new Date()) {
  return db.leaveApproverDelegation.findMany({
    where: {
      orgId,
      revokedAt: null,
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
    },
    include: {
      delegator: { select: { name: true } },
      delegate: { select: { name: true } },
    },
    orderBy: { effectiveFrom: "desc" },
  });
}
