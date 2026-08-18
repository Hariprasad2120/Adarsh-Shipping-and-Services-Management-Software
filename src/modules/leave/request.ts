import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { notify, notifyMany } from "@/lib/notify";
import { getUsersWithPermission } from "@/modules/notifications/service";
import { getActivePolicyVersion, parsePolicyConfig } from "@/modules/leave/policy";
import { calculateLeaveRequest } from "@/modules/leave/calculation";
import { postLedgerEntry, toDecimal, CrossOrgAccessError } from "@/modules/leave/ledger";
import { consumeCompOffFifo, releaseCompOffFifo } from "@/modules/leave/compoff";
import { writeLeaveAudit } from "@/modules/leave/audit";
import { buildApprovalSteps } from "@/modules/leave/approval";
import { isPolicyApplicableToUser, isServiceEligible } from "@/modules/leave/eligibility";
import { validateRestrictions } from "@/modules/leave/restrictions";
import { applyLeaveToAttendance, removeLeaveFromAttendance } from "@/modules/leave/attendance-bridge";
import {
  applyLopFromLeaveRequest,
  reverseLopFromLeaveRequest,
  applyPartialPayFromLeaveRequest,
  reversePartialPayFromLeaveRequest,
  PayrollLockedError,
} from "@/modules/leave/payroll-bridge";

export type LeaveRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCEL_PENDING"
  | "CANCELLED"
  | "EXTENSION_PENDING"
  | "WITHDRAWN"
  | "EXPIRED";

// Legacy lowercase values already in production data map 1:1 onto the new
// state machine so existing rows remain valid without a backfill blocking
// this rollout (see ARCHITECTURE.md §10).
const LEGACY_STATUS_MAP: Record<string, LeaveRequestStatus> = {
  pending: "PENDING_APPROVAL",
  approved: "APPROVED",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
};

export function normalizeStatus(status: string): LeaveRequestStatus {
  return (LEGACY_STATUS_MAP[status] ?? status) as LeaveRequestStatus;
}

const TRANSITIONS: Record<LeaveRequestStatus, LeaveRequestStatus[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["PENDING_APPROVAL", "WITHDRAWN"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "WITHDRAWN"],
  APPROVED: ["CANCEL_PENDING", "EXTENSION_PENDING", "EXPIRED"],
  REJECTED: [],
  CANCEL_PENDING: ["CANCELLED", "APPROVED"], // rejection of the cancellation reverts to APPROVED
  CANCELLED: [],
  EXTENSION_PENDING: ["APPROVED", "REJECTED"],
  WITHDRAWN: [],
  EXPIRED: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: LeaveRequestStatus, to: LeaveRequestStatus) {
    super(`Cannot transition leave request from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertValidTransition(from: LeaveRequestStatus, to: LeaveRequestStatus) {
  if (!TRANSITIONS[from]?.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export interface SubmitLeaveRequestInput {
  orgId: string;
  userId: string;
  leaveTypeId: string;
  fromDate: Date;
  toDate: Date;
  /** Legacy boolean, still the source of truth for LeaveRequest.halfDay
   *  (schema column, kept for backward compat with every existing caller).
   *  When dayPart is also given, dayPart wins for calculation purposes and
   *  halfDay is derived from it (dayPart === "HALF") when persisting. */
  halfDay: boolean;
  /** DAY-unit policies only. FULL/HALF/QUARTER — see calculation.ts. Falls
   *  back to halfDay ? "HALF" : "FULL" when omitted, so every existing
   *  caller keeps working unchanged. */
  dayPart?: "FULL" | "HALF" | "QUARTER";
  /** HOUR-unit policies only. "HH:MM" 24-hour, same day as fromDate. */
  fromTime?: string;
  toTime?: string;
  notes?: string;
  branchId?: string | null;
  /** Only meaningful when the policy's classification is ON_DUTY — where the
   *  employee will be (client site, field visit, etc). Ignored otherwise. */
  onDutyLocation?: string | null;
  /** Only meaningful when the policy's classification is ON_DUTY — client/
   *  job/ticket reference, free text. Ignored otherwise. */
  onDutyReference?: string | null;
}

/**
 * Submits a leave request: validates eligibility/restrictions, runs the
 * authoritative calculation, reserves balance (LEAVE_RESERVED ledger entry),
 * materializes approval steps from the policy's routing config, and
 * notifies approvers. This is the single entry point both the /api/leave/*
 * routes and the legacy /api/attendance/leaves* + /api/hrms/leave/*
 * compatibility routes call into (ARCHITECTURE.md §1).
 */
export async function submitLeaveRequest(input: SubmitLeaveRequestInput) {
  const policyVersion = await getActivePolicyVersion(input.leaveTypeId, input.fromDate);
  if (!policyVersion) {
    throw new Error("No published policy version is active for this leave type on the requested date.");
  }

  const applicable = await isPolicyApplicableToUser(policyVersion.id, input.userId);
  if (!applicable) {
    throw new Error("This leave policy does not apply to you.");
  }

  const config = parsePolicyConfig(policyVersion.configuration);

  const eligible = await isServiceEligible(
    input.userId,
    config.effectiveAfterServiceMonths,
    input.fromDate,
  );
  if (!eligible) {
    throw new Error("You have not yet completed the required waiting period for this leave type.");
  }

  const restrictionViolations = await validateRestrictions({
    orgId: input.orgId,
    userId: input.userId,
    leaveTypeId: input.leaveTypeId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    config,
    now: new Date(),
  });
  if (restrictionViolations.length > 0) {
    throw new Error(restrictionViolations.map((v) => v.message).join(" "));
  }

  const dayPart = input.dayPart ?? (input.halfDay ? "HALF" : "FULL");
  const calculation = await calculateLeaveRequest({
    orgId: input.orgId,
    userId: input.userId,
    leaveTypeId: input.leaveTypeId,
    policyVersionId: policyVersion.id,
    config,
    classification: policyVersion.classification as
      | "PAID"
      | "UNPAID"
      | "ON_DUTY"
      | "RESTRICTED_HOLIDAY"
      | "PARTIALLY_PAID",
    unit: policyVersion.unit as "DAY" | "HOUR",
    roundingMode: policyVersion.roundingMode,
    roundingIncrement: policyVersion.roundingIncrement,
    fromDate: input.fromDate,
    toDate: input.toDate,
    dayPart,
    fromTime: input.fromTime,
    toTime: input.toTime,
    branchId: input.branchId,
  });

  if (calculation.violations.length > 0 && config.negativeLeave.mode === "REJECT") {
    throw new Error(calculation.violations.map((v) => v.message).join(" "));
  }

  if (policyVersion.classification === "ON_DUTY" && !input.onDutyLocation) {
    throw new Error("On-duty leave requires a location (client site, field visit, etc).");
  }

  const request = await db.leaveRequest.create({
    data: {
      userId: input.userId,
      leaveTypeId: input.leaveTypeId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      halfDay: dayPart === "HALF",
      dayPart: policyVersion.unit === "HOUR" ? null : dayPart,
      fromTime: policyVersion.unit === "HOUR" ? input.fromTime : null,
      toTime: policyVersion.unit === "HOUR" ? input.toTime : null,
      status: "PENDING_APPROVAL",
      notes: input.notes,
      policyVersionId: policyVersion.id,
      computedDurationUnits: calculation.requestedUnits,
      paidUnits: calculation.paidUnits,
      lopUnits: calculation.lopUnits,
      partialPaidUnits: calculation.partialPaidUnits,
      partialPaySlabBreakdown: calculation.partialPaySlabBreakdown.length ? calculation.partialPaySlabBreakdown : undefined,
      onDutyLocation: policyVersion.classification === "ON_DUTY" ? input.onDutyLocation : null,
      onDutyReference: policyVersion.classification === "ON_DUTY" ? input.onDutyReference : null,
    },
    include: {
      user: { select: { id: true, name: true, orgId: true } },
      leaveType: { select: { name: true } },
    },
  });

  if (calculation.balanceReserved > 0) {
    await postLedgerEntry({
      orgId: input.orgId,
      userId: input.userId,
      leaveTypeId: input.leaveTypeId,
      policyVersionId: policyVersion.id,
      type: "LEAVE_RESERVED",
      quantity: -calculation.balanceReserved,
      effectiveDate: input.fromDate,
      year: input.fromDate.getFullYear(),
      requestId: request.id,
      source: "EMPLOYEE",
      actorId: input.userId,
      reason: `Leave request ${request.id} submitted`,
      idempotencyKey: `reserve:${request.id}`,
      allowNegative: config.negativeLeave.mode !== "REJECT",
    });
  }

  const steps = await buildApprovalSteps(request.id, policyVersion, calculation, input.userId);

  const approverIds =
    steps.length > 0
      ? steps.filter((s) => s.approverUserId).map((s) => s.approverUserId!)
      : await getUsersWithPermission(input.orgId, "attendance.leave.approve");
  const recipients = [...new Set(approverIds)].filter((id) => id !== input.userId);
  if (recipients.length > 0) {
    await notifyMany(recipients, {
      orgId: input.orgId,
      kind: "LEAVE_REQUEST_SUBMITTED",
      title: `Leave request from ${request.user.name}`,
      body: `${request.user.name} submitted a ${request.leaveType.name} leave request (${calculation.requestedUnits} unit(s)).`,
      link: "/attendance/leaves",
      payload: { leaveRequestId: request.id, requesterId: request.user.id },
    });
  }

  await writeLeaveAudit({
    orgId: input.orgId,
    userId: input.userId,
    action: "LEAVE_REQUEST_SUBMITTED",
    details: { requestId: request.id, leaveTypeId: input.leaveTypeId, units: calculation.requestedUnits },
  });

  return { request, calculation };
}

export interface DecideLeaveRequestInput {
  requestId: string;
  approverId: string;
  decision: "APPROVED" | "REJECTED";
  comment?: string;
}

/**
 * Advances a single approval step. If more steps remain, moves to the next
 * approver. If this was the final step, finalizes the request: converts the
 * LEAVE_RESERVED ledger entry to LEAVE_CONSUMED (approve) or LEAVE_RELEASED
 * (reject).
 */
export async function decideLeaveRequest(input: DecideLeaveRequestInput) {
  const request = await db.leaveRequest.findUniqueOrThrow({
    where: { id: input.requestId },
    include: {
      leaveType: true,
      user: { select: { id: true, name: true, orgId: true } },
      approvalSteps: { orderBy: { sequence: "asc" } },
    },
  });

  // Defense in depth: even though every route calling this also enforces
  // attendance.leave.approve via RBAC, the domain layer itself must never
  // allow a requester to approve/reject their own request — self-approval
  // is a distinct authorization failure mode RBAC alone doesn't prevent
  // (a manager who also holds the approve permission could otherwise
  // approve their own leave).
  if (request.userId === input.approverId) {
    throw new Error("A leave request cannot be approved or rejected by its own requester.");
  }

  // Defense in depth: requirePermission("attendance.leave.approve") on the
  // calling route only proves the actor has SOME approve permission
  // somewhere, not that this specific request belongs to their
  // organisation — found during the closure-pass authorization audit
  // (§12/13), same class of gap as the comp-off/grant cross-org fixes.
  const approver = await db.user.findUnique({
    where: { id: input.approverId },
    select: { orgId: true },
  });
  if (!approver || !request.user.orgId || approver.orgId !== request.user.orgId) {
    throw new CrossOrgAccessError();
  }

  const currentStatus = normalizeStatus(request.status);
  assertValidTransition(currentStatus, input.decision);

  const pendingStep = request.approvalSteps.find((s) => s.status === "PENDING");

  if (pendingStep) {
    await db.leaveApprovalStep.update({
      where: { id: pendingStep.id },
      data: {
        status: input.decision,
        decidedById: input.approverId,
        decidedAt: new Date(),
        comment: input.comment,
      },
    });
  }

  const remainingSteps = request.approvalSteps.filter(
    (s) => s.id !== pendingStep?.id && s.status === "PENDING",
  );
  const isFinalDecision = input.decision === "REJECTED" || remainingSteps.length === 0;

  if (!isFinalDecision) {
    const nextStep = remainingSteps[0];

    // SLA due date for the newly-activated step (spec §11) — mirrors the
    // slaHours logic in approval.ts's step-1 case, since only one step is
    // ever PENDING at a time and this is where step 2+ first becomes it.
    if (request.policyVersionId) {
      const pinnedVersion = await db.leavePolicyVersion.findUnique({ where: { id: request.policyVersionId } });
      if (pinnedVersion) {
        const config = parsePolicyConfig(pinnedVersion.configuration);
        if (config.approvalRouting.slaHours) {
          await db.leaveApprovalStep.update({
            where: { id: nextStep.id },
            data: { slaDueAt: new Date(Date.now() + config.approvalRouting.slaHours * 60 * 60 * 1000) },
          });
        }
      }
    }

    const updated = await db.leaveRequest.update({
      where: { id: input.requestId },
      data: { currentApprovalStepId: nextStep.id },
      include: { leaveType: true, user: { select: { id: true, name: true, orgId: true } } },
    });
    if (nextStep.approverUserId) {
      await notify({
        userId: nextStep.approverUserId,
        orgId: updated.user.orgId ?? undefined,
        kind: "LEAVE_REQUEST_SUBMITTED",
        title: `Leave approval needed: ${updated.leaveType.name}`,
        body: `${updated.user.name}'s leave request needs your approval (step ${nextStep.sequence}).`,
        link: "/attendance/leaves",
        payload: { leaveRequestId: updated.id },
      });
    }
    return updated;
  }

  const finalStatus: LeaveRequestStatus = input.decision === "APPROVED" ? "APPROVED" : "REJECTED";

  // Transaction-boundary fix (§42 closure audit): the ledger entry is
  // posted BEFORE the LeaveRequest.status flip, not after. Previously the
  // status was written first — if postLedgerEntry then threw (a genuine
  // DB error, not the caught PayrollLockedError case), the request was
  // left permanently marked APPROVED with no corresponding ledger entry
  // at all: a request that says "approved, balance consumed" while the
  // balance was never actually touched. Posting the ledger entry first
  // means a failure here leaves the request in its prior, still-valid
  // PENDING_APPROVAL state — safe to retry — instead of a false-approved
  // state with silently missing money movement. This module doesn't wrap
  // cross-table writes in one Prisma $transaction (postLedgerEntry already
  // owns its own transaction internally for the ledger+balance pair), so
  // ordering is the practical mitigation available without a deeper
  // refactor of postLedgerEntry's transaction ownership.
  if (request.user.orgId) {
    if (finalStatus === "APPROVED" && request.paidUnits) {
      // Comp-off has no per-lot ledger tracking (balance is aggregate), so
      // consumption against specific CompOffCredit lots must be recorded
      // separately, FIFO by earnedDate, so expiry later expires only the
      // unconsumed remainder of each lot instead of double-counting spent
      // units (spec §24 comp-off-expiry review). The allocation is stored on
      // the ledger entry so cancellation/reversal can undo the exact lots.
      let compOffAllocation: { creditId: string; unitsApplied: Prisma.Decimal }[] = [];
      if (request.leaveType.isCompOffType) {
        compOffAllocation = await consumeCompOffFifo(request.user.orgId, request.userId, request.paidUnits);
      }

      await postLedgerEntry({
        orgId: request.user.orgId,
        userId: request.userId,
        leaveTypeId: request.leaveTypeId,
        policyVersionId: request.policyVersionId,
        type: "LEAVE_CONSUMED",
        quantity: 0, // reservation already debited the balance; this re-tags the same units as consumed
        effectiveDate: request.fromDate,
        year: request.fromDate.getFullYear(),
        requestId: request.id,
        source: "ADMIN",
        actorId: input.approverId,
        reason: `Leave request ${request.id} approved`,
        idempotencyKey: `consume:${request.id}`,
        allowNegative: true,
        metadata: compOffAllocation.length
          ? { compOffAllocation: compOffAllocation.map((a) => ({ creditId: a.creditId, unitsApplied: a.unitsApplied.toString() })) }
          : undefined,
      });
    } else if (finalStatus === "REJECTED" && request.paidUnits) {
      await postLedgerEntry({
        orgId: request.user.orgId,
        userId: request.userId,
        leaveTypeId: request.leaveTypeId,
        policyVersionId: request.policyVersionId,
        type: "LEAVE_RELEASED",
        quantity: toDecimal(request.paidUnits).plus(toDecimal(request.lopUnits ?? 0)),
        effectiveDate: request.fromDate,
        year: request.fromDate.getFullYear(),
        requestId: request.id,
        source: "ADMIN",
        actorId: input.approverId,
        reason: `Leave request ${request.id} rejected — reservation released`,
        idempotencyKey: `release:${request.id}`,
        allowNegative: true,
      });
    }
  }

  const updated = await db.leaveRequest.update({
    where: { id: input.requestId },
    data: { status: finalStatus, approverId: input.approverId },
    include: { leaveType: true, user: { select: { id: true, name: true, orgId: true } } },
  });

  if (updated.user.orgId && finalStatus === "APPROVED") {
    // Attendance/payroll side effects happen after the status flip — these
    // are less financially critical than the ledger (attendance marking is
    // idempotent/re-derivable, LOP has its own PayrollLockedError recovery
    // path below), so ordering them after the authoritative ledger+status
    // writes is acceptable; the ledger is the one write that must never be
    // silently skipped.
    await applyLeaveToAttendance({
      userId: request.userId,
      fromDate: request.fromDate,
      toDate: request.toDate,
      halfDay: request.halfDay,
    });

    if (request.lopUnits && toDecimal(request.lopUnits).greaterThan(0)) {
      try {
        await applyLopFromLeaveRequest({
          orgId: updated.user.orgId,
          userId: request.userId,
          fromDate: request.fromDate,
          lopUnits: toDecimal(request.lopUnits).toNumber(),
          actorId: input.approverId,
          requestId: request.id,
        });
      } catch (err) {
        if (err instanceof PayrollLockedError) {
          await writeLeaveAudit({
            orgId: updated.user.orgId,
            userId: input.approverId,
            action: "LEAVE_LOP_BLOCKED_PAYROLL_LOCKED",
            details: { requestId: request.id, lopUnits: request.lopUnits, message: err.message },
          });
        } else {
          throw err;
        }
      }
    }

    const slabBreakdown = request.partialPaySlabBreakdown as { payPercentage: number; units: number }[] | null;
    if (slabBreakdown?.length) {
      try {
        await applyPartialPayFromLeaveRequest({
          orgId: updated.user.orgId,
          userId: request.userId,
          leaveTypeId: request.leaveTypeId,
          fromDate: request.fromDate,
          requestId: request.id,
          actorId: input.approverId,
          slabBreakdown,
        });
      } catch (err) {
        if (err instanceof PayrollLockedError) {
          await writeLeaveAudit({
            orgId: updated.user.orgId,
            userId: input.approverId,
            action: "LEAVE_PARTIAL_PAY_BLOCKED_PAYROLL_LOCKED",
            details: { requestId: request.id, message: err.message },
          });
        } else {
          throw err;
        }
      }
    }
  }

  await notify({
    userId: request.userId,
    orgId: updated.user.orgId ?? undefined,
    kind: "LEAVE_DECISION",
    title: `Leave ${finalStatus.toLowerCase()}: ${request.leaveType.name}`,
    body: `Your leave request from ${request.fromDate.toDateString()} to ${request.toDate.toDateString()} was ${finalStatus.toLowerCase()}.`,
    link: "/attendance/leaves",
    email: true,
    payload: { leaveRequestId: request.id, decision: finalStatus, approverId: input.approverId },
  });

  await writeLeaveAudit({
    orgId: updated.user.orgId ?? "",
    userId: input.approverId,
    action: finalStatus === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    details: { requestId: request.id, comment: input.comment },
  });

  return updated;
}

export interface CancelLeaveRequestInput {
  requestId: string;
  actorId: string;
  reason: string;
}

/**
 * Cancels a request. Pending requests are withdrawn immediately; approved
 * requests move through CANCEL_PENDING (some orgs require re-approval of a
 * cancellation) unless the caller is HR/admin, in which case it is
 * cancelled immediately. Either way, reverses the reservation/consumption
 * with a CANCELLATION_REVERSAL ledger entry.
 */
export async function cancelLeaveRequest(input: CancelLeaveRequestInput, immediate: boolean) {
  const request = await db.leaveRequest.findUniqueOrThrow({
    where: { id: input.requestId },
    include: { user: { select: { orgId: true } }, leaveType: true },
  });

  const currentStatus = normalizeStatus(request.status);
  const targetStatus: LeaveRequestStatus =
    currentStatus === "PENDING_APPROVAL" || currentStatus === "SUBMITTED"
      ? "WITHDRAWN"
      : immediate
        ? "CANCELLED"
        : "CANCEL_PENDING";

  if (targetStatus === "CANCEL_PENDING") {
    assertValidTransition(currentStatus, "CANCEL_PENDING");
  } else {
    assertValidTransition(currentStatus, targetStatus);
  }

  // Same transaction-boundary fix as decideLeaveRequest (§42): post the
  // ledger reversal BEFORE flipping status, so a failure here leaves the
  // request in its prior valid state (still APPROVED/PENDING) rather than
  // a false-CANCELLED state with balance never actually reversed.
  const totalReserved = toDecimal(request.paidUnits ?? 0).plus(toDecimal(request.lopUnits ?? 0));
  if (targetStatus !== "CANCEL_PENDING" && totalReserved.greaterThan(0) && request.user.orgId) {
    await postLedgerEntry({
      orgId: request.user.orgId,
      userId: request.userId,
      leaveTypeId: request.leaveTypeId,
      policyVersionId: request.policyVersionId,
      type: "CANCELLATION_REVERSAL",
      quantity: totalReserved,
      effectiveDate: request.fromDate,
      year: request.fromDate.getFullYear(),
      requestId: request.id,
      source: currentStatus === "APPROVED" ? "ADMIN" : "EMPLOYEE",
      actorId: input.actorId,
      reason: input.reason,
      idempotencyKey: `cancel-reversal:${request.id}`,
      allowNegative: true,
    });
  }

  const updated = await db.leaveRequest.update({
    where: { id: input.requestId },
    data: {
      status: targetStatus,
      cancelledAt: targetStatus !== "CANCEL_PENDING" ? new Date() : undefined,
      cancelReason: input.reason,
    },
  });

  if (targetStatus !== "CANCEL_PENDING" && totalReserved.greaterThan(0) && request.user.orgId) {
    if (currentStatus === "APPROVED") {
      if (request.leaveType.isCompOffType) {
        const consumeEntry = await db.leaveLedgerEntry.findUnique({
          where: { idempotencyKey: `consume:${request.id}` },
        });
        const allocation = (consumeEntry?.metadata as { compOffAllocation?: { creditId: string; unitsApplied: string }[] } | null)
          ?.compOffAllocation;
        if (allocation?.length) {
          await releaseCompOffFifo(allocation.map((a) => ({ creditId: a.creditId, unitsApplied: a.unitsApplied })));
        }
      }

      await removeLeaveFromAttendance({
        userId: request.userId,
        fromDate: request.fromDate,
        toDate: request.toDate,
      });

      if (request.lopUnits && toDecimal(request.lopUnits).greaterThan(0)) {
        try {
          await reverseLopFromLeaveRequest({
            orgId: request.user.orgId,
            userId: request.userId,
            fromDate: request.fromDate,
            lopUnits: toDecimal(request.lopUnits).toNumber(),
            actorId: input.actorId,
            requestId: request.id,
          });
        } catch (err) {
          if (!(err instanceof PayrollLockedError)) throw err;
          await writeLeaveAudit({
            orgId: request.user.orgId,
            userId: input.actorId,
            action: "LEAVE_LOP_REVERSAL_BLOCKED_PAYROLL_LOCKED",
            details: { requestId: request.id, lopUnits: request.lopUnits, message: err.message },
          });
        }
      }

      if ((request.partialPaySlabBreakdown as unknown[] | null)?.length) {
        try {
          await reversePartialPayFromLeaveRequest({
            orgId: request.user.orgId,
            requestId: request.id,
            actorId: input.actorId,
            fromDate: request.fromDate,
          });
        } catch (err) {
          if (!(err instanceof PayrollLockedError)) throw err;
          await writeLeaveAudit({
            orgId: request.user.orgId,
            userId: input.actorId,
            action: "LEAVE_PARTIAL_PAY_REVERSAL_BLOCKED_PAYROLL_LOCKED",
            details: { requestId: request.id, message: err.message },
          });
        }
      }
    }
  }

  await notify({
    userId: request.userId,
    orgId: request.user.orgId ?? undefined,
    kind: "LEAVE_CANCELLED",
    title: "Leave request cancelled",
    body: `Your leave request from ${request.fromDate.toDateString()} to ${request.toDate.toDateString()} was cancelled.`,
    link: "/attendance/leaves",
    payload: { leaveRequestId: request.id },
  });

  await writeLeaveAudit({
    orgId: request.user.orgId ?? "",
    userId: input.actorId,
    action: "LEAVE_CANCELLED",
    details: { requestId: request.id, reason: input.reason, fromStatus: currentStatus, toStatus: targetStatus },
  });

  return updated;
}

export interface PartialCancelLeaveRequestInput {
  requestId: string;
  actorId: string;
  reason: string;
  /** The sub-range being cancelled — must be a leading or trailing edge of
   *  the original request (e.g. original 1-5 Aug, cancel 4-5 Aug leaves
   *  1-3 Aug approved). Cancelling an interior gap (splitting into two
   *  separate periods) is out of scope — it would require creating a
   *  second LeaveRequest and is not handled by this function. */
  cancelFromDate: Date;
  cancelToDate: Date;
}

/**
 * Partial cancellation (spec §9): shrinks an approved request to whatever
 * remains after removing the cancelled edge, reversing only the delta —
 * not the whole reservation. Recalculates the remaining period through the
 * same calculateLeaveRequest() authoritative engine (never hand-computed),
 * so paid/LOP/sandwich are recalculated fresh, then reverses the removed
 * portion's ledger impact, attendance marking, and LOP.
 */
export async function cancelLeaveRequestPartial(input: PartialCancelLeaveRequestInput) {
  const request = await db.leaveRequest.findUniqueOrThrow({
    where: { id: input.requestId },
    include: { user: { select: { orgId: true } }, leaveType: true },
  });

  const currentStatus = normalizeStatus(request.status);
  if (currentStatus !== "APPROVED") {
    throw new Error("Partial cancellation is only available for approved leave requests.");
  }
  if (!request.user.orgId) {
    throw new Error("User has no organisation.");
  }

  const isLeadingEdge = input.cancelFromDate.getTime() === request.fromDate.getTime();
  const isTrailingEdge = input.cancelToDate.getTime() === request.toDate.getTime();
  if (!isLeadingEdge && !isTrailingEdge) {
    throw new Error(
      "Partial cancellation must remove a leading or trailing portion of the request, not an interior gap.",
    );
  }
  if (input.cancelFromDate < request.fromDate || input.cancelToDate > request.toDate) {
    throw new Error("Cancellation range must fall within the original request's dates.");
  }

  const remainingFromDate = isLeadingEdge
    ? new Date(input.cancelToDate.getTime() + 24 * 60 * 60 * 1000)
    : request.fromDate;
  const remainingToDate = isTrailingEdge
    ? new Date(input.cancelFromDate.getTime() - 24 * 60 * 60 * 1000)
    : request.toDate;

  if (remainingFromDate > remainingToDate) {
    throw new Error("Cancelling this entire range — use full cancellation instead of partial.");
  }

  // Recalculation uses the ORIGINAL pinned policy version's configuration
  // (spec §4 — historical interpretation must not shift), not whatever is
  // currently published, by reading the pinned version's config directly
  // rather than re-resolving "active".
  const pinnedVersion = request.policyVersionId
    ? await db.leavePolicyVersion.findUnique({ where: { id: request.policyVersionId } })
    : null;
  if (!pinnedVersion) {
    throw new Error("Cannot recalculate: original policy version is unavailable.");
  }
  const config = parsePolicyConfig(pinnedVersion.configuration);

  const remainingCalculation = await calculateLeaveRequest({
    orgId: request.user.orgId,
    userId: request.userId,
    leaveTypeId: request.leaveTypeId,
    policyVersionId: pinnedVersion.id,
    config,
    classification: pinnedVersion.classification as
      | "PAID"
      | "UNPAID"
      | "ON_DUTY"
      | "RESTRICTED_HOLIDAY"
      | "PARTIALLY_PAID",
    unit: pinnedVersion.unit as "DAY" | "HOUR",
    roundingMode: pinnedVersion.roundingMode,
    roundingIncrement: pinnedVersion.roundingIncrement,
    fromDate: remainingFromDate,
    toDate: remainingToDate,
    dayPart: "FULL",
  });

  const originalPaid = toDecimal(request.paidUnits ?? 0);
  const originalLop = toDecimal(request.lopUnits ?? 0);
  const originalTotal = originalPaid.plus(originalLop);
  const remainingPaid = new Prisma.Decimal(remainingCalculation.paidUnits);
  const remainingLop = new Prisma.Decimal(remainingCalculation.lopUnits);
  const remainingTotal = remainingPaid.plus(remainingLop);
  const reversedTotal = originalTotal.minus(remainingTotal);
  const reversedLop = originalLop.minus(remainingLop);

  if (reversedTotal.lessThanOrEqualTo(0)) {
    throw new Error("Nothing to reverse — the remaining period accounts for the full original reservation.");
  }

  // Partial release of the comp-off lots this request originally consumed
  // (proportional to the trimmed edge) — same FIFO-lot rationale as full
  // cancellation, so expiry never double-counts the trimmed-back units.
  if (request.leaveType.isCompOffType) {
    const consumeEntry = await db.leaveLedgerEntry.findUnique({
      where: { idempotencyKey: `consume:${request.id}` },
    });
    const allocation = (consumeEntry?.metadata as { compOffAllocation?: { creditId: string; unitsApplied: string }[] } | null)
      ?.compOffAllocation;
    if (allocation?.length) {
      let toRelease = reversedTotal;
      const releaseAllocations: { creditId: string; unitsApplied: string }[] = [];
      for (const alloc of [...allocation].reverse()) {
        if (toRelease.lessThanOrEqualTo(0)) break;
        const lotApplied = toDecimal(alloc.unitsApplied);
        const release = Prisma.Decimal.min(lotApplied, toRelease);
        releaseAllocations.push({ creditId: alloc.creditId, unitsApplied: release.toString() });
        toRelease = toRelease.minus(release);
      }
      await releaseCompOffFifo(releaseAllocations.map((a) => ({ creditId: a.creditId, unitsApplied: a.unitsApplied })));
    }
  }

  await db.leaveRequest.update({
    where: { id: input.requestId },
    data: {
      fromDate: remainingFromDate,
      toDate: remainingToDate,
      computedDurationUnits: remainingCalculation.requestedUnits,
      paidUnits: remainingPaid,
      lopUnits: remainingLop,
      cancelReason: input.reason,
    },
  });

  await postLedgerEntry({
    orgId: request.user.orgId,
    userId: request.userId,
    leaveTypeId: request.leaveTypeId,
    policyVersionId: request.policyVersionId,
    type: "CANCELLATION_REVERSAL",
    quantity: reversedTotal,
    effectiveDate: input.cancelFromDate,
    year: input.cancelFromDate.getFullYear(),
    requestId: request.id,
    source: "EMPLOYEE",
    reason: `Partial cancellation: ${input.cancelFromDate.toDateString()} to ${input.cancelToDate.toDateString()}`,
    actorId: input.actorId,
    idempotencyKey: `partial-cancel-reversal:${request.id}:${input.cancelFromDate.toISOString().slice(0, 10)}`,
    allowNegative: true,
  });

  await removeLeaveFromAttendance({
    userId: request.userId,
    fromDate: input.cancelFromDate,
    toDate: input.cancelToDate,
  });

  if (reversedLop.greaterThan(0)) {
    try {
      await reverseLopFromLeaveRequest({
        orgId: request.user.orgId,
        userId: request.userId,
        fromDate: input.cancelFromDate,
        lopUnits: reversedLop.toNumber(),
        actorId: input.actorId,
        requestId: request.id,
      });
    } catch (err) {
      if (!(err instanceof PayrollLockedError)) throw err;
      await writeLeaveAudit({
        orgId: request.user.orgId,
        userId: input.actorId,
        action: "LEAVE_LOP_REVERSAL_BLOCKED_PAYROLL_LOCKED",
        details: { requestId: request.id, lopUnits: reversedLop.toString(), message: err.message },
      });
    }
  }

  await notify({
    userId: request.userId,
    orgId: request.user.orgId,
    kind: "LEAVE_CANCELLED",
    title: "Leave request partially cancelled",
    body: `${input.cancelFromDate.toDateString()} to ${input.cancelToDate.toDateString()} was cancelled from your leave request. Remaining: ${remainingFromDate.toDateString()} to ${remainingToDate.toDateString()}.`,
    link: "/attendance/leaves",
    payload: { leaveRequestId: request.id },
  });

  await writeLeaveAudit({
    orgId: request.user.orgId,
    userId: input.actorId,
    action: "LEAVE_PARTIALLY_CANCELLED",
    details: {
      requestId: request.id,
      reason: input.reason,
      cancelledRange: { from: input.cancelFromDate, to: input.cancelToDate },
      remainingRange: { from: remainingFromDate, to: remainingToDate },
      reversedUnits: reversedTotal.toString(),
    },
  });

  return { request: await db.leaveRequest.findUniqueOrThrow({ where: { id: input.requestId } }), remainingCalculation };
}

export interface ExtendLeaveRequestInput {
  requestId: string;
  userId: string;
  orgId: string;
  newToDate: Date;
  branchId?: string | null;
}

/**
 * Extends an approved request by calculating only the additional period
 * and running it through the same submission pipeline as a new request,
 * linked back via extendedFromRequestId (spec §22).
 */
export async function extendLeaveRequest(input: ExtendLeaveRequestInput) {
  const original = await db.leaveRequest.findUniqueOrThrow({
    where: { id: input.requestId },
  });

  if (normalizeStatus(original.status) !== "APPROVED") {
    throw new Error("Only approved leave requests can be extended.");
  }
  if (input.newToDate <= original.toDate) {
    throw new Error("Extension date must be after the original end date.");
  }

  const additionalFromDate = new Date(original.toDate);
  additionalFromDate.setDate(additionalFromDate.getDate() + 1);

  const { request, calculation } = await submitLeaveRequest({
    orgId: input.orgId,
    userId: input.userId,
    leaveTypeId: original.leaveTypeId,
    fromDate: additionalFromDate,
    toDate: input.newToDate,
    halfDay: false,
    notes: `Extension of leave request ${original.id}`,
    branchId: input.branchId,
  });

  await db.leaveRequest.update({
    where: { id: request.id },
    data: { extendedFromRequestId: original.id },
  });

  return { request, calculation };
}
