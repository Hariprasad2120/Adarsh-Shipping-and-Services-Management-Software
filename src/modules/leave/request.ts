import { db } from "@/lib/db";
import { notify, notifyMany } from "@/lib/notify";
import { getUsersWithPermission } from "@/modules/notifications/service";
import { getActivePolicyVersion, parsePolicyConfig } from "@/modules/leave/policy";
import { calculateLeaveRequest } from "@/modules/leave/calculation";
import { postLedgerEntry } from "@/modules/leave/ledger";
import { writeLeaveAudit } from "@/modules/leave/audit";
import { buildApprovalSteps } from "@/modules/leave/approval";
import { isPolicyApplicableToUser, isServiceEligible } from "@/modules/leave/eligibility";
import { validateRestrictions } from "@/modules/leave/restrictions";
import { applyLeaveToAttendance, removeLeaveFromAttendance } from "@/modules/leave/attendance-bridge";
import { applyLopFromLeaveRequest, reverseLopFromLeaveRequest, PayrollLockedError } from "@/modules/leave/payroll-bridge";

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
  halfDay: boolean;
  notes?: string;
  branchId?: string | null;
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
    roundingMode: policyVersion.roundingMode,
    roundingIncrement: policyVersion.roundingIncrement,
    fromDate: input.fromDate,
    toDate: input.toDate,
    halfDay: input.halfDay,
    branchId: input.branchId,
  });

  if (calculation.violations.length > 0 && config.negativeLeave.mode === "REJECT") {
    throw new Error(calculation.violations.map((v) => v.message).join(" "));
  }

  const request = await db.leaveRequest.create({
    data: {
      userId: input.userId,
      leaveTypeId: input.leaveTypeId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      halfDay: input.halfDay,
      status: "PENDING_APPROVAL",
      notes: input.notes,
      policyVersionId: policyVersion.id,
      computedDurationUnits: calculation.requestedUnits,
      paidUnits: calculation.paidUnits,
      lopUnits: calculation.lopUnits,
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

  const updated = await db.leaveRequest.update({
    where: { id: input.requestId },
    data: { status: finalStatus, approverId: input.approverId },
    include: { leaveType: true, user: { select: { id: true, name: true, orgId: true } } },
  });

  if (updated.user.orgId) {
    if (finalStatus === "APPROVED" && request.paidUnits) {
      await postLedgerEntry({
        orgId: updated.user.orgId,
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
      });
    } else if (finalStatus === "REJECTED" && request.paidUnits) {
      await postLedgerEntry({
        orgId: updated.user.orgId,
        userId: request.userId,
        leaveTypeId: request.leaveTypeId,
        policyVersionId: request.policyVersionId,
        type: "LEAVE_RELEASED",
        quantity: request.paidUnits + (request.lopUnits ?? 0),
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

    if (finalStatus === "APPROVED") {
      await applyLeaveToAttendance({
        userId: request.userId,
        fromDate: request.fromDate,
        toDate: request.toDate,
        halfDay: request.halfDay,
      });

      if (request.lopUnits && request.lopUnits > 0) {
        try {
          await applyLopFromLeaveRequest({
            orgId: updated.user.orgId,
            userId: request.userId,
            fromDate: request.fromDate,
            lopUnits: request.lopUnits,
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
    include: { user: { select: { orgId: true } } },
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

  const updated = await db.leaveRequest.update({
    where: { id: input.requestId },
    data: {
      status: targetStatus,
      cancelledAt: targetStatus !== "CANCEL_PENDING" ? new Date() : undefined,
      cancelReason: input.reason,
    },
  });

  const totalReserved = (request.paidUnits ?? 0) + (request.lopUnits ?? 0);
  if (targetStatus !== "CANCEL_PENDING" && totalReserved > 0 && request.user.orgId) {
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

    if (currentStatus === "APPROVED") {
      await removeLeaveFromAttendance({
        userId: request.userId,
        fromDate: request.fromDate,
        toDate: request.toDate,
      });

      if (request.lopUnits && request.lopUnits > 0) {
        try {
          await reverseLopFromLeaveRequest({
            orgId: request.user.orgId,
            userId: request.userId,
            fromDate: request.fromDate,
            lopUnits: request.lopUnits,
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
