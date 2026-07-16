"use client";

import { DateInput } from "@/components/ui/date-input";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { X, FilePlus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {createJobAction,createJobTypeAction,createShipmentTypeAction,getNextJobNumberPreviewAction,} from "@/modules/cha/actions";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";

const ADD_NEW_JOB_TYPE = "__add_new_job_type__";
const ADD_NEW_SHIPMENT_TYPE = "__add_new_shipment_type__";
const ALWAYS_VISIBLE_OWNER_MANAGER_EMAILS = ["hr@adarshshipping.in"];

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
  const [ownerSearch, setOwnerSearch] = useState("");
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [managerSearch, setManagerSearch] = useState("");
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

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
      const defaultOwner = (options.managers || []).find((user) => user.id === currentUserId);
      setOwnerSearch(defaultOwner ? `${defaultOwner.name} (${defaultOwner.email})` : "");
      setManagerSearch("");
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
      if (parsed.ownerId) {
        const savedOwner = (options.managers || []).find((owner) => owner.id === parsed.ownerId);
        setOwnerSearch(savedOwner ? `${savedOwner.name} (${savedOwner.email})` : "");
      } else {
        const defaultOwner = (options.managers || []).find((user) => user.id === (parsed.ownerId || currentUserId));
        setOwnerSearch(defaultOwner ? `${defaultOwner.name} (${defaultOwner.email})` : "");
      }
      setNewManagerId(parsed.assignedManagerId || "");
      if (parsed.assignedManagerId) {
        const savedManager = (options.managers || []).find((manager) => manager.id === parsed.assignedManagerId);
        setManagerSearch(savedManager ? `${savedManager.name} (${savedManager.email})` : "");
      } else {
        setManagerSearch("");
      }
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
  }, [open, options.customers, options.managers, currentUserId]);

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

  const eligibleManagers = (options.managers || []).filter((manager) => {
    if (!newBranchId) return true;
    return (
      manager.branchId === newBranchId ||
      ALWAYS_VISIBLE_OWNER_MANAGER_EMAILS.includes(manager.email.toLowerCase())
    );
  });
  const displayedManagers = eligibleManagers.length > 0 ? eligibleManagers : (options.managers || []);
  const filteredOwners = ownerSearch.trim() === ""
    ? displayedManagers
    : displayedManagers.filter((owner) => {
        const needle = ownerSearch.toLowerCase();
        return (
          owner.name.toLowerCase().includes(needle) ||
          owner.email.toLowerCase().includes(needle)
        );
      });
  const filteredManagers = managerSearch.trim() === ""
    ? displayedManagers
    : displayedManagers.filter((manager) => {
        const needle = managerSearch.toLowerCase();
        return (
          manager.name.toLowerCase().includes(needle) ||
          manager.email.toLowerCase().includes(needle)
        );
      });

  const selectManager = (manager: { id: string; name: string; email: string }) => {
    const prevAutoId = autoAddedManagerIdRef.current;
    setNewManagerId(manager.id);
    setManagerSearch(`${manager.name} (${manager.email})`);
    setShowManagerDropdown(false);
    setAssignments((prev) => {
      const without = prevAutoId
        ? prev.filter((assignment) => assignment.userId !== prevAutoId)
        : prev;
      if (without.some((assignment) => assignment.userId === manager.id)) {
        autoAddedManagerIdRef.current = "";
        return without;
      }
      autoAddedManagerIdRef.current = manager.id;
      return [...without, { userId: manager.id, responsibility: "APPROVAL" }];
    });
  };

  const selectOwner = (owner: { id: string; name: string; email: string }) => {
    setNewOwnerId(owner.id);
    setOwnerSearch(`${owner.name} (${owner.email})`);
    setShowOwnerDropdown(false);
  };

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
    if (!newOwnerId) {
      toast.error("Please select a Primary Operations Owner.");
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
          const defaultOwner = displayedManagers.find((user) => user.id === currentUserId);
          setOwnerSearch(defaultOwner ? `${defaultOwner.name} (${defaultOwner.email})` : "");
          setManagerSearch("");
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

  useEffect(() => {
    const activeOwner = displayedManagers.find((owner) => owner.id === newOwnerId);
    if (activeOwner) {
      setOwnerSearch(`${activeOwner.name} (${activeOwner.email})`);
    }
  }, [displayedManagers, newOwnerId]);

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

  const handleDemoFill = () => {
    const branch = options.branches[0];
    const customer = options.customers[0];
    const jobType = jobTypesList[0];
    const shipmentType = shipmentTypesList[0];

    if (!branch || !customer || !jobType || !shipmentType) {
      toast.error("Not enough reference data (branch/customer/job type/shipment type) to demo fill.");
      return;
    }

    const manager = (options.managers || []).find((m) => m.branchId === branch.id) || (options.managers || [])[0];

    setNewBranchId(branch.id);
    setNewTitle("Demo clearance job — sample cargo shipment for testing.");
    setNewCustomerId(customer.id);
    setCustomerSearch(customer.name);
    setSelectedCustomerName(customer.name);
    setShowCustomerDropdown(false);
    setNewCustomerRef("PO-DEMO-0001");
    setNewJobTypeId(jobType.id);
    setNewShipmentTypeId(shipmentType.id);
    setNewPriority("MEDIUM");

    const closure = new Date();
    closure.setDate(closure.getDate() + 14);
    setEstimatedClosureDate(closure.toISOString().slice(0, 10));
    setNewRemarks("Demo remarks: auto-filled for testing purposes.");

    const nextAssignments = [{ userId: newOwnerId || currentUserId, responsibility: "OPERATIONS" }];
    if (manager) {
      setManagerSearch(`${manager.name} (${manager.email})`);
      autoAddedManagerIdRef.current = manager.id;
      if (manager.id !== (newOwnerId || currentUserId)) {
        nextAssignments.push({ userId: manager.id, responsibility: "APPROVAL" });
      }
      setNewManagerId(manager.id);
    } else {
      setManagerSearch("");
    }
    setAssignments(nextAssignments);

    toast.success("Demo data filled in.");
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="flex min-h-[calc(100vh-2rem)] items-start justify-center py-3 sm:items-center">
        <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-outline-variant/50 bg-[var(--color-surface)] shadow-xl max-h-[calc(100vh-2rem)]">
          {/* Modal Header */}
          <div className="shrink-0 border-b border-outline-variant/30 bg-surface-container-low px-6 py-4.5">
            <div className="flex items-center justify-between gap-3">
            <h2 className="ds-h2 text-on-surface flex items-center gap-2 m-0 border-0 pb-0">
              <FilePlus className="text-[#00cec4]" size={20} /> Initialize Customs Clearance Job
            </h2>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={handleDemoFill} className="rounded-xl">
                <Sparkles size={14} className="mr-1.5" /> Demo Fill
              </Button>
              <button
                onClick={() => onOpenChange(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          </div>

          {/* Modal Form */}
          <form
            onSubmit={handleCreateJob}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-7 space-y-6"
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
                  <Input
                    type="text"
                    placeholder="e.g. CHA-MAA-2026-0001"
                    value={newJobNumber}
                    onChange={(e) => setNewJobNumber(e.target.value)}
                    className="w-full text-sm"
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
                  className="w-full text-sm"
                />
              </div>

              {/* Customer Account Autocomplete */}
              <div className="space-y-1 relative">
                <label className="ds-label block">Customer Account *</label>
                <Input
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
                  className="w-full text-sm"
                />
                {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-outline-variant/60 bg-surface p-1 shadow-sm">
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
                        className="flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-low hover:text-on-surface focus:bg-surface-container-low focus:text-on-surface"
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
                          className="ds-plain cha-link text-xs font-medium"
                        >
                          + Add &quot;{customerSearch}&quot; as New Customer
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={handleAddCustomerRedirect}
                    className="ds-plain cha-link text-xs font-medium"
                  >
                    Add New Customer
                  </button>
                </div>
              </div>

              {/* Customer Ref */}
              <div className="space-y-1">
                <label className="ds-label block">Customer Ref PO/WO (Optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. PO-88712"
                  value={newCustomerRef}
                  onChange={(e) => setNewCustomerRef(e.target.value)}
                  className="w-full text-sm"
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
                    <Input
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
                      <Input
                        type="text"
                        value={newJobTypeCustomManifestLabel}
                        onChange={(e) => setNewJobTypeCustomManifestLabel(e.target.value)}
                        placeholder="Custom manifest label"
                        className="w-full text-sm"
                      />
                    ) : null}
                    <Input
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
                    <Input
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
              <div className="space-y-1 relative">
                <label className="ds-label block">Primary Operations Owner *</label>
                <Input
                  type="text"
                  required
                  value={ownerSearch}
                  placeholder="Type owner name or email..."
                  onChange={(event) => {
                    setOwnerSearch(event.target.value);
                    setNewOwnerId("");
                    setShowOwnerDropdown(true);
                  }}
                  onFocus={() => setShowOwnerDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowOwnerDropdown(false), 250);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    if (filteredOwners.length > 0) {
                      selectOwner(filteredOwners[0]);
                    }
                  }}
                  className="w-full text-sm"
                />
                {showOwnerDropdown ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/60 bg-surface p-1 shadow-sm">
                    {filteredOwners.length > 0 ? (
                      filteredOwners.map((owner) => (
                        <button
                          key={owner.id}
                          type="button"
                          onClick={() => selectOwner(owner)}
                          className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-low hover:text-on-surface focus:bg-surface-container-low focus:text-on-surface"
                        >
                          <span>{owner.name}</span>
                          <span className="text-[10px] text-on-surface-variant">{owner.email}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs italic text-on-surface-variant">
                        No matching owners found.
                      </div>
                    )}
                  </div>
                ) : null}
                {newOwnerId ? (
                  <p className="text-xs text-on-surface-variant">
                    Selected owner: <span className="text-on-surface">{ownerSearch}</span>
                  </p>
                ) : null}
              </div>

              {/* Assigned Manager */}
              <div className="space-y-1 relative">
                <label className="ds-label block">Assigned Manager *</label>
                <Input
                  type="text"
                  required
                  value={managerSearch}
                  placeholder="Type manager name or email..."
                  onChange={(event) => {
                    setManagerSearch(event.target.value);
                    setNewManagerId("");
                    setShowManagerDropdown(true);
                  }}
                  onFocus={() => setShowManagerDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowManagerDropdown(false), 250);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    if (filteredManagers.length > 0) {
                      selectManager(filteredManagers[0]);
                    }
                  }}
                  className="w-full text-sm"
                />
                {showManagerDropdown ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/60 bg-surface p-1 shadow-sm">
                    {filteredManagers.length > 0 ? (
                      filteredManagers.map((manager) => (
                        <button
                          key={manager.id}
                          type="button"
                          onClick={() => selectManager(manager)}
                          className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-low hover:text-on-surface focus:bg-surface-container-low focus:text-on-surface"
                        >
                          <span>{manager.name}</span>
                          <span className="text-[10px] text-on-surface-variant">{manager.email}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs italic text-on-surface-variant">
                        No matching managers found.
                      </div>
                    )}
                  </div>
                ) : null}
                {newManagerId ? (
                  <p className="text-xs text-on-surface-variant">
                    Selected manager: <span className="text-on-surface">{managerSearch}</span>
                  </p>
                ) : null}
              </div>

              {/* Estimated Closure Date */}
              <div className="space-y-1">
                <label className="ds-label block">Estimated Closure Date (Benchmark) *</label>
                <DateInput
                  required
                  value={estimatedClosureDate}
                  onChange={(e) => setEstimatedClosureDate(e.target.value)}
                  className="w-full text-sm"
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
                <Input
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
                  className="w-full text-sm"
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
                      <Button
                        type="button"
                        variant="outline"
                        mode="icon"
                        size="sm"
                        onClick={() => handleRemoveAssignment(index)}
                        aria-label="Remove assignment"
                        className="ds-plain rounded-xl border-red-500/35 bg-transparent text-red-500 shadow-sm hover:border-red-500/50 hover:bg-transparent hover:text-red-600 hover:shadow-[0_0_12px_rgba(239,68,68,0.18)]"
                      >
                        <Trash2 size={16} />
                      </Button>
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
                className="w-full text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/30">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="ds-plain rounded-xl border-red-500 bg-transparent text-red-500 hover:border-red-600 hover:bg-transparent hover:text-red-600 hover:shadow-[0_0_12px_rgba(239,68,68,0.18)]"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="rounded-xl">
                {creating ? "Creating Job..." : "Confirm & Launch"}
              </Button>
            </div>
          </form>
        </div>
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
