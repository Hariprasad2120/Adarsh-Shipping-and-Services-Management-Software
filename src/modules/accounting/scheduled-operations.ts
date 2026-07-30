import { Prisma } from "@/generated/prisma/client";
import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";

import { recurringOccurrenceIdentity } from "./document-contracts";
import { canonicalPayload, payloadHash } from "./request-integrity";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(canonicalPayload(value)) as Prisma.InputJsonValue;
}

function validDate(value: Date | string, label: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} is invalid`);
  return parsed;
}

async function assertPermission(orgId: string, actorId: string, permission: string) {
  const count = await db.permission.count({
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
  if (count === 0) throw new Error(`Missing required permission: ${permission}`);
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
    throw new Error("Scheduled Accounting processing is disabled outside guarded staging");
  }
}

export async function registerAccountingScheduledOccurrence(input: {
  orgId: string;
  legalEntityId: string;
  actorId: string;
  templateType: "RECURRING_EXPENSE" | "RECURRING_JOURNAL";
  templateId: string;
  templateVersion: number;
  scheduledFor: Date | string;
  templateSnapshot: unknown;
}) {
  await assertPermission(
    input.orgId,
    input.actorId,
    "accounting.recurring-occurrence.process",
  );
  const scheduledFor = validDate(input.scheduledFor, "scheduledFor");
  const identity = recurringOccurrenceIdentity({
    templateType: input.templateType,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    scheduledFor,
  });
  const requestId = `ACCOUNTING:SCHEDULED:${identity}`;
  const sourcePayload = {
    schemaVersion: 1,
    templateType: input.templateType,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    scheduledFor: scheduledFor.toISOString(),
    templateSnapshot: input.templateSnapshot,
  };

  return db.$transaction(
    async (tx) => {
      await assertExactSyntheticStaging(tx);
      const existing = await tx.accountingScheduledOccurrence.findUnique({
        where: { orgId_occurrenceKey: { orgId: input.orgId, occurrenceKey: identity } },
      });
      if (existing) return existing;
      const snapshot = await tx.accountingSourceSnapshot.create({
        data: {
          orgId: input.orgId,
          legalEntityId: input.legalEntityId,
          sourceSystem: "ACCOUNTING",
          sourceType: `${input.templateType}_OCCURRENCE`,
          sourceId: identity,
          sourceVersion: 1,
          requestId,
          payload: json(sourcePayload),
          payloadHash: payloadHash(sourcePayload),
          occurredAt: scheduledFor,
        },
      });
      const occurrence = await tx.accountingScheduledOccurrence.create({
        data: {
          orgId: input.orgId,
          legalEntityId: input.legalEntityId,
          sourceSnapshotId: snapshot.id,
          templateType: input.templateType,
          templateId: input.templateId,
          templateVersion: input.templateVersion,
          scheduledFor,
          occurrenceKey: identity,
        },
      });
      await tx.accountingAuditLog.create({
        data: {
          orgId: input.orgId,
          userId: input.actorId,
          action: "REGISTER_ACCOUNTING_SCHEDULED_OCCURRENCE",
          entityType: "AccountingScheduledOccurrence",
          entityId: occurrence.id,
          afterValues: {
            occurrenceKey: identity,
            templateType: input.templateType,
            templateVersion: input.templateVersion,
          },
        },
      });
      return occurrence;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function claimAccountingScheduledOccurrences(input: {
  orgId: string;
  actorId: string;
  workerId: string;
  limit?: number;
  leaseMs?: number;
}) {
  await assertPermission(
    input.orgId,
    input.actorId,
    "accounting.recurring-occurrence.process",
  );
  const limit = input.limit ?? 25;
  const leaseMs = input.leaseMs ?? 60_000;
  if (!input.workerId.trim()) throw new Error("workerId is required");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be an integer from 1 to 100");
  }
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 5_000 || leaseMs > 15 * 60_000) {
    throw new Error("leaseMs must be between 5 seconds and 15 minutes");
  }
  const now = await getNow();
  const claimedUntil = new Date(now.getTime() + leaseMs);
  return db.$transaction(
    async (tx) => {
      await assertExactSyntheticStaging(tx);
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "AccountingScheduledOccurrence"
        WHERE "orgId" = ${input.orgId}
          AND "scheduledFor" <= ${now}
          AND (
            status IN ('PENDING', 'FAILED')
            OR (status = 'CLAIMED' AND "claimedUntil" < ${now})
          )
        ORDER BY "scheduledFor", "createdAt"
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      `;
      if (rows.length === 0) return [];
      return tx.accountingScheduledOccurrence.updateManyAndReturn({
        where: { orgId: input.orgId, id: { in: rows.map(({ id }) => id) } },
        data: {
          status: "CLAIMED",
          claimedBy: input.workerId.trim(),
          claimedUntil,
          failureCode: null,
          rowVersion: { increment: 1 },
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}

export async function settleAccountingScheduledOccurrence(input: {
  orgId: string;
  actorId: string;
  occurrenceId: string;
  workerId: string;
  outcome:
    | { status: "GENERATED"; generatedRecordType: string; generatedRecordId: string }
    | { status: "SKIPPED" | "FAILED"; reasonCode: string };
}) {
  await assertPermission(
    input.orgId,
    input.actorId,
    "accounting.recurring-occurrence.process",
  );
  const reasonCode =
    input.outcome.status === "GENERATED" ? null : input.outcome.reasonCode.trim();
  if (reasonCode != null && !/^[A-Z][A-Z0-9_]{2,63}$/.test(reasonCode)) {
    throw new Error("reasonCode must be a stable non-sensitive code");
  }
  const now = await getNow();
  return db.$transaction(async (tx) => {
    await assertExactSyntheticStaging(tx);
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "AccountingScheduledOccurrence"
      WHERE id = ${input.occurrenceId}
        AND "orgId" = ${input.orgId}
        AND status = 'CLAIMED'
        AND "claimedBy" = ${input.workerId}
        AND "claimedUntil" >= ${now}
      FOR UPDATE
    `;
    if (!rows[0]) throw new Error("Active scheduled-occurrence claim not found");
    const updated = await tx.accountingScheduledOccurrence.update({
      where: { id: input.occurrenceId },
      data:
        input.outcome.status === "GENERATED"
          ? {
              status: "GENERATED",
              generatedRecordType: input.outcome.generatedRecordType,
              generatedRecordId: input.outcome.generatedRecordId,
              claimedBy: null,
              claimedUntil: null,
              rowVersion: { increment: 1 },
            }
          : {
              status: input.outcome.status,
              failureCode: reasonCode,
              claimedBy: null,
              claimedUntil: null,
              rowVersion: { increment: 1 },
            },
    });
    await tx.accountingAuditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.actorId,
        action: "SETTLE_ACCOUNTING_SCHEDULED_OCCURRENCE",
        entityType: "AccountingScheduledOccurrence",
        entityId: updated.id,
        afterValues: { status: updated.status, reasonCode },
      },
    });
    return updated;
  });
}
