import "server-only";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
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
import { registerDashboardMetricCacheInvalidator } from "./cache";

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
    id: "freight-forwarding",
    title: "Freight forwarding",
    eyebrow: "FORWARDING",
    description: "Prepare the forwarding workspace foundation for future shipment planning and execution flows.",
    href: "/freight-forwarding",
    icon: "freight-forwarding",
    tone: "info",
    primaryLabel: "active jobs",
    primaryDetail: "No freight forwarding workflows are configured yet",
    secondaryLabel: "pending milestones",
    tertiaryLabel: "ready screens",
    actions: [
      { label: "Create booking", href: "/freight-forwarding/create-booking" },
      { label: "Open workspace", href: "/freight-forwarding" },
    ],
    read: async () => ({
      primary: 0,
      secondary: 0,
      tertiary: 0,
    }),
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

type AggregateRow = {
  module: ToggleableModuleSectionId;
  primary: bigint | number;
  secondary: bigint | number;
  tertiary: bigint | number;
};

const metricSnapshotCache = new Map<
  string,
  { expiresAt: number; value: Promise<DashboardModuleSnapshot> }
>();
const METRIC_SNAPSHOT_TTL_MS = 8_000;

function invalidateMetricCache({
  orgId,
  userId,
}: {
  orgId?: string;
  userId?: string;
} = {}) {
  if (!orgId && !userId) {
    metricSnapshotCache.clear();
    return;
  }
  for (const key of metricSnapshotCache.keys()) {
    if ((!orgId || key.includes(`org=${orgId}|`)) && (!userId || key.includes(`user=${userId}|`))) {
      metricSnapshotCache.delete(key);
    }
  }
}

registerDashboardMetricCacheInvalidator(invalidateMetricCache);

function aggregateRow(
  module: ToggleableModuleSectionId,
  primary: Prisma.Sql,
  secondary: Prisma.Sql,
  tertiary: Prisma.Sql,
) {
  return Prisma.sql`SELECT ${module}::text AS module, (${primary})::bigint AS primary, (${secondary})::bigint AS secondary, (${tertiary})::bigint AS tertiary`;
}

async function readAggregatedCounts(context: DashboardReadContext, moduleIds: readonly ToggleableModuleSectionId[]) {
  const enabled = new Set(moduleIds);
  const userRows: Prisma.Sql[] = [];
  const orgRows: Prisma.Sql[] = [];
  const { orgId, userId, attendanceDate, caps } = context;

  if (enabled.has("hrms")) {
    userRows.push(aggregateRow(
      "hrms",
      Prisma.sql`SELECT COUNT(*) FROM "HrmsTask" WHERE "assigneeId" = ${userId} AND status = 'PENDING'`,
      Prisma.sql`SELECT COUNT(*) FROM "HRCase" WHERE "userId" = ${userId} AND status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')`,
      Prisma.sql`SELECT COUNT(*) FROM "LeaveRequest" WHERE "userId" = ${userId} AND status = 'pending'`,
    ));
  }
  if (enabled.has("attendance")) {
    userRows.push(aggregateRow(
      "attendance",
      Prisma.sql`SELECT COUNT(*) FROM "AttendancePunch" WHERE "userId" = ${userId} AND date = ${attendanceDate} AND "inAt" IS NOT NULL`,
      Prisma.sql`SELECT COUNT(*) FROM "LeaveRequest" WHERE "userId" = ${userId} AND status = 'pending'`,
      Prisma.sql`SELECT COUNT(*) FROM "OTEntry" WHERE "userId" = ${userId} AND status = 'pending'`,
    ));
  }
  if (enabled.has("ams")) {
    userRows.push(aggregateRow(
      "ams",
      Prisma.sql`SELECT COUNT(*) FROM "Appraisal" a INNER JOIN "AppraisalCycle" c ON c.id = a."cycleId" WHERE a."employeeId" = ${userId} AND c."orgId" = ${orgId} AND a.stage <> 'CLOSED'`,
      Prisma.sql`SELECT COUNT(*) FROM "AppraisalReviewer" r INNER JOIN "Appraisal" a ON a.id = r."appraisalId" INNER JOIN "AppraisalCycle" c ON c.id = a."cycleId" WHERE r."userId" = ${userId} AND c."orgId" = ${orgId} AND a.stage <> 'CLOSED'`,
      Prisma.sql`SELECT COUNT(*) FROM "AppraisalSchedule" WHERE "orgId" = ${orgId} AND "employeeId" = ${userId} AND status = 'SCHEDULED'`,
    ));
  }
  if (enabled.has("lms")) {
    userRows.push(aggregateRow(
      "lms",
      Prisma.sql`SELECT COUNT(*) FROM "Course" WHERE "orgId" = ${orgId}`,
      Prisma.sql`SELECT COUNT(*) FROM "CourseEnrollment" e INNER JOIN "Course" c ON c.id = e."courseId" WHERE e."userId" = ${userId} AND c."orgId" = ${orgId} AND e.status IN ('ENROLLED', 'IN_PROGRESS')`,
      Prisma.sql`SELECT COUNT(*) FROM "CourseEnrollment" e INNER JOIN "Course" c ON c.id = e."courseId" WHERE e."userId" = ${userId} AND c."orgId" = ${orgId} AND e.status = 'COMPLETED'`,
    ));
  }
  if (enabled.has("communication")) {
    userRows.push(aggregateRow(
      "communication",
      Prisma.sql`SELECT COUNT(*) FROM "GoogleChatSpace" WHERE "orgId" = ${orgId} AND "linkStatus" = 'active'`,
      Prisma.sql`SELECT COUNT(*) FROM "GoogleChatSubscription" WHERE "userId" = ${userId} AND enabled = true`,
      Prisma.sql`SELECT COUNT(*) FROM "GoogleWorkspaceConnection" WHERE "userId" = ${userId} AND status = 'connected'`,
    ));
  }
  if (enabled.has("expense")) {
    userRows.push(aggregateRow(
      "expense",
      Prisma.sql`SELECT COUNT(*) FROM "ChaExpenseRequest" WHERE "orgId" = ${orgId} AND "requestedById" = ${userId} AND status IN ('UNDER_REVIEW', 'ACCOUNTS_REVIEW', 'CLARIFICATION_REQUIRED', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'QUERY_RAISED')`,
      Prisma.sql`SELECT COUNT(*) FROM "ChaExpenseRequest" WHERE "orgId" = ${orgId} AND "requestedById" = ${userId} AND "isUrgent" = true AND status IN ('UNDER_REVIEW', 'ACCOUNTS_REVIEW', 'CLARIFICATION_REQUIRED', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'QUERY_RAISED')`,
      Prisma.sql`SELECT COUNT(*) FROM "ChaExpenseRequest" WHERE "orgId" = ${orgId} AND "requestedById" = ${userId} AND status = 'PAID'`,
    ));
  }
  if (enabled.has("crm")) {
    orgRows.push(aggregateRow(
      "crm",
      Prisma.sql`SELECT COUNT(*) FROM "CrmLead" WHERE "orgId" = ${orgId} AND "isConverted" = false AND status <> 'LOST'`,
      Prisma.sql`SELECT COUNT(*) FROM "CrmDeal" WHERE "orgId" = ${orgId} AND stage NOT IN ('WON', 'LOST')`,
      Prisma.sql`SELECT COUNT(*) FROM "CrmAccount" WHERE "orgId" = ${orgId} AND status = 'ACTIVE'`,
    ));
  }
  if (enabled.has("cha")) {
    orgRows.push(aggregateRow(
      "cha",
      Prisma.sql`SELECT COUNT(*) FROM "ChaJob" WHERE "orgId" = ${orgId} AND "deletedAt" IS NULL AND status = 'ACTIVE'`,
      Prisma.sql`SELECT COUNT(*) FROM "ChaJob" WHERE "orgId" = ${orgId} AND "deletedAt" IS NULL AND status = 'ACTIVE' AND priority IN ('HIGH', 'URGENT')`,
      Prisma.sql`SELECT COUNT(*) FROM "ChaJob" WHERE "orgId" = ${orgId} AND "deletedAt" IS NULL AND status = 'ON_HOLD'`,
    ));
  }
  if (enabled.has("accounting")) {
    orgRows.push(aggregateRow(
      "accounting",
      Prisma.sql`SELECT COUNT(*) FROM "SalesInvoice" WHERE "orgId" = ${orgId} AND status IN ('UNPAID', 'PARTLY_PAID', 'OVERDUE')`,
      Prisma.sql`SELECT COUNT(*) FROM "PurchaseInvoice" WHERE "orgId" = ${orgId} AND status IN ('UNPAID', 'PARTLY_PAID', 'OVERDUE')`,
      Prisma.sql`SELECT COUNT(*) FROM "JournalEntry" WHERE "orgId" = ${orgId} AND status = 'DRAFT'`,
    ));
  }
  if (enabled.has("recruit")) {
    const employerView = Boolean(
      caps["recruit.view"] || caps["recruit.dashboard.view"] || caps["recruit.application.manage"],
    );
    (employerView ? orgRows : userRows).push(
      employerView
        ? aggregateRow(
            "recruit",
            Prisma.sql`SELECT COUNT(*) FROM "RecruitJobOpening" WHERE "orgId" = ${orgId} AND "deletedAt" IS NULL AND status IN ('APPROVED', 'PUBLISHED')`,
            Prisma.sql`SELECT COUNT(*) FROM "RecruitApplication" WHERE "orgId" = ${orgId} AND "deletedAt" IS NULL AND stage IN ('NEW', 'RESUME_REVIEW', 'SCREENING', 'SHORTLISTED', 'ASSESSMENT', 'INTERVIEW', 'HIRING_MANAGER_REVIEW', 'OFFER_APPROVAL', 'OFFER_SENT', 'ON_HOLD')`,
            Prisma.sql`SELECT COUNT(*) FROM "RecruitCandidate" WHERE "orgId" = ${orgId} AND "deletedAt" IS NULL`,
          )
        : aggregateRow(
            "recruit",
            Prisma.sql`SELECT COUNT(*) FROM "RecruitJobOpening" WHERE "orgId" = ${orgId} AND "deletedAt" IS NULL AND status = 'PUBLISHED'`,
            Prisma.sql`SELECT COUNT(*) FROM "RecruitJobSeekerApplication" WHERE "ownerId" = ${userId} AND "privateStatus" NOT IN ('ACCEPTED', 'REJECTED', 'WITHDRAWN', 'ARCHIVED')`,
            Prisma.sql`SELECT COUNT(*) FROM "RecruitJobMatch" WHERE "ownerId" = ${userId}`,
          ),
    );
  }

  const [userCounts, orgCounts] = await Promise.all([
    userRows.length
      ? db.$queryRaw<AggregateRow[]>(Prisma.join(userRows, " UNION ALL "))
      : Promise.resolve([]),
    orgRows.length
      ? db.$queryRaw<AggregateRow[]>(Prisma.join(orgRows, " UNION ALL "))
      : Promise.resolve([]),
  ]);
  return new Map(
    [...userCounts, ...orgCounts].map((row) => [
      row.module,
      {
        primary: Number(row.primary),
        secondary: Number(row.secondary),
        tertiary: Number(row.tertiary),
      },
    ]),
  );
}

function summaryFromCounts(
  definition: ModuleDefinition,
  counts: ModuleCounts | undefined,
): DashboardModuleSummary {
  if (!counts) return unavailableSummary(definition);
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
  const permissionFingerprint = Object.keys(caps).filter((key) => caps[key]).sort().join(",");
  const moduleFingerprint = [...visibleModuleIds].sort().join(",");
  const key = `org=${orgId}|user=${userId}|modules=${moduleFingerprint}|caps=${permissionFingerprint}`;
  const cached = metricSnapshotCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = (async () => {
    const now = await getNow();
    const visibleSet = new Set<ToggleableModuleSectionId>(visibleModuleIds);
    const definitions = MODULE_DEFINITIONS.filter((definition) => visibleSet.has(definition.id));
    const dynamicDefinitions = definitions.filter((definition) => definition.id !== "product-catalogue");
    const counts = await readAggregatedCounts(
      { orgId, userId, caps, attendanceDate: toAttendanceDate(now) },
      dynamicDefinitions.map((definition) => definition.id),
    );
    counts.set("product-catalogue", {
      primary: catalogueModules.length,
      secondary: catalogueModules.filter((module) => module.status === "Implemented").length,
      tertiary: detailedWorkflowStages.length,
    });
    if (visibleSet.has("freight-forwarding")) {
      counts.set("freight-forwarding", {
        primary: 0,
        secondary: 0,
        tertiary: 0,
      });
    }
    return {
      modules: definitions.map((definition) => summaryFromCounts(definition, counts.get(definition.id))),
      generatedAt: now.toISOString(),
    };
  })();
  metricSnapshotCache.set(key, { expiresAt: Date.now() + METRIC_SNAPSHOT_TTL_MS, value });
  value.catch(() => metricSnapshotCache.delete(key));
  return value;
}
