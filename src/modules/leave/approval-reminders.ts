import { db } from "@/lib/db";
import { notify, notifyMany } from "@/lib/notify";
import { getUsersWithPermission } from "@/modules/notifications/service";
import { writeLeaveAudit } from "@/modules/leave/audit";

const ESCALATION_THRESHOLD_HOURS = 24; // if overdue by more than this, also notify HR

/**
 * SLA reminder + escalation (spec §11). Finds LeaveApprovalStep rows that
 * are PENDING and past their slaDueAt, sends a reminder to the current
 * approver, and — if overdue by more than ESCALATION_THRESHOLD_HOURS —
 * also escalates to HR (anyone holding attendance.leave.manage in that
 * org). Repeated cron runs re-notify on each overdue step until it's
 * decided, since a single reminder is easy to miss; this is intentionally
 * NOT deduped like ledger postings — a live reminder should recur, unlike
 * a financial transaction which must never double-post.
 */
export async function processApprovalReminders(orgId: string, now: Date) {
  const overdueSteps = await db.leaveApprovalStep.findMany({
    where: {
      status: "PENDING",
      slaDueAt: { lte: now },
      request: { user: { orgId } },
    },
    include: {
      request: {
        include: {
          user: { select: { id: true, name: true, orgId: true } },
          leaveType: { select: { name: true } },
        },
      },
    },
  });

  let reminded = 0;
  let escalated = 0;

  for (const step of overdueSteps) {
    if (!step.approverUserId) continue;

    const overdueHours = (now.getTime() - step.slaDueAt!.getTime()) / (1000 * 60 * 60);

    await notify({
      userId: step.approverUserId,
      orgId,
      kind: "LEAVE_APPROVAL_REMINDER",
      title: `Reminder: leave approval overdue`,
      body: `${step.request.user.name}'s ${step.request.leaveType.name} request has been awaiting your approval since ${step.slaDueAt!.toDateString()}.`,
      link: "/attendance/leaves",
      payload: { leaveRequestId: step.requestId, approvalStepId: step.id },
    });
    reminded++;

    if (overdueHours > ESCALATION_THRESHOLD_HOURS) {
      const hrUserIds = await getUsersWithPermission(orgId, "attendance.leave.manage");
      const recipients = hrUserIds.filter((id) => id !== step.approverUserId);
      if (recipients.length > 0) {
        await notifyMany(recipients, {
          orgId,
          kind: "LEAVE_APPROVAL_ESCALATED",
          title: `Escalation: leave approval significantly overdue`,
          body: `${step.request.user.name}'s ${step.request.leaveType.name} request has been pending for over ${ESCALATION_THRESHOLD_HOURS}h past its SLA. Original approver has been reminded.`,
          link: "/attendance/leaves",
          payload: { leaveRequestId: step.requestId, approvalStepId: step.id },
        });
        escalated++;
      }

      await writeLeaveAudit({
        orgId,
        userId: step.approverUserId,
        action: "LEAVE_APPROVAL_ESCALATED",
        details: { requestId: step.requestId, approvalStepId: step.id, overdueHours },
      });
    }
  }

  return { reminded, escalated, checked: overdueSteps.length };
}
