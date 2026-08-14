import { db } from "@/lib/db";
import { postLedgerEntry } from "@/modules/leave/ledger";
import { writeLeaveAudit } from "@/modules/leave/audit";
import { notify } from "@/lib/notify";

export interface CreateCompOffCreditInput {
  orgId: string;
  userId: string;
  earnedDate: Date;
  sourceType: "WEEKEND_WORK" | "HOLIDAY_WORK" | "OVERTIME" | "MANUAL_GRANT";
  sourceOtRecordId?: string;
  units: number;
  unit?: "DAY" | "HOUR";
  expiresAt?: Date | null;
  requiresApproval: boolean;
}

/**
 * Records earned comp-off from attendance/OT (spec §23). If the policy
 * doesn't require approval, credits the ledger immediately against the
 * org's designated comp-off LeaveType; otherwise leaves it PENDING_APPROVAL
 * for approveCompOffCredit() to post later. sourceOtRecordId preserves the
 * attendance record that generated the entitlement.
 */
export async function createCompOffCredit(input: CreateCompOffCreditInput) {
  const credit = await db.compOffCredit.create({
    data: {
      orgId: input.orgId,
      userId: input.userId,
      earnedDate: input.earnedDate,
      sourceType: input.sourceType,
      sourceOtRecordId: input.sourceOtRecordId,
      units: input.units,
      unit: input.unit ?? "DAY",
      status: input.requiresApproval ? "PENDING_APPROVAL" : "APPROVED",
      expiresAt: input.expiresAt,
    },
  });

  if (!input.requiresApproval) {
    await postCompOffToLedger(credit.id);
  }

  return credit;
}

async function getCompOffLeaveType(orgId: string) {
  const leaveType = await db.leaveType.findFirst({ where: { orgId, isCompOffType: true } });
  if (!leaveType) {
    throw new Error(
      "No leave type is marked as the organisation's Compensatory Off type. An admin must create one and set isCompOffType.",
    );
  }
  return leaveType;
}

async function postCompOffToLedger(creditId: string) {
  const credit = await db.compOffCredit.findUniqueOrThrow({ where: { id: creditId } });
  const leaveType = await getCompOffLeaveType(credit.orgId);

  const entry = await postLedgerEntry({
    orgId: credit.orgId,
    userId: credit.userId,
    leaveTypeId: leaveType.id,
    type: "COMP_OFF_CREDIT",
    quantity: credit.units,
    unit: credit.unit as "DAY" | "HOUR",
    effectiveDate: credit.earnedDate,
    year: credit.earnedDate.getFullYear(),
    source: "SYSTEM",
    reason: `Comp-off earned for ${credit.sourceType} on ${credit.earnedDate.toDateString()}`,
    metadata: { compOffCreditId: credit.id, sourceOtRecordId: credit.sourceOtRecordId },
    idempotencyKey: `compoff-credit:${credit.id}`,
  });

  await db.compOffCredit.update({
    where: { id: creditId },
    data: { ledgerEntryId: entry.id },
  });

  await notify({
    userId: credit.userId,
    orgId: credit.orgId,
    kind: "COMP_OFF_CREDITED",
    title: "Compensatory off credited",
    body: `${credit.units} unit(s) of compensatory off credited for ${credit.earnedDate.toDateString()}.`,
    link: "/attendance/leaves",
    payload: { compOffCreditId: credit.id },
  });

  return entry;
}

export async function approveCompOffCredit(creditId: string, approverId: string) {
  const credit = await db.compOffCredit.findUniqueOrThrow({ where: { id: creditId } });
  if (credit.status !== "PENDING_APPROVAL") {
    throw new Error(`Cannot approve comp-off credit in status ${credit.status}`);
  }

  await db.compOffCredit.update({
    where: { id: creditId },
    data: { status: "APPROVED", approvedById: approverId },
  });

  await postCompOffToLedger(creditId);

  await writeLeaveAudit({
    orgId: credit.orgId,
    userId: approverId,
    action: "COMP_OFF_APPROVED",
    details: { compOffCreditId: creditId, units: credit.units },
  });

  return credit;
}

export async function rejectCompOffCredit(creditId: string, approverId: string, reason?: string) {
  const credit = await db.compOffCredit.update({
    where: { id: creditId },
    data: { status: "REJECTED", approvedById: approverId },
  });

  await writeLeaveAudit({
    orgId: credit.orgId,
    userId: approverId,
    action: "COMP_OFF_REJECTED",
    details: { compOffCreditId: creditId, reason },
  });

  return credit;
}

/**
 * Expires comp-off credits past their expiresAt that haven't been consumed,
 * posting COMP_OFF_EXPIRY ledger entries. Called by the scheduler
 * (Phase 8's /api/cron/leave-expiry).
 */
export async function expireStaleCompOffCredits(orgId: string, asOf: Date) {
  const stale = await db.compOffCredit.findMany({
    where: { orgId, status: "APPROVED", expiresAt: { lte: asOf } },
  });

  const leaveType = await getCompOffLeaveType(orgId).catch(() => null);
  if (!leaveType) return { processed: 0 };

  let processed = 0;
  for (const credit of stale) {
    await postLedgerEntry({
      orgId,
      userId: credit.userId,
      leaveTypeId: leaveType.id,
      type: "COMP_OFF_EXPIRY",
      quantity: -credit.units,
      unit: credit.unit as "DAY" | "HOUR",
      effectiveDate: asOf,
      year: asOf.getFullYear(),
      source: "SCHEDULER",
      reason: `Comp-off credit ${credit.id} expired`,
      idempotencyKey: `compoff-expiry:${credit.id}`,
      allowNegative: true,
    });
    await db.compOffCredit.update({ where: { id: credit.id }, data: { status: "EXPIRED" } });
    processed++;
  }
  return { processed };
}
