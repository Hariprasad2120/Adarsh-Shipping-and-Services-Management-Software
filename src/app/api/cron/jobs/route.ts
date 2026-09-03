/**
 * Background-job worker tick. Vercel Cron (or any scheduler with the cron
 * secret) calls this to drain a batch of due jobs. Register a handler per job
 * type in `JOB_HANDLERS` as modules start enqueuing work.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/security";
import { processJobBatch, reapStalledJobs, type JobHandlerRegistry } from "@/modules/core/jobs";
import { purgeExpiredIdempotencyKeys } from "@/modules/core/idempotency";
import { runWithCorrelationFromHeaders, logger } from "@/modules/core/observability";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Handlers are added here (or contributed by modules) as background work moves
// onto the generic queue. Empty for now — an unknown type dead-letters safely.
const JOB_HANDLERS: JobHandlerRegistry = {};

export async function GET(req: NextRequest) {
  const cronError = requireCronSecret(req);
  if (cronError) return cronError;

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "25");

  return runWithCorrelationFromHeaders(req.headers, { route: "/api/cron/jobs", source: "cron" }, async () => {
    const reclaimed = await reapStalledJobs();
    const purgedIdempotencyKeys = await purgeExpiredIdempotencyKeys();
    const result = await processJobBatch(JOB_HANDLERS, { limit });
    const summary = { ...result, reclaimed, purgedIdempotencyKeys };
    logger.info("job batch processed", summary);
    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  });
}
