"use client";

import { Input } from "@/components/monolith/input";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, CheckCircle2, Filter, Plus, Search, Users } from "lucide-react";
import { CreateJobDialog } from "@/components/cha/create-job-dialog";
import { CreateJobPermissionGuard } from "@/components/cha/create-job-permission-guard";
import { ClickableRow } from "@/components/clickable-row";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableFooter,
  DataTableHead,
  DataTableHeader,
} from "@/components/monolith/workspace-data-table";
import { Button } from "@/components/monolith/button";
import { Badge } from "@/components/monolith/badge";
import { FilterMenu } from "@/components/monolith/filter-menu";
import { JobFilingQueryWarningIndicator } from "@/app/(dashboard)/cha/_components/job-filing-query-warning-indicator";
import { ChaDueDateWarningsIndicator } from "@/app/(dashboard)/cha/_components/cha-due-date-warnings-indicator";
import type { DueDateWarningViewModel } from "@/app/(dashboard)/cha/_components/cha-due-date-warning-indicator";
import { formatChaBadgeLabel, getChaPriorityBadgeVariant } from "@/lib/cha-badges";
import { cn } from "@/lib/utils";
import type { BadgeVariant } from "@/components/monolith/badge";
import {
  ChaControlPanel,
  ChaMetricCard,
  ChaMetrics,
  ChaPageHeader,
  ChaSectionShell,
  ChaVisibleRecords,
} from "../_components/cha-operations-shared";

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
    stage?: string;
    status?: string;
    priority?: string;
    branchId?: string;
    jobTypeId?: string;
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
  showCreateNew: boolean;
  showCreatePermissionDenied: boolean;
  canCreateJob: boolean;
  currentUserId: string;
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

function getChaStageBadgeVariant(stage?: string | null): BadgeVariant {
  if (stage === "FILED") return "success";
  if (stage === "FILING" || stage === "CHECKLIST_APPROVAL") return "warning";
  if (stage === "DOCUMENT_COLLECTION" || stage === "ADDITIONAL_DATA" || stage === "CHECKLIST_PREPARATION") return "default";
  return "secondary";
}

export function JobsClient({
  activeJobsData,
  completedJobsData,
  filters,
  options,
  showCreateNew,
  showCreatePermissionDenied,
  canCreateJob,
  currentUserId,
}: JobsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(filters.search || "");
  const [stage, setStage] = useState(filters.stage || "");
  const [status, setStatus] = useState(filters.status || "");
  const [priority, setPriority] = useState(filters.priority || "");
  const [branchId, setBranchId] = useState(filters.branchId || "");
  const [jobTypeId, setJobTypeId] = useState(filters.jobTypeId || "");
  const [assignedToMe, setAssignedToMe] = useState(filters.assignedToMe || false);
  const [isModalOpen, setIsModalOpen] = useState(showCreateNew && canCreateJob);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState<FilterPanelKey>("stage");

  const activeFilterCount = [
    Boolean(search),
    Boolean(stage),
    Boolean(status),
    Boolean(priority),
    Boolean(branchId),
    Boolean(jobTypeId),
    assignedToMe,
  ].filter(Boolean).length;

  const buildParams = (
    overrides?: Partial<{
      search: string;
      stage: string;
      status: string;
      priority: string;
      branchId: string;
      jobTypeId: string;
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
    if (next.stage) params.set("stage", next.stage);
    if (next.status) params.set("status", next.status);
    if (next.priority) params.set("priority", next.priority);
    if (next.branchId) params.set("branchId", next.branchId);
    if (next.jobTypeId) params.set("jobTypeId", next.jobTypeId);
    if (next.assignedToMe) params.set("assignedToMe", "true");
    params.set("activePage", "1");
    params.set("completedPage", "1");
    return params;
  };

  const applyFilters = () => {
    const params = buildParams();
    router.push(`/cha/jobs?${params.toString()}`);
    setIsFilterPanelOpen(false);
  };

  const handlePageChange = (table: "active" | "completed", page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(table === "active" ? "activePage" : "completedPage", String(page));
    router.push(`/cha/jobs?${params.toString()}`);
  };

  const resetFilters = () => {
    setSearch("");
    setStage("");
    setStatus("");
    setPriority("");
    setBranchId("");
    setJobTypeId("");
    setAssignedToMe(false);
    router.push("/cha/jobs");
    setIsFilterPanelOpen(false);
  };

  const removeFilter = (filterKey: "search" | "stage" | "status" | "priority" | "branchId" | "jobTypeId" | "assignedToMe") => {
    if (filterKey === "search") setSearch("");
    if (filterKey === "stage") setStage("");
    if (filterKey === "status") setStatus("");
    if (filterKey === "priority") setPriority("");
    if (filterKey === "branchId") setBranchId("");
    if (filterKey === "jobTypeId") setJobTypeId("");
    if (filterKey === "assignedToMe") setAssignedToMe(false);

    const params = buildParams({
      [filterKey]: filterKey === "assignedToMe" ? false : "",
    } as Partial<{
      search: string;
      stage: string;
      status: string;
      priority: string;
      branchId: string;
      jobTypeId: string;
      assignedToMe: boolean;
    }>);
    router.push(`/cha/jobs?${params.toString()}`);
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
    stage ? { key: "stage" as const, label: `Stage: ${formatChaStageShortLabel(stage)}` } : null,
    status ? { key: "status" as const, label: `Status: ${status}` } : null,
    priority ? { key: "priority" as const, label: `Priority: ${priority}` } : null,
    branchId
      ? { key: "branchId" as const, label: `Branch: ${options.branches.find((branch) => branch.id === branchId)?.name ?? "Selected"}` }
      : null,
    jobTypeId
      ? { key: "jobTypeId" as const, label: `Type: ${options.jobTypes.find((jobType) => jobType.id === jobTypeId)?.name ?? "Selected"}` }
      : null,
    assignedToMe ? { key: "assignedToMe" as const, label: "Assigned to me" } : null,
  ].filter(Boolean) as { key: "search" | "stage" | "status" | "priority" | "branchId" | "jobTypeId" | "assignedToMe"; label: string }[];

  const filterTypes: { key: FilterPanelKey; label: string; value: string; active: boolean }[] = [
    { key: "stage", label: "Workflow Stage", value: stage ? formatChaStageShortLabel(stage) : "All", active: Boolean(stage) },
    { key: "status", label: "Status", value: status || "All", active: Boolean(status) },
    { key: "priority", label: "Priority", value: priority || "All", active: Boolean(priority) },
    {
      key: "branchId",
      label: "Branch",
      value: branchId ? options.branches.find((branch) => branch.id === branchId)?.name ?? "Selected" : "All",
      active: Boolean(branchId),
    },
    {
      key: "jobTypeId",
      label: "Job Type",
      value: jobTypeId ? options.jobTypes.find((jobType) => jobType.id === jobTypeId)?.name ?? "Selected" : "All",
      active: Boolean(jobTypeId),
    },
    { key: "assignedToMe", label: "Assignment", value: assignedToMe ? "Mine" : "All", active: assignedToMe },
  ];

  const filterOptionButton = ({
    label,
    note,
    selected,
    onClick,
  }: {
    label: string;
    note?: string;
    selected: boolean;
    onClick: () => void;
  }) => (
    <Button
      key={`${activeFilterType}-${label}-${note ?? ""}`}
      type="button"
      onClick={onClick}
      className={cn(
        "mnx-plain mnx-menu-option py-2 text-sm",
        selected && "mnx-menu-option-active",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {note ? <span className="mt-0.5 block truncate text-xs mnx-text-muted">{note}</span> : null}
      </span>
      {selected ? <span className="mnx-state-dot" /> : null}
    </Button>
  );

  const renderFilterOptions = () => {
    if (activeFilterType === "stage") {
      return [
        filterOptionButton({ label: "All Stages", selected: !stage, onClick: () => setStage("") }),
        ...[
          { value: "DOCUMENT_COLLECTION", note: "Documentation" },
          { value: "ADDITIONAL_DATA", note: "Additional data" },
          { value: "CHECKLIST_PREPARATION", note: "Checklist prep" },
          { value: "CHECKLIST_APPROVAL", note: "Checklist approval" },
          { value: "FILING", note: "Filing" },
          { value: "FILED", note: "Completed" },
        ].map((item) =>
          filterOptionButton({
            label: formatChaStageShortLabel(item.value),
            note: item.note,
            selected: stage === item.value,
            onClick: () => setStage(item.value),
          }),
        ),
      ];
    }

    if (activeFilterType === "status") {
      return [
        filterOptionButton({ label: "All Statuses", selected: !status, onClick: () => setStatus("") }),
        ...["ACTIVE", "HOLD", "CANCELLED", "COMPLETED"].map((item) =>
          filterOptionButton({ label: formatChaBadgeLabel(item), selected: status === item, onClick: () => setStatus(item) }),
        ),
      ];
    }

    if (activeFilterType === "priority") {
      return [
        filterOptionButton({ label: "All Priorities", selected: !priority, onClick: () => setPriority("") }),
        ...["LOW", "MEDIUM", "HIGH"].map((item) =>
          filterOptionButton({ label: item, selected: priority === item, onClick: () => setPriority(item) }),
        ),
      ];
    }

    if (activeFilterType === "branchId") {
      return [
        filterOptionButton({ label: "All Branches", selected: !branchId, onClick: () => setBranchId("") }),
        ...options.branches.map((branch) =>
          filterOptionButton({ label: branch.name, selected: branchId === branch.id, onClick: () => setBranchId(branch.id) }),
        ),
      ];
    }

    if (activeFilterType === "jobTypeId") {
      return [
        filterOptionButton({ label: "All Job Types", selected: !jobTypeId, onClick: () => setJobTypeId("") }),
        ...options.jobTypes.map((jobType) =>
          filterOptionButton({ label: jobType.name, selected: jobTypeId === jobType.id, onClick: () => setJobTypeId(jobType.id) }),
        ),
      ];
    }

    return [
      filterOptionButton({ label: "All Jobs", note: "Every visible job", selected: !assignedToMe, onClick: () => setAssignedToMe(false) }),
      filterOptionButton({ label: "Assigned to me", note: "Only your queue", selected: assignedToMe, onClick: () => setAssignedToMe(true) }),
    ];
  };

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
    const icon = isActiveSection ? <Briefcase size={16} /> : <CheckCircle2 size={16} />;

    return (
      <div className="py-1">
        <ChaSectionShell
          title={title}
          description={description}
          icon={icon}
          accent={isActiveSection ? "blue" : "green"}
          actions={<ChaVisibleRecords visible={data.items.length} total={data.total} tone={isActiveSection ? "blue" : "green"} />}
        >
          <div className="overflow-hidden">
            <DataTable className="rounded-t-none border-x-0 border-b-0 border-t-0 shadow-none">
              <DataTableHeader>
                <tr>
                  <DataTableHead className="py-4">Job Number</DataTableHead>
                  <DataTableHead className="py-4">Job Title</DataTableHead>
                  <DataTableHead className="py-4">Customer</DataTableHead>
                  <DataTableHead className="py-4">Job Type</DataTableHead>
                  <DataTableHead className="py-4">BOE / SB Number</DataTableHead>
                  <DataTableHead className="py-4">Created On</DataTableHead>
                  <DataTableHead className="py-4">Current Stage</DataTableHead>
                  <DataTableHead className="py-4">Priority</DataTableHead>
                  <DataTableHead className="py-4">Owner</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {data.items.length === 0 ? (
                  <DataTableEmpty
                    colSpan={9}
                    message={
                      <div className="flex flex-col items-center justify-center p-14 text-center mnx-text-muted">
                        <div className="mnx-icon-badge mb-4">
                          <Briefcase size={32} />
                        </div>
                        <p className="text-sm mnx-text-primary">{emptyTitle}</p>
                        <p className="mt-1 text-xs">{emptyText}</p>
                      </div>
                    }
                  />
                ) : (
                  data.items.map((job) => (
                    <ClickableRow key={job.id} href={`/cha/jobs/${job.id}`}>
                      <DataTableCell className="py-5 mnx-text-primary">
                        <div className="flex items-center gap-2">
                          <span>{job.jobNumber}</span>
                          <ChaDueDateWarningsIndicator warnings={job.dueDateWarnings} />
                          {job.filingQueryWarning ? (
                            <JobFilingQueryWarningIndicator jobId={job.id} warning={job.filingQueryWarning} />
                          ) : null}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="py-5">
                        <div className="min-w-0">
                          <p className="truncate mnx-text-primary">{job.title}</p>
                          <p className="mt-1 truncate text-xs mnx-text-muted">{job.branchName}</p>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="py-5">{job.customerName}</DataTableCell>
                      <DataTableCell className="py-5 mnx-label">{job.jobTypeName}</DataTableCell>
                      <DataTableCell className="py-5 mnx-numeric mnx-text-muted">
                        {getFilingReference(job) || "Pending"}
                      </DataTableCell>
                      <DataTableCell className="py-5 mnx-text-muted">
                        {formatJobDate(job.createdAt)}
                      </DataTableCell>
                      <DataTableCell className="py-5">
                        <Badge variant={getChaStageBadgeVariant(job.stage)} className="uppercase">
                          {formatChaStageShortLabel(job.stage)}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="py-5">
                        <Badge variant={getChaPriorityBadgeVariant(job.priority)} className="uppercase">
                          {job.priority}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="py-5 mnx-text-muted">{job.ownerName}</DataTableCell>
                    </ClickableRow>
                  ))
                )}
              </DataTableBody>
              {data.totalPages > 1 ? (
                <DataTableFooter>
                  <span className="text-xs mnx-text-muted">
                    Page <span className="mnx-text-primary">{data.page}</span> of{" "}
                    <span className="mnx-text-primary">{data.totalPages}</span> ({data.total} jobs)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page === 1}
                      onClick={() => handlePageChange(tableKey, data.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page === data.totalPages}
                      onClick={() => handlePageChange(tableKey, data.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </DataTableFooter>
              ) : null}
            </DataTable>
          </div>
        </ChaSectionShell>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <ChaPageHeader
        eyebrow={null}
        title="Jobs"
        description="Run the CHA operations queue from one place with faster search, filter, and handoff control."
        icon={<Briefcase size={20} />}
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

      <ChaControlPanel
        title="Job Command Center"
        description="Search, narrow, and launch the next customs job without losing context."
        icon={<Search size={16} />}
        actions={
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
            <div className="relative w-full lg:w-[360px]">
              <span className="absolute inset-y-0 left-4 flex items-center mnx-text-muted">
                <Search size={16} />
              </span>
              <Input
                type="text"
                placeholder="Search job #, customer, reference, or title..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applyFilters();
                  }
                }}
                className="h-11 w-full pl-11 pr-4 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterMenu
                open={isFilterPanelOpen}
                onOpenChange={setIsFilterPanelOpen}
                activeCount={activeFilterCount}
                title="Filters"
                ariaLabel="Open filters"
                contentClassName="w-[min(460px,calc(100vw-2rem))] max-h-[62vh] overflow-y-auto"
              >
                <div className="overflow-hidden mnx-bg-surface">
                  <div className="grid min-h-[240px] grid-cols-1 sm:grid-cols-[156px_minmax(0,1fr)]">
                    <div className="border-b mnx-border mnx-bg-soft sm:border-b-0 sm:border-r">
                      {filterTypes.map((item) => (
                        <Button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveFilterType(item.key)}
                          className={cn(
                            "mnx-plain mnx-menu-option gap-2",
                            activeFilterType === item.key && "mnx-menu-option-active",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="mnx-label block truncate mnx-text-primary">{item.label}</span>
                            <span className="mt-1 block truncate text-xs mnx-text-muted">{item.value}</span>
                          </span>
                          {item.active ? <span className="mnx-state-dot" /> : null}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-0 p-0">
                      {renderFilterOptions()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t mnx-border mnx-bg-surface p-3">
                  <Button variant="outline" onClick={resetFilters} className="flex-1">
                    Reset
                  </Button>
                  <Button onClick={applyFilters} className="flex-1">
                    Apply Filters
                  </Button>
                </div>
              </FilterMenu>

              <Button
                onClick={applyFilters}
                variant="outline"
                className="h-11 px-5"
              >
                Apply Search
              </Button>
              {canCreateJob ? (
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="h-11 px-5"
                >
                  <Plus className="size-4" /> Create Job
                </Button>
              ) : null}
            </div>
          </div>
        }
      >
        {activePills.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {activePills.map((pill) => (
              <Button
                key={pill.key}
                type="button"
                onClick={() => removeFilter(pill.key)}
                className="mnx-plain mnx-badge"
              >
                {pill.label} x
              </Button>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="h-7 text-[10px] rounded-full">
              Clear All
            </Button>
          </div>
        ) : null}
      </ChaControlPanel>

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

      {canCreateJob ? (
        <CreateJobDialog
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          options={options}
          currentUserId={currentUserId}
        />
      ) : null}
      <CreateJobPermissionGuard open={showCreatePermissionDenied} fallbackHref="/cha/jobs" />
    </div>
  );
}
