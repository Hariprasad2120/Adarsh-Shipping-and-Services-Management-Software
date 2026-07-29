import "server-only";

import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";

export type ChaDueDateWarningType =
  | "DELIVERY_ORDER"
  | "SECTION49"
  | "FILING_ATTACHMENT";

export type ChaDueDateWarning = {
  jobId: string;
  jobNumber: string;
  type: ChaDueDateWarningType;
  subjectLabel?: string | null;
  validityDate: Date;
  daysUntilExpiry: number;
  severity: "expired" | "expiring";
  message: string;
  notificationId: string;
  link: string;
  actionLabel: string;
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

type DueDateCandidate = {
  lookupKey: string;
  jobId: string;
  jobNumber: string;
  type: ChaDueDateWarningType;
  subjectLabel: string | null;
  validityDate: Date;
  severity: "expired" | "expiring";
};

const DUE_DATE_KINDS = [
  "CHA_DELIVERY_ORDER_VALIDITY_EXPIRED",
  "CHA_DELIVERY_ORDER_VALIDITY_EXPIRING",
  "CHA_SECTION49_VALIDITY_EXPIRED",
  "CHA_SECTION49_VALIDITY_EXPIRING",
  "CHA_FILING_ATTACHMENT_VALIDITY_EXPIRED",
  "CHA_FILING_ATTACHMENT_VALIDITY_EXPIRING",
];
const FILING_QUERY_ACTIVITY_EVENTS = [
  "FILING_QUERY_CREATED",
  "FILING_QUERY_UPDATED",
  "FILING_QUERY_COMMENT_ADDED",
  "FILING_QUERY_CLOSED",
];

function daysUntil(validityDate: Date, today: Date) {
  const expiry = new Date(validityDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
}

function stateKey(
  type: ChaDueDateWarningType,
  severity: "expired" | "expiring",
  validityDate: Date,
  entityKey?: string,
) {
  const date = validityDate.toISOString().slice(0, 10);
  return entityKey
    ? `${type}:${entityKey}:${severity}:${date}`
    : `${type}:${severity}:${date}`;
}

function presentation(candidate: DueDateCandidate, notificationId: string, today: Date) {
  const remaining = daysUntil(candidate.validityDate, today);
  const label =
    candidate.type === "DELIVERY_ORDER"
      ? "Delivery Order validity"
      : candidate.type === "SECTION49"
        ? "Section 49 validity"
        : `${candidate.subjectLabel || "Document"} validity`;
  const link =
    candidate.type === "DELIVERY_ORDER"
      ? `/cha/jobs/${candidate.jobId}?tab=additionalData&focus=deliveryOrderExtensionDate`
      : candidate.type === "FILING_ATTACHMENT"
        ? `/cha/jobs/${candidate.jobId}?tab=filing`
        : `/cha/jobs/${candidate.jobId}?tab=docs`;

  return {
    jobId: candidate.jobId,
    jobNumber: candidate.jobNumber,
    type: candidate.type,
    subjectLabel: candidate.subjectLabel,
    validityDate: candidate.validityDate,
    daysUntilExpiry: remaining,
    severity: candidate.severity,
    message:
      candidate.severity === "expired"
        ? `${label} expired on ${candidate.validityDate.toLocaleDateString("en-IN")}.`
        : `${label} is expiring in ${remaining} day(s) on ${candidate.validityDate.toLocaleDateString("en-IN")}.`,
    notificationId,
    link,
    actionLabel: "Go To",
  } satisfies ChaDueDateWarning;
}

export async function computeChaDueDateWarnings(
  actorId: string,
  orgId: string,
  jobIds: string[],
): Promise<ChaDueDateWarning[]> {
  if (jobIds.length === 0) return [];
  const now = await getNow();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + 4);
  threshold.setHours(23, 59, 59, 999);

  const [deliveryOrderJobs, section49Jobs, attachments, notifications] =
    await Promise.all([
      db.chaJob.findMany({
        where: {
          id: { in: jobIds },
          orgId,
          deletedAt: null,
          status: "ACTIVE",
          stage: { not: "FILED" },
          additionalData: {
            is: {
              OR: [
                { deliveryOrderExtensionDate: { lte: threshold } },
                {
                  deliveryOrderExtensionDate: null,
                  deliveryOrderValidity: { lte: threshold },
                },
              ],
            },
          },
        },
        select: {
          id: true,
          jobNumber: true,
          additionalData: {
            select: {
              deliveryOrderValidity: true,
              deliveryOrderExtensionDate: true,
            },
          },
        },
      }),
      db.chaJob.findMany({
        where: {
          id: { in: jobIds },
          orgId,
          deletedAt: null,
          status: "ACTIVE",
          stage: { not: "FILED" },
          filingSection49Flag: {
            is: { isEnabled: true, validityDate: { lte: threshold } },
          },
        },
        select: {
          id: true,
          jobNumber: true,
          filingSection49Flag: { select: { validityDate: true } },
        },
      }),
      db.filingAttachment.findMany({
        where: {
          validityDate: { lte: threshold },
          instance: {
            job: {
              id: { in: jobIds },
              orgId,
              deletedAt: null,
              status: "ACTIVE",
              stage: { not: "FILED" },
            },
          },
        },
        select: {
          id: true,
          fileName: true,
          validityDate: true,
          documentRequirementLabel: true,
          checklistItem: { select: { label: true } },
          photoRequirement: { select: { label: true } },
          instance: {
            select: { job: { select: { id: true, jobNumber: true } } },
          },
        },
      }),
      db.notification.findMany({
        where: {
          userId: actorId,
          orgId,
          kind: { in: DUE_DATE_KINDS },
          dismissedAt: null,
        },
        select: { id: true, acknowledgedAt: true, payload: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const candidates: DueDateCandidate[] = [];
  for (const job of deliveryOrderJobs) {
    const validityDate =
      job.additionalData?.deliveryOrderExtensionDate ??
      job.additionalData?.deliveryOrderValidity;
    if (!validityDate) continue;
    const severity = daysUntil(validityDate, today) < 0 ? "expired" : "expiring";
    candidates.push({
      lookupKey: `${job.id}:${stateKey("DELIVERY_ORDER", severity, validityDate)}`,
      jobId: job.id,
      jobNumber: job.jobNumber,
      type: "DELIVERY_ORDER",
      subjectLabel: null,
      validityDate,
      severity,
    });
  }
  for (const job of section49Jobs) {
    const validityDate = job.filingSection49Flag?.validityDate;
    if (!validityDate) continue;
    const severity = daysUntil(validityDate, today) < 0 ? "expired" : "expiring";
    candidates.push({
      lookupKey: `${job.id}:${stateKey("SECTION49", severity, validityDate)}`,
      jobId: job.id,
      jobNumber: job.jobNumber,
      type: "SECTION49",
      subjectLabel: null,
      validityDate,
      severity,
    });
  }
  for (const attachment of attachments) {
    if (!attachment.validityDate) continue;
    const severity =
      daysUntil(attachment.validityDate, today) < 0 ? "expired" : "expiring";
    candidates.push({
      lookupKey: `${attachment.instance.job.id}:${stateKey("FILING_ATTACHMENT", severity, attachment.validityDate, attachment.id)}`,
      jobId: attachment.instance.job.id,
      jobNumber: attachment.instance.job.jobNumber,
      type: "FILING_ATTACHMENT",
      subjectLabel:
        attachment.documentRequirementLabel ??
        attachment.checklistItem?.label ??
        attachment.photoRequirement?.label ??
        attachment.fileName ??
        "Document",
      validityDate: attachment.validityDate,
      severity,
    });
  }

  const activeByKey = new Map<string, string>();
  for (const notification of notifications) {
    if (notification.acknowledgedAt) continue;
    const payload =
      notification.payload &&
      typeof notification.payload === "object" &&
      !Array.isArray(notification.payload)
        ? (notification.payload as Record<string, unknown>)
        : null;
    if (typeof payload?.jobId === "string" && typeof payload?.stateKey === "string") {
      activeByKey.set(`${payload.jobId}:${payload.stateKey}`, notification.id);
    }
  }

  const warnings: ChaDueDateWarning[] = [];
  for (const candidate of candidates) {
    const notificationId = activeByKey.get(candidate.lookupKey);
    if (notificationId) {
      warnings.push(presentation(candidate, notificationId, today));
    }
  }
  return warnings.sort(
    (left, right) => left.daysUntilExpiry - right.daysUntilExpiry,
  );
}

export async function listFilingQueryEscalationWarnings(
  orgId: string,
  jobIds: string[],
): Promise<FilingQueryEscalationWarning[]> {
  if (jobIds.length === 0) return [];
  const now = await getNow();
  const warningThreshold = new Date(now.getTime() - 60 * 60 * 1000);
  const queries = await db.filingWorkflowQuery.findMany({
    where: {
      status: { in: ["OPEN", "REPLIED"] },
      lastReminderAt: { lte: warningThreshold },
      instance: {
        jobId: { in: jobIds },
        job: { orgId, deletedAt: null },
      },
    },
    select: {
      id: true,
      title: true,
      lastReminderAt: true,
      instance: {
        select: {
          jobId: true,
          job: { select: { jobNumber: true } },
        },
      },
    },
  });
  if (queries.length === 0) return [];

  const logs = await db.chaAuditLog.findMany({
    where: {
      entityType: "FilingWorkflowQuery",
      entityId: { in: queries.map((query) => query.id) },
      event: { in: FILING_QUERY_ACTIVITY_EVENTS },
      actorId: { not: "system" },
    },
    select: { entityId: true, timestamp: true },
    orderBy: { timestamp: "desc" },
  });
  const latestActivity = new Map<string, Date>();
  for (const log of logs) {
    if (!latestActivity.has(log.entityId)) latestActivity.set(log.entityId, log.timestamp);
  }

  const warnings = new Map<string, FilingQueryEscalationWarning>();
  const counts = new Map<string, number>();
  for (const query of queries) {
    if (!query.lastReminderAt) continue;
    const activity = latestActivity.get(query.id);
    if (activity && activity > query.lastReminderAt) continue;
    const count = (counts.get(query.instance.jobId) ?? 0) + 1;
    counts.set(query.instance.jobId, count);
    const candidate: FilingQueryEscalationWarning = {
      jobId: query.instance.jobId,
      jobNumber: query.instance.job.jobNumber,
      queryId: query.id,
      queryTitle: query.title,
      overdueQueryCount: count,
      reminderTriggeredAt: query.lastReminderAt,
      warningTriggeredAt: new Date(query.lastReminderAt.getTime() + 60 * 60 * 1000),
      staleMinutes: Math.max(
        60,
        Math.floor((now.getTime() - query.lastReminderAt.getTime()) / 60_000),
      ),
    };
    const existing = warnings.get(candidate.jobId);
    if (!existing || existing.warningTriggeredAt > candidate.warningTriggeredAt) {
      warnings.set(candidate.jobId, candidate);
    }
  }

  return [...warnings.values()].map((warning) => ({
    ...warning,
    overdueQueryCount: counts.get(warning.jobId) ?? warning.overdueQueryCount,
  }));
}
