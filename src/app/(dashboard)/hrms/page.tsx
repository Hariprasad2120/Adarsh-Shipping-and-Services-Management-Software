import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { redirect } from "next/navigation";
import { getVisibleSectionById } from "@/lib/navigation";
import { loadCaps } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { listUsersForDashboard } from "@/modules/core/user/service";
import { db } from "@/lib/db";
import { RECRUIT_APP_STAGES_TERMINAL } from "@/modules/recruit/types";
import {
  BriefcaseBusiness,
  ClipboardCheck,
  ReceiptIndianRupee,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  DashboardInsightCard,
  DashboardInsightGrid,
  DashboardMiniBarChart,
  DashboardSegmentList,
} from "@/components/data-display/dashboard-insights";
import {
  PeopleActionLink,
  PeoplePerson,
  PeopleRecordLink,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSummary,
  PeopleSummaryGrid,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components/people-workspace";

type QuickAction = {
  href: string;
  label: string;
  description: string;
};

type ActionGroup = {
  title: string;
  description: string;
  href: string;
  labels: string[];
};

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(value);
}

function describeMetricParts(parts: Array<{ label: string; value: number }>) {
  return parts.map((part) => `${part.value} ${part.label}`).join(" · ");
}

export default async function HrmsDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orgId = session.user.orgId!;
  const now = await getNow();
  const caps = await loadCaps(session.user.id);
  const recruitEnabled = isRecruitEnabled();

  // The dashboard stays summary-led, so every query is intentionally scoped to
  // counts or lightweight records that can frame action without loading the
  // downstream workspaces themselves.
  const [
    org,
    recentEmployees,
    roles,
    totalActiveCount,
    pendingLeaveRequests,
    openCases,
    pendingTasks,
    pendingTravelRequests,
    pendingWorkReports,
    activeInvitations,
    letterActions,
    payrollRunsInMotion,
    latestPayrollBatch,
    recruitJobsOpen,
    recruitApplicationsOpen,
    recruitCandidates,
  ] = await Promise.all([
    getOrg(orgId),
    listUsersForDashboard(orgId, { active: true, take: 8 }),
    getRoles(orgId),
    db.user.count({ where: { orgId, active: true } }),
    db.leaveRequest.count({
      where: { user: { orgId }, status: "pending" },
    }),
    db.hRCase.count({
      where: { orgId, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
    }),
    db.hrmsTask.count({ where: { orgId, status: "PENDING" } }),
    db.travelRequest.count({ where: { orgId, status: "PENDING" } }),
    db.workReport.count({ where: { orgId, status: "PENDING" } }),
    db.employeeInvitation.count({
      where: {
        orgId,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    }),
    db.hRLetterRequest.count({
      where: {
        orgId,
        status: { in: ["HR_REVIEW", "LEGAL_REVIEW", "MGMT_APPROVAL", "READY_TO_ISSUE"] },
      },
    }),
    db.payrollBatch.count({
      where: { orgId, status: { in: ["DRAFT", "FINALIZED"] } },
    }),
    db.payrollBatch.findFirst({
      where: { orgId },
      orderBy: [{ month: "desc" }, { createdAt: "desc" }],
      select: { month: true, status: true, type: true },
    }),
    recruitEnabled
      ? db.recruitJobOpening.count({
          where: {
            orgId,
            deletedAt: null,
            status: { in: ["APPROVED", "PUBLISHED"] },
          },
        })
      : Promise.resolve(0),
    recruitEnabled
      ? db.recruitApplication.count({
          where: {
            orgId,
            deletedAt: null,
            stage: { notIn: [...RECRUIT_APP_STAGES_TERMINAL] },
          },
        })
      : Promise.resolve(0),
    recruitEnabled
      ? db.recruitCandidate.count({
          where: { orgId, deletedAt: null },
        })
      : Promise.resolve(0),
  ]);

  const hrmsSection = getVisibleSectionById(caps, "hrms");
  const recruitSection = recruitEnabled
    ? getVisibleSectionById(caps, "recruit")
    : null;

  const requestLoad = pendingLeaveRequests + pendingTravelRequests + pendingWorkReports;
  const serviceLoad =
    pendingLeaveRequests +
    openCases +
    pendingTasks +
    pendingTravelRequests +
    pendingWorkReports +
    letterActions;

  const rolloutLoad = recruitEnabled
    ? recruitApplicationsOpen + recruitJobsOpen
    : activeInvitations + letterActions;

  const stats = [
    {
      label: "Active employees",
      value: totalActiveCount,
      detail: `${org?.departments.length ?? 0} departments · ${org?.branches.length ?? 0} branches`,
      icon: Users,
    },
    {
      label: "Service load",
      value: serviceLoad,
      detail: describeMetricParts([
        { label: "leaves", value: pendingLeaveRequests },
        { label: "cases", value: openCases },
        { label: "tasks", value: pendingTasks },
      ]),
      icon: ClipboardCheck,
    },
    {
      label: "Payroll in motion",
      value: payrollRunsInMotion,
      detail: latestPayrollBatch
        ? `${latestPayrollBatch.status.toLowerCase()} · ${formatMonth(latestPayrollBatch.month)}`
        : "No payroll run started yet",
      icon: ReceiptIndianRupee,
    },
    {
      label: recruitEnabled ? "Hiring pipeline" : "Rollout actions",
      value: rolloutLoad,
      detail: recruitEnabled
        ? `${recruitJobsOpen} live jobs · ${recruitApplicationsOpen} active applications`
        : `${activeInvitations} invitations · ${letterActions} document actions`,
      icon: recruitEnabled ? BriefcaseBusiness : ShieldCheck,
    },
  ] as const;

  const descriptionByLabel: Record<string, string> = {
    Dashboard: "Open the executive HR control tower.",
    Employees: "Browse profiles, reporting lines, and contact details.",
    "Onboarding Checklists": "Track onboarding steps, owners, and completion status.",
    "Work Reports": "Review submitted work logs and daily progress.",
    "Task Checklists": "Manage recurring HR and employee task lists.",
    "Approvals Central": "Handle approval queues from one place.",
    "Travel & Expenses": "Manage travel requests, claims, and approvals.",
    "HR Letters": "Generate, review, and issue employee letters.",
    "Document Drive": "Open employee files and shared HR documents.",
    "Help Desk": "Handle internal HR support and case workflows.",
    "User Control": "Enable or suspend employee sign-in access.",
    "Organisation Structure": "Manage branches, departments, and divisions.",
    Ownership: "Define managers, team leads, and reporting hierarchy.",
    "Salary Structure": "Configure salary structures and payroll metadata.",
    "Salary Revisions": "Track revision proposals and compensation history.",
    "Payroll Batches": "Run payroll cycles and monitor payout readiness.",
    "HRMS Settings": "Control service availability and workspace behavior.",
    Recruit: "Open employer and career hiring workflows.",
    "Employer Dashboard": "Track openings, candidates, and applications.",
    "Career Dashboard": "Manage resumes, profiles, and private applications.",
  };

  const quickActions: QuickAction[] = [
    ...(hrmsSection?.items ?? []).map((item) => ({
      href: item.href,
      label: item.label,
      description:
        descriptionByLabel[item.label] ?? "Open this HRMS workspace.",
    })),
    ...(recruitSection
      ? [
          {
            href: recruitSection.href,
            label: recruitSection.label,
            description:
              descriptionByLabel[recruitSection.label] ??
              "Open this HRMS workspace.",
          },
        ]
      : []),
  ];

  const workspaceGroups: ActionGroup[] = [
    {
      title: "Core administration",
      description:
        "Anchor the organisation model, directory hygiene, access posture, and document custody from one lane.",
      href: "/hrms/employees",
      labels: [
        "Dashboard",
        "Employees",
        "Document Drive",
        "User Control",
        "Organisation Structure",
        "Ownership",
      ],
    },
    {
      title: "Service and workflow",
      description:
        "Move employee requests, service tickets, onboarding work, and daily operational approvals without context switching.",
      href: "/hrms/approvals",
      labels: [
        "Approvals Central",
        "Onboarding Checklists",
        "Task Checklists",
        "Work Reports",
        "Travel & Expenses",
        "Help Desk",
        "HR Letters",
      ],
    },
    {
      title: "Compensation and policy",
      description:
        "Keep salary structures, revision governance, payroll runs, and workspace policy controls in one governed cluster.",
      href: "/hrms/payroll",
      labels: [
        "Salary Structure",
        "Salary Revisions",
        "Payroll Batches",
        "HRMS Settings",
      ],
    },
  ];

  if (recruitSection) {
    workspaceGroups.push({
      title: "Talent acquisition",
      description:
        "Manage openings, candidate flow, and employer-career workspaces as part of the same people operations command model.",
      href: recruitSection.href,
      labels: ["Recruit", "Employer Dashboard", "Career Dashboard"],
    });
  }

  const groupedActions = workspaceGroups
    .map((group) => ({
      ...group,
      actions: quickActions.filter((action) => group.labels.includes(action.label)),
    }))
    .filter((group) => group.actions.length > 0);

  const priorityCards = [
    {
      eyebrow: "Approvals deck",
      title: "Requests waiting for decisions",
      value: requestLoad,
      description:
        "Leave, travel, and daily work confirmations are the fastest-moving operational queues.",
      href: "/hrms/approvals",
      metrics: [
        { label: "Leave requests", value: pendingLeaveRequests },
        { label: "Travel requests", value: pendingTravelRequests },
        { label: "Work reports", value: pendingWorkReports },
      ],
      cta: "Open approvals desk",
    },
    {
      eyebrow: "Service desk",
      title: "People-service escalations",
      value: openCases + pendingTasks,
      description:
        "Help cases and HR-owned tasks indicate where service delivery or internal follow-up is starting to stack.",
      href: "/hrms/helpdesk",
      metrics: [
        { label: "Open cases", value: openCases },
        { label: "Pending tasks", value: pendingTasks },
        { label: "Letter actions", value: letterActions },
      ],
      cta: "Open help desk",
    },
    {
      eyebrow: "Payroll control",
      title: "Compensation governance",
      value: payrollRunsInMotion + letterActions,
      description:
        "Run payroll, monitor pre-issue document approvals, and keep compensation governance moving before month-end pressure builds.",
      href: "/hrms/payroll",
      metrics: [
        { label: "Payroll batches", value: payrollRunsInMotion },
        { label: "Letter approvals", value: letterActions },
        { label: "Active roles", value: roles.length },
      ],
      cta: "Open payroll operations",
    },
    recruitEnabled
      ? {
          eyebrow: "Talent lane",
          title: "Hiring pipeline under review",
          value: recruitJobsOpen + recruitApplicationsOpen,
          description:
            "Track approved roles, active applications, and candidate depth before recruitment bottlenecks start affecting onboarding.",
          href: "/hrms/recruit",
          metrics: [
            { label: "Live jobs", value: recruitJobsOpen },
            { label: "Applications", value: recruitApplicationsOpen },
            { label: "Candidates", value: recruitCandidates },
          ],
          cta: "Open recruitment",
        }
      : {
          eyebrow: "Access rollout",
          title: "Employee activation and issue queue",
          value: activeInvitations + letterActions,
          description:
            "Without recruitment enabled, the biggest rollout signals come from invitations, employee access readiness, and pending documents.",
          href: "/hrms/users",
          metrics: [
            { label: "Live invitations", value: activeInvitations },
            { label: "Letter actions", value: letterActions },
            { label: "Active employees", value: totalActiveCount },
          ],
          cta: "Open user control",
        },
  ];

  return (
    <>
      <PeopleSummaryGrid>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <PeopleSummary
              key={stat.label}
              icon={<Icon aria-hidden="true" />}
              label={stat.label}
              value={stat.value}
              detail={stat.detail}
            />
          );
        })}
      </PeopleSummaryGrid>

      <PeopleSection className="mnx-hrms-command-centre">
        <PeopleSectionHeader
          eyebrow="Executive workspace"
          title="People operations command centre"
          description="Built as a control tower instead of a shortcut board, the HRMS home now frames live workload, compliance movement, workforce structure, and next-step ownership in one screen."
          actions={
            <PeopleActionLink href="/hrms/approvals">
              Open approvals desk
            </PeopleActionLink>
          }
        />
        <div className="mnx-hrms-command-grid">
          <DashboardInsightGrid className="mnx-hrms-command-primary">
            <DashboardInsightCard
              eyebrow="Workforce coverage"
              title="Organisation footprint"
              detail="A fast read on how broadly HRMS is actively governing the company structure."
              chart={(
                <DashboardMiniBarChart
                  items={[
                    { label: "Employees", value: totalActiveCount, tone: "info" },
                    { label: "Departments", value: org?.departments.length ?? 0, tone: "accent" },
                    { label: "Branches", value: org?.branches.length ?? 0, tone: "success" },
                    { label: "Roles", value: roles.length, tone: "warning" },
                  ]}
                />
              )}
              footer={(
                <span>
                  {totalActiveCount} active people are currently mapped to the live organisation structure.
                </span>
              )}
            />
            <DashboardInsightCard
              eyebrow="Attention queue"
              title="Where action is stacking"
              detail="The dashboard brings the highest-friction HR queues forward first so operations can be cleared before they fan out."
              chart={(
                <DashboardSegmentList
                  items={[
                    { label: "Leave", value: pendingLeaveRequests, tone: "info" },
                    { label: "Cases", value: openCases, tone: "warning" },
                    { label: "Tasks", value: pendingTasks, tone: "accent" },
                    { label: "Travel", value: pendingTravelRequests, tone: "neutral" },
                    { label: "Reports", value: pendingWorkReports, tone: "success" },
                    { label: "Letters", value: letterActions, tone: "danger" },
                  ]}
                />
              )}
              footer={(
                <span>
                  {serviceLoad} active service items are currently competing for HRMS attention.
                </span>
              )}
            />
            <DashboardInsightCard
              eyebrow="Control signals"
              title="Compliance, rollout, and hiring"
              detail="Use this lane to watch payroll readiness, document issue flow, access rollout, and talent movement from the same command view."
              chart={(
                <DashboardMiniBarChart
                  items={[
                    { label: "Payroll", value: payrollRunsInMotion, tone: "warning" },
                    { label: "Letters", value: letterActions, tone: "danger" },
                    { label: "Invitations", value: activeInvitations, tone: "accent" },
                    {
                      label: recruitEnabled ? "Applications" : "Branches",
                      value: recruitEnabled ? recruitApplicationsOpen : org?.branches.length ?? 0,
                      tone: "info",
                    },
                  ]}
                />
              )}
              footer={(
                <span>
                  {latestPayrollBatch
                    ? `Latest payroll batch: ${formatMonth(latestPayrollBatch.month)} · ${latestPayrollBatch.type.toLowerCase().replaceAll("_", " ")} · ${latestPayrollBatch.status.toLowerCase()}.`
                    : "Payroll has not produced a tracked batch yet."}
                </span>
              )}
            />
          </DashboardInsightGrid>

          <div className="mnx-hrms-command-rail">
            {priorityCards.map((card) => (
              <article className="mnx-hrms-priority-card" key={card.title}>
                <div className="mnx-hrms-priority-top">
                  <div>
                    <p>{card.eyebrow}</p>
                    <strong>{card.title}</strong>
                  </div>
                  <span>{card.value}</span>
                </div>
                <p className="mnx-hrms-priority-copy">{card.description}</p>
                <div className="mnx-hrms-priority-metrics">
                  {card.metrics.map((metric) => (
                    <div key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </div>
                  ))}
                </div>
                <PeopleActionLink
                  className="mnx-hrms-priority-action"
                  href={card.href}
                >
                  {card.cta}
                </PeopleActionLink>
              </article>
            ))}
          </div>
        </div>
      </PeopleSection>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Operational lanes"
          title="Run HRMS by managed lane"
          description="Functions are grouped the way an advanced ERP command centre is actually worked: structure, service, compensation, and talent, each with a clear launch lane."
        />
        <div className="mnx-hrms-lane-grid">
          {groupedActions.map((group) => (
            <article className="mnx-hrms-lane-card" key={group.title}>
              <div className="mnx-hrms-lane-top">
                <div>
                  <strong>{group.title}</strong>
                  <p>{group.description}</p>
                </div>
                <PeopleActionLink
                  className="mnx-hrms-priority-action"
                  href={group.href}
                >
                  Open lane
                </PeopleActionLink>
              </div>
              <div className="mnx-hrms-lane-links">
                {group.actions.map((action) => (
                  <Link className="mnx-hrms-lane-link" href={action.href} key={action.href}>
                    <span>{action.label}</span>
                    <small>{action.description}</small>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </PeopleSection>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Directory"
          title="Recent employees"
          description="The most recently surfaced active employee records stay visible here so directory review remains part of the command centre, not a separate trip."
          actions={
            <PeopleActionLink href="/hrms/employees">
              View all employees
            </PeopleActionLink>
          }
        />
        <PeopleTable>
          <PeopleTableHeader>
            <tr>
              <PeopleTableHead>Employee</PeopleTableHead>
              <PeopleTableHead>Employee #</PeopleTableHead>
              <PeopleTableHead>Department</PeopleTableHead>
              <PeopleTableHead>Branch</PeopleTableHead>
            </tr>
          </PeopleTableHeader>
          <PeopleTableBody>
            {recentEmployees.length === 0 ? (
              <PeopleTableEmpty
                colSpan={4}
                message="No employees found. Onboard your first employee."
              />
            ) : (
              recentEmployees.map((emp) => (
                <PeopleTableRow key={emp.id}>
                  <PeopleTableCell>
                    <PeopleRecordLink href={`/hrms/employees/${emp.id}`}>
                      <PeoplePerson name={emp.name} secondary={emp.email} />
                    </PeopleRecordLink>
                  </PeopleTableCell>
                  <PeopleTableCell className="mnx-people-muted">
                    {emp.employeeNumber ? `#${emp.employeeNumber}` : "—"}
                  </PeopleTableCell>
                  <PeopleTableCell className="mnx-people-muted">
                    {emp.department?.name ?? "—"}
                  </PeopleTableCell>
                  <PeopleTableCell className="mnx-people-muted">
                    {emp.branch?.name ?? "—"}
                  </PeopleTableCell>
                </PeopleTableRow>
              ))
            )}
          </PeopleTableBody>
        </PeopleTable>
      </PeopleSection>
    </>
  );
}
