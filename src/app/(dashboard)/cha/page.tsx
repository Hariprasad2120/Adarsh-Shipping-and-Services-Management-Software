import { ClickableRow } from "@/components/clickable-row";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import Link from "next/link";
import { ensureSettingsAndDefaults, getEligibleManagers, listChaDueDateWarnings, listFilingQueryEscalationWarnings, listJobTypesForSelection, listSection49ValidityWarnings } from "@/modules/cha/service";
import { DashboardCreateJob } from "@/components/cha/dashboard-create-job";
import { JobFilingQueryWarningIndicator } from "./_components/job-filing-query-warning-indicator";
import { JobSection49ValidityWarningIndicator } from "./_components/job-section49-validity-warning-indicator";
import {
  FileText,
  CheckSquare,
  DollarSign,
  AlertCircle,
  Briefcase,
  UserCheck,
  Settings,
  ArrowRight,
  Sparkles,
  ChevronRight,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
} from "@/components/data-table";
import {
  formatChaBadgeLabel,
  getChaPriorityBadgeVariant,
  getChaStageBadgeVariant,
} from "@/lib/cha-badges";
import { ChaMetricCard, ChaSectionShell } from "./_components/cha-operations-shared";

export default async function ChaDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  await requirePermission(session.user.id, "cha.access");

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
      icon: <Briefcase size={16} />,
      accent: "cyan" as const,
    },
    {
      title: "Checklists Pending",
      value: pendingChecklistsCount,
      note: "Awaiting manager review decision",
      icon: <CheckSquare size={16} />,
      accent: "orange" as const,
    },
    {
      title: "Pending Filings",
      value: pendingFilingsCount,
      note: "Awaiting customs BOE/SB submissions",
      icon: <FileText size={16} />,
      accent: "cyan" as const,
    },
    {
      title: "Urgent Expenses",
      value: urgentExpensesCount,
      note: "Immediate payouts required",
      icon: <AlertCircle size={16} />,
      accent: "orange" as const,
    },
    {
      title: "Outstanding Advances",
      value: `\u20B9${totalOutstandingAdvance.toLocaleString("en-IN")}`,
      note: "Expected follow-up collections",
      icon: <DollarSign size={16} />,
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
      tone: "cyan" as const,
    })),
    ...filingQueryWarnings.slice(0, 3).map((warning) => ({
      id: `query-${warning.jobId}`,
      label: "Open customs query",
      note: `${warning.jobNumber} · ${warning.queryTitle}`,
      href: `/cha/jobs/${warning.jobId}?tab=filing`,
      tone: "orange" as const,
    })),
  ].slice(0, 6);

  const expiringItems = dueDateWarnings
    .slice(0, 6)
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
      <section className="rounded-[28px] border border-outline-variant/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.96))] px-5 py-4 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.18)] dark:bg-[linear-gradient(180deg,rgba(19,26,33,0.98),rgba(23,31,39,0.98))]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>CHA</span>
            <ChevronRight size={14} />
            <span>Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="ds-icon-badge">
              <Sparkles size={16} />
            </span>
            <h1 className="ds-h1 text-on-surface">CHA Dashboard</h1>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => (
          <ChaMetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            note={metric.note}
            icon={metric.icon}
            accent={metric.accent}
          />
        ))}
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-outline-variant/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,253,0.97))] shadow-[0_24px_56px_-40px_rgba(15,23,42,0.18)] dark:bg-[linear-gradient(180deg,rgba(19,26,33,0.98),rgba(23,31,39,0.98))]">
        <div className="pointer-events-none absolute inset-[1px] rounded-[31px] bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0.12))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]" />
        <div className="pointer-events-none absolute left-10 top-0 h-24 w-52 rounded-full bg-[#00cec4]/[0.11] blur-3xl" />
        <div className="pointer-events-none absolute right-12 top-10 h-20 w-40 rounded-full bg-[#fb923c]/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute right-24 top-4 h-24 w-32 rounded-full bg-[#7dd3fc]/[0.1] blur-3xl dark:bg-[#38bdf8]/[0.08]" />

        <div className="relative border-b border-outline-variant/25 px-5 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <span className="ds-icon-badge">
                <UserCheck size={18} className="text-[#00cec4]" />
              </span>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-on-surface">My Assigned Jobs</h2>
                  <span className="rounded-full border border-outline-variant/20 bg-white/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant backdrop-blur dark:bg-white/[0.04]">
                    Priority Queue
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Open or manage the jobs currently assigned to you.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-3 rounded-[22px] border border-outline-variant/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(245,248,251,0.88))] px-4 py-3 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.18)] backdrop-blur dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/45 bg-white/75 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-white/[0.03]">
                  <Sparkles size={16} className="text-[#00b8af] dark:text-[#63e3d7]" />
                </div>
                <div>
                  <p className="ds-label">Assigned Now</p>
                  <p className="ds-numeric text-sm text-on-surface">{myJobs.length}</p>
                </div>
              </div>

              <DashboardCreateJob
                currentUserId={session.user.id}
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
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
              <Link href="/cha/settings">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-2xl">
                  <Settings size={14} /> Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <DataTable className="w-full">
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
                      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] border border-outline-variant/25 bg-surface-container-low shadow-[0_22px_48px_-34px_rgba(15,23,42,0.3)]">
                        <Briefcase size={30} className="text-outline-variant" />
                      </div>
                      <p className="text-sm text-on-surface">You don&apos;t have any active job assignments yet.</p>
                      <p className="mt-1 text-xs text-on-surface-variant">New work will appear here automatically.</p>
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
                    <DataTableCell className="font-medium text-[#00cec4]">
                      <div className="flex items-center gap-2">
                        <Link href={`/cha/jobs/${job.id}`} className="transition-colors hover:text-[#00b5ad]">
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
                    <DataTableCell className="ds-label">{job.jobType.name}</DataTableCell>
                    <DataTableCell className="ds-numeric text-on-surface-variant">
                      {job.jobType.movementDirection === "IMPORT"
                        ? job.filing?.billOfEntryNumber || "Pending"
                        : job.jobType.movementDirection === "EXPORT"
                          ? job.filing?.shippingBillNumber || "Pending"
                          : job.filing?.billOfEntryNumber || job.filing?.shippingBillNumber || "Pending"}
                    </DataTableCell>
                    <DataTableCell className="text-on-surface-variant">
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
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChaSectionShell
          title="Pending Actions"
          description="Operational items that still need a decision or next-step action."
          icon={<AlertCircle size={16} />}
          count={pendingActions.length}
        >
          <div className="space-y-3 p-5">
            {pendingActions.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No pending actions are waiting right now.</p>
            ) : (
              pendingActions.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-3 rounded-[20px] border border-outline-variant/25 bg-surface-container-low/35 px-4 py-3 transition hover:border-[#00cec4]/35 hover:bg-surface"
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                      item.tone === "orange" ? "bg-[#fb923c]/12 text-[#fb923c]" : "bg-[#00cec4]/10 text-[#00cec4]"
                    }`}
                  >
                    <AlertCircle size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface">{item.label}</p>
                    <p className="mt-1 truncate text-xs text-on-surface-variant">{item.note}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </ChaSectionShell>

        <ChaSectionShell
          title="Expiring Soon"
          description="Current validity and deadline signals across visible CHA jobs."
          icon={<AlertCircle size={16} />}
          count={expiringItems.length}
        >
          <div className="space-y-3 p-5">
            {expiringItems.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No immediate expiry or deadline warnings were found.</p>
            ) : (
              expiringItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-[20px] border border-outline-variant/25 bg-surface-container-low/35 px-4 py-3 transition hover:border-[#00cec4]/35 hover:bg-surface"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium uppercase tracking-[0.08em] text-on-surface">{item.label}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{item.note}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{item.message}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      item.tone === "destructive" ? "bg-red-500/10 text-red-500" : "bg-[#fb923c]/12 text-[#fb923c]"
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
          title="Recent Activity"
          description="Latest CHA audit events across the jobs visible to your organisation."
          icon={<History size={16} />}
          count={recentActivity.length}
        >
          <div className="space-y-3 p-5">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No recent activity has been recorded yet.</p>
            ) : (
              recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="rounded-[20px] border border-outline-variant/25 bg-surface-container-low/35 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-on-surface">{log.event.replace(/_/g, " ")}</p>
                    <span className="text-xs text-on-surface-variant ds-numeric">
                      {log.timestamp.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">{log.remarks || "Operational event logged."}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
                    {log.job ? (
                      <Link href={`/cha/jobs/${log.job.id}`} className="text-[#00cec4] hover:underline">
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

