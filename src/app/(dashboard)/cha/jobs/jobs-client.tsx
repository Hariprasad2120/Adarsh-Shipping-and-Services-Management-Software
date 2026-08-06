"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, Filter, Plane, Plus, Search, Ship, Users } from "lucide-react";
import { ClickableRow } from "@/components/navigation/clickable-row";
import {
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalMode,
  OperationalPageButton,
  OperationalPagination,
  OperationalPrimaryCell,
  OperationalRowAction,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import { CategorizedFilterMenuPanel, FilterActiveLinks, type FilterMenuPanelSection } from "@/components/forms/filter-menu";
import { Button } from "@/components/ui/button";
import { NeonCheckbox } from "@/components/ui/neon-checkbox";
import { ChaFilterMenu as FilterMenu } from "@/modules/cha/components/workspace/cha-workspace";
import { WorkspaceInput, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { JobFilingQueryWarningIndicator } from "@/modules/cha/components/warnings/job-filing-query-warning-indicator";
import { ChaDueDateWarningsIndicator } from "@/modules/cha/components/warnings/cha-due-date-warnings-indicator";
import type { DueDateWarningViewModel } from "@/modules/cha/components/warnings/cha-due-date-warning-indicator";
import { formatChaBadgeLabel } from "@/lib/cha-badges";
import {
  ChaMetricCard,
  ChaMetrics,
  ChaPageHeader,
  ChaVisibleRecords,
} from "@/modules/cha/components/workspace/cha-operations-shared";
import { ChaHeaderGraphic } from "../graphics/ChaHeaderGraphic";

type MovementDirection = "IMPORT" | "EXPORT" | "BOTH" | "OTHER" | null;
type FilterPanelKey = "stage" | "status" | "priority" | "branchId" | "jobTypeId" | "assignedToMe";

interface JobItem {
  id: string;
  jobNumber: string;
  title: string;
  customerName: string;
  jobTypeName: string;
  movementDirection: MovementDirection;
  branchName: string;
  stage: string;
  status: string;
  priority: string;
  primaryOwnerId: string;
  ownerName: string;
  billOfEntryNumber: string | null;
  shippingBillNumber: string | null;
  assignedUserIds: string[];
  hasActiveDeletionRequest: boolean;
  dueDateWarnings: DueDateWarningViewModel[];
  filingQueryWarning?: {
    queryTitle: string;
    overdueQueryCount: number;
    reminderTriggeredAt: string;
    warningTriggeredAt: string;
    staleMinutes: number;
  } | null;
  createdAt: string;
}

type TableData = {
  items: JobItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

interface JobsClientProps {
  activeJobsData: TableData;
  completedJobsData: TableData;
  filters: {
    search?: string;
    stage?: string[];
    status?: string[];
    priority?: string[];
    branchId?: string[];
    jobTypeId?: string[];
    assignedToMe?: boolean;
  };
  options: {
    branches: { id: string; name: string; code: string }[];
    customers: { id: string; name: string }[];
    jobTypes: { id: string; name: string }[];
    shipmentTypes: { id: string; name: string }[];
    users: { id: string; name: string; email: string }[];
    managers: { id: string; name: string; email: string; branchId: string | null }[];
    teamGroups: { id: string; name: string; memberIds: unknown }[];
    branchNumberingRules: {
      branchId: string;
      prefix: string;
      suffix?: string | null;
      startingSequence: number;
      currentSequence: number;
      numberPadding: number;
      useFinancialYear: boolean;
      financialYearFormat?: string | null;
      isActive: boolean;
    }[];
  };
  canCreateJob: boolean;
}

function formatJobDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getFilingReference(job: JobItem) {
  if (job.movementDirection === "IMPORT") {
    return job.billOfEntryNumber;
  }

  if (job.movementDirection === "EXPORT") {
    return job.shippingBillNumber;
  }

  return job.billOfEntryNumber || job.shippingBillNumber;
}

function formatChaStageShortLabel(stage?: string | null) {
  switch (stage) {
    case "DOCUMENT_COLLECTION":
      return "Docs";
    case "ADDITIONAL_DATA":
      return "Data";
    case "CHECKLIST_PREPARATION":
      return "Checklist";
    case "CHECKLIST_APPROVAL":
      return "Approval";
    case "FILING":
      return "Filing";
    case "FILED":
      return "Filed";
    default:
      return formatChaBadgeLabel(stage);
  }
}

export function JobsClient({
  activeJobsData,
  completedJobsData,
  filters,
  options,
  canCreateJob,
}: JobsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(filters.search || "");
  const [stage, setStage] = useState<string[]>(filters.stage || []);
  const [status, setStatus] = useState<string[]>(filters.status || []);
  const [priority, setPriority] = useState<string[]>(filters.priority || []);
  const [branchId, setBranchId] = useState<string[]>(filters.branchId || []);
  const [jobTypeId, setJobTypeId] = useState<string[]>(filters.jobTypeId || []);
  const [assignedToMe, setAssignedToMe] = useState(filters.assignedToMe || false);
  const [openFilterTable, setOpenFilterTable] = useState<"active" | "completed" | null>(null);
  const [activeFilterType, setActiveFilterType] = useState<FilterPanelKey | "">("stage");

  const activeFilterCount = [
    Boolean(search),
    stage.length > 0,
    status.length > 0,
    priority.length > 0,
    branchId.length > 0,
    jobTypeId.length > 0,
    assignedToMe,
  ].filter(Boolean).length;

  const buildParams = (
    overrides?: Partial<{
      search: string;
      stage: string[];
      status: string[];
      priority: string[];
      branchId: string[];
      jobTypeId: string[];
      assignedToMe: boolean;
    }>,
  ) => {
    const next = {
      search,
      stage,
      status,
      priority,
      branchId,
      jobTypeId,
      assignedToMe,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.search) params.set("search", next.search);
    if (next.stage.length) params.set("stage", next.stage.join(","));
    if (next.status.length) params.set("status", next.status.join(","));
    if (next.priority.length) params.set("priority", next.priority.join(","));
    if (next.branchId.length) params.set("branchId", next.branchId.join(","));
    if (next.jobTypeId.length) params.set("jobTypeId", next.jobTypeId.join(","));
    if (next.assignedToMe) params.set("assignedToMe", "true");
    params.set("activePage", "1");
    params.set("completedPage", "1");
    return params;
  };

  const toggleValue = (current: string[], value: string) =>
    current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

  const syncFilters = (overrides?: Partial<{
    search: string;
    stage: string[];
    status: string[];
    priority: string[];
    branchId: string[];
    jobTypeId: string[];
    assignedToMe: boolean;
  }>) => {
    const next = {
      search,
      stage,
      status,
      priority,
      branchId,
      jobTypeId,
      assignedToMe,
      ...overrides,
    };
    setSearch(next.search);
    setStage(next.stage);
    setStatus(next.status);
    setPriority(next.priority);
    setBranchId(next.branchId);
    setJobTypeId(next.jobTypeId);
    setAssignedToMe(next.assignedToMe);
    router.push(`/cha/jobs?${buildParams(overrides).toString()}`);
  };

  const applyFilters = () => {
    const params = buildParams();
    router.push(`/cha/jobs?${params.toString()}`);
    setOpenFilterTable(null);
  };

  const buildJobsHref = (
    overrides?: Partial<{
      search: string;
      stage: string[];
      status: string[];
      priority: string[];
      branchId: string[];
      jobTypeId: string[];
      assignedToMe: boolean;
    }>,
  ) => {
    const params = buildParams(overrides);
    const query = params.toString();
    return query ? `/cha/jobs?${query}` : "/cha/jobs";
  };

  const handlePageChange = (table: "active" | "completed", page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(table === "active" ? "activePage" : "completedPage", String(page));
    router.push(`/cha/jobs?${params.toString()}`);
  };

  const removeFilterHref = (
    filterKey: "search" | "stage" | "status" | "priority" | "branchId" | "jobTypeId" | "assignedToMe",
    value?: string,
  ) => {
    if (filterKey === "search") return buildJobsHref({ search: "" });
    if (filterKey === "stage") return buildJobsHref({ stage: value ? stage.filter((item) => item !== value) : [] });
    if (filterKey === "status") return buildJobsHref({ status: value ? status.filter((item) => item !== value) : [] });
    if (filterKey === "priority") return buildJobsHref({ priority: value ? priority.filter((item) => item !== value) : [] });
    if (filterKey === "branchId") return buildJobsHref({ branchId: value ? branchId.filter((item) => item !== value) : [] });
    if (filterKey === "jobTypeId") return buildJobsHref({ jobTypeId: value ? jobTypeId.filter((item) => item !== value) : [] });
    return buildJobsHref({ assignedToMe: false });
  };

  const assignedViewLabel = assignedToMe ? "Mine" : "All";
  const assignedViewNote = assignedToMe ? "Showing only your assigned work" : "Showing every visible job";

  const summaryCards = [
    {
      title: "Active Clearance Jobs",
      value: activeJobsData.total,
      note: "Jobs currently in operations",
      icon: <Briefcase size={16} />,
      accent: "blue" as const,
    },
    {
      title: "Completed Jobs",
      value: completedJobsData.total,
      note: "Filed jobs separated from active work",
      icon: <CheckCircle2 size={16} />,
      accent: "green" as const,
    },
    {
      title: "Live Filters",
      value: activeFilterCount,
      note: activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} applied` : "No filters applied",
      icon: <Filter size={16} />,
      accent: "orange" as const,
    },
    {
      title: "Assigned View",
      value: assignedViewLabel,
      note: assignedViewNote,
      icon: <Users size={16} />,
      accent: "blue" as const,
    },
  ];

  const activePills = [
    search ? { key: "search" as const, label: `Search: ${search}` } : null,
    ...stage.map((value) => ({ key: "stage" as const, value, label: `Stage: ${formatChaStageShortLabel(value)}` })),
    ...status.map((value) => ({ key: "status" as const, value, label: `Status: ${formatChaBadgeLabel(value)}` })),
    ...priority.map((value) => ({ key: "priority" as const, value, label: `Priority: ${value}` })),
    ...branchId.map((value) => ({
      key: "branchId" as const,
      value,
      label: `Branch: ${options.branches.find((branch) => branch.id === value)?.name ?? "Selected"}`,
    })),
    ...jobTypeId.map((value) => ({
      key: "jobTypeId" as const,
      value,
      label: `Type: ${options.jobTypes.find((jobType) => jobType.id === value)?.name ?? "Selected"}`,
    })),
    assignedToMe ? { key: "assignedToMe" as const, label: "Assigned to me" } : null,
  ].filter(Boolean) as { key: "search" | "stage" | "status" | "priority" | "branchId" | "jobTypeId" | "assignedToMe"; label: string; value?: string }[];

  const filterSections: FilterMenuPanelSection[] = [
    {
      key: "stage",
      label: "Workflow Stage",
      value: stage.length ? `${stage.length} selected` : "All",
      active: stage.length > 0,
      options: [
        { key: "stage-all", label: "All Stages", selected: stage.length === 0, onSelect: () => syncFilters({ stage: [] }) },
        ...[
          { value: "DOCUMENT_COLLECTION", note: "Documentation" },
          { value: "ADDITIONAL_DATA", note: "Additional data" },
          { value: "CHECKLIST_PREPARATION", note: "Checklist prep" },
          { value: "CHECKLIST_APPROVAL", note: "Checklist approval" },
          { value: "FILING", note: "Filing" },
          { value: "FILED", note: "Completed" },
        ].map((item) => ({
          key: `stage-${item.value}`,
          label: formatChaStageShortLabel(item.value),
          note: item.note,
          selected: stage.includes(item.value),
          onSelect: () => syncFilters({ stage: toggleValue(stage, item.value) }),
        })),
      ],
    },
    {
      key: "status",
      label: "Status",
      value: status.length ? `${status.length} selected` : "All",
      active: status.length > 0,
      options: [
        { key: "status-all", label: "All Statuses", selected: status.length === 0, onSelect: () => syncFilters({ status: [] }) },
        ...["ACTIVE", "HOLD", "CANCELLED", "COMPLETED"].map((item) => ({
          key: `status-${item}`,
          label: formatChaBadgeLabel(item),
          selected: status.includes(item),
          onSelect: () => syncFilters({ status: toggleValue(status, item) }),
        })),
      ],
    },
    {
      key: "priority",
      label: "Priority",
      value: priority.length ? `${priority.length} selected` : "All",
      active: priority.length > 0,
      options: [
        { key: "priority-all", label: "All Priorities", selected: priority.length === 0, onSelect: () => syncFilters({ priority: [] }) },
        ...["LOW", "MEDIUM", "HIGH"].map((item) => ({
          key: `priority-${item}`,
          label: item,
          selected: priority.includes(item),
          onSelect: () => syncFilters({ priority: toggleValue(priority, item) }),
        })),
      ],
    },
    {
      key: "branchId",
      label: "Branch",
      value: branchId.length ? `${branchId.length} selected` : "All",
      active: branchId.length > 0,
      options: [
        { key: "branch-all", label: "All Branches", selected: branchId.length === 0, onSelect: () => syncFilters({ branchId: [] }) },
        ...options.branches.map((branch) => ({
          key: `branch-${branch.id}`,
          label: branch.name,
          note: branch.code,
          selected: branchId.includes(branch.id),
          onSelect: () => syncFilters({ branchId: toggleValue(branchId, branch.id) }),
        })),
      ],
    },
    {
      key: "jobTypeId",
      label: "Job Type",
      value: jobTypeId.length ? `${jobTypeId.length} selected` : "All",
      active: jobTypeId.length > 0,
      options: [
        { key: "job-type-all", label: "All Job Types", selected: jobTypeId.length === 0, onSelect: () => syncFilters({ jobTypeId: [] }) },
        ...options.jobTypes.map((jobType) => ({
          key: `job-type-${jobType.id}`,
          label: jobType.name,
          selected: jobTypeId.includes(jobType.id),
          onSelect: () => syncFilters({ jobTypeId: toggleValue(jobTypeId, jobType.id) }),
        })),
      ],
    },
    {
      key: "assignedToMe",
      label: "Assignment",
      value: assignedToMe ? "Mine" : "All",
      active: assignedToMe,
      options: [
        {
          key: "assignment-all",
          label: "All Jobs",
          note: "Every visible job",
          selected: !assignedToMe,
          onSelect: () => syncFilters({ assignedToMe: false }),
        },
        {
          key: "assignment-mine",
          label: "Assigned to me",
          note: "Only your queue",
          selected: assignedToMe,
          onSelect: () => syncFilters({ assignedToMe: !assignedToMe }),
        },
      ],
    },
  ];

  const renderTableControls = (tableKey: "active" | "completed") => (
    <form
      className="mnx-cha-jobs-toolbar"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        applyFilters();
      }}
    >
      <label className="mnx-search-field">
        <Search size={16} aria-hidden="true" />
        <WorkspaceInput
          aria-label="Search jobs"
          type="search"
          placeholder="Search customers, job numbers..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      <div className="mnx-cha-jobs-toolbar-actions">
        <FilterMenu
          open={openFilterTable === tableKey}
          onOpenChange={(open) => setOpenFilterTable(open ? tableKey : null)}
          activeCount={activeFilterCount}
          title="Filters"
          ariaLabel="Open filters"
          contentClassName="w-[min(320px,calc(100vw-1rem))]"
        >
          <CategorizedFilterMenuPanel
            activeCategoryKey={activeFilterType}
            onActiveCategoryChange={(value) => setActiveFilterType(value as FilterPanelKey | "")}
            sections={filterSections}
            title="Filters"
            headerActionLabel="Save view"
          />
        </FilterMenu>
        {canCreateJob ? (
          <Button
            type="button"
            size="sm"
            onClick={() => router.push("/cha/jobs/new")}
          >
            <Plus className="size-4" /> New Job
          </Button>
        ) : null}
      </div>
    </form>
  );

  const renderActivePills = () =>
    activePills.length > 0 ? (
      <div className="mnx-cha-jobs-table-controls">
        <FilterActiveLinks
          links={activePills.map((pill) => ({
            key: `${pill.key}-${pill.value ?? pill.label}`,
            href: removeFilterHref(pill.key, pill.value),
            label: `${pill.label} x`,
          }))}
          clearHref="/cha/jobs"
        />
      </div>
    ) : null;

  const renderTable = ({
    title,
    description,
    data,
    emptyTitle,
    emptyText,
    tableKey,
  }: {
    title: string;
    description: string;
    data: TableData;
    emptyTitle: string;
    emptyText: string;
    tableKey: "active" | "completed";
  }) => {
    const isActiveSection = tableKey === "active";
    const visibleStart = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
    const visibleEnd = Math.min(data.page * data.pageSize, data.total);
    return (
      <section className="mnx-cha-section-block py-1">
        <WorkspaceSectionHeading
          className="mnx-cha-outside-heading"
          index={isActiveSection ? "02" : "03"}
          title={title}
          description={description}
        />
        <OperationalDataTable>
          <OperationalDataTableHeader
            eyebrow="Shipment register"
            title={title}
            actions={
              <>
                {renderTableControls(tableKey)}
                <ChaVisibleRecords
                  visible={data.items.length}
                  total={data.total}
                  tone={isActiveSection ? "blue" : "green"}
                />
              </>
            }
          />
          {renderActivePills()}
          <OperationalDataTableWrap>
            <OperationalTable>
              <thead>
                <tr>
                  <OperationalTableHead>
                    <NeonCheckbox aria-label={`Select all ${title.toLowerCase()}`} />
                  </OperationalTableHead>
                  <OperationalTableHead>Job Number</OperationalTableHead>
                  <OperationalTableHead>Customer</OperationalTableHead>
                  <OperationalTableHead>Mode</OperationalTableHead>
                  <OperationalTableHead>Current Stage</OperationalTableHead>
                  <OperationalTableHead>Status</OperationalTableHead>
                  <OperationalTableHead>Process</OperationalTableHead>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <OperationalTableEmpty colSpan={7}>
                    <div className="flex flex-col items-center justify-center p-14 text-center mnx-text-muted">
                      <div className="mnx-icon-badge mb-4">
                        <Briefcase size={32} />
                      </div>
                      <p className="text-sm mnx-text-primary">{emptyTitle}</p>
                      <p className="mt-1 text-xs">{emptyText}</p>
                    </div>
                  </OperationalTableEmpty>
                ) : (
                  data.items.map((job) => {
                    const filingReference = getFilingReference(job);
                    const isAir = job.jobTypeName.toLowerCase().includes("air");

                    return (
                      <ClickableRow key={job.id} href={`/cha/jobs/${job.id}`}>
                        <OperationalTableCell>
                          <NeonCheckbox aria-label={`Select ${job.jobNumber}`} />
                        </OperationalTableCell>
                        <OperationalPrimaryCell
                          primary={
                            <span className="flex items-center gap-2">
                              {job.jobNumber}
                              <ChaDueDateWarningsIndicator warnings={job.dueDateWarnings} />
                              {job.filingQueryWarning ? (
                                <JobFilingQueryWarningIndicator jobId={job.id} warning={job.filingQueryWarning} />
                              ) : null}
                            </span>
                          }
                          secondary={`${filingReference || "Reference pending"} - ${formatJobDate(job.createdAt)}`}
                        />
                        <OperationalTableCell>{job.customerName}</OperationalTableCell>
                        <OperationalTableCell>
                          <OperationalMode icon={isAir ? <Plane size={13} /> : <Ship size={13} />}>
                            {job.jobTypeName}
                          </OperationalMode>
                        </OperationalTableCell>
                        <OperationalTableCell>{formatChaStageShortLabel(job.stage)}</OperationalTableCell>
                        <OperationalTableCell>
                          <OperationalStatus
                            tone={
                              job.status === "COMPLETED"
                                ? "success"
                                : job.priority === "HIGH" || job.priority === "URGENT"
                                  ? "warning"
                                  : job.status === "CANCELLED"
                                    ? "danger"
                                    : "info"
                            }
                          >
                            {job.status === "COMPLETED" ? "Completed" : job.priority}
                          </OperationalStatus>
                        </OperationalTableCell>
                        <OperationalTableCell>
                          <OperationalRowAction
                            aria-label={`Process ${job.jobNumber}`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              router.push(`/cha/jobs/${job.id}`);
                            }}
                          >
                            Process
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
            summary={`Showing ${visibleStart}-${visibleEnd} of ${data.total} jobs`}
          >
            <OperationalPagination>
              <OperationalPageButton
                disabled={data.page === 1}
                onClick={() => handlePageChange(tableKey, data.page - 1)}
              >
                <ArrowLeft size={13} aria-hidden="true" />
              </OperationalPageButton>
              {Array.from({ length: Math.min(data.totalPages, 3) }, (_, index) => index + 1).map((page) => (
                <OperationalPageButton
                  key={page}
                  active={page === data.page}
                  onClick={() => handlePageChange(tableKey, page)}
                >
                  {page}
                </OperationalPageButton>
              ))}
              <OperationalPageButton
                disabled={data.page === data.totalPages || data.totalPages === 0}
                onClick={() => handlePageChange(tableKey, data.page + 1)}
              >
                <ArrowRight size={13} aria-hidden="true" />
              </OperationalPageButton>
            </OperationalPagination>
          </OperationalDataTableFooter>
        </OperationalDataTable>
      </section>
    );
  };

  return (
    <div className="space-y-8">
      <ChaPageHeader
        eyebrow={null}
        title="Jobs"
        description="Run the CHA operations queue from one place with faster search, filter, and handoff control."
        graphic={<ChaHeaderGraphic />}
      />

      <ChaMetrics>
        {summaryCards.map((card) => (
          <ChaMetricCard
            key={card.title}
            title={card.title}
            value={card.value}
            note={card.note}
            icon={card.icon}
            accent={card.accent}
          />
        ))}
      </ChaMetrics>

      {renderTable({
        title: "Active Jobs",
        description: "Current CHA jobs that are still moving through the workflow.",
        data: activeJobsData,
        emptyTitle: "No active jobs match the current filters.",
        emptyText: "Adjust the filters or create a new job.",
        tableKey: "active",
      })}

      {renderTable({
        title: "Completed Jobs",
        description: "Filed and completed CHA jobs, shown separately from in-progress work.",
        data: completedJobsData,
        emptyTitle: "No completed jobs match the current filters.",
        emptyText: "Try clearing filters to see older filed work.",
        tableKey: "completed",
      })}
    </div>
  );
}
