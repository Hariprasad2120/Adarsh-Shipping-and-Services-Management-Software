"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import * as chaService from "./service";

type ActionResponse<T = any> = { ok: true; data: T } | { ok: false; error: string };

// Helper to authenticate and check permissions
async function getAuthAndVerify(permission?: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: Please log in to continue.");
  }
  const userId = session.user.id;
  const orgId = session.user.orgId;
  if (!orgId) {
    throw new Error("Missing organisation configuration.");
  }
  if (permission) {
    await requirePermission(userId, permission);
  }
  return { userId, orgId };
}

async function getRequestMetadata() {
  const requestHeaders = await headers();
  return {
    userAgent: requestHeaders.get("user-agent") ?? undefined,
    ipAddress:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      requestHeaders.get("x-real-ip") ??
      undefined,
  };
}

export async function ensureSettingsAndDefaultsAction(): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const settings = await chaService.ensureSettingsAndDefaults(orgId);
    return { ok: true, data: settings };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to initialize CHA settings" };
  }
}

export async function updateSettingsAction(data: {
  jobCreatorRoles: string[];
  jobCreatorUsers: string[];
  selfApprovalAllowed: boolean;
  managerApprovalPolicy: "ANY" | "ALL";
  expenseCategories: string[];
  jobNumberPrefix?: string;
  jobNumberNextNum?: number;
  branchNumberingRules?: {
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
}): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const settings = await db.chaSettings.update({
      where: { orgId },
      data: {
        jobCreatorRoles: data.jobCreatorRoles,
        jobCreatorUsers: data.jobCreatorUsers,
        selfApprovalAllowed: data.selfApprovalAllowed,
        managerApprovalPolicy: data.managerApprovalPolicy,
        expenseCategories: data.expenseCategories,
        jobNumberPrefix: data.jobNumberPrefix,
        jobNumberNextNum: data.jobNumberNextNum,
      },
    });
    if (data.branchNumberingRules?.length) {
      await chaService.upsertBranchNumberingRules(orgId, data.branchNumberingRules);
    }
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    revalidatePath("/cha");
    return { ok: true, data: settings };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update settings" };
  }
}

export async function createJobAction(data: {
  jobNumber?: string;
  title: string;
  customerId: string;
  customerRef?: string;
  jobTypeId: string;
  shipmentTypeId?: string;
  branchId: string;
  priority: string;
  remarks?: string;
  primaryOwnerId: string;
  assignedManagerId: string;
  assignments: { userId: string; responsibility: string }[];
  estimatedClosureDate?: Date | string;
}): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.create");
    const job = await chaService.createJob(userId, orgId, data);
    revalidatePath("/cha/jobs");
    return { ok: true, data: job };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create CHA job" };
  }
}

export async function submitJobDeletionAction(
  jobId: string,
  confirmationJobNumber: string,
  confirmationPhrase: string
): Promise<ActionResponse<{ mode: "deleted" | "pending"; requestId?: string; assignedManagerId?: string }>> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.delete");
    const metadata = await getRequestMetadata();
    const result = await chaService.submitJobDeletion(userId, orgId, {
      jobId,
      confirmationJobNumber,
      confirmationPhrase,
      metadata,
    });
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/jobs");
    revalidatePath("/cha/approvals");
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to process CHA job deletion" };
  }
}

export async function decideJobDeletionRequestAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.delete.approve");
    const metadata = await getRequestMetadata();
    const result = await chaService.decideJobDeletionRequest(userId, orgId, {
      requestId,
      decision,
      remarks,
      metadata,
    });
    revalidatePath("/cha/jobs");
    revalidatePath("/cha/approvals");
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to action CHA deletion request" };
  }
}

export async function createJobTypeAction(data: {
  name: string;
  movementDirection: "IMPORT" | "EXPORT" | "BOTH" | "OTHER";
  manifestRequirement: "IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM";
  customManifestLabel?: string | null;
  isManifestMandatory: boolean;
  manifestHelpText?: string | null;
  isActive?: boolean;
}): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.settings.manage");
    const jobType = await chaService.createJobType(userId, orgId, data);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    return { ok: true, data: jobType };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create clearance job type" };
  }
}

export async function updateJobTypeManifestConfigAction(
  id: string,
  data: {
    name: string;
    movementDirection: "IMPORT" | "EXPORT" | "BOTH" | "OTHER";
    manifestRequirement: "IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM";
    customManifestLabel?: string | null;
    isManifestMandatory: boolean;
    manifestHelpText?: string | null;
    isActive?: boolean;
  },
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.settings.manage");
    const jobType = await chaService.updateJobTypeManifestConfig(userId, orgId, id, data);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    return { ok: true, data: jobType };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update clearance job type" };
  }
}

export async function createShipmentTypeAction(name: string): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const shipmentType = await chaService.createShipmentType(orgId, name);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    revalidatePath("/cha");
    return { ok: true, data: shipmentType };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create shipment type" };
  }
}

export async function deleteShipmentTypeAction(id: string): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const shipmentType = await chaService.deleteShipmentType(orgId, id);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    revalidatePath("/cha");
    return { ok: true, data: shipmentType };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete shipment type" };
  }
}

export async function deleteJobTypeAction(id: string): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const jobType = await chaService.deleteJobType(orgId, id);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    return { ok: true, data: jobType };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete clearance job type" };
  }
}

export async function createTeamGroupAction(name: string, memberIds: string[]): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const group = await chaService.createTeamGroup(orgId, name, memberIds);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    return { ok: true, data: group };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create team group" };
  }
}

export async function deleteTeamGroupAction(id: string): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const group = await chaService.deleteTeamGroup(orgId, id);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    return { ok: true, data: group };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete team group" };
  }
}

export async function getJobDetailsAction(jobId: string): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.read");
    const job = await chaService.getJobDetails(userId, orgId, jobId);
    return { ok: true, data: job };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch job details" };
  }
}

export async function listJobsAction(filters: {
  search?: string;
  stage?: string;
  status?: string;
  priority?: string;
  branchId?: string;
  jobTypeId?: string;
  assignedToMe?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.read");
    const result = await chaService.listJobs(userId, orgId, { ...filters });
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to list CHA jobs" };
  }
}

export async function uploadDocumentVersionAction(
  jobId: string,
  requirementId: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.document.upload");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Please choose a valid file to upload." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileData = {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
    const version = await chaService.uploadDocumentVersion(
      userId,
      orgId,
      jobId,
      requirementId,
      fileData,
      buffer
    );
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: version };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to upload document version" };
  }
}

export async function deleteDocumentVersionAction(
  jobId: string,
  requirementId: string,
  versionId: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.deleteDocumentVersion(userId, orgId, jobId, requirementId, versionId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete document version" };
  }
}

export async function declareDocumentExceptionAction(
  jobId: string,
  requirementId: string,
  reason: string,
  attachmentKey?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.document.exception");
    const exception = await chaService.declareDocumentException(userId, orgId, jobId, requirementId, reason, attachmentKey);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: exception };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to declare document exception" };
  }
}

export async function markDocumentNotAvailableAction(
  jobId: string,
  requirementId: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.document.exception");
    const exception = await chaService.markDocumentNotAvailable(userId, orgId, jobId, requirementId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: exception };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to mark document as N/A" };
  }
}

export async function importChecklistExcelAction(
  jobId: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.checklist.prepare");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Please choose a valid Excel checklist file to upload." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const checklist = await chaService.importChecklistExcel(userId, orgId, jobId, buffer, file.name, file.size);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: checklist };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to parse checklist Excel workbook" };
  }
}

export async function uploadChecklistFileAction(
  jobId: string,
  data: {
    fileKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    remarks?: string;
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const checklist = await chaService.uploadChecklistFile(userId, orgId, jobId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/approvals");
    return { ok: true, data: checklist };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to upload checklist file" };
  }
}

export async function upsertAdditionalDataAction(
  jobId: string,
  data: {
    vesselInwardDate?: string | Date | null;
    importGeneralManifest?: string | null;
    exportGeneralManifest?: string | null;
    customManifestValue?: string | null;
    deliveryOrderValidity?: string | Date | null;
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const additionalData = await chaService.upsertAdditionalData(userId, orgId, jobId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/jobs");
    return { ok: true, data: additionalData };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save additional data" };
  }
}

export async function submitChecklistInternalDecisionAction(
  jobId: string,
  checklistId: string,
  decision: "APPROVED" | "REJECTED",
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.submitChecklistInternalDecision(userId, orgId, jobId, checklistId, decision, remarks);
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/approvals");
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to process internal checklist decision" };
  }
}

export async function submitChecklistCustomerDecisionAction(
  jobId: string,
  checklistId: string,
  decision: "APPROVED" | "REJECTED",
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.submitChecklistCustomerDecision(userId, orgId, jobId, checklistId, decision, remarks);
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/approvals");
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to process customer checklist decision" };
  }
}

export async function proceedAdditionalDataAction(jobId: string): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.proceedAdditionalDataStage(userId, orgId, jobId);
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/jobs");
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to complete additional data" };
  }
}

export async function submitChecklistForApprovalAction(
  jobId: string,
  importId: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.checklist.submit");
    const checklist = await chaService.submitChecklistForApproval(userId, orgId, jobId, importId);
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/approvals");
    return { ok: true, data: checklist };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit checklist for approval" };
  }
}

export async function checklistManagerActionAction(
  jobId: string,
  importId: string,
  approvalId: string,
  decision: "APPROVED" | "REWORK",
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.checklist.manager_approve");
    const approval = await chaService.checklistManagerAction(userId, orgId, jobId, importId, approvalId, decision, remarks);
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/approvals");
    return { ok: true, data: approval };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit manager decision" };
  }
}

export async function selfApproveChecklistAction(
  jobId: string,
  importId: string,
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.checklist.self_approve");
    const job = await chaService.selfApproveChecklist(userId, orgId, jobId, importId, remarks);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: job };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to self-approve checklist" };
  }
}

export async function adjustEstimatedFilingDateAction(
  jobId: string,
  filingId: string,
  newDate: Date
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.filing.manage");
    const filing = await chaService.adjustEstimatedFilingDate(userId, orgId, jobId, filingId, newDate);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: filing };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to adjust estimated date" };
  }
}

export async function markAsFiledAction(
  jobId: string,
  filingId: string,
  data: {
    filingRef: string;
    actualFilingDate: Date;
    filedBillCopyKey: string;
    remarks?: string;
    delayReason?: string;
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.filing.manage");
    const filing = await chaService.markAsFiled(userId, orgId, jobId, filingId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: filing };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to mark filing as complete" };
  }
}

export async function updateCustomerAdvanceExpectedAction(
  jobId: string,
  advanceId: string,
  expectedAmount: number,
  dueDate?: Date,
  assignedUserId?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.advance.manage");
    const advance = await chaService.updateCustomerAdvanceExpected(userId, orgId, jobId, advanceId, expectedAmount, dueDate, assignedUserId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: advance };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update expected advance details" };
  }
}

export async function recordCustomerAdvanceReceiptAction(
  jobId: string,
  advanceId: string,
  receiptData: {
    amount: number;
    receivedDate: Date;
    paymentMethod: string;
    referenceNumber?: string;
    receiptProofKey?: string;
    remarks?: string;
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.advance.manage");
    const receipt = await chaService.recordCustomerAdvanceReceipt(userId, orgId, jobId, advanceId, receiptData);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: receipt };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to record customer advance receipt" };
  }
}

export async function declareAdvanceNotRequiredAction(
  jobId: string,
  advanceId: string,
  reason: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.advance.manage");
    const advance = await chaService.declareAdvanceNotRequired(userId, orgId, jobId, advanceId, reason);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: advance };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to waive advance requirement" };
  }
}

export async function createExpenseRequestAction(
  jobId: string,
  data: {
    isUrgent: boolean;
    urgencyReason?: string;
    lines: {
      category: string;
      purpose: string;
      amount: number;
      requiredDate: Date;
      supportingDocumentKey?: string;
      remarks?: string;
    }[];
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.request");
    const request = await chaService.createExpenseRequest(userId, orgId, jobId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/expenses");
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit expense request" };
  }
}

export async function triggerUrgentExpenseEscalationAction(
  requestId: string,
  urgencyReason: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.request");
    const request = await chaService.triggerUrgentExpenseEscalation(userId, orgId, requestId, urgencyReason);
    revalidatePath("/cha/expenses");
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to escalate expense to urgent" };
  }
}

export async function setExpenseStatusAction(
  requestId: string,
  status: "UNDER_REVIEW" | "CLARIFICATION_REQUIRED" | "APPROVED" | "READY_FOR_DISBURSEMENT" | "REJECTED",
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.manage");
    const request = await chaService.setExpenseStatus(userId, orgId, requestId, status, remarks);
    revalidatePath("/cha/expenses");
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update expense status" };
  }
}

export async function postExpensePaymentAction(
  requestId: string,
  paymentData: {
    amountPaid: number;
    paymentDate: Date;
    paymentMethod: string;
    transactionReference: string;
    paymentProofKey: string;
    remarks?: string;
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.pay");
    const payment = await chaService.postExpensePayment(userId, orgId, requestId, paymentData);
    revalidatePath("/cha/expenses");
    return { ok: true, data: payment };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to disburse expense payment" };
  }
}

export async function acknowledgeExpenseReceiptAction(
  requestId: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.request");
    const request = await chaService.acknowledgeExpenseReceipt(userId, orgId, requestId);
    revalidatePath("/cha/expenses");
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to acknowledge payment receipt" };
  }
}

export async function raisePaymentQueryAction(
  requestId: string,
  queryText: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.request");
    const query = await chaService.raisePaymentQuery(userId, orgId, requestId, queryText);
    revalidatePath("/cha/expenses");
    return { ok: true, data: query };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to raise payment query" };
  }
}

export async function resolvePaymentQueryAction(
  queryId: string,
  resolutionText: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.pay");
    const query = await chaService.resolvePaymentQuery(userId, orgId, queryId, resolutionText);
    revalidatePath("/cha/expenses");
    return { ok: true, data: query };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to resolve payment query" };
  }
}

export async function listAllExpensesAction(filters: {
  status?: string;
  search?: string;
  isUrgent?: boolean;
}): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.expense.manage");
    const expenses = await chaService.listAllExpenses(orgId, filters);
    return { ok: true, data: expenses };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to query expense requests" };
  }
}

export async function listManagerChecklistApprovalsAction(): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.checklist.manager_approve");
    const approvals = await chaService.listManagerChecklistApprovals(userId, orgId);
    return { ok: true, data: approvals };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to retrieve approvals queue" };
  }
}

export async function upsertDocumentCategoryAction(data: {
  id?: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const category = await chaService.upsertDocumentCategory(orgId, data);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    revalidatePath("/cha");
    return { ok: true, data: category };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save category" };
  }
}

export async function deleteDocumentCategoryAction(id: string): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const category = await chaService.deleteDocumentCategory(orgId, id);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    revalidatePath("/cha");
    return { ok: true, data: category };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete category" };
  }
}

export async function upsertDocumentItemAction(data: {
  id?: string;
  categoryId: string;
  name: string;
  description?: string;
  sortOrder: number;
  isRequiredDefault: boolean;
  isActive: boolean;
}): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const item = await chaService.upsertDocumentItem(orgId, data);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    revalidatePath("/cha");
    return { ok: true, data: item };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save document requirement" };
  }
}

export async function deleteDocumentItemAction(id: string): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify("cha.settings.manage");
    const item = await chaService.deleteDocumentItem(orgId, id);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/jobs");
    revalidatePath("/cha");
    return { ok: true, data: item };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete document requirement" };
  }
}

export async function removeDocumentExceptionAction(
  jobId: string,
  requirementId: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.document.exception");
    const result = await chaService.removeDocumentException(userId, orgId, jobId, requirementId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to remove exemption" };
  }
}

export async function proceedDocumentStageAction(jobId: string): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const result = await chaService.proceedDocumentStage(userId, orgId, jobId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to proceed stage" };
  }
}

export async function acknowledgeDoValidityWarningAction(jobId: string): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.acknowledgeDeliveryOrderValidityWarning(userId, orgId, jobId);
    revalidatePath("/cha/jobs");
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Failed to acknowledge DO validity warning";
    return { ok: false, error: errMsg };
  }
}

export async function updateJobDetailsAction(
  jobId: string,
  data: {
    assignedManagerId?: string;
    primaryOwnerId?: string;
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const result = await chaService.updateJobDetails(userId, orgId, jobId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/jobs");
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update job details" };
  }
}

export async function submitChecklistOwnerDecisionAction(
  jobId: string,
  checklistId: string,
  decision: "APPROVED" | "REJECTED",
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.submitChecklistOwnerDecision(
      userId,
      orgId,
      jobId,
      checklistId,
      decision,
      remarks
    );
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit checklist owner decision" };
  }
}

export async function saveFilingWorkflowDraftAction(
  templateId: string | null,
  data: {
    name: string;
    description?: string;
    nodes: any[];
    edges: any[];
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.settings.manage");
    const draft = await chaService.saveFilingWorkflowDraft(userId, orgId, templateId, data);
    return { ok: true, data: draft };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save workflow draft" };
  }
}

export async function publishFilingWorkflowAction(
  versionId: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.settings.manage");
    const version = await chaService.publishFilingWorkflow(userId, orgId, versionId);
    return { ok: true, data: version };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to publish workflow version" };
  }
}

export async function getFilingWorkflowDetailsAction(
  templateId: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const details = await chaService.getFilingWorkflowDetails(userId, orgId, templateId);
    return { ok: true, data: details };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to retrieve workflow details" };
  }
}

export async function getFilingWorkflowInstanceAction(
  jobId: string
): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify();
    const instance = await chaService.getFilingWorkflowInstance(orgId, jobId);
    return { ok: true, data: instance };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch filing workflow instance" };
  }
}

export async function startFilingWorkflowAction(
  jobId: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const instance = await chaService.startFilingWorkflow(userId, orgId, jobId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: instance };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to start filing workflow" };
  }
}

export async function completeFilingNodeAction(
  jobId: string,
  nodeRunId: string,
  data: {
    remarks?: string;
    checklistItemResponses: {
      checklistItemId: string;
      isChecked: boolean;
      remarks?: string;
      fileKey?: string;
      delayRemarks?: string;
    }[];
    nextNodeKey?: string | null;
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const result = await chaService.completeFilingNode(userId, orgId, jobId, nodeRunId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to complete filing step" };
  }
}

export async function toggleFilingSection49Action(
  jobId: string,
  isEnabled: boolean,
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const result = await chaService.toggleFilingSection49(userId, orgId, jobId, isEnabled, remarks);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to toggle Section 49 status" };
  }
}

export async function getFilingSection49Action(
  jobId: string
): Promise<ActionResponse> {
  try {
    const { orgId } = await getAuthAndVerify();
    const result = await chaService.getFilingSection49(orgId, jobId);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to get Section 49 status" };
  }
}

export async function uploadFilingAttachmentAction(
  jobId: string,
  nodeRunId: string,
  photoRequirementId: string | null,
  checklistItemId: string | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Please select a valid photo / file upload." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileData = {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
    const attachment = await chaService.uploadFilingAttachment(
      userId,
      orgId,
      jobId,
      nodeRunId,
      photoRequirementId,
      checklistItemId,
      fileData,
      buffer
    );
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: attachment };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to upload filing attachment" };
  }
}

export async function upsertFilingShipmentDetailsAction(
  jobId: string,
  data: {
    filingShipmentType: string;
    billOfEntryNumber?: string | null;
    shippingBillNumber?: string | null;
  },
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const result = await chaService.upsertFilingShipmentDetails(userId, orgId, jobId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update filing shipment details" };
  }
}

export async function deleteFilingAttachmentAction(
  jobId: string,
  attachmentId: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const result = await chaService.deleteFilingAttachment(userId, orgId, jobId, attachmentId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete filing attachment" };
  }
}


