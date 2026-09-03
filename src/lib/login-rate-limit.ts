import { LOGIN_LOCKOUT_MS, LOGIN_MAX_ATTEMPTS } from "@/lib/session-config";
import {
  checkRateLimit,
  peekRateLimit,
  resetRateLimit,
} from "@/lib/rate-limit-store";

/**
 * Login brute-force / lockout, backed by the shared `RateLimitCounter` table
 * (MON-S1-011) so the count is correct across serverless instances — the old
 * per-process `Map` was ineffective on Vercel.
 *
 * Keyed by normalized email + IP so an attacker can't lock a victim out from a
 * different network, and a single IP can't spray many accounts unnoticed.
 * The window (`LOGIN_LOCKOUT_MS`) is both the "N failures" window and the
 * lockout duration: once `count >= LOGIN_MAX_ATTEMPTS`, further attempts are
 * refused until `windowEndsAt`. A successful login clears the counter.
 */

function key(email: string, ip: string | null | undefined): string {
  return `login:${email.trim().toLowerCase()}|${ip ?? "unknown"}`;
}

/** Lockout state BEFORE attempting credential verification (read-only). */
export async function isLoginLocked(
  email: string,
  ip: string | null | undefined,
): Promise<{ locked: boolean; retryAfterMs?: number }> {
  const state = await peekRateLimit(key(email, ip));
  if (!state || state.count < LOGIN_MAX_ATTEMPTS) return { locked: false };
  return {
    locked: true,
    retryAfterMs: Math.max(0, state.windowEndsAt.getTime() - Date.now()),
  };
}

/** Record a failed attempt. Returns true if this failure means "now locked". */
export async function recordLoginFailure(
  email: string,
  ip: string | null | undefined,
): Promise<boolean> {
  // `checkRateLimit` allows exactly `limit` hits; the (limit+1)-th is blocked.
  // We want the LOGIN_MAX_ATTEMPTS-th *failure* to trigger the lock, so the
  // allowance is LOGIN_MAX_ATTEMPTS - 1.
  const result = await checkRateLimit(key(email, ip), {
    limit: LOGIN_MAX_ATTEMPTS - 1,
    windowMs: LOGIN_LOCKOUT_MS,
  });
  return !result.ok;
}

/** Clear the failure counter after a successful authentication. */
export async function recordLoginSuccess(
  email: string,
  ip: string | null | undefined,
): Promise<void> {
  await resetRateLimit(key(email, ip));
}

/** Test hook — clears a specific key (or is a no-op for the DB backend). */
export async function resetRateLimiter(
  email?: string,
  ip?: string | null,
): Promise<void> {
  if (email) await resetRateLimit(key(email, ip));
}
