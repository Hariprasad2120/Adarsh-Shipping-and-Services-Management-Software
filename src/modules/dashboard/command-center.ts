import "server-only";

import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { toAttendanceDate } from "@/lib/attendance-date";
import type { Caps } from "@/lib/rbac";
import type {
  DashboardAttentionItem,
  DashboardCommandCenterSnapshot,
  DashboardModuleSnapshot,
  DashboardPulseMetric,
  DashboardRecentActivityItem,
  DashboardStageCount,
} from "./types";

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
  const canSeeAms = moduleSnapshot.modules.some((module) => module.id === "ams");
  const canSeeAttendance = moduleSnapshot.modules.some(
    (module) => module.id === "attendance",
  );

  const [
    overdueTasks,
    importantNotifications,
    openCases,
    pendingLeaveApprovals,
    pendingOtApprovals,
    appraisalCounts,
    activeAttendancePunches,
    upcomingHolidayCount,
    announcements,
    recentNotifications,
    appraisalAuditLog,
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
  ]);
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
  }

  if (pendingLeaveApprovals > 0) {
    addAttentionItem(attentionItems, {
      id: "pending-leave-approvals",
      title: `${pendingLeaveApprovals} leave approval${pendingLeaveApprovals === 1 ? "" : "s"} waiting`,
      detail: "Pending leave requests need a decision in the approval queue.",
      href: "/hrms/approvals",
      source: "Approvals",
      severity: pendingLeaveApprovals >= 5 ? "critical" : "warning",
    });
  }

  if (pendingOtApprovals > 0) {
    addAttentionItem(attentionItems, {
      id: "pending-ot-approvals",
      title: `${pendingOtApprovals} OT approval${pendingOtApprovals === 1 ? "" : "s"} waiting`,
      detail: "Attendance overtime entries are pending review.",
      href: "/hrms/approvals",
      source: "Attendance",
      severity: pendingOtApprovals >= 5 ? "critical" : "warning",
    });
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
  ]
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )
    .slice(0, 6);

  const attendanceSignals: DashboardStageCount[] = canSeeAttendance
    ? [
        { id: "checked-in", label: "Checked in", value: checkedInCount },
        { id: "on-break", label: "On break", value: onBreakCount },
        { id: "leave-pending", label: "Leave queue", value: pendingLeaveApprovals },
        { id: "holidays", label: "Upcoming holidays", value: upcomingHolidayCount },
      ]
    : [];

  return {
    generatedAt: now.toISOString(),
    attentionItems: attentionItems.sort(compareAttentionItems).slice(0, 6),
    pulseMetrics: buildPulseMetrics(moduleSnapshot),
    appraisalStages: appraisalCounts,
    attendanceSignals,
    recentActivity,
  };
}
