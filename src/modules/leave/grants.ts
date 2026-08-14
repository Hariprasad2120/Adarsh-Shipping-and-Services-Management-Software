import { db } from "@/lib/db";
import { postLedgerEntry } from "@/modules/leave/ledger";
import { writeLeaveAudit } from "@/modules/leave/audit";
import { notify } from "@/lib/notify";

export interface CreateLeaveGrantInput {
  orgId: string;
  userId: string;
  leaveTypeId: string;
  amount: number;
  effectiveDate: Date;
  expiryDate?: Date | null;
  reason: string;
  grantedById: string;
  requiresApproval: boolean;
}

/**
 * Grant-based entitlement (spec §5C) — special leave (maternity, bereavement,
 * sabbatical, HR discretionary grants) credited on request rather than
 * accrued automatically.
 */
export async function createLeaveGrant(input: CreateLeaveGrantInput) {
  const grant = await db.leaveGrant.create({
    data: {
      orgId: input.orgId,
      userId: input.userId,
      leaveTypeId: input.leaveTypeId,
      amount: input.amount,
      effectiveDate: input.effectiveDate,
      expiryDate: input.expiryDate,
      reason: input.reason,
      grantedById: input.grantedById,
      status: input.requiresApproval ? "PENDING" : "APPROVED",
    },
  });

  if (!input.requiresApproval) {
    await postGrantToLedger(grant.id, input.grantedById);
  }

  return grant;
}

async function postGrantToLedger(grantId: string, actorId: string) {
  const grant = await db.leaveGrant.findUniqueOrThrow({ where: { id: grantId } });

  const entry = await postLedgerEntry({
    orgId: grant.orgId,
    userId: grant.userId,
    leaveTypeId: grant.leaveTypeId,
    type: "MANUAL_CREDIT",
    quantity: grant.amount,
    effectiveDate: grant.effectiveDate,
    year: grant.effectiveDate.getFullYear(),
    source: "ADMIN",
    actorId,
    reason: grant.reason,
    metadata: { leaveGrantId: grant.id },
    idempotencyKey: `grant:${grant.id}`,
  });

  await db.leaveGrant.update({ where: { id: grantId }, data: { status: "POSTED", ledgerEntryId: entry.id } });

  await notify({
    userId: grant.userId,
    orgId: grant.orgId,
    kind: "LEAVE_GRANT_POSTED",
    title: "Leave granted",
    body: `${grant.amount} unit(s) have been granted to your leave balance. Reason: ${grant.reason}`,
    link: "/attendance/leaves",
    payload: { leaveGrantId: grant.id },
  });

  return entry;
}

export async function approveLeaveGrant(grantId: string, approverId: string) {
  const grant = await db.leaveGrant.findUniqueOrThrow({ where: { id: grantId } });
  if (grant.status !== "PENDING") {
    throw new Error(`Cannot approve grant in status ${grant.status}`);
  }
  await db.leaveGrant.update({ where: { id: grantId }, data: { status: "APPROVED", approvedById: approverId } });
  await postGrantToLedger(grantId, approverId);

  await writeLeaveAudit({
    orgId: grant.orgId,
    userId: approverId,
    action: "LEAVE_GRANT_APPROVED",
    details: { leaveGrantId: grantId, amount: grant.amount },
  });

  return grant;
}

export async function rejectLeaveGrant(grantId: string, approverId: string, reason?: string) {
  const grant = await db.leaveGrant.update({
    where: { id: grantId },
    data: { status: "REJECTED", approvedById: approverId },
  });

  await writeLeaveAudit({
    orgId: grant.orgId,
    userId: approverId,
    action: "LEAVE_GRANT_REJECTED",
    details: { leaveGrantId: grantId, reason },
  });

  return grant;
}
