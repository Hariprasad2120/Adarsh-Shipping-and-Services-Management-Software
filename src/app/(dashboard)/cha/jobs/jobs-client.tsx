"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, Filter, MoreHorizontal, Plane, Plus, Search, Ship, Users } from "lucide-react";
import { CreateJobPermissionGuard } from "@/modules/cha/components/create-job-permission-guard";

const CreateJobDialog = dynamic(
  () => import("@/modules/cha/components/create-job-dialog").then((module) => module.CreateJobDialog),
  { ssr: false },
);
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
import { Button } from "@/components/ui/button";
import { NeonCheckbox } from "@/components/ui/neon-checkbox";
import { ChaFilterMenu as FilterMenu } from "@/modules/cha/components/workspace/cha-workspace";
import { WorkspaceInput, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { JobFilingQueryWarningIndicator } from "@/modules/cha/components/warnings/job-filing-query-warning-indicator";
import { ChaDueDateWarningsIndicator } from "@/modules/cha/components/warnings/cha-due-date-warnings-indicator";
import type { DueDateWarningViewModel } from "@/modules/cha/components/warnings/cha-due-date-warning-indicator";
import { formatChaBadgeLabel } from "@/lib/cha-badges";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
  initialCreateOptions: JobsClientProps["options"] | null;
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

export function JobsClient({
  activeJobsData,
  completedJobsData,
  filters,
  options,
  initialCreateOptions,
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
  const [createOptions, setCreateOptions] =
    useState<JobsClientProps["options"] | null>(initialCreateOptions);
  const [createOptionsLoading, setCreateOptionsLoading] = useState(false);
  const createOptionsRequestRef = useRef(false);
  const [openFilterTable, setOpenFilterTable] = useState<"active" | "completed" | null>(null);
  const [activeFilterType, setActiveFilterType] = useState<FilterPanelKey>("stage");

  const loadCreateOptions = useCallback(async () => {
    if (createOptions || createOptionsRequestRef.current) return;
    createOptionsRequestRef.current = true;
    await Promise.resolve();
    setCreateOptionsLoading(true);
    try {
      const response = await fetch("/api/cha/jobs/create-options", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to load create-job options.");
      setCreateOptions((await response.json()) as JobsClientProps["options"]);
    } catch (error) {
      setIsModalOpen(false);
      toast.error(
        error instanceof Error ? error.message : "Unable to load create-job options.",
      );
    } finally {
      createOptionsRequestRef.current = false;
      setCreateOptionsLoading(false);
    }
  }, [createOptions]);

  useEffect(() => {
    if (!isModalOpen || !canCreateJob) return;
    queueMicrotask(() => void loadCreateOptions());
  }, [canCreateJob, isModalOpen, loadCreateOptions]);

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
    setOpenFilterTable(null);
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
    setOpenFilterTable(null);
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
        {canCreateJob ? (
          <Button
            type="button"
            size="sm"
            disabled={createOptionsLoading}
            onClick={() => {
              setIsModalOpen(true);
              void loadCreateOptions();
            }}
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
                  <OperationalTableHead />
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

      {canCreateJob && createOptions ? (
        <CreateJobDialog
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          options={createOptions}
          currentUserId={currentUserId}
        />
      ) : null}
      <CreateJobPermissionGuard open={showCreatePermissionDenied} fallbackHref="/cha/jobs" />
    </div>
  );
}
