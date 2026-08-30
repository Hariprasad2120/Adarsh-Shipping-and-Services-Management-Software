import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * One-time MFA recovery codes.
 *
 * - cryptographically random, shown to the user exactly once
 * - stored ONLY as a hash (sha256 with a server pepper), never plaintext
 * - single use — the caller marks a code consumed after a successful match
 * - regenerating invalidates all previous codes (caller deletes the old set)
 *
 * Format: 10 groups of Crockford-ish base32, `XXXXX-XXXXX` (10 chars + dash).
 */

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/1/O/I
export const RECOVERY_CODE_COUNT = 10;

function pepper(): string {
  return (
    process.env.MFA_RECOVERY_PEPPER ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("MFA_RECOVERY_PEPPER or AUTH_SECRET is required in production.");
        })()
      : "monolith-dev-recovery-pepper")
  );
}

export function normalizeRecoveryCode(input: string): string {
  return (input ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256")
    .update(`${normalizeRecoveryCode(code)}:${pepper()}`)
    .digest("hex");
}

function randomCode(): string {
  const bytes = randomBytes(10);
  let raw = "";
  for (const b of bytes) raw += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

/**
 * Returns the plaintext codes (show once) and their hashes (persist these).
 * The two arrays are index-aligned.
 */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): {
  plaintext: string[];
  hashes: string[];
} {
  const plaintext: string[] = [];
  const seen = new Set<string>();
  while (plaintext.length < count) {
    const c = randomCode();
    if (seen.has(c)) continue;
    seen.add(c);
    plaintext.push(c);
  }
  return { plaintext, hashes: plaintext.map(hashRecoveryCode) };
}

/**
 * Constant-time check of a supplied code against a set of stored hashes.
 * Returns the matching hash (so the caller can mark exactly that code used) or
 * null. Always compares against every hash to avoid a timing oracle.
 */
export function matchRecoveryCode(
  supplied: string,
  storedHashes: readonly string[],
): string | null {
  const target = Buffer.from(hashRecoveryCode(supplied));
  let match: string | null = null;
  for (const h of storedHashes) {
    const candidate = Buffer.from(h);
    if (
      candidate.length === target.length &&
      timingSafeEqual(candidate, target)
    ) {
      match = h;
    }
  }
  return match;
}
