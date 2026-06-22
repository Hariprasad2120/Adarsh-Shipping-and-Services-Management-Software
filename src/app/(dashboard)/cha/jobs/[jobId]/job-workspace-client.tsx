"use client";

import { useState } from "react";
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
}

const STAGES = [
  { key: "DOCUMENT_COLLECTION", label: "Doc Collection" },
  { key: "CHECKLIST_PREPARATION", label: "Checklist Prep" },
  { key: "CHECKLIST_APPROVAL", label: "Checklist Approval" },
  { key: "FILING", label: "Filing Stage" },
  { key: "FILED", label: "Filed / Complete" },
];

export function JobWorkspaceClient({
  job,
  users,
  expenseCategories,
  selfApprovalAllowed,
  currentUserId,
  canDeleteJob,
  canApproveDeleteJob,
}: JobWorkspaceClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "docs" | "checklist" | "filing" | "advances" | "expenses" | "audit"
  >("docs");

  // Submitting States
  const [loading, setLoading] = useState<string | null>(null);

  // Document Collection Form State
  const [exceptionReason, setExceptionReason] = useState("");
  const [activeDocReqId, setActiveDocReqId] = useState<string | null>(null);

  // Checklist Prep Form State
  const [checklistManagerId, setChecklistManagerId] = useState(
    job.assignments.find((a: any) => a.responsibility === "APPROVAL")?.userId || ""
  );

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

  // Get active step index
  const activeStepIndex = STAGES.findIndex((s) => s.key === job.stage);
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

  // Document version mock upload handler
  const handleUploadDoc = async (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(`doc-${reqId}`);
    try {
      const mockKey = `cha/docs/${Math.random().toString(36).substring(7)}_${file.name}`;
      const res = await actions.uploadDocumentVersionAction(job.id, reqId, {
        fileKey: mockKey,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      if (res.ok) {
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

  // Checklist excel parse handler
  const handleImportChecklist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    if (!file || file.size === 0) {
      toast.error("Please select a valid Excel workbook template.");
      return;
    }

    setLoading("checklist-import");
    try {
      const res = await actions.importChecklistExcelAction(job.id, formData);
      if (res.ok) {
        toast.success("Excel checklist successfully parsed and stored.");
        router.refresh();
      } else {
        toast.error(res.error || "Checklist import failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Submit checklist for manager approval
  const handleSubmitChecklistForApproval = async () => {
    const activeChecklist = job.checklistImports.find((c: any) => c.status !== "APPROVED");
    if (!activeChecklist) return;

    setLoading("checklist-submit");
    try {
      const res = await actions.submitChecklistForApprovalAction(job.id, activeChecklist.id);
      if (res.ok) {
        toast.success("Checklist submitted for manager audit.");
        router.refresh();
      } else {
        toast.error(res.error || "Submission failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Self Approval
  const handleSelfApproveChecklist = async () => {
    const activeChecklist = job.checklistImports.find((c: any) => c.status !== "APPROVED");
    if (!activeChecklist) return;

    setLoading("checklist-self");
    try {
      const res = await actions.selfApproveChecklistAction(job.id, activeChecklist.id, "Self-approved by owner");
      if (res.ok) {
        toast.success("Checklist self-approved. Workflow advanced to Filing.");
        router.refresh();
      } else {
        toast.error(res.error || "Self-approval failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Manager action (APPROVE / REWORK)
  const handleManagerChecklistAction = async (decision: "APPROVED" | "REWORK") => {
    const activeChecklist = job.checklistImports.find(
      (c: any) => c.status === "PENDING_APPROVAL"
    );
    if (!activeChecklist) return;

    const myApprovalRecord = activeChecklist.approvals.find(
      (a: any) => a.managerId === currentUserId && a.decision === "PENDING"
    );

    if (!myApprovalRecord) {
      toast.error("You are not an assigned reviewer or have already review-actioned.");
      return;
    }

    if (decision === "REWORK" && !mgrApprovalComment.trim()) {
      toast.error("A review note is mandatory to request a rework.");
      return;
    }

    setLoading(`mgr-action-${decision}`);
    try {
      const res = await actions.checklistManagerActionAction(
        job.id,
        activeChecklist.id,
        myApprovalRecord.id,
        decision,
        mgrApprovalComment
      );

      if (res.ok) {
        toast.success(`Checklist marked: ${decision}`);
        setMgrApprovalComment("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to submit review.");
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
    <main className="mx-auto w-full max-w-7xl space-y-8 overflow-x-hidden">
      {/* Job Main Header */}
      <div className="grid gap-4 border-b border-outline-variant/30 pb-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-outline-variant bg-surface-container-high px-2 py-1 text-xs font-semibold text-[var(--color-primary)]">
              {job.jobType.name}
            </span>
            <span className="rounded-lg bg-surface-container-low px-2 py-1 text-xs font-semibold text-on-surface-variant ds-numeric">
              {job.branch.name}
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="ds-h1 break-words text-[var(--color-primary)]">{job.jobNumber}</h1>
            <p className="max-w-4xl text-sm text-on-surface">{job.title}</p>
          </div>
          <p className="text-xs text-on-surface-variant">
            Customer: <strong className="text-on-surface">{job.customer.name}</strong> • Owner:{" "}
            <strong className="text-on-surface">{job.primaryOwner.name}</strong>
          </p>
        </div>
        <div className="grid gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 xl:w-[18rem]">
          <div className="rounded-xl border border-outline-variant/30 bg-surface p-3">
            <span className="ds-label block text-on-surface-variant">Workflow Stage</span>
            <span className={`mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-xs font-bold uppercase tracking-wider ${
            job.stage === "FILING"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : job.stage === "CHECKLIST_APPROVAL"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : job.stage === "FILED"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-surface-container-high text-on-surface border border-outline-variant"
          }`}>
              {job.stage.replace(/_/g, " ")}
            </span>
          </div>
          <div className="rounded-xl border border-outline-variant/30 bg-surface p-3">
            <span className="ds-label block text-on-surface-variant">Job Status</span>
            <span className={`mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider ${
              job.status === "ACTIVE" ? "border-green-200 text-green-500" : "border-orange-200 text-orange-400"
            }`}>
              {job.status}
            </span>
          </div>
          {canDeleteJob ? (
            <Button
              variant="destructive"
              className="w-full"
              disabled={loading !== null || Boolean(activeDeletionRequest)}
              onClick={() => setDeleteModalMode("delete")}
            >
              <Trash2 className="mr-2 size-4" />
              {activeDeletionRequest ? "Deletion Pending" : "Delete Job"}
            </Button>
          ) : null}
        </div>
      </div>

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

      {/* visual Stepper Display */}
      <div className="relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
        <div className="relative z-10 grid grid-cols-5 gap-2 md:gap-4">
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
                <span className={`mt-2 block min-h-8 text-[10px] font-bold uppercase tracking-wider ${
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
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-low p-1 lg:grid-cols-6">
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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="ds-h3 text-on-surface">Required Customs Documents</h3>
              <span className="text-xs text-on-surface-variant">
                Upload required files or declare exceptions to pass the document gate.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {job.documentRequirements.map((req: any) => {
                const isUploaded = req.status === "UPLOADED";
                const isExempted = req.status === "NOT_AVAILABLE";
                const currentVersion = req.versions.find((v: any) => v.isCurrent);
                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between ${
                      isUploaded
                        ? "border-green-200 bg-green-50/5"
                        : isExempted
                        ? "border-[#fb923c]/40 bg-[#fb923c]/5"
                        : "border-outline-variant/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{req.name}</span>
                        <div className="flex items-center gap-1.5">
                          {req.isMandatory && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-200">
                              MANDATORY
                            </span>
                          )}
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            isUploaded
                              ? "bg-green-100 text-green-700"
                              : isExempted
                              ? "bg-orange-100 text-orange-700"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-on-surface-variant block mt-1 uppercase ds-label">
                        Category: {req.category}
                      </span>

                      {/* Display Uploaded File details */}
                      {isUploaded && currentVersion && (
                        <div className="mt-3 bg-surface border border-green-200/50 p-2.5 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={16} className="text-green-600 shrink-0" />
                            <span className="truncate font-medium">{currentVersion.fileName}</span>
                          </div>
                          <span className="text-[10px] text-on-surface-variant shrink-0 font-mono ds-numeric pl-2">
                            {(currentVersion.sizeBytes / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      )}

                      {/* Display Exception Reason */}
                      {isExempted && req.exception && (
                        <div className="mt-3 bg-surface border border-[#fb923c]/35 p-2.5 rounded-lg text-xs space-y-1">
                          <p className="font-medium text-[#fb923c]">Exemption reason:</p>
                          <p className="text-on-surface">{req.exception.reason}</p>
                          <span className="text-[10px] text-on-surface-variant block">
                            Declared by: {req.exception.user?.name || "N/A"}
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
                            className="w-full text-xs"
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setActiveDocReqId((current) => (current === req.id ? null : req.id));
                            setExceptionReason(req.exception?.reason || "");
                          }}
                        >
                          {isExempted ? "Edit Exemption" : "Declare Exemption"}
                        </Button>
                        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00cec4] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-all hover:bg-[#00b8af]">
                          <Upload size={12} />
                          {isUploaded ? "Upload Version" : isExempted ? "Upload File Anyway" : "Upload File"}
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
        )}

        {/* PANEL: CHECKLIST */}
        {activeTab === "checklist" && (
          <div className="space-y-6">
            <h3 className="ds-h3 text-on-surface">Excel Checklist Audit Gate</h3>

            {/* Check if gate is open */}
            {activeStepIndex === 0 ? (
              <div className="bg-surface border border-[#fb923c]/40 p-6 rounded-xl flex items-start gap-3">
                <AlertTriangle size={24} className="text-[#fb923c] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-[#fb923c]">CHECKLIST PREPARATION NOT AVAILABLE</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    You must complete the Document Collection stage first. Make sure all mandatory documents (Bill of Lading, Invoice, Packing List) are uploaded or exempted.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* If no checklist imported */}
                {job.checklistImports.length === 0 ? (
                  <form onSubmit={handleImportChecklist} className="max-w-md space-y-4 border border-dashed border-outline-variant/60 p-6 rounded-xl text-center">
                    <FolderOpen size={48} className="mx-auto text-outline-variant" />
                    <div>
                      <h4 className="font-semibold text-sm">Upload Checklist Workbook</h4>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Select and upload the completed Excel audit template for custom verification.
                      </p>
                    </div>
                    <input type="file" name="file" accept=".xlsx" required className="w-full text-xs" />
                    <Button type="submit" disabled={loading === "checklist-import"} className="w-full">
                      {loading === "checklist-import" ? "Uploading & Parsing..." : "Import Excel Checklist"}
                    </Button>
                  </form>
                ) : (
                  // If checklists exist, view the latest
                  (() => {
                    const activeChecklist = job.checklistImports[job.checklistImports.length - 1];
                    const isPendingApproval = activeChecklist.status === "PENDING_APPROVAL";
                    const isApproved = activeChecklist.status === "APPROVED";
                    const isRework = activeChecklist.status === "REWORK";
                    const isReady = activeChecklist.status === "READY";

                    const myApproval = activeChecklist.approvals?.find(
                      (a: any) => a.managerId === currentUserId && a.decision === "PENDING"
                    );

                    return (
                      <div className="space-y-6">
                        {/* Status Panel */}
                        <div className={`p-4 rounded-xl border flex items-center justify-between ${
                          isApproved ? "border-green-200 bg-green-50/5 text-green-700" : "border-outline-variant bg-surface-container-low"
                        }`}>
                          <div className="flex items-center gap-2">
                            {isApproved ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            <div>
                              <p className="text-sm font-bold">Checklist Status: {activeChecklist.status}</p>
                              <p className="text-xs text-on-surface-variant">
                                Template Version: {activeChecklist.templateVersion} • Uploaded by: {activeChecklist.uploadedBy?.name}
                              </p>
                            </div>
                          </div>

                          {/* Action triggers */}
                          <div className="flex gap-2">
                            {(isReady || isRework) && (
                              <>
                                {selfApprovalAllowed && (
                                  <Button onClick={handleSelfApproveChecklist} disabled={loading !== null} variant="outline" className="text-xs h-9 px-3">
                                    Self Approve
                                  </Button>
                                )}
                                <Button onClick={handleSubmitChecklistForApproval} disabled={loading !== null} className="text-xs h-9 px-3">
                                  Submit for Manager Review
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Rework Note */}
                        {isRework && activeChecklist.reworkNotes?.length > 0 && (
                          <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-1">
                            <span className="ds-label text-red-500 font-bold block">REWORK CORRECTION REQUESTED</span>
                            <p className="text-xs text-on-surface leading-relaxed">
                              "{activeChecklist.reworkNotes[activeChecklist.reworkNotes.length - 1].note}"
                            </p>
                            <span className="text-[10px] text-on-surface-variant block">
                              Requested by: {activeChecklist.reworkNotes[activeChecklist.reworkNotes.length - 1].author?.name}
                            </span>
                          </div>
                        )}

                        {/* Manager Review Form */}
                        {isPendingApproval && myApproval && (
                          <div className="border border-[#fb923c]/40 bg-[#fb923c]/5 p-5 rounded-xl space-y-4">
                            <span className="ds-label text-[#fb923c] font-bold block">AWAITING YOUR REVIEW DECISION</span>
                            <textarea
                              rows={2}
                              placeholder="Enter review remarks/rework instructions..."
                              value={mgrApprovalComment}
                              onChange={(e) => setMgrApprovalComment(e.target.value)}
                              className="w-full text-xs font-sans"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => handleManagerChecklistAction("REWORK")}
                                disabled={loading !== null}
                                variant="outline"
                                className="border-red-200 text-red-500 hover:bg-red-50 text-xs h-8 px-4"
                              >
                                Send Back for Rework
                              </Button>
                              <Button
                                onClick={() => handleManagerChecklistAction("APPROVED")}
                                disabled={loading !== null}
                                className="text-xs h-8 px-4"
                              >
                                Approve Checklist
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Display questionnaire rows */}
                        <div className="space-y-6">
                          {activeChecklist.sections.map((section: any) => (
                            <div key={section.id} className="space-y-3">
                              <h4 className="ds-h3 text-[#00cec4] border-b border-outline-variant/30 pb-1.5">
                                {section.name}
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="ds-table">
                                  <thead>
                                    <tr>
                                      <th className="w-16">Q ID</th>
                                      <th>Question Description</th>
                                      <th className="w-24">Type</th>
                                      <th className="w-32">Response Value</th>
                                      <th>Auditor Remarks</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {section.items.map((item: any) => (
                                      <tr key={item.id}>
                                        <td className="font-mono text-xs text-on-surface-variant">{item.identifier}</td>
                                        <td className="text-xs font-medium">{item.question}</td>
                                        <td className="ds-label">{item.responseType}</td>
                                        <td className="text-xs font-semibold text-on-surface">{item.value || "—"}</td>
                                        <td className="text-xs text-on-surface-variant italic">{item.remarks || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        )}

        {/* PANEL: FILING */}
        {activeTab === "filing" && (
          <div className="space-y-6">
            <h3 className="ds-h3 text-on-surface">Customs Submission Filing Details</h3>

            {activeStepIndex < 3 ? (
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
    </main>
  );
}
