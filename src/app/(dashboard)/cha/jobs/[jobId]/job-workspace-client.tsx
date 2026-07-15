  "use client";

  import { DateInput } from "@/components/ui/date-input";
  import { useEffect, useMemo, useRef, useState, useTransition } from "react";
  import { useRouter } from "next/navigation";
  import { toast } from "sonner";
  import {FileText,Upload,CheckCircle2,AlertTriangle,FolderOpen,ArrowRight,ShieldCheck,AlertCircle,Plus,Trash2,Check,Database,ExternalLink,Undo2,Mail,History,ChevronDown,ChevronRight,Pencil,} from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { FileUploadField } from "@/components/ui/file-upload-field";
  import { Input } from "@/components/ui/input";
  import { Modal } from "@/components/ui/modal";
  import * as actions from "@/modules/cha/actions";
  import { DoValidityPanel } from "./do-validity-panel";
  import { NeonCheckbox } from "@/components/ui/neon-checkbox";
  import {
    ChaDueDateWarningNote,
  } from "@/app/(dashboard)/cha/_components/cha-due-date-warning-note";
  import type { DueDateWarningViewModel } from "@/app/(dashboard)/cha/_components/cha-due-date-warning-indicator";
  import {
    formatChaBadgeLabel,
    getChaDocumentStatusBadgeVariant,
    getChaJobStatusBadgeVariant,
  } from "@/lib/cha-badges";

  interface JobWorkspaceClientProps {
    job: any;
    users: { id: string; name: string; email: string }[];
    expenseCategories: string[];
    selfApprovalAllowed: boolean;
    currentUserId: string;
    canDeleteJob: boolean;
    canApproveDeleteJob: boolean;
    canDeleteDoc: boolean;
    canManageSettings: boolean;
    canInternalApproveChecklist: boolean;
    canCustomerApproveChecklist: boolean;
    canUpdateJob: boolean;
    internalApproversCount: number;
    initialTab?: string;
    focusField?: string;
    managers?: { id: string; name: string; email: string; branchId: string | null }[];
  }

  const STAGES = [
    { key: "DOCUMENT_COLLECTION", label: "Doc Collection" },
    { key: "ADDITIONAL_DATA", label: "Additional Data" },
    { key: "CHECKLIST_PREPARATION", label: "Checklist Prep" },
    { key: "CHECKLIST_APPROVAL", label: "Checklist Approval" },
    { key: "FILING", label: "Filing Stage" },
    { key: "FILED", label: "Filed / Complete" },
  ];

  type WorkspaceTab =
    | "docs"
    | "additionalData"
    | "checklist"
    | "filing"
    | "advances"
    | "expenses"
    | "audit";

  type ContainerEntry = {
    containerNumber: string;
  };


  type AdditionalDataDraft = {
    vesselInwardDate: string;
    importGeneralManifest: string;
    exportGeneralManifest: string;
    customManifestValue: string;
    containerEntries: ContainerEntry[];
    mblNumber: string;
    hblNumber: string;
    deliveryOrderValidity: string;
  };

  type FilingNodeDraft = {
    checklistResponses: Record<string, { isChecked: boolean; remarks?: string; fileKey?: string; delayRemarks?: string }>;
    filingFieldValues: Record<string, string>;
    filingToggleStates: Record<string, boolean>;
    filingToggleStateDetails: Record<string, { isEnabled: boolean; state: Record<string, unknown> | null }>;
    filingQueryDetails: string;
    filingQueryOfficerName: string;
    filingQueryReceivedAt: string;
    filingQueryReferenceNumber: string;
    filingQueryResponderNames: Record<string, string>;
    filingQueryStatusUpdates: Record<string, string>;
    filingQueryTitle: string;
    nodeRemarks: string;
    selectedNextNodeKey: string;
  };

  function getAdditionalDataDraftStorageKey(jobId: string) {
    return `cha_additional_data_draft:${jobId}`;
  }

  function formatSummaryList(items: string[]) {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  }

  function getFilingNodeDraftStorageKey(jobId: string, nodeRunId: string) {
    return `cha_filing_node_draft:${jobId}:${nodeRunId}`;
  }

  function getDefaultTabForStage(stage: string): WorkspaceTab {
    if (stage === "ADDITIONAL_DATA") return "additionalData";
    if (stage === "CHECKLIST_PREPARATION" || stage === "CHECKLIST_APPROVAL") return "checklist";
    if (stage === "FILING" || stage === "FILED") return "filing";
    return "docs";
  }

  function getValiditySummary(validityDate?: string | null) {
    if (!validityDate) return null;
    const parsed = new Date(validityDate);
    const today = new Date();
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const diffDays = Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return {
        tone: "destructive" as const,
        label: "Expired",
        detail: `Expired on ${parsed.toLocaleDateString("en-IN")}`,
      };
    }
    if (diffDays <= 4) {
      return {
        tone: "warning" as const,
        label: "Near Expiry",
        detail: `Expires in ${diffDays} day(s) on ${parsed.toLocaleDateString("en-IN")}`,
      };
    }
    return {
      tone: "neutral" as const,
      label: "Valid",
      detail: `Valid until ${parsed.toLocaleDateString("en-IN")}`,
    };
  }

  function getDefaultContainerEntry(): ContainerEntry {
    return {
      containerNumber: "",
    };
  }

  function normalizeContainerEntries(value: unknown): ContainerEntry[] {
    if (!Array.isArray(value)) {
      return [getDefaultContainerEntry()];
    }

    const normalized = value
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const containerNumber =
          "containerNumber" in entry && typeof entry.containerNumber === "string" ? entry.containerNumber : "";

        return {
          containerNumber,
        };
      })
      .filter((entry): entry is ContainerEntry => entry !== null);

    return normalized.length ? normalized : [getDefaultContainerEntry()];
  }

  function normalizeAdditionalDataDraft(value: unknown): AdditionalDataDraft | null {
    if (!value || typeof value !== "object") {
      return null;
    }

    const draft = value as Partial<AdditionalDataDraft>;

    return {
      vesselInwardDate: typeof draft.vesselInwardDate === "string" ? draft.vesselInwardDate : "",
      importGeneralManifest:
        typeof draft.importGeneralManifest === "string" ? draft.importGeneralManifest : "",
      exportGeneralManifest:
        typeof draft.exportGeneralManifest === "string" ? draft.exportGeneralManifest : "",
      customManifestValue: typeof draft.customManifestValue === "string" ? draft.customManifestValue : "",
      containerEntries: normalizeContainerEntries(draft.containerEntries),
      mblNumber: typeof draft.mblNumber === "string" ? draft.mblNumber : "",
      hblNumber: typeof draft.hblNumber === "string" ? draft.hblNumber : "",
      deliveryOrderValidity: typeof draft.deliveryOrderValidity === "string" ? draft.deliveryOrderValidity : "",
    };
  }

  function normalizeFilingNodeDraft(value: unknown): FilingNodeDraft | null {
    if (!value || typeof value !== "object") {
      return null;
    }

    const draft = value as Partial<FilingNodeDraft>;

    return {
      checklistResponses:
        draft.checklistResponses && typeof draft.checklistResponses === "object" ? draft.checklistResponses : {},
      filingFieldValues:
        draft.filingFieldValues && typeof draft.filingFieldValues === "object" ? draft.filingFieldValues : {},
      filingToggleStates:
        draft.filingToggleStates && typeof draft.filingToggleStates === "object" ? draft.filingToggleStates : {},
      filingToggleStateDetails:
        draft.filingToggleStateDetails && typeof draft.filingToggleStateDetails === "object"
          ? draft.filingToggleStateDetails
          : {},
      filingQueryDetails: typeof draft.filingQueryDetails === "string" ? draft.filingQueryDetails : "",
      filingQueryOfficerName: typeof draft.filingQueryOfficerName === "string" ? draft.filingQueryOfficerName : "",
      filingQueryReceivedAt: typeof draft.filingQueryReceivedAt === "string" ? draft.filingQueryReceivedAt : "",
      filingQueryReferenceNumber:
        typeof draft.filingQueryReferenceNumber === "string" ? draft.filingQueryReferenceNumber : "",
      filingQueryResponderNames:
        draft.filingQueryResponderNames && typeof draft.filingQueryResponderNames === "object"
          ? draft.filingQueryResponderNames
          : {},
      filingQueryStatusUpdates:
        draft.filingQueryStatusUpdates && typeof draft.filingQueryStatusUpdates === "object"
          ? draft.filingQueryStatusUpdates
          : {},
      filingQueryTitle: typeof draft.filingQueryTitle === "string" ? draft.filingQueryTitle : "",
      nodeRemarks: typeof draft.nodeRemarks === "string" ? draft.nodeRemarks : "",
      selectedNextNodeKey: typeof draft.selectedNextNodeKey === "string" ? draft.selectedNextNodeKey : "",
    };
  }

  function mergeFilingChecklistResponses(
    serverResponses: Record<string, { isChecked: boolean; remarks?: string; fileKey?: string; delayRemarks?: string }>,
    draftResponses: Record<string, { isChecked: boolean; remarks?: string; fileKey?: string; delayRemarks?: string }>,
  ) {
    const merged = { ...serverResponses };

    for (const [itemId, draftResponse] of Object.entries(draftResponses)) {
      const serverResponse = merged[itemId];
      if (!serverResponse) {
        merged[itemId] = draftResponse;
        continue;
      }

      merged[itemId] = {
        isChecked: draftResponse.isChecked ?? serverResponse.isChecked,
        remarks: draftResponse.remarks?.trim() ? draftResponse.remarks : serverResponse.remarks,
        fileKey: draftResponse.fileKey || serverResponse.fileKey,
        delayRemarks: draftResponse.delayRemarks?.trim() ? draftResponse.delayRemarks : serverResponse.delayRemarks,
      };
    }

    return merged;
  }

  function AdditionalDataStatCard({
    label,
    value,
    numeric = false,
  }: {
    label: string;
    value: string;
    numeric?: boolean;
  }) {
    return (
      <div className="card-cyan-outline card-top-accent rounded-xl border border-outline-variant/40 bg-surface p-3 shadow-sm">
        <span className="ds-label">{label}</span>
        <p className={`mt-1 text-sm text-on-surface ${numeric ? "ds-numeric" : ""}`}>{value}</p>
      </div>
    );
  }

  function SectionHeading({
    title,
    description,
    aside,
  }: {
    title: string;
    description?: string;
    aside?: React.ReactNode;
  }) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
            <span className="h-7 rounded-sm bg-[#00cec4]" aria-hidden="true" />
            <h3 className="ds-h3 text-on-surface">{title}</h3>
          </div>
          {description ? <p className="pl-[17px] text-xs text-on-surface-variant">{description}</p> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    );
  }

  function WarningNoteToggle({
    title,
    description,
    open,
    onToggle,
  }: {
    title: string;
    description: string;
    open: boolean;
    onToggle: () => void;
  }) {
    return (
      <div className="group/warning-note relative shrink-0">
        <button
          type="button"
          aria-label={title}
          aria-expanded={open}
          onClick={onToggle}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#fb923c]/45 bg-[#fb923c]/10 text-[#fb923c] shadow-sm transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00cec4]/30"
        >
          <AlertTriangle size={14} strokeWidth={2.2} />
        </button>
        <div
          className={`card-top-accent-orange absolute right-0 top-full z-20 mt-2 w-[20rem] max-w-[calc(100vw-2rem)] rounded-xl border border-[#fb923c]/30 bg-surface px-4 py-3 shadow-[0_20px_44px_-26px_rgba(251,146,60,0.45)] transition-all duration-200 ${
            open
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1 opacity-0 group-hover/warning-note:pointer-events-auto group-hover/warning-note:translate-y-0 group-hover/warning-note:opacity-100"
          }`}
        >
          <h4 className="ds-label !text-[#fb923c]">{title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-on-surface">{description}</p>
        </div>
      </div>
    );
  }

  function InfoNoteToggle({
    title,
    description,
    open,
    onToggle,
  }: {
    title: string;
    description: string;
    open: boolean;
    onToggle: () => void;
  }) {
    return (
      <div className="group/info-note relative shrink-0">
        <button
          type="button"
          aria-label={title}
          aria-expanded={open}
          onClick={onToggle}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#00cec4]/45 bg-[#00cec4]/10 text-[#00cec4] shadow-sm transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00cec4]/30"
        >
          <AlertCircle size={14} strokeWidth={2.2} />
        </button>
        <div
          className={`card-top-accent absolute right-0 top-full z-20 mt-2 w-[20rem] max-w-[calc(100vw-2rem)] rounded-xl border border-[#00cec4]/30 bg-surface px-4 py-3 shadow-[0_20px_44px_-26px_rgba(0,206,196,0.45)] transition-all duration-200 ${
            open
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1 opacity-0 group-hover/info-note:pointer-events-auto group-hover/info-note:translate-y-0 group-hover/info-note:opacity-100"
          }`}
        >
          <h4 className="ds-label !text-[#00cec4]">{title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-on-surface">{description}</p>
        </div>
      </div>
    );
  }

  export function JobWorkspaceClient({
    job,
    users,
    expenseCategories,
    currentUserId,
    canDeleteJob,
    canApproveDeleteJob,
    canDeleteDoc,
    canManageSettings,
    canInternalApproveChecklist,
    canCustomerApproveChecklist,
    canUpdateJob,
    internalApproversCount,
    initialTab,
    focusField,
    managers = [],
  }: JobWorkspaceClientProps) {
    const router = useRouter();
    const [, startRefreshTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
      if (initialTab && ["docs", "additionalData", "checklist", "filing", "advances", "expenses", "audit"].includes(initialTab)) {
        return initialTab as WorkspaceTab;
      }
      return getDefaultTabForStage(job.stage);
    });
    useEffect(() => {
      setActiveTab((currentTab) => {
        if (currentTab === "audit" || currentTab === "advances" || currentTab === "expenses") {
          return currentTab;
        }
        return getDefaultTabForStage(job.stage);
      });
    }, [job.stage]);

    // Submitting States
    const [loading, setLoading] = useState<string | null>(null);
    const [documentRequirements, setDocumentRequirements] = useState<any[]>(job.documentRequirements);

    // Manager Assignment State
    const [isEditingManager, setIsEditingManager] = useState(false);
    const [selectedManagerId, setSelectedManagerId] = useState(job.assignedManagerId || "");

    useEffect(() => {
      setSelectedManagerId(job.assignedManagerId || "");
    }, [job.assignedManagerId]);

    useEffect(() => {
      setDocumentRequirements(job.documentRequirements);
    }, [job.documentRequirements]);

    const filteredManagers = useMemo(() => {
      if (!managers) return [];
      const branchManagers = managers.filter((m: any) => m.branchId === job.branchId);
      return branchManagers.length > 0 ? branchManagers : managers;
    }, [managers, job.branchId]);

    const [section49Flag, setSection49Flag] = useState<any>(job.filingSection49Flag ?? null);
    const [showSection49Modal, setShowSection49Modal] = useState(false);
    const [section49Remarks, setSection49Remarks] = useState("");
    const [section49ValidityDate, setSection49ValidityDate] = useState(
      job.filingSection49Flag?.validityDate ? job.filingSection49Flag.validityDate.slice(0, 10) : "",
    );
    const [section49ExtensionDate, setSection49ExtensionDate] = useState("");
    const [section49ExtensionFile, setSection49ExtensionFile] = useState<File | null>(null);
    const [openWarningNote, setOpenWarningNote] = useState<"bill-filing" | "query-processing" | null>(null);
    const hasSavedAdditionalData = Boolean(job.additionalData?.updatedAt);
    const additionalDataStageLocked = job.stage === "FILING" || job.stage === "FILED";
    const [isAdditionalDataEditing, setIsAdditionalDataEditing] = useState(
      () => !hasSavedAdditionalData && !additionalDataStageLocked,
    );

    useEffect(() => {
      setSection49Flag(job.filingSection49Flag ?? null);
      setSection49ValidityDate(job.filingSection49Flag?.validityDate ? job.filingSection49Flag.validityDate.slice(0, 10) : "");
    }, [job.filingSection49Flag]);

    useEffect(() => {
      setIsAdditionalDataEditing(!Boolean(job.additionalData?.updatedAt) && job.stage !== "FILING" && job.stage !== "FILED");
    }, [job.id]);


    const [dueDateWarnings, setDueDateWarnings] = useState<DueDateWarningViewModel[]>(job.dueDateWarnings ?? []);

    useEffect(() => {
      setDueDateWarnings(job.dueDateWarnings ?? []);
    }, [job.dueDateWarnings]);

    const visibleDocumentRequirements = useMemo(() => {
      return documentRequirements.filter((req: any) => {
        const categoryName = req.requirementItem?.category?.name || req.category || "General Documents";
        if (categoryName !== "Customs Validity Documents") {
          return true;
        }

        const hasPersistedState =
          req.status !== "PENDING" || (Array.isArray(req.versions) && req.versions.length > 0) || !!req.exception;

        if (req.name === "Section 49") {
          return !!section49Flag?.isEnabled || hasPersistedState;
        }

        if (req.name === "Extension") {
          return true;
        }

        return true;
      });
    }, [
      documentRequirements,
      section49Flag?.isEnabled,
    ]);

    const bulkNaEligibleRequirements = useMemo(
      () =>
        visibleDocumentRequirements.filter(
          (req: any) => req.status !== "UPLOADED" && req.status !== "NOT_AVAILABLE",
        ),
      [visibleDocumentRequirements],
    );

    const firstUnresolvedMandatoryDocumentId = useMemo(() => {
      const unresolvedRequirement = visibleDocumentRequirements.find((req: any) => {
        const isExempted = req.status === "NOT_AVAILABLE" || !!req.exception;
        return req.isMandatory && req.status !== "UPLOADED" && !isExempted;
      });
      return unresolvedRequirement?.id ?? null;
    }, [visibleDocumentRequirements]);


    // Document Collection Form State
    const [exceptionReason, setExceptionReason] = useState("");
    const [activeDocReqId, setActiveDocReqId] = useState<string | null>(null);
    const [uploadDocumentModalReqId, setUploadDocumentModalReqId] = useState<string | null>(null);
    const [isCustomDocumentModalOpen, setIsCustomDocumentModalOpen] = useState(false);
    const [customDocumentName, setCustomDocumentName] = useState("");
    const [customDocumentFile, setCustomDocumentFile] = useState<File | null>(null);
    const [customerApprovalNow, setCustomerApprovalNow] = useState(() => Date.now());
    
    // Custom Document Requirements Configuration State additions
    const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
    const [viewingVersion, setViewingVersion] = useState<any | null>(null);
    const [proceedErrors, setProceedErrors] = useState<string[] | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(true);
    const [highlightedDocumentReqId, setHighlightedDocumentReqId] = useState<string | null>(null);
    const documentRequirementCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const uploadDocumentModalRequirement = uploadDocumentModalReqId
      ? documentRequirements.find((req) => req.id === uploadDocumentModalReqId) ?? null
      : null;

    useEffect(() => {
      if (viewingVersion) {
        setLoadingPreview(true);
      }
    }, [viewingVersion?.id]);

    useEffect(() => {
      if (initialTab && ["docs", "additionalData", "checklist", "filing", "advances", "expenses", "audit"].includes(initialTab)) {
        setActiveTab(initialTab as WorkspaceTab);
      }
      if (focusField === "deliveryOrderValidity" || focusField === "deliveryOrderExtensionDate") {
        const timer = setTimeout(() => {
          const input = document.getElementById(focusField);
          if (input instanceof HTMLInputElement) {
            input.scrollIntoView({ behavior: "smooth", block: "center" });
            input.focus();
            input.click();
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [initialTab, focusField]);

    useEffect(() => {
      if (!highlightedDocumentReqId || activeTab !== "docs") {
        return;
      }

      const timer = window.setTimeout(() => {
        const card = documentRequirementCardRefs.current[highlightedDocumentReqId];
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 180);

      return () => window.clearTimeout(timer);
    }, [activeTab, highlightedDocumentReqId]);

    useEffect(() => {
      if (highlightedDocumentReqId && highlightedDocumentReqId !== firstUnresolvedMandatoryDocumentId) {
        setHighlightedDocumentReqId(null);
      }
    }, [firstUnresolvedMandatoryDocumentId, highlightedDocumentReqId]);

    // Additional Data Form State
    const [vesselInwardDate, setVesselInwardDate] = useState(
      job.additionalData?.vesselInwardDate ? job.additionalData.vesselInwardDate.slice(0, 10) : ""
    );
    const [importGeneralManifest, setImportGeneralManifest] = useState(
      job.additionalData?.importGeneralManifest !== null && job.additionalData?.importGeneralManifest !== undefined
        ? String(job.additionalData.importGeneralManifest)
        : ""
    );
    const [exportGeneralManifest, setExportGeneralManifest] = useState(
      job.additionalData?.exportGeneralManifest !== null && job.additionalData?.exportGeneralManifest !== undefined
        ? String(job.additionalData.exportGeneralManifest)
        : ""
    );
    const [customManifestValue, setCustomManifestValue] = useState(
      job.additionalData?.customManifestValue !== null && job.additionalData?.customManifestValue !== undefined
        ? String(job.additionalData.customManifestValue)
        : ""
    );
    const [containerEntries, setContainerEntries] = useState<ContainerEntry[]>(
      normalizeContainerEntries(job.additionalData?.containerDetails)
    );
    const [mblNumber, setMblNumber] = useState(job.additionalData?.mblNumber || "");
    const [hblNumber, setHblNumber] = useState(job.additionalData?.hblNumber || "");
    const [deliveryOrderValidity, setDeliveryOrderValidity] = useState(
      job.additionalData?.deliveryOrderValidity ? job.additionalData.deliveryOrderValidity.slice(0, 10) : ""
    );
    const additionalDataDraftHydratedRef = useRef(false);
    const additionalDataDraftStorageKey = getAdditionalDataDraftStorageKey(job.id);
    const initialAdditionalDataDraft: AdditionalDataDraft = {
      vesselInwardDate: job.additionalData?.vesselInwardDate ? job.additionalData.vesselInwardDate.slice(0, 10) : "",
      importGeneralManifest:
        job.additionalData?.importGeneralManifest !== null && job.additionalData?.importGeneralManifest !== undefined
          ? String(job.additionalData.importGeneralManifest)
          : "",
      exportGeneralManifest:
        job.additionalData?.exportGeneralManifest !== null && job.additionalData?.exportGeneralManifest !== undefined
          ? String(job.additionalData.exportGeneralManifest)
          : "",
      customManifestValue:
        job.additionalData?.customManifestValue !== null && job.additionalData?.customManifestValue !== undefined
          ? String(job.additionalData.customManifestValue)
          : "",
      containerEntries: normalizeContainerEntries(job.additionalData?.containerDetails),
      mblNumber: job.additionalData?.mblNumber || "",
      hblNumber: job.additionalData?.hblNumber || "",
      deliveryOrderValidity: job.additionalData?.deliveryOrderValidity
        ? job.additionalData.deliveryOrderValidity.slice(0, 10)
        : "",
    };

    // Checklist Workflow State
    const [checklistFile, setChecklistFile] = useState<File | null>(null);
    const [checklistRemarks, setChecklistRemarks] = useState("");
    const [internalApprovalRemarks, setInternalApprovalRemarks] = useState("");
    const [customerApprovalRemarks, setCustomerApprovalRemarks] = useState("");
    const [customerMailSubject, setCustomerMailSubject] = useState("");
    const [customerMailBody, setCustomerMailBody] = useState("");
    const [customerMailAttachments, setCustomerMailAttachments] = useState<File[]>([]);

    // Filing Form State
    const [newEstFilingDate, setNewEstFilingDate] = useState("");
    const [filingRef, setFilingRef] = useState("");
    const [actualFilingDate, setActualFilingDate] = useState("");
    const [delayReason, setDelayReason] = useState("");
    const [filedBillCopyFile, setFiledBillCopyFile] = useState<File | null>(null);
    const [billOfEntryNumber, setBillOfEntryNumber] = useState(job.filing?.billOfEntryNumber || "");
    const [shippingBillNumber, setShippingBillNumber] = useState(job.filing?.shippingBillNumber || "");
    const filingShipmentType = job.shipmentType?.name?.trim() || job.filing?.filingShipmentType || "";

    // --- FILING WORKFLOW RUNNER STATES ---
    const [filingInstance, setFilingInstance] = useState<any>(null);
    const [activeNodeRun, setActiveNodeRun] = useState<any>(null);
    const [checklistResponses, setChecklistResponses] = useState<Record<string, { isChecked: boolean; remarks?: string; fileKey?: string; delayRemarks?: string }>>({});
    const [filingFieldValues, setFilingFieldValues] = useState<Record<string, string>>({});
    const [filingToggleStates, setFilingToggleStates] = useState<Record<string, boolean>>({});
    const [filingToggleStateDetails, setFilingToggleStateDetails] = useState<Record<string, { isEnabled: boolean; state: Record<string, unknown> | null }>>({});
    const [filingQueryTitle, setFilingQueryTitle] = useState("");
    const [filingQueryDetails, setFilingQueryDetails] = useState("");
    const [filingQueryReferenceNumber, setFilingQueryReferenceNumber] = useState("");
    const [filingQueryOfficerName, setFilingQueryOfficerName] = useState("");
  const [filingQueryReceivedAt, setFilingQueryReceivedAt] = useState("");
  const [filingQueryStatusUpdates, setFilingQueryStatusUpdates] = useState<Record<string, string>>({});
  const [filingQueryResponderNames, setFilingQueryResponderNames] = useState<Record<string, string>>({});
  const [executionTimelineModalOpen, setExecutionTimelineModalOpen] = useState(false);
  const [queryProcessingPanelExpanded, setQueryProcessingPanelExpanded] = useState(false);
    const [goBackOpen, setGoBackOpen] = useState(false);
    const [goBackReason, setGoBackReason] = useState("");
    const [selectedJumpBackNodeKey, setSelectedJumpBackNodeKey] = useState("");
    const [nodeRemarks, setNodeRemarks] = useState("");
    const [selectedNextNodeKey, setSelectedNextNodeKey] = useState<string>("");
    const filingDraftHydratedForRef = useRef<string | null>(null);
    const filingDraftStorageKey = activeNodeRun?.id ? getFilingNodeDraftStorageKey(job.id, activeNodeRun.id) : null;
    const activeWorkflowVersionNode = useMemo(() => {
      if (!activeNodeRun?.nodeKey) return null;
      return filingInstance?.version?.nodes?.find((node: any) => node.key === activeNodeRun.nodeKey) ?? null;
    }, [activeNodeRun?.nodeKey, filingInstance?.version?.nodes]);

    useEffect(() => {
      setBillOfEntryNumber(job.filing?.billOfEntryNumber || "");
      setShippingBillNumber(job.filing?.shippingBillNumber || "");
    }, [job.filing?.billOfEntryNumber, job.filing?.shippingBillNumber]);

    useEffect(() => {
      if (additionalDataDraftHydratedRef.current) return;

      additionalDataDraftHydratedRef.current = true;

      try {
        const savedDraft = localStorage.getItem(additionalDataDraftStorageKey);
        if (!savedDraft) return;

        const parsedDraft = normalizeAdditionalDataDraft(JSON.parse(savedDraft));
        if (!parsedDraft) {
          localStorage.removeItem(additionalDataDraftStorageKey);
          return;
        }

        setVesselInwardDate(parsedDraft.vesselInwardDate);
        setImportGeneralManifest(parsedDraft.importGeneralManifest);
        setExportGeneralManifest(parsedDraft.exportGeneralManifest);
        setCustomManifestValue(parsedDraft.customManifestValue);
        setContainerEntries(parsedDraft.containerEntries);
        setMblNumber(parsedDraft.mblNumber);
        setHblNumber(parsedDraft.hblNumber);
        setDeliveryOrderValidity(parsedDraft.deliveryOrderValidity);
      } catch {
        localStorage.removeItem(additionalDataDraftStorageKey);
      }
    }, [additionalDataDraftStorageKey]);

    const clearAdditionalDataDraft = () => {
      try {
        localStorage.removeItem(additionalDataDraftStorageKey);
      } catch {
        // localStorage unavailable
      }
    };

    useEffect(() => {
      if (!additionalDataDraftHydratedRef.current) return;

      const currentDraft: AdditionalDataDraft = {
        vesselInwardDate,
        importGeneralManifest,
        exportGeneralManifest,
        customManifestValue,
        containerEntries,
        mblNumber,
        hblNumber,
        deliveryOrderValidity,
      };

      try {
        if (JSON.stringify(currentDraft) === JSON.stringify(initialAdditionalDataDraft)) {
          localStorage.removeItem(additionalDataDraftStorageKey);
          return;
        }

        localStorage.setItem(additionalDataDraftStorageKey, JSON.stringify(currentDraft));
      } catch {
        // localStorage unavailable
      }
    }, [
      additionalDataDraftStorageKey,
      containerEntries,
      customManifestValue,
      deliveryOrderValidity,
      exportGeneralManifest,
      hblNumber,
      importGeneralManifest,
      initialAdditionalDataDraft,
      mblNumber,
      vesselInwardDate,
    ]);

    const outgoingEdges = useMemo(() => {
      if (!filingInstance || !activeNodeRun) return [];
      return filingInstance.version?.edges?.filter((e: any) => e.sourceKey === activeNodeRun.nodeKey) || [];
    }, [filingInstance, activeNodeRun]);

    const targetNodesMap = useMemo(() => {
      if (!filingInstance) return new Map();
      return new Map(filingInstance.version?.nodes?.map((n: any) => [n.key, n]) || []);
    }, [filingInstance]);

    const overdueChecklistItems = useMemo(() => filingInstance?.overdueItems || [], [filingInstance]);
    const overdueChecklistCount = overdueChecklistItems.length;
    const activeNodeAttachments = useMemo(
      () => filingInstance?.attachments?.filter((attachment: any) => attachment.nodeRunId === activeNodeRun?.id) || [],
      [activeNodeRun?.id, filingInstance?.attachments],
    );
    const activeNodeDocumentAttachmentsByKey = useMemo(() => {
      const map = new Map<string, any>();
      for (const attachment of activeNodeAttachments) {
        if (!attachment.documentRequirementKey) continue;
        const current = map.get(attachment.documentRequirementKey);
        if (!current) {
          map.set(attachment.documentRequirementKey, attachment);
          continue;
        }
        const currentUploadedAt = current.uploadedAt ? new Date(current.uploadedAt).getTime() : 0;
        const nextUploadedAt = attachment.uploadedAt ? new Date(attachment.uploadedAt).getTime() : 0;
        if (nextUploadedAt >= currentUploadedAt) {
          map.set(attachment.documentRequirementKey, attachment);
        }
      }
      return map;
    }, [activeNodeAttachments]);
    const activeChecklistItems = useMemo(
      () => activeNodeRun?.node?.checklistItems?.filter((item: any) => item.isActive !== false) || [],
      [activeNodeRun],
    );
    const checklistAttachmentsByItem = useMemo(() => {
      const map = new Map<string, any[]>();
      const attachments =
        filingInstance?.attachments?.filter((attachment: any) => attachment.nodeRunId === activeNodeRun?.id && attachment.checklistItemId) || [];

      for (const attachment of attachments) {
        const itemId = attachment.checklistItemId;
        if (!map.has(itemId)) {
          map.set(itemId, []);
        }
        map.get(itemId)?.push(attachment);
      }

      return map;
    }, [activeNodeRun?.id, filingInstance?.attachments]);
    const currentChecklistItemIndex = useMemo(() => {
      if (activeChecklistItems.length === 0) return -1;

      const getAttachmentCount = (itemId: string) => checklistAttachmentsByItem.get(itemId)?.length || 0;
      const isItemReady = (item: any) => {
        const resp = checklistResponses[item.id];
        if (!resp?.isChecked) return false;
        if (item.requiresRemarks && !resp.remarks?.trim()) return false;

        const overdueMeta = overdueChecklistItems.find((entry: any) => entry.checklistItemId === item.id);
        if (overdueMeta && item.delayRemarksRequired && !resp.delayRemarks?.trim()) return false;

        if (item.allowsUpload && (item.minUploads || 0) > 0 && getAttachmentCount(item.id) < item.minUploads) {
          return false;
        }

        return true;
      };

      const firstPendingIndex = activeChecklistItems.findIndex((item: any) => !isItemReady(item));
      return firstPendingIndex === -1 ? activeChecklistItems.length - 1 : firstPendingIndex;
    }, [activeChecklistItems, checklistAttachmentsByItem, checklistResponses, overdueChecklistItems]);
    const activeNodeQueries = useMemo(
      () => (filingInstance?.queries || []).filter((query: any) => query.nodeRunId === activeNodeRun?.id),
      [activeNodeRun?.id, filingInstance?.queries],
    );
    const activeNodeQueryMessages = useMemo(() => {
      const activeQueryIds = new Set(activeNodeQueries.map((query: any) => query.id));
      return (filingInstance?.queryMessages || []).filter((message: any) => activeQueryIds.has(message.queryId));
    }, [activeNodeQueries, filingInstance?.queryMessages]);
    const currentUserDisplayName = useMemo(
      () => users.find((user) => user.id === currentUserId)?.name || "Team Member",
      [currentUserId, users],
    );
    const activeNodeOpenQueries = useMemo(
      () => activeNodeQueries.filter((query: any) => query.status !== "CLOSED"),
      [activeNodeQueries],
    );
    const activeNodeFieldDefinitions = useMemo(() => {
      const raw =
        activeNodeRun?.node?.fieldDefinitionsJson ??
        activeNodeRun?.node?.fieldDefinitions ??
        activeWorkflowVersionNode?.fieldDefinitionsJson ??
        activeWorkflowVersionNode?.fieldDefinitions ??
        [];
      return Array.isArray(raw) ? raw : [];
    }, [
      activeNodeRun?.node?.fieldDefinitions,
      activeNodeRun?.node?.fieldDefinitionsJson,
      activeWorkflowVersionNode?.fieldDefinitions,
      activeWorkflowVersionNode?.fieldDefinitionsJson,
    ]);
    const activeNodeConditionalSections = useMemo(() => {
      const raw =
        activeNodeRun?.node?.conditionalSectionsJson ??
        activeNodeRun?.node?.conditionalSections ??
        activeWorkflowVersionNode?.conditionalSectionsJson ??
        activeWorkflowVersionNode?.conditionalSections ??
        [];
      return Array.isArray(raw) ? raw : [];
    }, [
      activeNodeRun?.node?.conditionalSections,
      activeNodeRun?.node?.conditionalSectionsJson,
      activeWorkflowVersionNode?.conditionalSections,
        activeWorkflowVersionNode?.conditionalSectionsJson,
    ]);
    const visibleNodeConditionalSections = useMemo(
      () =>
        activeNodeConditionalSections.filter((section: any) => {
          const key = typeof section?.key === "string" ? section.key.trim().toLowerCase() : "";
          const label = typeof section?.label === "string" ? section.label.trim().toLowerCase() : "";
          return key !== "query_processing" && key !== "section49" && label !== "customs query" && label !== "sec 49";
        }),
      [activeNodeConditionalSections],
    );
    const activeNodeDocumentRequirements = useMemo(() => {
      const raw =
        activeNodeRun?.node?.documentRequirementsJson ??
        activeNodeRun?.node?.documentRequirements ??
        activeWorkflowVersionNode?.documentRequirementsJson ??
        activeWorkflowVersionNode?.documentRequirements ??
        [];
      return Array.isArray(raw) ? raw : [];
    }, [
      activeNodeRun?.node?.documentRequirements,
      activeNodeRun?.node?.documentRequirementsJson,
      activeWorkflowVersionNode?.documentRequirements,
      activeWorkflowVersionNode?.documentRequirementsJson,
    ]);
    const activeNodeFieldKeys = useMemo(
      () => new Set(activeNodeFieldDefinitions.map((field: any) => field.key)),
      [activeNodeFieldDefinitions],
    );
    const activeNodeDisplayName = activeNodeRun?.node?.name || "";
    const activeNodePrerequisiteStatus = filingInstance?.activeNodePrerequisiteStatus || null;
    const pendingBlockedStage = filingInstance?.pendingBlockedStage || null;
    const canResumePendingBlockedStage = !!filingInstance?.canResumePendingBlockedStage;
    const jumpBackTargets = filingInstance?.jumpBackTargets || [];
    const isActiveStageBlocked = !!activeNodePrerequisiteStatus?.isBlocked;
    const hasShipmentBillNumberField = activeNodeFieldKeys.has("bill_number");
    const activeNodeHasConditionalFields = visibleNodeConditionalSections.some(
      (section: any) => Array.isArray(section?.unlocksFields) && section.unlocksFields.length > 0,
    );
    const activeNodeHasConditionalDocuments = visibleNodeConditionalSections.some(
      (section: any) => Array.isArray(section?.unlocksDocuments) && section.unlocksDocuments.length > 0,
    );
    const queryProcessingSection = useMemo(() => {
      return (
        activeNodeConditionalSections.find((section: any) => section?.key === "query_processing") ||
        activeNodeConditionalSections.find((section: any) => section?.config?.moduleType === "CUSTOMS_QUERY_PROCESSING") ||
        null
      );
    }, [activeNodeConditionalSections]);
    const queryProcessingEnabled = Boolean(queryProcessingSection || activeNodeRun);
    const queryProcessingToggleEnabled = Boolean(filingToggleStateDetails.query_processing?.isEnabled);
    const queryProcessingState = (filingToggleStateDetails.query_processing?.state as Record<string, unknown> | null) ?? null;
    const queryProcessingActive = queryProcessingEnabled && queryProcessingToggleEnabled;
    const queryProcessingStage = useMemo(() => {
      if (!queryProcessingActive) return "DISABLED";
      const persistedStage =
        typeof queryProcessingState?.stage === "string" && queryProcessingState.stage.trim()
          ? queryProcessingState.stage.trim().toUpperCase()
          : "";
      if (activeNodeOpenQueries.length > 0) {
        return persistedStage === "RESPONDED" ? "RESPONDED" : "OPEN";
      }
      if (persistedStage) {
        return persistedStage;
      }
      if (activeNodeQueries.some((query: any) => query.status === "CLOSED")) {
        return "CLEARED";
      }
      return "AWAITING_QUERY_DECISION";
    }, [activeNodeOpenQueries.length, activeNodeQueries, queryProcessingActive, queryProcessingState]);
    const primaryQuerySummary = activeNodeOpenQueries[0] || activeNodeQueries[0] || null;
    const querySummaryStatusLabel =
      queryProcessingStage === "RESPONDED"
        ? "Awaiting Customs Outcome"
        : queryProcessingStage === "OPEN"
          ? "Awaiting Response"
          : queryProcessingStage === "CLEARED"
            ? "Cleared"
            : queryProcessingStage === "NO_QUERY"
              ? "No Query Raised"
              : "Pending Decision";
    const queryProcessingResolved =
      !queryProcessingActive || queryProcessingStage === "NO_QUERY" || queryProcessingStage === "CLEARED";
    const isSavingQueryProcessingDecision = loading === "filing-toggle-query_processing";
    const filingPrimaryColumnClass = "w-full max-w-[680px] xl:col-start-1";
    const filingCompletionColumnClass = "w-full space-y-4 xl:col-start-2 xl:self-start";
    const queryProcessingWarning = !queryProcessingActive
      ? null
      : !queryProcessingResolved
        ? {
            title:
              activeNodeOpenQueries.length > 0
                  ? "Active Query Pending"
                  : queryProcessingStage === "RESPONDED"
                    ? "Awaiting Customs Outcome"
                    : "Query Decision Required",
              description:
                activeNodeOpenQueries.length > 0
                  ? "Resolve or clear the active customs query before moving to the next step."
                  : queryProcessingStage === "RESPONDED"
                    ? "Await the customs outcome and mark the query cleared once the offline response is accepted."
                    : "Record the customs query outcome before moving to the next step.",
            }
        : null;
    const stageSummaryItems = [
      activeChecklistItems.length > 0 ? "checks" : null,
      activeNodeFieldDefinitions.length > 0 || activeNodeHasConditionalFields ? "fields" : null,
      activeNodeDocumentRequirements.length > 0 ||
      activeNodeHasConditionalDocuments ||
      (activeNodeRun?.node?.photoRequirements?.length ?? 0) > 0
        ? "uploads"
        : null,
      queryProcessingActive ? "query updates" : null,
      activeNodeRun?.node?.commentsRequired ? "remarks" : null,
    ].filter((item): item is string => Boolean(item));
    const stageSummaryText =
      activeNodeRun?.node?.nodeType === "DECISION"
        ? "Choose the correct filing path below, then record remarks before routing this stage forward."
        : stageSummaryItems.length > 0
          ? `Complete the required ${formatSummaryList(stageSummaryItems)} below before moving this filing to the next stage.`
          : "Review this stage and record any completion notes before moving this filing to the next stage.";
    // Go-back is available on every filing stage that has a completed predecessor.
    const hasPreviousFilingStage =
      !!activeNodeRun &&
      (filingInstance?.nodeRuns || []).some(
        (run: any) => run.status === "COMPLETED" && run.nodeKey !== activeNodeRun.nodeKey,
      );

    useEffect(() => {
      setQueryProcessingPanelExpanded(false);
    }, [activeNodeRun?.id]);

    useEffect(() => {
      if (!queryProcessingActive) {
        setQueryProcessingPanelExpanded(false);
      }
    }, [queryProcessingActive]);


    // Customer Advance Form State
    const [expectedAdvance, setExpectedAdvance] = useState(
      job.customerAdvance?.expectedAmount ? Number(job.customerAdvance.expectedAmount) : 0
    );
    const [advanceDueDate, setAdvanceDueDate] = useState(
      job.customerAdvance?.dueDate ? job.customerAdvance.dueDate.slice(0, 10) : ""
    );
    const [advanceAssigneeId, setAdvanceAssigneeId] = useState(
      job.customerAdvance?.assignedUserId || ""
    );
    const [waiveAdvanceReason, setWaiveAdvanceReason] = useState("");
    const [showWaiveAdvance, setShowWaiveAdvance] = useState(false);

    // Advance Receipt Form State
    const [receiptAmount, setReceiptAmount] = useState("");
    const [receiptDate, setReceiptDate] = useState("");
    const [receiptMethod, setReceiptMethod] = useState("NEFT");
    const [receiptRef, setReceiptRef] = useState("");
    const [receiptRemarks, setReceiptRemarks] = useState("");

    // Expense Request Form State
    const [expenseUrgent, setExpenseUrgent] = useState(false);
    const [expenseUrgencyReason, setExpenseUrgencyReason] = useState("");
    const [expenseLines, setExpenseLines] = useState<
      { category: string; purpose: string; amount: string; requiredDate: string; remarks: string }[]
    >([{ category: expenseCategories[0] || "", purpose: "", amount: "", requiredDate: "", remarks: "" }]);

    // Expense Escalation Form State
    const [escUrgencyReason, setEscUrgencyReason] = useState("");
    const [escRequestId, setEscRequestId] = useState<string | null>(null);

    // Manager Review Checklist Comment
    const [mgrApprovalComment, setMgrApprovalComment] = useState("");

    // Payment Post Details Form State
    const [payRequestId, setPayRequestId] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [payDate, setPayDate] = useState("");
    const [payMethod, setPayMethod] = useState("BANK_TRANSFER");
    const [payRef, setPayRef] = useState("");

    // Query Form State
    const [queryRequestId, setQueryRequestId] = useState<string | null>(null);
    const [queryText, setQueryText] = useState("");
    const [resolveQueryId, setResolveQueryId] = useState<string | null>(null);
    const [resolutionText, setResolutionText] = useState("");

    // Administrative Expense Review Action State
    const [expReviewId, setExpReviewId] = useState<string | null>(null);
    const [expReviewStatus, setExpReviewStatus] = useState<string>("");
    const [expReviewRemarks, setExpReviewRemarks] = useState("");
    const [deleteModalMode, setDeleteModalMode] = useState<"delete" | "approve" | "reject" | null>(null);
    const [deleteConfirmJobNumber, setDeleteConfirmJobNumber] = useState("");
    const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
    const [deleteDecisionRemarks, setDeleteDecisionRemarks] = useState("");
    const [deleteDocModal, setDeleteDocModal] = useState<{
      reqId: string;
      versionId: string;
      fileName: string;
    } | null>(null);

    // Get active step index
    const activeStepIndex = STAGES.findIndex((s) => s.key === job.stage);
    const checklistStageIndex = STAGES.findIndex((s) => s.key === "CHECKLIST_PREPARATION");
    const filingStageIndex = STAGES.findIndex((s) => s.key === "FILING");
    const manifestRequirement = job.jobType?.manifestRequirement || null;
    const manifestMovementDirection = job.jobType?.movementDirection || null;
    const customManifestLabel = job.jobType?.customManifestLabel || "Custom Manifest";
    const manifestLabel =
      manifestRequirement === "IGM"
        ? "IGM Number"
        : manifestRequirement === "EGM"
          ? "EGM Number"
          : manifestRequirement === "BOTH"
            ? "IGM + EGM"
            : manifestRequirement === "CUSTOM"
              ? customManifestLabel
              : manifestRequirement === "NONE"
                ? "None"
                : "Not Configured";
    const manifestConfigMissing =
      !manifestMovementDirection ||
      !manifestRequirement ||
      (manifestRequirement === "CUSTOM" && !job.jobType?.customManifestLabel);
    const filingMovementDirection =
      manifestMovementDirection === "IMPORT" || manifestMovementDirection === "EXPORT"
        ? manifestMovementDirection
        : null;
    const isImportFiling = filingMovementDirection === "IMPORT";
    const isExportFiling = filingMovementDirection === "EXPORT";
    const filingBillNumberValue = isExportFiling ? shippingBillNumber : billOfEntryNumber;

    // Keep the bill number in sync between the filing stage input and the
    // shipment-level bill number field stored on the job.
    const setBillNumberEverywhere = (value: string) => {
      setFilingFieldValues((prev) => ({ ...prev, bill_number: value }));
      if (isExportFiling) {
        setShippingBillNumber(value);
        setBillOfEntryNumber("");
      } else {
        setBillOfEntryNumber(value);
        setShippingBillNumber("");
      }
    };

    // Seed the filing-stage bill number from the saved shipment bill number once
    // per active stage, so previously saved data stays visible.
    const billNumberSeededRunRef = useRef<string | null>(null);
    useEffect(() => {
      if (!activeNodeRun?.id) return;
      if (billNumberSeededRunRef.current === activeNodeRun.id) return;
      billNumberSeededRunRef.current = activeNodeRun.id;
      const savedBillNumber = filingBillNumberValue.trim();
      if (savedBillNumber) {
        setFilingFieldValues((prev) =>
          prev.bill_number?.trim() ? prev : { ...prev, bill_number: savedBillNumber },
        );
      }
    }, [activeNodeRun?.id, filingBillNumberValue]);
    const requiresIgm = manifestRequirement === "IGM" || manifestRequirement === "BOTH";
    const requiresEgm = manifestRequirement === "EGM" || manifestRequirement === "BOTH";
    const requiresCustomManifest = manifestRequirement === "CUSTOM";
    const manifestMandatory = job.jobType?.isManifestMandatory ?? false;
    const additionalDataComplete = Boolean(
      vesselInwardDate &&
      deliveryOrderValidity &&
      (!manifestMandatory || manifestRequirement === "NONE" || (
        (!requiresIgm || importGeneralManifest !== "") &&
        (!requiresEgm || exportGeneralManifest !== "") &&
        (!requiresCustomManifest || customManifestValue !== "")
      ))
    );
    const additionalDataLocked = additionalDataStageLocked || (hasSavedAdditionalData && !isAdditionalDataEditing);

    const addContainerEntry = () => {
      setContainerEntries((current) => [...current, getDefaultContainerEntry()]);
    };

    const updateContainerEntry = (index: number, field: keyof ContainerEntry, value: string) => {
      setContainerEntries((current) =>
        current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: value } : entry))
      );
    };

    const removeContainerEntry = (index: number) => {
      setContainerEntries((current) => {
        if (current.length === 1) {
          return [getDefaultContainerEntry()];
        }
        return current.filter((_, entryIndex) => entryIndex !== index);
      });
    };
    const populatedContainerCount = containerEntries.filter((entry) => entry.containerNumber.trim()).length;
    const manifestPreview = requiresCustomManifest
      ? customManifestValue || "Pending"
      : requiresIgm && requiresEgm
        ? `${importGeneralManifest || "IGM Pending"} / ${exportGeneralManifest || "EGM Pending"}`
        : requiresIgm
          ? importGeneralManifest || "Pending"
          : requiresEgm
            ? exportGeneralManifest || "Pending"
            : "Not Required";
    const blPreview = mblNumber || hblNumber
      ? [mblNumber && `MBL: ${mblNumber}`, hblNumber && `HBL: ${hblNumber}`].filter(Boolean).join(" / ")
      : "Pending";
    const activeDeletionRequest =
      job.deletionRequests?.find((request: any) => ["PENDING", "APPROVED"].includes(request.status)) ?? null;
    const pendingDeletionReview =
      job.deletionRequests?.find(
        (request: any) => request.status === "PENDING" && request.assignedManagerId === currentUserId
      ) ?? null;
    const canDirectDeleteJob =
      canApproveDeleteJob &&
      job.assignments?.some((assignment: any) => assignment.userId === currentUserId && assignment.responsibility === "APPROVAL");
    const deleteInputsMatch =
      deleteConfirmJobNumber.trim() === job.jobNumber &&
      deleteConfirmPhrase.trim().toLowerCase() === "delete job";
    const checklistWorkflow = job.checklistWorkflow ?? null;
    const currentChecklistVersion = checklistWorkflow?.currentFileVersion ?? checklistWorkflow?.fileVersions?.[0] ?? null;
    const checklistApprovals = checklistWorkflow?.approvals ?? [];
    const latestCustomerMailLog = checklistWorkflow?.customerMailLogs?.[0] ?? null;
    const customerApprovalVisibleAt = checklistWorkflow?.customerApprovalVisibleAt
      ? new Date(checklistWorkflow.customerApprovalVisibleAt)
      : latestCustomerMailLog?.approvalVisibleAt
      ? new Date(latestCustomerMailLog.approvalVisibleAt)
      : null;
    const customerApprovalDelayRemainingMs = customerApprovalVisibleAt
      ? Math.max(customerApprovalVisibleAt.getTime() - customerApprovalNow, 0)
      : 0;
    const customerApprovalDelayElapsed = customerApprovalVisibleAt ? customerApprovalDelayRemainingMs === 0 : false;
    const customerApprovalCountdown = customerApprovalVisibleAt
      ? `${String(Math.floor(customerApprovalDelayRemainingMs / 60000)).padStart(2, "0")}:${String(
          Math.floor((customerApprovalDelayRemainingMs % 60000) / 1000),
        ).padStart(2, "0")}`
      : null;
    useEffect(() => {
      setCustomerApprovalNow(Date.now());
    }, [checklistWorkflow?.currentApprovalStage, latestCustomerMailLog?.id, latestCustomerMailLog?.approvalVisibleAt]);

    useEffect(() => {
      if (
        checklistWorkflow?.currentApprovalStage !== "CUSTOMER" ||
        !latestCustomerMailLog ||
        !customerApprovalVisibleAt ||
        customerApprovalDelayElapsed
      ) {
        return;
      }

      const interval = window.setInterval(() => {
        setCustomerApprovalNow(Date.now());
      }, 1000);

      return () => window.clearInterval(interval);
    }, [
      checklistWorkflow?.currentApprovalStage,
      latestCustomerMailLog?.id,
      customerApprovalVisibleAt,
      customerApprovalDelayElapsed,
    ]);
    const currentInternalApprovals = checklistApprovals.filter(
      (approval: any) =>
        approval.fileVersionId === currentChecklistVersion?.id &&
        approval.stage === "INTERNAL",
    );
    const currentCustomerApprovals = checklistApprovals.filter(
      (approval: any) =>
        approval.fileVersionId === currentChecklistVersion?.id &&
        approval.stage === "CUSTOMER",
    );
    const approvedInternalDecision =
      currentInternalApprovals.find((approval: any) => approval.action === "APPROVED") ?? null;
    const approvedCustomerDecision =
      currentCustomerApprovals.find((approval: any) => approval.action === "APPROVED") ?? null;
    const getChecklistVersionStatus = (versionId?: string | null) => {
      if (!versionId) return null;
      const versionApprovals = checklistApprovals.filter((approval: any) => approval.fileVersionId === versionId);
      if (versionApprovals.some((approval: any) => approval.action === "REJECTED")) {
        return { label: "Rejected", variant: "destructive" as const };
      }
      if (versionApprovals.some((approval: any) => approval.action === "APPROVED")) {
        return { label: "Approved", variant: "success" as const };
      }
      return null;
    };
    const canCurrentUserInternalApprove =
      canInternalApproveChecklist ||
      currentInternalApprovals.some((approval: any) => approval.assignedToId === currentUserId && approval.action === "PENDING");
    const canCurrentUserCustomerApprove =
      canCustomerApproveChecklist ||
      currentCustomerApprovals.some((approval: any) => approval.assignedToId === currentUserId && approval.action === "PENDING");
    const getUserName = (userId?: string | null) =>
      users.find((user) => user.id === userId)?.name || "Unknown";
    const pendingCustomerApproverNames = Array.from(
      new Set(
        currentCustomerApprovals
          .filter((approval: any) => approval.action === "PENDING")
          .map((approval: any) => getUserName(approval.assignedToId)),
      ),
    );
    const getInternalApproverRole = (approval: any) =>
      approval?.assignedToId === job.primaryOwnerId
        ? "Owner"
        : approval?.assignedToId === job.assignedManagerId
          ? "Manager"
          : "TL";
    const eligibleInternalApproverLabels = Array.from(
      new Set(
        [
          job.primaryOwnerId
            ? `${getUserName(job.primaryOwnerId)} (Owner)`
            : null,
          job.assignedManagerId
            ? `${getUserName(job.assignedManagerId)} (Manager)`
            : null,
          ...currentInternalApprovals
            .filter((approval: any) => approval.assignedToId)
            .map((approval: any) => `${getUserName(approval.assignedToId)} (${getInternalApproverRole(approval)})`),
        ].filter(Boolean) as string[],
      ),
    );
    const currentUserName = users.find((user) => user.id === currentUserId)?.name || "You";
    const refreshJobInBackground = () => {
      startRefreshTransition(() => {
        router.refresh();
      });
    };

    // Document version upload handler
    const handleUploadDoc = async (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const requirement = documentRequirements.find((req) => req.id === reqId);
      const requiresValidity = !!requirement?.requirementItem?.requiresValidityDate;
      let validityDateValue = "";
      if (requiresValidity) {
        const prompted = window.prompt("Enter validity date in YYYY-MM-DD format for this document.", "");
        if (!prompted) {
          e.target.value = "";
          return;
        }
        validityDateValue = prompted.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(validityDateValue)) {
          toast.error("Use YYYY-MM-DD for the validity date.");
          e.target.value = "";
          return;
        }
      }

      setLoading(`doc-${reqId}`);
      try {
        const localUrl = URL.createObjectURL(file);
        const formData = new FormData();
        formData.append("file", file);
        if (requirement?.name === "Section 49" && section49ValidityDate) {
          formData.append("validityDate", section49ValidityDate);
        } else if (validityDateValue) {
          formData.append("validityDate", validityDateValue);
        }
        const res = await actions.uploadDocumentVersionAction(job.id, reqId, formData);

        if (res.ok) {
          const version = res.data;
          const versionId = version?.id;
          if (versionId) {
            setPreviewUrls((prev) => ({ ...prev, [versionId]: localUrl }));
          }
          setDocumentRequirements((current) =>
            current.map((req) =>
              req.id === reqId
                ? {
                    ...req,
                    status: "UPLOADED",
                    exception: null,
                    versions: [
                      {
                        ...version,
                        fileKey: version?.fileKey || localUrl,
                        fileName: version?.fileName || file.name,
                        mimeType: version?.mimeType || file.type || "application/octet-stream",
                        sizeBytes: version?.sizeBytes || file.size,
                        uploadedById: version?.uploadedById || currentUserId,
                        isCurrent: true,
                      },
                      ...req.versions.map((existing: any) => ({ ...existing, isCurrent: false })),
                    ],
                  }
                : req,
            ),
          );
          toast.success(`Uploaded ${file.name} successfully.`);
          refreshJobInBackground();
        } else {
          toast.error(res.error || "Upload failed.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleCreateCustomDocument = async () => {
      if (!customDocumentName.trim()) {
        toast.error("Enter a custom document name.");
        return;
      }

      if (!customDocumentFile) {
        toast.error("Choose a file to upload.");
        return;
      }

      setLoading("custom-doc-upload");
      try {
        const localUrl = URL.createObjectURL(customDocumentFile);
        const formData = new FormData();
        formData.append("name", customDocumentName.trim());
        formData.append("file", customDocumentFile);

        const res = await actions.createJobCustomDocumentUploadAction(job.id, formData);
        if (res.ok) {
          const createdRequirement = res.data;
          const currentVersion = createdRequirement?.versions?.find((version: any) => version.isCurrent) || createdRequirement?.versions?.[0];
          if (currentVersion?.id) {
            setPreviewUrls((prev) => ({ ...prev, [currentVersion.id]: localUrl }));
          }
          setDocumentRequirements((current) => [...current, createdRequirement]);
          setCustomDocumentName("");
          setCustomDocumentFile(null);
          setIsCustomDocumentModalOpen(false);
          toast.success("Custom document uploaded successfully.");
          refreshJobInBackground();
        } else {
          URL.revokeObjectURL(localUrl);
          toast.error(res.error || "Failed to upload custom document.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Declare Document Exception Handler
    const handleDeclareException = async (reqId: string) => {
      if (!exceptionReason.trim()) {
        toast.error("An exception reason is required.");
        return;
      }

      setLoading(`exc-${reqId}`);
      try {
        const res = await actions.declareDocumentExceptionAction(job.id, reqId, exceptionReason);
        if (res.ok) {
          setDocumentRequirements((current) =>
            current.map((req) =>
              req.id === reqId
                ? {
                    ...req,
                    status: "NOT_AVAILABLE",
                    exception: {
                      ...(req.exception || {}),
                      ...(res.data || {}),
                      reason: exceptionReason,
                      user: { name: currentUserName },
                    },
                  }
                : req,
            ),
          );
          toast.success("Document requirement exempted.");
          setExceptionReason("");
          setActiveDocReqId(null);
          refreshJobInBackground();
        } else {
          toast.error(res.error || "Failed to waiver requirement.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleMarkNotAvailable = async (reqId: string) => {
      setLoading(`na-${reqId}`);
      try {
        const res = await actions.markDocumentNotAvailableAction(job.id, reqId);
        if (res.ok) {
          setDocumentRequirements((current) =>
            current.map((req) =>
              req.id === reqId
                ? {
                    ...req,
                    status: "NOT_AVAILABLE",
                    exception: {
                      ...(req.exception || {}),
                      ...(res.data || {}),
                      reason: "N/A",
                      user: { name: currentUserName },
                    },
                  }
                : req,
            ),
          );
          toast.success("Document requirement marked as N/A.");
          setExceptionReason("");
          setActiveDocReqId(null);
          refreshJobInBackground();
        } else {
          toast.error(res.error || "Failed to mark requirement as N/A.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleMarkAllNotAvailable = async () => {
      if (bulkNaEligibleRequirements.length === 0) {
        toast.error("There are no visible pending documents to mark as N/A.");
        return;
      }

      const confirmed = window.confirm(
        `Mark ${bulkNaEligibleRequirements.length} visible pending document requirement(s) as N/A?`,
      );
      if (!confirmed) {
        return;
      }

      setLoading("na-all");
      try {
        const updatedIds = new Set<string>();
        const failedNames: string[] = [];

        for (const requirement of bulkNaEligibleRequirements) {
          const res = await actions.markDocumentNotAvailableAction(job.id, requirement.id);
          if (res.ok) {
            updatedIds.add(requirement.id);
            continue;
          }
          failedNames.push(requirement.name);
        }

        if (updatedIds.size > 0) {
          setDocumentRequirements((current) =>
            current.map((req) =>
              updatedIds.has(req.id)
                ? {
                    ...req,
                    status: "NOT_AVAILABLE",
                    exception: {
                      ...(req.exception || {}),
                      reason: "N/A",
                      user: { name: currentUserName },
                    },
                  }
                : req,
            ),
          );
          toast.success(`Marked ${updatedIds.size} document requirement(s) as N/A.`);
          refreshJobInBackground();
        }

        if (failedNames.length > 0) {
          toast.error(`Failed to mark as N/A: ${failedNames.join(", ")}`);
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Undo document exemption (Mark as active requirement again)
    const handleRemoveException = async (reqId: string) => {
      setLoading(`undo-exc-${reqId}`);
      try {
        const res = await actions.removeDocumentExceptionAction(job.id, reqId);
        if (res.ok) {
          setDocumentRequirements((current) =>
            current.map((req) =>
              req.id === reqId
                ? {
                    ...req,
                    status: res.data?.newStatus || (req.versions?.length ? "UPLOADED" : "PENDING"),
                    exception: null,
                  }
                : req,
            ),
          );
          toast.success("Exemption removed. Requirement is active again.");
          refreshJobInBackground();
        } else {
          toast.error(res.error || "Failed to remove exemption.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Proceed document gate validation stage advance
    const handleProceedStage = async () => {
      setLoading("proceed-stage");
      setProceedErrors(null);
      try {
        const res = await actions.proceedDocumentStageAction(job.id);
        if (res.ok) {
          toast.success("Workflow stage advanced to Additional Data successfully.");
          setActiveTab("additionalData");
          refreshJobInBackground();
        } else {
          setProceedErrors(res.error ? [res.error] : ["Mandatory document requirement gating check failed."]);
          if (firstUnresolvedMandatoryDocumentId) {
            setHighlightedDocumentReqId(firstUnresolvedMandatoryDocumentId);
            setActiveTab("docs");
          }
          toast.error("Document collection gate not satisfied.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const isValidManifest = (value: string) => {
      if (value === "") return false;
      return /^[a-zA-Z0-9]+$/.test(value);
    };

    const handleSaveAdditionalData = async () => {
      if (manifestConfigMissing) {
        toast.error("This clearance type is missing manifest configuration. Update it in CHA settings before continuing.");
        return;
      }
      if (importGeneralManifest !== "" && !isValidManifest(importGeneralManifest)) {
        toast.error("IGM must be alphanumeric.");
        return;
      }
      if (exportGeneralManifest !== "" && !isValidManifest(exportGeneralManifest)) {
        toast.error("EGM must be alphanumeric.");
        return;
      }

      setLoading("additional-data-save");
      try {
        const res = await actions.upsertAdditionalDataAction(job.id, {
          vesselInwardDate: vesselInwardDate || null,
          importGeneralManifest: importGeneralManifest === "" ? null : importGeneralManifest,
          exportGeneralManifest: exportGeneralManifest === "" ? null : exportGeneralManifest,
          customManifestValue: customManifestValue === "" ? null : customManifestValue,
          containerDetails: containerEntries.map((entry, index) => ({
            containerName: `Container ${index + 1}`,
            containerNumber: entry.containerNumber,
          })),
          mblNumber: mblNumber === "" ? null : mblNumber,
          hblNumber: hblNumber === "" ? null : hblNumber,
          deliveryOrderValidity: deliveryOrderValidity || null,
        });
        if (res.ok) {
          clearAdditionalDataDraft();
          toast.success("Additional Data saved successfully.");
          setIsAdditionalDataEditing(false);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to save Additional Data.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleProceedAdditionalData = async () => {
      if (manifestConfigMissing) {
        toast.error("This clearance type is missing manifest configuration. Update it in CHA settings before continuing.");
        return;
      }
      if (!vesselInwardDate || !deliveryOrderValidity) {
        toast.error("Complete Vessel Inward Date and DO Validity before proceeding.");
        return;
      }
      if (manifestMandatory && requiresIgm && importGeneralManifest === "") {
        toast.error("IGM Number is required before proceeding.");
        return;
      }
      if (manifestMandatory && requiresEgm && exportGeneralManifest === "") {
        toast.error("EGM Number is required before proceeding.");
        return;
      }
      if (manifestMandatory && requiresCustomManifest && customManifestValue === "") {
        toast.error(`${customManifestLabel} is required before proceeding.`);
        return;
      }

      if (importGeneralManifest !== "" && !isValidManifest(importGeneralManifest)) {
        toast.error("IGM must be alphanumeric.");
        return;
      }
      if (exportGeneralManifest !== "" && !isValidManifest(exportGeneralManifest)) {
        toast.error("EGM must be alphanumeric.");
        return;
      }

      setLoading("additional-data-proceed");
      try {
        // Auto-save Additional Data first
        const saveRes = await actions.upsertAdditionalDataAction(job.id, {
          vesselInwardDate: vesselInwardDate || null,
          importGeneralManifest: importGeneralManifest === "" ? null : importGeneralManifest,
          exportGeneralManifest: exportGeneralManifest === "" ? null : exportGeneralManifest,
          customManifestValue: customManifestValue === "" ? null : customManifestValue,
          containerDetails: containerEntries.map((entry, index) => ({
            containerName: `Container ${index + 1}`,
            containerNumber: entry.containerNumber,
          })),
          mblNumber: mblNumber === "" ? null : mblNumber,
          hblNumber: hblNumber === "" ? null : hblNumber,
          deliveryOrderValidity: deliveryOrderValidity || null,
        });

        if (!saveRes.ok) {
          toast.error(saveRes.error || "Failed to auto-save Additional Data.");
          setLoading(null);
          return;
        }

        clearAdditionalDataDraft();

        // Succeeded to save, now proceed!
        const res = await actions.proceedAdditionalDataAction(job.id);
        if (res.ok) {
          toast.success("Additional Data saved and workflow advanced to Checklist Preparation.");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to complete Additional Data.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleConfirmDeleteDoc = async () => {
      if (!deleteDocModal) return;
      setLoading("delete-doc");
      try {
        const res = await actions.deleteDocumentVersionAction(
          job.id,
          deleteDocModal.reqId,
          deleteDocModal.versionId
        );
        if (res.ok) {
          toast.success(`Deleted ${deleteDocModal.fileName} successfully.`);
          setDeleteDocModal(null);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to delete file.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleUploadChecklist = async (file: File | null) => {
      if (!file || file.size === 0) {
        toast.error("Please choose a checklist file to upload.");
        return;
      }

      setChecklistFile(file);
      setLoading("checklist-upload");
      try {
        const localUrl = URL.createObjectURL(file);
        const formData = new FormData();
        formData.append("file", file);
        if (checklistRemarks) {
          formData.append("remarks", checklistRemarks);
        }
        const res = await actions.uploadChecklistFileAction(job.id, formData);

        if (res.ok) {
          const versionId = res.data?.fileVersion?.id;
          if (versionId) {
            setPreviewUrls((prev) => ({ ...prev, [versionId]: localUrl }));
          }
          toast.success(currentChecklistVersion ? "Checklist reuploaded for approval." : "Checklist uploaded for approval.");
          setChecklistFile(null);
          setChecklistRemarks("");
          router.refresh();
        } else {
          setChecklistFile(null);
          toast.error(res.error || "Checklist upload failed.");
        }
      } catch (err: any) {
        setChecklistFile(null);
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleChecklistInternalDecision = async (decision: "APPROVED" | "REJECTED") => {
      if (!checklistWorkflow) return;
      if (decision === "REJECTED" && !internalApprovalRemarks.trim()) {
        toast.error("A rejection reason is required.");
        return;
      }

      setLoading(`checklist-internal-${decision}`);
      try {
        const formData = new FormData();
        formData.set("decision", decision);
        formData.set("remarks", internalApprovalRemarks);

        const res = await actions.submitChecklistInternalDecisionAction(job.id, checklistWorkflow.id, formData);
        if (res.ok) {
          toast.success(decision === "APPROVED" ? "Internal approval recorded." : "Checklist returned for rework.");
          setInternalApprovalRemarks("");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to process internal decision.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleChecklistCustomerDecision = async (decision: "APPROVED" | "REJECTED") => {
      if (!checklistWorkflow) return;
      if (decision === "REJECTED" && !customerApprovalRemarks.trim()) {
        toast.error("A rejection reason is required.");
        return;
      }

      setLoading(`checklist-customer-${decision}`);
      try {
        const res = await actions.submitChecklistCustomerDecisionAction(
          job.id,
          checklistWorkflow.id,
          decision,
          customerApprovalRemarks || undefined,
        );
        if (res.ok) {
          toast.success(decision === "APPROVED" ? "Customer approval recorded." : "Checklist returned from customer for rework.");
          setCustomerApprovalRemarks("");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to process customer decision.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleSendChecklistCustomerMail = async () => {
      if (!checklistWorkflow) return;
      const subject = customerMailSubject.trim() || `Checklist Approval Required - ${job.jobNumber}`;
      const body = customerMailBody.trim() || `Please review the attached approved checklist for job ${job.jobNumber}.`;

      setLoading("checklist-customer-mail");
      try {
        const formData = new FormData();
        formData.set("subject", subject);
        formData.set("body", body);
        customerMailAttachments.forEach((file) => formData.append("customerMailAttachments", file));
        const res = await actions.sendChecklistCustomerMailAction(job.id, checklistWorkflow.id, formData);
        if (res.ok) {
          toast.success("Customer email sent with the approved checklist attached.");
          setCustomerMailSubject("");
          setCustomerMailBody("");
          setCustomerMailAttachments([]);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to send checklist mail.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleUpdateManager = async () => {
      if (!selectedManagerId) {
        toast.error("Please select a manager.");
        return;
      }
      setLoading("update-manager");
      try {
        const res = await actions.updateJobDetailsAction(job.id, {
          assignedManagerId: selectedManagerId,
        });
        if (res.ok) {
          toast.success("Assigned manager updated successfully.");
          setIsEditingManager(false);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update manager.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const resetDeletionModalState = () => {
      setDeleteModalMode(null);
      setDeleteConfirmJobNumber("");
      setDeleteConfirmPhrase("");
      setDeleteDecisionRemarks("");
    };

    const handleSubmitJobDeletion = async () => {
      if (!deleteInputsMatch) {
        toast.error("Enter the exact job number and confirmation phrase to continue.");
        return;
      }

      setLoading("job-delete");
      try {
        const res = await actions.submitJobDeletionAction(
          job.id,
          deleteConfirmJobNumber,
          deleteConfirmPhrase,
        );

        if (res.ok) {
          const outcome = res.data.mode === "deleted"
            ? `CHA job ${job.jobNumber} was deleted successfully.`
            : `Deletion request submitted for ${job.jobNumber}. Manager approval is now pending.`;
          toast.success(outcome);
          resetDeletionModalState();
          router.push("/cha/jobs");
        } else {
          toast.error(res.error || "Failed to process the CHA job deletion.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleApproveDeletionRequest = async () => {
      if (!pendingDeletionReview) return;
      if (!deleteInputsMatch) {
        toast.error("Enter the exact job number and confirmation phrase to continue.");
        return;
      }

      setLoading("job-delete-approve");
      try {
        const res = await actions.decideJobDeletionRequestAction(
          pendingDeletionReview.id,
          "APPROVED",
          deleteDecisionRemarks || undefined,
        );

        if (res.ok) {
          toast.success(`Deletion request approved and job ${job.jobNumber} deleted.`);
          resetDeletionModalState();
          router.push("/cha/jobs");
        } else {
          toast.error(res.error || "Failed to approve the deletion request.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleRejectDeletionRequest = async () => {
      if (!pendingDeletionReview) return;
      if (!deleteDecisionRemarks.trim()) {
        toast.error("A rejection reason is required.");
        return;
      }

      setLoading("job-delete-reject");
      try {
        const res = await actions.decideJobDeletionRequestAction(
          pendingDeletionReview.id,
          "REJECTED",
          deleteDecisionRemarks,
        );

        if (res.ok) {
          toast.success(`Deletion request for ${job.jobNumber} was rejected.`);
          resetDeletionModalState();
          router.refresh();
        } else {
          toast.error(res.error || "Failed to reject the deletion request.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Filing Date adjustment
    const handleAdjustEstDate = async () => {
      if (!newEstFilingDate) return;

      setLoading("est-date");
      try {
        const res = await actions.adjustEstimatedFilingDateAction(
          job.id,
          job.filing.id,
          new Date(newEstFilingDate)
        );

        if (res.ok) {
          toast.success("Estimated filing date adjusted.");
          setNewEstFilingDate("");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to adjust date.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Mark as Filed
    const handleMarkAsFiled = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!filingRef || !actualFilingDate || !filedBillCopyFile) {
        toast.error("Filing Reference, Date, and Filed Copy are required.");
        return;
      }

      const est = job.filing.estimatedFilingDate ? new Date(job.filing.estimatedFilingDate) : null;
      const act = new Date(actualFilingDate);
      const isDelayed = est && act.getTime() > est.getTime();

      if (isDelayed && !delayReason.trim()) {
        toast.error("This filing is delayed. A justification reason is mandatory.");
        return;
      }

      setLoading("mark-filed");
      try {
        const mockFileKey = `cha/filings/${Math.random().toString(36).substring(7)}_${filedBillCopyFile.name}`;
        const res = await actions.markAsFiledAction(job.id, job.filing.id, {
          filingRef,
          actualFilingDate: act,
          filedBillCopyKey: mockFileKey,
          remarks: "Submitted and finalized",
          delayReason: isDelayed ? delayReason : undefined,
        });

        if (res.ok) {
          toast.success("Filing finalized. Operational cycle complete.");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to finalize filing.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // --- FILING WORKFLOW RUNNER HANDLERS ---
    const loadFilingData = async () => {
      const previousActiveNodeRunId = activeNodeRun?.id ?? null;
      const currentDraftSnapshot = buildCurrentFilingNodeDraft();

      setLoading("filing-load");
      try {
        const [instanceRes, section49Res] = await Promise.all([
          actions.getFilingWorkflowInstanceAction(job.id),
          actions.getFilingSection49Action(job.id)
        ]);
        if (instanceRes.ok) {
          setFilingInstance(instanceRes.data);
          const activeRun = instanceRes.data?.activeNodeRun || instanceRes.data?.nodeRuns?.find((r: any) => r.status === "ACTIVE");
          setActiveNodeRun(activeRun || null);
          setSelectedJumpBackNodeKey((current) => current || instanceRes.data?.jumpBackTargets?.[0]?.nodeKey || "");

          if (activeRun) {
            const initialResponses: Record<string, { isChecked: boolean; remarks?: string; fileKey?: string; delayRemarks?: string }> = {};
            const activeNodeItemIds = activeRun.node.checklistItems.map((item: any) => item.id);
            const currentResponses = instanceRes.data.responses?.filter(
              (r: any) => activeNodeItemIds.includes(r.checklistItemId)
            ) || [];

            activeRun.node.checklistItems.forEach((item: any) => {
              const match = currentResponses.find((r: any) => r.checklistItemId === item.id);
              initialResponses[item.id] = {
                isChecked: match ? match.isChecked : false,
                remarks: match ? (match.remarks || "") : "",
                fileKey: match ? (match.fileKey || undefined) : undefined,
                delayRemarks: match ? (match.delayRemarks || "") : "",
              };
            });
            const shouldPreserveDraft = previousActiveNodeRunId === activeRun.id;
            setChecklistResponses(
              shouldPreserveDraft
                ? mergeFilingChecklistResponses(initialResponses, currentDraftSnapshot.checklistResponses)
                : initialResponses,
            );
            const fieldValuesForNode = Object.fromEntries(
              (instanceRes.data.fieldValues || [])
                .filter((entry: any) => entry.nodeId === activeRun.node.id)
                .map((entry: any) => [entry.fieldKey, entry.valueJson == null ? "" : String(entry.valueJson)]),
            );
            setFilingFieldValues((current) => {
              if (!shouldPreserveDraft) {
                return fieldValuesForNode;
              }

              const mergedFieldValues = { ...fieldValuesForNode };
              for (const [fieldKey, fieldValue] of Object.entries(currentDraftSnapshot.filingFieldValues)) {
                const serverValue = mergedFieldValues[fieldKey];
                if ((serverValue === undefined || serverValue === null || serverValue === "") && fieldValue) {
                  mergedFieldValues[fieldKey] = fieldValue;
                }
              }
              return mergedFieldValues;
            });
            const toggleEntriesForNode = (instanceRes.data.toggleStates || []).filter((entry: any) => entry.nodeId === activeRun.node.id);
            const toggleStatesForNode = Object.fromEntries(toggleEntriesForNode.map((entry: any) => [entry.sectionKey, !!entry.isEnabled]));
            const toggleStateDetailsForNode = Object.fromEntries(
              toggleEntriesForNode.map((entry: any) => [
                entry.sectionKey,
                {
                  isEnabled: !!entry.isEnabled,
                  state: entry.stateJson && typeof entry.stateJson === "object" ? entry.stateJson : null,
                },
              ]),
            );
            setFilingToggleStates(
              shouldPreserveDraft
                ? { ...toggleStatesForNode, ...currentDraftSnapshot.filingToggleStates }
                : toggleStatesForNode,
            );
            setFilingToggleStateDetails(
              shouldPreserveDraft
                ? { ...toggleStateDetailsForNode, ...currentDraftSnapshot.filingToggleStateDetails }
                : toggleStateDetailsForNode,
            );
            const queryProcessingDetails = toggleStateDetailsForNode.query_processing?.state as Record<string, unknown> | null | undefined;
            const serverQueryReferenceNumber =
              typeof queryProcessingDetails?.queryReferenceNumber === "string" ? queryProcessingDetails.queryReferenceNumber : "";
            const serverQueryOfficerName =
              typeof queryProcessingDetails?.customsOfficerName === "string" ? queryProcessingDetails.customsOfficerName : "";
            const serverQueryReceivedAt =
              typeof queryProcessingDetails?.queryReceivedAt === "string" ? queryProcessingDetails.queryReceivedAt : "";
            const serverQueryTitle = typeof fieldValuesForNode.query_title === "string" ? fieldValuesForNode.query_title : "";
            const serverQueryDetails = typeof fieldValuesForNode.query_notes === "string" ? fieldValuesForNode.query_notes : "";

            setFilingQueryReferenceNumber(
              shouldPreserveDraft && currentDraftSnapshot.filingQueryReferenceNumber.trim()
                ? currentDraftSnapshot.filingQueryReferenceNumber
                : serverQueryReferenceNumber,
            );
            setFilingQueryOfficerName(
              shouldPreserveDraft && currentDraftSnapshot.filingQueryOfficerName.trim()
                ? currentDraftSnapshot.filingQueryOfficerName
                : serverQueryOfficerName,
            );
            setFilingQueryReceivedAt(
              shouldPreserveDraft && currentDraftSnapshot.filingQueryReceivedAt.trim()
                ? currentDraftSnapshot.filingQueryReceivedAt
                : serverQueryReceivedAt,
            );
            setFilingQueryTitle(
              shouldPreserveDraft && currentDraftSnapshot.filingQueryTitle.trim()
                ? currentDraftSnapshot.filingQueryTitle
                : serverQueryTitle,
            );
            setFilingQueryDetails(
              shouldPreserveDraft && currentDraftSnapshot.filingQueryDetails.trim()
                ? currentDraftSnapshot.filingQueryDetails
                : serverQueryDetails,
            );
            if (shouldPreserveDraft) {
              setFilingQueryResponderNames(currentDraftSnapshot.filingQueryResponderNames);
              setFilingQueryStatusUpdates(currentDraftSnapshot.filingQueryStatusUpdates);
            } else {
              setFilingQueryResponderNames({});
              setFilingQueryStatusUpdates({});
            }

            const edges = instanceRes.data.version?.edges || [];
            const outgoing = edges.filter((e: any) => e.sourceKey === activeRun.nodeKey);
            if (outgoing.length === 1) {
              setSelectedNextNodeKey(
                shouldPreserveDraft && currentDraftSnapshot.selectedNextNodeKey.trim()
                  ? currentDraftSnapshot.selectedNextNodeKey
                  : outgoing[0].targetKey,
              );
            } else {
              setSelectedNextNodeKey(
                shouldPreserveDraft ? currentDraftSnapshot.selectedNextNodeKey : "",
              );
            }
          } else {
            setChecklistResponses({});
            setFilingFieldValues({});
            setFilingToggleStates({});
            setFilingToggleStateDetails({});
            setFilingQueryReferenceNumber("");
            setFilingQueryOfficerName("");
            setFilingQueryReceivedAt("");
            setFilingQueryResponderNames({});
            setFilingQueryStatusUpdates({});
            setFilingQueryTitle("");
            setFilingQueryDetails("");
            setSelectedNextNodeKey("");
          }

          setNodeRemarks(
            activeRun && previousActiveNodeRunId === activeRun.id && currentDraftSnapshot.nodeRemarks.trim()
              ? currentDraftSnapshot.nodeRemarks
              : activeRun?.remarks || "",
          );
        } else {
          toast.error(instanceRes.error || "Failed to load filing workflow. Check that a workflow is published in CHA Settings.");
        }
        if (section49Res.ok) {
          setSection49Flag(section49Res.data);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load Filing workflow details.");
      } finally {
        setLoading(null);
      }
    };

    useEffect(() => {
      if (activeTab === "filing" && activeStepIndex >= filingStageIndex) {
        void loadFilingData();
      }
    }, [activeTab, activeStepIndex, filingStageIndex]);

    const syncLocalToggleState = (
      sectionKey: string,
      isEnabled: boolean,
      state: Record<string, unknown> | null,
    ) => {
      setFilingToggleStates((current) => ({ ...current, [sectionKey]: isEnabled }));
      setFilingToggleStateDetails((current) => ({
        ...current,
        [sectionKey]: {
          isEnabled,
          state,
        },
      }));
    };

    const clearFilingNodeDraft = (storageKey?: string | null) => {
      if (!storageKey) return;
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // localStorage unavailable
      }
    };

    const buildCurrentFilingNodeDraft = (): FilingNodeDraft => ({
      checklistResponses,
      filingFieldValues,
      filingToggleStates,
      filingToggleStateDetails,
      filingQueryDetails,
      filingQueryOfficerName,
      filingQueryReceivedAt,
      filingQueryReferenceNumber,
      filingQueryResponderNames,
      filingQueryStatusUpdates,
      filingQueryTitle,
      nodeRemarks,
      selectedNextNodeKey,
    });

    const handleSaveFilingDraft = () => {
      if (!filingDraftStorageKey || !activeNodeRun?.id) {
        toast.error("No active filing stage is available to save right now.");
        return;
      }

      const currentDraft = buildCurrentFilingNodeDraft();
      const toggleStatesForSave = Object.entries(currentDraft.filingToggleStateDetails).map(([sectionKey, entry]) => ({
        sectionKey,
        isEnabled: entry.isEnabled,
        state:
          sectionKey === "query_processing"
            ? {
                ...(entry.state ?? {}),
                queryReferenceNumber: filingQueryReferenceNumber.trim() || null,
                customsOfficerName: filingQueryOfficerName.trim() || null,
                queryReceivedAt: filingQueryReceivedAt.trim() || null,
              }
            : entry.state ?? null,
      }));
      const fieldValuesForSave = [
        ...Object.entries(currentDraft.filingFieldValues).map(([fieldKey, value]) => ({ fieldKey, value })),
        { fieldKey: "query_title", value: currentDraft.filingQueryTitle },
        { fieldKey: "query_notes", value: currentDraft.filingQueryDetails },
      ];

      setLoading("filing-save-draft");
      void (async () => {
        try {
          const result = await actions.saveFilingNodeDraftAction(job.id, activeNodeRun.id, {
            remarks: currentDraft.nodeRemarks,
            checklistItemResponses: activeChecklistItems.map((item: any) => {
              const response = currentDraft.checklistResponses[item.id] || {
                isChecked: false,
                remarks: "",
                fileKey: undefined,
                delayRemarks: "",
              };
              return {
                checklistItemId: item.id,
                isChecked: response.isChecked,
                remarks: response.remarks || undefined,
                fileKey: response.fileKey || undefined,
                delayRemarks: response.delayRemarks || undefined,
              };
            }),
            fieldValues: fieldValuesForSave,
            toggleStates: toggleStatesForSave,
          });

          if (!result.ok) {
            toast.error(result.error || "Failed to save filing draft.");
            return;
          }

          try {
            localStorage.setItem(filingDraftStorageKey, JSON.stringify(currentDraft));
            filingDraftHydratedForRef.current = filingDraftStorageKey;
          } catch {
            // localStorage unavailable
          }

          toast.success(`Saved draft for ${activeNodeRun.node.name}.`);
        } catch {
          toast.error("Failed to save filing draft.");
        } finally {
          setLoading(null);
        }
      })();
    };

    useEffect(() => {
      if (!filingDraftStorageKey || !activeNodeRun?.id) return;
      if (filingDraftHydratedForRef.current === filingDraftStorageKey) return;

      filingDraftHydratedForRef.current = filingDraftStorageKey;

      try {
        const savedDraft = localStorage.getItem(filingDraftStorageKey);
        if (!savedDraft) return;

        const parsedDraft = normalizeFilingNodeDraft(JSON.parse(savedDraft));
        if (!parsedDraft) {
          clearFilingNodeDraft(filingDraftStorageKey);
          return;
        }

        setChecklistResponses(parsedDraft.checklistResponses);
        setFilingFieldValues((current) => ({ ...current, ...parsedDraft.filingFieldValues }));
        setFilingToggleStates(parsedDraft.filingToggleStates);
        setFilingToggleStateDetails(parsedDraft.filingToggleStateDetails);
        setFilingQueryTitle(parsedDraft.filingQueryTitle);
        setFilingQueryDetails(parsedDraft.filingQueryDetails);
        setFilingQueryReferenceNumber(parsedDraft.filingQueryReferenceNumber);
        setFilingQueryOfficerName(parsedDraft.filingQueryOfficerName);
        setFilingQueryReceivedAt(parsedDraft.filingQueryReceivedAt);
        setFilingQueryStatusUpdates(parsedDraft.filingQueryStatusUpdates);
        setFilingQueryResponderNames(parsedDraft.filingQueryResponderNames);
        setNodeRemarks(parsedDraft.nodeRemarks);
        setSelectedNextNodeKey(parsedDraft.selectedNextNodeKey);
      } catch {
        clearFilingNodeDraft(filingDraftStorageKey);
      }
    }, [activeNodeRun?.id, filingDraftStorageKey]);

    useEffect(() => {
      if (!filingDraftStorageKey || filingDraftHydratedForRef.current !== filingDraftStorageKey) return;

      const draft = buildCurrentFilingNodeDraft();

      const hasDraftContent =
        Object.keys(checklistResponses).length > 0 ||
        Object.keys(filingFieldValues).length > 0 ||
        Object.keys(filingToggleStates).length > 0 ||
        Object.keys(filingToggleStateDetails).length > 0 ||
        Object.keys(filingQueryResponderNames).length > 0 ||
        Object.keys(filingQueryStatusUpdates).length > 0 ||
        !!filingQueryDetails.trim() ||
        !!filingQueryOfficerName.trim() ||
        !!filingQueryReceivedAt.trim() ||
        !!filingQueryReferenceNumber.trim() ||
        !!filingQueryTitle.trim() ||
        !!nodeRemarks.trim() ||
        !!selectedNextNodeKey.trim();

      try {
        if (!hasDraftContent) {
          localStorage.removeItem(filingDraftStorageKey);
          return;
        }
        localStorage.setItem(filingDraftStorageKey, JSON.stringify(draft));
      } catch {
        // localStorage unavailable
      }
    }, [
      checklistResponses,
      filingDraftStorageKey,
      filingFieldValues,
      filingQueryDetails,
      filingQueryOfficerName,
      filingQueryReceivedAt,
      filingQueryReferenceNumber,
      filingQueryResponderNames,
      filingQueryStatusUpdates,
      filingQueryTitle,
      filingToggleStateDetails,
      filingToggleStates,
      nodeRemarks,
      selectedNextNodeKey,
    ]);

    const handlePersistFilingToggleState = async (
      sectionKey: string,
      isEnabled: boolean,
      state: Record<string, unknown> | null,
      successMessage?: string,
    ) => {
      if (!activeNodeRun) {
        return false;
      }

      setLoading(`filing-toggle-${sectionKey}`);
      try {
        const res = await actions.upsertFilingWorkflowToggleStateAction(job.id, activeNodeRun.id, {
          sectionKey,
          isEnabled,
          state,
        });
        if (!res.ok) {
          toast.error(res.error || "Failed to update filing workflow section.");
          return false;
        }
        syncLocalToggleState(sectionKey, isEnabled, state);
        if (successMessage) {
          toast.success(successMessage);
        }
        await loadFilingData();
        return true;
      } catch (err: any) {
        toast.error(err.message || "Failed to update filing workflow section.");
        return false;
      } finally {
        setLoading(null);
      }
    };

    const handleStartFilingWorkflow = async () => {
      setLoading("filing-start");
      try {
        const res = await actions.startFilingWorkflowAction(job.id);
        if (res.ok) {
          toast.success("Filing workflow initialized.");
          await loadFilingData();
          router.refresh();
        } else {
          toast.error(res.error || "Failed to start filing workflow.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleCompleteFilingNode = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeNodeRun) return;
      const currentFilingDraftStorageKey = filingDraftStorageKey;

      if (isActiveStageBlocked) {
        toast.error("Complete the missing prerequisite stage before continuing this filing stage.");
        return;
      }

      if (queryProcessingEnabled && !queryProcessingResolved) {
        toast.error("Resolve query processing before moving to the next filing step.");
        return;
      }

      // Validate that comments are entered if commentsRequired is true
      if (activeNodeRun.node.commentsRequired && !nodeRemarks.trim()) {
        toast.error(`Comments are mandatory to complete stage: ${activeNodeRun.node.name}.`);
        return;
      }

      // Validate all mandatory checklist items are checked if requireAllMandatoryChecklistItems is true.
      if (activeNodeRun.node.requireAllMandatoryChecklistItems) {
        for (const item of activeChecklistItems) {
          if (item.isMandatory) {
            const resp = checklistResponses[item.id];
            if (!resp || !resp.isChecked) {
              toast.error(`Mandatory checklist item "${item.label}" must be checked.`);
              return;
            }
          }
        }
      }

      // Validate checklist items requiring remarks have remarks
      for (const item of activeChecklistItems) {
        const resp = checklistResponses[item.id];
        if (item.requiresRemarks && resp?.isChecked && !resp.remarks?.trim()) {
          toast.error(`Remarks are required for checklist item "${item.label}".`);
          return;
        }
        const matchingOverdue = overdueChecklistItems.find((entry: any) => entry.checklistItemId === item.id);
        if (matchingOverdue && resp?.isChecked && item.delayRemarksRequired && !resp.delayRemarks?.trim()) {
          toast.error(`Delay remarks are required for overdue checklist item "${item.label}".`);
          return;
        }
      }

      const currentAttachments = filingInstance?.attachments?.filter(
        (a: any) => a.nodeRunId === activeNodeRun.id
      ) || [];
      for (const pr of activeNodeRun.node.photoRequirements) {
        if (pr.isMandatory) {
          const uploadedCount = currentAttachments.filter((a: any) => a.photoRequirementId === pr.id).length;
          if (uploadedCount < pr.minPhotos) {
            toast.error(`Mandatory photo upload "${pr.label}" requires at least ${pr.minPhotos} photo(s). Uploaded ${uploadedCount}.`);
            return;
          }
        }
      }

      setLoading("filing-complete");
      try {
        if (hasShipmentBillNumberField && filingFieldValues.bill_number?.trim()) {
          const billNumber = filingFieldValues.bill_number.trim();
          const shipmentSaveRes = await actions.upsertFilingShipmentDetailsAction(job.id, {
            filingShipmentType,
            billOfEntryNumber: isExportFiling ? null : billNumber,
            shippingBillNumber: isExportFiling ? billNumber : null,
          });
          if (!shipmentSaveRes.ok) {
            toast.error(shipmentSaveRes.error || "Failed to save bill number for filing.");
            return;
          }
        }

        const responsesList = activeChecklistItems.map((item: any) => {
          const val = checklistResponses[item.id] || { isChecked: false, remarks: "", fileKey: undefined, delayRemarks: "" };
          return {
            checklistItemId: item.id,
            isChecked: val.isChecked,
            remarks: val.remarks || undefined,
            fileKey: val.fileKey || undefined,
            delayRemarks: val.delayRemarks || undefined,
          };
        });

        const res = await actions.completeFilingNodeAction(job.id, activeNodeRun.id, {
          remarks: nodeRemarks,
          checklistItemResponses: responsesList,
          fieldValues: Object.entries(filingFieldValues).map(([fieldKey, value]) => ({ fieldKey, value })),
          toggleStates: Object.entries(filingToggleStateDetails).map(([sectionKey, entry]) => ({
            sectionKey,
            isEnabled: entry.isEnabled,
            state: entry.state ?? null,
          })),
          nextNodeKey: selectedNextNodeKey || null,
        });

        if (res.ok) {
          clearFilingNodeDraft(currentFilingDraftStorageKey);
          toast.success(`Completed stage: ${activeNodeRun.node.name}`);
          await loadFilingData();
          router.refresh();
        } else {
          toast.error(res.error || "Failed to finalize filing stage.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleGoBackStage = async () => {
      if (!activeNodeRun) return;
      const currentFilingDraftStorageKey = filingDraftStorageKey;
      if (!selectedJumpBackNodeKey) {
        toast.error("Select the filing stage you want to reopen.");
        return;
      }
      if (!goBackReason.trim()) {
        toast.error("Enter a reason to jump back to the selected filing stage.");
        return;
      }
      setLoading("filing-go-back");
      try {
        const res = await actions.revertFilingStageAction(job.id, activeNodeRun.id, selectedJumpBackNodeKey, goBackReason.trim());
        if (res.ok) {
          clearFilingNodeDraft(currentFilingDraftStorageKey);
          toast.success(`Jumped back to ${res.data?.reopenedNodeName || "the selected stage"}.`);
          setGoBackOpen(false);
          setGoBackReason("");
          setSelectedJumpBackNodeKey("");
          await loadFilingData();
          router.refresh();
        } else {
          toast.error(res.error || "Failed to jump back to the selected filing stage.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleRedirectBlockedStage = async (targetNodeKey: string) => {
      if (!activeNodeRun) return;
      setLoading(`filing-redirect-${targetNodeKey}`);
      try {
        const res = await actions.redirectBlockedFilingStageAction(job.id, activeNodeRun.id, targetNodeKey);
        if (res.ok) {
          toast.success(`Redirected to ${res.data?.redirectedToNodeName || "the prerequisite stage"}.`);
          await loadFilingData();
          router.refresh();
        } else {
          toast.error(res.error || "Failed to redirect to the prerequisite stage.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleResumeBlockedStage = async () => {
      if (!activeNodeRun) return;
      setLoading("filing-resume-blocked");
      try {
        const res = await actions.resumeBlockedFilingStageAction(job.id, activeNodeRun.id);
        if (res.ok) {
          toast.success(`Resumed ${res.data?.reopenedNodeName || "the blocked stage"}.`);
          await loadFilingData();
          router.refresh();
        } else {
          toast.error(res.error || "Failed to resume the blocked filing stage.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleUploadFilingPhoto = async (photoRequirementId: string | null, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeNodeRun) return;
      const requirement = activeNodeRun.node.photoRequirements?.find((entry: any) => entry.id === photoRequirementId);
      let validityDateValue = "";
      if (requirement?.requiresValidity) {
        const prompted = window.prompt("Enter validity date in YYYY-MM-DD format for this filing upload.", "");
        if (!prompted) {
          e.target.value = "";
          return;
        }
        validityDateValue = prompted.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(validityDateValue)) {
          toast.error("Use YYYY-MM-DD for the validity date.");
          e.target.value = "";
          return;
        }
      }

      setLoading(`filing-photo-${photoRequirementId || "general"}`);
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (validityDateValue) {
          formData.append("validityDate", validityDateValue);
        }
        const res = await actions.uploadFilingAttachmentAction(job.id, activeNodeRun.id, photoRequirementId, null, null, formData);

        if (res.ok) {
          toast.success(`Uploaded ${file.name} successfully.`);
          await loadFilingData();
        } else {
          toast.error(res.error || "Upload failed.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleDeleteFilingPhoto = async (attachmentId: string) => {
      setLoading(`filing-delete-${attachmentId}`);
      try {
        const res = await actions.deleteFilingAttachmentAction(job.id, attachmentId);
        if (res.ok) {
          toast.success("Attachment deleted successfully.");
          await loadFilingData();
        } else {
          toast.error(res.error || "Delete failed.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleToggleSection49 = async () => {
      setLoading("section49-toggle");
      try {
        const nextState = !section49Flag?.isEnabled;
        const res = await actions.toggleFilingSection49Action(job.id, nextState, section49Remarks);
        if (res.ok) {
          toast.success(`Section 49 status updated: ${nextState ? "Enabled" : "Disabled"}`);
          setSection49Remarks("");
          setShowSection49Modal(false);
          await loadFilingData();
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update Section 49 status.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleSaveSection49Validity = async () => {
      if (!section49ValidityDate) {
        toast.error("Enter Section 49 validity date.");
        return;
      }

      setLoading("section49-validity");
      try {
        const res = await actions.updateSection49ValidityAction(job.id, section49ValidityDate);
        if (res.ok) {
          setSection49Flag(res.data);
          toast.success("Section 49 validity date updated.");
          refreshJobInBackground();
        } else {
          toast.error(res.error || "Failed to update Section 49 validity date.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleApplySection49Extension = async () => {
      if (!section49ExtensionDate) {
        toast.error("Enter the new Section 49 validity date.");
        return;
      }
      if (!section49ExtensionFile) {
        toast.error("Choose the Section 49 extension document.");
        return;
      }

      setLoading("section49-extension");
      try {
        const formData = new FormData();
        formData.append("extensionDate", section49ExtensionDate);
        formData.append("file", section49ExtensionFile);
        const res = await actions.applySection49ExtensionAction(job.id, formData);
        if (res.ok) {
          toast.success("Section 49 extension applied.");
          setSection49ExtensionDate("");
          setSection49ExtensionFile(null);
          refreshJobInBackground();
        } else {
          toast.error(res.error || "Failed to apply Section 49 extension.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleUploadChecklistItemFile = async (checklistItemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeNodeRun) return;
      const requirement = activeNodeRun.node.checklistItems?.find((entry: any) => entry.id === checklistItemId);
      let validityDateValue = "";
      if (requirement?.requiresValidity) {
        const prompted = window.prompt("Enter validity date in YYYY-MM-DD format for this filing upload.", "");
        if (!prompted) {
          e.target.value = "";
          return;
        }
        validityDateValue = prompted.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(validityDateValue)) {
          toast.error("Use YYYY-MM-DD for the validity date.");
          e.target.value = "";
          return;
        }
      }

      setLoading(`checklist-item-file-${checklistItemId}`);
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (validityDateValue) {
          formData.append("validityDate", validityDateValue);
        }
        const res = await actions.uploadFilingAttachmentAction(job.id, activeNodeRun.id, null, checklistItemId, null, formData);
        if (res.ok) {
          const fileKey = res.data.fileKey;
          setChecklistResponses((prev) => ({
            ...prev,
            [checklistItemId]: {
              ...prev[checklistItemId],
              isChecked: true,
              fileKey,
            },
          }));
          toast.success(`Uploaded ${file.name} for checklist item.`);
          await loadFilingData();
        } else {
          toast.error(res.error || "Upload failed.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleUploadNodeDocument = async (documentRequirementKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeNodeRun) return;

      setLoading(`node-document-${documentRequirementKey}`);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await actions.uploadFilingAttachmentAction(job.id, activeNodeRun.id, null, null, documentRequirementKey, formData);
        if (res.ok) {
          toast.success(`Uploaded ${file.name}.`);
          await loadFilingData();
        } else {
          toast.error(res.error || "Upload failed.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleCreateFilingQuery = async () => {
      if (!activeNodeRun || !filingQueryDetails.trim()) {
        toast.error("Enter query details before saving.");
        return;
      }

      setLoading("filing-query-create");
      try {
        const res = await actions.createFilingWorkflowQueryAction(job.id, activeNodeRun.id, {
          title: filingQueryTitle.trim() || "Customs Query",
          details: filingQueryDetails.trim(),
        });
        if (res.ok) {
          const nextState = {
            ...(queryProcessingState || {}),
            stage: "OPEN",
            queryReferenceNumber: filingQueryReferenceNumber.trim() || null,
            customsOfficerName: filingQueryOfficerName.trim() || null,
            queryReceivedAt: filingQueryReceivedAt.trim() || null,
            latestQueryId: res.data?.id || null,
            latestQueryRaisedAt: new Date().toISOString(),
            lastQueryTitle: filingQueryTitle.trim() || "Customs Query",
          } as Record<string, unknown>;
          await handlePersistFilingToggleState("query_processing", true, nextState);
          toast.success("Customs query recorded.");
          setFilingFieldValues((current) => ({ ...current, query_notes: filingQueryDetails.trim() }));
          setFilingQueryTitle("");
          setFilingQueryDetails("");
          setFilingQueryReferenceNumber("");
          setFilingQueryOfficerName("");
          setFilingQueryReceivedAt("");
          await loadFilingData();
        } else {
          toast.error(res.error || "Failed to save filing query.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const handleUpdateFilingQueryStatus = async (
      queryId: string,
      status: "OPEN" | "REPLIED" | "CLOSED",
      details?: string,
    ) => {
      setLoading(`filing-query-${queryId}`);
      try {
        const res = await actions.updateFilingWorkflowQueryStatusAction(job.id, queryId, {
          status,
          details: details?.trim() || undefined,
        });
        if (res.ok) {
          const nextState = {
            ...(queryProcessingState || {}),
            stage: status === "CLOSED" ? "CLEARED" : status === "REPLIED" ? "RESPONDED" : "OPEN",
            latestOutcomeUpdatedAt: new Date().toISOString(),
            latestResolutionNote: details?.trim() || null,
            clearedAt: status === "CLOSED" ? new Date().toISOString() : null,
            latestResponseSubmittedAt: status === "REPLIED" ? new Date().toISOString() : (queryProcessingState?.latestResponseSubmittedAt ?? null),
          } as Record<string, unknown>;
          await handlePersistFilingToggleState("query_processing", true, nextState);
          toast.success(
            status === "CLOSED"
              ? "Query cleared."
              : status === "REPLIED"
                ? "Offline response submitted."
                : "Query reopened.",
          );
          setFilingQueryStatusUpdates((current) => ({ ...current, [queryId]: "" }));
          await loadFilingData();
        } else {
          toast.error(res.error || "Failed to update filing query.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const buildFilingQueryResponseMessage = (queryId: string, fallbackDetails?: string) => {
      const response = filingQueryStatusUpdates[queryId]?.trim() || fallbackDetails?.trim() || "";
      const responder = (filingQueryResponderNames[queryId] || currentUserDisplayName).trim();
      if (!response) {
        return "";
      }
      return responder ? `Response by ${responder}: ${response}` : response;
    };

    const handleAddFilingQueryComment = async (queryId: string) => {
      const message = buildFilingQueryResponseMessage(queryId);
      if (!message) {
        toast.error("Enter an offline update before saving.");
        return;
      }

      setLoading(`filing-query-comment-${queryId}`);
      try {
        const res = await actions.addFilingWorkflowQueryCommentAction(job.id, queryId, { message });
        if (res.ok) {
          toast.success("Offline update saved.");
          setFilingQueryStatusUpdates((current) => ({ ...current, [queryId]: "" }));
          await loadFilingData();
        } else {
          toast.error(res.error || "Failed to save query update.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Customer Advance update expected terms
    const handleUpdateAdvanceExpected = async () => {
      if (expectedAdvance <= 0) {
        toast.error("Please enter a valid positive expected advance amount.");
        return;
      }

      setLoading("adv-expected");
      try {
        const res = await actions.updateCustomerAdvanceExpectedAction(
          job.id,
          job.customerAdvance.id,
          expectedAdvance,
          advanceDueDate ? new Date(advanceDueDate) : undefined,
          advanceAssigneeId || undefined
        );

        if (res.ok) {
          toast.success("Expected customer advance terms updated.");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update expected terms.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Waive customer advance
    const handleWaiveAdvance = async () => {
      if (!waiveAdvanceReason.trim()) {
        toast.error("A waiver justification reason is mandatory.");
        return;
      }

      setLoading("adv-waive");
      try {
        const res = await actions.declareAdvanceNotRequiredAction(
          job.id,
          job.customerAdvance.id,
          waiveAdvanceReason
        );

        if (res.ok) {
          toast.success("Customer advance waived.");
          setWaiveAdvanceReason("");
          setShowWaiveAdvance(false);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to waive advance.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Record customer advance receipt
    const handleRecordAdvanceReceipt = async (e: React.FormEvent) => {
      e.preventDefault();
      const amountNum = parseFloat(receiptAmount);
      if (Number.isNaN(amountNum) || amountNum <= 0 || !receiptDate) {
        toast.error("Valid Amount and Received Date are required.");
        return;
      }

      setLoading("adv-receipt");
      try {
        const mockReceiptKey = `cha/advances/${Math.random().toString(36).substring(7)}_receipt.pdf`;
        const res = await actions.recordCustomerAdvanceReceiptAction(job.id, job.customerAdvance.id, {
          amount: amountNum,
          receivedDate: new Date(receiptDate),
          paymentMethod: receiptMethod,
          referenceNumber: receiptRef || undefined,
          receiptProofKey: mockReceiptKey,
          remarks: receiptRemarks || undefined,
        });

        if (res.ok) {
          toast.success(`Recorded advance payment receipt of ₹${amountNum}`);
          setReceiptAmount("");
          setReceiptDate("");
          setReceiptRef("");
          setReceiptRemarks("");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to record receipt.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Expense line changes
    const handleExpenseLineChange = (index: number, field: string, val: string) => {
      setExpenseLines(
        expenseLines.map((line, i) => (i === index ? { ...line, [field]: val } : line))
      );
    };

    const handleAddExpenseLine = () => {
      setExpenseLines([
        ...expenseLines,
        { category: expenseCategories[0] || "", purpose: "", amount: "", requiredDate: "", remarks: "" },
      ]);
    };

    const handleRemoveExpenseLine = (index: number) => {
      setExpenseLines(expenseLines.filter((_, i) => i !== index));
    };

    // Submit Expense Request
    const handleCreateExpenseRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      if (expenseUrgent && !expenseUrgencyReason.trim()) {
        toast.error("An urgency explanation is mandatory for immediate disbursements.");
        return;
      }

      const lines = expenseLines.map((l) => ({
        category: l.category,
        purpose: l.purpose,
        amount: parseFloat(l.amount) || 0,
        requiredDate: l.requiredDate ? new Date(l.requiredDate) : new Date(),
        supportingDocumentKey: `cha/expenses/support_${Math.random().toString(36).substring(5)}`,
        remarks: l.remarks || undefined,
      }));

      if (lines.some((l) => !l.category || !l.purpose || l.amount <= 0)) {
        toast.error("All lines require a valid category, purpose, and positive amount.");
        return;
      }

      setLoading("expense-request");
      try {
        const res = await actions.createExpenseRequestAction(job.id, {
          isUrgent: expenseUrgent,
          urgencyReason: expenseUrgent ? expenseUrgencyReason : undefined,
          lines,
        });

        if (res.ok) {
          toast.success("Expense request dispatched to accounts.");
          // Reset
          setExpenseUrgent(false);
          setExpenseUrgencyReason("");
          setExpenseLines([{ category: expenseCategories[0] || "", purpose: "", amount: "", requiredDate: "", remarks: "" }]);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to dispatch expense.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Urgent Escalate Expense Action
    const handleEscalateExpense = async () => {
      if (!escUrgencyReason.trim() || !escRequestId) {
        toast.error("Urgency reason is mandatory for escalation.");
        return;
      }

      setLoading(`esc-${escRequestId}`);
      try {
        const res = await actions.triggerUrgentExpenseEscalationAction(escRequestId, escUrgencyReason);
        if (res.ok) {
          toast.success("Disbursement escalated to Urgent status.");
          setEscUrgencyReason("");
          setEscRequestId(null);
          router.refresh();
        } else {
          toast.error(res.error || "Escalation failed.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Admin review action status change
    const handleExpenseReview = async () => {
      if (!expReviewId || !expReviewStatus) return;
      if ((expReviewStatus === "CLARIFICATION_REQUIRED" || expReviewStatus === "REJECTED") && !expReviewRemarks.trim()) {
        toast.error("Review remarks explanation is mandatory for rejections or clarifications.");
        return;
      }

      setLoading(`review-${expReviewId}`);
      try {
        const res = await actions.setExpenseStatusAction(
          expReviewId,
          expReviewStatus as any,
          expReviewRemarks
        );

        if (res.ok) {
          toast.success("Expense status updated.");
          setExpReviewId(null);
          setExpReviewRemarks("");
          router.refresh();
        } else {
          toast.error(res.error || "Action failed.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Post payment disburse details
    const handlePostExpensePayment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!payRequestId || !payAmount || !payDate || !payRef) {
        toast.error("All payment disburse fields are mandatory.");
        return;
      }

      setLoading(`pay-${payRequestId}`);
      try {
        const mockProofKey = `cha/expenses/proof_${Math.random().toString(36).substring(7)}_receipt.jpg`;
        const res = await actions.postExpensePaymentAction(payRequestId, {
          amountPaid: parseFloat(payAmount),
          paymentDate: new Date(payDate),
          paymentMethod: payMethod,
          transactionReference: payRef,
          paymentProofKey: mockProofKey,
        });

        if (res.ok) {
          toast.success("Expense payout posted. Requester notified.");
          setPayRequestId(null);
          setPayAmount("");
          setPayDate("");
          setPayRef("");
          router.refresh();
        } else {
          toast.error(res.error || "Payout post failed.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Acknowledge receipt
    const handleAcknowledgeExpense = async (reqId: string) => {
      setLoading(`ack-${reqId}`);
      try {
        const res = await actions.acknowledgeExpenseReceiptAction(reqId);
        if (res.ok) {
          toast.success("Receipt acknowledged.");
          router.refresh();
        } else {
          toast.error(res.error || "Acknowledge failed.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Raise Query on Expense
    const handleRaiseQuery = async () => {
      if (!queryText.trim() || !queryRequestId) {
        toast.error("Written query description is mandatory.");
        return;
      }

      setLoading(`query-${queryRequestId}`);
      try {
        const res = await actions.raisePaymentQueryAction(queryRequestId, queryText);
        if (res.ok) {
          toast.success("Disbursement query dispatched.");
          setQueryText("");
          setQueryRequestId(null);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to raise query.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    // Resolve Query
    const handleResolveQuery = async () => {
      if (!resolutionText.trim() || !resolveQueryId) {
        toast.error("Resolution response is mandatory.");
        return;
      }

      setLoading(`resolve-${resolveQueryId}`);
      try {
        const res = await actions.resolvePaymentQueryAction(resolveQueryId, resolutionText);
        if (res.ok) {
          toast.success("Query resolved successfully.");
          setResolutionText("");
          setResolveQueryId(null);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to resolve query.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(null);
      }
    };

    const stageProgress = activeStepIndex >= 0 ? Math.round(((activeStepIndex + 1) / STAGES.length) * 100) : 0;
    const workspaceTabs: { key: WorkspaceTab; label: string; count?: number }[] = [
      { key: "docs", label: "Documents", count: visibleDocumentRequirements.length },
      { key: "additionalData", label: "Additional Data" },
      { key: "checklist", label: "Checklist" },
      { key: "filing", label: "Filing" },
      { key: "advances", label: "Advances" },
      { key: "expenses", label: "Expenses", count: job.expenseRequests?.length || 0 },
      { key: "audit", label: "Audit" },
    ];

    return (
      <main className="w-full space-y-3 overflow-x-hidden pb-4">
        {dueDateWarnings.map((warning) => (
          <ChaDueDateWarningNote
            key={warning.notificationId}
            warning={warning}
            onAcknowledged={() => {
              setDueDateWarnings((current) =>
                current.filter((entry) => entry.notificationId !== warning.notificationId),
              );
            }}
          />
        ))}

        {/* Compact Job Header */}
        <section className="rounded-xl border border-outline-variant/60 bg-surface shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="uppercase">
                  {job.jobType.name}
                </Badge>
                {job.shipmentType ? (
                  <Badge variant="secondary" className="uppercase">
                    {job.shipmentType.name}
                  </Badge>
                ) : null}
                <span className="rounded-md bg-surface-container-low px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant ds-numeric">
                  {job.branch.name}
                </span>
                <Badge variant={getChaJobStatusBadgeVariant(job.status)} className="uppercase">
                  {formatChaBadgeLabel(job.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <h1 className="ds-h1 ds-numeric text-on-surface">{job.jobNumber}</h1>
                <p className="max-w-4xl truncate text-sm font-medium text-on-surface">{job.title}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-variant">
                <span>Customer: <span className="text-on-surface">{job.customer.name}</span></span>
                <span className="text-outline">•</span>
                <span>Owner: <span className="text-on-surface">{job.primaryOwner.name}</span></span>
                <span className="text-outline">•</span>
                <span>
                  Manager:{" "}
                  {job.assignedManager ? (
                    <span className="text-on-surface">{job.assignedManager.name}</span>
                  ) : (
                    <span className="text-red-500">Not assigned</span>
                  )}
                </span>
                {canUpdateJob ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingManager(true)}
                    className="ds-plain cha-link ds-label hover:underline"
                  >
                    Change
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
              <div className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2">
                <span className="ds-label block text-on-surface-variant">Stage</span>
                <span className="mt-0.5 block whitespace-nowrap text-xs uppercase tracking-wide text-on-surface">
                  {job.stage.replace(/_/g, " ")}
                </span>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2">
                <span className="ds-label block text-on-surface-variant">Progress</span>
                <span className="mt-0.5 block text-xs text-[#00cec4] ds-numeric">{stageProgress}%</span>
              </div>
              {canDeleteJob ? (
                <Button
                  variant="destructive"
                  className="col-span-2 min-h-9 sm:col-span-1"
                  disabled={loading !== null || Boolean(activeDeletionRequest)}
                  onClick={() => setDeleteModalMode("delete")}
                >
                  <Trash2 className="mr-2 size-4" />
                  {activeDeletionRequest ? "Deletion Pending" : "Delete"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="border-t border-outline-variant/25 px-4 py-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STAGES.map((stage, index) => {
                const isCompleted = index < activeStepIndex;
                const isActive = index === activeStepIndex;
                return (
                  <div key={stage.key} className="flex min-w-fit items-center gap-2">
                    <span
                      className={`flex size-6 items-center justify-center rounded-full border text-[10px] font-bold ${
                        isCompleted
                          ? "border-[#00cec4] bg-[#00cec4] text-white"
                          : isActive
                            ? "border-[#00cec4] bg-surface text-[#00cec4] shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
                            : "border-outline-variant bg-surface text-on-surface-variant"
                      }`}
                    >
                      {isCompleted ? <Check size={13} /> : index + 1}
                    </span>
                    <span className={`whitespace-nowrap text-[10px] uppercase tracking-wide ${isActive ? "text-[#00cec4]" : "text-on-surface-variant"}`}>
                      {stage.label}
                    </span>
                    {index < STAGES.length - 1 ? <span className="h-px w-5 bg-outline-variant/50" /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {!job.assignedManagerId && (
          <div className="rounded-2xl border border-[#fb923c]/35 bg-[#fb923c]/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <span className="ds-label text-[#fb923c]">Job Settings Alert</span>
                <p className="text-sm font-semibold text-on-surface">
                  No manager assigned for this job.
                </p>
                <p className="text-xs text-on-surface-variant">
                  An assigned manager is required to proceed with checklist upload and approval.
                </p>
              </div>
              {canUpdateJob && (
                <Button
                  variant="outline"
                  className="border-[#fb923c]/50 text-[#fb923c] hover:bg-[#fb923c]/10 shrink-0"
                  onClick={() => setIsEditingManager(true)}
                >
                  Assign Manager
                </Button>
              )}
            </div>
          </div>
        )}

        {activeDeletionRequest ? (
          <div className="rounded-2xl border border-[#fb923c]/35 bg-[#fb923c]/8 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <span className="ds-label text-[#fb923c]">Deletion Workflow</span>
                <p className="text-sm font-medium text-on-surface">
                  {activeDeletionRequest.status === "PENDING"
                    ? `Deletion request is pending with ${activeDeletionRequest.assignedManager?.name || "the assigned manager"}.`
                    : "Deletion request has been approved and is awaiting execution."}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Requested by {activeDeletionRequest.requestedBy?.name || "Unknown"} on{" "}
                  {new Date(activeDeletionRequest.requestedAt).toLocaleString("en-IN")}
                </p>
              </div>

              {pendingDeletionReview && canApproveDeleteJob ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-500 hover:bg-red-50"
                    disabled={loading !== null}
                    onClick={() => setDeleteModalMode("reject")}
                  >
                    Reject Request
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={loading !== null}
                    onClick={() => setDeleteModalMode("approve")}
                  >
                    Approve & Delete
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Sticky Compact Tab Controls */}
        <nav className="sticky top-0 z-20 py-2">
          <div className="rounded-xl border border-outline-variant/40 bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
            <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-3">
              {workspaceTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`ds-plain cha-link cha-link-quiet ds-label inline-flex flex-1 basis-[9rem] items-center justify-center gap-1 px-2 text-center sm:basis-auto ${
                      isActive
                        ? "font-normal text-[#00cec4] underline underline-offset-4"
                        : "font-normal text-on-surface-variant hover:text-[#00b8af] hover:underline hover:underline-offset-4"
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined ? <span className="ml-1 ds-numeric">({tab.count})</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Tab Panels */}
        <div className="min-h-[320px] rounded-xl border border-outline-variant/60 bg-surface p-3 shadow-sm sm:p-4">
          
          {/* PANEL: DOCUMENTS */}
          {activeTab === "docs" && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-outline-variant/20 pb-4">
                <SectionHeading
                  title="Required Customs Documents"
                  description="Upload required files or declare exceptions to pass the document gate. Workflow-uploaded files, Section 49, and Extension documents also appear here with source and validity tracking."
                />
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMarkAllNotAvailable}
                    disabled={loading !== null || bulkNaEligibleRequirements.length === 0}
                    className="border-[#fb923c]/50 text-[#fb923c] hover:bg-[#fb923c]/10"
                  >
                    {loading === "na-all" ? "Marking..." : "Mark All N/A"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsCustomDocumentModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Add Custom Document
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="ds-label">Customs Validity Controls</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Activate Section 49 here to reveal its document card in the list below.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSection49Modal(true)}
                  disabled={loading !== null || !canUpdateJob}
                  className={
                    section49Flag?.isEnabled
                      ? "border-[#00cec4]/50 text-[#00cec4] hover:bg-[#00cec4]/10"
                      : "border-[#fb923c]/50 text-[#fb923c] hover:bg-[#fb923c]/10"
                  }
                >
                  {section49Flag?.isEnabled ? "Deactivate Section 49" : "Activate Section 49"}
                </Button>
              </div>

              {/* Categories and grouped requirement slots */}
              {(() => {
                const groupedRequirements: Record<string, any[]> = {};
                visibleDocumentRequirements.forEach((req: any) => {
                  const categoryName = req.requirementItem?.category?.name || req.category || "General Documents";
                  if (!groupedRequirements[categoryName]) {
                    groupedRequirements[categoryName] = [];
                  }
                  groupedRequirements[categoryName].push(req);
                });

                const categoryKeys = Object.keys(groupedRequirements).sort();

                if (categoryKeys.length === 0) {
                  return (
                    <p className="text-sm text-on-surface-variant italic py-4">No document requirements configured for this job.</p>
                  );
                }

                return (
                  <div className="space-y-4">
                    {categoryKeys.map((categoryName) => {
                      const reqs = groupedRequirements[categoryName];
                      const uploadedRequirements = reqs.filter((req: any) => req.status === "UPLOADED");
                      const exemptionRequirements = reqs.filter(
                        (req: any) => req.status === "NOT_AVAILABLE" && req.exception?.reason && req.exception.reason !== "N/A"
                      );
                      const markedNaRequirements = reqs.filter(
                        (req: any) => req.status === "NOT_AVAILABLE" && req.exception?.reason === "N/A"
                      );
                      const pendingRequirements = reqs.filter(
                        (req: any) =>
                          req.status !== "UPLOADED" &&
                          !(req.status === "NOT_AVAILABLE" && req.exception?.reason && req.exception.reason !== "N/A") &&
                          !(req.status === "NOT_AVAILABLE" && req.exception?.reason === "N/A")
                      );
                      const requirementSections = [
                        {
                          key: "uploaded",
                          title: "Uploaded",
                          requirements: uploadedRequirements,
                        },
                        {
                          key: "exempted",
                          title: "Exempted",
                          requirements: exemptionRequirements,
                        },
                        {
                          key: "na",
                          title: "Marked as N/A",
                          requirements: markedNaRequirements,
                        },
                        {
                          key: "pending",
                          title: "Awaiting Upload",
                          requirements: pendingRequirements,
                        },
                      ].filter((section) => section.requirements.length > 0);

                      return (
                        <div key={categoryName} className="space-y-4">
                          <SectionHeading title={categoryName} />
                          <div className="space-y-4">
                            {requirementSections.map((section) => (
                              <div key={section.key} className="space-y-2">
                                <div className="flex items-center justify-between gap-3 border-b border-outline-variant/10 pb-2">
                                  <p className="ds-label text-on-surface-variant">{section.title}</p>
                                  <span className="ds-numeric text-[11px] text-on-surface-variant">
                                    {section.requirements.length}
                                  </span>
                                </div>
                                <div className="grid items-start grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {section.requirements.map((req: any) => {
                              const isUploaded = req.status === "UPLOADED";
                              const isExempted = req.status === "NOT_AVAILABLE" || !!req.exception;
                              const isPendingRequirement = section.key === "pending";
                              const currentVersion = req.versions.find((v: any) => v.isCurrent);
                              const isSection49Requirement = req.name === "Section 49";
                              const effectiveValidityDate =
                                isSection49Requirement ? section49Flag?.validityDate || currentVersion?.validityDate : currentVersion?.validityDate;
                              const validitySummary = getValiditySummary(effectiveValidityDate || null);
                              const section49WarningActive =
                                isSection49Requirement &&
                                effectiveValidityDate &&
                                ["warning", "destructive"].includes(validitySummary?.tone || "");
                              return (
                                  <div
                                    key={req.id}
                                    ref={(element) => {
                                      documentRequirementCardRefs.current[req.id] = element;
                                    }}
                                    className={`p-4 rounded-2xl border flex flex-col justify-between bg-[var(--color-surface)] ${
                                      isUploaded
                                        ? "card-left-accent border-[#00cec4]/30"
                                        : isPendingRequirement
                                          ? "border-red-500/30"
                                          : "card-left-accent-orange border-[#fb923c]/30"
                                    } ${
                                      highlightedDocumentReqId === req.id
                                        ? isPendingRequirement
                                          ? "animate-doc-missing-blink-red"
                                          : "animate-doc-missing-blink"
                                        : ""
                                    }`}
                                    style={
                                      isPendingRequirement
                                        ? {
                                            borderLeftWidth: "3px",
                                            borderLeftColor: "rgb(239 68 68 / 0.9)",
                                          }
                                        : undefined
                                    }
                                  >
                                  <div>
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-sm text-on-surface">{req.name}</span>
                                        <div className="flex items-center gap-1.5">
                                          {req.isMandatory && (
                                            <Badge variant="destructive" className="uppercase">
                                              MANDATORY
                                            </Badge>
                                          )}
                                          <Badge
                                            variant={getChaDocumentStatusBadgeVariant(req.status)}
                                            className="uppercase"
                                          >
                                            {formatChaBadgeLabel(req.status)}
                                          </Badge>
                                          {req.requirementItem?.requiresValidityDate || req.requirementItem?.defaultValidityDuration ? (
                                            <Badge variant="warning" className="uppercase">
                                              Validity
                                            </Badge>
                                          ) : null}
                                        </div>
                                      </div>

                                    {req.requirementItem?.description && (
                                      <p className="text-xs text-on-surface-variant mt-1">{req.requirementItem.description}</p>
                                    )}

                                    {isSection49Requirement && (
                                      <div className="mt-3 space-y-3 rounded-xl border border-outline-variant/40 dark:border-[#00cec4]/20 bg-surface-container-low p-3.5">
                                        {section49Flag?.validityDate ? (
                                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 pb-2.5">
                                            <div className="flex items-center gap-2">
                                              <span className="ds-label text-on-surface-variant font-medium">Saved Section 49 Validity:</span>
                                              <span className="rounded-lg border border-[#00cec4]/35 bg-[#00cec4]/10 px-2.5 py-0.5 text-xs font-semibold text-[#00cec4] ds-numeric">
                                                {new Date(section49Flag.validityDate).toLocaleDateString("en-IN")}
                                              </span>
                                            </div>
                                            {validitySummary ? (
                                              <span
                                                className={`text-xs font-semibold ${
                                                  validitySummary.tone === "destructive"
                                                    ? "text-red-500"
                                                    : validitySummary.tone === "warning"
                                                      ? "text-[#fb923c]"
                                                      : "text-green-500"
                                                }`}
                                              >
                                                {validitySummary.detail}
                                              </span>
                                            ) : null}
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto] sm:items-end pb-1">
                                            <label className="space-y-1">
                                              <span className="ds-label">Section 49 Validity Date</span>
                                              <DateInput
                                                value={section49ValidityDate}
                                                onChange={(e) => setSection49ValidityDate(e.target.value)}
                                                disabled={loading !== null || !canUpdateJob}
                                                className="w-full ds-numeric"
                                              />
                                            </label>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={handleSaveSection49Validity}
                                              disabled={loading !== null || !canUpdateJob || !section49ValidityDate}
                                              className="h-10"
                                            >
                                              {loading === "section49-validity" ? "Saving..." : "Save Date"}
                                            </Button>
                                          </div>
                                        )}

                                        {section49Flag?.validityDate ? (
                                          <div className="space-y-3 pt-1">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_2fr_auto] sm:items-end">
                                              <label className="space-y-1">
                                                <span className="ds-label">New Validity Date</span>
                                                <DateInput
                                                  value={section49ExtensionDate}
                                                  onChange={(e) => setSection49ExtensionDate(e.target.value)}
                                                  disabled={loading !== null || !canUpdateJob}
                                                  className="w-full ds-numeric"
                                                />
                                              </label>
                                              <FileUploadField
                                                id="section49-extension-upload"
                                                compact
                                                label="Extension Document"
                                                accept="application/pdf,image/*"
                                                disabled={loading !== null || !canUpdateJob}
                                                helperText="Upload a PDF or image before applying the extension."
                                                triggerText="Choose extension document"
                                                selectedFile={
                                                  section49ExtensionFile
                                                    ? {
                                                        file: section49ExtensionFile,
                                                        name: section49ExtensionFile.name,
                                                        sizeBytes: section49ExtensionFile.size,
                                                        statusLabel: "Ready",
                                                      }
                                                    : null
                                                }
                                                onClear={() => setSection49ExtensionFile(null)}
                                                onInputChange={(e) => setSection49ExtensionFile(e.target.files?.[0] ?? null)}
                                              />
                                              <Button
                                                type="button"
                                                size="sm"
                                                onClick={handleApplySection49Extension}
                                                disabled={
                                                  loading !== null ||
                                                  !canUpdateJob ||
                                                  !section49WarningActive ||
                                                  !section49ExtensionDate ||
                                                  !section49ExtensionFile
                                                }
                                                className="h-10 w-full sm:w-auto"
                                              >
                                                {loading === "section49-extension" ? "Applying..." : "Apply Extension"}
                                              </Button>
                                            </div>
                                            <p className="text-[11px] leading-relaxed text-on-surface-variant">
                                              {!section49WarningActive ? (
                                                <span className="text-[#fb923c] font-medium">
                                                  ⚠️ Extension entry is saved here, but submission becomes available only within 4 days of expiry.
                                                </span>
                                              ) : (
                                                <span>
                                                  An extension document and new validity date are required to apply the extension.
                                                </span>
                                              )}
                                            </p>

                                            {Array.isArray(job.section49Extensions) && job.section49Extensions.length > 0 ? (
                                              <div className="space-y-1 border-t border-outline-variant/30 pt-3 text-xs">
                                                <span className="ds-label">Extension History</span>
                                                {job.section49Extensions.slice(0, 3).map((extension: any) => (
                                                  <div key={extension.id} className="flex flex-wrap items-center justify-between gap-2 text-on-surface-variant">
                                                    <span className="ds-numeric">
                                                      {new Date(extension.extensionDate).toLocaleDateString("en-IN")}
                                                    </span>
                                                    {extension.fileKey ? (
                                                      <a
                                                        href={extension.fileKey}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[#00cec4] hover:underline"
                                                      >
                                                        {extension.fileName || "View document"}
                                                      </a>
                                                    ) : null}
                                                  </div>
                                                ))}
                                              </div>
                                            ) : null}
                                          </div>
                                        ) : null}
                                      </div>
                                    )}

                                    {/* Display Uploaded File details */}
                                    {isUploaded && currentVersion && (
                                      <div className="mt-3 rounded-lg border border-outline-variant/40 bg-surface p-2.5 text-xs">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex min-w-0 items-center gap-2 truncate">
                                          <FileText size={16} className="text-green-600 shrink-0" />
                                          {currentVersion.fileKey.startsWith("http") ? (
                                            <a
                                              href={currentVersion.fileKey}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="truncate font-medium text-[#00cec4] hover:underline flex items-center gap-1"
                                              title="Open in Google Drive"
                                            >
                                              <span className="truncate">{currentVersion.fileName}</span>
                                              <ExternalLink size={12} className="shrink-0" />
                                            </a>
                                          ) : (
                                            <span className="truncate font-medium">{currentVersion.fileName}</span>
                                          )}
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0 pl-2">
                                            <span className="text-[10px] text-on-surface-variant font-mono ds-numeric">
                                            {(currentVersion.sizeBytes / 1024).toFixed(1)} KB
                                            </span>
                                            {(currentUserId === currentVersion.uploadedById ||
                                              currentUserId === job.primaryOwnerId ||
                                              canDeleteDoc ||
                                              canManageSettings) && (
                                              <button
                                                type="button"
                                                className="text-red-500 hover:text-red-700 transition-colors p-1"
                                                onClick={() =>
                                                  setDeleteDocModal({
                                                    reqId: req.id,
                                                    versionId: currentVersion.id,
                                                    fileName: currentVersion.fileName,
                                                  })
                                                }
                                                title="Delete document version"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="mt-2 grid grid-cols-1 gap-2 text-[11px] text-on-surface-variant md:grid-cols-2">
                                          <div>
                                            <span className="ds-label block">Source</span>
                                            <span className="text-on-surface">
                                              {currentVersion.source === "FILING_WORKFLOW" ? "Filing Workflow" : "Documents Page"}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="ds-label block">Uploaded By</span>
                                            <span className="text-on-surface">{currentVersion.uploadedBy?.name || currentUserName}</span>
                                          </div>
                                          <div>
                                            <span className="ds-label block">Uploaded On</span>
                                            <span className="text-on-surface">
                                              {currentVersion.uploadedAt ? new Date(currentVersion.uploadedAt).toLocaleDateString("en-IN") : "Just now"}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="ds-label block">Validity</span>
                                            <span
                                              className={
                                                validitySummary?.tone === "destructive"
                                                  ? "text-red-500"
                                                  : validitySummary?.tone === "warning"
                                                    ? "text-[#fb923c]"
                                                    : "text-on-surface"
                                              }
                                            >
                                              {validitySummary?.detail || "Not required"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Display N/A / Exception status */}
                                    {isExempted && req.exception && (
                                      <div className="mt-3 bg-surface border border-orange-500/30 p-2.5 rounded-lg text-xs space-y-1">
                                        {req.exception.reason === "N/A" ? (
                                          <p className="font-medium text-[#fb923c]">Marked as N/A</p>
                                        ) : (
                                          <>
                                            <p className="font-medium text-[#fb923c]">Exemption reason:</p>
                                            <p className="text-on-surface">{req.exception.reason}</p>
                                          </>
                                        )}
                                        <span className="text-[10px] text-on-surface-variant block">
                                          {req.exception.reason === "N/A" ? "Marked" : "Declared"} by: {req.exception.user?.name || "N/A"}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-4 space-y-3 border-t border-outline-variant/20 pt-3">
                                    {/* Exception form pop */}
                                    {activeDocReqId === req.id ? (
                                      <div className="w-full space-y-2">
                                        <input
                                          type="text"
                                          placeholder="Enter detailed reason for exemption..."
                                          value={exceptionReason}
                                          onChange={(e) => setExceptionReason(e.target.value)}
                                          className="w-full text-xs py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-2xl"
                                        />
                                        <div className="flex flex-wrap justify-end gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setActiveDocReqId(null);
                                              setExceptionReason("");
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => handleDeclareException(req.id)}
                                          >
                                            Save Exemption
                                          </Button>
                                        </div>
                                      </div>
                                    ) : null}

                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                      {isUploaded && currentVersion && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="text-xs border-[#00cec4] text-[#00cec4] hover:bg-[#00cec4]/5"
                                          onClick={() => setViewingVersion({ ...currentVersion, type: 'document' })}
                                        >
                                          View File
                                        </Button>
                                      )}

                                      {isExempted ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="text-xs border-[#fb923c]/50 text-[#fb923c] hover:bg-surface"
                                          onClick={() => handleRemoveException(req.id)}
                                          disabled={loading !== null}
                                        >
                                          Undo N/A
                                        </Button>
                                      ) : (
                                        !activeDocReqId && (
                                          <>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="text-xs"
                                              onClick={() => {
                                                setActiveDocReqId((current) => (current === req.id ? null : req.id));
                                                setExceptionReason(req.exception?.reason === "N/A" ? "" : req.exception?.reason || "");
                                              }}
                                            >
                                              Declare Exemption
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="text-xs border-[#fb923c]/50 text-[#fb923c] hover:bg-[#fb923c]/10"
                                              onClick={() => handleMarkNotAvailable(req.id)}
                                              disabled={loading !== null}
                                            >
                                              {loading === `na-${req.id}` ? "Marking..." : "Mark as N/A"}
                                            </Button>
                                          </>
                                        )
                                      )}

                                      <Button
                                        type="button"
                                        size="sm"
                                        className="gap-1.5 text-xs font-bold uppercase tracking-wide"
                                        onClick={() => setUploadDocumentModalReqId(req.id)}
                                      >
                                        <Upload size={12} />
                                        {isUploaded ? "Re-upload" : isExempted ? "Upload File Anyway" : "Upload File"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Stage Proceed button for Document Collection stage */}
              {job.stage === "DOCUMENT_COLLECTION" && (
                <div className="pt-4 border-t border-outline-variant/30 flex flex-col items-end gap-3">
                  {proceedErrors && (
                    <div className="w-full md:max-w-xl p-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-500 text-xs">
                      <p className="font-semibold uppercase tracking-wider ds-label text-orange-500 mb-1">Proceed Blocked</p>
                      <p>{proceedErrors[0]}</p>
                    </div>
                  )}
                  <Button
                    onClick={handleProceedStage}
                    disabled={loading !== null}
                    className="w-full sm:w-auto bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] font-bold tracking-wider"
                  >
                    {loading === "proceed-stage" ? "Advancing stage..." : "Proceed to Additional Data"}
                    <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* PANEL: ADDITIONAL DATA */}
          {activeTab === "additionalData" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 border-b border-outline-variant/20 pb-4 md:flex-row md:items-start md:justify-between">
                <SectionHeading
                  title="CHA Additional Data"
                  description="Capture manifest and delivery-order validity details before checklist preparation."
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex min-h-8 items-center rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                      additionalDataComplete
                        ? "border-[#00cec4]/40 bg-[#00cec4]/10 text-[#00cec4]"
                        : "border-[#fb923c]/40 bg-[#fb923c]/10 text-[#fb923c]"
                    }`}
                  >
                    {additionalDataComplete ? "Complete" : "Pending"}
                  </span>
                </div>
              </div>

              {job.stage === "DOCUMENT_COLLECTION" ? (
                <div className="flex items-start gap-3 rounded-2xl border border-[#fb923c]/40 bg-surface p-4">
                  <AlertTriangle size={22} className="mt-0.5 shrink-0 text-[#fb923c]" />
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wide text-[#fb923c]">DOCUMENT GATE REQUIRED</h4>
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                      Complete Document Collection before saving or completing Additional Data.
                    </p>
                  </div>
                </div>
              ) : null}

              {manifestConfigMissing ? (
                <div className="flex items-start gap-3 rounded-2xl border border-[#fb923c]/40 bg-surface p-4">
                  <AlertTriangle size={22} className="mt-0.5 shrink-0 text-[#fb923c]" />
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wide text-[#fb923c]">Manifest Configuration Required</h4>
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                      This clearance type is missing manifest configuration. Please update it in CHA settings before continuing.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <AdditionalDataStatCard label="Status" value={job.additionalData?.status ?? "PENDING"} />
                <AdditionalDataStatCard
                  label="Last Updated"
                  value={job.additionalData?.updatedAt
                    ? new Date(job.additionalData.updatedAt).toLocaleDateString("en-IN")
                    : "Not saved"}
                  numeric
                />
                <AdditionalDataStatCard label="Manifest" value={manifestPreview} numeric />
                <AdditionalDataStatCard label="Direction" value={manifestMovementDirection || "Not Configured"} />
                <AdditionalDataStatCard label="BL No" value={blPreview} />
                <AdditionalDataStatCard label="Containers" value={String(populatedContainerCount)} numeric />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
                <div className="space-y-4">
                  <div className="card-cyan-outline card-top-accent rounded-xl border border-outline-variant/40 bg-surface p-4 shadow-sm">
                    <SectionHeading
                      title="Core Filing Data"
                      description="Complete the job movement and manifest references required before checklist preparation."
                    />
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                      <label className="space-y-1.5 xl:col-span-4">
                        <span className="ds-label">Vessel Inward Date</span>
                        <DateInput
                          value={vesselInwardDate}
                          onChange={(e) => setVesselInwardDate(e.target.value)}
                          disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                          required
                          className="w-full"
                        />
                      </label>
                      <label className="space-y-1.5 xl:col-span-4">
                        <span className="ds-label">Delivery Order Validity</span>
                        <DateInput
                          id="deliveryOrderValidity"
                          value={deliveryOrderValidity}
                          onChange={(e) => setDeliveryOrderValidity(e.target.value)}
                          disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                          required
                          className="w-full"
                        />
                      </label>
                      {requiresIgm ? (
                        <label className="space-y-1.5 xl:col-span-4">
                          <span className="ds-label">IGM Number</span>
                          <Input
                            type="text"
                            inputMode="text"
                            pattern="[A-Za-z0-9]*"
                            value={importGeneralManifest}
                            onChange={(e) => setImportGeneralManifest(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                            disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked || manifestConfigMissing}
                            required={manifestMandatory}
                            className="w-full"
                            placeholder={job.jobType?.manifestHelpText || "Enter IGM reference"}
                          />
                        </label>
                      ) : null}
                      {requiresEgm ? (
                        <label className="space-y-1.5 xl:col-span-4">
                          <span className="ds-label">EGM Number</span>
                          <Input
                            type="text"
                            inputMode="text"
                            pattern="[A-Za-z0-9]*"
                            value={exportGeneralManifest}
                            onChange={(e) => setExportGeneralManifest(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                            disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked || manifestConfigMissing}
                            required={manifestMandatory}
                            className="w-full"
                            placeholder={job.jobType?.manifestHelpText || "Enter EGM reference"}
                          />
                        </label>
                      ) : null}
                      {requiresCustomManifest ? (
                        <label className="space-y-1.5 xl:col-span-4">
                          <span className="ds-label">{customManifestLabel}</span>
                          <Input
                            type="text"
                            value={customManifestValue}
                            onChange={(e) => setCustomManifestValue(e.target.value)}
                            disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked || manifestConfigMissing}
                            required={manifestMandatory}
                            className="w-full"
                            placeholder={job.jobType?.manifestHelpText || `Enter ${customManifestLabel}`}
                          />
                        </label>
                      ) : null}
                    </div>
                    {job.additionalData ? (
                      <div className="mt-4 pt-4">
                        <DoValidityPanel
                          key={job.additionalData.deliveryOrderExtensionDate ?? "no-do-extension-date"}
                          jobId={job.id}
                          canUpdateJob={canUpdateJob}
                          additionalData={{
                            deliveryOrderValidity: job.additionalData.deliveryOrderValidity ?? null,
                            deliveryOrderExtensionDate: job.additionalData.deliveryOrderExtensionDate ?? null,
                            doDocumentFileKey: job.additionalData.doDocumentFileKey ?? null,
                            doDocumentFileName: job.additionalData.doDocumentFileName ?? null,
                            doDocumentUploadedAt: job.additionalData.doDocumentUploadedAt ?? null,
                          }}
                          extensions={job.doExtensions ?? []}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="card-cyan-outline card-top-accent rounded-xl border border-outline-variant/40 bg-surface p-4 shadow-sm">
                    <SectionHeading
                      title="BL References"
                      description="Store master and house bill numbers alongside the shipment record."
                    />
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      <label className="space-y-1.5">
                        <span className="ds-label">MBL</span>
                        <Input
                          type="text"
                          value={mblNumber}
                          onChange={(e) => setMblNumber(e.target.value)}
                          disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                          className="w-full"
                          placeholder="Enter MBL number"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="ds-label">HBL</span>
                        <Input
                          type="text"
                          value={hblNumber}
                          onChange={(e) => setHblNumber(e.target.value)}
                          disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                          className="w-full"
                          placeholder="Enter HBL number"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="card-cyan-outline card-top-accent rounded-xl border border-outline-variant/40 bg-surface p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <SectionHeading
                        title="Containers"
                        description="Add only the container numbers that need to stay with this job."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addContainerEntry}
                        disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                        className="w-full sm:w-auto"
                      >
                        <Plus className="mr-1.5 size-4" />
                        Add Container
                      </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      {containerEntries.map((entry, index) => (
                        <div key={`container-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_64px] md:items-end">
                          <label className="space-y-1.5">
                            <span className="ds-label">Container {index + 1}</span>
                            <Input
                              type="text"
                              value={entry.containerNumber}
                              onChange={(e) => updateContainerEntry(index, "containerNumber", e.target.value)}
                              disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                              className="w-full"
                              placeholder={`Enter container ${index + 1} number`}
                            />
                          </label>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              mode="icon"
                              onClick={() => removeContainerEntry(index)}
                              disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                              aria-label={`Remove container ${index + 1}`}
                              className="h-11 w-full border-outline-variant/60 text-on-surface-variant hover:border-red-500/40 hover:bg-surface hover:text-red-500 md:w-16"
                            >
                              <Trash2 className="size-5" strokeWidth={2.2} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
                {hasSavedAdditionalData && !additionalDataStageLocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading !== null || isAdditionalDataEditing || !canUpdateJob}
                    onClick={() => setIsAdditionalDataEditing(true)}
                    className="w-full sm:w-auto"
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit Additional Data
                  </Button>
                ) : null}
                {!additionalDataLocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading !== null || job.stage === "DOCUMENT_COLLECTION" || manifestConfigMissing}
                    onClick={handleSaveAdditionalData}
                    className="w-full sm:w-auto"
                  >
                    <Database className="mr-2 size-4" />
                    {loading === "additional-data-save" ? "Saving..." : "Save Additional Data"}
                  </Button>
                ) : null}
                {job.stage === "ADDITIONAL_DATA" ? (
                  <Button
                    type="button"
                    disabled={loading !== null || !additionalDataComplete || manifestConfigMissing}
                    onClick={handleProceedAdditionalData}
                    className="w-full sm:w-auto"
                  >
                    {loading === "additional-data-proceed" ? "Saving and Proceeding..." : "Proceed to Checklist Prep"}
                    <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          )}

          {/* PANEL: CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="space-y-4">
              <SectionHeading
                title="Checklist Workflow"
                description="Upload, route, and track checklist approvals through internal and customer review."
                aside={
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={currentChecklistVersion ? "default" : "warning"} className="uppercase">
                      {checklistWorkflow?.status?.replace(/_/g, " ") || "Pending Upload"}
                    </Badge>
                    {checklistWorkflow?.customerRejectedOnce ? (
                      <Badge variant="warning" className="uppercase">
                        Rework Required
                      </Badge>
                    ) : null}
                  </div>
                }
              />

              {/* Check if gate is open */}
              {activeStepIndex < checklistStageIndex ? (
                <div className="bg-surface border border-[#fb923c]/40 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle size={24} className="text-[#fb923c] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-[#fb923c]">CHECKLIST PREPARATION NOT AVAILABLE</h4>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      {job.stage === "DOCUMENT_COLLECTION"
                        ? "Complete Document Collection first. Make sure all mandatory documents are uploaded or exempted."
                        : manifestConfigMissing
                          ? "This clearance type is missing manifest configuration. Update it in CHA settings before continuing."
                          : `Complete the Additional Data process first. Vessel Inward Date, ${manifestLabel}, and DO Validity are required.`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!job.assignedManagerId && (
                    <div className="bg-surface border border-[#fb923c]/40 p-4 rounded-2xl flex items-start gap-3">
                      <AlertTriangle size={24} className="text-[#fb923c] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm uppercase text-[#fb923c]">Manager Assignment Recommended</h4>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                          No manager has been assigned to this job yet. Internal approval can still be completed by the job owner, or route through the owner&apos;s Manager or TL if configured in HRMS, but assigning a manager keeps responsibility explicit.
                        </p>
                        {canUpdateJob && (
                          <button
                            type="button"
                            onClick={() => setIsEditingManager(true)}
                            className="ds-plain cha-link mt-2 text-xs font-semibold hover:underline uppercase tracking-wider"
                          >
                            Assign Manager Now →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <div className="space-y-4">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="ds-label">
                            {currentChecklistVersion ? "Replacement Upload" : "Checklist Upload"}
                          </span>
                          <p className="text-xs text-on-surface-variant">
                            Any file format is allowed here. The uploaded file will move into internal approval automatically.
                          </p>
                        </div>

                        {internalApproversCount === 0 && (
                          <div className="bg-surface border border-red-500/40 p-4 rounded-2xl flex items-start gap-3">
                            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-bold text-xs uppercase text-red-500">No Internal Approvers Configured</h4>
                              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                                There are no active internal checklist approvers configured for this job.
                                Please assign an employee with the <span className="font-medium text-on-surface">Approval</span> responsibility in the job settings, 
                                or verify that the job owner, assigned manager, or owner&apos;s team lead is configured in HRMS.
                              </p>
                              {canManageSettings && (
                                <button
                                  type="button"
                                  onClick={() => router.push("/cha/settings")}
                                  className="ds-plain cha-link mt-2 text-xs font-semibold hover:underline"
                                >
                                  Go to Settings →
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        <FileUploadField
                          id="checklist-file-upload"
                          disabled={loading === "checklist-upload" || internalApproversCount === 0}
                          helperText="Any file format is allowed here. The uploaded file will move into internal approval automatically."
                          triggerText="Drag and drop or choose checklist file to upload"
                          selectedFile={
                            checklistFile
                              ? {
                                  file: checklistFile,
                                  name: checklistFile.name,
                                  sizeBytes: checklistFile.size,
                                  statusLabel: loading === "checklist-upload" ? "Uploading" : "Ready",
                                }
                              : null
                          }
                          onClear={() => setChecklistFile(null)}
                          onInputChange={(e) => handleUploadChecklist(e.target.files?.[0] || null)}
                        />
                        <textarea
                          rows={2}
                          value={checklistRemarks}
                          disabled={internalApproversCount === 0}
                          onChange={(e) => setChecklistRemarks(e.target.value)}
                          placeholder="Optional upload remarks"
                          className="ds-textarea w-full disabled:opacity-50"
                        />
                      </div>

                      {currentChecklistVersion ? (
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <span className="ds-label">Current File</span>
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-xl border border-outline-variant/60">
                            <table className="ds-table">
                              <thead>
                                <tr>
                                  <th>Version</th>
                                  <th>File</th>
                                  <th>Status</th>
                                  <th>Uploaded By</th>
                                  <th>Uploaded At</th>
                                </tr>
                              </thead>
                              <tbody>
                                {checklistWorkflow?.fileVersions?.map((version: any) => {
                                  const versionStatus = getChecklistVersionStatus(version.id);
                                  return (
                                  <tr key={version.id}>
                                    <td className="ds-numeric font-medium">V{version.versionNumber}</td>
                                    <td className="text-xs">
                                      <button
                                        type="button"
                                        className="ds-plain cha-link text-xs font-medium"
                                        onClick={() => setViewingVersion({
                                          ...version,
                                          type: "checklist",
                                          fileName: version.originalFileName,
                                          sizeBytes: version.fileSize,
                                          uploadedBy: { name: getUserName(version.uploadedById) },
                                        })}
                                      >
                                        {version.originalFileName}
                                      </button>
                                    </td>
                                    <td className="text-xs text-on-surface">
                                      {versionStatus ? (
                                        <Badge variant={versionStatus.variant} className="uppercase">
                                          {versionStatus.label}
                                        </Badge>
                                      ) : (
                                        <span className="text-on-surface-variant">Pending</span>
                                      )}
                                    </td>
                                    <td className="text-xs text-on-surface">{getUserName(version.uploadedById)}</td>
                                    <td className="text-xs text-on-surface ds-numeric">
                                      {new Date(version.uploadedAt).toLocaleString("en-IN")}
                                    </td>
                                  </tr>
                                )})}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <div className="card-cyan-outline rounded-xl border border-outline-variant/60 bg-surface p-4 space-y-4 shadow-sm">
                        <div className="space-y-3">
                          <SectionHeading
                            title="Internal Approval"
                            aside={
                              <Badge
                                variant={
                                  approvedInternalDecision
                                    ? "success"
                                    : checklistWorkflow?.currentApprovalStage === "INTERNAL"
                                    ? "warning"
                                    : "secondary"
                                }
                                className="uppercase"
                              >
                                {approvedInternalDecision
                                  ? "Approved"
                                  : checklistWorkflow?.currentApprovalStage === "INTERNAL"
                                  ? "Pending"
                                  : "Locked"}
                              </Badge>
                            }
                          />
                          <p className="text-sm font-semibold text-on-surface">
                            {!checklistWorkflow
                              ? "Starts after checklist upload."
                              : approvedInternalDecision
                              ? `Approved by ${getUserName(approvedInternalDecision.actedById || approvedInternalDecision.assignedToId)}`
                              : checklistWorkflow.currentApprovalStage === "INTERNAL"
                              ? "Awaiting one internal approval."
                              : "Waiting for the current file version."}
                          </p>

                          <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-2">
                            {approvedInternalDecision ? (
                              <p className="text-xs text-on-surface-variant">
                                {getInternalApproverRole(approvedInternalDecision)} approval recorded on{" "}
                                <span className="text-on-surface ds-numeric">
                                  {approvedInternalDecision.actedAt
                                    ? new Date(approvedInternalDecision.actedAt).toLocaleString("en-IN")
                                    : "Pending"}
                                </span>
                              </p>
                            ) : (
                              <>
                                <p className="text-xs text-on-surface-variant">
                                  Eligible: <span className="text-on-surface">{eligibleInternalApproverLabels.join(", ") || "Owner, Manager, or TL"}</span>
                                </p>
                                {checklistWorkflow?.currentApprovalStage === "INTERNAL" && !approvedInternalDecision ? (
                                  <p className="text-xs text-on-surface-variant">
                                    Pending:{" "}
                                    <span className="text-on-surface">
                                      {Array.from(
                                        new Set(
                                          currentInternalApprovals
                                            .filter((approval: any) => approval.action === "PENDING")
                                            .map((approval: any) => `${getUserName(approval.assignedToId)} (${getInternalApproverRole(approval)})`),
                                        ),
                                      ).join(", ") || "Owner, Manager, or TL"}
                                    </span>
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                        {canCurrentUserInternalApprove && checklistWorkflow?.currentApprovalStage === "INTERNAL" ? (
                          <>
                            <textarea
                              rows={2}
                              value={internalApprovalRemarks}
                              onChange={(e) => setInternalApprovalRemarks(e.target.value)}
                              placeholder="Required for rejection, optional for approval"
                              className="ds-textarea w-full"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={loading !== null}
                                onClick={() => handleChecklistInternalDecision("REJECTED")}
                              >
                                Reject
                              </Button>
                              <Button
                                type="button"
                                disabled={loading !== null}
                                onClick={() => handleChecklistInternalDecision("APPROVED")}
                              >
                                Approve
                              </Button>
                            </div>
                          </>
                        ) : null}
                      </div>

                      <div className="card-cyan-outline rounded-xl border border-outline-variant/60 bg-surface p-4 space-y-4 shadow-sm">
                        <div className="space-y-3">
                          <SectionHeading title="Customer Approval" />
                          <p className="text-sm text-on-surface">
                            {approvedCustomerDecision
                              ? `Approved by ${getUserName(approvedCustomerDecision.actedById || approvedCustomerDecision.assignedToId)} on behalf of concerned job users on ${approvedCustomerDecision.actedAt ? new Date(approvedCustomerDecision.actedAt).toLocaleString("en-IN") : "Pending"}`
                              : checklistWorkflow?.currentApprovalStage === "CUSTOMER" && !latestCustomerMailLog
                              ? "Internal approval is complete. Send the customer mail here to unlock customer approval."
                              : checklistWorkflow?.currentApprovalStage === "CUSTOMER" && latestCustomerMailLog && !customerApprovalDelayElapsed
                              ? `Checklist mail sent on ${new Date(latestCustomerMailLog.sentAt).toLocaleString("en-IN")}. Customer approval unlocks automatically in ${customerApprovalCountdown} at ${customerApprovalVisibleAt?.toLocaleString("en-IN")}.`
                              : checklistWorkflow?.currentApprovalStage === "CUSTOMER"
                              ? "Pending: concerned job user approval required."
                              : checklistWorkflow?.customerRejectedOnce
                              ? "Customer approval will not be requested again after rework."
                              : "Customer approval starts after the first successful internal approval and mail dispatch."}
                          </p>
                          {latestCustomerMailLog ? (
                            <p className="text-xs text-on-surface-variant">
                              Mail recipients: {(latestCustomerMailLog.recipients || []).join(", ")}. Attachment: {latestCustomerMailLog.attachmentFileName || currentChecklistVersion?.originalFileName || "Checklist file"}.
                            </p>
                          ) : null}
                          {checklistWorkflow?.currentApprovalStage === "CUSTOMER" && !approvedCustomerDecision ? (
                            <p className="text-xs text-on-surface-variant">
                              Eligible approvers: any concerned user linked to this job, including the job owner.
                              {pendingCustomerApproverNames.length > 0 ? ` Current linked users: ${pendingCustomerApproverNames.join(", ")}` : ""}
                            </p>
                          ) : null}
                        </div>
                        {checklistWorkflow?.currentApprovalStage === "CUSTOMER" && !latestCustomerMailLog ? (
                          <div className="space-y-3">
                            <input
                              value={customerMailSubject}
                              onChange={(e) => setCustomerMailSubject(e.target.value)}
                              placeholder={`Checklist Approval Required - ${job.jobNumber}`}
                              className="w-full"
                            />
                            <textarea
                              rows={4}
                              value={customerMailBody}
                              onChange={(e) => setCustomerMailBody(e.target.value)}
                              placeholder={`Please review the attached approved checklist for job ${job.jobNumber}.`}
                              className="ds-textarea w-full"
                            />
                            <FileUploadField
                              id="customer-mail-attachments-customer"
                              label="Additional Attachments"
                              multiple
                              compact
                              helperText="The approved checklist is attached automatically. Add any extra files before sending."
                              triggerText="Drag and drop or choose files to attach"
                              onInputChange={(event) => setCustomerMailAttachments(Array.from(event.target.files || []))}
                              onClear={() => setCustomerMailAttachments([])}
                              selectedFiles={customerMailAttachments.map((file) => ({
                                file,
                                name: file.name,
                                sizeBytes: file.size,
                                statusLabel: "Ready to send",
                              }))}
                            />
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                              <p className="max-w-xl text-xs text-on-surface-variant">
                                The latest approved checklist file will be attached automatically, customer recipients will be fetched from the customer record, and any files above will be included after you send the mail.
                              </p>
                              <Button
                                type="button"
                                disabled={loading !== null}
                                className="w-full whitespace-nowrap gap-2 sm:w-auto"
                                onClick={handleSendChecklistCustomerMail}
                              >
                                <Mail size={14} />
                                {loading === "checklist-customer-mail" ? "Sending..." : "Send Mail"}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        {canCurrentUserCustomerApprove && checklistWorkflow?.currentApprovalStage === "CUSTOMER" && customerApprovalDelayElapsed ? (
                          <>
                            <textarea
                              rows={2}
                              value={customerApprovalRemarks}
                              onChange={(e) => setCustomerApprovalRemarks(e.target.value)}
                              placeholder="Required for rejection, optional for approval"
                              className="ds-textarea w-full"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={loading !== null}
                                onClick={() => handleChecklistCustomerDecision("REJECTED")}
                              >
                                Reject
                              </Button>
                              <Button
                                type="button"
                                disabled={loading !== null}
                                onClick={() => handleChecklistCustomerDecision("APPROVED")}
                              >
                                Approve
                              </Button>
                            </div>
                          </>
                        ) : null}
                      </div>

                      <div className="card-cyan-outline rounded-xl border border-outline-variant/60 bg-surface p-4 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="ds-label">Approval History</span>
                          <span className="text-[11px] text-on-surface-variant">
                            {checklistApprovals.length} entries
                          </span>
                        </div>
                        {checklistApprovals.length === 0 ? (
                          <p className="text-xs text-on-surface-variant">No approval history recorded yet.</p>
                        ) : (
                          <div className="space-y-4">
                            {checklistApprovals
                              .slice()
                              .reverse()
                              .map((approval: any, index: number, approvals: any[]) => (
                                <div key={approval.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
                                  <div className="flex flex-col items-center">
                                    <span className="mt-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-[#00cec4]" />
                                    {index < approvals.length - 1 ? (
                                      <span className="mt-1 w-px flex-1 bg-outline-variant/60" />
                                    ) : null}
                                  </div>
                                  <div className="space-y-2 pb-1">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                      <div className="space-y-1">
                                        <p className="text-sm font-semibold text-on-surface">
                                          {approval.stage.replace(/_/g, " ")} • {approval.action.replace(/_/g, " ")}
                                        </p>
                                        <p className="text-xs text-on-surface-variant">
                                          Assigned to <span className="text-on-surface">{getUserName(approval.assignedToId)}</span>
                                          {approval.actedById ? ` • acted by ${getUserName(approval.actedById)}` : ""}
                                        </p>
                                      </div>
                                      <span className="text-[11px] text-on-surface-variant ds-numeric md:text-right">
                                        {approval.actedAt ? new Date(approval.actedAt).toLocaleString("en-IN") : "Pending"}
                                      </span>
                                    </div>
                                    {approval.remarks ? (
                                      <p className="text-xs text-on-surface-variant">
                                        {approval.remarks}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "filing" && (
            <div className="space-y-4">
              <SectionHeading
                title="Customs Submission Filing Details"
                aside={
                  filingInstance ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      mode="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={() => setExecutionTimelineModalOpen(true)}
                      aria-label="Open execution blueprint timeline"
                      title="Open execution blueprint timeline"
                    >
                      <History className="size-6" />
                    </Button>
                  ) : null
                }
              />

              {overdueChecklistCount > 0 && (
                <div className="card-left-accent-orange rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#fb923c]" />
                    <div className="space-y-1">
                      <h4 className="ds-label text-[#fb923c]">Overdue Filing Checklist Items</h4>
                      <p className="text-sm text-on-surface">
                        {overdueChecklistCount} Filing checklist item{overdueChecklistCount > 1 ? "s are" : " is"} overdue.
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        Delay remarks are required before overdue items can be completed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeStepIndex < filingStageIndex ? (
                <div className="rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span
                      className="ds-icon-badge mt-0.5 shrink-0"
                      style={{ background: "rgba(251,146,60,0.10)", color: "#fb923c" }}
                    >
                      <AlertTriangle size={18} />
                    </span>
                    <div className="space-y-1">
                      <h4 className="ds-label text-[#fb923c]">Filing Stage Locked</h4>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        Clearance files can only be submitted to customs after the checklist is approved. Complete all prior checklist preparation and approvals.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!filingInstance ? (
                    <div className="card-top-accent rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
                      <SectionHeading title="Filing Workflow" />
                      {loading === "filing-load" ? (
                        <p className="mt-4 text-xs text-on-surface-variant">Loading filing workflow...</p>
                      ) : (
                        <div className="mt-4 space-y-4">
                          <p className="max-w-3xl text-sm text-on-surface-variant leading-relaxed">
                            No active filing workflow instance found. Ensure a workflow is published in{" "}
                            <a href="/cha/settings/filing-workflows" className="text-[#00cec4] underline underline-offset-2">
                              CHA Settings → Filing Workflows
                            </a>
                            , then start the workflow below.
                          </p>
                          <Button
                            onClick={handleStartFilingWorkflow}
                            disabled={loading === "filing-start"}
                          >
                            {loading === "filing-start" ? "Starting..." : "Start Filing Workflow"}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                        {activeNodeRun ? (
                          <div className="space-y-4">

                            {/* Node run completion form */}
                            <form
                              onSubmit={handleCompleteFilingNode}
                              className="grid gap-4 pt-2 xl:grid-cols-[minmax(0,680px)_minmax(0,1fr)] xl:items-start"
                            >
                              <div className={`card-top-accent ${filingPrimaryColumnClass} space-y-3 rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm`}>
                                <SectionHeading
                                  title={activeNodeDisplayName}
                                  description="Capture the filing details and upload the supporting bill document before moving forward."
                                  aside={
                                    <InfoNoteToggle
                                      title="Stage Summary"
                                      description={stageSummaryText}
                                      open={openWarningNote === "bill-filing"}
                                      onToggle={() =>
                                        setOpenWarningNote((current) => (current === "bill-filing" ? null : "bill-filing"))
                                      }
                                    />
                                  }
                                />
                                <div className="flex flex-wrap gap-2 pl-[17px]">
                                  {activeNodeRun.node.nodeType === "DECISION" ? <Badge variant="default">Decision</Badge> : null}
                                  {activeNodeRun.node.canBeSkipped ? <Badge variant="warning">Optional / Skippable</Badge> : null}
                                </div>
                                {overdueChecklistCount > 0 && (
                                  <p className="pl-[17px] text-xs text-[#fb923c]">
                                    {overdueChecklistCount} overdue checklist item{overdueChecklistCount > 1 ? "s" : ""} in this active stage.
                                  </p>
                                )}
                                {isActiveStageBlocked ? (
                                  <div className="card-top-accent-orange rounded-xl border border-[#fb923c]/35 bg-surface px-4 py-4 space-y-3">
                                    <div className="space-y-1">
                                      <p className="ds-label !text-[#fb923c]">Stage Blocked</p>
                                      <p className="text-sm text-on-surface">
                                        This stage is blocked until {activeNodePrerequisiteStatus?.mode === "ANY" ? "one of these stages is completed" : "all required stages are completed"}: {(activeNodePrerequisiteStatus?.missingNodeNames || []).join(", ")}.
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {(activeNodePrerequisiteStatus?.missingNodeKeys || []).map((nodeKey: string) => (
                                        <Button
                                          key={nodeKey}
                                          type="button"
                                          variant="outline"
                                          disabled={loading !== null}
                                          onClick={() => void handleRedirectBlockedStage(nodeKey)}
                                        >
                                          <ArrowRight size={14} />
                                          Go To {targetNodesMap.get(nodeKey)?.name || nodeKey}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                                {pendingBlockedStage && canResumePendingBlockedStage ? (
                                  <div className="rounded-xl border border-[#00cec4]/35 bg-surface-container-low px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div className="space-y-1">
                                        <p className="ds-label text-[#00cec4]">Blocked Stage Ready</p>
                                        <p className="text-sm text-on-surface">{pendingBlockedStage.nodeName} can now be resumed.</p>
                                      </div>
                                      <Button type="button" disabled={loading !== null} onClick={() => void handleResumeBlockedStage()}>
                                        Resume {pendingBlockedStage.nodeName}
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}
                                <div className={`space-y-3 ${isActiveStageBlocked ? "pointer-events-none opacity-60" : ""}`}>
                                  {activeNodeRun.node.nodeType === "DECISION" && outgoingEdges.length > 0 ? (
                                    <div className="space-y-2">
                                      <label className="ds-label text-on-surface block">Decision *</label>
                                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {outgoingEdges.map((edge: any) => {
                                          const targetNode = targetNodesMap.get(edge.targetKey);
                                          const isSelected = selectedNextNodeKey === edge.targetKey;
                                          return (
                                            <button
                                              key={edge.targetKey}
                                              type="button"
                                              onClick={() => setSelectedNextNodeKey(edge.targetKey)}
                                              className={`rounded-xl border px-4 py-3 text-left transition ${
                                                isSelected
                                                  ? "border-[#00cec4] bg-[#00cec4]/10 shadow-[0_0_0_3px_rgba(0,206,196,0.18)]"
                                                  : "border-outline-variant bg-surface hover:border-[#00cec4]/55 hover:bg-surface-container-low"
                                              }`}
                                            >
                                              <span className="ds-label block">{edge.label || "Choice"}</span>
                                              <span className="mt-1 block text-sm font-medium text-on-surface">
                                                {targetNode?.name || edge.targetKey}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : null}
                                  {(activeNodeFieldDefinitions.length > 0 || activeNodeDocumentRequirements.length > 0) ? (
                                    <div className="space-y-3 pt-1">
                                      {activeNodeFieldDefinitions.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                                          {activeNodeFieldDefinitions.map((field: any) => (
                                            <div key={field.key} className="space-y-1">
                                              <label className="ds-label block text-on-surface-variant">
                                                {field.label} {field.required !== false ? "*" : ""}
                                              </label>
                                              {field.type === "DATE" ? (
                                                <DateInput
                                                  value={filingFieldValues[field.key] || ""}
                                                  onChange={(e) => setFilingFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                  className="w-full"
                                                />
                                              ) : (
                                                <input
                                                  value={filingFieldValues[field.key] || ""}
                                                  onChange={(e) =>
                                                    field.key === "bill_number"
                                                      ? setBillNumberEverywhere(e.target.value)
                                                      : setFilingFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                                                  }
                                                  placeholder={field.placeholder || field.label}
                                                  className="w-full text-sm"
                                                />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                      {activeNodeDocumentRequirements.length > 0 ? (
                                        <div className="space-y-2.5">
                                          {activeNodeDocumentRequirements.map((requirement: any) => {
                                            const uploadedAttachment = activeNodeDocumentAttachmentsByKey.get(requirement.key);
                                            return (
                                              <FileUploadField
                                                key={requirement.key}
                                                id={`node-document-upload-inline-${activeNodeRun.id}-${requirement.key}`}
                                                helperText={`Accepted formats: PDF and images. Uploading here ${requirement.allowReplacement !== false ? "replaces the current" : "adds the"} ${requirement.label}.`}
                                                triggerText={`Drag and drop or choose file to ${requirement.allowReplacement !== false ? "replace" : "upload"} the ${requirement.label}`}
                                                selectedFile={
                                                  uploadedAttachment
                                                    ? {
                                                        href: uploadedAttachment.fileKey || null,
                                                        name: uploadedAttachment.fileName || `${requirement.label}.pdf`,
                                                        sizeBytes: uploadedAttachment.sizeBytes ?? null,
                                                        statusLabel: uploadedAttachment.uploadedAt
                                                          ? `Uploaded ${new Date(uploadedAttachment.uploadedAt).toLocaleDateString("en-IN")}`
                                                          : "Uploaded",
                                                      }
                                                    : null
                                                }
                                                onClear={
                                                  uploadedAttachment
                                                    ? () => void handleDeleteFilingPhoto(uploadedAttachment.id)
                                                    : undefined
                                                }
                                                onInputChange={(e) => handleUploadNodeDocument(requirement.key, e)}
                                              />
                                            );
                                          })}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {activeNodeRun.node.checklistItems?.length > 0 && (
                                    <div className="space-y-3 pt-1">
                                      <h4 className="ds-label text-on-surface">Stage Checklist Verification</h4>
                                      <div className="space-y-3.5">
                                        {activeChecklistItems.map((item: any, index: number) => {
                                          const resp = checklistResponses[item.id] || { isChecked: false, remarks: "", fileKey: undefined, delayRemarks: "" };
                                          const overdueMeta = overdueChecklistItems.find((entry: any) => entry.checklistItemId === item.id);
                                          const checklistItemAttachments = checklistAttachmentsByItem.get(item.id) || [];
                                          const isCurrentItem = index === currentChecklistItemIndex;
                                          const isCompletedItem =
                                            resp.isChecked &&
                                            (!item.requiresRemarks || !!resp.remarks?.trim()) &&
                                            (!overdueMeta || !item.delayRemarksRequired || !!resp.delayRemarks?.trim()) &&
                                            (!(item.allowsUpload && (item.minUploads || 0) > 0) || checklistItemAttachments.length >= item.minUploads);
                                          const isLockedItem = index > currentChecklistItemIndex;
                                          return (
                                            <div
                                              key={item.id}
                                              className={`p-3.5 rounded-xl border space-y-3 ${
                                                isLockedItem
                                                  ? "border-outline-variant bg-surface-container-low opacity-70"
                                                  : overdueMeta
                                                  ? "border-[#fb923c]/45 bg-[#fb923c]/10"
                                                  : "border-outline-variant bg-surface-container-low"
                                              }`}
                                            >
                                              <div className="flex items-center justify-between gap-4">
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                  <NeonCheckbox
                                                    id={`check-${item.id}`}
                                                    checked={resp.isChecked}
                                                    disabled={isLockedItem}
                                                    onChange={(e) => {
                                                      setChecklistResponses((prev) => ({
                                                        ...prev,
                                                        [item.id]: {
                                                          ...prev[item.id],
                                                          isChecked: e.target.checked,
                                                        },
                                                      }));
                                                    }}
                                                  />
                                                  <div className="min-w-0 flex-1 space-y-1">
                                                    <label htmlFor={`check-${item.id}`} className="block cursor-pointer text-sm font-semibold leading-5 text-on-surface">
                                                      {item.label} {item.isMandatory && <span className="text-red-500 font-bold">*</span>}
                                                    </label>
                                                    {item.description && (
                                                      <p className="text-xs leading-5 text-on-surface-variant">{item.description}</p>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="shrink-0 self-center text-right">
                                                  <div className="ds-label text-on-surface-variant">Item {index + 1} of {activeChecklistItems.length}</div>
                                                  <div className="mt-1 text-sm leading-5 text-on-surface-variant ds-numeric">
                                                    {item.deadlineDuration || 2} {item.deadlineUnit === "HOURS" ? "HR" : item.deadlineUnit === "DAYS" ? "DAY" : "BD"}
                                                  </div>
                                                </div>
                                              </div>

                                              {isLockedItem && (
                                                <div className="rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 text-[11px] text-on-surface-variant">
                                                  Complete the current checklist item first to unlock this step.
                                                </div>
                                              )}

                                              {!isLockedItem && !isCurrentItem && isCompletedItem && (
                                                <div className="rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 text-[11px] text-on-surface-variant">
                                                  Completed and ready. You can move to the next checklist item.
                                                </div>
                                              )}

                                              {!isLockedItem && overdueMeta && (
                                                <div className="rounded-2xl border border-[#fb923c]/35 bg-surface px-3 py-2 text-xs text-on-surface">
                                                  <div className="flex flex-wrap items-center gap-3">
                                                    <span className="font-semibold text-[#fb923c] uppercase tracking-wide">Overdue</span>
                                                    <span className="ds-numeric">Due: {new Date(overdueMeta.dueAt).toLocaleDateString("en-IN")}</span>
                                                    <span className="ds-numeric">{overdueMeta.daysDelayed} day(s) delayed</span>
                                                  </div>
                                                  <div className="mt-2 space-y-1">
                                                    <label className="ds-label block text-[#fb923c]">Delay Remarks *</label>
                                                    <textarea
                                                      rows={2}
                                                      value={resp.delayRemarks || ""}
                                                      onChange={(e) => {
                                                        setChecklistResponses((prev) => ({
                                                          ...prev,
                                                          [item.id]: {
                                                            ...prev[item.id],
                                                            delayRemarks: e.target.value,
                                                          },
                                                        }));
                                                      }}
                                                      placeholder="Explain why this checklist item crossed its deadline..."
                                                      className="w-full text-xs"
                                                    />
                                                  </div>
                                                </div>
                                              )}

                                              {!isLockedItem && resp.isChecked && item.requiresRemarks && (
                                                <div className="pl-6 space-y-1">
                                                  <label className="ds-label block">Remarks / Notes *</label>
                                                  <input
                                                    type="text"
                                                    required
                                                    value={resp.remarks || ""}
                                                    onChange={(e) => {
                                                      setChecklistResponses((prev) => ({
                                                        ...prev,
                                                        [item.id]: {
                                                          ...prev[item.id],
                                                          remarks: e.target.value,
                                                        },
                                                      }));
                                                    }}
                                                    placeholder="Enter required verification details..."
                                                    className="w-full text-xs"
                                                  />
                                                </div>
                                              )}

                                              {!isLockedItem && resp.isChecked && item.allowsUpload && (
                                                <div className="pl-6 space-y-2">
                                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <label className="ds-label block">Supporting File / Photo</label>
                                                    <span className="text-[11px] text-on-surface-variant ds-numeric">
                                                      Uploaded {checklistItemAttachments.length} / Minimum {item.minUploads || 0}
                                                    </span>
                                                  </div>
                                                  <FileUploadField
                                                    id={`checklist-item-upload-${item.id}`}
                                                    compact
                                                    disabled={loading === `checklist-item-file-${item.id}`}
                                                    helperText="Add images or documents here. This upload counts toward this checklist item directly."
                                                    triggerText="Drag and drop or choose supporting file to upload"
                                                    showSelectedPreview={false}
                                                    onInputChange={(e) => handleUploadChecklistItemFile(item.id, e)}
                                                  />
                                                  {checklistItemAttachments.length > 0 && (
                                                    <div className="space-y-1">
                                                      {checklistItemAttachments.map((attachment: any) => (
                                                        <div key={attachment.id} className="flex items-center justify-between rounded-lg bg-surface px-2 py-1 text-xs">
                                                          <a
                                                            href={attachment.fileKey}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-1 font-semibold text-[#00cec4] hover:underline"
                                                          >
                                                            <ExternalLink size={11} /> {attachment.fileName}
                                                          </a>
                                                          <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteFilingPhoto(attachment.id)}
                                                          >
                                                            Remove
                                                          </Button>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {visibleNodeConditionalSections.length > 0 && (
                                <div className={`${filingPrimaryColumnClass} space-y-2.5 pt-0.5 ${isActiveStageBlocked ? "pointer-events-none opacity-60" : ""}`}>
                                  <h4 className="ds-label text-on-surface">Conditional Sections & Documents</h4>
                                  <div className="space-y-2.5">
                                    {visibleNodeConditionalSections.map((section: any) => (
                                      <div key={section.key} className="rounded-xl border border-outline-variant bg-surface-container-low p-3 space-y-2.5">
                                        <div className="flex items-center gap-3 text-sm text-on-surface">
                                          <NeonCheckbox
                                            checked={!!filingToggleStates[section.key]}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              setFilingToggleStates((prev) => ({ ...prev, [section.key]: checked }));
                                              setFilingToggleStateDetails((prev) => ({
                                                ...prev,
                                                [section.key]: {
                                                  isEnabled: checked,
                                                  state: prev[section.key]?.state ?? null,
                                                },
                                              }));
                                            }}
                                            label={section.label}
                                          />
                                        </div>
                                        {filingToggleStates[section.key] && section.unlocksFields?.length > 0 && (
                                          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                                            {section.unlocksFields.map((field: any) => (
                                              <div key={field.key} className="space-y-1">
                                                <label className="ds-label block text-on-surface-variant">
                                                  {field.label} {field.required !== false ? "*" : ""}
                                                </label>
                                                {field.type === "DATE" ? (
                                                  <DateInput
                                                    value={filingFieldValues[field.key] || ""}
                                                    onChange={(e) => setFilingFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="w-full"
                                                  />
                                                ) : (
                                                  <input
                                                    value={filingFieldValues[field.key] || ""}
                                                    onChange={(e) => setFilingFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                    placeholder={field.placeholder || field.label}
                                                    className="w-full text-sm"
                                                  />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {filingToggleStates[section.key] && section.unlocksDocuments?.length > 0 && (
                                          <div className="space-y-1.5">
                                            {section.unlocksDocuments.map((requirement: any) => (
                                              <div key={requirement.key} className="rounded-xl border border-outline-variant/60 bg-surface p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                  <div>
                                                    <div className="text-xs font-semibold text-on-surface">
                                                      {requirement.label} {requirement.required !== false ? "*" : ""}
                                                    </div>
                                                  </div>
                                                  <div className="w-full max-w-[220px]">
                                                    <FileUploadField
                                                      id={`unlocked-node-document-upload-${section.key}-${requirement.key}`}
                                                      compact
                                                      showSelectedPreview={false}
                                                      triggerText="Choose file to upload"
                                                      onInputChange={(e) => handleUploadNodeDocument(requirement.key, e)}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}

                                  </div>
                                </div>
                              )}

                              <div className={filingCompletionColumnClass}>
                                {queryProcessingEnabled ? (
                                  <>
                                    <div className="card-top-accent-orange overflow-hidden rounded-xl border border-outline-variant/60 bg-surface shadow-sm">
                                      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-start">
                                        <div className="min-w-0 flex-1">
                                          <div className="space-y-2">
                                            <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
                                              <span className="h-7 rounded-sm bg-[#fb923c]" aria-hidden="true" />
                                              <h3 className="ds-h3 text-[#c76628]">Query Processing</h3>
                                            </div>
                                            <p className="pl-[17px] text-sm text-on-surface-variant">
                                              {activeNodeOpenQueries.length > 0
                                                ? `${activeNodeOpenQueries.length} active quer${activeNodeOpenQueries.length > 1 ? "ies require" : "y requires"} attention.`
                                                : queryProcessingStage === "CLEARED"
                                                  ? "All recorded queries are cleared for this filing stage."
                                                  : queryProcessingStage === "NO_QUERY"
                                                    ? "No query has been raised for this filing stage."
                                                    : "Track query intake and response status for this filing stage."}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex shrink-0 items-center justify-end gap-3 self-start lg:ml-auto">
                                          {queryProcessingWarning ? (
                                            <WarningNoteToggle
                                              title={queryProcessingWarning.title}
                                              description={queryProcessingWarning.description}
                                              open={openWarningNote === "query-processing"}
                                              onToggle={() =>
                                                setOpenWarningNote((current) => (current === "query-processing" ? null : "query-processing"))
                                              }
                                            />
                                          ) : null}
                                          <label className="inline-flex min-w-[220px] items-center justify-between gap-4 rounded-xl border border-[#fb923c]/20 bg-[#fb923c]/8 px-4 py-2 text-sm text-on-surface">
                                            <span className="ds-label text-[#c76628]">{queryProcessingToggleEnabled ? "Queries On" : "Queries Off"}</span>
                                            <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                                              <input
                                                type="checkbox"
                                                checked={queryProcessingToggleEnabled}
                                                disabled={isSavingQueryProcessingDecision || activeNodeOpenQueries.length > 0}
                                                onChange={() =>
                                                  void handlePersistFilingToggleState(
                                                    "query_processing",
                                                    !queryProcessingToggleEnabled,
                                                    !queryProcessingToggleEnabled
                                                      ? {
                                                          ...(queryProcessingState ?? {}),
                                                          stage:
                                                            typeof queryProcessingState?.stage === "string" && queryProcessingState.stage.trim()
                                                              ? queryProcessingState.stage
                                                              : "AWAITING_QUERY_DECISION",
                                                        }
                                                      : {
                                                          ...(queryProcessingState ?? {}),
                                                          stage: undefined,
                                                        },
                                                    !queryProcessingToggleEnabled
                                                      ? "Query processing enabled for this workflow stage."
                                                      : "Query processing disabled for this workflow stage.",
                                                  )
                                                }
                                                className="peer sr-only"
                                              />
                                              <span className="absolute inset-0 rounded-full border border-[#fb923c]/25 bg-surface-container-low transition-colors peer-checked:border-[#fb923c]/45 peer-checked:bg-[#fb923c]/20 peer-disabled:cursor-not-allowed peer-disabled:opacity-60" />
                                              <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full border border-[#fb923c]/20 bg-surface shadow-sm transition-transform peer-checked:translate-x-5 peer-disabled:opacity-60" />
                                            </span>
                                          </label>
                                        </div>
                                      </div>

                                      {queryProcessingActive ? (
                                        <div className="space-y-3 px-4 py-3">
                                          <div className="grid gap-3 text-sm sm:grid-cols-2">
                                            <div className="space-y-2 text-on-surface-variant">
                                              <div className="flex items-center justify-between gap-3 sm:block">
                                                <span className="ds-label block text-on-surface-variant">Ref</span>
                                                <span className="text-sm font-medium text-on-surface sm:mt-1 sm:block">
                                                  {typeof queryProcessingState?.queryReferenceNumber === "string" && queryProcessingState.queryReferenceNumber.trim()
                                                    ? queryProcessingState.queryReferenceNumber
                                                    : primaryQuerySummary?.title || "Not Recorded"}
                                                </span>
                                              </div>
                                              <div className="flex items-center justify-between gap-3 sm:block">
                                                <span className="ds-label block text-on-surface-variant">Officer</span>
                                                <span className="text-sm font-medium text-on-surface sm:mt-1 sm:block">
                                                  {typeof queryProcessingState?.customsOfficerName === "string" && queryProcessingState.customsOfficerName.trim()
                                                    ? queryProcessingState.customsOfficerName
                                                    : "Not Assigned"}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="space-y-2 text-on-surface-variant">
                                              <div className="flex items-center justify-between gap-3 sm:block">
                                                <span className="ds-label block text-on-surface-variant">Received</span>
                                                <span className="text-sm font-medium text-on-surface sm:mt-1 sm:block">
                                                  {typeof queryProcessingState?.queryReceivedAt === "string" && queryProcessingState.queryReceivedAt.trim()
                                                    ? new Date(queryProcessingState.queryReceivedAt).toLocaleDateString("en-IN")
                                                    : "Pending"}
                                                </span>
                                              </div>
                                              <div className="flex items-center justify-between gap-3 sm:block">
                                                <span className="ds-label block text-on-surface-variant">Open Cases</span>
                                                <span className="text-sm font-medium text-on-surface sm:mt-1 sm:block">
                                                  {activeNodeOpenQueries.length}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              className="w-full justify-center gap-2 border-[#fb923c]/35 text-base text-[#c76628] hover:border-[#fb923c]/50 hover:text-[#c76628] sm:w-auto sm:min-w-[220px]"
                                              onClick={() => setQueryProcessingPanelExpanded(true)}
                                            >
                                              Manage Queries
                                              <ChevronRight size={16} />
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="px-4 py-3 text-sm text-on-surface-variant">
                                          Turn on queries to reveal the customs query card, summary details, and manage actions for this filing step.
                                        </div>
                                      )}
                                    </div>

                                    {queryProcessingPanelExpanded && queryProcessingActive ? (
                                      <Modal
                                        open={queryProcessingPanelExpanded}
                                        title="Manage Queries"
                                            description="Review customs query details, record updates, and manage responses for this filing stage."
                                            onClose={() => setQueryProcessingPanelExpanded(false)}
                                            className="max-w-4xl"
                                          >
                                      <div className="space-y-5">

                                        {queryProcessingEnabled && queryProcessingStage === "CLEARED" ? (
                                          <div className="rounded-xl border border-[#00cec4]/25 bg-[#00cec4]/10 p-4 text-sm text-on-surface">
                                            All customs queries are cleared for this workflow stage. You can continue to the next stage or record an additional query if customs raises another one.
                                            <div className="mt-3">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                  handlePersistFilingToggleState(
                                                    "query_processing",
                                                    true,
                                                    {
                                                      ...(queryProcessingState ?? {}),
                                                      stage: "OPEN",
                                                    },
                                                    "Ready to capture an additional customs query.",
                                                  )
                                                }
                                              >
                                                Record Additional Query
                                              </Button>
                                            </div>
                                          </div>
                                    ) : null}

                                        <div className="space-y-4 ds-form-section">
                                            <div className="flex items-start justify-between gap-3">
                                              <div>
                                                <h4>Create Query</h4>
                                                <p className="pl-[13px] text-sm text-on-surface-variant">
                                                  Capture the customs note, reference number, officer, and received date.
                                                </p>
                                              </div>
                                              <Badge variant="default">{activeNodeQueries.length} Case{activeNodeQueries.length === 1 ? "" : "s"}</Badge>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                              <label className="space-y-1">
                                                <span className="ds-label block text-on-surface-variant">Query Title *</span>
                                                <Input
                                                  value={filingQueryTitle}
                                                  onChange={(e) => setFilingQueryTitle(e.target.value)}
                                                  placeholder="Query title"
                                                  className="w-full"
                                                />
                                              </label>
                                              <label className="space-y-1">
                                                <span className="ds-label block text-on-surface-variant">Reference Number</span>
                                                <Input
                                                  value={filingQueryReferenceNumber}
                                                  onChange={(e) => setFilingQueryReferenceNumber(e.target.value)}
                                                  placeholder="Enter query reference number"
                                                  className="w-full"
                                                />
                                              </label>
                                              <label className="space-y-1">
                                                <span className="ds-label block text-on-surface-variant">Customs Officer</span>
                                                <Input
                                                  value={filingQueryOfficerName}
                                                  onChange={(e) => setFilingQueryOfficerName(e.target.value)}
                                                  placeholder="Officer name"
                                                  className="w-full"
                                                />
                                              </label>
                                              <label className="space-y-1">
                                                <span className="ds-label block text-on-surface-variant">Received Date</span>
                                                <DateInput
                                                  value={filingQueryReceivedAt}
                                                  onChange={(e) => setFilingQueryReceivedAt(e.target.value)}
                                                />
                                              </label>
                                            </div>
                                            <label className="space-y-1">
                                              <span className="ds-label block text-on-surface-variant">Query Details *</span>
                                              <textarea
                                                rows={3}
                                                value={filingQueryDetails}
                                                onChange={(e) => {
                                                  setFilingQueryDetails(e.target.value);
                                                  setFilingFieldValues((current) => ({ ...current, query_notes: e.target.value }));
                                                }}
                                                placeholder="Record customs query details, offline response notes, or follow-up context..."
                                                className="ds-textarea w-full px-4 py-3 text-sm"
                                              />
                                            </label>
                                            <div className="flex justify-end">
                                              <Button type="button" onClick={handleCreateFilingQuery} disabled={loading !== null}>
                                                {loading === "filing-query-create" ? "Saving..." : "Create Query Record"}
                                              </Button>
                                            </div>
                                          </div>

                                        <div className="space-y-3 ds-form-section">
                                          <div className="flex items-center justify-between gap-3">
                                            <div>
                                              <h4>Query Cases</h4>
                                              <p className="pl-[13px] text-sm text-on-surface-variant">
                                                View responses, respond offline, submit updates, clear, or reopen any customs query.
                                              </p>
                                            </div>
                                            <Badge variant="default">{activeNodeQueries.length}</Badge>
                                          </div>

                                          {activeNodeQueries.map((query: any) => {
                                            const queryMessages = activeNodeQueryMessages.filter((message: any) => message.queryId === query.id);
                                            const isClosed = query.status === "CLOSED";
                                            const statusLabel =
                                              query.status === "CLOSED"
                                                ? "Cleared"
                                                : query.status === "REPLIED"
                                                  ? "Response Submitted"
                                                  : "Open";
                                            return (
                                              <details
                                                key={query.id}
                                                className="group overflow-hidden rounded-xl border border-outline-variant/60 bg-surface"
                                              >
                                                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3">
                                                  <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <p className="text-sm font-medium text-on-surface">{query.title}</p>
                                                      <span className="rounded-md bg-[#00cec4]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#00cec4]">
                                                        {statusLabel}
                                                      </span>
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-on-surface-variant">
                                                      {query.id === queryProcessingState?.latestQueryId &&
                                                      typeof queryProcessingState?.queryReferenceNumber === "string" &&
                                                      queryProcessingState.queryReferenceNumber.trim() ? (
                                                        <span>Ref: {queryProcessingState.queryReferenceNumber}</span>
                                                      ) : null}
                                                      {query.id === queryProcessingState?.latestQueryId &&
                                                      typeof queryProcessingState?.customsOfficerName === "string" &&
                                                      queryProcessingState.customsOfficerName.trim() ? (
                                                        <span>Officer: {queryProcessingState.customsOfficerName}</span>
                                                      ) : null}
                                                      <span>Created {new Date(query.createdAt).toLocaleString("en-IN")}</span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Badge variant={isClosed ? "success" : "secondary"}>
                                                      {queryMessages.length} Update{queryMessages.length === 1 ? "" : "s"}
                                                    </Badge>
                                                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-on-surface-variant transition-transform group-open:hidden" />
                                                    <ChevronDown className="mt-0.5 hidden size-4 shrink-0 text-on-surface-variant group-open:block" />
                                                  </div>
                                                </summary>
                                                <div className="space-y-4 border-t border-outline-variant/40 px-4 py-4">
                                                  <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 text-sm text-on-surface">
                                                    {query.details}
                                                  </div>
                                                  <div className="space-y-2">
                                                    <label className="ds-label block text-on-surface-variant">Offline Response / Status Update</label>
                                                    <textarea
                                                      rows={3}
                                                      value={filingQueryStatusUpdates[query.id] || ""}
                                                      onChange={(e) =>
                                                        setFilingQueryStatusUpdates((current) => ({ ...current, [query.id]: e.target.value }))
                                                      }
                                                      placeholder="Record the response shared with customs or the latest status update..."
                                                      className="ds-textarea w-full px-4 py-3 text-sm"
                                                    />
                                                  </div>
                                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    <label className="space-y-1">
                                                      <span className="ds-label block text-on-surface-variant">Responder Name</span>
                                                      <Input
                                                        value={filingQueryResponderNames[query.id] || ""}
                                                        onChange={(e) =>
                                                          setFilingQueryResponderNames((current) => ({ ...current, [query.id]: e.target.value }))
                                                        }
                                                        placeholder="Person who responded"
                                                      />
                                                    </label>
                                                  </div>
                                                  <div className="flex flex-wrap justify-end gap-2">
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      onClick={() => handleAddFilingQueryComment(query.id)}
                                                      disabled={loading === `filing-query-${query.id}`}
                                                    >
                                                      Save Response Update
                                                    </Button>
                                                    {!isClosed ? (
                                                      <>
                                                        <Button
                                                          type="button"
                                                          variant="outline"
                                                          onClick={() =>
                                                            handleUpdateFilingQueryStatus(
                                                              query.id,
                                                              "REPLIED",
                                                              buildFilingQueryResponseMessage(query.id, query.details),
                                                            )
                                                          }
                                                          disabled={loading === `filing-query-${query.id}`}
                                                        >
                                                          Mark Response Submitted
                                                        </Button>
                                                        <Button
                                                          type="button"
                                                          onClick={() =>
                                                            handleUpdateFilingQueryStatus(
                                                              query.id,
                                                              "CLOSED",
                                                              buildFilingQueryResponseMessage(query.id, query.details),
                                                            )
                                                          }
                                                          disabled={loading === `filing-query-${query.id}`}
                                                        >
                                                          Mark Cleared
                                                        </Button>
                                                      </>
                                                    ) : (
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() =>
                                                          handleUpdateFilingQueryStatus(
                                                            query.id,
                                                            "OPEN",
                                                            buildFilingQueryResponseMessage(query.id, query.details),
                                                          )
                                                        }
                                                        disabled={loading === `filing-query-${query.id}`}
                                                      >
                                                        Reopen Query
                                                      </Button>
                                                    )}
                                                  </div>
                                                  {queryMessages.length > 0 ? (
                                                    <div className="space-y-2">
                                                      <span className="ds-label block text-on-surface-variant">History</span>
                                                      <div className="space-y-2">
                                                        {queryMessages.map((message: any) => (
                                                          <div key={message.id} className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant">
                                                              <span>{message.authorName || "System"}</span>
                                                              <span>{new Date(message.createdAt).toLocaleString("en-IN")}</span>
                                                            </div>
                                                            <p className="mt-2 text-sm text-on-surface">{message.body}</p>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  ) : null}
                                                </div>
                                              </details>
                                            );
                                          })}
                                        </div>
                                      </div>
                                          </Modal>
                                        ) : null}
                                    <div className="card-top-accent overflow-hidden rounded-xl border border-outline-variant/60 bg-surface shadow-sm">
                                      <div className="space-y-4 px-4 py-4">
                                        <SectionHeading
                                          title="Complete Step"
                                          description="Choose the next action for this filing stage and record completion notes before moving forward."
                                        />
                                        <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3">
                                          <span className="ds-label block text-on-surface-variant">Current Stage</span>
                                          <p className="mt-1 text-sm font-medium text-on-surface">{activeNodeDisplayName}</p>
                                          {(activeNodeRun.node.sectionName || activeNodeRun.node.branchName) && (
                                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">
                                              {[activeNodeRun.node.sectionName, activeNodeRun.node.branchName].filter(Boolean).join(" / ")}
                                            </p>
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          <label className="ds-label text-on-surface block">
                                            Completion Comments / Remarks {activeNodeRun.node.commentsRequired && <span className="text-red-500 font-bold">*</span>}
                                          </label>
                                          <textarea
                                            rows={3}
                                            value={nodeRemarks}
                                            onChange={(e) => setNodeRemarks(e.target.value)}
                                            placeholder="Provide checklist execution remarks or check outcome..."
                                            className="w-full text-sm font-sans"
                                            disabled={loading !== null || isActiveStageBlocked}
                                            required={activeNodeRun.node.commentsRequired}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          {outgoingEdges.length > 0 ? (
                                            activeNodeRun.node.nodeType === "DECISION" ? (
                                              null
                                            ) : (
                                              <div className="space-y-1">
                                                <label className="ds-label text-on-surface block">Select Next Workflow Stage *</label>
                                                <select
                                                  value={selectedNextNodeKey}
                                                  onChange={(e) => setSelectedNextNodeKey(e.target.value)}
                                                  required
                                                  disabled={loading !== null || isActiveStageBlocked}
                                                  className="w-full text-sm"
                                                >
                                                  <option value="">-- Choose Next Stage --</option>
                                                  {outgoingEdges.map((edge: any) => {
                                                    const targetNode = targetNodesMap.get(edge.targetKey);
                                                    return (
                                                      <option key={edge.targetKey} value={edge.targetKey}>
                                                        {[targetNode?.sectionName, targetNode?.branchName, targetNode?.name || edge.targetKey]
                                                          .filter(Boolean)
                                                          .join(" / ")} {edge.label ? `(${edge.label})` : ""}
                                                      </option>
                                                    );
                                                  })}
                                                </select>
                                              </div>
                                            )
                                          ) : (
                                            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs text-on-surface-variant">
                                              Completing this node will finalize the Filing workflow and transition the job stage to <strong>FILED</strong>.
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-2 pt-1">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              disabled={loading !== null || isActiveStageBlocked}
                                              onClick={handleSaveFilingDraft}
                                              className="gap-2"
                                            >
                                            <Database size={14} />
                                            Save Draft
                                          </Button>
                                          {hasPreviousFilingStage ? (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              disabled={loading !== null}
                                              onClick={() => setGoBackOpen(true)}
                                              className="gap-2 text-xs"
                                            >
                                              <Undo2 size={14} />
                                              Jump Back to Earlier Stage
                                            </Button>
                                          ) : null}
                                          <Button
                                            type="submit"
                                            disabled={loading !== null || isActiveStageBlocked}
                                            className="w-full sm:w-auto sm:min-w-[280px]"
                                          >
                                            {loading === "filing-complete" ? "Completing Stage..." : outgoingEdges.length > 0 ? "Complete & Move to Next Stage" : "Complete & File Customs Bill"}
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                              ) : null}
                              </div>
                              
                              {/* Node Photo / File Upload Requirements */}
                              {activeNodeRun.node.photoRequirements?.length > 0 && (
                                <div className={`${filingPrimaryColumnClass} space-y-4 border-t border-outline-variant/30 pt-4 ${isActiveStageBlocked ? "pointer-events-none opacity-60" : ""}`}>
                                  <h4 className="ds-label text-on-surface">Required Photograph / Document Uploads</h4>
                                  <div className="space-y-4">
                                    {activeNodeRun.node.photoRequirements.map((pr: any) => {
                                      const reqAttachments = filingInstance.attachments?.filter(
                                        (a: any) => a.nodeRunId === activeNodeRun.id && a.photoRequirementId === pr.id
                                      ) || [];
                                      return (
                                        <div key={pr.id} className="p-4 rounded-2xl border border-dashed border-outline-variant/60 bg-surface space-y-3">
                                          <div>
                                            <h5 className="text-xs font-semibold text-on-surface">
                                              {pr.label} {pr.isMandatory && <span className="text-red-500 font-bold">*</span>}
                                            </h5>
                                            {pr.description && <p className="text-[11px] text-on-surface-variant mt-0.5">{pr.description}</p>}
                                            <p className="text-[10px] text-on-surface-variant ds-numeric mt-1 font-mono">
                                              (Requires: min {pr.minPhotos} {pr.maxPhotos ? `max ${pr.maxPhotos}` : ""})
                                            </p>
                                          </div>

                                          {/* Upload Input */}
                                          {(!pr.maxPhotos || reqAttachments.length < pr.maxPhotos) && (
                                            <>
                                              <FileUploadField
                                                id={`photo-requirement-upload-${pr.id}`}
                                                compact
                                                disabled={loading === `filing-photo-${pr.id}`}
                                                helperText="This upload is counted against the requirement above, not the checklist item upload count."
                                                triggerText="Drag and drop or choose required image or document"
                                                showSelectedPreview={false}
                                                onInputChange={(e) => handleUploadFilingPhoto(pr.id, e)}
                                              />
                                            </>
                                          )}

                                          {/* Uploaded Attachments list */}
                                          {reqAttachments.length > 0 && (
                                            <div className="overflow-hidden rounded-xl border border-outline-variant/60">
                                              <table className="ds-table">
                                                <thead>
                                                  <tr>
                                                    <th>File Name</th>
                                                    <th>Size</th>
                                                    <th>Uploaded By</th>
                                                    <th className="w-16">Actions</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {reqAttachments.map((a: any) => (
                                                    <tr key={a.id}>
                                                      <td className="truncate max-w-[200px] text-xs font-medium text-on-surface">
                                                        <a href={a.fileKey} target="_blank" rel="noreferrer" className="text-[#00cec4] hover:underline flex items-center gap-1 font-semibold">
                                                          <ExternalLink size={12} className="shrink-0" /> {a.fileName}
                                                        </a>
                                                      </td>
                                                      <td className="ds-numeric text-xs font-mono">{(a.fileSize / 1024).toFixed(1)} KB</td>
                                                      <td className="text-xs">{a.uploadedBy?.name || "Unknown"}</td>
                                                      <td>
                                                        <Button
                                                          type="button"
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() => handleDeleteFilingPhoto(a.id)}
                                                          disabled={loading === `filing-delete-${a.id}`}
                                                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-1"
                                                        >
                                                          Delete
                                                        </Button>
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                            </form>

                            <Modal
                              open={goBackOpen}
                              title="Jump Back To Earlier Stage"
                              description="The current stage will be cancelled and the selected earlier filing stage will reopen as a fresh run. This move is recorded in the audit tab."
                              onClose={() => setGoBackOpen(false)}
                              className="max-w-lg"
                            >
                              <div className="space-y-4">
                                <label className="block space-y-1.5">
                                  <span className="ds-label">Select Earlier Stage *</span>
                                  <select
                                    value={selectedJumpBackNodeKey}
                                    onChange={(e) => setSelectedJumpBackNodeKey(e.target.value)}
                                    className="w-full text-sm"
                                  >
                                    <option value="">-- Choose Earlier Stage --</option>
                                    {jumpBackTargets.map((target: any) => (
                                      <option key={target.nodeKey} value={target.nodeKey}>
                                        {target.nodeName} {target.completedAt ? `(${new Date(target.completedAt).toLocaleString("en-IN")})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="block space-y-1.5">
                                  <span className="ds-label">Reason for jump-back *</span>
                                  <textarea
                                    rows={3}
                                    value={goBackReason}
                                    onChange={(e) => setGoBackReason(e.target.value)}
                                    placeholder="Explain why this filing stage must be reworked..."
                                    className="w-full text-sm"
                                    required
                                  />
                                </label>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setGoBackOpen(false)}
                                    disabled={loading === "filing-go-back"}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={loading === "filing-go-back" || !goBackReason.trim() || !selectedJumpBackNodeKey}
                                    onClick={() => void handleGoBackStage()}
                                  >
                                    <Undo2 size={13} />
                                    {loading === "filing-go-back" ? "Jumping Back..." : "Confirm Jump Back"}
                                  </Button>
                                </div>
                              </div>
                            </Modal>
                          </div>
                        ) : (
                          <div className="card-top-accent rounded-xl border border-outline-variant/60 bg-surface p-5 space-y-4 shadow-sm">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="ds-icon-badge">
                                <CheckCircle2 size={18} />
                              </span>
                              <div className="space-y-1">
                                <h4 className="ds-h3 text-on-surface">Customs Filing Workflow Complete</h4>
                                <Badge variant="success">Filed</Badge>
                              </div>
                            </div>
                            <p className="max-w-xl text-sm text-on-surface-variant">
                              All blueprint checklist checks have been completed and the customs submission has been filed. The job stage is updated to <strong>FILED</strong>.
                            </p>
                            <div className="grid grid-cols-2 gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 text-xs max-w-md">
                              <div>
                                <span className="ds-label block text-on-surface-variant">Actual Filing Date</span>
                                <span className="font-medium text-on-surface ds-numeric">
                                  {job.filing.actualFilingDate ? new Date(job.filing.actualFilingDate).toLocaleDateString("en-IN") : "Completed"}
                                </span>
                              </div>
                              <div>
                                <span className="ds-label block text-on-surface-variant">Filing Reference ID</span>
                                <span className="font-medium text-on-surface ds-numeric">{job.filing.filingRef || "Completed"}</span>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PANEL: ADVANCES */}
          {activeTab === "advances" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="ds-h3 text-on-surface">Client Advance Collections</h3>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  job.customerAdvance.status === "FULLY_RECEIVED" ? "text-green-600" : "text-[#fb923c]"
                }`}>
                  Collection: {job.customerAdvance.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {/* Expected settings */}
                <div className="space-y-4">
                  <div className="border border-outline-variant p-4 rounded-2xl space-y-4">
                    <span className="ds-label block text-on-surface">Billing expected terms</span>

                    <div className="space-y-1">
                      <label className="ds-label block">Expected Advance Amount (₹) *</label>
                      <input
                        type="number"
                        value={expectedAdvance}
                        onChange={(e) => setExpectedAdvance(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono ds-numeric"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="ds-label block">Advance Due Date</label>
                      <DateInput
                        value={advanceDueDate}
                        onChange={(e) => setAdvanceDueDate(e.target.value)}
                        className="w-full text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="ds-label block">Assigned Collections Agent</label>
                      <select
                        value={advanceAssigneeId}
                        onChange={(e) => setAdvanceAssigneeId(e.target.value)}
                        className="w-full text-xs"
                      >
                        <option value="">No Agent Assigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleUpdateAdvanceExpected} disabled={loading !== null} className="flex-1 text-xs h-9">
                        Save Terms
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowWaiveAdvance(!showWaiveAdvance)}
                        className="flex-1 text-xs h-9 text-red-500 border-red-200"
                      >
                        Waive Collection
                      </Button>
                    </div>
                  </div>

                  {/* Waive advance drawer */}
                  {showWaiveAdvance && (
                    <div className="border border-red-200 bg-red-50/5 p-4 rounded-2xl space-y-3">
                      <span className="ds-label text-red-500 block">Exempt / Waive Advance Requirement</span>
                      <input
                        type="text"
                        placeholder="Explain why client advance is not required..."
                        value={waiveAdvanceReason}
                        onChange={(e) => setWaiveAdvanceReason(e.target.value)}
                        className="text-xs w-full"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowWaiveAdvance(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleWaiveAdvance} disabled={loading !== null}>
                          Confirm Waiver
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Receipts details */}
                <div className="space-y-4">
                  {/* Form to add receipts */}
                  {job.customerAdvance.status !== "NOT_REQUIRED" && job.customerAdvance.status !== "FULLY_RECEIVED" && (
                    <form onSubmit={handleRecordAdvanceReceipt} className="border border-outline-variant p-4 rounded-2xl space-y-4">
                      <span className="ds-label block text-on-surface">Record Received Receipt</span>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="ds-label block">Amount Paid (₹) *</label>
                          <input
                            type="number"
                            required
                            value={receiptAmount}
                            onChange={(e) => setReceiptAmount(e.target.value)}
                            className="w-full text-xs font-mono ds-numeric"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="ds-label block">Date Received *</label>
                          <DateInput
                            required
                            value={receiptDate}
                            onChange={(e) => setReceiptDate(e.target.value)}
                            className="w-full text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="ds-label block">Payment Method *</label>
                          <select
                            value={receiptMethod}
                            onChange={(e) => setReceiptMethod(e.target.value)}
                            className="w-full text-xs"
                          >
                            <option value="NEFT">NEFT / RTGS</option>
                            <option value="BANK_TRANSFER">Bank IMPS</option>
                            <option value="CASH">Cash</option>
                            <option value="CHEQUE">Cheque</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="ds-label block">Txn Reference Ref</label>
                          <input
                            type="text"
                            placeholder="e.g. IMPS992812"
                            value={receiptRef}
                            onChange={(e) => setReceiptRef(e.target.value)}
                            className="w-full text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="ds-label block">Remarks</label>
                        <input
                          type="text"
                          placeholder="e.g. Paid online"
                          value={receiptRemarks}
                          onChange={(e) => setReceiptRemarks(e.target.value)}
                          className="w-full text-xs"
                        />
                      </div>

                      <Button type="submit" disabled={loading !== null} className="w-full">
                        Post Receipt Details
                      </Button>
                    </form>
                  )}

                  {/* Receipts list */}
                  <div className="space-y-3">
                    <span className="ds-label block text-on-surface">Payment Receipts Catalog</span>
                    {job.customerAdvance.receipts?.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">No receipts recorded for this job advance.</p>
                    ) : (
                      <div className="space-y-2">
                        {job.customerAdvance.receipts.map((r: any) => (
                          <div key={r.id} className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-2xl flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-[#00cec4] block">₹{Number(r.amount).toLocaleString("en-IN")}</span>
                              <span className="text-[10px] text-on-surface-variant block uppercase mt-0.5">
                                {r.paymentMethod} • Ref: {r.referenceNumber || "—"}
                              </span>
                            </div>
                            <span className="text-[10px] text-on-surface-variant font-mono">
                              {new Date(r.receivedDate).toDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PANEL: EXPENSES */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              {/* Create expense request */}
              <div className="border border-outline-variant p-4 rounded-xl space-y-4 bg-surface-container-low">
                <h3 className="ds-h3 text-on-surface">New Clearance Expense Request</h3>

                <form onSubmit={handleCreateExpenseRequest} className="space-y-4">
                  {/* Urgent switch */}
                  <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between p-4 border border-outline-variant/60 rounded-2xl bg-surface">
                    <div className="flex items-start space-x-3">
                      <NeonCheckbox
                        checked={expenseUrgent}
                        onChange={(e) => setExpenseUrgent(e.target.checked)}
                        className="mt-1"
                        label={
                          <div>
                            <span className="text-sm font-semibold text-on-surface block">Escalate to URGENT Payment</span>
                            <span className="text-xs text-on-surface-variant">
                              Request accounts to disburse payment immediately to resolve critical port blocks.
                            </span>
                          </div>
                        }
                      />
                    </div>

                    {expenseUrgent && (
                      <div className="flex-1 max-w-md space-y-1">
                        <label className="ds-label block text-[#fb923c]">
                          Urgency Explanation Justification (REQUIRED) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Demurrage free days end tomorrow"
                          value={expenseUrgencyReason}
                          onChange={(e) => setExpenseUrgencyReason(e.target.value)}
                          className="w-full text-xs font-sans border-[#fb923c]/50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Multi-lines lists */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                      <span className="ds-label">Expense Line Items</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddExpenseLine}
                        className="flex items-center gap-1 border-[#00cec4] text-[#00cec4]"
                      >
                        <Plus size={12} /> Add Line Item
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {expenseLines.map((line, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end border-b border-outline-variant/20 pb-3 md:pb-0 md:border-b-0">
                          {/* category */}
                          <div className="space-y-1 md:col-span-1">
                            <label className="ds-label">Category</label>
                            <select
                              value={line.category}
                              onChange={(e) => handleExpenseLineChange(index, "category", e.target.value)}
                              className="w-full text-xs h-9"
                            >
                              {expenseCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Purpose */}
                          <div className="space-y-1 md:col-span-2">
                            <label className="ds-label">Purpose / Purpose *</label>
                            <input
                              type="text"
                              required
                              placeholder="Reason for payment"
                              value={line.purpose}
                              onChange={(e) => handleExpenseLineChange(index, "purpose", e.target.value)}
                              className="w-full text-xs h-9"
                            />
                          </div>

                          {/* Amount */}
                          <div className="space-y-1 md:col-span-1">
                            <label className="ds-label">Amount (₹) *</label>
                            <input
                              type="number"
                              required
                              placeholder="Amount"
                              value={line.amount}
                              onChange={(e) => handleExpenseLineChange(index, "amount", e.target.value)}
                              className="w-full text-xs font-mono ds-numeric h-9"
                            />
                          </div>

                          {/* Required Date */}
                          <div className="space-y-1 md:col-span-1">
                            <label className="ds-label">Required Date</label>
                            <DateInput
                              value={line.requiredDate}
                              onChange={(e) => handleExpenseLineChange(index, "requiredDate", e.target.value)}
                              className="w-full text-xs h-9"
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end h-9 items-center col-span-1">
                            {expenseLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveExpenseLine(index)}
                                className="text-red-500 hover:text-red-700 p-1.5"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading !== null}>
                      Dispatch Expense Request
                    </Button>
                  </div>
                </form>
              </div>

              {/* List of requested expenses */}
              <div className="space-y-4">
                <h3 className="ds-h3 text-on-surface border-b border-outline-variant/30 pb-2">Expenses Queue</h3>

                {job.expenseRequests?.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">No expenses requested for this job clearance.</p>
                ) : (
                  <div className="space-y-4">
                    {job.expenseRequests.map((req: any) => {
                      const isPaid = req.status === "PAID";
                      const isAck = req.status === "RECEIPT_ACKNOWLEDGED";
                      const isQuery = req.status === "QUERY_RAISED";
                      const sum = req.lines.reduce((tot: number, l: any) => tot + Number(l.amount), 0);

                      return (
                        <div
                          key={req.id}
                          className={`p-4 rounded-2xl border space-y-4 transition-all ${
                            req.isUrgent
                              ? "border-red-200 bg-red-50/5"
                              : "border-outline-variant"
                          }`}
                        >
                          {/* Title Bar */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
                            <div>
                              <span className="text-xs text-on-surface-variant block">
                                Ref: {req.id} • Requested by: <strong>{req.requestedBy?.name}</strong>
                              </span>
                              <span className="text-lg text-[#00cec4] block mt-1 ds-numeric">
                                ₹{sum.toLocaleString("en-IN")}{" "}
                                {req.isUrgent && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 ml-2">
                                    URGENT
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isAck
                                  ? "bg-green-100 text-green-700"
                                  : isPaid
                                  ? "bg-blue-100 text-blue-700"
                                  : isQuery
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-surface-container-high text-on-surface-variant border border-outline-variant"
                              }`}>
                                Status: {req.status.replace(/_/g, " ")}
                              </span>

                              {/* Escalation button */}
                              {req.status === "SUBMITTED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEscRequestId(req.id);
                                    setEscUrgencyReason("");
                                  }}
                                >
                                  Escalate
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Lines lists */}
                          <div className="space-y-1.5 pl-2 border-l border-outline-variant/40">
                            {req.lines.map((l: any) => (
                              <div key={l.id} className="text-xs flex justify-between">
                                <span className="text-on-surface">
                                  <strong className="text-on-surface-variant uppercase">{l.category}</strong>: {l.purpose}
                                </span>
                                <span className="font-mono ds-numeric text-on-surface-variant">₹{Number(l.amount).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>

                          {/* Rework / Escalation Alerts */}
                          {req.isUrgent && req.urgencyReason && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs leading-relaxed text-red-700">
                              <strong>Urgent escalation reason:</strong> "{req.urgencyReason}"
                            </div>
                          )}

                          {/* Query loop visibility */}
                          {req.queries?.map((q: any) => (
                            <div key={q.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs space-y-2">
                              <div>
                                <strong className="text-[#fb923c]">DISBURSEMENT QUERY:</strong>
                                <p className="text-on-surface italic mt-0.5">"{q.queryText}"</p>
                                <span className="text-[10px] text-on-surface-variant block mt-0.5">Raised by: {q.author?.name}</span>
                              </div>

                              {q.resolved ? (
                                <div className="border-t border-orange-200/50 pt-2 text-[11px] text-green-700">
                                  <strong>Resolution:</strong> "{q.resolutionText}" (Resolved by {q.resolvedBy?.name})
                                </div>
                              ) : (
                                resolveQueryId === q.id ? (
                                  <div className="space-y-2 border-t border-orange-200/50 pt-2">
                                    <input
                                      type="text"
                                      placeholder="Enter query resolution details..."
                                      value={resolutionText}
                                      onChange={(e) => setResolutionText(e.target.value)}
                                      className="w-full text-xs font-sans"
                                    />
                                    <div className="flex justify-end gap-1">
                                      <Button size="sm" variant="outline" onClick={() => setResolveQueryId(null)}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={handleResolveQuery} disabled={loading !== null}>
                                        Post Resolution
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setResolveQueryId(q.id);
                                      setResolutionText("");
                                    }}
                                    className="text-xs font-semibold text-[#fb923c] hover:underline"
                                  >
                                    Resolve Query
                                  </button>
                                )
                              )}
                            </div>
                          ))}

                          {/* Payments Posted */}
                          {req.payments?.map((p: any) => (
                            <div key={p.id} className="p-3 bg-green-50/5 border border-green-200 rounded-lg text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <div>
                                <span className="font-semibold text-green-700 block">Payment Disbursed via {p.paymentMethod}</span>
                                <span className="text-[10px] text-on-surface-variant">
                                  Txn Ref: {p.transactionReference} • Paid by {p.paidBy?.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-on-surface-variant font-mono font-bold">
                                {new Date(p.paymentDate).toDateString()}
                              </span>
                            </div>
                          ))}

                          {/* Escalation dialog popup */}
                          {escRequestId === req.id && (
                            <div className="p-4 border border-[#fb923c]/40 bg-[#fb923c]/5 rounded-2xl space-y-3">
                              <span className="ds-label text-[#fb923c] font-bold block">Escalate Request to Urgent</span>
                              <input
                                type="text"
                                placeholder="Reason for immediate payment request..."
                                value={escUrgencyReason}
                                onChange={(e) => setEscUrgencyReason(e.target.value)}
                                className="text-xs w-full"
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEscRequestId(null)}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={handleEscalateExpense} disabled={loading !== null}>
                                  Escalate Request
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Review Action Drawer Popup */}
                          {expReviewId === req.id && (
                            <div className="p-4 border border-outline-variant/60 bg-surface rounded-2xl space-y-3">
                              <span className="ds-label block text-on-surface">Administrative Expense Review</span>
                              <div className="grid grid-cols-2 gap-3">
                                <select
                                  value={expReviewStatus}
                                  onChange={(e) => setExpReviewStatus(e.target.value)}
                                  className="text-xs w-full"
                                >
                                  <option value="">Choose Review Decision</option>
                                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                                  <option value="CLARIFICATION_REQUIRED">CLARIFICATION REQUIRED</option>
                                  <option value="APPROVED">APPROVED</option>
                                  <option value="READY_FOR_DISBURSEMENT">READY FOR DISBURSEMENT</option>
                                  <option value="REJECTED">REJECTED</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Review notes (Required for clarification/rejections)..."
                                  value={expReviewRemarks}
                                  onChange={(e) => setExpReviewRemarks(e.target.value)}
                                  className="text-xs w-full"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setExpReviewId(null)}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={handleExpenseReview} disabled={loading !== null}>
                                  Post Decision
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Post Payout Form Popup */}
                          {payRequestId === req.id && (
                            <form onSubmit={handlePostExpensePayment} className="p-4 border border-[#00cec4]/40 bg-[#00cec4]/5 rounded-2xl space-y-4">
                              <span className="ds-label text-[#00cec4] block">Post Payment Disbursement Confirmation</span>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="ds-label block">Amount Disbursed (₹) *</label>
                                  <input
                                    type="number"
                                    required
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    className="w-full text-xs font-mono ds-numeric h-8"
                                  />
                                </div>
                                <div>
                                  <label className="ds-label block">Date Paid *</label>
                                  <DateInput
                                    required
                                    value={payDate}
                                    onChange={(e) => setPayDate(e.target.value)}
                                    className="w-full text-xs h-8"
                                  />
                                </div>
                                <div>
                                  <label className="ds-label block">Payment Method *</label>
                                  <select
                                    value={payMethod}
                                    onChange={(e) => setPayMethod(e.target.value)}
                                    className="w-full text-xs h-8"
                                  >
                                    <option value="BANK_TRANSFER">Bank Transfer IMPS</option>
                                    <option value="NEFT">NEFT / RTGS</option>
                                    <option value="CASH">Cash Drawer</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="ds-label block">Txn Reference ID *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Txn reference code"
                                    value={payRef}
                                    onChange={(e) => setPayRef(e.target.value)}
                                    className="w-full text-xs h-8"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPayRequestId(null)}>
                                  Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={loading !== null}>
                                  Confirm Disbursal
                                </Button>
                              </div>
                            </form>
                          )}

                          {/* Query Form Popup */}
                          {queryRequestId === req.id && (
                            <div className="p-4 border border-[#fb923c]/40 bg-[#fb923c]/5 rounded-2xl space-y-3">
                              <span className="ds-label text-[#fb923c] font-bold block">Raise Payment Discrepancy Query</span>
                              <input
                                type="text"
                                placeholder="What discrepancy is there in the posted payment details?..."
                                value={queryText}
                                onChange={(e) => setQueryText(e.target.value)}
                                className="text-xs w-full"
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setQueryRequestId(null)}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={handleRaiseQuery} disabled={loading !== null}>
                                  Submit Query
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Action buttons footer */}
                          <div className="flex justify-end gap-2 border-t border-outline-variant/10 pt-3 text-xs">
                            {/* Accounts / Pay Review */}
                            {req.status !== "PAID" && req.status !== "RECEIPT_ACKNOWLEDGED" && req.status !== "REJECTED" && (
                              <button
                                onClick={() => {
                                  setExpReviewId(req.id);
                                  setExpReviewStatus(req.status);
                                  setExpReviewRemarks("");
                                }}
                                className="ds-plain cha-link hover:underline font-semibold"
                              >
                                Review Status
                              </button>
                            )}

                            {/* Accounts Payout */}
                            {(req.status === "APPROVED" || req.status === "READY_FOR_DISBURSEMENT" || req.isUrgent) &&
                              req.status !== "PAID" &&
                              req.status !== "RECEIPT_ACKNOWLEDGED" &&
                              req.status !== "REJECTED" && (
                                <button
                                  onClick={() => {
                                    setPayRequestId(req.id);
                                    setPayAmount(String(sum));
                                    setPayDate(new Date().toISOString().slice(0, 10));
                                    setPayRef("");
                                  }}
                                  className="ds-plain cha-link hover:underline font-bold"
                                >
                                  Disburse Payment
                                </button>
                              )}

                            {/* Requester Ack / Query */}
                            {isPaid && (
                              <>
                                <button
                                  onClick={() => {
                                    setQueryRequestId(req.id);
                                    setQueryText("");
                                  }}
                                  className="text-[#fb923c] hover:underline font-semibold"
                                >
                                  Raise Query
                                </button>
                                <button
                                  onClick={() => handleAcknowledgeExpense(req.id)}
                                  disabled={loading !== null}
                                  className="text-green-600 hover:underline font-bold"
                                >
                                  Acknowledge Receipt
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PANEL: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <h3 className="ds-h3 text-on-surface">Job Auditing History Trail</h3>
              
              {job.auditLogs?.length === 0 ? (
                <p className="text-xs text-on-surface-variant">No audit log records for this clearance.</p>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/40">
                  {job.auditLogs.map((log: any) => (
                    <div key={log.id} className="relative space-y-1 text-xs">
                      {/* Dot */}
                      <span className="absolute -left-[20px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#00cec4] border-2 border-surface shadow-[0_0_0_2px_rgba(0,206,196,0.1)]" />
                      
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-on-surface">{log.event.replace(/_/g, " ")}</span>
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          {new Date(log.timestamp).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <p className="text-on-surface-variant leading-relaxed">
                        {log.remarks}
                      </p>

                      <div className="flex gap-4 text-[10px] text-on-surface-variant pt-0.5">
                        <span>Actor: <strong>{log.actor?.name || "System"}</strong></span>
                        {log.newState && (
                          <span>New State: <strong>{log.newState}</strong></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>

      <Modal
        open={executionTimelineModalOpen}
        onClose={() => setExecutionTimelineModalOpen(false)}
          title="Execution Blueprint Timeline"
          description="Review each filing workflow run, completion note, and attachment from the execution path."
          className="max-w-4xl"
        >
          <div className="space-y-4">
            {filingInstance?.nodeRuns?.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant/70 px-4 py-5 text-sm text-on-surface-variant">
                No workflow checks executed yet.
              </div>
            ) : (
              filingInstance?.nodeRuns?.map((run: any) => {
                const isCurrent = run.status === "ACTIVE";
                const runBadgeVariant =
                  run.status === "ACTIVE" ? "default" : run.completedAt ? "success" : "secondary";
                return (
                  <div key={run.id} className="rounded-xl border border-outline-variant/60 bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={`text-sm font-medium ${isCurrent ? "text-[#00cec4]" : "text-on-surface"}`}>
                            {run.node?.name || run.nodeKey}
                          </h4>
                          <Badge variant={runBadgeVariant}>{run.status}</Badge>
                        </div>
                        {(run.node?.sectionName || run.node?.branchName) && (
                          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">
                            {[run.node?.sectionName, run.node?.branchName].filter(Boolean).join(" / ")}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-on-surface-variant">
                        Started {new Date(run.startedAt).toLocaleString("en-IN")}
                        {run.completedAt ? ` • Finished ${new Date(run.completedAt).toLocaleString("en-IN")}` : ""}
                      </span>
                    </div>

                    {run.completedBy ? (
                      <p className="mt-3 text-xs text-on-surface-variant">
                        Completed by: <strong className="text-on-surface">{run.completedBy.name}</strong>
                      </p>
                    ) : null}

                    {run.remarks ? (
                      <div className="mt-3 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 text-xs italic text-on-surface-variant">
                        "{run.remarks}"
                      </div>
                    ) : null}

                    {run.attachments?.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <span className="ds-label block text-on-surface-variant">Attachments</span>
                        <div className="space-y-2">
                          {run.attachments.map((att: any) => (
                            <a
                              key={att.id}
                              href={att.fileKey}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-xs font-medium text-[#00cec4] hover:underline"
                            >
                              <ExternalLink size={12} className="shrink-0" />
                              <span className="truncate">{att.fileName}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </Modal>

        <Modal
          open={deleteModalMode === "delete"}
          onClose={resetDeletionModalState}
          title="Delete CHA Job"
          description={
            canDirectDeleteJob
              ? `This will immediately remove ${job.jobNumber} from the active CHA workspace. Related records stay in history, but this action is destructive and should be used carefully.`
              : `This will submit a manager approval request to delete ${job.jobNumber}. The job stays active until the assigned manager approves it.`
          }
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-200/70 bg-red-50/40 p-4 text-sm text-on-surface">
              <p className="text-red-600">Permanent action</p>
              <p className="mt-1 text-on-surface-variant">
                Deleting this job affects linked CHA workflows, audit visibility, and operational references.
              </p>
              <p className="mt-3 text-on-surface-variant">
                Type the exact job number{" "}
                <span className="inline-flex rounded-md bg-surface-container px-2 py-0.5 text-on-surface ds-numeric">
                  {job.jobNumber}
                </span>{" "}
                and the confirmation phrase{" "}
                <span className="inline-flex rounded-md bg-surface-container px-2 py-0.5 text-on-surface">
                  delete job
                </span>{" "}
                to continue.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="ds-label block">Type Exact Job Number</label>
                <Input
                  type="text"
                  value={deleteConfirmJobNumber}
                  onChange={(e) => setDeleteConfirmJobNumber(e.target.value)}
                  placeholder={job.jobNumber}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="ds-label block">Type Confirmation Phrase</label>
                <Input
                  type="text"
                  value={deleteConfirmPhrase}
                  onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                  placeholder="delete job"
                  className="text-sm"
                />
                <p className="text-xs text-on-surface-variant">
                  Enter exactly: <span className="text-on-surface">delete job</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={resetDeletionModalState} disabled={loading !== null}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!deleteInputsMatch || loading === "job-delete"}
                onClick={handleSubmitJobDeletion}
              >
                {loading === "job-delete"
                  ? "Processing..."
                  : canDirectDeleteJob
                  ? "Delete Job"
                  : "Request Deletion"}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={deleteModalMode === "approve"}
          onClose={resetDeletionModalState}
          title="Approve Job Deletion"
          description={`Approve the pending deletion request for ${job.jobNumber}. This will immediately soft-delete the job after approval.`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-200/70 bg-red-50/40 p-4 text-sm text-on-surface">
              <p className="text-red-600">Manager approval required</p>
              <p className="mt-1 text-on-surface-variant">
                Confirm the exact job number and type <span className="text-on-surface">delete job</span> to execute this deletion request.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="ds-label block">Type Exact Job Number</label>
                <Input
                  type="text"
                  value={deleteConfirmJobNumber}
                  onChange={(e) => setDeleteConfirmJobNumber(e.target.value)}
                  placeholder={job.jobNumber}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="ds-label block">Type Confirmation Phrase</label>
                <Input
                  type="text"
                  value={deleteConfirmPhrase}
                  onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                  placeholder="delete job"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="ds-label block">Approval Note (Optional)</label>
                <textarea
                  rows={3}
                  value={deleteDecisionRemarks}
                  onChange={(e) => setDeleteDecisionRemarks(e.target.value)}
                  placeholder="Add any execution note for the audit trail..."
                  className="w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-[var(--color-placeholder)] hover:border-[#00cec4]/85 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={resetDeletionModalState} disabled={loading !== null}>
                Cancel
              </Button>
              <Button
                disabled={!deleteInputsMatch || loading === "job-delete-approve"}
                onClick={handleApproveDeletionRequest}
              >
                {loading === "job-delete-approve" ? "Deleting..." : "Approve & Delete"}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={deleteModalMode === "reject"}
          onClose={resetDeletionModalState}
          title="Reject Job Deletion Request"
          description={`Reject the pending deletion request for ${job.jobNumber}. A rejection reason is required and the job will remain active.`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="ds-label block">Rejection Reason</label>
              <textarea
                rows={4}
                value={deleteDecisionRemarks}
                onChange={(e) => setDeleteDecisionRemarks(e.target.value)}
                placeholder="Explain why this CHA job should not be deleted..."
                className="w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-[var(--color-placeholder)] hover:border-[#00cec4]/85 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={resetDeletionModalState} disabled={loading !== null}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!deleteDecisionRemarks.trim() || loading === "job-delete-reject"}
                onClick={handleRejectDeletionRequest}
              >
                {loading === "job-delete-reject" ? "Rejecting..." : "Reject Request"}
              </Button>
            </div>
          </div>
        </Modal>

        {deleteDocModal && (
          <Modal
            open={true}
            onClose={() => setDeleteDocModal(null)}
            title="Delete Document Version"
            description="Are you sure you want to permanently delete this document version?"
            className="max-w-md"
          >
            <div className="space-y-4">
              <p className="text-sm text-on-surface">
                File: <strong className="text-on-surface-variant font-medium">{deleteDocModal.fileName}</strong>
              </p>
              <p className="text-xs text-red-500 font-medium">
                This action is permanent and cannot be undone. If this is a mandatory document requirement, the workflow stage may revert to Document Collection.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDocModal(null)}
                  disabled={loading === "delete-doc"}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDeleteDoc}
                  disabled={loading === "delete-doc"}
                >
                  {loading === "delete-doc" ? "Deleting..." : "Confirm Delete"}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {uploadDocumentModalRequirement && (
          <Modal
            open={true}
            onClose={() => setUploadDocumentModalReqId(null)}
            title={`Upload ${uploadDocumentModalRequirement.name}`}
            description="Drag and drop a file here or click to browse and upload it to this document requirement."
            className="max-w-xl"
          >
            <div className="space-y-4">
              <FileUploadField
                id={`document-upload-modal-${uploadDocumentModalRequirement.id}`}
                helperText="Choose the file for this document requirement. If a validity date is required, you will be prompted next."
                triggerText="Drag and drop or choose file to upload"
                onInputChange={(e) => {
                  handleUploadDoc(uploadDocumentModalRequirement.id, e);
                  setUploadDocumentModalReqId(null);
                }}
              />

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadDocumentModalReqId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {isCustomDocumentModalOpen && (
          <Modal
            open={true}
            onClose={() => {
              if (loading === "custom-doc-upload") return;
              setIsCustomDocumentModalOpen(false);
              setCustomDocumentName("");
              setCustomDocumentFile(null);
            }}
            title="Add Custom Document"
            description="Create a temporary document slot for this job only and upload the file immediately."
            className="max-w-xl"
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 text-xs text-on-surface-variant">
                This custom document name is job-specific and will appear only inside <strong className="text-on-surface">this CHA job</strong>, under the <strong className="text-on-surface">User Uploads</strong> section.
              </div>

              <div className="space-y-4">
                <label className="space-y-1.5">
                  <span className="ds-label">Custom Document Name</span>
                  <input
                    type="text"
                    value={customDocumentName}
                    onChange={(e) => setCustomDocumentName(e.target.value)}
                    placeholder="Example: Supplier Email Approval"
                    maxLength={120}
                    className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm text-on-surface"
                  />
                </label>

                <FileUploadField
                  id="custom-document-upload"
                  label="File Upload"
                  helperText="Upload the file now so this custom document appears immediately in the job workspace."
                  triggerText="Drag and drop or choose file to upload"
                  selectedFile={
                    customDocumentFile
                      ? {
                          file: customDocumentFile,
                          name: customDocumentFile.name,
                          sizeBytes: customDocumentFile.size,
                          statusLabel: "Ready",
                        }
                      : null
                  }
                  onClear={() => setCustomDocumentFile(null)}
                  onInputChange={(e) => setCustomDocumentFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-outline-variant/20 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCustomDocumentModalOpen(false);
                    setCustomDocumentName("");
                    setCustomDocumentFile(null);
                  }}
                  disabled={loading === "custom-doc-upload"}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateCustomDocument}
                  disabled={loading === "custom-doc-upload"}
                >
                  {loading === "custom-doc-upload" ? "Uploading..." : "Create And Upload"}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {viewingVersion && (
          <Modal
            open={true}
            onClose={() => setViewingVersion(null)}
            title="Document Viewer"
            description={`Viewing file: ${viewingVersion.fileName}`}
            className="max-w-4xl w-full"
          >
            {(() => {
              const previewUrl = previewUrls[viewingVersion.id] || viewingVersion.fileKey || null;
              const targetUrl = previewUrl?.startsWith("blob:")
                ? previewUrl
                : (viewingVersion.type === "checklist"
                    ? `/api/cha/checklist-files/${viewingVersion.id}`
                    : `/api/cha/documents/${viewingVersion.id}`);

              const downloadUrl = previewUrl?.startsWith("blob:")
                ? previewUrl
                : (viewingVersion.type === "checklist"
                    ? `/api/cha/checklist-files/${viewingVersion.id}?download=true`
                    : `/api/cha/documents/${viewingVersion.id}?download=true`);

              const isImage = viewingVersion.mimeType.startsWith("image/");
              const isPdf = viewingVersion.mimeType === "application/pdf";
              const canPreview = isImage || isPdf;

              return (
                <div className="relative h-[60vh] flex flex-col bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden">
                  {canPreview ? (
                    <>
                      {loadingPreview && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-[1px] z-10 gap-3">
                          <div className="w-8 h-8 rounded-full border-2 border-t-[#00cec4] border-r-transparent border-b-[#00cec4] border-l-transparent animate-spin" />
                          <span className="text-xs text-on-surface-variant font-sans">Loading preview...</span>
                        </div>
                      )}
                      {isImage ? (
                        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                          <img
                            src={targetUrl}
                            alt={viewingVersion.fileName}
                            className="max-w-full max-h-full object-contain"
                            onLoad={() => setLoadingPreview(false)}
                            onError={() => setLoadingPreview(false)}
                          />
                        </div>
                      ) : (
                        <iframe
                          src={targetUrl}
                          className="w-full h-full border-0"
                          title={viewingVersion.fileName}
                          onLoad={() => setLoadingPreview(false)}
                        />
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#00cec4]/10 text-[#00cec4] flex items-center justify-center">
                        <FileText size={32} />
                      </div>
                      <div className="space-y-2 max-w-md">
                        <h4 className="ds-h3 text-sm text-on-surface">Preview Unavailable</h4>
                        <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
                          Word, Excel, or binary formats cannot be previewed directly in the browser. You can download this file to view it locally.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low text-left text-xs space-y-2 w-full max-w-md">
                        <p className="font-semibold text-on-surface uppercase ds-label">File Details</p>
                        <div className="grid grid-cols-2 gap-2 text-on-surface-variant">
                          <span>Filename:</span>
                          <span className="text-on-surface truncate font-sans">{viewingVersion.fileName}</span>
                          <span>Size:</span>
                          <span className="text-on-surface ds-numeric font-sans">{(viewingVersion.sizeBytes / 1024).toFixed(1)} KB</span>
                          <span>Uploaded By:</span>
                          <span className="text-on-surface font-sans">{viewingVersion.uploadedBy?.name || "System"}</span>
                          <span>Uploaded At:</span>
                          <span className="text-on-surface ds-numeric font-sans">
                            {viewingVersion.uploadedAt ? new Date(viewingVersion.uploadedAt).toLocaleString("en-IN") : "N/A"}
                          </span>
                        </div>
                      </div>
                      <a
                        href={downloadUrl}
                        download={previewUrl?.startsWith("blob:") ? viewingVersion.fileName : undefined}
                        className="inline-flex items-center justify-center bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-2xl text-xs uppercase tracking-wide transition-all font-medium"
                      >
                        Download File
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}
          </Modal>
        )}

        {isEditingManager && (
          <Modal
            open={true}
            onClose={() => setIsEditingManager(false)}
            title="Edit Job Manager Assignment"
            description="Update the assigned manager for this CHA job. The manager is responsible for internal approvals and deletion approvals."
            className="max-w-md"
          >
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="ds-label block">Select Manager</label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full text-sm rounded-2xl"
                >
                  <option value="">-- Choose Manager --</option>
                  {filteredManagers.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingManager(false)}
                  disabled={loading !== null}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUpdateManager}
                  disabled={loading !== null || !selectedManagerId}
                >
                  {loading === "update-manager" ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Modal>
        )}
        {showSection49Modal && (
          <Modal
            open={showSection49Modal}
            onClose={() => {
              setShowSection49Modal(false);
              setSection49Remarks("");
            }}
            title={`${section49Flag?.isEnabled ? "Deactivate" : "Activate"} Section 49`}
            description={`Toggle Section 49 customs bond filing status for job ${job.jobNumber}.`}
            className="max-w-md"
          >
            <div className="space-y-4 pt-2">
              <p className="text-xs text-on-surface-variant font-sans">
                Are you sure you want to {section49Flag?.isEnabled ? "deactivate" : "activate"} Section 49 customs bond filing status? This change will be logged in the audit trail.
              </p>
              <div className="space-y-1.5">
                <span className="ds-label">Remarks / Explanation *</span>
                <textarea
                  rows={3}
                  value={section49Remarks}
                  onChange={(e) => setSection49Remarks(e.target.value)}
                  placeholder="Provide justification or remarks for this status change..."
                  className="w-full resize-none rounded-xl border border-[rgba(0,206,196,0.55)] bg-surface px-[14px] py-[10px] text-sm text-on-surface placeholder:text-placeholder outline-none transition-colors hover:border-[rgba(0,206,196,0.4)] focus:border-[rgba(0,206,196,0.52)] focus:shadow-[0_0_0_3px_rgba(14,137,149,0.14)]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSection49Modal(false);
                    setSection49Remarks("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={loading !== null || !section49Remarks.trim()}
                  onClick={handleToggleSection49}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af]"
                >
                  {loading === "section49-toggle" ? "Updating..." : "Confirm Change"}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </main>
    );
  }
