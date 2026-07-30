import "server-only";

import { db } from "@/lib/db";

type ChaDashboardAggregate = {
  activeJobs: bigint;
  pendingChecklists: bigint;
  pendingFilings: bigint;
  urgentExpenses: bigint;
  outstandingAdvance: unknown;
};

/**
 * One parameterized organization-scoped read replaces the dashboard's metric
 * count fan-out and advance/receipt materialization.
 */
export async function getChaDashboardMetrics(orgId: string) {
  const [row] = await db.$queryRaw<ChaDashboardAggregate[]>`
    SELECT
      (SELECT COUNT(*)
       FROM "ChaJob" j
       WHERE j."orgId" = ${orgId}
         AND j."deletedAt" IS NULL
         AND j.status = 'ACTIVE'
         AND j.stage <> 'FILED') AS "activeJobs",
      (SELECT COUNT(*)
       FROM "ChaChecklistImport" c
       INNER JOIN "ChaJob" j ON j.id = c."jobId"
       WHERE j."orgId" = ${orgId}
         AND j."deletedAt" IS NULL
         AND c.status = 'PENDING_APPROVAL') AS "pendingChecklists",
      (SELECT COUNT(*)
       FROM "ChaFiling" f
       INNER JOIN "ChaJob" j ON j.id = f."jobId"
       WHERE j."orgId" = ${orgId}
         AND j."deletedAt" IS NULL
         AND f.status = 'PENDING') AS "pendingFilings",
      (SELECT COUNT(*)
       FROM "ChaExpenseRequest" e
       LEFT JOIN "ChaJob" j ON j.id = e."jobId"
       WHERE e."orgId" = ${orgId}
         AND (j.id IS NULL OR j."deletedAt" IS NULL)
         AND e.status = 'URGENT_PAYMENT_REQUIRED') AS "urgentExpenses",
      COALESCE((
        SELECT SUM(GREATEST(0, a."expectedAmount" - COALESCE(r.received, 0)))
        FROM "ChaCustomerAdvance" a
        INNER JOIN "ChaJob" j ON j.id = a."jobId"
        LEFT JOIN (
          SELECT "advanceId", SUM(amount) AS received
          FROM "ChaCustomerAdvanceReceipt"
          GROUP BY "advanceId"
        ) r ON r."advanceId" = a.id
        WHERE j."orgId" = ${orgId}
          AND j."deletedAt" IS NULL
          AND a.status IN ('FOLLOW_UP', 'PARTIALLY_RECEIVED')
      ), 0) AS "outstandingAdvance"
  `;

  return {
    activeJobs: Number(row?.activeJobs ?? 0),
    pendingChecklists: Number(row?.pendingChecklists ?? 0),
    pendingFilings: Number(row?.pendingFilings ?? 0),
    urgentExpenses: Number(row?.urgentExpenses ?? 0),
    outstandingAdvance: Number(row?.outstandingAdvance ?? 0),
  };
}

export async function listChaRecentActivity(orgId: string, limit = 6) {
  return db.$queryRaw<
    Array<{
      id: string;
      event: string;
      actorId: string;
      actorName: string | null;
      timestamp: Date;
      remarks: string | null;
      jobId: string | null;
      jobNumber: string | null;
    }>
  >`
    SELECT
      log.id,
      log.event,
      log."actorId",
      actor.name AS "actorName",
      log.timestamp,
      log.remarks,
      job.id AS "jobId",
      job."jobNumber"
    FROM "ChaAuditLog" log
    LEFT JOIN "User" actor ON actor.id = log."actorId"
    LEFT JOIN "ChaJob" job ON job.id = log."jobId"
    WHERE log."orgId" = ${orgId}
    ORDER BY log.timestamp DESC
    LIMIT ${limit}
  `;
}
