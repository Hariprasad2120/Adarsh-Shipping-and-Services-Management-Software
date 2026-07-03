"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  Database,
  ExternalLink,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import * as actions from "@/modules/cha/actions";
import { DoValidityPanel } from "./do-validity-panel";

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

  useEffect(() => {
    setSection49Flag(job.filingSection49Flag ?? null);
    setSection49ValidityDate(job.filingSection49Flag?.validityDate ? job.filingSection49Flag.validityDate.slice(0, 10) : "");
  }, [job.filingSection49Flag]);


  const doValidityWarning = useMemo(() => {
    if (!job.additionalData?.deliveryOrderValidity) return null;
    const validityDate = new Date(job.additionalData.deliveryOrderValidity);
    const now = new Date();
    const validityDateStripped = new Date(validityDate.getFullYear(), validityDate.getMonth(), validityDate.getDate());
    const nowStripped = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = validityDateStripped.getTime() - nowStripped.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { type: "EXPIRED", message: `Delivery Order Validity expired on ${validityDate.toLocaleDateString("en-IN")}.` };
    } else if (diffDays <= 4) {
      return { type: "EXPIRING", message: `Delivery Order Validity is expiring in ${diffDays} day(s) on ${validityDate.toLocaleDateString("en-IN")}.` };
    }
    return null;
  }, [job.additionalData?.deliveryOrderValidity]);

  const section49ValidityWarning = useMemo(() => {
    if (!section49Flag?.isEnabled || !section49Flag?.validityDate) return null;
    const summary = getValiditySummary(section49Flag.validityDate);
    if (!summary || summary.tone === "neutral") return null;
    return {
      type: summary.tone === "destructive" ? "EXPIRED" : "EXPIRING",
      message:
        summary.tone === "destructive"
          ? `Section 49 validity expired on ${new Date(section49Flag.validityDate).toLocaleDateString("en-IN")}.`
          : `Section 49 validity is expiring on ${new Date(section49Flag.validityDate).toLocaleDateString("en-IN")}.`,
    };
  }, [section49Flag]);

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
        return !!job.additionalData?.doExtensionEnabled || hasPersistedState;
      }

      return !!job.additionalData?.doUploadEnabled || hasPersistedState;
    });
  }, [
    documentRequirements,
    job.additionalData?.doExtensionEnabled,
    job.additionalData?.doUploadEnabled,
    section49Flag?.isEnabled,
  ]);

  const bulkNaEligibleRequirements = useMemo(
    () =>
      visibleDocumentRequirements.filter(
        (req: any) => req.status !== "UPLOADED" && req.status !== "NOT_AVAILABLE",
      ),
    [visibleDocumentRequirements],
  );


  // Document Collection Form State
  const [exceptionReason, setExceptionReason] = useState("");
  const [activeDocReqId, setActiveDocReqId] = useState<string | null>(null);
  const [isCustomDocumentModalOpen, setIsCustomDocumentModalOpen] = useState(false);
  const [customDocumentName, setCustomDocumentName] = useState("");
  const [customDocumentFile, setCustomDocumentFile] = useState<File | null>(null);
  const [customerApprovalNow, setCustomerApprovalNow] = useState(() => Date.now());
  
  // Custom Document Requirements Configuration State additions
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [viewingVersion, setViewingVersion] = useState<any | null>(null);
  const [proceedErrors, setProceedErrors] = useState<string[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    if (viewingVersion) {
      setLoadingPreview(true);
    }
  }, [viewingVersion?.id]);

  useEffect(() => {
    if (initialTab && ["docs", "additionalData", "checklist", "filing", "advances", "expenses", "audit"].includes(initialTab)) {
      setActiveTab(initialTab as WorkspaceTab);
    }
    if (focusField === "deliveryOrderValidity") {
      const timer = setTimeout(() => {
        const input = document.getElementById("deliveryOrderValidity");
        if (input) {
          input.scrollIntoView({ behavior: "smooth", block: "center" });
          input.focus();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialTab, focusField]);

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
  const [deliveryOrderValidity, setDeliveryOrderValidity] = useState(
    job.additionalData?.deliveryOrderValidity ? job.additionalData.deliveryOrderValidity.slice(0, 10) : ""
  );

  // Checklist Workflow State
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [checklistRemarks, setChecklistRemarks] = useState("");
  const [internalApprovalRemarks, setInternalApprovalRemarks] = useState("");
  const [customerApprovalRemarks, setCustomerApprovalRemarks] = useState("");
  const [customerMailSubject, setCustomerMailSubject] = useState("");
  const [customerMailBody, setCustomerMailBody] = useState("");

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
  const [filingQueryTitle, setFilingQueryTitle] = useState("");
  const [filingQueryDetails, setFilingQueryDetails] = useState("");
  const [filingQueryStatusUpdates, setFilingQueryStatusUpdates] = useState<Record<string, string>>({});
  const [showBillNumberEntry, setShowBillNumberEntry] = useState(false);
  const [billFilingQueryDecision, setBillFilingQueryDecision] = useState<"" | "QUERY" | "CLEARED">("");
  const [goBackOpen, setGoBackOpen] = useState(false);
  const [goBackReason, setGoBackReason] = useState("");
  const [nodeRemarks, setNodeRemarks] = useState("");
  const [selectedNextNodeKey, setSelectedNextNodeKey] = useState<string>("");

  useEffect(() => {
    setBillOfEntryNumber(job.filing?.billOfEntryNumber || "");
    setShippingBillNumber(job.filing?.shippingBillNumber || "");
  }, [job.filing?.billOfEntryNumber, job.filing?.shippingBillNumber]);

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
  const activeNodeOpenQueries = useMemo(
    () => activeNodeQueries.filter((query: any) => query.status !== "CLOSED"),
    [activeNodeQueries],
  );
  const isBillFilingNode = useMemo(() => {
    if (!activeNodeRun?.node) return false;
    // The first step of every filing workflow is the Bill Filing stage:
    // upload the bill document + enter the bill number, then decide the
    // customs-query state — regardless of how the start node was configured.
    if (activeNodeRun.node.isStart && activeNodeRun.node.nodeType !== "DECISION") return true;
    const fieldKeys = (activeNodeRun.node.fieldDefinitionsJson || []).map((field: any) => field.key);
    const documentKeys = (activeNodeRun.node.documentRequirementsJson || []).map((document: any) => document.key);
    return fieldKeys.includes("bill_number") && documentKeys.includes("bill_document");
  }, [activeNodeRun]);
  const activeNodeDisplayName = isBillFilingNode ? "Bill Filing" : activeNodeRun?.node?.name || "";
  const billFilingDocumentUploaded = activeNodeAttachments.some(
    (attachment: any) => attachment.documentRequirementKey === "bill_document",
  );
  const billFilingDocumentAttachment = activeNodeAttachments.find(
    (attachment: any) => attachment.documentRequirementKey === "bill_document",
  );
  const billFilingNumberEntered = !!filingFieldValues.bill_number?.trim();
  const billFilingReadyForRouting = !isBillFilingNode || (billFilingDocumentUploaded && billFilingNumberEntered);
  const canOpenCustomsQueryTab = !isBillFilingNode || billFilingDocumentUploaded;
  const customsQueryTabOpen =
    billFilingQueryDecision === "QUERY" || !!filingToggleStates.customs_query || activeNodeOpenQueries.length > 0;
  const billFilingCanChooseQuery = isBillFilingNode && showBillNumberEntry && billFilingDocumentUploaded && billFilingNumberEntered;
  const billFilingCanMoveNext =
    !isBillFilingNode || (billFilingReadyForRouting && billFilingQueryDecision === "CLEARED" && activeNodeOpenQueries.length === 0);
  // Go-back is available on every filing stage that has a completed predecessor.
  const hasPreviousFilingStage =
    !!activeNodeRun &&
    (filingInstance?.nodeRuns || []).some(
      (run: any) => run.status === "COMPLETED" && run.nodeKey !== activeNodeRun.nodeKey,
    );


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
  const filingBillNumberLabel =
    isExportFiling ? "Shipping Bill Number" : isImportFiling ? "Bill Of Entry Number" : "Bill Number";
  const filingBillNumberValue = isExportFiling ? shippingBillNumber : billOfEntryNumber;
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
  const additionalDataLocked = job.stage === "FILING" || job.stage === "FILED";
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
    return /^\d+$/.test(value);
  };

  const handleSaveAdditionalData = async () => {
    if (manifestConfigMissing) {
      toast.error("This clearance type is missing manifest configuration. Update it in CHA settings before continuing.");
      return;
    }
    if (importGeneralManifest !== "" && !isValidManifest(importGeneralManifest)) {
      toast.error("IGM must contain digits only.");
      return;
    }
    if (exportGeneralManifest !== "" && !isValidManifest(exportGeneralManifest)) {
      toast.error("EGM must contain digits only.");
      return;
    }

    setLoading("additional-data-save");
    try {
      const res = await actions.upsertAdditionalDataAction(job.id, {
        vesselInwardDate: vesselInwardDate || null,
        importGeneralManifest: importGeneralManifest === "" ? null : importGeneralManifest,
        exportGeneralManifest: exportGeneralManifest === "" ? null : exportGeneralManifest,
        customManifestValue: customManifestValue === "" ? null : customManifestValue,
        deliveryOrderValidity: deliveryOrderValidity || null,
      });
      if (res.ok) {
        toast.success("Additional Data saved successfully.");
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
      toast.error("IGM must contain digits only.");
      return;
    }
    if (exportGeneralManifest !== "" && !isValidManifest(exportGeneralManifest)) {
      toast.error("EGM must contain digits only.");
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
        deliveryOrderValidity: deliveryOrderValidity || null,
      });

      if (!saveRes.ok) {
        toast.error(saveRes.error || "Failed to auto-save Additional Data.");
        setLoading(null);
        return;
      }

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

  const handleUploadChecklist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!checklistFile || checklistFile.size === 0) {
      toast.error("Please choose a checklist file to upload.");
      return;
    }

    setLoading("checklist-upload");
    try {
      const localUrl = URL.createObjectURL(checklistFile);
      const res = await actions.uploadChecklistFileAction(job.id, {
        fileKey: localUrl,
        fileName: checklistFile.name,
        mimeType: checklistFile.type || "application/octet-stream",
        sizeBytes: checklistFile.size,
        remarks: checklistRemarks || undefined,
      });

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
        toast.error(res.error || "Checklist upload failed.");
      }
    } catch (err: any) {
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
      const res = await actions.submitChecklistInternalDecisionAction(
        job.id,
        checklistWorkflow.id,
        decision,
        internalApprovalRemarks || undefined,
      );
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
      const res = await actions.sendChecklistCustomerMailAction(job.id, checklistWorkflow.id, {
        subject,
        body,
      });
      if (res.ok) {
        toast.success("Checklist mail queued for customer approval.");
        setCustomerMailSubject("");
        setCustomerMailBody("");
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
          setChecklistResponses(initialResponses);
          const fieldValuesForNode = Object.fromEntries(
            (instanceRes.data.fieldValues || [])
              .filter((entry: any) => entry.nodeId === activeRun.node.id)
              .map((entry: any) => [entry.fieldKey, entry.valueJson == null ? "" : String(entry.valueJson)]),
          );
          setFilingFieldValues(fieldValuesForNode);
          setShowBillNumberEntry(!!fieldValuesForNode.bill_number);
          const activeRunQueries = (instanceRes.data.queries || []).filter((query: any) => query.nodeRunId === activeRun.id);
          setBillFilingQueryDecision(
            activeRunQueries.some((query: any) => query.status !== "CLOSED")
              ? "QUERY"
              : activeRunQueries.some((query: any) => query.status === "CLOSED")
                ? "CLEARED"
                : "",
          );
          const toggleStatesForNode = Object.fromEntries(
            (instanceRes.data.toggleStates || [])
              .filter((entry: any) => entry.nodeId === activeRun.node.id)
              .map((entry: any) => [entry.sectionKey, !!entry.isEnabled]),
          );
          setFilingToggleStates(toggleStatesForNode);

          const edges = instanceRes.data.version?.edges || [];
          const outgoing = edges.filter((e: any) => e.sourceKey === activeRun.nodeKey);
          if (outgoing.length === 1) {
            setSelectedNextNodeKey(outgoing[0].targetKey);
          } else {
            setSelectedNextNodeKey("");
          }
        } else {
          setChecklistResponses({});
          setFilingFieldValues({});
          setFilingToggleStates({});
          setShowBillNumberEntry(false);
          setBillFilingQueryDecision("");
          setSelectedNextNodeKey("");
        }

        setNodeRemarks("");
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

    if (isBillFilingNode && !billFilingCanMoveNext) {
      toast.error("Choose Update Query or No Query / Query Completed before moving to the next filing step.");
      return;
    }

    // Validate that comments are entered if commentsRequired is true
    if (activeNodeRun.node.commentsRequired && !nodeRemarks.trim()) {
      toast.error(`Comments are mandatory to complete stage: ${activeNodeRun.node.name}.`);
      return;
    }

    // Validate all mandatory checklist items are checked if requireAllMandatoryChecklistItems is true.
    // Bill Filing nodes hide the checklist — items are auto-completed through
    // the upload + Fill Bill + query-decision actions instead.
    if (!isBillFilingNode && activeNodeRun.node.requireAllMandatoryChecklistItems) {
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

    // Validate mandatory photo uploads if requireMandatoryPhotos is true
    if (activeNodeRun.node.requireMandatoryPhotos) {
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
    }

    setLoading("filing-complete");
    try {
      if (isBillFilingNode && filingFieldValues.bill_number?.trim()) {
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
        if (isBillFilingNode) {
          return {
            checklistItemId: item.id,
            isChecked: true,
            remarks: val.remarks || "Completed through Bill Filing actions.",
            fileKey: val.fileKey || undefined,
            delayRemarks: val.delayRemarks || undefined,
          };
        }
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
        toggleStates: Object.entries(filingToggleStates).map(([sectionKey, isEnabled]) => ({ sectionKey, isEnabled })),
        nextNodeKey: selectedNextNodeKey || null,
      });

      if (res.ok) {
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
    if (!goBackReason.trim()) {
      toast.error("Enter a reason to move back to the previous filing stage.");
      return;
    }
    setLoading("filing-go-back");
    try {
      const res = await actions.revertFilingStageAction(job.id, activeNodeRun.id, goBackReason.trim());
      if (res.ok) {
        toast.success(`Moved back to ${res.data?.reopenedNodeName || "the previous stage"}.`);
        setGoBackOpen(false);
        setGoBackReason("");
        await loadFilingData();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to move back to the previous filing stage.");
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
        toast.success("Filing query saved.");
        setBillFilingQueryDecision("QUERY");
        setFilingToggleStates((current) => ({ ...current, customs_query: true }));
        setFilingFieldValues((current) => ({ ...current, query_notes: filingQueryDetails.trim() }));
        setFilingQueryTitle("");
        setFilingQueryDetails("");
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
    status: "REPLIED" | "CLOSED",
    details?: string,
  ) => {
    setLoading(`filing-query-${queryId}`);
    try {
      const res = await actions.updateFilingWorkflowQueryStatusAction(job.id, queryId, {
        status,
        details: details?.trim() || undefined,
      });
      if (res.ok) {
        toast.success(status === "CLOSED" ? "Query closed." : "Query marked as replied.");
        if (status === "CLOSED") {
          setBillFilingQueryDecision("CLEARED");
          setFilingToggleStates((current) => ({ ...current, customs_query: false }));
        } else {
          setBillFilingQueryDecision("QUERY");
        }
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

  const handleSaveFilingShipmentDetails = async () => {
    if (!filingShipmentType.trim()) {
      toast.error("Shipment type is required.");
      return;
    }
    if (isImportFiling && !billOfEntryNumber.trim() && shippingBillNumber.trim()) {
      toast.error("This job is import filing. Use only Bill of Entry Number.");
      return;
    }
    if (isExportFiling && !shippingBillNumber.trim() && billOfEntryNumber.trim()) {
      toast.error("This job is export filing. Use only Shipping Bill Number.");
      return;
    }
    if (!isImportFiling && !isExportFiling && billOfEntryNumber.trim() && shippingBillNumber.trim()) {
      toast.error("Bill of Entry Number and Shipping Bill Number cannot both be filled.");
      return;
    }

    setLoading("filing-shipment-save");
    try {
      const trimmedBillNumber = filingBillNumberValue.trim() || null;
      const res = await actions.upsertFilingShipmentDetailsAction(job.id, {
        filingShipmentType,
        billOfEntryNumber: isExportFiling ? null : isImportFiling ? trimmedBillNumber : billOfEntryNumber.trim() || null,
        shippingBillNumber: isImportFiling ? null : isExportFiling ? trimmedBillNumber : shippingBillNumber.trim() || null,
      });
      if (res.ok) {
        toast.success("Filing shipment details saved.");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to save filing shipment details.");
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
      {/* PERSISTENT HEADER WARNINGS */}
      {doValidityWarning && (
        <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 flex items-center justify-between gap-3 text-orange-600">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="shrink-0 text-orange-500" />
            <div>
              <span className="ds-label text-orange-500">Delivery Order Validity Alert</span>
              <p className="text-sm font-semibold text-on-surface">{doValidityWarning.message}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-orange-500/40 text-orange-600 hover:bg-orange-500/10 text-xs shrink-0 h-8"
            onClick={async () => {
              const res = await actions.acknowledgeDoValidityWarningAction(job.id);
              if (res.ok) {
                toast.success("Warning acknowledged.");
                router.refresh();
              } else {
                toast.error(res.error || "Failed to acknowledge warning.");
              }
            }}
          >
            Acknowledge
          </Button>
        </div>
      )}

      {section49ValidityWarning && (
        <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 flex items-center justify-between gap-3 text-orange-600">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="shrink-0 text-orange-500" />
            <div>
              <span className="ds-label text-orange-500">Section 49 Validity Alert</span>
              <p className="text-sm font-semibold text-on-surface">{section49ValidityWarning.message}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-orange-500/40 text-orange-600 hover:bg-orange-500/10 text-xs shrink-0 h-8"
            onClick={() => setActiveTab("docs")}
          >
            Open Documents
          </Button>
        </div>
      )}

      {/* Compact Job Header */}
      <section className="rounded-2xl border border-outline-variant/30 bg-surface shadow-sm">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-outline-variant bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary)]">
                {job.jobType.name}
              </span>
              {job.shipmentType ? (
                <span className="rounded-md border border-outline-variant bg-surface-container-low px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface">
                  {job.shipmentType.name}
                </span>
              ) : null}
              <span className="rounded-md bg-surface-container-low px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant ds-numeric">
                {job.branch.name}
              </span>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                job.status === "ACTIVE" ? "border-green-200 text-green-600" : "border-orange-200 text-orange-500"
              }`}>
                {job.status}
              </span>
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
                  className="ds-label text-[#00cec4] hover:underline"
                >
                  Change
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low px-3 py-2">
              <span className="ds-label block text-[9px] text-on-surface-variant">Stage</span>
              <span className="mt-0.5 block whitespace-nowrap text-xs uppercase tracking-wide text-on-surface">
                {job.stage.replace(/_/g, " ")}
              </span>
            </div>
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low px-3 py-2">
              <span className="ds-label block text-[9px] text-on-surface-variant">Progress</span>
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
                className="border-[#fb923c]/45 text-[#fb923c] hover:bg-[#fb923c]/10 shrink-0"
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
      <nav className="sticky top-0 z-20 -mx-1 overflow-x-auto border-y border-outline-variant/25 bg-surface/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="flex min-w-max items-center gap-1">
          {workspaceTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-all ${
                  isActive
                    ? "bg-[#00cec4]/10 text-[#00cec4] shadow-[inset_0_0_0_1px_rgba(0,206,196,0.35)]"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                {tab.label}
                {tab.count !== undefined ? <span className="ml-1 ds-numeric">({tab.count})</span> : null}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Panels */}
      <div className="min-h-[320px] rounded-2xl border border-outline-variant/30 bg-surface p-3 shadow-sm sm:p-4">
        
        {/* PANEL: DOCUMENTS */}
        {activeTab === "docs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div>
                <h3 className="ds-h3 text-on-surface">Required Customs Documents</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Upload required files or declare exceptions to pass the document gate. Workflow-uploaded files, Section 49, and Extension documents also appear here with source and validity tracking.
                </p>
              </div>
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

            <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
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
                    return (
                      <div key={categoryName} className="space-y-4">
                        <h3 className="ds-h3 border-b border-outline-variant/20 pb-2 text-on-surface">
                          {categoryName}
                        </h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {reqs.map((req: any) => {
                            const isUploaded = req.status === "UPLOADED";
                            const isExempted = req.status === "NOT_AVAILABLE";
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
                                className={`p-4 rounded-2xl border flex flex-col justify-between bg-[var(--color-surface)] ${
                                  isUploaded
                                    ? "card-left-accent border-outline-variant/30"
                                    : "card-left-accent-orange border-outline-variant/30"
                                }`}
                              >
                                <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-sm text-on-surface">{req.name}</span>
                                      <div className="flex items-center gap-1.5">
                                        {req.isMandatory && (
                                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-200">
                                          MANDATORY
                                        </span>
                                      )}
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                          isUploaded
                                            ? "bg-[#00cec4]/10 text-[#00cec4]"
                                            : isExempted
                                          ? "bg-orange-500/10 text-[#fb923c]"
                                          : "bg-surface-container-high text-on-surface-variant"
                                        }`}>
                                          {req.status.replace(/_/g, " ")}
                                        </span>
                                        {req.requirementItem?.requiresValidityDate || req.requirementItem?.defaultValidityDuration ? (
                                          <span className="text-[10px] font-bold uppercase rounded bg-[#fb923c]/10 px-1.5 py-0.5 text-[#fb923c]">
                                            Validity
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                  {req.requirementItem?.description && (
                                    <p className="text-xs text-on-surface-variant mt-1">{req.requirementItem.description}</p>
                                  )}

                                  {isSection49Requirement ? (
                                    <div className="mt-3 space-y-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
                                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-end">
                                        <label className="space-y-1.5">
                                          <span className="ds-label">Section 49 Validity Date</span>
                                          <input
                                            type="date"
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
                                          className="md:mb-0.5"
                                        >
                                          {loading === "section49-validity" ? "Saving..." : "Save Date"}
                                        </Button>
                                      </div>
                                      {validitySummary ? (
                                        <p
                                          className={`text-xs ${
                                            validitySummary.tone === "destructive"
                                              ? "text-red-500"
                                              : validitySummary.tone === "warning"
                                                ? "text-[#fb923c]"
                                                : "text-on-surface-variant"
                                          }`}
                                        >
                                          {validitySummary.detail}. Extension opens within 4 days of expiry.
                                        </p>
                                      ) : null}

                                      {section49WarningActive ? (
                                        <div className="space-y-2 border-t border-outline-variant/30 pt-3">
                                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                            <label className="space-y-1.5">
                                              <span className="ds-label">New Validity Date</span>
                                              <input
                                                type="date"
                                                value={section49ExtensionDate}
                                                onChange={(e) => setSection49ExtensionDate(e.target.value)}
                                                disabled={loading !== null || !canUpdateJob}
                                                className="w-full ds-numeric"
                                              />
                                            </label>
                                            <label className="space-y-1.5">
                                              <span className="ds-label">Extension Document</span>
                                              <input
                                                type="file"
                                                accept="application/pdf,image/*"
                                                onChange={(e) => setSection49ExtensionFile(e.target.files?.[0] ?? null)}
                                                disabled={loading !== null || !canUpdateJob}
                                                className="w-full text-xs"
                                              />
                                            </label>
                                          </div>
                                          <div className="flex justify-end">
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={handleApplySection49Extension}
                                              disabled={loading !== null || !canUpdateJob || !section49ExtensionDate || !section49ExtensionFile}
                                            >
                                              {loading === "section49-extension" ? "Applying..." : "Apply Extension"}
                                            </Button>
                                          </div>
                                        </div>
                                      ) : null}

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
                                          className="text-xs py-1 h-7"
                                          onClick={() => {
                                            setActiveDocReqId(null);
                                            setExceptionReason("");
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          className="text-xs py-1 h-7"
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
                                        className="text-xs text-red-500 border-red-200 hover:bg-red-50"
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

                                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00cec4] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-all hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)]">
                                      <Upload size={12} />
                                      {isUploaded ? "Re-upload" : isExempted ? "Upload File Anyway" : "Upload File"}
                                      <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => handleUploadDoc(req.id, e)}
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
              <div>
                <h3 className="ds-h3 text-on-surface">CHA Additional Data</h3>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Capture manifest and delivery-order validity details before checklist preparation.
                </p>
              </div>
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

            <div className="ds-form-section space-y-4">
              <h3 className="ds-h3 text-on-surface">Additional Data Fields</h3>
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4 md:grid-cols-2">
                <div>
                  <span className="ds-label">Clearance Type</span>
                  <p className="mt-1 text-sm font-medium text-on-surface">{job.jobType?.name || "Unknown"}</p>
                </div>
                <div>
                  <span className="ds-label">Required Manifest</span>
                  <p className="mt-1 text-sm font-medium text-on-surface">{manifestLabel}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="ds-label">Vessel Inward Date</span>
                  <input
                    type="date"
                    value={vesselInwardDate}
                    onChange={(e) => setVesselInwardDate(e.target.value)}
                    disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                    required
                    className="w-full"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="ds-label">Delivery Order Validity</span>
                  <input
                    id="deliveryOrderValidity"
                    type="date"
                    value={deliveryOrderValidity}
                    onChange={(e) => setDeliveryOrderValidity(e.target.value)}
                    disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                    required
                    className="w-full"
                  />
                </label>
                {requiresIgm ? (
                  <label className="space-y-1.5">
                    <span className="ds-label">IGM Number</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={importGeneralManifest}
                      onChange={(e) => setImportGeneralManifest(e.target.value)}
                      disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked || manifestConfigMissing}
                      required={manifestMandatory}
                      className="w-full ds-numeric"
                      placeholder={job.jobType?.manifestHelpText || "Enter IGM reference"}
                    />
                  </label>
                ) : null}
                {requiresEgm ? (
                  <label className="space-y-1.5">
                    <span className="ds-label">EGM Number</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={exportGeneralManifest}
                      onChange={(e) => setExportGeneralManifest(e.target.value)}
                      disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked || manifestConfigMissing}
                      required={manifestMandatory}
                      className="w-full ds-numeric"
                      placeholder={job.jobType?.manifestHelpText || "Enter EGM reference"}
                    />
                  </label>
                ) : null}
                {requiresCustomManifest ? (
                  <label className="space-y-1.5">
                    <span className="ds-label">{customManifestLabel}</span>
                    <input
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
            </div>

            {job.additionalData ? (
              <DoValidityPanel
                jobId={job.id}
                canUpdateJob={canUpdateJob}
                additionalData={{
                  deliveryOrderValidity: job.additionalData.deliveryOrderValidity ?? null,
                  doUploadEnabled: !!job.additionalData.doUploadEnabled,
                  doDocumentFileKey: job.additionalData.doDocumentFileKey ?? null,
                  doDocumentFileName: job.additionalData.doDocumentFileName ?? null,
                  doDocumentUploadedAt: job.additionalData.doDocumentUploadedAt ?? null,
                  doExtensionEnabled: !!job.additionalData.doExtensionEnabled,
                }}
                extensions={job.doExtensions ?? []}
              />
            ) : null}

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4 md:grid-cols-4">
              <div>
                <span className="ds-label">Status</span>
                <p className="mt-1 text-sm font-medium text-on-surface">{job.additionalData?.status ?? "PENDING"}</p>
              </div>
              <div>
                <span className="ds-label">Last Updated</span>
                <p className="mt-1 text-sm text-on-surface ds-numeric">
                  {job.additionalData?.updatedAt
                    ? new Date(job.additionalData.updatedAt).toLocaleDateString("en-IN")
                    : "Not saved"}
                </p>
              </div>
              <div>
                <span className="ds-label">{requiresCustomManifest ? customManifestLabel : "Manifest"}</span>
                <p className="mt-1 text-sm text-on-surface ds-numeric">
                  {requiresCustomManifest
                    ? customManifestValue || "Pending"
                    : requiresIgm && requiresEgm
                      ? `${importGeneralManifest || "IGM Pending"} / ${exportGeneralManifest || "EGM Pending"}`
                      : requiresIgm
                        ? importGeneralManifest || "Pending"
                        : requiresEgm
                          ? exportGeneralManifest || "Pending"
                          : "Not Required"}
                </p>
              </div>
              <div>
                <span className="ds-label">Direction</span>
                <p className="mt-1 text-sm text-on-surface">{manifestMovementDirection || "Not Configured"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-outline-variant/30 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={loading !== null || job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked || manifestConfigMissing}
                onClick={handleSaveAdditionalData}
                className="w-full sm:w-auto"
              >
                <Database className="mr-2 size-4" />
                {loading === "additional-data-save" ? "Saving..." : "Save Additional Data"}
              </Button>
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
            <h3 className="ds-h3 text-on-surface">Checklist Workflow</h3>

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
                          className="mt-2 text-xs font-semibold text-[#00cec4] hover:underline cursor-pointer uppercase tracking-wider"
                        >
                          Assign Manager Now →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <span className="ds-label">Current Checklist Status</span>
                          <div className="flex items-center gap-2">
                            <AlertCircle size={18} className="text-[#00cec4]" />
                            <p className="text-sm font-semibold text-on-surface">
                              {checklistWorkflow?.status?.replace(/_/g, " ") || "PENDING UPLOAD"}
                            </p>
                          </div>
                          <p className="text-xs text-on-surface-variant">
                            {checklistWorkflow?.customerRejectedOnce
                              ? "Customer has already rejected once. After rework, internal approval will move this directly to Filing."
                              : "Internal approval now completes when the job owner, assigned Manager, or TL approves, then routes to concerned job users for customer approval."}
                          </p>
                        </div>
                        {currentChecklistVersion ? (
                          <div className="space-y-1 text-right">
                            <span className="ds-label">Current Version</span>
                            <p className="text-sm font-semibold text-on-surface ds-numeric">V{currentChecklistVersion.versionNumber}</p>
                            <p className="text-xs text-on-surface-variant">
                              Uploaded by {getUserName(currentChecklistVersion.uploadedById)}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <form onSubmit={handleUploadChecklist} className="space-y-4 rounded-2xl border border-dashed border-outline-variant/60 bg-surface p-4">
                      <div className="flex items-start gap-3">
                        <FolderOpen size={22} className="mt-0.5 shrink-0 text-[#00cec4]" />
                        <div>
                          <h4 className="text-sm font-semibold text-on-surface">
                            {currentChecklistVersion ? "Upload Corrected / Replacement Checklist" : "Upload Checklist File"}
                          </h4>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Any file format is allowed here. The uploaded file will move into internal approval automatically.
                          </p>
                        </div>
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
                                className="mt-2 text-xs font-semibold text-[#00cec4] hover:underline cursor-pointer"
                              >
                                Go to Settings →
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <input
                        type="file"
                        disabled={internalApproversCount === 0}
                        onChange={(e) => setChecklistFile(e.target.files?.[0] || null)}
                        className="w-full text-xs disabled:opacity-50"
                      />
                      <textarea
                        rows={2}
                        value={checklistRemarks}
                        disabled={internalApproversCount === 0}
                        onChange={(e) => setChecklistRemarks(e.target.value)}
                        placeholder="Optional upload remarks"
                        className="w-full text-xs disabled:opacity-50"
                      />
                      <div className="flex justify-end">
                        <Button type="submit" disabled={loading === "checklist-upload" || internalApproversCount === 0} className="w-full sm:w-auto">
                          {loading === "checklist-upload" ? "Uploading..." : currentChecklistVersion ? "Reupload Checklist" : "Upload Checklist"}
                        </Button>
                      </div>
                    </form>

                    {currentChecklistVersion ? (
                      <div className="rounded-2xl border border-outline-variant/40 bg-surface p-4 space-y-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <span className="ds-label">Current File</span>
                            <p className="mt-1 text-sm font-semibold text-on-surface">{currentChecklistVersion.originalFileName}</p>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              {getUserName(currentChecklistVersion.uploadedById)} • {new Date(currentChecklistVersion.uploadedAt).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingVersion({
                                ...currentChecklistVersion,
                                type: 'checklist',
                                fileName: currentChecklistVersion.originalFileName,
                                sizeBytes: currentChecklistVersion.fileSize,
                                uploadedBy: { name: getUserName(currentChecklistVersion.uploadedById) },
                              })}
                            >
                              View
                            </Button>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-outline-variant/40">
                          <table className="ds-table">
                            <thead>
                              <tr>
                                <th>Version</th>
                                <th>File</th>
                                <th>Uploaded By</th>
                                <th>Uploaded At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {checklistWorkflow?.fileVersions?.map((version: any) => (
                                <tr key={version.id}>
                                  <td className="ds-numeric font-medium">V{version.versionNumber}</td>
                                  <td className="text-xs text-on-surface">{version.originalFileName}</td>
                                  <td className="text-xs text-on-surface">{getUserName(version.uploadedById)}</td>
                                  <td className="text-xs text-on-surface ds-numeric">
                                    {new Date(version.uploadedAt).toLocaleString("en-IN")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-outline-variant/40 bg-surface p-4 space-y-4">
                      <div>
                        <span className="ds-label">Internal Approval</span>
                        <p className="mt-1 text-sm text-on-surface">
                          {!checklistWorkflow
                            ? "Checklist upload will start the internal review process."
                            : approvedInternalDecision
                            ? `Approved by ${getUserName(approvedInternalDecision.actedById || approvedInternalDecision.assignedToId)} (${getInternalApproverRole(approvedInternalDecision)}) on ${approvedInternalDecision.actedAt ? new Date(approvedInternalDecision.actedAt).toLocaleString("en-IN") : "Pending"}`
                            : checklistWorkflow.currentApprovalStage === "INTERNAL"
                            ? "Pending: owner, Manager, or TL approval required."
                            : "Internal approval has not been completed for the current file version yet."}
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Eligible approvers: {eligibleInternalApproverLabels.join(", ") || "Owner, Manager, or TL"}
                        </p>
                        {checklistWorkflow?.currentApprovalStage === "INTERNAL" && !approvedInternalDecision ? (
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Pending approvers: {Array.from(new Set(currentInternalApprovals.filter((approval: any) => approval.action === "PENDING").map((approval: any) => `${getUserName(approval.assignedToId)} (${getInternalApproverRole(approval)})`))).join(", ") || "Owner, Manager, or TL"}
                          </p>
                        ) : null}
                      </div>
                      {canCurrentUserInternalApprove && checklistWorkflow?.currentApprovalStage === "INTERNAL" ? (
                        <>
                          <textarea
                            rows={2}
                            value={internalApprovalRemarks}
                            onChange={(e) => setInternalApprovalRemarks(e.target.value)}
                            placeholder="Required for rejection, optional for approval"
                            className="w-full text-xs"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="border-red-200 text-red-500 hover:bg-red-50"
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

                    <div className="rounded-2xl border border-outline-variant/40 bg-surface p-4 space-y-4">
                      <div>
                        <span className="ds-label">Customer Approval</span>
                        <p className="mt-1 text-sm text-on-surface">
                          {approvedCustomerDecision
                            ? `Approved by ${getUserName(approvedCustomerDecision.actedById || approvedCustomerDecision.assignedToId)} on behalf of concerned job users on ${approvedCustomerDecision.actedAt ? new Date(approvedCustomerDecision.actedAt).toLocaleString("en-IN") : "Pending"}`
                            : checklistWorkflow?.currentApprovalStage === "CUSTOMER" && !latestCustomerMailLog
                            ? "Internal approval is complete. Send the checklist mail to unlock customer approval."
                            : checklistWorkflow?.currentApprovalStage === "CUSTOMER" && latestCustomerMailLog && !customerApprovalDelayElapsed
                            ? `Checklist mail sent on ${new Date(latestCustomerMailLog.sentAt).toLocaleString("en-IN")}. Customer approval unlocks automatically in ${customerApprovalCountdown} at ${customerApprovalVisibleAt?.toLocaleString("en-IN")}.`
                            : checklistWorkflow?.currentApprovalStage === "CUSTOMER"
                            ? "Pending: concerned job user approval required."
                            : checklistWorkflow?.customerRejectedOnce
                            ? "Customer approval will not be requested again after rework."
                            : "Customer approval starts after the first successful internal approval."}
                        </p>
                        {latestCustomerMailLog ? (
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Mail recipients: {(latestCustomerMailLog.recipients || []).join(", ")}. Attachment: {latestCustomerMailLog.attachmentFileName || currentChecklistVersion?.originalFileName || "Checklist file"}.
                          </p>
                        ) : null}
                        {checklistWorkflow?.currentApprovalStage === "CUSTOMER" && !approvedCustomerDecision ? (
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Eligible approvers: any concerned user linked to this job, including the job owner.
                            {pendingCustomerApproverNames.length > 0 ? ` Current linked users: ${pendingCustomerApproverNames.join(", ")}` : ""}
                          </p>
                        ) : null}
                      </div>
                      {checklistWorkflow?.currentApprovalStage === "CUSTOMER" && !latestCustomerMailLog ? (
                        <div className="space-y-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
                          <input
                            value={customerMailSubject}
                            onChange={(e) => setCustomerMailSubject(e.target.value)}
                            placeholder={`Checklist Approval Required - ${job.jobNumber}`}
                            className="w-full text-sm"
                          />
                          <textarea
                            rows={4}
                            value={customerMailBody}
                            onChange={(e) => setCustomerMailBody(e.target.value)}
                            placeholder={`Please review the attached approved checklist for job ${job.jobNumber}.`}
                            className="w-full text-xs"
                          />
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-on-surface-variant">
                              The latest approved checklist file will be attached automatically and customer recipients will be fetched from the customer record.
                            </p>
                            <Button
                              type="button"
                              disabled={loading !== null}
                              onClick={handleSendChecklistCustomerMail}
                            >
                              {loading === "checklist-customer-mail" ? "Sending..." : "Send Customer Mail"}
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
                            className="w-full text-xs"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="border-red-200 text-red-500 hover:bg-red-50"
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

                    <div className="rounded-2xl border border-outline-variant/40 bg-surface p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="ds-label">Approval History</span>
                        <span className="text-[11px] text-on-surface-variant">
                          {checklistApprovals.length} entries
                        </span>
                      </div>
                      {checklistApprovals.length === 0 ? (
                        <p className="text-xs text-on-surface-variant">No approval history recorded yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {checklistApprovals
                            .slice()
                            .reverse()
                            .map((approval: any) => (
                              <div key={approval.id} className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-semibold text-on-surface">
                                    {approval.stage} • {approval.action}
                                  </p>
                                  <span className="text-[11px] text-on-surface-variant ds-numeric">
                                    {approval.actedAt ? new Date(approval.actedAt).toLocaleString("en-IN") : "Pending"}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-on-surface-variant">
                                  Assigned to {getUserName(approval.assignedToId)}{approval.actedById ? ` • acted by ${getUserName(approval.actedById)}` : ""}
                                </p>
                                {approval.remarks ? (
                                  <p className="mt-1 text-xs text-on-surface">{approval.remarks}</p>
                                ) : null}
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
            <div className="border-b border-outline-variant/30 pb-3">
              <h3 className="ds-h3 text-on-surface">Customs Submission Filing Details</h3>
            </div>

            {/* Display DO warnings and active flags inside the tab if any */}
            {doValidityWarning && (
              <div className="bg-surface border border-[#fb923c]/45 p-4 rounded-2xl flex items-start gap-3">
                <AlertTriangle size={20} className="text-[#fb923c] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs uppercase text-[#fb923c] tracking-wider">Delivery Order Validity Notice</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {doValidityWarning.message}
                  </p>
                </div>
              </div>
            )}

            {overdueChecklistCount > 0 && (
              <div className="card-left-accent-orange rounded-2xl border border-[#fb923c]/45 bg-surface p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#fb923c]" />
                  <div className="space-y-1">
                    <h4 className="ds-h3 text-[#fb923c]">OVERDUE FILING CHECKLIST ITEMS</h4>
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
              <div className="bg-surface border border-outline-variant p-4 rounded-2xl flex items-start gap-3">
                <AlertTriangle size={24} className="text-[#fb923c] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-[#fb923c] uppercase tracking-wider">Filing Stage Locked</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Clearance files can only be submitted to customs after the checklist is approved. Complete all prior checklist preparation and approvals.
                  </p>
                </div>
              </div>
            ) : (
              // Filing visual runner dashboard
              <div className="space-y-4">
                <div className="ds-form-section rounded-2xl border border-outline-variant/40 bg-surface p-4">
                  <h3 className="ds-h3 text-on-surface">SHIPMENT DETAILS</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="ds-label block">Shipment Type</label>
                      <input
                        value={filingShipmentType}
                        readOnly
                        className="w-full text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="ds-label block">{filingBillNumberLabel}</label>
                      <input
                        type="text"
                        value={filingBillNumberValue}
                        onChange={(e) => {
                          if (isExportFiling) {
                            setShippingBillNumber(e.target.value);
                            setBillOfEntryNumber("");
                            return;
                          }
                          setBillOfEntryNumber(e.target.value);
                          setShippingBillNumber("");
                        }}
                        placeholder={
                          isExportFiling
                            ? "Enter Shipping Bill Number"
                            : isImportFiling
                              ? "Enter Bill Of Entry Number"
                              : "Enter Bill Number"
                        }
                        className="w-full text-xs"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-on-surface-variant">
                      Shipment direction is taken from the configured clearance flow. Only the applicable bill number field is shown here.
                    </p>
                    <Button onClick={handleSaveFilingShipmentDetails} disabled={loading === "filing-shipment-save"} className="text-xs h-9">
                      {loading === "filing-shipment-save" ? "Saving..." : "Save Shipment Details"}
                    </Button>
                  </div>
                </div>

                {!filingInstance ? (
                  <div className="card-top-accent rounded-2xl bg-surface border border-outline-variant/30 p-4 space-y-4 shadow-sm">
                    <h4 className="ds-h3 text-on-surface">Filing Workflow</h4>
                    {loading === "filing-load" ? (
                      <p className="text-xs text-on-surface-variant">Loading filing workflow...</p>
                    ) : (
                      <>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          No active filing workflow instance found. Ensure a workflow is published in{" "}
                          <a href="/cha/settings/filing-workflows" className="text-[#00cec4] underline underline-offset-2">
                            CHA Settings → Filing Workflows
                          </a>
                          , then start the workflow below.
                        </p>
                        <Button
                          onClick={handleStartFilingWorkflow}
                          disabled={loading === "filing-start"}
                          className="text-xs h-9"
                        >
                          {loading === "filing-start" ? "Starting..." : "Start Filing Workflow"}
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    
                    {/* Left Column: Active Step details and form */}
                    <div className="space-y-4">
                      {activeNodeRun ? (
                        <div className="card-top-accent rounded-2xl bg-surface border border-outline-variant/30 p-4 space-y-4 shadow-sm">
                          
                          {/* Node Header */}
                          <div className="flex flex-col gap-2 border-b border-outline-variant/30 pb-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <span className="ds-label block text-on-surface-variant">Active Checking Stage</span>
                              <h3 className="ds-h3 text-[#00cec4]">{activeNodeDisplayName}</h3>
                              {(activeNodeRun.node.sectionName || activeNodeRun.node.branchName) && (
                                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">
                                  {[activeNodeRun.node.sectionName, activeNodeRun.node.branchName].filter(Boolean).join(" / ")}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {activeNodeRun.node.nodeType === "DECISION" ? (
                                  <span className="rounded-lg bg-[#00cec4]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#00cec4]">
                                    Decision
                                  </span>
                                ) : null}
                                {activeNodeRun.node.canBeSkipped ? (
                                  <span className="rounded-lg bg-[#fb923c]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#fb923c]">
                                    Optional / Skippable
                                  </span>
                                ) : null}
                              </div>
                              {activeNodeRun.node.description && (
                                <p className="text-xs text-on-surface-variant mt-1">{activeNodeRun.node.description}</p>
                              )}
                              {overdueChecklistCount > 0 && (
                                <p className="mt-2 text-xs font-semibold text-[#fb923c]">
                                  {overdueChecklistCount} overdue checklist item{overdueChecklistCount > 1 ? "s" : ""} in this active stage.
                                </p>
                              )}
                            </div>
                            {activeNodeRun.slaDueDate && (
                              <div className="text-left">
                                <span className="ds-label block text-on-surface-variant">SLA Due Date</span>
                                <span className={`text-xs font-semibold ds-numeric ${
                                  new Date(activeNodeRun.slaDueDate).getTime() < new Date().getTime()
                                    ? "text-red-500 font-bold"
                                    : "text-on-surface"
                                }`}>
                                  {new Date(activeNodeRun.slaDueDate).toLocaleDateString("en-IN")}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Node run completion form */}
                          <form onSubmit={handleCompleteFilingNode} className="space-y-4">
                            {isBillFilingNode ? (
                              <div className="space-y-3">
                                <h4 className="ds-label text-on-surface">Bill Filing Actions</h4>
                                <div className="rounded-xl border border-outline-variant/30 bg-surface p-3">
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <FileText size={16} className="shrink-0 text-[#00cec4]" />
                                        <span className="text-xs font-semibold text-on-surface">
                                          {billFilingDocumentAttachment?.fileName || "Bill document not uploaded"}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs text-on-surface-variant">
                                        {billFilingNumberEntered
                                          ? `${filingBillNumberLabel}: ${filingFieldValues.bill_number}`
                                          : `Fill ${filingBillNumberLabel} after uploading the bill document.`}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <input
                                        id={`bill-document-upload-${activeNodeRun.id}`}
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => handleUploadNodeDocument("bill_document", e)}
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById(`bill-document-upload-${activeNodeRun.id}`)?.click()}
                                        disabled={loading === "node-document-bill_document"}
                                        className="gap-2"
                                      >
                                        <Upload size={14} />
                                        {billFilingDocumentUploaded ? "Replace Document" : "Upload Document"}
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={() => setShowBillNumberEntry((current) => !current)}
                                      >
                                        {billFilingNumberEntered ? "Edit Bill" : "Fill Bill"}
                                      </Button>
                                    </div>
                                  </div>
                                  {showBillNumberEntry ? (
                                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-end">
                                      <label className="space-y-1.5">
                                        <span className="ds-label block text-on-surface-variant">
                                          {filingBillNumberLabel} *
                                        </span>
                                        <input
                                          value={filingFieldValues.bill_number || ""}
                                          onChange={(e) => setFilingFieldValues((prev) => ({ ...prev, bill_number: e.target.value }))}
                                          placeholder={`Enter ${filingBillNumberLabel}`}
                                          className="w-full text-sm"
                                        />
                                      </label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowBillNumberEntry(false)}
                                        disabled={!filingFieldValues.bill_number?.trim()}
                                      >
                                        Done
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}

                            {(activeNodeRun.node.fieldDefinitionsJson || []).filter((field: any) => !(isBillFilingNode && field.key === "bill_number")).length > 0 && (
                              <div className="space-y-3">
                                <h4 className="ds-label text-on-surface">Configured Fields</h4>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  {(activeNodeRun.node.fieldDefinitionsJson || []).filter((field: any) => !(isBillFilingNode && field.key === "bill_number")).map((field: any) => (
                                    <div key={field.key} className="space-y-1">
                                      <label className="ds-label block text-on-surface-variant">
                                        {field.key === "bill_number" ? filingBillNumberLabel : field.label} {field.required !== false ? "*" : ""}
                                      </label>
                                      <input
                                        value={filingFieldValues[field.key] || ""}
                                        onChange={(e) => setFilingFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                        placeholder={
                                          field.key === "bill_number"
                                            ? `Enter ${filingBillNumberLabel}`
                                            : field.placeholder || field.label
                                        }
                                        className="w-full text-sm"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(activeNodeRun.node.conditionalSectionsJson?.length > 0 || (activeNodeRun.node.documentRequirementsJson || []).filter((requirement: any) => !(isBillFilingNode && requirement.key === "bill_document")).length > 0) && (
                              <div className="space-y-3 border-t border-outline-variant/30 pt-4">
                                <h4 className="ds-label text-on-surface">Conditional Sections & Documents</h4>
                                <div className="space-y-3">
                                  {(activeNodeRun.node.conditionalSectionsJson || []).map((section: any) => (
                                    <div key={section.key} className="rounded-2xl border border-outline-variant/35 bg-surface-container-low/35 p-3 space-y-3">
                                      <label className="flex items-center gap-3 text-sm text-on-surface">
                                        <input
                                          type="checkbox"
                                          checked={!!filingToggleStates[section.key]}
                                          onChange={(e) => setFilingToggleStates((prev) => ({ ...prev, [section.key]: e.target.checked }))}
                                        />
                                        <span>{section.label}</span>
                                      </label>
                                      {filingToggleStates[section.key] && section.unlocksFields?.length > 0 && (
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                          {section.unlocksFields.map((field: any) => (
                                            <div key={field.key} className="space-y-1">
                                              <label className="ds-label block text-on-surface-variant">
                                                {field.label} {field.required !== false ? "*" : ""}
                                              </label>
                                              <input
                                                value={filingFieldValues[field.key] || ""}
                                                onChange={(e) => setFilingFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                placeholder={field.placeholder || field.label}
                                                className="w-full text-sm"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {filingToggleStates[section.key] && section.unlocksDocuments?.length > 0 && (
                                        <div className="space-y-2">
                                          {section.unlocksDocuments.map((requirement: any) => (
                                            <div key={requirement.key} className="rounded-xl border border-outline-variant/30 bg-surface p-3">
                                              <div className="flex items-center justify-between gap-3">
                                                <div>
                                                  <div className="text-xs font-semibold text-on-surface">
                                                    {requirement.label} {requirement.required !== false ? "*" : ""}
                                                  </div>
                                                </div>
                                                <label className="cursor-pointer text-xs font-semibold text-[#00cec4]">
                                                  Upload
                                                  <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => handleUploadNodeDocument(requirement.key, e)}
                                                  />
                                                </label>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {(activeNodeRun.node.documentRequirementsJson || []).filter((requirement: any) => !(isBillFilingNode && requirement.key === "bill_document")).map((requirement: any) => (
                                    <div key={requirement.key} className="rounded-xl border border-outline-variant/30 bg-surface p-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="text-xs font-semibold text-on-surface">
                                          {requirement.label} {requirement.required !== false ? "*" : ""}
                                        </div>
                                        <label className="cursor-pointer text-xs font-semibold text-[#00cec4]">
                                          Upload
                                          <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => handleUploadNodeDocument(requirement.key, e)}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {billFilingCanChooseQuery && !customsQueryTabOpen && billFilingQueryDecision !== "CLEARED" ? (
                              <div className="space-y-3 border-t border-outline-variant/30 pt-4">
                                <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low/35 p-4">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <h4 className="ds-label text-on-surface">Query Decision</h4>
                                      <p className="mt-1 text-xs text-on-surface-variant">
                                        Choose whether the bill is under customs query or ready to move to the next filing step.
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          setBillFilingQueryDecision("QUERY");
                                          setFilingToggleStates((current) => ({ ...current, customs_query: true }));
                                        }}
                                      >
                                        Update Query
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={() => {
                                          setBillFilingQueryDecision("CLEARED");
                                          setFilingToggleStates((current) => ({ ...current, customs_query: false }));
                                        }}
                                      >
                                        No Query / Query Completed
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {isBillFilingNode && showBillNumberEntry && !billFilingDocumentUploaded ? (
                              <div className="space-y-3 border-t border-outline-variant/30 pt-4">
                                <div className="rounded-2xl border border-[#fb923c]/35 bg-[#fb923c]/10 p-4 text-xs text-on-surface">
                                  Upload the bill document to continue with query status or move to the next step.
                                </div>
                              </div>
                            ) : null}

                            {isBillFilingNode && showBillNumberEntry && billFilingDocumentUploaded && !billFilingNumberEntered ? (
                              <div className="space-y-3 border-t border-outline-variant/30 pt-4">
                                <div className="rounded-2xl border border-[#fb923c]/35 bg-[#fb923c]/10 p-4 text-xs text-on-surface">
                                  Enter the bill number to continue with query status or move to the next step.
                                </div>
                              </div>
                            ) : null}

                            {isBillFilingNode && billFilingQueryDecision === "CLEARED" ? (
                              <div className="space-y-3 border-t border-outline-variant/30 pt-4">
                                <div className="rounded-2xl border border-[#00cec4]/25 bg-[#00cec4]/10 p-4 text-xs text-on-surface">
                                  Bill query status is clear. Choose the next filing step below.
                                </div>
                              </div>
                            ) : null}

                            {customsQueryTabOpen && (
                              <div className="space-y-3 border-t border-outline-variant/30 pt-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <h4 className="ds-label text-on-surface">Customs Query</h4>
                                    <p className="mt-1 text-xs text-on-surface-variant">
                                      Daily status reminders are scheduled for 10:30 AM until the query is marked replied or closed.
                                    </p>
                                  </div>
                                  {filingToggleStates["customs_query"] ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        setBillFilingQueryDecision("");
                                        setFilingToggleStates((current) => ({ ...current, customs_query: false }));
                                      }}
                                      disabled={activeNodeOpenQueries.length > 0}
                                    >
                                      Change Decision
                                    </Button>
                                  ) : null}
                                </div>
                                <input
                                  value={filingQueryTitle}
                                  onChange={(e) => setFilingQueryTitle(e.target.value)}
                                  placeholder="Query title"
                                  className="w-full text-sm"
                                />
                                <textarea
                                  rows={3}
                                  value={filingQueryDetails}
                                  onChange={(e) => {
                                    setFilingQueryDetails(e.target.value);
                                    setFilingFieldValues((current) => ({ ...current, query_notes: e.target.value }));
                                  }}
                                  placeholder="Record customs query details, reply notes, or follow-up context..."
                                  className="w-full text-xs"
                                />
                                <div className="flex justify-end">
                                  <Button type="button" onClick={handleCreateFilingQuery} disabled={loading !== null}>
                                    {loading === "filing-query-create" ? "Saving..." : "Save Query"}
                                  </Button>
                                </div>
                                {activeNodeQueries.map((query: any) => (
                                    <div key={query.id} className="rounded-xl border border-outline-variant/35 bg-surface-container-low/35 p-3 text-xs">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <div className="font-semibold text-on-surface">{query.title}</div>
                                            <span className="rounded-md bg-[#00cec4]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#00cec4]">
                                              {query.status}
                                            </span>
                                          </div>
                                          <div className="mt-1 text-on-surface-variant">{query.details}</div>
                                        </div>
                                      </div>
                                      {query.status !== "CLOSED" ? (
                                        <div className="mt-3 space-y-2 border-t border-outline-variant/30 pt-3">
                                          <label className="ds-label block text-on-surface-variant">Status Update</label>
                                          <textarea
                                            rows={2}
                                            value={filingQueryStatusUpdates[query.id] ?? ""}
                                            onChange={(e) =>
                                              setFilingQueryStatusUpdates((current) => ({
                                                ...current,
                                                [query.id]: e.target.value,
                                              }))
                                            }
                                            placeholder="Enter today&apos;s query status or reply update..."
                                            className="w-full text-xs"
                                          />
                                          <div className="flex flex-wrap justify-end gap-2">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                handleUpdateFilingQueryStatus(
                                                  query.id,
                                                  "REPLIED",
                                                  filingQueryStatusUpdates[query.id] || query.details,
                                                )
                                              }
                                            >
                                              Save Status Update
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                handleUpdateFilingQueryStatus(
                                                  query.id,
                                                  "CLOSED",
                                                  filingQueryStatusUpdates[query.id] || query.details,
                                                )
                                              }
                                            >
                                              Query Is Replied
                                            </Button>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                              </div>
                            )}
                            
                            {/* Checklist Items */}
                            {!isBillFilingNode && activeNodeRun.node.checklistItems?.length > 0 && (
                              <div className="space-y-3">
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
                                        className={`p-3.5 rounded-2xl border space-y-3 ${
                                          isLockedItem
                                            ? "border-outline-variant/25 bg-surface-container-low/20 opacity-70"
                                            : overdueMeta
                                            ? "border-[#fb923c]/45 bg-[#fb923c]/10"
                                            : "border-outline-variant/35 bg-surface-container-low/40"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-start gap-3">
                                            <input
                                              type="checkbox"
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
                                              className="mt-1 rounded border-outline-variant/60 text-[#00cec4] focus:ring-[#00cec4]/30"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <label htmlFor={`check-${item.id}`} className="text-xs font-semibold text-on-surface block cursor-pointer">
                                                {item.label} {item.isMandatory && <span className="text-red-500 font-bold">*</span>}
                                              </label>
                                              {item.description && (
                                                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">{item.description}</p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="shrink-0 text-right">
                                            <div className="ds-label text-on-surface-variant">Item {index + 1} of {activeChecklistItems.length}</div>
                                            <div className="mt-1 text-[11px] text-on-surface-variant">
                                              {item.deadlineDuration || 2} {item.deadlineUnit === "HOURS" ? "HR" : item.deadlineUnit === "DAYS" ? "DAY" : "BD"}
                                            </div>
                                          </div>
                                        </div>

                                        {isLockedItem && (
                                          <div className="rounded-2xl border border-outline-variant/25 bg-surface px-3 py-2 text-[11px] text-on-surface-variant">
                                            Complete the current checklist item first to unlock this step.
                                          </div>
                                        )}

                                        {!isLockedItem && !isCurrentItem && isCompletedItem && (
                                          <div className="rounded-2xl border border-outline-variant/25 bg-surface px-3 py-2 text-[11px] text-on-surface-variant">
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

                                        {/* Optional or required remarks */}
                                        {!isLockedItem && resp.isChecked && item.requiresRemarks && (
                                          <div className="pl-6 space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-on-surface-variant block ds-label">Remarks / Notes *</label>
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

                                        {/* Optional or required uploads */}
                                        {!isLockedItem && resp.isChecked && item.allowsUpload && (
                                          <div className="pl-6 space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <label className="text-[10px] uppercase font-bold text-on-surface-variant block ds-label">Supporting File / Photo</label>
                                              <span className="text-[11px] text-on-surface-variant ds-numeric">
                                                Uploaded {checklistItemAttachments.length} / Minimum {item.minUploads || 0}
                                              </span>
                                            </div>
                                            <label
                                              htmlFor={`checklist-item-upload-${item.id}`}
                                              className="flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-outline-variant/50 bg-surface px-4 py-4 text-sm text-on-surface transition hover:border-[#00cec4]/60 hover:bg-surface-container-low/40"
                                            >
                                              <span className="ds-icon-badge shrink-0">
                                                <Upload size={18} />
                                              </span>
                                              <span className="min-w-0">
                                                <span className="block font-medium text-on-surface">Upload supporting files for this checklist item</span>
                                                <span className="mt-1 block text-xs text-on-surface-variant">
                                                  Add images or documents here. This upload counts toward this checklist item directly.
                                                </span>
                                              </span>
                                            </label>
                                              <input
                                                id={`checklist-item-upload-${item.id}`}
                                                type="file"
                                                onChange={(e) => handleUploadChecklistItemFile(item.id, e)}
                                                disabled={loading === `checklist-item-file-${item.id}`}
                                                className="hidden"
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
                                                      className="h-7 text-[10px]"
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

                            {/* Node Photo / File Upload Requirements */}
                            {activeNodeRun.node.photoRequirements?.length > 0 && (
                              <div className="space-y-4 border-t border-outline-variant/30 pt-4">
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
                                            <label
                                              htmlFor={`photo-requirement-upload-${pr.id}`}
                                              className="flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-low/35 px-4 py-4 text-sm text-on-surface transition hover:border-[#00cec4]/60 hover:bg-surface-container-low/55"
                                            >
                                              <span className="ds-icon-badge shrink-0">
                                                <Upload size={18} />
                                              </span>
                                              <span className="min-w-0">
                                                <span className="block font-medium text-on-surface">Upload required image or document</span>
                                                <span className="mt-1 block text-xs text-on-surface-variant">
                                                  This upload is counted against the requirement above, not the checklist item upload count.
                                                </span>
                                              </span>
                                            </label>
                                            <input
                                              id={`photo-requirement-upload-${pr.id}`}
                                              type="file"
                                              disabled={loading === `filing-photo-${pr.id}`}
                                              onChange={(e) => handleUploadFilingPhoto(pr.id, e)}
                                              className="hidden"
                                            />
                                          </>
                                        )}

                                        {/* Uploaded Attachments list */}
                                        {reqAttachments.length > 0 && (
                                          <div className="overflow-hidden rounded-2xl border border-outline-variant/30">
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
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1 h-7"
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

                            {/* Allowed Roles Notice */}
                            {activeNodeRun.node.allowedRoles?.length > 0 && (
                              <div className="border-t border-outline-variant/30 pt-3 text-[11px] text-on-surface-variant flex items-center gap-1">
                                <ShieldCheck size={14} className="text-[#00cec4]" />
                                <span>Can only be processed by users with roles: <strong>{activeNodeRun.node.allowedRoles.join(", ")}</strong></span>
                              </div>
                            )}

                            {/* Node run comments */}
                            <div className="space-y-1.5 border-t border-outline-variant/30 pt-4">
                              <label className="ds-label text-on-surface block">
                                Completion Comments / Remarks {activeNodeRun.node.commentsRequired && <span className="text-red-500 font-bold">*</span>}
                              </label>
                              <textarea
                                rows={3}
                                value={nodeRemarks}
                                onChange={(e) => setNodeRemarks(e.target.value)}
                                placeholder="Provide checklist execution remarks or check outcome..."
                                className="w-full text-xs font-sans"
                                required={activeNodeRun.node.commentsRequired}
                              />
                            </div>

                            {/* Transitions dropdown */}
                            <div className="border-t border-outline-variant/30 pt-4">
                              {isBillFilingNode && !billFilingReadyForRouting ? (
                                <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low/35 p-3 text-xs text-on-surface-variant">
                                  Complete Bill Filing by uploading the bill document and entering the bill number.
                                </div>
                              ) : isBillFilingNode && !billFilingCanMoveNext ? (
                                <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low/35 p-3 text-xs text-on-surface-variant">
                                  Select Update Query or No Query / Query Completed before moving to the next filing step.
                                </div>
                              ) : outgoingEdges.length > 0 ? (
                                activeNodeRun.node.nodeType === "DECISION" ? (
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
                                            className={`rounded-2xl border px-4 py-3 text-left transition ${
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
                                ) : (
                                  <div className="space-y-1.5 max-w-sm">
                                    <label className="ds-label text-on-surface block">Select Next Workflow Stage *</label>
                                    <select
                                      value={selectedNextNodeKey}
                                      onChange={(e) => setSelectedNextNodeKey(e.target.value)}
                                      required
                                      className="w-full text-xs"
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
                                <div className="rounded-2xl bg-[#00cec4]/10 border border-[#00cec4]/20 p-3 text-xs text-on-surface-variant">
                                  Completing this node will finalize the Filing workflow and transition the job stage to <strong>FILED</strong>.
                                </div>
                              )}
                            </div>

                            {/* Complete Action Button */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/30 pt-4">
                              {hasPreviousFilingStage ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={loading !== null}
                                  onClick={() => setGoBackOpen(true)}
                                  className="gap-2 text-xs"
                                >
                                  <Undo2 size={14} />
                                  Move Back to Previous Stage
                                </Button>
                              ) : (
                                <span />
                              )}
                              <Button
                                type="submit"
                                disabled={loading !== null}
                                className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-5 py-2.5 rounded-2xl text-sm uppercase tracking-wide transition-all font-semibold"
                              >
                                {loading === "filing-complete" ? "Completing Stage..." : outgoingEdges.length > 0 ? "Complete & Move to Next Stage" : "Complete & File Customs Bill"}
                              </Button>
                            </div>
                          </form>

                          <Modal
                            open={goBackOpen}
                            title="Move Back to Previous Stage"
                            description="The current stage will be cancelled and the previous filing stage reopened. This move is recorded in the audit tab."
                            onClose={() => setGoBackOpen(false)}
                            className="max-w-lg"
                          >
                            <div className="space-y-4">
                              <label className="block space-y-1.5">
                                <span className="ds-label">Reason for going back *</span>
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
                                  disabled={loading === "filing-go-back" || !goBackReason.trim()}
                                  onClick={() => void handleGoBackStage()}
                                >
                                  <Undo2 size={13} />
                                  {loading === "filing-go-back" ? "Moving Back..." : "Confirm & Move Back"}
                                </Button>
                              </div>
                            </div>
                          </Modal>
                        </div>
                      ) : (
                        // No active runs but filing instance exists (Filing completed)
                        <div className="rounded-2xl border border-green-200 bg-green-50/5 p-4 space-y-4 shadow-sm">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle2 size={24} className="shrink-0" />
                            <h4 className="font-bold text-base uppercase tracking-wide">Customs Filing Workflow Complete</h4>
                          </div>
                          <p className="text-xs text-on-surface-variant max-w-xl">
                            All blueprint checklist checks have been completed and the customs submission has been filed. The job stage is updated to <strong>FILED</strong>.
                          </p>
                          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 text-xs max-w-md">
                            <div>
                              <span className="ds-label block text-on-surface-variant">Actual Filing Date</span>
                              <span className="font-medium text-on-surface ds-numeric font-mono">
                                {job.filing.actualFilingDate ? new Date(job.filing.actualFilingDate).toLocaleDateString("en-IN") : "Completed"}
                              </span>
                            </div>
                            <div>
                              <span className="ds-label block text-on-surface-variant">Filing Reference ID</span>
                              <span className="font-medium text-on-surface ds-numeric font-mono">{job.filing.filingRef || "Completed"}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Timeline / History log */}
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-outline-variant/40 bg-surface p-4 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                          <h4 className="ds-label block text-on-surface">Execution Blueprint Timeline</h4>
                          <span className="text-[10px] text-on-surface-variant font-medium ds-numeric font-mono">
                            {filingInstance.nodeRuns?.length || 0} run(s)
                          </span>
                        </div>

                        {filingInstance.nodeRuns?.length === 0 ? (
                          <p className="text-xs text-on-surface-variant italic">No workflow checks executed yet.</p>
                        ) : (
                          <div className="relative pl-5 space-y-4 before:absolute before:left-[8px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/40">
                            {filingInstance.nodeRuns.map((run: any) => {
                              const isCurrent = run.status === "ACTIVE";
                              return (
                                <div key={run.id} className="relative space-y-1 text-xs">
                                  <span className={`absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-surface ${
                                    isCurrent ? "bg-[#00cec4] animate-pulse" : "bg-outline-variant"
                                  }`} />
                                  <div className="flex flex-wrap items-center justify-between gap-1">
                                    <span className={`font-semibold ${isCurrent ? "text-[#00cec4]" : "text-on-surface"}`}>
                                      {run.node?.name || run.nodeKey}
                                    </span>
                                    <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-md ${
                                      isCurrent ? "bg-[#00cec4]/10 text-[#00cec4]" : "bg-surface-container-high text-on-surface-variant"
                                    }`}>
                                      {run.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-on-surface-variant ds-numeric font-mono">
                                    Started: {new Date(run.startedAt).toLocaleString("en-IN")}
                                    {run.completedAt && ` • Finished: ${new Date(run.completedAt).toLocaleString("en-IN")}`}
                                  </p>
                                  {(run.node?.sectionName || run.node?.branchName) && (
                                    <p className="text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
                                      {[run.node?.sectionName, run.node?.branchName].filter(Boolean).join(" / ")}
                                    </p>
                                  )}
                                  {run.completedBy && (
                                    <p className="text-[10px] text-on-surface-variant">
                                      Completed by: <strong className="text-on-surface">{run.completedBy.name}</strong>
                                    </p>
                                  )}
                                  {run.remarks && (
                                    <p className="text-on-surface-variant bg-surface-container-low p-2 rounded-lg mt-1 font-sans text-xs italic">
                                      "{run.remarks}"
                                    </p>
                                  )}
                                  
                                  {/* Attachments for this run */}
                                  {run.attachments?.length > 0 && (
                                    <div className="mt-1.5 space-y-1 pl-1">
                                      <span className="text-[9px] uppercase tracking-wide font-bold text-on-surface-variant block ds-label">Attachments</span>
                                      <div className="space-y-1">
                                        {run.attachments.map((att: any) => (
                                          <a
                                            key={att.id}
                                            href={att.fileKey}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[#00cec4] hover:underline flex items-center gap-1 text-[11px] font-medium"
                                          >
                                            <ExternalLink size={10} className="shrink-0" />
                                            <span className="truncate max-w-[150px]">{att.fileName}</span>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

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
                    <label className="text-[10px] uppercase font-bold tracking-wide block">Expected Advance Amount (₹) *</label>
                    <input
                      type="number"
                      value={expectedAdvance}
                      onChange={(e) => setExpectedAdvance(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-mono ds-numeric"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wide block">Advance Due Date</label>
                    <input
                      type="date"
                      value={advanceDueDate}
                      onChange={(e) => setAdvanceDueDate(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wide block">Assigned Collections Agent</label>
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
                      <Button variant="outline" size="sm" onClick={() => setShowWaiveAdvance(false)} className="text-xs h-8">
                        Cancel
                      </Button>
                      <Button onClick={handleWaiveAdvance} disabled={loading !== null} className="text-xs h-8 bg-red-500 hover:bg-red-600">
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
                        <label className="text-[10px] uppercase font-bold tracking-wide block">Amount Paid (₹) *</label>
                        <input
                          type="number"
                          required
                          value={receiptAmount}
                          onChange={(e) => setReceiptAmount(e.target.value)}
                          className="w-full text-xs font-mono ds-numeric"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wide block">Date Received *</label>
                        <input
                          type="date"
                          required
                          value={receiptDate}
                          onChange={(e) => setReceiptDate(e.target.value)}
                          className="w-full text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wide block">Payment Method *</label>
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
                        <label className="text-[10px] uppercase font-bold tracking-wide block">Txn Reference Ref</label>
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
                      <label className="text-[10px] uppercase font-bold tracking-wide block">Remarks</label>
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
            <div className="border border-outline-variant p-4 rounded-2xl space-y-4 bg-surface-container-low/20">
              <h3 className="ds-h3 text-on-surface">New Clearance Expense Request</h3>

              <form onSubmit={handleCreateExpenseRequest} className="space-y-4">
                {/* Urgent switch */}
                <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between p-4 border border-outline-variant/60 rounded-2xl bg-surface">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expenseUrgent}
                      onChange={(e) => setExpenseUrgent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
                    />
                    <div>
                      <span className="text-sm font-semibold text-on-surface block">Escalate to URGENT Payment</span>
                      <span className="text-xs text-on-surface-variant">
                        Request accounts to disburse payment immediately to resolve critical port blocks.
                      </span>
                    </div>
                  </label>

                  {expenseUrgent && (
                    <div className="flex-1 max-w-md space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wide block text-[#fb923c]">
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
                      className="h-7 px-2 text-xs flex items-center gap-1 border-[#00cec4] text-[#00cec4]"
                    >
                      <Plus size={12} /> Add Line Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {expenseLines.map((line, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end border-b border-outline-variant/20 pb-3 md:pb-0 md:border-b-0">
                        {/* category */}
                        <div className="space-y-1 md:col-span-1">
                          <label className="text-[9px] uppercase font-bold tracking-wide text-on-surface-variant">Category</label>
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
                          <label className="text-[9px] uppercase font-bold tracking-wide text-on-surface-variant">Purpose / Purpose *</label>
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
                          <label className="text-[9px] uppercase font-bold tracking-wide text-on-surface-variant">Amount (₹) *</label>
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
                          <label className="text-[9px] uppercase font-bold tracking-wide text-on-surface-variant">Required Date</label>
                          <input
                            type="date"
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
                            <span className="text-lg font-bold text-[#00cec4] block mt-1 ds-numeric">
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
                                className="h-7 text-[10px]"
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
                              // Allow accounts / payees to resolve
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
                                    <Button size="sm" variant="outline" onClick={() => setResolveQueryId(null)} className="h-7 text-xs">
                                      Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleResolveQuery} disabled={loading !== null} className="h-7 text-xs">
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
                              <Button variant="outline" size="sm" onClick={() => setEscRequestId(null)} className="text-xs h-8">
                                Cancel
                              </Button>
                              <Button onClick={handleEscalateExpense} disabled={loading !== null} className="text-xs h-8">
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
                              <Button variant="outline" size="sm" onClick={() => setExpReviewId(null)} className="text-xs h-8">
                                Cancel
                              </Button>
                              <Button onClick={handleExpenseReview} disabled={loading !== null} className="text-xs h-8">
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
                                <label className="text-[9px] uppercase font-bold tracking-wide block">Amount Disbursed (₹) *</label>
                                <input
                                  type="number"
                                  required
                                  value={payAmount}
                                  onChange={(e) => setPayAmount(e.target.value)}
                                  className="w-full text-xs font-mono ds-numeric h-8"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold tracking-wide block">Date Paid *</label>
                                <input
                                  type="date"
                                  required
                                  value={payDate}
                                  onChange={(e) => setPayDate(e.target.value)}
                                  className="w-full text-xs h-8"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold tracking-wide block">Payment Method *</label>
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
                                <label className="text-[9px] uppercase font-bold tracking-wide block">Txn Reference ID *</label>
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
                              <Button variant="outline" size="sm" onClick={() => setPayRequestId(null)} className="text-xs h-8">
                                Cancel
                              </Button>
                              <Button type="submit" disabled={loading !== null} className="text-xs h-8">
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
                              <Button variant="outline" size="sm" onClick={() => setQueryRequestId(null)} className="text-xs h-8">
                                Cancel
                              </Button>
                              <Button onClick={handleRaiseQuery} disabled={loading !== null} className="text-xs h-8">
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
                              className="text-on-surface-variant hover:text-on-surface font-semibold"
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
                                className="text-[#00cec4] hover:underline font-bold"
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
              variant="destructive"
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
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 text-xs text-on-surface-variant">
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

              <label className="space-y-1.5">
                <span className="ds-label">File Upload</span>
                <input
                  type="file"
                  onChange={(e) => setCustomDocumentFile(e.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm text-on-surface"
                />
              </label>

              {customDocumentFile ? (
                <div className="rounded-2xl border border-outline-variant/30 bg-surface p-3 text-xs text-on-surface-variant">
                  Selected file: <strong className="text-on-surface">{customDocumentFile.name}</strong>
                </div>
              ) : null}
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
                    <div className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 text-left text-xs space-y-2 w-full max-w-md">
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
                className="w-full text-xs font-sans"
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
