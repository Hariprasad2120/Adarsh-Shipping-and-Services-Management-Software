/**
 * Stage 2 — enterprise platform: request-level idempotency (spec §17).
 *
 * `withIdempotency` runs an operation at most once per (org, scope, key):
 *   - first call inserts a PENDING row, runs `fn`, stores the result COMPLETED;
 *   - a later call with the same key replays the stored result;
 *   - a concurrent second call (row still PENDING) is rejected so the caller can
 *     retry / poll rather than double-execute.
 */

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export class IdempotencyConflictError extends Error {
  constructor(readonly scope: string, readonly key: string) {
    super(`An operation for ${scope}/${key} is already in progress.`);
    this.name = "IdempotencyConflictError";
  }
}

export type WithIdempotencyOptions = {
  orgId: string;
  scope: string;
  key: string;
  /** Optional TTL — after this the key may be reused. */
  ttlMs?: number;
};

export type IdempotentOutcome<T> = {
  result: T;
  replayed: boolean;
};

export async function withIdempotency<T>(
  opts: WithIdempotencyOptions,
  fn: () => Promise<T>,
): Promise<IdempotentOutcome<T>> {
  const { orgId, scope, key } = opts;
  if (!orgId || !scope || !key) {
    throw new Error("withIdempotency: orgId, scope and key are all required");
  }
  const where = { orgId_scope_key: { orgId, scope, key } };

  const existing = await db.idempotencyKey.findUnique({ where });
  if (existing) {
    if (existing.status === "COMPLETED") {
      return { result: existing.result as T, replayed: true };
    }
    if (existing.status === "PENDING") {
      throw new IdempotencyConflictError(scope, key);
    }
    // FAILED — allow a retry by clearing it below.
    await db.idempotencyKey.delete({ where });
  }

  // Claim the key. A unique-constraint race means another caller claimed it first.
  try {
    await db.idempotencyKey.create({
      data: {
        orgId,
        scope,
        key,
        status: "PENDING",
        expiresAt: opts.ttlMs ? new Date(Date.now() + opts.ttlMs) : null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const won = await db.idempotencyKey.findUnique({ where });
      if (won?.status === "COMPLETED") return { result: won.result as T, replayed: true };
      throw new IdempotencyConflictError(scope, key);
    }
    throw err;
  }

  try {
    const result = await fn();
    await db.idempotencyKey.update({
      where,
      data: { status: "COMPLETED", result: (result ?? null) as Prisma.InputJsonValue },
    });
    return { result, replayed: false };
  } catch (err) {
    await db.idempotencyKey.update({
      where,
      data: {
        status: "FAILED",
        error: (err instanceof Error ? err.message : String(err)).slice(0, 2000),
      },
    });
    throw err;
  }
}

/** Housekeeping — drop expired keys so they can be reused. Returns the count. */
export async function purgeExpiredIdempotencyKeys(now: Date = new Date()): Promise<number> {
  const { count } = await db.idempotencyKey.deleteMany({
    where: { expiresAt: { not: null, lt: now } },
  });
  return count;
}
