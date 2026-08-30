import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * RFC 6238 TOTP (RFC 4226 HOTP underneath). Standard algorithm only — no
 * custom crypto. Compatible with Google Authenticator, Microsoft Authenticator,
 * 1Password, Authy, etc.
 *
 * Secrets are Base32 (RFC 4648, no padding). This module never stores or logs
 * a secret; persistence + encryption is the caller's job
 * (`src/lib/mfa/secret-encryption.ts`).
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** Accept the current step plus one on each side (±30s clock skew). */
export const TOTP_WINDOW = 1;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/,"").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("Invalid Base32 character in TOTP secret");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** New random secret. 20 bytes = 160 bits, the RFC 4226 recommendation. */
export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

function hotp(secretBytes: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const digest = createHmac("sha1", secretBytes).update(buf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (binary % 10 ** digits).toString().padStart(digits, "0");
}

/** The code the authenticator app would show right now. */
export function generateTotp(
  secret: string,
  atMs: number = Date.now(),
  period = TOTP_PERIOD_SECONDS,
): string {
  const counter = Math.floor(atMs / 1000 / period);
  return hotp(base32Decode(secret), counter);
}

/**
 * Constant-time verification across a small window. Returns true if `token`
 * matches any step in [-window, +window].
 */
export function verifyTotp(
  secret: string,
  token: string,
  opts: { atMs?: number; window?: number; period?: number } = {},
): boolean {
  const t = (token ?? "").replace(/\s+/g, "");
  if (!/^\d{6,8}$/.test(t)) return false;
  const atMs = opts.atMs ?? Date.now();
  const window = opts.window ?? TOTP_WINDOW;
  const period = opts.period ?? TOTP_PERIOD_SECONDS;
  const secretBytes = base32Decode(secret);
  const base = Math.floor(atMs / 1000 / period);
  const provided = Buffer.from(t.padStart(8, "0"));
  for (let i = -window; i <= window; i++) {
    const candidate = hotp(secretBytes, base + i, t.length).padStart(8, "0");
    if (timingSafeEqual(Buffer.from(candidate), provided)) return true;
  }
  return false;
}

/** otpauth:// URI for the QR code shown during enrolment. */
export function buildOtpAuthUri(params: {
  secret: string;
  accountName: string;
  issuer: string;
}): string {
  // Label is `issuer:accountName` with a literal colon; each part encoded.
  const label = `${encodeURIComponent(params.issuer)}:${encodeURIComponent(params.accountName)}`;
  const q = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${q.toString()}`;
}
