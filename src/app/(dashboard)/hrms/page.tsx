import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { loadCaps } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { listUsersForDashboard } from "@/modules/core/user/service";
import { db } from "@/lib/db";
import { RECRUIT_APP_STAGES_TERMINAL } from "@/modules/recruit/types";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  FolderKanban,
  HelpCircle,
  IdCard,
  ReceiptIndianRupee,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function HrmsDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orgId = session.user.orgId!;
  const now = await getNow();
  const caps = await loadCaps(session.user.id);
  const recruitEnabled = isRecruitEnabled();

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
  ] = await Promise.all([
    getOrg(orgId),
    listUsersForDashboard(orgId, { active: true, take: 6 }),
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
  ]);

  const pendingApprovalsCount = pendingLeaveRequests + pendingTravelRequests + pendingWorkReports;
  const serviceLoad = openCases + pendingTasks + letterActions;

  const summaryStats = [
    {
      label: "Active workforce",
      value: totalActiveCount,
      detail: `${org?.departments.length ?? 0} departments · ${org?.branches.length ?? 0} branches · ${roles.length} roles`,
      icon: Users,
    },
    {
      label: "Pending approvals",
      value: pendingApprovalsCount,
      detail: `${pendingLeaveRequests} leave · ${pendingTravelRequests} travel · ${pendingWorkReports} work reports`,
      icon: ClipboardCheck,
    },
    {
      label: "HR cases & tasks",
      value: serviceLoad,
      detail: `${openCases} open cases · ${pendingTasks} pending tasks · ${letterActions} letters`,
      icon: HelpCircle,
    },
    {
      label: recruitEnabled ? "Hiring & Payroll" : "Payroll & Access",
      value: recruitEnabled ? recruitApplicationsOpen + payrollRunsInMotion : activeInvitations + payrollRunsInMotion,
      detail: latestPayrollBatch
        ? `Payroll: ${latestPayrollBatch.status.toLowerCase()} (${formatMonth(latestPayrollBatch.month)})`
        : "No active payroll run",
      icon: recruitEnabled ? BriefcaseBusiness : ReceiptIndianRupee,
    },
  ] as const;

  const hrWorkspaces = [
    {
      href: "/hrms/employees",
      label: "Employee directory",
      detail: `${totalActiveCount} active records`,
      icon: IdCard,
    },
    {
      href: "/hrms/approvals",
      label: "Approvals central",
      detail: `${pendingApprovalsCount} awaiting decision`,
      icon: ClipboardCheck,
    },
    {
      href: "/hrms/payroll",
      label: "Payroll operations",
      detail: latestPayrollBatch ? latestPayrollBatch.status.toLowerCase() : "Configure runs",
      icon: ReceiptIndianRupee,
    },
    {
      href: "/hrms/onboarding",
      label: "Onboarding & Hiring",
      detail: recruitEnabled ? `${recruitJobsOpen} open positions` : "Checklists & new joiners",
      icon: UserPlus,
    },
    {
      href: "/hrms/files",
      label: "Document drive",
      detail: `${letterActions} letter requests`,
      icon: FolderKanban,
    },
    {
      href: "/hrms/helpdesk",
      label: "HR Helpdesk",
      detail: `${openCases} open support tickets`,
      icon: HelpCircle,
    },
    {
      href: "/hrms/org-structure",
      label: "Organisation structure",
      detail: `${org?.departments.length ?? 0} departments`,
      icon: Building2,
    },
    {
      href: "/hrms/settings",
      label: "HRMS Settings",
      detail: "Permissions & configurations",
      icon: ShieldCheck,
    },
  ] as const;

  const actionQueueItems = [
    {
      label: "Leave requests",
      count: pendingLeaveRequests,
      href: "/attendance/leaves",
      badge: pendingLeaveRequests > 0 ? "mnx-badge-warning" : "mnx-badge-neutral",
    },
    {
      label: "HR Cases",
      count: openCases,
      href: "/hrms/helpdesk",
      badge: openCases > 0 ? "mnx-badge-danger" : "mnx-badge-neutral",
    },
    {
      label: "Pending tasks",
      count: pendingTasks,
      href: "/hrms/tasks",
      badge: pendingTasks > 0 ? "mnx-badge-accent" : "mnx-badge-neutral",
    },
    {
      label: "Travel requests",
      count: pendingTravelRequests,
      href: "/hrms/travel",
      badge: pendingTravelRequests > 0 ? "mnx-badge-warning" : "mnx-badge-neutral",
    },
    {
      label: "Work reports",
      count: pendingWorkReports,
      href: "/hrms/work-reports",
      badge: pendingWorkReports > 0 ? "mnx-badge-accent" : "mnx-badge-neutral",
    },
    {
      label: "Letter approvals",
      count: letterActions,
      href: "/hrms/letters",
      badge: letterActions > 0 ? "mnx-badge-warning" : "mnx-badge-neutral",
    },
  ] as const;

  return (
    <>
      <PeopleSummaryGrid>
        {summaryStats.map((stat) => {
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

      <div className="mnx-dashboard-main-hub">
        <div className="mnx-hub-primary">
          <section className="mnx-feed-panel">
            <header className="mnx-panel-heading">
              <div>
                <span className="mnx-spec-label">ACTION QUEUES</span>
                <h2>Pending workforce requests</h2>
              </div>
              <PeopleActionLink href="/hrms/approvals">
                Open approvals desk
              </PeopleActionLink>
            </header>

            <div className="mnx-feed-cards">
              {actionQueueItems.map((item) => (
                <Link className="mnx-inset-card" href={item.href} key={item.label}>
                  <header>
                    <span>{item.label}</span>
                    <Badge className={item.badge}>
                      {item.count} pending
                    </Badge>
                  </header>
                  <h3>{item.count > 0 ? `${item.count} items require review` : "Queue is clear"}</h3>
                  <p>
                    {item.count > 0
                      ? `Click to inspect and process ${item.label.toLowerCase()}.`
                      : `No pending ${item.label.toLowerCase()} waiting.`}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Directory"
              title="Recent employees"
              description="Recently active employee records for quick access."
              actions={
                <PeopleActionLink href="/hrms/employees">
                  View full directory
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
                    message="No active employees found in directory."
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
        </div>

        <aside className="mnx-hub-secondary">
          <section className="mnx-dashboard-brief-panel">
            <header className="mnx-panel-heading">
              <div>
                <span className="mnx-spec-label">NAVIGATOR</span>
                <h2>HR Workspaces</h2>
              </div>
            </header>

            <div className="mnx-dashboard-launch-list">
              {hrWorkspaces.map((ws) => {
                const Icon = ws.icon;
                return (
                  <Link className="mnx-dashboard-launch-link" href={ws.href} key={ws.href}>
                    <div>
                      <b>{ws.label}</b>
                      <small>{ws.detail}</small>
                    </div>
                    <ArrowUpRight size={15} />
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mnx-holiday-panel">
            <header className="mnx-panel-heading">
              <div>
                <span className="mnx-spec-label">PAYROLL & COMPLIANCE</span>
                <h2>Status summary</h2>
              </div>
            </header>

            <div className="mnx-feed-cards">
              <article className="mnx-inset-card">
                <header>
                  <span>Payroll run</span>
                </header>
                <h3>{latestPayrollBatch ? formatMonth(latestPayrollBatch.month) : "No batch"}</h3>
                <p>Status: {latestPayrollBatch ? latestPayrollBatch.status.toLowerCase() : "Not initiated"}</p>
                <small>Handed off to Accounting upon finalization</small>
              </article>
              <article className="mnx-inset-card">
                <header>
                  <span>Invitations</span>
                </header>
                <h3>{activeInvitations} active invitations</h3>
                <p>Pending employee onboarding sign-in acceptances.</p>
              </article>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
