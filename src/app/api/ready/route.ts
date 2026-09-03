/**
 * Readiness probe. Checks the dependencies the app needs to serve traffic and
 * returns 200 when all pass, 503 otherwise. Deliberately leaks no internals —
 * each check is just "ok" | "fail" plus a duration; error detail goes to logs.
 */

import { db } from "@/lib/db";
import { logger } from "@/modules/core/observability";

export const dynamic = "force-dynamic";

type Check = { name: string; status: "ok" | "fail"; ms: number };

async function check(name: string, fn: () => Promise<unknown>): Promise<Check> {
  const start = performance.now();
  try {
    await fn();
    return { name, status: "ok", ms: Math.round(performance.now() - start) };
  } catch (err) {
    logger.error("readiness check failed", { check: name, err });
    return { name, status: "fail", ms: Math.round(performance.now() - start) };
  }
}

export async function GET() {
  const checks: Check[] = await Promise.all([
    check("database", () => db.$queryRaw`SELECT 1`),
  ]);

  const ready = checks.every((c) => c.status === "ok");
  return Response.json(
    { status: ready ? "ready" : "not_ready", checks, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
