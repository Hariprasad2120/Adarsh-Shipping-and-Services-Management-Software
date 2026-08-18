import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { writeLeaveAudit } from "@/modules/leave/audit";

function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export class PayrollLockedError extends Error {
  constructor(payrollMonth: Date) {
    super(
      `Payroll for ${payrollMonth.toISOString().slice(0, 7)} is already finalized/paid. ` +
        "LOP cannot be auto-written; use the existing payroll correction procedure.",
    );
    this.name = "PayrollLockedError";
  }
}

/**
 * Converts an approved leave request's LOP units into an EmployeeLop row
 * (spec §31). Respects payroll locks — if the org's PayrollBatch for the
 * affected month is FINALIZED or PAID, the write is refused rather than
 * silently corrupting closed payroll data (closes audit gap §8).
 */
export async function applyLopFromLeaveRequest(input: {
  orgId: string;
  userId: string;
  fromDate: Date;
  lopUnits: number;
  actorId: string;
  requestId: string;
}) {
  if (input.lopUnits <= 0) return null;

  const payrollMonth = firstOfMonth(input.fromDate);

  const batch = await db.payrollBatch.findUnique({
    where: { orgId_month: { orgId: input.orgId, month: payrollMonth } },
  });
  if (batch && (batch.status === "FINALIZED" || batch.status === "PAID")) {
    throw new PayrollLockedError(payrollMonth);
  }

  const existing = await db.employeeLop.findUnique({
    where: { userId_payrollMonth: { userId: input.userId, payrollMonth } },
  });

  const updated = existing
    ? await db.employeeLop.update({
        where: { id: existing.id },
        data: {
          lopDays: existing.lopDays + input.lopUnits,
          remarks: `${existing.remarks ?? ""}\nLOP ${input.lopUnits} from leave request ${input.requestId}`.trim(),
        },
      })
    : await db.employeeLop.create({
        data: {
          userId: input.userId,
          payrollMonth,
          lopDays: input.lopUnits,
          remarks: `LOP ${input.lopUnits} from leave request ${input.requestId}`,
          createdById: input.actorId,
        },
      });

  await writeLeaveAudit({
    orgId: input.orgId,
    userId: input.actorId,
    action: "LEAVE_LOP_APPLIED",
    details: { requestId: input.requestId, payrollMonth: payrollMonth.toISOString(), lopUnits: input.lopUnits },
  });

  return updated;
}

/**
 * Reverses previously-applied LOP when a leave request is cancelled after
 * approval. Same payroll-lock protection as the forward path.
 */
export async function reverseLopFromLeaveRequest(input: {
  orgId: string;
  userId: string;
  fromDate: Date;
  lopUnits: number;
  actorId: string;
  requestId: string;
}) {
  if (input.lopUnits <= 0) return null;

  const payrollMonth = firstOfMonth(input.fromDate);
  const batch = await db.payrollBatch.findUnique({
    where: { orgId_month: { orgId: input.orgId, month: payrollMonth } },
  });
  if (batch && (batch.status === "FINALIZED" || batch.status === "PAID")) {
    throw new PayrollLockedError(payrollMonth);
  }

  const existing = await db.employeeLop.findUnique({
    where: { userId_payrollMonth: { userId: input.userId, payrollMonth } },
  });
  if (!existing) return null;

  const updated = await db.employeeLop.update({
    where: { id: existing.id },
    data: {
      lopDays: Math.max(0, existing.lopDays - input.lopUnits),
      remarks: `${existing.remarks ?? ""}\nLOP reversal ${input.lopUnits} from cancelled request ${input.requestId}`.trim(),
    },
  });

  await writeLeaveAudit({
    orgId: input.orgId,
    userId: input.actorId,
    action: "LEAVE_LOP_REVERSED",
    details: { requestId: input.requestId, payrollMonth: payrollMonth.toISOString(), lopUnits: input.lopUnits },
  });

  return updated;
}

export interface PartialPaySlabBreakdown {
  payPercentage: number;
  units: number;
}

/**
 * Structured payroll contract for PARTIALLY_PAID leave (spec §17 closure-
 * pass finding): calculateLeaveRequest already computes the per-slab
 * pay-percentage breakdown (calculation.ts's partialPaySlabs application)
 * but nothing ever persisted or emitted it — the leave side's
 * responsibility stops at "here is the structured slab data", it does
 * NOT calculate salary amounts (that stays Payroll's job, per spec §16).
 * One row per request (unique on requestId), so approving the same
 * request twice — which shouldn't happen, but defensively — is a
 * safe upsert, not a duplicate insert. Respects the same payroll-lock
 * protection as LOP: refuses to write into a FINALIZED/PAID month.
 */
export async function applyPartialPayFromLeaveRequest(input: {
  orgId: string;
  userId: string;
  leaveTypeId: string;
  fromDate: Date;
  requestId: string;
  actorId: string;
  slabBreakdown: PartialPaySlabBreakdown[];
}) {
  if (input.slabBreakdown.length === 0) return null;
  const totalUnits = input.slabBreakdown.reduce((sum, s) => sum + s.units, 0);
  if (totalUnits <= 0) return null;

  const payrollMonth = firstOfMonth(input.fromDate);

  const batch = await db.payrollBatch.findUnique({
    where: { orgId_month: { orgId: input.orgId, month: payrollMonth } },
  });
  if (batch && (batch.status === "FINALIZED" || batch.status === "PAID")) {
    throw new PayrollLockedError(payrollMonth);
  }

  const record = await db.leavePartialPayRecord.upsert({
    where: { requestId: input.requestId },
    update: {
      slabBreakdown: input.slabBreakdown as unknown as Prisma.InputJsonValue,
      totalUnits: new Prisma.Decimal(totalUnits),
    },
    create: {
      orgId: input.orgId,
      userId: input.userId,
      leaveTypeId: input.leaveTypeId,
      payrollMonth,
      requestId: input.requestId,
      slabBreakdown: input.slabBreakdown as unknown as Prisma.InputJsonValue,
      totalUnits: new Prisma.Decimal(totalUnits),
      createdById: input.actorId,
    },
  });

  await writeLeaveAudit({
    orgId: input.orgId,
    userId: input.actorId,
    action: "LEAVE_PARTIAL_PAY_APPLIED",
    details: { requestId: input.requestId, payrollMonth: payrollMonth.toISOString(), slabBreakdown: input.slabBreakdown },
  });

  return record;
}

/** Reverses a partial-pay record when its leave request is cancelled after approval. Same payroll-lock protection. */
export async function reversePartialPayFromLeaveRequest(input: {
  orgId: string;
  requestId: string;
  actorId: string;
  fromDate: Date;
}) {
  const payrollMonth = firstOfMonth(input.fromDate);
  const batch = await db.payrollBatch.findUnique({
    where: { orgId_month: { orgId: input.orgId, month: payrollMonth } },
  });
  if (batch && (batch.status === "FINALIZED" || batch.status === "PAID")) {
    throw new PayrollLockedError(payrollMonth);
  }

  const existing = await db.leavePartialPayRecord.findUnique({ where: { requestId: input.requestId } });
  if (!existing) return null;

  await db.leavePartialPayRecord.delete({ where: { requestId: input.requestId } });

  await writeLeaveAudit({
    orgId: input.orgId,
    userId: input.actorId,
    action: "LEAVE_PARTIAL_PAY_REVERSED",
    details: { requestId: input.requestId, payrollMonth: payrollMonth.toISOString() },
  });

  return existing;
}
