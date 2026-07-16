"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, CheckCircle2, ChevronRight, Filter, MoreVertical, Plus, Search, Users } from "lucide-react";
import { CreateJobDialog } from "@/components/cha/create-job-dialog";
import { ClickableRow } from "@/components/clickable-row";
import {DataTable,DataTableBody,DataTableCell,DataTableEmpty,DataTableFooter,DataTableHead,DataTableHeader,} from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { FilterMenu } from "@/components/ui/filter-menu";
import { JobFilingQueryWarningIndicator } from "@/app/(dashboard)/cha/_components/job-filing-query-warning-indicator";
import {
  ChaDueDateWarningsIndicator,
} from "@/app/(dashboard)/cha/_components/cha-due-date-warnings-indicator";
import type { DueDateWarningViewModel } from "@/app/(dashboard)/cha/_components/cha-due-date-warning-indicator";
import {
  formatChaBadgeLabel,
  getChaPriorityBadgeVariant,
  getChaStageBadgeVariant,
} from "@/lib/cha-badges";
import { ChaMetricCard, ChaSectionShell, ChaVisibleRecords } from "../_components/cha-operations-shared";

type MovementDirection = "IMPORT" | "EXPORT" | "BOTH" | "OTHER" | null;

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

export function JobsClient({
  activeJobsData,
  completedJobsData,
  filters,
  options,
  showCreateNew,
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
  const [isModalOpen, setIsModalOpen] = useState(showCreateNew);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

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
      accent: "cyan" as const,
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
      accent: "cyan" as const,
    },
  ];

  const activePills = [
    search ? { key: "search" as const, label: `Search: ${search}` } : null,
    stage ? { key: "stage" as const, label: `Stage: ${formatChaBadgeLabel(stage)}` } : null,
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
    const badgeText = isActiveSection ? "Operational Queue" : "Filed Archive";

    return (
    <div className="py-1">
      <ChaSectionShell
        title={title}
        description={description}
        icon={icon}
        badge={badgeText}
        count={data.total}
        actions={<ChaVisibleRecords visible={data.items.length} total={data.total} tone={isActiveSection ? "cyan" : "green"} />}
      >
        <div className="overflow-hidden rounded-b-[30px]">
        <DataTable className="w-full">
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
            <DataTableHead className="py-4 text-right">Actions</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {data.items.length === 0 ? (
            <DataTableEmpty
              colSpan={10}
              message={
                <div className="flex flex-col items-center justify-center p-14 text-center text-on-surface-variant">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] border border-outline-variant/25 bg-surface-container-low shadow-[0_22px_48px_-34px_rgba(15,23,42,0.3)]">
                    <Briefcase size={32} className="text-outline-variant" />
                  </div>
                  <p className="text-sm text-on-surface">{emptyTitle}</p>
                  <p className="mt-1 text-xs">{emptyText}</p>
                </div>
              }
            />
          ) : (
            data.items.map((job) => (
              <ClickableRow key={job.id} href={`/cha/jobs/${job.id}`}>
                <DataTableCell className="py-5 font-medium text-[#00cec4]">
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
                    <p className="truncate text-on-surface">{job.title}</p>
                    <p className="mt-1 truncate text-xs text-on-surface-variant">{job.branchName}</p>
                  </div>
                </DataTableCell>
                <DataTableCell className="py-5">{job.customerName}</DataTableCell>
                <DataTableCell className="py-5 ds-label">{job.jobTypeName}</DataTableCell>
                <DataTableCell className="py-5 ds-numeric text-on-surface-variant">
                  {getFilingReference(job) || "Pending"}
                </DataTableCell>
                <DataTableCell className="py-5 text-on-surface-variant">
                  {formatJobDate(job.createdAt)}
                </DataTableCell>
                <DataTableCell className="py-5">
                  <Badge variant={getChaStageBadgeVariant(job.stage)} className="uppercase">
                    {formatChaBadgeLabel(job.stage)}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="py-5">
                  <Badge
                    variant={getChaPriorityBadgeVariant(job.priority)}
                    className="uppercase"
                  >
                    {job.priority}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="py-5 text-on-surface-variant">{job.ownerName}</DataTableCell>
                <DataTableCell className="py-5 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    mode="icon"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      router.push(`/cha/jobs/${job.id}`);
                    }}
                    aria-label={`Open ${job.jobNumber}`}
                  >
                    <MoreVertical size={14} />
                  </Button>
                </DataTableCell>
              </ClickableRow>
            ))
          )}
        </DataTableBody>
        {data.totalPages > 1 ? (
          <DataTableFooter>
            <span className="text-xs text-on-surface-variant">
              Page <span className="text-on-surface">{data.page}</span> of{" "}
              <span className="text-on-surface">{data.totalPages}</span> ({data.total} jobs)
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
      <section className="rounded-[26px] border border-outline-variant/35 bg-surface px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span>CHA</span>
              <ChevronRight size={14} />
              <span>Jobs</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="ds-icon-badge">
                <Briefcase size={16} />
              </span>
              <h1 className="ds-h1 text-on-surface">Jobs</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" mode="icon" onClick={() => setIsFilterPanelOpen((current) => !current)} aria-label="Toggle filters">
              <Filter size={16} />
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-4">
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
      </div>

      <div className="relative overflow-hidden rounded-[30px] border border-outline-variant/40 bg-surface shadow-[0_28px_72px_-48px_rgba(15,23,42,0.28)]">
        <div className="pointer-events-none absolute left-6 top-0 h-20 w-40 rounded-full bg-[#00cec4]/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-20 w-32 rounded-full bg-[#fb923c]/[0.08] blur-3xl" />
        <div className="relative grid gap-5 p-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="ds-icon-badge">
                <Search size={16} />
              </span>
              <div className="space-y-1">
                <h2 className="ds-h2 text-on-surface">Job Command Center</h2>
                <p className="text-sm text-on-surface-variant">
                  Search, narrow, and launch the next customs job without losing context.
                </p>
              </div>
            </div>

            <div className="relative min-w-0">
              <span className="absolute inset-y-0 left-4 flex items-center text-on-surface-variant">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search job #, customer, reference, or title..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applyFilters();
                  }
                }}
                className="h-14 w-full rounded-[20px] border border-outline-variant/25 bg-surface-container-low/70 pl-11 pr-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_16px_40px_-34px_rgba(15,23,42,0.3)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activePills.length > 0 ? (
                <>
                  {activePills.map((pill) => (
                    <button
                      key={pill.key}
                      type="button"
                      onClick={() => removeFilter(pill.key)}
                      className="rounded-full border border-[#00cec4]/25 bg-[#00cec4]/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#00cec4] transition hover:bg-[#00cec4]/16"
                    >
                      {pill.label} ×
                    </button>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                    Clear All
                  </Button>
                </>
              ) : (
                <span className="rounded-full border border-outline-variant/25 bg-surface-container-low px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-on-surface-variant">
                  No active filters
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-[24px] border border-outline-variant/25 bg-surface-container-low/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
            <div className="space-y-2">
              <p className="ds-label">Live Controls</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-outline-variant/20 bg-surface px-4 py-3 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.28)]">
                  <p className="ds-label">Queues</p>
                  <p className="ds-numeric text-lg text-on-surface">
                    {activeJobsData.total + completedJobsData.total}
                  </p>
                  <p className="text-xs text-on-surface-variant">Visible jobs across both sections</p>
                </div>
                <div className="rounded-[20px] border border-outline-variant/20 bg-surface px-4 py-3 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.28)]">
                  <p className="ds-label">Focus</p>
                  <p className="text-lg font-semibold text-on-surface">
                    {assignedToMe ? "My Queue" : "Shared Queue"}
                  </p>
                  <p className="text-xs text-on-surface-variant">{assignedViewNote}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
            <FilterMenu
              open={isFilterPanelOpen}
              onOpenChange={setIsFilterPanelOpen}
              activeCount={activeFilterCount}
              title="Filters"
              ariaLabel="Open filters"
              contentClassName="w-[320px] max-h-[70vh] overflow-y-auto"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="ds-label block">Workflow Stage</label>
                  <DropdownSelect
                    value={stage}
                    onValueChange={setStage}
                    placeholder="All Workflow Stages"
                    options={[
                      { value: "", label: "All Workflow Stages" },
                      { value: "DOCUMENT_COLLECTION", label: "Document Collection" },
                      { value: "ADDITIONAL_DATA", label: "Additional Data" },
                      { value: "CHECKLIST_PREPARATION", label: "Checklist Prep" },
                      { value: "CHECKLIST_APPROVAL", label: "Checklist Approval" },
                      { value: "FILING", label: "Filing Stage" },
                      { value: "FILED", label: "Filed / Completed" },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="ds-label block">Status</label>
                  <DropdownSelect
                    value={status}
                    onValueChange={setStatus}
                    placeholder="All Statuses"
                    options={[
                      { value: "", label: "All Statuses" },
                      { value: "ACTIVE", label: "Active" },
                      { value: "HOLD", label: "Hold" },
                      { value: "CANCELLED", label: "Cancelled" },
                      { value: "COMPLETED", label: "Completed" },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="ds-label block">Priority</label>
                  <DropdownSelect
                    value={priority}
                    onValueChange={setPriority}
                    placeholder="All Priorities"
                    options={[
                      { value: "", label: "All Priorities" },
                      { value: "LOW", label: "Low" },
                      { value: "MEDIUM", label: "Medium" },
                      { value: "HIGH", label: "High" },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="ds-label block">Branch</label>
                  <DropdownSelect
                    value={branchId}
                    onValueChange={setBranchId}
                    placeholder="All Branches"
                    options={[
                      { value: "", label: "All Branches" },
                      ...options.branches.map((branch) => ({
                        value: branch.id,
                        label: branch.name,
                      })),
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="ds-label block">Job Type</label>
                  <DropdownSelect
                    value={jobTypeId}
                    onValueChange={setJobTypeId}
                    placeholder="All Job Types"
                    options={[
                      { value: "", label: "All Job Types" },
                      ...options.jobTypes.map((jobType) => ({
                        value: jobType.id,
                        label: jobType.name,
                      })),
                    ]}
                  />
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-outline-variant/30 px-4 py-3 text-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={assignedToMe}
                    onChange={(event) => setAssignedToMe(event.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Assigned to me
                </label>

                <div className="flex items-center justify-between gap-3 border-t border-outline-variant/20 pt-4">
                  <Button variant="outline" onClick={resetFilters} className="flex-1">
                    Reset
                  </Button>
                  <Button onClick={applyFilters} className="flex-1">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </FilterMenu>
              <Button
                onClick={applyFilters}
                variant="outline"
                className="rounded-2xl px-5"
              >
                Apply Search
              </Button>
              <Button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-5">
                <Plus className="size-4" /> Create Job
              </Button>
            </div>
          </div>
        </div>
      </div>

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

      <CreateJobDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        options={options}
        currentUserId={currentUserId}
      />
    </div>
  );
}
