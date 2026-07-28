import "server-only";

import { db } from "@/lib/db";
import { toAttendanceDate } from "@/lib/attendance-date";
import { getNow } from "@/lib/clock";
import { detailedWorkflowStages, modules as catalogueModules } from "@/lib/catalogue-data";
import type { Caps } from "@/lib/rbac";
import type { ToggleableModuleSectionId } from "@/modules/core/organisation/module-config";
import type {
  DashboardModuleAction,
  DashboardModuleIcon,
  DashboardModuleSnapshot,
  DashboardModuleSummary,
  DashboardModuleTone,
} from "./types";

type ModuleCounts = {
  primary: number;
  secondary: number;
  tertiary: number;
};

type ModuleDefinition = {
  id: ToggleableModuleSectionId;
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  icon: DashboardModuleIcon;
  tone: DashboardModuleTone;
  primaryLabel: string;
  primaryDetail: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  actions: DashboardModuleAction[];
  read: (context: DashboardReadContext) => Promise<ModuleCounts>;
};

type DashboardReadContext = {
  orgId: string;
  userId: string;
  caps: Caps;
  attendanceDate: Date;
};

const OPEN_EXPENSE_STATUSES = [
  "UNDER_REVIEW",
  "ACCOUNTS_REVIEW",
  "CLARIFICATION_REQUIRED",
  "APPROVED",
  "READY_FOR_DISBURSEMENT",
  "QUERY_RAISED",
] as const;

const OPEN_APPLICATION_STAGES = [
  "NEW",
  "RESUME_REVIEW",
  "SCREENING",
  "SHORTLISTED",
  "ASSESSMENT",
  "INTERVIEW",
  "HIRING_MANAGER_REVIEW",
  "OFFER_APPROVAL",
  "OFFER_SENT",
  "ON_HOLD",
] as const;

const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  {
    id: "product-catalogue",
    title: "Product catalogue",
    eyebrow: "SYSTEM MAP",
    description: "Explore implemented capabilities, workflows, and technical references.",
    href: "/product-catalogue",
    icon: "product-catalogue",
    tone: "neutral",
    primaryLabel: "catalogued modules",
    primaryDetail: "Documented operational workspaces",
    secondaryLabel: "implemented",
    tertiaryLabel: "workflow stages",
    actions: [
      { label: "Open catalogue", href: "/product-catalogue" },
    ],
    read: async () => ({
      primary: catalogueModules.length,
      secondary: catalogueModules.filter((module) => module.status === "Implemented").length,
      tertiary: detailedWorkflowStages.length,
    }),
  },
  {
    id: "hrms",
    title: "People operations",
    eyebrow: "HRMS",
    description: "Monitor the workforce, employee requests, and open people cases.",
    href: "/hrms",
    icon: "hrms",
    tone: "info",
    primaryLabel: "my pending tasks",
    primaryDetail: "People-operations tasks currently assigned to you",
    secondaryLabel: "my open cases",
    tertiaryLabel: "pending leaves",
    actions: [
      { label: "HR dashboard", href: "/hrms" },
      { label: "Employees", href: "/hrms/employees" },
    ],
    read: async ({ userId }) => {
      const [primary, secondary, tertiary] = await Promise.all([
        db.hrmsTask.count({ where: { assigneeId: userId, status: "PENDING" } }),
        db.hRCase.count({
          where: { userId, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
        }),
        db.leaveRequest.count({ where: { userId, status: "pending" } }),
      ]);
      return { primary, secondary, tertiary };
    },
  },
  {
    id: "attendance",
    title: "Attendance control",
    eyebrow: "ATTENDANCE",
    description: "See today’s live attendance and requests needing action.",
    href: "/attendance",
    icon: "attendance",
    tone: "success",
    primaryLabel: "my attendance today",
    primaryDetail: "Your recorded check-in for today",
    secondaryLabel: "my pending leaves",
    tertiaryLabel: "my pending OT",
    actions: [
      { label: "Attendance", href: "/attendance" },
      { label: "Punch workspace", href: "/attendance/punch" },
    ],
    read: async ({ userId, attendanceDate }) => {
      const [primary, secondary, tertiary] = await Promise.all([
        db.attendancePunch.count({
          where: {
            date: attendanceDate,
            inAt: { not: null },
            userId,
          },
        }),
        db.leaveRequest.count({ where: { userId, status: "pending" } }),
        db.oTEntry.count({ where: { userId, status: "pending" } }),
      ]);
      return { primary, secondary, tertiary };
    },
  },
  {
    id: "ams",
    title: "Performance cycles",
    eyebrow: "AMS",
    description: "Track appraisal cycles, active reviews, and scheduled evaluations.",
    href: "/ams",
    icon: "ams",
    tone: "warning",
    primaryLabel: "open appraisals",
    primaryDetail: "Appraisals moving through active stages",
    secondaryLabel: "assigned reviews",
    tertiaryLabel: "my scheduled",
    actions: [
      { label: "AMS dashboard", href: "/ams" },
      { label: "Appraisals", href: "/ams/appraisals" },
    ],
    read: async ({ orgId, userId }) => {
      const [primary, secondary, tertiary] = await Promise.all([
        db.appraisal.count({
          where: { employeeId: userId, cycle: { orgId }, stage: { not: "CLOSED" } },
        }),
        db.appraisalReviewer.count({
          where: {
            userId,
            appraisal: { cycle: { orgId }, stage: { not: "CLOSED" } },
          },
        }),
        db.appraisalSchedule.count({
          where: { orgId, employeeId: userId, status: "SCHEDULED" },
        }),
      ]);
      return { primary, secondary, tertiary };
    },
  },
  {
    id: "lms",
    title: "Learning hub",
    eyebrow: "LMS",
    description: "Follow available courses and your current learning progress.",
    href: "/lms",
    icon: "lms",
    tone: "info",
    primaryLabel: "available courses",
    primaryDetail: "Courses currently available to the organization",
    secondaryLabel: "in progress",
    tertiaryLabel: "completed",
    actions: [
      { label: "Learning dashboard", href: "/lms" },
      { label: "My learning", href: "/lms/my-learning" },
    ],
    read: async ({ orgId, userId }) => {
      const [primary, secondary, tertiary] = await Promise.all([
        db.course.count({ where: { orgId } }),
        db.courseEnrollment.count({
          where: { userId, status: { in: ["ENROLLED", "IN_PROGRESS"] }, course: { orgId } },
        }),
        db.courseEnrollment.count({
          where: { userId, status: "COMPLETED", course: { orgId } },
        }),
      ]);
      return { primary, secondary, tertiary };
    },
  },
  {
    id: "crm",
    title: "Customer pipeline",
    eyebrow: "CRM",
    description: "Watch new demand, active deals, and customer accounts.",
    href: "/crm/dashboard",
    icon: "crm",
    tone: "success",
    primaryLabel: "open leads",
    primaryDetail: "Leads still moving through qualification",
    secondaryLabel: "active deals",
    tertiaryLabel: "customers",
    actions: [
      { label: "CRM dashboard", href: "/crm/dashboard" },
      { label: "Lead pipeline", href: "/crm/leads" },
    ],
    read: async ({ orgId }) => {
      const [primary, secondary, tertiary] = await Promise.all([
        db.crmLead.count({ where: { orgId, isConverted: false, status: { not: "LOST" } } }),
        db.crmDeal.count({ where: { orgId, stage: { notIn: ["WON", "LOST"] } } }),
        db.crmAccount.count({ where: { orgId, status: "ACTIVE" } }),
      ]);
      return { primary, secondary, tertiary };
    },
  },
  {
    id: "communication",
    title: "Communication",
    eyebrow: "WORKSPACE",
    description: "Keep team spaces, notification routes, and your Workspace connection visible.",
    href: "/communication",
    icon: "communication",
    tone: "info",
    primaryLabel: "active spaces",
    primaryDetail: "Connected spaces available to the organization",
    secondaryLabel: "my subscriptions",
    tertiaryLabel: "connections",
    actions: [
      { label: "Open workspace", href: "/communication" },
      { label: "Job spaces", href: "/communication/job-spaces" },
    ],
    read: async ({ orgId, userId }) => {
      const [primary, secondary, tertiary] = await Promise.all([
        db.googleChatSpace.count({ where: { orgId, linkStatus: "active" } }),
        db.googleChatSubscription.count({ where: { userId, enabled: true } }),
        db.googleWorkspaceConnection.count({ where: { userId, status: "connected" } }),
      ]);
      return { primary, secondary, tertiary };
    },
  },
  {
    id: "expense",
    title: "Expense desk",
    eyebrow: "EXPENSE",
    description: "Review your expense requests, urgent items, and completed reimbursements.",
    href: "/expense",
    icon: "expense",
    tone: "warning",
    primaryLabel: "open requests",
    primaryDetail: "Your requests still moving through approval",
    secondaryLabel: "urgent",
    tertiaryLabel: "paid",
    actions: [
      { label: "Expense workspace", href: "/expense" },
      { label: "CHA expenses", href: "/cha/expenses" },
    ],
    read: async ({ orgId, userId }) => {
      const [primary, secondary, tertiary] = await Promise.all([
        db.chaExpenseRequest.count({
          where: { orgId, requestedById: userId, status: { in: [...OPEN_EXPENSE_STATUSES] } },
        }),
        db.chaExpenseRequest.count({
          where: {
            orgId,
            requestedById: userId,
            isUrgent: true,
            status: { in: [...OPEN_EXPENSE_STATUSES] },
          },
        }),
        db.chaExpenseRequest.count({
          where: { orgId, requestedById: userId, status: "PAID" },
        }),
      ]);
      return { primary, secondary, tertiary };
    },
  },
  {
    id: "cha",
    title: "Shipment operations",
    eyebrow: "CHA",
    description: "Track active customs jobs, high-priority work, and jobs nearing closure.",
    href: "/cha",
    icon: "cha",
    tone: "warning",
    primaryLabel: "active jobs",
    primaryDetail: "Customs jobs currently in motion",
    secondaryLabel: "high priority",
    tertiaryLabel: "on hold",
    actions: [
      { label: "CHA dashboard", href: "/cha" },
      { label: "Job workspace", href: "/cha/jobs" },
    ],
    read: async ({ orgId }) => {
      const [primary, secondary, tertiary] = await Promise.all([
        db.chaJob.count({ where: { orgId, deletedAt: null, status: "ACTIVE" } }),
        db.chaJob.count({
          where: {
            orgId,
            deletedAt: null,
            status: "ACTIVE",
            priority: { in: ["HIGH", "URGENT"] },
          },
        }),
        db.chaJob.count({ where: { orgId, deletedAt: null, status: "ON_HOLD" } }),
      ]);
      return { primary, secondary, tertiary };
    },
  },
  {
    id: "accounting",
    title: "Financial control",
    eyebrow: "ACCOUNTING",
    description: "Surface receivables, payables, and journal work awaiting submission.",
    href: "/accounting",
    icon: "accounting",
    tone: "success",
    primaryLabel: "open receivables",
    primaryDetail: "Sales invoices with an outstanding balance",
    secondaryLabel: "open payables",
    tertiaryLabel: "draft journals",
    actions: [
      { label: "Accounting", href: "/accounting" },
      { label: "Sales invoices", href: "/accounting/sales-invoices" },
    ],
    read: async ({ orgId }) => {
      const [primary, secondary, tertiary] = await Promise.all([
        db.salesInvoice.count({
          where: { orgId, status: { in: ["UNPAID", "PARTLY_PAID", "OVERDUE"] } },
        }),
        db.purchaseInvoice.count({
          where: { orgId, status: { in: ["UNPAID", "PARTLY_PAID", "OVERDUE"] } },
        }),
        db.journalEntry.count({ where: { orgId, status: "DRAFT" } }),
      ]);
      return { primary, secondary, tertiary };
    },
  },
  {
    id: "recruit",
    title: "Talent pipeline",
    eyebrow: "RECRUIT",
    description: "Follow open positions and candidates progressing through hiring.",
    href: "/hrms/recruit",
    icon: "recruit",
    tone: "info",
    primaryLabel: "open positions",
    primaryDetail: "Published or approved roles still accepting candidates",
    secondaryLabel: "active applications",
    tertiaryLabel: "candidates",
    actions: [
      { label: "Recruit dashboard", href: "/hrms/recruit" },
      { label: "Job openings", href: "/hrms/recruit/employer/jobs" },
    ],
    read: async ({ orgId, userId, caps }) => {
      const canSeeEmployerData = Boolean(
        caps["recruit.view"] ||
          caps["recruit.dashboard.view"] ||
          caps["recruit.application.manage"],
      );

      if (!canSeeEmployerData) {
        const [primary, secondary, tertiary] = await Promise.all([
          db.recruitJobOpening.count({
            where: { orgId, deletedAt: null, status: "PUBLISHED" },
          }),
          db.recruitJobSeekerApplication.count({
            where: {
              ownerId: userId,
              privateStatus: {
                notIn: ["ACCEPTED", "REJECTED", "WITHDRAWN", "ARCHIVED"],
              },
            },
          }),
          db.recruitJobMatch.count({ where: { ownerId: userId } }),
        ]);
        return { primary, secondary, tertiary };
      }

      const [primary, secondary, tertiary] = await Promise.all([
        db.recruitJobOpening.count({
          where: {
            orgId,
            deletedAt: null,
            status: { in: ["APPROVED", "PUBLISHED"] },
          },
        }),
        db.recruitApplication.count({
          where: {
            orgId,
            deletedAt: null,
            stage: { in: [...OPEN_APPLICATION_STAGES] },
          },
        }),
        db.recruitCandidate.count({ where: { orgId, deletedAt: null } }),
      ]);
      return { primary, secondary, tertiary };
    },
  },
] as const;

function unavailableSummary(definition: ModuleDefinition): DashboardModuleSummary {
  return {
    id: definition.id,
    title: definition.title,
    eyebrow: definition.eyebrow,
    description: definition.description,
    href: definition.href,
    icon: definition.icon,
    tone: "neutral",
    primaryMetric: {
      label: "status",
      value: 0,
      detail: "Live module data is temporarily unavailable",
    },
    supportingMetrics: [],
    actions: definition.actions,
    available: false,
  };
}

async function readModuleSummary(
  definition: ModuleDefinition,
  context: DashboardReadContext,
): Promise<DashboardModuleSummary> {
  try {
    const counts = await definition.read(context);
    return {
      id: definition.id,
      title: definition.title,
      eyebrow: definition.eyebrow,
      description: definition.description,
      href: definition.href,
      icon: definition.icon,
      tone: definition.tone,
      primaryMetric: {
        label: definition.primaryLabel,
        value: counts.primary,
        detail: definition.primaryDetail,
      },
      supportingMetrics: [
        { label: definition.secondaryLabel, value: counts.secondary },
        { label: definition.tertiaryLabel, value: counts.tertiary },
      ],
      actions: definition.actions,
      available: true,
    };
  } catch (error) {
    console.error(`[dashboard] Failed to read ${definition.id} summary`, error);
    return unavailableSummary(definition);
  }
}

export async function getDashboardModuleSnapshot({
  orgId,
  userId,
  caps,
  visibleModuleIds,
}: {
  orgId: string;
  userId: string;
  caps: Caps;
  visibleModuleIds: readonly ToggleableModuleSectionId[];
}): Promise<DashboardModuleSnapshot> {
  const now = await getNow();
  const visibleSet = new Set<ToggleableModuleSectionId>(visibleModuleIds);
  const definitions = MODULE_DEFINITIONS.filter((definition) => visibleSet.has(definition.id));
  const context: DashboardReadContext = {
    orgId,
    userId,
    caps,
    attendanceDate: toAttendanceDate(now),
  };

  return {
    modules: await Promise.all(
      definitions.map((definition) => readModuleSummary(definition, context)),
    ),
    generatedAt: now.toISOString(),
  };
}
