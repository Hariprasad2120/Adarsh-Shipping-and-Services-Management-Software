import { ClickableRow } from "@/components/clickable-row";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/rbac";
import Link from "next/link";
import { ensureSettingsAndDefaults, getEligibleManagers, listChaDueDateWarnings, listFilingQueryEscalationWarnings, listJobTypesForSelection, listSection49ValidityWarnings } from "@/modules/cha/service";
import { DashboardCreateJob } from "@/components/cha/dashboard-create-job";
import { JobFilingQueryWarningIndicator } from "./_components/job-filing-query-warning-indicator";
import { JobSection49ValidityWarningIndicator } from "./_components/job-section49-validity-warning-indicator";
import { Button } from "@/components/monolith/button";
import { Badge } from "@/components/monolith/badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
} from "@/components/monolith/workspace-data-table";
import {
  formatChaBadgeLabel,
  getChaPriorityBadgeVariant,
  getChaStageBadgeVariant,
} from "@/lib/cha-badges";
import { ChaControlPanel, ChaMetricCard, ChaMetrics, ChaPageHeader, ChaSectionShell } from "./_components/cha-operations-shared";
import { ChaHeaderGraphic } from "./graphics/ChaHeaderGraphic";

export default async function ChaDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  await requirePermission(session.user.id, "cha.access");
  const canCreateJob = await can(session.user.id, "cha.job.create");

  const [
    activeJobsCount,
    pendingChecklistsCount,
    pendingFilingsCount,
    urgentExpensesCount,
    myJobs,
    branches,
    customers,
    jobTypes,
    shipmentTypes,
    users,
    eligibleManagers,
    teamGroups,
    ,
    branchNumberingRules,
    pendingAdvances,
    dueDateWarnings,
    section49Warnings,
    filingQueryWarnings,
    pendingChecklistItems,
    pendingFilingItems,
    recentActivity,
  ] = await Promise.all([
    db.chaJob.count({
      where: { orgId, stage: { not: "FILED" }, status: "ACTIVE" },
    }),
    db.chaChecklistImport.count({
      where: { status: "PENDING_APPROVAL", job: { orgId, deletedAt: null } },
    }),
    db.chaFiling.count({
      where: { status: "PENDING", job: { orgId, deletedAt: null } },
    }),
    db.chaExpenseRequest.count({
      where: { orgId, status: "URGENT_PAYMENT_REQUIRED", job: { deletedAt: null } },
    }),
    db.chaJob.findMany({
      where: {
        orgId,
        status: "ACTIVE",
        assignments: { some: { userId: session.user.id } },
      },
      include: {
        customer: { select: { name: true } },
        jobType: { select: { name: true, movementDirection: true } },
        filing: {
          select: {
            billOfEntryNumber: true,
            shippingBillNumber: true,
          },
        },
        assignments: { select: { userId: true } },
        primaryOwner: { select: { id: true, name: true } },
        deletionRequests: {
          where: { status: { in: ["PENDING", "APPROVED"] } },
          select: { id: true },
          take: 1,
        },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    db.branch.findMany({ where: { orgId }, select: { id: true, name: true, code: true } }),
    db.crmAccount.findMany({ where: { orgId, type: "Customer" }, select: { id: true, name: true } }),
    listJobTypesForSelection(orgId),
    db.chaShipmentType.findMany({ where: { orgId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { orgId, active: true }, select: { id: true, name: true, email: true } }),
    getEligibleManagers(orgId),
    db.chaTeamGroup.findMany({ where: { orgId }, select: { id: true, name: true, memberIds: true } }),
    ensureSettingsAndDefaults(orgId),
    db.chaBranchNumberingRule.findMany({
      where: { orgId },
      select: {
        branchId: true,
        prefix: true,
        suffix: true,
        startingSequence: true,
        currentSequence: true,
        numberPadding: true,
        useFinancialYear: true,
        financialYearFormat: true,
        isActive: true,
      },
    }),
    db.chaCustomerAdvance.findMany({
      where: {
        job: { orgId, deletedAt: null },
        status: { in: ["FOLLOW_UP", "PARTIALLY_RECEIVED"] },
      },
      include: { receipts: true },
    }),
    listChaDueDateWarnings(session.user.id, orgId),
    listSection49ValidityWarnings(session.user.id, orgId),
    listFilingQueryEscalationWarnings(session.user.id, orgId),
    db.chaChecklistImport.findMany({
      where: { status: "PENDING_APPROVAL", job: { orgId, deletedAt: null } },
      select: {
        id: true,
        job: { select: { id: true, jobNumber: true, title: true } },
        uploadedAt: true,
      },
      orderBy: { uploadedAt: "asc" },
      take: 4,
    }),
    db.chaFiling.findMany({
      where: { status: "PENDING", job: { orgId, deletedAt: null } },
      include: {
        job: { select: { id: true, jobNumber: true, title: true } },
      },
      orderBy: [{ estimatedFilingDate: "asc" }, { id: "asc" }],
      take: 4,
    }),
    db.chaAuditLog.findMany({
      where: { orgId },
      include: {
        job: { select: { id: true, jobNumber: true } },
      },
      orderBy: { timestamp: "desc" },
      take: 6,
    }),
  ]);

  const totalOutstandingAdvance = pendingAdvances.reduce((sum, adv) => {
    const expected = Number(adv.expectedAmount || 0);
    const received = adv.receipts.reduce((tot, r) => tot + Number(r.amount), 0);
    return sum + Math.max(0, expected - received);
  }, 0);

  const recentActorIds = Array.from(
    new Set(recentActivity.map((log) => log.actorId).filter((actorId) => actorId !== "system")),
  );

  const recentActors =
    recentActorIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: recentActorIds } },
          select: { id: true, name: true },
        })
      : [];

  const recentActorMap = new Map(recentActors.map((actor) => [actor.id, actor.name]));

  const filingQueryWarningMap = new Map(
    filingQueryWarnings.map((warning) => [
      warning.jobId,
      {
        queryTitle: warning.queryTitle,
        overdueQueryCount: warning.overdueQueryCount,
        reminderTriggeredAt: warning.reminderTriggeredAt.toISOString(),
        warningTriggeredAt: warning.warningTriggeredAt.toISOString(),
        staleMinutes: warning.staleMinutes,
      },
    ]),
  );

  const section49WarningMap = new Map(
    section49Warnings.map((warning) => [
      warning.jobId,
      {
        severity: warning.severity as "expired" | "expiring",
        daysUntilExpiry: warning.daysUntilExpiry,
        validityDate: warning.validityDate.toISOString(),
        message:
          warning.severity === "expired"
            ? `Section 49 validity expired on ${warning.validityDate.toLocaleDateString("en-IN")}.`
            : `Section 49 validity is expiring in ${warning.daysUntilExpiry} day(s) on ${warning.validityDate.toLocaleDateString("en-IN")}.`,
      },
    ]),
  );

  const metrics = [
    {
      title: "Active Clearance Jobs",
      value: activeJobsCount,
      note: "Jobs currently in operations",
      accent: "blue" as const,
    },
    {
      title: "Checklists Pending",
      value: pendingChecklistsCount,
      note: "Awaiting manager review decision",
      accent: "orange" as const,
    },
    {
      title: "Pending Filings",
      value: pendingFilingsCount,
      note: "Awaiting customs BOE/SB submissions",
      accent: "blue" as const,
    },
    {
      title: "Urgent Expenses",
      value: urgentExpensesCount,
      note: "Immediate payouts required",
      accent: "orange" as const,
    },
    {
      title: "Outstanding Advances",
      value: `\u20B9${totalOutstandingAdvance.toLocaleString("en-IN")}`,
      note: "Expected follow-up collections",
      accent: "orange" as const,
    },
  ];

  const pendingActions = [
    ...pendingChecklistItems.map((item) => ({
      id: `checklist-${item.id}`,
      label: "Checklist approval pending",
      note: item.job.title || item.job.jobNumber,
      href: `/cha/jobs/${item.job.id}?tab=checklist`,
      tone: "orange" as const,
    })),
    ...pendingFilingItems.map((item) => ({
      id: `filing-${item.id}`,
      label: "Pending filing submission",
      note: item.job.jobNumber,
      href: `/cha/jobs/${item.job.id}?tab=filing`,
      tone: "blue" as const,
    })),
    ...filingQueryWarnings.slice(0, 3).map((warning) => ({
      id: `query-${warning.jobId}`,
      label: "Open customs query",
      note: `${warning.jobNumber} · ${warning.queryTitle}`,
      href: `/cha/jobs/${warning.jobId}?tab=filing`,
      tone: "orange" as const,
    })),
  ].slice(0, 4);

  const expiringItems = dueDateWarnings
    .slice(0, 4)
    .map((warning) => ({
      id: warning.notificationId,
      label: warning.type.replace(/_/g, " "),
      note: warning.jobNumber,
      message: warning.message,
      href: warning.link,
      tone: warning.severity === "expired" ? "destructive" as const : "warning" as const,
    }));

  return (
    <div className="space-y-8">
      <ChaPageHeader
        eyebrow={null}
        title="CHA Dashboard"
        graphic={<ChaHeaderGraphic />}
        description="A logistics control tower view for customs clearance, live filing queues, due-date risk, and assigned execution."
      />

      <ChaMetrics>
        {metrics.map((metric) => (
          <ChaMetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            note={metric.note}
            accent={metric.accent}
          />
        ))}
      </ChaMetrics>

      <ChaControlPanel
        index="01"
        title="My Assigned Jobs"
        description="Open or manage the jobs currently assigned to you."
        contentClassName="!p-0"
        actions={
          <>
            <DashboardCreateJob
              currentUserId={session.user.id}
              canCreateJob={canCreateJob}
              options={{
                branches,
                customers,
                jobTypes,
                shipmentTypes,
                users,
                managers: eligibleManagers,
                teamGroups,
                branchNumberingRules,
              }}
            />
            <Link href="/cha/jobs">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-2xl">
                View All
              </Button>
            </Link>
            <Link href="/cha/settings">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-2xl">
                Settings
              </Button>
            </Link>
          </>
        }
      >
        <DataTable className="w-full rounded-none border-0 shadow-none">
          {myJobs.length === 0 ? (
            <>
              <DataTableHeader>
                <tr>
                  <DataTableHead>Job Number</DataTableHead>
                  <DataTableHead>Customer</DataTableHead>
                  <DataTableHead>Job Type</DataTableHead>
                  <DataTableHead>BOE / SB Number</DataTableHead>
                  <DataTableHead>Created On</DataTableHead>
                  <DataTableHead>Current Stage</DataTableHead>
                  <DataTableHead>Priority</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                <DataTableEmpty
                  colSpan={7}
                  message={
                    <div className="flex flex-col items-center justify-center p-14 text-center">
                      <p className="text-sm mnx-text-primary">You don&apos;t have any active job assignments yet.</p>
                      <p className="mt-1 text-xs mnx-text-muted">New work will appear here automatically.</p>
                    </div>
                  }
                />
              </DataTableBody>
            </>
          ) : (
            <>
              <DataTableHeader>
                <tr>
                  <DataTableHead>Job Number</DataTableHead>
                  <DataTableHead>Customer</DataTableHead>
                  <DataTableHead>Job Type</DataTableHead>
                  <DataTableHead>BOE / SB Number</DataTableHead>
                  <DataTableHead>Created On</DataTableHead>
                  <DataTableHead>Current Stage</DataTableHead>
                  <DataTableHead>Priority</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {myJobs.map((job) => (
                  <ClickableRow key={job.id} href={`/cha/jobs/${job.id}`}>
                    <DataTableCell className="font-medium mnx-text-accent">
                      <div className="flex items-center gap-2">
                        <Link href={`/cha/jobs/${job.id}`} className="transition-colors mnx-hover-accent">
                          {job.jobNumber}
                        </Link>
                        {section49WarningMap.get(job.id) ? (
                          <JobSection49ValidityWarningIndicator
                            jobId={job.id}
                            warning={section49WarningMap.get(job.id)!}
                          />
                        ) : null}
                        {filingQueryWarningMap.get(job.id) ? (
                          <JobFilingQueryWarningIndicator
                            jobId={job.id}
                            warning={filingQueryWarningMap.get(job.id)!}
                          />
                        ) : null}
                      </div>
                    </DataTableCell>
                    <DataTableCell>{job.customer.name}</DataTableCell>
                    <DataTableCell className="mnx-label">{job.jobType.name}</DataTableCell>
                    <DataTableCell className="mnx-numeric mnx-text-muted">
                      {job.jobType.movementDirection === "IMPORT"
                        ? job.filing?.billOfEntryNumber || "Pending"
                        : job.jobType.movementDirection === "EXPORT"
                          ? job.filing?.shippingBillNumber || "Pending"
                          : job.filing?.billOfEntryNumber || job.filing?.shippingBillNumber || "Pending"}
                    </DataTableCell>
                    <DataTableCell className="mnx-text-muted">
                      {job.createdAt.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={getChaStageBadgeVariant(job.stage)} className="uppercase">
                        {formatChaBadgeLabel(job.stage)}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={getChaPriorityBadgeVariant(job.priority)} className="uppercase">
                        {job.priority}
                      </Badge>
                    </DataTableCell>
                  </ClickableRow>
                ))}
              </DataTableBody>
            </>
          )}
        </DataTable>
      </ChaControlPanel>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <ChaSectionShell
          index="02"
          title="Pending Actions"
          description="Operational items that still need a decision or next-step action."
          count={pendingActions.length}
          accent="orange"
        >
          <div className="space-y-2.5 p-4">
            {pendingActions.length === 0 ? (
              <p className="text-sm mnx-text-muted">No pending actions are waiting right now.</p>
            ) : (
              pendingActions.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-3 rounded-xl border mnx-border mnx-bg-soft px-3.5 py-2.5 transition mnx-hover-accent mnx-hover-accent"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-normal uppercase tracking-[0.12em] mnx-text-primary">{item.label}</p>
                    <p className="mt-1 truncate text-xs mnx-text-muted">{item.note}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </ChaSectionShell>

        <ChaSectionShell
          index="03"
          title="Expiring Soon"
          description="Current validity and deadline signals across visible CHA jobs."
          count={expiringItems.length}
          accent="orange"
        >
          <div className="space-y-2.5 p-4">
            {expiringItems.length === 0 ? (
              <p className="text-sm mnx-text-muted">No immediate expiry or deadline warnings were found.</p>
            ) : (
              expiringItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-xl border mnx-border mnx-bg-soft px-3.5 py-2.5 transition mnx-hover-accent mnx-hover-accent"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-normal uppercase tracking-[0.12em] mnx-text-primary">{item.label}</p>
                    <p className="mt-1 text-xs mnx-text-muted">{item.note}</p>
                    <p className="mt-1 text-xs mnx-text-muted">{item.message}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      item.tone === "destructive" ? "mnx-bg-danger mnx-text-danger" : "mnx-bg-warning mnx-text-warning"
                    }`}
                  >
                    {item.tone === "destructive" ? "Expired" : "Attention"}
                  </span>
                </Link>
              ))
            )}
          </div>
        </ChaSectionShell>

        <ChaSectionShell
          index="04"
          title="Recent Activity"
          description="Latest CHA audit events across the jobs visible to your organisation."
          count={Math.min(recentActivity.length, 4)}
          accent="violet"
        >
          <div className="space-y-2.5 p-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm mnx-text-muted">No recent activity has been recorded yet.</p>
            ) : (
              recentActivity.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border mnx-border mnx-bg-soft px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-normal uppercase tracking-[0.12em] mnx-text-primary">{log.event.replace(/_/g, " ")}</p>
                    <span className="text-xs mnx-text-muted mnx-numeric">
                      {log.timestamp.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs mnx-text-muted">{log.remarks || "Operational event logged."}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] mnx-text-muted">
                    {log.job ? (
                      <Link href={`/cha/jobs/${log.job.id}`} className="mnx-text-accent mnx-hover-accent hover:underline">
                        {log.job.jobNumber}
                      </Link>
                    ) : null}
                    <span>{recentActorMap.get(log.actorId) || "System"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ChaSectionShell>
      </div>
    </div>
  );
}

