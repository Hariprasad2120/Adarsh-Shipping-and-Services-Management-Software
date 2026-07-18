import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { formatChaBadgeLabel } from "@/lib/cha-badges";
import type { getPortalSession } from "./auth";

type PortalSession = NonNullable<Awaited<ReturnType<typeof getPortalSession>>>;

const RECENT_COMPLETION_WINDOW_DAYS = 30;
const MAX_ACTION_ITEMS = 6;
const MAX_RECENT_UPDATES = 6;
const MAX_DOCUMENT_ITEMS = 5;
const MAX_QUERY_ITEMS = 5;
const MAX_NOTIFICATION_ITEMS = 5;
const MAX_FEEDBACK_ITEMS = 5;
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

const QUERY_ACTION_STATUSES = new Set([
  "AWAITING_CUSTOMER_RESPONSE",
]);

const CLOSED_QUERY_STATUSES = new Set([
  "RESOLVED",
  "CLOSED",
]);

type JobRecord = Awaited<ReturnType<typeof getJobsForCustomer>>[number];
type SubmissionRecord = Awaited<ReturnType<typeof getDocumentSubmissionsForCustomer>>[number];
type ChecklistRecord = Awaited<ReturnType<typeof getVisibleChecklistsForCustomer>>[number];
type ChecklistResponseRecord = Awaited<ReturnType<typeof getChecklistResponsesForCustomer>>[number];
type QueryRecord = Awaited<ReturnType<typeof getQueriesForCustomer>>[number];
type NotificationRecord = Awaited<ReturnType<typeof getNotificationsForPortalUser>>[number];
type RatingRecord = Awaited<ReturnType<typeof getRatingsForPortalUser>>[number];
type AuditRecord = Awaited<ReturnType<typeof getCustomerSafeAuditLogs>>[number];
type StageMappingRecord = Awaited<ReturnType<typeof getCustomerVisibleStageMappings>>[number];

export type CustomerPortalDashboardActionItem = {
  id: string;
  type: "DOCUMENT" | "CHECKLIST" | "QUERY";
  title: string;
  status: string;
  jobId: string;
  jobNumber: string;
  jobTitle: string;
  customerRef: string | null;
  stageLabel: string;
  detail: string;
  dueAt: string | null;
  updatedAt: string;
  href: string;
  tone: "primary" | "warning";
};

export type CustomerPortalDashboardUpdateItem = {
  id: string;
  title: string;
  detail: string;
  jobId: string;
  jobNumber: string;
  stageLabel: string;
  occurredAt: string;
  href: string;
};

export type CustomerPortalDashboardQueryItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  jobId: string;
  jobNumber: string;
  jobTitle: string;
  stageLabel: string;
  detail: string;
  requiresCustomerAction: boolean;
  requiredResponseBy: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  href: string;
};

export type CustomerPortalDashboardDocumentStatusSummary = {
  counts: {
    uploaded: number;
    underReview: number;
    accepted: number;
    rejected: number;
    clarificationRequired: number;
    reuploadRequired: number;
  };
  recentItems: Array<{
    id: string;
    jobId: string;
    jobNumber: string;
    requirementName: string;
    status: string;
    updatedAt: string;
    reviewerComment: string | null;
    href: string;
  }>;
};

export type CustomerPortalDashboardFeedbackItem = {
  id: string;
  jobId: string;
  jobNumber: string;
  jobTitle: string;
  stageLabel: string;
  submittedAt: string | null;
  overallRating: number | null;
  followUpStatus: string | null;
  categoryLabel: string | null;
  href: string;
};

export type CustomerPortalDashboardData = {
  shipmentSnapshot: {
    activeJobs: number;
    inProgressJobs: number;
    awaitingCustomerJobs: number;
    recentlyCompletedJobs: number;
    totalJobs: number;
  };
  topStats: {
    activeJobs: number;
    awaitingCustomerAction: number;
    openQueries: number;
    unreadNotifications: number;
  };
  actionRequired: CustomerPortalDashboardActionItem[];
  recentUpdates: CustomerPortalDashboardUpdateItem[];
  outstandingQueries: CustomerPortalDashboardQueryItem[];
  documentStatus: CustomerPortalDashboardDocumentStatusSummary;
  pendingChecklistDecisions: Array<{
    id: string;
    jobId: string;
    jobNumber: string;
    jobTitle: string;
    stageLabel: string;
    checklistLabel: string;
    visibleAt: string | null;
    status: string;
    href: string;
  }>;
  notificationSummary: {
    unreadCount: number;
    recent: Array<{
      id: string;
      title: string;
      body: string | null;
      kind: string;
      createdAt: string;
      readAt: string | null;
      href: string | null;
    }>;
  };
  serviceFeedback: {
    pending: CustomerPortalDashboardFeedbackItem[];
    recentSubmitted: CustomerPortalDashboardFeedbackItem[];
  };
  sectionErrors: Partial<Record<
    | "shipmentSnapshot"
    | "actionRequired"
    | "recentUpdates"
    | "outstandingQueries"
    | "documentStatus"
    | "pendingChecklistDecisions"
    | "notificationSummary"
    | "serviceFeedback",
    string
  >>;
};

type DashboardSettledData = {
  jobs: JobRecord[] | null;
  submissions: SubmissionRecord[] | null;
  checklists: ChecklistRecord[] | null;
  checklistResponses: ChecklistResponseRecord[] | null;
  queries: QueryRecord[] | null;
  notifications: NotificationRecord[] | null;
  ratings: RatingRecord[] | null;
  audits: AuditRecord[] | null;
  stageMappings: StageMappingRecord[] | null;
};

export async function getCustomerPortalDashboardData(
  session: Pick<PortalSession, "orgId" | "customerId" | "portalUser">,
): Promise<CustomerPortalDashboardData> {
  const now = await getNow();
  const sectionErrors: CustomerPortalDashboardData["sectionErrors"] = {};

  const [
    jobsResult,
    submissionsResult,
    checklistsResult,
    checklistResponsesResult,
    queriesResult,
    notificationsResult,
    ratingsResult,
    auditsResult,
    stageMappingsResult,
  ] = await Promise.allSettled([
    getJobsForCustomer(session.orgId, session.portalUser.customerId),
    getDocumentSubmissionsForCustomer(session.orgId, session.portalUser.customerId),
    getVisibleChecklistsForCustomer(session.orgId, session.portalUser.customerId),
    getChecklistResponsesForCustomer(session.orgId, session.portalUser.customerId),
    getQueriesForCustomer(session.orgId, session.portalUser.customerId),
    getNotificationsForPortalUser(session.portalUser.id),
    getRatingsForPortalUser(session.portalUser.id),
    getCustomerSafeAuditLogs(session.orgId, session.portalUser.customerId),
    getCustomerVisibleStageMappings(session.orgId),
  ]);

  const data: DashboardSettledData = {
    jobs: readSettled(jobsResult, "shipmentSnapshot", sectionErrors),
    submissions: readSettled(submissionsResult, "documentStatus", sectionErrors),
    checklists: readSettled(checklistsResult, "pendingChecklistDecisions", sectionErrors),
    checklistResponses: readSettled(checklistResponsesResult, "pendingChecklistDecisions", sectionErrors),
    queries: readSettled(queriesResult, "outstandingQueries", sectionErrors),
    notifications: readSettled(notificationsResult, "notificationSummary", sectionErrors),
    ratings: readSettled(ratingsResult, "serviceFeedback", sectionErrors),
    audits: readSettled(auditsResult, "recentUpdates", sectionErrors),
    stageMappings: readSettled(stageMappingsResult, "recentUpdates", sectionErrors),
  };

  const shipmentSnapshot = buildShipmentSnapshot(data.jobs, sectionErrors, now);
  const actionRequired = buildActionRequiredItems(
    data.jobs,
    data.submissions,
    data.checklists,
    data.checklistResponses,
    data.queries,
    data.stageMappings,
    sectionErrors,
    now,
  );
  const recentUpdates = buildRecentUpdates(data.audits, data.stageMappings);
  const outstandingQueries = buildOutstandingQueries(data.queries, data.stageMappings);
  const documentStatus = buildDocumentStatusSummary(data.submissions);
  const pendingChecklistDecisions = buildPendingChecklistDecisions(
    data.checklists,
    data.checklistResponses,
    data.stageMappings,
    sectionErrors,
    now,
  );
  const notificationSummary = buildNotificationSummary(data.notifications);
  const serviceFeedback = buildServiceFeedback(data.jobs, data.ratings, data.stageMappings, now);
  const awaitingCustomerJobs = new Set(actionRequired.map((item) => item.jobId)).size;

  if (data.submissions === null || data.checklists === null || data.checklistResponses === null || data.queries === null) {
    sectionErrors.actionRequired = sectionErrors.actionRequired ?? "Action-required items are temporarily unavailable.";
  }

  return {
    shipmentSnapshot: {
      ...shipmentSnapshot,
      awaitingCustomerJobs,
    },
    topStats: {
      activeJobs: shipmentSnapshot.activeJobs,
      awaitingCustomerAction: awaitingCustomerJobs,
      openQueries: outstandingQueries.length,
      unreadNotifications: notificationSummary.unreadCount,
    },
    actionRequired,
    recentUpdates,
    outstandingQueries,
    documentStatus,
    pendingChecklistDecisions,
    notificationSummary,
    serviceFeedback,
    sectionErrors,
  };
}

function readSettled<T>(
  result: PromiseSettledResult<T>,
  section: keyof CustomerPortalDashboardData["sectionErrors"],
  sectionErrors: CustomerPortalDashboardData["sectionErrors"],
) {
  if (result.status === "fulfilled") return result.value;
  sectionErrors[section] = sectionErrors[section] ?? "This section is temporarily unavailable.";
  return null;
}

function buildShipmentSnapshot(
  jobs: JobRecord[] | null,
  sectionErrors: CustomerPortalDashboardData["sectionErrors"],
  now: Date,
) {
  if (!jobs) {
    return {
      activeJobs: 0,
      inProgressJobs: 0,
      awaitingCustomerJobs: 0,
      recentlyCompletedJobs: 0,
      totalJobs: 0,
    };
  }

  const recentThreshold = new Date(now.getTime() - RECENT_COMPLETION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const activeJobs = jobs.filter((job) => job.status === "ACTIVE" && job.stage !== "FILED").length;
  const inProgressJobs = jobs.filter((job) => job.status === "ACTIVE").length;
  const recentlyCompletedJobs = jobs.filter((job) => {
    const completedLike = job.status === "COMPLETED" || job.stage === "FILED";
    return completedLike && job.updatedAt >= recentThreshold;
  }).length;

  if (jobs.length === 0) {
    sectionErrors.shipmentSnapshot = undefined;
  }

  return {
    activeJobs,
    inProgressJobs,
    awaitingCustomerJobs: 0,
    recentlyCompletedJobs,
    totalJobs: jobs.length,
  };
}

export function buildActionRequiredItems(
  jobs: JobRecord[] | null,
  submissions: SubmissionRecord[] | null,
  checklists: ChecklistRecord[] | null,
  checklistResponses: ChecklistResponseRecord[] | null,
  queries: QueryRecord[] | null,
  stageMappings: StageMappingRecord[] | null,
  sectionErrors: CustomerPortalDashboardData["sectionErrors"],
  now: Date,
) {
  if (!jobs || !submissions || !checklists || !checklistResponses || !queries) {
    return [] as CustomerPortalDashboardActionItem[];
  }

  const stageMap = buildStageMap(stageMappings);

  const accountResponses = new Set(checklistResponses.map((response) => response.checklistId));
  const items: Array<CustomerPortalDashboardActionItem & { urgencyRank: number; dueSort: number; updatedSort: number }> = [];

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
      jobId: checklist.jobId,
      jobNumber: checklist.job.jobNumber,
      jobTitle: checklist.job.title,
      customerRef: checklist.job.customerRef,
      stageLabel: formatStageLabel(checklist.job.stage, stageMap),
      detail: "Your approval or rejection is pending for the latest checklist.",
      dueAt: checklist.customerApprovalVisibleAt.toISOString(),
      updatedAt: checklist.updatedAt.toISOString(),
      href: shipmentHref(checklist.jobId),
      tone: "warning",
      urgencyRank: 4,
      dueSort: checklist.customerApprovalVisibleAt.getTime(),
      updatedSort: checklist.updatedAt.getTime(),
    });
  }

  for (const query of queries) {
    const needsCustomerResponse = query.requiresCustomerAction || QUERY_ACTION_STATUSES.has(query.status);
    if (!needsCustomerResponse) continue;
    const dueAt = query.requiredResponseBy?.toISOString() ?? null;
    items.push({
      id: `query-${query.id}`,
      type: "QUERY",
      title: query.title,
      status: formatChaBadgeLabel(query.status),
      jobId: query.jobId,
      jobNumber: query.job.jobNumber,
      jobTitle: query.job.title,
      customerRef: query.job.customerRef,
      stageLabel: formatStageLabel(query.job.stage, stageMap),
      detail: query.description,
      dueAt,
      updatedAt: query.updatedAt.toISOString(),
      href: shipmentHref(query.jobId),
      tone: query.priority === "URGENT" || query.priority === "HIGH" ? "warning" : "primary",
      urgencyRank: query.priority === "URGENT" ? 5 : query.priority === "HIGH" ? 4 : 3,
      dueSort: query.requiredResponseBy?.getTime() ?? Number.POSITIVE_INFINITY,
      updatedSort: query.updatedAt.getTime(),
    });
  }

  const deduped = new Map(items.map((item) => [item.id, item]));
  const sorted = Array.from(deduped.values()).sort((a, b) => {
    if (b.urgencyRank !== a.urgencyRank) return b.urgencyRank - a.urgencyRank;
    if (a.dueSort !== b.dueSort) return a.dueSort - b.dueSort;
    return b.updatedSort - a.updatedSort;
  });

  return sorted.slice(0, MAX_ACTION_ITEMS).map(stripActionMetadata);
}

export function buildRecentUpdates(
  audits: AuditRecord[] | null,
  stageMappings: StageMappingRecord[] | null,
) {
  if (!audits) return [] as CustomerPortalDashboardUpdateItem[];
  const stageMap = buildStageMap(stageMappings);

  return audits
    .filter((audit) => CUSTOMER_SAFE_AUDIT_EVENTS.has(audit.event))
    .slice(0, MAX_RECENT_UPDATES)
    .map((audit) => {
      const stageLabel = formatStageLabel(audit.newState || audit.job.stage, stageMap);
      return {
        id: audit.id,
        title: buildAuditTitle(audit, stageMap),
        detail: audit.remarks || "Shipment activity was updated.",
        jobId: audit.jobId ?? audit.job.id,
        jobNumber: audit.job.jobNumber,
        stageLabel,
        occurredAt: audit.timestamp.toISOString(),
        href: shipmentHref(audit.job.id),
      };
    });
}

export function buildOutstandingQueries(
  queries: QueryRecord[] | null,
  stageMappings: StageMappingRecord[] | null,
) {
  if (!queries) return [] as CustomerPortalDashboardQueryItem[];
  const stageMap = buildStageMap(stageMappings);

  return queries
    .filter((query) => !CLOSED_QUERY_STATUSES.has(query.status))
    .slice(0, MAX_QUERY_ITEMS)
    .map((query) => ({
      id: query.id,
      title: query.title,
      status: formatChaBadgeLabel(query.status),
      priority: formatChaBadgeLabel(query.priority),
      jobId: query.jobId,
      jobNumber: query.job.jobNumber,
      jobTitle: query.job.title,
      stageLabel: formatStageLabel(query.job.stage, stageMap),
      detail: query.description,
      requiresCustomerAction: query.requiresCustomerAction || QUERY_ACTION_STATUSES.has(query.status),
      requiredResponseBy: query.requiredResponseBy?.toISOString() ?? null,
      lastMessagePreview: query.messages[0]?.body ?? null,
      lastMessageAt: query.messages[0]?.createdAt.toISOString() ?? null,
      href: shipmentHref(query.jobId),
    }));
}

export function buildDocumentStatusSummary(
  submissions: SubmissionRecord[] | null,
): CustomerPortalDashboardDocumentStatusSummary {
  if (!submissions) {
    return {
      counts: {
        uploaded: 0,
        underReview: 0,
        accepted: 0,
        rejected: 0,
        clarificationRequired: 0,
        reuploadRequired: 0,
      },
      recentItems: [],
    };
  }

  const optionalCustomerSubmissions = submissions.filter(
    (submission) => submission.requirement.category === CUSTOMER_OPTIONAL_UPLOAD_CATEGORY,
  );

  const latestSubmissionByRequirement = new Map<string, SubmissionRecord>();
  for (const submission of optionalCustomerSubmissions) {
    if (submission.status === "SUPERSEDED") continue;
    const existing = latestSubmissionByRequirement.get(submission.requirementId);
    if (!existing || submission.updatedAt > existing.updatedAt) {
      latestSubmissionByRequirement.set(submission.requirementId, submission);
    }
  }

  const counts = {
    uploaded: 0,
    underReview: 0,
    accepted: 0,
    rejected: 0,
    clarificationRequired: 0,
    reuploadRequired: 0,
  };

  const recentItems = Array.from(latestSubmissionByRequirement.values())
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, MAX_DOCUMENT_ITEMS)
    .map((submission) => {
      switch (submission.status) {
        case "UPLOADED":
          counts.uploaded += 1;
          break;
        case "UNDER_REVIEW":
          counts.underReview += 1;
          break;
        case "ACCEPTED":
          counts.accepted += 1;
          break;
        case "REJECTED":
          counts.rejected += 1;
          break;
        case "CLARIFICATION_REQUIRED":
          counts.clarificationRequired += 1;
          break;
        case "REUPLOAD_REQUIRED":
          counts.reuploadRequired += 1;
          break;
        default:
          break;
      }

      return {
        id: submission.id,
        jobId: submission.jobId,
        jobNumber: submission.job.jobNumber,
        requirementName: submission.requirement.name,
        status: formatChaBadgeLabel(submission.status),
        updatedAt: submission.updatedAt.toISOString(),
        reviewerComment: submission.reviewerComment,
        href: shipmentHref(submission.jobId),
      };
    });

  for (const submission of Array.from(latestSubmissionByRequirement.values()).slice(MAX_DOCUMENT_ITEMS)) {
    switch (submission.status) {
      case "UPLOADED":
        counts.uploaded += 1;
        break;
      case "UNDER_REVIEW":
        counts.underReview += 1;
        break;
      case "ACCEPTED":
        counts.accepted += 1;
        break;
      case "REJECTED":
        counts.rejected += 1;
        break;
      case "CLARIFICATION_REQUIRED":
        counts.clarificationRequired += 1;
        break;
      case "REUPLOAD_REQUIRED":
        counts.reuploadRequired += 1;
        break;
      default:
        break;
    }
  }

  return { counts, recentItems };
}

export function buildPendingChecklistDecisions(
  checklists: ChecklistRecord[] | null,
  checklistResponses: ChecklistResponseRecord[] | null,
  stageMappings: StageMappingRecord[] | null,
  sectionErrors: CustomerPortalDashboardData["sectionErrors"],
  now: Date,
) {
  if (!checklists || !checklistResponses) return [] as CustomerPortalDashboardData["pendingChecklistDecisions"];
  const stageMap = buildStageMap(stageMappings);
  const accountResponses = new Set(checklistResponses.map((response) => response.checklistId));

  return checklists
    .filter((checklist) => checklist.customerApprovalVisibleAt && checklist.customerApprovalVisibleAt <= now)
    .filter((checklist) => !accountResponses.has(checklist.id))
    .map((checklist) => ({
      id: checklist.id,
      jobId: checklist.jobId,
      jobNumber: checklist.job.jobNumber,
      jobTitle: checklist.job.title,
      stageLabel: formatStageLabel(checklist.job.stage, stageMap),
      checklistLabel: checklist.currentFileVersion
        ? `Checklist v${checklist.currentFileVersion.versionNumber}`
        : "Checklist Approval",
      visibleAt: checklist.customerApprovalVisibleAt?.toISOString() ?? null,
      status: formatChaBadgeLabel(checklist.currentApprovalStage),
      href: shipmentHref(checklist.jobId),
    }))
    .sort((a, b) => {
      if (!a.visibleAt || !b.visibleAt) return 0;
      return new Date(a.visibleAt).getTime() - new Date(b.visibleAt).getTime();
    })
    .slice(0, MAX_ACTION_ITEMS);
}

export function buildNotificationSummary(
  notifications: NotificationRecord[] | null,
) {
  if (!notifications) {
    return {
      unreadCount: 0,
      recent: [],
    };
  }

  return {
    unreadCount: notifications.filter((notification) => !notification.readAt).length,
    recent: notifications.slice(0, MAX_NOTIFICATION_ITEMS).map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      kind: notification.kind,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null,
      href: notification.link,
    })),
  };
}

export function buildServiceFeedback(
  jobs: JobRecord[] | null,
  ratings: RatingRecord[] | null,
  stageMappings: StageMappingRecord[] | null,
  now: Date,
) {
  if (!jobs || !ratings) {
    return {
      pending: [] as CustomerPortalDashboardFeedbackItem[],
      recentSubmitted: [] as CustomerPortalDashboardFeedbackItem[],
    };
  }

  const stageMap = buildStageMap(stageMappings);
  const recentThreshold = new Date(now.getTime() - RECENT_COMPLETION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const ratingsByJobId = new Map(ratings.map((rating) => [rating.jobId, rating]));
  const completedJobs = jobs.filter((job) => {
    const completedLike = job.status === "COMPLETED" || job.stage === "FILED";
    return completedLike && job.updatedAt >= recentThreshold;
  });

  const pending = completedJobs
    .filter((job) => !ratingsByJobId.has(job.id))
    .slice(0, MAX_FEEDBACK_ITEMS)
    .map((job) => ({
      id: `pending-${job.id}`,
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobTitle: job.title,
      stageLabel: formatStageLabel(job.stage, stageMap),
      submittedAt: null,
      overallRating: null,
      followUpStatus: null,
      categoryLabel: null,
      href: shipmentHref(job.id),
    }));

  const recentSubmitted = ratings
    .slice(0, MAX_FEEDBACK_ITEMS)
    .map((rating) => ({
      id: rating.id,
      jobId: rating.jobId,
      jobNumber: rating.job.jobNumber,
      jobTitle: rating.job.title,
      stageLabel: formatStageLabel(rating.job.stage, stageMap),
      submittedAt: rating.submittedAt.toISOString(),
      overallRating: rating.overallRating,
      followUpStatus: formatChaBadgeLabel(rating.followUpStatus),
      categoryLabel: rating.category?.label ?? null,
      href: shipmentHref(rating.jobId),
    }));

  return { pending, recentSubmitted };
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

function buildStageMap(stageMappings: StageMappingRecord[] | null) {
  return new Map(
    (stageMappings ?? [])
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

function stripActionMetadata(
  item: CustomerPortalDashboardActionItem & {
    urgencyRank: number;
    dueSort: number;
    updatedSort: number;
  },
): CustomerPortalDashboardActionItem {
  const rest = { ...item };
  delete (rest as Partial<typeof item>).urgencyRank;
  delete (rest as Partial<typeof item>).dueSort;
  delete (rest as Partial<typeof item>).updatedSort;
  return rest;
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
          category: true,
          isMandatory: true,
          status: true,
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

async function getNotificationsForPortalUser(portalUserId: string) {
  return db.customerPortalNotification.findMany({
    where: {
      portalUserId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      kind: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });
}

async function getRatingsForPortalUser(portalUserId: string) {
  return db.shipmentServiceRating.findMany({
    where: {
      portalUserId,
      job: { deletedAt: null },
    },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      jobId: true,
      overallRating: true,
      followUpStatus: true,
      submittedAt: true,
      category: {
        select: {
          label: true,
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
    take: 24,
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
