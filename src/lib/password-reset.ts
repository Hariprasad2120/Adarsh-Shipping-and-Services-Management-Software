import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email";
import {
  logSecurityEvent,
  revokeAllSessionsForUser,
} from "@/lib/session-service";
import {
  checkResetToken,
  hashResetToken,
  issueResetToken,
  PASSWORD_RESET_TTL_MINUTES,
} from "@/lib/password-reset-token";

/**
 * Local ("Monolith") account password reset (OWASP Forgot Password Cheat
 * Sheet). Google-only accounts are never reset here — the response is the same
 * generic message regardless, so the flow never reveals whether an account
 * exists or how it authenticates.
 *
 * The link origin is always `APP_URL`, never a request Host header
 * (MON-S1-032).
 */

const GENERIC_RESPONSE =
  "If that email belongs to a local account, a password reset link is on its way.";

function looksLocalAccount(passwordHash: string | null | undefined): boolean {
  // Google-only accounts are provisioned without a usable local password
  // (empty string or a non-bcrypt placeholder).
  return typeof passwordHash === "string" && passwordHash.startsWith("$2");
}

export async function requestPasswordReset(input: {
  email: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ message: string }> {
  const email = input.email.trim().toLowerCase();

  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, active: true, passwordHash: true, name: true },
  });

  // Always audit the request; only actually issue a token for an eligible
  // local account. Response is identical in every branch.
  await logSecurityEvent({
    event: "PASSWORD_RESET_REQUESTED",
    outcome: "SUCCESS",
    userId: user?.id,
    email,
    ip: input.ip,
    userAgent: input.userAgent,
    reason: user
      ? user.active && looksLocalAccount(user.passwordHash)
        ? "eligible"
        : "ineligible-account"
      : "unknown-email",
  });

  if (user && user.active && looksLocalAccount(user.passwordHash)) {
    const { token, tokenHash, expiresAt } = issueResetToken();
    // Invalidate any earlier outstanding tokens for this user.
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestedIp: input.ip ?? null,
      },
    });

    const link = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Monolith password",
        html: `<p>Hello ${user.name ?? ""},</p>
<p>We received a request to reset your Monolith password. This link is valid for
${PASSWORD_RESET_TTL_MINUTES} minutes and can be used once:</p>
<p><a href="${link}">${link}</a></p>
<p>If you did not request this, you can ignore this email — your password will
not change.</p>`,
        text: `Reset your Monolith password (valid ${PASSWORD_RESET_TTL_MINUTES} min, single use):\n${link}\n\nIf you did not request this, ignore this email.`,
      });
    } catch (e) {
      // Do not leak delivery failure to the caller.
      console.error("[password-reset] email delivery failed:", e);
    }
  }

  return { message: GENERIC_RESPONSE };
}

export type ResetOutcome =
  | { ok: true }
  | { ok: false; reason: "INVALID" | "EXPIRED" | "USED" | "WEAK_PASSWORD" };

export async function completePasswordReset(input: {
  token: string;
  newPassword: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<ResetOutcome> {
  if (!input.newPassword || input.newPassword.length < 12) {
    return { ok: false, reason: "WEAK_PASSWORD" };
  }

  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(input.token) },
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      expiresAt: true,
      consumedAt: true,
    },
  });
  if (!row) return { ok: false, reason: "INVALID" };

  const check = checkResetToken(input.token, row);
  if (!check.valid) {
    return {
      ok: false,
      reason: check.reason === "CONSUMED" ? "USED" : check.reason === "EXPIRED" ? "EXPIRED" : "INVALID",
    };
  }

  const passwordHash = await hash(input.newPassword, 12);
  await db.$transaction([
    db.passwordResetToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    }),
    db.passwordResetToken.updateMany({
      where: { userId: row.userId, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    db.user.update({ where: { id: row.userId }, data: { passwordHash } }),
  ]);

  // Reset invalidates every active session — the user must sign in again.
  await revokeAllSessionsForUser({
    userId: row.userId,
    actorUserId: row.userId,
    reason: "PASSWORD_CHANGED",
  });

  await logSecurityEvent({
    event: "PASSWORD_RESET_COMPLETED",
    outcome: "SUCCESS",
    userId: row.userId,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { ok: true };
}
