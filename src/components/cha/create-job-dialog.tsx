"use client";

import { Textarea } from "@/components/monolith/textarea";
import { DateInput } from "@/components/monolith/date-input";
import {
  ChaDialogLayer,
  ChaDropdownSelect as DropdownSelect,
  ChaNativeSelect as NativeSelect,
} from "@/components/monolith/cha-workspace";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  X,
  Trash2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Plane,
  Ship,
  TrainFront,
  Truck,
} from "lucide-react";
import { Button } from "@/components/monolith/button";
import {
  createJobAction,
  createJobTypeAction,
  createShipmentTypeAction,
  getNextJobNumberPreviewAction,
} from "@/modules/cha/actions";
import { Input } from "@/components/monolith/input";
import { cn } from "@/lib/utils";

const MotionButton = motion.create(Button);

const ADD_NEW_JOB_TYPE = "__add_new_job_type__";
const ADD_NEW_SHIPMENT_TYPE = "__add_new_shipment_type__";
const ALWAYS_VISIBLE_OWNER_MANAGER_EMAILS = ["hr@adarshshipping.in"];
const CHA_CREATE_TEXTAREA_CLASS =
  "mnx-cha-dialog-control min-h-[112px] w-full px-4 py-3 text-sm";
const CHA_CREATE_INPUT_CLASS = "mnx-cha-dialog-control !h-11";
const CHA_CREATE_SELECT_CLASS = "mnx-cha-dialog-control !h-11";

type CreatedJobSummary = {
  id: string;
  jobNumber: string;
  customerName: string;
  shipmentTypeName: string;
  managerName: string;
};

function getPriorityPresentation(priority: string) {
  switch (priority) {
    case "HIGH":
      return {
        badge: "P1",
        tone: "mnx-border-danger mnx-bg-danger mnx-text-danger mnx-border-danger mnx-bg-danger mnx-text-danger",
      };
    case "LOW":
      return {
        badge: "P3",
        tone: "mnx-border mnx-bg-soft mnx-text-muted mnx-border mnx-bg-soft mnx-text-muted",
      };
    case "MEDIUM":
    default:
      return {
        badge: "P2",
        tone: "mnx-border-warning mnx-bg-warning mnx-text-warning mnx-border-warning mnx-bg-warning mnx-text-warning",
      };
  }
}

function getShipmentVisual(shipmentTypeName: string) {
  const normalized = shipmentTypeName.toLowerCase();
  if (normalized.includes("air")) return { Icon: Plane, label: "Air shipment" };
  if (normalized.includes("road") || normalized.includes("truck"))
    return { Icon: Truck, label: "Road shipment" };
  if (normalized.includes("rail") || normalized.includes("train"))
    return { Icon: TrainFront, label: "Rail shipment" };
  return { Icon: Ship, label: "Sea shipment" };
}

function CreateJobSuccessOverlay({
  open,
  summary,
  onOpenJob,
  onCreateAnother,
  onAutoFinish,
  reducedMotion,
}: {
  open: boolean;
  summary: CreatedJobSummary | null;
  onOpenJob: () => void;
  onCreateAnother: () => void;
  onAutoFinish: () => void;
  reducedMotion: boolean;
}) {
  if (!summary) return null;

  const { Icon: TransportIcon, label: transportLabel } = getShipmentVisual(
    summary.shipmentTypeName,
  );

  return (
    <ChaDialogLayer
      open={open}
      onClose={onAutoFinish}
      size="wide"
      labelledBy="create-job-success-title"
    >
      <AnimatePresence>
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mnx-dialog mnx-cha-success-dialog"
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          <header>
            <div>
              <p className="mnx-label mnx-text-success">Workflow launched</p>
              <h2 id="create-job-success-title">
                Customs clearance job created
              </h2>
              <p>
                The shipment workflow, document requirements, and team
                assignments are ready.
              </p>
            </div>
            <Button
              aria-label="Close success state"
              variant="outline"
              mode="icon"
              size="sm"
              onClick={onAutoFinish}
              type="button"
            >
              <X size={18} />
            </Button>
          </header>
          <div className="mnx-dialog-content">
            <div className="mnx-cha-success-route">
              <MotionButton
                animate={reducedMotion ? { scale: 1 } : { scale: [1, 1.04, 1] }}
                aria-label={`${transportLabel} workflow active`}
                className="mnx-cha-success-icon"
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                }
                type="button"
              >
                <TransportIcon size={24} />
              </MotionButton>
              <div>
                <p className="mnx-label">Workflow status</p>
                <p className="mt-1 text-sm mnx-text-strong">
                  Job initialized and active
                </p>
              </div>
              <CheckCircle2 className="ml-auto mnx-text-success" size={24} />
            </div>
            <div className="mnx-cha-success-grid">
              {[
                { label: "Job number", value: summary.jobNumber },
                { label: "Customer", value: summary.customerName },
                { label: "Shipment type", value: summary.shipmentTypeName },
                { label: "Assigned manager", value: summary.managerName },
              ].map((item) => (
                <div className="mnx-cha-success-stat" key={item.label}>
                  <p className="mnx-label">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold mnx-text-strong">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs mnx-text-muted">
              Redirecting back to CHA shortly.
            </p>
          </div>
          <footer>
            <Button variant="outline" onClick={onCreateAnother} type="button">
              Create another job
            </Button>
            <Button onClick={onOpenJob} type="button">
              Open job
              <ArrowRight size={15} />
            </Button>
          </footer>
        </motion.div>
      </AnimatePresence>
    </ChaDialogLayer>
  );
}

function buildFinancialYearLabel(format?: string | null) {
  const now = new Date();
  const startYear =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
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
    managers?: {
      id: string;
      name: string;
      email: string;
      branchId: string | null;
    }[];
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
  const reducedMotion = useReducedMotion();
  const draftRestoredRef = useRef(false);
  const createdCustomerAppliedRef = useRef(false);
  const autoAddedManagerIdRef = useRef<string>("");
  const previousGeneratedPreviewRef = useRef("");
  const successRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Form State
  const [newJobNumber, setNewJobNumber] = useState("");
  const [jobNumberMode, setJobNumberMode] = useState<"SYSTEM" | "MANUAL">(
    "SYSTEM",
  );
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
  const [assignments, setAssignments] = useState<
    { userId: string; responsibility: string }[]
  >([{ userId: currentUserId, responsibility: "OPERATIONS" }]);
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

  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [createdJobSummary, setCreatedJobSummary] =
    useState<CreatedJobSummary | null>(null);

  // Loading States
  const [creating, setCreating] = useState(false);
  const [jobNumberPreview, setJobNumberPreview] = useState("");
  const [jobNumberPreviewLoading, setJobNumberPreviewLoading] = useState(false);
  const [addingJobType, setAddingJobType] = useState(false);
  const [addingShipmentType, setAddingShipmentType] = useState(false);
  const [showAddJobType, setShowAddJobType] = useState(false);
  const [showAddShipmentType, setShowAddShipmentType] = useState(false);
  const [newJobTypeName, setNewJobTypeName] = useState("");
  const [newJobTypeMovementDirection, setNewJobTypeMovementDirection] =
    useState<"IMPORT" | "EXPORT" | "BOTH" | "OTHER">("IMPORT");
  const [newJobTypeManifestRequirement, setNewJobTypeManifestRequirement] =
    useState<"IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM">("IGM");
  const [newJobTypeCustomManifestLabel, setNewJobTypeCustomManifestLabel] =
    useState("");
  const [newJobTypeManifestMandatory, setNewJobTypeManifestMandatory] =
    useState(true);
  const [newJobTypeManifestHelpText, setNewJobTypeManifestHelpText] =
    useState("");
  const [newShipmentTypeName, setNewShipmentTypeName] = useState("");
  const [jobTypesList, setJobTypesList] = useState(options.jobTypes);
  const [shipmentTypesList, setShipmentTypesList] = useState(
    options.shipmentTypes,
  );

  useEffect(() => {
    setJobTypesList(options.jobTypes);
  }, [options.jobTypes]);

  useEffect(() => {
    setShipmentTypesList(options.shipmentTypes);
  }, [options.shipmentTypes]);

  useEffect(() => {
    return () => {
      if (successRedirectTimerRef.current) {
        clearTimeout(successRedirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      draftRestoredRef.current = false;
      createdCustomerAppliedRef.current = false;
      if (successRedirectTimerRef.current) {
        clearTimeout(successRedirectTimerRef.current);
        successRedirectTimerRef.current = null;
      }
      return;
    }

    const mainShell = document.querySelector<HTMLElement>(
      '[data-main-shell-scroll="true"]',
    );
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const previousMainShellOverflow = mainShell?.style.overflow;
    const previousMainShellOverscroll = mainShell?.style.overscrollBehavior;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

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
    const matchedCustomer = options.customers.find(
      (customer) => customer.id === createdCustomerId,
    );
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
      setJobNumberMode("SYSTEM");
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
      const defaultOwner = (options.managers || []).find(
        (user) => user.id === currentUserId,
      );
      setOwnerSearch(
        defaultOwner ? `${defaultOwner.name} (${defaultOwner.email})` : "",
      );
      setManagerSearch("");
      draftRestoredRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(draft);
      setNewJobNumber(parsed.jobNumber || "");
      setJobNumberMode(parsed.jobNumberMode === "MANUAL" ? "MANUAL" : "SYSTEM");
      setNewTitle(parsed.title || "");
      setNewCustomerId(parsed.customerId || "");
      setNewCustomerRef(parsed.customerRef || "");
      setNewJobTypeId(parsed.jobTypeId || "");
      setNewShipmentTypeId(parsed.shipmentTypeId || "");
      setNewBranchId(parsed.branchId || "");
      setNewPriority(parsed.priority || "MEDIUM");
      setNewOwnerId(parsed.ownerId || currentUserId);
      if (parsed.ownerId) {
        const savedOwner = (options.managers || []).find(
          (owner) => owner.id === parsed.ownerId,
        );
        setOwnerSearch(
          savedOwner ? `${savedOwner.name} (${savedOwner.email})` : "",
        );
      } else {
        const defaultOwner = (options.managers || []).find(
          (user) => user.id === (parsed.ownerId || currentUserId),
        );
        setOwnerSearch(
          defaultOwner ? `${defaultOwner.name} (${defaultOwner.email})` : "",
        );
      }
      setNewManagerId(parsed.assignedManagerId || "");
      if (parsed.assignedManagerId) {
        const savedManager = (options.managers || []).find(
          (manager) => manager.id === parsed.assignedManagerId,
        );
        setManagerSearch(
          savedManager ? `${savedManager.name} (${savedManager.email})` : "",
        );
      } else {
        setManagerSearch("");
      }
      setNewRemarks(parsed.remarks || "");
      setAssignments(
        parsed.assignments || [
          { userId: currentUserId, responsibility: "OPERATIONS" },
        ],
      );
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
      jobNumberMode,
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

  const filteredCustomers =
    customerSearch.trim() === ""
      ? options.customers
      : options.customers.filter((c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()),
        );

  const selectedBranchRule = options.branchNumberingRules.find(
    (rule) => rule.branchId === newBranchId,
  );
  const fallbackGeneratedPreview = selectedBranchRule
    ? [
        selectedBranchRule.prefix,
        ...(selectedBranchRule.useFinancialYear
          ? [buildFinancialYearLabel(selectedBranchRule.financialYearFormat)]
          : []),
        String(
          Math.max(
            selectedBranchRule.currentSequence + 1,
            selectedBranchRule.startingSequence,
            1,
          ),
        ).padStart(Math.max(selectedBranchRule.numberPadding, 1), "0"),
        ...(selectedBranchRule.suffix?.trim()
          ? [selectedBranchRule.suffix.trim()]
          : []),
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

  const filteredTeamUsers =
    teamSearch.trim() === ""
      ? options.users
      : options.users.filter((u) =>
          u.name.toLowerCase().includes(teamSearch.toLowerCase()),
        );

  const filteredTeamGroups =
    teamSearch.trim() === ""
      ? options.teamGroups || []
      : (options.teamGroups || []).filter((g) =>
          g.name.toLowerCase().includes(teamSearch.toLowerCase()),
        );

  const eligibleManagers = (options.managers || []).filter((manager) => {
    if (!newBranchId) return true;
    return (
      manager.branchId === newBranchId ||
      ALWAYS_VISIBLE_OWNER_MANAGER_EMAILS.includes(manager.email.toLowerCase())
    );
  });
  const displayedManagers =
    eligibleManagers.length > 0 ? eligibleManagers : options.managers || [];
  const filteredOwners =
    ownerSearch.trim() === ""
      ? displayedManagers
      : displayedManagers.filter((owner) => {
          const needle = ownerSearch.toLowerCase();
          return (
            owner.name.toLowerCase().includes(needle) ||
            owner.email.toLowerCase().includes(needle)
          );
        });
  const filteredManagers =
    managerSearch.trim() === ""
      ? displayedManagers
      : displayedManagers.filter((manager) => {
          const needle = managerSearch.toLowerCase();
          return (
            manager.name.toLowerCase().includes(needle) ||
            manager.email.toLowerCase().includes(needle)
          );
        });

  const selectManager = (manager: {
    id: string;
    name: string;
    email: string;
  }) => {
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
        toast.error(
          response.error || "Failed to load the next generated job number.",
        );
        return;
      }
      setJobNumberPreview(response.data || "");
    } catch (err: any) {
      setJobNumberPreview("");
      toast.error(
        err.message || "Failed to load the next generated job number.",
      );
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
    setAssignments([
      ...assignments,
      { userId: u.id, responsibility: "OPERATIONS" },
    ]);
    setTeamSearch("");
    setShowTeamDropdown(false);
  };

  const handleAddTeamGroup = (group: {
    id: string;
    name: string;
    memberIds: any;
  }) => {
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
      toast.error(
        "This branch is missing an active numbering rule. Configure it in CHA Settings first.",
      );
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

  const handleAssignmentChange = (
    index: number,
    field: "userId" | "responsibility",
    value: string,
  ) => {
    setAssignments(
      assignments.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    );
  };

  const resetFormFields = () => {
    if (successRedirectTimerRef.current) {
      clearTimeout(successRedirectTimerRef.current);
      successRedirectTimerRef.current = null;
    }
    setShowSuccessAnimation(false);
    setCreatedJobSummary(null);
    setNewJobNumber("");
    setJobNumberMode("SYSTEM");
    setNewTitle("");
    setNewCustomerId("");
    setNewCustomerRef("");
    setNewJobTypeId("");
    setNewShipmentTypeId("");
    setNewBranchId("");
    setNewPriority("MEDIUM");
    setNewManagerId("");
    const defaultOwner = displayedManagers.find(
      (user) => user.id === currentUserId,
    );
    setNewOwnerId(currentUserId);
    setOwnerSearch(
      defaultOwner ? `${defaultOwner.name} (${defaultOwner.email})` : "",
    );
    setManagerSearch("");
    setNewRemarks("");
    setEstimatedClosureDate("");
    setCustomerSearch("");
    setSelectedCustomerName("");
    setAssignments([{ userId: currentUserId, responsibility: "OPERATIONS" }]);
  };

  const finishCreateFlow = (openCreatedJob?: boolean) => {
    if (successRedirectTimerRef.current) {
      clearTimeout(successRedirectTimerRef.current);
      successRedirectTimerRef.current = null;
    }

    const createdJobId = createdJobSummary?.id;
    resetFormFields();
    onOpenChange(false);

    if (openCreatedJob && createdJobId) {
      router.push(`/cha/jobs/${createdJobId}`);
      return;
    }

    if (onCreated) {
      onCreated();
    } else {
      router.refresh();
    }
  };

  const scheduleAutoFinish = () => {
    if (successRedirectTimerRef.current) {
      clearTimeout(successRedirectTimerRef.current);
    }
    successRedirectTimerRef.current = setTimeout(
      () => {
        finishCreateFlow(false);
      },
      reducedMotion ? 1400 : 2600,
    );
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newTitle ||
      !newCustomerId ||
      !newJobTypeId ||
      !newShipmentTypeId ||
      !newBranchId ||
      !estimatedClosureDate
    ) {
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
      toast.error(
        "The selected branch is not configured for CHA job numbering yet. Please update CHA Settings.",
      );
      return;
    }
    if (jobNumberMode === "MANUAL" && !newJobNumber.trim()) {
      toast.error(
        "Enter a manual job number or switch back to system-generated numbering.",
      );
      return;
    }

    const validAssignments = assignments.filter((a) => a.userId.trim() !== "");

    setCreating(true);
    try {
      const res = await createJobAction({
        jobNumber:
          jobNumberMode === "MANUAL"
            ? newJobNumber.trim() || undefined
            : undefined,
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
        estimatedClosureDate: estimatedClosureDate
          ? new Date(estimatedClosureDate)
          : undefined,
      });

      if (res.ok) {
        const shipmentTypeName =
          shipmentTypesList.find(
            (shipmentType) => shipmentType.id === newShipmentTypeId,
          )?.name || "Shipment";
        const managerName =
          displayedManagers.find((manager) => manager.id === newManagerId)
            ?.name || "Assigned Manager";
        setCreatedJobSummary({
          id: res.data.id,
          jobNumber: res.data.jobNumber,
          customerName:
            selectedCustomerName ||
            options.customers.find((customer) => customer.id === newCustomerId)
              ?.name ||
            "Customer",
          shipmentTypeName,
          managerName,
        });
        setShowSuccessAnimation(true);
        scheduleAutoFinish();
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
    const activeOwner = displayedManagers.find(
      (owner) => owner.id === newOwnerId,
    );
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
        customManifestLabel:
          newJobTypeManifestRequirement === "CUSTOM"
            ? newJobTypeCustomManifestLabel
            : null,
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
      toast.error(
        "Not enough reference data (branch/customer/job type/shipment type) to demo fill.",
      );
      return;
    }

    const manager =
      (options.managers || []).find((m) => m.branchId === branch.id) ||
      (options.managers || [])[0];

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

    const nextAssignments = [
      { userId: newOwnerId || currentUserId, responsibility: "OPERATIONS" },
    ];
    if (manager) {
      setManagerSearch(`${manager.name} (${manager.email})`);
      autoAddedManagerIdRef.current = manager.id;
      if (manager.id !== (newOwnerId || currentUserId)) {
        nextAssignments.push({
          userId: manager.id,
          responsibility: "APPROVAL",
        });
      }
      setNewManagerId(manager.id);
    } else {
      setManagerSearch("");
    }
    setAssignments(nextAssignments);

    toast.success("Demo data filled in.");
  };

  const priorityPresentation = getPriorityPresentation(newPriority);
  const activeShipmentTypeName =
    shipmentTypesList.find(
      (shipmentType) => shipmentType.id === newShipmentTypeId,
    )?.name || "Sea Freight";
  const ActiveShipmentIcon = getShipmentVisual(activeShipmentTypeName).Icon;
  const activeBranch = options.branches.find(
    (branch) => branch.id === newBranchId,
  );
  const activeCustomer = options.customers.find(
    (customer) => customer.id === newCustomerId,
  );

  if (!open) return null;

  return (
    <>
      <ChaDialogLayer
        open={open}
        onClose={() => onOpenChange(false)}
        size="workspace"
        labelledBy="create-job-title"
      >
        <form
          onSubmit={handleCreateJob}
          className="mnx-dialog mnx-cha-create-dialog h-full"
        >
          <header>
            <div>
              <p className="mnx-label">New customs job</p>
              <h2 id="create-job-title">Initialize customs clearance job</h2>
              <p>
                Start a new CHA shipment workflow and capture its operational
                details.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDemoFill}
                className="gap-2"
              >
                <Sparkles size={14} />
                Demo fill
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                mode="icon"
                size="sm"
                type="button"
                aria-label="Close job creation dialog"
              >
                <X size={17} />
              </Button>
            </div>
          </header>
          <div className="mnx-dialog-content mnx-cha-create-dialog-content">
            <div className="space-y-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b mnx-border pb-4">
                <div>
                  <p className="mnx-label">Job initialization</p>
                  <p className="mt-1 text-sm mnx-text-muted">
                    Customer, numbering, shipment, and team configuration.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs mnx-text-muted">
                  <span className="mnx-cha-summary-chip">
                    {activeBranch?.name || "Select branch"}
                  </span>
                  <span className="mnx-cha-summary-chip">
                    {activeCustomer?.name || "Select customer"}
                  </span>
                  <span className="mnx-cha-summary-chip flex items-center gap-1.5">
                    <ActiveShipmentIcon size={12} />
                    {activeShipmentTypeName}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1.5 font-semibold",
                      priorityPresentation.tone,
                    )}
                  >
                    {priorityPresentation.badge}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Branch Selection */}
                <div className="space-y-1">
                  <label className="mnx-label block">
                    Customs Branch Office *
                  </label>
                  <DropdownSelect
                    required
                    value={newBranchId}
                    onValueChange={(value) => {
                      setNewBranchId(value);
                    }}
                    placeholder="Choose Branch Location"
                    triggerClassName={CHA_CREATE_SELECT_CLASS}
                    options={options.branches.map((b) => ({
                      value: b.id,
                      label: `${b.name} (${b.code})`,
                    }))}
                  />
                  {newBranchId && !selectedBranchRule?.isActive && (
                    <p className="text-xs mnx-text-warning">
                      This branch needs an active numbering rule before a job
                      can be created.
                    </p>
                  )}
                </div>

                {/* Job Number */}
                <div className="space-y-1">
                  <label className="mnx-label block">
                    Job Ref Number (Leave empty to Auto-number)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="e.g. CHA-MAA-2026-0001"
                      value={newJobNumber}
                      onChange={(e) => setNewJobNumber(e.target.value)}
                      className={CHA_CREATE_INPUT_CLASS}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoGenerateJobNumber}
                      disabled={!newBranchId || jobNumberPreviewLoading}
                      className="shrink-0 rounded-2xl mnx-border-accent mnx-bg-accent-soft mnx-text-accent mnx-hover-accent"
                    >
                      {jobNumberPreviewLoading ? "Loading..." : "Generate"}
                    </Button>
                  </div>
                  {generatedPreview ? (
                    <p className="text-xs mnx-text-muted">
                      Preview:{" "}
                      <span className="mnx-numeric mnx-text-primary">
                        {generatedPreview}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs mnx-text-muted">
                      Select a branch to preview the next generated job number.
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1 md:col-span-2">
                  <label className="mnx-label block">Description *</label>
                  <Textarea
                    required
                    rows={4}
                    placeholder="Describe the customs clearance work, cargo details, and any critical handling notes..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className={CHA_CREATE_TEXTAREA_CLASS}
                  />
                </div>

                {/* Customer Account Autocomplete */}
                <div className="space-y-1 relative">
                  <label className="mnx-label block">Customer Account *</label>
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
                    className={CHA_CREATE_INPUT_CLASS}
                  />
                  {showCustomerDropdown && (
                    <div className="mnx-floating-surface mnx-cha-menu mnx-cha-autocomplete absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto p-2">
                      {filteredCustomers.map((c) => (
                        <Button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setNewCustomerId(c.id);
                            setCustomerSearch(c.name);
                            setSelectedCustomerName(c.name);
                            setShowCustomerDropdown(false);
                          }}
                          className="mnx-cha-menu-option"
                        >
                          {c.name}
                        </Button>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <div className="p-3 text-xs mnx-text-muted italic flex flex-col items-center gap-2">
                          <span>No matching customer found.</span>
                          <Button
                            type="button"
                            onClick={handleAddCustomerRedirect}
                            className="mnx-plain mnx-text-accent text-xs font-medium"
                          >
                            + Add &quot;{customerSearch}&quot; as New Customer
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="pt-2 text-right">
                    <Button
                      type="button"
                      onClick={handleAddCustomerRedirect}
                      className="mnx-plain mnx-text-accent text-xs font-medium"
                    >
                      Add New Customer
                    </Button>
                  </div>
                </div>

                {/* Customer Ref */}
                <div className="space-y-1">
                  <label className="mnx-label block">
                    Customer Ref PO/WO (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. PO-88712"
                    value={newCustomerRef}
                    onChange={(e) => setNewCustomerRef(e.target.value)}
                    className={CHA_CREATE_INPUT_CLASS}
                  />
                </div>

                {/* Job Type */}
                <div className="space-y-1">
                  <label className="mnx-label block">
                    Clearance Job Type *
                  </label>
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
                    triggerClassName={CHA_CREATE_SELECT_CLASS}
                    options={[
                      ...jobTypesList.map((jt) => ({
                        value: jt.id,
                        label: jt.name,
                      })),
                      { value: ADD_NEW_JOB_TYPE, label: "+ Add New Job Type" },
                    ]}
                  />
                  {showAddJobType && (
                    <div className="rounded-[var(--mn-radius-panel)] border mnx-border-accent mnx-bg-accent-soft p-4 space-y-3">
                      <Input
                        type="text"
                        value={newJobTypeName}
                        onChange={(e) => setNewJobTypeName(e.target.value)}
                        placeholder="e.g. Transit Clearance"
                        className={CHA_CREATE_INPUT_CLASS}
                      />
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="mnx-label block">
                            Movement Direction
                          </span>
                          <NativeSelect
                            value={newJobTypeMovementDirection}
                            onChange={(e) =>
                              setNewJobTypeMovementDirection(
                                e.target.value as
                                  "IMPORT" | "EXPORT" | "BOTH" | "OTHER",
                              )
                            }
                            className={CHA_CREATE_INPUT_CLASS}
                          >
                            <option value="IMPORT">Import</option>
                            <option value="EXPORT">Export</option>
                            <option value="BOTH">Both</option>
                            <option value="OTHER">Other / Custom</option>
                          </NativeSelect>
                        </label>
                        <label className="space-y-1">
                          <span className="mnx-label block">
                            Manifest Requirement
                          </span>
                          <NativeSelect
                            value={newJobTypeManifestRequirement}
                            onChange={(e) =>
                              setNewJobTypeManifestRequirement(
                                e.target.value as
                                  "IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM",
                              )
                            }
                            className={CHA_CREATE_INPUT_CLASS}
                          >
                            <option value="IGM">IGM</option>
                            <option value="EGM">EGM</option>
                            <option value="BOTH">Both</option>
                            <option value="NONE">None</option>
                            <option value="CUSTOM">Custom</option>
                          </NativeSelect>
                        </label>
                      </div>
                      {newJobTypeManifestRequirement === "CUSTOM" ? (
                        <Input
                          type="text"
                          value={newJobTypeCustomManifestLabel}
                          onChange={(e) =>
                            setNewJobTypeCustomManifestLabel(e.target.value)
                          }
                          placeholder="Custom manifest label"
                          className={CHA_CREATE_INPUT_CLASS}
                        />
                      ) : null}
                      <Input
                        type="text"
                        value={newJobTypeManifestHelpText}
                        onChange={(e) =>
                          setNewJobTypeManifestHelpText(e.target.value)
                        }
                        placeholder="Help text / placeholder"
                        className={CHA_CREATE_INPUT_CLASS}
                      />
                      <label className="flex items-center gap-2 text-xs mnx-text-muted">
                        <Input
                          type="checkbox"
                          checked={newJobTypeManifestMandatory}
                          onChange={(e) =>
                            setNewJobTypeManifestMandatory(e.target.checked)
                          }
                        />
                        Manifest field is mandatory
                      </label>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddJobType(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={addingJobType}
                          onClick={handleAddJobType}
                        >
                          {addingJobType ? "Adding..." : "Add Type"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="mnx-label block">Shipment Type *</label>
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
                    triggerClassName={CHA_CREATE_SELECT_CLASS}
                    options={[
                      ...shipmentTypesList.map((shipmentType) => ({
                        value: shipmentType.id,
                        label: shipmentType.name,
                      })),
                      {
                        value: ADD_NEW_SHIPMENT_TYPE,
                        label: "+ Add New Shipment Type",
                      },
                    ]}
                  />
                  {showAddShipmentType && (
                    <div className="rounded-[var(--mn-radius-panel)] border mnx-border-accent mnx-bg-accent-soft p-4 space-y-3">
                      <Input
                        type="text"
                        value={newShipmentTypeName}
                        onChange={(e) => setNewShipmentTypeName(e.target.value)}
                        placeholder="e.g. Rail"
                        className={CHA_CREATE_INPUT_CLASS}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddShipmentType(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={addingShipmentType}
                          onClick={handleAddShipmentType}
                        >
                          {addingShipmentType ? "Adding..." : "Add Type"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="mnx-label block">Job Priority *</label>
                  <DropdownSelect
                    required
                    value={newPriority}
                    onValueChange={setNewPriority}
                    placeholder="Select Priority"
                    triggerClassName={CHA_CREATE_SELECT_CLASS}
                    options={[
                      { value: "LOW", label: "LOW" },
                      { value: "MEDIUM", label: "MEDIUM" },
                      { value: "HIGH", label: "HIGH" },
                    ]}
                  />
                </div>

                {/* Owner */}
                <div className="space-y-1 relative">
                  <label className="mnx-label block">
                    Primary Operations Owner *
                  </label>
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
                    className={CHA_CREATE_INPUT_CLASS}
                  />
                  {showOwnerDropdown ? (
                    <div className="mnx-floating-surface mnx-cha-menu mnx-cha-autocomplete absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto p-2">
                      {filteredOwners.length > 0 ? (
                        filteredOwners.map((owner) => (
                          <Button
                            key={owner.id}
                            type="button"
                            onClick={() => selectOwner(owner)}
                            className="mnx-cha-menu-option justify-between"
                          >
                            <span>{owner.name}</span>
                            <span className="text-[10px] mnx-text-muted">
                              {owner.email}
                            </span>
                          </Button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs italic mnx-text-muted">
                          No matching owners found.
                        </div>
                      )}
                    </div>
                  ) : null}
                  {newOwnerId ? (
                    <p className="text-xs mnx-text-muted">
                      Selected owner:{" "}
                      <span className="mnx-text-primary">{ownerSearch}</span>
                    </p>
                  ) : null}
                </div>

                {/* Assigned Manager */}
                <div className="space-y-1 relative">
                  <label className="mnx-label block">Assigned Manager *</label>
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
                    className={CHA_CREATE_INPUT_CLASS}
                  />
                  {showManagerDropdown ? (
                    <div className="mnx-floating-surface mnx-cha-menu mnx-cha-autocomplete absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto p-2">
                      {filteredManagers.length > 0 ? (
                        filteredManagers.map((manager) => (
                          <Button
                            key={manager.id}
                            type="button"
                            onClick={() => selectManager(manager)}
                            className="mnx-cha-menu-option justify-between"
                          >
                            <span>{manager.name}</span>
                            <span className="text-[10px] mnx-text-muted">
                              {manager.email}
                            </span>
                          </Button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs italic mnx-text-muted">
                          No matching managers found.
                        </div>
                      )}
                    </div>
                  ) : null}
                  {newManagerId ? (
                    <p className="text-xs mnx-text-muted">
                      Selected manager:{" "}
                      <span className="mnx-text-primary">{managerSearch}</span>
                    </p>
                  ) : null}
                </div>

                {/* Estimated Closure Date */}
                <div className="space-y-1">
                  <label className="mnx-label block">
                    Estimated Closure Date (Benchmark) *
                  </label>
                  <DateInput
                    required
                    value={estimatedClosureDate}
                    onChange={(e) => setEstimatedClosureDate(e.target.value)}
                    className={CHA_CREATE_INPUT_CLASS}
                  />
                </div>
              </div>

              {/* Team Assignments Mapping */}
              <div className="space-y-3 pt-2">
                <div className="border-b mnx-border-accent pb-3">
                  <label className="mnx-label block">
                    Team Assignments Mapping
                  </label>
                  <p className="text-xs mnx-text-muted mt-0.5">
                    Type employee name and press **Enter** (or select from list)
                    to add them.
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
                          (g) =>
                            g.name.toLowerCase() ===
                            teamSearch.trim().toLowerCase(),
                        );
                        if (matchedGroup) {
                          handleAddTeamGroup(matchedGroup);
                        } else {
                          const matchedUser = filteredTeamUsers.find(
                            (u) =>
                              u.name.toLowerCase() ===
                              teamSearch.trim().toLowerCase(),
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
                    className={CHA_CREATE_INPUT_CLASS}
                  />
                  {showTeamDropdown && teamSearch.trim() !== "" && (
                    <div className="mnx-floating-surface mnx-cha-menu mnx-cha-autocomplete absolute left-0 right-0 z-50 mt-2 max-h-60 space-y-2 overflow-y-auto p-2">
                      {filteredTeamGroups.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] mnx-text-muted">
                            Team Groups
                          </div>
                          {filteredTeamGroups.map((g) => (
                            <Button
                              key={g.id}
                              type="button"
                              onClick={() => handleAddTeamGroup(g)}
                              className="mnx-cha-menu-option justify-between text-xs font-semibold"
                            >
                              <span>{g.name}</span>
                              <span className="rounded-full mnx-bg-accent-soft px-2 py-1 text-[10px] font-semibold mnx-text-muted">
                                GROUP ({parseJsonArray(g.memberIds).length})
                              </span>
                            </Button>
                          ))}
                        </div>
                      )}

                      <div>
                        {filteredTeamGroups.length > 0 && (
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] mnx-text-muted">
                            Individual Employees
                          </div>
                        )}
                        {filteredTeamUsers.map((u) => (
                          <Button
                            key={u.id}
                            type="button"
                            onClick={() => handleAddTeamUser(u)}
                            className="mnx-cha-menu-option justify-between text-xs"
                          >
                            {u.name} ({u.email})
                          </Button>
                        ))}
                      </div>

                      {filteredTeamUsers.length === 0 &&
                        filteredTeamGroups.length === 0 && (
                          <div className="p-3 text-xs mnx-text-muted italic">
                            No matching results found.
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Display Assigned Team Members as Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {assignments.map((assignment, index) => {
                    const emp = options.users.find(
                      (u) => u.id === assignment.userId,
                    );
                    return (
                      <div
                        key={assignment.userId || index}
                        className="flex items-center justify-between gap-3 rounded-xl border mnx-border-accent mnx-bg-accent-soft p-4 mnx-shadow-panel transition"
                      >
                        <div className="space-y-1 flex-1 mr-3">
                          <span className="text-xs font-semibold mnx-text-primary block">
                            {emp?.name || "Unknown Employee"}
                          </span>
                          <DropdownSelect
                            value={assignment.responsibility}
                            onValueChange={(val) =>
                              handleAssignmentChange(
                                index,
                                "responsibility",
                                val,
                              )
                            }
                            triggerClassName={cn(
                              CHA_CREATE_SELECT_CLASS,
                              "!h-10 !rounded-xl !text-xs",
                            )}
                            options={[
                              {
                                value: "OPERATIONS",
                                label: "OPERATIONS (Operations Executive)",
                              },
                              {
                                value: "APPROVAL",
                                label: "APPROVAL (Review Manager)",
                              },
                              {
                                value: "FILING",
                                label: "FILING (Customs Representative)",
                              },
                              {
                                value: "ACCOUNTS",
                                label: "ACCOUNTS (Accounts Executive)",
                              },
                              {
                                value: "CUSTOMER_SERVICE",
                                label: "CUSTOMER SERVICE",
                              },
                            ]}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          mode="icon"
                          size="md"
                          onClick={() => handleRemoveAssignment(index)}
                          aria-label="Remove assignment"
                          className="mnx-plain !h-10 !w-10 !min-w-10 shrink-0 rounded-xl border mnx-border-danger mnx-bg-surface !px-0 mnx-text-danger shadow-sm mnx-hover-danger mnx-hover-danger mnx-hover-danger mnx-shadow-panel"
                        >
                          <Trash2 className="size-5" strokeWidth={2.1} />
                        </Button>
                      </div>
                    );
                  })}
                  {assignments.length === 0 && (
                    <p className="col-span-2 rounded-xl border border-dashed mnx-border-accent mnx-bg-accent-soft p-3 text-center text-xs italic mnx-text-muted">
                      No team members assigned yet. Add one above.
                    </p>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-2 pt-2">
                <label className="mnx-label block">
                  Final Notes &amp; Details
                </label>
                <p className="text-xs mnx-text-muted">
                  Special shipment instructions, customs remarks, discharge
                  notes, or operational handling context.
                </p>
                <Textarea
                  rows={4}
                  placeholder="Capture customs instructions, discharge context, free-day details, or any operational remarks the assigned team should see."
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className={CHA_CREATE_TEXTAREA_CLASS}
                />
              </div>
            </div>
          </div>
          <footer>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Launching job..." : "Create & launch job"}
            </Button>
          </footer>
        </form>
      </ChaDialogLayer>

      <CreateJobSuccessOverlay
        open={showSuccessAnimation}
        summary={createdJobSummary}
        onOpenJob={() => finishCreateFlow(true)}
        onCreateAnother={() => finishCreateFlow(false)}
        onAutoFinish={() => finishCreateFlow(false)}
        reducedMotion={!!reducedMotion}
      />
    </>
  );
}
