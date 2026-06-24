"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Plus,
  Briefcase,
  X,
  Shield,
  FilePlus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateJobDialog } from "@/components/cha/create-job-dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-table";
import { ClickableRow } from "@/components/clickable-row";

interface JobItem {
  id: string;
  jobNumber: string;
  title: string;
  customerName: string;
  jobTypeName: string;
  branchName: string;
  stage: string;
  status: string;
  priority: string;
  primaryOwnerId: string;
  ownerName: string;
  assignedUserIds: string[];
  hasActiveDeletionRequest: boolean;
  createdAt: string;
}

interface JobsClientProps {
  jobsData: {
    items: JobItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
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
    teamGroups: { id: string; name: string; memberIds: any }[];
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

export function JobsClient({
  jobsData,
  filters,
  options,
  showCreateNew,
  currentUserId,
}: JobsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter States
  const [search, setSearch] = useState(filters.search || "");
  const [stage, setStage] = useState(filters.stage || "");
  const [status, setStatus] = useState(filters.status || "ACTIVE");
  const [priority, setPriority] = useState(filters.priority || "");
  const [branchId, setBranchId] = useState(filters.branchId || "");
  const [jobTypeId, setJobTypeId] = useState(filters.jobTypeId || "");
  const [assignedToMe, setAssignedToMe] = useState(filters.assignedToMe || false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(showCreateNew);

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stage) params.set("stage", stage);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (branchId) params.set("branchId", branchId);
    if (jobTypeId) params.set("jobTypeId", jobTypeId);
    if (assignedToMe) params.set("assignedToMe", "true");
    params.set("page", "1");
    router.push(`/cha/jobs?${params.toString()}`);
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/cha/jobs?${params.toString()}`);
  };

  const resetFilters = () => {
    setSearch("");
    setStage("");
    setStatus("ACTIVE");
    setPriority("");
    setBranchId("");
    setJobTypeId("");
    setAssignedToMe(false);
    router.push("/cha/jobs");
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/30 pb-4 gap-4">
        <div>
          <h1 className="ds-h1 text-[#00cec4]">Clearance Jobs Catalog</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Access active import and export custom jobs, check milestones, and coordinate workflows.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <Plus className="size-4" /> Create Job
        </Button>
      </div>

      {/* Filter panel */}
      <div className="bg-surface border border-outline-variant/30 p-5 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-[#00cec4]">
          <Filter size={16} />
          <span className="ds-label tracking-wider font-semibold">Search & Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search job #, client, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10 pr-4 w-full text-sm font-sans"
            />
          </div>

          <DropdownSelect
            value={stage}
            onValueChange={setStage}
            placeholder="All Workflow Stages"
            options={[
              { value: "DOCUMENT_COLLECTION", label: "Document Collection" },
              { value: "CHECKLIST_PREPARATION", label: "Checklist Prep" },
              { value: "CHECKLIST_APPROVAL", label: "Checklist Approval" },
              { value: "FILING", label: "Filing Stage" },
              { value: "FILED", label: "Completed / Filed" },
            ]}
          />

          <DropdownSelect
            value={status}
            onValueChange={setStatus}
            placeholder="All Statuses"
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "HOLD", label: "Hold" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
          />

          <DropdownSelect
            value={priority}
            onValueChange={setPriority}
            placeholder="All Priorities"
            options={[
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
            ]}
          />

          <DropdownSelect
            value={branchId}
            onValueChange={setBranchId}
            placeholder="All Branches"
            options={options.branches.map((b) => ({
              value: b.id,
              label: b.name,
            }))}
          />

          <DropdownSelect
            value={jobTypeId}
            onValueChange={setJobTypeId}
            placeholder="All Job Types"
            options={options.jobTypes.map((jt) => ({
              value: jt.id,
              label: jt.name,
            }))}
          />

          <label className="flex items-center space-x-2 cursor-pointer p-2 rounded border border-outline-variant/30 hover:bg-surface-container-low">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(e) => setAssignedToMe(e.target.checked)}
              className="w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
            />
            <span className="text-xs font-medium">Assigned to Me</span>
          </label>

          <div className="flex gap-2">
            <Button onClick={applyFilters} className="flex-1 text-xs">
              Apply Filters
            </Button>
            <Button variant="outline" onClick={resetFilters} className="flex-1 text-xs">
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Datatable */}
      <DataTable>
        <DataTableHeader>
          <tr>
            <DataTableHead>Job Number</DataTableHead>
            <DataTableHead>Job Title</DataTableHead>
            <DataTableHead>Customer</DataTableHead>
            <DataTableHead>Job Type</DataTableHead>
            <DataTableHead>Current Stage</DataTableHead>
            <DataTableHead>Priority</DataTableHead>
            <DataTableHead>Owner</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {jobsData.items.length === 0 ? (
            <DataTableEmpty
              colSpan={7}
              message={
                <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant">
                  <Briefcase size={48} className="text-outline-variant mb-3" />
                  <p className="text-sm font-semibold">No clearance jobs found matching filters.</p>
                  <p className="text-xs mt-1">Adjust search parameters or initialize a new job.</p>
                </div>
              }
            />
          ) : (
            jobsData.items.map((job) => (
              <ClickableRow
                key={job.id}
                href={`/cha/jobs/${job.id}`}
              >
                <DataTableCell className="font-medium text-[#00cec4]">{job.jobNumber}</DataTableCell>
                <DataTableCell>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-on-surface">{job.title}</p>
                    <p className="truncate text-xs text-on-surface-variant">{job.branchName}</p>
                  </div>
                </DataTableCell>
                <DataTableCell>{job.customerName}</DataTableCell>
                <DataTableCell className="ds-label">{job.jobTypeName}</DataTableCell>
                <DataTableCell>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    job.stage === "FILING"
                      ? "border border-blue-200 bg-blue-50 text-blue-700"
                      : job.stage === "CHECKLIST_APPROVAL"
                      ? "border border-amber-200 bg-amber-50 text-amber-700"
                      : job.stage === "FILED"
                      ? "border border-green-200 bg-green-50 text-green-700"
                      : "border border-outline-variant bg-surface-container-low text-on-surface"
                  }`}>
                    {job.stage.replace(/_/g, " ")}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <span className={`text-xs font-semibold uppercase tracking-[0.12em] ${
                    job.priority === "HIGH"
                      ? "text-red-500"
                      : job.priority === "MEDIUM"
                        ? "text-[#fb923c]"
                        : "text-on-surface-variant"
                  }`}>
                    {job.priority}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-on-surface-variant">{job.ownerName}</DataTableCell>
              </ClickableRow>
            ))
          )}
        </DataTableBody>

        {/* Pagination */}
        {jobsData.totalPages > 1 && (
          <tfoot>
            <tr>
              <td colSpan={7} className="p-0">
                <div className="flex items-center justify-between border-t border-outline-variant/30 px-6 py-4">
                  <span className="text-xs text-on-surface-variant">
                    Showing Page <strong className="text-on-surface">{jobsData.page}</strong> of{" "}
                    <strong className="text-on-surface">{jobsData.totalPages}</strong> ({jobsData.total} items)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={jobsData.page === 1}
                      onClick={() => handlePageChange(jobsData.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={jobsData.page === jobsData.totalPages}
                      onClick={() => handlePageChange(jobsData.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        )}
      </DataTable>

      <CreateJobDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        options={options}
        currentUserId={currentUserId}
      />
    </div>
  );
}
