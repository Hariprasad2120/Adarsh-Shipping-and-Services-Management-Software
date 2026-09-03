import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  createSession,
  validateSession,
  revokeSessionById,
  revokeAllSessionsForUser,
  listActiveSessions,
  maskIp,
  deviceLabel,
  tokenRef,
} from "@/lib/session-service";
import {
  isLoginLocked,
  recordLoginFailure,
  recordLoginSuccess,
  resetRateLimiter,
} from "@/lib/login-rate-limit";
import {
  SESSION_COOKIE_NAME,
  LEGACY_COOKIE_NAMES,
  SESSION_IDLE_TIMEOUT_MINUTES,
  SESSION_ADMIN_IDLE_TIMEOUT_MINUTES,
  LOGIN_MAX_ATTEMPTS,
} from "@/lib/session-config";
import { resetPassword } from "@/modules/core/user/service";

describe("Secure Session Management", () => {
  let orgId: string;
  let userId: string;

  beforeAll(async () => {
    const org = await db.organisation.create({
      data: { name: "Test Session Org", slug: "test-session-org-" + Date.now() },
    });
    orgId = org.id;
    const user = await db.user.create({
      data: {
        orgId,
        email: `session-test-${Date.now()}@test.local`,
        passwordHash: "x",
        name: "Session Test User",
        active: true,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.securityEvent.deleteMany({ where: { userId } });
    await db.userSession.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
    await db.organisation.delete({ where: { id: orgId } });
  });

  // ── Cookie isolation ──

  it("uses Monolith-specific cookie names, never legacy/AMS names", () => {
    expect(SESSION_COOKIE_NAME).toMatch(/monolith/);
    expect(LEGACY_COOKIE_NAMES).not.toContain(SESSION_COOKIE_NAME);
    for (const legacy of [
      "next-auth.session-token",
      "authjs.session-token",
      "ams.session-token",
    ]) {
      expect(LEGACY_COOKIE_NAMES).toContain(legacy);
      expect(SESSION_COOKIE_NAME).not.toBe(legacy);
    }
  });

  // ── Lifecycle ──

  it("creates a session with expiry and device metadata", async () => {
    const token = await createSession({
      userId,
      ip: "103.21.44.108",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
    });
    const row = await db.userSession.findUnique({ where: { token } });
    expect(row).toBeTruthy();
    expect(row!.status).toBe("ACTIVE");
    expect(row!.expiresAt).toBeTruthy();
    expect(row!.ipAddress).toBe("103.21.x.x"); // masked, never raw
    expect(row!.ipHash).toBeTruthy();
    expect(row!.device).toBe("Chrome on Windows");

    const result = await validateSession(token);
    expect(result.valid).toBe(true);
  });

  it("rejects a non-existent (foreign/AMS) token", async () => {
    const result = await validateSession("00000000-0000-0000-0000-000000000000");
    expect(result).toEqual({ valid: false, reason: "NOT_FOUND" });
  });

  it("rejects a revoked session", async () => {
    const token = await createSession({ userId });
    const row = await db.userSession.findUnique({ where: { token } });
    await revokeSessionById({
      sessionId: row!.id,
      actorUserId: userId,
      reason: "USER_REVOKED",
    });
    const result = await validateSession(token);
    expect(result).toEqual({ valid: false, reason: "NOT_ACTIVE" });
  });

  it("expires a session past its absolute lifetime", async () => {
    const token = await createSession({ userId });
    await db.userSession.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const result = await validateSession(token);
    expect(result).toEqual({ valid: false, reason: "ABSOLUTE_TIMEOUT" });
    const row = await db.userSession.findUnique({ where: { token } });
    expect(row!.status).toBe("EXPIRED");
    expect(row!.revokeReason).toBe("ABSOLUTE_TIMEOUT");
  });

  it("expires a session past the idle timeout", async () => {
    const token = await createSession({ userId });
    const idleMs = (SESSION_IDLE_TIMEOUT_MINUTES + 1) * 60 * 1000;
    await db.userSession.update({
      where: { token },
      data: { lastSeenAt: new Date(Date.now() - idleMs) },
    });
    const result = await validateSession(token);
    expect(result).toEqual({ valid: false, reason: "IDLE_TIMEOUT" });
  });

  it("applies the shorter admin idle timeout to admins", async () => {
    const token = await createSession({ userId });
    const idleMs = (SESSION_ADMIN_IDLE_TIMEOUT_MINUTES + 1) * 60 * 1000;
    await db.userSession.update({
      where: { token },
      data: { lastSeenAt: new Date(Date.now() - idleMs) },
    });
    // Same idle gap is fine for a normal user…
    if (SESSION_ADMIN_IDLE_TIMEOUT_MINUTES + 1 < SESSION_IDLE_TIMEOUT_MINUTES) {
      const normal = await validateSession(token);
      expect(normal.valid).toBe(true);
      // The successful validation refreshes lastSeenAt — reset the idle gap
      await db.userSession.update({
        where: { token },
        data: { lastSeenAt: new Date(Date.now() - idleMs) },
      });
    }
    // …but expired for an admin
    const admin = await validateSession(token, { isAdmin: true });
    expect(admin).toEqual({ valid: false, reason: "IDLE_TIMEOUT" });
  });

  it("rejects sessions of a disabled user and audit-logs the attempt", async () => {
    const token = await createSession({ userId });
    await db.user.update({ where: { id: userId }, data: { active: false } });
    try {
      const result = await validateSession(token);
      expect(result).toEqual({ valid: false, reason: "USER_DISABLED" });
      const event = await db.securityEvent.findFirst({
        where: { userId, event: "DISABLED_USER_ACCESS" },
      });
      expect(event).toBeTruthy();
    } finally {
      await db.user.update({ where: { id: userId }, data: { active: true } });
    }
  });

  it("revokes all sessions except the current one (logout other devices)", async () => {
    await db.userSession.deleteMany({ where: { userId } });
    const keep = await createSession({ userId });
    const kill1 = await createSession({ userId });
    const kill2 = await createSession({ userId });

    const count = await revokeAllSessionsForUser({
      userId,
      actorUserId: userId,
      reason: "USER_REVOKED",
      exceptToken: keep,
    });
    expect(count).toBe(2);
    expect((await validateSession(keep)).valid).toBe(true);
    expect((await validateSession(kill1)).valid).toBe(false);
    expect((await validateSession(kill2)).valid).toBe(false);
  });

  it("password reset revokes every session", async () => {
    const t1 = await createSession({ userId });
    const t2 = await createSession({ userId });
    await resetPassword(userId, orgId, "new-password-123!");
    expect((await validateSession(t1)).valid).toBe(false);
    expect((await validateSession(t2)).valid).toBe(false);
    const event = await db.securityEvent.findFirst({
      where: { userId, event: "PASSWORD_CHANGED" },
    });
    expect(event).toBeTruthy();
  });

  it("lists only active sessions for the security page", async () => {
    await db.userSession.deleteMany({ where: { userId } });
    const live = await createSession({ userId });
    const dead = await createSession({ userId });
    const deadRow = await db.userSession.findUnique({ where: { token: dead } });
    await revokeSessionById({
      sessionId: deadRow!.id,
      actorUserId: userId,
      reason: "USER_REVOKED",
    });
    const sessions = await listActiveSessions(userId);
    expect(sessions.map((s) => s.token)).toEqual([live]);
  });

  // ── Helpers ──

  it("masks IPs and never logs raw tokens", () => {
    expect(maskIp("192.168.1.55")).toBe("192.168.x.x");
    expect(maskIp("::ffff:10.0.0.9")).toBe("10.0.x.x");
    expect(maskIp(null)).toBeNull();
    const token = "super-secret-token";
    expect(tokenRef(token)).not.toContain(token);
    expect(tokenRef(token)).toHaveLength(16);
  });

  it("labels devices from user agent", () => {
    expect(
      deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/128.0")
    ).toBe("Firefox on macOS");
    expect(deviceLabel(null)).toBeNull();
  });
});

describe("Login rate limiting / brute-force protection", () => {
  beforeEach(() => resetRateLimiter());

  const email = "victim@test.local";
  const ip = "1.2.3.4";

  it("locks after max failed attempts", () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i++) {
      expect(recordLoginFailure(email, ip)).toBe(false);
      expect(isLoginLocked(email, ip).locked).toBe(false);
    }
    expect(recordLoginFailure(email, ip)).toBe(true);
    const lock = isLoginLocked(email, ip);
    expect(lock.locked).toBe(true);
    expect(lock.retryAfterMs).toBeGreaterThan(0);
  });

  it("scopes lockout to email+IP pair", () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) recordLoginFailure(email, ip);
    expect(isLoginLocked(email, ip).locked).toBe(true);
    expect(isLoginLocked(email, "9.9.9.9").locked).toBe(false);
    expect(isLoginLocked("other@test.local", ip).locked).toBe(false);
  });

  it("clears failures on successful login", () => {
    recordLoginFailure(email, ip);
    recordLoginFailure(email, ip);
    recordLoginSuccess(email, ip);
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i++) {
      expect(recordLoginFailure(email, ip)).toBe(false);
    }
  });

  it("lockout expires after the window", () => {
    const now = Date.now();
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) recordLoginFailure(email, ip, now);
    expect(isLoginLocked(email, ip, now).locked).toBe(true);
    expect(isLoginLocked(email, ip, now + 16 * 60 * 1000).locked).toBe(false);
  });
});
