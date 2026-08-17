import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { postLedgerEntry, toDecimal, CrossOrgAccessError } from "@/modules/leave/ledger";

export { CrossOrgAccessError } from "@/modules/leave/ledger";
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

/**
 * Approves a comp-off credit. actorOrgId is required and checked against
 * the credit's own orgId — requirePermission("attendance.leave.approve")
 * alone only proves the actor has SOME approve permission, not that this
 * specific credit belongs to their organisation; without this check any
 * approver in any org could mutate any other org's comp-off credit by ID
 * (found during the closure-pass authorization audit, §12/13).
 */
export async function approveCompOffCredit(creditId: string, approverId: string, actorOrgId: string) {
  const credit = await db.compOffCredit.findUniqueOrThrow({ where: { id: creditId } });
  if (credit.orgId !== actorOrgId) {
    throw new CrossOrgAccessError();
  }
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

export async function rejectCompOffCredit(
  creditId: string,
  approverId: string,
  actorOrgId: string,
  reason?: string,
) {
  const existing = await db.compOffCredit.findUniqueOrThrow({ where: { id: creditId } });
  if (existing.orgId !== actorOrgId) {
    throw new CrossOrgAccessError();
  }
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
 * Consumes approved comp-off credits FIFO (oldest earnedDate first) when a
 * leave request against the comp-off leave type is approved. Comp-off
 * balance is tracked at the aggregate LeaveBalance level (one ledger per
 * request), but expiry must act per-lot — without this, expireStaleCompOffCredits
 * would expire a credit's full original units even after some of it was
 * already spent, double-counting the spent portion as a negative-balance
 * expiry (found during the closure-pass comp-off-expiry review, spec §24).
 * Returns the lots touched so a rejection/cancellation can reverse the same
 * allocation exactly.
 */
export async function consumeCompOffFifo(orgId: string, userId: string, units: Prisma.Decimal | number) {
  let remaining = toDecimal(units);
  if (remaining.lessThanOrEqualTo(0)) return [];

  const lots = await db.compOffCredit.findMany({
    where: { orgId, userId, status: { in: ["APPROVED", "CONSUMED"] } },
    orderBy: { earnedDate: "asc" },
  });

  const touched: { creditId: string; unitsApplied: Prisma.Decimal }[] = [];
  for (const lot of lots) {
    if (remaining.lessThanOrEqualTo(0)) break;
    const available = toDecimal(lot.units).minus(toDecimal(lot.consumedUnits));
    if (available.lessThanOrEqualTo(0)) continue;

    const applied = Prisma.Decimal.min(available, remaining);
    const newConsumed = toDecimal(lot.consumedUnits).plus(applied);
    await db.compOffCredit.update({
      where: { id: lot.id },
      data: {
        consumedUnits: newConsumed,
        status: newConsumed.greaterThanOrEqualTo(toDecimal(lot.units)) ? "CONSUMED" : lot.status,
      },
    });
    touched.push({ creditId: lot.id, unitsApplied: applied });
    remaining = remaining.minus(applied);
  }
  return touched;
}

/** Reverses a prior FIFO consumption (leave rejected/cancelled) against the exact lots it was applied to. */
export async function releaseCompOffFifo(allocations: { creditId: string; unitsApplied: Prisma.Decimal | number | string }[]) {
  for (const alloc of allocations) {
    const lot = await db.compOffCredit.findUnique({ where: { id: alloc.creditId } });
    if (!lot) continue;
    const newConsumed = toDecimal(lot.consumedUnits).minus(toDecimal(alloc.unitsApplied));
    await db.compOffCredit.update({
      where: { id: alloc.creditId },
      data: {
        consumedUnits: newConsumed.lessThan(0) ? new Prisma.Decimal(0) : newConsumed,
        status: lot.status === "CONSUMED" ? "APPROVED" : lot.status,
      },
    });
  }
}

/**
 * Expires comp-off credits past their expiresAt that haven't been fully
 * consumed, posting COMP_OFF_EXPIRY ledger entries for only the unconsumed
 * remainder of each lot (units - consumedUnits), not the full original
 * grant. Called by the scheduler (Phase 8's /api/cron/leave-expiry).
 */
export async function expireStaleCompOffCredits(orgId: string, asOf: Date) {
  const stale = await db.compOffCredit.findMany({
    where: { orgId, status: { in: ["APPROVED", "CONSUMED"] }, expiresAt: { lte: asOf } },
  });

  const leaveType = await getCompOffLeaveType(orgId).catch(() => null);
  if (!leaveType) return { processed: 0 };

  let processed = 0;
  for (const credit of stale) {
    const remaining = toDecimal(credit.units).minus(toDecimal(credit.consumedUnits));
    if (remaining.lessThanOrEqualTo(0)) {
      // Fully consumed before expiry — nothing left to expire, just close out the lot.
      await db.compOffCredit.update({ where: { id: credit.id }, data: { status: "EXPIRED" } });
      continue;
    }
    await postLedgerEntry({
      orgId,
      userId: credit.userId,
      leaveTypeId: leaveType.id,
      type: "COMP_OFF_EXPIRY",
      quantity: remaining.negated(),
      unit: credit.unit as "DAY" | "HOUR",
      effectiveDate: asOf,
      year: asOf.getFullYear(),
      source: "SCHEDULER",
      reason: `Comp-off credit ${credit.id} expired (${remaining.toString()} of ${credit.units.toString()} unused)`,
      idempotencyKey: `compoff-expiry:${credit.id}`,
      allowNegative: true,
    });
    await db.compOffCredit.update({ where: { id: credit.id }, data: { status: "EXPIRED" } });
    processed++;
  }
  return { processed };
}

/**
 * Advance-warning notification for comp-off credits expiring within
 * `warningDays` (spec closure-pass notification-coverage gap: the expiry
 * cron only notified AFTER forfeiting units, never before, so an employee
 * had no chance to use them). NOT deduped — `notify()` has no built-in
 * dedup mechanism in this codebase (confirmed by reading
 * modules/notifications/service.ts), so running this daily means an
 * employee with a credit sitting inside the warning window gets one
 * notification per day until they use it or it expires. This matches the
 * existing, deliberate design of processApprovalReminders (recurring
 * reminders are acceptable for a live warning; only financial/ledger
 * postings must never double-post) — not a bug, a repeat of the same
 * accepted pattern.
 */
export async function notifyExpiringCompOffCredits(orgId: string, asOf: Date, warningDays: number) {
  const warningThreshold = new Date(asOf.getTime() + warningDays * 24 * 60 * 60 * 1000);

  const expiringSoon = await db.compOffCredit.findMany({
    where: {
      orgId,
      status: { in: ["APPROVED", "CONSUMED"] },
      expiresAt: { gt: asOf, lte: warningThreshold },
    },
  });

  let notified = 0;
  for (const credit of expiringSoon) {
    const remaining = toDecimal(credit.units).minus(toDecimal(credit.consumedUnits));
    if (remaining.lessThanOrEqualTo(0)) continue; // fully consumed already — nothing to warn about

    await notify({
      userId: credit.userId,
      orgId,
      kind: "COMP_OFF_EXPIRING_SOON",
      title: "Compensatory off expiring soon",
      body: `${remaining.toString()} unit(s) of compensatory off earned on ${credit.earnedDate.toDateString()} will expire on ${credit.expiresAt!.toDateString()} if unused.`,
      link: "/attendance/leaves",
      payload: { compOffCreditId: credit.id },
    });
    notified++;
  }
  return { notified };
}
