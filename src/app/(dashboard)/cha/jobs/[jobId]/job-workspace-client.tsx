"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  History,
  TrendingUp,
  CreditCard,
  DollarSign,
  FileCode,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  X,
  MessageSquare,
  Database,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import * as actions from "@/modules/cha/actions";

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

export function JobWorkspaceClient({
  job,
  users,
  expenseCategories,
  selfApprovalAllowed,
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

  // Manager Assignment State
  const [isEditingManager, setIsEditingManager] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState(job.assignedManagerId || "");

  useEffect(() => {
    setSelectedManagerId(job.assignedManagerId || "");
  }, [job.assignedManagerId]);

  const filteredManagers = useMemo(() => {
    if (!managers) return [];
    const branchManagers = managers.filter((m: any) => m.branchId === job.branchId);
    return branchManagers.length > 0 ? branchManagers : managers;
  }, [managers, job.branchId]);

  // Document Collection Form State
  const [exceptionReason, setExceptionReason] = useState("");
  const [activeDocReqId, setActiveDocReqId] = useState<string | null>(null);
  
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
  const [deliveryOrderValidity, setDeliveryOrderValidity] = useState(
    job.additionalData?.deliveryOrderValidity ? job.additionalData.deliveryOrderValidity.slice(0, 10) : ""
  );

  // Checklist Workflow State
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [checklistRemarks, setChecklistRemarks] = useState("");
  const [internalApprovalRemarks, setInternalApprovalRemarks] = useState("");
  const [customerApprovalRemarks, setCustomerApprovalRemarks] = useState("");
  const [ownerApprovalRemarks, setOwnerApprovalRemarks] = useState("");

  // Filing Form State
  const [newEstFilingDate, setNewEstFilingDate] = useState("");
  const [filingRef, setFilingRef] = useState("");
  const [actualFilingDate, setActualFilingDate] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [filedBillCopyFile, setFiledBillCopyFile] = useState<File | null>(null);

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
  const additionalDataComplete = Boolean(
    vesselInwardDate &&
    deliveryOrderValidity &&
    importGeneralManifest !== "" &&
    exportGeneralManifest !== ""
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
  const recentMilestones = job.auditLogs?.slice(0, 4) ?? [];
  const checklistWorkflow = job.checklistWorkflow ?? null;
  const currentChecklistVersion = checklistWorkflow?.currentFileVersion ?? checklistWorkflow?.fileVersions?.[0] ?? null;
  const checklistApprovals = checklistWorkflow?.approvals ?? [];
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
  const canCurrentUserInternalApprove =
    canInternalApproveChecklist ||
    currentInternalApprovals.some((approval: any) => approval.assignedToId === currentUserId && approval.action === "PENDING");
  const canCurrentUserCustomerApprove =
    canCustomerApproveChecklist ||
    currentCustomerApprovals.some((approval: any) => approval.assignedToId === currentUserId && approval.action === "PENDING");
  const currentOwnerApprovals = checklistApprovals.filter(
    (approval: any) =>
      approval.fileVersionId === currentChecklistVersion?.id &&
      approval.stage === "JOB_OWNER",
  );
  const canCurrentUserOwnerApprove =
    job.primaryOwnerId === currentUserId ||
    currentOwnerApprovals.some((approval: any) => approval.assignedToId === currentUserId && approval.action === "PENDING");
  const getUserName = (userId?: string | null) =>
    users.find((user) => user.id === userId)?.name || "Unknown";

  // Document version upload handler
  const handleUploadDoc = async (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(`doc-${reqId}`);
    try {
      const localUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);
      const res = await actions.uploadDocumentVersionAction(job.id, reqId, formData);

      if (res.ok) {
        const versionId = res.data?.id;
        if (versionId) {
          setPreviewUrls((prev) => ({ ...prev, [versionId]: localUrl }));
        }
        toast.success(`Uploaded ${file.name} successfully.`);
        router.refresh();
      } else {
        toast.error(res.error || "Upload failed.");
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
        toast.success("Document requirement exempted.");
        setExceptionReason("");
        setActiveDocReqId(null);
        router.refresh();
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
        toast.success("Document requirement marked as N/A.");
        setExceptionReason("");
        setActiveDocReqId(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to mark requirement as N/A.");
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
        toast.success("Exemption removed. Requirement is active again.");
        router.refresh();
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
        router.refresh();
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
    if (!vesselInwardDate || !deliveryOrderValidity || importGeneralManifest === "" || exportGeneralManifest === "") {
      toast.error("Complete Vessel Inward Date, IGM, EGM, and DO Validity before proceeding.");
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

  const handleChecklistOwnerDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!checklistWorkflow) return;
    if (decision === "REJECTED" && !ownerApprovalRemarks.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }

    setLoading(`checklist-owner-${decision}`);
    try {
      const res = await actions.submitChecklistOwnerDecisionAction(
        job.id,
        checklistWorkflow.id,
        decision,
        ownerApprovalRemarks || undefined,
      );
      if (res.ok) {
        toast.success(decision === "APPROVED" ? "Job Owner approval recorded." : "Checklist returned by owner for rework.");
        setOwnerApprovalRemarks("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to process job owner decision.");
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
        router.refresh();
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
        router.refresh();
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

  return (
    <main className="-mt-2 w-full space-y-4 overflow-x-hidden">
      {/* Job Main Header */}
      <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-outline-variant bg-surface-container-high px-2 py-1 text-xs font-semibold text-[var(--color-primary)]">
              {job.jobType.name}
            </span>
            {job.shipmentType ? (
              <span className="rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1 text-xs font-semibold text-on-surface">
                {job.shipmentType.name}
              </span>
            ) : null}
            <span className="rounded-lg bg-surface-container-low px-2 py-1 text-xs font-semibold text-on-surface-variant ds-numeric">
              {job.branch.name}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="ds-h1 break-words text-[var(--color-primary)]">{job.jobNumber}</h1>
            <p className="max-w-4xl text-sm text-on-surface">{job.title}</p>
          </div>
          <p className="text-xs text-on-surface-variant flex flex-wrap items-center gap-1.5">
            <span>Customer: <strong className="text-on-surface">{job.customer.name}</strong></span>
            <span>•</span>
            <span>Owner: <strong className="text-on-surface">{job.primaryOwner.name}</strong></span>
            <span>•</span>
            <span>
              Assigned Manager:{" "}
              {job.assignedManager ? (
                <strong className="text-on-surface">{job.assignedManager.name}</strong>
              ) : (
                <span className="text-red-500 font-semibold">None (Setup Required)</span>
              )}
            </span>
            {canUpdateJob && (
              <button
                type="button"
                onClick={() => setIsEditingManager(true)}
                className="ml-1 text-[#00cec4] hover:underline font-semibold text-[11px] uppercase tracking-wide cursor-pointer"
              >
                [Change]
              </button>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end">
          <div>
            <span className="ds-label mb-1 block text-on-surface-variant">Workflow Stage</span>
            <span className={`inline-flex min-h-9 min-w-52 items-center justify-center rounded-lg border px-3 py-2 text-center text-xs font-bold uppercase tracking-wider ${
            job.stage === "FILING"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : job.stage === "ADDITIONAL_DATA"
              ? "border-[#fb923c]/35 bg-[#fb923c]/10 text-[#fb923c]"
              : job.stage === "CHECKLIST_APPROVAL"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : job.stage === "FILED"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-surface-container-high text-on-surface border border-outline-variant"
          }`}>
              {job.stage.replace(/_/g, " ")}
            </span>
          </div>
          <div>
            <span className="ds-label mb-1 block text-on-surface-variant">Job Status</span>
            <span className={`inline-flex min-h-9 min-w-28 items-center justify-center rounded-lg border px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider ${
              job.status === "ACTIVE" ? "border-green-200 text-green-500" : "border-orange-200 text-orange-400"
            }`}>
              {job.status}
            </span>
          </div>
          {canDeleteJob ? (
            <Button
              variant="destructive"
              className="min-h-9 w-full sm:w-auto"
              disabled={loading !== null || Boolean(activeDeletionRequest)}
              onClick={() => setDeleteModalMode("delete")}
            >
              <Trash2 className="mr-2 size-4" />
              {activeDeletionRequest ? "Deletion Pending" : "Delete Job"}
            </Button>
          ) : null}
        </div>
      </div>

      {!job.assignedManagerId && (
        <div className="rounded-xl border border-[#fb923c]/35 bg-[#fb923c]/10 p-4">
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
        <div className="rounded-xl border border-[#fb923c]/35 bg-[#fb923c]/8 p-4">
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

      <div className="rounded-xl border border-outline-variant/30 bg-surface p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div>
            <h2 className="ds-h2 text-on-surface">Recent Milestones</h2>
            <p className="text-xs text-on-surface-variant">Latest activity for this job only.</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className="text-xs font-semibold text-[#00cec4] hover:underline bg-transparent border-0 cursor-pointer"
          >
            View Full Audit
          </button>
        </div>

        {recentMilestones.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No milestones recorded for this job yet.</p>
        ) : (
          <div className="relative pl-5 space-y-4 before:absolute before:left-[8px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/40">
            {recentMilestones.map((log: any) => (
              <div key={log.id} className="relative space-y-1">
                <span className="absolute -left-[17px] top-1.5 h-3 w-3 rounded-full bg-[#00cec4] border-2 border-surface" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-on-surface">{log.event.replace(/_/g, " ")}</p>
                  <span className="text-[10px] text-on-surface-variant ds-numeric">
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">{log.remarks}</p>
                <p className="text-[10px] text-on-surface-variant">
                  by <span className="text-on-surface">{log.actor?.name || "System"}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* visual Stepper Display */}
      <div className="relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface px-4 py-3 shadow-sm sm:px-5">
        <div className="relative z-10 grid grid-cols-6 gap-2 md:gap-4">
          {STAGES.map((s, index) => {
            const isCompleted = index < activeStepIndex;
            const isActive = index === activeStepIndex;
            return (
              <div key={s.key} className="relative flex min-w-0 flex-col items-center text-center">
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={`absolute left-[-50%] right-1/2 top-4 z-[-1] h-[2px] ${
                      index <= activeStepIndex ? "bg-[#00cec4]" : "bg-outline-variant/40"
                    }`}
                  />
                )}

                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-[#00cec4] border-[#00cec4] text-white"
                      : isActive
                      ? "bg-surface border-[#00cec4] text-[#00cec4] shadow-[0_0_0_4px_rgba(0,206,196,0.15)]"
                      : "bg-surface border-outline-variant text-on-surface-variant"
                  }`}
                >
                  {isCompleted ? <Check size={18} /> : <span>{index + 1}</span>}
                </div>
                <span className={`mt-1.5 block min-h-5 text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? "text-[#00cec4]" : "text-on-surface-variant"
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab Controls */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-low p-1 lg:grid-cols-7">
        <button
          onClick={() => setActiveTab("docs")}
          className={`rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "docs"
              ? "bg-surface text-[#00cec4] shadow-sm"
              : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
          }`}
        >
          Documents ({job.documentRequirements.length})
        </button>
        <button
          onClick={() => setActiveTab("additionalData")}
          className={`rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "additionalData"
              ? "bg-surface text-[#00cec4] shadow-sm"
              : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
          }`}
        >
          Additional Data
        </button>
        <button
          onClick={() => setActiveTab("checklist")}
          className={`rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "checklist"
              ? "bg-surface text-[#00cec4] shadow-sm"
              : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
          }`}
        >
          Checklist
        </button>
        <button
          onClick={() => setActiveTab("filing")}
          className={`rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "filing"
              ? "bg-surface text-[#00cec4] shadow-sm"
              : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
          }`}
        >
          Filing Record
        </button>
        <button
          onClick={() => setActiveTab("advances")}
          className={`rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "advances"
              ? "bg-surface text-[#00cec4] shadow-sm"
              : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
          }`}
        >
          Client Advances
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "expenses"
              ? "bg-surface text-[#00cec4] shadow-sm"
              : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
          }`}
        >
          Expenses ({job.expenseRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "audit"
              ? "bg-surface text-[#00cec4] shadow-sm"
              : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
          }`}
        >
          Audit History
        </button>
      </div>

      {/* Tab Panels */}
      <div className="min-h-[400px] rounded-xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
        
        {/* PANEL: DOCUMENTS */}
        {activeTab === "docs" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div>
                <h3 className="ds-h3 text-on-surface">Required Customs Documents</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Upload required files or declare exceptions to pass the document gate.
                </p>
              </div>
            </div>

            {/* Categories and grouped requirement slots */}
            {(() => {
              const groupedRequirements: Record<string, any[]> = {};
              job.documentRequirements.forEach((req: any) => {
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
                <div className="space-y-8">
                  {categoryKeys.map((categoryName) => {
                    const reqs = groupedRequirements[categoryName];
                    return (
                      <div key={categoryName} className="space-y-4">
                        <h4 className="ds-h2 text-xs text-[#00cec4] border-b border-outline-variant/20 pb-2 font-semibold">
                          {categoryName}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {reqs.map((req: any) => {
                            const isUploaded = req.status === "UPLOADED";
                            const isExempted = req.status === "NOT_AVAILABLE";
                            const currentVersion = req.versions.find((v: any) => v.isCurrent);
                            return (
                              <div
                                key={req.id}
                                className={`p-4 rounded-xl border flex flex-col justify-between bg-[var(--color-surface)] ${
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
                                    </div>
                                  </div>

                                  {req.requirementItem?.description && (
                                    <p className="text-xs text-on-surface-variant mt-1">{req.requirementItem.description}</p>
                                  )}

                                  {/* Display Uploaded File details */}
                                  {isUploaded && currentVersion && (
                                    <div className="mt-3 bg-surface border border-green-200/50 p-2.5 rounded-lg flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2 truncate">
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
                                        className="w-full text-xs py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
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
              <div className="pt-6 border-t border-outline-variant/30 flex flex-col items-end gap-3">
                {proceedErrors && (
                  <div className="w-full md:max-w-xl p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 text-xs">
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
          <div className="space-y-6">
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
              <div className="flex items-start gap-3 rounded-xl border border-[#fb923c]/40 bg-surface p-4">
                <AlertTriangle size={22} className="mt-0.5 shrink-0 text-[#fb923c]" />
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wide text-[#fb923c]">DOCUMENT GATE REQUIRED</h4>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                    Complete Document Collection before saving or completing Additional Data.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="ds-form-section space-y-4">
              <h3>Additional Data Fields</h3>
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
                <label className="space-y-1.5">
                  <span className="ds-label">Import General Manifest</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={importGeneralManifest}
                    onChange={(e) => setImportGeneralManifest(e.target.value)}
                    disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                    required
                    className="w-full ds-numeric"
                    placeholder="Enter IGM reference"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="ds-label">Export General Manifest</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={exportGeneralManifest}
                    onChange={(e) => setExportGeneralManifest(e.target.value)}
                    disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                    required
                    className="w-full ds-numeric"
                    placeholder="Enter EGM reference"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 md:grid-cols-4">
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
                <span className="ds-label">IGM</span>
                <p className="mt-1 text-sm text-on-surface ds-numeric">{importGeneralManifest || "Pending"}</p>
              </div>
              <div>
                <span className="ds-label">EGM</span>
                <p className="mt-1 text-sm text-on-surface ds-numeric">{exportGeneralManifest || "Pending"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-outline-variant/30 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={loading !== null || job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                onClick={handleSaveAdditionalData}
                className="w-full sm:w-auto"
              >
                <Database className="mr-2 size-4" />
                {loading === "additional-data-save" ? "Saving..." : "Save Additional Data"}
              </Button>
              {job.stage === "ADDITIONAL_DATA" ? (
                <Button
                  type="button"
                  disabled={loading !== null || !additionalDataComplete}
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
          <div className="space-y-6">
            <h3 className="ds-h3 text-on-surface">Checklist Workflow</h3>

            {/* Check if gate is open */}
            {activeStepIndex < checklistStageIndex ? (
              <div className="bg-surface border border-[#fb923c]/40 p-6 rounded-xl flex items-start gap-3">
                <AlertTriangle size={24} className="text-[#fb923c] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-[#fb923c]">CHECKLIST PREPARATION NOT AVAILABLE</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {job.stage === "DOCUMENT_COLLECTION"
                      ? "Complete Document Collection first. Make sure all mandatory documents are uploaded or exempted."
                      : "Complete the Additional Data process first. Vessel Inward Date, IGM, EGM, and DO Validity are required."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {!job.assignedManagerId && (
                  <div className="bg-surface border border-[#fb923c]/40 p-5 rounded-xl flex items-start gap-3">
                    <AlertTriangle size={24} className="text-[#fb923c] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm uppercase text-[#fb923c]">Manager Assignment Required</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        No manager has been assigned to this job yet. An assigned manager is mandatory to route checklist approvals and handle operational workflows.
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

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                  <div className="space-y-6">
                    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-5">
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
                              : "First internal approval will route this checklist to customer approval."}
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

                    <form onSubmit={handleUploadChecklist} className="space-y-4 rounded-xl border border-dashed border-outline-variant/60 bg-surface p-5">
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
                        <div className="bg-surface border border-red-500/40 p-4 rounded-xl flex items-start gap-3">
                          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-xs uppercase text-red-500">No Internal Approvers Configured</h4>
                            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                              There are no active internal checklist approvers configured for this job. 
                              Please assign an employee with the <span className="font-medium text-on-surface">Approval</span> responsibility in the job settings, 
                              or verify that the job owner has a manager or team lead configured in HRMS.
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
                        disabled={internalApproversCount === 0 || !job.assignedManagerId}
                        onChange={(e) => setChecklistFile(e.target.files?.[0] || null)}
                        className="w-full text-xs disabled:opacity-50"
                      />
                      <textarea
                        rows={2}
                        value={checklistRemarks}
                        disabled={internalApproversCount === 0 || !job.assignedManagerId}
                        onChange={(e) => setChecklistRemarks(e.target.value)}
                        placeholder="Optional upload remarks"
                        className="w-full text-xs disabled:opacity-50"
                      />
                      <div className="flex justify-end">
                        <Button type="submit" disabled={loading === "checklist-upload" || internalApproversCount === 0 || !job.assignedManagerId} className="w-full sm:w-auto">
                          {loading === "checklist-upload" ? "Uploading..." : currentChecklistVersion ? "Reupload Checklist" : "Upload Checklist"}
                        </Button>
                      </div>
                    </form>

                    {currentChecklistVersion ? (
                      <div className="rounded-xl border border-outline-variant/40 bg-surface p-5 space-y-4">
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

                        <div className="overflow-hidden rounded-xl border border-outline-variant/40">
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

                  <div className="space-y-6">
                    <div className="rounded-xl border border-outline-variant/40 bg-surface p-5 space-y-4">
                      <div>
                        <span className="ds-label">Internal Approval</span>
                        <p className="mt-1 text-sm text-on-surface">
                          {!checklistWorkflow
                            ? "Checklist upload will start the internal review process."
                            : checklistWorkflow.currentApprovalStage === "INTERNAL"
                            ? "Awaiting internal review."
                            : "Internal review is complete or not active for the current step."}
                        </p>
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
                              disabled={loading !== null || !job.assignedManagerId}
                              onClick={() => handleChecklistInternalDecision("REJECTED")}
                            >
                              Reject
                            </Button>
                            <Button
                              type="button"
                              disabled={loading !== null || !job.assignedManagerId}
                              onClick={() => handleChecklistInternalDecision("APPROVED")}
                            >
                              Approve
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-outline-variant/40 bg-surface p-5 space-y-4">
                      <div>
                        <span className="ds-label">Job Owner Approval</span>
                        <p className="mt-1 text-sm text-on-surface">
                          {checklistWorkflow?.currentApprovalStage === "JOB_OWNER"
                            ? "Awaiting job owner approval."
                            : "Job owner approval starts after internal approval is complete."}
                        </p>
                      </div>
                      {canCurrentUserOwnerApprove && checklistWorkflow?.currentApprovalStage === "JOB_OWNER" ? (
                        <>
                          <textarea
                            rows={2}
                            value={ownerApprovalRemarks}
                            onChange={(e) => setOwnerApprovalRemarks(e.target.value)}
                            placeholder="Required for rejection, optional for approval"
                            className="w-full text-xs"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="border-red-200 text-red-500 hover:bg-red-50"
                              disabled={loading !== null || !job.assignedManagerId}
                              onClick={() => handleChecklistOwnerDecision("REJECTED")}
                            >
                              Reject
                            </Button>
                            <Button
                              type="button"
                              disabled={loading !== null || !job.assignedManagerId}
                              onClick={() => handleChecklistOwnerDecision("APPROVED")}
                            >
                              Approve
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-outline-variant/40 bg-surface p-5 space-y-4">
                      <div>
                        <span className="ds-label">Customer Approval</span>
                        <p className="mt-1 text-sm text-on-surface">
                          {checklistWorkflow?.currentApprovalStage === "CUSTOMER"
                            ? "Awaiting customer approval."
                            : checklistWorkflow?.customerRejectedOnce
                            ? "Customer approval will not be requested again after rework."
                            : "Customer approval starts after the first successful internal approval."}
                        </p>
                      </div>
                      {canCurrentUserCustomerApprove && checklistWorkflow?.currentApprovalStage === "CUSTOMER" ? (
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
                              disabled={loading !== null || !job.assignedManagerId}
                              onClick={() => handleChecklistCustomerDecision("REJECTED")}
                            >
                              Reject
                            </Button>
                            <Button
                              type="button"
                              disabled={loading !== null || !job.assignedManagerId}
                              onClick={() => handleChecklistCustomerDecision("APPROVED")}
                            >
                              Approve
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-outline-variant/40 bg-surface p-5 space-y-4">
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
                              <div key={approval.id} className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
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

        {/* PANEL: FILING */}
        {activeTab === "filing" && (
          <div className="space-y-6">
            <h3 className="ds-h3 text-on-surface">Customs Submission Filing Details</h3>

            {activeStepIndex < filingStageIndex ? (
              <div className="bg-surface border border-outline-variant p-6 rounded-xl flex items-start gap-3">
                <AlertTriangle size={24} className="text-[#fb923c] shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-[#fb923c]">FILING STAGE PREPARATION LOCKED</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Clearance files can only be submitted to customs after the checklist is approved.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left col: Current filing status */}
                <div className="space-y-6">
                  <div className="bg-surface border border-outline-variant/40 p-5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                      <span className="ds-label">Estimated Date</span>
                      <span className="font-mono text-xs font-bold">
                        {job.filing.estimatedFilingDate
                          ? new Date(job.filing.estimatedFilingDate).toDateString()
                          : "Not Scheduled"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="ds-label">Actual Filing Date</span>
                      <span className="font-mono text-xs font-bold text-green-600">
                        {job.filing.actualFilingDate
                          ? new Date(job.filing.actualFilingDate).toDateString()
                          : "Awaiting Filing"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="ds-label">Bill Ref ID</span>
                      <span className="font-mono text-xs font-bold">
                        {job.filing.filingRef || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Date adjustment */}
                  {job.filing.status !== "FILED" && (
                    <div className="p-5 border border-outline-variant/50 rounded-xl space-y-4">
                      <span className="ds-label block">Reschedule Filing Timeline</span>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={newEstFilingDate}
                          onChange={(e) => setNewEstFilingDate(e.target.value)}
                          className="text-xs"
                        />
                        <Button onClick={handleAdjustEstDate} disabled={loading !== null} className="text-xs h-9">
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Rescheduling History */}
                  <div className="space-y-3">
                    <span className="ds-label block">Timeline Adjustments Audit</span>
                    {job.filing.dateHistory?.length === 0 ? (
                      <p className="text-xs text-on-surface-variant">No date revisions recorded.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {job.filing.dateHistory.map((h: any) => (
                          <div key={h.id} className="text-[11px] p-2 bg-surface-container-low border border-outline-variant/40 rounded flex items-center justify-between">
                            <span>Adjusted: {new Date(h.estimatedFilingDate).toDateString()}</span>
                            <span className="text-on-surface-variant font-mono">by {h.setBy?.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right col: Form to mark as filed */}
                <div>
                  {job.filing.status === "FILED" ? (
                    <div className="border border-green-200 bg-green-50/5 p-6 rounded-xl space-y-4">
                      <h4 className="font-bold text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle2 size={18} /> CUSTOMS SUBMISSION COMPLETE
                      </h4>
                      <p className="text-xs text-on-surface-variant">
                        Clearance file is registered. Reference number: <strong className="text-on-surface">{job.filing.filingRef}</strong>
                      </p>
                      {job.filing.delayReason && (
                        <div className="bg-surface border border-red-200 p-3 rounded-lg text-xs space-y-1">
                          <p className="font-medium text-red-600">Delay Explanation justification:</p>
                          <p className="text-on-surface">{job.filing.delayReason}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleMarkAsFiled} className="border border-outline-variant p-5 rounded-xl space-y-4">
                      <span className="ds-label block text-on-surface">Mark Customs Clearance Filed</span>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wide block">Filing Reference Number (BOE/SB Ref) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. BOE-8871212"
                          value={filingRef}
                          onChange={(e) => setFilingRef(e.target.value)}
                          className="w-full text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wide block">Actual Date Filed *</label>
                        <input
                          type="date"
                          required
                          value={actualFilingDate}
                          onChange={(e) => setActualFilingDate(e.target.value)}
                          className="w-full text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wide block">Upload Filed Bill copy *</label>
                        <input
                          type="file"
                          required
                          onChange={(e) => setFiledBillCopyFile(e.target.files?.[0] || null)}
                          className="w-full text-xs"
                        />
                      </div>

                      {/* If delayed, make reason input visible and required */}
                      {(() => {
                        const est = job.filing.estimatedFilingDate ? new Date(job.filing.estimatedFilingDate) : null;
                        const act = actualFilingDate ? new Date(actualFilingDate) : null;
                        const isDelayed = est && act && act.getTime() > est.getTime();

                        if (isDelayed) {
                          return (
                            <div className="space-y-1 border-l-2 border-red-500 pl-3 bg-red-50/20 p-2 rounded">
                              <label className="text-[10px] uppercase font-bold tracking-wide text-red-500 block">
                                Justification Delay Reason (REQUIRED) *
                              </label>
                              <textarea
                                required
                                rows={3}
                                placeholder="Explain why the clearance filing date exceeded the committed estimated date..."
                                value={delayReason}
                                onChange={(e) => setDelayReason(e.target.value)}
                                className="w-full text-xs font-sans border-red-200"
                              />
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <Button type="submit" disabled={loading !== null} className="w-full">
                        Submit Filing Confirmation
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL: ADVANCES */}
        {activeTab === "advances" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="ds-h3 text-on-surface">Client Advance Collections</h3>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                job.customerAdvance.status === "FULLY_RECEIVED" ? "text-green-600" : "text-[#fb923c]"
              }`}>
                Collection: {job.customerAdvance.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Expected settings */}
              <div className="space-y-6">
                <div className="border border-outline-variant p-5 rounded-xl space-y-4">
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
                  <div className="border border-red-200 bg-red-50/5 p-4 rounded-xl space-y-3">
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
              <div className="space-y-6">
                {/* Form to add receipts */}
                {job.customerAdvance.status !== "NOT_REQUIRED" && job.customerAdvance.status !== "FULLY_RECEIVED" && (
                  <form onSubmit={handleRecordAdvanceReceipt} className="border border-outline-variant p-5 rounded-xl space-y-4">
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
                        <div key={r.id} className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl flex items-center justify-between text-xs">
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
          <div className="space-y-8">
            {/* Create expense request */}
            <div className="border border-outline-variant p-6 rounded-xl space-y-6 bg-surface-container-low/20">
              <h3 className="ds-h3 text-on-surface">New Clearance Expense Request</h3>

              <form onSubmit={handleCreateExpenseRequest} className="space-y-6">
                {/* Urgent switch */}
                <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between p-4 border border-outline-variant/60 rounded-xl bg-surface">
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
                        className={`p-5 rounded-xl border space-y-4 transition-all ${
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
                          <div className="p-4 border border-[#fb923c]/40 bg-[#fb923c]/5 rounded-xl space-y-3">
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
                          <div className="p-4 border border-outline-variant/60 bg-surface rounded-xl space-y-3">
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
                          <form onSubmit={handlePostExpensePayment} className="p-4 border border-[#00cec4]/40 bg-[#00cec4]/5 rounded-xl space-y-4">
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
                          <div className="p-4 border border-[#fb923c]/40 bg-[#fb923c]/5 rounded-xl space-y-3">
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
          <div className="space-y-6">
            <h3 className="ds-h3 text-on-surface">Job Auditing History Trail</h3>
            
            {job.auditLogs?.length === 0 ? (
              <p className="text-xs text-on-surface-variant">No audit log records for this clearance.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/40">
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
        <div className="space-y-5">
          <div className="rounded-xl border border-red-200/70 bg-red-50/40 p-4 text-sm text-on-surface">
            <p className="font-semibold text-red-600">Permanent action</p>
            <p className="mt-1 text-on-surface-variant">
              Deleting this job affects linked CHA workflows, audit visibility, and operational references. Enter the exact confirmation values below to continue.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="ds-label block">Type Exact Job Number</label>
              <input
                type="text"
                value={deleteConfirmJobNumber}
                onChange={(e) => setDeleteConfirmJobNumber(e.target.value)}
                placeholder={job.jobNumber}
                className="w-full text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="ds-label block">Type Confirmation Phrase</label>
              <input
                type="text"
                value={deleteConfirmPhrase}
                onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                placeholder="delete job"
                className="w-full text-sm"
              />
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
        <div className="space-y-5">
          <div className="rounded-xl border border-red-200/70 bg-red-50/40 p-4 text-sm text-on-surface">
            <p className="font-semibold text-red-600">Manager approval required</p>
            <p className="mt-1 text-on-surface-variant">
              Confirm the exact job number and type <strong className="text-on-surface">delete job</strong> to execute this deletion request.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="ds-label block">Type Exact Job Number</label>
              <input
                type="text"
                value={deleteConfirmJobNumber}
                onChange={(e) => setDeleteConfirmJobNumber(e.target.value)}
                placeholder={job.jobNumber}
                className="w-full text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="ds-label block">Type Confirmation Phrase</label>
              <input
                type="text"
                value={deleteConfirmPhrase}
                onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                placeholder="delete job"
                className="w-full text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="ds-label block">Approval Note (Optional)</label>
              <textarea
                rows={3}
                value={deleteDecisionRemarks}
                onChange={(e) => setDeleteDecisionRemarks(e.target.value)}
                placeholder="Add any execution note for the audit trail..."
                className="w-full text-sm"
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
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="ds-label block">Rejection Reason</label>
            <textarea
              rows={4}
              value={deleteDecisionRemarks}
              onChange={(e) => setDeleteDecisionRemarks(e.target.value)}
              placeholder="Explain why this CHA job should not be deleted..."
              className="w-full text-sm"
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
              <div className="relative h-[60vh] flex flex-col bg-surface border border-outline-variant/30 rounded-xl overflow-hidden">
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
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-xl bg-[#00cec4]/10 text-[#00cec4] flex items-center justify-center">
                      <FileText size={32} />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <h4 className="ds-h3 text-sm text-on-surface">Preview Unavailable</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
                        Word, Excel, or binary formats cannot be previewed directly in the browser. You can download this file to view it locally.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-outline-variant/40 bg-surface-container-low/50 text-left text-xs space-y-2 w-full max-w-md">
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
                      className="inline-flex items-center justify-center bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all font-medium"
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
                className="w-full text-sm rounded-xl"
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
    </main>
  );
}
