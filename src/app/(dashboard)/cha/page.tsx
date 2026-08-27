import { ClickableRow } from "@/components/navigation/clickable-row";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/rbac";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ArrowRight, MoreHorizontal, Plane, Settings, Ship } from "lucide-react";
import { listChaDueDateWarnings, listFilingQueryEscalationWarnings, listJobTypesForSelection, listSection49ValidityWarnings } from "@/modules/cha/service";
import { DashboardCreateJob } from "@/modules/cha/components/dashboard-create-job";
import { getChaDashboardMetrics, listChaRecentActivity } from "@/modules/cha/dashboard/queries";
import { NeonCheckbox } from "@/components/ui/neon-checkbox";
import { WorkspaceSectionHeading } from "@/components/layout/workspace";
import { JobFilingQueryWarningIndicator } from "@/modules/cha/components/warnings/job-filing-query-warning-indicator";
import { JobSection49ValidityWarningIndicator } from "@/modules/cha/components/warnings/job-section49-validity-warning-indicator";
import {
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalMode,
  OperationalPrimaryCell,
  OperationalRowAction,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import {
  formatChaBadgeLabel,
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
} from "@/components/data-display/operations-overview/operations-overview";
import {
  ChaMetricCard,
  ChaMetrics,
  ChaPageHeader,
  ChaVisibleRecords,
} from "@/modules/cha/components/workspace/cha-operations-shared";
import { ChaDashboardFilterAction } from "@/modules/cha/components/dashboard/cha-dashboard-filter-action";
import { ChaDashboardSearchAction } from "@/modules/cha/components/dashboard/cha-dashboard-search-action";
import { ChaHeaderGraphic } from "./graphics/ChaHeaderGraphic";

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
  const session = await getSession();
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
    dashboardMetrics,
    myJobs,
    jobTypes,
    pendingChecklistItems,
    pendingFilingItems,
    recentActivity,
  ] = await Promise.all([
    getChaDashboardMetrics(orgId),
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
    listJobTypesForSelection(orgId),
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
    listChaRecentActivity(orgId),
  ]);

  const visibleJobIds = myJobs.map((job) => job.id);
  const [dueDateWarnings, section49Warnings, filingQueryWarnings] = await Promise.all([
    listChaDueDateWarnings(session.user.id, orgId, {
      jobIds: visibleJobIds,
      createNotifications: false,
    }),
    listSection49ValidityWarnings(session.user.id, orgId, visibleJobIds),
    listFilingQueryEscalationWarnings(session.user.id, orgId, visibleJobIds),
  ]);

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
      value: dashboardMetrics.activeJobs,
      note: "Jobs currently in operations",
      accent: "blue" as const,
    },
    {
      title: "Checklists Pending",
      value: dashboardMetrics.pendingChecklists,
      note: "Awaiting manager review decision",
      accent: "orange" as const,
    },
    {
      title: "Pending Filings",
      value: dashboardMetrics.pendingFilings,
      note: "Awaiting customs BOE/SB submissions",
      accent: "blue" as const,
    },
    {
      title: "Urgent Expenses",
      value: dashboardMetrics.urgentExpenses,
      note: "Immediate payouts required",
      accent: "orange" as const,
    },
    {
      title: "Outstanding Advances",
      value: `\u20B9${dashboardMetrics.outstandingAdvance.toLocaleString("en-IN")}`,
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

      <section className="mnx-cha-section-block">
        <WorkspaceSectionHeading
          className="mnx-cha-outside-heading"
          index="01"
          title="My Assigned Jobs"
          description="Open or manage the jobs currently assigned to you."
        />
        <OperationalDataTable>
          <OperationalDataTableHeader
            hideIdentity
            actions={
              <>
                <ChaDashboardSearchAction value={assignedSearch} />
                <DashboardCreateJob
                  canCreateJob={canCreateJob}
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
                <ChaVisibleRecords visible={myJobs.length} total={myJobs.length} />
              </>
            }
          />
          <OperationalDataTableWrap>
            <OperationalTable>
              <thead>
                <tr>
                  <OperationalTableHead>
                    <NeonCheckbox aria-label="Select all assigned jobs" />
                  </OperationalTableHead>
                  <OperationalTableHead>Job Number</OperationalTableHead>
                  <OperationalTableHead>Customer</OperationalTableHead>
                  <OperationalTableHead>Mode</OperationalTableHead>
                  <OperationalTableHead>Current Stage</OperationalTableHead>
                  <OperationalTableHead>Status</OperationalTableHead>
                  <OperationalTableHead />
                </tr>
              </thead>
              <tbody>
                {myJobs.length === 0 ? (
                  <OperationalTableEmpty colSpan={7}>
                    <div className="flex flex-col items-center justify-center p-14 text-center">
                      <p className="text-sm mnx-text-primary">You don&apos;t have any active job assignments yet.</p>
                      <p className="mt-1 text-xs mnx-text-muted">New work will appear here automatically.</p>
                    </div>
                  </OperationalTableEmpty>
                ) : (
                  myJobs.map((job) => {
                    const filingReference =
                      job.jobType.movementDirection === "IMPORT"
                        ? job.filing?.billOfEntryNumber
                        : job.jobType.movementDirection === "EXPORT"
                          ? job.filing?.shippingBillNumber
                          : job.filing?.billOfEntryNumber || job.filing?.shippingBillNumber;
                    const isAir = job.jobType.name.toLowerCase().includes("air");

                    return (
                      <ClickableRow key={job.id} href={`/cha/jobs/${job.id}`}>
                        <OperationalTableCell>
                          <NeonCheckbox aria-label={`Select ${job.jobNumber}`} />
                        </OperationalTableCell>
                        <OperationalPrimaryCell
                          primary={
                            <span className="flex items-center gap-2">
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
                            </span>
                          }
                          secondary={filingReference || "Reference pending"}
                        />
                        <OperationalTableCell>{job.customer.name}</OperationalTableCell>
                        <OperationalTableCell>
                          <OperationalMode icon={isAir ? <Plane size={13} /> : <Ship size={13} />}>
                            {job.jobType.name}
                          </OperationalMode>
                        </OperationalTableCell>
                        <OperationalTableCell>{formatChaBadgeLabel(job.stage)}</OperationalTableCell>
                        <OperationalTableCell>
                          <OperationalStatus
                            tone={
                              job.priority === "HIGH" || job.priority === "URGENT"
                                ? "warning"
                                : job.stage === "FILED"
                                  ? "success"
                                  : "info"
                            }
                          >
                            {job.priority}
                          </OperationalStatus>
                        </OperationalTableCell>
                        <OperationalTableCell>
                          <OperationalRowAction>
                            <MoreHorizontal size={16} aria-hidden="true" />
                          </OperationalRowAction>
                        </OperationalTableCell>
                      </ClickableRow>
                    );
                  })
                )}
              </tbody>
            </OperationalTable>
          </OperationalDataTableWrap>
          <OperationalDataTableFooter
            summary={`Showing ${myJobs.length === 0 ? "0" : `1-${myJobs.length}`} of ${myJobs.length} assigned jobs`}
          />
        </OperationalDataTable>
      </section>

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
                  const jobHref = log.jobId ? `/cha/jobs/${log.jobId}` : undefined;

                  return (
                    <ActivityTimelineItem
                      key={log.id}
                      actor={log.actorName || "System"}
                      description={log.remarks || "Operational event logged."}
                      exactTime={log.timestamp.toISOString()}
                      href={jobHref}
                      icon={presentation.icon}
                      jobHref={jobHref}
                      jobNumber={log.jobNumber ?? undefined}
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

