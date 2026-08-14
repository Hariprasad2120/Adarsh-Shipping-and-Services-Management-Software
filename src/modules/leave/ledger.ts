import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/**
 * Ledger arithmetic uses Prisma.Decimal (decimal.js under the hood, same
 * convention as src/modules/accounting) rather than JS floats, so repeated
 * accrual/debit/credit operations over years cannot drift (e.g. 0.1 + 0.2
 * !== 0.3 in IEEE-754, but is exact in decimal.js). Callers may still pass
 * plain numbers for quantity — they're converted to Decimal immediately on
 * entry and never summed as floats internally.
 */
export function toDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

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

/**
 * Shared cross-module authorization error: an actor attempted to
 * read/mutate a leave-domain resource (request, comp-off credit, grant)
 * that belongs to a different organisation than their own. Centralized
 * here (rather than one copy per module) so every call site's
 * `instanceof CrossOrgAccessError` check works regardless of which module
 * threw it.
 */
export class CrossOrgAccessError extends Error {
  constructor() {
    super("This resource does not belong to your organisation.");
    this.name = "CrossOrgAccessError";
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
  quantity: number | Prisma.Decimal; // signed: positive = credit, negative = debit
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
              balance: new Prisma.Decimal(0),
              version: 0,
            },
          });
        }

        const quantity = toDecimal(input.quantity);
        const balanceBefore = balanceRow.balance;
        const balanceAfter = balanceBefore.plus(quantity);

        if (!input.allowNegative && balanceAfter.isNegative()) {
          throw new InsufficientBalanceError(balanceBefore.toNumber(), quantity.negated().toNumber());
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
            quantity,
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

export async function getMaterializedBalance(
  userId: string,
  leaveTypeId: string,
  year: number,
): Promise<Prisma.Decimal> {
  const row = await db.leaveBalance.findUnique({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
  });
  return row?.balance ?? new Prisma.Decimal(0);
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
