import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { createNotification, getUsersWithPermission, recordNotificationActivity } from "@/modules/notifications/service";
import * as XLSX from "xlsx";
import { Prisma } from "@/generated/prisma/client";
import { can, ForbiddenError } from "@/lib/rbac";
import * as driveClient from "@/lib/google-drive-client";
import * as googleChatClient from "@/lib/google-chat-client";
import { ensureJobCategoryFolder } from "@/lib/workspace-provisioning";
import { getValidAccessToken } from "@/lib/workspace-oauth";
import { createDraft as createGmailDraft } from "@/lib/google-gmail-client";
import { queueChecklistMainCustomerEmail } from "./checklist-email-automation";

const DEFAULT_CHA_EXPENSE_CATEGORIES = [
  "Customs Duty",
  "Port Handling Charges",
  "Transportation",
  "Documentation charges",
  "Agent Commission",
  "Storage Fees",
  "Miscellaneous",
];

const DEFAULT_CHA_JOB_CREATOR_ROLES = ["Admin", "HR", "Manager", "Employee"];
const DEFAULT_CHA_SHIPMENT_TYPES = ["Air", "Sea"];
const DEFAULT_IMPORT_MANIFEST_HELP = "Enter the Import General Manifest number.";
const DEFAULT_EXPORT_MANIFEST_HELP = "Enter the Export General Manifest number.";
const LEGACY_MANIFEST_REQUIREMENT: ChaManifestRequirement = "BOTH";
const FILING_WORKFLOW_NOTIFICATION_KIND = "CHA_FILING_WORKFLOW_NODE";
const DEFAULT_CUSTOMER_APPROVAL_DELAY_MINUTES = 1;
const DEFAULT_QUERY_REMINDER_TIME = "10:30";

type FilingFieldDefinition = {
  key: string;
  label: string;
  type?: string | null;
  required?: boolean;
  placeholder?: string | null;
  options?: Array<{ label: string; value: string }>;
  helperText?: string | null;
  defaultValue?: unknown;
};

type FilingDocumentRequirementConfig = {
  key: string;
  label: string;
  required?: boolean;
  acceptedFileTypes?: string[];
  maxFileSizeMb?: number | null;
  multiple?: boolean;
  allowReplacement?: boolean;
  allowPreview?: boolean;
  approvalRequired?: boolean;
  visibleWhen?: { sectionKey?: string; equals?: boolean } | null;
  requiresValidity?: boolean;
  reminderOffsetDays?: number | null;
  reminderKind?: string | null;
};

type FilingConditionalSectionConfig = {
  key: string;
  label: string;
  type?: string | null;
  defaultEnabled?: boolean;
  unlocksDocuments?: FilingDocumentRequirementConfig[];
  unlocksFields?: FilingFieldDefinition[];
  config?: Record<string, unknown> | null;
};

type ChaMovementDirection = "IMPORT" | "EXPORT" | "BOTH" | "OTHER";
type ChaManifestRequirement = "IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM";

type ChaJobTypeManifestConfigInput = {
  name: string;
  movementDirection: ChaMovementDirection;
  manifestRequirement: ChaManifestRequirement;
  customManifestLabel?: string | null;
  isManifestMandatory: boolean;
  manifestHelpText?: string | null;
  isActive?: boolean;
  filingFlowCategory?: string | null;
};

type ChaManifestSchemaState = {
  jobTypeManifestConfig: boolean;
  customManifestValue: boolean;
};

type CompatibleChaJobType = {
  id: string;
  orgId: string;
  name: string;
  movementDirection: ChaMovementDirection | null;
  manifestRequirement: ChaManifestRequirement | null;
  customManifestLabel: string | null;
  isManifestMandatory: boolean;
  manifestHelpText: string | null;
  isActive: boolean;
  filingFlowCategory: string | null;
};

type CompatibleAdditionalData = {
  id?: string;
  jobId?: string;
  vesselInwardDate: Date | null;
  importGeneralManifest: string | null;
  exportGeneralManifest: string | null;
  customManifestValue: string | null;
  containerDetails?: Prisma.JsonValue | null;
  mblNumber?: string | null;
  hblNumber?: string | null;
  deliveryOrderValidity: Date | null;
  status?: string | null;
  createdById?: string | null;
  updatedById?: string | null;
  completedById?: string | null;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

// Migration 20260625143000 is permanently applied — columns always present.
const chaManifestSchemaStatePromise: Promise<ChaManifestSchemaState> = Promise.resolve({
  jobTypeManifestConfig: true,
  customManifestValue: true,
});

type DefaultDocumentRequirementItemSeed = {
  name: string;
  sortOrder: number;
  isRequiredDefault: boolean;
  acceptedFileTypes?: string[];
  minUploadCount?: number;
  maxUploadCount?: number | null;
  requiresValidityDate?: boolean;
  defaultValidityDuration?: number | null;
  defaultValidityUnit?: string | null;
  warningBeforeDuration?: number | null;
  warningBeforeUnit?: string | null;
  notifyBeforeExpiry?: boolean;
  notificationRoles?: string[];
  showInJobDocuments?: boolean;
  showInTimeline?: boolean;
};

type DefaultDocumentRequirementCategorySeed = {
  category: string;
  sortOrder: number;
  items: DefaultDocumentRequirementItemSeed[];
};

export const DEFAULT_DOCUMENT_REQUIREMENTS: DefaultDocumentRequirementCategorySeed[] = [
  {
    category: "Documents Required From Supplier",
    sortOrder: 1,
    items: [
      { name: "Invoice", sortOrder: 1, isRequiredDefault: true },
      { name: "Packing List", sortOrder: 2, isRequiredDefault: true },
      { name: "Bill of Landing", sortOrder: 3, isRequiredDefault: true },
      { name: "ASEAN Certificate", sortOrder: 4, isRequiredDefault: false },
      { name: "Country of Origin", sortOrder: 5, isRequiredDefault: false },
      { name: "Phytosanitary Certificate", sortOrder: 6, isRequiredDefault: false },
      { name: "Fumigation Certificate", sortOrder: 7, isRequiredDefault: false },
      { name: "Label", sortOrder: 8, isRequiredDefault: false },
      { name: "Certificate of Analysis", sortOrder: 9, isRequiredDefault: false },
    ],
  },
  {
    category: "KYC For Customers",
    sortOrder: 2,
    items: [
      { name: "IEC", sortOrder: 1, isRequiredDefault: true },
      { name: "GST", sortOrder: 2, isRequiredDefault: true },
      { name: "AD Code", sortOrder: 3, isRequiredDefault: true },
      { name: "FSSAI Licence", sortOrder: 4, isRequiredDefault: false },
      { name: "Company Address Proof", sortOrder: 5, isRequiredDefault: false },
      { name: "Partner / Proprietor Address Proof", sortOrder: 6, isRequiredDefault: false },
      { name: "Authorisation Letter", sortOrder: 7, isRequiredDefault: false },
    ],
  },
  {
    category: "Customs Validity Documents",
    sortOrder: 3,
    items: [
      {
        name: "Section 49",
        sortOrder: 1,
        isRequiredDefault: false,
        acceptedFileTypes: ["application/pdf"],
        minUploadCount: 1,
        maxUploadCount: 1,
        requiresValidityDate: false,
        defaultValidityDuration: 4,
        defaultValidityUnit: "CALENDAR_DAYS",
        warningBeforeDuration: 1,
        warningBeforeUnit: "CALENDAR_DAYS",
        notifyBeforeExpiry: true,
        showInTimeline: true,
      },
      {
        name: "Extension",
        sortOrder: 2,
        isRequiredDefault: false,
        acceptedFileTypes: ["application/pdf"],
        minUploadCount: 1,
        maxUploadCount: 1,
        requiresValidityDate: true,
        defaultValidityDuration: null,
        defaultValidityUnit: null,
        warningBeforeDuration: 1,
        warningBeforeUnit: "CALENDAR_DAYS",
        notifyBeforeExpiry: true,
        showInTimeline: true,
      },
    ],
  },
];

export async function ensureDefaultDocumentRequirements(orgId: string, tx: any = db) {
  for (const cat of DEFAULT_DOCUMENT_REQUIREMENTS) {
    const dbCat = await tx.chaDocumentRequirementCategory.upsert({
      where: { orgId_name: { orgId, name: cat.category } },
      update: {},
      create: {
        orgId,
        name: cat.category,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });

    for (const item of cat.items) {
      await tx.chaDocumentRequirementItem.upsert({
        where: { categoryId_name: { categoryId: dbCat.id, name: item.name } },
        update: {
          sortOrder: item.sortOrder,
          isRequiredDefault: item.isRequiredDefault,
          acceptedFileTypes: item.acceptedFileTypes ?? [],
          minUploadCount: item.minUploadCount ?? 1,
          maxUploadCount: item.maxUploadCount ?? null,
          requiresValidityDate: item.requiresValidityDate ?? false,
          defaultValidityDuration: item.defaultValidityDuration ?? null,
          defaultValidityUnit: item.defaultValidityUnit ?? null,
          warningBeforeDuration: item.warningBeforeDuration ?? null,
          warningBeforeUnit: item.warningBeforeUnit ?? null,
          notifyBeforeExpiry: item.notifyBeforeExpiry ?? false,
          notificationRoles: item.notificationRoles ?? [],
          showInJobDocuments: item.showInJobDocuments ?? true,
          showInTimeline: item.showInTimeline ?? false,
          isActive: true,
        },
        create: {
          categoryId: dbCat.id,
          name: item.name,
          sortOrder: item.sortOrder,
          isRequiredDefault: item.isRequiredDefault,
          acceptedFileTypes: item.acceptedFileTypes ?? [],
          minUploadCount: item.minUploadCount ?? 1,
          maxUploadCount: item.maxUploadCount ?? null,
          requiresValidityDate: item.requiresValidityDate ?? false,
          defaultValidityDuration: item.defaultValidityDuration ?? null,
          defaultValidityUnit: item.defaultValidityUnit ?? null,
          warningBeforeDuration: item.warningBeforeDuration ?? null,
          warningBeforeUnit: item.warningBeforeUnit ?? null,
          notifyBeforeExpiry: item.notifyBeforeExpiry ?? false,
          notificationRoles: item.notificationRoles ?? [],
          showInJobDocuments: item.showInJobDocuments ?? true,
          showInTimeline: item.showInTimeline ?? false,
          isActive: true,
        },
      });
    }
  }
}

function parseStringArray(value: Prisma.JsonValue | null | undefined, fallback: string[] = []) {
  if (!value) return fallback;
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseAuditMetadata(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

const FILING_QUERY_ACTIVITY_EVENTS = [
  "FILING_QUERY_CREATED",
  "FILING_QUERY_UPDATED",
  "FILING_QUERY_COMMENT_ADDED",
  "FILING_QUERY_CLOSED",
] as const;

type FilingQueryActivityEvent = typeof FILING_QUERY_ACTIVITY_EVENTS[number];
const CHECKLIST_DOCUMENT_CATEGORY = "Checklist Files";

function getFileExtension(fileName: string) {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf(".");
  return dotIndex > 0 ? trimmed.slice(dotIndex) : "";
}

function buildDriveStoredFileName(label: string, originalFileName: string) {
  const sanitizedLabel = label.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Document";
  const extension = getFileExtension(originalFileName);
  if (!extension) {
    return sanitizedLabel;
  }
  return sanitizedLabel.toLowerCase().endsWith(extension.toLowerCase())
    ? sanitizedLabel
    : `${sanitizedLabel}${extension}`;
}

async function resolveJobDriveUploadAccessToken(primaryOwnerId: string, actorId: string) {
  const preferredConnection = await db.googleWorkspaceConnection.findUnique({
    where: { userId: actorId },
    select: { userId: true, status: true, scopes: true },
  });
  if (
    preferredConnection?.status === "connected" &&
    (preferredConnection.scopes.includes("https://www.googleapis.com/auth/drive")
      || preferredConnection.scopes.includes("https://www.googleapis.com/auth/drive.file"))
  ) {
    return getValidAccessToken(actorId).catch(() => undefined);
  }

  if (primaryOwnerId !== actorId) {
    const ownerConnection = await db.googleWorkspaceConnection.findUnique({
      where: { userId: primaryOwnerId },
      select: { userId: true, status: true, scopes: true },
    });
    if (
      ownerConnection?.status === "connected" &&
      (ownerConnection.scopes.includes("https://www.googleapis.com/auth/drive")
        || ownerConnection.scopes.includes("https://www.googleapis.com/auth/drive.file"))
    ) {
      return getValidAccessToken(primaryOwnerId).catch(() => undefined);
    }
  }

  return undefined;
}

async function deleteChaJobDriveWorkspace(params: {
  jobId: string;
  jobNumber: string;
  orgId: string;
  primaryOwnerId: string;
  actorId: string;
}) {
  const profile = await db.jobWorkspaceProfile.findUnique({
    where: { jobId: params.jobId },
    select: { rootFolderId: true },
  });

  const rootFolderId = profile?.rootFolderId;
  if (!rootFolderId || rootFolderId.startsWith("mock-")) {
    return { rootFolderId: rootFolderId || null, outcome: "skipped" as const };
  }

  const driveAccessToken = await resolveJobDriveUploadAccessToken(params.primaryOwnerId, params.actorId);
  if (!driveAccessToken) {
    throw new Error(
      `Google Drive folder deletion could not be completed for job ${params.jobNumber} because no connected Drive account with delete access was available.`,
    );
  }

  const outcome = await driveClient.deleteFileOrFolder(rootFolderId, driveAccessToken);
  return { rootFolderId, outcome };
}

async function deleteChaJobChatWorkspace(params: {
  jobId: string;
  actorId: string;
}) {
  const profile = await db.jobWorkspaceProfile.findUnique({
    where: { jobId: params.jobId },
    select: { googleSpaceId: true },
  });

  const googleSpaceId = profile?.googleSpaceId;
  if (!googleSpaceId || googleSpaceId.startsWith("spaces/mock-")) {
    return { googleSpaceId: googleSpaceId || null, outcome: "skipped" as const };
  }

  try {
    const actorConnection = await db.googleWorkspaceConnection.findUnique({
      where: { userId: params.actorId },
      select: { scopes: true, status: true },
    });
    const hasAdminDeleteScope =
      actorConnection?.status === "connected" &&
      actorConnection.scopes.includes("https://www.googleapis.com/auth/chat.admin.delete");

    if (!hasAdminDeleteScope) {
      return {
        googleSpaceId,
        outcome: "admin_scope_missing" as const,
        error: "The deleting admin must reconnect Google Workspace with the chat.admin.delete scope.",
      };
    }

    await googleChatClient.deleteSpaceWithAdminAccess({
      spaceResourceName: googleSpaceId,
      userId: params.actorId,
    });
    return { googleSpaceId, outcome: "deleted" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("manage chat and spaces conversations privilege")) {
      return {
        googleSpaceId,
        outcome: "admin_scope_missing" as const,
        error: "The deleting user must be a Google Workspace admin with the manage chat and spaces conversations privilege.",
      };
    }
    if (message.includes("insufficient_scope") || message.includes("chat.admin.delete")) {
      return {
        googleSpaceId,
        outcome: "admin_scope_missing" as const,
        error: "The deleting admin must reconnect Google Workspace with the chat.admin.delete scope.",
      };
    }

    throw error;
  }
}

async function deleteChaJobWorkspace(params: {
  jobId: string;
  jobNumber: string;
  orgId: string;
  primaryOwnerId: string;
  actorId: string;
}) {
  const [driveDeletion, chatDeletion] = await Promise.all([
    deleteChaJobDriveWorkspace(params),
    deleteChaJobChatWorkspace({ jobId: params.jobId, actorId: params.actorId }),
  ]);

  await db.jobWorkspaceProfile.updateMany({
    where: { jobId: params.jobId },
    data: {
      rootFolderId: driveDeletion.outcome === "deleted" || driveDeletion.outcome === "missing" ? null : undefined,
      categoryFolders: driveDeletion.outcome === "deleted" || driveDeletion.outcome === "missing" ? Prisma.JsonNull : undefined,
      googleSpaceId: chatDeletion.outcome === "deleted" ? null : undefined,
      googleSpaceUrl: chatDeletion.outcome === "deleted" ? null : undefined,
    },
  });

  return { driveDeletion, chatDeletion };
}

function getChaManifestSchemaState() {
  return chaManifestSchemaStatePromise;
}

function getChaJobTypeSelect(includeManifestConfig: boolean): Prisma.ChaJobTypeSelect {
  return includeManifestConfig
    ? {
        id: true,
        orgId: true,
        name: true,
        movementDirection: true,
        manifestRequirement: true,
        customManifestLabel: true,
        isManifestMandatory: true,
        manifestHelpText: true,
        isActive: true,
        filingFlowCategory: true,
      }
    : {
        id: true,
        orgId: true,
        name: true,
        filingFlowCategory: true,
      };
}

function normalizeCompatibleJobType(
  jobType: { id: string; orgId: string; name: string } & Partial<CompatibleChaJobType>,
  hasManifestConfigColumns: boolean,
): CompatibleChaJobType {
  if (hasManifestConfigColumns) {
    return {
      id: jobType.id,
      orgId: jobType.orgId,
      name: jobType.name,
      movementDirection: jobType.movementDirection ?? null,
      manifestRequirement: jobType.manifestRequirement ?? null,
      customManifestLabel: jobType.customManifestLabel ?? null,
      isManifestMandatory: jobType.isManifestMandatory ?? false,
      manifestHelpText: jobType.manifestHelpText ?? null,
      isActive: jobType.isActive ?? true,
      filingFlowCategory: jobType.filingFlowCategory ?? null,
    };
  }

  return {
    id: jobType.id,
    orgId: jobType.orgId,
    name: jobType.name,
    movementDirection: null,
    manifestRequirement: LEGACY_MANIFEST_REQUIREMENT,
    customManifestLabel: null,
    isManifestMandatory: true,
    manifestHelpText: null,
    isActive: true,
    filingFlowCategory: null,
  };
}

const DO_FLOW_ADDITIONAL_DATA_SELECT = {
  doUploadEnabled: true,
  doDocumentFileKey: true,
  doDocumentFileName: true,
  doDocumentUploadedAt: true,
  doDocumentUploadedById: true,
  doExtensionEnabled: true,
} satisfies Prisma.ChaJobAdditionalDataSelect;

function getAdditionalDataSelect(includeCustomManifestValue: boolean): Prisma.ChaJobAdditionalDataSelect {
  return includeCustomManifestValue
    ? {
        id: true,
        jobId: true,
        vesselInwardDate: true,
        importGeneralManifest: true,
        exportGeneralManifest: true,
        customManifestValue: true,
        containerDetails: true,
        mblNumber: true,
        hblNumber: true,
        deliveryOrderValidity: true,
        status: true,
        createdById: true,
        updatedById: true,
        completedById: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        ...DO_FLOW_ADDITIONAL_DATA_SELECT,
      }
    : {
        id: true,
        jobId: true,
        vesselInwardDate: true,
        importGeneralManifest: true,
        exportGeneralManifest: true,
        containerDetails: true,
        mblNumber: true,
        hblNumber: true,
        deliveryOrderValidity: true,
        status: true,
        createdById: true,
        updatedById: true,
        completedById: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        ...DO_FLOW_ADDITIONAL_DATA_SELECT,
      };
}

function normalizeCompatibleAdditionalData(
  additionalData: ({
    vesselInwardDate: Date | null;
    importGeneralManifest: string | null;
    exportGeneralManifest: string | null;
    deliveryOrderValidity: Date | null;
  } & Partial<CompatibleAdditionalData>) | null | undefined,
  hasCustomManifestValueColumn: boolean,
): CompatibleAdditionalData | null {
  if (!additionalData) {
    return null;
  }

  return {
    ...additionalData,
    customManifestValue: hasCustomManifestValueColumn ? additionalData.customManifestValue ?? null : null,
    containerDetails: additionalData.containerDetails ?? null,
    mblNumber: additionalData.mblNumber ?? null,
    hblNumber: additionalData.hblNumber ?? null,
  };
}

function sanitizeContainerDetails(
  value: Array<{ containerName?: string | null; containerNumber?: string | null }> | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (!value?.length) {
    return Prisma.DbNull;
  }

  const normalized = value
    .map((entry) => ({
      containerName: entry.containerName?.trim() || null,
      containerNumber: entry.containerNumber?.trim() || null,
    }))
    .filter((entry) => entry.containerName || entry.containerNumber);

  return normalized.length ? (normalized as Prisma.InputJsonValue) : Prisma.DbNull;
}

function getFinancialYearLabel(date: Date, format?: string | null) {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
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

function buildChaJobNumberPreview(rule: {
  prefix: string;
  suffix?: string | null;
  currentSequence: number;
  startingSequence: number;
  numberPadding: number;
  useFinancialYear: boolean;
  financialYearFormat?: string | null;
}) {
  const nextSequence = Math.max(rule.currentSequence + 1, rule.startingSequence, 1);
  const parts = [rule.prefix.trim()];
  if (rule.useFinancialYear) {
    parts.push(getFinancialYearLabel(new Date(), rule.financialYearFormat));
  }
  parts.push(String(nextSequence).padStart(Math.max(rule.numberPadding, 1), "0"));
  if (rule.suffix?.trim()) {
    parts.push(rule.suffix.trim());
  }
  return parts.filter(Boolean).join("-");
}

function buildChaJobNumberForSequence(rule: {
  prefix: string;
  suffix?: string | null;
  numberPadding: number;
  useFinancialYear: boolean;
  financialYearFormat?: string | null;
}, sequence: number) {
  const parts = [rule.prefix.trim()];
  if (rule.useFinancialYear) {
    parts.push(getFinancialYearLabel(new Date(), rule.financialYearFormat));
  }
  parts.push(String(sequence).padStart(Math.max(rule.numberPadding, 1), "0"));
  if (rule.suffix?.trim()) {
    parts.push(rule.suffix.trim());
  }
  return parts.filter(Boolean).join("-");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseChaJobNumberSequence(jobNumber: string, rule: {
  prefix: string;
  suffix?: string | null;
  useFinancialYear: boolean;
  financialYearFormat?: string | null;
}) {
  const financialYearPart = rule.useFinancialYear
    ? `-${escapeRegex(getFinancialYearLabel(new Date(), rule.financialYearFormat))}`
    : "";
  const suffixPart = rule.suffix?.trim()
    ? `-${escapeRegex(rule.suffix.trim())}`
    : "";
  const regex = new RegExp(
    `^${escapeRegex(rule.prefix.trim())}${financialYearPart}-(\\d+)${suffixPart}$`,
    "i",
  );
  const match = regex.exec(jobNumber.trim());
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1] || "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getNextAvailableChaJobNumber(
  client: Pick<Prisma.TransactionClient, "chaJob">,
  orgId: string,
  rule: {
    prefix: string;
    suffix?: string | null;
    currentSequence: number;
    startingSequence: number;
    numberPadding: number;
    useFinancialYear: boolean;
    financialYearFormat?: string | null;
  },
) {
  let sequence = Math.max(rule.currentSequence + 1, rule.startingSequence, 1);

  while (true) {
    const jobNumber = buildChaJobNumberForSequence(rule, sequence);
    const existingJob = await client.chaJob.findFirst({
      where: {
        orgId,
        jobNumber,
      },
      select: { id: true },
    });

    if (!existingJob) {
      return { sequence, jobNumber };
    }

    sequence += 1;
  }
}

export async function getNextChaJobNumberPreview(
  orgId: string,
  branchId: string,
) {
  const branchRule = await db.chaBranchNumberingRule.findFirst({
    where: {
      orgId,
      branchId,
    },
    select: {
      prefix: true,
      suffix: true,
      currentSequence: true,
      startingSequence: true,
      numberPadding: true,
      useFinancialYear: true,
      financialYearFormat: true,
      isActive: true,
    },
  });

  if (!branchRule || !branchRule.isActive) {
    return null;
  }

  const nextAvailable = await getNextAvailableChaJobNumber(db, orgId, branchRule);
  return nextAvailable.jobNumber;
}

async function ensureChaBranchNumberingRules(
  orgId: string,
  settings: { jobNumberPrefix: string | null; jobNumberNextNum: number | null },
) {
  const branches = await db.branch.findMany({
    where: { orgId },
    select: {
      id: true,
      code: true,
      chaJobs: { select: { id: true } },
      chaBranchNumberingRule: {
        select: {
          id: true,
          currentSequence: true,
          startingSequence: true,
        },
      },
    },
  });

  for (const branch of branches) {
    if (branch.chaBranchNumberingRule) {
      const desiredStartingSequence = Math.max(branch.chaBranchNumberingRule.startingSequence, 1);
      const desiredCurrentSequence = Math.max(branch.chaBranchNumberingRule.currentSequence, branch.chaJobs.length);
      if (
        desiredStartingSequence !== branch.chaBranchNumberingRule.startingSequence ||
        desiredCurrentSequence !== branch.chaBranchNumberingRule.currentSequence
      ) {
        await db.chaBranchNumberingRule.update({
          where: { id: branch.chaBranchNumberingRule.id },
          data: {
            startingSequence: desiredStartingSequence,
            currentSequence: desiredCurrentSequence,
          },
        });
      }
      continue;
    }

    const basePrefix = settings.jobNumberPrefix?.trim() || "CHA";
    const safeCode = branch.code.trim().toUpperCase();
    const existingCount = branch.chaJobs.length;
    const nextSequence = Math.max(settings.jobNumberNextNum || 1, existingCount + 1, 1);

    await db.chaBranchNumberingRule.create({
      data: {
        orgId,
        branchId: branch.id,
        prefix: safeCode ? `${basePrefix}-${safeCode}` : basePrefix,
        startingSequence: nextSequence,
        currentSequence: Math.max(nextSequence - 1, existingCount),
        numberPadding: 4,
        useFinancialYear: false,
        isActive: true,
      },
    });
  }
}

async function ensureChaShipmentTypes(orgId: string) {
  for (const name of DEFAULT_CHA_SHIPMENT_TYPES) {
    await db.chaShipmentType.upsert({
      where: { orgId_name: { orgId, name } },
      update: { isActive: true },
      create: { orgId, name, isActive: true },
    });
  }
}

// Ensure settings and defaults are created for the organisation
export async function ensureSettingsAndDefaults(orgId: string) {
  const manifestSchema = await getChaManifestSchemaState();
  let settings = await db.chaSettings.findUnique({
    where: { orgId },
  });

  if (!settings) {
    settings = await db.chaSettings.create({
      data: {
        orgId,
        jobCreatorRoles: DEFAULT_CHA_JOB_CREATOR_ROLES,
        jobCreatorUsers: [],
        selfApprovalAllowed: true,
        managerApprovalPolicy: "ANY", // ANY | ALL
        expenseCategories: DEFAULT_CHA_EXPENSE_CATEGORIES,
        jobNumberPrefix: "CHA",
        jobNumberNextNum: 1,
      },
    });

    // Create default Job Types
    const importType = await db.chaJobType.upsert({
      where: { orgId_name: { orgId, name: "Import Clearance" } },
      update: manifestSchema.jobTypeManifestConfig
        ? {
            movementDirection: "IMPORT",
            manifestRequirement: "IGM",
            isManifestMandatory: true,
            manifestHelpText: DEFAULT_IMPORT_MANIFEST_HELP,
            isActive: true,
          }
        : {},
      create: {
        orgId,
        name: "Import Clearance",
        ...(manifestSchema.jobTypeManifestConfig
          ? {
              movementDirection: "IMPORT",
              manifestRequirement: "IGM",
              isManifestMandatory: true,
              manifestHelpText: DEFAULT_IMPORT_MANIFEST_HELP,
              isActive: true,
            }
          : {}),
      },
    });

    const exportType = await db.chaJobType.upsert({
      where: { orgId_name: { orgId, name: "Export Clearance" } },
      update: manifestSchema.jobTypeManifestConfig
        ? {
            movementDirection: "EXPORT",
            manifestRequirement: "EGM",
            isManifestMandatory: true,
            manifestHelpText: DEFAULT_EXPORT_MANIFEST_HELP,
            isActive: true,
          }
        : {},
      create: {
        orgId,
        name: "Export Clearance",
        ...(manifestSchema.jobTypeManifestConfig
          ? {
              movementDirection: "EXPORT",
              manifestRequirement: "EGM",
              isManifestMandatory: true,
              manifestHelpText: DEFAULT_EXPORT_MANIFEST_HELP,
              isActive: true,
            }
          : {}),
      },
    });

    // Create default document definitions for Import
    const importDefsCount = await db.chaDocumentDefinition.count({ where: { jobTypeId: importType.id } });
    if (importDefsCount === 0) {
      await db.chaDocumentDefinition.createMany({
        data: [
          { jobTypeId: importType.id, name: "Bill of Lading", category: "Commercial", isMandatory: true },
          { jobTypeId: importType.id, name: "Commercial Invoice", category: "Financial", isMandatory: true },
          { jobTypeId: importType.id, name: "Packing List", category: "Logistics", isMandatory: true },
          { jobTypeId: importType.id, name: "Certificate of Origin", category: "Compliance", isMandatory: false },
        ],
      });
    }

    // Create default document definitions for Export
    const exportDefsCount = await db.chaDocumentDefinition.count({ where: { jobTypeId: exportType.id } });
    if (exportDefsCount === 0) {
      await db.chaDocumentDefinition.createMany({
        data: [
          { jobTypeId: exportType.id, name: "Shipping Bill", category: "Commercial", isMandatory: true },
          { jobTypeId: exportType.id, name: "Commercial Invoice", category: "Financial", isMandatory: true },
          { jobTypeId: exportType.id, name: "Packing List", category: "Logistics", isMandatory: true },
          { jobTypeId: exportType.id, name: "Export License", category: "Compliance", isMandatory: false },
        ],
      });
    }
  }

  // Optimized: check in parallel if the dependent defaults exist before calling full setups.
  const [shipmentTypesCount, numberingRulesCount, branchesCount, docReqCategoriesCount] = await Promise.all([
    db.chaShipmentType.count({ where: { orgId } }),
    db.chaBranchNumberingRule.count({ where: { orgId } }),
    db.branch.count({ where: { orgId } }),
    db.chaDocumentRequirementCategory.count({ where: { orgId } }),
  ]);

  if (shipmentTypesCount === 0) {
    await ensureChaShipmentTypes(orgId);
  }
  if (numberingRulesCount < branchesCount) {
    await ensureChaBranchNumberingRules(orgId, settings);
  }
  if (docReqCategoriesCount === 0) {
    await ensureDefaultDocumentRequirements(orgId);
  }

  if (manifestSchema.jobTypeManifestConfig) {
    await db.chaJobType.updateMany({
      where: {
        orgId,
        name: "Import Clearance",
        OR: [{ movementDirection: null }, { manifestRequirement: null }],
      },
      data: {
        movementDirection: "IMPORT",
        manifestRequirement: "IGM",
        isManifestMandatory: true,
        manifestHelpText: DEFAULT_IMPORT_MANIFEST_HELP,
        isActive: true,
      },
    });

    await db.chaJobType.updateMany({
      where: {
        orgId,
        name: "Export Clearance",
        OR: [{ movementDirection: null }, { manifestRequirement: null }],
      },
      data: {
        movementDirection: "EXPORT",
        manifestRequirement: "EGM",
        isManifestMandatory: true,
        manifestHelpText: DEFAULT_EXPORT_MANIFEST_HELP,
        isActive: true,
      },
    });
  }

  await ensureDefaultFilingWorkflows(orgId);

  return settings;
}

// Log a CHA audit event helper
export async function logChaAudit(params: {
  orgId: string;
  jobId?: string;
  entityType: string;
  entityId: string;
  event: string;
  actorId: string;
  prevState?: string;
  newState?: string;
  remarks?: string;
  metadata?: any;
}) {
  return db.chaAuditLog.create({
    data: {
      orgId: params.orgId,
      jobId: params.jobId,
      entityType: params.entityType,
      entityId: params.entityId,
      event: params.event,
      actorId: params.actorId,
      prevState: params.prevState,
      newState: params.newState,
      remarks: params.remarks,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    },
  });
}

const CHA_DELETE_CONFIRMATION_PHRASE = "delete job";

function normalizeDeleteConfirmationPhrase(value: string) {
  return value.trim().toLowerCase();
}

function getActiveChaJobWhere(orgId: string): Prisma.ChaJobWhereInput {
  return {
    orgId,
    deletedAt: null,
  };
}

function getActiveChaJobByIdWhere(orgId: string, jobId: string): Prisma.ChaJobWhereInput {
  return { id: jobId, ...getActiveChaJobWhere(orgId) };
}

function isAdditionalDataComplete(data: {
  vesselInwardDate: Date | null;
  importGeneralManifest: string | null;
  exportGeneralManifest: string | null;
  customManifestValue?: string | null;
  deliveryOrderValidity: Date | null;
} | null | undefined, manifestConfig?: { manifestRequirement: ChaManifestRequirement; isManifestMandatory: boolean } | null) {
  const hasBaseFields = Boolean(data?.vesselInwardDate && data.deliveryOrderValidity);
  if (!hasBaseFields) return false;
  if (!data) return false;

  if (!manifestConfig || !manifestConfig.isManifestMandatory) {
    return hasBaseFields;
  }

  switch (manifestConfig.manifestRequirement) {
    case "IGM":
      return Boolean(data.importGeneralManifest?.trim());
    case "EGM":
      return Boolean(data.exportGeneralManifest?.trim());
    case "BOTH":
      return Boolean(data.importGeneralManifest?.trim() && data.exportGeneralManifest?.trim());
    case "CUSTOM":
      return Boolean(data.customManifestValue?.trim());
    case "NONE":
    default:
      return true;
  }
}

async function assertCanAccessAdditionalData(actorId: string, job: {
  primaryOwnerId: string;
  assignments: { userId: string }[];
}, permissionKey: string) {
  const isConcernedUser = job.primaryOwnerId === actorId || job.assignments.some((assignment) => assignment.userId === actorId);
  const hasPermission = await can(actorId, permissionKey);
  const hasViewAll = await can(actorId, "cha.job.view_all");
  if (!isConcernedUser && !hasPermission && !hasViewAll) {
    throw new ForbiddenError(permissionKey);
  }
}

async function assertCanAccessChecklist(actorId: string, job: {
  primaryOwnerId: string;
  assignments: { userId: string }[];
}, permissionKey: string) {
  const isConcernedUser = job.primaryOwnerId === actorId || job.assignments.some((assignment) => assignment.userId === actorId);
  const hasPermission = await can(actorId, permissionKey);
  const hasViewAll = await can(actorId, "cha.job.view_all");
  if (!isConcernedUser && !hasPermission && !hasViewAll) {
    throw new ForbiddenError(permissionKey);
  }
}

async function assertCanAccessFiling(actorId: string, job: {
  id?: string;
  primaryOwnerId?: string | null;
  assignedManagerId?: string | null;
  assignments: { userId: string }[];
}, permissionKey = "cha.filing.manage") {
  const concernedUserIds = new Set<string>();

  if (job.primaryOwnerId) {
    concernedUserIds.add(job.primaryOwnerId);
  }

  if (job.assignedManagerId) {
    concernedUserIds.add(job.assignedManagerId);
  }

  for (const assignment of job.assignments) {
    if (assignment.userId) {
      concernedUserIds.add(assignment.userId);
    }
  }

  const hasPermission =
    (await can(actorId, permissionKey)) ||
    (await can(actorId, "cha.job.update")) ||
    (await can(actorId, "cha.job.view_all"));

  if (!concernedUserIds.has(actorId) && !hasPermission) {
    throw new ForbiddenError(permissionKey);
  }
}

async function getChecklistConcernedUserIds(job: {
  id?: string;
  primaryOwnerId?: string;
  assignedManagerId?: string | null;
  assignments: { userId: string; responsibility?: string | null }[];
}) {
  const concernedUserIds = new Set<string>();

  if (job.primaryOwnerId) {
    concernedUserIds.add(job.primaryOwnerId);
  }

  if (job.assignedManagerId) {
    concernedUserIds.add(job.assignedManagerId);
  }

  for (const assignment of job.assignments) {
    if (assignment.userId) {
      concernedUserIds.add(assignment.userId);
    }
  }

  let primaryOwnerId = job.primaryOwnerId;
  if (!primaryOwnerId && job.id) {
    const jobRecord = await db.chaJob.findUnique({
      where: { id: job.id },
      select: { primaryOwnerId: true },
    });
    primaryOwnerId = jobRecord?.primaryOwnerId;
    if (primaryOwnerId) {
      concernedUserIds.add(primaryOwnerId);
    }
  }

  if (primaryOwnerId) {
    const owner = await db.user.findUnique({
      where: { id: primaryOwnerId },
      select: { managerId: true, tlId: true },
    });
    if (owner?.managerId) concernedUserIds.add(owner.managerId);
    if (owner?.tlId) concernedUserIds.add(owner.tlId);
  }

  return Array.from(concernedUserIds);
}

export async function getChecklistInternalApproverIds(_orgId: string, job: {
  id?: string;
  primaryOwnerId?: string;
  assignedManagerId?: string | null;
  assignments: { userId: string; responsibility: string }[];
}) {
  const internalApproverIds = new Set<string>();
  const ownerManagerIds: string[] = [];
  const ownerTlIds: string[] = [];

  let primaryOwnerId = job.primaryOwnerId;
  let assignedManagerId = job.assignedManagerId;

  if ((!primaryOwnerId || assignedManagerId === undefined) && job.id) {
    const jobRecord = await db.chaJob.findUnique({
      where: { id: job.id },
      select: { primaryOwnerId: true, assignedManagerId: true },
    });
    if (!primaryOwnerId) primaryOwnerId = jobRecord?.primaryOwnerId;
    if (assignedManagerId === undefined) assignedManagerId = jobRecord?.assignedManagerId;
  }

  if (assignedManagerId) {
    ownerManagerIds.push(assignedManagerId);
  }

  if (primaryOwnerId) {
    internalApproverIds.add(primaryOwnerId);
    const owner = await db.user.findUnique({
      where: { id: primaryOwnerId },
      select: { managerId: true, tlId: true },
    });
    if (owner?.managerId) ownerManagerIds.push(owner.managerId);
    if (owner?.tlId) ownerTlIds.push(owner.tlId);
  }

  for (const approverId of [...ownerManagerIds, ...ownerTlIds]) {
    if (approverId) {
      internalApproverIds.add(approverId);
    }
  }

  return Array.from(internalApproverIds);
}

async function getChecklistCustomerApproverIds(job: {
  id?: string;
  primaryOwnerId?: string;
  assignedManagerId?: string | null;
  assignments: { userId: string; responsibility?: string | null }[];
}) {
  return getChecklistConcernedUserIds(job);
}

async function getChecklistCustomerApprovalDelayMinutesForJob(orgId: string, jobTypeId: string | null | undefined) {
  const activeVersion = await findActivePublishedFilingWorkflowVersionForJob(orgId, jobTypeId ?? null);
  const settings = normalizeTemplateSettings(activeVersion?.template?.settingsJson ?? null);
  return settings.customerApprovalTabDelayMinutes;
}

async function getChecklistCustomerMailRecipients(customerId: string) {
  const customer = await db.crmAccount.findUnique({
    where: { id: customerId },
    include: {
      contacts: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!customer) {
    return [];
  }

  const purposeRank = (purpose: string | null | undefined) => {
    const normalized = (purpose || "").trim().toLowerCase();
    if (normalized === "approval") return 0;
    if (normalized === "operations") return 1;
    if (normalized === "billing") return 2;
    return 3;
  };

  const contacts = [...customer.contacts]
    .filter((contact) => typeof contact.email === "string" && contact.email.trim().length > 0)
    .sort((left, right) => {
      if ((left.isPrimary ? 1 : 0) !== (right.isPrimary ? 1 : 0)) {
        return left.isPrimary ? -1 : 1;
      }
      return purposeRank(left.purpose) - purposeRank(right.purpose);
    });

  if (contacts.length > 0) {
    return contacts.map((contact) => ({
      email: contact.email!.trim(),
      name: [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || customer.name,
      purpose: contact.purpose || null,
      isPrimary: contact.isPrimary,
    }));
  }

  if (customer.email?.trim()) {
    return [{
      email: customer.email.trim(),
      name: customer.name,
      purpose: "approval",
      isPrimary: true,
    }];
  }

  return [];
}

async function queueChecklistMainAutomationForJob(params: {
  actorId: string;
  orgId: string;
  job: {
    id: string;
    jobNumber: string;
    jobTypeId?: string | null;
    customerId: string;
    customerRef?: string | null;
    customer?: { name: string | null } | null;
  };
  checklist: {
    id: string;
    currentFileVersionId: string | null;
    currentFileVersion?: {
      id: string;
      originalFileName: string;
      versionNumber: number;
    } | null;
  };
}) {
  if (!params.checklist.currentFileVersionId || !params.checklist.currentFileVersion) {
    return {
      queued: false,
      warning: "Checklist saved, but customer email was not queued because no current checklist file is available.",
    };
  }

  const recipients = await getChecklistCustomerMailRecipients(params.job.customerId);
  const primaryRecipient = recipients[0] ?? null;
  if (!primaryRecipient?.email) {
    return {
      queued: false,
      warning: "Checklist saved, but customer email was not queued because no customer email is available.",
    };
  }

  const delayMinutes = await getChecklistCustomerApprovalDelayMinutesForJob(params.orgId, params.job.jobTypeId);
  const queuedAt = await getNow();
  const approvalVisibleAt = new Date(queuedAt.getTime() + delayMinutes * 60_000);
  const checklistUrlBase = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? null;
  const checklistUrl = checklistUrlBase ? `${checklistUrlBase}/cha/jobs/${params.job.id}` : null;
  const queueResult = await queueChecklistMainCustomerEmail({
    actorId: params.actorId,
    jobId: params.job.id,
    jobNumber: params.job.jobNumber,
    checklistId: params.checklist.id,
    fileVersionId: params.checklist.currentFileVersionId,
    customerId: params.job.customerId,
    customerName: params.job.customer?.name?.trim() || primaryRecipient.name || "Customer",
    customerReference: params.job.customerRef ?? null,
    recipientEmail: primaryRecipient.email,
    recipientName: primaryRecipient.name,
    approvalVisibleAt,
    checklistFileName: params.checklist.currentFileVersion.originalFileName,
    checklistVersionLabel: `Version ${params.checklist.currentFileVersion.versionNumber}`,
    checklistSummary: [
      `Reference number: ${params.job.jobNumber}`,
      `Checklist title: Checklist Main`,
      `Checklist file: ${params.checklist.currentFileVersion.originalFileName}`,
      `Checklist version: ${params.checklist.currentFileVersion.versionNumber}`,
    ],
    checklistUrl,
  });

  if (queueResult.duplicate) {
    return {
      queued: false,
      warning: "Checklist saved, but customer email was already queued for this checklist version.",
    };
  }

  return {
    queued: queueResult.queued,
    warning: queueResult.queued ? null : "Checklist saved, but customer email could not be queued.",
  };
}

async function getChecklistApprovalActorSummary(actorId: string) {
  const actor = await db.user.findUnique({
    where: { id: actorId },
    include: {
      roles: {
        include: {
          role: { select: { name: true } },
        },
      },
    },
  });

  return {
    actorName: actor?.name || "Unknown User",
    actorRoles: actor ? getActorRoleNames(actor) : [],
  };
}

async function logChecklistApprovalAudit(params: {
  orgId: string;
  jobId: string;
  jobNumber: string;
  checklistId: string;
  actorId: string;
  approvalType: "CUSTOMER_APPROVAL" | "INTERNAL_APPROVAL";
  event: string;
  prevState: string;
  newState: string;
  source: string;
  remarks?: string;
}) {
  const actedAt = await getNow();
  const { actorName, actorRoles } = await getChecklistApprovalActorSummary(params.actorId);

  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaChecklist",
    entityId: params.checklistId,
    event: params.event,
    actorId: params.actorId,
    prevState: params.prevState,
    newState: params.newState,
    remarks: params.remarks,
    metadata: {
      jobNumber: params.jobNumber,
      checklistId: params.checklistId,
      approvalType: params.approvalType,
      approvedByUserId: params.actorId,
      approvedByUserName: actorName,
      userRole: actorRoles.join(", ") || "Unassigned",
      timestamp: actedAt.toISOString(),
      previousStatus: params.prevState,
      newStatus: params.newState,
      sourcePageAction: params.source,
    },
  });
}

async function queueChecklistNotifications(params: {
  userIds: string[];
  orgId: string;
  kind: string;
  title: string;
  body: string;
  link: string;
}) {
  for (const userId of Array.from(new Set(params.userIds)).filter(Boolean)) {
    await createNotification({
      userId,
      orgId: params.orgId,
      kind: params.kind,
      title: params.title,
      body: params.body,
      link: params.link,
      priority: "important",
      email: true,
      source: "CHA",
    });
  }
}

async function applyChecklistWorkflowToFiling(
  tx: Prisma.TransactionClient,
  params: {
    actorId: string;
    orgId: string;
    jobId: string;
    checklistId: string;
    checklistStatus: string;
    remarks: string;
  }
) {
  const checklist = await tx.chaChecklist.update({
    where: { id: params.checklistId },
    data: {
      status: params.checklistStatus,
      currentApprovalStage: "FILING",
      updatedById: params.actorId,
    },
  });

  await tx.chaJob.update({
    where: { id: params.jobId },
    data: { stage: "FILING" },
  });

  const filing = await tx.chaFiling.findUniqueOrThrow({ where: { jobId: params.jobId } });
  if (!filing.estimatedFilingDate) {
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 3);

    await tx.chaFiling.update({
      where: { jobId: params.jobId },
      data: { estimatedFilingDate: estDate },
    });

    await tx.chaFilingDateHistory.create({
      data: {
        filingId: filing.id,
        estimatedFilingDate: estDate,
        setById: params.actorId,
      },
    });
  }

  return checklist;
}

function getActorRoleNames(user: { roles?: { role: { name: string } }[]; isPlatformAdmin?: boolean }) {
  const roleNames = user.roles?.map((entry) => entry.role.name) ?? [];
  if (user.isPlatformAdmin) roleNames.push("PlatformAdmin");
  return Array.from(new Set(roleNames));
}

function getAssignedDeletionManager(job: {
  assignedManagerId?: string | null;
  assignments: { id: string; userId: string; responsibility: string; user?: { name: string | null } }[];
}) {
  if (job.assignedManagerId === null) {
    return null;
  }
  if (job.assignedManagerId) {
    return (
      job.assignments.find(
        (assignment) => assignment.userId === job.assignedManagerId && assignment.responsibility === "APPROVAL",
      ) ?? {
        id: job.assignedManagerId,
        userId: job.assignedManagerId,
        responsibility: "APPROVAL",
      }
    );
  }

  return [...job.assignments]
    .filter((assignment) => assignment.responsibility === "APPROVAL")
    .sort((a, b) => a.id.localeCompare(b.id))[0] ?? null;
}

async function getEligibleDeletionAdmins(orgId: string) {
  return db.user.findMany({
    where: {
      orgId,
      active: true,
      OR: [
        { isPlatformAdmin: true },
        {
          roles: {
            some: {
              role: {
                name: "Admin",
              },
            },
          },
        },
      ],
    },
    select: { id: true, name: true, email: true, isPlatformAdmin: true },
    orderBy: [{ isPlatformAdmin: "desc" }, { name: "asc" }],
  });
}

async function getDeletionApproverForJob(orgId: string) {
  const admins = await getEligibleDeletionAdmins(orgId);
  return admins[0] ?? null;
}

async function backfillAssignedManagerFromApprovalAssignment(job: {
  id: string;
  assignedManagerId?: string | null;
  assignments: { userId: string; responsibility: string; user?: unknown }[];
}) {
  if (job.assignedManagerId) {
    return null;
  }

  const approvalAssignment = job.assignments.find((assignment) => assignment.responsibility === "APPROVAL");
  if (!approvalAssignment) {
    return null;
  }

  await db.chaJob.update({
    where: { id: job.id },
    data: { assignedManagerId: approvalAssignment.userId },
  });

  return approvalAssignment;
}

function assertDeleteConfirmationInput(jobNumber: string, confirmationJobNumber: string, confirmationPhrase: string) {
  if (confirmationJobNumber.trim() !== jobNumber) {
    throw new Error("The entered job number does not match this CHA job.");
  }
  if (normalizeDeleteConfirmationPhrase(confirmationPhrase) !== CHA_DELETE_CONFIRMATION_PHRASE) {
    throw new Error("The confirmation phrase must exactly match 'delete job'.");
  }
}

function assertJobCanBeDeleted(job: {
  deletedAt: Date | null;
  stage: string;
  status: string;
  filing: { status: string | null } | null;
  customerAdvance: { receipts: unknown[] } | null;
  expenseRequests: { status: string }[];
}) {
  if (job.deletedAt) {
    throw new Error("This CHA job has already been deleted.");
  }
  if ((job.customerAdvance?.receipts.length ?? 0) > 0) {
    throw new Error("This CHA job already has recorded advance receipts and cannot be deleted.");
  }
  if (job.expenseRequests.some((request) => ["PAID", "RECEIPT_ACKNOWLEDGED"].includes(request.status))) {
    throw new Error("This CHA job has paid expense records and cannot be deleted.");
  }
}

function normalizeJobTypeManifestConfig(input: ChaJobTypeManifestConfigInput) {
  const name = input.name.trim();
  const movementDirection = input.movementDirection;
  const manifestRequirement = input.manifestRequirement;
  const customManifestLabel = input.customManifestLabel?.trim() || null;
  const manifestHelpText = input.manifestHelpText?.trim() || null;
  const isManifestMandatory = Boolean(input.isManifestMandatory);
  const isActive = input.isActive ?? true;

  if (!name) {
    throw new Error("Clearance type name is required.");
  }

  if (!["IMPORT", "EXPORT", "BOTH", "OTHER"].includes(movementDirection)) {
    throw new Error("Movement direction must be configured.");
  }

  if (!["IGM", "EGM", "BOTH", "NONE", "CUSTOM"].includes(manifestRequirement)) {
    throw new Error("Manifest requirement must be configured.");
  }

  if (manifestRequirement === "CUSTOM" && !customManifestLabel) {
    throw new Error("Custom manifest label is required when manifest requirement is custom.");
  }

  if (isActive && !manifestRequirement) {
    throw new Error("Active clearance types must define manifest behavior.");
  }

  const validFlowCategories = ["IMPORT_BE", "EXPORT_SB", "CUSTOM"];
  const filingFlowCategory =
    input.filingFlowCategory && validFlowCategories.includes(input.filingFlowCategory)
      ? input.filingFlowCategory
      : null;

  return {
    name,
    movementDirection,
    manifestRequirement,
    customManifestLabel,
    isManifestMandatory,
    manifestHelpText:
      manifestHelpText ||
      (manifestRequirement === "IGM"
        ? DEFAULT_IMPORT_MANIFEST_HELP
        : manifestRequirement === "EGM"
          ? DEFAULT_EXPORT_MANIFEST_HELP
          : null),
    isActive,
    filingFlowCategory,
  };
}

function isJobTypeManifestConfigured(jobType: {
  movementDirection?: string | null;
  manifestRequirement?: string | null;
  customManifestLabel?: string | null;
}) {
  if (!jobType.movementDirection || !jobType.manifestRequirement) {
    return false;
  }
  if (jobType.manifestRequirement === "CUSTOM" && !jobType.customManifestLabel?.trim()) {
    return false;
  }
  return true;
}

function getManifestRequirementLabel(jobType: {
  manifestRequirement?: string | null;
  customManifestLabel?: string | null;
}) {
  switch (jobType.manifestRequirement) {
    case "IGM":
      return "IGM Number";
    case "EGM":
      return "EGM Number";
    case "BOTH":
      return "IGM + EGM";
    case "NONE":
      return "None";
    case "CUSTOM":
      return jobType.customManifestLabel?.trim() || "Custom Manifest";
    default:
      return "Not Configured";
  }
}

function validateJobTypeManifestConfiguration(jobType: {
  name: string;
  movementDirection?: string | null;
  manifestRequirement?: string | null;
  customManifestLabel?: string | null;
  manifestHelpText?: string | null;
  isManifestMandatory?: boolean | null;
}) {
  if (!isJobTypeManifestConfigured(jobType)) {
    throw new Error(
      `Clearance type "${jobType.name}" is missing manifest configuration. Please update it in CHA settings before continuing.`,
    );
  }

  return {
    movementDirection: jobType.movementDirection as ChaMovementDirection,
    manifestRequirement: jobType.manifestRequirement as ChaManifestRequirement,
    customManifestLabel: jobType.customManifestLabel?.trim() || null,
    manifestHelpText: jobType.manifestHelpText?.trim() || null,
    isManifestMandatory: Boolean(jobType.isManifestMandatory),
    manifestLabel: getManifestRequirementLabel(jobType),
  };
}

function buildArchivedChaJobNumber(jobNumber: string, jobId: string) {
  return `${jobNumber}__deleted__${jobId}`;
}

async function archiveDeletedChaJobNumber(
  tx: Prisma.TransactionClient,
  job: { id: string; jobNumber: string; deletedAt: Date | null },
) {
  if (!job.deletedAt) {
    return job.jobNumber;
  }

  const archivedJobNumber = buildArchivedChaJobNumber(job.jobNumber, job.id);
  if (job.jobNumber === archivedJobNumber) {
    return archivedJobNumber;
  }

  await tx.chaJob.update({
    where: { id: job.id },
    data: { jobNumber: archivedJobNumber },
  });

  return archivedJobNumber;
}

// Create a CHA Job
export async function createJob(
  actorId: string,
  orgId: string,
  data: {
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
  }
) {
  if (!data.assignedManagerId) {
    throw new Error("Assigned Manager is required.");
  }

  // Fetch schema state, settings, and creator roles in parallel — avoids expensive ensureSettingsAndDefaults on every creation
  const [manifestSchema, initialSettings, creatorRoles] = await Promise.all([
    getChaManifestSchemaState(),
    db.chaSettings.findUnique({ where: { orgId } }),
    db.userRole.findMany({ where: { userId: actorId }, include: { role: true } }),
  ]);
  let settings = initialSettings;
  if (!settings) {
    await ensureSettingsAndDefaults(orgId);
    settings = await db.chaSettings.findUnique({ where: { orgId } });
  }
  if (!settings) {
    throw new Error("CHA settings have not been initialized. Please open the CHA Settings page to complete setup.");
  }
  const creatorRoleNames = creatorRoles.map((ur) => ur.role.name);

  const allowedRoles = parseStringArray(settings.jobCreatorRoles, DEFAULT_CHA_JOB_CREATOR_ROLES);
  const allowedUsers = parseStringArray(settings.jobCreatorUsers);

  const isRoleAllowed = creatorRoleNames.some((r) => allowedRoles.includes(r));
  const isUserAllowed = allowedUsers.includes(actorId);

  if (!isRoleAllowed && !isUserAllowed) {
    throw new Error("You are not authorized to create jobs under this organisation's settings.");
  }

  const result = await db.$transaction(async (tx) => {
    const selectedJobType = await tx.chaJobType.findFirst({
      where: manifestSchema.jobTypeManifestConfig ? { id: data.jobTypeId, orgId, isActive: true } : { id: data.jobTypeId, orgId },
      select: { id: true },
    });
    if (!selectedJobType) {
      throw new Error("The selected clearance type is inactive or unavailable.");
    }

    const branchRule = await tx.chaBranchNumberingRule.findFirst({
      where: {
        orgId,
        branchId: data.branchId,
      },
    });

    if (!branchRule || !branchRule.isActive) {
      throw new Error("The selected branch does not have an active job numbering configuration. Please ask a CHA administrator to configure it in Settings.");
    }

    const nextAvailableAutoNumber = await getNextAvailableChaJobNumber(tx, orgId, branchRule);

    let finalJobNumber = data.jobNumber?.trim();
    const providedSequence = finalJobNumber
      ? parseChaJobNumberSequence(finalJobNumber, branchRule)
      : null;
    const shouldAdvanceSequence =
      !finalJobNumber ||
      finalJobNumber === nextAvailableAutoNumber.jobNumber ||
      (providedSequence !== null && providedSequence <= nextAvailableAutoNumber.sequence);

    if (shouldAdvanceSequence) {
      finalJobNumber = nextAvailableAutoNumber.jobNumber;

      await tx.chaBranchNumberingRule.update({
        where: { id: branchRule.id },
        data: { currentSequence: nextAvailableAutoNumber.sequence },
      });
    }

    if (!finalJobNumber) {
      throw new Error("Failed to determine a CHA job number for this branch.");
    }

    const existingJob = await tx.chaJob.findFirst({
      where: { orgId, jobNumber: finalJobNumber },
      select: { id: true, jobNumber: true, deletedAt: true },
    });
    if (existingJob && !existingJob.deletedAt) {
      throw new Error(`Job number '${finalJobNumber}' already exists inside the organisation.`);
    }
    if (existingJob?.deletedAt) {
      await archiveDeletedChaJobNumber(tx, existingJob);
    }

    // 1. Create Job
    const job = await tx.chaJob.create({
      data: {
        orgId,
        jobNumber: finalJobNumber,
        title: data.title,
        customerId: data.customerId,
        customerRef: data.customerRef,
        jobTypeId: data.jobTypeId,
        shipmentTypeId: data.shipmentTypeId || null,
        branchId: data.branchId,
        priority: data.priority,
        stage: "DOCUMENT_COLLECTION",
        status: "ACTIVE",
        primaryOwnerId: data.primaryOwnerId,
        assignedManagerId: data.assignedManagerId,
        remarks: data.remarks,
        estimatedClosureDate: data.estimatedClosureDate ? new Date(data.estimatedClosureDate) : null,
      },
    });

    // 2. Create assignments (primary owner is implicitly operations/owner)
    // Add primary owner assignment if not present
    const ownerAssignmentPresent = data.assignments.some(
      (a) => a.userId === data.primaryOwnerId && a.responsibility === "OPERATIONS"
    );
    const assignmentsToCreate = [...data.assignments];
    if (!ownerAssignmentPresent) {
      assignmentsToCreate.push({ userId: data.primaryOwnerId, responsibility: "OPERATIONS" });
    }
    const managerAssignmentPresent = assignmentsToCreate.some(
      (a) => a.userId === data.assignedManagerId && a.responsibility === "APPROVAL"
    );
    if (!managerAssignmentPresent) {
      assignmentsToCreate.push({ userId: data.assignedManagerId, responsibility: "APPROVAL" });
    }

    await tx.chaJobAssignment.createMany({
      data: assignmentsToCreate.map((a) => ({
        jobId: job.id,
        userId: a.userId,
        responsibility: a.responsibility,
      })),
      skipDuplicates: true,
    });

    // 3. Fetch active document configuration categories and items for this organization and initialize requirements
    const categories = await tx.chaDocumentRequirementCategory.findMany({
      where: { orgId, isActive: true },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const jobRequirementsData = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        jobRequirementsData.push({
          jobId: job.id,
          name: item.name,
          category: cat.name,
          isMandatory: item.isRequiredDefault,
          status: "PENDING",
          requirementItemId: item.id,
        });
      }
    }

    if (jobRequirementsData.length === 0) {
      const legacyDefinitions = await tx.chaDocumentDefinition.findMany({
        where: { jobTypeId: data.jobTypeId },
        orderBy: { name: "asc" },
      });
      for (const definition of legacyDefinitions) {
        jobRequirementsData.push({
          jobId: job.id,
          name: definition.name,
          category: definition.category,
          isMandatory: definition.isMandatory,
          status: "PENDING",
          requirementItemId: null,
        });
      }
    }

    if (jobRequirementsData.length > 0) {
      await tx.chaJobDocumentRequirement.createMany({
        data: jobRequirementsData,
      });
    }

    // 4. Initialize Filing
    await tx.chaFiling.create({
      data: {
        jobId: job.id,
        status: "PENDING",
      },
    });

    // 5. Initialize Customer Advance
    await tx.chaCustomerAdvance.create({
      data: {
        jobId: job.id,
        status: "PENDING",
      },
    });

    return { job, assignmentsToCreate };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

  // Log audit events and send notifications in parallel
  const uniqueUserIds = Array.from(new Set(result.assignmentsToCreate.map((a) => a.userId)));
  await Promise.all([
    logChaAudit({
      orgId,
      jobId: result.job.id,
      entityType: "ChaJob",
      entityId: result.job.id,
      event: "JOB_CREATED",
      actorId,
      newState: "DOCUMENT_COLLECTION",
      remarks: `Job created with ${result.assignmentsToCreate.length} assignments`,
    }),
    logChaAudit({
      orgId,
      jobId: result.job.id,
      entityType: "ChaJob",
      entityId: result.job.id,
      event: "JOB_MANAGER_ASSIGNED",
      actorId,
      newState: "DOCUMENT_COLLECTION",
      remarks: `Manager assigned during job creation: ${data.assignedManagerId}`,
    }),
    // Notify all assigned users and create todos in parallel
    ...uniqueUserIds.map((userId) =>
      Promise.all([
        createNotification({
          userId,
          orgId,
          kind: "CHA_JOB_ASSIGNED",
          title: `New Job Assigned: ${result.job.jobNumber}`,
          body: `You are assigned to the new customs clearance job ${result.job.jobNumber} (${data.title}).`,
          link: `/cha/jobs/${result.job.id}`,
          priority: "important",
        }),
        db.todoTask.create({
          data: {
            userId,
            orgId,
            title: `Collect documents for Job ${result.job.jobNumber}`,
            description: `Check the required document slots and upload file copies for job ${result.job.jobNumber}.`,
            status: "PENDING",
          },
        }),
      ])
    ),
  ]);

  // Trigger Google Workspace background provisioning
  if (process.env.NODE_ENV !== "test") {
    const { provisionJobWorkspace } = await import("@/lib/workspace-provisioning");
    provisionJobWorkspace(result.job.id, false, actorId).catch((err: any) => {
      console.error(`Workspace background provisioning failed for job ${result.job.id}:`, err);
    });
  }

  return result.job;
}

// Clearance Job Types management helpers
export async function createJobType(
  actorId: string,
  orgId: string,
  data: ChaJobTypeManifestConfigInput,
) {
  const normalized = normalizeJobTypeManifestConfig(data);
  const existing = await db.chaJobType.findFirst({
    where: { orgId, name: { equals: normalized.name, mode: "insensitive" } },
  });
  if (existing) {
    throw new Error(`Clearance job type '${normalized.name}' already exists.`);
  }

  const jobType = await db.chaJobType.create({
    data: {
      orgId,
      ...normalized,
    },
  });

  await logChaAudit({
    orgId,
    entityType: "ChaJobType",
    entityId: jobType.id,
    event: "CHA_JOB_TYPE_MANIFEST_CONFIG_CREATED",
    actorId,
    newState: JSON.stringify({
      movementDirection: jobType.movementDirection,
      manifestRequirement: jobType.manifestRequirement,
      customManifestLabel: jobType.customManifestLabel,
      isManifestMandatory: jobType.isManifestMandatory,
      manifestHelpText: jobType.manifestHelpText,
      isActive: jobType.isActive,
    }),
    remarks: `Manifest configuration created for clearance type "${jobType.name}".`,
  });

  return jobType;
}

export async function updateJobTypeManifestConfig(
  actorId: string,
  orgId: string,
  id: string,
  data: ChaJobTypeManifestConfigInput,
) {
  const existing = await db.chaJobType.findFirstOrThrow({
    where: { id, orgId },
  });
  const normalized = normalizeJobTypeManifestConfig(data);

  const duplicate = await db.chaJobType.findFirst({
    where: {
      orgId,
      id: { not: id },
      name: { equals: normalized.name, mode: "insensitive" },
    },
  });
  if (duplicate) {
    throw new Error(`Clearance job type '${normalized.name}' already exists.`);
  }

  const jobType = await db.chaJobType.update({
    where: { id },
    data: normalized,
  });

  await logChaAudit({
    orgId,
    entityType: "ChaJobType",
    entityId: jobType.id,
    event: "CHA_JOB_TYPE_MANIFEST_CONFIG_UPDATED",
    actorId,
    prevState: JSON.stringify({
      name: existing.name,
      movementDirection: existing.movementDirection,
      manifestRequirement: existing.manifestRequirement,
      customManifestLabel: existing.customManifestLabel,
      isManifestMandatory: existing.isManifestMandatory,
      manifestHelpText: existing.manifestHelpText,
      isActive: existing.isActive,
    }),
    newState: JSON.stringify({
      name: jobType.name,
      movementDirection: jobType.movementDirection,
      manifestRequirement: jobType.manifestRequirement,
      customManifestLabel: jobType.customManifestLabel,
      isManifestMandatory: jobType.isManifestMandatory,
      manifestHelpText: jobType.manifestHelpText,
      isActive: jobType.isActive,
    }),
    remarks: `Manifest configuration updated for clearance type "${jobType.name}".`,
  });

  return jobType;
}

export async function updateJobTypeFilingFlowCategory(
  actorId: string,
  orgId: string,
  id: string,
  filingFlowCategory: string | null,
) {
  const validCategories = ["IMPORT_BE", "EXPORT_SB", "CUSTOM", null];
  if (!validCategories.includes(filingFlowCategory)) {
    throw new Error(`Invalid filing flow category "${filingFlowCategory}". Use IMPORT_BE, EXPORT_SB, CUSTOM, or null.`);
  }

  const jobType = await db.chaJobType.update({
    where: { id },
    data: { filingFlowCategory },
  });

  await logChaAudit({
    orgId,
    entityType: "ChaJobType",
    entityId: jobType.id,
    event: "CHA_JOB_TYPE_FILING_FLOW_CATEGORY_UPDATED",
    actorId,
    newState: JSON.stringify({ filingFlowCategory }),
    remarks: `Filing flow category for "${jobType.name}" set to ${filingFlowCategory ?? "unset"}.`,
  });

  return jobType;
}

export async function deleteJobType(orgId: string, id: string) {
  const count = await db.chaJob.count({
    where: { orgId, jobTypeId: id },
  });
  if (count > 0) {
    throw new Error("Cannot delete job type as it is currently associated with active clearance jobs.");
  }
  // Delete document definitions cascade
  await db.chaDocumentDefinition.deleteMany({
    where: { jobTypeId: id },
  });
  return db.chaJobType.delete({
    where: { id },
  });
}

export async function upsertBranchNumberingRules(
  orgId: string,
  rules: {
    branchId: string;
    prefix: string;
    suffix?: string | null;
    startingSequence: number;
    currentSequence: number;
    numberPadding: number;
    useFinancialYear: boolean;
    financialYearFormat?: string | null;
    isActive: boolean;
  }[],
) {
  await ensureSettingsAndDefaults(orgId);

  const result = await db.$transaction(async (tx) => {
    for (const rule of rules) {
      const prefix = rule.prefix.trim();
      if (!prefix) {
        throw new Error("Each branch numbering rule must include a prefix.");
      }

      const startingSequence = Math.max(Math.floor(rule.startingSequence || 1), 1);
      const currentSequence = Math.max(Math.floor(rule.currentSequence || 0), startingSequence - 1);
      const numberPadding = Math.max(Math.floor(rule.numberPadding || 4), 1);

      await tx.chaBranchNumberingRule.upsert({
        where: { branchId: rule.branchId },
        update: {
          prefix,
          suffix: rule.suffix?.trim() || null,
          startingSequence,
          currentSequence,
          numberPadding,
          useFinancialYear: rule.useFinancialYear,
          financialYearFormat: rule.useFinancialYear ? (rule.financialYearFormat?.trim() || "YYYY-YY") : null,
          isActive: rule.isActive,
        },
        create: {
          orgId,
          branchId: rule.branchId,
          prefix,
          suffix: rule.suffix?.trim() || null,
          startingSequence,
          currentSequence,
          numberPadding,
          useFinancialYear: rule.useFinancialYear,
          financialYearFormat: rule.useFinancialYear ? (rule.financialYearFormat?.trim() || "YYYY-YY") : null,
          isActive: rule.isActive,
        },
      });
    }

    return tx.chaBranchNumberingRule.findMany({
      where: { orgId },
      include: { branch: { select: { id: true, name: true, code: true } } },
      orderBy: { branch: { name: "asc" } },
    });
  });

  return result;
}

export async function createShipmentType(orgId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Shipment type name is required.");
  }

  const existing = await db.chaShipmentType.findFirst({
    where: { orgId, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) {
    throw new Error(`Shipment type '${trimmed}' already exists.`);
  }

  return db.chaShipmentType.create({
    data: {
      orgId,
      name: trimmed,
      isActive: true,
    },
  });
}

export async function deleteShipmentType(orgId: string, id: string) {
  const linkedJobs = await db.chaJob.count({
    where: { orgId, shipmentTypeId: id },
  });
  if (linkedJobs > 0) {
    throw new Error("Cannot delete shipment type because it is already used by existing CHA jobs.");
  }

  return db.chaShipmentType.delete({
    where: { id },
  });
}

// Team Groups management helpers
export async function createTeamGroup(orgId: string, name: string, memberIds: string[]) {
  const existing = await db.chaTeamGroup.findFirst({
    where: { orgId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    throw new Error(`Team group '${name}' already exists.`);
  }
  return db.chaTeamGroup.create({
    data: {
      orgId,
      name,
      memberIds: JSON.stringify(memberIds),
    },
  });
}

export async function deleteTeamGroup(orgId: string, id: string) {
  return db.chaTeamGroup.delete({
    where: { id, orgId },
  });
}

export async function listJobTypesForSelection(orgId: string) {
  const manifestSchema = await getChaManifestSchemaState();
  const jobTypes = await db.chaJobType.findMany({
    where: manifestSchema.jobTypeManifestConfig ? { orgId, isActive: true } : { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return jobTypes;
}

export async function listJobTypesForSettings(orgId: string) {
  const manifestSchema = await getChaManifestSchemaState();
  const jobTypes = await db.chaJobType.findMany({
    where: { orgId },
    select: getChaJobTypeSelect(manifestSchema.jobTypeManifestConfig),
    orderBy: { name: "asc" },
  });

  return jobTypes.map((jobType) =>
    normalizeCompatibleJobType(
      jobType as { id: string; orgId: string; name: string } & Partial<CompatibleChaJobType>,
      manifestSchema.jobTypeManifestConfig,
    ),
  );
}

// Get Job Details with access policies
export async function getJobDetails(userId: string, orgId: string, jobId: string) {
  const manifestSchema = await getChaManifestSchemaState();

  // auditLogs and expenseRequests are pulled into explicit parallel queries so Prisma
  // can fetch them concurrently with the main job query instead of sequentially.
  const [user, job, rawAuditLogs, expenseRequests] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    }),
    db.chaJob.findFirst({
      where: { id: jobId, ...getActiveChaJobWhere(orgId) },
      include: {
        customer: {
          include: {
            contacts: {
              where: { isActive: true },
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            },
          },
        },
        jobType: { select: getChaJobTypeSelect(manifestSchema.jobTypeManifestConfig) },
        shipmentType: true,
        branch: true,
        primaryOwner: { select: { id: true, name: true, email: true, designation: true } },
        assignedManager: { select: { id: true, name: true, email: true, designation: true } },
        assignments: { include: { user: { select: { id: true, name: true, email: true, designation: true } } } },
        deletionRequests: {
          orderBy: { requestedAt: "desc" },
          take: 10,
          include: {
            requestedBy: { select: { id: true, name: true } },
            assignedManager: { select: { id: true, name: true } },
            executedBy: { select: { id: true, name: true } },
          },
        },
        documentRequirements: {
          include: {
            versions: { include: { uploadedBy: { select: { name: true } } } },
            exception: { include: { user: { select: { name: true } } } },
            requirementItem: { include: { category: true } }
          }
        },
        additionalData: { select: getAdditionalDataSelect(manifestSchema.customManifestValue) },
        doExtensions: { orderBy: { createdAt: "desc" }, take: 10 },
        section49Extensions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { appliedBy: { select: { name: true } } },
        },
        filingSection49Flag: true,
        checklistWorkflow: {
          include: {
            currentFileVersion: true,
            fileVersions: { orderBy: { versionNumber: "desc" } },
            approvals: { orderBy: { createdAt: "asc" } },
            customerMailLogs: {
              orderBy: { sentAt: "desc" },
              take: 5,
            },
          },
        },
        checklistImports: { include: { uploadedBy: { select: { name: true } }, approvals: { include: { manager: { select: { name: true } } } }, reworkNotes: { include: { author: { select: { name: true } } } }, sections: { include: { items: true } } } },
        filing: { include: { dateHistory: { include: { setBy: { select: { name: true } } } } } },
        customerAdvance: { include: { receipts: true } },
      },
    }),
    db.chaAuditLog.findMany({
      where: { jobId },
      orderBy: { timestamp: "desc" },
      take: 100,
    }),
    db.chaExpenseRequest.findMany({
      where: { jobId },
      include: {
        requestedBy: { select: { name: true } },
        lines: true,
        payments: { include: { paidBy: { select: { name: true } } } },
        queries: { include: { author: { select: { name: true } } } },
        statusHistory: true,
      },
    }),
  ]);

  if (!user) throw new Error("User not found");
  if (!job) throw new Error("Job not found.");

  // Parallelize backfill (may do a DB write), access check, and actor lookup
  const actorIds = Array.from(new Set(rawAuditLogs.map((l) => l.actorId)));
  const [backfilledManagerAssignment, hasViewAll, actors] = await Promise.all([
    backfillAssignedManagerFromApprovalAssignment(job),
    can(userId, "cha.job.view_all"),
    db.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true },
    }),
  ]);

  const normalizedJob = backfilledManagerAssignment
    ? {
        ...job,
        jobType: normalizeCompatibleJobType(
          job.jobType as { id: string; orgId: string; name: string } & Partial<CompatibleChaJobType>,
          manifestSchema.jobTypeManifestConfig,
        ),
        additionalData: normalizeCompatibleAdditionalData(job.additionalData, manifestSchema.customManifestValue),
        assignedManagerId: backfilledManagerAssignment.userId,
        assignedManager: backfilledManagerAssignment.user ?? job.assignedManager,
      }
    : {
        ...job,
        jobType: normalizeCompatibleJobType(
          job.jobType as { id: string; orgId: string; name: string } & Partial<CompatibleChaJobType>,
          manifestSchema.jobTypeManifestConfig,
        ),
        additionalData: normalizeCompatibleAdditionalData(job.additionalData, manifestSchema.customManifestValue),
      };

  // Gated access check
  const isPlatformAdmin = user.isPlatformAdmin;
  const isOrgAdmin = user.roles.some((r) => r.role.name === "Admin" || r.role.name === "Management" || r.role.name === "Director");
  const isAssigned = normalizedJob.assignments.some((a) => a.userId === userId);
  const isAssignedManager = normalizedJob.assignedManagerId === userId;
  const isManagerApprover = normalizedJob.assignments.some((a) => a.userId === userId && a.responsibility === "APPROVAL");

  if (!isPlatformAdmin && !isOrgAdmin && !isAssigned && !isAssignedManager && !isManagerApprover && !hasViewAll) {
    throw new ForbiddenError("cha.job.read");
  }

  const [filingQueryWarning] = await buildFilingQueryEscalationWarnings({ actorId: userId, orgId, jobId });
  const actorMap = new Map(actors.map((a) => [a.id, { name: a.name }]));
  const auditLogsWithActor = rawAuditLogs.map((log) => ({
    ...log,
    actor: actorMap.get(log.actorId) || { name: "System" },
  }));

  return {
    ...normalizedJob,
    auditLogs: auditLogsWithActor,
    expenseRequests,
    filingQueryWarning: filingQueryWarning || null,
  };
}

// Search & List Jobs
export async function listJobs(
  userId: string,
  orgId: string,
  filters: {
    search?: string;
    stage?: string;
    status?: string;
    priority?: string;
    branchId?: string;
    jobTypeId?: string;
    assignedToMe?: boolean;
    jobGroup?: "ACTIVE" | "COMPLETED";
    page?: number;
    pageSize?: number;
  }
) {
  const manifestSchema = await getChaManifestSchemaState();
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const andConditions: Prisma.ChaJobWhereInput[] = [];
  const where: Prisma.ChaJobWhereInput = {
    ...getActiveChaJobWhere(orgId),
    AND: andConditions,
  };

  if (filters.search) {
    andConditions.push({
      OR: [
        { jobNumber: { contains: filters.search, mode: "insensitive" } },
        { title: { contains: filters.search, mode: "insensitive" } },
        { customer: { name: { contains: filters.search, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.stage) where.stage = filters.stage;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.jobTypeId) where.jobTypeId = filters.jobTypeId;

  if (filters.jobGroup === "ACTIVE") {
    andConditions.push({
      NOT: {
        OR: [
          { stage: "FILED" },
          { status: "COMPLETED" },
          { filing: { is: { status: "FILED" } } },
        ],
      },
    });
  }

  if (filters.jobGroup === "COMPLETED") {
    andConditions.push({
      OR: [
        { stage: "FILED" },
        { status: "COMPLETED" },
        { filing: { is: { status: "FILED" } } },
      ],
    });
  }

  if (filters.assignedToMe) {
    where.assignments = { some: { userId } };
  }

  if (!andConditions.length) {
    delete where.AND;
  }

  const [total, items] = await Promise.all([
    db.chaJob.count({ where }),
    db.chaJob.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        jobType: { select: getChaJobTypeSelect(manifestSchema.jobTypeManifestConfig) },
        branch: true,
        filing: {
          select: {
            billOfEntryNumber: true,
            shippingBillNumber: true,
          },
        },
        primaryOwner: { select: { id: true, name: true } },
        assignments: { include: { user: { select: { id: true, name: true } } } },
        deletionRequests: {
          where: { status: { in: ["PENDING", "APPROVED"] } },
          select: { id: true, status: true, assignedManagerId: true },
          take: 1,
        },
      },
    }),
  ]);

  return {
    total,
    items: items.map((item) => ({
      ...item,
      jobType: normalizeCompatibleJobType(
        item.jobType as { id: string; orgId: string; name: string } & Partial<CompatibleChaJobType>,
        manifestSchema.jobTypeManifestConfig,
      ),
    })),
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

async function advanceToChecklistPreparationIfDocumentGatePassed(jobId: string) {
  const [job, gate] = await Promise.all([
    db.chaJob.findUnique({
      where: { id: jobId },
      select: { id: true, stage: true },
    }),
    verifyDocumentGate(jobId),
  ]);

  if (!job || !gate.passed || job.stage !== "DOCUMENT_COLLECTION") {
    return false;
  }

  await db.chaJob.update({
    where: { id: jobId },
    data: { stage: "CHECKLIST_PREPARATION" },
  });

  return true;
}

// Resolve the Drive subfolder for a document requirement's category. Folder keys
// are the exact category names provisioned in workspace-provisioning.ts (mirrors
// ChaDocumentRequirementCategory), so this is a direct lookup with a case-insensitive
// fallback in case the category name's casing drifted, then the job's root folder.
export function resolveDriveFolderForCategory(
  categoryFolders: Record<string, string> | null | undefined,
  rootFolderId: string | null | undefined,
  category: string,
): string | undefined {
  if (!categoryFolders) return rootFolderId || undefined;
  if (categoryFolders[category]) return categoryFolders[category];
  const normalized = category.trim().toLowerCase();
  const matchKey = Object.keys(categoryFolders).find((key) => key.trim().toLowerCase() === normalized);
  return (matchKey ? categoryFolders[matchKey] : undefined) || rootFolderId || undefined;
}

// Get (or lazily create) the Drive subfolder for one filing workflow checklist
// stage, so each stage's uploads land in their own folder under "Filing
// Documents" instead of one shared bucket. Keyed by the node's stable key
// (unique within a workflow version) so a renamed stage keeps its folder.
async function getOrCreateFilingNodeFolder(
  jobId: string,
  filingRootFolderId: string,
  nodeKey: string,
  nodeName: string,
  accessToken?: string,
): Promise<string> {
  const profile = await db.jobWorkspaceProfile.findUniqueOrThrow({ where: { jobId } });
  const categoryFolders = (profile.categoryFolders as Record<string, string>) || {};
  const folderMapKey = `Filing Documents/${nodeKey}`;

  const existing = categoryFolders[folderMapKey];
  if (existing && !existing.startsWith("mock-") && (await driveClient.folderExists(existing, accessToken).catch(() => false))) {
    return existing;
  }

  const nodeFolderId = await driveClient.createFolder({
    name: nodeName,
    parentFolderId: filingRootFolderId,
    accessToken,
  });

  await db.jobWorkspaceProfile.update({
    where: { jobId },
    data: { categoryFolders: { ...categoryFolders, [folderMapKey]: nodeFolderId } },
  });

  return nodeFolderId;
}

// Upload a version for a document requirement
export async function uploadDocumentVersion(
  actorId: string,
  orgId: string,
  jobId: string,
  requirementId: string,
  fileData: {
    fileKey?: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    checksum?: string;
  },
  fileBuffer?: Buffer,
  explicitValidityDate?: Date | null,
) {
  const req = await db.chaJobDocumentRequirement.findFirstOrThrow({
    where: { id: requirementId, jobId, job: getActiveChaJobWhere(orgId) },
    include: {
      requirementItem: true,
    },
  });

  const storedFileName = buildDriveStoredFileName(req.name, fileData.fileName);

  let fileKey = fileData.fileKey || `cha/docs/${Math.random().toString(36).substring(7)}_${storedFileName}`;

  if (fileBuffer) {
    // Verifies (and transparently recreates) the job's root and category
    // folders if either was deleted from Drive after the job was created.
    let driveFolderId: string | undefined;
    try {
      driveFolderId = await ensureJobCategoryFolder(jobId, req.category, actorId);
    } catch (err: any) {
      console.warn(`[Upload] Drive folder self-heal failed for job ${jobId}, category "${req.category}":`, err.message || err);
      const profile = await db.jobWorkspaceProfile.findUnique({ where: { jobId } });
      driveFolderId = resolveDriveFolderForCategory(
        profile?.categoryFolders as Record<string, string> | undefined,
        profile?.rootFolderId,
        req.category,
      );
    }

    if (driveFolderId && !driveFolderId.startsWith("mock-")) {
      try {
        const uploadResult = await driveClient.uploadFile({
          name: storedFileName,
          mimeType: fileData.mimeType,
          parentFolderId: driveFolderId,
          fileBuffer,
        });
        fileKey = uploadResult.webViewLink;
      } catch (err: any) {
        if (process.env.NODE_ENV === "production") {
          throw new Error(`Google Drive upload failed: ${err.message || err}`);
        } else {
          console.warn("[Upload] Google Drive upload failed. Falling back to mock URL. Error:", err.message || err);
          fileKey = `https://drive.google.com/file/d/mock-uploaded-${Math.random().toString(36).substring(7)}/view`;
        }
      }
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Google Drive is not provisioned for this job or missing credentials. Please retry provisioning the workspace.");
      } else {
        fileKey = `https://drive.google.com/file/d/mock-uploaded-${Math.random().toString(36).substring(7)}/view`;
      }
    }
  }

  const uploadedAt = await getNow();
  const resolvedValidityDate = await resolveConfiguredValidityDate({
    uploadedAt,
    explicitValidityDate: explicitValidityDate ?? null,
    requiresValidity: !!req.requirementItem?.requiresValidityDate,
    validityDuration: req.requirementItem?.defaultValidityDuration ?? null,
    validityUnit: req.requirementItem?.defaultValidityUnit ?? null,
    orgId,
  });

  const result = await db.$transaction(async (tx) => {
    // Mark previous current versions as not current
    await tx.chaDocumentVersion.updateMany({
      where: { requirementId, isCurrent: true },
      data: { isCurrent: false },
    });

    // Save version
    const version = await tx.chaDocumentVersion.create({
      data: {
        requirementId,
        fileKey,
        fileName: storedFileName,
        mimeType: fileData.mimeType,
        sizeBytes: fileData.sizeBytes,
        checksum: fileData.checksum,
        uploadedById: actorId,
        uploadedAt,
        validityDate: resolvedValidityDate,
      },
    });

    // Update status to uploaded
    await tx.chaJobDocumentRequirement.update({
      where: { id: requirementId },
      data: { status: "UPLOADED" },
    });

    // Clear any previous exception
    await tx.chaDocumentException.deleteMany({
      where: { requirementId },
    });

    return version;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobDocumentRequirement",
    entityId: requirementId,
    event: "DOCUMENT_UPLOADED",
    actorId,
    newState: "UPLOADED",
    remarks: `Uploaded document: ${storedFileName}`,
    metadata: {
      validityDate: resolvedValidityDate?.toISOString() ?? null,
    },
  });

  // Auto-stage-transition removed (Proceed button handles this now)

  // If a document changes after checklist approval, flag alert
  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: { checklistImports: { where: { status: "APPROVED" } }, assignments: { where: { responsibility: "APPROVAL" } } },
  });

  if (job.stage === "FILING" || job.stage === "FILED") {
    // Notify checklist approvers and owner
    const approverIds = job.assignments.map((a) => a.userId);
    const notificationRecipients = Array.from(new Set([job.primaryOwnerId, ...approverIds]));

    for (const recipientId of notificationRecipients) {
      await createNotification({
        userId: recipientId,
        orgId,
        kind: "CHA_JOB_ASSIGNED",
        title: `Material Doc Changed: ${job.jobNumber}`,
        body: `A document requirement (${req.name}) was updated after checklist approval. Review if re-approval is required.`,
        link: `/cha/jobs/${jobId}`,
        priority: "important",
      });
    }
  }

  return result;
}

export async function createJobCustomDocumentRequirementAndUpload(
  actorId: string,
  orgId: string,
  jobId: string,
  data: {
    name: string;
    fileData: {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      checksum?: string;
    };
    fileBuffer?: Buffer;
  },
) {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error("A custom document name is required.");
  }

  await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    select: { id: true },
  });

  const existingRequirement = await db.chaJobDocumentRequirement.findFirst({
    where: {
      jobId,
      requirementItemId: null,
      name: { equals: trimmedName, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existingRequirement) {
    throw new Error("A custom document with this name already exists for this job.");
  }

  const requirement = await db.chaJobDocumentRequirement.create({
    data: {
      jobId,
      name: trimmedName,
      category: "User Uploads",
      isMandatory: false,
      status: "PENDING",
      requirementItemId: null,
    },
  });

  try {
    await logChaAudit({
      orgId,
      jobId,
      entityType: "ChaJobDocumentRequirement",
      entityId: requirement.id,
      event: "CUSTOM_DOCUMENT_REQUIREMENT_CREATED",
      actorId,
      newState: "PENDING",
      remarks: `Created a job-specific custom document slot: ${trimmedName}`,
    });

    await uploadDocumentVersion(
      actorId,
      orgId,
      jobId,
      requirement.id,
      data.fileData,
      data.fileBuffer,
      null,
    );
  } catch (error) {
    const versionsCount = await db.chaDocumentVersion.count({
      where: { requirementId: requirement.id },
    });

    if (versionsCount === 0) {
      await db.chaDocumentException.deleteMany({
        where: { requirementId: requirement.id },
      });
      await db.chaJobDocumentRequirement.delete({
        where: { id: requirement.id },
      });
    }

    throw error;
  }

  return db.chaJobDocumentRequirement.findUniqueOrThrow({
    where: { id: requirement.id },
    include: {
      requirementItem: {
        include: {
          category: true,
        },
      },
      versions: {
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      exception: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

// Delete a document version
export async function deleteDocumentVersion(
  actorId: string,
  orgId: string,
  jobId: string,
  requirementId: string,
  versionId: string
) {
  // 1. Fetch the version, requirement, and job (to verify ownership & org)
  const version = await db.chaDocumentVersion.findFirstOrThrow({
    where: {
      id: versionId,
      requirementId,
      requirement: {
        jobId,
        job: getActiveChaJobWhere(orgId),
      },
    },
    include: {
      requirement: {
        include: {
          job: true,
        },
      },
    },
  });

  // 2. Perform RBAC and context authorization checks
  const isUploader = version.uploadedById === actorId;
  const isPrimaryOwner = version.requirement.job.primaryOwnerId === actorId;
  const hasDeletePermission = await can(actorId, "cha.document.delete");
  const hasManageSettings = await can(actorId, "cha.settings.manage");

  if (!isUploader && !isPrimaryOwner && !hasDeletePermission && !hasManageSettings) {
    throw new Error("Access Denied: You are not authorized to delete this document version.");
  }

  // 3. Perform deletion and update in a transaction
  const result = await db.$transaction(async (tx) => {
    // Delete the version record
    await tx.chaDocumentVersion.delete({
      where: { id: versionId },
    });

    // Check remaining versions
    const remainingVersions = await tx.chaDocumentVersion.findMany({
      where: { requirementId },
      orderBy: { uploadedAt: "desc" },
    });

    // Check if there is an exception
    const exception = await tx.chaDocumentException.findFirst({
      where: { requirementId },
    });

    // Recalculate status
    let newStatus: "PENDING" | "NOT_AVAILABLE" | "UPLOADED" = "PENDING";
    if (remainingVersions.length > 0) {
      newStatus = "UPLOADED";
      // If we deleted the current version, mark the latest remaining one as current
      if (version.isCurrent) {
        await tx.chaDocumentVersion.update({
          where: { id: remainingVersions[0].id },
          data: { isCurrent: true },
        });
      }
    } else if (exception) {
      newStatus = "NOT_AVAILABLE";
    }

    // Update the requirement status
    await tx.chaJobDocumentRequirement.update({
      where: { id: requirementId },
      data: { status: newStatus },
    });

    // Re-verify the gate status to see if it now fails
    const reqs = await tx.chaJobDocumentRequirement.findMany({
      where: { jobId },
    });

    const blocking = reqs.filter(
      (r) => r.id === requirementId ? (newStatus !== "UPLOADED" && newStatus !== "NOT_AVAILABLE" && r.isMandatory) : (r.isMandatory && r.status !== "UPLOADED" && r.status !== "NOT_AVAILABLE")
    );
    const gatePassed = blocking.length === 0;

    let stageReverted = false;
    const prevStage = version.requirement.job.stage;

    if (!gatePassed && (prevStage === "ADDITIONAL_DATA" || prevStage === "CHECKLIST_PREPARATION" || prevStage === "CHECKLIST_APPROVAL")) {
      await tx.chaJob.update({
        where: { id: jobId },
        data: { stage: "DOCUMENT_COLLECTION" },
      });
      stageReverted = true;
    }

    return { newStatus, stageReverted, prevStage };
  });

  // 4. Log to Audit trail
  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobDocumentRequirement",
    entityId: requirementId,
    event: "DOCUMENT_DELETED",
    actorId,
    newState: result.newStatus,
    remarks: `Deleted document version: ${version.fileName}`,
  });

  if (result.stageReverted) {
    await logChaAudit({
      orgId,
      jobId,
      entityType: "ChaJob",
      entityId: jobId,
      event: "DOCUMENT_GATE_REVERTED",
      actorId,
      prevState: result.prevStage,
      newState: "DOCUMENT_COLLECTION",
      remarks: `Job stage reverted to DOCUMENT_COLLECTION due to deletion of mandatory document: ${version.requirement.name}`,
    });
  }

  // Log mock storage removal
  console.log(`Mock storage: deleted file ${version.fileKey} from S3/GCS`);

  return result;
}

// Declare document "Not Available" with a reason
export async function declareDocumentException(
  actorId: string,
  orgId: string,
  jobId: string,
  requirementId: string,
  reason: string,
  attachmentKey?: string
) {
  if (!reason.trim()) {
    throw new Error("A clear reason is required to declare a document unavailable.");
  }

  await db.chaJobDocumentRequirement.findFirstOrThrow({
    where: { id: requirementId, jobId, job: getActiveChaJobWhere(orgId) },
    select: { id: true },
  });

  const result = await db.$transaction(async (tx) => {
    // Save exception
    const exception = await tx.chaDocumentException.upsert({
      where: { requirementId },
      update: { reason, userId: actorId, createdAt: new Date(), attachmentKey },
      create: { requirementId, reason, userId: actorId, attachmentKey },
    });

    // Update status to not available
    await tx.chaJobDocumentRequirement.update({
      where: { id: requirementId },
      data: { status: "NOT_AVAILABLE" },
    });

    return exception;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobDocumentRequirement",
    entityId: requirementId,
    event: "DOCUMENT_EXCEPTION_DECLARED",
    actorId,
    newState: "NOT_AVAILABLE",
    remarks: `Declared unavailable: ${reason}`,
  });

  // Auto-stage-transition removed (Proceed button handles this now)

  return result;
}

export async function markDocumentNotAvailable(
  actorId: string,
  orgId: string,
  jobId: string,
  requirementId: string
) {
  await db.chaJobDocumentRequirement.findFirstOrThrow({
    where: { id: requirementId, jobId, job: getActiveChaJobWhere(orgId) },
    select: { id: true },
  });

  const result = await db.$transaction(async (tx) => {
    const exception = await tx.chaDocumentException.upsert({
      where: { requirementId },
      update: { reason: "N/A", userId: actorId, createdAt: new Date(), attachmentKey: null },
      create: { requirementId, reason: "N/A", userId: actorId },
    });

    await tx.chaJobDocumentRequirement.update({
      where: { id: requirementId },
      data: { status: "NOT_AVAILABLE" },
    });

    return exception;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobDocumentRequirement",
    entityId: requirementId,
    event: "DOCUMENT_MARKED_NA",
    actorId,
    newState: "NOT_AVAILABLE",
    remarks: "Marked document requirement as N/A.",
  });

  return result;
}

// Gate check: opens Checklist Preparation only when every mandatory document is actioned
export async function verifyDocumentGate(jobId: string) {
  const job = await db.chaJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      documentRequirements: {
        include: {
          requirementItem: {
            include: {
              category: true
            }
          }
        }
      }
    }
  });

  const activeReqs = job.documentRequirements.filter((req) => {
    if (!req.requirementItemId) return true; // legacy requirement
    const item = req.requirementItem;
    if (item) {
      if (!item.isActive) return false;
      if (item.category && !item.category.isActive) return false;
    }
    return true;
  });

  const blocking = activeReqs.filter(
    (r) => r.isMandatory && r.status !== "UPLOADED" && r.status !== "NOT_AVAILABLE"
  );

  return {
    passed: blocking.length === 0,
    blockingRequirements: blocking.map((b) => ({ id: b.id, name: b.name, category: b.category })),
  };
}

export async function upsertAdditionalData(
  actorId: string,
  orgId: string,
  jobId: string,
  data: {
    vesselInwardDate?: Date | string | null;
    importGeneralManifest?: string | null;
    exportGeneralManifest?: string | null;
    customManifestValue?: string | null;
    containerDetails?: Array<{ containerName?: string | null; containerNumber?: string | null }> | null;
    mblNumber?: string | null;
    hblNumber?: string | null;
    deliveryOrderValidity?: Date | string | null;
  }
) {
  const manifestSchema = await getChaManifestSchemaState();
  const rawJob = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: {
      assignments: true,
      additionalData: { select: getAdditionalDataSelect(manifestSchema.customManifestValue) },
      jobType: { select: getChaJobTypeSelect(manifestSchema.jobTypeManifestConfig) },
    },
  });
  const job = {
    ...rawJob,
    additionalData: normalizeCompatibleAdditionalData(rawJob.additionalData, manifestSchema.customManifestValue),
    jobType: normalizeCompatibleJobType(
      rawJob.jobType as { id: string; orgId: string; name: string } & Partial<CompatibleChaJobType>,
      manifestSchema.jobTypeManifestConfig,
    ),
  };
  await assertCanAccessAdditionalData(actorId, job, "cha.additional_data.edit");

  if (job.stage === "DOCUMENT_COLLECTION") {
    throw new Error("Complete document collection before entering Additional Data.");
  }
  if (["FILING", "FILED"].includes(job.stage)) {
    throw new Error("Additional Data cannot be edited after the job has moved to filing.");
  }

  const manifestConfig = validateJobTypeManifestConfiguration(job.jobType);
  const importGeneralManifest = data.importGeneralManifest?.trim() ? data.importGeneralManifest.trim() : null;
  const exportGeneralManifest = data.exportGeneralManifest?.trim() ? data.exportGeneralManifest.trim() : null;
  const customManifestValue = data.customManifestValue?.trim() ? data.customManifestValue.trim() : null;
  const containerDetails = sanitizeContainerDetails(data.containerDetails);
  const mblNumber = data.mblNumber?.trim() ? data.mblNumber.trim() : null;
  const hblNumber = data.hblNumber?.trim() ? data.hblNumber.trim() : null;

  if (importGeneralManifest !== null && !/^[a-zA-Z0-9]+$/.test(importGeneralManifest)) {
    throw new Error("Import General Manifest (IGM) must be alphanumeric.");
  }
  if (exportGeneralManifest !== null && !/^[a-zA-Z0-9]+$/.test(exportGeneralManifest)) {
    throw new Error("Export General Manifest (EGM) must be alphanumeric.");
  }

  const vesselInwardDate = data.vesselInwardDate ? new Date(data.vesselInwardDate) : null;
  const deliveryOrderValidity = data.deliveryOrderValidity ? new Date(data.deliveryOrderValidity) : null;

  if (vesselInwardDate && Number.isNaN(vesselInwardDate.getTime())) {
    throw new Error("Vessel Inward Date is invalid.");
  }
  if (deliveryOrderValidity && Number.isNaN(deliveryOrderValidity.getTime())) {
    throw new Error("Delivery Order (DO) Validity is invalid.");
  }

  if (manifestConfig.isManifestMandatory) {
    if (manifestConfig.manifestRequirement === "IGM" && !importGeneralManifest) {
      throw new Error("IGM Number is required for this clearance type.");
    }
    if (manifestConfig.manifestRequirement === "EGM" && !exportGeneralManifest) {
      throw new Error("EGM Number is required for this clearance type.");
    }
    if (manifestConfig.manifestRequirement === "BOTH" && (!importGeneralManifest || !exportGeneralManifest)) {
      throw new Error("Both IGM and EGM numbers are required for this clearance type.");
    }
    if (manifestConfig.manifestRequirement === "CUSTOM" && !customManifestValue) {
      throw new Error(`${manifestConfig.manifestLabel} is required for this clearance type.`);
    }
  }

  const nextStatus = isAdditionalDataComplete({
    vesselInwardDate,
    importGeneralManifest,
    exportGeneralManifest,
    customManifestValue,
    deliveryOrderValidity,
  }, manifestConfig) ? "COMPLETED" : "PENDING";
  const wasCompleted = job.additionalData?.status === "COMPLETED";

  const additionalData = await db.chaJobAdditionalData.upsert({
    where: { jobId },
    update: {
      vesselInwardDate,
      importGeneralManifest,
      exportGeneralManifest,
      ...(manifestSchema.customManifestValue ? { customManifestValue } : {}),
      containerDetails,
      mblNumber,
      hblNumber,
      deliveryOrderValidity,
      status: nextStatus,
      updatedById: actorId,
      ...(nextStatus === "COMPLETED"
        ? { completedById: wasCompleted ? job.additionalData?.completedById ?? actorId : actorId, completedAt: wasCompleted ? job.additionalData?.completedAt ?? new Date() : new Date() }
        : { completedById: null, completedAt: null }),
    },
    create: {
      jobId,
      vesselInwardDate,
      importGeneralManifest,
      exportGeneralManifest,
      ...(manifestSchema.customManifestValue ? { customManifestValue } : {}),
      containerDetails,
      mblNumber,
      hblNumber,
      deliveryOrderValidity,
      status: nextStatus,
      createdById: actorId,
      updatedById: actorId,
      completedById: nextStatus === "COMPLETED" ? actorId : null,
      completedAt: nextStatus === "COMPLETED" ? new Date() : null,
    },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobAdditionalData",
    entityId: additionalData.id,
    event: job.additionalData ? "ADDITIONAL_DATA_UPDATED" : "ADDITIONAL_DATA_CREATED",
    actorId,
    prevState: job.additionalData?.status ?? "NONE",
    newState: additionalData.status,
    remarks: `Additional Data ${job.additionalData ? "updated" : "created"} for job ${job.jobNumber}.`,
  });

  if ((job.additionalData?.importGeneralManifest ?? null) !== importGeneralManifest) {
    await logChaAudit({
      orgId,
      jobId,
      entityType: "ChaJobAdditionalData",
      entityId: additionalData.id,
      event: "CHA_JOB_IGM_UPDATED",
      actorId,
      prevState: job.additionalData?.importGeneralManifest ?? undefined,
      newState: importGeneralManifest ?? undefined,
      remarks: `IGM number updated for clearance type "${job.jobType.name}".`,
    });
  }

  if ((job.additionalData?.exportGeneralManifest ?? null) !== exportGeneralManifest) {
    await logChaAudit({
      orgId,
      jobId,
      entityType: "ChaJobAdditionalData",
      entityId: additionalData.id,
      event: "CHA_JOB_EGM_UPDATED",
      actorId,
      prevState: job.additionalData?.exportGeneralManifest ?? undefined,
      newState: exportGeneralManifest ?? undefined,
      remarks: `EGM number updated for clearance type "${job.jobType.name}".`,
    });
  }

  if ((job.additionalData?.customManifestValue ?? null) !== customManifestValue) {
    await logChaAudit({
      orgId,
      jobId,
      entityType: "ChaJobAdditionalData",
      entityId: additionalData.id,
      event: "CHA_JOB_CUSTOM_MANIFEST_UPDATED",
      actorId,
      prevState: job.additionalData?.customManifestValue ?? undefined,
      newState: customManifestValue ?? undefined,
      remarks: `${manifestConfig.manifestLabel} updated for clearance type "${job.jobType.name}".`,
    });
  }

  return additionalData;
}

export async function proceedAdditionalDataStage(actorId: string, orgId: string, jobId: string) {
  const manifestSchema = await getChaManifestSchemaState();
  const rawJob = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: {
      assignments: true,
      additionalData: { select: getAdditionalDataSelect(manifestSchema.customManifestValue) },
      jobType: { select: getChaJobTypeSelect(manifestSchema.jobTypeManifestConfig) },
    },
  });
  const job = {
    ...rawJob,
    additionalData: normalizeCompatibleAdditionalData(rawJob.additionalData, manifestSchema.customManifestValue),
    jobType: normalizeCompatibleJobType(
      rawJob.jobType as { id: string; orgId: string; name: string } & Partial<CompatibleChaJobType>,
      manifestSchema.jobTypeManifestConfig,
    ),
  };
  await assertCanAccessAdditionalData(actorId, job, "cha.additional_data.proceed");

  if (job.stage !== "ADDITIONAL_DATA") {
    throw new Error("Job is not in the Additional Data stage.");
  }
  const manifestConfig = validateJobTypeManifestConfiguration(job.jobType);
  if (!isAdditionalDataComplete(job.additionalData, manifestConfig)) {
    throw new Error(`Cannot proceed. Vessel inward date, ${manifestConfig.manifestLabel}, and DO validity are required.`);
  }

  const result = await db.$transaction(async (tx) => {
    const additionalData = await tx.chaJobAdditionalData.update({
      where: { jobId },
      data: {
        status: "COMPLETED",
        completedById: actorId,
        completedAt: new Date(),
        updatedById: actorId,
      },
    });
    const updatedJob = await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "CHECKLIST_PREPARATION" },
    });
    return { additionalData, updatedJob };
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJob",
    entityId: jobId,
    event: "ADDITIONAL_DATA_COMPLETED",
    actorId,
    prevState: "ADDITIONAL_DATA",
    newState: "CHECKLIST_PREPARATION",
    remarks: "Additional Data completed and workflow advanced to Checklist Preparation.",
  });

  return result;
}

type DoValidityWarning = {
  jobId: string;
  jobNumber: string;
  title: string;
  customerName: string;
  stage: string;
  deliveryOrderValidity: Date;
  daysUntilExpiry: number;
  severity: "expired" | "expiring";
};

export type Section49ValidityWarning = {
  jobId: string;
  jobNumber: string;
  validityDate: Date;
  daysUntilExpiry: number;
  severity: "expired" | "expiring";
};

export type FilingQueryEscalationWarning = {
  jobId: string;
  jobNumber: string;
  queryId: string;
  queryTitle: string;
  overdueQueryCount: number;
  reminderTriggeredAt: Date;
  warningTriggeredAt: Date;
  staleMinutes: number;
};

// Read-only: returns warnings without creating any notifications.
// Notification creation runs in a separate background job (createDeliveryOrderNotifications).
export async function listDeliveryOrderValidityWarnings(actorId: string, orgId: string): Promise<DoValidityWarning[]> {
  const [now, canViewAll, canViewIndicator] = await Promise.all([
    getNow(),
    can(actorId, "cha.job.view_all"),
    can(actorId, "cha.do_validity.view_indicator"),
  ]);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + 4);
  threshold.setHours(23, 59, 59, 999);

  const jobs = await db.chaJob.findMany({
    where: {
      ...getActiveChaJobWhere(orgId),
      status: "ACTIVE",
      stage: { not: "FILED" },
      additionalData: {
        status: "COMPLETED",
        deliveryOrderValidity: { lte: threshold },
      },
      ...(canViewAll || canViewIndicator
        ? {}
        : {
            OR: [
              { primaryOwnerId: actorId },
              { assignments: { some: { userId: actorId } } },
            ],
          }),
    },
    include: {
      additionalData: true,
      customer: { select: { name: true } },
    },
    orderBy: {
      additionalData: {
        deliveryOrderValidity: "asc",
      },
    },
    take: 20,
  });

  return jobs
    .filter((job) => job.additionalData?.deliveryOrderValidity)
    .map((job) => {
      const validity = job.additionalData!.deliveryOrderValidity!;
      const validityDay = new Date(validity);
      validityDay.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((validityDay.getTime() - today.getTime()) / 86_400_000);
      const severity: "expired" | "expiring" = daysUntilExpiry < 0 ? "expired" : "expiring";

      return {
        jobId: job.id,
        jobNumber: job.jobNumber,
        title: job.title,
        customerName: job.customer.name,
        stage: job.stage,
        deliveryOrderValidity: validity,
        daysUntilExpiry,
        severity,
      };
    });
}

// Separate mutation: creates/deduplicates DO validity notifications.
// Call from a background scheduler, not from polling GET endpoints.
export async function createDeliveryOrderNotifications(actorId: string, orgId: string): Promise<void> {
  const warnings = await listDeliveryOrderValidityWarnings(actorId, orgId);
  if (warnings.length === 0) return;

  const existingNotifications = await db.notification.findMany({
    where: {
      userId: actorId,
      kind: { in: ["CHA_DO_VALIDITY_EXPIRED", "CHA_DO_VALIDITY_EXPIRING"] },
      link: { in: warnings.map((w) => `/cha/jobs/${w.jobId}`) },
    },
    orderBy: { createdAt: "desc" },
  });

  const notifMap = new Map<string, typeof existingNotifications[0]>();
  for (const notif of existingNotifications) {
    const key = `${notif.kind}:${notif.link}`;
    if (!notifMap.has(key)) notifMap.set(key, notif);
  }

  const notificationsToCreate: Parameters<typeof createNotification>[0][] = [];

  for (const warning of warnings) {
    const kind = warning.severity === "expired" ? "CHA_DO_VALIDITY_EXPIRED" : "CHA_DO_VALIDITY_EXPIRING";
    const link = `/cha/jobs/${warning.jobId}`;
    const existing = notifMap.get(`${kind}:${link}`);

    let shouldCreate = true;
    if (existing) {
      const payload = existing.payload as Record<string, any> | null;
      if (payload && payload.deliveryOrderValidity === warning.deliveryOrderValidity.toISOString()) {
        shouldCreate = false;
      }
    }

    if (shouldCreate) {
      notificationsToCreate.push({
        userId: actorId,
        orgId,
        kind,
        title: warning.severity === "expired"
          ? `DO validity expired: ${warning.jobNumber}`
          : `DO validity expiring: ${warning.jobNumber}`,
        body: `${warning.customerName} delivery order validity ${
          warning.severity === "expired" ? "expired" : "expires"
        } on ${warning.deliveryOrderValidity.toLocaleDateString("en-IN")}.`,
        link,
        payload: {
          jobId: warning.jobId,
          jobNumber: warning.jobNumber,
          deliveryOrderValidity: warning.deliveryOrderValidity.toISOString(),
          daysUntilExpiry: warning.daysUntilExpiry,
          severity: warning.severity,
        },
        source: "CHA",
        variant: warning.severity === "expired" ? "destructive" : "warning",
        priority: "important",
      });
    }
  }

  if (notificationsToCreate.length > 0) {
    await Promise.all(notificationsToCreate.map((n) => createNotification(n)));
  }
}

export async function acknowledgeDeliveryOrderValidityWarning(
  actorId: string,
  orgId: string,
  jobId: string
) {
  const now = await getNow();
  const notifications = await db.notification.findMany({
    where: {
      userId: actorId,
      orgId,
      link: `/cha/jobs/${jobId}`,
      kind: { in: ["CHA_DO_VALIDITY_EXPIRED", "CHA_DO_VALIDITY_EXPIRING"] },
      dismissedAt: null,
      acknowledgedAt: null,
    },
  });

  if (notifications.length > 0) {
    const ids = notifications.map((n) => n.id);
    await db.notification.updateMany({
      where: { id: { in: ids } },
      data: {
        acknowledgedAt: now,
        readAt: now,
      },
    });

    for (const id of ids) {
      await recordNotificationActivity({
        notificationId: id,
        orgId,
        actorId,
        event: "ACKNOWLEDGED",
      });
    }
  }

  await logChaAudit({
    orgId,
    jobId,
    entityType: "CHA_JOB",
    entityId: jobId,
    event: "DO_VALIDITY_ACKNOWLEDGED",
    actorId,
    remarks: `User acknowledged Delivery Order Validity warning.`,
    metadata: {
      acknowledgedAt: now.toISOString(),
    },
  });

  return { ok: true };
}

// ─── Delivery Order document upload & extension flow ─────────────────────────
//
// Under Delivery Order Validity the user can:
// 1. Toggle "DO document upload" to unlock a DO file upload tab.
// 2. Toggle "Extension" to unlock the extension flow. The extension itself can
//    only be applied while a DO validity warning is active (expired or inside
//    the warning window) — the "Extension" action sits next to Acknowledge on
//    the warning notification and opens a popup for the new validity date +
//    extension file. Applying it updates deliveryOrderValidity (the displayed
//    column), dismisses the active DO notifications, and re-enters the normal
//    warning pipeline so a fresh notification appears before the new date.

const DO_DOCUMENT_CATEGORY = "Customs Validity Documents";
const DO_DOCUMENT_REQUIREMENT_NAME = "Delivery Order";
const SECTION49_DOCUMENT_NAME = "Section 49";
const SECTION49_VALIDITY_NOTIFICATION_KINDS = ["CHA_SECTION49_VALIDITY_EXPIRED", "CHA_SECTION49_VALIDITY_EXPIRING"];

async function getAdditionalDataForDoFlow(orgId: string, jobId: string) {
  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: { additionalData: true },
  });
  if (!job.additionalData) {
    throw new Error("Complete the Additional Data section before configuring Delivery Order options.");
  }
  return { job, additionalData: job.additionalData };
}

export async function setDeliveryOrderUploadToggle(
  actorId: string,
  orgId: string,
  jobId: string,
  enabled: boolean,
) {
  const { additionalData } = await getAdditionalDataForDoFlow(orgId, jobId);
  const updated = await db.chaJobAdditionalData.update({
    where: { id: additionalData.id },
    data: { doUploadEnabled: enabled, updatedById: actorId },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobAdditionalData",
    entityId: additionalData.id,
    event: "DO_UPLOAD_TOGGLED",
    actorId,
    prevState: String(additionalData.doUploadEnabled),
    newState: String(enabled),
    remarks: `Delivery Order document upload ${enabled ? "enabled" : "disabled"}.`,
  });

  return updated;
}

export async function setDeliveryOrderExtensionToggle(
  actorId: string,
  orgId: string,
  jobId: string,
  enabled: boolean,
) {
  const { additionalData } = await getAdditionalDataForDoFlow(orgId, jobId);
  const updated = await db.chaJobAdditionalData.update({
    where: { id: additionalData.id },
    data: { doExtensionEnabled: enabled, updatedById: actorId },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobAdditionalData",
    entityId: additionalData.id,
    event: "DO_EXTENSION_TOGGLED",
    actorId,
    prevState: String(additionalData.doExtensionEnabled),
    newState: String(enabled),
    remarks: `Delivery Order extension flow ${enabled ? "enabled" : "disabled"}.`,
  });

  return updated;
}

async function storeDeliveryOrderFile(
  jobId: string,
  actorId: string,
  fileData: { fileName: string; mimeType: string },
  fileBuffer: Buffer,
  driveLabel: string,
): Promise<{ fileKey: string; storedFileName: string }> {
  const storedFileName = buildDriveStoredFileName(driveLabel, fileData.fileName);
  let driveFolderId: string | undefined;
  try {
    driveFolderId = await ensureJobCategoryFolder(jobId, DO_DOCUMENT_CATEGORY, actorId);
  } catch (err: any) {
    console.warn(`[DO Upload] Drive folder self-heal failed for job ${jobId}:`, err.message || err);
    const profile = await db.jobWorkspaceProfile.findUnique({ where: { jobId } });
    driveFolderId = resolveDriveFolderForCategory(
      profile?.categoryFolders as Record<string, string> | undefined,
      profile?.rootFolderId,
      DO_DOCUMENT_CATEGORY,
    );
  }

  if (driveFolderId && !driveFolderId.startsWith("mock-")) {
    try {
      const uploadResult = await driveClient.uploadFile({
        name: storedFileName,
        mimeType: fileData.mimeType,
        parentFolderId: driveFolderId,
        fileBuffer,
      });
      return { fileKey: uploadResult.webViewLink, storedFileName };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Google Drive upload failed: ${err.message || err}`);
      }
      console.warn("[DO Upload] Google Drive upload failed. Falling back to mock URL:", err.message || err);
      return {
        fileKey: `https://drive.google.com/file/d/mock-uploaded-${Math.random().toString(36).substring(7)}/view`,
        storedFileName,
      };
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Google Drive is not provisioned for this job. Please retry provisioning the workspace.");
  }
  return {
    fileKey: `https://drive.google.com/file/d/mock-uploaded-${Math.random().toString(36).substring(7)}/view`,
    storedFileName,
  };
}

export async function listSection49ValidityWarnings(
  actorId: string,
  orgId: string,
): Promise<Section49ValidityWarning[]> {
  const [now, canViewAll] = await Promise.all([
    getNow(),
    can(actorId, "cha.job.view_all"),
  ]);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + 4);
  threshold.setHours(23, 59, 59, 999);

  const jobs = await db.chaJob.findMany({
    where: {
      ...getActiveChaJobWhere(orgId),
      status: "ACTIVE",
      stage: { not: "FILED" },
      filingSection49Flag: {
        isEnabled: true,
        validityDate: { lte: threshold },
      },
      ...(canViewAll
        ? {}
        : {
            OR: [
              { primaryOwnerId: actorId },
              { assignedManagerId: actorId },
              { assignments: { some: { userId: actorId } } },
            ],
          }),
    },
    include: {
      filingSection49Flag: {
        select: {
          validityDate: true,
        },
      },
    },
  });

  return jobs.flatMap((job) => {
    const validityDate = job.filingSection49Flag?.validityDate;
    if (!validityDate) {
      return [];
    }

    const expiry = new Date(validityDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 4) {
      return [];
    }

    return [
      {
        jobId: job.id,
        jobNumber: job.jobNumber,
        validityDate,
        daysUntilExpiry: diffDays,
        severity: diffDays < 0 ? "expired" : "expiring",
      } satisfies Section49ValidityWarning,
    ];
  });
}

export async function uploadDeliveryOrderDocument(
  actorId: string,
  orgId: string,
  jobId: string,
  fileData: { fileName: string; mimeType: string; sizeBytes: number },
  fileBuffer: Buffer,
) {
  const { additionalData } = await getAdditionalDataForDoFlow(orgId, jobId);
  if (!additionalData.doUploadEnabled) {
    throw new Error("Enable the Delivery Order document upload toggle before uploading.");
  }

  const { fileKey, storedFileName } = await storeDeliveryOrderFile(
    jobId,
    actorId,
    fileData,
    fileBuffer,
    DO_DOCUMENT_REQUIREMENT_NAME,
  );
  const now = await getNow();

  const updated = await db.$transaction(async (tx) => {
    const updatedAdditionalData = await tx.chaJobAdditionalData.update({
      where: { id: additionalData.id },
      data: {
        doDocumentFileKey: fileKey,
        doDocumentFileName: storedFileName,
        doDocumentUploadedAt: now,
        doDocumentUploadedById: actorId,
        updatedById: actorId,
      },
    });

    let requirement = await tx.chaJobDocumentRequirement.findFirst({
      where: {
        jobId,
        name: DO_DOCUMENT_REQUIREMENT_NAME,
        category: DO_DOCUMENT_CATEGORY,
      },
    });
    if (!requirement) {
      requirement = await tx.chaJobDocumentRequirement.create({
        data: {
          jobId,
          name: DO_DOCUMENT_REQUIREMENT_NAME,
          category: DO_DOCUMENT_CATEGORY,
          isMandatory: false,
          status: "PENDING",
        },
      });
    }

    await tx.chaDocumentVersion.updateMany({
      where: { requirementId: requirement.id, isCurrent: true },
      data: { isCurrent: false },
    });
    await tx.chaDocumentVersion.create({
      data: {
        requirementId: requirement.id,
        fileKey,
        fileName: storedFileName,
        mimeType: fileData.mimeType,
        sizeBytes: fileData.sizeBytes,
        uploadedById: actorId,
        uploadedAt: now,
        source: "ADDITIONAL_DATA",
        timelineVisible: true,
        validityDate: updatedAdditionalData.deliveryOrderValidity,
      },
    });
    await tx.chaJobDocumentRequirement.update({
      where: { id: requirement.id },
      data: { status: "UPLOADED" },
    });
    await tx.chaDocumentException.deleteMany({
      where: { requirementId: requirement.id },
    });

    return updatedAdditionalData;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobAdditionalData",
    entityId: additionalData.id,
    event: "DO_DOCUMENT_UPLOADED",
    actorId,
    remarks: `Delivery Order document uploaded: ${storedFileName}`,
    metadata: { fileKey, fileName: storedFileName },
  });

  return updated;
}

/**
 * Apply a Delivery Order extension from the validity warning notification.
 * Only allowed while a warning is actually active (expired or inside the
 * warning window) and the extension toggle is on. Updates the validity date,
 * records the extension history, and dismisses the active DO notifications
 * for every user so the warning disappears until the new date approaches.
 */
export async function applyDeliveryOrderExtension(
  actorId: string,
  orgId: string,
  jobId: string,
  input: {
    extensionDate: Date;
    fileData?: { fileName: string; mimeType: string; sizeBytes: number } | null;
    fileBuffer?: Buffer | null;
  },
) {
  const { additionalData } = await getAdditionalDataForDoFlow(orgId, jobId);
  if (!additionalData.doExtensionEnabled) {
    throw new Error("Enable the Delivery Order extension toggle in Additional Data before applying an extension.");
  }
  if (Number.isNaN(input.extensionDate.getTime())) {
    throw new Error("Enter a valid extension date.");
  }

  const now = await getNow();
  const previousValidity = additionalData.deliveryOrderValidity;
  if (!previousValidity) {
    throw new Error("Delivery Order Validity must be set before an extension can be applied.");
  }
  if (input.extensionDate.getTime() <= previousValidity.getTime()) {
    throw new Error("The extension date must be after the current Delivery Order validity date.");
  }

  // Extension is only available once the warning window is active.
  const warningThreshold = new Date(now);
  warningThreshold.setDate(warningThreshold.getDate() + 4);
  warningThreshold.setHours(23, 59, 59, 999);
  if (previousValidity.getTime() > warningThreshold.getTime()) {
    throw new Error("Extensions can only be applied while a Delivery Order validity warning is active.");
  }

  let fileKey: string | null = null;
  let storedExtensionFileName: string | null = null;
  if (input.fileBuffer && input.fileData) {
    const uploaded = await storeDeliveryOrderFile(jobId, actorId, input.fileData, input.fileBuffer, "Delivery Order Extension");
    fileKey = uploaded.fileKey;
    storedExtensionFileName = uploaded.storedFileName;
  }

  const extension = await db.$transaction(async (tx) => {
    const record = await tx.chaDoExtension.create({
      data: {
        jobId,
        previousValidity,
        extensionDate: input.extensionDate,
        fileKey,
        fileName: storedExtensionFileName,
        appliedById: actorId,
      },
    });

    // Reflected in the Delivery Order Validity column everywhere it is shown.
    await tx.chaJobAdditionalData.update({
      where: { id: additionalData.id },
      data: {
        deliveryOrderValidity: input.extensionDate,
        updatedById: actorId,
      },
    });

    // The existing DO warning notifications disappear for all users; the
    // notification pipeline re-creates them ahead of the new date.
    await tx.notification.updateMany({
      where: {
        orgId,
        link: `/cha/jobs/${jobId}`,
        kind: { in: ["CHA_DO_VALIDITY_EXPIRED", "CHA_DO_VALIDITY_EXPIRING"] },
        dismissedAt: null,
      },
      data: { dismissedAt: now, readAt: now },
    });

    return record;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaDoExtension",
    entityId: extension.id,
    event: "DO_EXTENSION_APPLIED",
    actorId,
    prevState: previousValidity.toISOString(),
    newState: input.extensionDate.toISOString(),
    remarks: `Delivery Order validity extended from ${previousValidity.toLocaleDateString("en-IN")} to ${input.extensionDate.toLocaleDateString("en-IN")}.${storedExtensionFileName ? ` Extension document: ${storedExtensionFileName}.` : ""}`,
    metadata: {
      extensionId: extension.id,
      fileKey,
      fileName: storedExtensionFileName,
    },
  });

  return extension;
}

export async function listDeliveryOrderExtensions(orgId: string, jobId: string) {
  await db.chaJob.findFirstOrThrow({ where: getActiveChaJobByIdWhere(orgId, jobId), select: { id: true } });
  return db.chaDoExtension.findMany({
    where: { jobId },
    orderBy: { createdAt: "desc" },
  });
}

export async function uploadChecklistFile(
  actorId: string,
  orgId: string,
  jobId: string,
  fileData: {
    fileKey?: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    remarks?: string;
  },
  fileBuffer?: Buffer,
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: {
      assignments: true,
      checklistWorkflow: {
        include: {
          fileVersions: { orderBy: { versionNumber: "desc" }, take: 1 },
        },
      },
    },
  });
  await assertCanAccessChecklist(actorId, job, "cha.checklist.upload");

  if (job.stage === "DOCUMENT_COLLECTION" || job.stage === "ADDITIONAL_DATA") {
    throw new Error("Complete the previous workflow stages before uploading the checklist.");
  }
  if (!fileData.fileName.trim()) {
    throw new Error("Checklist file name is required.");
  }
  if (!fileBuffer && !fileData.fileKey?.trim()) {
    throw new Error("Checklist file reference is required.");
  }
  if (fileData.sizeBytes <= 0) {
    throw new Error("Checklist file is empty.");
  }

  const previousVersion = job.checklistWorkflow?.fileVersions[0]?.versionNumber ?? 0;
  const nextVersion = previousVersion + 1;
  const storedFileName = buildDriveStoredFileName(`Checklist V${nextVersion}`, fileData.fileName);

  let fileKey = fileData.fileKey?.trim() || "";
  if (fileBuffer) {
    let driveFolderId: string | undefined;
    try {
      driveFolderId = await ensureJobCategoryFolder(jobId, CHECKLIST_DOCUMENT_CATEGORY, actorId);
    } catch (err: any) {
      console.warn(`[Checklist Upload] Drive folder self-heal failed for job ${jobId}:`, err.message || err);
      const profile = await db.jobWorkspaceProfile.findUnique({ where: { jobId } });
      driveFolderId = resolveDriveFolderForCategory(
        profile?.categoryFolders as Record<string, string> | undefined,
        profile?.rootFolderId,
        CHECKLIST_DOCUMENT_CATEGORY,
      );
    }

    if (driveFolderId && !driveFolderId.startsWith("mock-")) {
      try {
        const uploadResult = await driveClient.uploadFile({
          name: storedFileName,
          mimeType: fileData.mimeType || "application/octet-stream",
          parentFolderId: driveFolderId,
          fileBuffer,
        });
        fileKey = uploadResult.webViewLink;
      } catch (err: any) {
        if (process.env.NODE_ENV === "production") {
          throw new Error(`Google Drive upload failed: ${err.message || err}`);
        }
        console.warn("[Checklist Upload] Google Drive upload failed. Falling back to mock URL:", err.message || err);
        fileKey = `https://drive.google.com/file/d/mock-uploaded-${Math.random().toString(36).substring(7)}/view`;
      }
    } else if (process.env.NODE_ENV === "production") {
      throw new Error("Google Drive is not provisioned for this job. Please retry provisioning the workspace.");
    } else {
      fileKey = `https://drive.google.com/file/d/mock-uploaded-${Math.random().toString(36).substring(7)}/view`;
    }
  }

  const internalApproverIds = await getChecklistInternalApproverIds(orgId, job);
  if (internalApproverIds.length === 0) {
    throw new Error("No internal checklist approver is configured for this job.");
  }

  const previousStatus = job.checklistWorkflow?.status ?? "PENDING_UPLOAD";

  const result = await db.$transaction(async (tx) => {
    const checklist = job.checklistWorkflow
      ? await tx.chaChecklist.update({
          where: { id: job.checklistWorkflow.id },
          data: {
            status: "INTERNAL_APPROVAL_PENDING",
            currentApprovalStage: "INTERNAL",
            updatedById: actorId,
          },
        })
      : await tx.chaChecklist.create({
          data: {
            jobId,
            status: "INTERNAL_APPROVAL_PENDING",
            currentApprovalStage: "INTERNAL",
            createdById: actorId,
            updatedById: actorId,
          },
        });

    const fileVersion = await tx.chaChecklistFileVersion.create({
      data: {
        checklistId: checklist.id,
        fileKey,
        originalFileName: fileData.fileName,
        mimeType: fileData.mimeType || "application/octet-stream",
        fileSize: fileData.sizeBytes,
        uploadedById: actorId,
        versionNumber: nextVersion,
        remarks: fileData.remarks,
      },
    });

    await tx.chaChecklist.update({
      where: { id: checklist.id },
      data: {
        currentFileVersionId: fileVersion.id,
        updatedById: actorId,
      },
    });

    await tx.chaChecklistDecision.createMany({
      data: internalApproverIds.map((approverId) => ({
        checklistId: checklist.id,
        fileVersionId: fileVersion.id,
        stage: "INTERNAL",
        action: "PENDING",
        assignedToId: approverId,
      })),
    });

    await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "CHECKLIST_APPROVAL" },
    });

    return { checklist, fileVersion };
  });

  const isReupload = previousVersion > 0;
  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklistFileVersion",
    entityId: result.fileVersion.id,
    event: isReupload ? "CHECKLIST_FILE_REUPLOADED" : "CHECKLIST_FILE_UPLOADED",
    actorId,
    prevState: previousStatus,
    newState: "INTERNAL_APPROVAL_PENDING",
    remarks: `${isReupload ? "Reuploaded" : "Uploaded"} checklist file ${fileData.fileName}.`,
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklist",
    entityId: result.checklist.id,
    event: "CHECKLIST_INTERNAL_APPROVAL_REQUESTED",
    actorId,
    prevState: previousStatus,
    newState: "INTERNAL_APPROVAL_PENDING",
    remarks: `Checklist routed for internal approval with file ${fileData.fileName}.`,
  });

  await queueChecklistNotifications({
    userIds: internalApproverIds,
    orgId,
    kind: "CHA_CHECKLIST_INTERNAL_APPROVAL_REQUESTED",
    title: `Checklist Review Required: ${job.jobNumber}`,
    body: `${job.primaryOwnerId === actorId ? "Concerned user" : "Uploader"} submitted checklist file ${fileData.fileName} for internal approval.`,
    link: `/cha/jobs/${jobId}`,
  });

  return result;
}

export async function submitChecklistInternalDecision(
  actorId: string,
  orgId: string,
  jobId: string,
  checklistId: string,
  decision: "APPROVED" | "REJECTED",
  remarks?: string
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: {
      assignments: true,
      customer: true,
      checklistWorkflow: {
        include: {
          currentFileVersion: true,
          approvals: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const checklist = job.checklistWorkflow;
  if (!checklist || checklist.id !== checklistId || !checklist.currentFileVersion) {
    throw new Error("Checklist record not found for this job.");
  }
  if (checklist.currentApprovalStage !== "INTERNAL") {
    throw new Error("Checklist is not awaiting internal approval.");
  }

  const internalApproverIds = await getChecklistInternalApproverIds(orgId, job);
  if (!internalApproverIds.includes(actorId)) {
    throw new Error("Only the job owner, assigned Manager, or Team Lead can internally approve this checklist.");
  }

  const pendingApprovals = checklist.approvals.filter(
    (approval) =>
      approval.fileVersionId === checklist.currentFileVersionId &&
      approval.stage === "INTERNAL" &&
      approval.action === "PENDING",
  );

  const result = await db.$transaction(async (tx) => {
    const existingPending = pendingApprovals.find((approval) => approval.assignedToId === actorId);
    if (existingPending) {
      await tx.chaChecklistDecision.update({
        where: { id: existingPending.id },
        data: {
          action: decision,
          actedById: actorId,
          actedAt: await getNow(),
          remarks,
        },
      });
    } else {
      await tx.chaChecklistDecision.create({
        data: {
          checklistId: checklist.id,
          fileVersionId: checklist.currentFileVersionId!,
          stage: "INTERNAL",
          action: decision,
          assignedToId: actorId,
          actedById: actorId,
          actedAt: await getNow(),
          remarks,
        },
      });
    }

    if (decision === "REJECTED") {
      await tx.chaChecklist.update({
        where: { id: checklist.id },
        data: {
          status: "REWORK_REQUIRED",
          currentApprovalStage: "UPLOAD",
          updatedById: actorId,
        },
      });

      await tx.chaJob.update({
        where: { id: jobId },
        data: { stage: "CHECKLIST_PREPARATION" },
      });

      return { outcome: "REJECTED" as const };
    }

    const approvals = await tx.chaChecklistDecision.findMany({
      where: {
        checklistId: checklist.id,
        fileVersionId: checklist.currentFileVersionId!,
        stage: "INTERNAL",
      },
    });
    const policySatisfied = internalApproverIds.some((approverId) =>
      approvals.some((approval) => approval.assignedToId === approverId && approval.action === "APPROVED"),
    );

    if (!policySatisfied) {
      return { outcome: "PENDING_OTHERS" as const };
    }

    if (checklist.customerRejectedOnce) {
      await applyChecklistWorkflowToFiling(tx, {
        actorId,
        orgId,
        jobId,
        checklistId: checklist.id,
        checklistStatus: "FILING_READY",
        remarks: "Customer-rejected checklist was reworked, internally approved, and moved directly to Filing.",
      });

      return { outcome: "MOVED_TO_FILING" as const };
    }

    const customerApproverIds = await getChecklistCustomerApproverIds(job);
    await tx.chaChecklist.update({
      where: { id: checklist.id },
      data: {
        status: "CUSTOMER_APPROVAL_PENDING",
        currentApprovalStage: "CUSTOMER",
        customerApprovalAttempted: true,
        customerApprovalVisibleAt: null,
        updatedById: actorId,
      },
    });

    await tx.chaChecklistDecision.createMany({
      data: customerApproverIds.map((approverId) => ({
        checklistId: checklist.id,
        fileVersionId: checklist.currentFileVersionId!,
        stage: "CUSTOMER",
        action: "PENDING",
        assignedToId: approverId,
      })),
    });

    return { outcome: "CUSTOMER_APPROVAL" as const, customerApproverIds };
  });

  const emailAutomation =
    result.outcome === "CUSTOMER_APPROVAL"
      ? await queueChecklistMainAutomationForJob({
          actorId,
          orgId,
          job,
          checklist,
        }).catch((error) => ({
          queued: false,
          warning:
            error instanceof Error
              ? `Checklist saved, but customer email could not be queued: ${error.message}`
              : "Checklist saved, but customer email could not be queued.",
        }))
      : null;

  await logChecklistApprovalAudit({
    orgId,
    jobId,
    jobNumber: job.jobNumber,
    checklistId: checklist.id,
    event: decision === "APPROVED" ? "CHECKLIST_INTERNAL_APPROVED" : "CHECKLIST_INTERNAL_REJECTED",
    actorId,
    approvalType: "INTERNAL_APPROVAL",
    prevState: "INTERNAL_APPROVAL_PENDING",
    newState:
      result.outcome === "REJECTED"
        ? "REWORK_REQUIRED"
        : result.outcome === "MOVED_TO_FILING"
        ? "FILING_READY"
        : "CUSTOMER_APPROVAL_PENDING",
    source: "/cha/jobs/[jobId]::submitChecklistInternalDecision",
    remarks: remarks || `Internal ${decision.toLowerCase()} for checklist.`,
  });

  if (result.outcome === "REJECTED") {
    await queueChecklistNotifications({
      userIds: [job.primaryOwnerId],
      orgId,
      kind: "CHA_CHECKLIST_INTERNAL_REJECTED",
      title: `Checklist Rework Required: ${job.jobNumber}`,
      body: `Checklist was internally rejected.${remarks ? ` Reason: ${remarks}` : ""}`,
      link: `/cha/jobs/${jobId}`,
    });
  } else if (result.outcome === "CUSTOMER_APPROVAL") {
    const { actorName: approverName } = await getChecklistApprovalActorSummary(actorId);
    await queueChecklistNotifications({
      userIds: result.customerApproverIds ?? [],
      orgId,
      kind: "CHA_CHECKLIST_CUSTOMER_APPROVAL_REQUESTED",
      title: `Customer Approval Required: ${job.jobNumber}`,
      body: `Job: ${job.jobNumber} | Customer: ${job.customer?.name || "Customer"} | File: ${checklist.currentFileVersion?.originalFileName || "Checklist"} | Internally approved by: ${approverName}.`,
      link: `/cha/jobs/${jobId}`,
    });
  } else if (result.outcome === "MOVED_TO_FILING") {
    const filingRecipients = job.assignments
      .filter((assignment) => assignment.responsibility === "FILING" || assignment.responsibility === "OPERATIONS")
      .map((assignment) => assignment.userId);
    await queueChecklistNotifications({
      userIds: [job.primaryOwnerId, ...filingRecipients],
      orgId,
      kind: "CHA_CHECKLIST_READY_FOR_FILING",
      title: `Checklist Ready For Filing: ${job.jobNumber}`,
      body: `Checklist was internally approved after customer rework and moved directly to Filing.`,
      link: `/cha/jobs/${jobId}`,
    });
  }

  return {
    ...result,
    emailAutomation,
  };
}

export async function sendChecklistCustomerMail(
  actorId: string,
  orgId: string,
  jobId: string,
  checklistId: string,
  input: {
    subject: string;
    body: string;
  },
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: {
      customer: true,
      assignments: true,
      checklistWorkflow: {
        include: {
          currentFileVersion: true,
          customerMailLogs: {
            orderBy: { sentAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const checklist = job.checklistWorkflow;
  if (!checklist || checklist.id !== checklistId || !checklist.currentFileVersion) {
    throw new Error("Checklist record not found for this job.");
  }
  const currentFileVersion = checklist.currentFileVersion;
  if (checklist.currentApprovalStage !== "CUSTOMER") {
    throw new Error("Customer mail can only be sent after internal approval routes the checklist to customer approval.");
  }

  const canSendMail =
    actorId === job.primaryOwnerId ||
    job.assignments.some((assignment) => assignment.userId === actorId) ||
    (await can(actorId, "cha.job.view_all"));
  if (!canSendMail) {
    throw new ForbiddenError("cha.job.update");
  }

  const recipients = await getChecklistCustomerMailRecipients(job.customerId);
  if (recipients.length === 0) {
    throw new Error("No active customer approval email is configured for this customer.");
  }

  const delayMinutes = await getChecklistCustomerApprovalDelayMinutesForJob(orgId, job.jobTypeId);
  const sentAt = await getNow();
  const approvalVisibleAt = new Date(sentAt.getTime() + delayMinutes * 60_000);
  const accessToken = await getValidAccessToken(actorId);
  const driveFileId = driveClient.extractDriveFileId(currentFileVersion.fileKey);
  if (!driveFileId || driveFileId.startsWith("mock-")) {
    throw new Error("Checklist attachment is not available in Google Drive for Gmail draft creation.");
  }

  const [attachmentMetadata, attachmentContent] = await Promise.all([
    driveClient.getFileMetadata(driveFileId, accessToken),
    driveClient.downloadFile(driveFileId, accessToken),
  ]);
  if (!attachmentMetadata) {
    throw new Error("Checklist attachment metadata could not be loaded from Google Drive.");
  }

  const draft = await createGmailDraft({
    userId: actorId,
    to: recipients.map((recipient) => recipient.email).join(", "),
    subject: input.subject.trim(),
    body: input.body,
    attachments: [
      {
        filename: attachmentMetadata.name || currentFileVersion.originalFileName,
        mimeType: attachmentMetadata.mimeType || currentFileVersion.mimeType || "application/octet-stream",
        content: attachmentContent,
      },
    ],
  });
  const mailLog = await db.$transaction(async (tx) => {
    await tx.chaChecklist.update({
      where: { id: checklist.id },
      data: {
        customerApprovalVisibleAt: approvalVisibleAt,
        customerApprovalAttempted: true,
        updatedById: actorId,
      },
    });

    return tx.chaChecklistMailLog.create({
      data: {
        checklistId: checklist.id,
        fileVersionId: checklist.currentFileVersionId!,
        sentById: actorId,
        recipients: recipients.map((entry) => entry.email),
        subject: input.subject.trim(),
        body: input.body,
        attachmentFileKey: currentFileVersion.fileKey,
        attachmentFileName: attachmentMetadata.name || currentFileVersion.originalFileName,
        sentAt,
        approvalVisibleAt,
      },
    });
  });

  await logChecklistApprovalAudit({
    orgId,
    jobId,
    jobNumber: job.jobNumber,
    checklistId: checklist.id,
    event: "CHECKLIST_CUSTOMER_MAIL_SENT",
    actorId,
    approvalType: "CUSTOMER_APPROVAL",
    prevState: "CUSTOMER_APPROVAL_PENDING",
    newState: "CUSTOMER_APPROVAL_WAITING_WINDOW",
    source: "/cha/jobs/[jobId]::sendChecklistCustomerMail",
    remarks: `Customer approval Gmail draft created for ${recipients.map((entry) => entry.email).join(", ")} with checklist attachment ${attachmentMetadata.name || checklist.currentFileVersion.originalFileName}.`,
  });

  return {
    id: mailLog.id,
    recipients,
    approvalVisibleAt,
    attachmentFileName: attachmentMetadata.name || checklist.currentFileVersion.originalFileName,
    gmailComposeUrl: `https://mail.google.com/mail/u/0/#drafts?compose=${draft.id}`,
    draftId: draft.id,
    draftMessageId: draft.message.id,
  };
}

export async function submitChecklistCustomerDecision(
  actorId: string,
  orgId: string,
  jobId: string,
  checklistId: string,
  decision: "APPROVED" | "REJECTED",
  remarks?: string
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: {
      assignments: true,
      checklistWorkflow: {
        include: {
          currentFileVersion: true,
          approvals: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const checklist = job.checklistWorkflow;
  if (!checklist || checklist.id !== checklistId || !checklist.currentFileVersion) {
    throw new Error("Checklist record not found for this job.");
  }
  if (checklist.currentApprovalStage !== "CUSTOMER") {
    throw new Error("Checklist is not awaiting customer approval.");
  }

  const customerApproverIds = await getChecklistCustomerApproverIds(job);
  if (!customerApproverIds.includes(actorId)) {
    throw new Error("Only a concerned job user can customer-approve this checklist.");
  }
  if (!checklist.customerApprovalVisibleAt) {
    throw new Error("Customer approval cannot be actioned until the checklist mail has been sent.");
  }
  const now = await getNow();
  if (checklist.customerApprovalVisibleAt.getTime() > now.getTime()) {
    throw new Error("Customer approval is locked until the configured mail delay window has elapsed.");
  }

  const existingPending = checklist.approvals.find(
    (approval) =>
      approval.fileVersionId === checklist.currentFileVersionId &&
      approval.stage === "CUSTOMER" &&
      approval.action === "PENDING" &&
      approval.assignedToId === actorId,
  );

  const result = await db.$transaction(async (tx) => {
    if (existingPending) {
      await tx.chaChecklistDecision.update({
        where: { id: existingPending.id },
        data: {
          action: decision,
          actedById: actorId,
          actedAt: await getNow(),
          remarks,
        },
      });
    } else {
      await tx.chaChecklistDecision.create({
        data: {
          checklistId: checklist.id,
          fileVersionId: checklist.currentFileVersionId!,
          stage: "CUSTOMER",
          action: decision,
          assignedToId: actorId,
          actedById: actorId,
          actedAt: await getNow(),
          remarks,
        },
      });
    }

    if (decision === "REJECTED") {
      await tx.chaChecklist.update({
        where: { id: checklist.id },
        data: {
          status: "CUSTOMER_REWORK_REQUIRED",
          currentApprovalStage: "UPLOAD",
          customerRejectedOnce: true,
          customerApprovalAttempted: true,
          updatedById: actorId,
        },
      });

      await tx.chaJob.update({
        where: { id: jobId },
        data: { stage: "CHECKLIST_PREPARATION" },
      });

      return { outcome: "REJECTED" as const };
    }

    await applyChecklistWorkflowToFiling(tx, {
      actorId,
      orgId,
      jobId,
      checklistId: checklist.id,
      checklistStatus: "CUSTOMER_APPROVED",
      remarks: "Customer approved checklist and workflow advanced to Filing.",
    });

    return { outcome: "APPROVED" as const };
  });

  await logChecklistApprovalAudit({
    orgId,
    jobId,
    jobNumber: job.jobNumber,
    checklistId: checklist.id,
    event: decision === "APPROVED" ? "CHECKLIST_CUSTOMER_APPROVED" : "CHECKLIST_CUSTOMER_REJECTED",
    actorId,
    approvalType: "CUSTOMER_APPROVAL",
    prevState: "CUSTOMER_APPROVAL_PENDING",
    newState: decision === "APPROVED" ? "CUSTOMER_APPROVED" : "CUSTOMER_REWORK_REQUIRED",
    source: "/cha/jobs/[jobId]::submitChecklistCustomerDecision",
    remarks: remarks || `Customer ${decision.toLowerCase()} checklist.`,
  });

  if (result.outcome === "REJECTED") {
    const internalApproverIds = await getChecklistInternalApproverIds(orgId, job);
    await queueChecklistNotifications({
      userIds: [job.primaryOwnerId, ...internalApproverIds],
      orgId,
      kind: "CHA_CHECKLIST_CUSTOMER_REJECTED",
      title: `Customer Rework Required: ${job.jobNumber}`,
      body: `Customer rejected the checklist.${remarks ? ` Reason: ${remarks}` : ""} After rework, internal approval will route it directly to Filing.`,
      link: `/cha/jobs/${jobId}`,
    });
  } else {
    const filingRecipients = job.assignments
      .filter((assignment) => assignment.responsibility === "FILING" || assignment.responsibility === "OPERATIONS")
      .map((assignment) => assignment.userId);
    await queueChecklistNotifications({
      userIds: [job.primaryOwnerId, ...filingRecipients],
      orgId,
      kind: "CHA_CHECKLIST_CUSTOMER_APPROVED",
      title: `Checklist Approved By Customer: ${job.jobNumber}`,
      body: `Customer approved the checklist. Filing is now ready.`,
      link: `/cha/jobs/${jobId}`,
    });
  }

  return result;
}

// Parse and validate Excel checklist
export async function importChecklistExcel(
  actorId: string,
  orgId: string,
  jobId: string,
  fileBuffer: Buffer,
  fileName: string,
  fileSize: number
) {
  const manifestSchema = await getChaManifestSchemaState();
  const rawJob = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: {
      additionalData: { select: getAdditionalDataSelect(manifestSchema.customManifestValue) },
      jobType: { select: getChaJobTypeSelect(manifestSchema.jobTypeManifestConfig) },
    },
  });
  const job = {
    ...rawJob,
    additionalData: normalizeCompatibleAdditionalData(rawJob.additionalData, manifestSchema.customManifestValue),
    jobType: normalizeCompatibleJobType(
      rawJob.jobType as { id: string; orgId: string; name: string } & Partial<CompatibleChaJobType>,
      manifestSchema.jobTypeManifestConfig,
    ),
  };

  // Check doc gate first
  const gate = await verifyDocumentGate(jobId);
  if (!gate.passed) {
    throw new Error(
      `Cannot import checklist. The following mandatory documents are pending upload/exception: ${gate.blockingRequirements
        .map((r) => r.name)
        .join(", ")}`
    );
  }

  if (job.stage === "DOCUMENT_COLLECTION") {
    throw new Error("Cannot import checklist. Complete Document Collection and Additional Data first.");
  }
  const manifestConfig = validateJobTypeManifestConfiguration(job.jobType);
  if (job.stage === "ADDITIONAL_DATA" && !isAdditionalDataComplete(job.additionalData, manifestConfig)) {
    throw new Error("Cannot import checklist. Complete the Additional Data process first.");
  }

  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  if (workbook.SheetNames.length === 0) {
    throw new Error("Invalid Excel file: No sheets found.");
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  if (rows.length === 0) {
    throw new Error("Excel sheet is empty.");
  }

  // Schema format validation
  // Expecting columns: "Section", "Question Identifier", "Question", "Response Type", "Value", "Remarks"
  const expectedHeaders = ["Section", "Question Identifier", "Question", "Response Type", "Value"];
  const headerKeys = Object.keys(rows[0]);

  for (const header of expectedHeaders) {
    if (!headerKeys.some((h) => h.toLowerCase() === header.toLowerCase())) {
      throw new Error(`Missing required column: "${header}" in checklist workbook.`);
    }
  }

  const templateVersion = "v1.0.0"; // Simulated template detection

  const result = await db.$transaction(async (tx) => {
    // 1. Create Checklist Import record
    const checklistImport = await tx.chaChecklistImport.create({
      data: {
        jobId,
        fileName,
        fileSize,
        templateVersion,
        status: "READY",
        uploadedById: actorId,
      },
    });

    // 2. Parse rows and group by section
    const sectionsMap = new Map<string, any[]>();
    for (const row of rows) {
      const secName = (row.Section || row.section || "General Details").trim();
      const questionId = (row["Question Identifier"] || row.questionIdentifier || row.id || "").trim();
      const questionText = (row.Question || row.question || "").trim();
      const respType = (row["Response Type"] || row.responseType || "TEXT").trim().toUpperCase();
      const val = row.Value !== undefined ? String(row.Value).trim() : null;
      const rem = row.Remarks !== undefined ? String(row.Remarks).trim() : null;

      if (!questionText) continue;

      if (!sectionsMap.has(secName)) {
        sectionsMap.set(secName, []);
      }

      sectionsMap.get(secName)!.push({
        identifier: questionId,
        question: questionText,
        responseType: respType,
        value: val,
        remarks: rem,
      });
    }

    // 3. Save sections and items
    let secOrder = 1;
    for (const [secName, items] of sectionsMap.entries()) {
      const section = await tx.chaChecklistSection.create({
        data: {
          importId: checklistImport.id,
          name: secName,
          order: secOrder++,
        },
      });

      let itemOrder = 1;
      await tx.chaChecklistItem.createMany({
        data: items.map((item) => ({
          sectionId: section.id,
          order: itemOrder++,
          identifier: item.identifier,
          question: item.question,
          responseType: item.responseType,
          value: item.value,
          remarks: item.remarks,
        })),
      });
    }

    // 4. Update Job Stage
    await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "CHECKLIST_PREPARATION" },
    });

    return checklistImport;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklistImport",
    entityId: result.id,
    event: "CHECKLIST_IMPORTED",
    actorId,
    newState: "CHECKLIST_PREPARATION",
    remarks: `Uploaded Excel checklist: ${fileName} (${rows.length} items)`,
  });

  return result;
}

// Submit checklist for Manager Approval
export async function submitChecklistForApproval(
  actorId: string,
  orgId: string,
  jobId: string,
  importId: string
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: { assignments: { where: { responsibility: "APPROVAL" } } },
  });

  const managers = job.assignments.filter((a) => a.responsibility === "APPROVAL");
  if (managers.length === 0) {
    throw new Error("Cannot submit: No approval manager is assigned to this job. Assign an approval manager first.");
  }

  const result = await db.$transaction(async (tx) => {
    // 1. Freeze the imported checklist status
    const checklist = await tx.chaChecklistImport.update({
      where: { id: importId },
      data: { status: "PENDING_APPROVAL" },
    });

    // 2. Clear any pending approval entries
    await tx.chaChecklistApproval.deleteMany({
      where: { importId },
    });

    // 3. Create fresh approval records for managers
    await tx.chaChecklistApproval.createMany({
      data: managers.map((m) => ({
        importId,
        managerId: m.userId,
        decision: "PENDING",
      })),
    });

    // 4. Advance workflow stage to Checklist Approval
    await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "CHECKLIST_APPROVAL" },
    });

    return checklist;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklistImport",
    entityId: importId,
    event: "CHECKLIST_SUBMITTED",
    actorId,
    newState: "CHECKLIST_APPROVAL",
    remarks: `Submitted checklist for approval to ${managers.length} manager(s)`,
  });

  // Notify managers and create Todo tasks
  for (const manager of managers) {
    await createNotification({
      userId: manager.userId,
      orgId,
      kind: "CHA_CHECKLIST_SUBMITTED",
      title: `Checklist Awaiting Approval: ${job.jobNumber}`,
      body: `A checklist for job ${job.jobNumber} has been submitted for your review.`,
      link: `/cha/approvals`,
      priority: "important",
    });

    // Create Todo task
    await db.todoTask.create({
      data: {
        userId: manager.userId,
        orgId,
        title: `Approve checklist for Job ${job.jobNumber}`,
        description: `Review the imported questionnaire values and approve/send for rework for job ${job.jobNumber}.`,
        status: "PENDING",
      },
    });
  }

  return result;
}

// Manager action: Approve or Send for Rework
export async function checklistManagerAction(
  actorId: string,
  orgId: string,
  jobId: string,
  importId: string,
  approvalId: string,
  decision: "APPROVED" | "REWORK",
  remarks?: string
) {
  const result = await db.$transaction(async (tx) => {
    // 1. Update manager's approval record
    const approval = await tx.chaChecklistApproval.update({
      where: { id: approvalId },
      data: {
        decision,
        remarks,
        actionedAt: new Date(),
      },
    });

    const job = await tx.chaJob.findFirstOrThrow({
      where: getActiveChaJobByIdWhere(orgId, jobId),
      include: {
        assignments: { where: { responsibility: "APPROVAL" } },
        primaryOwner: true,
      },
    });

    const settings = await tx.chaSettings.findUniqueOrThrow({ where: { orgId } });

    if (decision === "REWORK") {
      // Return checklist import to rework status
      await tx.chaChecklistImport.update({
        where: { id: importId },
        data: { status: "REWORK" },
      });

      // Insert rework note
      if (remarks) {
        await tx.chaChecklistReworkNote.create({
          data: {
            importId,
            authorId: actorId,
            note: remarks,
          },
        });
      }

      // Drop stage back to PREPARATION
      await tx.chaJob.update({
        where: { id: jobId },
        data: { stage: "CHECKLIST_PREPARATION" },
      });

      return { outcome: "REWORK", job, approval };
    } else {
      // Fetch all approvals to verify policy
      const allApprovals = await tx.chaChecklistApproval.findMany({
        where: { importId },
      });

      let policySatisfied = false;
      if (settings.managerApprovalPolicy === "ANY") {
        policySatisfied = allApprovals.some((a) => a.decision === "APPROVED");
      } else {
        // ALL policy
        policySatisfied = allApprovals.every((a) => a.decision === "APPROVED");
      }

      if (policySatisfied) {
        // Approve import
        await tx.chaChecklistImport.update({
          where: { id: importId },
          data: { status: "APPROVED" },
        });

        // Move to Filing stage
        await tx.chaJob.update({
          where: { id: jobId },
          data: { stage: "FILING" },
        });

        // Set default estimated filing date to +3 days from now
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + 3);

        await tx.chaFiling.update({
          where: { jobId },
          data: {
            estimatedFilingDate: estDate,
          },
        });

        await tx.chaFilingDateHistory.create({
          data: {
            filingId: (await tx.chaFiling.findUniqueOrThrow({ where: { jobId } })).id,
            estimatedFilingDate: estDate,
            setById: actorId,
          },
        });

        return { outcome: "APPROVED_STAGE_ADVANCED", job, approval };
      }

      return { outcome: "APPROVED_PENDING_OTHERS", job, approval };
    }
  });

  // Log audit
  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklistApproval",
    entityId: approvalId,
    event: decision === "APPROVED" ? "CHECKLIST_APPROVED" : "CHECKLIST_REWORK_REQUESTED",
    actorId,
    newState: result.outcome === "APPROVED_STAGE_ADVANCED" ? "FILING" : "CHECKLIST_APPROVAL",
    remarks: remarks || `Manager marked as ${decision}`,
  });

  // Send notifications
  if (result.outcome === "REWORK") {
    await createNotification({
      userId: result.job.primaryOwnerId,
      orgId,
      kind: "CHA_REWORK_REQUESTED",
      title: `Checklist Rework Required: ${result.job.jobNumber}`,
      body: `Your checklist for job ${result.job.jobNumber} was returned for rework. Manager Note: "${remarks || ""}"`,
      link: `/cha/jobs/${jobId}`,
      priority: "important",
    });

    // Create Todo for rework
    await db.todoTask.create({
      data: {
        userId: result.job.primaryOwnerId,
        orgId,
        title: `Rework checklist for Job ${result.job.jobNumber}`,
        description: `Correction details: ${remarks || ""}. Re-upload and submit checklist once completed.`,
        status: "PENDING",
      },
    });
  } else if (result.outcome === "APPROVED_STAGE_ADVANCED") {
    await createNotification({
      userId: result.job.primaryOwnerId,
      orgId,
      kind: "CHA_CHECKLIST_APPROVED",
      title: `Checklist Approved: ${result.job.jobNumber}`,
      body: `Your checklist for job ${result.job.jobNumber} has been approved. The workflow has advanced to the Filing stage.`,
      link: `/cha/jobs/${jobId}`,
      priority: "normal",
    });

    // Create Todo for filing
    const filingUser = result.job.assignments.find((a) => a.responsibility === "FILING") || result.job.assignments.find((a) => a.responsibility === "OPERATIONS");
    if (filingUser) {
      await db.todoTask.create({
        data: {
          userId: filingUser.userId,
          orgId,
          title: `File custom bill for Job ${result.job.jobNumber}`,
          description: `Submit filing, upload the bill copy, and enter the registration reference number.`,
          status: "PENDING",
        },
      });
    }
  }

  return result.approval;
}

// Self approval workflow
export async function selfApproveChecklist(
  actorId: string,
  orgId: string,
  jobId: string,
  importId: string,
  remarks?: string
) {
  const settings = await db.chaSettings.findUniqueOrThrow({ where: { orgId } });
  if (!settings.selfApprovalAllowed) {
    throw new Error("Self-approval is disabled by organization settings policy.");
  }

  const result = await db.$transaction(async (tx) => {
    const job = await tx.chaJob.findFirstOrThrow({
      where: getActiveChaJobByIdWhere(orgId, jobId),
      include: { assignments: true },
    });

    // Update checklist status to approved
    await tx.chaChecklistImport.update({
      where: { id: importId },
      data: { status: "APPROVED" },
    });

    // Move to filing
    await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "FILING" },
    });

    // Set estimated filing date (+3 days)
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 3);

    const filing = await tx.chaFiling.update({
      where: { jobId },
      data: {
        estimatedFilingDate: estDate,
      },
    });

    await tx.chaFilingDateHistory.create({
      data: {
        filingId: filing.id,
        estimatedFilingDate: estDate,
        setById: actorId,
      },
    });

    return job;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklistImport",
    entityId: importId,
    event: "CHECKLIST_SELF_APPROVED",
    actorId,
    newState: "FILING",
    remarks: remarks || "Self-approved checklist",
  });

  // Notify concerned managers and filing users
  const uniqueRecipients = Array.from(new Set(result.assignments.map((a) => a.userId).filter((id) => id !== actorId)));
  for (const userId of uniqueRecipients) {
    await createNotification({
      userId,
      orgId,
      kind: "CHA_CHECKLIST_APPROVED",
      title: `Job Self-Approved: ${result.jobNumber}`,
      body: `Checklist self-approved by ${result.primaryOwnerId}. Stage is now Filing.`,
      link: `/cha/jobs/${jobId}`,
      priority: "normal",
    });
  }

  return result;
}

// Adjust estimated filing date
export async function adjustEstimatedFilingDate(
  actorId: string,
  orgId: string,
  jobId: string,
  filingId: string,
  newDate: Date
) {
  const result = await db.$transaction(async (tx) => {
    const filing = await tx.chaFiling.update({
      where: { id: filingId, jobId },
      data: { estimatedFilingDate: newDate },
    });

    await tx.chaFilingDateHistory.create({
      data: {
        filingId,
        estimatedFilingDate: newDate,
        setById: actorId,
      },
    });

    return filing;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaFiling",
    entityId: filingId,
    event: "ESTIMATED_FILING_DATE_CHANGED",
    actorId,
    newState: newDate.toISOString(),
    remarks: "Adjusted committed timeline",
  });

  return result;
}

// Complete Filing stage (Mark as Filed)
export async function markAsFiled(
  actorId: string,
  orgId: string,
  jobId: string,
  filingId: string,
  data: {
    filingRef: string;
    actualFilingDate: Date;
    filedBillCopyKey: string;
    remarks?: string;
    delayReason?: string;
  }
) {
  if (!data.filedBillCopyKey.trim()) {
    throw new Error("Uploading the filed bill copy is mandatory to mark as filed.");
  }

  const result = await db.$transaction(async (tx) => {
    const filing = await tx.chaFiling.findUniqueOrThrow({
      where: { id: filingId },
    });

    // Calculate delay duration in days
    let isDelayed = false;
    let delayDays = 0;
    if (filing.estimatedFilingDate) {
      const est = new Date(filing.estimatedFilingDate);
      const act = new Date(data.actualFilingDate);
      if (act.getTime() > est.getTime()) {
        isDelayed = true;
        delayDays = Math.ceil((act.getTime() - est.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    if (isDelayed && !data.delayReason?.trim()) {
      throw new Error(`The actual filing date exceeds the committed date by ${delayDays} day(s). A delay reason is mandatory.`);
    }

    const updatedFiling = await tx.chaFiling.update({
      where: { id: filingId },
      data: {
        actualFilingDate: data.actualFilingDate,
        filingRef: data.filingRef,
        filedBillCopyKey: data.filedBillCopyKey,
        status: "FILED",
        delayReason: isDelayed ? data.delayReason : undefined,
      },
    });

    // Move job to next operational stages / complete
    const job = await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "FILED" },
      include: { assignments: true },
    });

    return { job, updatedFiling, isDelayed, delayDays };
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaFiling",
    entityId: filingId,
    event: "JOB_FILED",
    actorId,
    newState: "FILED",
    remarks: `Filing reference: ${data.filingRef}. ${result.isDelayed ? "Delayed: " + data.delayReason : "On-Time"}`,
  });

  // Notify Accounts members to collect customer advance
  const accountsAssignees = result.job.assignments.filter((a) => a.responsibility === "ACCOUNTS");
  const notificationRecipients = accountsAssignees.map((a) => a.userId);

  // If no specific accounts assignee is on the job, grab general users with permission
  if (notificationRecipients.length === 0) {
    const fallbackIds = await db.userRole.findMany({
      where: { role: { orgId, permissions: { some: { permission: { key: "cha.advance.manage" } } } } },
      select: { userId: true },
    });
    notificationRecipients.push(...fallbackIds.map((f) => f.userId));
  }

  for (const userId of Array.from(new Set(notificationRecipients))) {
    await createNotification({
      userId,
      orgId,
      kind: "CHA_JOB_ASSIGNED",
      title: `Advance Collection Due: ${result.job.jobNumber}`,
      body: `Job ${result.job.jobNumber} has been filed. Accounts team should verify and collect the customer advance payment.`,
      link: `/cha/jobs/${jobId}`,
      priority: "important",
    });

    // Create Todo task
    await db.todoTask.create({
      data: {
        userId,
        orgId,
        title: `Collect customer advance for Job ${result.job.jobNumber}`,
        description: `Check customer ledger / payment confirmation and update advance receipts.`,
        status: "PENDING",
      },
    });
  }

  return result.updatedFiling;
}

// Adjust Customer Advance Expected terms
export async function updateCustomerAdvanceExpected(
  actorId: string,
  orgId: string,
  jobId: string,
  advanceId: string,
  expectedAmount: number,
  dueDate?: Date,
  assignedUserId?: string
) {
  const result = await db.chaCustomerAdvance.update({
    where: { id: advanceId, jobId },
    data: {
      expectedAmount: new Prisma.Decimal(expectedAmount),
      dueDate,
      assignedUserId,
      status: "FOLLOW_UP",
    },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaCustomerAdvance",
    entityId: advanceId,
    event: "ADVANCE_EXPECTED_UPDATED",
    actorId,
    newState: "FOLLOW_UP",
    remarks: `Expected amount set to INR ${expectedAmount}`,
  });

  return result;
}

// Record Customer Advance Receipt Payment
export async function recordCustomerAdvanceReceipt(
  actorId: string,
  orgId: string,
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
) {
  const result = await db.$transaction(async (tx) => {
    const advance = await tx.chaCustomerAdvance.findUniqueOrThrow({
      where: { id: advanceId },
      include: { receipts: true },
    });

    // Create Receipt
    const receipt = await tx.chaCustomerAdvanceReceipt.create({
      data: {
        advanceId,
        amount: new Prisma.Decimal(receiptData.amount),
        receivedDate: receiptData.receivedDate,
        paymentMethod: receiptData.paymentMethod,
        referenceNumber: receiptData.referenceNumber,
        receiptProofKey: receiptData.receiptProofKey,
        remarks: receiptData.remarks,
        recordedById: actorId,
      },
    });

    // Sum receipts
    const totalReceived = advance.receipts
      .reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0))
      .add(receipt.amount);

    let nextStatus = "PARTIALLY_RECEIVED";
    if (totalReceived.greaterThanOrEqualTo(advance.expectedAmount)) {
      nextStatus = "FULLY_RECEIVED";
    }

    await tx.chaCustomerAdvance.update({
      where: { id: advanceId },
      data: { status: nextStatus },
    });

    return { receipt, totalReceived, nextStatus };
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaCustomerAdvance",
    entityId: advanceId,
    event: "ADVANCE_RECEIPT_RECORDED",
    actorId,
    newState: result.nextStatus,
    remarks: `Received payment: INR ${receiptData.amount} via ${receiptData.paymentMethod}`,
  });

  return result.receipt;
}

// Set customer advance collection exception
export async function declareAdvanceNotRequired(
  actorId: string,
  orgId: string,
  jobId: string,
  advanceId: string,
  reason: string
) {
  if (!reason.trim()) {
    throw new Error("Reason is required to declare customer advance not required.");
  }

  const result = await db.chaCustomerAdvance.update({
    where: { id: advanceId, jobId },
    data: { status: "NOT_REQUIRED", notRequiredReason: reason },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaCustomerAdvance",
    entityId: advanceId,
    event: "ADVANCE_EXEMPTED",
    actorId,
    newState: "NOT_REQUIRED",
    remarks: reason,
  });

  return result;
}

// Create Expense Request with multiple lines
export async function createExpenseRequest(
  actorId: string,
  orgId: string,
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
) {
  if (data.lines.length === 0) {
    throw new Error("An expense request must contain at least one line item.");
  }

  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    select: { id: true, jobNumber: true },
  });

  // Verify requester is not accounts-only
  const user = await db.user.findUnique({
    where: { id: actorId },
    include: { roles: { include: { role: true } } },
  });

  const isOnlyAccounts =
    user?.roles &&
    user.roles.length > 0 &&
    user.roles.every((r) => r.role.name === "Accounts") &&
    !user.isPlatformAdmin;
  if (isOnlyAccounts) {
    throw new Error("Authorization Denied: Users acting in an Accounts capacity cannot submit operational expense requests.");
  }

  const result = await db.$transaction(async (tx) => {
    // 1. Create Request
    const request = await tx.chaExpenseRequest.create({
      data: {
        jobId,
        orgId,
        status: data.isUrgent ? "URGENT_PAYMENT_REQUIRED" : "SUBMITTED",
        requestedById: actorId,
        isUrgent: data.isUrgent,
        urgencyReason: data.isUrgent ? data.urgencyReason : undefined,
        urgentRequestedAt: data.isUrgent ? new Date() : undefined,
        urgentRequestedById: data.isUrgent ? actorId : undefined,
      },
    });

    // 2. Create lines
    await tx.chaExpenseLine.createMany({
      data: data.lines.map((l) => ({
        requestId: request.id,
        category: l.category,
        purpose: l.purpose,
        amount: new Prisma.Decimal(l.amount),
        requiredDate: l.requiredDate,
        supportingDocumentKey: l.supportingDocumentKey,
        remarks: l.remarks,
      })),
    });

    // 3. Create status history
    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId: request.id,
        status: request.status,
        actionedById: actorId,
        remarks: data.isUrgent ? `Submitted urgent: ${data.urgencyReason}` : "Submitted request",
      },
    });

    return request;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaExpenseRequest",
    entityId: result.id,
    event: "EXPENSE_SUBMITTED",
    actorId,
    newState: result.status,
    remarks: `Created request with ${data.lines.length} items. Urgent: ${data.isUrgent}`,
  });

  // Notify Accounts members
  const accountsPeople = await db.userRole.findMany({
    where: { role: { orgId, permissions: { some: { permission: { key: "cha.expense.manage" } } } } },
    select: { userId: true },
  });

  for (const acc of accountsPeople) {
    await createNotification({
      userId: acc.userId,
      orgId,
      kind: "CHA_EXPENSE_SUBMITTED",
      title: data.isUrgent ? `URGENT Expense Request: ${job.jobNumber}` : `New Expense Request: ${job.jobNumber}`,
      body: `Expense request for job ${job.jobNumber} is awaiting verification. Urgency: ${data.isUrgent ? "High" : "Standard"}.`,
      link: `/cha/expenses`,
      priority: data.isUrgent ? "important" : "normal",
    });

    // Create Todo task
    await db.todoTask.create({
      data: {
        userId: acc.userId,
        orgId,
        title: data.isUrgent ? `URGENT Pay Expense for Job ${job.jobNumber}` : `Verify Expense for Job ${job.jobNumber}`,
        description: `Review line items and post payment disbursement details.`,
        status: "PENDING",
      },
    });
  }

  return result;
}

// Request urgency escalation on an existing expense
export async function triggerUrgentExpenseEscalation(
  actorId: string,
  orgId: string,
  requestId: string,
  urgencyReason: string
) {
  if (!urgencyReason.trim()) {
    throw new Error("Urgency reason is required for escalation.");
  }

  const result = await db.$transaction(async (tx) => {
    const request = await tx.chaExpenseRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { job: true },
    });

    if (request.status === "PAID" || request.status === "RECEIPT_ACKNOWLEDGED") {
      throw new Error("Cannot escalate: payment has already been disbursed.");
    }

    const updated = await tx.chaExpenseRequest.update({
      where: { id: requestId },
      data: {
        status: "URGENT_PAYMENT_REQUIRED",
        isUrgent: true,
        urgencyReason,
        urgentRequestedAt: new Date(),
        urgentRequestedById: actorId,
      },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId,
        status: "URGENT_PAYMENT_REQUIRED",
        actionedById: actorId,
        remarks: `Escalated to Urgent: ${urgencyReason}`,
      },
    });

    return updated;
  });

  await logChaAudit({
    orgId,
    entityType: "ChaExpenseRequest",
    entityId: requestId,
    event: "EXPENSE_ESCALATED",
    actorId,
    newState: "URGENT_PAYMENT_REQUIRED",
    remarks: urgencyReason,
  });

  // Notify Accounts members of immediate escalation
  const accountsPeople = await db.userRole.findMany({
    where: { role: { orgId, permissions: { some: { permission: { key: "cha.expense.manage" } } } } },
    select: { userId: true },
  });

  for (const acc of accountsPeople) {
    await createNotification({
      userId: acc.userId,
      orgId,
      kind: "CHA_EXPENSE_SUBMITTED",
      title: `URGENT ESCALATION: Expense Request`,
      body: `Immediate payment has been requested for expense reference ${requestId}. Reason: "${urgencyReason}"`,
      link: `/cha/expenses`,
      priority: "important",
    });
  }

  return result;
}

// Review action on Expense Request (Mark status update)
export async function setExpenseStatus(
  actorId: string,
  orgId: string,
  requestId: string,
  status: "UNDER_REVIEW" | "CLARIFICATION_REQUIRED" | "APPROVED" | "READY_FOR_DISBURSEMENT" | "REJECTED",
  remarks?: string
) {
  if (status === "CLARIFICATION_REQUIRED" && !remarks?.trim()) {
    throw new Error("Clarification requests require a specific query note.");
  }
  if (status === "REJECTED" && !remarks?.trim()) {
    throw new Error("Expense rejections require an administrative rejection reason.");
  }

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.chaExpenseRequest.update({
      where: { id: requestId },
      data: { status },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId,
        status,
        actionedById: actorId,
        remarks: remarks || `Status set to ${status}`,
      },
    });

    return updated;
  });

  await logChaAudit({
    orgId,
    entityType: "ChaExpenseRequest",
    entityId: requestId,
    event: `EXPENSE_STATUS_${status}`,
    actorId,
    newState: status,
    remarks,
  });

  // Notify requester
  await createNotification({
    userId: result.requestedById,
    orgId,
    kind: "CHA_EXPENSE_APPROVED",
    title: `Expense Status Update: ${status.replace(/_/g, " ")}`,
    body: `Your expense request status has been updated to ${status.replace(/_/g, " ")}. Details: "${remarks || ""}"`,
    link: `/cha/jobs/${result.jobId}`,
    priority: status === "CLARIFICATION_REQUIRED" || status === "REJECTED" ? "important" : "normal",
  });

  return result;
}

// Post payment disbursement details
export async function postExpensePayment(
  actorId: string,
  orgId: string,
  requestId: string,
  paymentData: {
    amountPaid: number;
    paymentDate: Date;
    paymentMethod: string;
    transactionReference: string;
    paymentProofKey: string;
    remarks?: string;
  }
) {
  if (!paymentData.paymentProofKey.trim()) {
    throw new Error("Payment proof screenshot upload is mandatory to post an expense payment.");
  }

  const result = await db.$transaction(async (tx) => {
    const request = await tx.chaExpenseRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    // Create payment entry
    const payment = await tx.chaExpensePayment.create({
      data: {
        requestId,
        amountPaid: new Prisma.Decimal(paymentData.amountPaid),
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        transactionReference: paymentData.transactionReference,
        paymentProofKey: paymentData.paymentProofKey,
        remarks: paymentData.remarks,
        paidById: actorId,
      },
    });

    // Update status to Paid
    await tx.chaExpenseRequest.update({
      where: { id: requestId },
      data: { status: "PAID" },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId,
        status: "PAID",
        actionedById: actorId,
        remarks: `Payment posted. Amount: INR ${paymentData.amountPaid}. Ref: ${paymentData.transactionReference}`,
      },
    });

    return { payment, request };
  });

  await logChaAudit({
    orgId,
    jobId: result.request.jobId,
    entityType: "ChaExpenseRequest",
    entityId: requestId,
    event: "EXPENSE_PAID",
    actorId,
    newState: "PAID",
    remarks: `Paid INR ${paymentData.amountPaid} via ${paymentData.paymentMethod}. Ref: ${paymentData.transactionReference}`,
  });

  // Notify requester
  await createNotification({
    userId: result.request.requestedById,
    orgId,
    kind: "CHA_EXPENSE_PAID",
    title: `Payment Disbursed: Expense Request`,
    body: `Accounts has processed and paid INR ${paymentData.amountPaid} for your request. Proof uploaded. Acknowledge receipt.`,
    link: `/cha/jobs/${result.request.jobId}`,
    priority: "important",
  });

  return result.payment;
}

// Acknowledge expense receipt
export async function acknowledgeExpenseReceipt(
  actorId: string,
  orgId: string,
  requestId: string
) {
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.chaExpenseRequest.update({
      where: { id: requestId },
      data: { status: "RECEIPT_ACKNOWLEDGED" },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId,
        status: "RECEIPT_ACKNOWLEDGED",
        actionedById: actorId,
        remarks: "Requester acknowledged receipt of payment",
      },
    });

    return updated;
  });

  await logChaAudit({
    orgId,
    jobId: result.jobId,
    entityType: "ChaExpenseRequest",
    entityId: requestId,
    event: "EXPENSE_RECEIPT_ACKNOWLEDGED",
    actorId,
    newState: "RECEIPT_ACKNOWLEDGED",
  });

  return result;
}

// Raise written query about payment details
export async function raisePaymentQuery(
  actorId: string,
  orgId: string,
  requestId: string,
  queryText: string
) {
  if (!queryText.trim()) {
    throw new Error("Written query text is required.");
  }

  const result = await db.$transaction(async (tx) => {
    // Create query
    const query = await tx.chaExpenseQuery.create({
      data: {
        requestId,
        authorId: actorId,
        queryText,
      },
    });

    // Set request status to QUERY_RAISED
    const request = await tx.chaExpenseRequest.update({
      where: { id: requestId },
      data: { status: "QUERY_RAISED" },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId,
        status: "QUERY_RAISED",
        actionedById: actorId,
        remarks: `Query raised: "${queryText}"`,
      },
    });

    return { query, request };
  });

  await logChaAudit({
    orgId,
    jobId: result.request.jobId,
    entityType: "ChaExpenseRequest",
    entityId: requestId,
    event: "EXPENSE_QUERY_RAISED",
    actorId,
    newState: "QUERY_RAISED",
    remarks: queryText,
  });

  // Notify Accounts members
  const accountsPeople = await db.userRole.findMany({
    where: { role: { orgId, permissions: { some: { permission: { key: "cha.expense.pay" } } } } },
    select: { userId: true },
  });

  for (const acc of accountsPeople) {
    await createNotification({
      userId: acc.userId,
      orgId,
      kind: "CHA_EXPENSE_SUBMITTED",
      title: `Payment Query Raised: Request Reference ${requestId}`,
      body: `Requester has raised a query: "${queryText}"`,
      link: `/cha/expenses`,
      priority: "important",
    });
  }

  return result.query;
}

// Resolve payment query
export async function resolvePaymentQuery(
  actorId: string,
  orgId: string,
  queryId: string,
  resolutionText: string
) {
  if (!resolutionText.trim()) {
    throw new Error("Resolution note is required.");
  }

  const result = await db.$transaction(async (tx) => {
    // Update query
    const query = await tx.chaExpenseQuery.update({
      where: { id: queryId },
      data: {
        resolved: true,
        resolutionText,
        resolvedById: actorId,
        resolvedAt: new Date(),
      },
    });

    // Set request back to PAID (requester must acknowledge resolution)
    const request = await tx.chaExpenseRequest.update({
      where: { id: query.requestId },
      data: { status: "PAID" },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId: query.requestId,
        status: "PAID",
        actionedById: actorId,
        remarks: `Query resolved: "${resolutionText}"`,
      },
    });

    return { query, request };
  });

  await logChaAudit({
    orgId,
    jobId: result.request.jobId,
    entityType: "ChaExpenseRequest",
    entityId: result.query.requestId,
    event: "EXPENSE_QUERY_RESOLVED",
    actorId,
    newState: "PAID",
    remarks: resolutionText,
  });

  // Notify requester
  await createNotification({
    userId: result.request.requestedById,
    orgId,
    kind: "CHA_EXPENSE_PAID",
    title: `Payment Query Resolved`,
    body: `Accounts has resolved your query: "${resolutionText}". Please acknowledge receipt.`,
    link: `/cha/jobs/${result.request.jobId}`,
    priority: "important",
  });

  return result.query;
}

// Fetch aggregate CHA expenses queue for Accounts users
export async function listAllExpenses(
  orgId: string,
  filters: {
    status?: string;
    search?: string;
    isUrgent?: boolean;
  }
) {
  const where: any = { orgId };

  if (filters.status) where.status = filters.status;
  if (filters.isUrgent !== undefined) where.isUrgent = filters.isUrgent;
  if (filters.search) {
    where.OR = [
      { job: { jobNumber: { contains: filters.search, mode: "insensitive" } } },
      { job: { customer: { name: { contains: filters.search, mode: "insensitive" } } } },
      { requestedBy: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  return db.chaExpenseRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      job: { include: { customer: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      lines: true,
      payments: true,
      queries: true,
    },
  });
}

// Fetch the active checklist workflow approvals queue for users who can act on it.
// This uses the current ChaChecklist + ChaChecklistDecision workflow rather than
// the legacy checklist-import approval model so job owners and assigned managers
// see in-flight approvals consistently in both the workspace and approval queue.
export async function listManagerChecklistApprovals(
  userId: string,
  orgId: string
) {
  const workflows = await db.chaChecklist.findMany({
    where: {
      currentApprovalStage: "INTERNAL",
      currentFileVersionId: { not: null },
      job: getActiveChaJobWhere(orgId),
    },
    include: {
      currentFileVersion: true,
      approvals: {
        where: { stage: "INTERNAL" },
        orderBy: { createdAt: "asc" },
      },
      job: {
        include: {
          customer: true,
          primaryOwner: true,
          assignedManager: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const uploaderIds = Array.from(
    new Set(
      workflows
        .map((workflow) => workflow.currentFileVersion?.uploadedById)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const uploaders =
    uploaderIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: uploaderIds } },
          select: { id: true, name: true },
        })
      : [];
  const uploaderNameById = new Map(uploaders.map((user) => [user.id, user.name || "Unknown"]));

  return workflows
    .filter((workflow) => {
      const currentVersionId = workflow.currentFileVersionId;
      if (!currentVersionId) return false;

      const currentInternalApprovals = workflow.approvals.filter(
        (approval) => approval.fileVersionId === currentVersionId,
      );

      const hasPendingAssignment = currentInternalApprovals.some(
        (approval) => approval.assignedToId === userId && approval.action === "PENDING",
      );

      const isOwner = workflow.job.primaryOwnerId === userId;
      const isAssignedManager = workflow.job.assignedManagerId === userId;

      return hasPendingAssignment || isOwner || isAssignedManager;
    })
    .map((workflow) => {
      const currentVersionId = workflow.currentFileVersionId!;
      const currentInternalApprovals = workflow.approvals.filter(
        (approval) => approval.fileVersionId === currentVersionId,
      );

      return {
        id: workflow.id,
        checklistId: workflow.id,
        stage: workflow.currentApprovalStage,
        status: workflow.status,
        submittedAt: workflow.currentFileVersion?.uploadedAt ?? workflow.updatedAt,
        checklistImport: {
          id: workflow.id,
          uploadedAt: workflow.currentFileVersion?.uploadedAt ?? workflow.updatedAt,
          uploadedBy: workflow.currentFileVersion?.uploadedById
            ? {
                name: uploaderNameById.get(workflow.currentFileVersion.uploadedById) || "Unknown",
              }
            : null,
          currentFileVersion: workflow.currentFileVersion,
          approvals: currentInternalApprovals,
          job: workflow.job,
        },
      };
    });
}

export async function listManagerJobDeletionRequests(userId: string, orgId: string) {
  return db.chaJobDeletionRequest.findMany({
    where: {
      orgId,
      assignedManagerId: userId,
      status: { in: ["PENDING", "APPROVED"] },
    },
    include: {
      job: {
        include: {
          customer: { select: { name: true } },
          primaryOwner: { select: { id: true, name: true } },
        },
      },
      requestedBy: { select: { id: true, name: true } },
      assignedManager: { select: { id: true, name: true } },
    },
    orderBy: { requestedAt: "desc" },
  });
}

export async function submitJobDeletion(
  actorId: string,
  orgId: string,
  input: {
    jobId: string;
    confirmationJobNumber: string;
    confirmationPhrase: string;
    metadata?: Record<string, unknown>;
  }
) {
  const actor = await db.user.findUniqueOrThrow({
    where: { id: actorId },
    include: { roles: { include: { role: true } } },
  });
  const actorRoleNames = getActorRoleNames(actor);
  const [canRequestDelete, canApproveDelete] = await Promise.all([
    can(actorId, "cha.job.delete"),
    can(actorId, "cha.job.delete.approve"),
  ]);

  const job = await db.chaJob.findFirst({
    where: { id: input.jobId, ...getActiveChaJobWhere(orgId) },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true } } },
      },
      filing: { select: { status: true } },
      customerAdvance: { include: { receipts: { select: { id: true } } } },
      expenseRequests: { select: { status: true } },
      deletionRequests: {
        where: { status: { in: ["PENDING", "APPROVED"] } },
        select: { id: true, status: true, requestedById: true, assignedManagerId: true },
      },
    },
  });

  if (!job) {
    throw new Error("CHA job not found.");
  }

  const backfilledManagerAssignment = await backfillAssignedManagerFromApprovalAssignment(job);
  if (backfilledManagerAssignment) {
    job.assignedManagerId = backfilledManagerAssignment.userId;
  }

  const isAdminActor =
    actor.isPlatformAdmin || actorRoleNames.includes("Admin");
  const isAssignedToJob =
    job.primaryOwnerId === actorId || job.assignments.some((assignment) => assignment.userId === actorId);

  const isDirectDeleteAllowed = isAdminActor;
  const isRequestDeleteAllowed = isAssignedToJob && canRequestDelete;

  if (!isDirectDeleteAllowed && !isRequestDeleteAllowed) {
    await logChaAudit({
      orgId,
      jobId: job.id,
      entityType: "ChaJob",
      entityId: job.id,
      event: "JOB_DELETE_UNAUTHORIZED_ATTEMPT",
      actorId,
      prevState: job.status,
      newState: job.status,
      remarks: "User attempted to delete or request deletion without sufficient authorisation.",
      metadata: {
        actorRoleNames,
        ...input.metadata,
      },
    });
    throw new Error("You are not authorized to delete or request deletion for this CHA job.");
  }

  try {
    assertDeleteConfirmationInput(job.jobNumber, input.confirmationJobNumber, input.confirmationPhrase);
    assertJobCanBeDeleted(job);
  } catch (error) {
    await logChaAudit({
      orgId,
      jobId: job.id,
      entityType: "ChaJob",
      entityId: job.id,
      event: "JOB_DELETE_FAILED",
      actorId,
      prevState: job.status,
      newState: job.status,
      remarks: error instanceof Error ? error.message : "Deletion validation failed.",
      metadata: {
        actorRoleNames,
        ...input.metadata,
      },
    });
    throw error;
  }

  await logChaAudit({
    orgId,
    jobId: job.id,
    entityType: "ChaJob",
    entityId: job.id,
    event: "JOB_DELETE_CONFIRMATION_INITIATED",
    actorId,
    prevState: job.status,
    newState: job.status,
    remarks: "Deletion confirmation submitted.",
    metadata: {
      actorRoleNames,
      assignedManagerId: getAssignedDeletionManager(job)?.userId ?? null,
      ...input.metadata,
    },
  });

  if (isDirectDeleteAllowed) {
    const workspaceDeletion = await deleteChaJobWorkspace({
      jobId: job.id,
      jobNumber: job.jobNumber,
      orgId,
      primaryOwnerId: job.primaryOwnerId,
      actorId,
    });

    await db.chaJob.update({
      where: { id: job.id },
      data: {
        jobNumber: buildArchivedChaJobNumber(job.jobNumber, job.id),
        deletedAt: new Date(),
        deletedById: actorId,
        status: "CANCELLED",
      },
    });

    const actorTypeRemarks = "admin";

    await logChaAudit({
      orgId,
      jobId: job.id,
      entityType: "ChaJob",
      entityId: job.id,
      event: "JOB_DELETED_DIRECT",
      actorId,
      prevState: job.status,
      newState: "DELETED",
      remarks: `CHA job ${job.jobNumber} deleted directly by ${actorTypeRemarks}.`,
      metadata: {
        actorRoleNames,
        assignedManagerId: getAssignedDeletionManager(job)?.userId ?? null,
        driveRootFolderId: workspaceDeletion.driveDeletion.rootFolderId,
        driveDeletionOutcome: workspaceDeletion.driveDeletion.outcome,
        googleSpaceId: workspaceDeletion.chatDeletion.googleSpaceId,
        chatSpaceDeletionOutcome: workspaceDeletion.chatDeletion.outcome,
        ...input.metadata,
      },
    });

    await logChaAudit({
      orgId,
      jobId: job.id,
      entityType: "ChaJob",
      entityId: job.id,
      event: "JOB_DELETE_EXECUTED",
      actorId,
      prevState: job.status,
      newState: "DELETED",
      remarks: `CHA job ${job.jobNumber} soft-deleted immediately by the ${actorTypeRemarks}.`,
      metadata: {
        actorRoleNames,
        assignedManagerId: getAssignedDeletionManager(job)?.userId ?? null,
        driveRootFolderId: workspaceDeletion.driveDeletion.rootFolderId,
        driveDeletionOutcome: workspaceDeletion.driveDeletion.outcome,
        googleSpaceId: workspaceDeletion.chatDeletion.googleSpaceId,
        chatSpaceDeletionOutcome: workspaceDeletion.chatDeletion.outcome,
        ...input.metadata,
      },
    });

    return { mode: "deleted" as const };
  }

  const assignedManager = await getDeletionApproverForJob(orgId);

  if (!assignedManager) {
    await logChaAudit({
      orgId,
      jobId: job.id,
      entityType: "ChaJob",
      entityId: job.id,
      event: "JOB_DELETE_FAILED",
      actorId,
      prevState: job.status,
      newState: job.status,
      remarks: "Deletion request blocked because no admin approver is available.",
      metadata: {
        actorRoleNames,
        ...input.metadata,
      },
    });
    throw new Error("No active admin is available to approve this CHA job deletion.");
  }

  if (job.deletionRequests.length > 0) {
    await logChaAudit({
      orgId,
      jobId: job.id,
      entityType: "ChaJob",
      entityId: job.id,
      event: "JOB_DELETE_FAILED",
      actorId,
      prevState: job.status,
      newState: job.status,
      remarks: "Deletion request blocked because another active deletion request already exists.",
      metadata: {
        actorRoleNames,
        assignedManagerId: assignedManager.id,
        ...input.metadata,
      },
    });
    throw new Error("An active deletion request already exists for this CHA job.");
  }

  const request = await db.$transaction(
    async (tx) => {
      const duplicate = await tx.chaJobDeletionRequest.findFirst({
        where: {
          jobId: job.id,
          status: { in: ["PENDING", "APPROVED"] },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error("An active deletion request already exists for this CHA job.");
      }

      return tx.chaJobDeletionRequest.create({
        data: {
          orgId,
          jobId: job.id,
          jobNumberSnapshot: job.jobNumber,
          requestedById: actorId,
          assignedManagerId: assignedManager.id,
          remarks: `Deletion requested by ${actor.name} for admin review.`,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await logChaAudit({
    orgId,
    jobId: job.id,
    entityType: "ChaJobDeletionRequest",
    entityId: request.id,
    event: "JOB_DELETE_APPROVAL_REQUESTED",
    actorId,
    prevState: "NONE",
    newState: "PENDING",
    remarks: `Deletion request submitted for admin ${assignedManager.name ?? assignedManager.id}.`,
    metadata: {
      actorRoleNames,
      requesterId: actorId,
      assignedManagerId: assignedManager.id,
      approvalRequestId: request.id,
      ...input.metadata,
    },
  });

  await createNotification({
    userId: assignedManager.id,
    orgId,
    kind: "CHA_JOB_DELETION_REQUESTED",
    title: `Delete Job Approval Needed: ${job.jobNumber}`,
    body: `${actor.name} requested deletion for CHA job ${job.jobNumber}. Admin review is required before it is executed.`,
    link: `/cha/jobs/${job.id}`,
    priority: "important",
  });

  await db.todoTask.create({
    data: {
      userId: assignedManager.id,
      orgId,
      title: `Review delete request for Job ${job.jobNumber}`,
      description: `Approve or reject the deletion request raised by ${actor.name} for CHA job ${job.jobNumber}. Only admins can execute deletion.`,
      status: "PENDING",
    },
  });

  return { mode: "pending" as const, requestId: request.id, assignedManagerId: assignedManager.id };
}

export async function decideJobDeletionRequest(
  actorId: string,
  orgId: string,
  input: {
    requestId: string;
    decision: "APPROVED" | "REJECTED";
    remarks?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const actor = await db.user.findUniqueOrThrow({
    where: { id: actorId },
    include: { roles: { include: { role: true } } },
  });
  const actorRoleNames = getActorRoleNames(actor);
  const isAdminActor = actor.isPlatformAdmin || actorRoleNames.includes("Admin");
  const canApproveDelete = await can(actorId, "cha.job.delete.approve");
  if (!canApproveDelete || !isAdminActor) {
    await logChaAudit({
      orgId,
      entityType: "ChaJobDeletionRequest",
      entityId: input.requestId,
      event: "JOB_DELETE_UNAUTHORIZED_ATTEMPT",
      actorId,
      remarks: "User attempted to review a CHA deletion request without approval permission.",
      metadata: {
        actorRoleNames,
        ...input.metadata,
      },
    });
    throw new Error("You are not authorized to approve CHA job deletions.");
  }
  if (input.decision === "REJECTED" && !input.remarks?.trim()) {
    throw new Error("A rejection remark is required when declining a deletion request.");
  }

  let approvedDriveDeletion:
    | {
        rootFolderId: string | null;
        outcome: "deleted" | "missing" | "skipped";
      }
    | undefined;
  let approvedChatDeletion:
    | {
        googleSpaceId: string | null;
        outcome: "deleted" | "skipped" | "admin_scope_missing";
        error?: string;
      }
    | undefined;

  let result;
  try {
    if (input.decision === "APPROVED") {
      const requestPreview = await db.chaJobDeletionRequest.findFirst({
        where: { id: input.requestId, orgId },
        select: {
          status: true,
          assignedManagerId: true,
          job: {
            select: {
              id: true,
              jobNumber: true,
              primaryOwnerId: true,
            },
          },
        },
      });

      if (!requestPreview) {
        throw new Error("Deletion approval request not found.");
      }
      if (requestPreview.status !== "PENDING") {
        throw new Error("This deletion approval request has already been actioned.");
      }
      if (requestPreview.assignedManagerId !== actorId) {
        throw new Error("You are not the assigned manager for this deletion request.");
      }

      const workspaceDeletion = await deleteChaJobWorkspace({
        jobId: requestPreview.job.id,
        jobNumber: requestPreview.job.jobNumber,
        orgId,
        primaryOwnerId: requestPreview.job.primaryOwnerId,
        actorId,
      });
      approvedDriveDeletion = workspaceDeletion.driveDeletion;
      approvedChatDeletion = workspaceDeletion.chatDeletion;
    }

    result = await db.$transaction(
      async (tx) => {
        const request = await tx.chaJobDeletionRequest.findFirst({
          where: { id: input.requestId, orgId },
          include: {
            requestedBy: { select: { id: true, name: true } },
            assignedManager: { select: { id: true, name: true } },
            job: {
              include: {
                assignments: true,
                filing: { select: { status: true } },
                customerAdvance: { include: { receipts: { select: { id: true } } } },
                expenseRequests: { select: { status: true } },
              },
            },
          },
        });

        if (!request) {
          throw new Error("Deletion approval request not found.");
        }
        if (request.status !== "PENDING") {
          throw new Error("This deletion approval request has already been actioned.");
        }
        if (request.assignedManagerId !== actorId) {
          throw new Error("You are not the assigned manager for this deletion request.");
        }

        assertJobCanBeDeleted(request.job);

        if (input.decision === "REJECTED") {
          const rejected = await tx.chaJobDeletionRequest.update({
            where: { id: request.id },
            data: {
              status: "REJECTED",
              decidedAt: new Date(),
              rejectionRemarks: input.remarks?.trim(),
            },
          });

          return { request: rejected, job: request.job, requester: request.requestedBy, outcome: "rejected" as const };
        }

        const approved = await tx.chaJobDeletionRequest.update({
          where: { id: request.id },
          data: {
            status: "APPROVED",
            decidedAt: new Date(),
            remarks: input.remarks?.trim() || request.remarks,
          },
        });

        await tx.chaJob.update({
          where: { id: request.job.id },
          data: {
            jobNumber: buildArchivedChaJobNumber(request.job.jobNumber, request.job.id),
            deletedAt: new Date(),
            deletedById: actorId,
            status: "CANCELLED",
          },
        });

        const executed = await tx.chaJobDeletionRequest.update({
          where: { id: request.id },
          data: {
            status: "EXECUTED",
            executedAt: new Date(),
            executedById: actorId,
          },
        });

        return { request: executed, approvedRequest: approved, job: request.job, requester: request.requestedBy, outcome: "executed" as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deletion approval decision failed.";
    const unauthorized =
      message.includes("assigned manager") ||
      message.includes("not authorized");
    await logChaAudit({
      orgId,
      entityType: "ChaJobDeletionRequest",
      entityId: input.requestId,
      event: unauthorized ? "JOB_DELETE_UNAUTHORIZED_ATTEMPT" : "JOB_DELETE_FAILED",
      actorId,
      remarks: message,
      metadata: {
        actorRoleNames,
        decision: input.decision,
        ...input.metadata,
      },
    });
    throw error;
  }

  if (result.outcome === "rejected") {
    await logChaAudit({
      orgId,
      jobId: result.job.id,
      entityType: "ChaJobDeletionRequest",
      entityId: result.request.id,
      event: "JOB_DELETE_APPROVAL_REJECTED",
      actorId,
      prevState: "PENDING",
      newState: "REJECTED",
      remarks: input.remarks?.trim(),
      metadata: {
        actorRoleNames,
        requesterId: result.requester.id,
        assignedManagerId: actorId,
        approvalRequestId: result.request.id,
        driveRootFolderId: approvedDriveDeletion?.rootFolderId ?? null,
        driveDeletionOutcome: approvedDriveDeletion?.outcome ?? null,
        googleSpaceId: approvedChatDeletion?.googleSpaceId ?? null,
        chatSpaceDeletionOutcome: approvedChatDeletion?.outcome ?? null,
        ...input.metadata,
      },
    });

    await createNotification({
      userId: result.requester.id,
      orgId,
      kind: "CHA_JOB_DELETION_REJECTED",
      title: `Delete Job Request Rejected: ${result.request.jobNumberSnapshot}`,
      body: `${actor.name} rejected your deletion request for CHA job ${result.request.jobNumberSnapshot}.`,
      link: `/cha/jobs/${result.job.id}`,
      priority: "important",
    });

    return result.request;
  }

  await logChaAudit({
    orgId,
    jobId: result.job.id,
    entityType: "ChaJobDeletionRequest",
    entityId: result.request.id,
    event: "JOB_DELETE_APPROVAL_APPROVED",
    actorId,
    prevState: "PENDING",
    newState: "APPROVED",
    remarks: input.remarks?.trim() || "Deletion request approved.",
    metadata: {
      actorRoleNames,
      requesterId: result.requester.id,
      assignedManagerId: actorId,
      approvalRequestId: result.request.id,
      driveRootFolderId: approvedDriveDeletion?.rootFolderId ?? null,
      driveDeletionOutcome: approvedDriveDeletion?.outcome ?? null,
      googleSpaceId: approvedChatDeletion?.googleSpaceId ?? null,
      chatSpaceDeletionOutcome: approvedChatDeletion?.outcome ?? null,
      ...input.metadata,
    },
  });

  await logChaAudit({
    orgId,
    jobId: result.job.id,
    entityType: "ChaJob",
    entityId: result.job.id,
    event: "JOB_DELETE_EXECUTED",
    actorId,
    prevState: result.job.status,
    newState: "DELETED",
    remarks: `CHA job ${result.request.jobNumberSnapshot} deleted after manager approval.`,
    metadata: {
      actorRoleNames,
      requesterId: result.requester.id,
      assignedManagerId: actorId,
      approvalRequestId: result.request.id,
      driveRootFolderId: approvedDriveDeletion?.rootFolderId ?? null,
      driveDeletionOutcome: approvedDriveDeletion?.outcome ?? null,
      googleSpaceId: approvedChatDeletion?.googleSpaceId ?? null,
      chatSpaceDeletionOutcome: approvedChatDeletion?.outcome ?? null,
      ...input.metadata,
    },
  });

  await createNotification({
    userId: result.requester.id,
    orgId,
    kind: "CHA_JOB_DELETED",
    title: `CHA Job Deleted: ${result.request.jobNumberSnapshot}`,
    body: `${actor.name} approved and executed deletion for CHA job ${result.request.jobNumberSnapshot}.`,
    link: "/cha/jobs",
    priority: "important",
  });

  return result.request;
}

// ─── Document Requirements Configuration & Workflow ──────────────────────────────

export async function upsertDocumentCategory(
  orgId: string,
  data: { id?: string; name: string; description?: string; sortOrder: number; isActive: boolean }
) {
  const name = data.name.trim();
  if (!name) throw new Error("Category name is required.");

  if (data.id) {
    const existing = await db.chaDocumentRequirementCategory.findFirst({
      where: { orgId, name: { equals: name, mode: "insensitive" }, id: { not: data.id } },
    });
    if (existing) throw new Error(`Category '${name}' already exists.`);

    return db.chaDocumentRequirementCategory.update({
      where: { id: data.id },
      data: {
        name,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
  } else {
    const existing = await db.chaDocumentRequirementCategory.findFirst({
      where: { orgId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) throw new Error(`Category '${name}' already exists.`);

    return db.chaDocumentRequirementCategory.create({
      data: {
        orgId,
        name,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
  }
}

export async function deleteDocumentCategory(orgId: string, id: string) {
  const category = await db.chaDocumentRequirementCategory.findFirstOrThrow({
    where: { id, orgId },
  });

  return db.chaDocumentRequirementCategory.delete({
    where: { id: category.id },
  });
}

export async function upsertDocumentItem(
  orgId: string,
  data: { id?: string; categoryId: string; name: string; description?: string; sortOrder: number; isRequiredDefault: boolean; isActive: boolean }
) {
  await db.chaDocumentRequirementCategory.findFirstOrThrow({
    where: { id: data.categoryId, orgId },
  });

  const name = data.name.trim();
  if (!name) throw new Error("Document name is required.");

  if (data.id) {
    const existing = await db.chaDocumentRequirementItem.findFirst({
      where: { categoryId: data.categoryId, name: { equals: name, mode: "insensitive" }, id: { not: data.id } },
    });
    if (existing) throw new Error(`Document '${name}' already exists in this category.`);

    return db.chaDocumentRequirementItem.update({
      where: { id: data.id },
      data: {
        name,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isRequiredDefault: data.isRequiredDefault,
        isActive: data.isActive,
      },
    });
  } else {
    const existing = await db.chaDocumentRequirementItem.findFirst({
      where: { categoryId: data.categoryId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) throw new Error(`Document '${name}' already exists in this category.`);

    return db.chaDocumentRequirementItem.create({
      data: {
        categoryId: data.categoryId,
        name,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isRequiredDefault: data.isRequiredDefault,
        isActive: data.isActive,
      },
    });
  }
}

export async function deleteDocumentItem(orgId: string, id: string) {
  const item = await db.chaDocumentRequirementItem.findFirstOrThrow({
    where: { id, category: { orgId } },
  });

  return db.chaDocumentRequirementItem.delete({
    where: { id: item.id },
  });
}

export async function removeDocumentException(
  actorId: string,
  orgId: string,
  jobId: string,
  requirementId: string
) {
  await db.chaJobDocumentRequirement.findFirstOrThrow({
    where: { id: requirementId, jobId, job: getActiveChaJobWhere(orgId) },
  });

  const result = await db.$transaction(async (tx) => {
    // Delete exception
    await tx.chaDocumentException.deleteMany({
      where: { requirementId },
    });

    // Check remaining versions
    const remainingVersions = await tx.chaDocumentVersion.findMany({
      where: { requirementId },
    });

    const newStatus = remainingVersions.length > 0 ? "UPLOADED" : "PENDING";

    await tx.chaJobDocumentRequirement.update({
      where: { id: requirementId },
      data: { status: newStatus },
    });

    return { newStatus };
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobDocumentRequirement",
    entityId: requirementId,
    event: "DOCUMENT_EXCEPTION_REMOVED",
    actorId,
    newState: result.newStatus,
    remarks: "Removed N/A exemption status.",
  });

  return result;
}

export async function proceedDocumentStage(actorId: string, orgId: string, jobId: string) {
  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
  });

  if (job.stage !== "DOCUMENT_COLLECTION") {
    throw new Error("Job is not in the Document Collection stage.");
  }

  const gate = await verifyDocumentGate(jobId);
  if (!gate.passed) {
    throw new Error("Cannot proceed. Mandatory documents are pending: " + gate.blockingRequirements.map(b => b.name).join(", "));
  }

  await db.$transaction(async (tx) => {
    await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "ADDITIONAL_DATA" },
    });

    await tx.chaJobAdditionalData.upsert({
      where: { jobId },
      update: {
        status: "PENDING",
        updatedById: actorId,
      },
      create: {
        jobId,
        status: "PENDING",
        createdById: actorId,
      },
    });
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJob",
    entityId: jobId,
    event: "DOCUMENT_GATE_COMPLETED",
    actorId,
    prevState: "DOCUMENT_COLLECTION",
    newState: "ADDITIONAL_DATA",
    remarks: "Document gate completed; workflow advanced to Additional Data.",
  });

  return { success: true };
}

export async function getEligibleManagers(orgId: string) {
  const eligibleRoleNames = ["Admin", "Management", "Manager", "Director", "Executive Team"];
  const specialEligibleEmails = ["hr@adarshshipping.in"];

  const [usersWithPermission, usersWithRoles, specialEligibleUsers] = await Promise.all([
    getUsersWithPermission(orgId, "cha.checklist.internal_approve"),
    db.user.findMany({
      where: {
        orgId,
        active: true,
        OR: [
          {
            roles: {
              some: {
                role: {
                  name: {
                    in: eligibleRoleNames,
                  },
                },
              },
            },
          },
          {
            department: {
              name: "Executive Team",
            },
          },
        ],
      },
      select: { id: true, name: true, email: true, branchId: true },
    }),
    db.user.findMany({
      where: {
        orgId,
        active: true,
        email: { in: specialEligibleEmails },
      },
      select: { id: true, name: true, email: true, branchId: true },
    }),
  ]);

  const allEligible = new Map<string, { id: string; name: string; email: string; branchId: string | null }>();
  
  if (usersWithPermission.length > 0) {
    const permUsers = await db.user.findMany({
      where: {
        id: { in: usersWithPermission },
        active: true,
      },
      select: { id: true, name: true, email: true, branchId: true },
    });
    for (const u of permUsers) {
      allEligible.set(u.id, u);
    }
  }

  for (const u of usersWithRoles) {
    allEligible.set(u.id, u);
  }

  for (const u of specialEligibleUsers) {
    allEligible.set(u.id, u);
  }

  if (allEligible.size === 0) {
    const allUsers = await db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, email: true, branchId: true },
    });
    for (const u of allUsers) {
      allEligible.set(u.id, u);
    }
  }

  return Array.from(allEligible.values());
}

export async function updateJobDetails(
  actorId: string,
  orgId: string,
  jobId: string,
  data: {
    assignedManagerId?: string;
    primaryOwnerId?: string;
  }
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId },
  });

  const hasPermission = await can(actorId, "cha.job.update");
  if (!hasPermission && !(await can(actorId, "cha.job.view_all"))) {
    throw new ForbiddenError("cha.job.update");
  }

  const updates: any = {};
  const audits: any[] = [];

  if (data.assignedManagerId !== undefined) {
    const prevManagerId = job.assignedManagerId;
    if (prevManagerId !== data.assignedManagerId) {
      updates.assignedManagerId = data.assignedManagerId || null;
      audits.push({
        event: "JOB_MANAGER_CHANGED",
        remarks: `Manager changed from ${prevManagerId || "None"} to ${data.assignedManagerId || "None"}`,
      });
    }
  }

  if (data.primaryOwnerId !== undefined) {
    const prevOwnerId = job.primaryOwnerId;
    if (prevOwnerId !== data.primaryOwnerId) {
      updates.primaryOwnerId = data.primaryOwnerId;
      audits.push({
        event: "JOB_OWNER_CHANGED",
        remarks: `Owner changed from ${prevOwnerId} to ${data.primaryOwnerId}`,
      });
    }
  }

  if (Object.keys(updates).length === 0) {
    return job;
  }

  const updatedJob = await db.$transaction(async (tx) => {
    const updated = await tx.chaJob.update({
      where: { id: jobId },
      data: updates,
    });

    if (updates.assignedManagerId) {
      await tx.chaJobAssignment.createMany({
        data: [
          {
            jobId,
            userId: updates.assignedManagerId,
            responsibility: "APPROVAL",
          },
        ],
        skipDuplicates: true,
      });
    }

    return updated;
  });

  for (const audit of audits) {
    await logChaAudit({
      orgId,
      jobId,
      entityType: "ChaJob",
      entityId: jobId,
      event: audit.event,
      actorId,
      remarks: audit.remarks,
    });
  }

  return updatedJob;
}

export async function submitChecklistOwnerDecision(
  actorId: string,
  orgId: string,
  jobId: string,
  checklistId: string,
  decision: "APPROVED" | "REJECTED",
  remarks?: string
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(orgId, jobId),
    include: {
      assignments: true,
      customer: true,
      checklistWorkflow: {
        include: {
          currentFileVersion: true,
          approvals: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const checklist = job.checklistWorkflow;
  if (!checklist || checklist.id !== checklistId || !checklist.currentFileVersion) {
    throw new Error("Checklist record not found for this job.");
  }
  if (checklist.currentApprovalStage !== "JOB_OWNER") {
    throw new Error("Checklist is not awaiting job owner approval.");
  }

  const isOwner = job.primaryOwnerId === actorId;
  const hasPermission = await can(actorId, "cha.checklist.owner_approve");
  const isAdmin = await can(actorId, "cha.job.view_all");
  if (!isOwner && !hasPermission && !isAdmin) {
    throw new ForbiddenError("cha.checklist.owner_approve");
  }

  const existingPending = checklist.approvals.find(
    (approval) =>
      approval.fileVersionId === checklist.currentFileVersionId &&
      approval.stage === "JOB_OWNER" &&
      approval.action === "PENDING"
  );

  if (decision === "REJECTED" && !remarks?.trim()) {
    throw new Error("Rejection reason is mandatory.");
  }

  const result = await db.$transaction(async (tx) => {
    if (existingPending) {
      await tx.chaChecklistDecision.update({
        where: { id: existingPending.id },
        data: {
          action: decision,
          actedById: actorId,
          actedAt: new Date(),
          remarks,
        },
      });
    } else {
      await tx.chaChecklistDecision.create({
        data: {
          checklistId: checklist.id,
          fileVersionId: checklist.currentFileVersionId!,
          stage: "JOB_OWNER",
          action: decision,
          assignedToId: job.primaryOwnerId,
          actedById: actorId,
          actedAt: new Date(),
          remarks,
        },
      });
    }

    if (decision === "REJECTED") {
      await tx.chaChecklist.update({
        where: { id: checklist.id },
        data: {
          status: "JOB_OWNER_REJECTED",
          currentApprovalStage: "UPLOAD",
          updatedById: actorId,
        },
      });

      await tx.chaJob.update({
        where: { id: jobId },
        data: { stage: "CHECKLIST_PREPARATION" },
      });

      return { outcome: "REJECTED" as const };
    }

    if (checklist.customerRejectedOnce) {
      await applyChecklistWorkflowToFiling(tx, {
        actorId,
        orgId,
        jobId,
        checklistId: checklist.id,
        checklistStatus: "FILING_READY",
        remarks: "Customer-rejected checklist was reworked, approved by job owner, and moved directly to Filing.",
      });

      return { outcome: "MOVED_TO_FILING" as const };
    }

    const customerApproverIds = await getChecklistCustomerApproverIds(job);
    await tx.chaChecklist.update({
      where: { id: checklist.id },
      data: {
        status: "CUSTOMER_APPROVAL_PENDING",
        currentApprovalStage: "CUSTOMER",
        customerApprovalAttempted: true,
        updatedById: actorId,
      },
    });

    await tx.chaChecklistDecision.createMany({
      data: customerApproverIds.map((approverId) => ({
        checklistId: checklist.id,
        fileVersionId: checklist.currentFileVersionId!,
        stage: "CUSTOMER",
        action: "PENDING",
        assignedToId: approverId,
      })),
    });

    return { outcome: "CUSTOMER_APPROVAL" as const, customerApproverIds };
  });

  const emailAutomation =
    result.outcome === "CUSTOMER_APPROVAL"
      ? await queueChecklistMainAutomationForJob({
          actorId,
          orgId,
          job,
          checklist,
        }).catch((error) => ({
          queued: false,
          warning:
            error instanceof Error
              ? `Checklist saved, but customer email could not be queued: ${error.message}`
              : "Checklist saved, but customer email could not be queued.",
        }))
      : null;

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklist",
    entityId: checklist.id,
    event: decision === "APPROVED" ? "CHECKLIST_OWNER_APPROVED" : "CHECKLIST_OWNER_REJECTED",
    actorId,
    prevState: "JOB_OWNER_APPROVAL_PENDING",
    newState:
      result.outcome === "REJECTED"
        ? "JOB_OWNER_REJECTED"
        : result.outcome === "CUSTOMER_APPROVAL"
        ? "CUSTOMER_APPROVAL_PENDING"
        : "FILING_READY",
    remarks: remarks || `Job owner ${decision.toLowerCase()} for checklist.`,
  });

  const actorUser = await db.user.findUnique({ where: { id: actorId }, select: { name: true } });
  const actorName = actorUser?.name || "Job Owner";

  if (result.outcome === "REJECTED") {
    const recipients = new Set<string>();
    recipients.add(checklist.createdById);
    if (job.assignedManagerId) recipients.add(job.assignedManagerId);

    await queueChecklistNotifications({
      userIds: Array.from(recipients),
      orgId,
      kind: "CHA_CHECKLIST_OWNER_REJECTED",
      title: `Checklist Rejected by Owner: ${job.jobNumber}`,
      body: `Job: ${job.jobNumber} | Rejected by: ${actorName} | Reason: ${remarks} | Time: ${new Date().toISOString()}. Click link for rework.`,
      link: `/cha/jobs/${jobId}`,
    });
  } else {
    const recipients = new Set<string>();
    recipients.add(checklist.createdById);
    if (job.assignedManagerId) recipients.add(job.assignedManagerId);

    if (result.outcome === "CUSTOMER_APPROVAL") {
      for (const id of result.customerApproverIds ?? []) {
        recipients.add(id);
      }
      await queueChecklistNotifications({
        userIds: Array.from(recipients),
        orgId,
        kind: "CHA_CHECKLIST_CUSTOMER_APPROVAL_REQUESTED",
        title: `Customer Approval Required: ${job.jobNumber}`,
        body: `Checklist cleared Job Owner approval and is now pending customer approval. Approved by owner: ${actorName}.`,
        link: `/cha/jobs/${jobId}`,
      });
    } else if (result.outcome === "MOVED_TO_FILING") {
      const filingRecipients = job.assignments
        .filter((assignment) => assignment.responsibility === "FILING" || assignment.responsibility === "OPERATIONS")
        .map((assignment) => assignment.userId);
      for (const id of filingRecipients) {
        recipients.add(id);
      }
      await queueChecklistNotifications({
        userIds: Array.from(recipients),
        orgId,
        kind: "CHA_CHECKLIST_READY_FOR_FILING",
        title: `Checklist Ready For Filing: ${job.jobNumber}`,
        body: `Checklist cleared Job Owner approval and moved to Filing (rework rule applied). Approved by owner: ${actorName}.`,
        link: `/cha/jobs/${jobId}`,
      });
    }
  }

  return {
    ...result,
    emailAutomation,
  };
}

// ─── Configurable Filing Workflow blueprint services ────────────────────────

const DEFAULT_WORKFLOW_ROLES = ["Admin", "Manager", "Employee"] as const;
const DEFAULT_VALIDITY_NOTIFICATION_ROLES = ["Manager"] as const;

function buildDefaultChecklistConfig(input: {
  label: string;
  description?: string;
  isMandatory?: boolean;
  allowsUpload?: boolean;
  minUploads?: number;
  maxUploads?: number | null;
  acceptedFileTypes?: string[];
  documentType?: string | null;
  requiresValidity?: boolean;
  validityDuration?: number | null;
  validityUnit?: "BUSINESS_DAYS" | "CALENDAR_DAYS" | null;
  warningBeforeDuration?: number | null;
  warningBeforeUnit?: "BUSINESS_DAYS" | "CALENDAR_DAYS" | null;
  notifyBeforeExpiry?: boolean;
}) {
  return {
    label: input.label,
    description: input.description ?? null,
    isMandatory: input.isMandatory !== false,
    requiresRemarks: false,
    allowsUpload: !!input.allowsUpload,
    minUploads: input.allowsUpload ? input.minUploads ?? 1 : 0,
    maxUploads: input.allowsUpload ? input.maxUploads ?? null : null,
    acceptedFileTypes: input.acceptedFileTypes ?? [],
    documentType: input.documentType ?? null,
    requiresValidity: !!input.requiresValidity,
    validityDuration: input.validityDuration ?? null,
    validityUnit: input.validityUnit ?? null,
    warningBeforeDuration: input.warningBeforeDuration ?? null,
    warningBeforeUnit: input.warningBeforeUnit ?? null,
    notifyBeforeExpiry: !!input.notifyBeforeExpiry,
    notificationRoles: input.notifyBeforeExpiry ? [...DEFAULT_VALIDITY_NOTIFICATION_ROLES] : [],
    showInDocumentsPage: !!input.allowsUpload,
    showInTimeline: !!input.allowsUpload,
    deadlineDuration: 2,
    deadlineUnit: "BUSINESS_DAYS",
    delayRemarksRequired: true,
    hasPhotoRequirement: false,
  };
}

function buildDefaultPhotoRequirementConfig(input: {
  label: string;
  description?: string;
  minPhotos?: number;
  maxPhotos?: number | null;
  acceptedFileTypes?: string[];
  documentType?: string | null;
  requiresValidity?: boolean;
  validityDuration?: number | null;
  validityUnit?: "BUSINESS_DAYS" | "CALENDAR_DAYS" | null;
  warningBeforeDuration?: number | null;
  warningBeforeUnit?: "BUSINESS_DAYS" | "CALENDAR_DAYS" | null;
  notifyBeforeExpiry?: boolean;
}) {
  return {
    label: input.label,
    description: input.description ?? null,
    isMandatory: true,
    minPhotos: input.minPhotos ?? 1,
    maxPhotos: input.maxPhotos ?? null,
    acceptedFileTypes: input.acceptedFileTypes ?? ["image/jpeg", "image/png", "application/pdf"],
    isVisibleInTimeline: true,
    documentType: input.documentType ?? null,
    requiresValidity: !!input.requiresValidity,
    validityDuration: input.validityDuration ?? null,
    validityUnit: input.validityUnit ?? null,
    warningBeforeDuration: input.warningBeforeDuration ?? null,
    warningBeforeUnit: input.warningBeforeUnit ?? null,
    notifyBeforeExpiry: !!input.notifyBeforeExpiry,
    notificationRoles: input.notifyBeforeExpiry ? [...DEFAULT_VALIDITY_NOTIFICATION_ROLES] : [],
    showInDocumentsPage: true,
  };
}

function buildDefaultWorkflowNode(input: {
  key: string;
  name: string;
  description: string;
  nodeType?: string;
  sectionKey: string;
  sectionName: string;
  branchKey?: string | null;
  branchName?: string | null;
  sortOrder: number;
  isStart?: boolean;
  positionX: number;
  positionY: number;
  canBeSkipped?: boolean;
  checklistItems?: any[];
  photoRequirements?: any[];
  fieldDefinitionsJson?: FilingFieldDefinition[];
  documentRequirementsJson?: FilingDocumentRequirementConfig[];
  conditionalSectionsJson?: FilingConditionalSectionConfig[];
}) {
  return {
    key: input.key,
    name: input.name,
    description: input.description,
    category: input.branchName ? `${input.sectionName} / ${input.branchName}` : input.sectionName,
    nodeType: input.nodeType ?? "CHECKLIST_NODE",
    sectionKey: input.sectionKey,
    sectionName: input.sectionName,
    branchKey: input.branchKey ?? null,
    branchName: input.branchName ?? null,
    sortOrder: input.sortOrder,
    isStart: input.isStart ?? false,
    positionX: input.positionX,
    positionY: input.positionY,
    allowedRoles: [...DEFAULT_WORKFLOW_ROLES],
    approvalRequired: false,
    approvalRoles: [] as string[],
    canBeSkipped: !!input.canBeSkipped,
    checklistItems: input.checklistItems ?? [],
    photoRequirements: input.photoRequirements ?? [],
    fieldDefinitionsJson: input.fieldDefinitionsJson ?? [],
    documentRequirementsJson: input.documentRequirementsJson ?? [],
    conditionalSectionsJson: input.conditionalSectionsJson ?? [],
  };
}

const DEFAULT_FILING_WORKFLOW_SEED = {
  nodes: [
    buildDefaultWorkflowNode({
      key: "bill_filing",
      name: "Bill Filing",
      description: "Configurable filing start node. Capture bill details, upload the bill document, optionally open customs query handling, and expose the filing path options only after completion.",
      sectionKey: "start",
      sectionName: "Start",
      sortOrder: 1,
      isStart: true,
      positionX: 500,
      positionY: 100,
      fieldDefinitionsJson: [
        { key: "bill_number", label: "Bill Number", type: "TEXT", required: true, placeholder: "Enter bill number" },
      ],
      documentRequirementsJson: [
        {
          key: "bill_document",
          label: "Bill Document",
          required: true,
          acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
          allowReplacement: true,
          allowPreview: true,
        },
      ],
      conditionalSectionsJson: [
        {
          key: "customs_query",
          label: "Customs Query",
          type: "TOGGLE",
          defaultEnabled: false,
          unlocksFields: [
            { key: "query_notes", label: "Query Details", type: "TEXTAREA", required: true, placeholder: "Enter customs query notes" },
          ],
        },
        {
          key: "section_49",
          label: "Sec 49",
          type: "TOGGLE",
          defaultEnabled: false,
          unlocksDocuments: [
            {
              key: "section_49_document",
              label: "Sec 49 Document",
              required: true,
              acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
              allowReplacement: true,
            },
          ],
        },
      ],
    }),
    buildDefaultWorkflowNode({
      key: "choose_primary_path",
      name: "Choose Filing Path",
      description: "Choose the filing path configuration for this job after bill filing is complete.",
      nodeType: "DECISION",
      sectionKey: "start",
      sectionName: "Start",
      sortOrder: 2,
      positionX: 500,
      positionY: 280,
    }),
    buildDefaultWorkflowNode({
      key: "first_check_be_copy_generation",
      name: "BE Copy Generation",
      description: "Generate the BE copy before the remaining First Check sequence.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 3,
      positionX: 140,
      positionY: 460,
      checklistItems: [buildDefaultChecklistConfig({ label: "BE Copy Generation" })],
    }),
    buildDefaultWorkflowNode({
      key: "first_check_goods_registration",
      name: "Goods Registration",
      description: "Register goods under the First Check path.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 4,
      positionX: 140,
      positionY: 640,
      checklistItems: [buildDefaultChecklistConfig({ label: "Goods Registration" })],
    }),
    buildDefaultWorkflowNode({
      key: "first_check_examination",
      name: "Examination",
      description: "Capture examination evidence and CE/Lab report validity.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 5,
      positionX: 140,
      positionY: 820,
      checklistItems: [
        buildDefaultChecklistConfig({
          label: "Examination",
          allowsUpload: true,
          minUploads: 1,
          acceptedFileTypes: ["application/pdf"],
          documentType: "CE/Lab Report",
          requiresValidity: true,
          warningBeforeDuration: 1,
          warningBeforeUnit: "CALENDAR_DAYS",
          notifyBeforeExpiry: true,
        }),
      ],
      photoRequirements: [
        buildDefaultPhotoRequirementConfig({
          label: "Examination Photos",
          acceptedFileTypes: ["image/jpeg", "image/png"],
          documentType: "Examination Photos",
        }),
      ],
    }),
    buildDefaultWorkflowNode({
      key: "first_check_group_forward",
      name: "Group Forward",
      description: "Forward the First Check file to the customs group.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 6,
      positionX: 140,
      positionY: 1000,
      checklistItems: [buildDefaultChecklistConfig({ label: "Group Forward" })],
    }),
    buildDefaultWorkflowNode({
      key: "first_check_assessment",
      name: "Assessment",
      description: "Complete assessment under the First Check path.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 7,
      positionX: 140,
      positionY: 1180,
      checklistItems: [buildDefaultChecklistConfig({ label: "Assessment" })],
    }),
    buildDefaultWorkflowNode({
      key: "first_check_duty",
      name: "Duty",
      description: "Optional duty stage. Users may skip it and continue.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 8,
      positionX: 140,
      positionY: 1360,
      canBeSkipped: true,
      checklistItems: [buildDefaultChecklistConfig({ label: "Duty", isMandatory: false })],
    }),
    buildDefaultWorkflowNode({
      key: "first_check_ooc",
      name: "OOC",
      description: "Upload the Out of Charge document before moving to delivery.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 9,
      positionX: 140,
      positionY: 1540,
      checklistItems: [
        buildDefaultChecklistConfig({
          label: "OOC",
          allowsUpload: true,
          acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
          documentType: "OOC Document",
        }),
      ],
    }),
    buildDefaultWorkflowNode({
      key: "first_check_delivery",
      name: "Delivery",
      description: "Upload the E-Way Bill and track its validity before delivery.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 10,
      positionX: 140,
      positionY: 1720,
      checklistItems: [
        buildDefaultChecklistConfig({
          label: "Delivery",
          allowsUpload: true,
          acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
          documentType: "E-Way Bill",
          requiresValidity: true,
          warningBeforeDuration: 1,
          warningBeforeUnit: "CALENDAR_DAYS",
          notifyBeforeExpiry: true,
        }),
      ],
    }),
    buildDefaultWorkflowNode({
      key: "choose_second_check_branch",
      name: "Choose Second Check Branch",
      description: "Choose whether the Second Check continues through RMS or Open Bill.",
      nodeType: "DECISION",
      sectionKey: "second_check",
      sectionName: "Second Check",
      sortOrder: 11,
      positionX: 860,
      positionY: 460,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_rms_ooc",
      name: "OOC",
      description: "Upload the RMS OOC document.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "rms",
      branchName: "RMS",
      sortOrder: 12,
      positionX: 660,
      positionY: 640,
      checklistItems: [
        buildDefaultChecklistConfig({
          label: "OOC",
          allowsUpload: true,
          acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
          documentType: "RMS OOC Document",
        }),
      ],
    }),
    buildDefaultWorkflowNode({
      key: "second_check_rms_delivery",
      name: "Delivery",
      description: "Upload the RMS delivery document.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "rms",
      branchName: "RMS",
      sortOrder: 13,
      positionX: 660,
      positionY: 820,
      checklistItems: [
        buildDefaultChecklistConfig({
          label: "Delivery",
          allowsUpload: true,
          acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
          documentType: "RMS Delivery Document",
        }),
      ],
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_assessment",
      name: "Assessment",
      description: "Start the Open Bill path with assessment.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 14,
      positionX: 1060,
      positionY: 640,
      checklistItems: [buildDefaultChecklistConfig({ label: "Assessment" })],
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_goods_registration",
      name: "Goods Registration",
      description: "Register goods for the Open Bill path.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 15,
      positionX: 1060,
      positionY: 820,
      checklistItems: [buildDefaultChecklistConfig({ label: "Goods Registration" })],
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_examination",
      name: "Examination",
      description: "Capture examination evidence and validity on the Open Bill path.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 16,
      positionX: 1060,
      positionY: 1000,
      checklistItems: [
        buildDefaultChecklistConfig({
          label: "Examination",
          allowsUpload: true,
          minUploads: 1,
          acceptedFileTypes: ["application/pdf"],
          documentType: "CE/Lab Report",
          requiresValidity: true,
          warningBeforeDuration: 1,
          warningBeforeUnit: "CALENDAR_DAYS",
          notifyBeforeExpiry: true,
        }),
      ],
      photoRequirements: [
        buildDefaultPhotoRequirementConfig({
          label: "Examination Photos",
          acceptedFileTypes: ["image/jpeg", "image/png"],
          documentType: "Examination Photos",
        }),
      ],
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_duty",
      name: "Duty",
      description: "Optional duty stage on the Open Bill path.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 17,
      positionX: 1060,
      positionY: 1180,
      canBeSkipped: true,
      checklistItems: [buildDefaultChecklistConfig({ label: "Duty", isMandatory: false })],
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_ooc",
      name: "OOC",
      description: "Upload the Open Bill OOC document.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 18,
      positionX: 1060,
      positionY: 1360,
      checklistItems: [
        buildDefaultChecklistConfig({
          label: "OOC",
          allowsUpload: true,
          acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
          documentType: "OOC Document",
        }),
      ],
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_delivery",
      name: "Delivery",
      description: "Upload the Open Bill E-Way Bill and track validity.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 19,
      positionX: 1060,
      positionY: 1540,
      checklistItems: [
        buildDefaultChecklistConfig({
          label: "Delivery",
          allowsUpload: true,
          acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
          documentType: "E-Way Bill",
          requiresValidity: true,
          warningBeforeDuration: 1,
          warningBeforeUnit: "CALENDAR_DAYS",
          notifyBeforeExpiry: true,
        }),
      ],
    }),
    buildDefaultWorkflowNode({
      key: "amendment_decision",
      name: "Amendment Decision",
      description: "Choose whether to enter the optional amendment flow or skip it.",
      nodeType: "DECISION",
      sectionKey: "amendment",
      sectionName: "Amendment",
      sortOrder: 20,
      positionX: 860,
      positionY: 1820,
    }),
    buildDefaultWorkflowNode({
      key: "amendment_execution",
      name: "Amendment",
      description: "Configurable amendment checklist that can be entered or skipped.",
      sectionKey: "amendment",
      sectionName: "Amendment",
      sortOrder: 21,
      positionX: 860,
      positionY: 2000,
      canBeSkipped: true,
      checklistItems: [buildDefaultChecklistConfig({ label: "Amendment", isMandatory: false })],
    }),
    buildDefaultWorkflowNode({
      key: "workflow_complete",
      name: "Workflow Complete",
      description: "Finalize the filing workflow after the chosen path finishes.",
      nodeType: "END",
      sectionKey: "end",
      sectionName: "End",
      sortOrder: 22,
      positionX: 860,
      positionY: 2180,
    }),
  ],
  edges: [
    { sourceKey: "bill_filing", targetKey: "choose_primary_path", label: "Select Filing Path" },
    { sourceKey: "choose_primary_path", targetKey: "first_check_be_copy_generation", label: "First Check" },
    { sourceKey: "choose_primary_path", targetKey: "choose_second_check_branch", label: "Second Check" },
    { sourceKey: "first_check_be_copy_generation", targetKey: "first_check_goods_registration", label: "Next" },
    { sourceKey: "first_check_goods_registration", targetKey: "first_check_examination", label: "Next" },
    { sourceKey: "first_check_examination", targetKey: "first_check_group_forward", label: "Next" },
    { sourceKey: "first_check_group_forward", targetKey: "first_check_assessment", label: "Next" },
    { sourceKey: "first_check_assessment", targetKey: "first_check_duty", label: "Next" },
    { sourceKey: "first_check_duty", targetKey: "first_check_ooc", label: "Skip / Complete" },
    { sourceKey: "first_check_ooc", targetKey: "first_check_delivery", label: "Next" },
    { sourceKey: "first_check_delivery", targetKey: "amendment_decision", label: "Next" },
    { sourceKey: "choose_second_check_branch", targetKey: "second_check_rms_ooc", label: "RMS" },
    { sourceKey: "choose_second_check_branch", targetKey: "second_check_open_bill_assessment", label: "Open Bill" },
    { sourceKey: "second_check_rms_ooc", targetKey: "second_check_rms_delivery", label: "Next" },
    { sourceKey: "second_check_rms_delivery", targetKey: "amendment_decision", label: "Next" },
    { sourceKey: "second_check_open_bill_assessment", targetKey: "second_check_open_bill_goods_registration", label: "Next" },
    { sourceKey: "second_check_open_bill_goods_registration", targetKey: "second_check_open_bill_examination", label: "Next" },
    { sourceKey: "second_check_open_bill_examination", targetKey: "second_check_open_bill_duty", label: "Next" },
    { sourceKey: "second_check_open_bill_duty", targetKey: "second_check_open_bill_ooc", label: "Skip / Complete" },
    { sourceKey: "second_check_open_bill_ooc", targetKey: "second_check_open_bill_delivery", label: "Next" },
    { sourceKey: "second_check_open_bill_delivery", targetKey: "amendment_decision", label: "Next" },
    { sourceKey: "amendment_decision", targetKey: "amendment_execution", label: "Do Amendment" },
    { sourceKey: "amendment_decision", targetKey: "workflow_complete", label: "Skip Amendment" },
    { sourceKey: "amendment_execution", targetKey: "workflow_complete", label: "Next" },
  ],
} as const;

function normalizeFieldDefinitions(value: unknown): FilingFieldDefinition[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry, index) => ({
      key: typeof entry.key === "string" && entry.key.trim() ? entry.key.trim() : `field_${index + 1}`,
      label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : `Field ${index + 1}`,
      type: typeof entry.type === "string" && entry.type.trim() ? entry.type.trim() : "TEXT",
      required: entry.required !== false,
      placeholder: typeof entry.placeholder === "string" ? entry.placeholder : null,
      options: Array.isArray(entry.options)
        ? entry.options
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
            .map((item) => ({
              label: typeof item.label === "string" ? item.label : String(item.value ?? ""),
              value: typeof item.value === "string" ? item.value : String(item.label ?? ""),
            }))
        : [],
      helperText: typeof entry.helperText === "string" ? entry.helperText : null,
      defaultValue: entry.defaultValue,
    }));
}

function normalizeDocumentRequirements(value: unknown): FilingDocumentRequirementConfig[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry, index) => ({
      key: typeof entry.key === "string" && entry.key.trim() ? entry.key.trim() : `document_${index + 1}`,
      label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : `Document ${index + 1}`,
      required: entry.required !== false,
      acceptedFileTypes: Array.isArray(entry.acceptedFileTypes)
        ? entry.acceptedFileTypes.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : ["application/pdf", "image/jpeg", "image/png"],
      maxFileSizeMb: entry.maxFileSizeMb === undefined || entry.maxFileSizeMb === null ? null : Number(entry.maxFileSizeMb),
      multiple: !!entry.multiple,
      allowReplacement: entry.allowReplacement !== false,
      allowPreview: entry.allowPreview !== false,
      approvalRequired: !!entry.approvalRequired,
      visibleWhen:
        entry.visibleWhen && typeof entry.visibleWhen === "object"
          ? {
              sectionKey:
                typeof (entry.visibleWhen as Record<string, unknown>).sectionKey === "string"
                  ? String((entry.visibleWhen as Record<string, unknown>).sectionKey)
                  : undefined,
              equals:
                typeof (entry.visibleWhen as Record<string, unknown>).equals === "boolean"
                  ? Boolean((entry.visibleWhen as Record<string, unknown>).equals)
                  : undefined,
            }
          : null,
      requiresValidity: !!entry.requiresValidity,
      reminderOffsetDays:
        entry.reminderOffsetDays === undefined || entry.reminderOffsetDays === null ? null : Number(entry.reminderOffsetDays),
      reminderKind: typeof entry.reminderKind === "string" ? entry.reminderKind : null,
    }));
}

function normalizeConditionalSections(value: unknown): FilingConditionalSectionConfig[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry, index) => ({
      key: typeof entry.key === "string" && entry.key.trim() ? entry.key.trim() : `section_${index + 1}`,
      label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : `Section ${index + 1}`,
      type: typeof entry.type === "string" && entry.type.trim() ? entry.type.trim() : "TOGGLE",
      defaultEnabled: !!entry.defaultEnabled,
      unlocksDocuments: normalizeDocumentRequirements(entry.unlocksDocuments),
      unlocksFields: normalizeFieldDefinitions(entry.unlocksFields),
      config: entry.config && typeof entry.config === "object" ? (entry.config as Record<string, unknown>) : null,
    }));
}

function normalizeTemplateSettings(value: unknown) {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    customerApprovalTabDelayMinutes:
      input.customerApprovalTabDelayMinutes === undefined
        ? DEFAULT_CUSTOMER_APPROVAL_DELAY_MINUTES
        : Math.max(0, Number(input.customerApprovalTabDelayMinutes)),
    queryReminderTime:
      typeof input.queryReminderTime === "string" && input.queryReminderTime.trim()
        ? input.queryReminderTime.trim()
        : DEFAULT_QUERY_REMINDER_TIME,
    doValidityReminderOffsetDays:
      input.doValidityReminderOffsetDays === undefined || input.doValidityReminderOffsetDays === null
        ? 2
        : Math.max(0, Number(input.doValidityReminderOffsetDays)),
    mailTemplates: input.mailTemplates && typeof input.mailTemplates === "object" ? input.mailTemplates : {},
  };
}

function normalizeWorkflowNodeDraft(node: any, nodeIndex: number) {
  const rawCategory = typeof node.category === "string" ? node.category : "CHECK";
  const derivedNodeType =
    typeof node.nodeType === "string" && node.nodeType.trim()
      ? node.nodeType.trim().toUpperCase()
      : rawCategory === "START" || rawCategory === "END"
        ? rawCategory
        : "CHECKLIST_NODE";
  return {
    ...node,
    key: typeof node.key === "string" && node.key.trim()
      ? node.key.trim()
      : `${String(node.name || "node").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "node"}_${nodeIndex + 1}`,
    name: typeof node.name === "string" ? node.name : `Node ${nodeIndex + 1}`,
    description: typeof node.description === "string" ? node.description : null,
    category: rawCategory,
    nodeType: derivedNodeType,
    sectionKey: typeof node.sectionKey === "string" && node.sectionKey.trim() ? node.sectionKey.trim() : null,
    sectionName: typeof node.sectionName === "string" && node.sectionName.trim() ? node.sectionName.trim() : null,
    branchKey: typeof node.branchKey === "string" && node.branchKey.trim() ? node.branchKey.trim() : null,
    branchName: typeof node.branchName === "string" && node.branchName.trim() ? node.branchName.trim() : null,
    sortOrder: Number.isFinite(Number(node.sortOrder)) ? Math.max(1, Number(node.sortOrder)) : nodeIndex + 1,
    isActive: node.isActive !== false,
    positionX: Number(node.positionX ?? 0),
    positionY: Number(node.positionY ?? 0),
    isStart: !!node.isStart,
    slaDuration: node.slaDuration !== undefined ? Math.max(1, Number(node.slaDuration)) : 2,
    slaUnit: node.slaUnit === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : "BUSINESS_DAYS",
    commentsRequired: !!node.commentsRequired,
    canBeSkipped: !!node.canBeSkipped,
    canBeRevisited: node.canBeRevisited !== undefined ? !!node.canBeRevisited : true,
    approvalRequired: !!node.approvalRequired,
    approvalRoles: Array.isArray(node.approvalRoles)
      ? node.approvalRoles.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : [],
    requireAllMandatoryChecklistItems: node.requireAllMandatoryChecklistItems !== undefined ? !!node.requireAllMandatoryChecklistItems : true,
    requireMandatoryPhotos: node.requireMandatoryPhotos !== undefined ? !!node.requireMandatoryPhotos : true,
    fieldDefinitionsJson: normalizeFieldDefinitions(node.fieldDefinitionsJson ?? node.fieldDefinitions ?? []),
    documentRequirementsJson: normalizeDocumentRequirements(node.documentRequirementsJson ?? node.documentRequirements ?? []),
    conditionalSectionsJson: normalizeConditionalSections(node.conditionalSectionsJson ?? node.conditionalSections ?? []),
    approvalConfigJson: node.approvalConfigJson ?? node.approvalConfig ?? null,
    notificationConfigJson: node.notificationConfigJson ?? node.notificationConfig ?? null,
    actionConfigJson: node.actionConfigJson ?? node.actionConfig ?? null,
    allowedRoles: Array.isArray(node.allowedRoles)
      ? node.allowedRoles.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : ["Admin", "Manager", "Employee"],
    checklistItems: (node.checklistItems || []).map((item: any, itemIndex: number) => normalizeFilingChecklistItem(item, itemIndex)),
    photoRequirements: (node.photoRequirements || []).map((photo: any) => ({
      label: typeof photo.label === "string" ? photo.label : "",
      description: typeof photo.description === "string" ? photo.description : null,
      isMandatory: photo.isMandatory !== undefined ? !!photo.isMandatory : true,
      minPhotos: Math.max(Number(photo.minPhotos ?? 1), 0),
      maxPhotos: photo.maxPhotos === undefined || photo.maxPhotos === null ? null : Math.max(Number(photo.maxPhotos), 0),
      acceptedFileTypes: Array.isArray(photo.acceptedFileTypes)
        ? photo.acceptedFileTypes.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
        : ["image/jpeg", "image/png", "application/pdf"],
      isVisibleInTimeline: photo.isVisibleInTimeline !== undefined ? !!photo.isVisibleInTimeline : true,
      documentType: typeof photo.documentType === "string" ? photo.documentType.trim() || null : null,
      requiresValidity: !!photo.requiresValidity,
      validityDuration: photo.validityDuration === undefined || photo.validityDuration === null ? null : Math.max(Number(photo.validityDuration), 1),
      validityUnit: photo.validityUnit === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : photo.validityUnit === "BUSINESS_DAYS" ? "BUSINESS_DAYS" : null,
      warningBeforeDuration: photo.warningBeforeDuration === undefined || photo.warningBeforeDuration === null ? null : Math.max(Number(photo.warningBeforeDuration), 1),
      warningBeforeUnit: photo.warningBeforeUnit === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : photo.warningBeforeUnit === "BUSINESS_DAYS" ? "BUSINESS_DAYS" : null,
      notifyBeforeExpiry: !!photo.notifyBeforeExpiry,
      notificationRoles: Array.isArray(photo.notificationRoles)
        ? photo.notificationRoles.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
        : [],
      showInDocumentsPage: photo.showInDocumentsPage !== false,
    })),
  };
}

function expandLegacyChecklistNodes(nodes: any[], edges: any[]) {
  const expandedNodes: any[] = [];
  const expandedEdges: { sourceKey: string; targetKey: string; label: string | null }[] = [];
  const bridgeMap = new Map<string, { firstKey: string; lastKey: string }>();

  for (const [index, rawNode] of nodes.entries()) {
    const normalizedNode = normalizeWorkflowNodeDraft(rawNode, index);
    const activeChecklistItems = normalizedNode.checklistItems.filter((item: any) => item.isActive !== false);
    const shouldExpand =
      normalizedNode.nodeType !== "START" &&
      normalizedNode.nodeType !== "END" &&
      normalizedNode.nodeType !== "NOTIFICATION" &&
      activeChecklistItems.length > 1;

    if (!shouldExpand) {
      expandedNodes.push({
        ...normalizedNode,
        checklistItems:
          normalizedNode.checklistItems.length > 0
            ? normalizedNode.checklistItems
            : normalizedNode.nodeType === "CHECKLIST_NODE"
              ? [normalizeFilingChecklistItem({ label: normalizedNode.name }, 0)]
              : [],
      });
      continue;
    }

    const orderedItems = [...normalizedNode.checklistItems].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const splitNodes = orderedItems.map((item: any, itemIndex: number) => ({
      ...normalizedNode,
      key: `${normalizedNode.key}_${slugify(item.label || `item_${itemIndex + 1}`)}`,
      name: item.label || `${normalizedNode.name} ${itemIndex + 1}`,
      description: item.description || normalizedNode.description,
      nodeType: "CHECKLIST_NODE",
      sortOrder: normalizedNode.sortOrder + itemIndex,
      isStart: normalizedNode.isStart && itemIndex === 0,
      checklistItems: [{ ...item, sortOrder: 1 }],
      photoRequirements: itemIndex === 0 ? normalizedNode.photoRequirements : [],
      positionX: normalizedNode.positionX,
      positionY: normalizedNode.positionY + itemIndex * 180,
    }));

    bridgeMap.set(normalizedNode.key, {
      firstKey: splitNodes[0].key,
      lastKey: splitNodes[splitNodes.length - 1].key,
    });
    expandedNodes.push(...splitNodes);

    for (let itemIndex = 0; itemIndex < splitNodes.length - 1; itemIndex += 1) {
      expandedEdges.push({
        sourceKey: splitNodes[itemIndex].key,
        targetKey: splitNodes[itemIndex + 1].key,
        label: "Checklist Sequence",
      });
    }
  }

  for (const edge of edges || []) {
    const sourceKey = bridgeMap.get(edge.sourceKey)?.lastKey ?? edge.sourceKey;
    const targetKey = bridgeMap.get(edge.targetKey)?.firstKey ?? edge.targetKey;
    if (!sourceKey || !targetKey || sourceKey === targetKey) continue;
    expandedEdges.push({
      sourceKey,
      targetKey,
      label: edge.label || null,
    });
  }

  return {
    nodes: expandedNodes.map((node, index) => ({ ...node, sortOrder: index + 1 })),
    edges: expandedEdges,
  };
}

async function getHolidayIsoSet(orgId?: string) {
  if (!orgId) {
    return new Set<string>();
  }
  const holidays = await db.holiday.findMany({ where: { orgId } });
  return new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));
}

function countBusinessDaysSince(dueAt: Date, now: Date, holidayIsoSet: Set<string>) {
  if (dueAt.getTime() >= now.getTime()) {
    return 0;
  }

  const cursor = new Date(dueAt);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);

  let businessDays = 0;
  while (cursor.getTime() < end.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    const iso = cursor.toISOString().split("T")[0];
    if (day !== 0 && !holidayIsoSet.has(iso)) {
      businessDays += 1;
    }
  }
  return businessDays;
}

function normalizeFilingChecklistItem(item: any, idx: number) {
  const allowsUpload = !!item.allowsUpload;
  const acceptedFileTypes = Array.isArray(item.acceptedFileTypes)
    ? item.acceptedFileTypes.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  return {
    label: typeof item.label === "string" ? item.label : "",
    description: typeof item.description === "string" ? item.description : null,
    isMandatory: item.isMandatory !== undefined ? !!item.isMandatory : true,
    requiresRemarks: !!item.requiresRemarks,
    allowsUpload,
    minUploads: allowsUpload ? Math.max(Number(item.minUploads ?? 0), 0) : 0,
    maxUploads: allowsUpload && item.maxUploads !== undefined && item.maxUploads !== null
      ? Math.max(Number(item.maxUploads), 0)
      : null,
    acceptedFileTypes,
    documentType: typeof item.documentType === "string" ? item.documentType.trim() || null : null,
    requiresValidity: !!item.requiresValidity,
    validityDuration: item.validityDuration === undefined || item.validityDuration === null ? null : Math.max(Number(item.validityDuration), 1),
    validityUnit: item.validityUnit === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : item.validityUnit === "BUSINESS_DAYS" ? "BUSINESS_DAYS" : null,
    warningBeforeDuration: item.warningBeforeDuration === undefined || item.warningBeforeDuration === null ? null : Math.max(Number(item.warningBeforeDuration), 1),
    warningBeforeUnit: item.warningBeforeUnit === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : item.warningBeforeUnit === "BUSINESS_DAYS" ? "BUSINESS_DAYS" : null,
    notifyBeforeExpiry: !!item.notifyBeforeExpiry,
    notificationRoles: Array.isArray(item.notificationRoles)
      ? item.notificationRoles.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : [],
    showInDocumentsPage: item.showInDocumentsPage !== false,
    showInTimeline: item.showInTimeline !== false,
    deadlineDuration: Math.max(Number(item.deadlineDuration ?? 2), 1),
    deadlineUnit: item.deadlineUnit === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : "BUSINESS_DAYS",
    delayRemarksRequired: item.delayRemarksRequired !== undefined ? !!item.delayRemarksRequired : true,
    hasPhotoRequirement: !!item.hasPhotoRequirement,
    sortOrder: item.sortOrder !== undefined ? Number(item.sortOrder) : idx + 1,
    isActive: item.isActive !== undefined ? !!item.isActive : true,
  };
}

function slugify(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "node";
}

function validateFilingWorkflowDraft(data: { nodes: any[]; edges: any[] }) {
  const activeNodes = (data.nodes || []).filter((node) => node.isActive !== false);
  const nodeKeys = new Set(activeNodes.map((node) => node.key));
  const errors: string[] = [];
  const warnings: string[] = [];

  if (activeNodes.length === 0) {
    errors.push("The workflow must have at least one active node.");
  }

  const startNodes = activeNodes.filter((node) => node.isStart);
  if (startNodes.length !== 1) {
    errors.push(startNodes.length === 0 ? "The workflow must have one start node." : "The workflow can only have one start node.");
  }

  const edgeSet = new Set<string>();
  for (const edge of data.edges || []) {
    if (!edge.sourceKey || !edge.targetKey) {
      errors.push("Edges must have both a source node and a target node.");
      continue;
    }
    if (edge.sourceKey === edge.targetKey) {
      errors.push(`Node "${edge.sourceKey}" cannot connect to itself.`);
    }
    if (!nodeKeys.has(edge.sourceKey) || !nodeKeys.has(edge.targetKey)) {
      errors.push(`Edge ${edge.sourceKey} -> ${edge.targetKey} references an inactive or missing node.`);
    }
    const signature = `${edge.sourceKey}::${edge.targetKey}`;
    if (edgeSet.has(signature)) {
      errors.push(`Duplicate edge detected for ${edge.sourceKey} -> ${edge.targetKey}.`);
    }
    edgeSet.add(signature);
  }

  for (const node of activeNodes) {
    if ((node.nodeType ?? "CHECKLIST_NODE") === "NOTIFICATION") {
      const outgoingCount = (data.edges || []).filter((edge) => edge.sourceKey === node.key).length;
      if (outgoingCount > 1) {
        errors.push(`Notification node "${node.name || node.key}" can have at most one outgoing edge because it advances automatically.`);
      }
    }
    if (!node.name || !String(node.name).trim()) {
      errors.push(`Node "${node.key || "untitled"}" must have a name.`);
    }
    const checklistItems = (node.checklistItems || []).filter((item: any) => item.isActive !== false);
    const fieldDefinitions = normalizeFieldDefinitions(node.fieldDefinitionsJson ?? node.fieldDefinitions ?? []);
    const documentRequirements = normalizeDocumentRequirements(node.documentRequirementsJson ?? node.documentRequirements ?? []);
    const conditionalSections = normalizeConditionalSections(node.conditionalSectionsJson ?? node.conditionalSections ?? []);
    if (
      (node.nodeType ?? "CHECKLIST_NODE") === "CHECKLIST_NODE" &&
      checklistItems.length === 0 &&
      fieldDefinitions.length === 0 &&
      documentRequirements.length === 0 &&
      conditionalSections.length === 0
    ) {
      errors.push(`Checklist node "${node.name || node.key}" must define at least one checklist item, field, document, or conditional section.`);
    }
    if ((node.nodeType ?? "CHECKLIST_NODE") === "NOTIFICATION" && checklistItems.length > 0) {
      warnings.push(`Notification node "${node.name || node.key}" ignores checklist items. Remove them for clarity.`);
    }
    for (const item of checklistItems) {
      if (!item.label || !String(item.label).trim()) {
        errors.push(`Checklist items in node "${node.name || node.key}" must have a name.`);
      }
      if (Number(item.deadlineDuration ?? 2) <= 0) {
        errors.push(`Checklist item "${item.label || "Untitled"}" in node "${node.name || node.key}" must have a valid SLA duration.`);
      }
      if (item.allowsUpload) {
        const minUploads = Number(item.minUploads ?? 0);
        const maxUploads = item.maxUploads === null || item.maxUploads === undefined ? null : Number(item.maxUploads);
        if (minUploads < 0) {
          errors.push(`Checklist item "${item.label || "Untitled"}" cannot require a negative minimum upload count.`);
        }
        if (maxUploads !== null && maxUploads < minUploads) {
          errors.push(`Checklist item "${item.label || "Untitled"}" cannot have max uploads lower than min uploads.`);
        }
      }
    }
  }

  if (startNodes.length === 1) {
    const adjacency = new Map<string, string[]>();
    for (const node of activeNodes) adjacency.set(node.key, []);
    for (const edge of data.edges || []) {
      if (!adjacency.has(edge.sourceKey)) continue;
      adjacency.get(edge.sourceKey)!.push(edge.targetKey);
      const target = activeNodes.find((node) => node.key === edge.targetKey);
      const source = activeNodes.find((node) => node.key === edge.sourceKey);
      if (
        source &&
        target &&
        target.positionY <= source.positionY &&
        source.canBeRevisited !== true &&
        target.canBeRevisited !== true
      ) {
        warnings.push(`Back-transition detected from "${source.name}" to "${target.name}".`);
      }
    }

    const seen = new Set<string>([startNodes[0].key]);
    const queue = [startNodes[0].key];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of adjacency.get(current) || []) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }

    const unreachable = activeNodes.filter((node) => !seen.has(node.key));
    if (unreachable.length > 0) {
      errors.push(`Disconnected active nodes: ${unreachable.map((node) => node.name).join(", ")}.`);
    }
  }

  return { errors, warnings };
}

async function createFilingNodeRunWithResponses(
  tx: Prisma.TransactionClient,
  params: {
    instanceId: string;
    node: {
      id: string;
      key: string;
      checklistItems: Array<{ id: string; deadlineDuration: number; deadlineUnit: string; isActive: boolean }>;
    };
    startedAt: Date;
    orgId: string;
  },
) {
  const nodeRun = await tx.filingNodeRun.create({
    data: {
      instanceId: params.instanceId,
      nodeId: params.node.id,
      nodeKey: params.node.key,
      status: "ACTIVE",
      startedAt: params.startedAt,
    },
  });

  const activeItems = params.node.checklistItems.filter((item) => item.isActive !== false);
  for (const item of activeItems) {
    const dueAt = await calculateSlaDueDate(params.startedAt, item.deadlineDuration || 2, item.deadlineUnit || "BUSINESS_DAYS", params.orgId);
    await tx.filingChecklistResponse.upsert({
      where: {
        instanceId_checklistItemId: {
          instanceId: params.instanceId,
          checklistItemId: item.id,
        },
      },
      create: {
        instanceId: params.instanceId,
        nodeRunId: nodeRun.id,
        checklistItemId: item.id,
        isChecked: false,
        dueAt,
      },
      update: {
        nodeRunId: nodeRun.id,
        dueAt,
        completedAt: null,
        delayRemarks: null,
        delayRemarkedAt: null,
        fileKey: null,
      },
    });
  }

  return nodeRun;
}

async function notifyConcernedUsersForFilingNode(params: {
  orgId: string;
  jobId: string;
  nodeRunId: string;
  nodeKey: string;
  nodeName: string;
  nodeDescription?: string | null;
  startedAt: Date;
}) {
  const job = await db.chaJob.findFirstOrThrow({
    where: { id: params.jobId, orgId: params.orgId, deletedAt: null },
    select: {
      id: true,
      jobNumber: true,
      title: true,
      primaryOwnerId: true,
      assignedManagerId: true,
      assignments: {
        select: { userId: true },
      },
    },
  });

  const recipientIds = Array.from(new Set([
    job.primaryOwnerId,
    job.assignedManagerId,
    ...job.assignments.map((assignment) => assignment.userId),
  ].filter((value): value is string => typeof value === "string" && value.length > 0)));

  if (recipientIds.length === 0) {
    return;
  }

  const title = params.nodeName.trim() || `Filing workflow notification for ${job.jobNumber || "job"}`;
  const body = [
    params.nodeDescription?.trim(),
    job.jobNumber ? `Job: ${job.jobNumber}` : null,
    job.title ? `Title: ${job.title}` : null,
  ].filter(Boolean).join("\n");
  const link = `/cha/jobs/${params.jobId}`;

  await Promise.all(recipientIds.map(async (userId) => {
    const existing = await db.notification.findFirst({
      where: {
        orgId: params.orgId,
        userId,
        kind: FILING_WORKFLOW_NOTIFICATION_KIND,
        title,
        link,
        createdAt: { gte: params.startedAt },
      },
      select: { id: true },
    });

    if (existing) {
      return;
    }

    await createNotification({
      userId,
      orgId: params.orgId,
      actorId: job.primaryOwnerId,
      kind: FILING_WORKFLOW_NOTIFICATION_KIND,
      title,
      body: body || `Workflow notification triggered for ${job.jobNumber || "this filing job"}.`,
      link,
      payload: {
        jobId: params.jobId,
        nodeKey: params.nodeKey,
        nodeRunId: params.nodeRunId,
      },
    });
  }));
}

async function resolveNotificationWorkflowNodes(orgId: string, jobId: string) {
  while (true) {
    const instance = await db.filingWorkflowInstance.findUnique({
      where: { jobId },
      include: FILING_WORKFLOW_INSTANCE_INCLUDE,
    });

    if (!instance) {
      return null;
    }

    const activeNodeRun = instance.nodeRuns.find((run) => run.status === "ACTIVE") ?? null;
    if (!activeNodeRun || activeNodeRun.node.nodeType !== "NOTIFICATION") {
      return instance;
    }

    const outgoingEdges = instance.version.edges.filter((edge) => edge.sourceKey === activeNodeRun.nodeKey);
    if (outgoingEdges.length > 1) {
      throw new Error(`Notification node "${activeNodeRun.node.name}" has multiple outgoing transitions. Keep it to one automatic continuation.`);
    }

    const nextNodeKey = outgoingEdges[0]?.targetKey ?? null;
    await notifyConcernedUsersForFilingNode({
      orgId,
      jobId,
      nodeRunId: activeNodeRun.id,
      nodeKey: activeNodeRun.nodeKey,
      nodeName: activeNodeRun.node.name,
      nodeDescription: activeNodeRun.node.description,
      startedAt: activeNodeRun.startedAt,
    });

    await db.$transaction(async (tx) => {
      const now = await getNow();

      await tx.filingNodeRun.update({
        where: { id: activeNodeRun.id },
        data: {
          status: "COMPLETED",
          completedAt: now,
          remarks: activeNodeRun.remarks || "Notification dispatched automatically.",
        },
      });

      if (nextNodeKey) {
        const targetNode = instance.version.nodes.find((node) => node.key === nextNodeKey && node.isActive);
        if (!targetNode) {
          throw new Error(`Notification node "${activeNodeRun.node.name}" points to a missing or inactive next node.`);
        }

        const nextStartedAt = await getNow();
        const nextSlaDueDate = await calculateSlaDueDate(nextStartedAt, targetNode.slaDuration, targetNode.slaUnit, orgId);
        const nextNodeRun = await createFilingNodeRunWithResponses(tx, {
          instanceId: instance.id,
          node: {
            ...targetNode,
            checklistItems: await tx.filingChecklistItem.findMany({
              where: { nodeId: targetNode.id },
            }),
          },
          startedAt: nextStartedAt,
          orgId,
        });

        await tx.filingNodeRun.update({
          where: { id: nextNodeRun.id },
          data: { slaDueDate: nextSlaDueDate },
        });

        await tx.filingWorkflowInstance.update({
          where: { id: instance.id },
          data: { currentNodeKey: nextNodeKey },
        });

        await tx.chaAuditLog.create({
          data: {
            orgId,
            jobId,
            entityType: "FilingWorkflowInstance",
            entityId: instance.id,
            event: "FILING_NOTIFICATION_NODE_TRIGGERED",
            actorId: "system",
            prevState: activeNodeRun.nodeKey,
            newState: nextNodeKey,
            remarks: `Notification node "${activeNodeRun.node.name}" auto-notified the concerned users and advanced the workflow.`,
          },
        });

        return;
      }

      await tx.filingWorkflowInstance.update({
        where: { id: instance.id },
        data: { status: "COMPLETED", currentNodeKey: null },
      });

      await tx.chaJob.update({
        where: { id: jobId },
        data: { stage: "FILED" },
      });

      const existingFiling = await tx.chaFiling.findUnique({ where: { jobId } });
      if (existingFiling) {
        await tx.chaFiling.update({
          where: { id: existingFiling.id },
          data: {
            status: "FILED",
            actualFilingDate: now,
            filingRef: existingFiling.filingRef || `BLUEPRINT-${instance.id.substring(0, 8).toUpperCase()}`,
          },
        });
      }

      await tx.chaAuditLog.create({
        data: {
          orgId,
          jobId,
          entityType: "FilingWorkflowInstance",
          entityId: instance.id,
          event: "FILING_NOTIFICATION_NODE_TRIGGERED",
          actorId: "system",
          prevState: activeNodeRun.nodeKey,
          newState: "FILED",
          remarks: `Notification node "${activeNodeRun.node.name}" auto-notified the concerned users and completed the workflow.`,
        },
      });
    });
  }
}

async function syncOverdueFilingItems(orgId: string, jobId: string) {
  const now = await getNow();
  const instance = await db.filingWorkflowInstance.findUnique({
    where: { jobId },
    include: {
      job: {
        select: {
          primaryOwnerId: true,
        },
      },
      responses: {
        where: {
          isChecked: false,
          dueAt: { not: null, lt: now },
          overdueLoggedAt: null,
        },
        include: {
          checklistItem: { include: { node: true } },
        },
      },
    },
  });

  if (!instance || instance.responses.length === 0) {
    return;
  }

  // Batch update all overdue items in one query, then log in parallel
  await db.filingChecklistResponse.updateMany({
    where: { id: { in: instance.responses.map((r) => r.id) } },
    data: { overdueLoggedAt: now },
  });

  await Promise.all(
    instance.responses.map((response) =>
      logChaAudit({
        orgId,
        jobId,
        entityType: "FilingChecklistResponse",
        entityId: response.id,
        event: "FILING_CHECKLIST_ITEM_OVERDUE",
        actorId: instance.job.primaryOwnerId,
        remarks: `Checklist item "${response.checklistItem.label}" in node "${response.checklistItem.node.name}" is overdue.`,
        metadata: {
          dueAt: response.dueAt,
        },
      })
    )
  );
}

export async function ensureDefaultFilingWorkflows(orgId: string) {
  const firstUser = await db.user.findFirst({ where: { orgId } });
  const createdById = firstUser?.id || "system";

  // Remove legacy category-specific templates that have no active job instances.
  const legacyTemplates = await db.filingWorkflowTemplate.findMany({
    where: { orgId, filingFlowCategory: { not: null } },
    select: { id: true, _count: { select: { instances: true } } },
  });
  const safeToDelete = legacyTemplates.filter((t) => t._count.instances === 0).map((t) => t.id);
  if (safeToDelete.length > 0) {
    await db.filingWorkflowTemplate.deleteMany({ where: { id: { in: safeToDelete } } });
  }

  const catchAllExists = await db.filingWorkflowTemplate.findFirst({
    where: { orgId, clearanceTypeId: null, filingFlowCategory: null },
    select: { id: true },
  });
  if (!catchAllExists) {
    const draft = await saveFilingWorkflowDraft(createdById, orgId, null, {
      name: "Default Filing Workflow",
      description:
        "Default configurable CHA filing workflow covering both Import and Export. Includes First Check, Second Check (RMS / Open Bill), configurable uploads, validity tracking, and optional amendment handling.",
      filingFlowCategory: null,
      settings: {
        customerApprovalTabDelayMinutes: DEFAULT_CUSTOMER_APPROVAL_DELAY_MINUTES,
        queryReminderTime: DEFAULT_QUERY_REMINDER_TIME,
        doValidityReminderOffsetDays: 2,
      },
      nodes: [...DEFAULT_FILING_WORKFLOW_SEED.nodes] as unknown as any[],
      edges: [...DEFAULT_FILING_WORKFLOW_SEED.edges] as unknown as any[],
    });
    const versionId = draft.versions?.[0]?.id;
    if (versionId) {
      await publishFilingWorkflow(createdById, orgId, versionId);
    }
  }
}

export async function calculateSlaDueDate(startDate: Date, duration: number, unit: string, orgId?: string): Promise<Date> {
  const result = new Date(startDate);
  if (unit === "CALENDAR_DAYS") {
    result.setDate(result.getDate() + duration);
    return result;
  }

  // BUSINESS_DAYS: Exclude Sundays at minimum
  let added = 0;
  const holidayStrings = await getHolidayIsoSet(orgId);

  while (added < duration) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay(); // 0 = Sunday
    const iso = result.toISOString().split("T")[0];
    if (dow !== 0 && !holidayStrings.has(iso)) {
      added++;
    }
  }
  return result;
}

export async function listFilingWorkflows(orgId: string) {
  return db.filingWorkflowTemplate.findMany({
    where: { orgId },
    include: {
      clearanceType: {
        select: {
          id: true,
          name: true,
          filingFlowCategory: true,
        },
      },
      // Only the latest version — callers that need full node/edge data call getFilingWorkflowDetails
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          id: true,
          versionNumber: true,
          isPublished: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFilingWorkflowDetails(userId: string, orgId: string, templateId: string) {
  return db.filingWorkflowTemplate.findFirstOrThrow({
    where: { id: templateId, orgId },
    include: {
      clearanceType: {
        select: {
          id: true,
          name: true,
        },
      },
      // Only the latest version with full node/edge data
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          nodes: {
            orderBy: { sortOrder: "asc" },
            include: {
              checklistItems: { orderBy: { sortOrder: "asc" } },
              photoRequirements: true,
            },
          },
          edges: true,
        },
      },
    },
  });
}

export async function saveFilingWorkflowDraft(
  userId: string,
  orgId: string,
  templateId: string | null,
  data: {
    name: string;
    description?: string;
    clearanceTypeId?: string | null;
    filingFlowCategory?: string | null;
    settings?: Record<string, unknown> | null;
    mailTemplates?: Record<string, unknown> | null;
    nodes: any[];
    edges: any[];
  }
) {
  const normalizedDraft = expandLegacyChecklistNodes(data.nodes || [], data.edges || []);
  const normalizedNodes = normalizedDraft.nodes.map((node: any, nodeIndex: number) =>
    normalizeWorkflowNodeDraft({ ...node, sortOrder: node.sortOrder ?? nodeIndex + 1 }, nodeIndex),
  );

  const normalizedEdges = (normalizedDraft.edges || []).map((edge: any) => ({
    sourceKey: edge.sourceKey,
    targetKey: edge.targetKey,
    label: edge.label || null,
    transitionType: typeof edge.transitionType === "string" && edge.transitionType.trim() ? edge.transitionType.trim().toUpperCase() : "FORWARD",
    requiresReason: !!edge.requiresReason,
    transitionConfigJson: edge.transitionConfigJson ?? edge.transitionConfig ?? null,
  }));

  if (data.clearanceTypeId) {
    const clearanceType = await db.chaJobType.findFirst({
      where: { id: data.clearanceTypeId, orgId },
      select: { id: true },
    });
    if (!clearanceType) {
      throw new Error("The selected clearance type is invalid for this organisation.");
    }
  }

  let template;
  if (templateId) {
    template = await db.filingWorkflowTemplate.findFirstOrThrow({
      where: { id: templateId, orgId },
    });
  } else {
    const existing = await db.filingWorkflowTemplate.findUnique({
      where: { orgId_name: { orgId, name: data.name } },
    });
    if (existing) {
      throw new Error(`A template with name "${data.name}" already exists.`);
    }
    template = await db.filingWorkflowTemplate.create({
      data: {
        orgId,
        clearanceTypeId: data.clearanceTypeId || null,
        filingFlowCategory: data.filingFlowCategory || null,
        name: data.name,
        description: data.description,
        settingsJson: normalizeTemplateSettings(data.settings ?? null),
        mailTemplatesJson: (data.mailTemplates ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        isActive: true,
      },
    });
  }

  const latestVersion = await db.filingWorkflowVersion.findFirst({
    where: { templateId: template.id },
    orderBy: { versionNumber: "desc" },
  });

  let draftVersion;
  if (latestVersion && !latestVersion.isPublished) {
    draftVersion = latestVersion;
  } else {
    const nextVerNum = latestVersion ? latestVersion.versionNumber + 1 : 1;
    draftVersion = await db.filingWorkflowVersion.create({
      data: {
        templateId: template.id,
        versionNumber: nextVerNum,
        isPublished: false,
        isActive: false,
        createdById: userId,
      },
    });
  }

  const versionId = draftVersion.id;

  await db.$transaction(async (tx) => {
    await tx.filingWorkflowTemplate.update({
      where: { id: template.id },
      data: {
        name: data.name,
        description: data.description,
        clearanceTypeId: data.clearanceTypeId || null,
        filingFlowCategory: data.filingFlowCategory !== undefined ? (data.filingFlowCategory || null) : undefined,
        settingsJson: normalizeTemplateSettings(data.settings ?? template.settingsJson ?? null),
        mailTemplatesJson: (data.mailTemplates ?? template.mailTemplatesJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });

    // Delete dependent records before parent nodes (FK order matters)
    await tx.filingWorkflowEdge.deleteMany({ where: { versionId } });
    await tx.filingChecklistItem.deleteMany({ where: { node: { versionId } } });
    await tx.filingPhotoRequirement.deleteMany({ where: { node: { versionId } } });
    await tx.filingWorkflowNode.deleteMany({ where: { versionId } });

    if (normalizedNodes.length > 0) {
      // Batch create all nodes in one round trip instead of N sequential creates
      await tx.filingWorkflowNode.createMany({
        data: normalizedNodes.map((n: any) => ({
          versionId,
          key: n.key,
          name: n.name,
          description: n.description,
          category: n.category,
          nodeType: n.nodeType,
          fieldDefinitionsJson: n.fieldDefinitionsJson ?? [],
          documentRequirementsJson: n.documentRequirementsJson ?? [],
          conditionalSectionsJson: n.conditionalSectionsJson ?? [],
          approvalConfigJson: n.approvalConfigJson ?? null,
          notificationConfigJson: n.notificationConfigJson ?? null,
          actionConfigJson: n.actionConfigJson ?? null,
          sectionKey: n.sectionKey,
          sectionName: n.sectionName,
          branchKey: n.branchKey,
          branchName: n.branchName,
          sortOrder: n.sortOrder,
          isActive: n.isActive !== false,
          positionX: n.positionX || 0,
          positionY: n.positionY || 0,
          isStart: !!n.isStart,
          slaDuration: n.slaDuration !== undefined ? n.slaDuration : 2,
          slaUnit: n.slaUnit || "BUSINESS_DAYS",
          commentsRequired: !!n.commentsRequired,
          canBeSkipped: !!n.canBeSkipped,
          canBeRevisited: n.canBeRevisited !== undefined ? !!n.canBeRevisited : true,
          approvalRequired: !!n.approvalRequired,
          approvalRoles: n.approvalRoles || [],
          requireAllMandatoryChecklistItems: n.requireAllMandatoryChecklistItems !== undefined ? !!n.requireAllMandatoryChecklistItems : true,
          requireMandatoryPhotos: n.requireMandatoryPhotos !== undefined ? !!n.requireMandatoryPhotos : true,
          allowedRoles: n.allowedRoles || ["Admin", "Manager", "Employee"],
        })),
      });

      // Look up created node IDs by key in one query
      const createdNodes = await tx.filingWorkflowNode.findMany({
        where: { versionId },
        select: { id: true, key: true },
      });
      const nodeKeyToId = new Map(createdNodes.map((n) => [n.key, n.id]));

      // Batch create all checklist items across all nodes
      const allChecklistItems = normalizedNodes.flatMap((n: any) =>
        (n.checklistItems || []).map((item: any, idx: number) => ({
          nodeId: nodeKeyToId.get(n.key)!,
          label: item.label,
          description: item.description,
          isMandatory: item.isMandatory !== undefined ? !!item.isMandatory : true,
          requiresRemarks: !!item.requiresRemarks,
          allowsUpload: !!item.allowsUpload,
          minUploads: item.minUploads !== undefined ? item.minUploads : 0,
          maxUploads: item.maxUploads !== undefined ? item.maxUploads : null,
          acceptedFileTypes: item.acceptedFileTypes || [],
          documentType: item.documentType || null,
          requiresValidity: !!item.requiresValidity,
          validityDuration: item.validityDuration !== undefined ? item.validityDuration : null,
          validityUnit: item.validityUnit || null,
          warningBeforeDuration: item.warningBeforeDuration !== undefined ? item.warningBeforeDuration : null,
          warningBeforeUnit: item.warningBeforeUnit || null,
          notifyBeforeExpiry: !!item.notifyBeforeExpiry,
          notificationRoles: item.notificationRoles || [],
          showInDocumentsPage: item.showInDocumentsPage !== undefined ? !!item.showInDocumentsPage : true,
          showInTimeline: item.showInTimeline !== undefined ? !!item.showInTimeline : true,
          deadlineDuration: item.deadlineDuration !== undefined ? item.deadlineDuration : 2,
          deadlineUnit: item.deadlineUnit || "BUSINESS_DAYS",
          delayRemarksRequired: item.delayRemarksRequired !== undefined ? !!item.delayRemarksRequired : true,
          hasPhotoRequirement: !!item.hasPhotoRequirement,
          sortOrder: item.sortOrder !== undefined ? item.sortOrder : idx,
          isActive: item.isActive !== undefined ? !!item.isActive : true,
        }))
      );
      if (allChecklistItems.length > 0) {
        await tx.filingChecklistItem.createMany({ data: allChecklistItems });
      }

      // Batch create all photo requirements across all nodes
      const allPhotoRequirements = normalizedNodes.flatMap((n: any) =>
        (n.photoRequirements || []).map((pr: any) => ({
          nodeId: nodeKeyToId.get(n.key)!,
          label: pr.label,
          description: pr.description,
          isMandatory: pr.isMandatory !== undefined ? !!pr.isMandatory : true,
          minPhotos: pr.minPhotos !== undefined ? pr.minPhotos : 1,
          maxPhotos: pr.maxPhotos !== undefined ? pr.maxPhotos : null,
          acceptedFileTypes: pr.acceptedFileTypes || ["image/jpeg", "image/png", "application/pdf"],
          isVisibleInTimeline: pr.isVisibleInTimeline !== undefined ? !!pr.isVisibleInTimeline : true,
          documentType: pr.documentType || null,
          requiresValidity: !!pr.requiresValidity,
          validityDuration: pr.validityDuration !== undefined ? pr.validityDuration : null,
          validityUnit: pr.validityUnit || null,
          warningBeforeDuration: pr.warningBeforeDuration !== undefined ? pr.warningBeforeDuration : null,
          warningBeforeUnit: pr.warningBeforeUnit || null,
          notifyBeforeExpiry: !!pr.notifyBeforeExpiry,
          notificationRoles: pr.notificationRoles || [],
          showInDocumentsPage: pr.showInDocumentsPage !== undefined ? !!pr.showInDocumentsPage : true,
        }))
      );
      if (allPhotoRequirements.length > 0) {
        await tx.filingPhotoRequirement.createMany({ data: allPhotoRequirements });
      }
    }

    if (normalizedEdges.length) {
      await tx.filingWorkflowEdge.createMany({
        data: normalizedEdges.map((e: any) => ({
          versionId,
          sourceKey: e.sourceKey,
          targetKey: e.targetKey,
          label: e.label || null,
          transitionType: e.transitionType || "FORWARD",
          requiresReason: !!e.requiresReason,
          transitionConfigJson: e.transitionConfigJson ?? null,
        })),
      });
    }
  }, { timeout: 20000 });

  await logChaAudit({
    orgId,
    entityType: "FilingWorkflowTemplate",
    entityId: template.id,
    event: "FILING_WORKFLOW_DRAFT_SAVED",
    actorId: userId,
    remarks: `Saved draft version ${draftVersion.versionNumber} for template ${template.name}`,
  });

  // Return full detail so caller doesn't need a separate getFilingWorkflowDetails round trip
  return db.filingWorkflowTemplate.findFirstOrThrow({
    where: { id: template.id, orgId },
    include: {
      clearanceType: { select: { id: true, name: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          nodes: {
            orderBy: { sortOrder: "asc" },
            include: {
              checklistItems: { orderBy: { sortOrder: "asc" } },
              photoRequirements: true,
            },
          },
          edges: true,
        },
      },
    },
  });
}

export async function publishFilingWorkflow(userId: string, orgId: string, versionId: string) {
  const version = await db.filingWorkflowVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: {
      template: true,
      nodes: {
        include: {
          checklistItems: true,
          photoRequirements: true,
        },
      },
      edges: true,
    },
  });

  if (version.template.orgId !== orgId) {
    throw new Error("Access Denied: Template belongs to another organisation.");
  }

  if (version.isPublished) {
    throw new Error("This version is already published.");
  }

  const validation = validateFilingWorkflowDraft({
    nodes: version.nodes.map((node) => ({
      ...node,
      checklistItems: node.checklistItems,
    })),
    edges: version.edges,
  });

  if (validation.errors.length > 0) {
    throw new Error(`Validation Failed: ${validation.errors.join(" ")}`);
  }

  const result = await db.$transaction(async (tx) => {
    await tx.filingWorkflowTemplate.updateMany({
      where: {
        orgId,
        clearanceTypeId: version.template.clearanceTypeId,
        id: { not: version.templateId },
      },
      data: { isActive: false },
    });

    await tx.filingWorkflowTemplate.update({
      where: { id: version.templateId },
      data: { isActive: true },
    });

    await tx.filingWorkflowVersion.updateMany({
      where: { templateId: version.templateId, isActive: true },
      data: { isActive: false },
    });

    return tx.filingWorkflowVersion.update({
      where: { id: versionId },
      data: {
        isPublished: true,
        isActive: true,
      },
    });
  });

  await logChaAudit({
    orgId,
    entityType: "FilingWorkflowVersion",
    entityId: versionId,
    event: "FILING_WORKFLOW_PUBLISHED",
    actorId: userId,
    remarks: `Published version ${version.versionNumber} for template ${version.template.name}`,
  });

  return result;
}

async function findActivePublishedFilingWorkflowVersionForJob(orgId: string, jobTypeId: string | null) {
  const include = {
    template: {
      include: {
        clearanceType: {
          select: { id: true, name: true, filingFlowCategory: true },
        },
      },
    },
    nodes: {
      include: {
        checklistItems: true,
        photoRequirements: true,
      },
    },
    edges: true,
  } as const;

  // Step 1: if job has a clearance type, resolve its filingFlowCategory
  let filingFlowCategory: string | null = null;
  if (jobTypeId) {
    const jobType = await db.chaJobType.findUnique({
      where: { id: jobTypeId },
      select: { filingFlowCategory: true },
    });
    filingFlowCategory = jobType?.filingFlowCategory ?? null;
  }

  // Step 2: find template by filingFlowCategory (highest priority)
  if (filingFlowCategory) {
    const categoryVersion = await db.filingWorkflowVersion.findFirst({
      where: {
        isActive: true,
        isPublished: true,
        template: {
          orgId,
          isActive: true,
          filingFlowCategory,
          clearanceTypeId: null,
        },
      },
      include,
      orderBy: [{ versionNumber: "desc" }, { updatedAt: "desc" }],
    });
    if (categoryVersion) {
      return categoryVersion;
    }
  }

  // Step 3: find template scoped to this specific clearance type
  if (jobTypeId) {
    const scopedVersion = await db.filingWorkflowVersion.findFirst({
      where: {
        isActive: true,
        isPublished: true,
        template: {
          orgId,
          isActive: true,
          clearanceTypeId: jobTypeId,
        },
      },
      include,
      orderBy: [{ versionNumber: "desc" }, { updatedAt: "desc" }],
    });
    if (scopedVersion) {
      return scopedVersion;
    }
  }

  // Step 4: fall back to the generic catch-all template (no category, no clearance type)
  return db.filingWorkflowVersion.findFirst({
    where: {
      isActive: true,
      isPublished: true,
      template: {
        orgId,
        isActive: true,
        clearanceTypeId: null,
        filingFlowCategory: null,
      },
    },
    include,
    orderBy: [{ versionNumber: "desc" }, { updatedAt: "desc" }],
  });
}

function hasMaterialFilingWorkflowProgress(instance: {
  status: string;
  nodeRuns: Array<{ status: string }>;
  responses: Array<{
    isChecked: boolean;
    remarks?: string | null;
    fileKey?: string | null;
    delayRemarks?: string | null;
    completedAt?: Date | null;
  }>;
  attachments: Array<unknown>;
}) {
  if (instance.status !== "ACTIVE") {
    return true;
  }

  if (instance.nodeRuns.some((run) => run.status === "COMPLETED")) {
    return true;
  }

  if (instance.attachments.length > 0) {
    return true;
  }

  return instance.responses.some((response) =>
    response.isChecked ||
    Boolean(response.completedAt) ||
    Boolean(response.fileKey) ||
    Boolean(response.remarks?.trim()) ||
    Boolean(response.delayRemarks?.trim()),
  );
}

const FILING_WORKFLOW_INSTANCE_INCLUDE = {
  template: true,
  version: {
    include: {
      nodes: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          checklistItems: { orderBy: { sortOrder: "asc" as const } },
          photoRequirements: true,
        },
      },
      edges: true,
    },
  },
  nodeRuns: {
    orderBy: { startedAt: "desc" as const },
    include: {
      node: {
        include: {
          checklistItems: { orderBy: { sortOrder: "asc" as const } },
          photoRequirements: true,
        },
      },
      completedBy: { select: { name: true } },
      attachments: { include: { uploadedBy: { select: { name: true } }, checklistItem: true } },
      fieldValues: true,
      toggleStates: true,
      queries: true,
    },
  },
  responses: {
    include: { checklistItem: true },
  },
  attachments: {
    include: { photoRequirement: true, checklistItem: true, uploadedBy: { select: { name: true } } },
  },
  fieldValues: true,
  toggleStates: true,
  queries: true,
} as const;

async function refreshFilingWorkflowInstanceToLatestVersion(
  orgId: string,
  jobId: string,
  instance: Prisma.FilingWorkflowInstanceGetPayload<{ include: typeof FILING_WORKFLOW_INSTANCE_INCLUDE }>,
  latestVersion: NonNullable<Awaited<ReturnType<typeof findActivePublishedFilingWorkflowVersionForJob>>>,
) {
  if (instance.versionId === latestVersion.id) {
    return instance;
  }

  if (hasMaterialFilingWorkflowProgress(instance)) {
    return instance;
  }

  const startNode = latestVersion.nodes.find((node) => node.isStart && node.isActive);
  if (!startNode) {
    return instance;
  }

  await db.$transaction(async (tx) => {
    await tx.filingAttachment.deleteMany({ where: { instanceId: instance.id } });
    await tx.filingChecklistResponse.deleteMany({ where: { instanceId: instance.id } });
    await tx.filingNodeRun.deleteMany({ where: { instanceId: instance.id } });

    await tx.filingWorkflowInstance.update({
      where: { id: instance.id },
      data: {
        templateId: latestVersion.templateId,
        versionId: latestVersion.id,
        currentNodeKey: startNode.key,
        status: "ACTIVE",
      },
    });

    const restartedAt = await getNow();
    const slaDueDate = await calculateSlaDueDate(restartedAt, startNode.slaDuration, startNode.slaUnit, orgId);
    const nodeRun = await createFilingNodeRunWithResponses(tx, {
      instanceId: instance.id,
      node: startNode,
      startedAt: restartedAt,
      orgId,
    });
    await tx.filingNodeRun.update({
      where: { id: nodeRun.id },
      data: { slaDueDate },
    });

    await tx.chaAuditLog.create({
      data: {
        orgId,
        jobId,
        entityType: "FilingWorkflowInstance",
        entityId: instance.id,
        event: "FILING_WORKFLOW_TEMPLATE_REFRESHED",
        actorId: "system",
        prevState: instance.versionId,
        newState: latestVersion.id,
        remarks: `Workflow instance refreshed to latest published template: ${latestVersion.template.name}.`,
      },
    });
  });

  return db.filingWorkflowInstance.findUniqueOrThrow({
    where: { jobId },
    include: FILING_WORKFLOW_INSTANCE_INCLUDE,
  });
}

export async function getFilingWorkflowInstance(orgId: string, jobId: string): Promise<any> {
  await resolveNotificationWorkflowNodes(orgId, jobId);

  // Fetch instance, now, and holiday set in parallel — single DB round trip
  const [instance, now, holidayIsoSet] = await Promise.all([
    db.filingWorkflowInstance.findUnique({
      where: { jobId },
      include: FILING_WORKFLOW_INSTANCE_INCLUDE,
    }),
    getNow(),
    getHolidayIsoSet(orgId),
  ]);

  if (!instance) {
    const job = await db.chaJob.findFirst({
      where: { id: jobId, orgId, deletedAt: null },
      select: {
        stage: true,
        primaryOwnerId: true,
      },
    });

    if (job?.stage === "FILING") {
      return startFilingWorkflow(job.primaryOwnerId, orgId, jobId);
    }

    return null;
  }

  const job = await db.chaJob.findFirst({
    where: { id: jobId, orgId, deletedAt: null },
    select: { jobTypeId: true },
  });

  let resolvedInstance = instance;
  if (job) {
    const latestVersion = await findActivePublishedFilingWorkflowVersionForJob(orgId, job.jobTypeId);
    if (latestVersion) {
      resolvedInstance = await refreshFilingWorkflowInstanceToLatestVersion(orgId, jobId, instance, latestVersion);
    }
  }

  // Fire-and-forget: mark overdue items without blocking the response
  syncOverdueFilingItems(orgId, jobId).catch(() => {});
  syncFilingWorkflowQueryReminders(orgId, jobId).catch(() => {});

  const activeNodeRun = resolvedInstance.nodeRuns.find((run) => run.status === "ACTIVE") ?? null;
  const overdueItems = resolvedInstance.responses
    .filter((response) => response.nodeRunId === activeNodeRun?.id && !response.isChecked && response.dueAt && response.dueAt.getTime() < now.getTime())
    .map((response) => ({
      checklistItemId: response.checklistItemId,
      label: response.checklistItem.label,
      dueAt: response.dueAt,
      daysDelayed: Math.max(1, countBusinessDaysSince(response.dueAt!, now, holidayIsoSet)),
      delayRemarks: response.delayRemarks,
      delayRemarkedAt: response.delayRemarkedAt,
    }));

  const queryIds = resolvedInstance.queries.map((query) => query.id);
  const queryLogs = queryIds.length
    ? await db.chaAuditLog.findMany({
        where: {
          jobId,
          entityType: "FilingWorkflowQuery",
          entityId: { in: queryIds },
          event: { in: [...FILING_QUERY_ACTIVITY_EVENTS] },
        },
        orderBy: { timestamp: "asc" },
      })
    : [];

  const actorIds = queryLogs
    .map((log) => log.actorId)
    .filter((actorId, index, array) => actorId && array.indexOf(actorId) === index);
  const resolvedActors =
    actorIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        })
      : [];
  const queryActorMap = new Map(resolvedActors.map((actor) => [actor.id, actor.name || "System"]));
  const queryMessages = queryLogs.map((log) => {
    const metadata = parseAuditMetadata(log.metadata);
    return {
      id: log.id,
      queryId: log.entityId,
      event: log.event,
      actorId: log.actorId,
      actorName: queryActorMap.get(log.actorId) || "System",
      remarks: log.remarks,
      body:
        (typeof metadata?.message === "string" && metadata.message.trim()) ||
        (typeof metadata?.details === "string" && metadata.details.trim()) ||
        null,
      status: log.newState || null,
      createdAt: log.timestamp,
    };
  });

  return {
    ...resolvedInstance,
    activeNodeRun,
    overdueItems,
    overdueCount: overdueItems.length,
    queryMessages,
  };
}

export async function startFilingWorkflow(userId: string, orgId: string, jobId: string): Promise<any> {
  let instance = await db.filingWorkflowInstance.findUnique({
    where: { jobId },
  });

  if (instance) {
    return getFilingWorkflowInstance(orgId, jobId);
  }

  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId, deletedAt: null },
    select: { jobTypeId: true },
  });

  let activeVersion = await findActivePublishedFilingWorkflowVersionForJob(orgId, job.jobTypeId);

  if (!activeVersion) {
    await ensureDefaultFilingWorkflows(orgId);
    activeVersion = await findActivePublishedFilingWorkflowVersionForJob(orgId, job.jobTypeId);
  }

  if (!activeVersion) {
    throw new Error("No active published filing workflow template found for this organisation.");
  }

  const startNode = activeVersion.nodes.find((n) => n.isStart && n.isActive);
  if (!startNode) {
    throw new Error("Filing workflow template does not have a start node.");
  }

  instance = await db.$transaction(async (tx) => {
    const inst = await tx.filingWorkflowInstance.create({
      data: {
        jobId,
        templateId: activeVersion.templateId,
        versionId: activeVersion.id,
        currentNodeKey: startNode.key,
        status: "ACTIVE",
      },
    });

    const startedAt = await getNow();
    const slaDueDate = await calculateSlaDueDate(startedAt, startNode.slaDuration, startNode.slaUnit, orgId);
    const nodeRun = await createFilingNodeRunWithResponses(tx, {
      instanceId: inst.id,
      node: startNode,
      startedAt,
      orgId,
    });
    await tx.filingNodeRun.update({
      where: { id: nodeRun.id },
      data: { slaDueDate },
    });

    return inst;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingWorkflowInstance",
    entityId: instance.id,
    event: "FILING_WORKFLOW_STARTED",
    actorId: userId,
    remarks: `Filing workflow started for job using template: ${activeVersion.template.name}`,
  });

  return getFilingWorkflowInstance(orgId, jobId);
}

export async function completeFilingNode(
  userId: string,
  orgId: string,
  jobId: string,
  nodeRunId: string,
  data: {
    remarks?: string;
    transitionReason?: string;
    checklistItemResponses: {
      checklistItemId: string;
      isChecked: boolean;
      remarks?: string;
      fileKey?: string;
      delayRemarks?: string;
    }[];
    fieldValues?: Array<{
      fieldKey: string;
      value: unknown;
    }>;
    toggleStates?: Array<{
      sectionKey: string;
      isEnabled: boolean;
      state?: Record<string, unknown> | null;
    }>;
    nextNodeKey?: string | null;
  }
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId },
    select: {
      id: true,
      primaryOwnerId: true,
      assignedManagerId: true,
      jobType: {
        select: {
          movementDirection: true,
        },
      },
      assignments: {
        select: {
          userId: true,
        },
      },
    },
  });

  await assertCanAccessFiling(userId, job);

  const result = await db.$transaction(async (tx) => {
    const nodeRun = await tx.filingNodeRun.findUniqueOrThrow({
      where: { id: nodeRunId },
      include: {
        node: {
          include: {
            checklistItems: true,
            photoRequirements: true,
          },
        },
        instance: {
          include: {
            version: {
              include: {
                edges: true,
                nodes: true,
              },
            },
          },
        },
      },
    });

    const node = nodeRun.node;
    const instance = nodeRun.instance;
    const now = await getNow();
    const startedAt = nodeRun.startedAt ?? now;

    if (nodeRun.status !== "ACTIVE") {
      throw new Error("This node execution has already been finalized.");
    }

    if (node.allowedRoles && node.allowedRoles.length > 0) {
      const userRoles = await tx.userRole.findMany({
        where: { userId },
        include: { role: true },
      });
      const roleNames = userRoles.map((ur) => ur.role.name);
      const isAllowed = roleNames.some((r) => node.allowedRoles.includes(r));
      const userObj = await tx.user.findUnique({ where: { id: userId } });
      if (!isAllowed && !userObj?.isPlatformAdmin) {
        throw new Error(`Forbidden: Only users with roles (${node.allowedRoles.join(", ")}) can perform this check.`);
      }
    }

    if (node.commentsRequired && (!data.remarks || !data.remarks.trim())) {
      throw new Error(`Remarks/Comments are required to complete stage: ${node.name}.`);
    }

    const fieldDefinitions = normalizeFieldDefinitions(node.fieldDefinitionsJson);
    const conditionalSections = normalizeConditionalSections(node.conditionalSectionsJson);
    const documentRequirements = normalizeDocumentRequirements(node.documentRequirementsJson);
    const fieldValueMap = new Map((data.fieldValues ?? []).map((entry) => [entry.fieldKey, entry.value]));
    const toggleStateMap = new Map((data.toggleStates ?? []).map((entry) => [entry.sectionKey, entry]));
    const persistedToggleStates = await tx.filingToggleState.findMany({
      where: { instanceId: instance.id, nodeId: node.id },
    });
    const effectiveToggleState = (sectionKey: string) => {
      if (toggleStateMap.has(sectionKey)) {
        return toggleStateMap.get(sectionKey)!;
      }
      const existing = persistedToggleStates.find((entry) => entry.sectionKey === sectionKey);
      return existing
        ? { sectionKey, isEnabled: existing.isEnabled, state: (existing.stateJson as Record<string, unknown> | null) ?? null }
        : { sectionKey, isEnabled: false, state: null };
    };

    for (const field of fieldDefinitions) {
      const value = fieldValueMap.get(field.key);
      const hasValue = value !== undefined && value !== null && String(value).trim().length > 0;
      if (field.required !== false && !hasValue) {
        throw new Error(`Field "${field.label}" is required for stage "${node.name}".`);
      }
    }

    for (const section of conditionalSections) {
      const sectionState = effectiveToggleState(section.key);
      if (!sectionState.isEnabled) {
        continue;
      }
      for (const field of section.unlocksFields ?? []) {
        const value = fieldValueMap.get(field.key);
        const hasValue = value !== undefined && value !== null && String(value).trim().length > 0;
        if (field.required !== false && !hasValue) {
          throw new Error(`Field "${field.label}" is required when "${section.label}" is enabled.`);
        }
      }
    }

    const responsesMap = new Map(data.checklistItemResponses.map((r) => [r.checklistItemId, r]));
    const existingResponses = await tx.filingChecklistResponse.findMany({
      where: {
        instanceId: instance.id,
        nodeRunId: nodeRun.id,
      },
    });
    const existingResponsesMap = new Map(existingResponses.map((response) => [response.checklistItemId, response]));
    const activeChecklistItems = node.checklistItems.filter((item) => item.isActive !== false);

    for (const item of activeChecklistItems) {
      const res = responsesMap.get(item.id);
      if (node.requireAllMandatoryChecklistItems && item.isMandatory) {
        if (!res || !res.isChecked) {
          throw new Error(`Mandatory checklist item "${item.label}" must be completed.`);
        }
      }
      if (item.requiresRemarks && res?.isChecked && (!res.remarks || !res.remarks.trim())) {
        throw new Error(`Remarks are required for checklist item "${item.label}".`);
      }
      const dueAt =
        existingResponsesMap.get(item.id)?.dueAt ??
        await calculateSlaDueDate(startedAt, item.deadlineDuration || 2, item.deadlineUnit || "BUSINESS_DAYS", orgId);
      if (
        res?.isChecked &&
        item.delayRemarksRequired &&
        dueAt.getTime() < now.getTime() &&
        (!res.delayRemarks || !res.delayRemarks.trim())
      ) {
        throw new Error(`Delay remarks are required for overdue checklist item "${item.label}".`);
      }
    }

    const attachments = await tx.filingAttachment.findMany({
      where: { instanceId: instance.id, nodeRunId: nodeRun.id },
    });

    for (const requirement of documentRequirements) {
      const uploads = attachments.filter((attachment) => attachment.documentRequirementKey === requirement.key);
      if (requirement.required !== false && uploads.length === 0) {
        throw new Error(`Document "${requirement.label}" is required before completing "${node.name}".`);
      }
    }

    for (const section of conditionalSections) {
      const sectionState = effectiveToggleState(section.key);
      if (!sectionState.isEnabled) {
        continue;
      }
      for (const requirement of section.unlocksDocuments ?? []) {
        const uploads = attachments.filter((attachment) => attachment.documentRequirementKey === requirement.key);
        if (requirement.required !== false && uploads.length === 0) {
          throw new Error(`Document "${requirement.label}" is required when "${section.label}" is enabled.`);
        }
      }
    }

    for (const item of activeChecklistItems) {
      const itemUploads = attachments.filter((attachment) => attachment.checklistItemId === item.id);
      if (item.allowsUpload) {
        if (item.minUploads > 0 && itemUploads.length < item.minUploads) {
          throw new Error(`Checklist item "${item.label}" requires at least ${item.minUploads} upload(s).`);
        }
        if (item.maxUploads !== null && item.maxUploads !== undefined && itemUploads.length > item.maxUploads) {
          throw new Error(`Checklist item "${item.label}" exceeds the maximum allowed uploads.`);
        }
      }
    }

    for (const res of data.checklistItemResponses) {
      const existing = existingResponsesMap.get(res.checklistItemId);
      const dueAt =
        existing?.dueAt ??
        await calculateSlaDueDate(
          startedAt,
          node.checklistItems.find((item) => item.id === res.checklistItemId)?.deadlineDuration || 2,
          node.checklistItems.find((item) => item.id === res.checklistItemId)?.deadlineUnit || "BUSINESS_DAYS",
          orgId,
        );
      await tx.filingChecklistResponse.upsert({
        where: {
          instanceId_checklistItemId: {
            instanceId: instance.id,
            checklistItemId: res.checklistItemId,
          },
        },
        create: {
          instanceId: instance.id,
          nodeRunId: nodeRun.id,
          checklistItemId: res.checklistItemId,
          isChecked: res.isChecked,
          remarks: res.remarks,
          fileKey: res.fileKey,
          dueAt,
          completedAt: res.isChecked ? now : null,
          delayRemarks: res.delayRemarks,
          delayRemarkedAt: res.delayRemarks?.trim() ? now : null,
        },
        update: {
          nodeRunId: nodeRun.id,
          isChecked: res.isChecked,
          remarks: res.remarks,
          fileKey: res.fileKey,
          dueAt,
          completedAt: res.isChecked ? now : null,
          delayRemarks: res.delayRemarks,
          delayRemarkedAt: res.delayRemarks?.trim() ? now : null,
        },
      });

      const item = node.checklistItems.find((checklistItem) => checklistItem.id === res.checklistItemId);
      if (item && res.isChecked) {
        const isOverdue = dueAt.getTime() < now.getTime();
        await logChaAudit({
          orgId,
          jobId,
          entityType: "FilingChecklistResponse",
          entityId: `${instance.id}:${res.checklistItemId}`,
          event: isOverdue ? "FILING_CHECKLIST_ITEM_COMPLETED_OVERDUE" : "FILING_CHECKLIST_ITEM_COMPLETED",
          actorId: userId,
          remarks: `Checklist item "${item.label}" completed in node "${node.name}".`,
          metadata: {
            node: node.name,
            dueAt,
            completedAt: now,
            delayRemarks: res.delayRemarks ?? null,
          },
        });
      }
    }

    for (const field of fieldDefinitions) {
      const value = fieldValueMap.get(field.key);
      await tx.filingFieldValue.upsert({
        where: {
          instanceId_nodeId_fieldKey: {
            instanceId: instance.id,
            nodeId: node.id,
            fieldKey: field.key,
          },
        },
        create: {
          instanceId: instance.id,
          nodeRunId: nodeRun.id,
          nodeId: node.id,
          fieldKey: field.key,
          valueJson: value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue),
          updatedById: userId,
        },
        update: {
          nodeRunId: nodeRun.id,
          valueJson: value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue),
          updatedById: userId,
        },
      });
    }

    for (const section of conditionalSections) {
      const sectionState = effectiveToggleState(section.key);
      await tx.filingToggleState.upsert({
        where: {
          instanceId_nodeId_sectionKey: {
            instanceId: instance.id,
            nodeId: node.id,
            sectionKey: section.key,
          },
        },
        create: {
          instanceId: instance.id,
          nodeRunId: nodeRun.id,
          nodeId: node.id,
          sectionKey: section.key,
          isEnabled: !!sectionState.isEnabled,
          stateJson: (sectionState.state ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          updatedById: userId,
        },
        update: {
          nodeRunId: nodeRun.id,
          isEnabled: !!sectionState.isEnabled,
          stateJson: (sectionState.state ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          updatedById: userId,
        },
      });
    }

    if (node.requireMandatoryPhotos) {
      for (const pr of node.photoRequirements) {
        if (pr.isMandatory) {
          const prCount = attachments.filter((a) => a.photoRequirementId === pr.id).length;
          if (prCount < pr.minPhotos) {
            throw new Error(`Mandatory photo upload "${pr.label}" requires at least ${pr.minPhotos} image(s). Uploaded ${prCount}.`);
          }
        }
      }
    }

    await tx.filingNodeRun.update({
      where: { id: nodeRunId },
      data: {
        status: "COMPLETED",
        completedAt: now,
        completedById: userId,
        remarks: data.remarks,
        resolutionJson: {
          transitionReason: data.transitionReason ?? null,
          fieldValues: data.fieldValues ?? [],
          toggleStates: data.toggleStates ?? [],
        } as Prisma.InputJsonValue,
      },
    });

    const completedResponses = data.checklistItemResponses.filter((response) => response.isChecked);
    if (node.canBeSkipped && completedResponses.length === 0) {
      await logChaAudit({
        orgId,
        jobId,
        entityType: "FilingNodeRun",
        entityId: nodeRunId,
        event: "FILING_OPTIONAL_NODE_SKIPPED",
        actorId: userId,
        remarks: `Optional node "${node.name}" was skipped.`,
      });
    }

    const nextNodeKey = data.nextNodeKey;

    if (nextNodeKey) {
      const allowedEdges = instance.version.edges.filter(
        (e) => e.sourceKey === node.key && e.targetKey === nextNodeKey
      );
      if (allowedEdges.length === 0) {
        throw new Error(`Invalid Transition: No edge exists between "${node.name}" and node key "${nextNodeKey}".`);
      }
      const selectedEdge = allowedEdges[0];
      const requiresReason = selectedEdge.requiresReason || selectedEdge.transitionType === "BACKWARD";
      if (requiresReason && (!data.transitionReason || !data.transitionReason.trim())) {
        throw new Error(`A reason is required before moving from "${node.name}" to the selected previous stage.`);
      }

      const pastRuns = await tx.filingNodeRun.findMany({
        where: { instanceId: instance.id, nodeKey: nextNodeKey, status: "COMPLETED" },
      });
      const isDoubleBack = pastRuns.length > 0;

      const targetNode = instance.version.nodes.find((n) => n.key === nextNodeKey && n.isActive)!;
      const nextStartedAt = await getNow();
      const nextSlaDueDate = await calculateSlaDueDate(nextStartedAt, targetNode.slaDuration, targetNode.slaUnit, orgId);
      const nextNodeRun = await createFilingNodeRunWithResponses(tx, {
        instanceId: instance.id,
        node: {
          ...targetNode,
          checklistItems: await tx.filingChecklistItem.findMany({
            where: { nodeId: targetNode.id },
          }),
        },
        startedAt: nextStartedAt,
        orgId,
      });
      await tx.filingNodeRun.update({
        where: { id: nextNodeRun.id },
        data: { slaDueDate: nextSlaDueDate },
      });

      await tx.filingWorkflowInstance.update({
        where: { id: instance.id },
        data: { currentNodeKey: nextNodeKey },
      });

      await tx.chaAuditLog.create({
        data: {
          orgId,
          jobId,
          entityType: "FilingWorkflowInstance",
          entityId: instance.id,
          event: isDoubleBack ? "FILING_DOUBLE_BACK_TRANSITION" : "FILING_TRANSITION",
          actorId: userId,
          prevState: node.key,
          newState: nextNodeKey,
          remarks: `Transition from "${node.name}" to "${targetNode.name}". ${isDoubleBack ? "Double-back run." : ""}${data.transitionReason ? ` Reason: ${data.transitionReason}` : ""}`,
        },
      });

      if (node.nodeType === "DECISION") {
        await logChaAudit({
          orgId,
          jobId,
          entityType: "FilingNodeRun",
          entityId: nodeRunId,
          event: "FILING_DECISION_RECORDED",
          actorId: userId,
          prevState: node.key,
          newState: nextNodeKey,
          remarks: `Decision node "${node.name}" routed the workflow to "${targetNode.name}".`,
        });
      }

    } else {
      const pastRuns = await tx.filingNodeRun.findMany({
        where: { instanceId: instance.id, status: "COMPLETED" },
      });
      const completedNodeKeys = new Set(pastRuns.map((r) => r.nodeKey));

      const outEdges = instance.version.edges.filter((e) => e.sourceKey === node.key);
      const forwardOutEdges = outEdges.filter((e) => !completedNodeKeys.has(e.targetKey));

      if (forwardOutEdges.length > 0) {
        throw new Error(`Select the next stage. Connected transitions are available.`);
      }

      await tx.filingWorkflowInstance.update({
        where: { id: instance.id },
        data: { status: "COMPLETED", currentNodeKey: null },
      });

      await tx.chaJob.update({
        where: { id: jobId },
        data: { stage: "FILED" },
      });

      const existingFiling = await tx.chaFiling.findUnique({ where: { jobId } });
      if (existingFiling) {
        await tx.chaFiling.update({
          where: { id: existingFiling.id },
          data: { status: "FILED", actualFilingDate: new Date(), filingRef: `BLUEPRINT-${instance.id.substring(0, 8).toUpperCase()}` },
        });
      }

      await tx.chaAuditLog.create({
        data: {
          orgId,
          jobId,
          entityType: "FilingWorkflowInstance",
          entityId: instance.id,
          event: "FILING_WORKFLOW_COMPLETED",
          actorId: userId,
          prevState: node.key,
          newState: "FILED",
          remarks: `Completed all checklist nodes. Workflow is successfully finished.`,
        },
      });
    }

    return true;
  });

  await getFilingWorkflowInstance(orgId, jobId);
  return result;
}

/**
 * Move the filing workflow back to the previously completed stage.
 *
 * Available on every filing stage (filing tab only) — it does not require a
 * BACKWARD edge in the template. A non-empty reason is mandatory and the move
 * is registered in the job audit tab (FILING_STAGE_REVERTED).
 */
export async function revertFilingWorkflowToPreviousStage(
  userId: string,
  orgId: string,
  jobId: string,
  nodeRunId: string,
  reason: string,
) {
  if (!reason || !reason.trim()) {
    throw new Error("A reason is required to move back to the previous filing stage.");
  }
  const trimmedReason = reason.trim();

  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId },
    select: {
      id: true,
      jobNumber: true,
      primaryOwnerId: true,
      assignedManagerId: true,
      assignments: { select: { userId: true } },
    },
  });
  await assertCanAccessFiling(userId, job);

  const result = await db.$transaction(async (tx) => {
    const nodeRun = await tx.filingNodeRun.findUniqueOrThrow({
      where: { id: nodeRunId },
      include: {
        node: true,
        instance: {
          include: {
            version: { include: { nodes: { include: { checklistItems: true } } } },
          },
        },
      },
    });

    if (nodeRun.instance.jobId !== jobId) {
      throw new Error("Node run does not belong to this job.");
    }
    if (nodeRun.status !== "ACTIVE") {
      throw new Error("Only the active filing stage can be moved back.");
    }

    const instance = nodeRun.instance;

    // The previous stage = the most recently completed run of a different node.
    const previousRun = await tx.filingNodeRun.findFirst({
      where: {
        instanceId: instance.id,
        status: "COMPLETED",
        nodeKey: { not: nodeRun.nodeKey },
      },
      orderBy: { completedAt: "desc" },
    });
    if (!previousRun) {
      throw new Error("There is no previous filing stage to go back to.");
    }

    const previousNode = instance.version.nodes.find(
      (n) => n.key === previousRun.nodeKey && n.isActive,
    );
    if (!previousNode) {
      throw new Error("The previous filing stage is no longer active in this workflow version.");
    }

    const now = await getNow();

    // Cancel the current run (nothing on it is finalized).
    await tx.filingNodeRun.update({
      where: { id: nodeRun.id },
      data: {
        status: "CANCELLED",
        completedAt: now,
        completedById: userId,
        remarks: `Moved back to previous stage. Reason: ${trimmedReason}`,
      },
    });

    // Reopen the previous stage as a fresh run.
    const reopenedRun = await createFilingNodeRunWithResponses(tx, {
      instanceId: instance.id,
      node: previousNode,
      startedAt: now,
      orgId,
    });
    const slaDueDate = await calculateSlaDueDate(now, previousNode.slaDuration, previousNode.slaUnit, orgId);
    await tx.filingNodeRun.update({
      where: { id: reopenedRun.id },
      data: { slaDueDate },
    });

    await tx.filingWorkflowInstance.update({
      where: { id: instance.id },
      data: { currentNodeKey: previousNode.key },
    });

    // Registered in the audit tab.
    await tx.chaAuditLog.create({
      data: {
        orgId,
        jobId,
        entityType: "FilingWorkflowInstance",
        entityId: instance.id,
        event: "FILING_STAGE_REVERTED",
        actorId: userId,
        prevState: nodeRun.nodeKey,
        newState: previousNode.key,
        remarks: `Moved back from "${nodeRun.node.name}" to "${previousNode.name}". Reason: ${trimmedReason}`,
      },
    });

    return { reopenedNodeKey: previousNode.key, reopenedNodeName: previousNode.name };
  });

  await getFilingWorkflowInstance(orgId, jobId);
  return result;
}

export async function toggleFilingSection49(
  userId: string,
  orgId: string,
  jobId: string,
  isEnabled: boolean,
  remarks?: string
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId },
    select: {
      id: true,
      primaryOwnerId: true,
      assignedManagerId: true,
      jobType: {
        select: {
          movementDirection: true,
        },
      },
      assignments: {
        select: {
          userId: true,
        },
      },
    },
  });

  await assertCanAccessFiling(userId, job);

  const existingFlag = await db.filingSection49Flag.findUnique({
    where: { jobId },
  });

  const oldValue = existingFlag ? existingFlag.isEnabled : false;

  const result = await db.filingSection49Flag.upsert({
    where: { jobId },
    create: {
      jobId,
      isEnabled,
      validityDate: existingFlag?.validityDate ?? null,
      remarks,
      toggledById: userId,
    },
    update: {
      isEnabled,
      remarks,
      toggledById: userId,
    },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingSection49Flag",
    entityId: result.id,
    event: "FILING_SECTION49_TOGGLED",
    actorId: userId,
    prevState: String(oldValue),
    newState: String(isEnabled),
    remarks: `Section 49 toggled from ${oldValue} to ${isEnabled}. Remarks: ${remarks || "None"}`,
  });

  return result;
}

export async function getFilingSection49(orgId: string, jobId: string) {
  const [flag, extensions] = await Promise.all([
    db.filingSection49Flag.findUnique({
      where: { jobId },
    }),
    db.filingSection49Extension.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { appliedBy: { select: { name: true } } },
    }),
  ]);

  return flag ? { ...flag, extensions } : null;
}

async function findSection49Requirement(tx: Prisma.TransactionClient, jobId: string) {
  return tx.chaJobDocumentRequirement.findFirst({
    where: {
      jobId,
      name: SECTION49_DOCUMENT_NAME,
      category: DO_DOCUMENT_CATEGORY,
    },
  });
}

async function syncSection49CurrentVersionValidity(
  tx: Prisma.TransactionClient,
  jobId: string,
  validityDate: Date | null,
) {
  const requirement = await findSection49Requirement(tx, jobId);
  if (!requirement) {
    return;
  }

  const currentVersion = await tx.chaDocumentVersion.findFirst({
    where: { requirementId: requirement.id, isCurrent: true },
    orderBy: { uploadedAt: "desc" },
  });
  if (currentVersion) {
    await tx.chaDocumentVersion.update({
      where: { id: currentVersion.id },
      data: { validityDate },
    });
  }
}

function isWithinFourDayValidityWindow(validityDate: Date, now: Date) {
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + 4);
  threshold.setHours(23, 59, 59, 999);
  return validityDate.getTime() <= threshold.getTime();
}

export async function updateFilingSection49Validity(
  userId: string,
  orgId: string,
  jobId: string,
  validityDate: Date,
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId },
    select: {
      id: true,
      primaryOwnerId: true,
      assignedManagerId: true,
      assignments: { select: { userId: true } },
    },
  });
  await assertCanAccessFiling(userId, job);

  if (Number.isNaN(validityDate.getTime())) {
    throw new Error("Enter a valid Section 49 validity date.");
  }

  const updated = await db.$transaction(async (tx) => {
    const flag = await tx.filingSection49Flag.upsert({
      where: { jobId },
      create: {
        jobId,
        isEnabled: true,
        validityDate,
        toggledById: userId,
      },
      update: {
        isEnabled: true,
        validityDate,
        toggledById: userId,
      },
    });

    await syncSection49CurrentVersionValidity(tx, jobId, validityDate);
    return flag;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingSection49Flag",
    entityId: updated.id,
    event: "FILING_SECTION49_VALIDITY_UPDATED",
    actorId: userId,
    newState: validityDate.toISOString(),
    remarks: `Section 49 validity date set to ${validityDate.toLocaleDateString("en-IN")}.`,
  });

  return updated;
}

export async function applyFilingSection49Extension(
  userId: string,
  orgId: string,
  jobId: string,
  input: {
    extensionDate: Date;
    fileData: { fileName: string; mimeType: string; sizeBytes: number };
    fileBuffer: Buffer;
  },
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId },
    select: {
      id: true,
      primaryOwnerId: true,
      assignedManagerId: true,
      assignments: { select: { userId: true } },
    },
  });
  await assertCanAccessFiling(userId, job);

  const flag = await db.filingSection49Flag.findUnique({ where: { jobId } });
  if (!flag?.isEnabled) {
    throw new Error("Enable Section 49 before applying an extension.");
  }
  if (!flag.validityDate) {
    throw new Error("Set the current Section 49 validity date before applying an extension.");
  }
  if (Number.isNaN(input.extensionDate.getTime())) {
    throw new Error("Enter a valid Section 49 extension date.");
  }
  if (input.extensionDate.getTime() <= flag.validityDate.getTime()) {
    throw new Error("The Section 49 extension date must be after the current validity date.");
  }

  const now = await getNow();
  if (!isWithinFourDayValidityWindow(flag.validityDate, now)) {
    throw new Error("Section 49 extension is available only when the validity warning window is active.");
  }

  const { fileKey, storedFileName } = await storeDeliveryOrderFile(
    jobId,
    userId,
    input.fileData,
    input.fileBuffer,
    "Section 49 Extension",
  );
  const result = await db.$transaction(async (tx) => {
    let requirement = await findSection49Requirement(tx, jobId);
    if (!requirement) {
      requirement = await tx.chaJobDocumentRequirement.create({
        data: {
          jobId,
          name: SECTION49_DOCUMENT_NAME,
          category: DO_DOCUMENT_CATEGORY,
          isMandatory: false,
          status: "PENDING",
        },
      });
    }

    await tx.chaDocumentVersion.updateMany({
      where: { requirementId: requirement.id, isCurrent: true },
      data: { isCurrent: false },
    });
    await tx.chaDocumentVersion.create({
      data: {
        requirementId: requirement.id,
        fileKey,
        fileName: storedFileName,
        mimeType: input.fileData.mimeType,
        sizeBytes: input.fileData.sizeBytes,
        uploadedById: userId,
        uploadedAt: now,
        isCurrent: true,
        validityDate: input.extensionDate,
        source: "SECTION49_EXTENSION",
        timelineVisible: true,
      },
    });
    await tx.chaJobDocumentRequirement.update({
      where: { id: requirement.id },
      data: { status: "UPLOADED" },
    });
    await tx.chaDocumentException.deleteMany({ where: { requirementId: requirement.id } });

    const extension = await tx.filingSection49Extension.create({
      data: {
        jobId,
        previousValidity: flag.validityDate,
        extensionDate: input.extensionDate,
        fileKey,
        fileName: storedFileName,
        appliedById: userId,
      },
    });

    const updatedFlag = await tx.filingSection49Flag.update({
      where: { id: flag.id },
      data: {
        validityDate: input.extensionDate,
        toggledById: userId,
      },
    });

    await tx.notification.updateMany({
      where: {
        orgId,
        link: `/cha/jobs/${jobId}`,
        kind: { in: SECTION49_VALIDITY_NOTIFICATION_KINDS },
        dismissedAt: null,
      },
      data: { dismissedAt: now, readAt: now },
    });

    return {
      extension,
      updatedFlag,
    };
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingSection49Extension",
    entityId: result.extension.id,
    event: "FILING_SECTION49_EXTENSION_APPLIED",
    actorId: userId,
    prevState: flag.validityDate.toISOString(),
    newState: input.extensionDate.toISOString(),
    remarks: `Section 49 validity extended from ${flag.validityDate.toLocaleDateString("en-IN")} to ${input.extensionDate.toLocaleDateString("en-IN")}. Extension document: ${storedFileName}.`,
    metadata: {
      fileKey,
      fileName: storedFileName,
    },
  });

  return result;
}

function hasReminderTimeElapsed(reminderTime: string, now: Date) {
  const [hourRaw, minuteRaw] = reminderTime.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return true;
  }
  const reminderMoment = new Date(now);
  reminderMoment.setHours(hour, minute, 0, 0);
  return now.getTime() >= reminderMoment.getTime();
}

async function syncFilingWorkflowQueryReminders(orgId: string, jobId: string) {
  const openQueries = await db.filingWorkflowQuery.findMany({
    where: {
      instance: {
        jobId,
        job: {
          orgId,
        },
      },
      status: { in: ["OPEN", "REPLIED"] },
    },
    include: {
      instance: {
        include: {
          job: {
            select: {
              jobNumber: true,
              primaryOwnerId: true,
              assignedManagerId: true,
              assignments: { select: { userId: true } },
            },
          },
        },
      },
      node: true,
    },
  });

  if (openQueries.length === 0) {
    return;
  }

  const now = await getNow();
  const todayIso = now.toISOString().slice(0, 10);

  for (const query of openQueries) {
    const reminderTime = query.reminderTime || DEFAULT_QUERY_REMINDER_TIME;
    const lastReminderIso = query.lastReminderAt?.toISOString().slice(0, 10) ?? null;
    if (lastReminderIso === todayIso || !hasReminderTimeElapsed(reminderTime, now)) {
      continue;
    }

    const recipients = Array.from(
      new Set([
        query.instance.job.primaryOwnerId,
        query.instance.job.assignedManagerId,
        ...query.instance.job.assignments.map((assignment) => assignment.userId),
      ].filter((value): value is string => typeof value === "string" && value.length > 0)),
    );

    await Promise.all(
      recipients.map((userId) =>
        createNotification({
          userId,
          orgId,
          kind: "CHA_FILING_QUERY_REMINDER",
          title: `Query update required: ${query.instance.job.jobNumber}`,
          body: `Update the customs query status for "${query.title}" in filing stage "${query.node.name}".`,
          link: `/cha/jobs/${jobId}?tab=filing`,
          payload: {
            jobId,
            queryId: query.id,
            reminderTime,
          },
          priority: "important",
        }),
      ),
    );

    await db.filingWorkflowQuery.update({
      where: { id: query.id },
      data: { lastReminderAt: now },
    });
  }
}

export async function runFilingWorkflowQueryReminderCron() {
  const queryTargets = await db.filingWorkflowQuery.findMany({
    where: {
      status: { in: ["OPEN", "REPLIED"] },
    },
    select: {
      instance: {
        select: {
          jobId: true,
          job: {
            select: {
              orgId: true,
            },
          },
        },
      },
    },
  });

  const uniqueTargets = Array.from(
    new Set(
      queryTargets
        .map((entry) => {
          const orgId = entry.instance.job.orgId;
          const jobId = entry.instance.jobId;
          return orgId && jobId ? `${orgId}:${jobId}` : null;
        })
        .filter((value): value is string => typeof value === "string"),
    ),
  ).map((value) => {
    const [orgId, jobId] = value.split(":");
    return { orgId, jobId };
  });

  for (const target of uniqueTargets) {
    await syncFilingWorkflowQueryReminders(target.orgId, target.jobId);
  }

  return {
    processedJobs: uniqueTargets.length,
  };
}

function getFilingQueryRecipientIds(job: {
  primaryOwnerId: string | null;
  assignedManagerId: string | null;
  assignments: { userId: string }[];
}) {
  return Array.from(
    new Set([
      job.primaryOwnerId,
      job.assignedManagerId,
      ...job.assignments.map((assignment) => assignment.userId),
    ].filter((value): value is string => typeof value === "string" && value.length > 0)),
  );
}

async function notifyFilingQueryParticipants(params: {
  orgId: string;
  jobId: string;
  jobNumber: string;
  queryId: string;
  queryTitle: string;
  actorId: string;
  body: string;
  kind: string;
}) {
  const job = await db.chaJob.findFirstOrThrow({
    where: getActiveChaJobByIdWhere(params.orgId, params.jobId),
    select: {
      primaryOwnerId: true,
      assignedManagerId: true,
      assignments: { select: { userId: true } },
    },
  });

  const recipients = getFilingQueryRecipientIds(job).filter((userId) => userId !== params.actorId);
  if (recipients.length === 0) {
    return;
  }

  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        userId,
        orgId: params.orgId,
        kind: params.kind,
        title: `Filing query update: ${params.jobNumber}`,
        body: params.body,
        link: `/cha/jobs/${params.jobId}?tab=filing`,
        payload: {
          jobId: params.jobId,
          queryId: params.queryId,
          queryTitle: params.queryTitle,
        },
        priority: "important",
      }),
    ),
  );
}

async function buildFilingQueryEscalationWarnings(params: {
  actorId: string;
  orgId: string;
  jobId?: string;
}): Promise<FilingQueryEscalationWarning[]> {
  const [now, canViewAll] = await Promise.all([
    getNow(),
    can(params.actorId, "cha.job.view_all"),
  ]);

  const warningThreshold = new Date(now.getTime() - 60 * 60 * 1000);
  const queries = await db.filingWorkflowQuery.findMany({
    where: {
      status: { in: ["OPEN", "REPLIED"] },
      lastReminderAt: { lte: warningThreshold },
      instance: {
        ...(params.jobId ? { jobId: params.jobId } : {}),
        job: {
          ...getActiveChaJobWhere(params.orgId),
          ...(canViewAll
            ? {}
            : {
                OR: [
                  { primaryOwnerId: params.actorId },
                  { assignedManagerId: params.actorId },
                  { assignments: { some: { userId: params.actorId } } },
                ],
              }),
        },
      },
    },
    select: {
      id: true,
      title: true,
      lastReminderAt: true,
      instance: {
        select: {
          jobId: true,
          job: {
            select: {
              jobNumber: true,
            },
          },
        },
      },
    },
  });

  if (queries.length === 0) {
    return [];
  }

  const queryIds = queries.map((query) => query.id);
  const logs = await db.chaAuditLog.findMany({
    where: {
      entityType: "FilingWorkflowQuery",
      entityId: { in: queryIds },
      event: { in: [...FILING_QUERY_ACTIVITY_EVENTS] },
    },
    select: {
      entityId: true,
      timestamp: true,
      actorId: true,
    },
    orderBy: { timestamp: "desc" },
  });

  const latestActivityAfterReminder = new Map<string, Date>();
  for (const log of logs) {
    if (log.actorId === "system") {
      continue;
    }
    if (!latestActivityAfterReminder.has(log.entityId)) {
      latestActivityAfterReminder.set(log.entityId, log.timestamp);
    }
  }

  const warningsByJob = new Map<string, FilingQueryEscalationWarning>();
  const warningCounts = new Map<string, number>();

  for (const query of queries) {
    if (!query.lastReminderAt) {
      continue;
    }
    const latestActivity = latestActivityAfterReminder.get(query.id);
    if (latestActivity && latestActivity.getTime() > query.lastReminderAt.getTime()) {
      continue;
    }

    const warningTriggeredAt = new Date(query.lastReminderAt.getTime() + 60 * 60 * 1000);
    const staleMinutes = Math.max(60, Math.floor((now.getTime() - query.lastReminderAt.getTime()) / 60000));
    const existingCount = warningCounts.get(query.instance.jobId) || 0;
    warningCounts.set(query.instance.jobId, existingCount + 1);

    const candidate: FilingQueryEscalationWarning = {
      jobId: query.instance.jobId,
      jobNumber: query.instance.job.jobNumber,
      queryId: query.id,
      queryTitle: query.title,
      overdueQueryCount: existingCount + 1,
      reminderTriggeredAt: query.lastReminderAt,
      warningTriggeredAt,
      staleMinutes,
    };

    const existing = warningsByJob.get(query.instance.jobId);
    if (!existing || existing.warningTriggeredAt.getTime() > candidate.warningTriggeredAt.getTime()) {
      warningsByJob.set(query.instance.jobId, candidate);
    }
  }

  return Array.from(warningsByJob.values()).map((warning) => ({
    ...warning,
    overdueQueryCount: warningCounts.get(warning.jobId) || warning.overdueQueryCount,
  }));
}

export async function listFilingQueryEscalationWarnings(
  actorId: string,
  orgId: string,
): Promise<FilingQueryEscalationWarning[]> {
  return buildFilingQueryEscalationWarnings({ actorId, orgId });
}

export async function createFilingWorkflowQuery(
  actorId: string,
  orgId: string,
  jobId: string,
  nodeRunId: string,
  input: {
    title: string;
    details: string;
    reminderTime?: string;
  },
) {
  const instance = await db.filingWorkflowInstance.findUniqueOrThrow({
    where: { jobId },
    include: {
      nodeRuns: true,
      version: { include: { nodes: true } },
    },
  });
  const nodeRun = instance.nodeRuns.find((run) => run.id === nodeRunId);
  if (!nodeRun) {
    throw new Error("Filing workflow step not found for this query.");
  }

  const node = instance.version.nodes.find((entry) => entry.id === nodeRun.nodeId);
  const reminderTime = input.reminderTime?.trim() || DEFAULT_QUERY_REMINDER_TIME;
  const query = await db.filingWorkflowQuery.create({
    data: {
      instanceId: instance.id,
      nodeRunId,
      nodeId: nodeRun.nodeId,
      title: input.title.trim() || "Customs Query",
      details: input.details.trim(),
      reminderTime,
      createdById: actorId,
    },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingWorkflowQuery",
    entityId: query.id,
    event: "FILING_QUERY_CREATED",
    actorId,
    remarks: `Created filing query "${query.title}" in stage "${node?.name || nodeRun.nodeKey}".`,
    metadata: {
      reminderTime,
      details: query.details,
    },
  });

  const createdJob = await db.chaJob.findUniqueOrThrow({
    where: { id: jobId },
    select: { jobNumber: true },
  });

  await notifyFilingQueryParticipants({
    orgId,
    jobId,
    jobNumber: createdJob.jobNumber,
    queryId: query.id,
    queryTitle: query.title,
    actorId,
    kind: "CHA_FILING_QUERY_CREATED",
    body: `A customs query "${query.title}" was opened and needs collaborative updates.`,
  });

  await syncFilingWorkflowQueryReminders(orgId, jobId);
  return query;
}

export async function addFilingWorkflowQueryComment(
  actorId: string,
  orgId: string,
  jobId: string,
  queryId: string,
  input: {
    message: string;
  },
) {
  const message = input.message.trim();
  if (!message) {
    throw new Error("Enter a message before posting the query update.");
  }

  const query = await db.filingWorkflowQuery.findFirstOrThrow({
    where: {
      id: queryId,
      instance: {
        jobId,
        job: { orgId },
      },
    },
    include: {
      instance: {
        include: {
          job: {
            select: {
              jobNumber: true,
            },
          },
        },
      },
    },
  });

  if (query.status === "CLOSED") {
    throw new Error("This customs query is already closed.");
  }

  const commentLog = await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingWorkflowQuery",
    entityId: query.id,
    event: "FILING_QUERY_COMMENT_ADDED",
    actorId,
    remarks: `Added a customs query update on "${query.title}".`,
    metadata: {
      message,
    },
  });

  await notifyFilingQueryParticipants({
    orgId,
    jobId,
    jobNumber: query.instance.job.jobNumber,
    queryId: query.id,
    queryTitle: query.title,
    actorId,
    kind: "CHA_FILING_QUERY_COMMENT",
    body: `A new customs query update was posted for "${query.title}".`,
  });

  return commentLog;
}

export async function updateFilingWorkflowQueryStatus(
  actorId: string,
  orgId: string,
  jobId: string,
  queryId: string,
  input: {
    status: "OPEN" | "REPLIED" | "CLOSED";
    details?: string;
  },
) {
  const now = await getNow();
  const query = await db.filingWorkflowQuery.findFirstOrThrow({
    where: {
      id: queryId,
      instance: {
        jobId,
        job: { orgId },
      },
    },
    include: {
      instance: {
        include: {
          job: {
            select: {
              jobNumber: true,
            },
          },
        },
      },
    },
  });

  const updated = await db.filingWorkflowQuery.update({
    where: { id: queryId },
    data: {
      status: input.status,
      details: typeof input.details === "string" && input.details.trim() ? input.details.trim() : undefined,
      closedAt: input.status === "CLOSED" ? now : null,
      closedById: input.status === "CLOSED" ? actorId : null,
    },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingWorkflowQuery",
    entityId: queryId,
    event: input.status === "CLOSED" ? "FILING_QUERY_CLOSED" : "FILING_QUERY_UPDATED",
    actorId,
    prevState: query.status,
    newState: input.status,
    remarks: `Filing query "${query.title}" updated to ${input.status}.`,
    metadata: {
      details: typeof input.details === "string" && input.details.trim() ? input.details.trim() : null,
      status: input.status,
    },
  });

  await notifyFilingQueryParticipants({
    orgId,
    jobId,
    jobNumber: query.instance.job.jobNumber,
    queryId,
    queryTitle: query.title,
    actorId,
    kind: input.status === "CLOSED" ? "CHA_FILING_QUERY_CLOSED" : "CHA_FILING_QUERY_UPDATED",
    body:
      input.status === "CLOSED"
        ? `The customs query "${query.title}" was marked replied and closed.`
        : `The customs query "${query.title}" has a new replied status update.`,
  });

  return updated;
}

export async function deleteDeliveryOrderDocument(
  actorId: string,
  orgId: string,
  jobId: string,
) {
  const { additionalData } = await getAdditionalDataForDoFlow(orgId, jobId);
  if (!additionalData.doDocumentFileKey) {
    throw new Error("No Delivery Order document is currently uploaded.");
  }

  const existingFileKey = additionalData.doDocumentFileKey;
  const existingFileName = additionalData.doDocumentFileName || "Delivery Order document";

  const updated = await db.$transaction(async (tx) => {
    const updatedAdditionalData = await tx.chaJobAdditionalData.update({
      where: { id: additionalData.id },
      data: {
        doDocumentFileKey: null,
        doDocumentFileName: null,
        doDocumentUploadedAt: null,
        doDocumentUploadedById: null,
        updatedById: actorId,
      },
    });

    const requirement = await tx.chaJobDocumentRequirement.findFirst({
      where: {
        jobId,
        name: DO_DOCUMENT_REQUIREMENT_NAME,
        category: DO_DOCUMENT_CATEGORY,
      },
      orderBy: { id: "asc" },
    });

    if (requirement) {
      await tx.chaDocumentVersion.updateMany({
        where: {
          requirementId: requirement.id,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });

      await tx.chaJobDocumentRequirement.update({
        where: { id: requirement.id },
        data: { status: "PENDING" },
      });
    }

    return updatedAdditionalData;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobAdditionalData",
    entityId: additionalData.id,
    event: "DO_DOCUMENT_DELETED",
    actorId,
    remarks: `Deleted Delivery Order document: ${existingFileName}`,
    metadata: {
      fileKey: existingFileKey,
      fileName: existingFileName,
    },
  });

  return updated;
}

export async function upsertFilingWorkflowToggleState(
  actorId: string,
  orgId: string,
  jobId: string,
  nodeRunId: string,
  input: {
    sectionKey: string;
    isEnabled: boolean;
    state?: Record<string, unknown> | null;
  },
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId },
    select: {
      id: true,
      primaryOwnerId: true,
      assignedManagerId: true,
      assignments: {
        select: {
          userId: true,
        },
      },
      jobType: {
        select: {
          movementDirection: true,
        },
      },
    },
  });

  await assertCanAccessFiling(actorId, job);

  const nodeRun = await db.filingNodeRun.findFirstOrThrow({
    where: {
      id: nodeRunId,
      instance: {
        jobId,
      },
    },
    include: {
      node: true,
      instance: true,
    },
  });

  if (nodeRun.status !== "ACTIVE") {
    throw new Error("This filing workflow section can only be updated on the active stage.");
  }

  const sectionKey = input.sectionKey.trim();
  if (!sectionKey) {
    throw new Error("Section key is required.");
  }

  const updated = await db.filingToggleState.upsert({
    where: {
      instanceId_nodeId_sectionKey: {
        instanceId: nodeRun.instanceId,
        nodeId: nodeRun.nodeId,
        sectionKey,
      },
    },
    create: {
      instanceId: nodeRun.instanceId,
      nodeRunId: nodeRun.id,
      nodeId: nodeRun.nodeId,
      sectionKey,
      isEnabled: input.isEnabled,
      stateJson: (input.state ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      updatedById: actorId,
    },
    update: {
      nodeRunId: nodeRun.id,
      isEnabled: input.isEnabled,
      stateJson: (input.state ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      updatedById: actorId,
    },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingToggleState",
    entityId: `${nodeRun.instanceId}:${nodeRun.nodeId}:${sectionKey}`,
    event: "FILING_TOGGLE_STATE_UPDATED",
    actorId,
    remarks: `Updated filing workflow section "${sectionKey}" on node "${nodeRun.node.name}".`,
    metadata: {
      sectionKey,
      isEnabled: input.isEnabled,
      state: input.state ?? null,
    },
  });

  return updated;
}

async function resolveConfiguredValidityDate(params: {
  uploadedAt: Date;
  explicitValidityDate?: Date | null;
  requiresValidity: boolean;
  validityDuration?: number | null;
  validityUnit?: string | null;
  orgId: string;
}) {
  if (params.explicitValidityDate) {
    return params.explicitValidityDate;
  }
  if (!params.requiresValidity) {
    return null;
  }
  if (params.validityDuration && params.validityUnit) {
    return calculateSlaDueDate(params.uploadedAt, params.validityDuration, params.validityUnit, params.orgId);
  }
  throw new Error("This document requires a validity date before the upload can be completed.");
}

async function ensureWorkflowDocumentRequirementItem(
  tx: Prisma.TransactionClient,
  orgId: string,
  input: {
    documentType: string;
    acceptedFileTypes: string[];
    isMandatory: boolean;
    minUploadCount: number;
    maxUploadCount?: number | null;
    requiresValidityDate: boolean;
    defaultValidityDuration?: number | null;
    defaultValidityUnit?: string | null;
    warningBeforeDuration?: number | null;
    warningBeforeUnit?: string | null;
    notifyBeforeExpiry: boolean;
    notificationRoles: string[];
    showInTimeline: boolean;
  },
) {
  const category = await tx.chaDocumentRequirementCategory.upsert({
    where: { orgId_name: { orgId, name: "Filing Workflow Documents" } },
    update: { isActive: true },
    create: {
      orgId,
      name: "Filing Workflow Documents",
      description: "Documents automatically generated or uploaded during the CHA filing workflow.",
      sortOrder: 98,
      isActive: true,
    },
  });

  return tx.chaDocumentRequirementItem.upsert({
    where: { categoryId_name: { categoryId: category.id, name: input.documentType } },
    update: {
      acceptedFileTypes: input.acceptedFileTypes,
      isRequiredDefault: input.isMandatory,
      minUploadCount: input.minUploadCount,
      maxUploadCount: input.maxUploadCount ?? null,
      requiresValidityDate: input.requiresValidityDate,
      defaultValidityDuration: input.defaultValidityDuration ?? null,
      defaultValidityUnit: input.defaultValidityUnit ?? null,
      warningBeforeDuration: input.warningBeforeDuration ?? null,
      warningBeforeUnit: input.warningBeforeUnit ?? null,
      notifyBeforeExpiry: input.notifyBeforeExpiry,
      notificationRoles: input.notificationRoles,
      showInJobDocuments: true,
      showInTimeline: input.showInTimeline,
      isActive: true,
    },
    create: {
      categoryId: category.id,
      name: input.documentType,
      sortOrder: 1,
      isRequiredDefault: input.isMandatory,
      acceptedFileTypes: input.acceptedFileTypes,
      minUploadCount: input.minUploadCount,
      maxUploadCount: input.maxUploadCount ?? null,
      requiresValidityDate: input.requiresValidityDate,
      defaultValidityDuration: input.defaultValidityDuration ?? null,
      defaultValidityUnit: input.defaultValidityUnit ?? null,
      warningBeforeDuration: input.warningBeforeDuration ?? null,
      warningBeforeUnit: input.warningBeforeUnit ?? null,
      notifyBeforeExpiry: input.notifyBeforeExpiry,
      notificationRoles: input.notificationRoles,
      showInJobDocuments: true,
      showInTimeline: input.showInTimeline,
      isActive: true,
    },
  });
}

async function syncFilingAttachmentToDocuments(
  tx: Prisma.TransactionClient,
  params: {
    orgId: string;
    jobId: string;
    attachment: {
      id: string;
      fileKey: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      uploadedById: string;
      uploadedAt: Date;
      validityDate: Date | null;
    };
    instance: { templateId: string; versionId: string };
    nodeRunId: string;
    nodeId: string;
    checklistItem?: {
      id: string;
      label: string;
      isMandatory: boolean;
      minUploads: number;
      maxUploads: number | null;
      acceptedFileTypes: string[];
      documentType: string | null;
      requiresValidity: boolean;
      validityDuration: number | null;
      validityUnit: string | null;
      warningBeforeDuration: number | null;
      warningBeforeUnit: string | null;
      notifyBeforeExpiry: boolean;
      notificationRoles: string[];
      showInDocumentsPage: boolean;
      showInTimeline: boolean;
    } | null;
    photoRequirement?: {
      id: string;
      label: string;
      isMandatory: boolean;
      minPhotos: number;
      maxPhotos: number | null;
      acceptedFileTypes: string[];
      documentType: string | null;
      requiresValidity: boolean;
      validityDuration: number | null;
      validityUnit: string | null;
      warningBeforeDuration: number | null;
      warningBeforeUnit: string | null;
      notifyBeforeExpiry: boolean;
      notificationRoles: string[];
      showInDocumentsPage: boolean;
      isVisibleInTimeline: boolean;
    } | null;
    documentRequirement?: FilingDocumentRequirementConfig | null;
  },
) {
  const sourceConfig = params.checklistItem ?? params.photoRequirement ?? params.documentRequirement;
  if (!sourceConfig) {
    return null;
  }
  const shouldShowInDocuments = "showInDocumentsPage" in sourceConfig ? sourceConfig.showInDocumentsPage !== false : true;
  if (!shouldShowInDocuments) {
    return null;
  }

  const documentType =
    ("documentType" in sourceConfig ? sourceConfig.documentType?.trim() : undefined) ||
    sourceConfig.label;
  const isMandatory =
    "isMandatory" in sourceConfig ? sourceConfig.isMandatory : !!sourceConfig.required;
  const requirementItem = await ensureWorkflowDocumentRequirementItem(tx, params.orgId, {
    documentType,
    acceptedFileTypes: sourceConfig.acceptedFileTypes ?? [],
    isMandatory,
    minUploadCount: "minUploads" in sourceConfig ? sourceConfig.minUploads : "minPhotos" in sourceConfig ? sourceConfig.minPhotos : 1,
    maxUploadCount: "maxUploads" in sourceConfig ? sourceConfig.maxUploads : "maxPhotos" in sourceConfig ? sourceConfig.maxPhotos : null,
    requiresValidityDate: "requiresValidity" in sourceConfig ? !!sourceConfig.requiresValidity : false,
    defaultValidityDuration: "validityDuration" in sourceConfig ? sourceConfig.validityDuration ?? null : null,
    defaultValidityUnit: "validityUnit" in sourceConfig ? sourceConfig.validityUnit ?? null : null,
    warningBeforeDuration: "warningBeforeDuration" in sourceConfig ? sourceConfig.warningBeforeDuration ?? null : null,
    warningBeforeUnit: "warningBeforeUnit" in sourceConfig ? sourceConfig.warningBeforeUnit ?? null : null,
    notifyBeforeExpiry: "notifyBeforeExpiry" in sourceConfig ? !!sourceConfig.notifyBeforeExpiry : false,
    notificationRoles: "notificationRoles" in sourceConfig ? sourceConfig.notificationRoles ?? [] : [],
    showInTimeline: "showInTimeline" in sourceConfig ? sourceConfig.showInTimeline : "isVisibleInTimeline" in sourceConfig ? sourceConfig.isVisibleInTimeline : true,
  });

  let jobRequirement = await tx.chaJobDocumentRequirement.findFirst({
    where: {
      jobId: params.jobId,
      requirementItemId: requirementItem.id,
      name: documentType,
    },
    orderBy: { id: "asc" },
  });

  if (!jobRequirement) {
    jobRequirement = await tx.chaJobDocumentRequirement.create({
      data: {
        jobId: params.jobId,
        name: documentType,
        category: "Filing Workflow Documents",
        isMandatory,
        status: "PENDING",
        requirementItemId: requirementItem.id,
      },
    });
  }

  await tx.chaDocumentVersion.updateMany({
    where: { requirementId: jobRequirement.id, isCurrent: true },
    data: { isCurrent: false },
  });

  const syncedVersion = await tx.chaDocumentVersion.create({
    data: {
      requirementId: jobRequirement.id,
      fileKey: params.attachment.fileKey,
      fileName: params.attachment.fileName,
      mimeType: params.attachment.fileType,
      sizeBytes: params.attachment.fileSize,
      uploadedById: params.attachment.uploadedById,
      validityDate: params.attachment.validityDate,
      source: "FILING_WORKFLOW",
      workflowTemplateId: params.instance.templateId,
      workflowVersionId: params.instance.versionId,
      workflowNodeId: params.nodeId,
      workflowNodeRunId: params.nodeRunId,
      filingChecklistItemId: params.checklistItem?.id ?? null,
      filingPhotoRequirementId: params.photoRequirement?.id ?? null,
      timelineVisible: "showInTimeline" in sourceConfig ? sourceConfig.showInTimeline : "isVisibleInTimeline" in sourceConfig ? sourceConfig.isVisibleInTimeline : true,
    },
  });

  await tx.chaJobDocumentRequirement.update({
    where: { id: jobRequirement.id },
    data: {
      isMandatory,
      status: "UPLOADED",
    },
  });

  await tx.chaDocumentException.deleteMany({
    where: { requirementId: jobRequirement.id },
  });

  return syncedVersion;
}

export async function uploadFilingAttachment(
  actorId: string,
  orgId: string,
  jobId: string,
  nodeRunId: string,
  photoRequirementId: string | null,
  checklistItemId: string | null,
  documentRequirementKey: string | null,
  fileData: { fileName: string; mimeType: string; sizeBytes: number },
  fileBuffer?: Buffer,
  validityDate?: Date | null,
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId },
    select: {
      id: true,
      primaryOwnerId: true,
      assignedManagerId: true,
      jobType: {
        select: {
          movementDirection: true,
        },
      },
      assignments: {
        select: {
          userId: true,
        },
      },
    },
  });

  await assertCanAccessFiling(actorId, job);

  const instance = await db.filingWorkflowInstance.findUniqueOrThrow({
    where: { jobId },
  });

  const nodeRun = await db.filingNodeRun.findFirst({
    where: {
      id: nodeRunId,
      instanceId: instance.id,
    },
    include: {
      node: {
        include: {
          checklistItems: true,
          photoRequirements: true,
        },
      },
    },
  });

  if (!nodeRun) {
    throw new Error("Filing workflow step not found for this job.");
  }

  const checklistItem = checklistItemId
    ? nodeRun.node.checklistItems.find((item) => item.id === checklistItemId) ?? null
    : null;
  const photoRequirement = photoRequirementId
    ? nodeRun.node.photoRequirements.find((item) => item.id === photoRequirementId) ?? null
    : null;
  const nodeDocumentRequirements = normalizeDocumentRequirements(nodeRun.node.documentRequirementsJson);
  const conditionalSections = normalizeConditionalSections(nodeRun.node.conditionalSectionsJson);
  const conditionalDocuments = conditionalSections.flatMap((section) => section.unlocksDocuments ?? []);
  const documentRequirement =
    documentRequirementKey
      ? [...nodeDocumentRequirements, ...conditionalDocuments].find((item) => item.key === documentRequirementKey) ?? null
      : null;
  const uploadLabel = checklistItem?.label
    || photoRequirement?.label
    || (documentRequirementKey === "bill_document"
      ? job.jobType?.movementDirection === "EXPORT"
        ? "Shipping Bill"
        : "Bill of Entry"
      : documentRequirement?.label)
    || "Filing Document";
  const storedFileName = buildDriveStoredFileName(uploadLabel, fileData.fileName);
  const driveAccessToken = await resolveJobDriveUploadAccessToken(job.primaryOwnerId, actorId);

  // Verifies (and transparently recreates) the job's root and "Filing
  // Documents" folder if either was deleted from Drive after the job was created.
  let filingRootFolderId: string | undefined;
  try {
    filingRootFolderId = await ensureJobCategoryFolder(jobId, "Filing Documents", actorId);
  } catch (err: any) {
    console.warn(`[Upload] Drive folder self-heal failed for job ${jobId}, "Filing Documents":`, err.message || err);
    const profile = await db.jobWorkspaceProfile.findUnique({ where: { jobId } });
    filingRootFolderId = resolveDriveFolderForCategory(
      profile?.categoryFolders as Record<string, string> | undefined,
      profile?.rootFolderId,
      "Filing Documents",
    );
  }

  let fileKey = `https://drive.google.com/file/d/mock-uploaded-${Math.random().toString(36).substring(7)}/view`;

  if (fileBuffer && filingRootFolderId && !filingRootFolderId.startsWith("mock-")) {
    try {
      // Each filing checklist stage (node) gets its own subfolder under "Filing
      // Documents", created lazily on first upload and reused after that.
      const driveFolderId = await getOrCreateFilingNodeFolder(
        jobId,
        filingRootFolderId,
        nodeRun.node.key,
        nodeRun.node.name,
        driveAccessToken,
      );
      const uploadResult = await driveClient.uploadFile({
        name: storedFileName,
        mimeType: fileData.mimeType,
        parentFolderId: driveFolderId,
        fileBuffer,
      });
      fileKey = uploadResult.webViewLink;
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Google Drive upload failed: ${err.message || err}`);
      }
      console.warn("[Upload] Google Drive upload failed for Filing. Falling back to mock URL. Error:", err.message || err);
    }
  } else if (fileBuffer && process.env.NODE_ENV === "production") {
    throw new Error("Google Drive is not provisioned for this job or missing credentials. Please retry provisioning the workspace.");
  }

  const sourceConfig = checklistItem ?? photoRequirement ?? documentRequirement;
  const uploadedAt = await getNow();
  const resolvedValidityDate = sourceConfig
    ? await resolveConfiguredValidityDate({
        uploadedAt,
        explicitValidityDate: validityDate ?? null,
        requiresValidity: !!sourceConfig.requiresValidity,
        validityDuration:
          "validityDuration" in sourceConfig ? sourceConfig.validityDuration : null,
        validityUnit: "validityUnit" in sourceConfig ? sourceConfig.validityUnit : null,
        orgId,
      })
    : null;

  const attachment = await db.$transaction(async (tx) => {
    const createdAttachment = await tx.filingAttachment.create({
      data: {
        instanceId: instance.id,
        nodeRunId,
        photoRequirementId,
        checklistItemId,
        documentRequirementKey,
        documentRequirementLabel: documentRequirement?.label ?? null,
        conditionalSectionKey: documentRequirement?.visibleWhen?.sectionKey ?? null,
        fileKey,
        fileName: storedFileName,
        fileSize: fileData.sizeBytes,
        fileType: fileData.mimeType,
        uploadedById: actorId,
        uploadedAt,
        validityDate: resolvedValidityDate,
      },
    });

    await syncFilingAttachmentToDocuments(tx, {
      orgId,
      jobId,
      attachment: {
        id: createdAttachment.id,
        fileKey: createdAttachment.fileKey,
        fileName: createdAttachment.fileName,
        fileType: createdAttachment.fileType,
        fileSize: createdAttachment.fileSize,
        uploadedById: createdAttachment.uploadedById,
        uploadedAt: createdAttachment.uploadedAt,
        validityDate: createdAttachment.validityDate,
      },
      instance: {
        templateId: instance.templateId,
        versionId: instance.versionId,
      },
      nodeRunId,
      nodeId: nodeRun.node.id,
      checklistItem,
      photoRequirement,
      documentRequirement,
    });

    return createdAttachment;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingAttachment",
    entityId: attachment.id,
    event: checklistItemId ? "FILING_CHECKLIST_FILE_UPLOADED" : documentRequirementKey ? "FILING_DOCUMENT_REQUIREMENT_FILE_UPLOADED" : "FILING_PHOTO_UPLOADED",
    actorId,
    remarks: `Uploaded file: ${storedFileName} for node run ${nodeRunId}`,
    metadata: {
      validityDate: resolvedValidityDate?.toISOString() ?? null,
      checklistItemId,
      photoRequirementId,
      documentRequirementKey,
    },
  });

  return attachment;
}

export async function upsertFilingShipmentDetails(
  userId: string,
  orgId: string,
  jobId: string,
  data: {
    filingShipmentType: string;
    billOfEntryNumber?: string | null;
    shippingBillNumber?: string | null;
  },
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId },
    select: {
      id: true,
      primaryOwnerId: true,
      assignedManagerId: true,
      filing: true,
      jobType: {
        select: {
          movementDirection: true,
        },
      },
      assignments: {
        select: {
          userId: true,
        },
      },
    },
  });

  await assertCanAccessFiling(userId, job);

  const filingShipmentType = data.filingShipmentType.trim();
  const billOfEntryNumber = data.billOfEntryNumber?.trim() || null;
  const shippingBillNumber = data.shippingBillNumber?.trim() || null;

  if (!filingShipmentType) {
    throw new Error("Shipment type is required.");
  }

  if (billOfEntryNumber && shippingBillNumber) {
    throw new Error("Bill of Entry and Shipping Bill numbers cannot both be set.");
  }

  if (job.jobType?.movementDirection === "IMPORT" && shippingBillNumber) {
    throw new Error("Import jobs can only store a Bill of Entry Number.");
  }

  if (job.jobType?.movementDirection === "EXPORT" && billOfEntryNumber) {
    throw new Error("Export jobs can only store a Shipping Bill Number.");
  }

  const previous = job.filing;
  const filing = previous
    ? await db.chaFiling.update({
        where: { jobId },
        data: {
          filingShipmentType,
          billOfEntryNumber,
          shippingBillNumber,
        },
      })
    : await db.chaFiling.create({
        data: {
          jobId,
          filingShipmentType,
          billOfEntryNumber,
          shippingBillNumber,
          status: "PENDING",
        },
      });

  if (previous?.filingShipmentType !== filingShipmentType) {
    await logChaAudit({
      orgId,
      jobId,
      entityType: "ChaFiling",
      entityId: filing.id,
      event: "FILING_SHIPMENT_TYPE_CHANGED",
      actorId: userId,
      prevState: previous?.filingShipmentType ?? undefined,
      newState: filingShipmentType,
      remarks: `Shipment type updated to ${filingShipmentType}.`,
    });
  }

  if ((previous?.billOfEntryNumber ?? null) !== billOfEntryNumber) {
    await logChaAudit({
      orgId,
      jobId,
      entityType: "ChaFiling",
      entityId: filing.id,
      event: "FILING_BE_NUMBER_CHANGED",
      actorId: userId,
      prevState: previous?.billOfEntryNumber ?? undefined,
      newState: billOfEntryNumber ?? undefined,
      remarks: billOfEntryNumber ? `Bill of Entry Number updated to ${billOfEntryNumber}.` : "Bill of Entry Number cleared.",
    });
  }

  if ((previous?.shippingBillNumber ?? null) !== shippingBillNumber) {
    await logChaAudit({
      orgId,
      jobId,
      entityType: "ChaFiling",
      entityId: filing.id,
      event: "FILING_SB_NUMBER_CHANGED",
      actorId: userId,
      prevState: previous?.shippingBillNumber ?? undefined,
      newState: shippingBillNumber ?? undefined,
      remarks: shippingBillNumber ? `Shipping Bill Number updated to ${shippingBillNumber}.` : "Shipping Bill Number cleared.",
    });
  }

  return filing;
}

export async function deleteFilingAttachment(
  actorId: string,
  orgId: string,
  jobId: string,
  attachmentId: string
) {
  const job = await db.chaJob.findFirstOrThrow({
    where: { id: jobId, orgId },
    select: {
      id: true,
      primaryOwnerId: true,
      assignedManagerId: true,
      assignments: {
        select: {
          userId: true,
        },
      },
    },
  });

  await assertCanAccessFiling(actorId, job);

  const attachment = await db.filingAttachment.findUniqueOrThrow({
    where: { id: attachmentId },
    include: {
      instance: {
        select: {
          jobId: true,
        },
      },
    },
  });

  if (attachment.instance.jobId !== jobId) {
    throw new Error("Attachment does not belong to this job.");
  }

  await db.filingAttachment.delete({
    where: { id: attachmentId },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingAttachment",
    entityId: attachmentId,
    event: "FILING_PHOTO_DELETED",
    actorId,
    remarks: `Deleted photo: ${attachment.fileName}`,
  });

  return true;
}
