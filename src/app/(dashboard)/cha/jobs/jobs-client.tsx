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
import { createJobAction } from "@/modules/cha/actions";
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
    users: { id: string; name: string; email: string }[];
    teamGroups: { id: string; name: string; memberIds: any }[];
    settings?: {
      jobNumberPrefix: string;
      jobNumberNextNum: number;
    };
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

  // Form State
  const [newJobNumber, setNewJobNumber] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newCustomerRef, setNewCustomerRef] = useState("");
  const [newJobTypeId, setNewJobTypeId] = useState("");
  const [newBranchId, setNewBranchId] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newOwnerId, setNewOwnerId] = useState(currentUserId);
  const [newRemarks, setNewRemarks] = useState("");
  const [assignments, setAssignments] = useState<{ userId: string; responsibility: string }[]>([
    { userId: currentUserId, responsibility: "OPERATIONS" },
  ]);
  const [estimatedClosureDate, setEstimatedClosureDate] = useState("");

  // Autocomplete States
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [teamSearch, setTeamSearch] = useState("");
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);

  // 3D Success Animation state
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Loading States
  const [creating, setCreating] = useState(false);

  // Restore draft on mount if new=true is present
  useEffect(() => {
    const isNew = searchParams.get("new") === "true";
    if (isNew) {
      setIsModalOpen(true);
      const draft = localStorage.getItem("cha_draft_job");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setNewJobNumber(parsed.jobNumber || "");
          setNewTitle(parsed.title || "");
          setNewCustomerId(parsed.customerId || "");
          setNewCustomerRef(parsed.customerRef || "");
          setNewJobTypeId(parsed.jobTypeId || "");
          setNewBranchId(parsed.branchId || "");
          setNewPriority(parsed.priority || "MEDIUM");
          setNewOwnerId(parsed.ownerId || currentUserId);
          setNewRemarks(parsed.remarks || "");
          setAssignments(parsed.assignments || [{ userId: currentUserId, responsibility: "OPERATIONS" }]);
          setEstimatedClosureDate(parsed.estimatedClosureDate || "");
          if (parsed.customerId) {
            const cust = options.customers.find((c) => c.id === parsed.customerId);
            if (cust) {
              setCustomerSearch(cust.name);
              setSelectedCustomerName(cust.name);
            }
          }
        } catch (e) {
          console.error("Failed to parse draft job", e);
        } finally {
          localStorage.removeItem("cha_draft_job");
        }
      }
    }
  }, [searchParams, options.customers, currentUserId]);

  const saveDraft = () => {
    const draft = {
      jobNumber: newJobNumber,
      title: newTitle,
      customerId: newCustomerId,
      customerRef: newCustomerRef,
      jobTypeId: newJobTypeId,
      branchId: newBranchId,
      priority: newPriority,
      ownerId: newOwnerId,
      remarks: newRemarks,
      assignments,
      estimatedClosureDate,
    };
    localStorage.setItem("cha_draft_job", JSON.stringify(draft));
  };

  const filteredCustomers = customerSearch.trim() === ""
    ? options.customers
    : options.customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase())
      );

  const parseJsonArray = (value: any): string[] => {
    if (!value) return [];
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) {
      return value as string[];
    }
    return [];
  };

  const filteredTeamUsers = teamSearch.trim() === ""
    ? options.users
    : options.users.filter((u) =>
        u.name.toLowerCase().includes(teamSearch.toLowerCase())
      );

  const filteredTeamGroups = teamSearch.trim() === ""
    ? (options.teamGroups || [])
    : (options.teamGroups || []).filter((g) =>
        g.name.toLowerCase().includes(teamSearch.toLowerCase())
      );

  const handleAddTeamUser = (u: { id: string; name: string }) => {
    if (assignments.some((a) => a.userId === u.id)) {
      toast.error(`${u.name} is already assigned.`);
      return;
    }
    setAssignments([...assignments, { userId: u.id, responsibility: "OPERATIONS" }]);
    setTeamSearch("");
    setShowTeamDropdown(false);
  };

  const handleAddTeamGroup = (group: { id: string; name: string; memberIds: any }) => {
    const memberIds = parseJsonArray(group.memberIds);
    if (memberIds.length === 0) {
      toast.error(`Team group '${group.name}' has no members.`);
      return;
    }

    const newAssignments = [...assignments];
    let addedCount = 0;

    memberIds.forEach((id) => {
      if (!newAssignments.some((a) => a.userId === id)) {
        newAssignments.push({ userId: id, responsibility: "OPERATIONS" });
        addedCount++;
      }
    });

    if (addedCount === 0) {
      toast.info(`All members of '${group.name}' are already assigned.`);
    } else {
      setAssignments(newAssignments);
      toast.success(`Added ${addedCount} members from group '${group.name}'.`);
    }

    setTeamSearch("");
    setShowTeamDropdown(false);
  };

  // Auto-generate Job Number helper
  const handleAutoGenerateJobNumber = () => {
    const prefix = options.settings?.jobNumberPrefix || "CHA";
    const nextNum = options.settings?.jobNumberNextNum || 1;
    const paddedNum = String(nextNum).padStart(4, "0");
    setNewJobNumber(`${prefix}-${paddedNum}`);
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleAssignmentChange = (index: number, field: "userId" | "responsibility", value: string) => {
    setAssignments(
      assignments.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

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

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCustomerId || !newJobTypeId || !newBranchId || !estimatedClosureDate) {
      toast.error("Please fill in all mandatory job attributes.");
      return;
    }

    const validAssignments = assignments.filter((a) => a.userId.trim() !== "");

    setCreating(true);
    try {
      const res = await createJobAction({
        jobNumber: newJobNumber || undefined,
        title: newTitle,
        customerId: newCustomerId,
        customerRef: newCustomerRef || undefined,
        jobTypeId: newJobTypeId,
        branchId: newBranchId,
        priority: newPriority,
        primaryOwnerId: newOwnerId,
        assignments: validAssignments,
        remarks: newRemarks || undefined,
        estimatedClosureDate: estimatedClosureDate ? new Date(estimatedClosureDate) : undefined,
      });

      if (res.ok) {
        setShowSuccessAnimation(true);
        setTimeout(() => {
          setShowSuccessAnimation(false);
          setIsModalOpen(false);
          // Clear fields
          setNewJobNumber("");
          setNewTitle("");
          setNewCustomerId("");
          setNewCustomerRef("");
          setNewJobTypeId("");
          setNewBranchId("");
          setNewRemarks("");
          setEstimatedClosureDate("");
          setCustomerSearch("");
          setSelectedCustomerName("");
          setAssignments([{ userId: currentUserId, responsibility: "OPERATIONS" }]);
          router.refresh();
        }, 3000);
      } else {
        toast.error(res.error || "Failed to create job.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="ds-h1 text-[#00cec4]">Clearance Jobs Catalog</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Access active import and export custom jobs, check milestones, and coordinate workflows.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus size={16} /> New Clearance Job
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
              className="pl-10 w-full text-sm font-sans"
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
        {jobsData.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant">
            <Briefcase size={48} className="text-outline-variant mb-3" />
            <p className="text-sm font-semibold">No clearance jobs found matching filters.</p>
            <p className="text-xs mt-1">Adjust search parameters or initialize a new job.</p>
          </div>
        ) : (
          <>
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
              {jobsData.items.map((job) => (
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
              ))}
            </DataTableBody>

            {/* Pagination */}
            {jobsData.totalPages > 1 && (
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
            )}
          </>
        )}
      </DataTable>

      {/* New Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[var(--color-surface)] border border-outline-variant/50 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-surface-container-low px-6 py-4.5 border-b border-outline-variant/30">
              <h2 className="ds-h2 text-on-surface flex items-center gap-2 m-0 border-0 pb-0">
                <FilePlus className="text-[#00cec4]" size={20} /> Initialize Customs Clearance Job
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer bg-transparent border-0">
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateJob} className="p-7 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Branch Selection */}
                <div className="space-y-1">
                  <label className="ds-label block">Customs Branch Office *</label>
                  <DropdownSelect
                    required
                    value={newBranchId}
                    onValueChange={setNewBranchId}
                    placeholder="Choose Branch Location"
                    options={options.branches.map((b) => ({
                      value: b.id,
                      label: `${b.name} (${b.code})`,
                    }))}
                  />
                </div>

                {/* Job Number */}
                <div className="space-y-1">
                  <label className="ds-label block">Job Ref Number (Leave empty to Auto-number)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. CHA-MAA-2026-0001"
                      value={newJobNumber}
                      onChange={(e) => setNewJobNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[rgba(0,206,196,0.55)] rounded-xl text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[rgba(14,137,149,0.14)] transition-all font-sans"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoGenerateJobNumber}
                      disabled={!newBranchId}
                      className="text-xs shrink-0 rounded-xl"
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1 md:col-span-2">
                  <label className="ds-label block">Job Scope Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Import Customs Clearance of Electronic Spares"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[rgba(0,206,196,0.55)] rounded-xl text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[rgba(14,137,149,0.14)] transition-all font-sans"
                  />
                </div>

                {/* Customer Account Autocomplete */}
                <div className="space-y-1 relative">
                  <label className="ds-label block">Customer Account *</label>
                  <input
                    type="text"
                    required
                    placeholder="Type starting letters to search..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      if (e.target.value !== selectedCustomerName) {
                        setNewCustomerId("");
                      }
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowCustomerDropdown(false), 250);
                    }}
                    className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[rgba(0,206,196,0.55)] rounded-xl text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[rgba(14,137,149,0.14)] transition-all font-sans"
                  />
                  {showCustomerDropdown && (
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-[var(--color-surface)] border border-outline-variant rounded-xl shadow-lg z-50">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setNewCustomerId(c.id);
                            setCustomerSearch(c.name);
                            setSelectedCustomerName(c.name);
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-sm text-[var(--color-on-surface)] transition-all border-b border-outline-variant/10 cursor-pointer bg-transparent border-0"
                        >
                          {c.name}
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <div className="p-3 text-xs text-on-surface-variant italic flex flex-col items-center gap-2">
                          <span>No matching customer found.</span>
                          <button
                            type="button"
                            onClick={() => {
                              saveDraft();
                              router.push(`/crm/customers/new?redirect_to=/cha/jobs?new=true`);
                            }}
                            className="text-xs font-bold text-[#00cec4] hover:underline cursor-pointer bg-transparent border-0"
                          >
                            + Add "{customerSearch}" as New Customer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Customer Ref */}
                <div className="space-y-1">
                  <label className="ds-label block">Customer Ref PO/WO (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-88712"
                    value={newCustomerRef}
                    onChange={(e) => setNewCustomerRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[rgba(0,206,196,0.55)] rounded-xl text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[rgba(14,137,149,0.14)] transition-all font-sans"
                  />
                </div>

                {/* Job Type */}
                <div className="space-y-1">
                  <label className="ds-label block">Clearance Job Type *</label>
                  <DropdownSelect
                    required
                    value={newJobTypeId}
                    onValueChange={setNewJobTypeId}
                    placeholder="Select Category"
                    options={options.jobTypes.map((jt) => ({
                      value: jt.id,
                      label: jt.name,
                    }))}
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="ds-label block">Job Priority *</label>
                  <DropdownSelect
                    required
                    value={newPriority}
                    onValueChange={setNewPriority}
                    placeholder="Select Priority"
                    options={[
                      { value: "LOW", label: "LOW" },
                      { value: "MEDIUM", label: "MEDIUM" },
                      { value: "HIGH", label: "HIGH" },
                    ]}
                  />
                </div>

                {/* Owner */}
                <div className="space-y-1">
                  <label className="ds-label block">Primary Operations Owner *</label>
                  <DropdownSelect
                    required
                    value={newOwnerId}
                    onValueChange={setNewOwnerId}
                    placeholder="Select Owner"
                    options={options.users.map((u) => ({
                      value: u.id,
                      label: `${u.name} (${u.email})`,
                    }))}
                  />
                </div>

                {/* Estimated Closure Date */}
                <div className="space-y-1">
                  <label className="ds-label block">Estimated Closure Date (Benchmark) *</label>
                  <input
                    type="date"
                    required
                    value={estimatedClosureDate}
                    onChange={(e) => setEstimatedClosureDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[rgba(0,206,196,0.55)] rounded-xl text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[rgba(14,137,149,0.14)] transition-all font-sans"
                  />
                </div>
              </div>

              {/* Reworked Team Assignments Mapping */}
              <div className="space-y-3 pt-2">
                <div className="border-b border-outline-variant/30 pb-2">
                  <label className="ds-label block">Team Assignments Mapping</label>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Type employee name and press **Enter** (or select from list) to add them.
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type employee or group name here..."
                    value={teamSearch}
                    onChange={(e) => {
                      setTeamSearch(e.target.value);
                      setShowTeamDropdown(true);
                    }}
                    onFocus={() => setShowTeamDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowTeamDropdown(false), 250);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const matchedGroup = filteredTeamGroups.find(
                          (g) => g.name.toLowerCase() === teamSearch.trim().toLowerCase()
                        );
                        if (matchedGroup) {
                          handleAddTeamGroup(matchedGroup);
                        } else {
                          const matchedUser = filteredTeamUsers.find(
                            (u) => u.name.toLowerCase() === teamSearch.trim().toLowerCase()
                          );
                          if (matchedUser) {
                            handleAddTeamUser(matchedUser);
                          } else if (filteredTeamGroups.length > 0) {
                            handleAddTeamGroup(filteredTeamGroups[0]);
                          } else if (filteredTeamUsers.length > 0) {
                            handleAddTeamUser(filteredTeamUsers[0]);
                          }
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[rgba(0,206,196,0.55)] rounded-xl text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[rgba(14,137,149,0.14)] transition-all font-sans"
                  />
                  {showTeamDropdown && teamSearch.trim() !== "" && (
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-[var(--color-surface)] border border-outline-variant rounded-xl shadow-lg z-50 p-2 space-y-2">
                      {filteredTeamGroups.length > 0 && (
                        <div>
                          <div className="text-[10px] ds-label px-2 py-1 border-b border-outline-variant/10 text-on-surface-variant">Team Groups</div>
                          {filteredTeamGroups.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => handleAddTeamGroup(g)}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-xs font-semibold text-[var(--color-on-surface)] transition-all rounded-lg cursor-pointer bg-transparent border-0 flex justify-between items-center"
                            >
                              <span>{g.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-mono">
                                GROUP ({parseJsonArray(g.memberIds).length})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div>
                        {filteredTeamGroups.length > 0 && (
                          <div className="text-[10px] ds-label px-2 py-1 mt-1 border-b border-outline-variant/10 text-on-surface-variant">Individual Employees</div>
                        )}
                        {filteredTeamUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleAddTeamUser(u)}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#00cec4]/15 hover:text-[#00cec4] text-xs text-[var(--color-on-surface)] transition-all rounded-lg cursor-pointer bg-transparent border-0"
                          >
                            {u.name} ({u.email})
                          </button>
                        ))}
                      </div>

                      {filteredTeamUsers.length === 0 && filteredTeamGroups.length === 0 && (
                        <div className="p-3 text-xs text-on-surface-variant italic">No matching results found.</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Display Assigned Team Members as Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {assignments.map((assignment, index) => {
                    const emp = options.users.find((u) => u.id === assignment.userId);
                    return (
                      <div
                        key={assignment.userId || index}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant/40 bg-[var(--color-surface-container-low)] shadow-sm hover:border-[#00cec4] transition-all"
                      >
                        <div className="space-y-1 flex-1 mr-3">
                          <span className="text-xs font-semibold text-on-surface block">
                            {emp?.name || "Unknown Employee"}
                          </span>
                          <DropdownSelect
                            value={assignment.responsibility}
                            onValueChange={(val) => handleAssignmentChange(index, "responsibility", val)}
                            triggerClassName="h-8 py-1 px-2.5 text-xs rounded-lg border border-[rgba(0,206,196,0.35)] hover:border-[#00cec4]"
                            options={[
                              { value: "OPERATIONS", label: "OPERATIONS (Operations Executive)" },
                              { value: "APPROVAL", label: "APPROVAL (Review Manager)" },
                              { value: "FILING", label: "FILING (Customs Representative)" },
                              { value: "ACCOUNTS", label: "ACCOUNTS (Accounts Executive)" },
                              { value: "CUSTOMER_SERVICE", label: "CUSTOMER SERVICE" },
                            ]}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignment(index)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1.5 cursor-pointer bg-transparent border-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {assignments.length === 0 && (
                    <p className="text-xs text-on-surface-variant italic p-2 col-span-2 text-center bg-surface-container-low rounded-xl border border-dashed border-outline-variant/35">
                      No team members assigned yet. Add one above.
                    </p>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1 pt-2">
                <label className="ds-label block">Initial Remarks / Demurrage Threat Alerts</label>
                <textarea
                  rows={3}
                  placeholder="Any immediate details like container discharge status, port free days, shipping line details..."
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[rgba(0,206,196,0.55)] rounded-xl text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[rgba(14,137,149,0.14)] transition-all font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/30">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="rounded-xl">
                  {creating ? "Creating Job..." : "Confirm & Launch"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen 3D-like document filing overlay animation */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-[100] text-white">
          <style>{`
            .cabinet-3d {
              perspective: 1000px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
            }
            .cabinet-body {
              width: 140px;
              height: 180px;
              background: #161b22;
              border: 4px solid #30363d;
              border-radius: 12px;
              position: relative;
              transform-style: preserve-3d;
              box-shadow: 0 20px 40px rgba(0,0,0,0.6);
              transform: rotateX(15deg) rotateY(-15deg);
            }
            .drawer-3d {
              height: 48px;
              background: #0d1117;
              border: 3px solid #30363d;
              margin: 6px;
              border-radius: 8px;
              position: relative;
              transform-style: preserve-3d;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .drawer-3d::after {
              content: '';
              width: 32px;
              height: 6px;
              background: #8b949e;
              border-radius: 3px;
            }
            .active-drawer {
              animation: drawer-open 2.5s infinite ease-in-out;
            }
            .folder-3d {
              width: 64px;
              height: 80px;
              background: #00cec4;
              border: 3px solid #fff;
              border-radius: 6px;
              position: absolute;
              top: -65px;
              left: 38px;
              box-shadow: 0 10px 20px rgba(0,0,0,0.4);
              transform-style: preserve-3d;
              animation: folder-drop 2.5s infinite ease-in-out;
              z-index: 10;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .checkmark-3d {
              font-size: 24px;
              color: white;
              font-weight: bold;
            }
            @keyframes drawer-open {
              0%, 100% { transform: translateZ(0) scale(1); }
              25%, 75% { transform: translateZ(40px) translateY(8px) rotateX(-5deg); background: #21262d; }
            }
            @keyframes folder-drop {
              0% { transform: translateY(-70px) rotate(15deg) scale(0.6); opacity: 0; }
              25% { transform: translateY(-15px) rotate(-5deg) scale(1.05); opacity: 1; }
              50% { transform: translateY(15px) rotate(0deg) scale(1); opacity: 1; }
              75%, 100% { transform: translateY(55px) scale(0); opacity: 0; }
            }
            .text-animate {
              animation: float 3s infinite ease-in-out;
            }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
          `}</style>
          <div className="relative mb-8">
            <div className="cabinet-3d">
              <div className="cabinet-body">
                <div className="folder-3d">
                  <span className="checkmark-3d">✓</span>
                </div>
                <div className="drawer-3d active-drawer"></div>
                <div className="drawer-3d"></div>
                <div className="drawer-3d"></div>
              </div>
            </div>
          </div>
          <div className="text-center space-y-4 max-w-md px-6">
            <h2 className="ds-h1 text-[#00cec4] text-2xl tracking-widest text-animate m-0">
              YOUR JOB CREATION IS SUCCESSFULLY!
            </h2>
            <p className="text-sm text-slate-400">
              The clearance job has been initialized, assignments have been mapped, and notifications have been triggered. Redirecting to jobs dashboard...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
