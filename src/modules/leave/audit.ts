import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export interface WriteLeaveAuditInput {
  orgId: string;
  userId: string; // actor
  action: string; // e.g. LEAVE_REQUEST_SUBMITTED, LEAVE_APPROVED, BALANCE_ADJUSTED
  details?: Record<string, unknown>;
}

/**
 * Writes to the existing HrmsAuditLog table (schema-ready but previously
 * unused by any leave code path — see docs/leave-management/
 * MONOLITH_INTEGRATION_AUDIT.md §8). Every state-changing leave function
 * calls this so the audit trail required by spec §36 actually exists.
 */
export async function writeLeaveAudit(input: WriteLeaveAuditInput) {
  return db.hrmsAuditLog.create({
    data: {
      orgId: input.orgId,
      userId: input.userId,
      action: input.action,
      details: (input.details ?? {}) as Prisma.InputJsonValue,
    },
  });
}
