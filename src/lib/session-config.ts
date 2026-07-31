/**
 * Centralized session security configuration.
 *
 * All timeout values are env-driven with safe defaults — never hardcode
 * timeout values in business logic; import from here instead.
 *
 * Env vars:
 *   SESSION_IDLE_TIMEOUT_MINUTES        — normal user idle timeout (default 30)
 *   SESSION_ADMIN_IDLE_TIMEOUT_MINUTES  — admin/platform-admin idle timeout (default 15)
 *   SESSION_ABSOLUTE_TIMEOUT_HOURS      — hard cap on session lifetime (default 12)
 *   SESSION_REMEMBER_ME_DAYS            — extended lifetime when "remember me" checked (default 7, capped at 7)
 *   SESSION_ACTIVITY_THROTTLE_MINUTES   — min gap between lastSeenAt writes (default 5)
 *   LOGIN_MAX_ATTEMPTS                  — failed logins before lockout (default 5)
 *   LOGIN_LOCKOUT_MINUTES               — lockout window (default 15)
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const SESSION_IDLE_TIMEOUT_MINUTES = envInt(
  "SESSION_IDLE_TIMEOUT_MINUTES",
  30
);
export const SESSION_ADMIN_IDLE_TIMEOUT_MINUTES = envInt(
  "SESSION_ADMIN_IDLE_TIMEOUT_MINUTES",
  15
);
export const SESSION_ABSOLUTE_TIMEOUT_HOURS = envInt(
  "SESSION_ABSOLUTE_TIMEOUT_HOURS",
  12
);
export const SESSION_REMEMBER_ME_DAYS = Math.min(
  envInt("SESSION_REMEMBER_ME_DAYS", 7),
  7
);
export const SESSION_ACTIVITY_THROTTLE_MS =
  envInt("SESSION_ACTIVITY_THROTTLE_MINUTES", 5) * 60 * 1000;

export const LOGIN_MAX_ATTEMPTS = envInt("LOGIN_MAX_ATTEMPTS", 5);
export const LOGIN_LOCKOUT_MS = envInt("LOGIN_LOCKOUT_MINUTES", 15) * 60 * 1000;

// Cookie max-age must cover the longest possible session (remember-me).
// The DB record is the source of truth for actual expiry.
export const SESSION_COOKIE_MAX_AGE_S = SESSION_REMEMBER_ME_DAYS * 24 * 60 * 60;

// ─── Cookie isolation ────────────────────────────────────────────────────────
//
// Monolith-specific cookie names so AMS (or any other app on localhost)
// can never read or be read by a Monolith session.
// Production uses the __Host- prefix: requires Secure, Path=/, no Domain —
// the strongest cookie scoping the platform offers.

const IS_PROD = process.env.NODE_ENV === "production";
const IS_STAGING = process.env.MONOLITH_ENV === "staging";

export const USE_SECURE_COOKIES = IS_PROD;

export const SESSION_COOKIE_NAME = IS_PROD
  ? "__Host-monolith.session-token"
  : IS_STAGING
    ? "monolith.staging.session-token"
    : "monolith.dev.session-token";

export const CSRF_COOKIE_NAME = IS_PROD
  ? "__Host-monolith.csrf-token"
  : IS_STAGING
    ? "monolith.staging.csrf-token"
    : "monolith.dev.csrf-token";

export const CALLBACK_URL_COOKIE_NAME = IS_PROD
  ? "__Secure-monolith.callback-url"
  : IS_STAGING
    ? "monolith.staging.callback-url"
    : "monolith.dev.callback-url";

/**
 * Legacy/foreign cookie names that must NEVER authenticate Monolith and
 * are purged on logout. Includes old NextAuth defaults (shared with AMS
 * on localhost) and any earlier Monolith names.
 */
export const LEGACY_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "ams.session-token",
  "__Secure-ams.session-token",
] as const;

/** All cookies belonging to the current Monolith auth stack. */
export const MONOLITH_COOKIE_NAMES = [
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CALLBACK_URL_COOKIE_NAME,
] as const;
