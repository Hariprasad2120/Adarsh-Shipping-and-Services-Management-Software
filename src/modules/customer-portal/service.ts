import { compare } from "bcryptjs";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { sendEmail } from "@/lib/email";
import { can, ForbiddenError } from "@/lib/rbac";
import type { Prisma } from "@/generated/prisma/client";
import { getFilingWorkflowInstance } from "@/modules/cha/service";
import {
  buildPortalLink,
  clearPortalSessionCookie,
  createPortalSession,
  getPortalRequestMeta,
  getPortalSessionToken,
  hashPortalPassword,
  hashPortalToken,
  recordPortalAuthAudit,
  revokeAllPortalSessions,
  revokePortalSession,
  setPortalSessionCookie,
  shouldLockPortalAccount,
} from "./auth";

const PORTAL_INVITE_EXPIRY_HOURS = Number(process.env.CUSTOMER_PORTAL_INVITE_EXPIRY_HOURS ?? 48);
const PORTAL_RESET_EXPIRY_HOURS = Number(process.env.CUSTOMER_PORTAL_RESET_EXPIRY_HOURS ?? 2);
const PORTAL_ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const PORTAL_MAX_FILE_SIZE = 10 * 1024 * 1024;
const CUSTOMER_PORTAL_DEFAULT_PASSWORD =
  process.env.CUSTOMER_PORTAL_DEFAULT_PASSWORD?.trim() || "Password@123";
const PORTAL_GENERIC_UPLOAD_CATEGORY = "CUSTOMER_UPLOAD";

type PortalShipmentListFilters = {
  scope?: "active" | "action" | "completed" | "all";
  search?: string;
};

const PORTAL_PROGRESS_STAGES = [
  {
    id: "document",
    key: "DOCUMENT_COLLECTION",
    label: "Document",
    description: "Shipment is waiting for customer documents and document intake checks.",
    sortOrder: 1,
  },
  {
    id: "additional-data",
    key: "ADDITIONAL_DATA",
    label: "Additional Data",
    description: "Operational data is being verified before checklist preparation.",
    sortOrder: 2,
  },
  {
    id: "checklist",
    key: "CHECKLIST",
    description: "Checklist preparation and customer approval are in progress.",
    label: "Checklist",
    sortOrder: 3,
  },
  {
    id: "filing",
    key: "FILING",
    label: "Filing",
    description: "Filing and final clearance work are in progress or completed.",
    sortOrder: 4,
  },
] as const;

function mapChaStageToPortalProgressKey(stage: string, status?: string) {
  if (status === "COMPLETED" || stage === "FILED") {
    return "FILING";
  }
  switch (stage) {
    case "DOCUMENT_COLLECTION":
      return "DOCUMENT_COLLECTION";
    case "ADDITIONAL_DATA":
      return "ADDITIONAL_DATA";
    case "CHECKLIST_PREPARATION":
    case "CHECKLIST_APPROVAL":
      return "CHECKLIST";
    case "FILING":
    case "FILED":
      return "FILING";
    default:
      return "DOCUMENT_COLLECTION";
  }
}

type PortalWorkflowStageState =
  | "COMPLETED"
  | "IN_PROGRESS"
  | "LOCKED"
  | "WAITING_FOR_CUSTOMER"
  | "BLOCKED"
  | "OVERDUE"
  | "SKIPPED";

type PortalWorkflowStageDto = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  state: PortalWorkflowStageState;
  completedAt: string | null;
  completedBy: string | null;
  startedAt: string | null;
  dueAt: string | null;
  overdueBusinessDays: number;
  customerVisible: boolean;
  nextStageIds: string[];
  sortOrder: number;
};

type PortalStageFieldDto = {
  key: string;
  label: string;
  type: string;
  value: unknown;
};

type PortalWorkflowSummaryDto = {
  stages: PortalWorkflowStageDto[];
  currentStage: PortalWorkflowStageDto | null;
  nextStageIds: string[];
  progressPercent: number;
  currentStageFields: PortalStageFieldDto[];
};

type PortalActionFlags = ReturnType<typeof getActionRequiredFlags>;

type PortalFieldDefinition = {
  key: string;
  label: string;
  type: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function businessDaysLate(dueAt: Date | null, now: Date) {
  if (!dueAt || dueAt.getTime() >= now.getTime()) return 0;
  return Math.max(1, Math.ceil((now.getTime() - dueAt.getTime()) / (24 * 60 * 60 * 1000)));
}

function normalizePortalFieldDefinitions(value: unknown): PortalFieldDefinition[] {
  return asArray(value)
    .map((entry, index) => {
      const record = asObject(entry);
      if (!record) return null;
      return {
        key: asString(record.key) ?? `field_${index + 1}`,
        label: asString(record.label) ?? `Field ${index + 1}`,
        type: asString(record.type)?.toUpperCase() ?? "TEXT",
      };
    })
    .filter((entry): entry is PortalFieldDefinition => entry !== null);
}

function normalizeWorkflowStageLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildLegacyWorkflowSummary(
  job: { stage: string; status: string },
) {
  const sortedStages = PORTAL_PROGRESS_STAGES.map((stage) => ({
    id: stage.id,
    internalStageKey: stage.key,
    label: stage.label,
    description: stage.description,
    sortOrder: stage.sortOrder,
  }));
  const currentStageIndex = Math.max(
    sortedStages.findIndex((stage) => stage.internalStageKey === mapChaStageToPortalProgressKey(job.stage, job.status)),
    0,
  );
  const currentStageKey =
    sortedStages[currentStageIndex]?.internalStageKey ?? mapChaStageToPortalProgressKey(job.stage, job.status);
  const isCompleted = job.status === "COMPLETED" || job.stage === "FILED";
  const stages: PortalWorkflowStageDto[] = sortedStages.map((stage, index) => ({
    id: stage.id,
    key: stage.internalStageKey,
    label: stage.label,
    description: stage.description,
    state:
      isCompleted || index < currentStageIndex
        ? "COMPLETED"
        : index === currentStageIndex
          ? "IN_PROGRESS"
          : "LOCKED",
    completedAt: null,
    completedBy: null,
    startedAt: null,
    dueAt: null,
    overdueBusinessDays: 0,
    customerVisible: true,
    nextStageIds: index < sortedStages.length - 1 ? [sortedStages[index + 1]!.internalStageKey] : [],
    sortOrder: stage.sortOrder,
  }));
  const completedCount = stages.filter((stage) => stage.state === "COMPLETED").length;
  return {
    stages,
    currentStage: stages.find((stage) => stage.key === currentStageKey) ?? stages[0] ?? null,
    nextStageIds: stages.find((stage) => stage.key === currentStageKey)?.nextStageIds ?? [],
    progressPercent: stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0,
    currentStageFields: [] as PortalStageFieldDto[],
  } satisfies PortalWorkflowSummaryDto;
}

function buildWorkflowSummaryFromInstance(
  workflow: unknown,
  actions: PortalActionFlags,
  now: Date,
): PortalWorkflowSummaryDto | null {
  const workflowRecord = asObject(workflow);
  const versionRecord = asObject(workflowRecord?.version);
  if (!workflowRecord || !versionRecord) {
    return null;
  }

  const nodes = asArray(versionRecord.nodes)
    .map((entry, index) => {
      const node = asObject(entry);
      if (!node || !asBoolean(node.isActive) && node.isActive !== undefined) return null;
      const key = asString(node.key);
      if (!key) return null;
      return {
        id: asString(node.id) ?? key,
        key,
        label: asString(node.name) ?? normalizeWorkflowStageLabel(key),
        description: asString(node.description),
        nodeType: asString(node.nodeType)?.toUpperCase() ?? "CHECKLIST_NODE",
        sortOrder: typeof node.sortOrder === "number" ? node.sortOrder : index + 1,
        fieldDefinitions: normalizePortalFieldDefinitions(node.fieldDefinitionsJson),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const edges = asArray(versionRecord.edges)
    .map((entry) => {
      const edge = asObject(entry);
      const sourceKey = asString(edge?.sourceKey);
      const targetKey = asString(edge?.targetKey);
      if (!sourceKey || !targetKey) return null;
      return { sourceKey, targetKey };
    })
    .filter((entry): entry is { sourceKey: string; targetKey: string } => entry !== null);

  const nodeRuns = asArray(workflowRecord.nodeRuns)
    .map((entry) => {
      const nodeRun = asObject(entry);
      if (!nodeRun) return null;
      const completedBy = asObject(nodeRun?.completedBy);
      const status = asString(nodeRun?.status)?.toUpperCase();
      const nodeKey = asString(nodeRun?.nodeKey);
      if (!status || !nodeKey) return null;
      return {
        id: asString(nodeRun.id) ?? `${nodeKey}:${status}`,
        nodeKey,
        status,
        startedAt: asDate(nodeRun.startedAt),
        completedAt: asDate(nodeRun.completedAt),
        dueAt: asDate(nodeRun.slaDueDate),
        completedBy: asString(completedBy?.name),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const fieldValues = asArray(workflowRecord.fieldValues)
    .map((entry) => {
      const fieldValue = asObject(entry);
      const nodeId = asString(fieldValue?.nodeId);
      const fieldKey = asString(fieldValue?.fieldKey);
      if (!nodeId || !fieldKey) return null;
      return {
        nodeId,
        fieldKey,
        value: fieldValue?.valueJson ?? null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const activeNodeRun = asObject(workflowRecord.activeNodeRun);
  const activeNodeKey = asString(activeNodeRun?.nodeKey) ?? asString(workflowRecord.currentNodeKey);
  const activeRunId = asString(activeNodeRun?.id);
  const activeDueAt = asDate(activeNodeRun?.slaDueDate);
  const activePrerequisiteBlocked = asBoolean(asObject(workflowRecord.activeNodePrerequisiteStatus)?.isBlocked);
  const pendingBlockedStageKey = asString(asObject(workflowRecord.pendingBlockedStage)?.nodeKey);
  const completedByNodeKey = new Map(
    nodeRuns.filter((run) => run.status === "COMPLETED").map((run) => [run.nodeKey, run]),
  );
  const cancelledNodeKeys = new Set(nodeRuns.filter((run) => run.status === "CANCELLED").map((run) => run.nodeKey));
  const fieldValuesByNodeAndKey = new Map(fieldValues.map((entry) => [`${entry.nodeId}:${entry.fieldKey}`, entry.value]));
  const visibleNodes = nodes.filter((node) => node.nodeType !== "START");

  const stages = visibleNodes.map((node) => {
    const completedRun = completedByNodeKey.get(node.key) ?? null;
    const isActive = activeNodeKey === node.key;
    const waitingForCustomer =
      isActive &&
      (actions.pendingDocumentCount > 0 || actions.checklistPending || actions.openQueryCount > 0);
    const isBlocked = isActive && (activePrerequisiteBlocked || pendingBlockedStageKey === node.key);
    const isOverdue = isActive && !!activeDueAt && activeDueAt.getTime() < now.getTime();
    const state: PortalWorkflowStageState = completedRun
      ? "COMPLETED"
      : isBlocked
        ? "BLOCKED"
        : waitingForCustomer
          ? "WAITING_FOR_CUSTOMER"
          : isOverdue
            ? "OVERDUE"
            : isActive
              ? "IN_PROGRESS"
              : cancelledNodeKeys.has(node.key)
                ? "SKIPPED"
                : "LOCKED";

    return {
      id: node.id,
      key: node.key,
      label: node.label,
      description: node.description,
      state,
      completedAt: toIsoString(completedRun?.completedAt ?? null),
      completedBy: completedRun?.completedBy ?? null,
      startedAt: toIsoString(isActive ? asDate(activeNodeRun?.startedAt) : completedRun?.startedAt ?? null),
      dueAt: toIsoString(isActive ? activeDueAt : null),
      overdueBusinessDays: isOverdue ? businessDaysLate(activeDueAt, now) : 0,
      customerVisible: true,
      nextStageIds: edges.filter((edge) => edge.sourceKey === node.key).map((edge) => edge.targetKey),
      sortOrder: node.sortOrder,
    } satisfies PortalWorkflowStageDto;
  });

  const currentStage =
    stages.find((stage) => stage.key === activeNodeKey) ??
    stages.find((stage) => stage.state !== "COMPLETED") ??
    stages.at(-1) ??
    null;
  const completedCount = stages.filter((stage) => stage.state === "COMPLETED" || stage.state === "SKIPPED").length;
  const currentNode = visibleNodes.find((node) => node.key === currentStage?.key) ?? null;
  const currentStageFields =
    currentNode?.fieldDefinitions.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      value: fieldValuesByNodeAndKey.get(`${currentNode.id}:${field.key}`) ?? null,
    })) ?? [];

  return {
    stages,
    currentStage,
    nextStageIds: currentStage?.nextStageIds ?? [],
    progressPercent: stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0,
    currentStageFields,
  };
}

const DEFAULT_STAGE_MAPPINGS = [
  { internalStageKey: "DOCUMENT_COLLECTION", label: "Documents Awaited", description: "Shipment is waiting for customer documents.", sortOrder: 1 },
  { internalStageKey: "ADDITIONAL_DATA", label: "Documents Under Verification", description: "Operational data is being verified before checklist preparation.", sortOrder: 2 },
  { internalStageKey: "CHECKLIST_PREPARATION", label: "Checklist Preparation", description: "The CHA team is preparing the checklist.", sortOrder: 3 },
  { internalStageKey: "CHECKLIST_APPROVAL", label: "Checklist Awaiting Customer Approval", description: "Checklist is ready for customer review.", sortOrder: 4 },
  { internalStageKey: "FILING", label: "Filing Initiated", description: "Shipment is in filing and customs processing.", sortOrder: 5 },
  { internalStageKey: "FILED", label: "Shipment Completed", description: "Shipment workflow is completed.", sortOrder: 6 },
];

const DEFAULT_RATING_CATEGORIES = [
  { key: "overall_service", label: "Overall Service", sortOrder: 1 },
  { key: "communication", label: "Communication", sortOrder: 2 },
  { key: "transparency", label: "Shipment Update Transparency", sortOrder: 3 },
  { key: "documentation_support", label: "Documentation Support", sortOrder: 4 },
  { key: "response_time", label: "Response Time", sortOrder: 5 },
  { key: "timeliness", label: "Timeliness", sortOrder: 6 },
  { key: "issue_resolution", label: "Issue Resolution", sortOrder: 7 },
  { key: "professionalism", label: "Professionalism", sortOrder: 8 },
];

function normalizePortalEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensurePortalConfig(orgId: string) {
  await Promise.all([
    Promise.all(
      DEFAULT_STAGE_MAPPINGS.map((mapping) =>
        db.customerVisibleStageMapping.upsert({
          where: {
            orgId_internalStageKey: {
              orgId,
              internalStageKey: mapping.internalStageKey,
            },
          },
          update: {},
          create: { orgId, ...mapping },
        }),
      ),
    ),
    Promise.all(
      DEFAULT_RATING_CATEGORIES.map((category) =>
        db.shipmentRatingCategory.upsert({
          where: { orgId_key: { orgId, key: category.key } },
          update: {},
          create: { orgId, ...category },
        }),
      ),
    ),
  ]);
}

async function writePortalAudit(input: {
  orgId: string;
  customerId: string;
  portalUserId?: string | null;
  actorUserId?: string | null;
  jobId?: string | null;
  entityType: string;
  entityId: string;
  event: string;
  remarks?: string;
  metadata?: Record<string, unknown>;
}) {
  const { ip, userAgent } = await getPortalRequestMeta();
  await db.customerPortalAuditLog.create({
    data: {
      orgId: input.orgId,
      customerId: input.customerId,
      portalUserId: input.portalUserId ?? undefined,
      actorUserId: input.actorUserId ?? undefined,
      jobId: input.jobId ?? undefined,
      entityType: input.entityType,
      entityId: input.entityId,
      event: input.event,
      remarks: input.remarks,
      ipAddress: ip ?? undefined,
      userAgent: userAgent ?? undefined,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

function buildPortalInvitationHtml(params: { customerName: string; contactName: string; link: string; type: "ACTIVATION" | "PASSWORD_RESET" }) {
  const action = params.type === "ACTIVATION" ? "activate your portal access" : "reset your portal password";
  return [
    `<p>Hello ${params.contactName},</p>`,
    `<p>You have been invited to ${action} for ${params.customerName}.</p>`,
    `<p><a href="${params.link}">${params.link}</a></p>`,
    `<p>If you did not expect this email, you can ignore it.</p>`,
  ].join("");
}

async function issuePortalInvitation(params: {
  portalUserId: string;
  orgId: string;
  customerId: string;
  email: string;
  sentById?: string;
  type: "ACTIVATION" | "PASSWORD_RESET";
}) {
  const token = randomUUID();
  const now = await getNow();
  const expiresAt = new Date(
    now.getTime() +
      (params.type === "ACTIVATION" ? PORTAL_INVITE_EXPIRY_HOURS : PORTAL_RESET_EXPIRY_HOURS) * 60 * 60 * 1000,
  );
  await db.customerPortalInvitation.create({
    data: {
      orgId: params.orgId,
      customerId: params.customerId,
      portalUserId: params.portalUserId,
      type: params.type,
      email: normalizePortalEmail(params.email),
      tokenHash: hashPortalToken(token),
      expiresAt,
      sentById: params.sentById,
    },
  });
  return { token, expiresAt };
}

async function notifyPortalUsers(params: {
  orgId: string;
  customerId: string;
  portalUserIds: string[];
  jobId?: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
}) {
  await db.customerPortalNotification.createMany({
    data: params.portalUserIds.map((portalUserId) => ({
      orgId: params.orgId,
      customerId: params.customerId,
      portalUserId,
      jobId: params.jobId,
      kind: params.kind,
      title: params.title,
      body: params.body,
      link: params.link,
    })),
  });
}

function getActionRequiredFlags(job: {
  documentRequirements: Array<{ isMandatory: boolean; customerSubmissions: Array<{ status: string }> }>;
  checklistWorkflow?: { currentApprovalStage?: string; status?: string } | null;
  customerQueryThreads: Array<{ status: string; requiresCustomerAction: boolean }>;
  shipmentRatings?: Array<{ id: string }>;
  status?: string;
  stage?: string;
}) {
  const documents = job.documentRequirements.filter((requirement) => {
    const submission = requirement.customerSubmissions[0];
    if (!requirement.isMandatory) return false;
    return !submission || ["REJECTED", "REUPLOAD_REQUIRED", "CLARIFICATION_REQUIRED"].includes(submission.status);
  });
  const checklistPending =
    job.checklistWorkflow &&
    job.checklistWorkflow.currentApprovalStage === "CUSTOMER" &&
    ["CUSTOMER_APPROVAL_PENDING", "CUSTOMER_APPROVAL_WAITING_WINDOW"].includes(job.checklistWorkflow.status ?? "");
  const openQueries = job.customerQueryThreads.filter(
    (thread: { status: string; requiresCustomerAction: boolean }) =>
      thread.status !== "CLOSED" && thread.status !== "RESOLVED",
  );
  const ratingPending =
    (job.status === "COMPLETED" || job.stage === "FILED") &&
    (job.shipmentRatings?.length ?? 0) === 0;
  return {
    hasActionRequired:
      documents.length > 0 ||
      checklistPending ||
      openQueries.some((thread) => thread.requiresCustomerAction) ||
      ratingPending,
    pendingDocumentCount: documents.length,
    checklistPending,
    openQueryCount: openQueries.length,
    ratingPending,
  };
}

async function getPortalUserContext(portalUserId: string) {
  const portalUser = await db.customerPortalUser.findUnique({
    where: { id: portalUserId },
    include: {
      customer: true,
      contact: true,
      notificationPreference: true,
    },
  });
  if (!portalUser) {
    throw new Error("Portal user not found.");
  }
  return portalUser;
}

export async function inviteCustomerPortalUser(params: {
  actorUserId: string;
  orgId: string;
  customerId: string;
  contactId: string;
}) {
  const contact = await db.crmContact.findFirst({
    where: {
      id: params.contactId,
      orgId: params.orgId,
      accountId: params.customerId,
      isActive: true,
    },
    include: {
      account: true,
    },
  });
  if (!contact?.account) {
    throw new Error("Customer contact not found.");
  }
  if (!contact.email?.trim()) {
    throw new Error("The selected contact must have a valid email address.");
  }

  const syncResult = await syncCustomerPortalUsersForCrmCustomer({
    actorUserId: params.actorUserId,
    orgId: params.orgId,
    customerId: params.customerId,
  });
  const portalUser = await db.customerPortalUser.findUniqueOrThrow({
    where: {
      orgId_contactId: {
        orgId: params.orgId,
        contactId: params.contactId,
      },
    },
  });
  const link = buildPortalLink("/customer-portal/login");
  await sendEmail({
    to: portalUser.email,
    subject: "Your Monolith customer portal credentials",
    html: [
      `<p>Hello ${portalUser.name},</p>`,
      `<p>Your Monolith customer portal login is ready.</p>`,
      `<p>Email: <strong>${portalUser.email}</strong></p>`,
      `<p>Default password: <strong>${syncResult.defaultPassword}</strong></p>`,
      `<p>Sign in here: <a href="${link}">${link}</a></p>`,
    ].join(""),
    text: `Portal ready. Email: ${portalUser.email}. Default password: ${syncResult.defaultPassword}. Sign in: ${link}`,
  });

  await writePortalAudit({
    orgId: params.orgId,
    customerId: params.customerId,
    portalUserId: portalUser.id,
    actorUserId: params.actorUserId,
    entityType: "CustomerPortalUser",
    entityId: portalUser.id,
    event: "DEFAULT_CREDENTIALS_SENT",
    remarks: `Default portal credentials sent to ${portalUser.email}.`,
  });

  return portalUser;
}

export async function listCustomerPortalUsers(orgId: string, customerId: string) {
  return db.customerPortalUser.findMany({
    where: { orgId, customerId },
    include: {
      contact: true,
      invitations: { orderBy: { createdAt: "desc" }, take: 1 },
      sessions: { where: { status: "ACTIVE" }, orderBy: { lastSeenAt: "desc" }, take: 1 },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
}

async function ensurePrimaryPortalContact(orgId: string, customerId: string) {
  const existing = await db.crmContact.findFirst({
    where: {
      orgId,
      accountId: customerId,
      isActive: true,
      email: { not: null },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  if (existing?.email?.trim()) {
    return existing;
  }

  const account = await db.crmAccount.findFirst({
    where: { id: customerId, orgId },
  });
  if (!account?.email?.trim()) {
    return null;
  }

  const created = await db.crmContact.create({
    data: {
      orgId,
      ownerId: account.ownerId,
      accountId: account.id,
      firstName: account.firstName || null,
      lastName: account.lastName || account.name,
      email: normalizePortalEmail(account.email),
      phone: account.phone || null,
      designation: account.customerSubType === "Business" ? "Customer Contact" : null,
      isPrimary: true,
      isActive: true,
      createdById: account.updatedById || account.createdById,
      updatedById: account.updatedById || account.createdById,
    },
  });

  return created;
}

export async function syncCustomerPortalUsersForCrmCustomer(params: {
  actorUserId: string;
  orgId: string;
  customerId: string;
}) {
  await ensurePortalConfig(params.orgId);

  const account = await db.crmAccount.findFirst({
    where: { id: params.customerId, orgId: params.orgId },
    include: {
      contacts: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!account) {
    throw new Error("Customer account not found.");
  }

  if (!account.isPortalEnabled) {
    const now = await getNow();
    await db.customerPortalUser.updateMany({
      where: { orgId: params.orgId, customerId: params.customerId },
      data: {
        status: "SUSPENDED",
        suspendedAt: now,
        suspendedReason: "Portal disabled from CRM customer master",
        updatedById: params.actorUserId,
      },
    });
    await db.customerPortalSession.updateMany({
      where: {
        orgId: params.orgId,
        customerId: params.customerId,
        status: "ACTIVE",
      },
      data: { status: "REVOKED", revokedAt: now, revokeReason: "CUSTOMER_PORTAL_DISABLED" },
    });
    return { provisioned: 0, suspended: true };
  }

  const contactSeed = await ensurePrimaryPortalContact(params.orgId, params.customerId);
  const contacts = (contactSeed ? [contactSeed, ...account.contacts.filter((contact) => contact.id !== contactSeed.id)] : account.contacts)
    .filter((contact) => typeof contact.email === "string" && contact.email.trim().length > 0);

  if (contacts.length === 0) {
    throw new Error("Portal-enabled customers must have at least one CRM contact email.");
  }

  const passwordHash = await hashPortalPassword(CUSTOMER_PORTAL_DEFAULT_PASSWORD);
  const now = await getNow();
  let provisioned = 0;

  for (const contact of contacts) {
    const email = normalizePortalEmail(contact.email!);
    await db.customerPortalUser.upsert({
      where: {
        orgId_contactId: {
          orgId: params.orgId,
          contactId: contact.id,
        },
      },
      update: {
        customerId: params.customerId,
        email,
        name: [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || account.name,
        designation: contact.designation ?? undefined,
        status: "ACTIVE",
        passwordHash,
        invitedAt: now,
        activatedAt: now,
        emailVerifiedAt: now,
        lastPasswordChangedAt: now,
        failedLoginCount: 0,
        lockedUntil: null,
        suspendedAt: null,
        suspendedReason: null,
        revokedAt: null,
        revokedReason: null,
        updatedById: params.actorUserId,
      },
      create: {
        orgId: params.orgId,
        customerId: params.customerId,
        contactId: contact.id,
        email,
        name: [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || account.name,
        designation: contact.designation ?? undefined,
        status: "ACTIVE",
        passwordHash,
        invitedAt: now,
        activatedAt: now,
        emailVerifiedAt: now,
        lastPasswordChangedAt: now,
        createdById: params.actorUserId,
        updatedById: params.actorUserId,
      },
    });

    const portalUser = await db.customerPortalUser.findUniqueOrThrow({
      where: {
        orgId_contactId: {
          orgId: params.orgId,
          contactId: contact.id,
        },
      },
      select: { id: true },
    });

    await db.customerPortalNotificationPreference.upsert({
      where: { portalUserId: portalUser.id },
      update: {},
      create: {
        orgId: params.orgId,
        customerId: params.customerId,
        portalUserId: portalUser.id,
      },
    });

    await writePortalAudit({
      orgId: params.orgId,
      customerId: params.customerId,
      portalUserId: portalUser.id,
      actorUserId: params.actorUserId,
      entityType: "CustomerPortalUser",
      entityId: portalUser.id,
      event: "CRM_PORTAL_SYNCED",
      remarks: `Portal credentials synced from CRM contact ${email}.`,
      metadata: { emailSource: "CRM_CONTACT", defaultPasswordApplied: true },
    });

    provisioned += 1;
  }

  return { provisioned, suspended: false, defaultPassword: CUSTOMER_PORTAL_DEFAULT_PASSWORD };
}

export async function activateCustomerPortalAccount(token: string, password: string) {
  const invitation = await db.customerPortalInvitation.findUnique({
    where: { tokenHash: hashPortalToken(token) },
    include: { portalUser: { include: { customer: true } } },
  });
  const now = await getNow();
  if (!invitation || invitation.type !== "ACTIVATION" || invitation.consumedAt || invitation.revokedAt || invitation.expiresAt < now) {
    throw new Error("This activation link is invalid or has expired.");
  }

  const passwordHash = await hashPortalPassword(password);
  await db.$transaction(async (tx) => {
    await tx.customerPortalUser.update({
      where: { id: invitation.portalUserId },
      data: {
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: now,
        activatedAt: now,
        lastPasswordChangedAt: now,
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: now,
      },
    });
    await tx.customerPortalInvitation.update({
      where: { id: invitation.id },
      data: { consumedAt: now },
    });
    await tx.customerPortalNotificationPreference.upsert({
      where: { portalUserId: invitation.portalUserId },
      update: {},
      create: {
        orgId: invitation.orgId,
        customerId: invitation.customerId,
        portalUserId: invitation.portalUserId,
      },
    });
  });

  await recordPortalAuthAudit({
    orgId: invitation.orgId,
    customerId: invitation.customerId,
    portalUserId: invitation.portalUserId,
    event: "ACCOUNT_ACTIVATED",
    remarks: `Portal access activated for ${invitation.portalUser.email}.`,
  });

  return invitation.portalUser;
}

export async function loginCustomerPortal(email: string, password: string) {
  const normalizedEmail = normalizePortalEmail(email);
  const portalUser = await db.customerPortalUser.findFirst({
    where: { email: normalizedEmail },
    include: { customer: true },
  });
  const { ip, userAgent } = await getPortalRequestMeta();
  const genericError = new Error("Invalid email or password.");

  if (!portalUser?.passwordHash) {
    throw genericError;
  }
  const now = await getNow();
  if (portalUser.lockedUntil && portalUser.lockedUntil > now) {
    throw new Error("This account is temporarily locked. Please try again later.");
  }
  if (portalUser.status !== "ACTIVE" || portalUser.suspendedAt || portalUser.revokedAt || !portalUser.customer.isPortalEnabled) {
    throw new Error("Portal access is disabled for this account.");
  }

  const valid = await compare(password, portalUser.passwordHash);
  if (!valid) {
    const shouldLock = await shouldLockPortalAccount(portalUser.failedLoginCount);
    await db.customerPortalUser.update({
      where: { id: portalUser.id },
      data: {
        failedLoginCount: { increment: 1 },
        lockedUntil: shouldLock ? new Date(now.getTime() + 15 * 60 * 1000) : undefined,
      },
    });
    await recordPortalAuthAudit({
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      portalUserId: portalUser.id,
      event: "LOGIN_FAILED",
      remarks: "Invalid password submitted.",
    });
    throw genericError;
  }

  await db.customerPortalUser.update({
    where: { id: portalUser.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: now,
    },
  });
  const token = await createPortalSession({
    portalUserId: portalUser.id,
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    ip,
    userAgent,
  });
  await setPortalSessionCookie(token);
  await recordPortalAuthAudit({
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    portalUserId: portalUser.id,
    event: "LOGIN_SUCCESS",
  });
  return portalUser;
}

export async function logoutCustomerPortal() {
  const token = await getPortalSessionToken();
  if (token) {
    await revokePortalSession(token);
  }
  await clearPortalSessionCookie();
}

export async function logoutCustomerPortalAllDevices(portalUserId: string) {
  const currentToken = await getPortalSessionToken();
  await revokeAllPortalSessions(portalUserId, currentToken);
}

export async function requestCustomerPortalPasswordReset(email: string) {
  const normalizedEmail = normalizePortalEmail(email);
  const portalUser = await db.customerPortalUser.findFirst({
    where: { email: normalizedEmail, status: "ACTIVE" },
    include: { customer: true },
  });
  if (!portalUser) {
    return;
  }
  const invitation = await issuePortalInvitation({
    portalUserId: portalUser.id,
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    email: portalUser.email,
    type: "PASSWORD_RESET",
  });
  const link = buildPortalLink(`/customer-portal/forgot-password?token=${encodeURIComponent(invitation.token)}`);
  await sendEmail({
    to: portalUser.email,
    subject: "Reset your Monolith portal password",
    html: buildPortalInvitationHtml({
      customerName: portalUser.customer.name,
      contactName: portalUser.name,
      link,
      type: "PASSWORD_RESET",
    }),
    text: `Reset your Monolith portal password: ${link}`,
  });
  await db.customerPortalUser.update({
    where: { id: portalUser.id },
    data: { passwordResetRequestedAt: await getNow() },
  });
}

export async function resetCustomerPortalPassword(token: string, password: string) {
  const invitation = await db.customerPortalInvitation.findUnique({
    where: { tokenHash: hashPortalToken(token) },
    include: { portalUser: true },
  });
  const now = await getNow();
  if (!invitation || invitation.type !== "PASSWORD_RESET" || invitation.consumedAt || invitation.revokedAt || invitation.expiresAt < now) {
    throw new Error("This password reset link is invalid or has expired.");
  }
  const passwordHash = await hashPortalPassword(password);
  await db.$transaction(async (tx) => {
    await tx.customerPortalUser.update({
      where: { id: invitation.portalUserId },
      data: {
        passwordHash,
        lastPasswordChangedAt: now,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await tx.customerPortalInvitation.update({
      where: { id: invitation.id },
      data: { consumedAt: now },
    });
    await tx.customerPortalSession.updateMany({
      where: { portalUserId: invitation.portalUserId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: now, revokeReason: "PASSWORD_RESET" },
    });
  });
}

export async function updatePortalNotificationPreferences(portalUserId: string, input: {
  shipmentUpdatesEmail: boolean;
  documentUpdatesEmail: boolean;
  checklistEmail: boolean;
  queryEmail: boolean;
  ratingEmail: boolean;
  pushEnabled: boolean;
}) {
  const portalUser = await getPortalUserContext(portalUserId);
  return db.customerPortalNotificationPreference.upsert({
    where: { portalUserId },
    update: input,
    create: {
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      portalUserId,
      ...input,
    },
  });
}

export async function listPortalShipments(portalUserId: string, filters: PortalShipmentListFilters = {}) {
  const portalUser = await getPortalUserContext(portalUserId);
  await ensurePortalConfig(portalUser.orgId);

  const jobs = await db.chaJob.findMany({
    where: {
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      deletedAt: null,
      ...(filters.search
        ? {
            OR: [
              { jobNumber: { contains: filters.search, mode: "insensitive" } },
              { title: { contains: filters.search, mode: "insensitive" } },
              { customerRef: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      jobType: true,
      shipmentType: true,
      primaryOwner: { select: { name: true, email: true, designation: true } },
      assignedManager: { select: { name: true, email: true, designation: true } },
      additionalData: true,
      filing: true,
      documentRequirements: {
        include: {
          customerSubmissions: {
            where: { customerId: portalUser.customerId },
            include: { versions: { orderBy: { uploadedAt: "desc" }, take: 1 } },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      },
      checklistWorkflow: true,
      customerQueryThreads: {
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
      shipmentRatings: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return jobs
    .map((job) => {
      const actions = getActionRequiredFlags(job);
      const workflowSummary = buildLegacyWorkflowSummary(job);
      const currentStage = workflowSummary.currentStage;
      const statusScope =
        job.status === "COMPLETED" || job.stage === "FILED"
          ? "completed"
          : actions.hasActionRequired
            ? "action"
            : "active";
      return {
        id: job.id,
        jobNumber: job.jobNumber,
        title: job.title,
        customerRef: job.customerRef,
        currentStage: currentStage?.label ?? job.stage,
        currentStageDescription: currentStage?.description ?? null,
        shipmentType: job.shipmentType?.name ?? "Shipment",
        clearanceType: job.jobType?.name ?? "CHA",
        priority: job.priority,
        status: job.status,
        lastUpdatedAt: job.updatedAt,
        contactName: job.assignedManager?.name ?? job.primaryOwner?.name ?? null,
        progressPercent: workflowSummary.progressPercent,
        actions,
        scope: statusScope,
      };
    })
    .filter((job) => {
      if (!filters.scope || filters.scope === "all") return true;
      return job.scope === filters.scope;
    });
}

export async function getPortalDashboard(portalUserId: string) {
  const portalUser = await getPortalUserContext(portalUserId);
  const shipments = await listPortalShipments(portalUserId, { scope: "all" });
  const activeShipments = shipments.filter((entry) => entry.scope !== "completed").slice(0, 8);
  const completedShipments = shipments.filter((entry) => entry.scope === "completed").slice(0, 8);
  const notifications = await db.customerPortalNotification.findMany({
    where: { portalUserId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  return {
    customerName: portalUser.customer.name,
    portalUserName: portalUser.name,
    stats: {
      activeShipments: shipments.filter((entry) => entry.scope === "active").length,
      completedShipments: shipments.filter((entry) => entry.scope === "completed").length,
      shipmentsRequiringAction: shipments.filter((entry) => entry.actions.hasActionRequired).length,
      openQueries: shipments.reduce((sum, entry) => sum + entry.actions.openQueryCount, 0),
      checklistsAwaitingApproval: shipments.filter((entry) => entry.actions.checklistPending).length,
    },
    recentNotifications: notifications,
    recentShipments: shipments.slice(0, 6),
    activeShipments,
    completedShipments,
    actionRequired: shipments.filter((entry) => entry.actions.hasActionRequired).slice(0, 6),
  };
}

export async function getPortalShipmentDetail(portalUserId: string, jobId: string): Promise<unknown> {
  const portalUser = await getPortalUserContext(portalUserId);
  const job = await db.chaJob.findFirst({
    where: {
      id: jobId,
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      deletedAt: null,
    },
    include: {
      branch: true,
      customer: true,
      jobType: true,
      shipmentType: true,
      primaryOwner: { select: { name: true, email: true, designation: true } },
      assignedManager: { select: { name: true, email: true, designation: true } },
      additionalData: true,
      filing: true,
      documentRequirements: {
        include: {
          exception: true,
          requirementItem: {
            include: {
              category: true,
            },
          },
          versions: {
            orderBy: { uploadedAt: "desc" },
            include: {
              uploadedBy: {
                select: { name: true, email: true },
              },
            },
          },
          customerSubmissions: {
            where: { customerId: portalUser.customerId },
            include: {
              portalUser: {
                select: { name: true, email: true },
              },
              versions: { orderBy: { uploadedAt: "desc" } },
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
      checklistWorkflow: {
        include: {
          currentFileVersion: true,
          customerResponses: true,
          customerMailLogs: { orderBy: { sentAt: "desc" }, take: 1 },
        },
      },
      customerQueryThreads: {
        include: {
          messages: {
            where: { isInternal: false },
            include: {
              authorUser: { select: { name: true, email: true } },
              authorPortalUser: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      shipmentRatings: true,
    },
  });
  if (!job) {
    throw new Error("Shipment not found.");
  }
  const [now, workflow] = await Promise.all([
    getNow(),
    getFilingWorkflowInstance(portalUser.orgId, job.id).catch(() => null),
  ]);
  const actions = getActionRequiredFlags(job);
  const progressSummary = buildLegacyWorkflowSummary(job);
  const workflowSummary = buildWorkflowSummaryFromInstance(workflow, actions, now);
  const currentStage = progressSummary.currentStage;
  const filingDetails = {
    boeNumber: job.filing?.billOfEntryNumber ?? job.filing?.shippingBillNumber ?? null,
    boeDate: job.filing?.actualFilingDate ?? null,
    filingDate: job.filing?.actualFilingDate ?? null,
    shippingBillNumber: job.filing?.shippingBillNumber ?? null,
    billOfEntryNumber: job.filing?.billOfEntryNumber ?? null,
    filingRef: job.filing?.filingRef ?? null,
    filedBillCopyKey: job.filing?.filedBillCopyKey ?? null,
    chaName: job.assignedManager?.name ?? job.primaryOwner?.name ?? null,
    portCode: job.branch?.code ?? job.branch?.name ?? null,
    filingRemarks: job.filing?.delayReason ?? job.filing?.exceptionReason ?? job.remarks ?? null,
    lastUpdatedAt: job.updatedAt,
    currentStageFields: workflowSummary?.currentStageFields ?? [],
  };
  return {
    job: {
      ...job,
      stage: currentStage?.key ?? job.stage,
      filingDetails,
      workflowProgressPercent: progressSummary.progressPercent,
      workflowStages: progressSummary.stages,
    },
    stageMappings: progressSummary.stages.map((stage) => ({
      id: stage.id,
      internalStageKey: stage.key,
      sortOrder: stage.sortOrder,
      label: stage.label,
      description: stage.description,
      state: stage.state,
      completedAt: stage.completedAt,
      completedBy: stage.completedBy,
      startedAt: stage.startedAt,
      dueAt: stage.dueAt,
      overdueBusinessDays: stage.overdueBusinessDays,
      nextStageIds: stage.nextStageIds,
    })),
    currentStage: currentStage
      ? {
          id: currentStage.id,
          internalStageKey: currentStage.key,
          sortOrder: currentStage.sortOrder,
          label: currentStage.label,
          description: currentStage.description,
          state: currentStage.state,
          completedAt: currentStage.completedAt,
          completedBy: currentStage.completedBy,
          startedAt: currentStage.startedAt,
          dueAt: currentStage.dueAt,
          overdueBusinessDays: currentStage.overdueBusinessDays,
          nextStageIds: currentStage.nextStageIds,
        }
      : null,
    workflow: workflowSummary,
    actions,
  };
}

export async function listPortalNotifications(portalUserId: string) {
  return db.customerPortalNotification.findMany({
    where: { portalUserId },
    orderBy: { createdAt: "desc" },
  });
}

export async function markPortalNotificationRead(portalUserId: string, notificationId: string) {
  return db.customerPortalNotification.updateMany({
    where: { id: notificationId, portalUserId, readAt: null },
    data: { readAt: await getNow() },
  });
}

export async function markAllPortalNotificationsRead(portalUserId: string) {
  return db.customerPortalNotification.updateMany({
    where: { portalUserId, readAt: null },
    data: { readAt: await getNow() },
  });
}

async function ensureSubmissionAccess(portalUserId: string, jobId: string, requirementId: string) {
  const portalUser = await getPortalUserContext(portalUserId);
  const requirement = await db.chaJobDocumentRequirement.findFirst({
    where: {
      id: requirementId,
      jobId,
      job: { orgId: portalUser.orgId, customerId: portalUser.customerId, deletedAt: null },
    },
    include: {
      requirementItem: {
        include: {
          category: true,
        },
      },
      customerSubmissions: {
        where: { customerId: portalUser.customerId },
        select: { id: true, status: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!requirement) {
    throw new Error("Document request not found.");
  }

  const hasExistingSubmission = requirement.customerSubmissions.length > 0;
  const isExplicitPortalCategory = requirement.category === PORTAL_GENERIC_UPLOAD_CATEGORY;
  if (!requirement.isMandatory && !hasExistingSubmission && !isExplicitPortalCategory) {
    throw new Error("This document is not currently accepting customer uploads.");
  }

  return { portalUser, requirement };
}

async function resolvePortalUploadRequirement(params: {
  portalUserId: string;
  jobId: string;
  requirementId?: string;
  documentName?: string;
}) {
  if (params.requirementId) {
    return ensureSubmissionAccess(params.portalUserId, params.jobId, params.requirementId);
  }

  const portalUser = await getPortalUserContext(params.portalUserId);
  const documentName = params.documentName?.trim();
  if (!documentName) {
    throw new Error("Document name is required.");
  }

  const requirement = await db.chaJobDocumentRequirement.create({
    data: {
      jobId: params.jobId,
      name: documentName,
      category: PORTAL_GENERIC_UPLOAD_CATEGORY,
      isMandatory: false,
      status: "UPLOADED",
    },
  });

  return { portalUser, requirement };
}

export async function uploadPortalDocument(params: {
  portalUserId: string;
  jobId: string;
  requirementId?: string;
  file: File;
  comment?: string;
  documentName?: string;
}) {
  const { portalUser, requirement } = await resolvePortalUploadRequirement({
    portalUserId: params.portalUserId,
    jobId: params.jobId,
    requirementId: params.requirementId,
    documentName: params.documentName,
  });

  const requirementItemConfig =
    "requirementItem" in requirement && requirement.requirementItem && typeof requirement.requirementItem === "object"
      ? (requirement.requirementItem as { acceptedFileTypes?: string[] })
      : null;
  const acceptedFileTypes = (requirementItemConfig?.acceptedFileTypes ?? Array.from(PORTAL_ALLOWED_FILE_TYPES)).filter(
    (value: string) => value.trim().length > 0,
  );
  if (!acceptedFileTypes.includes(params.file.type)) {
    throw new Error("Unsupported file type.");
  }
  if (params.file.size > PORTAL_MAX_FILE_SIZE) {
    throw new Error("File exceeds the 10 MB upload limit.");
  }
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "customer-portal", portalUser.orgId, params.jobId);
  await fs.mkdir(uploadsDir, { recursive: true });
  const safeName = `${Date.now()}-${params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const absolutePath = path.join(uploadsDir, safeName);
  await fs.writeFile(absolutePath, buffer);
  const fileKey = path.relative(path.join(process.cwd(), "public"), absolutePath).replace(/\\/g, "/");

  const now = await getNow();
  const submission = await db.$transaction(async (tx) => {
    const existing = await tx.customerDocumentSubmission.findFirst({
      where: {
        customerId: portalUser.customerId,
        jobId: params.jobId,
        requirementId: requirement.id,
      },
      include: { versions: { orderBy: { uploadedAt: "desc" }, take: 1 } },
    });
    if (existing) {
      if (["APPROVED", "ACCEPTED", "UNDER_REVIEW"].includes(existing.status)) {
        throw new Error("This document cannot be replaced in its current review state.");
      }
      await tx.customerDocumentSubmission.update({
        where: { id: existing.id },
        data: {
          status: "UPLOADED",
          customerComment: params.comment,
          reviewerComment: null,
          internalRemark: null,
          reviewedAt: null,
          reviewedById: null,
        },
      });
      const version = await tx.customerDocumentVersion.create({
        data: {
          submissionId: existing.id,
          fileKey,
          fileName: params.file.name,
          mimeType: params.file.type || "application/octet-stream",
          sizeBytes: params.file.size,
          uploadedAt: now,
        },
      });
      return tx.customerDocumentSubmission.update({
        where: { id: existing.id },
        data: { currentVersionId: version.id },
        include: { versions: { orderBy: { uploadedAt: "desc" } } },
      });
    }
    const created = await tx.customerDocumentSubmission.create({
      data: {
        orgId: portalUser.orgId,
        customerId: portalUser.customerId,
        jobId: params.jobId,
        requirementId: requirement.id,
        portalUserId: portalUser.id,
        customerComment: params.comment,
      },
    });
    const version = await tx.customerDocumentVersion.create({
      data: {
        submissionId: created.id,
        fileKey,
        fileName: params.file.name,
        mimeType: params.file.type || "application/octet-stream",
        sizeBytes: params.file.size,
        uploadedAt: now,
      },
    });
    return tx.customerDocumentSubmission.update({
      where: { id: created.id },
      data: { currentVersionId: version.id },
      include: { versions: { orderBy: { uploadedAt: "desc" } } },
    });
  });

  await writePortalAudit({
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    portalUserId: portalUser.id,
    jobId: params.jobId,
    entityType: "CustomerDocumentSubmission",
    entityId: submission.id,
    event: "DOCUMENT_UPLOADED",
    remarks: `Uploaded ${params.file.name} for ${requirement.name}.`,
  });

  const primaryOwnerId = await jobOwnerIdOrNull(portalUser.orgId, params.jobId);
  const employeeRecipients = primaryOwnerId ? [primaryOwnerId] : [];
  if (employeeRecipients.length > 0) {
    // Keep internal notifications lightweight until the internal review UI is expanded.
    const { createNotification } = await import("@/modules/notifications/service");
    await Promise.all(
      employeeRecipients.map((userId) =>
        createNotification({
          userId,
          orgId: portalUser.orgId,
          kind: "CHA_CUSTOMER_DOCUMENT_UPLOADED",
          title: `Customer document uploaded for ${params.jobId}`,
          body: `${portalUser.name} uploaded ${params.file.name}.`,
          link: `/cha/jobs/${params.jobId}`,
        }),
      ),
    );
  }

  await notifyPortalUsers({
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    portalUserIds: [portalUser.id],
    jobId: params.jobId,
    kind: "PORTAL_DOCUMENT_UPLOADED",
    title: `${requirement.name} uploaded`,
    body: `Your document upload has been received for internal verification.`,
    link: `/customer-portal/shipments/${params.jobId}`,
  });

  return submission;
}

async function jobOwnerIdOrNull(orgId: string, jobId: string) {
  const job = await db.chaJob.findFirst({
    where: { id: jobId, orgId },
    select: { primaryOwnerId: true },
  });
  return job?.primaryOwnerId ?? null;
}

export async function getPortalDocumentVersion(portalUserId: string, versionId: string) {
  const portalUser = await getPortalUserContext(portalUserId);
  return db.customerDocumentVersion.findFirst({
    where: {
      id: versionId,
      submission: {
        orgId: portalUser.orgId,
        customerId: portalUser.customerId,
      },
    },
    include: { submission: true },
  });
}

export async function getPortalChaDocumentVersion(portalUserId: string, versionId: string) {
  const portalUser = await getPortalUserContext(portalUserId);
  return db.chaDocumentVersion.findFirst({
    where: {
      id: versionId,
      requirement: {
        job: {
          orgId: portalUser.orgId,
          customerId: portalUser.customerId,
          deletedAt: null,
        },
      },
    },
    include: {
      requirement: {
        select: {
          id: true,
          name: true,
          jobId: true,
        },
      },
    },
  });
}

export async function submitPortalChecklistDecision(params: {
  portalUserId: string;
  jobId: string;
  checklistId: string;
  decision: "APPROVED" | "REJECTED";
  remarks?: string;
}) {
  const portalUser = await getPortalUserContext(params.portalUserId);
  const job = await db.chaJob.findFirst({
    where: {
      id: params.jobId,
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      deletedAt: null,
    },
    include: {
      checklistWorkflow: true,
      assignments: true,
    },
  });
  if (!job?.checklistWorkflow || job.checklistWorkflow.id !== params.checklistId) {
    throw new Error("Checklist not found.");
  }
  const currentFileVersionId = job.checklistWorkflow.currentFileVersionId;
  if (!currentFileVersionId) {
    throw new Error("Checklist file is not available for customer approval.");
  }
  if (job.checklistWorkflow.currentApprovalStage !== "CUSTOMER") {
    throw new Error("Checklist is not awaiting customer approval.");
  }
  const now = await getNow();
  if (
    job.checklistWorkflow.customerApprovalVisibleAt &&
    job.checklistWorkflow.customerApprovalVisibleAt.getTime() > now.getTime()
  ) {
    throw new Error("Checklist approval is not yet available to the customer.");
  }
  const existing = await db.customerChecklistResponse.findFirst({
    where: {
      jobId: params.jobId,
      checklistId: params.checklistId,
      portalUserId: portalUser.id,
    },
  });
  if (existing) {
    throw new Error("This portal user has already submitted a checklist decision.");
  }

  await db.customerChecklistResponse.create({
    data: {
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      jobId: params.jobId,
      checklistId: params.checklistId,
      portalUserId: portalUser.id,
      decision: params.decision,
      remarks: params.remarks,
      submittedAt: now,
    },
  });

  await db.$transaction(async (tx) => {
    await tx.chaChecklistDecision.create({
        data: {
          checklistId: params.checklistId,
          fileVersionId: currentFileVersionId,
          stage: "CUSTOMER",
        action: params.decision,
        remarks: params.remarks,
        actedById: portalUser.id,
        assignedToId: portalUser.id,
        actedAt: now,
      },
    });

    if (params.decision === "REJECTED") {
      await tx.chaChecklist.update({
        where: { id: params.checklistId },
        data: {
          status: "CUSTOMER_REWORK_REQUIRED",
          currentApprovalStage: "UPLOAD",
          customerRejectedOnce: true,
          customerApprovalAttempted: true,
        },
      });
      await tx.chaJob.update({
        where: { id: params.jobId },
        data: { stage: "CHECKLIST_PREPARATION" },
      });
      return;
    }

    await tx.chaChecklist.update({
      where: { id: params.checklistId },
      data: {
        status: "CUSTOMER_APPROVED",
        currentApprovalStage: "COMPLETED",
        customerApprovalAttempted: true,
      },
    });
    await tx.chaJob.update({
      where: { id: params.jobId },
      data: { stage: "FILING" },
    });
  });

  await writePortalAudit({
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    portalUserId: portalUser.id,
    jobId: params.jobId,
    entityType: "CustomerChecklistResponse",
    entityId: params.checklistId,
    event: params.decision === "APPROVED" ? "CHECKLIST_APPROVED" : "CHECKLIST_REJECTED",
    remarks: params.remarks,
  });

  await notifyPortalUsers({
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    portalUserIds: [portalUser.id],
    jobId: params.jobId,
    kind: "PORTAL_CHECKLIST_SUBMITTED",
    title: params.decision === "APPROVED" ? "Checklist approved" : "Checklist sent back for correction",
    body: "Your response has been recorded.",
    link: `/customer-portal/shipments/${params.jobId}`,
  });
}

export async function listPortalQueries(portalUserId: string) {
  const portalUser = await getPortalUserContext(portalUserId);
  return db.customerQueryThread.findMany({
    where: {
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
    },
    include: {
      messages: { where: { isInternal: false }, orderBy: { createdAt: "asc" } },
      job: { select: { id: true, jobNumber: true, title: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function replyToPortalQuery(params: {
  portalUserId: string;
  threadId: string;
  body: string;
}) {
  const portalUser = await getPortalUserContext(params.portalUserId);
  const thread = await db.customerQueryThread.findFirst({
    where: {
      id: params.threadId,
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
    },
  });
  if (!thread) {
    throw new Error("Query thread not found.");
  }
  if (thread.status === "RESOLVED" || thread.status === "CLOSED") {
    throw new Error("This query is already closed.");
  }
  if (!thread.requiresCustomerAction) {
    throw new Error("This query is not currently awaiting a customer reply.");
  }
  const message = await db.customerQueryMessage.create({
    data: {
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      jobId: thread.jobId,
      threadId: thread.id,
      authorPortalUserId: portalUser.id,
      body: params.body.trim(),
    },
  });
  await db.customerQueryThread.update({
    where: { id: thread.id },
    data: {
      status: "CUSTOMER_RESPONDED",
      requiresCustomerAction: false,
      updatedAt: await getNow(),
    },
  });
  await writePortalAudit({
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    portalUserId: portalUser.id,
    jobId: thread.jobId,
    entityType: "CustomerQueryThread",
    entityId: thread.id,
    event: "QUERY_RESPONDED",
    remarks: params.body.trim(),
  });
  return message;
}

export async function createInternalCustomerQuery(params: {
  actorUserId: string;
  orgId: string;
  customerId: string;
  jobId: string;
  title: string;
  description: string;
  priority?: string;
  department?: string;
  requiresCustomerAction?: boolean;
}) {
  const [hasPortalAccess, portalUsers] = await Promise.all([
    can(params.actorUserId, "cha.job.update"),
    db.customerPortalUser.findMany({
      where: {
        orgId: params.orgId,
        customerId: params.customerId,
        status: "ACTIVE",
      },
      select: { id: true },
    }),
  ]);
  if (!hasPortalAccess) {
    throw new ForbiddenError("cha.job.update");
  }
  const thread = await db.customerQueryThread.create({
    data: {
      orgId: params.orgId,
      customerId: params.customerId,
      jobId: params.jobId,
      title: params.title.trim(),
      description: params.description.trim(),
      priority: params.priority ?? "NORMAL",
      department: params.department,
      requiresCustomerAction: params.requiresCustomerAction ?? true,
      status: params.requiresCustomerAction === false ? "OPEN" : "AWAITING_CUSTOMER_RESPONSE",
      createdByUserId: params.actorUserId,
      messages: {
        create: {
          orgId: params.orgId,
          customerId: params.customerId,
          jobId: params.jobId,
          authorUserId: params.actorUserId,
          body: params.description.trim(),
        },
      },
    },
  });
  await notifyPortalUsers({
    orgId: params.orgId,
    customerId: params.customerId,
    portalUserIds: portalUsers.map((user) => user.id),
    jobId: params.jobId,
    kind: "PORTAL_QUERY_CREATED",
    title: params.title.trim(),
    body: params.description.trim(),
    link: `/customer-portal/shipments/${params.jobId}`,
  });
  return thread;
}

export async function listPortalRatingCategories(portalUserId: string) {
  const portalUser = await getPortalUserContext(portalUserId);
  return db.shipmentRatingCategory.findMany({
    where: { orgId: portalUser.orgId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function submitPortalShipmentRating(params: {
  portalUserId: string;
  jobId: string;
  overallRating: number;
  remarks?: string;
  categoryRatings: Record<string, number>;
}) {
  const portalUser = await getPortalUserContext(params.portalUserId);
  const job = await db.chaJob.findFirst({
    where: {
      id: params.jobId,
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      deletedAt: null,
    },
  });
  if (!job) {
    throw new Error("Shipment not found.");
  }
  if (!(job.status === "COMPLETED" || job.stage === "FILED")) {
    throw new Error("Ratings are available only after shipment completion.");
  }
  const existing = await db.shipmentServiceRating.findFirst({
    where: { jobId: params.jobId, portalUserId: portalUser.id },
  });
  if (existing) {
    throw new Error("A final rating has already been submitted for this shipment.");
  }
  const rating = await db.shipmentServiceRating.create({
    data: {
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      jobId: params.jobId,
      portalUserId: portalUser.id,
      overallRating: params.overallRating,
      categoryRatings: params.categoryRatings,
      remarks: params.remarks,
      applicableServices: ["CHA"],
      submittedAt: await getNow(),
    },
  });
  await writePortalAudit({
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    portalUserId: portalUser.id,
    jobId: params.jobId,
    entityType: "ShipmentServiceRating",
    entityId: rating.id,
    event: "RATING_SUBMITTED",
    remarks: params.remarks,
    metadata: { overallRating: params.overallRating },
  });
  return rating;
}

export async function suspendCustomerPortalUser(params: {
  actorUserId: string;
  orgId: string;
  portalUserId: string;
  reason: string;
}) {
  const portalUser = await db.customerPortalUser.findFirst({
    where: { id: params.portalUserId, orgId: params.orgId },
  });
  if (!portalUser) throw new Error("Portal user not found.");
  const now = await getNow();
  await db.customerPortalUser.update({
    where: { id: portalUser.id },
    data: {
      status: "SUSPENDED",
      suspendedAt: now,
      suspendedReason: params.reason.trim(),
      updatedById: params.actorUserId,
    },
  });
  await db.customerPortalSession.updateMany({
    where: { portalUserId: portalUser.id, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: now, revokeReason: "SUSPENDED" },
  });
}

export async function resendCustomerPortalInvitation(params: {
  actorUserId: string;
  orgId: string;
  portalUserId: string;
}) {
  const portalUser = await db.customerPortalUser.findFirst({
    where: { id: params.portalUserId, orgId: params.orgId },
    include: { customer: true },
  });
  if (!portalUser) throw new Error("Portal user not found.");
  const invitation = await issuePortalInvitation({
    portalUserId: portalUser.id,
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    email: portalUser.email,
    sentById: params.actorUserId,
    type: "ACTIVATION",
  });
  const link = buildPortalLink(`/customer-portal/activate?token=${encodeURIComponent(invitation.token)}`);
  await sendEmail({
    to: portalUser.email,
    subject: "Activate your Monolith customer portal access",
    html: buildPortalInvitationHtml({
      customerName: portalUser.customer.name,
      contactName: portalUser.name,
      link,
      type: "ACTIVATION",
    }),
    text: `Activate your Monolith customer portal access: ${link}`,
  });
}

export async function getCustomerPortalProfile(portalUserId: string) {
  return getPortalUserContext(portalUserId);
}

export async function changeCustomerPortalPassword(params: {
  portalUserId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const portalUser = await db.customerPortalUser.findUnique({
    where: { id: params.portalUserId },
  });
  if (!portalUser?.passwordHash) {
    throw new Error("Password change is unavailable for this account.");
  }
  const valid = await compare(params.currentPassword, portalUser.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect.");
  }
  const passwordHash = await hashPortalPassword(params.newPassword);
  await db.customerPortalUser.update({
    where: { id: params.portalUserId },
    data: {
      passwordHash,
      lastPasswordChangedAt: await getNow(),
    },
  });
  await logoutCustomerPortalAllDevices(params.portalUserId);
}
