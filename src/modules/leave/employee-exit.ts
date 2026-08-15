import { db } from "@/lib/db";
import { getMaterializedBalance } from "@/modules/leave/ledger";
import { cancelLeaveRequest } from "@/modules/leave/request";
import { writeLeaveAudit } from "@/modules/leave/audit";

export interface EmployeeExitResult {
  cancelledRequestIds: string[];
  balancesAtExit: Array<{ leaveTypeId: string; leaveTypeName: string; balance: number }>;
}

/**
 * Handles the leave-management side of an employee's exit (spec §32):
 * cancels any future-dated approved/pending leave beyond the exit date,
 * and reports the final balance per leave type (encashment eligibility is
 * a policy-level decision — see LeavePolicyVersion.configuration.
 * encashment.mode "ON_EXIT" — this function reports the balance a
 * final-settlement encashment run would act on, it does not itself
 * calculate a payout amount, matching spec §16's "Leave Management should
 * not calculate salary rate — Payroll owns that").
 *
 * Accrual naturally stops once User.active is flipped false, since
 * runMonthlyAccrual() (accrual.ts) filters `where: { active: true }` —
 * no separate cutoff logic is needed for that part.
 */
export async function handleEmployeeExit(
  orgId: string,
  userId: string,
  exitDate: Date,
  actorId: string,
): Promise<EmployeeExitResult> {
  const futureRequests = await db.leaveRequest.findMany({
    where: {
      userId,
      fromDate: { gt: exitDate },
      status: { in: ["pending", "PENDING_APPROVAL", "approved", "APPROVED"] },
    },
  });

  const cancelledRequestIds: string[] = [];
  for (const request of futureRequests) {
    await cancelLeaveRequest(
      {
        requestId: request.id,
        actorId,
        reason: `Employee exit effective ${exitDate.toDateString()} — future leave cancelled automatically.`,
      },
      true, // immediate cancellation, no CANCEL_PENDING re-approval step for an exit
    );
    cancelledRequestIds.push(request.id);
  }

  const leaveTypes = await db.leaveType.findMany({ where: { orgId } });
  const year = exitDate.getFullYear();
  const balancesAtExit = [];
  for (const leaveType of leaveTypes) {
    const balance = await getMaterializedBalance(userId, leaveType.id, year);
    if (!balance.isZero()) {
      balancesAtExit.push({
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        balance: balance.toNumber(),
      });
    }
  }

  await writeLeaveAudit({
    orgId,
    userId: actorId,
    action: "LEAVE_EMPLOYEE_EXIT_PROCESSED",
    details: {
      targetUserId: userId,
      exitDate: exitDate.toISOString(),
      cancelledRequestIds,
      balancesAtExit,
    },
  });

  return { cancelledRequestIds, balancesAtExit };
}
