"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { can, requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { tracePerformance } from "@/lib/performance";
import {
  getChaCustomsFeatureFlags,
  isChaCustomsFeatureEnabled,
} from "@/modules/cha/customs/feature-flags";
import { ensureCustomsFilingProfileForJob } from "@/modules/cha/customs/filing/workspace";
import * as chaService from "./service";

type ActionResponse<T = any> = { ok: true; data: T } | { ok: false; error: string };

function revalidateExpensePaths(jobId?: string | null) {
  revalidatePath("/cha/expenses");
  revalidatePath("/expense");
  if (jobId) revalidatePath(`/cha/jobs/${jobId}`);
}

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

const EXPENSE_ATTACHMENT_MIME_PREFIX = "image/";
const EXPENSE_ATTACHMENT_PDF_MIME = "application/pdf";
const EXPENSE_ATTACHMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff", ".heic", ".heif"];

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getOptionalExpenseAttachment(formData: FormData, key: string) {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  const mimeType = file.type || "application/octet-stream";
  const fileName = file.name.toLowerCase();
  const hasAllowedExtension = EXPENSE_ATTACHMENT_EXTENSIONS.some((extension) => fileName.endsWith(extension));
  if (!mimeType.startsWith(EXPENSE_ATTACHMENT_MIME_PREFIX) && mimeType !== EXPENSE_ATTACHMENT_PDF_MIME && !hasAllowedExtension) {
    throw new Error("Receipt attachments must be an image or PDF file.");
  }
  return file;
}

function getExpenseAttachments(formData: FormData, key: string) {
  const files = formData
    .getAll(key)
    .filter((file): file is File => file instanceof File && file.size > 0);
  for (const file of files) {
    const mimeType = file.type || "application/octet-stream";
    const fileName = file.name.toLowerCase();
    const hasAllowedExtension = EXPENSE_ATTACHMENT_EXTENSIONS.some((extension) => fileName.endsWith(extension));
    if (!mimeType.startsWith(EXPENSE_ATTACHMENT_MIME_PREFIX) && mimeType !== EXPENSE_ATTACHMENT_PDF_MIME && !hasAllowedExtension) {
      throw new Error("Receipt attachments must be image or PDF files.");
    }
  }
  return files;
}

async function buildLineReceiptUploads(formData: FormData, lineCount: number) {
  const uploads: {
    lineIndex: number;
    fileData: { fileName: string; mimeType: string; sizeBytes: number };
    fileBuffer: Buffer;
  }[] = [];
  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const files = getExpenseAttachments(formData, `receiptAttachment:${lineIndex}`);
    for (const file of files) {
      uploads.push({
        lineIndex,
        fileData: {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        },
        fileBuffer: Buffer.from(await file.arrayBuffer()),
      });
    }
  }
  return uploads;
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
  customsFilingDirection?: "IMPORT" | "EXPORT";
}): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.create");
    if (data.customsFilingDirection) {
      const [flags, canEditCustomsDraft, selectedJobType] = await Promise.all([
        getChaCustomsFeatureFlags(orgId),
        can(userId, "cha.customs.filing.edit_draft"),
        db.chaJobType.findFirst({
          where: { id: data.jobTypeId, orgId, isActive: true },
          select: { movementDirection: true },
        }),
      ]);
      const requiredFlag =
        data.customsFilingDirection === "IMPORT"
          ? "CHA_IMPORT_FILING_WORKSPACE"
          : "CHA_EXPORT_FILING_WORKSPACE";
      if (!isChaCustomsFeatureEnabled(flags, requiredFlag)) {
        throw new Error("Customs filing workspace is disabled for this organisation.");
      }
      if (!canEditCustomsDraft) {
        throw new Error("You do not have permission to create customs filing drafts.");
      }
      if (selectedJobType?.movementDirection !== data.customsFilingDirection) {
        throw new Error(`Select an active ${data.customsFilingDirection.toLowerCase()} clearance job type.`);
      }
    }
    const job = await chaService.createJob(userId, orgId, data);
    if (data.customsFilingDirection) {
      await ensureCustomsFilingProfileForJob({
        actorId: userId,
        orgId,
        jobId: job.id,
        direction: data.customsFilingDirection,
      });
      revalidatePath(`/cha/jobs/${job.id}`);
    }
    revalidatePath("/cha/jobs");
    revalidatePath("/cha/jobs/import");
    revalidatePath("/cha/jobs/export");
    return { ok: true, data: job };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create CHA job" };
  }
}

export async function getNextJobNumberPreviewAction(
  branchId: string,
): Promise<ActionResponse<string | null>> {
  try {
    const { orgId } = await getAuthAndVerify("cha.job.create");
    const preview = await chaService.getNextChaJobNumberPreview(orgId, branchId);
    return { ok: true, data: preview };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to load the next CHA job number preview" };
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

export async function retryJobChatCleanupAction(
  jobId: string,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.delete.approve");
    const result = await chaService.retryJobChatCleanup(userId, orgId, jobId);
    revalidatePath("/communication/job-spaces");
    revalidatePath("/communication");
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to retry Google Chat cleanup" };
  }
}

export async function deleteAllChaJobsForTestingAction(
  confirmationPhrase: string,
): Promise<ActionResponse<{ deletedJobs: number; deletedAuditLogs: number }>> {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error("This testing utility is disabled in production.");
    }

    const { userId, orgId } = await getAuthAndVerify("cha.job.delete.approve");
    if (confirmationPhrase !== "DELETE ALL CHA JOBS") {
      throw new Error("Enter DELETE ALL CHA JOBS to confirm.");
    }

    const actor = await db.user.findUnique({
      where: { id: userId },
      select: {
        isPlatformAdmin: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    const isAdminActor =
      actor?.isPlatformAdmin === true ||
      actor?.roles.some((entry) => ["Admin", "Management", "Director"].includes(entry.role.name));
    if (!isAdminActor) {
      throw new Error("Only admin accounts can use this testing utility.");
    }

    const result = await db.$transaction(async (tx) => {
      const deletedAuditLogs = await tx.chaAuditLog.deleteMany({
        where: { orgId, jobId: { not: null } },
      });
      const deletedJobs = await tx.chaJob.deleteMany({
        where: { orgId },
      });

      return {
        deletedJobs: deletedJobs.count,
        deletedAuditLogs: deletedAuditLogs.count,
      };
    });

    revalidatePath("/cha");
    revalidatePath("/cha/jobs");
    revalidatePath("/cha/approvals");
    revalidatePath("/communication/job-spaces");
    revalidatePath("/communication");

    return { ok: true, data: result };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete CHA jobs" };
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
    filingFlowCategory?: string | null;
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

export async function updateJobTypeFilingFlowCategoryAction(
  id: string,
  filingFlowCategory: string | null,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.settings.manage");
    const jobType = await chaService.updateJobTypeFilingFlowCategory(userId, orgId, id, filingFlowCategory);
    revalidatePath("/cha/settings");
    revalidatePath("/cha/settings/filing-workflows");
    return { ok: true, data: jobType };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update filing flow category" };
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
    const validityDateValue = formData.get("validityDate");
    const validityDate =
      typeof validityDateValue === "string" && validityDateValue.trim().length > 0
        ? new Date(validityDateValue)
        : null;
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
      buffer,
      validityDate
    );
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: version };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to upload document version" };
  }
}

export async function createJobCustomDocumentUploadAction(
  jobId: string,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.document.upload");
    const nameValue = formData.get("name");
    const file = formData.get("file");

    if (typeof nameValue !== "string" || !nameValue.trim()) {
      return { ok: false, error: "Please enter a custom document name." };
    }

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Please choose a valid file to upload." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const requirement = await chaService.createJobCustomDocumentRequirementAndUpload(userId, orgId, jobId, {
      name: nameValue,
      fileData: {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
      fileBuffer: buffer,
    });

    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: requirement };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create custom job document" };
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
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Please choose a valid checklist file to upload." };
    }
    const remarksValue = formData.get("remarks");
    const buffer = Buffer.from(await file.arrayBuffer());
    const checklist = await chaService.uploadChecklistFile(
      userId,
      orgId,
      jobId,
      {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        remarks: typeof remarksValue === "string" && remarksValue.trim() ? remarksValue.trim() : undefined,
      },
      buffer,
    );
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
    containerDetails?: Array<{ containerName?: string | null; containerNumber?: string | null }> | null;
    mblNumber?: string | null;
    hblNumber?: string | null;
    deliveryOrderValidity?: string | Date | null;
    deliveryOrderExtensionDate?: string | Date | null;
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

export async function setDoExtensionDateAction(
  jobId: string,
  extensionDate: string | null,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const parsedDate = extensionDate?.trim() ? new Date(extensionDate) : null;
    const result = await chaService.setDeliveryOrderExtensionDate(userId, orgId, jobId, parsedDate);
    revalidatePath(`/cha/jobs/${jobId}`);
    revalidatePath("/cha/jobs");
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update Delivery Order extension date" };
  }
}

export async function submitChecklistInternalDecisionAction(
  jobId: string,
  checklistId: string,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const decisionValue = formData.get("decision");
    const remarksValue = formData.get("remarks");
    const decision = decisionValue === "REJECTED" ? "REJECTED" : "APPROVED";

    const result = await chaService.submitChecklistInternalDecision(
      userId,
      orgId,
      jobId,
      checklistId,
      decision,
      typeof remarksValue === "string" && remarksValue.trim() ? remarksValue.trim() : undefined,
    );
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

export async function sendChecklistCustomerMailAction(
  jobId: string,
  checklistId: string,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const subjectValue = formData.get("subject");
    const bodyValue = formData.get("body");
    const additionalAttachments = await Promise.all(
      formData
        .getAll("customerMailAttachments")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0)
        .map(async (file) => ({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          content: Buffer.from(await file.arrayBuffer()),
        })),
    );
    const result = await chaService.sendChecklistCustomerMail(userId, orgId, jobId, checklistId, {
      subject: typeof subjectValue === "string" && subjectValue.trim() ? subjectValue.trim() : `Checklist Approval Required - ${jobId}`,
      body: typeof bodyValue === "string" && bodyValue.trim() ? bodyValue.trim() : "Please review the attached approved checklist.",
      additionalAttachments,
    });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to send checklist mail to customer" };
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
    upiNumber?: string;
    upiId?: string;
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
    revalidateExpensePaths(jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit expense request" };
  }
}

export async function createExpenseRequestWithAttachmentAction(
  jobId: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.request");
    const linesValue = readString(formData, "linesJson");
    const lines = JSON.parse(linesValue || "[]") as {
      category: string;
      purpose: string;
      amount: number;
      requiredDate: string;
      remarks?: string;
    }[];
    const receiptFile = getOptionalExpenseAttachment(formData, "receiptAttachment");
    const lineReceiptUploads = await buildLineReceiptUploads(formData, lines.length);

    const request = await chaService.createExpenseRequest(userId, orgId, jobId, {
      isUrgent: readString(formData, "isUrgent") === "true",
      urgencyReason: readString(formData, "urgencyReason") || undefined,
      upiNumber: readString(formData, "upiNumber") || undefined,
      upiId: readString(formData, "upiId") || undefined,
      lines: lines.map((line) => ({
        category: line.category,
        purpose: line.purpose,
        amount: Number(line.amount),
        requiredDate: line.requiredDate ? new Date(line.requiredDate) : new Date(),
        remarks: line.remarks || undefined,
      })),
      receiptFileData: receiptFile
        ? {
            fileName: receiptFile.name,
            mimeType: receiptFile.type || "application/octet-stream",
            sizeBytes: receiptFile.size,
          }
        : undefined,
      receiptFileBuffer: receiptFile ? Buffer.from(await receiptFile.arrayBuffer()) : undefined,
      receiptFilesByLineIndex: lineReceiptUploads,
    });
    revalidateExpensePaths(jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit expense request" };
  }
}

export async function createDirectExpenseRequestAction(
  data: {
    jobId?: string;
    expenseScope: "JOB" | "OTHER";
    directPurpose?: string;
    approvalRoute: "MANAGER_THEN_ACCOUNTS" | "DIRECT_ACCOUNTS";
    isUrgent: boolean;
    urgencyReason?: string;
    upiNumber?: string;
    upiId?: string;
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
    const request = await chaService.createDirectExpenseRequest(userId, orgId, data);
    revalidateExpensePaths(request.jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit direct expense request" };
  }
}

export async function createDirectExpenseRequestWithAttachmentAction(
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.request");
    const amount = Number(readString(formData, "amount"));
    const linesJson = readString(formData, "linesJson");
    const parsedLines = linesJson
      ? JSON.parse(linesJson)
      : [{
          category: readString(formData, "category") || "Miscellaneous",
          purpose: readString(formData, "purpose"),
          amount,
          requiredDate: readString(formData, "requiredDate") ? new Date(readString(formData, "requiredDate")) : new Date(),
        }];
    if (!Array.isArray(parsedLines) || parsedLines.length === 0) {
      return { ok: false, error: "Add at least one expense line." };
    }
    const lines = parsedLines.map((line: any) => ({
      category: typeof line?.category === "string" && line.category.trim() ? line.category.trim() : "Miscellaneous",
      purpose: typeof line?.purpose === "string" ? line.purpose.trim() : "",
      amount: Number(line?.amount),
      requiredDate: line?.requiredDate ? new Date(line.requiredDate) : new Date(),
      remarks: typeof line?.remarks === "string" && line.remarks.trim() ? line.remarks.trim() : undefined,
    }));
    if (lines.some((line) => !line.purpose || !Number.isFinite(line.amount) || line.amount <= 0 || Number.isNaN(line.requiredDate.getTime()))) {
      return { ok: false, error: "Each expense line needs a purpose, valid amount, and valid date." };
    }
    const receiptFile = getOptionalExpenseAttachment(formData, "receiptAttachment");
    const lineReceiptUploads = await buildLineReceiptUploads(formData, lines.length);

    const request = await chaService.createDirectExpenseRequest(userId, orgId, {
      jobId: readString(formData, "jobId") || undefined,
      expenseScope: readString(formData, "expenseScope") === "OTHER" ? "OTHER" : "JOB",
      directPurpose: readString(formData, "directPurpose") || undefined,
      approvalRoute: readString(formData, "approvalRoute") === "DIRECT_ACCOUNTS" ? "DIRECT_ACCOUNTS" : "MANAGER_THEN_ACCOUNTS",
      isUrgent: readString(formData, "isUrgent") === "true",
      urgencyReason: readString(formData, "urgencyReason") || undefined,
      upiNumber: readString(formData, "upiNumber") || undefined,
      upiId: readString(formData, "upiId") || undefined,
      lines,
      receiptFileData: receiptFile
        ? {
            fileName: receiptFile.name,
            mimeType: receiptFile.type || "application/octet-stream",
            sizeBytes: receiptFile.size,
          }
        : undefined,
      receiptFileBuffer: receiptFile ? Buffer.from(await receiptFile.arrayBuffer()) : undefined,
      receiptFilesByLineIndex: lineReceiptUploads,
    });
    revalidateExpensePaths(request.jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit direct expense request" };
  }
}

export async function triggerUrgentExpenseEscalationAction(
  requestId: string,
  urgencyReason: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.request");
    const request = await chaService.triggerUrgentExpenseEscalation(userId, orgId, requestId, urgencyReason);
    revalidateExpensePaths(request.jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to escalate expense to urgent" };
  }
}

export async function reviewExpenseRequestAction(
  requestId: string,
  decision: "CLARIFICATION_REQUIRED" | "APPROVED" | "REJECTED",
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.access");
    const request = await chaService.reviewExpenseRequest(userId, orgId, requestId, decision, remarks);
    revalidateExpensePaths(request.jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to review expense request" };
  }
}

export async function approveAccountsExpenseRequestAction(
  requestId: string,
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.access");
    const request = await chaService.approveAccountsExpenseRequest(userId, orgId, requestId, remarks);
    revalidateExpensePaths(request.jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to approve expense from Accounts" };
  }
}

export async function routeExpenseRequestToManagerAction(
  requestId: string,
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.access");
    const request = await chaService.routeExpenseRequestToManager(userId, orgId, requestId, remarks);
    revalidateExpensePaths(request.jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to route expense to manager" };
  }
}

export async function submitExpenseClarificationAction(
  requestId: string,
  clarificationText: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.expense.request");
    const request = await chaService.submitExpenseClarification(userId, orgId, requestId, clarificationText);
    revalidateExpensePaths(request.jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit expense clarification" };
  }
}

export async function markExpenseReadyForDisbursementAction(
  requestId: string,
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.access");
    const request = await chaService.markExpenseReadyForDisbursement(userId, orgId, requestId, remarks);
    revalidateExpensePaths(request.jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to mark expense ready for disbursement" };
  }
}

export async function setExpenseStatusAction(
  requestId: string,
  status: "UNDER_REVIEW" | "CLARIFICATION_REQUIRED" | "APPROVED" | "READY_FOR_DISBURSEMENT" | "REJECTED",
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.access");
    const request = await chaService.setExpenseStatus(userId, orgId, requestId, status, remarks);
    revalidateExpensePaths(request.jobId);
    return { ok: true, data: request };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update expense status" };
  }
}

export async function postExpensePaymentAction(
  requestId: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.access");
    const amountPaidValue = formData.get("amountPaid");
    const paymentDateValue = formData.get("paymentDate");
    const paymentMethodValue = formData.get("paymentMethod");
    const transactionReferenceValue = formData.get("transactionReference");
    const remarksValue = formData.get("remarks");
    const proofFiles = formData
      .getAll("paymentProof")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (typeof amountPaidValue !== "string" || Number(amountPaidValue) <= 0) {
      return { ok: false, error: "Enter a valid payout amount." };
    }
    if (typeof paymentDateValue !== "string" || !paymentDateValue.trim()) {
      return { ok: false, error: "Enter the payment date." };
    }
    if (typeof paymentMethodValue !== "string" || !paymentMethodValue.trim()) {
      return { ok: false, error: "Select a payment method." };
    }
    if (typeof transactionReferenceValue !== "string" || !transactionReferenceValue.trim()) {
      return { ok: false, error: "Enter the transaction reference." };
    }
    if (proofFiles.length === 0) {
      return { ok: false, error: "Attach payment proof before marking the expense as paid." };
    }
    for (const proofFile of proofFiles) {
      const proofMimeType = proofFile.type || "application/octet-stream";
      const proofFileName = proofFile.name.toLowerCase();
      const proofHasAllowedExtension = EXPENSE_ATTACHMENT_EXTENSIONS.some((extension) => proofFileName.endsWith(extension));
      if (!proofMimeType.startsWith(EXPENSE_ATTACHMENT_MIME_PREFIX) && proofMimeType !== EXPENSE_ATTACHMENT_PDF_MIME && !proofHasAllowedExtension) {
        return { ok: false, error: "Payment proof must be image or PDF files." };
      }
    }

    const payment = await chaService.postExpensePayment(userId, orgId, requestId, {
      amountPaid: Number(amountPaidValue),
      paymentDate: new Date(paymentDateValue),
      paymentMethod: paymentMethodValue,
      transactionReference: transactionReferenceValue,
      proofFiles: await Promise.all(
        proofFiles.map(async (proofFile) => ({
          fileData: {
            fileName: proofFile.name,
            mimeType: proofFile.type || "application/octet-stream",
            sizeBytes: proofFile.size,
          },
          fileBuffer: Buffer.from(await proofFile.arrayBuffer()),
        })),
      ),
      remarks: typeof remarksValue === "string" && remarksValue.trim() ? remarksValue.trim() : undefined,
    });
    revalidateExpensePaths(payment.request.jobId);
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
    revalidateExpensePaths(request.jobId);
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
    revalidateExpensePaths();
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
    revalidateExpensePaths();
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
    const { userId, orgId } = await getAuthAndVerify("cha.access");
    const canViewAll = (await can(userId, "cha.expense.manage")) || (await can(userId, "cha.expense.pay"));
    const expenses = await chaService.listAllExpenses(orgId, filters, { userId, canViewAll });
    return { ok: true, data: expenses };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to query expense requests" };
  }
}

export async function listManagerChecklistApprovalsAction(): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
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

export async function setDoUploadToggleAction(jobId: string, enabled: boolean): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const result = await chaService.setDeliveryOrderUploadToggle(userId, orgId, jobId, enabled);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update DO upload toggle" };
  }
}

export async function setDoExtensionToggleAction(jobId: string, enabled: boolean): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const result = await chaService.setDeliveryOrderExtensionToggle(userId, orgId, jobId, enabled);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update DO extension toggle" };
  }
}

export async function uploadDeliveryOrderDocumentAction(
  jobId: string,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.document.upload");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Please choose a valid Delivery Order file to upload." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await chaService.uploadDeliveryOrderDocument(
      userId,
      orgId,
      jobId,
      {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
      buffer,
    );
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to upload Delivery Order document" };
  }
}

export async function deleteDeliveryOrderDocumentAction(
  jobId: string,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.document.upload");
    const result = await chaService.deleteDeliveryOrderDocument(userId, orgId, jobId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete Delivery Order document" };
  }
}

export async function updateSection49ValidityAction(
  jobId: string,
  validityDateValue: string,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    if (!validityDateValue.trim()) {
      return { ok: false, error: "Enter the Section 49 validity date." };
    }

    const result = await chaService.updateFilingSection49Validity(
      userId,
      orgId,
      jobId,
      new Date(validityDateValue),
    );
    revalidatePath("/cha/jobs");
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update Section 49 validity" };
  }
}

export async function applySection49ExtensionAction(
  jobId: string,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.job.update");
    const extensionDateValue = formData.get("extensionDate");
    if (typeof extensionDateValue !== "string" || !extensionDateValue.trim()) {
      return { ok: false, error: "Enter the new Section 49 validity date." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose the Section 49 extension document." };
    }

    const result = await chaService.applyFilingSection49Extension(userId, orgId, jobId, {
      extensionDate: new Date(extensionDateValue),
      fileData: {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
      fileBuffer: Buffer.from(await file.arrayBuffer()),
    });
    revalidatePath("/cha/jobs");
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to apply Section 49 extension" };
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
    clearanceTypeId?: string | null;
    filingFlowCategory?: string | null;
    settings?: Record<string, unknown> | null;
    nodes: any[];
    edges: any[];
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.settings.manage");
    const draft = await tracePerformance("action:saveFilingWorkflowDraftAction", () =>
      chaService.saveFilingWorkflowDraft(userId, orgId, templateId, data),
    );
    return { ok: true, data: draft };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save workflow draft" };
  }
}

export async function loadStarterFilingWorkflowAction(
  templateId: string | null,
  data: {
    name: string;
    description?: string;
    clearanceTypeId?: string | null;
    filingFlowCategory?: string | null;
    settings?: Record<string, unknown> | null;
    starterPreset?: "COMBINED" | "IMPORT_BE" | "EXPORT_SB";
  },
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.settings.manage");
    const draft = await tracePerformance("action:loadStarterFilingWorkflowAction", () =>
      chaService.loadStarterFilingWorkflowDraft(userId, orgId, templateId, data),
    );
    return { ok: true, data: draft };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to load starter workflow" };
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
    const details = await tracePerformance("action:getFilingWorkflowDetailsAction", () =>
      chaService.getFilingWorkflowDetails(userId, orgId, templateId),
    );
    return { ok: true, data: details };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to retrieve workflow details" };
  }
}

export async function deleteFilingWorkflowTemplateAction(
  templateId: string,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.settings.manage");
    const result = await chaService.deleteFilingWorkflowTemplate(userId, orgId, templateId);
    revalidatePath("/cha/settings/filing-workflows");
    revalidatePath("/cha/settings");
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete workflow template" };
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
    delayRemarks?: string;
    transitionReason?: string;
    checklistItemResponses: {
      checklistItemId: string;
      isChecked: boolean;
      remarks?: string;
      fileKey?: string;
      delayRemarks?: string;
    }[];
    fieldValues?: Array<{ fieldKey: string; value: unknown }>;
    toggleStates?: Array<{ sectionKey: string; isEnabled: boolean; state?: Record<string, unknown> | null }>;
    nextNodeKey?: string | null;
  }
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.completeFilingNode(userId, orgId, jobId, nodeRunId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to complete filing step" };
  }
}

export async function saveFilingNodeDraftAction(
  jobId: string,
  nodeRunId: string,
  data: {
    remarks?: string;
    delayRemarks?: string;
    checklistItemResponses: {
      checklistItemId: string;
      isChecked: boolean;
      remarks?: string;
      fileKey?: string;
      delayRemarks?: string;
    }[];
    fieldValues?: Array<{ fieldKey: string; value: unknown }>;
    toggleStates?: Array<{ sectionKey: string; isEnabled: boolean; state?: Record<string, unknown> | null }>;
  },
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.saveFilingNodeDraft(userId, orgId, jobId, nodeRunId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save filing draft" };
  }
}

export async function revertFilingStageAction(
  jobId: string,
  nodeRunId: string,
  targetNodeKey: string,
  reason: string,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.revertFilingWorkflowToPreviousStage(
      userId,
      orgId,
      jobId,
      nodeRunId,
      targetNodeKey,
      reason,
    );
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to jump back to the selected filing stage" };
  }
}

export async function redirectBlockedFilingStageAction(
  jobId: string,
  nodeRunId: string,
  targetNodeKey: string,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.redirectBlockedFilingWorkflowStage(userId, orgId, jobId, nodeRunId, targetNodeKey);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to redirect to the prerequisite filing stage" };
  }
}

export async function resumeBlockedFilingStageAction(
  jobId: string,
  nodeRunId: string,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.resumeBlockedFilingWorkflowStage(userId, orgId, jobId, nodeRunId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to resume the blocked filing stage" };
  }
}

export async function toggleFilingSection49Action(
  jobId: string,
  isEnabled: boolean,
  remarks?: string
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
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

export async function createFilingWorkflowQueryAction(
  jobId: string,
  nodeRunId: string,
  data: {
    title: string;
    details: string;
    reminderTime?: string;
  },
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.createFilingWorkflowQuery(userId, orgId, jobId, nodeRunId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create filing query" };
  }
}

export async function updateFilingWorkflowQueryStatusAction(
  jobId: string,
  queryId: string,
  data: {
    status: "OPEN" | "REPLIED" | "CLOSED";
    details?: string;
  },
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.updateFilingWorkflowQueryStatus(userId, orgId, jobId, queryId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update filing query" };
  }
}

export async function addFilingWorkflowQueryCommentAction(
  jobId: string,
  queryId: string,
  data: {
    message: string;
  },
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.addFilingWorkflowQueryComment(userId, orgId, jobId, queryId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to post filing query update" };
  }
}

export async function upsertFilingWorkflowToggleStateAction(
  jobId: string,
  nodeRunId: string,
  data: {
    sectionKey: string;
    isEnabled: boolean;
    state?: Record<string, unknown> | null;
  },
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.upsertFilingWorkflowToggleState(userId, orgId, jobId, nodeRunId, data);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update filing workflow section state" };
  }
}

export async function uploadFilingAttachmentAction(
  jobId: string,
  nodeRunId: string,
  photoRequirementId: string | null,
  checklistItemId: string | null,
  documentRequirementKey: string | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
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
    const validityDateValue = formData.get("validityDate");
    const validityDate =
      typeof validityDateValue === "string" && validityDateValue.trim().length > 0
        ? new Date(validityDateValue)
        : null;
    const attachment = await chaService.uploadFilingAttachment(
      userId,
      orgId,
      jobId,
      nodeRunId,
      photoRequirementId,
      checklistItemId,
      documentRequirementKey,
      fileData,
      buffer,
      validityDate
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
    const { userId, orgId } = await getAuthAndVerify();
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
    const { userId, orgId } = await getAuthAndVerify();
    const result = await chaService.deleteFilingAttachment(userId, orgId, jobId, attachmentId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete filing attachment" };
  }
}

export async function acceptCustomerDocumentSubmissionAction(
  jobId: string,
  requirementId: string,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify("cha.document.upload");
    const result = await chaService.acceptCustomerDocumentSubmission(userId, orgId, jobId, requirementId);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to accept customer document submission" };
  }
}

export async function updateFilingAttachmentValidityAction(
  jobId: string,
  attachmentId: string,
  validityDate: string | null,
): Promise<ActionResponse> {
  try {
    const { userId, orgId } = await getAuthAndVerify();
    const parsedValidityDate =
      typeof validityDate === "string" && validityDate.trim().length > 0
        ? new Date(validityDate)
        : null;
    const result = await chaService.updateFilingAttachmentValidity(userId, orgId, jobId, attachmentId, parsedValidityDate);
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update filing attachment validity date" };
  }
}


