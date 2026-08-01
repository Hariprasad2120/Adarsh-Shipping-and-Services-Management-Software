import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { createNotification } from "@/modules/notifications/service";
import { redactIcegateValue } from "./redaction";

type ProcessIcegateEventInput = {
  submissionId: string;
  eventKind:
    | "SUBMITTED"
    | "ACKNOWLEDGED"
    | "QUERY_RECEIVED"
    | "REJECTION_RECEIVED"
    | "PROCESSED"
    | "RETRY_SCHEDULED"
    | "FAILED";
  status:
    | "SENT"
    | "ACKNOWLEDGED"
    | "QUERY"
    | "REJECTED"
    | "PROCESSED"
    | "RETRYABLE"
    | "FAILED";
  externalStatus?: string | null;
  safeMessage?: string | null;
  metadata?: Record<string, unknown>;
  actorId?: string | null;
  occurredAt?: Date;
  retryAfter?: Date | null;
};

function buildEventKey(input: ProcessIcegateEventInput) {
  const responseHash =
    typeof input.metadata?.responseHash === "string" ? input.metadata.responseHash : "";
  const requestHash =
    typeof input.metadata?.requestHash === "string" ? input.metadata.requestHash : "";
  const externalCode =
    typeof input.metadata?.externalCode === "string" ? input.metadata.externalCode : "";
  const messageId =
    typeof input.metadata?.messageId === "string" ? input.metadata.messageId : "";
  return [
    input.eventKind,
    input.status,
    input.externalStatus ?? "",
    externalCode,
    messageId,
    responseHash,
    requestHash,
  ].join("|");
}

function buildSubmissionUpdate(input: ProcessIcegateEventInput): Prisma.ChaCustomsExternalSubmissionUpdateInput {
  const now = input.occurredAt ?? new Date();
  return {
    status: input.status,
    submittedAt: input.status === "SENT" ? now : undefined,
    acknowledgedAt: input.status === "ACKNOWLEDGED" ? now : undefined,
    processedAt: input.status === "PROCESSED" ? now : undefined,
    retryCount: input.status === "RETRYABLE" ? { increment: 1 } : undefined,
    nextRetryAt: input.status === "RETRYABLE" ? input.retryAfter ?? null : undefined,
    lastErrorCode:
      input.status === "REJECTED" || input.status === "FAILED" || input.status === "RETRYABLE"
        ? input.externalStatus ?? null
        : undefined,
    lastSafeMessage: input.safeMessage ?? undefined,
    responseRedactedSnapshot:
      input.metadata == null
        ? undefined
        : (redactIcegateValue({
            eventKind: input.eventKind,
            status: input.status,
            externalStatus: input.externalStatus,
            safeMessage: input.safeMessage,
            ...input.metadata,
          }) as Prisma.InputJsonValue),
  };
}

async function applyReadModelUpdates(params: {
  tx: Prisma.TransactionClient;
  submission: {
    profile: {
      movementDirection: "IMPORT" | "EXPORT";
      importHeader: { id: string; outOfChargeDate: Date | null } | null;
      exportHeader: { id: string; leoDate: Date | null } | null;
    };
  };
  input: ProcessIcegateEventInput;
}) {
  if (params.input.eventKind !== "PROCESSED") return;
  const statusCode = String(params.input.externalStatus ?? "");
  const processedAt = params.input.occurredAt ?? new Date();

  if (params.submission.profile.movementDirection === "IMPORT" && /OOC/i.test(statusCode)) {
    const header = params.submission.profile.importHeader;
    if (header?.outOfChargeDate && header.outOfChargeDate.getTime() !== processedAt.getTime()) {
      return;
    }
    if (header && !header.outOfChargeDate) {
      await params.tx.chaImportFilingHeader.update({
        where: { id: header.id },
        data: { outOfChargeDate: processedAt },
      });
    }
  }

  if (params.submission.profile.movementDirection === "EXPORT" && /LEO/i.test(statusCode)) {
    const header = params.submission.profile.exportHeader;
    if (header?.leoDate && header.leoDate.getTime() !== processedAt.getTime()) {
      return;
    }
    if (header && !header.leoDate) {
      await params.tx.chaExportFilingHeader.update({
        where: { id: header.id },
        data: { leoDate: processedAt },
      });
    }
  }
}

async function notifyRecipients(params: {
  submission: {
    profile: {
      job: {
        id: string;
        jobNumber: string;
        orgId: string;
        primaryOwnerId: string;
        assignedManagerId: string | null;
        assignments: { userId: string }[];
      };
    };
  };
  input: ProcessIcegateEventInput;
}) {
  if (!["QUERY_RECEIVED", "REJECTION_RECEIVED", "PROCESSED"].includes(params.input.eventKind)) {
    return;
  }

  const recipients = Array.from(
    new Set(
      [
        params.submission.profile.job.primaryOwnerId,
        params.submission.profile.job.assignedManagerId,
        ...params.submission.profile.job.assignments.map((assignment) => assignment.userId),
      ].filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );
  if (recipients.length === 0) return;

  const kind =
    params.input.eventKind === "QUERY_RECEIVED"
      ? "CHA_CUSTOMS_ICEGATE_QUERY"
      : params.input.eventKind === "REJECTION_RECEIVED"
        ? "CHA_CUSTOMS_ICEGATE_REJECTION"
        : "CHA_CUSTOMS_ICEGATE_PROCESSED";

  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        userId,
        orgId: params.submission.profile.job.orgId,
        actorId: params.input.actorId ?? undefined,
        kind,
        title: `ICEGATE update for ${params.submission.profile.job.jobNumber}`,
        body: params.input.safeMessage ?? `ICEGATE reported ${params.input.eventKind.toLowerCase().replaceAll("_", " ")}.`,
        link: `/cha/jobs/${params.submission.profile.job.id}?tab=customsFiling`,
        payload: {
          submissionId: params.input.submissionId,
          eventKind: params.input.eventKind,
          externalStatus: params.input.externalStatus ?? null,
        },
        source: "System",
        variant:
          params.input.eventKind === "REJECTION_RECEIVED" || params.input.eventKind === "QUERY_RECEIVED"
            ? "warning"
            : "info",
      }),
    ),
  );
}

export async function processIcegateExternalEvent(input: ProcessIcegateEventInput) {
  const eventKey = buildEventKey(input);

  return db.$transaction(async (tx) => {
    const submission = await tx.chaCustomsExternalSubmission.findUniqueOrThrow({
      where: { id: input.submissionId },
      include: {
        profile: {
          include: {
            importHeader: { select: { id: true, outOfChargeDate: true } },
            exportHeader: { select: { id: true, leoDate: true } },
            job: {
              select: {
                id: true,
                jobNumber: true,
                orgId: true,
                primaryOwnerId: true,
                assignedManagerId: true,
                assignments: { select: { userId: true } },
              },
            },
          },
        },
        events: {
          orderBy: { sequenceNo: "desc" },
          take: 50,
        },
      },
    });

    const duplicate = submission.events.find((event) => {
      const metadata =
        event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
          ? (event.metadata as Record<string, unknown>)
          : null;
      return metadata?.eventKey === eventKey;
    });
    if (duplicate) {
      return { submissionId: submission.id, eventId: duplicate.id, deduplicated: true };
    }

    const nextSequenceNo = (submission.events[0]?.sequenceNo ?? 0) + 1;
    const metadata = {
      ...(input.metadata ?? {}),
      eventKey,
    };

    const event = await tx.chaCustomsExternalEvent.create({
      data: {
        submissionId: submission.id,
        sequenceNo: nextSequenceNo,
        eventKind: input.eventKind,
        externalStatus: input.externalStatus ?? null,
        safeMessage: input.safeMessage ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        recordedById: input.actorId ?? null,
        retryAfter: input.retryAfter ?? null,
        metadata: redactIcegateValue(metadata) as Prisma.InputJsonValue,
      },
    });

    await tx.chaCustomsExternalSubmission.update({
      where: { id: submission.id },
      data: buildSubmissionUpdate(input),
    });

    await applyReadModelUpdates({ tx, submission, input });
    await notifyRecipients({ submission, input });

    return { submissionId: submission.id, eventId: event.id, deduplicated: false };
  });
}
