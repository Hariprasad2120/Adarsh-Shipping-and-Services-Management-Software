import { db } from "@/lib/db";

/**
 * Shared, atomic rate-limit counter backed by Postgres (MON-S1-011).
 *
 * The old `rateLimit()` in `src/lib/security.ts` keeps per-process `Map`s, which
 * are useless on serverless / multi-instance. This store uses a single
 * `RateLimitCounter` row per key with an atomic upsert so the count is correct
 * regardless of which instance handles the request.
 *
 * Falls back to an in-process map only if the DB call throws, so a transient DB
 * issue degrades to "best effort" rather than "no limiting AND a 500".
 */

const fallback = new Map<string, { count: number; resetAt: number }>();

export interface RateDecision {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateDecision> {
  const now = Date.now();
  const windowEndsAt = new Date(now + opts.windowMs);

  try {
    // Atomic: insert a fresh window, or bump the count. If the stored window has
    // already ended, reset it in the same statement.
    const rows = await db.$queryRaw<
      { count: number; window_ends_at: Date }[]
    >`
      INSERT INTO "RateLimitCounter" ("key", "count", "windowEndsAt", "updatedAt")
      VALUES (${key}, 1, ${windowEndsAt}, NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitCounter"."windowEndsAt" < NOW() THEN 1
          ELSE "RateLimitCounter"."count" + 1
        END,
        "windowEndsAt" = CASE
          WHEN "RateLimitCounter"."windowEndsAt" < NOW() THEN ${windowEndsAt}
          ELSE "RateLimitCounter"."windowEndsAt"
        END,
        "updatedAt" = NOW()
      RETURNING "count", "windowEndsAt" AS window_ends_at
    `;
    const row = rows[0];
    const count = Number(row?.count ?? 1);
    const endsAt = row?.window_ends_at ? new Date(row.window_ends_at).getTime() : now + opts.windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((endsAt - now) / 1000));
    return {
      ok: count <= opts.limit,
      remaining: Math.max(0, opts.limit - count),
      retryAfterSeconds: count <= opts.limit ? 0 : retryAfterSeconds,
    };
  } catch (e) {
    console.error("[rate-limit] DB store unavailable, using in-process fallback:", e);
    const hit = fallback.get(key);
    if (!hit || hit.resetAt <= now) {
      fallback.set(key, { count: 1, resetAt: now + opts.windowMs });
      return { ok: true, remaining: opts.limit - 1, retryAfterSeconds: 0 };
    }
    hit.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((hit.resetAt - now) / 1000));
    return {
      ok: hit.count <= opts.limit,
      remaining: Math.max(0, opts.limit - hit.count),
      retryAfterSeconds: hit.count <= opts.limit ? 0 : retryAfterSeconds,
    };
  }
}

/**
 * Read-only look at a counter without incrementing it. Returns null when there
 * is no live window. Used by login-lockout's "am I locked?" check.
 */
export async function peekRateLimit(
  key: string,
): Promise<{ count: number; windowEndsAt: Date } | null> {
  try {
    const row = await db.rateLimitCounter.findUnique({ where: { key } });
    if (!row || row.windowEndsAt.getTime() <= Date.now()) {
      const hit = fallback.get(key);
      if (hit && hit.resetAt > Date.now()) {
        return { count: hit.count, windowEndsAt: new Date(hit.resetAt) };
      }
      return null;
    }
    return { count: row.count, windowEndsAt: row.windowEndsAt };
  } catch {
    const hit = fallback.get(key);
    return hit && hit.resetAt > Date.now()
      ? { count: hit.count, windowEndsAt: new Date(hit.resetAt) }
      : null;
  }
}

/** Best-effort reset (e.g. after a successful login clears the failure count). */
export async function resetRateLimit(key: string): Promise<void> {
  fallback.delete(key);
  try {
    await db.rateLimitCounter.deleteMany({ where: { key } });
  } catch {
    /* ignore */
  }
}

/** Opportunistic cleanup of expired rows. Call from a cron. */
export async function pruneRateLimitCounters(): Promise<number> {
  try {
    const r = await db.rateLimitCounter.deleteMany({
      where: { windowEndsAt: { lt: new Date() } },
    });
    return r.count;
  } catch {
    return 0;
  }
}
