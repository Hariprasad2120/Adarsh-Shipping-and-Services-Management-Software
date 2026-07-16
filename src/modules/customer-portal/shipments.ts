import { getNow } from "@/lib/clock";
import { formatChaBadgeLabel } from "@/lib/cha-badges";
import { db } from "@/lib/db";
import type { getPortalSession } from "./auth";

type PortalSession = NonNullable<Awaited<ReturnType<typeof getPortalSession>>>;

const RECENT_COMPLETION_WINDOW_DAYS = 30;
const MAX_DETAIL_UPDATES = 12;
const MAX_DETAIL_QUERY_MESSAGES = 3;
const CUSTOMER_OPTIONAL_UPLOAD_CATEGORY = "Customer Uploads";

const CUSTOMER_SAFE_AUDIT_EVENTS = new Set([
  "JOB_CREATED",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_DELETED",
  "DOCUMENT_MARKED_NA",
  "DOCUMENT_GATE_COMPLETED",
  "DOCUMENT_EXCEPTION_DECLARED",
  "DOCUMENT_EXCEPTION_REMOVED",
  "ADDITIONAL_DATA_COMPLETED",
  "CHECKLIST_IMPORTED",
  "CHECKLIST_SUBMITTED",
  "CHECKLIST_CUSTOMER_MAIL_SENT",
  "CHECKLIST_SELF_APPROVED",
  "ESTIMATED_FILING_DATE_CHANGED",
  "JOB_FILED",
  "DO_DOCUMENT_UPLOADED",
  "DO_EXTENSION_APPLIED",
  "FILING_NOTIFICATION_NODE_TRIGGERED",
]);

const CUSTOMER_MAJOR_AUDIT_EVENTS = new Set([
  "JOB_CREATED",
  "DOCUMENT_GATE_COMPLETED",
  "ADDITIONAL_DATA_COMPLETED",
  "CHECKLIST_IMPORTED",
  "CHECKLIST_SUBMITTED",
  "CHECKLIST_CUSTOMER_MAIL_SENT",
  "CHECKLIST_SELF_APPROVED",
  "ESTIMATED_FILING_DATE_CHANGED",
  "JOB_FILED",
  "DO_EXTENSION_APPLIED",
  "FILING_NOTIFICATION_NODE_TRIGGERED",
]);

const QUERY_ACTION_STATUSES = new Set([
  "AWAITING_CUSTOMER_RESPONSE",
]);

const CLOSED_QUERY_STATUSES = new Set([
  "RESOLVED",
  "CLOSED",
]);

type JobRecord = Awaited<ReturnType<typeof getJobsForCustomer>>[number];
type JobDetailRecord = NonNullable<Awaited<ReturnType<typeof getJobForCustomer>>>;
type SubmissionRecord = Awaited<ReturnType<typeof getDocumentSubmissionsForCustomer>>[number];
type ChecklistRecord = Awaited<ReturnType<typeof getVisibleChecklistsForCustomer>>[number];
type ChecklistResponseRecord = Awaited<ReturnType<typeof getChecklistResponsesForCustomer>>[number];
type QueryRecord = Awaited<ReturnType<typeof getQueriesForCustomer>>[number];
type AuditRecord = Awaited<ReturnType<typeof getCustomerSafeAuditLogs>>[number];
type StageMappingRecord = Awaited<ReturnType<typeof getCustomerVisibleStageMappings>>[number];

export type CustomerPortalShipmentSort =
  | "updatedAt_desc"
  | "createdAt_desc"
  | "eta_asc";

export type CustomerPortalShipmentsFilters = {
  q: string;
  stage: string | null;
  status: string | null;
  priority: string | null;
  attention: "all" | "needs_action";
  completion: "all" | "recent";
  sort: CustomerPortalShipmentSort;
};

export type CustomerPortalShipmentActionItem = {
  id: string;
  type: "DOCUMENT" | "CHECKLIST" | "QUERY";
  title: string;
  status: string;
  detail: string;
  dueAt: string | null;
  updatedAt: string;
  href: string;
  tone: "primary" | "warning";
};

export type CustomerPortalShipmentListItem = {
  id: string;
  jobNumber: string;
  title: string;
  customerRef: string | null;
  stageKey: string;
  stageLabel: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  estimatedClosureDate: string | null;
  hasCustomerAction: boolean;
  openQueryCount: number;
  pendingDocumentCount: number;
  pendingChecklistCount: number;
  recentUpdateAt: string | null;
  href: string;
};

export type CustomerPortalShipmentsData = {
  summary: {
    totalShipments: number;
    activeShipments: number;
    awaitingCustomerAction: number;
    recentlyCompletedShipments: number;
  };
  filters: CustomerPortalShipmentsFilters;
  filterOptions: {
    stages: Array<{ value: string; label: string }>;
    statuses: string[];
    priorities: string[];
  };
  shipments: CustomerPortalShipmentListItem[];
  totalResults: number;
  sectionErrors: Partial<Record<"shipments", string>>;
};

export type CustomerPortalShipmentDetailData = {
  shipment: {
    id: string;
    jobNumber: string;
    title: string;
    customerRef: string | null;
    stageLabel: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
    estimatedClosureDate: string | null;
    filingStatus: string | null;
    estimatedFilingDate: string | null;
    actualFilingDate: string | null;
    filingReference: string | null;
    billReference: string | null;
    additionalDataStatus: string | null;
    vesselInwardDate: string | null;
    importGeneralManifest: string | null;
    exportGeneralManifest: string | null;
    deliveryOrderValidity: string | null;
  };
  overview: {
    openQueryCount: number;
    pendingDocumentCount: number;
    pendingChecklistCount: number;
    sharedDocumentCount: number;
    lastCustomerVisibleUpdateAt: string | null;
  };
  actionRequired: CustomerPortalShipmentActionItem[];
  documents: Array<{
    requirementId: string;
    requirementName: string;
    mandatory: boolean;
    requirementStatus: string;
    latestSubmissionStatus: string | null;
    latestVersionId: string | null;
    latestFileName: string | null;
    latestMimeType: string | null;
    downloadHref: string | null;
    isDownloadable: boolean;
    lastUpdatedAt: string | null;
    reviewerComment: string | null;
  }>;
  checklists: Array<{
    id: string;
    checklistLabel: string;
    versionLabel: string | null;
    fileVersionId: string | null;
    fileName: string | null;
    downloadHref: string | null;
    isDownloadable: boolean;
    approvalStatus: string;
    visibleAt: string | null;
    responseState: string;
    responseDecision: string | null;
    canRespond: boolean;
  }>;
  queries: Array<{
    id: string;
    title: string;
    detail: string;
    status: string;
    priority: string;
    requiredResponseBy: string | null;
    requiresCustomerAction: boolean;
    lastMessageAt: string | null;
    recentMessages: Array<{
      body: string;
      createdAt: string;
    }>;
  }>;
  recentUpdates: Array<{
    id: string;
    title: string;
    detail: string;
    occurredAt: string;
  }>;
  sectionErrors: Partial<Record<"documents" | "checklists" | "queries" | "recentUpdates" | "actionRequired", string>>;
};

type ShipmentComputationContext = {
  jobs: JobRecord[];
  submissions: SubmissionRecord[];
  checklists: ChecklistRecord[];
  checklistResponses: ChecklistResponseRecord[];
  queries: QueryRecord[];
  audits: AuditRecord[];
  stageMappings: StageMappingRecord[];
  now: Date;
};

export function parseCustomerPortalShipmentFilters(
  input: Record<string, string | string[] | undefined>,
): CustomerPortalShipmentsFilters {
  const q = readParam(input.q).trim();
  const stage = readNullableParam(input.stage);
  const status = readNullableParam(input.status);
  const priority = readNullableParam(input.priority);
  const attention = readParam(input.attention) === "needs_action" ? "needs_action" : "all";
  const completion = readParam(input.completion) === "recent" ? "recent" : "all";
  const rawSort = readParam(input.sort);
  const sort: CustomerPortalShipmentSort =
    rawSort === "createdAt_desc" || rawSort === "eta_asc" ? rawSort : "updatedAt_desc";

  return {
    q,
    stage,
    status,
    priority,
    attention,
    completion,
    sort,
  };
}

export async function getCustomerPortalShipmentsData(
  session: Pick<PortalSession, "orgId" | "portalUser">,
  filters: CustomerPortalShipmentsFilters,
): Promise<CustomerPortalShipmentsData> {
  const now = await getNow();
  const sectionErrors: CustomerPortalShipmentsData["sectionErrors"] = {};

  const [
    jobsResult,
    submissionsResult,
    checklistsResult,
    checklistResponsesResult,
    queriesResult,
    auditsResult,
    stageMappingsResult,
  ] = await Promise.allSettled([
    getJobsForCustomer(session.orgId, session.portalUser.customerId),
    getDocumentSubmissionsForCustomer(session.orgId, session.portalUser.customerId),
    getVisibleChecklistsForCustomer(session.orgId, session.portalUser.customerId),
    getChecklistResponsesForCustomer(session.orgId, session.portalUser.customerId),
    getQueriesForCustomer(session.orgId, session.portalUser.customerId),
    getCustomerSafeAuditLogs(session.orgId, session.portalUser.customerId),
    getCustomerVisibleStageMappings(session.orgId),
  ]);

  const jobs = readSettled(jobsResult, "shipments", sectionErrors) ?? [];
  const submissions = readSettled(submissionsResult, "shipments", sectionErrors) ?? [];
  const checklists = readSettled(checklistsResult, "shipments", sectionErrors) ?? [];
  const checklistResponses = readSettled(checklistResponsesResult, "shipments", sectionErrors) ?? [];
  const queries = readSettled(queriesResult, "shipments", sectionErrors) ?? [];
  const audits = readSettled(auditsResult, "shipments", sectionErrors) ?? [];
  const stageMappings = readSettled(stageMappingsResult, "shipments", sectionErrors) ?? [];

  const context: ShipmentComputationContext = {
    jobs,
    submissions,
    checklists,
    checklistResponses,
    queries,
    audits,
    stageMappings,
    now,
  };

  const allShipments = buildShipmentListItems(context);
  const filteredShipments = applyShipmentFilters(allShipments, filters, now);
  const summary = buildShipmentsSummary(allShipments, now);
  const filterOptions = buildShipmentFilterOptions(jobs, stageMappings);

  return {
    summary,
    filters,
    filterOptions,
    shipments: filteredShipments,
    totalResults: filteredShipments.length,
    sectionErrors,
  };
}

export async function getCustomerPortalShipmentDetailData(
  session: Pick<PortalSession, "orgId" | "portalUser">,
  shipmentId: string,
): Promise<CustomerPortalShipmentDetailData | null> {
  const now = await getNow();
  const sectionErrors: CustomerPortalShipmentDetailData["sectionErrors"] = {};

  const job = await getJobForCustomer(session.orgId, session.portalUser.customerId, shipmentId);
  if (!job) return null;

  const [
    submissionsResult,
    checklistsResult,
    checklistResponsesResult,
    queriesResult,
    auditsResult,
    stageMappingsResult,
  ] = await Promise.allSettled([
    getDocumentSubmissionsForJob(session.orgId, session.portalUser.customerId, shipmentId),
    getVisibleChecklistsForJob(session.orgId, session.portalUser.customerId, shipmentId),
    getChecklistResponsesForJob(session.orgId, session.portalUser.customerId, shipmentId),
    getQueriesForJob(session.orgId, session.portalUser.customerId, shipmentId),
    getCustomerSafeAuditLogsForJob(session.orgId, session.portalUser.customerId, shipmentId),
    getCustomerVisibleStageMappings(session.orgId),
  ]);

  const submissions = readSettled(submissionsResult, "documents", sectionErrors) ?? [];
  const checklists = readSettled(checklistsResult, "checklists", sectionErrors) ?? [];
  const checklistResponses = readSettled(checklistResponsesResult, "checklists", sectionErrors) ?? [];
  const queries = readSettled(queriesResult, "queries", sectionErrors) ?? [];
  const audits = readSettled(auditsResult, "recentUpdates", sectionErrors) ?? [];
  const stageMappings = readSettled(stageMappingsResult, "recentUpdates", sectionErrors) ?? [];
  const stageMap = buildStageMap(stageMappings);

  const listContext: ShipmentComputationContext = {
    jobs: [job],
    submissions,
    checklists,
    checklistResponses,
    queries,
    audits,
    stageMappings,
    now,
  };

  const listItem = buildShipmentListItems(listContext)[0];
  const actionRequired = buildShipmentActionRequiredItems(job, submissions, checklists, checklistResponses, queries, stageMappings, now);
  if (
    submissionsResult.status === "rejected" ||
    checklistsResult.status === "rejected" ||
    checklistResponsesResult.status === "rejected" ||
    queriesResult.status === "rejected"
  ) {
    sectionErrors.actionRequired = sectionErrors.actionRequired ?? "Action-required details are temporarily unavailable.";
  }

  const visibleDocuments = buildShipmentDocumentItems(job, submissions);

  return {
    shipment: {
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      customerRef: job.customerRef,
      stageLabel: formatStageLabel(job.stage, stageMap),
      status: formatChaBadgeLabel(job.status),
      priority: formatChaBadgeLabel(job.priority),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      estimatedClosureDate: job.estimatedClosureDate?.toISOString() ?? null,
      filingStatus: job.filing?.status ? formatChaBadgeLabel(job.filing.status) : null,
      estimatedFilingDate: job.filing?.estimatedFilingDate?.toISOString() ?? null,
      actualFilingDate: job.filing?.actualFilingDate?.toISOString() ?? null,
      filingReference: job.filing?.filingRef ?? null,
      billReference: job.filing?.billOfEntryNumber ?? job.filing?.shippingBillNumber ?? null,
      additionalDataStatus: job.additionalData?.status ? formatChaBadgeLabel(job.additionalData.status) : null,
      vesselInwardDate: job.additionalData?.vesselInwardDate?.toISOString() ?? null,
      importGeneralManifest: job.additionalData?.importGeneralManifest ?? null,
      exportGeneralManifest: job.additionalData?.exportGeneralManifest ?? null,
      deliveryOrderValidity: job.additionalData?.deliveryOrderValidity?.toISOString() ?? null,
    },
    overview: {
      openQueryCount: listItem?.openQueryCount ?? 0,
      pendingDocumentCount: listItem?.pendingDocumentCount ?? 0,
      pendingChecklistCount: listItem?.pendingChecklistCount ?? 0,
      sharedDocumentCount: visibleDocuments.filter((item) => item.isDownloadable).length,
      lastCustomerVisibleUpdateAt: listItem?.recentUpdateAt ?? null,
    },
    actionRequired,
    documents: visibleDocuments,
    checklists: buildShipmentChecklistItems(checklists, checklistResponses, now),
    queries: buildShipmentQueries(queries),
    recentUpdates: buildShipmentRecentUpdates(audits, stageMappings),
    sectionErrors,
  };
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readNullableParam(value: string | string[] | undefined) {
  const normalized = readParam(value).trim();
  return normalized ? normalized : null;
}

function readSettled<T>(
  result: PromiseSettledResult<T>,
  section: string,
  sectionErrors: Record<string, string | undefined>,
) {
  if (result.status === "fulfilled") return result.value;
  sectionErrors[section] = sectionErrors[section] ?? "This section is temporarily unavailable.";
  return null;
}

function buildShipmentsSummary(items: CustomerPortalShipmentListItem[], now: Date) {
  const recentThreshold = new Date(now.getTime() - RECENT_COMPLETION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return {
    totalShipments: items.length,
    activeShipments: items.filter((item) => item.status === "ACTIVE").length,
    awaitingCustomerAction: items.filter((item) => item.hasCustomerAction).length,
    recentlyCompletedShipments: items.filter((item) => {
      const completedLike = item.stageKey === "FILED" || item.status === "COMPLETED";
      const updatedAt = new Date(item.updatedAt);
      return completedLike && updatedAt >= recentThreshold;
    }).length,
  };
}

function buildShipmentFilterOptions(jobs: JobRecord[], stageMappings: StageMappingRecord[]) {
  const stageMap = buildStageMap(stageMappings);
  return {
    stages: Array.from(new Set(jobs.map((job) => job.stage)))
      .sort()
      .map((value) => ({ value, label: formatStageLabel(value, stageMap) })),
    statuses: Array.from(new Set(jobs.map((job) => job.status))).sort(),
    priorities: Array.from(new Set(jobs.map((job) => job.priority))).sort(),
  };
}

function buildShipmentListItems(context: ShipmentComputationContext) {
  const { jobs, submissions, checklists, checklistResponses, queries, audits, stageMappings, now } = context;
  const stageMap = buildStageMap(stageMappings);
  const accountResponses = new Set(checklistResponses.map((response) => response.checklistId));
  const openQueriesByJobId = new Map<string, QueryRecord[]>();
  const visibleChecklistsByJobId = new Map<string, ChecklistRecord[]>();
  const latestAuditByJobId = new Map<string, AuditRecord>();

  for (const query of queries) {
    if (!CLOSED_QUERY_STATUSES.has(query.status)) {
      const existing = openQueriesByJobId.get(query.jobId) ?? [];
      existing.push(query);
      openQueriesByJobId.set(query.jobId, existing);
    }
  }

  for (const checklist of checklists) {
    if (!checklist.customerApprovalVisibleAt || checklist.customerApprovalVisibleAt > now) continue;
    const existing = visibleChecklistsByJobId.get(checklist.jobId) ?? [];
    existing.push(checklist);
    visibleChecklistsByJobId.set(checklist.jobId, existing);
  }

  for (const audit of audits) {
    if (!audit.jobId) continue;
    const existing = latestAuditByJobId.get(audit.jobId);
    if (!existing || audit.timestamp > existing.timestamp) {
      latestAuditByJobId.set(audit.jobId, audit);
    }
  }

  return jobs.map((job) => {
    const pendingDocumentCount = 0;

    const pendingChecklistCount = (visibleChecklistsByJobId.get(job.id) ?? []).filter(
      (checklist) => !accountResponses.has(checklist.id),
    ).length;

    const openQueries = openQueriesByJobId.get(job.id) ?? [];
    const openQueryCount = openQueries.length;
    const requiresActionQueryCount = openQueries.filter(
      (query) => query.requiresCustomerAction || QUERY_ACTION_STATUSES.has(query.status),
    ).length;
    const recentAudit = latestAuditByJobId.get(job.id);

    return {
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      customerRef: job.customerRef,
      stageKey: job.stage,
      stageLabel: formatStageLabel(job.stage, stageMap),
      status: job.status,
      priority: job.priority,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      estimatedClosureDate: job.estimatedClosureDate?.toISOString() ?? null,
      hasCustomerAction: pendingDocumentCount > 0 || pendingChecklistCount > 0 || requiresActionQueryCount > 0,
      openQueryCount,
      pendingDocumentCount,
      pendingChecklistCount,
      recentUpdateAt: recentAudit?.timestamp.toISOString() ?? null,
      href: shipmentHref(job.id),
    } satisfies CustomerPortalShipmentListItem;
  });
}

function applyShipmentFilters(
  items: CustomerPortalShipmentListItem[],
  filters: CustomerPortalShipmentsFilters,
  now: Date,
) {
  const recentThreshold = new Date(now.getTime() - RECENT_COMPLETION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const query = filters.q.toLowerCase();

  const filtered = items.filter((item) => {
    if (query) {
      const haystack = [item.jobNumber, item.title, item.customerRef ?? ""].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.stage && item.stageKey !== filters.stage) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.attention === "needs_action" && !item.hasCustomerAction) return false;
    if (filters.completion === "recent") {
      const completedLike = item.stageKey === "FILED" || item.status === "COMPLETED";
      if (!completedLike || new Date(item.updatedAt) < recentThreshold) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case "createdAt_desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "eta_asc": {
        const aValue = a.estimatedClosureDate ? new Date(a.estimatedClosureDate).getTime() : Number.POSITIVE_INFINITY;
        const bValue = b.estimatedClosureDate ? new Date(b.estimatedClosureDate).getTime() : Number.POSITIVE_INFINITY;
        if (aValue !== bValue) return aValue - bValue;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });
}

function buildShipmentActionRequiredItems(
  job: JobRecord,
  submissions: SubmissionRecord[],
  checklists: ChecklistRecord[],
  checklistResponses: ChecklistResponseRecord[],
  queries: QueryRecord[],
  stageMappings: StageMappingRecord[],
  now: Date,
) {
  const items = buildActionItemsForJobs([job], submissions, checklists, checklistResponses, queries, stageMappings, now);
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    status: item.status,
    detail: item.detail,
    dueAt: item.dueAt,
    updatedAt: item.updatedAt,
    href: item.href,
    tone: item.tone,
  }));
}

function buildShipmentDocumentItems(job: JobDetailRecord, submissions: SubmissionRecord[]) {
  const latestSubmissionByRequirement = buildLatestSubmissionByRequirement(submissions);
  return job.documentRequirements
    .filter((requirement) => requirement.category !== CUSTOMER_OPTIONAL_UPLOAD_CATEGORY)
    .map((requirement) => {
    const latestChaVersion = requirement.versions?.[0] ?? null;
    const latestSubmission = latestSubmissionByRequirement.get(requirement.id);
    const latestVersion = latestChaVersion;
    const latestSubmissionStatus = latestVersion ? formatChaBadgeLabel(requirement.status) : null;
    return {
      requirementId: requirement.id,
      requirementName: requirement.name,
      mandatory: requirement.isMandatory,
      requirementStatus: formatChaBadgeLabel(requirement.status),
      latestSubmissionStatus,
      latestVersionId: latestVersion?.id ?? null,
      latestFileName: latestVersion?.fileName ?? null,
      latestMimeType: latestVersion?.mimeType ?? null,
      downloadHref: latestVersion ? customerDocumentDownloadHref(latestVersion.id) : null,
      isDownloadable: Boolean(latestVersion),
      lastUpdatedAt: latestVersion?.uploadedAt.toISOString() ?? null,
      reviewerComment: latestSubmission?.reviewerComment ?? null,
    };
  });
}

function buildShipmentChecklistItems(
  checklists: ChecklistRecord[],
  checklistResponses: ChecklistResponseRecord[],
  now: Date,
) {
  const latestResponseByChecklistId = new Map<string, ChecklistResponseRecord>();
  for (const response of checklistResponses) {
    const existing = latestResponseByChecklistId.get(response.checklistId);
    if (!existing || response.submittedAt > existing.submittedAt) {
      latestResponseByChecklistId.set(response.checklistId, response);
    }
  }

  return checklists
    .filter((checklist) => checklist.customerApprovalVisibleAt && checklist.customerApprovalVisibleAt <= now)
    .map((checklist) => {
      const latestResponse = latestResponseByChecklistId.get(checklist.id);
      const canRespond = !latestResponse;

      return {
        id: checklist.id,
        checklistLabel: "Customer Checklist",
        versionLabel: checklist.currentFileVersion ? `v${checklist.currentFileVersion.versionNumber}` : null,
        fileVersionId: checklist.currentFileVersion?.id ?? null,
        fileName: checklist.currentFileVersion?.originalFileName ?? null,
        downloadHref: checklist.currentFileVersion ? customerChecklistDownloadHref(checklist.currentFileVersion.id) : null,
        isDownloadable: Boolean(checklist.currentFileVersion?.id),
        approvalStatus: formatChaBadgeLabel(checklist.currentApprovalStage),
        visibleAt: checklist.customerApprovalVisibleAt?.toISOString() ?? null,
        responseState: latestResponse ? "Responded" : "Pending Response",
        responseDecision: latestResponse ? formatChaBadgeLabel(latestResponse.decision) : null,
        canRespond,
      };
    });
}

function buildShipmentQueries(queries: QueryRecord[]) {
  return queries
    .filter((query) => !CLOSED_QUERY_STATUSES.has(query.status))
    .map((query) => ({
      id: query.id,
      title: query.title,
      detail: query.description,
      status: formatChaBadgeLabel(query.status),
      priority: formatChaBadgeLabel(query.priority),
      requiredResponseBy: query.requiredResponseBy?.toISOString() ?? null,
      requiresCustomerAction: query.requiresCustomerAction || QUERY_ACTION_STATUSES.has(query.status),
      lastMessageAt: query.messages[0]?.createdAt.toISOString() ?? null,
      recentMessages: query.messages.map((message) => ({
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
    }));
}

function buildShipmentRecentUpdates(audits: AuditRecord[], stageMappings: StageMappingRecord[]) {
  const stageMap = buildStageMap(stageMappings);
  return audits
    .filter((audit) => CUSTOMER_MAJOR_AUDIT_EVENTS.has(audit.event))
    .slice(0, MAX_DETAIL_UPDATES)
    .map((audit) => ({
      id: audit.id,
      title: buildAuditTitle(audit, stageMap),
      detail: audit.remarks || "Shipment activity was updated.",
      occurredAt: audit.timestamp.toISOString(),
    }));
}

function buildActionItemsForJobs(
  jobs: JobRecord[],
  submissions: SubmissionRecord[],
  checklists: ChecklistRecord[],
  checklistResponses: ChecklistResponseRecord[],
  queries: QueryRecord[],
  stageMappings: StageMappingRecord[],
  now: Date,
) {
  const stageMap = buildStageMap(stageMappings);
  const accountResponses = new Set(checklistResponses.map((response) => response.checklistId));
  const items: Array<
    CustomerPortalShipmentActionItem & {
      jobId: string;
      urgencyRank: number;
      dueSort: number;
      updatedSort: number;
    }
  > = [];

  for (const checklist of checklists) {
    if (!checklist.customerApprovalVisibleAt || checklist.customerApprovalVisibleAt > now) continue;
    if (accountResponses.has(checklist.id)) continue;
    items.push({
      id: `checklist-${checklist.id}`,
      type: "CHECKLIST",
      title: checklist.currentFileVersion
        ? `Checklist v${checklist.currentFileVersion.versionNumber}`
        : "Checklist Approval",
      status: formatChaBadgeLabel(checklist.currentApprovalStage),
      detail: "Customer approval is pending for the latest checklist version.",
      dueAt: checklist.customerApprovalVisibleAt.toISOString(),
      updatedAt: checklist.updatedAt.toISOString(),
      href: shipmentHref(checklist.jobId),
      tone: "warning",
      jobId: checklist.jobId,
      urgencyRank: 4,
      dueSort: checklist.customerApprovalVisibleAt.getTime(),
      updatedSort: checklist.updatedAt.getTime(),
    });
  }

  for (const query of queries) {
    const needsCustomerResponse = query.requiresCustomerAction || QUERY_ACTION_STATUSES.has(query.status);
    if (!needsCustomerResponse) continue;
    items.push({
      id: `query-${query.id}`,
      type: "QUERY",
      title: query.title,
      status: formatChaBadgeLabel(query.status),
      detail: query.description,
      dueAt: query.requiredResponseBy?.toISOString() ?? null,
      updatedAt: query.updatedAt.toISOString(),
      href: shipmentHref(query.jobId),
      tone: query.priority === "URGENT" || query.priority === "HIGH" ? "warning" : "primary",
      jobId: query.jobId,
      urgencyRank: query.priority === "URGENT" ? 5 : query.priority === "HIGH" ? 4 : 3,
      dueSort: query.requiredResponseBy?.getTime() ?? Number.POSITIVE_INFINITY,
      updatedSort: query.updatedAt.getTime(),
    });
  }

  return items
    .sort((a, b) => {
      if (b.urgencyRank !== a.urgencyRank) return b.urgencyRank - a.urgencyRank;
      if (a.dueSort !== b.dueSort) return a.dueSort - b.dueSort;
      return b.updatedSort - a.updatedSort;
    })
    .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
    .map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      status: item.status,
      detail: item.detail,
      dueAt: item.dueAt,
      updatedAt: item.updatedAt,
      href: item.href,
      tone: item.tone,
      jobId: item.jobId,
      stageLabel: formatStageLabel(jobs.find((job) => job.id === item.jobId)?.stage, stageMap),
    }));
}

function buildLatestSubmissionByRequirement(submissions: SubmissionRecord[]) {
  const latestSubmissionByRequirement = new Map<string, SubmissionRecord>();
  for (const submission of submissions) {
    if (submission.status === "SUPERSEDED") continue;
    const existing = latestSubmissionByRequirement.get(submission.requirementId);
    if (!existing || submission.updatedAt > existing.updatedAt) {
      latestSubmissionByRequirement.set(submission.requirementId, submission);
    }
  }
  return latestSubmissionByRequirement;
}

function buildAuditTitle(audit: AuditRecord, stageMap: Map<string, string>) {
  if (audit.newState && stageMap.has(audit.newState)) {
    return stageMap.get(audit.newState)!;
  }

  switch (audit.event) {
    case "JOB_CREATED":
      return "Shipment created";
    case "DOCUMENT_UPLOADED":
      return "Document uploaded";
    case "DOCUMENT_GATE_COMPLETED":
      return "Moved to Additional Data";
    case "ADDITIONAL_DATA_COMPLETED":
      return "Additional data completed";
    case "CHECKLIST_IMPORTED":
      return "Checklist imported";
    case "CHECKLIST_SUBMITTED":
      return "Checklist submitted";
    case "CHECKLIST_CUSTOMER_MAIL_SENT":
      return "Checklist shared for approval";
    case "JOB_FILED":
      return "Shipment filed";
    case "ESTIMATED_FILING_DATE_CHANGED":
      return "Estimated filing date updated";
    default:
      return formatChaBadgeLabel(audit.event);
  }
}

function buildStageMap(stageMappings: StageMappingRecord[]) {
  return new Map(
    stageMappings
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((mapping) => [mapping.internalStageKey, mapping.label]),
  );
}

function formatStageLabel(stage: string | null | undefined, stageMap: Map<string, string>) {
  if (!stage) return "Unknown";
  return stageMap.get(stage) || formatChaBadgeLabel(stage);
}

function shipmentHref(jobId: string) {
  return `/customer-portal/shipments/${jobId}`;
}

function customerDocumentDownloadHref(versionId: string) {
  return `/api/customer-portal/documents/${versionId}?download=true`;
}

function customerChecklistDownloadHref(versionId: string) {
  return `/api/customer-portal/checklist-files/${versionId}?download=true`;
}

async function getJobsForCustomer(orgId: string, customerId: string) {
  return db.chaJob.findMany({
    where: {
      orgId,
      customerId,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      jobNumber: true,
      title: true,
      customerRef: true,
      stage: true,
      status: true,
      priority: true,
      estimatedClosureDate: true,
      createdAt: true,
      updatedAt: true,
      documentRequirements: {
        select: {
          id: true,
          name: true,
          category: true,
          isMandatory: true,
          status: true,
          versions: {
            where: { isCurrent: true },
            orderBy: { uploadedAt: "desc" },
            take: 1,
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              fileKey: true,
              sizeBytes: true,
              uploadedAt: true,
            },
          },
        },
      },
    },
  });
}

async function getJobForCustomer(orgId: string, customerId: string, shipmentId: string) {
  return db.chaJob.findFirst({
    where: {
      id: shipmentId,
      orgId,
      customerId,
      deletedAt: null,
    },
    select: {
      id: true,
      jobNumber: true,
      title: true,
      customerRef: true,
      stage: true,
      status: true,
      priority: true,
      estimatedClosureDate: true,
      createdAt: true,
      updatedAt: true,
      documentRequirements: {
        select: {
          id: true,
          name: true,
          category: true,
          isMandatory: true,
          status: true,
          versions: {
            where: { isCurrent: true },
            orderBy: { uploadedAt: "desc" },
            take: 1,
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              fileKey: true,
              sizeBytes: true,
              uploadedAt: true,
            },
          },
        },
      },
      additionalData: {
        select: {
          status: true,
          vesselInwardDate: true,
          importGeneralManifest: true,
          exportGeneralManifest: true,
          deliveryOrderValidity: true,
        },
      },
      filing: {
        select: {
          status: true,
          estimatedFilingDate: true,
          actualFilingDate: true,
          filingRef: true,
          billOfEntryNumber: true,
          shippingBillNumber: true,
        },
      },
    },
  });
}

async function getDocumentSubmissionsForCustomer(orgId: string, customerId: string) {
  return db.customerDocumentSubmission.findMany({
    where: {
      orgId,
      customerId,
      job: { deletedAt: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      jobId: true,
      requirementId: true,
      status: true,
      customerComment: true,
      reviewerComment: true,
      createdAt: true,
      updatedAt: true,
      job: {
        select: {
          id: true,
          jobNumber: true,
          title: true,
          customerRef: true,
          stage: true,
        },
      },
      requirement: {
        select: {
          id: true,
          name: true,
          isMandatory: true,
          status: true,
        },
      },
      versions: {
        orderBy: [
          { uploadedAt: "desc" },
          { createdAt: "desc" },
        ],
        take: 1,
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          fileKey: true,
          sizeBytes: true,
          uploadedAt: true,
          createdAt: true,
        },
      },
    },
  });
}

async function getDocumentSubmissionsForJob(orgId: string, customerId: string, shipmentId: string) {
  return db.customerDocumentSubmission.findMany({
    where: {
      orgId,
      customerId,
      jobId: shipmentId,
      job: { deletedAt: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      jobId: true,
      requirementId: true,
      status: true,
      customerComment: true,
      reviewerComment: true,
      createdAt: true,
      updatedAt: true,
      job: {
        select: {
          id: true,
          jobNumber: true,
          title: true,
          customerRef: true,
          stage: true,
        },
      },
      requirement: {
        select: {
          id: true,
          name: true,
          isMandatory: true,
          status: true,
        },
      },
      versions: {
        orderBy: [
          { uploadedAt: "desc" },
          { createdAt: "desc" },
        ],
        take: 1,
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          fileKey: true,
          sizeBytes: true,
          uploadedAt: true,
          createdAt: true,
        },
      },
    },
  });
}

async function getVisibleChecklistsForCustomer(orgId: string, customerId: string) {
  return db.chaChecklist.findMany({
    where: {
      job: {
        orgId,
        customerId,
        deletedAt: null,
      },
      customerApprovalVisibleAt: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      jobId: true,
      status: true,
      currentApprovalStage: true,
      customerApprovalVisibleAt: true,
      updatedAt: true,
      currentFileVersion: {
        select: {
          id: true,
          versionNumber: true,
          originalFileName: true,
        },
      },
      job: {
        select: {
          id: true,
          jobNumber: true,
          title: true,
          customerRef: true,
          stage: true,
        },
      },
    },
  });
}

async function getVisibleChecklistsForJob(orgId: string, customerId: string, shipmentId: string) {
  return db.chaChecklist.findMany({
    where: {
      jobId: shipmentId,
      job: {
        orgId,
        customerId,
        deletedAt: null,
      },
      customerApprovalVisibleAt: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      jobId: true,
      status: true,
      currentApprovalStage: true,
      customerApprovalVisibleAt: true,
      updatedAt: true,
      currentFileVersion: {
        select: {
          id: true,
          versionNumber: true,
          originalFileName: true,
        },
      },
      job: {
        select: {
          id: true,
          jobNumber: true,
          title: true,
          customerRef: true,
          stage: true,
        },
      },
    },
  });
}

async function getChecklistResponsesForCustomer(orgId: string, customerId: string) {
  return db.customerChecklistResponse.findMany({
    where: {
      orgId,
      customerId,
      job: { deletedAt: null },
    },
    select: {
      checklistId: true,
      portalUserId: true,
      submittedAt: true,
      decision: true,
    },
  });
}

async function getChecklistResponsesForJob(orgId: string, customerId: string, shipmentId: string) {
  return db.customerChecklistResponse.findMany({
    where: {
      orgId,
      customerId,
      jobId: shipmentId,
      job: { deletedAt: null },
    },
    select: {
      checklistId: true,
      portalUserId: true,
      submittedAt: true,
      decision: true,
    },
  });
}

async function getQueriesForCustomer(orgId: string, customerId: string) {
  return db.customerQueryThread.findMany({
    where: {
      orgId,
      customerId,
      job: { deletedAt: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      jobId: true,
      title: true,
      description: true,
      department: true,
      priority: true,
      status: true,
      requiresCustomerAction: true,
      requiredResponseBy: true,
      createdAt: true,
      updatedAt: true,
      job: {
        select: {
          id: true,
          jobNumber: true,
          title: true,
          customerRef: true,
          stage: true,
        },
      },
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          createdAt: true,
        },
      },
    },
  });
}

async function getQueriesForJob(orgId: string, customerId: string, shipmentId: string) {
  return db.customerQueryThread.findMany({
    where: {
      orgId,
      customerId,
      jobId: shipmentId,
      job: { deletedAt: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      jobId: true,
      title: true,
      description: true,
      department: true,
      priority: true,
      status: true,
      requiresCustomerAction: true,
      requiredResponseBy: true,
      createdAt: true,
      updatedAt: true,
      job: {
        select: {
          id: true,
          jobNumber: true,
          title: true,
          customerRef: true,
          stage: true,
        },
      },
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "desc" },
        take: MAX_DETAIL_QUERY_MESSAGES,
        select: {
          body: true,
          createdAt: true,
        },
      },
    },
  });
}

async function getCustomerSafeAuditLogs(orgId: string, customerId: string) {
  return db.chaAuditLog.findMany({
    where: {
      orgId,
      job: {
        customerId,
        deletedAt: null,
      },
      event: {
        in: Array.from(CUSTOMER_SAFE_AUDIT_EVENTS),
      },
    },
    orderBy: { timestamp: "desc" },
    take: 40,
    select: {
      id: true,
      jobId: true,
      entityType: true,
      event: true,
      timestamp: true,
      prevState: true,
      newState: true,
      remarks: true,
      job: {
        select: {
          id: true,
          jobNumber: true,
          title: true,
          customerRef: true,
          stage: true,
        },
      },
    },
  });
}

async function getCustomerSafeAuditLogsForJob(orgId: string, customerId: string, shipmentId: string) {
  return db.chaAuditLog.findMany({
    where: {
      orgId,
      jobId: shipmentId,
      job: {
        customerId,
        deletedAt: null,
      },
      event: {
        in: Array.from(CUSTOMER_SAFE_AUDIT_EVENTS),
      },
    },
    orderBy: { timestamp: "desc" },
    take: MAX_DETAIL_UPDATES,
    select: {
      id: true,
      jobId: true,
      entityType: true,
      event: true,
      timestamp: true,
      prevState: true,
      newState: true,
      remarks: true,
      job: {
        select: {
          id: true,
          jobNumber: true,
          title: true,
          customerRef: true,
          stage: true,
        },
      },
    },
  });
}

async function getCustomerVisibleStageMappings(orgId: string) {
  return db.customerVisibleStageMapping.findMany({
    where: {
      orgId,
      isVisible: true,
    },
    orderBy: { sortOrder: "asc" },
    select: {
      internalStageKey: true,
      label: true,
      description: true,
      sortOrder: true,
    },
  });
}
