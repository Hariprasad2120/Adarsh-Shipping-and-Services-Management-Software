"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { X, FilePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createJobAction,
  createJobTypeAction,
  createShipmentTypeAction,
  getNextJobNumberPreviewAction,
} from "@/modules/cha/actions";
import { DropdownSelect } from "@/components/ui/dropdown-select";

const ADD_NEW_JOB_TYPE = "__add_new_job_type__";
const ADD_NEW_SHIPMENT_TYPE = "__add_new_shipment_type__";

function buildFinancialYearLabel(format?: string | null) {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;
  const normalized = (format || "YYYY-YY").toUpperCase();

  switch (normalized) {
    case "YYYY-YYYY":
      return `${startYear}-${endYear}`;
    case "YY-YY":
      return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
    case "YYYYYY":
      return `${startYear}${String(endYear).slice(-2)}`;
    case "YYYY-YY":
    default:
      return `${startYear}-${String(endYear).slice(-2)}`;
  }
}

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: {
    branches: { id: string; name: string; code: string }[];
    customers: { id: string; name: string }[];
    jobTypes: { id: string; name: string }[];
    shipmentTypes: { id: string; name: string }[];
    users: { id: string; name: string; email: string }[];
    managers?: { id: string; name: string; email: string; branchId: string | null }[];
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
  currentUserId: string;
  onCreated?: () => void;
}

export function CreateJobDialog({
  open,
  onOpenChange,
  options,
  currentUserId,
  onCreated,
}: CreateJobDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftRestoredRef = useRef(false);
  const createdCustomerAppliedRef = useRef(false);
  const autoAddedManagerIdRef = useRef<string>("");
  const previousGeneratedPreviewRef = useRef("");

  // Form State
  const [newJobNumber, setNewJobNumber] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newCustomerRef, setNewCustomerRef] = useState("");
  const [newJobTypeId, setNewJobTypeId] = useState("");
  const [newShipmentTypeId, setNewShipmentTypeId] = useState("");
  const [newBranchId, setNewBranchId] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newOwnerId, setNewOwnerId] = useState(currentUserId);
  const [newManagerId, setNewManagerId] = useState("");
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
  const [jobNumberPreview, setJobNumberPreview] = useState("");
  const [jobNumberPreviewLoading, setJobNumberPreviewLoading] = useState(false);
  const [addingJobType, setAddingJobType] = useState(false);
  const [addingShipmentType, setAddingShipmentType] = useState(false);
  const [showAddJobType, setShowAddJobType] = useState(false);
  const [showAddShipmentType, setShowAddShipmentType] = useState(false);
  const [newJobTypeName, setNewJobTypeName] = useState("");
  const [newJobTypeMovementDirection, setNewJobTypeMovementDirection] = useState<"IMPORT" | "EXPORT" | "BOTH" | "OTHER">("IMPORT");
  const [newJobTypeManifestRequirement, setNewJobTypeManifestRequirement] = useState<"IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM">("IGM");
  const [newJobTypeCustomManifestLabel, setNewJobTypeCustomManifestLabel] = useState("");
  const [newJobTypeManifestMandatory, setNewJobTypeManifestMandatory] = useState(true);
  const [newJobTypeManifestHelpText, setNewJobTypeManifestHelpText] = useState("");
  const [newShipmentTypeName, setNewShipmentTypeName] = useState("");
  const [jobTypesList, setJobTypesList] = useState(options.jobTypes);
  const [shipmentTypesList, setShipmentTypesList] = useState(options.shipmentTypes);

  useEffect(() => {
    setJobTypesList(options.jobTypes);
  }, [options.jobTypes]);

  useEffect(() => {
    setShipmentTypesList(options.shipmentTypes);
  }, [options.shipmentTypes]);

  useEffect(() => {
    if (!open) {
      draftRestoredRef.current = false;
      createdCustomerAppliedRef.current = false;
      return;
    }

    const mainShell = document.querySelector<HTMLElement>('[data-main-shell-scroll="true"]');
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const previousMainShellOverflow = mainShell?.style.overflow;
    const previousMainShellOverscroll = mainShell?.style.overscrollBehavior;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    if (mainShell) {
      mainShell.style.overflow = "hidden";
      mainShell.style.overscrollBehavior = "contain";
    }

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (mainShell) {
        mainShell.style.overflow = previousMainShellOverflow || "";
        mainShell.style.overscrollBehavior = previousMainShellOverscroll || "";
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open || createdCustomerAppliedRef.current) return;

    const createdCustomerId = searchParams.get("customerId");
    const createdCustomerName = searchParams.get("customerName");
    if (!createdCustomerId) return;

    setNewCustomerId(createdCustomerId);
    const matchedCustomer = options.customers.find((customer) => customer.id === createdCustomerId);
    const nextCustomerName = createdCustomerName || matchedCustomer?.name || "";
    setCustomerSearch(nextCustomerName);
    setSelectedCustomerName(nextCustomerName);
    setShowCustomerDropdown(false);
    createdCustomerAppliedRef.current = true;
  }, [open, options.customers, searchParams]);

  // Restore draft when open changes to true, or reset to defaults
  useEffect(() => {
    if (!open || draftRestoredRef.current) return;

    autoAddedManagerIdRef.current = "";

    const draft = localStorage.getItem("cha_draft_job");
    if (!draft) {
      setNewJobNumber("");
      setNewTitle("");
      setNewCustomerId("");
      setNewCustomerRef("");
      setNewJobTypeId("");
      setNewShipmentTypeId("");
      setNewBranchId("");
      setNewPriority("MEDIUM");
      setNewOwnerId(currentUserId);
      setNewManagerId("");
      setNewRemarks("");
      setAssignments([{ userId: currentUserId, responsibility: "OPERATIONS" }]);
      setEstimatedClosureDate("");
      setCustomerSearch("");
      setSelectedCustomerName("");
      draftRestoredRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(draft);
      setNewJobNumber(parsed.jobNumber || "");
      setNewTitle(parsed.title || "");
      setNewCustomerId(parsed.customerId || "");
      setNewCustomerRef(parsed.customerRef || "");
      setNewJobTypeId(parsed.jobTypeId || "");
      setNewShipmentTypeId(parsed.shipmentTypeId || "");
      setNewBranchId(parsed.branchId || "");
      setNewPriority(parsed.priority || "MEDIUM");
      setNewOwnerId(parsed.ownerId || currentUserId);
      setNewManagerId(parsed.assignedManagerId || "");
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
      draftRestoredRef.current = true;
    }
  }, [open, options.customers, currentUserId]);

  const saveDraft = () => {
    const draft = {
      jobNumber: newJobNumber,
      title: newTitle,
      customerId: newCustomerId,
      customerRef: newCustomerRef,
      jobTypeId: newJobTypeId,
      shipmentTypeId: newShipmentTypeId,
      branchId: newBranchId,
      priority: newPriority,
      ownerId: newOwnerId,
      assignedManagerId: newManagerId,
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

  const selectedBranchRule = options.branchNumberingRules.find((rule) => rule.branchId === newBranchId);
  const fallbackGeneratedPreview = selectedBranchRule
    ? [
        selectedBranchRule.prefix,
        ...(selectedBranchRule.useFinancialYear ? [buildFinancialYearLabel(selectedBranchRule.financialYearFormat)] : []),
        String(
          Math.max(selectedBranchRule.currentSequence + 1, selectedBranchRule.startingSequence, 1),
        ).padStart(Math.max(selectedBranchRule.numberPadding, 1), "0"),
        ...(selectedBranchRule.suffix?.trim() ? [selectedBranchRule.suffix.trim()] : []),
      ].join("-")
    : "";
  const generatedPreview = jobNumberPreview || fallbackGeneratedPreview;

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

  const refreshGeneratedPreview = async (branchId: string) => {
    setJobNumberPreviewLoading(true);
    try {
      const response = await getNextJobNumberPreviewAction(branchId);
      if (!response.ok) {
        setJobNumberPreview("");
        toast.error(response.error || "Failed to load the next generated job number.");
        return;
      }
      setJobNumberPreview(response.data || "");
    } catch (err: any) {
      setJobNumberPreview("");
      toast.error(err.message || "Failed to load the next generated job number.");
    } finally {
      setJobNumberPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !newBranchId) {
      setJobNumberPreview("");
      setJobNumberPreviewLoading(false);
      return;
    }

    void refreshGeneratedPreview(newBranchId);
  }, [open, newBranchId]);

  useEffect(() => {
    if (!open || !generatedPreview) {
      previousGeneratedPreviewRef.current = generatedPreview;
      return;
    }

    const previousGeneratedPreview = previousGeneratedPreviewRef.current;
    if (!newJobNumber || newJobNumber === previousGeneratedPreview) {
      setNewJobNumber(generatedPreview);
    }

    previousGeneratedPreviewRef.current = generatedPreview;
  }, [open, generatedPreview, newJobNumber]);

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

  const handleAutoGenerateJobNumber = async () => {
    if (!selectedBranchRule?.isActive) {
      toast.error("This branch is missing an active numbering rule. Configure it in CHA Settings first.");
      return;
    }

    const preview = generatedPreview || fallbackGeneratedPreview;
    if (!preview) {
      await refreshGeneratedPreview(newBranchId);
      return;
    }

    setNewJobNumber(preview);
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleAssignmentChange = (index: number, field: "userId" | "responsibility", value: string) => {
    setAssignments(
      assignments.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCustomerId || !newJobTypeId || !newShipmentTypeId || !newBranchId || !estimatedClosureDate) {
      toast.error("Please fill in all mandatory job attributes.");
      return;
    }
    if (!newManagerId) {
      toast.error("Please select an Assigned Manager.");
      return;
    }
    if (!selectedBranchRule?.isActive) {
      toast.error("The selected branch is not configured for CHA job numbering yet. Please update CHA Settings.");
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
        shipmentTypeId: newShipmentTypeId,
        branchId: newBranchId,
        priority: newPriority,
        primaryOwnerId: newOwnerId,
        assignedManagerId: newManagerId,
        assignments: validAssignments,
        remarks: newRemarks || undefined,
        estimatedClosureDate: estimatedClosureDate ? new Date(estimatedClosureDate) : undefined,
      });

      if (res.ok) {
        setShowSuccessAnimation(true);
        setTimeout(() => {
          setShowSuccessAnimation(false);
          onOpenChange(false);
          // Clear fields
          setNewJobNumber("");
          setNewTitle("");
          setNewCustomerId("");
          setNewCustomerRef("");
          setNewJobTypeId("");
          setNewShipmentTypeId("");
          setNewBranchId("");
          setNewManagerId("");
          setNewRemarks("");
          setEstimatedClosureDate("");
          setCustomerSearch("");
          setSelectedCustomerName("");
          setAssignments([{ userId: currentUserId, responsibility: "OPERATIONS" }]);
          if (onCreated) {
            onCreated();
          } else {
            router.refresh();
          }
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

  if (!open) return null;

  // Dynamically set redirect path based on where we are
  const handleAddCustomerRedirect = () => {
    saveDraft();
    const params = new URLSearchParams(window.location.search);
    params.set("new", "true");
    params.delete("customerId");
    params.delete("customerName");
    const currentPath = `${window.location.pathname}?${params.toString()}`;
    const redirectUrl = encodeURIComponent(currentPath);
    router.push(`/cha/customers/new?redirect_to=${redirectUrl}`);
  };

  const handleAddJobType = async () => {
    const trimmed = newJobTypeName.trim();
    if (!trimmed) {
      toast.error("Enter a clearance job type name first.");
      return;
    }
    setAddingJobType(true);
    try {
      const res = await createJobTypeAction({
        name: trimmed,
        movementDirection: newJobTypeMovementDirection,
        manifestRequirement: newJobTypeManifestRequirement,
        customManifestLabel: newJobTypeManifestRequirement === "CUSTOM" ? newJobTypeCustomManifestLabel : null,
        isManifestMandatory: newJobTypeManifestMandatory,
        manifestHelpText: newJobTypeManifestHelpText || null,
        isActive: true,
      });
      if (!res.ok) {
        toast.error(res.error || "Failed to add job type.");
        return;
      }
      setJobTypesList((prev) => [...prev, res.data]);
      setNewJobTypeId(res.data.id);
      setNewJobTypeName("");
      setNewJobTypeMovementDirection("IMPORT");
      setNewJobTypeManifestRequirement("IGM");
      setNewJobTypeCustomManifestLabel("");
      setNewJobTypeManifestMandatory(true);
      setNewJobTypeManifestHelpText("");
      setShowAddJobType(false);
      toast.success(`Clearance job type '${trimmed}' added.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add job type.");
    } finally {
      setAddingJobType(false);
    }
  };

  const handleAddShipmentType = async () => {
    const trimmed = newShipmentTypeName.trim();
    if (!trimmed) {
      toast.error("Enter a shipment type name first.");
      return;
    }
    setAddingShipmentType(true);
    try {
      const res = await createShipmentTypeAction(trimmed);
      if (!res.ok) {
        toast.error(res.error || "Failed to add shipment type.");
        return;
      }
      setShipmentTypesList((prev) => [...prev, res.data]);
      setNewShipmentTypeId(res.data.id);
      setNewShipmentTypeName("");
      setShowAddShipmentType(false);
      toast.success(`Shipment type '${trimmed}' added.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add shipment type.");
    } finally {
      setAddingShipmentType(false);
    }
  };

  const eligibleManagers = (options.managers || []).filter((m) => {
    if (!newBranchId) return true;
    return m.branchId === newBranchId;
  });
  const displayedManagers = eligibleManagers.length > 0 ? eligibleManagers : (options.managers || options.users || []);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
        <div className="bg-[var(--color-surface)] border border-outline-variant/50 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden my-8">
          {/* Modal Header */}
          <div className="flex items-center justify-between bg-surface-container-low px-6 py-4.5 border-b border-outline-variant/30">
            <h2 className="ds-h2 text-on-surface flex items-center gap-2 m-0 border-0 pb-0">
              <FilePlus className="text-[#00cec4]" size={20} /> Initialize Customs Clearance Job
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Form */}
          <form
            onSubmit={handleCreateJob}
            className="p-7 space-y-6 max-h-[75vh] overflow-y-auto overscroll-contain"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Branch Selection */}
              <div className="space-y-1">
                <label className="ds-label block">Customs Branch Office *</label>
                <DropdownSelect
                  required
                  value={newBranchId}
                  onValueChange={(value) => {
                    setNewBranchId(value);
                  }}
                  placeholder="Choose Branch Location"
                  options={options.branches.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.code})`,
                  }))}
                />
                {newBranchId && !selectedBranchRule?.isActive && (
                  <p className="text-xs text-[#fb923c]">
                    This branch needs an active numbering rule before a job can be created.
                  </p>
                )}
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
                    disabled={!newBranchId || jobNumberPreviewLoading}
                    className="text-xs shrink-0 rounded-xl"
                  >
                    {jobNumberPreviewLoading ? "Loading..." : "Generate"}
                  </Button>
                </div>
                {generatedPreview ? (
                  <p className="text-xs text-on-surface-variant">
                    Preview: <span className="ds-numeric text-on-surface">{generatedPreview}</span>
                  </p>
                ) : (
                  <p className="text-xs text-on-surface-variant">Select a branch to preview the next generated job number.</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1 md:col-span-2">
                <label className="ds-label block">Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the customs clearance work, cargo details, and any critical handling notes..."
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
                          onClick={handleAddCustomerRedirect}
                          className="text-xs font-bold text-[#00cec4] hover:underline cursor-pointer bg-transparent border-0"
                        >
                          + Add "{customerSearch}" as New Customer
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={handleAddCustomerRedirect}
                    className="text-xs font-semibold text-[#00cec4] hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    Add New Customer
                  </button>
                </div>
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
                  onValueChange={(value) => {
                    if (value === ADD_NEW_JOB_TYPE) {
                      setShowAddJobType(true);
                      return;
                    }
                    setNewJobTypeId(value);
                  }}
                  placeholder="Select Category"
                  options={[
                    ...jobTypesList.map((jt) => ({
                      value: jt.id,
                      label: jt.name,
                    })),
                    { value: ADD_NEW_JOB_TYPE, label: "+ Add New Job Type" },
                  ]}
                />
                {showAddJobType && (
                  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-2">
                    <input
                      type="text"
                      value={newJobTypeName}
                      onChange={(e) => setNewJobTypeName(e.target.value)}
                      placeholder="e.g. Transit Clearance"
                      className="w-full text-sm"
                    />
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="ds-label block">Movement Direction</span>
                        <select
                          value={newJobTypeMovementDirection}
                          onChange={(e) => setNewJobTypeMovementDirection(e.target.value as "IMPORT" | "EXPORT" | "BOTH" | "OTHER")}
                          className="w-full text-sm"
                        >
                          <option value="IMPORT">Import</option>
                          <option value="EXPORT">Export</option>
                          <option value="BOTH">Both</option>
                          <option value="OTHER">Other / Custom</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="ds-label block">Manifest Requirement</span>
                        <select
                          value={newJobTypeManifestRequirement}
                          onChange={(e) => setNewJobTypeManifestRequirement(e.target.value as "IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM")}
                          className="w-full text-sm"
                        >
                          <option value="IGM">IGM</option>
                          <option value="EGM">EGM</option>
                          <option value="BOTH">Both</option>
                          <option value="NONE">None</option>
                          <option value="CUSTOM">Custom</option>
                        </select>
                      </label>
                    </div>
                    {newJobTypeManifestRequirement === "CUSTOM" ? (
                      <input
                        type="text"
                        value={newJobTypeCustomManifestLabel}
                        onChange={(e) => setNewJobTypeCustomManifestLabel(e.target.value)}
                        placeholder="Custom manifest label"
                        className="w-full text-sm"
                      />
                    ) : null}
                    <input
                      type="text"
                      value={newJobTypeManifestHelpText}
                      onChange={(e) => setNewJobTypeManifestHelpText(e.target.value)}
                      placeholder="Help text / placeholder"
                      className="w-full text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={newJobTypeManifestMandatory}
                        onChange={(e) => setNewJobTypeManifestMandatory(e.target.checked)}
                      />
                      Manifest field is mandatory
                    </label>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowAddJobType(false)}>
                        Cancel
                      </Button>
                      <Button type="button" size="sm" disabled={addingJobType} onClick={handleAddJobType}>
                        {addingJobType ? "Adding..." : "Add Type"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="ds-label block">Shipment Type *</label>
                <DropdownSelect
                  required
                  value={newShipmentTypeId}
                  onValueChange={(value) => {
                    if (value === ADD_NEW_SHIPMENT_TYPE) {
                      setShowAddShipmentType(true);
                      return;
                    }
                    setNewShipmentTypeId(value);
                  }}
                  placeholder="Select Shipment Type"
                  options={[
                    ...shipmentTypesList.map((shipmentType) => ({
                      value: shipmentType.id,
                      label: shipmentType.name,
                    })),
                    { value: ADD_NEW_SHIPMENT_TYPE, label: "+ Add New Shipment Type" },
                  ]}
                />
                {showAddShipmentType && (
                  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-2">
                    <input
                      type="text"
                      value={newShipmentTypeName}
                      onChange={(e) => setNewShipmentTypeName(e.target.value)}
                      placeholder="e.g. Rail"
                      className="w-full text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowAddShipmentType(false)}>
                        Cancel
                      </Button>
                      <Button type="button" size="sm" disabled={addingShipmentType} onClick={handleAddShipmentType}>
                        {addingShipmentType ? "Adding..." : "Add Type"}
                      </Button>
                    </div>
                  </div>
                )}
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

              {/* Assigned Manager */}
              <div className="space-y-1">
                <label className="ds-label block">Assigned Manager *</label>
                <DropdownSelect
                  required
                  value={newManagerId}
                  onValueChange={(value) => {
                    const prevAutoId = autoAddedManagerIdRef.current;
                    setNewManagerId(value);
                    setAssignments((prev) => {
                      // Remove the previously auto-added manager entry (if any)
                      const without = prevAutoId
                        ? prev.filter((a) => a.userId !== prevAutoId)
                        : prev;
                      // Don't duplicate if already manually assigned
                      if (without.some((a) => a.userId === value)) {
                        autoAddedManagerIdRef.current = "";
                        return without;
                      }
                      autoAddedManagerIdRef.current = value;
                      return [...without, { userId: value, responsibility: "APPROVAL" }];
                    });
                  }}
                  placeholder="Select Manager"
                  options={displayedManagers.map((m) => ({
                    value: m.id,
                    label: `${m.name} (${m.email})`,
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

            {/* Team Assignments Mapping */}
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="rounded-xl">
                {creating ? "Creating Job..." : "Confirm & Launch"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Fullscreen 3D-like document filing overlay animation */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-[100] text-white animate-in fade-in duration-200">
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
    </>
  );
}
