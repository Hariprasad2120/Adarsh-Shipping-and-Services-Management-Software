"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Plus, Search } from "lucide-react";
import { CreateJobDialog } from "@/components/cha/create-job-dialog";
import { ClickableRow } from "@/components/clickable-row";
import {DataTable,DataTableBody,DataTableCell,DataTableEmpty,DataTableFooter,DataTableHead,DataTableHeader,} from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { FilterMenu } from "@/components/ui/filter-menu";
import { JobFilingQueryWarningIndicator } from "@/app/(dashboard)/cha/_components/job-filing-query-warning-indicator";
import {
  ChaDueDateWarningIndicator,
  type DueDateWarningViewModel,
} from "@/app/(dashboard)/cha/_components/cha-due-date-warning-indicator";
import {
  formatChaBadgeLabel,
  getChaPriorityBadgeVariant,
  getChaStageBadgeVariant,
} from "@/lib/cha-badges";

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

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stage) params.set("stage", stage);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (branchId) params.set("branchId", branchId);
    if (jobTypeId) params.set("jobTypeId", jobTypeId);
    if (assignedToMe) params.set("assignedToMe", "true");
    params.set("activePage", "1");
    params.set("completedPage", "1");
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
  }) => (
    <section className="space-y-5 py-2">
      <div className="space-y-2">
        <h2 className="ds-h2 text-on-surface">{title}</h2>
        <p className="text-sm text-on-surface-variant">{description}</p>
      </div>

      <DataTable>
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
                <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant">
                  <Briefcase size={48} className="mb-3 text-outline-variant" />
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
                    {job.dueDateWarnings.map((warning) => (
                      <ChaDueDateWarningIndicator
                        key={warning.notificationId}
                        warning={warning}
                      />
                    ))}
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
    </section>
  );

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search job #, customer, or title..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyFilters();
                }
              }}
              className="h-11 w-full pl-10 pr-4 text-sm"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
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
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 whitespace-nowrap">
              <Plus className="size-4" /> Create Job
            </Button>
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
