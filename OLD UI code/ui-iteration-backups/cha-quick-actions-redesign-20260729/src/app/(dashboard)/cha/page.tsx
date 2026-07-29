import { ClickableRow } from "@/components/clickable-row";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/rbac";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ArrowRight, Settings } from "lucide-react";
import { ensureSettingsAndDefaults, getEligibleManagers, listChaDueDateWarnings, listFilingQueryEscalationWarnings, listJobTypesForSelection, listSection49ValidityWarnings } from "@/modules/cha/service";
import { DashboardCreateJob } from "@/components/cha/dashboard-create-job";
import { JobFilingQueryWarningIndicator } from "./_components/job-filing-query-warning-indicator";
import { JobSection49ValidityWarningIndicator } from "./_components/job-section49-validity-warning-indicator";
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
import {
  ActivityTimeline,
  ActivityTimelineItem,
  ExpiryRow,
  OperationsEmptyState,
  OperationsOverview,
  OperationsOverviewGrid,
  OperationsOverviewHeader,
  OperationsPanel,
  PendingActionRow,
} from "@/components/monolith/operations-overview";
import { ChaControlPanel, ChaMetricCard, ChaMetrics, ChaPageHeader } from "./_components/cha-operations-shared";
import { ChaDashboardFilterAction } from "./_components/cha-dashboard-filter-action";
import { ChaDashboardSearchAction } from "./_components/cha-dashboard-search-action";
import { ChaHeaderGraphic } from "./graphics/ChaHeaderGraphic";
import { getCachedBranches, getCachedCustomers, getCachedUsers } from "@/lib/cache";

function chaStatusTextClass(variant: ReturnType<typeof getChaStageBadgeVariant>) {
  switch (variant) {
    case "success":
      return "mnx-cha-status-success";
    case "destructive":
      return "mnx-cha-status-danger";
    case "warning":
      return "mnx-cha-status-warning";
    case "default":
      return "mnx-cha-status-info";
    default:
      return "mnx-cha-status-muted";
  }
}

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hr ago`;
  if (diffMs < 2 * day) return "Yesterday";
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} days ago`;

  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatExpiryRemaining(message: string, tone: "destructive" | "warning") {
  const daysMatch = message.match(/in (\d+) day/);

  if (tone === "destructive") return "Expired";
  if (daysMatch?.[1] === "0") return "Expires today";
  if (daysMatch?.[1]) return `${daysMatch[1]} days remaining`;

  return "Review deadline";
}

function formatActivityTitle(event: string) {
  return event
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function activityPresentation(event: string) {
  const normalized = event.toLowerCase();

  if (normalized.includes("draft")) return { icon: "draft" as const, tone: "accent" as const };
  if (normalized.includes("approval")) return { icon: "approval" as const, tone: "warning" as const };
  if (normalized.includes("document") || normalized.includes("upload")) {
    return { icon: "document" as const, tone: "accent" as const };
  }
  if (normalized.includes("query")) return { icon: "clock" as const, tone: "warning" as const };
  if (normalized.includes("expense")) return { icon: "calendar" as const, tone: "danger" as const };
  if (normalized.includes("complete") || normalized.includes("filed")) {
    return { icon: "check" as const, tone: "success" as const };
  }
  if (normalized.includes("job")) return { icon: "document" as const, tone: "neutral" as const };

  return { icon: "activity" as const, tone: "neutral" as const };
}

type ChaDashboardProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParamList(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

export default async function ChaDashboard({ searchParams }: ChaDashboardProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  await requirePermission(session.user.id, "cha.access");
  const canCreateJob = await can(session.user.id, "cha.job.create");
  const params = searchParams ? await searchParams : {};
  const assignedSearch =
    typeof params.assignedSearch === "string" ? params.assignedSearch.trim() : "";
  const selectedJobTypes = getParamList(params.jobType);
  const selectedStages = getParamList(params.stage);
  const selectedCategories = getParamList(params.category);
  const assignedSearchFilter: Prisma.ChaJobWhereInput = assignedSearch
    ? {
        OR: [
          { jobNumber: { contains: assignedSearch, mode: "insensitive" as const } },
          { title: { contains: assignedSearch, mode: "insensitive" as const } },
          { customer: { name: { contains: assignedSearch, mode: "insensitive" as const } } },
          { jobType: { name: { contains: assignedSearch, mode: "insensitive" as const } } },
          {
            filing: {
              is: {
                billOfEntryNumber: { contains: assignedSearch, mode: "insensitive" as const },
              },
            },
          },
          {
            filing: {
              is: {
                shippingBillNumber: { contains: assignedSearch, mode: "insensitive" as const },
              },
            },
          },
        ],
      }
    : {};
  const assignedFilterConditions: Prisma.ChaJobWhereInput[] = [];

  if (selectedJobTypes.length > 0) {
    assignedFilterConditions.push({
      jobType: { name: { in: selectedJobTypes, mode: "insensitive" as const } },
    });
  }

  if (selectedStages.length > 0) {
    assignedFilterConditions.push({ stage: { in: selectedStages } });
  }

  if (selectedCategories.includes("high-priority")) {
    assignedFilterConditions.push({ priority: { in: ["HIGH", "URGENT"] } });
  }

  if (selectedCategories.includes("pending-filing")) {
    assignedFilterConditions.push({ stage: "FILING" });
  }

  const assignedDashboardFilters: Prisma.ChaJobWhereInput = {
    ...assignedSearchFilter,
    ...(assignedFilterConditions.length > 0 ? { AND: assignedFilterConditions } : {}),
  };

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
        ...assignedDashboardFilters,
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
    getCachedBranches(orgId),
    getCachedCustomers(orgId),
    listJobTypesForSelection(orgId),
    db.chaShipmentType.findMany({ where: { orgId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getCachedUsers(orgId),
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
      actionLabel: "Review",
      jobNumber: item.job.jobNumber,
      meta: `${item.job.title || "Checklist"} - Assigned to you`,
      status: "Due soon",
      title: "Checklist approval pending",
      href: `/cha/jobs/${item.job.id}?tab=checklist`,
      tone: "warning" as const,
    })),
    ...pendingFilingItems.map((item) => ({
      id: `filing-${item.id}`,
      actionLabel: "Continue",
      jobNumber: item.job.jobNumber,
      meta: "Filing workspace - Assigned to you",
      status: "High priority",
      title: "Filing submission required",
      href: `/cha/jobs/${item.job.id}?tab=filing`,
      tone: "accent" as const,
    })),
    ...filingQueryWarnings.slice(0, 3).map((warning) => ({
      id: `query-${warning.jobId}`,
      actionLabel: "Open",
      jobNumber: warning.jobNumber,
      meta: `${warning.queryTitle} - Customs query`,
      status: "Attention",
      title: "Open customs query",
      href: `/cha/jobs/${warning.jobId}?tab=filing`,
      tone: "warning" as const,
    })),
  ].slice(0, 4);

  const expiringItems = dueDateWarnings
    .slice(0, 4)
    .map((warning) => ({
      id: warning.notificationId,
      label: warning.type.replace(/_/g, " "),
      jobNumber: warning.jobNumber,
      message: warning.message,
      remaining: formatExpiryRemaining(
        warning.message,
        warning.severity === "expired" ? "destructive" : "warning",
      ),
      href: warning.link,
      tone: warning.severity === "expired" ? "danger" as const : "warning" as const,
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
            <ChaDashboardSearchAction value={assignedSearch} />
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
            <ChaDashboardFilterAction
              jobTypes={jobTypes.map((jobType) => jobType.name)}
              selectedCategories={selectedCategories}
              selectedJobTypes={selectedJobTypes}
              selectedStages={selectedStages}
              stages={["DOCUMENT_COLLECTION", "CHECKLIST_PREPARATION", "CHECKLIST_APPROVAL", "FILING", "FILED"]}
            />
            <Link href="/cha/jobs" className="mnx-button mnx-button-outline mnx-button-compact">
              View All
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/cha/settings" className="mnx-button mnx-button-outline mnx-button-compact">
              <Settings aria-hidden="true" />
              Settings
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
                    <DataTableCell className="mnx-text-accent">
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
                    <DataTableCell>{job.jobType.name}</DataTableCell>
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
                      <span className={`mnx-cha-status-text ${chaStatusTextClass(getChaStageBadgeVariant(job.stage))}`}>
                        {formatChaBadgeLabel(job.stage)}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      <span className={`mnx-cha-status-text ${chaStatusTextClass(getChaPriorityBadgeVariant(job.priority))}`}>
                        {job.priority}
                      </span>
                    </DataTableCell>
                  </ClickableRow>
                ))}
              </DataTableBody>
            </>
          )}
        </DataTable>
      </ChaControlPanel>

      <OperationsOverview>
        <OperationsOverviewHeader refreshHref="/cha" />
        <OperationsOverviewGrid>
          <OperationsPanel
            count={pendingActions.length}
            label="Work queue"
            title="Pending Actions"
          >
            {pendingActions.length === 0 ? (
              <OperationsEmptyState
                icon="check"
                text="No immediate CHA action is required from your workspace."
                title="You're all caught up"
              />
            ) : (
              <div className="mnx-pending-action-list">
                {pendingActions.map((item) => (
                  <PendingActionRow
                    key={item.id}
                    actionLabel={item.actionLabel}
                    href={item.href}
                    jobNumber={item.jobNumber}
                    meta={item.meta}
                    status={item.status}
                    title={item.title}
                    tone={item.tone}
                  />
                ))}
              </div>
            )}
          </OperationsPanel>

          <OperationsPanel
            count={expiringItems.length}
            label="Validity monitor"
            title="Expiring Soon"
          >
            {expiringItems.length === 0 ? (
              <OperationsEmptyState
                icon="shield"
                label="Checked just now"
                text="No document validity or workflow deadlines require attention right now."
                title="No upcoming expiries"
              />
            ) : (
              <div className="mnx-expiry-list">
                {expiringItems.map((item) => (
                  <ExpiryRow
                    key={item.id}
                    href={item.href}
                    jobNumber={item.jobNumber}
                    label={formatChaBadgeLabel(item.label)}
                    message={item.message}
                    remaining={item.remaining}
                    tone={item.tone}
                  />
                ))}
              </div>
            )}
          </OperationsPanel>

          <OperationsPanel
            className="mnx-operations-panel-full"
            count={Math.min(recentActivity.length, 6)}
            label="Operational feed"
            title="Recent Activity"
          >
            {recentActivity.length === 0 ? (
              <OperationsEmptyState
                icon="activity"
                text="System and job updates will appear here as work moves forward."
                title="No recent activity"
              />
            ) : (
              <ActivityTimeline>
                {recentActivity.slice(0, 6).map((log) => {
                  const presentation = activityPresentation(log.event);
                  const jobHref = log.job ? `/cha/jobs/${log.job.id}` : undefined;

                  return (
                    <ActivityTimelineItem
                      key={log.id}
                      actor={recentActorMap.get(log.actorId) || "System"}
                      description={log.remarks || "Operational event logged."}
                      exactTime={log.timestamp.toISOString()}
                      href={jobHref}
                      icon={presentation.icon}
                      jobHref={jobHref}
                      jobNumber={log.job?.jobNumber}
                      relativeTime={formatRelativeTime(log.timestamp)}
                      title={formatActivityTitle(log.event)}
                      tone={presentation.tone}
                    />
                  );
                })}
              </ActivityTimeline>
            )}
          </OperationsPanel>
        </OperationsOverviewGrid>
      </OperationsOverview>
    </div>
  );
}

