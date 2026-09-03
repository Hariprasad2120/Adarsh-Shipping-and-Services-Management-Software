/**
 * Stage 2 — enterprise platform: background job queue.
 *
 * `enqueueJob` adds work; a worker / cron route calls `processJobBatch` with a
 * handler registry. Jobs are claimed under a row lock (`FOR UPDATE SKIP LOCKED`)
 * so multiple workers never pick the same job. Failures retry with exponential
 * backoff up to `maxAttempts`, then land in `DEAD` for manual inspection.
 */

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getCorrelationId, logger, incr, observe } from "@/modules/core/observability";
import { backoffDelayMs, type BackoffOptions } from "./backoff";

export type JobHandlerContext = {
  jobId: string;
  orgId: string | null;
  attempts: number;
  correlationId: string | null;
};

export type JobHandler = (
  payload: unknown,
  ctx: JobHandlerContext,
) => Promise<unknown | void>;

export type JobHandlerRegistry = Record<string, JobHandler>;

export type EnqueueJobInput = {
  type: string;
  payload?: Record<string, unknown>;
  orgId?: string | null;
  idempotencyKey?: string;
  runAfter?: Date;
  maxAttempts?: number;
};

/** Add a job. A repeat `idempotencyKey` returns the existing job unchanged. */
export async function enqueueJob(input: EnqueueJobInput) {
  if (input.idempotencyKey) {
    const existing = await db.backgroundJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;
  }
  try {
    return await db.backgroundJob.create({
      data: {
        type: input.type,
        payload: (input.payload ?? {}) as object,
        orgId: input.orgId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        runAfter: input.runAfter ?? new Date(),
        maxAttempts: input.maxAttempts ?? 5,
        correlationId: getCorrelationId() ?? null,
      },
    });
  } catch (err) {
    // Lost an idempotency race — return the row that won.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      input.idempotencyKey
    ) {
      const won = await db.backgroundJob.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (won) return won;
    }
    throw err;
  }
}

type ClaimedJob = {
  id: string;
  orgId: string | null;
  type: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
  correlationId: string | null;
};

/** Atomically claim up to `limit` due jobs for this worker. */
export async function claimJobs(limit: number, workerId: string): Promise<ClaimedJob[]> {
  return db.$queryRaw<ClaimedJob[]>`
    UPDATE "BackgroundJob" SET
      "status" = 'RUNNING',
      "lockedAt" = CURRENT_TIMESTAMP,
      "lockedBy" = ${workerId},
      "startedAt" = COALESCE("startedAt", CURRENT_TIMESTAMP),
      "attempts" = "attempts" + 1,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" IN (
      SELECT "id" FROM "BackgroundJob"
      WHERE "status" = 'PENDING' AND "runAfter" <= CURRENT_TIMESTAMP
      ORDER BY "runAfter" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "orgId", "type", "payload", "attempts", "maxAttempts", "correlationId"
  `;
}

async function completeJob(jobId: string, result: unknown) {
  await db.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: "SUCCEEDED",
      result: (result ?? null) as Prisma.InputJsonValue,
      lastError: null,
      lockedAt: null,
      lockedBy: null,
      finishedAt: new Date(),
    },
  });
}

async function failJob(job: ClaimedJob, err: unknown, backoff?: BackoffOptions) {
  const message = err instanceof Error ? err.message : String(err);
  const dead = job.attempts >= job.maxAttempts;
  await db.backgroundJob.update({
    where: { id: job.id },
    data: {
      status: dead ? "DEAD" : "PENDING",
      lastError: message.slice(0, 2000),
      lockedAt: null,
      lockedBy: null,
      runAfter: dead ? undefined : new Date(Date.now() + backoffDelayMs(job.attempts, backoff)),
      finishedAt: dead ? new Date() : null,
    },
  });
  incr("jobs.failed", { type: job.type, dead: dead ? "1" : "0" });
  logger.error("background job failed", {
    jobId: job.id,
    type: job.type,
    attempts: job.attempts,
    dead,
    err: message,
  });
}

export type ProcessResult = {
  claimed: number;
  succeeded: number;
  failed: number;
  dead: number;
};

/**
 * Claim and run a batch. Call from a cron route or a worker loop. Unknown job
 * types are failed (and eventually dead-lettered) rather than silently dropped.
 */
export async function processJobBatch(
  handlers: JobHandlerRegistry,
  opts: { limit?: number; workerId?: string; backoff?: BackoffOptions } = {},
): Promise<ProcessResult> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 100);
  const workerId = opts.workerId ?? `worker-${process.pid}`;
  const jobs = await claimJobs(limit, workerId);

  const res: ProcessResult = { claimed: jobs.length, succeeded: 0, failed: 0, dead: 0 };

  for (const job of jobs) {
    const handler = handlers[job.type];
    const started = performance.now();
    try {
      if (!handler) throw new Error(`no handler registered for job type "${job.type}"`);
      const out = await handler(job.payload, {
        jobId: job.id,
        orgId: job.orgId,
        attempts: job.attempts,
        correlationId: job.correlationId,
      });
      await completeJob(job.id, out);
      observe("jobs.duration_ms", performance.now() - started, { type: job.type });
      incr("jobs.succeeded", { type: job.type });
      res.succeeded += 1;
    } catch (err) {
      await failJob(job, err, opts.backoff);
      res.failed += 1;
      if (job.attempts >= job.maxAttempts) res.dead += 1;
    }
  }
  return res;
}

/** Re-queue a DEAD job for another run (manual recovery). */
export async function retryDeadJob(jobId: string) {
  return db.backgroundJob.update({
    where: { id: jobId },
    data: { status: "PENDING", runAfter: new Date(), lastError: null, finishedAt: null },
  });
}

/**
 * Reclaim jobs stuck in RUNNING by a worker that crashed mid-execution. Any job
 * locked longer than `staleAfterMs` (default 15 min) is returned to PENDING to
 * be retried; if it has already exhausted `maxAttempts` it is dead-lettered.
 * Call this from the same cron tick as `processJobBatch`.
 */
export async function reapStalledJobs(staleAfterMs = 15 * 60_000): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterMs);
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    UPDATE "BackgroundJob" SET
      "status" = CASE WHEN "attempts" >= "maxAttempts" THEN 'DEAD' ELSE 'PENDING' END,
      "lockedAt" = NULL,
      "lockedBy" = NULL,
      "lastError" = COALESCE("lastError", 'reclaimed after worker stall'),
      "finishedAt" = CASE WHEN "attempts" >= "maxAttempts" THEN CURRENT_TIMESTAMP ELSE NULL END,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "status" = 'RUNNING' AND "lockedAt" < ${cutoff}
    RETURNING "id"
  `;
  if (rows.length > 0) {
    incr("jobs.reclaimed", {}, rows.length);
    logger.warn("reclaimed stalled background jobs", { count: rows.length });
  }
  return rows.length;
}
