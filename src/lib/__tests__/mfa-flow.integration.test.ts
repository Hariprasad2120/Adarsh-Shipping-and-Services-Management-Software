import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { generateTotp } from "@/lib/mfa/totp";
import {
  beginEnrollment,
  confirmEnrollment,
  disableMfa,
  hasActiveMfa,
  isMfaRequiredForUser,
  regenerateRecoveryCodes,
  verifyMfa,
} from "@/lib/mfa/service";
import {
  completePasswordReset,
  requestPasswordReset,
} from "@/lib/password-reset";
import { hashResetToken } from "@/lib/password-reset-token";
import { createSession, rotateSession, validateSession } from "@/lib/session-service";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit-store";

const HAS_DB = Boolean(process.env.DATABASE_URL);
const runId = Date.now();

describe.skipIf(!HAS_DB)("Stage 1 cluster 4b — auth/MFA/reset (DB-backed)", () => {
  let orgId = "";
  let userId = "";
  const email = `s1-4b-${runId}@test.local`;

  beforeAll(async () => {
    process.env.MFA_ENCRYPTION_KEY ??= Buffer.alloc(32, 9).toString("base64");
    const org = await db.organisation.create({
      data: { name: `S1 4b ${runId}`, slug: `s1-4b-${runId}` },
    });
    orgId = org.id;
    const user = await db.user.create({
      data: {
        orgId,
        email,
        name: "S1 4b",
        passwordHash: await hash("initial-password-123", 12),
        active: true,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.mfaRecoveryCode.deleteMany({ where: { userId } });
    await db.authenticationFactor.deleteMany({ where: { userId } });
    await db.passwordResetToken.deleteMany({ where: { userId } });
    await db.userSession.deleteMany({ where: { userId } });
    await db.securityEvent.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
    await db.organisation.delete({ where: { id: orgId } });
    await resetRateLimit(`itest:${runId}`);
  });

  it("TOTP enrolment requires a valid first OTP and then activates", async () => {
    const challenge = await beginEnrollment(userId, email);
    expect(challenge.otpauthUri).toContain("otpauth://totp/");
    expect(await hasActiveMfa(userId)).toBe(false);

    await expect(confirmEnrollment(userId, "000000")).rejects.toThrow();
    expect(await hasActiveMfa(userId)).toBe(false);

    const { recoveryCodes } = await confirmEnrollment(
      userId,
      generateTotp(challenge.secret),
    );
    expect(recoveryCodes).toHaveLength(10);
    expect(await hasActiveMfa(userId)).toBe(true);
  });

  it("verifyMfa accepts a live TOTP and rejects a stale one", async () => {
    const factor = await db.authenticationFactor.findFirstOrThrow({
      where: { userId, status: "ACTIVE" },
    });
    const { decryptSecret } = await import("@/lib/mfa/secret-encryption");
    const secret = decryptSecret(factor.secretEnc!);

    expect((await verifyMfa(userId, generateTotp(secret))).ok).toBe(true);
    expect(
      (await verifyMfa(userId, generateTotp(secret, Date.now() - 120_000))).ok,
    ).toBe(false);
  });

  it("a recovery code works once and is then consumed", async () => {
    const fresh = await regenerateRecoveryCodes(userId);
    const code = fresh[0];
    expect((await verifyMfa(userId, code)).ok).toBe(true);
    expect((await verifyMfa(userId, code)).ok).toBe(false);
    const remaining = await db.mfaRecoveryCode.count({
      where: { userId, usedAt: null },
    });
    expect(remaining).toBe(9);
  });

  it("regenerating recovery codes invalidates the previous set", async () => {
    const first = await regenerateRecoveryCodes(userId);
    const second = await regenerateRecoveryCodes(userId);
    expect((await verifyMfa(userId, first[1])).ok).toBe(false);
    expect((await verifyMfa(userId, second[1])).ok).toBe(true);
  });

  it("isMfaRequiredForUser reflects active factor / org policy / platform admin", async () => {
    expect(await isMfaRequiredForUser({ id: userId, orgId })).toBe(true); // has factor
    await disableMfa(userId);
    expect(await isMfaRequiredForUser({ id: userId, orgId })).toBe(false);
    await db.organisation.update({ where: { id: orgId }, data: { requireMfa: true } });
    expect(await isMfaRequiredForUser({ id: userId, orgId })).toBe(true);
    await db.organisation.update({ where: { id: orgId }, data: { requireMfa: false } });
    expect(
      await isMfaRequiredForUser({ id: userId, orgId, isPlatformAdmin: true }),
    ).toBe(true);
  });

  it("password reset: generic response, hashed token, single use, sessions killed", async () => {
    process.env.EMAIL_PROVIDER = "disabled";
    const sess = await createSession({ userId });
    expect((await validateSession(sess)).valid).toBe(true);

    const res = await requestPasswordReset({ email });
    expect(res.message).toMatch(/if that email/i);

    const row = await db.passwordResetToken.findFirst({
      where: { userId, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    expect(row).toBeTruthy();
    expect(row!.tokenHash).toHaveLength(64);

    // We cannot read the raw token (it was emailed) — reconstruct via a known
    // token to prove hashing + consumption semantics.
    const known = "reset-token-value-of-sufficient-length-1234567890";
    await db.passwordResetToken.update({
      where: { id: row!.id },
      data: { tokenHash: hashResetToken(known) },
    });

    const weak = await completePasswordReset({ token: known, newPassword: "short" });
    expect(weak).toEqual({ ok: false, reason: "WEAK_PASSWORD" });

    const ok = await completePasswordReset({
      token: known,
      newPassword: "a-brand-new-strong-password",
    });
    expect(ok).toEqual({ ok: true });

    // Token now single-use.
    expect(
      await completePasswordReset({ token: known, newPassword: "another-strong-one-99" }),
    ).toEqual({ ok: false, reason: "USED" });

    // Pre-existing session invalidated by the reset.
    expect((await validateSession(sess)).valid).toBe(false);
  });

  it("unknown email still returns the generic response (no enumeration)", async () => {
    const res = await requestPasswordReset({ email: `nobody-${runId}@nowhere.local` });
    expect(res.message).toMatch(/if that email/i);
  });

  it("rotateSession revokes the old nonce and issues a working new one", async () => {
    const oldToken = await createSession({ userId });
    const newToken = await rotateSession({
      currentToken: oldToken,
      reason: "MFA_COMPLETED",
      markMfaVerified: true,
    });
    expect(newToken).toBeTruthy();
    expect((await validateSession(oldToken)).valid).toBe(false);
    expect((await validateSession(newToken!)).valid).toBe(true);
    const row = await db.userSession.findUnique({ where: { token: newToken! } });
    expect(row?.mfaVerified).toBe(true);
    expect(row?.strongAuthAt).toBeTruthy();
  });

  it("shared rate-limit counter enforces the limit across calls", async () => {
    const key = `itest:${runId}`;
    await resetRateLimit(key);
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      results.push((await checkRateLimit(key, { limit: 3, windowMs: 60_000 })).ok);
    }
    expect(results).toEqual([true, true, true, false, false]);
  });
});
