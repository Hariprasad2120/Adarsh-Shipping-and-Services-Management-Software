"use client";

import { DateInput } from "@/components/ui/date-input";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  X,
  FilePlus,
  Trash2,
  Sparkles,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronsRight,
  CircleDot,
  Clock3,
  FileText,
  MapPinned,
  Package2,
  Plane,
  Rocket,
  Route,
  Search,
  ShieldCheck,
  Ship,
  TrainFront,
  Truck,
  UserRound,
  Users2,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {createJobAction,createJobTypeAction,createShipmentTypeAction,getNextJobNumberPreviewAction,} from "@/modules/cha/actions";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ADD_NEW_JOB_TYPE = "__add_new_job_type__";
const ADD_NEW_SHIPMENT_TYPE = "__add_new_shipment_type__";
const ALWAYS_VISIBLE_OWNER_MANAGER_EMAILS = ["hr@adarshshipping.in"];
const CHA_CREATE_TEXTAREA_CLASS =
  "min-h-[112px] w-full rounded-[18px] border border-[var(--cha-create-border)] bg-[var(--cha-create-card)] px-4 py-3 text-sm text-[var(--cha-create-text)] shadow-[0_16px_36px_-34px_rgba(15,23,42,0.24)] outline-none transition placeholder:text-[var(--cha-create-muted)] focus:border-[var(--cha-create-primary)] focus:ring-4 focus:ring-[var(--cha-create-ring)] dark:shadow-[0_24px_60px_-42px_rgba(2,6,23,0.9)]";
const CHA_CREATE_INPUT_CLASS =
  "!h-11 !rounded-[18px] !border-[var(--cha-create-border)] !bg-[var(--cha-create-card)] !text-[var(--cha-create-text)] !shadow-[0_14px_34px_-32px_rgba(15,23,42,0.22)] placeholder:!text-[var(--cha-create-muted)] focus:!border-[var(--cha-create-primary)] focus:!ring-4 focus:!ring-[var(--cha-create-ring)] dark:!shadow-[0_24px_60px_-42px_rgba(2,6,23,0.9)]";
const CHA_CREATE_SELECT_CLASS =
  "!h-11 !rounded-[18px] !border-[var(--cha-create-border)] !bg-[var(--cha-create-card)] !text-[var(--cha-create-text)] !shadow-[0_14px_34px_-32px_rgba(15,23,42,0.22)] hover:!border-[var(--cha-create-primary-border)] hover:!bg-[var(--cha-create-card-alt)] focus-visible:!border-[var(--cha-create-primary)] focus-visible:!ring-4 focus-visible:!ring-[var(--cha-create-ring)] dark:!shadow-[0_24px_60px_-42px_rgba(2,6,23,0.9)]";

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
        tone:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/12 dark:text-red-200",
      };
    case "LOW":
      return {
        badge: "P3",
        tone:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/12 dark:text-slate-200",
      };
    case "MEDIUM":
    default:
      return {
        badge: "P2",
        tone:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/12 dark:text-amber-200",
      };
  }
}

function getShipmentVisual(shipmentTypeName: string) {
  const normalized = shipmentTypeName.toLowerCase();
  if (normalized.includes("air")) return { Icon: Plane, label: "Air shipment" };
  if (normalized.includes("road") || normalized.includes("truck")) return { Icon: Truck, label: "Road shipment" };
  if (normalized.includes("rail") || normalized.includes("train")) return { Icon: TrainFront, label: "Rail shipment" };
  return { Icon: Ship, label: "Sea shipment" };
}

function CreateJobBenefit({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Clock3;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-[16px] border border-[var(--cha-create-primary-border)] bg-[var(--cha-create-primary-soft)] text-[var(--cha-create-primary)]">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--cha-create-text)]">{title}</p>
        <p className="truncate text-xs text-[var(--cha-create-secondary)]">{description}</p>
      </div>
    </div>
  );
}

function CreateJobSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Users2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 border-t border-[var(--cha-create-divider)] pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cha-create-primary-border)] bg-[var(--cha-create-primary-soft)] text-[var(--cha-create-primary)]">
          <Icon size={18} />
        </span>
        <h3 className="text-base font-semibold uppercase tracking-[0.04em] text-[var(--cha-create-text)]">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function CreateJobFieldLabel({
  label,
  required,
  helper,
}: {
  label: string;
  required?: boolean;
  helper?: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <label className="text-sm font-medium text-[var(--cha-create-text)]">
        {label}
        {required ? <span className="ml-1 text-[var(--cha-create-primary)]">*</span> : null}
      </label>
      {helper ? <span className="text-xs text-[var(--cha-create-muted)]">{helper}</span> : null}
    </div>
  );
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

  const { Icon: TransportIcon, label: transportLabel } = getShipmentVisual(summary.shipmentTypeName);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/78 p-3 backdrop-blur-md sm:p-4"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-[24px] border border-[rgba(148,163,184,0.18)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))] p-5 text-slate-50 shadow-[0_32px_100px_-38px_rgba(15,23,42,0.95)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px] sm:p-8"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-50">
              <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),transparent_60%)]" />
              <div className="absolute right-10 top-8 h-40 w-80 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18),transparent_70%)] blur-2xl" />
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(191,219,254,0.5) 1px, transparent 0)",
                  backgroundSize: "28px 28px",
                }}
              />
            </div>

            <div className="relative space-y-5 sm:space-y-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    <CircleDot size={12} />
                    Workflow launched
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Customs Clearance Job Created
                  </h2>
                  <p className="max-w-2xl text-sm text-slate-300">
                    The shipment workflow has been initialized successfully.
                  </p>
                </div>
                <motion.button
                  animate={reducedMotion ? { scale: 1 } : { scale: [1, 1.04, 1] }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(96,165,250,0.24)] bg-[rgba(37,99,235,0.18)] text-[var(--cha-create-success-primary,#60A5FA)] shadow-[0_0_0_10px_rgba(37,99,235,0.08)] sm:h-14 sm:w-14"
                  transition={reducedMotion ? { duration: 0 } : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  type="button"
                >
                  <CheckCircle2 size={24} />
                </motion.button>
              </div>

              <div className="rounded-[20px] border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.72)] p-4 sm:rounded-[24px] sm:p-6">
                <div className="relative overflow-hidden rounded-[20px] border border-[rgba(96,165,250,0.16)] bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.9))] px-4 py-5 sm:rounded-[22px] sm:px-5 sm:py-6">
                  <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-[rgba(96,165,250,0.35)] sm:inset-x-10" />
                  <div className="absolute left-8 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_0_8px_rgba(16,185,129,0.12)] sm:left-12" />
                  <div className="absolute right-8 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_0_8px_rgba(16,185,129,0.12)] sm:right-12" />

                  {reducedMotion ? (
                    <div className="relative grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Origin</p>
                        <p className="mt-1 text-sm font-semibold text-white">Job Initialized</p>
                      </div>
                      <div className="flex items-center justify-center rounded-full border border-[rgba(96,165,250,0.24)] bg-[rgba(37,99,235,0.18)] p-3 text-[var(--cha-create-success-primary,#60A5FA)]">
                        <TransportIcon size={22} />
                      </div>
                      <div className="md:text-right">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Destination</p>
                        <p className="mt-1 text-sm font-semibold text-white">Workflow Active</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-20 sm:h-24">
                      <motion.div
                        animate={{ x: ["0%", "88%"] }}
                        className="absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-3 rounded-full border border-[rgba(96,165,250,0.24)] bg-[rgba(15,23,42,0.92)] px-4 py-2 text-[var(--cha-create-success-primary,#60A5FA)] shadow-[0_20px_40px_-28px_rgba(37,99,235,0.7)]"
                        initial={{ x: "0%" }}
                        transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
                      >
                        <TransportIcon size={20} />
                        <span className="text-xs font-semibold uppercase tracking-[0.16em]">{transportLabel}</span>
                      </motion.div>
                      <div className="absolute inset-x-8 top-1/2 flex -translate-y-1/2 items-center justify-between">
                        {["Job created", "Documents initialized", "Team assigned", "Workflow launched"].map((label, index) => (
                          <motion.div
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-2"
                            initial={{ opacity: 0.25, scale: 0.92 }}
                            key={label}
                            transition={{ delay: 0.28 + index * 0.18, duration: 0.24 }}
                          >
                            <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_0_8px_rgba(16,185,129,0.14)]" />
                            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {[
                  { label: "Job Number", value: summary.jobNumber },
                  { label: "Customer", value: summary.customerName },
                  { label: "Shipment Type", value: summary.shipmentTypeName },
                  { label: "Assigned Manager", value: summary.managerName },
                ].map((item) => (
                  <div
                    className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.68)] px-4 py-3"
                    key={item.label}
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Redirecting back to CHA shortly.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="ds-plain rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.72)] px-5 py-2.5 text-sm text-white hover:border-[rgba(96,165,250,0.32)] hover:bg-[rgba(15,23,42,0.88)]"
                    onClick={onCreateAnother}
                    type="button"
                  >
                    Create Another Job
                  </Button>
                  <Button
                    className="!border-[var(--cha-create-success-primary,#60A5FA)] !bg-[var(--cha-create-success-primary,#2563EB)] !text-white hover:!bg-[#1D4ED8]"
                    onClick={onOpenJob}
                    type="button"
                  >
                    Open Job
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </div>
            </div>

            <button
              aria-label="Close success state"
              className="absolute right-4 top-4 rounded-full border border-transparent p-2 text-slate-400 transition hover:border-[rgba(148,163,184,0.2)] hover:text-white"
              onClick={onAutoFinish}
              type="button"
            >
              <X size={18} />
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

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
  const reducedMotion = useReducedMotion();
  const draftRestoredRef = useRef(false);
  const createdCustomerAppliedRef = useRef(false);
  const autoAddedManagerIdRef = useRef<string>("");
  const previousGeneratedPreviewRef = useRef("");
  const successRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form State
  const [newJobNumber, setNewJobNumber] = useState("");
  const [jobNumberMode, setJobNumberMode] = useState<"SYSTEM" | "MANUAL">("SYSTEM");
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

  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [createdJobSummary, setCreatedJobSummary] = useState<CreatedJobSummary | null>(null);

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
      const defaultOwner = (options.managers || []).find((user) => user.id === currentUserId);
      setOwnerSearch(defaultOwner ? `${defaultOwner.name} (${defaultOwner.email})` : "");
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
    const defaultOwner = displayedManagers.find((user) => user.id === currentUserId);
    setNewOwnerId(currentUserId);
    setOwnerSearch(defaultOwner ? `${defaultOwner.name} (${defaultOwner.email})` : "");
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
    successRedirectTimerRef.current = setTimeout(() => {
      finishCreateFlow(false);
    }, reducedMotion ? 1400 : 2600);
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
    if (jobNumberMode === "MANUAL" && !newJobNumber.trim()) {
      toast.error("Enter a manual job number or switch back to system-generated numbering.");
      return;
    }

    const validAssignments = assignments.filter((a) => a.userId.trim() !== "");

    setCreating(true);
    try {
      const res = await createJobAction({
        jobNumber: jobNumberMode === "MANUAL" ? newJobNumber.trim() || undefined : undefined,
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
        const shipmentTypeName =
          shipmentTypesList.find((shipmentType) => shipmentType.id === newShipmentTypeId)?.name ||
          "Shipment";
        const managerName =
          displayedManagers.find((manager) => manager.id === newManagerId)?.name ||
          "Assigned Manager";
        setCreatedJobSummary({
          id: res.data.id,
          jobNumber: res.data.jobNumber,
          customerName: selectedCustomerName || options.customers.find((customer) => customer.id === newCustomerId)?.name || "Customer",
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

  const priorityPresentation = getPriorityPresentation(newPriority);
  const activeShipmentTypeName =
    shipmentTypesList.find((shipmentType) => shipmentType.id === newShipmentTypeId)?.name || "Sea Freight";
  const ActiveShipmentIcon = getShipmentVisual(activeShipmentTypeName).Icon;
  const activeBranch = options.branches.find((branch) => branch.id === newBranchId);
  const activeCustomer = options.customers.find((customer) => customer.id === newCustomerId);

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(2,6,23,0.66)] p-4 backdrop-blur-md animate-in fade-in duration-200"
        style={
          {
            "--cha-create-primary": "#2563EB",
            "--cha-create-primary-hover": "#1D4ED8",
            "--cha-create-primary-active": "#1E40AF",
            "--cha-create-primary-soft": "#EFF6FF",
            "--cha-create-primary-border": "#BFDBFE",
            "--cha-create-card": "#FFFFFF",
            "--cha-create-card-alt": "#F8FAFC",
            "--cha-create-text": "#0F172A",
            "--cha-create-secondary": "#475569",
            "--cha-create-muted": "#64748B",
            "--cha-create-border": "#E2E8F0",
            "--cha-create-divider": "rgba(148,163,184,0.22)",
            "--cha-create-ring": "rgba(37,99,235,0.16)",
          } as React.CSSProperties
        }
      >
        <div className="flex min-h-[calc(100dvh-2rem)] items-start justify-center py-2 sm:items-center sm:py-3">
          <div className="flex h-[calc(100dvh-1rem)] w-full max-w-[1120px] flex-col overflow-hidden rounded-[26px] border border-[var(--cha-create-border)] bg-[var(--cha-create-card)] shadow-[0_28px_82px_-42px_rgba(15,23,42,0.4)] dark:border-[#263449] dark:bg-[#111827] dark:[--cha-create-primary:#60A5FA] dark:[--cha-create-primary-hover:#93C5FD] dark:[--cha-create-primary-active:#3B82F6] dark:[--cha-create-primary-soft:rgba(37,99,235,0.16)] dark:[--cha-create-primary-border:#263449] dark:[--cha-create-card:#111827] dark:[--cha-create-card-alt:#0F172A] dark:[--cha-create-text:#F8FAFC] dark:[--cha-create-secondary:#CBD5E1] dark:[--cha-create-muted:#94A3B8] dark:[--cha-create-border:#263449] dark:[--cha-create-divider:rgba(148,163,184,0.18)] dark:[--cha-create-ring:rgba(96,165,250,0.18)] sm:h-[calc(100dvh-2rem)]">
            <div className="relative overflow-hidden border-b border-[var(--cha-create-divider)] bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(248,250,252,0.92)_52%,rgba(219,234,254,0.68))] px-5 py-4 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94)_48%,rgba(30,41,59,0.96))] sm:px-6">
              <div className="pointer-events-none absolute inset-y-0 right-0 w-[34%] overflow-hidden opacity-90">
                <svg className="absolute inset-0 h-full w-full" fill="none" viewBox="0 0 540 220">
                  <path d="M40 152C96 116 156 102 214 108C262 112 314 136 382 126C432 118 472 84 514 48" stroke="rgba(37,99,235,0.28)" strokeDasharray="6 8" strokeLinecap="round" strokeWidth="2" />
                  <path d="M82 176C144 142 214 142 272 158C340 176 400 174 468 136" stroke="rgba(59,130,246,0.18)" strokeDasharray="4 10" strokeLinecap="round" strokeWidth="2" />
                </svg>
                <div className="absolute right-[20%] top-[22%] text-[var(--cha-create-primary)]/60"><Plane size={18} /></div>
                <div className="absolute right-[38%] top-[62%] text-[var(--cha-create-primary)]/60"><Ship size={18} /></div>
                <div className="absolute right-[8%] top-[46%] text-[var(--cha-create-primary)]/60"><Package2 size={18} /></div>
              </div>
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="max-w-[620px] space-y-3 pr-2">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] border border-[var(--cha-create-primary-border)] bg-[var(--cha-create-primary-soft)] text-[var(--cha-create-primary)] shadow-[0_16px_34px_-28px_rgba(37,99,235,0.48)]">
                    <FilePlus size={21} />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="max-w-[520px] text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--cha-create-text)] sm:text-[24px]">
                      Initialize Customs Clearance Job
                    </h2>
                    <p className="max-w-[520px] text-[13px] leading-5 text-[var(--cha-create-secondary)]">
                      Start a new CHA shipment workflow and capture initial details.
                    </p>
                  </div>
                </div>
                <div className="relative z-10 flex shrink-0 items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleDemoFill} className="rounded-[16px] border-[var(--cha-create-border)] bg-[var(--cha-create-card)]/84 px-3 text-[var(--cha-create-text)] hover:border-[var(--cha-create-primary-border)] hover:bg-[var(--cha-create-primary-soft)]"><Sparkles size={13} className="mr-1.5" />Demo Fill</Button>
                  <button onClick={() => onOpenChange(false)} className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--cha-create-border)] bg-[var(--cha-create-card)]/88 text-[var(--cha-create-secondary)] transition hover:border-[var(--cha-create-primary-border)] hover:bg-[var(--cha-create-primary-soft)] hover:text-[var(--cha-create-primary)]" type="button" aria-label="Close job creation dialog"><X size={17} /></button>
                </div>
              </div>
              <div className="relative z-10 mt-4 grid gap-1 rounded-[18px] border border-[var(--cha-create-primary-border)] bg-[rgba(255,255,255,0.72)] p-1.5 shadow-[0_18px_36px_-34px_rgba(37,99,235,0.26)] backdrop-blur-sm dark:bg-[rgba(15,23,42,0.62)] md:grid-cols-3">
                <CreateJobBenefit icon={Route} title="End-to-end visibility" description="Track every milestone" />
                <CreateJobBenefit icon={BadgeCheck} title="Compliance first" description="Built-in validations and documents" />
                <CreateJobBenefit icon={Rocket} title="Operational excellence" description="Faster clearance, fewer delays" />
              </div>
            </div>
            <form onSubmit={handleCreateJob} className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <div className="rounded-[22px] border border-[var(--cha-create-border)] bg-[var(--cha-create-card-alt)] p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)] sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cha-create-divider)] pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cha-create-muted)]">Job Initialization</p>
                    <p className="mt-1 text-sm text-[var(--cha-create-secondary)]">Customer, numbering, shipment, and team configuration.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--cha-create-secondary)]">
                    <span className="rounded-full border border-[var(--cha-create-primary-border)] bg-[var(--cha-create-primary-soft)] px-3 py-1.5">{activeBranch?.name || 'Select branch'}</span>
                    <span className="rounded-full border border-[var(--cha-create-border)] bg-[var(--cha-create-card)] px-3 py-1.5">{activeCustomer?.name || 'Select customer'}</span>
                    <span className="rounded-full border border-[var(--cha-create-border)] bg-[var(--cha-create-card)] px-3 py-1.5 flex items-center gap-1.5"><ActiveShipmentIcon size={12} />{activeShipmentTypeName}</span>
                    <span className={cn('rounded-full border px-3 py-1.5 font-semibold', priorityPresentation.tone)}>{priorityPresentation.badge}</span>
                  </div>
                </div>
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
                  triggerClassName={CHA_CREATE_SELECT_CLASS}
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
                    className={CHA_CREATE_INPUT_CLASS}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoGenerateJobNumber}
                    disabled={!newBranchId || jobNumberPreviewLoading}
                    className="shrink-0 rounded-2xl border-[var(--cha-create-primary-border)] bg-[var(--cha-create-card)] text-[var(--cha-create-primary)] hover:bg-[var(--cha-create-primary-soft)]"
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
                    className={CHA_CREATE_TEXTAREA_CLASS}
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
                  className={CHA_CREATE_INPUT_CLASS}
                />
                {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-[20px] border border-[var(--cha-create-border)] bg-[var(--cha-create-card)] p-2 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.34)]">
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
                    className={CHA_CREATE_INPUT_CLASS}
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
                  <div className="rounded-[20px] border border-[var(--cha-create-primary-border)] bg-[var(--cha-create-primary-soft)] p-4 space-y-3">
                    <Input
                      type="text"
                      value={newJobTypeName}
                      onChange={(e) => setNewJobTypeName(e.target.value)}
                      placeholder="e.g. Transit Clearance"
                      className={CHA_CREATE_INPUT_CLASS}
                    />
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="ds-label block">Movement Direction</span>
                        <select
                          value={newJobTypeMovementDirection}
                          onChange={(e) => setNewJobTypeMovementDirection(e.target.value as "IMPORT" | "EXPORT" | "BOTH" | "OTHER")}
                          className={CHA_CREATE_INPUT_CLASS}
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
                          className={CHA_CREATE_INPUT_CLASS}
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
                        className={CHA_CREATE_INPUT_CLASS}
                      />
                    ) : null}
                    <Input
                      type="text"
                      value={newJobTypeManifestHelpText}
                      onChange={(e) => setNewJobTypeManifestHelpText(e.target.value)}
                      placeholder="Help text / placeholder"
                      className={CHA_CREATE_INPUT_CLASS}
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
                  triggerClassName={CHA_CREATE_SELECT_CLASS}
                  options={[
                    ...shipmentTypesList.map((shipmentType) => ({
                      value: shipmentType.id,
                      label: shipmentType.name,
                    })),
                    { value: ADD_NEW_SHIPMENT_TYPE, label: "+ Add New Shipment Type" },
                  ]}
                />
                {showAddShipmentType && (
                  <div className="rounded-[20px] border border-[var(--cha-create-primary-border)] bg-[var(--cha-create-primary-soft)] p-4 space-y-3">
                    <Input
                      type="text"
                      value={newShipmentTypeName}
                      onChange={(e) => setNewShipmentTypeName(e.target.value)}
                      placeholder="e.g. Rail"
                      className={CHA_CREATE_INPUT_CLASS}
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
                  className={CHA_CREATE_INPUT_CLASS}
                />
                {showOwnerDropdown ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-[20px] border border-[var(--cha-create-border)] bg-[var(--cha-create-card)] p-2 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.34)]">
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
                  className={CHA_CREATE_INPUT_CLASS}
                />
                {showManagerDropdown ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-[20px] border border-[var(--cha-create-border)] bg-[var(--cha-create-card)] p-2 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.34)]">
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
                  className={CHA_CREATE_INPUT_CLASS}
                />
              </div>
            </div>

            {/* Team Assignments Mapping */}
            <div className="space-y-3 pt-2">
              <div className="border-b border-[var(--cha-create-divider)] pb-3">
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
                  className={CHA_CREATE_INPUT_CLASS}
                />
                {showTeamDropdown && teamSearch.trim() !== "" && (
                  <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-[20px] border border-[var(--cha-create-border)] bg-[var(--cha-create-card)] p-2 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.34)] z-50 space-y-2">
                    {filteredTeamGroups.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cha-create-muted)]">Team Groups</div>
                        {filteredTeamGroups.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => handleAddTeamGroup(g)}
                            className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-xs font-semibold text-[var(--cha-create-text)] transition hover:bg-[var(--cha-create-primary-soft)] hover:text-[var(--cha-create-primary)]"
                          >
                            <span>{g.name}</span>
                            <span className="rounded-full bg-[var(--cha-create-card-alt)] px-2 py-1 text-[10px] font-semibold text-[var(--cha-create-muted)]">
                              GROUP ({parseJsonArray(g.memberIds).length})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div>
                      {filteredTeamGroups.length > 0 && (
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cha-create-muted)]">Individual Employees</div>
                      )}
                      {filteredTeamUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleAddTeamUser(u)}
                          className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-xs text-[var(--cha-create-text)] transition hover:bg-[var(--cha-create-primary-soft)] hover:text-[var(--cha-create-primary)]"
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
                      className="flex items-center justify-between gap-3 rounded-[22px] border border-[var(--cha-create-border)] bg-[var(--cha-create-card-alt)] p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.24)] transition"
                    >
                      <div className="space-y-1 flex-1 mr-3">
                        <span className="text-xs font-semibold text-on-surface block">
                          {emp?.name || "Unknown Employee"}
                        </span>
                        <DropdownSelect
                          value={assignment.responsibility}
                          onValueChange={(val) => handleAssignmentChange(index, "responsibility", val)}
                          triggerClassName={cn(CHA_CREATE_SELECT_CLASS, "!h-10 !rounded-xl !text-xs")}
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
                  <p className="col-span-2 rounded-[18px] border border-dashed border-[var(--cha-create-border)] bg-[var(--cha-create-card-alt)] p-3 text-center text-xs italic text-[var(--cha-create-muted)]">
                    No team members assigned yet. Add one above.
                  </p>
                )}
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2 pt-2">
              <label className="ds-label block">Final Notes &amp; Details</label>
              <p className="text-xs text-[var(--cha-create-secondary)]">
                Special shipment instructions, customs remarks, discharge notes, or operational handling context.
              </p>
              <textarea
                rows={4}
                placeholder="Capture customs instructions, discharge context, free-day details, or any operational remarks the assigned team should see."
                value={newRemarks}
                onChange={(e) => setNewRemarks(e.target.value)}
                className={CHA_CREATE_TEXTAREA_CLASS}
              />
            </div>

            {/* Action Buttons */}
              </div>

            <div className="shrink-0 border-t border-[var(--cha-create-divider)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.98))] pt-4 backdrop-blur-md dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.86),rgba(17,24,39,0.98))]">
              <div className="flex flex-col gap-3 rounded-[22px] border border-[var(--cha-create-border)] bg-[var(--cha-create-card)] p-3 shadow-[0_24px_54px_-38px_rgba(15,23,42,0.35)] dark:bg-[var(--cha-create-card-alt)] sm:p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3 rounded-[18px] border border-[var(--cha-create-primary-border)] bg-[var(--cha-create-primary-soft)] px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cha-create-primary-border)] bg-[var(--cha-create-card)] text-[var(--cha-create-primary)]">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--cha-create-text)]">Data Security</p>
                    <p className="text-xs text-[var(--cha-create-secondary)]">
                      Information is encrypted and access is role-based.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="rounded-2xl border-[var(--cha-create-border)] bg-transparent px-5 text-[var(--cha-create-secondary)] hover:border-[var(--cha-create-primary-border)] hover:text-[var(--cha-create-primary)]"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} className="rounded-2xl !border-[var(--cha-create-primary)] !bg-[var(--cha-create-primary)] px-6 !text-white shadow-[0_22px_46px_-28px_rgba(37,99,235,0.58)] hover:!bg-[var(--cha-create-primary-hover)]">
                    {creating ? "Launching Job..." : "Create & Launch Job"}
                  </Button>
                </div>
              </div>
            </div>
            </div>
          </form>
        </div>
        </div>
      </div>

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
