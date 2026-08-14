import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type LedgerEntryType =
  | "OPENING_BALANCE"
  | "ACCRUAL"
  | "MANUAL_CREDIT"
  | "MANUAL_DEBIT"
  | "LEAVE_RESERVED"
  | "LEAVE_CONSUMED"
  | "LEAVE_RELEASED"
  | "CARRY_FORWARD"
  | "CARRY_FORWARD_EXPIRY"
  | "ENCASHMENT"
  | "RESET"
  | "COMP_OFF_CREDIT"
  | "COMP_OFF_EXPIRY"
  | "ADJUSTMENT"
  | "CANCELLATION_REVERSAL"
  | "POLICY_MIGRATION"
  | "IMPORT"
  | "LOP_CONVERSION";

export type LedgerSource = "SYSTEM" | "SCHEDULER" | "ADMIN" | "EMPLOYEE" | "IMPORT";

export class InsufficientBalanceError extends Error {
  constructor(available: number, requested: number) {
    super(`Insufficient balance: available ${available}, requested ${requested}`);
    this.name = "InsufficientBalanceError";
  }
}

export class LedgerConcurrencyError extends Error {
  constructor() {
    super("Balance was modified concurrently; retry the operation");
    this.name = "LedgerConcurrencyError";
  }
}

export interface PostLedgerEntryInput {
  orgId: string;
  userId: string;
  leaveTypeId: string;
  policyVersionId?: string | null;
  type: LedgerEntryType;
  quantity: number; // signed: positive = credit, negative = debit
  unit?: "DAY" | "HOUR";
  effectiveDate: Date;
  year: number; // LeaveBalance is keyed by (userId, leaveTypeId, year)
  requestId?: string | null;
  source: LedgerSource;
  actorId?: string | null;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
  idempotencyKey: string;
  /** When false (default) a debit that would push balance negative throws. */
  allowNegative?: boolean;
}

const MAX_RETRIES = 3;

/**
 * Appends one ledger entry and atomically updates the materialized
 * LeaveBalance snapshot, protected by optimistic locking (LeaveBalance.version)
 * and an idempotency key unique constraint. Retries on version conflicts
 * (concurrent writers racing the same balance row) up to MAX_RETRIES times.
 */
export async function postLedgerEntry(input: PostLedgerEntryInput) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const existing = await tx.leaveLedgerEntry.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) return existing;

        let balanceRow = await tx.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId_year: {
              userId: input.userId,
              leaveTypeId: input.leaveTypeId,
              year: input.year,
            },
          },
        });

        if (!balanceRow) {
          balanceRow = await tx.leaveBalance.create({
            data: {
              userId: input.userId,
              leaveTypeId: input.leaveTypeId,
              year: input.year,
              balance: 0,
              version: 0,
            },
          });
        }

        const balanceBefore = balanceRow.balance;
        const balanceAfter = balanceBefore + input.quantity;

        if (!input.allowNegative && balanceAfter < 0) {
          throw new InsufficientBalanceError(balanceBefore, -input.quantity);
        }

        const updateResult = await tx.leaveBalance.updateMany({
          where: { id: balanceRow.id, version: balanceRow.version },
          data: { balance: balanceAfter, version: { increment: 1 } },
        });
        if (updateResult.count === 0) {
          throw new LedgerConcurrencyError();
        }

        const entry = await tx.leaveLedgerEntry.create({
          data: {
            orgId: input.orgId,
            userId: input.userId,
            leaveTypeId: input.leaveTypeId,
            policyVersionId: input.policyVersionId ?? null,
            type: input.type,
            quantity: input.quantity,
            unit: input.unit ?? "DAY",
            effectiveDate: input.effectiveDate,
            balanceBefore,
            balanceAfter,
            requestId: input.requestId ?? null,
            source: input.source,
            actorId: input.actorId ?? null,
            reason: input.reason ?? null,
            metadata: input.metadata,
            idempotencyKey: input.idempotencyKey,
          },
        });

        return entry;
      });
    } catch (error) {
      if (error instanceof LedgerConcurrencyError && attempt < MAX_RETRIES - 1) {
        continue;
      }
      // Unique constraint violation on idempotencyKey = another concurrent
      // caller already posted this exact entry; treat as success.
      if (
        error instanceof Object &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        const existing = await db.leaveLedgerEntry.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
  throw new LedgerConcurrencyError();
}

export async function getMaterializedBalance(userId: string, leaveTypeId: string, year: number) {
  const row = await db.leaveBalance.findUnique({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
  });
  return row?.balance ?? 0;
}

export async function getLedgerHistory(
  userId: string,
  leaveTypeId: string,
  options?: { fromDate?: Date; toDate?: Date; limit?: number },
) {
  return db.leaveLedgerEntry.findMany({
    where: {
      userId,
      leaveTypeId,
      ...(options?.fromDate || options?.toDate
        ? {
            effectiveDate: {
              ...(options?.fromDate ? { gte: options.fromDate } : {}),
              ...(options?.toDate ? { lte: options.toDate } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 200,
  });
}
