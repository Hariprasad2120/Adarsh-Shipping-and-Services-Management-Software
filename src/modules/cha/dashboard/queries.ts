import "server-only";

import { db } from "@/lib/db";

/**
 * Keep the dashboard metrics on typed Prisma delegates so transient raw-query
 * transport issues do not take down the route during page load.
 */
export async function getChaDashboardMetrics(orgId: string) {
  const [
    activeJobs,
    pendingChecklists,
    pendingFilings,
    urgentExpenses,
    outstandingAdvances,
  ] = await Promise.all([
    db.chaJob.count({
      where: {
        orgId,
        deletedAt: null,
        status: "ACTIVE",
        NOT: { stage: "FILED" },
      },
    }),
    db.chaChecklistImport.count({
      where: {
        status: "PENDING_APPROVAL",
        job: {
          orgId,
          deletedAt: null,
        },
      },
    }),
    db.chaFiling.count({
      where: {
        status: "PENDING",
        job: {
          orgId,
          deletedAt: null,
        },
      },
    }),
    db.chaExpenseRequest.count({
      where: {
        orgId,
        isUrgent: true,
        status: {
          in: [
            "UNDER_REVIEW",
            "ACCOUNTS_REVIEW",
            "CLARIFICATION_REQUIRED",
            "APPROVED",
            "READY_FOR_DISBURSEMENT",
            "QUERY_RAISED",
          ],
        },
        OR: [
          { jobId: null },
          { job: { deletedAt: null } },
        ],
      },
    }),
    db.chaCustomerAdvance.findMany({
      where: {
        status: { in: ["FOLLOW_UP", "PARTIALLY_RECEIVED"] },
        job: {
          orgId,
          deletedAt: null,
        },
      },
      select: {
        expectedAmount: true,
        receipts: {
          select: {
            amount: true,
          },
        },
      },
    }),
  ]);

  const outstandingAdvance = outstandingAdvances.reduce((total, advance) => {
    const receivedAmount = advance.receipts.reduce((sum, receipt) => {
      return sum + Number(receipt.amount ?? 0);
    }, 0);

    return total + Math.max(0, Number(advance.expectedAmount ?? 0) - receivedAmount);
  }, 0);

  return {
    activeJobs,
    pendingChecklists,
    pendingFilings,
    urgentExpenses,
    outstandingAdvance,
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
