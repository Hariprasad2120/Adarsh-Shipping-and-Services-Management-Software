import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Local ("Monolith") account password-reset token primitives (OWASP Forgot
 * Password Cheat Sheet).
 *
 *  - high entropy: 32 random bytes, base64url (~256 bits)
 *  - stored server-side ONLY as a sha256 hash
 *  - short lived (default 30 min) and single use — the caller enforces
 *    consumption + expiry against the persisted row
 *  - the raw token is delivered once, by email, and never logged
 *
 * Google-only accounts have no local password; the caller must NOT issue a
 * token for them and must return the same generic response either way so the
 * flow does not reveal whether an account exists or how it authenticates.
 */

export const PASSWORD_RESET_TTL_MINUTES = Number(
  process.env.PASSWORD_RESET_TTL_MINUTES ?? 30,
);

export interface IssuedResetToken {
  /** Send this to the user (email link). Never persist or log it. */
  token: string;
  /** Persist this. */
  tokenHash: string;
  expiresAt: Date;
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueResetToken(
  now: Date = new Date(),
  ttlMinutes: number = PASSWORD_RESET_TTL_MINUTES,
): IssuedResetToken {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + ttlMinutes * 60_000),
  };
}

/** Constant-time hash comparison. */
export function resetTokenMatches(suppliedToken: string, storedHash: string): boolean {
  const a = Buffer.from(hashResetToken(suppliedToken ?? ""));
  const b = Buffer.from(storedHash ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface StoredResetTokenState {
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

export type ResetTokenCheck =
  | { valid: true }
  | { valid: false; reason: "MISMATCH" | "EXPIRED" | "CONSUMED" };

export function checkResetToken(
  suppliedToken: string,
  stored: StoredResetTokenState,
  now: Date = new Date(),
): ResetTokenCheck {
  if (!resetTokenMatches(suppliedToken, stored.tokenHash)) {
    return { valid: false, reason: "MISMATCH" };
  }
  if (stored.consumedAt) return { valid: false, reason: "CONSUMED" };
  if (now.getTime() >= stored.expiresAt.getTime()) {
    return { valid: false, reason: "EXPIRED" };
  }
  return { valid: true };
}
