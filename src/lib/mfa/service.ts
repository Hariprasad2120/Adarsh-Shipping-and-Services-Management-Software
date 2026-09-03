import { db } from "@/lib/db";
import { logSecurityEvent } from "@/lib/session-service";
import {
  buildOtpAuthUri,
  generateTotpSecret,
  verifyTotp,
} from "@/lib/mfa/totp";
import { decryptSecret, encryptSecret } from "@/lib/mfa/secret-encryption";
import {
  generateRecoveryCodes,
  matchRecoveryCode,
} from "@/lib/mfa/recovery-codes";

/**
 * MFA/TOTP lifecycle (MON-S1-002). Secrets are AES-256-GCM encrypted at rest;
 * recovery codes are stored only as hashes. This module never returns a stored
 * secret and never logs one.
 *
 * Step-up re-authentication for `disable` / `regenerate` is enforced by the
 * caller via `src/lib/step-up.ts` before invoking these.
 */

const ISSUER = "Monolith";

export async function getActiveFactor(userId: string) {
  return db.authenticationFactor.findFirst({
    where: { userId, type: "totp", status: "ACTIVE" },
  });
}

export async function hasActiveMfa(userId: string): Promise<boolean> {
  return (await getActiveFactor(userId)) !== null;
}

export interface EnrollmentChallenge {
  factorId: string;
  secret: string; // shown once, for manual entry
  otpauthUri: string; // encode as QR
  qrDataUrl: string; // data: URI PNG of the otpauth URI, safe to render inline
}

/**
 * Start (or restart) TOTP enrolment. Creates a PENDING factor with a fresh
 * encrypted secret. Not usable until `confirmEnrollment` succeeds.
 */
export async function beginEnrollment(
  userId: string,
  accountEmail: string,
): Promise<EnrollmentChallenge> {
  const existingActive = await getActiveFactor(userId);
  if (existingActive) {
    throw new Error("MFA is already enabled. Disable it first to re-enrol.");
  }
  const secret = generateTotpSecret();
  const factor = await db.authenticationFactor.upsert({
    where: { userId_type: { userId, type: "totp" } },
    update: {
      secretEnc: encryptSecret(secret),
      status: "PENDING",
      confirmedAt: null,
      disabledAt: null,
    },
    create: {
      userId,
      type: "totp",
      secretEnc: encryptSecret(secret),
      status: "PENDING",
    },
    select: { id: true },
  });
  const otpauthUri = buildOtpAuthUri({ secret, accountName: accountEmail, issuer: ISSUER });
  const QRCode = (await import("qrcode")).default;
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 220 });
  return { factorId: factor.id, secret, otpauthUri, qrDataUrl };
}

export interface ConfirmationResult {
  recoveryCodes: string[]; // shown once
}

/**
 * Verify the first OTP from the authenticator and activate MFA. Issues a new
 * set of one-time recovery codes (returned once, stored hashed).
 */
export async function confirmEnrollment(
  userId: string,
  otp: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<ConfirmationResult> {
  const factor = await db.authenticationFactor.findFirst({
    where: { userId, type: "totp", status: "PENDING" },
  });
  if (!factor?.secretEnc) throw new Error("No pending MFA enrolment.");

  const secret = decryptSecret(factor.secretEnc);
  if (!verifyTotp(secret, otp)) {
    await logSecurityEvent({
      event: "MFA_FAILED",
      outcome: "FAILURE",
      userId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      reason: "Invalid OTP during enrolment",
    });
    throw new Error("That code is not valid. Try again.");
  }

  const { plaintext, hashes } = generateRecoveryCodes();
  await db.$transaction([
    db.authenticationFactor.update({
      where: { id: factor.id },
      data: { status: "ACTIVE", confirmedAt: new Date(), disabledAt: null },
    }),
    db.mfaRecoveryCode.deleteMany({ where: { userId } }),
    db.mfaRecoveryCode.createMany({
      data: hashes.map((codeHash) => ({ userId, factorId: factor.id, codeHash })),
    }),
  ]);

  await logSecurityEvent({
    event: "MFA_ENABLED",
    outcome: "SUCCESS",
    userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { recoveryCodes: plaintext };
}

export type MfaVerifyOutcome =
  | { ok: true; method: "totp" | "recovery" | "passkey" }
  | { ok: false };

/** Any active factor (TOTP or passkey) means MFA is on for this user. */
export async function hasAnyActiveFactor(userId: string): Promise<boolean> {
  return (
    (await db.authenticationFactor.count({
      where: { userId, status: "ACTIVE", type: { in: ["totp", "webauthn"] } },
    })) > 0
  );
}

/**
 * Verify a login-time second factor. `code` is either a TOTP / recovery code
 * string, or a JSON-serialised WebAuthn assertion `{ passkey, challenge }`.
 */
export async function verifyMfa(
  userId: string,
  code: string,
  meta: {
    ip?: string | null;
    userAgent?: string | null;
    /** Server-issued WebAuthn challenge (from the httpOnly cookie). */
    passkeyChallenge?: string | null;
  } = {},
): Promise<MfaVerifyOutcome> {
  // ── Passkey assertion ──
  if (code.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(code) as { passkey?: unknown };
      // The challenge MUST come from the server-set cookie, never the client.
      if (parsed.passkey && meta.passkeyChallenge) {
        const pk = await db.authenticationFactor.findFirst({
          where: { userId, type: "webauthn", status: "ACTIVE" },
        });
        if (!pk?.credentialId || !pk.credentialPublic) return { ok: false };
        const { verifyAuthentication } = await import("@/lib/mfa/webauthn");
        const res = await verifyAuthentication({
          response: parsed.passkey as never,
          expectedChallenge: meta.passkeyChallenge,
          credentialId: pk.credentialId,
          credentialPublic: pk.credentialPublic,
          counter: pk.counter ?? 0,
        });
        if (!res.verified) {
          await logSecurityEvent({
            event: "MFA_FAILED",
            outcome: "FAILURE",
            userId,
            ip: meta.ip,
            userAgent: meta.userAgent,
            reason: "Passkey assertion failed",
          });
          return { ok: false };
        }
        await db.authenticationFactor.update({
          where: { id: pk.id },
          data: { counter: res.newCounter, lastUsedAt: new Date() },
        });
        return { ok: true, method: "passkey" };
      }
    } catch {
      return { ok: false };
    }
  }

  const factor = await getActiveFactor(userId);
  if (!factor?.secretEnc) return { ok: false };

  if (verifyTotp(decryptSecret(factor.secretEnc), code)) {
    await db.authenticationFactor.update({
      where: { id: factor.id },
      data: { lastUsedAt: new Date() },
    });
    return { ok: true, method: "totp" };
  }

  const unused = await db.mfaRecoveryCode.findMany({
    where: { userId, usedAt: null },
    select: { codeHash: true },
  });
  const hit = matchRecoveryCode(code, unused.map((r) => r.codeHash));
  if (hit) {
    await db.mfaRecoveryCode.updateMany({
      where: { userId, codeHash: hit, usedAt: null },
      data: { usedAt: new Date() },
    });
    await logSecurityEvent({
      event: "MFA_RECOVERY_CODE_USED",
      outcome: "SUCCESS",
      userId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { ok: true, method: "recovery" };
  }

  await logSecurityEvent({
    event: "MFA_FAILED",
    outcome: "FAILURE",
    userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    reason: "Invalid TOTP / recovery code at login",
  });
  return { ok: false };
}

/** Disable MFA. Caller MUST enforce step-up re-auth first. */
export async function disableMfa(
  userId: string,
  meta: { actorUserId?: string; ip?: string | null; userAgent?: string | null } = {},
): Promise<void> {
  await db.$transaction([
    db.authenticationFactor.updateMany({
      where: { userId, type: "totp" },
      data: { status: "DISABLED", disabledAt: new Date(), secretEnc: null },
    }),
    db.mfaRecoveryCode.deleteMany({ where: { userId } }),
  ]);
  await logSecurityEvent({
    event: "MFA_DISABLED",
    outcome: "SUCCESS",
    userId,
    actorUserId: meta.actorUserId ?? userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

/** Regenerate recovery codes (invalidates the old set). Caller enforces step-up. */
export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const factor = await getActiveFactor(userId);
  if (!factor) throw new Error("MFA is not enabled.");
  const { plaintext, hashes } = generateRecoveryCodes();
  await db.$transaction([
    db.mfaRecoveryCode.deleteMany({ where: { userId } }),
    db.mfaRecoveryCode.createMany({
      data: hashes.map((codeHash) => ({ userId, factorId: factor.id, codeHash })),
    }),
  ]);
  await logSecurityEvent({
    event: "MFA_RECOVERY_CODES_REGENERATED",
    outcome: "SUCCESS",
    userId,
  });
  return plaintext;
}

export interface FactorInventoryItem {
  id: string;
  type: string;
  label: string | null;
  status: string;
  confirmedAt: Date | null;
  lastUsedAt: Date | null;
}

export async function listFactors(userId: string): Promise<{
  factors: FactorInventoryItem[];
  recoveryCodesRemaining: number;
}> {
  const [factors, recoveryCodesRemaining] = await Promise.all([
    db.authenticationFactor.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        label: true,
        status: true,
        confirmedAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.mfaRecoveryCode.count({ where: { userId, usedAt: null } }),
  ]);
  return { factors, recoveryCodesRemaining };
}

/**
 * Whether this user must complete MFA to hold a session:
 * they have MFA active, OR their org / platform-admin status mandates it.
 */
export async function isMfaRequiredForUser(user: {
  id: string;
  orgId?: string | null;
  isPlatformAdmin?: boolean;
}): Promise<boolean> {
  if (user.isPlatformAdmin) return true;
  if (await hasAnyActiveFactor(user.id)) return true;
  if (user.orgId) {
    const org = await db.organisation.findUnique({
      where: { id: user.orgId },
      select: { requireMfa: true },
    });
    if (org?.requireMfa) return true;
  }
  return false;
}
