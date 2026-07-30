import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";

export type OutboxPublicationResult =
  | { outcome: "PUBLISHED"; resultCode: string }
  | { outcome: "RETRYABLE"; errorCode: string }
  | { outcome: "REJECTED"; errorCode: string };

export function accountingOutboxRetryDelayMs(attemptNumber: number) {
  if (!Number.isSafeInteger(attemptNumber) || attemptNumber <= 0) {
    throw new Error("attemptNumber must be a positive safe integer");
  }
  return Math.min(15 * 60_000, 1_000 * 2 ** Math.min(attemptNumber - 1, 10));
}

function safeCode(value: string, label: string) {
  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(value)) {
    throw new Error(`${label} must be a stable non-sensitive code`);
  }
  return value;
}

async function assertPermission(orgId: string, actorId: string, permission: string) {
  const granted = await db.permission.count({
    where: {
      key: permission,
      roles: {
        some: {
          role: {
            orgId,
            userRoles: { some: { userId: actorId, user: { orgId, active: true } } },
          },
        },
      },
    },
  });
  if (granted === 0) throw new Error(`Missing required permission: ${permission}`);
}

async function assertExactSyntheticStaging(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ allowed: boolean }>>`
    SELECT (
      current_database() = 'monolith_accounting_staging'
      AND current_user = 'monolith_staging'
      AND COALESCE(host(inet_server_addr()), '') = '127.0.0.1'
      AND inet_server_port() = 56432
      AND COALESCE(
        shobj_description(
          (SELECT oid FROM pg_database WHERE datname = current_database()),
          'pg_database'
        ),
        ''
      ) = 'MONOLITH_ACCOUNTING_STAGING_ONLY'
    ) AS allowed
  `;
  if (rows[0]?.allowed !== true) {
    throw new Error("Synthetic outbox publication is restricted to the authorized staging target");
  }
}

export async function claimAccountingOutbox(input: {
  orgId: string;
  workerId: string;
  limit?: number;
  leaseMs?: number;
}) {
  const workerId = input.workerId.trim();
  if (!workerId) throw new Error("workerId is required");
  const limit = input.limit ?? 25;
  const leaseMs = input.leaseMs ?? 60_000;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be an integer from 1 to 100");
  }
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 5_000 || leaseMs > 15 * 60_000) {
    throw new Error("leaseMs must be between 5 seconds and 15 minutes");
  }
  const now = await getNow();
  const leasedUntil = new Date(now.getTime() + leaseMs);
  const leaseToken = randomUUID();

  return db.$transaction(
    async (tx) => {
      await assertExactSyntheticStaging(tx);
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "AccountingIntegrationOutbox"
        WHERE "orgId" = ${input.orgId}
          AND destination LIKE 'SYNTHETIC\_%' ESCAPE '\'
          AND (
            (status IN ('PENDING', 'RETRYABLE') AND "availableAt" <= ${now})
            OR (status = 'PROCESSING' AND "leasedUntil" < ${now})
          )
        ORDER BY "availableAt" ASC, "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      `;
      if (rows.length === 0) return [];
      return tx.accountingIntegrationOutbox.updateManyAndReturn({
        where: { id: { in: rows.map(({ id }) => id) }, orgId: input.orgId },
        data: {
          status: "PROCESSING",
          leaseToken,
          leaseOwner: workerId,
          leasedUntil,
          lastAttemptAt: now,
          attemptCount: { increment: 1 },
          rowVersion: { increment: 1 },
        },
      });
    },
    // Row locks plus SKIP LOCKED provide the claim guarantee; READ COMMITTED
    // avoids making normal competing workers surface serialization failures.
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}

export async function settleAccountingOutboxClaim(input: {
  orgId: string;
  outboxId: string;
  workerId: string;
  leaseToken: string;
  result: OutboxPublicationResult;
}) {
  const now = await getNow();
  const resultCode =
    input.result.outcome === "PUBLISHED"
      ? safeCode(input.result.resultCode, "resultCode")
      : safeCode(input.result.errorCode, "errorCode");
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; attemptCount: number }>>`
      SELECT id, "attemptCount"
      FROM "AccountingIntegrationOutbox"
      WHERE id = ${input.outboxId}
        AND "orgId" = ${input.orgId}
        AND status = 'PROCESSING'
        AND "leaseOwner" = ${input.workerId}
        AND "leaseToken" = ${input.leaseToken}
        AND "leasedUntil" >= ${now}
      FOR UPDATE
    `;
    const claimed = rows[0];
    if (!claimed) throw new Error("Active Accounting outbox lease not found");

    if (input.result.outcome === "PUBLISHED") {
      return tx.accountingIntegrationOutbox.update({
        where: { id: claimed.id },
        data: {
          status: "PROCESSED",
          publishedAt: now,
          publicationResultCode: resultCode,
          lastErrorCode: null,
          leaseToken: null,
          leaseOwner: null,
          leasedUntil: null,
          rowVersion: { increment: 1 },
        },
      });
    }
    if (input.result.outcome === "REJECTED") {
      return tx.accountingIntegrationOutbox.update({
        where: { id: claimed.id },
        data: {
          status: "MANUAL_REVIEW",
          manualReviewAt: now,
          publicationResultCode: "DETERMINISTIC_REJECTION",
          lastErrorCode: resultCode,
          leaseToken: null,
          leaseOwner: null,
          leasedUntil: null,
          rowVersion: { increment: 1 },
        },
      });
    }
    if (claimed.attemptCount >= 8) {
      return tx.accountingIntegrationOutbox.update({
        where: { id: claimed.id },
        data: {
          status: "DEAD_LETTER",
          deadLetterAt: now,
          publicationResultCode: "RETRY_LIMIT_EXCEEDED",
          lastErrorCode: resultCode,
          leaseToken: null,
          leaseOwner: null,
          leasedUntil: null,
          rowVersion: { increment: 1 },
        },
      });
    }
    return tx.accountingIntegrationOutbox.update({
      where: { id: claimed.id },
      data: {
        status: "RETRYABLE",
        availableAt: new Date(
          now.getTime() + accountingOutboxRetryDelayMs(claimed.attemptCount),
        ),
        publicationResultCode: "RETRY_SCHEDULED",
        lastErrorCode: resultCode,
        leaseToken: null,
        leaseOwner: null,
        leasedUntil: null,
        rowVersion: { increment: 1 },
      },
    });
  });
}

export async function retryAccountingOutbox(input: {
  orgId: string;
  outboxId: string;
  actorId: string;
  reasonCode: string;
  expectedVersion?: number;
}) {
  await assertPermission(input.orgId, input.actorId, "accounting.outbox.retry");
  const reasonCode = safeCode(input.reasonCode, "reasonCode");
  const now = await getNow();
  return db.$transaction(async (tx) => {
    const event = await tx.accountingIntegrationOutbox.findFirst({
      where: {
        id: input.outboxId,
        orgId: input.orgId,
        status: { in: ["MANUAL_REVIEW", "DEAD_LETTER", "FAILED"] },
        ...(input.expectedVersion == null
          ? {}
          : { rowVersion: input.expectedVersion }),
      },
    });
    if (!event) throw new Error("Eligible Accounting outbox event not found");
    const updated = await tx.accountingIntegrationOutbox.updateMany({
      where: {
        id: event.id,
        orgId: input.orgId,
        status: event.status,
        rowVersion: event.rowVersion,
      },
      data: {
        status: "RETRYABLE",
        availableAt: now,
        manualReviewAt: null,
        deadLetterAt: null,
        lastErrorCode: null,
        publicationResultCode: reasonCode,
        rowVersion: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new Error("Eligible Accounting outbox event version changed");
    }
    await tx.accountingAuditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.actorId,
        action: "RETRY_ACCOUNTING_OUTBOX",
        entityType: "AccountingIntegrationOutbox",
        entityId: event.id,
        afterValues: { status: "RETRYABLE", reasonCode },
      },
    });
    return tx.accountingIntegrationOutbox.findUniqueOrThrow({
      where: { id: event.id },
    });
  });
}

export async function moveAccountingOutboxToManualReview(input: {
  orgId: string;
  outboxId: string;
  actorId: string;
  reasonCode: string;
  expectedVersion?: number;
}) {
  await assertPermission(
    input.orgId,
    input.actorId,
    "accounting.outbox.manual-review",
  );
  const reasonCode = safeCode(input.reasonCode, "reasonCode");
  const now = await getNow();
  return db.$transaction(async (tx) => {
    const event = await tx.accountingIntegrationOutbox.findFirst({
      where: {
        id: input.outboxId,
        orgId: input.orgId,
        status: { not: "PROCESSED" },
        ...(input.expectedVersion == null
          ? {}
          : { rowVersion: input.expectedVersion }),
      },
    });
    if (!event) throw new Error("Eligible Accounting outbox event not found");
    const updated = await tx.accountingIntegrationOutbox.updateMany({
      where: {
        id: event.id,
        orgId: input.orgId,
        status: event.status,
        rowVersion: event.rowVersion,
      },
      data: {
        status: "MANUAL_REVIEW",
        manualReviewAt: now,
        lastErrorCode: reasonCode,
        publicationResultCode: "PRIVILEGED_MANUAL_REVIEW",
        leaseToken: null,
        leaseOwner: null,
        leasedUntil: null,
        rowVersion: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new Error("Eligible Accounting outbox event version changed");
    }
    await tx.accountingAuditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.actorId,
        action: "REVIEW_ACCOUNTING_OUTBOX",
        entityType: "AccountingIntegrationOutbox",
        entityId: event.id,
        afterValues: { status: "MANUAL_REVIEW", reasonCode },
      },
    });
    return tx.accountingIntegrationOutbox.findUniqueOrThrow({
      where: { id: event.id },
    });
  });
}

export async function publishClaimedSyntheticOutbox(
  event: {
    id: string;
    orgId: string;
    destination: string;
    leaseOwner: string | null;
    leaseToken: string | null;
    payload: unknown;
  },
  publisher: (payload: unknown) => Promise<OutboxPublicationResult>,
) {
  if (
    !event.destination.startsWith("SYNTHETIC_") ||
    !event.leaseOwner ||
    !event.leaseToken
  ) {
    throw new Error("Only an actively leased synthetic destination may be published");
  }
  const result = await publisher(event.payload);
  return settleAccountingOutboxClaim({
    orgId: event.orgId,
    outboxId: event.id,
    workerId: event.leaseOwner,
    leaseToken: event.leaseToken,
    result,
  });
}
