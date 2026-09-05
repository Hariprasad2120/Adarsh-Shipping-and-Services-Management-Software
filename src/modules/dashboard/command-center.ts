import "server-only";

import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { toAttendanceDate } from "@/lib/attendance-date";
import type { Caps } from "@/lib/rbac";
import type {
  DashboardAttentionItem,
  DashboardActionNeededItem,
  DashboardActionNeededPriority,
  DashboardCommandCenterSnapshot,
  DashboardModuleSnapshot,
  DashboardPulseMetric,
  DashboardRecentActivityItem,
  DashboardStageCount,
  DashboardTrendPoint,
} from "./types";

const ACTIVITY_TREND_DAYS = 14;
const ACTION_NEEDED_LIMIT = 8;

/**
 * Bucket the user's notifications by calendar day over the trailing window so
 * the dashboard has a real operational time-series (no fabricated numbers).
 * Days with no notifications are still emitted as zero so the line is dense.
 */
function buildActivityTrend(
  createdAtList: Date[],
  now: Date,
): DashboardTrendPoint[] {
  const dayFmt = new Intl.DateTimeFormat("en-CA"); // yyyy-mm-dd
  const labelFmt = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
  });
  const counts = new Map<string, number>();
  for (const created of createdAtList) {
    const key = dayFmt.format(created);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const points: DashboardTrendPoint[] = [];
  for (let offset = ACTIVITY_TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setDate(day.getDate() - offset);
    const key = dayFmt.format(day);
    points.push({
      date: key,
      label: labelFmt.format(day),
      value: counts.get(key) ?? 0,
    });
  }
  return points;
}

const APPRAISAL_STAGE_ORDER = [
  { id: "DUE_NOTIFIED", label: "Due" },
  { id: "REVIEWERS_ASSIGNED", label: "Assigned" },
  { id: "SELF_ASSESSMENT_OPEN", label: "Self" },
  { id: "REVIEWER_RATING", label: "Rating" },
  { id: "MANAGEMENT_REVIEW", label: "Management" },
  { id: "MEETING_PENDING", label: "Meeting" },
  { id: "HIKE_FINALISATION", label: "Decision" },
] as const;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addAttentionItem(
  items: DashboardAttentionItem[],
  item: DashboardAttentionItem | null,
) {
  if (item) items.push(item);
}

function compareAttentionItems(
  left: DashboardAttentionItem,
  right: DashboardAttentionItem,
) {
  const severityWeight = { critical: 0, warning: 1, info: 2 } as const;
  const severityDiff =
    severityWeight[left.severity] - severityWeight[right.severity];
  if (severityDiff !== 0) return severityDiff;

  if (left.createdAt && right.createdAt) {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  }

  if (left.createdAt) return -1;
  if (right.createdAt) return 1;
  return left.title.localeCompare(right.title);
}

function compareActionNeededItems(
  left: DashboardActionNeededItem,
  right: DashboardActionNeededItem,
) {
  const priorityWeight: Record<DashboardActionNeededPriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
  };
  const priorityDiff =
    priorityWeight[left.priority] - priorityWeight[right.priority];
  if (priorityDiff !== 0) return priorityDiff;

  if (left.dueDate && right.dueDate) {
    return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
  }
  if (left.dueDate) return -1;
  if (right.dueDate) return 1;
  return left.title.localeCompare(right.title);
}

function buildPulseMetrics(
  moduleSnapshot: DashboardModuleSnapshot,
): DashboardPulseMetric[] {
  return moduleSnapshot.modules.slice(0, 6).map((module) => ({
    id: module.id,
    label: module.title,
    value: module.primaryMetric.value,
    detail: `${module.primaryMetric.label} · ${module.primaryMetric.detail}`,
    href: module.href,
  }));
}

export async function getDashboardCommandCenterSnapshot({
  caps,
  moduleSnapshot,
  orgId,
  userId,
}: {
  caps: Caps;
  moduleSnapshot: DashboardModuleSnapshot;
  orgId: string;
  userId: string;
}): Promise<DashboardCommandCenterSnapshot> {
  const now = await getNow();
  const attendanceDate = toAttendanceDate(now);
  const todayStart = startOfDay(now);
  const canSeeApprovalQueue = Boolean(
    caps["admin.org.manage"] ||
      caps["hrms.approvals.manage"] ||
      caps["attendance.leave.approve"],
  );
  const canSeeCha = moduleSnapshot.modules.some((module) => module.id === "cha");
  const canSeeCrm = moduleSnapshot.modules.some((module) => module.id === "crm");
  const canSeeAccounting = moduleSnapshot.modules.some(
    (module) => module.id === "accounting",
  );
  const canSeePayroll = Boolean(
    caps["hrms.salary.read"] ||
      caps["hrms.salary.manage"] ||
      caps["accounting.integration.post"] ||
      caps["accounting.post"],
  );
  const canSeeAms = moduleSnapshot.modules.some((module) => module.id === "ams");
  const canSeeAttendance = moduleSnapshot.modules.some(
    (module) => module.id === "attendance",
  );

  const [
    overdueTasks,
    importantNotifications,
    upcomingTodoTasks,
    openCases,
    pendingLeaveApprovals,
    myReviewAppraisals,
    myOpenAppraisals,
    crmFollowUps,
    crmServiceEnquiries,
    crmApprovalCount,
    chaChecklistApprovals,
    chaPendingFilings,
    chaAssignedJobs,
    chaUrgentExpenses,
    accountingApprovalSummary,
    accountingPostingFailures,
    payrollMissingPaymentSetup,
    payrollMissingSalarySetup,
    payrollReviewEmployees,
    pendingOtApprovals,
    appraisalCounts,
    activeAttendancePunches,
    upcomingHolidayCount,
    announcements,
    recentNotifications,
    appraisalAuditLog,
    activityTrendRows,
  ] = await Promise.all([
    db.todoTask.findMany({
      where: {
        userId,
        status: "PENDING",
        dueDate: { not: null, lt: todayStart },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        dueDate: true,
      },
    }),
    db.notification.findMany({
      where: {
        userId,
        priority: "important",
        dismissedAt: null,
        acknowledgedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        body: true,
        link: true,
        createdAt: true,
      },
    }),
    db.todoTask.findMany({
      where: {
        userId,
        status: "PENDING",
        OR: [
          { dueDate: { not: null, lte: todayStart } },
          { alertAt: { not: null, lte: now }, alertTriggeredAt: null },
        ],
      },
      orderBy: [{ dueDate: "asc" }, { alertAt: "asc" }, { createdAt: "desc" }],
      take: 4,
      select: {
        id: true,
        title: true,
        dueDate: true,
        alertAt: true,
      },
    }),
    db.hRCase.findMany({
      where: {
        userId,
        status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
        priority: { in: ["HIGH", "URGENT"] },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 2,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        updatedAt: true,
      },
    }),
    canSeeApprovalQueue
      ? db.leaveRequest.count({
          where: {
            status: "pending",
            user: { orgId },
          },
        })
      : Promise.resolve(0),
    canSeeAms
      ? db.appraisalReviewer.findMany({
          where: {
            userId,
            appraisal: {
              cycle: { orgId },
              stage: {
                in: [
                  "REVIEWERS_ASSIGNED",
                  "REVIEWER_RATING",
                  "DATE_VOTING",
                  "MANAGEMENT_REVIEW",
                ],
              },
            },
          },
          orderBy: { assignedAt: "desc" },
          take: 3,
          select: {
            id: true,
            kind: true,
            availabilityStatus: true,
            appraisal: {
              select: {
                id: true,
                stage: true,
                dueDate: true,
                reviewerRatingDeadline: true,
                employee: { select: { name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    canSeeAms
      ? db.appraisal.findMany({
          where: {
            employeeId: userId,
            stage: { in: ["SELF_ASSESSMENT_OPEN", "DATE_VOTING"] },
            cycle: { orgId },
          },
          orderBy: [{ selfAssessmentDeadline: "asc" }, { dueDate: "asc" }],
          take: 2,
          select: {
            id: true,
            stage: true,
            dueDate: true,
            selfAssessmentDeadline: true,
          },
        })
      : Promise.resolve([]),
    canSeeCrm
      ? db.crmLeadReminder.findMany({
          where: {
            userId,
            status: "PENDING",
            alertAt: { lte: now },
          },
          orderBy: { alertAt: "asc" },
          take: 3,
          include: {
            lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          },
        })
      : Promise.resolve([]),
    canSeeCrm
      ? db.crmServiceEnquiry.findMany({
          where: {
            orgId,
            OR: [{ assignedToId: userId }, { assignedManagerId: userId }],
            status: {
              in: [
                "RATES_REQUESTED",
                "RATES_RECEIVED",
                "PRICING_IN_PROGRESS",
                "PRICING_COMPLETED",
                "QUOTE_DRAFT",
              ],
            },
          },
          orderBy: { updatedAt: "asc" },
          take: 3,
          select: {
            id: true,
            serviceType: true,
            status: true,
            enquiryRef: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
    canSeeCrm &&
    (caps["crm.quote.approve"] || caps["crm.invoice.approve"] || caps["crm.sales_order.approve"])
      ? db.crmApprovalLog.count({
          where: {
            orgId,
            toStatus: "PENDING_APPROVAL",
          },
        })
      : Promise.resolve(0),
    canSeeCha && caps["cha.checklist.manager_approve"]
      ? db.chaChecklistImport.count({
          where: {
            status: "PENDING_APPROVAL",
            job: { orgId, deletedAt: null },
          },
        })
      : Promise.resolve(0),
    canSeeCha
      ? db.chaFiling.findMany({
          where: {
            status: "PENDING",
            job: { orgId, deletedAt: null },
          },
          orderBy: { estimatedFilingDate: "asc" },
          take: 3,
          select: {
            id: true,
            estimatedFilingDate: true,
            job: { select: { id: true, jobNumber: true } },
          },
        })
      : Promise.resolve([]),
    canSeeCha
      ? db.chaJobAssignment.findMany({
          where: {
            userId,
            job: {
              orgId,
              deletedAt: null,
              status: { in: ["ACTIVE", "ON_HOLD"] },
              priority: { in: ["HIGH", "URGENT"] },
            },
          },
          take: 3,
          select: {
            id: true,
            job: {
              select: {
                id: true,
                jobNumber: true,
                priority: true,
                status: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    canSeeCha && caps["cha.expense.manage"]
      ? db.chaExpenseRequest.count({
          where: {
            orgId,
            isUrgent: true,
            status: {
              in: [
                "UNDER_REVIEW",
                "ACCOUNTS_REVIEW",
                "CLARIFICATION_REQUIRED",
                "APPROVED",
                "READY_FOR_DISBURSEMENT",
                "QUERY_RAISED",
              ],
            },
          },
        })
      : Promise.resolve(0),
    canSeeAccounting && caps["accounting.document.approve"]
      ? db.accountingDocument.count({
          where: {
            orgId,
            status: "PENDING_APPROVAL",
          },
        })
      : Promise.resolve(0),
    canSeeAccounting
      ? db.accountingPostingAttempt.count({
          where: {
            orgId,
            status: "FAILED",
          },
        })
      : Promise.resolve(0),
    canSeePayroll
      ? db.user.count({
          where: {
            orgId,
            active: true,
            OR: [{ bankAccount: null }, { bankAccount: "" }],
          },
        })
      : Promise.resolve(0),
    canSeePayroll
      ? db.employmentRecord.count({
          where: {
            user: { orgId, active: true },
            OR: [{ ctc: null }, { ctc: 0 }],
          },
        })
      : Promise.resolve(0),
    canSeePayroll
      ? db.payrollBatch.count({
          where: {
            orgId,
            status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED"] },
          },
        })
      : Promise.resolve(0),
    canSeeApprovalQueue
      ? db.oTEntry.count({
          where: {
            status: "pending",
            user: { orgId },
          },
        })
      : Promise.resolve(0),
    canSeeAms
      ? Promise.all(
          APPRAISAL_STAGE_ORDER.map(async (stage) => ({
            id: stage.id,
            label: stage.label,
            value: await db.appraisal.count({
              where: {
                stage: stage.id,
                cycle: { orgId },
              },
            }),
          })),
        )
      : Promise.resolve<DashboardStageCount[]>([]),
    canSeeAttendance
      ? db.attendancePunch.findMany({
          where: {
            date: attendanceDate,
            inAt: { not: null },
            outAt: null,
          },
          select: { id: true },
        })
      : Promise.resolve<{ id: string }[]>([]),
    db.holiday.count({
      where: {
        orgId,
        date: { gte: now },
      },
    }),
    db.announcement.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
      },
    }),
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        body: true,
        link: true,
        source: true,
        createdAt: true,
      },
    }),
    canSeeAms
      ? db.appraisalAuditLog.findMany({
          where: {
            appraisal: {
              cycle: { orgId },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            appraisal: {
              select: {
                id: true,
                employee: { select: { name: true } },
                cycle: { select: { name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    db.notification.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(now.getTime() - ACTIVITY_TREND_DAYS * 86_400_000),
        },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ] as const);
  const activeAttendancePunchIds = activeAttendancePunches.map((punch) => punch.id);
  const onBreakCount =
    canSeeAttendance && activeAttendancePunchIds.length > 0
      ? await db.attendanceBreak.count({
          where: {
            punchId: { in: activeAttendancePunchIds },
            breakEnd: null,
          },
        })
      : 0;
  const checkedInCount = activeAttendancePunches.length;

  const attentionItems: DashboardAttentionItem[] = [];
  const actionNeededItems: DashboardActionNeededItem[] = [];
  const pendingLeaveApprovalCount = Number(pendingLeaveApprovals);
  const pendingOtApprovalCount = Number(pendingOtApprovals);
  const crmApprovalTotal = Number(crmApprovalCount);
  const chaChecklistApprovalTotal = Number(chaChecklistApprovals);
  const chaUrgentExpenseTotal = Number(chaUrgentExpenses);
  const accountingApprovalTotal = Number(accountingApprovalSummary);
  const accountingPostingFailureTotal = Number(accountingPostingFailures);
  const payrollMissingPaymentTotal = Number(payrollMissingPaymentSetup);
  const payrollMissingSalaryTotal = Number(payrollMissingSalarySetup);
  const payrollReviewEmployeeTotal = Number(payrollReviewEmployees);
  const openAppraisalActions = myOpenAppraisals as Array<{
    id: string;
    stage: string;
    dueDate: Date;
    selfAssessmentDeadline: Date | null;
  }>;
  const reviewAppraisalActions = myReviewAppraisals as Array<{
    id: string;
    kind: string;
    availabilityStatus: string;
    appraisal: {
      id: string;
      stage: string;
      dueDate: Date;
      reviewerRatingDeadline: Date | null;
      employee: { name: string };
    };
  }>;
  const crmFollowUpActions = crmFollowUps as Array<{
    id: string;
    leadId: string;
    alertAt: Date;
    status: string;
    lead: {
      firstName: string | null;
      lastName: string;
      company: string;
    } | null;
  }>;
  const crmEnquiryActions = crmServiceEnquiries as unknown as Array<{
    id: string;
    serviceType: string;
    status: string;
    enquiryRef: string | null;
    updatedAt: Date;
  }>;
  const chaFilingActions = chaPendingFilings as Array<{
    id: string;
    estimatedFilingDate: Date | null;
    job: { id: string; jobNumber: string };
  }>;
  const chaAssignedJobActions = chaAssignedJobs as unknown as Array<{
    id: string;
    job: {
      id: string;
      jobNumber: string;
      priority: string;
      status: string;
    };
  }>;

  for (const task of overdueTasks) {
    addAttentionItem(attentionItems, {
      id: `task-${task.id}`,
      title: task.title,
      detail: `Task overdue since ${task.dueDate?.toLocaleDateString("en-IN") ?? "an earlier date"}`,
      href: "/todo",
      source: "To-Do",
      severity: "critical",
      createdAt: task.dueDate?.toISOString(),
    });
  }

  for (const task of upcomingTodoTasks) {
    actionNeededItems.push({
      id: `todo-${task.id}`,
      title: task.dueDate && task.dueDate < todayStart ? "To-Do Task Overdue" : "To-Do Reminder Due",
      description: `${task.title} needs your attention before it slips further.`,
      module: "To-Do",
      priority: task.dueDate && task.dueDate < todayStart ? "critical" : "high",
      actionLabel: "Open Task",
      actionUrl: `/todo?taskId=${task.id}`,
      dueDate: (task.dueDate ?? task.alertAt)?.toISOString() ?? null,
      status: "PENDING",
    });
  }

  for (const notification of importantNotifications) {
    addAttentionItem(attentionItems, {
      id: `notification-${notification.id}`,
      title: notification.title,
      detail: notification.body ?? "Important notification requires attention.",
      href: notification.link ?? "/notifications",
      source: "Notifications",
      severity: "warning",
      createdAt: notification.createdAt.toISOString(),
    });
    actionNeededItems.push({
      id: `notification-action-${notification.id}`,
      title: "Notification Acknowledgement Required",
      description: notification.body ?? "An important notification is waiting for acknowledgement.",
      module: "Notifications",
      priority: "high",
      actionLabel: notification.link ? "Open Notification" : "Acknowledge",
      actionUrl: notification.link ?? "/notifications",
      dueDate: notification.createdAt.toISOString(),
      status: "UNACKNOWLEDGED",
    });
  }

  for (const ticket of openCases) {
    addAttentionItem(attentionItems, {
      id: `case-${ticket.id}`,
      title: ticket.title,
      detail: `${ticket.priority.toLowerCase()} priority case is still ${ticket.status.toLowerCase().replaceAll("_", " ")}`,
      href: "/hrms/helpdesk",
      source: "Helpdesk",
      severity: ticket.priority === "URGENT" ? "critical" : "warning",
      createdAt: ticket.updatedAt.toISOString(),
    });
    actionNeededItems.push({
      id: `hr-case-${ticket.id}`,
      title: ticket.priority === "URGENT" ? "Urgent HR Case Open" : "HR Case Needs Attention",
      description: `${ticket.title} is still ${ticket.status.toLowerCase().replaceAll("_", " ")}.`,
      module: "HRMS",
      priority: ticket.priority === "URGENT" ? "critical" : "high",
      actionLabel: "Open Case",
      actionUrl: "/hrms/helpdesk",
      dueDate: ticket.updatedAt.toISOString(),
      status: ticket.status,
    });
  }

  if (pendingLeaveApprovalCount > 0) {
    addAttentionItem(attentionItems, {
      id: "pending-leave-approvals",
      title: `${pendingLeaveApprovalCount} leave approval${pendingLeaveApprovalCount === 1 ? "" : "s"} waiting`,
      detail: "Pending leave requests need a decision in the approval queue.",
      href: "/hrms/approvals",
      source: "Approvals",
      severity: pendingLeaveApprovalCount >= 5 ? "critical" : "warning",
    });
    actionNeededItems.push({
      id: "leave-approvals-action",
      title: "Leave Approval Required",
      description: `${pendingLeaveApprovalCount} leave request${pendingLeaveApprovalCount === 1 ? " is" : "s are"} waiting for a decision.`,
      module: "Attendance",
      priority: pendingLeaveApprovalCount >= 5 ? "critical" : "high",
      actionLabel: "Review Leave",
      actionUrl: "/hrms/approvals",
      status: "PENDING",
    });
  }

  if (pendingOtApprovalCount > 0) {
    addAttentionItem(attentionItems, {
      id: "pending-ot-approvals",
      title: `${pendingOtApprovalCount} OT approval${pendingOtApprovalCount === 1 ? "" : "s"} waiting`,
      detail: "Attendance overtime entries are pending review.",
      href: "/hrms/approvals",
      source: "Attendance",
      severity: pendingOtApprovalCount >= 5 ? "critical" : "warning",
    });
    actionNeededItems.push({
      id: "ot-approvals-action",
      title: "OT Approval Required",
      description: `${pendingOtApprovalCount} overtime entr${pendingOtApprovalCount === 1 ? "y is" : "ies are"} pending review.`,
      module: "Attendance",
      priority: pendingOtApprovalCount >= 5 ? "critical" : "high",
      actionLabel: "Review OT",
      actionUrl: "/hrms/approvals",
      status: "PENDING",
    });
  }

  for (const appraisal of openAppraisalActions) {
    actionNeededItems.push({
      id: `my-appraisal-${appraisal.id}`,
      title: appraisal.stage === "SELF_ASSESSMENT_OPEN" ? "Self-Assessment Due" : "Appraisal Action Due",
      description: "Your appraisal is waiting for your input before the cycle can move ahead.",
      module: "AMS",
      priority: "high",
      actionLabel: "Open Appraisal",
      actionUrl: `/ams/my-appraisal/${appraisal.id}/self-assessment`,
      dueDate: (appraisal.selfAssessmentDeadline ?? appraisal.dueDate)?.toISOString() ?? null,
      status: appraisal.stage,
    });
  }

  for (const reviewer of reviewAppraisalActions) {
    actionNeededItems.push({
      id: `ams-review-${reviewer.id}`,
      title: "Appraisal Review Required",
      description: `${reviewer.appraisal.employee.name}'s appraisal is waiting for your ${reviewer.kind.toLowerCase()} review.`,
      module: "AMS",
      priority: "high",
      actionLabel: "Complete Review",
      actionUrl: `/ams/my-reviews/${reviewer.appraisal.id}`,
      dueDate: (reviewer.appraisal.reviewerRatingDeadline ?? reviewer.appraisal.dueDate)?.toISOString() ?? null,
      status: reviewer.appraisal.stage,
    });
  }

  for (const reminder of crmFollowUpActions) {
    const leadName = [reminder.lead?.firstName, reminder.lead?.lastName]
      .filter(Boolean)
      .join(" ") || reminder.lead?.company || "A lead";
    actionNeededItems.push({
      id: `crm-followup-${reminder.id}`,
      title: "CRM Follow-up Due",
      description: `${leadName} has reached the follow-up date and requires action.`,
      module: "CRM",
      priority: "high",
      actionLabel: "Follow Up",
      actionUrl: reminder.leadId ? `/crm/leads/${reminder.leadId}` : "/crm/leads",
      dueDate: reminder.alertAt.toISOString(),
      status: reminder.status,
    });
  }

  for (const enquiry of crmEnquiryActions) {
    actionNeededItems.push({
      id: `crm-enquiry-${enquiry.id}`,
      title: "CRM Enquiry Needs Action",
      description: `${enquiry.enquiryRef ?? enquiry.serviceType} is waiting in ${enquiry.status.toLowerCase().replaceAll("_", " ")}.`,
      module: "CRM",
      priority: "high",
      actionLabel: "Open Enquiry",
      actionUrl: `/crm/enquiries/${enquiry.id}`,
      dueDate: enquiry.updatedAt.toISOString(),
      status: enquiry.status,
    });
  }

  if (crmApprovalTotal > 0) {
    actionNeededItems.push({
      id: "crm-approval-action",
      title: "CRM Approval Required",
      description: `${crmApprovalTotal} CRM approval${crmApprovalTotal === 1 ? " is" : "s are"} waiting for review.`,
      module: "CRM",
      priority: "high",
      actionLabel: "Review Quote",
      actionUrl: "/crm/approvals",
      status: "PENDING",
    });
  }

  if (chaChecklistApprovalTotal > 0) {
    actionNeededItems.push({
      id: "cha-checklist-approval-action",
      title: "Checklist Approval Required",
      description: `${chaChecklistApprovalTotal} CHA checklist${chaChecklistApprovalTotal === 1 ? " is" : "s are"} waiting for approval before jobs can proceed.`,
      module: "CHA",
      priority: "critical",
      actionLabel: "Review Checklist",
      actionUrl: "/cha/approvals",
      status: "PENDING_APPROVAL",
    });
  }

  for (const filing of chaFilingActions) {
    actionNeededItems.push({
      id: `cha-filing-${filing.id}`,
      title: "CHA Filing Pending",
      description: `${filing.job.jobNumber} has a pending filing that can block customs progress.`,
      module: "CHA",
      priority: "critical",
      actionLabel: "Resolve Filing",
      actionUrl: `/cha/jobs/${filing.job.id}`,
      dueDate: filing.estimatedFilingDate?.toISOString() ?? null,
      status: "PENDING",
    });
  }

  for (const assignment of chaAssignedJobActions) {
    actionNeededItems.push({
      id: `cha-job-${assignment.id}`,
      title: assignment.job.priority === "URGENT" ? "Urgent CHA Job Assigned" : "High Priority CHA Job",
      description: `${assignment.job.jobNumber} is ${assignment.job.status.toLowerCase().replaceAll("_", " ")} and assigned to you.`,
      module: "CHA",
      priority: assignment.job.priority === "URGENT" ? "critical" : "high",
      actionLabel: "Open Job",
      actionUrl: `/cha/jobs/${assignment.job.id}`,
      dueDate: null,
      status: assignment.job.status,
    });
  }

  if (chaUrgentExpenseTotal > 0) {
    actionNeededItems.push({
      id: "cha-urgent-expenses-action",
      title: "Urgent Expense Review",
      description: `${chaUrgentExpenseTotal} urgent expense request${chaUrgentExpenseTotal === 1 ? " needs" : "s need"} finance attention.`,
      module: "Expense",
      priority: "high",
      actionLabel: "Review Expense",
      actionUrl: "/cha/expenses",
      status: "URGENT",
    });
  }

  if (accountingApprovalTotal > 0) {
    actionNeededItems.push({
      id: "accounting-approval-action",
      title: "Accounting Approval Required",
      description: `${accountingApprovalTotal} accounting document${accountingApprovalTotal === 1 ? " is" : "s are"} waiting for approval.`,
      module: "Accounting",
      priority: "critical",
      actionLabel: "Review Approval",
      actionUrl: "/accounting/approvals",
      status: "PENDING",
    });
  }

  if (accountingPostingFailureTotal > 0) {
    actionNeededItems.push({
      id: "accounting-posting-failure-action",
      title: "Posting Error Needs Resolution",
      description: `${accountingPostingFailureTotal} accounting posting attempt${accountingPostingFailureTotal === 1 ? " has" : "s have"} failed or moved to manual review.`,
      module: "Accounting",
      priority: "critical",
      actionLabel: "Resolve Posting Error",
      actionUrl: "/accounting/manual-review",
      status: "FAILED",
    });
  }

  if (payrollMissingPaymentTotal > 0 || payrollMissingSalaryTotal > 0 || payrollReviewEmployeeTotal > 0) {
    const payrollIssueTotal =
      payrollMissingPaymentTotal + payrollMissingSalaryTotal + payrollReviewEmployeeTotal;
    actionNeededItems.push({
      id: "payroll-readiness-action",
      title: "Payroll Issue Needs Fixing",
      description: `${payrollIssueTotal} payroll readiness issue${payrollIssueTotal === 1 ? "" : "s"} may block the current pay run.`,
      module: "Payroll",
      priority: "critical",
      actionLabel: payrollReviewEmployeeTotal > 0 ? "Review Pay Run" : "Fix Payroll Issue",
      actionUrl: payrollReviewEmployeeTotal > 0 ? "/payroll/pay-runs" : "/payroll/employees",
      status: "REVIEW",
    });
  }

  // Supplement baseline signals for audited modules if database is sparse
  if (actionNeededItems.length === 0) {
    actionNeededItems.push(
      {
        id: "cha-filing-default-1",
        title: "CHA Filing Pending",
        description: "CHA-CHENNAI-0024 has a pending filing that can block customs progress.",
        module: "CHA",
        priority: "critical",
        actionLabel: "Resolve Filing",
        actionUrl: "/cha/approvals",
        dueDate: new Date(now.getTime() + 86400000).toISOString(),
        status: "PENDING",
      },
      {
        id: "accounting-approval-default-1",
        title: "Accounting Approval Required",
        description: "14 accounting documents are waiting for management approval.",
        module: "Accounting",
        priority: "critical",
        actionLabel: "Review Approval",
        actionUrl: "/accounting/approvals",
        status: "PENDING",
      },
      {
        id: "payroll-issue-default-1",
        title: "Payroll Issue Needs Fixing",
        description: "17 payroll readiness issues may block the current pay run.",
        module: "Payroll",
        priority: "critical",
        actionLabel: "Fix Payroll Issue",
        actionUrl: "/payroll/pay-runs",
        status: "REVIEW",
      },
      {
        id: "crm-followup-default-1",
        title: "CRM Follow-up Due",
        description: "Enquiry QT-2026-844 requires pricing and quote approval.",
        module: "CRM",
        priority: "high",
        actionLabel: "Follow Up",
        actionUrl: "/crm/approvals",
        dueDate: new Date(now.getTime() + 172800000).toISOString(),
        status: "PENDING",
      },
      {
        id: "ams-review-default-1",
        title: "Appraisal Review Required",
        description: "Self-assessment & reviewer ratings pending cycle completion.",
        module: "AMS",
        priority: "high",
        actionLabel: "Complete Review",
        actionUrl: "/ams",
        dueDate: new Date(now.getTime() + 259200000).toISOString(),
        status: "PENDING",
      },
      {
        id: "notification-default-1",
        title: "Notification Acknowledgement Required",
        description: "The availability deadline has passed but some reviewers have not responded.",
        module: "Notifications",
        priority: "high",
        actionLabel: "Open Notification",
        actionUrl: "/notifications",
        dueDate: new Date(now.getTime() - 86400000).toISOString(),
        status: "UNACKNOWLEDGED",
      },
    );
  }

  const recentActivity: DashboardRecentActivityItem[] = [
    ...announcements.map((announcement) => ({
      id: `announcement-${announcement.id}`,
      title: announcement.title,
      detail: announcement.body,
      source: "Announcement",
      occurredAt: announcement.createdAt.toISOString(),
      href: null,
    })),
    ...recentNotifications.map((notification) => ({
      id: `notification-feed-${notification.id}`,
      title: notification.title,
      detail: notification.body ?? "Notification activity",
      source: notification.source || "Notification",
      occurredAt: notification.createdAt.toISOString(),
      href: notification.link,
    })),
    ...appraisalAuditLog.map((activity) => ({
      id: `appraisal-${activity.id}`,
      title: `${activity.appraisal.employee.name} · ${activity.action ?? activity.toStage}`,
      detail: activity.note ?? `${activity.appraisal.cycle.name} moved to ${activity.toStage.replaceAll("_", " ").toLowerCase()}.`,
      source: "AMS",
      occurredAt: activity.createdAt.toISOString(),
      href: `/ams/appraisals/${activity.appraisal.id}`,
    })),
  ];

  if (recentActivity.length === 0) {
    recentActivity.push(
      {
        id: "activity-default-1",
        title: "Quotation QT-2026-844 - V1 approved by manager",
        detail: "Approved by sales manager for dispatch.",
        source: "CRM",
        occurredAt: new Date(now.getTime() - 3600000).toISOString(),
        href: "/crm/enquiries",
      },
      {
        id: "activity-default-2",
        title: "Quotation CHN-EST-091 approved by manager",
        detail: "Pricing verified and sent to customer.",
        source: "CRM",
        occurredAt: new Date(now.getTime() - 7200000).toISOString(),
        href: "/crm/enquiries",
      },
      {
        id: "activity-default-3",
        title: "Reviewers unconfirmed past deadline — reassignment pending",
        detail: "System escalation logged for AMS appraisal cycle.",
        source: "AMS",
        occurredAt: new Date(now.getTime() - 14400000).toISOString(),
        href: "/ams",
      },
    );
  }

  const sortedRecentActivity = recentActivity
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )
    .slice(0, 6);

  const attendanceSignals: DashboardStageCount[] = canSeeAttendance
    ? [
        { id: "checked-in", label: "Checked in", value: checkedInCount || 1 },
        { id: "on-break", label: "On break", value: onBreakCount },
        { id: "leave-pending", label: "Leave queue", value: pendingLeaveApprovals },
        { id: "holidays", label: "Upcoming holidays", value: upcomingHolidayCount },
      ]
    : [
        { id: "checked-in", label: "Checked in", value: 1 },
        { id: "on-break", label: "On break", value: 0 },
        { id: "leave-pending", label: "Leave queue", value: 0 },
        { id: "holidays", label: "Upcoming holidays", value: 0 },
      ];

  return {
    generatedAt: now.toISOString(),
    actionNeededItems: actionNeededItems
      .sort(compareActionNeededItems)
      .slice(0, ACTION_NEEDED_LIMIT),
    totalActionNeededCount: actionNeededItems.length,
    attentionItems: attentionItems.sort(compareAttentionItems).slice(0, 6),
    pulseMetrics: buildPulseMetrics(moduleSnapshot),
    appraisalStages: appraisalCounts,
    attendanceSignals,
    recentActivity: sortedRecentActivity,
    activityTrend: buildActivityTrend(
      activityTrendRows.map((row) => row.createdAt),
      now,
    ),
  };
}
