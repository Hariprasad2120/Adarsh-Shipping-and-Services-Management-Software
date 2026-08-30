import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Authenticated encryption (AES-256-GCM) for MFA secrets and other
 * factor material at rest. Standard primitive only — no custom crypto.
 *
 * Key: `MFA_ENCRYPTION_KEY` — a separately managed secret, NOT `AUTH_SECRET`.
 * Accepts a 32-byte base64/hex value, or any passphrase (SHA-256 folded to
 * 32 bytes). In production a real 32-byte random value is required.
 *
 * Wire format (single string, `.` separated, all base64url):
 *   v1.<iv>.<authTag>.<ciphertext>
 */

const VERSION = "v1";

function loadKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MFA_ENCRYPTION_KEY is required in production.");
    }
    // Deterministic dev-only fallback so local enrolment works without setup.
    return createHash("sha256").update("monolith-dev-mfa-key").digest();
  }
  for (const enc of ["base64", "hex"] as const) {
    try {
      const b = Buffer.from(raw, enc);
      if (b.length === 32) return b;
    } catch {
      /* try next */
    }
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ct.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unrecognised encrypted secret format");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const key = loadKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** True when a stored value is in this module's wire format. */
export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${VERSION}.`);
}
