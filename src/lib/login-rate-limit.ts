import { LOGIN_LOCKOUT_MS, LOGIN_MAX_ATTEMPTS } from "@/lib/session-config";

/**
 * In-memory login rate limiter / brute-force protection.
 *
 * Keyed by normalized email + IP so an attacker can't lock a victim out from
 * a different network, and a single IP can't spray many accounts unnoticed.
 *
 * In-memory is acceptable for a single-instance deployment; swap the Map for
 * Redis/Upstash if the app is ever scaled horizontally (documented in
 * docs/session-security.md).
 */

type Bucket = {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number | null;
};

const buckets = new Map<string, Bucket>();

function key(email: string, ip: string | null | undefined): string {
  return `${email.trim().toLowerCase()}|${ip ?? "unknown"}`;
}

function prune(now: number) {
  if (buckets.size < 1000) return;
  for (const [k, b] of buckets) {
    const stale =
      (b.lockedUntil === null || b.lockedUntil < now) &&
      now - b.firstFailureAt > LOGIN_LOCKOUT_MS;
    if (stale) buckets.delete(k);
  }
}

/** Returns lockout state BEFORE attempting credential verification. */
export function isLoginLocked(
  email: string,
  ip: string | null | undefined,
  now: number = Date.now()
): { locked: boolean; retryAfterMs?: number } {
  const bucket = buckets.get(key(email, ip));
  if (!bucket?.lockedUntil) return { locked: false };
  if (now >= bucket.lockedUntil) {
    buckets.delete(key(email, ip));
    return { locked: false };
  }
  return { locked: true, retryAfterMs: bucket.lockedUntil - now };
}

/** Record a failed attempt. Returns true if this failure triggered a lockout. */
export function recordLoginFailure(
  email: string,
  ip: string | null | undefined,
  now: number = Date.now()
): boolean {
  prune(now);
  const k = key(email, ip);
  const bucket = buckets.get(k);

  if (!bucket || now - bucket.firstFailureAt > LOGIN_LOCKOUT_MS) {
    buckets.set(k, { failures: 1, firstFailureAt: now, lockedUntil: null });
    return false;
  }

  bucket.failures += 1;
  if (bucket.failures >= LOGIN_MAX_ATTEMPTS) {
    bucket.lockedUntil = now + LOGIN_LOCKOUT_MS;
    return true;
  }
  return false;
}

export function recordLoginSuccess(email: string, ip: string | null | undefined) {
  buckets.delete(key(email, ip));
}

/** Test hook. */
export function resetRateLimiter() {
  buckets.clear();
}
