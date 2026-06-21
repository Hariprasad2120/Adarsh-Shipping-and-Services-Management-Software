import { db } from "@/lib/db";

export type RecruitAuditAction =
  | "recruit.job.created"
  | "recruit.job.updated"
  | "recruit.job.status_changed"
  | "recruit.job.published"
  | "recruit.candidate.created"
  | "recruit.candidate.updated"
  | "recruit.candidate.deleted"
  | "recruit.candidate.anonymized"
  | "recruit.candidate.resume_uploaded"
  | "recruit.candidate.resume_parsed"
  | "recruit.candidate.resume_confirmed"
  | "recruit.candidate.duplicate_merged"
  | "recruit.application.created"
  | "recruit.application.stage_changed"
  | "recruit.screening.run_started"
  | "recruit.screening.completed"
  | "recruit.screening.score_overridden"
  | "recruit.interview.scheduled"
  | "recruit.interview.cancelled"
  | "recruit.feedback.submitted"
  | "recruit.offer.created"
  | "recruit.offer.approved"
  | "recruit.offer.sent"
  | "recruit.offer.accepted"
  | "recruit.offer.declined"
  | "recruit.settings.updated"
  | "recruit.candidate.exported"
  | "recruit.candidate.resume_downloaded"
  | "recruit.automation.run_started"
  | "recruit.automation.run_completed";

interface RecruitAuditParams {
  orgId: string;
  actorId: string;
  action: RecruitAuditAction;
  entityType: string;
  entityId: string;
  correlationId?: string;
  changedFields?: Record<string, unknown>;
  reason?: string;
  source?: "UI" | "API" | "AUTOMATION" | "SYSTEM";
  metadata?: Record<string, unknown>;
}

export async function auditRecruit(params: RecruitAuditParams): Promise<void> {
  await db.recruitAuditEvent.create({
    data: {
      orgId: params.orgId,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      correlationId: params.correlationId,
      changedFields: params.changedFields as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue,
      reason: params.reason,
      source: params.source ?? "API",
      metadata: params.metadata as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue,
    },
  });
}

export async function listRecruitAuditEvents(
  orgId: string,
  opts: { entityType?: string; entityId?: string; page?: number; pageSize?: number }
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const skip = (page - 1) * pageSize;

  const where = {
    orgId,
    ...(opts.entityType ? { entityType: opts.entityType } : {}),
    ...(opts.entityId ? { entityId: opts.entityId } : {}),
  };

  const [items, total] = await db.$transaction([
    db.recruitAuditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.recruitAuditEvent.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
