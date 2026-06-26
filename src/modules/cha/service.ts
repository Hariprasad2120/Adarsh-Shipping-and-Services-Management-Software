import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { createNotification, getUsersWithPermission, recordNotificationActivity } from "@/modules/notifications/service";
import * as XLSX from "xlsx";
import { Prisma } from "@/generated/prisma/client";
import { can, ForbiddenError } from "@/lib/rbac";
import * as driveClient from "@/lib/google-drive-client";

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
};

type CompatibleAdditionalData = {
  id?: string;
  jobId?: string;
  vesselInwardDate: Date | null;
  importGeneralManifest: string | null;
  exportGeneralManifest: string | null;
  customManifestValue: string | null;
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

export const DEFAULT_DOCUMENT_REQUIREMENTS = [
  {
    category: "Documents Required From Supplier",
    sortOrder: 1,
    items: [
      { name: "Invoice", sortOrder: 1, isRequiredDefault: true },
      { name: "Packing List", sortOrder: 2, isRequiredDefault: true },
      { name: "Bill of Lading", sortOrder: 3, isRequiredDefault: true },
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
        update: {},
        create: {
          categoryId: dbCat.id,
          name: item.name,
          sortOrder: item.sortOrder,
          isRequiredDefault: item.isRequiredDefault,
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
      }
    : {
        id: true,
        orgId: true,
        name: true,
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
  };
}

function getAdditionalDataSelect(includeCustomManifestValue: boolean): Prisma.ChaJobAdditionalDataSelect {
  return includeCustomManifestValue
    ? {
        id: true,
        jobId: true,
        vesselInwardDate: true,
        importGeneralManifest: true,
        exportGeneralManifest: true,
        customManifestValue: true,
        deliveryOrderValidity: true,
        status: true,
        createdById: true,
        updatedById: true,
        completedById: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      }
    : {
        id: true,
        jobId: true,
        vesselInwardDate: true,
        importGeneralManifest: true,
        exportGeneralManifest: true,
        deliveryOrderValidity: true,
        status: true,
        createdById: true,
        updatedById: true,
        completedById: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
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
  };
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
    const owner = await db.user.findUnique({
      where: { id: primaryOwnerId },
      select: { managerId: true, tlId: true },
    });
    if (owner?.managerId) ownerManagerIds.push(owner.managerId);
    if (owner?.tlId) ownerTlIds.push(owner.tlId);
  }

  return Array.from(new Set([...ownerManagerIds, ...ownerTlIds].filter(Boolean)));
}

async function getChecklistCustomerApproverIds(job: {
  id?: string;
  primaryOwnerId?: string;
  assignedManagerId?: string | null;
  assignments: { userId: string; responsibility?: string | null }[];
}) {
  return getChecklistConcernedUserIds(job);
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
  if (job.stage === "FILED" || job.filing?.status === "FILED" || job.status === "COMPLETED") {
    throw new Error("Completed or filed CHA jobs cannot be deleted.");
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
  const [manifestSchema, settings, creatorRoles] = await Promise.all([
    getChaManifestSchemaState(),
    db.chaSettings.findUnique({ where: { orgId } }),
    db.userRole.findMany({ where: { userId: actorId }, include: { role: true } }),
  ]);
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

    let finalJobNumber = data.jobNumber?.trim();
    if (!finalJobNumber) {
      const nextSequence = Math.max(branchRule.currentSequence + 1, branchRule.startingSequence, 1);
      finalJobNumber = buildChaJobNumberPreview({
        prefix: branchRule.prefix,
        suffix: branchRule.suffix,
        currentSequence: nextSequence - 1,
        startingSequence: branchRule.startingSequence,
        numberPadding: branchRule.numberPadding,
        useFinancialYear: branchRule.useFinancialYear,
        financialYearFormat: branchRule.financialYearFormat,
      });

      await tx.chaBranchNumberingRule.update({
        where: { id: branchRule.id },
        data: { currentSequence: nextSequence },
      });
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

  return db.$transaction(async (tx) => {
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

  // Fetch user and job in parallel — neither depends on the other
  const [user, job] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    }),
    db.chaJob.findFirst({
      where: { id: jobId, ...getActiveChaJobWhere(orgId) },
      include: {
        customer: true,
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
        checklistWorkflow: {
          include: {
            currentFileVersion: true,
            fileVersions: { orderBy: { versionNumber: "desc" } },
            approvals: { orderBy: { createdAt: "asc" } },
          },
        },
        checklistImports: { include: { uploadedBy: { select: { name: true } }, approvals: { include: { manager: { select: { name: true } } } }, reworkNotes: { include: { author: { select: { name: true } } } }, sections: { include: { items: true } } } },
        filing: { include: { dateHistory: { include: { setBy: { select: { name: true } } } } } },
        customerAdvance: { include: { receipts: true } },
        expenseRequests: { include: { requestedBy: { select: { name: true } }, lines: true, payments: { include: { paidBy: { select: { name: true } } } }, queries: { include: { author: { select: { name: true } } } }, statusHistory: true } },
        auditLogs: { orderBy: { timestamp: "desc" }, take: 100 },
      },
    }),
  ]);

  if (!user) throw new Error("User not found");
  if (!job) throw new Error("Job not found.");

  // Parallelize backfill (may do a DB write), access check, and actor lookup
  const actorIds = Array.from(new Set(job.auditLogs.map((l) => l.actorId)));
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

  const actorMap = new Map(actors.map((a) => [a.id, { name: a.name }]));
  const auditLogsWithActor = job.auditLogs.map((log) => ({
    ...log,
    actor: actorMap.get(log.actorId) || { name: "System" },
  }));

  return {
    ...normalizedJob,
    auditLogs: auditLogsWithActor,
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
    page?: number;
    pageSize?: number;
  }
) {
  const manifestSchema = await getChaManifestSchemaState();
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const where: any = getActiveChaJobWhere(orgId);

  if (filters.search) {
    where.OR = [
      { jobNumber: { contains: filters.search, mode: "insensitive" } },
      { title: { contains: filters.search, mode: "insensitive" } },
      { customer: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  if (filters.stage) where.stage = filters.stage;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.jobTypeId) where.jobTypeId = filters.jobTypeId;

  if (filters.assignedToMe) {
    where.assignments = { some: { userId } };
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

export function getFolderNameForCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  if (normalized.includes("kyc")) return "01 Customer KYC";
  if (normalized.includes("commercial")) return "02 Job Documents";
  if (normalized.includes("logistics")) return "02 Job Documents";
  if (normalized.includes("financial") || normalized.includes("invoice") || normalized.includes("billing")) return "06 Invoices and Billing";
  if (normalized.includes("compliance") || normalized.includes("customs") || normalized.includes("cha")) return "05 Customs and CHA";
  if (normalized.includes("checklist")) return "04 Checklists";
  if (normalized.includes("user")) return "03 User Uploads";
  if (normalized.includes("correspondence")) return "07 Correspondence";
  return "08 Other Documents";
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
  fileBuffer?: Buffer
) {
  const req = await db.chaJobDocumentRequirement.findFirstOrThrow({
    where: { id: requirementId, jobId, job: getActiveChaJobWhere(orgId) },
  });

  let fileKey = fileData.fileKey || `cha/docs/${Math.random().toString(36).substring(7)}_${fileData.fileName}`;

  if (fileBuffer) {
    const profile = await db.jobWorkspaceProfile.findUnique({
      where: { jobId },
    });

    let driveFolderId: string | undefined;
    if (profile && profile.categoryFolders) {
      const categoryFolders = profile.categoryFolders as Record<string, string>;
      const targetFolder = getFolderNameForCategory(req.category);
      driveFolderId = categoryFolders[targetFolder] || profile.rootFolderId || undefined;
    }

    if (driveFolderId && !driveFolderId.startsWith("mock-") && process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL) {
      try {
        const uploadResult = await driveClient.uploadFile({
          name: fileData.fileName,
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
        fileName: fileData.fileName,
        mimeType: fileData.mimeType,
        sizeBytes: fileData.sizeBytes,
        checksum: fileData.checksum,
        uploadedById: actorId,
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
    remarks: `Uploaded document: ${fileData.fileName}`,
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

  if (importGeneralManifest !== null && !/^\d+$/.test(importGeneralManifest)) {
    throw new Error("Import General Manifest (IGM) must contain digits only.");
  }
  if (exportGeneralManifest !== null && !/^\d+$/.test(exportGeneralManifest)) {
    throw new Error("Export General Manifest (EGM) must contain digits only.");
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

export async function listDeliveryOrderValidityWarnings(actorId: string, orgId: string) {
  const now = await getNow();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + 4);
  threshold.setHours(23, 59, 59, 999);

  const canViewAll = await can(actorId, "cha.job.view_all");
  const canViewIndicator = await can(actorId, "cha.do_validity.view_indicator");

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

  const warnings = jobs
    .filter((job) => job.additionalData?.deliveryOrderValidity)
    .map((job) => {
      const validity = job.additionalData!.deliveryOrderValidity!;
      const validityDay = new Date(validity);
      validityDay.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((validityDay.getTime() - today.getTime()) / 86_400_000);
      const severity = daysUntilExpiry < 0 ? "expired" : "expiring";

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

  if (warnings.length === 0) return [];

  // Batch fetch all existing DO validity notifications in one query (eliminates N+1)
  const existingNotifications = await db.notification.findMany({
    where: {
      userId: actorId,
      kind: { in: ["CHA_DO_VALIDITY_EXPIRED", "CHA_DO_VALIDITY_EXPIRING"] },
      link: { in: warnings.map((w) => `/cha/jobs/${w.jobId}`) },
    },
    orderBy: { createdAt: "desc" },
  });

  // Build lookup: "kind:link" -> latest notification
  const notifMap = new Map<string, typeof existingNotifications[0]>();
  for (const notif of existingNotifications) {
    const key = `${notif.kind}:${notif.link}`;
    if (!notifMap.has(key)) notifMap.set(key, notif);
  }

  const activeWarnings: typeof warnings = [];
  const notificationsToCreate: Parameters<typeof createNotification>[0][] = [];

  for (const warning of warnings) {
    const kind = warning.severity === "expired" ? "CHA_DO_VALIDITY_EXPIRED" : "CHA_DO_VALIDITY_EXPIRING";
    const link = `/cha/jobs/${warning.jobId}`;
    const existing = notifMap.get(`${kind}:${link}`);

    let shouldCreate = true;
    let isAcknowledgedOrDismissed = false;

    if (existing) {
      const payload = existing.payload as Record<string, any> | null;
      if (payload && payload.deliveryOrderValidity === warning.deliveryOrderValidity.toISOString()) {
        shouldCreate = false;
        if (existing.dismissedAt !== null || existing.acknowledgedAt !== null) {
          isAcknowledgedOrDismissed = true;
        }
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

    if (!isAcknowledgedOrDismissed) {
      activeWarnings.push(warning);
    }
  }

  // Create all new notifications in parallel
  if (notificationsToCreate.length > 0) {
    await Promise.all(notificationsToCreate.map((n) => createNotification(n)));
  }

  return activeWarnings;
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

export async function uploadChecklistFile(
  actorId: string,
  orgId: string,
  jobId: string,
  fileData: {
    fileKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    remarks?: string;
  }
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
  if (!fileData.fileKey.trim()) {
    throw new Error("Checklist file reference is required.");
  }
  if (fileData.sizeBytes <= 0) {
    throw new Error("Checklist file is empty.");
  }

  const internalApproverIds = await getChecklistInternalApproverIds(orgId, job);
  if (internalApproverIds.length === 0) {
    throw new Error("No internal checklist approver is configured for this job.");
  }

  const previousStatus = job.checklistWorkflow?.status ?? "PENDING_UPLOAD";
  const previousVersion = job.checklistWorkflow?.fileVersions[0]?.versionNumber ?? 0;

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
        fileKey: fileData.fileKey,
        originalFileName: fileData.fileName,
        mimeType: fileData.mimeType || "application/octet-stream",
        fileSize: fileData.sizeBytes,
        uploadedById: actorId,
        versionNumber: previousVersion + 1,
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
    throw new Error("Only the assigned Manager or Team Lead can internally approve this checklist.");
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

  return result;
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

// Fetch all checklist approvals queue for a manager
export async function listManagerChecklistApprovals(
  userId: string,
  orgId: string
) {
  return db.chaChecklistApproval.findMany({
    where: {
      managerId: userId,
      decision: "PENDING",
      checklistImport: { job: { orgId } },
    },
    include: {
      checklistImport: {
        include: {
          job: { include: { customer: true, primaryOwner: true } },
          uploadedBy: { select: { name: true } },
        },
      },
    },
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

  const isManager = actorRoleNames.includes("Manager") || canApproveDelete;
  const isOwner = job.primaryOwnerId === actorId;
  const isAssignedToJob =
    job.primaryOwnerId === actorId || job.assignments.some((assignment) => assignment.userId === actorId);

  const isDirectDeleteAllowed = isOwner || (isManager && isAssignedToJob);
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
    await db.chaJob.update({
      where: { id: job.id },
      data: {
        jobNumber: buildArchivedChaJobNumber(job.jobNumber, job.id),
        deletedAt: new Date(),
        deletedById: actorId,
        status: "CANCELLED",
      },
    });

    const actorTypeRemarks = isOwner ? "job owner" : "manager";

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
        ...input.metadata,
      },
    });

    return { mode: "deleted" as const };
  }

  const assignedManager = getAssignedDeletionManager(job);

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
      remarks: "Deletion request blocked because no approval manager is assigned to the job.",
      metadata: {
        actorRoleNames,
        ...input.metadata,
      },
    });
    throw new Error("No approval manager is assigned to this CHA job. Assign a manager before requesting deletion.");
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
        assignedManagerId: assignedManager.userId,
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
          assignedManagerId: assignedManager.userId,
          remarks: `Deletion requested by ${actor.name}.`,
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
    remarks: `Deletion request submitted for manager ${assignedManager.user?.name ?? assignedManager.userId}.`,
    metadata: {
      actorRoleNames,
      requesterId: actorId,
      assignedManagerId: assignedManager.userId,
      approvalRequestId: request.id,
      ...input.metadata,
    },
  });

  await createNotification({
    userId: assignedManager.userId,
    orgId,
    kind: "CHA_JOB_DELETION_REQUESTED",
    title: `Delete Job Approval Needed: ${job.jobNumber}`,
    body: `${actor.name} requested deletion for CHA job ${job.jobNumber}. Review the request before it is executed.`,
    link: `/cha/jobs/${job.id}`,
    priority: "important",
  });

  await db.todoTask.create({
    data: {
      userId: assignedManager.userId,
      orgId,
      title: `Review delete request for Job ${job.jobNumber}`,
      description: `Approve or reject the deletion request raised by ${actor.name} for CHA job ${job.jobNumber}.`,
      status: "PENDING",
    },
  });

  return { mode: "pending" as const, requestId: request.id, assignedManagerId: assignedManager.userId };
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
  const canApproveDelete = await can(actorId, "cha.job.delete.approve");
  if (!canApproveDelete) {
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

  let result;
  try {
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

        const assignedManager = getAssignedDeletionManager(request.job);
        if (!assignedManager || assignedManager.userId !== actorId) {
          throw new Error("The assigned approval manager on the CHA job has changed. Create a fresh deletion request.");
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
  const [usersWithPermission, usersWithRoles] = await Promise.all([
    getUsersWithPermission(orgId, "cha.checklist.internal_approve"),
    db.user.findMany({
      where: {
        orgId,
        active: true,
        roles: {
          some: {
            role: {
              name: {
                in: ["Admin", "Management", "Manager", "Director"],
              },
            },
          },
        },
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

  return result;
}

// ─── Configurable Filing Workflow blueprint services ────────────────────────

const DEFAULT_WORKFLOW_ROLES = ["Admin", "Manager", "Employee"] as const;

function buildDefaultWorkflowNode(input: {
  key: string;
  name: string;
  description: string;
  sectionKey: string;
  sectionName: string;
  branchKey?: string | null;
  branchName?: string | null;
  sortOrder: number;
  isStart?: boolean;
}) {
  return {
    key: input.key,
    name: input.name,
    description: input.description,
    category: input.branchName ? `${input.sectionName} / ${input.branchName}` : input.sectionName,
    nodeType: "CHECKLIST_NODE",
    sectionKey: input.sectionKey,
    sectionName: input.sectionName,
    branchKey: input.branchKey ?? null,
    branchName: input.branchName ?? null,
    sortOrder: input.sortOrder,
    isStart: input.isStart ?? false,
    positionX: 120,
    positionY: 120 + (input.sortOrder - 1) * 180,
    allowedRoles: [...DEFAULT_WORKFLOW_ROLES],
    approvalRequired: false,
    approvalRoles: [] as string[],
    checklistItems: [input.name],
  };
}

const DEFAULT_FILING_WORKFLOW_SEED = {
  nodes: [
    buildDefaultWorkflowNode({
      key: "first_check_bill_of_entry",
      name: "Bill of Entry",
      description: "Verify bill of entry readiness before customs processing begins.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 1,
      isStart: true,
    }),
    buildDefaultWorkflowNode({
      key: "first_check_goods_registration",
      name: "Goods Registration",
      description: "Register goods in the filing sequence.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 2,
    }),
    buildDefaultWorkflowNode({
      key: "first_check_examination",
      name: "Examination",
      description: "Complete the examination checkpoint.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 3,
    }),
    buildDefaultWorkflowNode({
      key: "first_check_ce",
      name: "CE",
      description: "Handle CE verification as its own workflow node.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 4,
    }),
    buildDefaultWorkflowNode({
      key: "first_check_group_forward",
      name: "Group Forward",
      description: "Advance the filing through the group-forward checkpoint.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 5,
    }),
    buildDefaultWorkflowNode({
      key: "first_check_assessment",
      name: "Assessment",
      description: "Assessment must be completed as a standalone workflow node.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 6,
    }),
    buildDefaultWorkflowNode({
      key: "first_check_duty",
      name: "Duty",
      description: "Review duty obligations before proceeding.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 7,
    }),
    buildDefaultWorkflowNode({
      key: "first_check_ooc",
      name: "OOC",
      description: "Out of Charge confirmation for the first-check path.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 8,
    }),
    buildDefaultWorkflowNode({
      key: "first_check_delivery",
      name: "Delivery",
      description: "Delivery closes the first-check vertical sequence.",
      sectionKey: "first_check",
      sectionName: "First Check",
      sortOrder: 9,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_rms_goods_registration",
      name: "Goods Registration",
      description: "RMS branch goods registration step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "rms",
      branchName: "RMS",
      sortOrder: 10,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_rms_duty",
      name: "Duty",
      description: "RMS branch duty step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "rms",
      branchName: "RMS",
      sortOrder: 11,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_rms_assessment",
      name: "Assessment",
      description: "RMS branch assessment step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "rms",
      branchName: "RMS",
      sortOrder: 12,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_rms_ooc",
      name: "OOC",
      description: "RMS branch OOC step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "rms",
      branchName: "RMS",
      sortOrder: 13,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_rms_delivery",
      name: "Delivery",
      description: "RMS branch delivery step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "rms",
      branchName: "RMS",
      sortOrder: 14,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_assessment",
      name: "Assessment",
      description: "Open Bill branch assessment step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 15,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_goods_registration",
      name: "Goods Registration",
      description: "Open Bill branch goods registration step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 16,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_examination",
      name: "Examination",
      description: "Open Bill branch examination step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 17,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_duty",
      name: "Duty",
      description: "Open Bill branch duty step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 18,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_ooc",
      name: "OOC",
      description: "Open Bill branch OOC step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 19,
    }),
    buildDefaultWorkflowNode({
      key: "second_check_open_bill_delivery",
      name: "Delivery",
      description: "Open Bill branch delivery step.",
      sectionKey: "second_check",
      sectionName: "Second Check",
      branchKey: "open_bill",
      branchName: "Open Bill",
      sortOrder: 20,
    }),
    buildDefaultWorkflowNode({
      key: "amendment",
      name: "Amendment",
      description: "Configurable amendment step that can be reached from either branch or via added reconnections.",
      sectionKey: "amendment",
      sectionName: "Amendment",
      sortOrder: 21,
    }),
  ],
  edges: [
    { sourceKey: "first_check_bill_of_entry", targetKey: "first_check_goods_registration" },
    { sourceKey: "first_check_goods_registration", targetKey: "first_check_examination" },
    { sourceKey: "first_check_examination", targetKey: "first_check_ce" },
    { sourceKey: "first_check_ce", targetKey: "first_check_group_forward" },
    { sourceKey: "first_check_group_forward", targetKey: "first_check_assessment" },
    { sourceKey: "first_check_assessment", targetKey: "first_check_duty" },
    { sourceKey: "first_check_duty", targetKey: "first_check_ooc" },
    { sourceKey: "first_check_ooc", targetKey: "first_check_delivery" },
    { sourceKey: "first_check_delivery", targetKey: "second_check_rms_goods_registration", label: "RMS Path" },
    { sourceKey: "first_check_delivery", targetKey: "second_check_open_bill_assessment", label: "Open Bill Path" },
    { sourceKey: "second_check_rms_goods_registration", targetKey: "second_check_rms_duty" },
    { sourceKey: "second_check_rms_duty", targetKey: "second_check_rms_assessment" },
    { sourceKey: "second_check_rms_assessment", targetKey: "second_check_rms_ooc" },
    { sourceKey: "second_check_rms_ooc", targetKey: "second_check_rms_delivery" },
    { sourceKey: "second_check_rms_delivery", targetKey: "amendment" },
    { sourceKey: "second_check_open_bill_assessment", targetKey: "second_check_open_bill_goods_registration" },
    { sourceKey: "second_check_open_bill_goods_registration", targetKey: "second_check_open_bill_examination" },
    { sourceKey: "second_check_open_bill_examination", targetKey: "second_check_open_bill_duty" },
    { sourceKey: "second_check_open_bill_duty", targetKey: "second_check_open_bill_ooc" },
    { sourceKey: "second_check_open_bill_ooc", targetKey: "second_check_open_bill_delivery" },
    { sourceKey: "second_check_open_bill_delivery", targetKey: "amendment" },
  ],
} as const;

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
    if (!node.name || !String(node.name).trim()) {
      errors.push(`Node "${node.key || "untitled"}" must have a name.`);
    }
    const checklistItems = (node.checklistItems || []).filter((item: any) => item.isActive !== false);
    if ((node.nodeType ?? "CHECKLIST_NODE") === "CHECKLIST_NODE" && checklistItems.length === 0) {
      errors.push(`Checklist node "${node.name || node.key}" must have at least one active checklist item.`);
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
  const existingCount = await db.filingWorkflowTemplate.count({ where: { orgId } });
  if (existingCount > 0) return;

  const firstUser = await db.user.findFirst({ where: { orgId } });
  const createdById = firstUser?.id || "system";

  await db.$transaction(async (tx) => {
    const template = await tx.filingWorkflowTemplate.create({
      data: {
        orgId,
        name: "Default Filing Workflow",
        description: "Default configurable filing workflow with First Check, Second Check branches, and Amendment routing.",
        isActive: true,
      },
    });

    const version = await tx.filingWorkflowVersion.create({
      data: {
        templateId: template.id,
        versionNumber: 1,
        isPublished: true,
        isActive: true,
        createdById,
      },
    });

    for (const [nodeIndex, node] of DEFAULT_FILING_WORKFLOW_SEED.nodes.entries()) {
      const createdNode = await tx.filingWorkflowNode.create({
        data: {
          versionId: version.id,
          key: node.key,
          name: node.name,
          description: node.description,
          category: node.category,
          nodeType: node.nodeType,
          sectionKey: node.sectionKey,
          sectionName: node.sectionName,
          branchKey: node.branchKey,
          branchName: node.branchName,
          sortOrder: node.sortOrder,
          isActive: true,
          isStart: node.isStart,
          positionX: node.positionX,
          positionY: node.positionY,
          slaDuration: 2,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: false,
          canBeRevisited: true,
          approvalRequired: false,
          approvalRoles: [],
          requireAllMandatoryChecklistItems: true,
          requireMandatoryPhotos: false,
          allowedRoles: [...node.allowedRoles],
        },
      });

      if (node.checklistItems.length > 0) {
        await tx.filingChecklistItem.createMany({
          data: node.checklistItems.map((label, checklistIndex) => ({
            nodeId: createdNode.id,
            label,
            description: null,
            isMandatory: true,
            requiresRemarks: false,
            allowsUpload: false,
            minUploads: 0,
            maxUploads: null,
            acceptedFileTypes: [],
            deadlineDuration: 2,
            deadlineUnit: "BUSINESS_DAYS",
            delayRemarksRequired: true,
            hasPhotoRequirement: false,
            sortOrder: checklistIndex + 1,
            isActive: true,
          })),
        });
      }

      if (nodeIndex === 0) {
        await tx.filingPhotoRequirement.createMany({
          data: [
            {
              nodeId: createdNode.id,
              label: "Filed Document Set",
              description: null,
              isMandatory: false,
              minPhotos: 0,
              maxPhotos: null,
              acceptedFileTypes: ["image/jpeg", "image/png", "application/pdf"],
              isVisibleInTimeline: true,
            },
          ],
        });
      }
    }

    await tx.filingWorkflowEdge.createMany({
      data: DEFAULT_FILING_WORKFLOW_SEED.edges.map((edge) => ({
        versionId: version.id,
        sourceKey: edge.sourceKey,
        targetKey: edge.targetKey,
        label: "label" in edge ? edge.label ?? null : null,
      })),
    });
  }, { timeout: 20000 });
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
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
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
      versions: {
        orderBy: { versionNumber: "desc" },
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
        name: data.name,
        description: data.description,
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

  return draftVersion;
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
    },
  },
  responses: {
    include: { checklistItem: true },
  },
  attachments: {
    include: { photoRequirement: true, checklistItem: true, uploadedBy: { select: { name: true } } },
  },
} as const;

export async function getFilingWorkflowInstance(orgId: string, jobId: string): Promise<any> {
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

  // Fire-and-forget: mark overdue items without blocking the response
  syncOverdueFilingItems(orgId, jobId).catch(() => {});

  const activeNodeRun = instance.nodeRuns.find((run) => run.status === "ACTIVE") ?? null;
  const overdueItems = instance.responses
    .filter((response) => response.nodeRunId === activeNodeRun?.id && !response.isChecked && response.dueAt && response.dueAt.getTime() < now.getTime())
    .map((response) => ({
      checklistItemId: response.checklistItemId,
      label: response.checklistItem.label,
      dueAt: response.dueAt,
      daysDelayed: Math.max(1, countBusinessDaysSince(response.dueAt!, now, holidayIsoSet)),
      delayRemarks: response.delayRemarks,
      delayRemarkedAt: response.delayRemarkedAt,
    }));

  return {
    ...instance,
    activeNodeRun,
    overdueItems,
    overdueCount: overdueItems.length,
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

  let activeVersion = (await db.filingWorkflowVersion.findMany({
    where: {
      template: {
        orgId,
        OR: [
          { clearanceTypeId: job.jobTypeId },
          { clearanceTypeId: null },
        ],
      },
      isActive: true,
      isPublished: true,
    },
    include: {
      template: {
        include: {
          clearanceType: {
            select: { id: true, name: true },
          },
        },
      },
      nodes: {
        include: {
          checklistItems: true,
        },
      },
    },
    orderBy: [{ versionNumber: "desc" }],
  })).sort((left, right) => {
    const leftScoped = left.template.clearanceTypeId === job.jobTypeId ? 1 : 0;
    const rightScoped = right.template.clearanceTypeId === job.jobTypeId ? 1 : 0;
    return rightScoped - leftScoped;
  })[0];

  if (!activeVersion) {
    await ensureDefaultFilingWorkflows(orgId);
    activeVersion = (await db.filingWorkflowVersion.findMany({
      where: {
        template: {
          orgId,
          OR: [
            { clearanceTypeId: job.jobTypeId },
            { clearanceTypeId: null },
          ],
        },
        isActive: true,
        isPublished: true,
      },
      include: {
        template: {
          include: {
            clearanceType: {
              select: { id: true, name: true },
            },
          },
        },
        nodes: {
          include: {
            checklistItems: true,
          },
        },
      },
      orderBy: [{ versionNumber: "desc" }],
    })).sort((left, right) => {
      const leftScoped = left.template.clearanceTypeId === job.jobTypeId ? 1 : 0;
      const rightScoped = right.template.clearanceTypeId === job.jobTypeId ? 1 : 0;
      return rightScoped - leftScoped;
    })[0] ?? null;
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
    checklistItemResponses: {
      checklistItemId: string;
      isChecked: boolean;
      remarks?: string;
      fileKey?: string;
      delayRemarks?: string;
    }[];
    nextNodeKey?: string | null;
  }
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

  await assertCanAccessFiling(userId, job);

  return db.$transaction(async (tx) => {
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
      },
    });

    const nextNodeKey = data.nextNodeKey;

    if (nextNodeKey) {
      const allowedEdges = instance.version.edges.filter(
        (e) => e.sourceKey === node.key && e.targetKey === nextNodeKey
      );
      if (allowedEdges.length === 0) {
        throw new Error(`Invalid Transition: No edge exists between "${node.name}" and node key "${nextNodeKey}".`);
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
          remarks: `Transition from "${node.name}" to "${targetNode.name}". ${isDoubleBack ? "Double-back run." : ""}`,
        },
      });

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
  return db.filingSection49Flag.findUnique({
    where: { jobId },
  });
}

export async function uploadFilingAttachment(
  actorId: string,
  orgId: string,
  jobId: string,
  nodeRunId: string,
  photoRequirementId: string | null,
  checklistItemId: string | null,
  fileData: { fileName: string; mimeType: string; sizeBytes: number },
  fileBuffer?: Buffer
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

  const instance = await db.filingWorkflowInstance.findUniqueOrThrow({
    where: { jobId },
  });

  const nodeRun = await db.filingNodeRun.findFirst({
    where: {
      id: nodeRunId,
      instanceId: instance.id,
    },
    select: { id: true },
  });

  if (!nodeRun) {
    throw new Error("Filing workflow step not found for this job.");
  }

  const profile = await db.jobWorkspaceProfile.findUnique({
    where: { jobId },
  });

  let driveFolderId = "root";
  if (profile) {
    const categoryFolders = (profile.categoryFolders as Record<string, string>) || {};
    driveFolderId = categoryFolders["03 Filing Documents"] || categoryFolders["02 Job Documents"] || profile.rootFolderId || "root";
  }

  let fileKey = `https://drive.google.com/file/d/mock-uploaded-${Math.random().toString(36).substring(7)}/view`;

  if (fileBuffer && process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL) {
    try {
      const uploadResult = await driveClient.uploadFile({
        name: fileData.fileName,
        mimeType: fileData.mimeType,
        parentFolderId: driveFolderId,
        fileBuffer,
      });
      fileKey = uploadResult.webViewLink;
    } catch (err: any) {
      console.warn("[Upload] Google Drive upload failed for Filing. Falling back to mock URL. Error:", err.message || err);
    }
  }

  const attachment = await db.filingAttachment.create({
    data: {
      instanceId: instance.id,
      nodeRunId,
      photoRequirementId,
      checklistItemId,
      fileKey,
      fileName: fileData.fileName,
      fileSize: fileData.sizeBytes,
      fileType: fileData.mimeType,
      uploadedById: actorId,
    },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "FilingAttachment",
    entityId: attachment.id,
    event: checklistItemId ? "FILING_CHECKLIST_FILE_UPLOADED" : "FILING_PHOTO_UPLOADED",
    actorId,
    remarks: `Uploaded file: ${fileData.fileName} for node run ${nodeRunId}`,
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
