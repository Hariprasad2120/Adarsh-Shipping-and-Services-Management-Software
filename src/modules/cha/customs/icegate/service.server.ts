import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getChaCustomsFeatureFlags, isChaCustomsFeatureEnabled } from "../feature-flags";
import { buildIcegateIdempotencyKey, sha256Base64 } from "./crypto.server";
import { processIcegateExternalEvent } from "./event-processing.server";
import { MockIcegateClient } from "./mock-client.server";
import { RealIcegateClient } from "./client.server";
import { redactIcegateValue } from "./redaction";
import type { IcegateClient, IcegateDocumentType, IcegateSubmitResult } from "./types";

export type SubmitGeneratedIcegateFileInput = {
  actorId: string;
  orgId: string;
  jobId: string;
  flatFileGenerationId: string;
  documentType: IcegateDocumentType;
  client?: IcegateClient;
};

export async function submitGeneratedIcegateFile(input: SubmitGeneratedIcegateFileInput) {
  const [allowed, flags, flatFile] = await Promise.all([
    can(input.actorId, "cha.customs.icegate.submit"),
    getChaCustomsFeatureFlags(input.orgId),
    db.chaCustomsFlatFileGeneration.findFirst({
      where: {
        id: input.flatFileGenerationId,
        profile: { jobId: input.jobId, job: { orgId: input.orgId } },
      },
      include: { profile: { include: { job: { select: { id: true, orgId: true } } } } },
    }),
  ]);

  if (!allowed) throw new Error("Forbidden: missing permission cha.customs.icegate.submit");
  if (!isChaCustomsFeatureEnabled(flags, "CHA_ICEGATE_LIVE_SUBMISSION")) {
    throw new Error("ICEGATE live submission feature flag is disabled.");
  }
  if (!flatFile) throw new Error("Flat-file generation not found.");

  const duplicate = await db.chaCustomsExternalSubmission.findFirst({
    where: {
      flatFileGenerationId: flatFile.id,
      status: { notIn: ["CANCELLED", "FAILED"] },
    },
  });
  if (duplicate) throw new Error("This generated version already has a live ICEGATE submission.");

  const idempotencyKey = buildIcegateIdempotencyKey({
    orgId: input.orgId,
    jobId: input.jobId,
    documentType: input.documentType,
    generationVersion: flatFile.versionNo,
  });
  const filePayload = new TextEncoder().encode(JSON.stringify({
    fileKey: flatFile.fileKey,
    fileName: flatFile.fileName,
    checksum: flatFile.checksum,
    contentHash: flatFile.contentHash,
  }));
  const requestHash = sha256Base64(filePayload);

  const submission = await db.chaCustomsExternalSubmission.create({
    data: {
      profileId: flatFile.profileId,
      flatFileGenerationId: flatFile.id,
      idempotencyKey,
      submissionMode: "LIVE",
      status: "PENDING",
      submittedById: input.actorId,
      requestRedactedSnapshot: {
        documentType: input.documentType,
        fileName: flatFile.fileName,
        generationVersion: flatFile.versionNo,
        requestHash,
      },
    },
  });
  await appendIcegateEvent(submission.id, 1, "REQUEST_PREPARED", "PENDING", {
    documentType: input.documentType,
    generationVersion: flatFile.versionNo,
    requestHash,
  });

  const client = input.client ?? (process.env.ICEGATE_MOCK_MODE === "true" ? new MockIcegateClient() : new RealIcegateClient());
  const result = input.documentType === "BE"
    ? await client.submitBillOfEntryFile({
        documentType: "BE",
        fileName: flatFile.fileName ?? `BE_${flatFile.versionNo}.json`,
        content: filePayload,
        idempotencyKey,
      })
    : await client.submitShippingBillFile({
        documentType: "SB",
        fileName: flatFile.fileName ?? `SB_${flatFile.versionNo}.json`,
        content: filePayload,
        idempotencyKey,
      });

  const mapped = mapSubmissionResult(result);
  await processIcegateExternalEvent({
    submissionId: submission.id,
    eventKind: mapped.eventKind,
    status: mapped.status,
    externalStatus: result.externalCode ?? result.validationStatus,
    safeMessage: result.message ?? result.errorMessage,
    actorId: input.actorId,
    metadata: {
      validationStatus: result.validationStatus,
      message: result.message,
      errorMessage: result.errorMessage,
      externalCode: result.externalCode,
      requestHash: result.requestHash,
      responseHash: result.responseHash,
    },
    retryAfter: mapped.status === "RETRYABLE" ? new Date(Date.now() + 5 * 60 * 1000) : null,
  });
  await db.chaCustomsExternalSubmission.update({
    where: { id: submission.id },
    data: {
      responseRedactedSnapshot: redactIcegateValue({
        validationStatus: result.validationStatus,
        message: result.message,
        errorMessage: result.errorMessage,
        externalCode: result.externalCode,
        responseHash: result.responseHash,
      }) as Prisma.InputJsonValue,
    },
  });

  return { submissionId: submission.id, status: mapped.status, result };
}

async function appendIcegateEvent(
  submissionId: string,
  sequenceNo: number,
  eventKind: "REQUEST_PREPARED" | "ACKNOWLEDGED" | "REJECTION_RECEIVED" | "RETRY_SCHEDULED",
  externalStatus: string,
  metadata: Record<string, unknown>,
) {
  return db.chaCustomsExternalEvent.create({
    data: {
      submissionId,
      sequenceNo,
      eventKind,
      externalStatus,
      safeMessage: typeof metadata.message === "string" ? metadata.message : null,
      metadata: redactIcegateValue(metadata) as Prisma.InputJsonValue,
    },
  });
}

function mapSubmissionResult(result: IcegateSubmitResult) {
  if (result.validationStatus === "SUCCESS") {
    return {
      status: "ACKNOWLEDGED" as const,
      eventKind: "ACKNOWLEDGED" as const,
      submittedAt: new Date(),
      acknowledgedAt: new Date(),
    };
  }
  if (result.retryable) {
    return {
      status: "RETRYABLE" as const,
      eventKind: "RETRY_SCHEDULED" as const,
      submittedAt: new Date(),
      acknowledgedAt: null,
    };
  }
  return {
    status: "REJECTED" as const,
    eventKind: "REJECTION_RECEIVED" as const,
    submittedAt: new Date(),
    acknowledgedAt: null,
  };
}
