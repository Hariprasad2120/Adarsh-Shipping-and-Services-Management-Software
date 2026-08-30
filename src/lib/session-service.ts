import { createHash, randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireProductionSecret } from "@/lib/security";
import {
  SESSION_ABSOLUTE_TIMEOUT_HOURS,
  SESSION_ACTIVITY_THROTTLE_MS,
  SESSION_ADMIN_IDLE_TIMEOUT_MINUTES,
  SESSION_IDLE_TIMEOUT_MINUTES,
  SESSION_REMEMBER_ME_DAYS,
} from "@/lib/session-config";

/**
 * Server-side session lifecycle.
 *
 * The NextAuth JWT only carries an opaque session nonce; this module is the
 * source of truth for whether a session is alive. Every protected request
 * validates against the DB via validateSession().
 */

const validatedSessionCache = new Map<
  string,
  { expiresAt: number; result: ValidateResult }
>();
const VALIDATED_SESSION_CACHE_TTL_MS = 5_000;

function getValidatedSessionCacheKey(token: string, isAdmin: boolean) {
  return `${isAdmin ? "admin" : "user"}:${token}`;
}

export function invalidateValidatedSessionCache(token?: string) {
  if (!token) {
    validatedSessionCache.clear();
    return;
  }
  validatedSessionCache.delete(getValidatedSessionCacheKey(token, false));
  validatedSessionCache.delete(getValidatedSessionCacheKey(token, true));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const secret = () =>
  requireProductionSecret("AUTH_SECRET", process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET, "monolith")!;

/** sha256(value + secret) — used for IPs and for logging token references. */
export function hashWithSecret(value: string): string {
  return createHash("sha256").update(`${value}:${secret()}`).digest("hex");
}

/** Never log raw session tokens — always this. */
export function tokenRef(token: string): string {
  return hashWithSecret(token).slice(0, 16);
}

/** 103.21.44.108 → "103.21.x.x" (v4) / keeps first 3 groups (v6). */
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const clean = ip.replace(/^::ffff:/, "").trim();
  if (clean.includes(".")) {
    const parts = clean.split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.x.x` : null;
  }
  if (clean.includes(":")) {
    const groups = clean.split(":");
    return `${groups.slice(0, 3).join(":")}::x`;
  }
  return null;
}

/** Coarse device label from a user-agent string. No external deps. */
export function deviceLabel(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const os = /Windows NT/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Unknown browser";
  return `${browser} on ${os}`;
}

export function extractRequestMeta(req?: Request | null): {
  ip: string | null;
  userAgent: string | null;
} {
  if (!req) return { ip: null, userAgent: null };
  try {
    const fwd = req.headers.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip");
    return { ip: ip || null, userAgent: req.headers.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

// ─── Audit logging ───────────────────────────────────────────────────────────

export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGIN_LOCKED"
  | "LOGOUT"
  | "SESSION_IDLE_EXPIRED"
  | "SESSION_ABSOLUTE_EXPIRED"
  | "SESSION_REVOKED_BY_USER"
  | "SESSION_REVOKED_BY_ADMIN"
  | "ALL_SESSIONS_REVOKED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "MFA_ENABLED"
  | "MFA_DISABLED"
  | "MFA_FAILED"
  | "MFA_CHALLENGE_REQUIRED"
  | "MFA_RECOVERY_CODE_USED"
  | "MFA_RECOVERY_CODES_REGENERATED"
  | "SESSION_ROTATED"
  | "OAUTH_IDENTITY_LINKED"
  | "OAUTH_IDENTITY_CONFLICT"
  | "EMPLOYEE_INVITATION_CREATED"
  | "EMPLOYEE_INVITATION_RESENT"
  | "EMPLOYEE_INVITATION_ACCEPTED"
  | "DISABLED_USER_ACCESS"
  | "SESSION_MISMATCH";

export async function logSecurityEvent(input: {
  event: SecurityEventType;
  outcome: "SUCCESS" | "FAILURE" | "BLOCKED";
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  /** Raw session token — stored as a hash reference, never raw. */
  sessionToken?: string | null;
  actorUserId?: string | null;
  reason?: string | null;
}) {
  try {
    await db.securityEvent.create({
      data: {
        userId: input.userId ?? undefined,
        email: input.email ?? undefined,
        event: input.event,
        outcome: input.outcome,
        ipAddress: maskIp(input.ip) ?? undefined,
        userAgent: input.userAgent ?? undefined,
        sessionToken: input.sessionToken ? tokenRef(input.sessionToken) : undefined,
        details:
          input.actorUserId || input.reason
            ? {
                ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
                ...(input.reason ? { reason: input.reason } : {}),
              }
            : undefined,
      },
    });
  } catch (e) {
    console.error("[session] Failed to write security event:", e);
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export async function createSession(input: {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
  rememberMe?: boolean;
  mfaVerified?: boolean;
}): Promise<string> {
  const token = randomUUID();
  const now = new Date();
  const lifetimeMs = input.rememberMe
    ? SESSION_REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000
    : SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000;

  await db.userSession.create({
    data: {
      userId: input.userId,
      token,
      status: "ACTIVE",
      ipAddress: maskIp(input.ip),
      ipHash: input.ip ? hashWithSecret(input.ip) : null,
      userAgent: input.userAgent ?? null,
      device: deviceLabel(input.userAgent),
      rememberMe: input.rememberMe ?? false,
      expiresAt: new Date(now.getTime() + lifetimeMs),
      strongAuthAt: now,
      mfaVerified: input.mfaVerified ?? false,
    },
  });
  invalidateValidatedSessionCache(token);
  return token;
}

/**
 * Rotate a session identifier: revoke the old row and issue a fresh one with
 * the same lifetime. Call after login, MFA completion, password change and
 * privilege escalation (OWASP Session Management Cheat Sheet). Returns the new
 * opaque nonce, or null if the old session was not found / already dead.
 */
export async function rotateSession(input: {
  currentToken: string;
  reason: string;
  markMfaVerified?: boolean;
}): Promise<string | null> {
  const current = await db.userSession.findUnique({
    where: { token: input.currentToken },
    select: {
      userId: true,
      status: true,
      rememberMe: true,
      expiresAt: true,
      ipAddress: true,
      ipHash: true,
      userAgent: true,
      device: true,
    },
  });
  if (!current || current.status !== "ACTIVE") return null;

  const newToken = randomUUID();
  const now = new Date();
  await db.$transaction([
    db.userSession.update({
      where: { token: input.currentToken },
      data: {
        status: "REVOKED",
        logoutAt: now,
        revokedAt: now,
        revokeReason: input.reason,
      },
    }),
    db.userSession.create({
      data: {
        userId: current.userId,
        token: newToken,
        status: "ACTIVE",
        ipAddress: current.ipAddress,
        ipHash: current.ipHash,
        userAgent: current.userAgent,
        device: current.device,
        rememberMe: current.rememberMe,
        expiresAt: current.expiresAt,
        strongAuthAt: now,
        mfaVerified: input.markMfaVerified ?? false,
      },
    }),
  ]);
  invalidateValidatedSessionCache(input.currentToken);
  invalidateValidatedSessionCache(newToken);

  await logSecurityEvent({
    event: "SESSION_ROTATED",
    outcome: "SUCCESS",
    userId: current.userId,
    sessionToken: newToken,
    reason: input.reason,
  });
  return newToken;
}

/** Record a fresh strong-auth event on the current session (step-up basis). */
export async function markStrongAuth(token: string, opts: { mfaVerified?: boolean } = {}) {
  try {
    await db.userSession.update({
      where: { token },
      data: {
        strongAuthAt: new Date(),
        ...(opts.mfaVerified !== undefined ? { mfaVerified: opts.mfaVerified } : {}),
      },
    });
    invalidateValidatedSessionCache(token);
  } catch {
    /* session gone — nothing to mark */
  }
}

export type SessionInvalidReason =
  | "NOT_FOUND"
  | "NOT_ACTIVE"
  | "ABSOLUTE_TIMEOUT"
  | "IDLE_TIMEOUT"
  | "USER_DISABLED";

export type ValidateResult =
  | { valid: true }
  | { valid: false; reason: SessionInvalidReason };

/**
 * Validate a session token against the DB. Called on every protected request
 * (from the NextAuth jwt callback). Expires/revokes lazily and audit-logs
 * timeout events. Throttles lastSeenAt writes.
 */
export async function validateSession(
  token: string,
  opts: { isAdmin?: boolean } = {}
): Promise<ValidateResult> {
  if (!token) return { valid: false, reason: "NOT_FOUND" };
  const cacheKey = getValidatedSessionCacheKey(token, opts.isAdmin === true);
  const cached = validatedSessionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  try {
    const session = await db.userSession.findUnique({
      where: { token },
      select: {
        status: true,
        loginAt: true,
        lastSeenAt: true,
        expiresAt: true,
        rememberMe: true,
        userId: true,
        user: { select: { active: true, email: true } },
      },
    });

    if (!session) return { valid: false, reason: "NOT_FOUND" };
    if (session.status !== "ACTIVE") return { valid: false, reason: "NOT_ACTIVE" };

    const now = Date.now();

    if (!session.user.active) {
      await expireSession(token, "USER_DISABLED");
      await logSecurityEvent({
        event: "DISABLED_USER_ACCESS",
        outcome: "BLOCKED",
        userId: session.userId,
        email: session.user.email,
        sessionToken: token,
      });
      return { valid: false, reason: "USER_DISABLED" };
    }

    const absoluteLimit = session.expiresAt
      ? session.expiresAt.getTime()
      : session.loginAt.getTime() +
        SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000;
    if (now > absoluteLimit) {
      await expireSession(token, "ABSOLUTE_TIMEOUT");
      await logSecurityEvent({
        event: "SESSION_ABSOLUTE_EXPIRED",
        outcome: "SUCCESS",
        userId: session.userId,
        sessionToken: token,
      });
      return { valid: false, reason: "ABSOLUTE_TIMEOUT" };
    }

    const idleLimitMinutes = opts.isAdmin
      ? SESSION_ADMIN_IDLE_TIMEOUT_MINUTES
      : SESSION_IDLE_TIMEOUT_MINUTES;
    const idleMs = now - session.lastSeenAt.getTime();
    if (idleMs > idleLimitMinutes * 60 * 1000) {
      await expireSession(token, "IDLE_TIMEOUT");
      await logSecurityEvent({
        event: "SESSION_IDLE_EXPIRED",
        outcome: "SUCCESS",
        userId: session.userId,
        sessionToken: token,
      });
      return { valid: false, reason: "IDLE_TIMEOUT" };
    }

    // Throttled activity update — fire-and-forget
    if (idleMs > SESSION_ACTIVITY_THROTTLE_MS) {
      db.userSession
        .update({ where: { token }, data: { lastSeenAt: new Date() } })
        .catch(() => {});
    }

    const result = { valid: true } as const;
    validatedSessionCache.set(cacheKey, {
      expiresAt: now + VALIDATED_SESSION_CACHE_TTL_MS,
      result,
    });
    return result;
  } catch (e) {
    // DB error — fail CLOSED. Treating an unverifiable session as valid would
    // let revoked / expired / disabled-user sessions through exactly when the
    // datastore is degraded (which an attacker may be able to induce). The
    // caller redirects to /login; the user re-authenticates once the DB is back.
    console.error("[session] Validation DB error — failing closed:", e);
    return { valid: false, reason: "NOT_FOUND" };
  }
}

async function expireSession(token: string, reason: string) {
  try {
    invalidateValidatedSessionCache(token);
    await db.userSession.update({
      where: { token },
      data: {
        status: "EXPIRED",
        logoutAt: new Date(),
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  } catch {
    // already gone — fine
  }
}

/** Revoke a single session by DB id (sessions page / admin). */
export async function revokeSessionById(input: {
  sessionId: string;
  actorUserId: string;
  reason: string;
  byAdmin?: boolean;
}) {
  const session = await db.userSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, userId: true, token: true, status: true },
  });
  if (!session) return null;

  await db.userSession.update({
    where: { id: session.id },
    data: {
      status: "REVOKED",
      logoutAt: new Date(),
      revokedAt: new Date(),
      revokedById: input.actorUserId,
      revokeReason: input.reason,
    },
  });
  invalidateValidatedSessionCache(session.token);

  await logSecurityEvent({
    event: input.byAdmin ? "SESSION_REVOKED_BY_ADMIN" : "SESSION_REVOKED_BY_USER",
    outcome: "SUCCESS",
    userId: session.userId,
    sessionToken: session.token,
    actorUserId: input.actorUserId,
    reason: input.reason,
  });

  return session;
}

/**
 * Revoke all active sessions for a user. Optionally keep one token alive
 * (e.g. "logout from all other devices" keeps the current session).
 */
export async function revokeAllSessionsForUser(input: {
  userId: string;
  actorUserId: string;
  reason: string;
  exceptToken?: string | null;
}) {
  const result = await db.userSession.updateMany({
    where: {
      userId: input.userId,
      status: "ACTIVE",
      ...(input.exceptToken ? { token: { not: input.exceptToken } } : {}),
    },
    data: {
      status: "REVOKED",
      logoutAt: new Date(),
      revokedAt: new Date(),
      revokedById: input.actorUserId,
      revokeReason: input.reason,
    },
  });
  invalidateValidatedSessionCache();

  await logSecurityEvent({
    event: "ALL_SESSIONS_REVOKED",
    outcome: "SUCCESS",
    userId: input.userId,
    actorUserId: input.actorUserId,
    reason: input.reason,
  });

  return result.count;
}

/** Active sessions for the current user's security page. */
export async function listActiveSessions(userId: string) {
  return db.userSession.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      token: true,
      loginAt: true,
      lastSeenAt: true,
      expiresAt: true,
      ipAddress: true,
      device: true,
      userAgent: true,
      rememberMe: true,
    },
  });
}
