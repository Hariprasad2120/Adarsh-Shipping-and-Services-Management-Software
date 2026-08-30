import { afterEach, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
} from "@/lib/mfa/secret-encryption";

const original = process.env.MFA_ENCRYPTION_KEY;
afterEach(() => {
  if (original === undefined) delete process.env.MFA_ENCRYPTION_KEY;
  else process.env.MFA_ENCRYPTION_KEY = original;
});

describe("MFA secret encryption (AES-256-GCM)", () => {
  it("round-trips a secret", () => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const enc = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(enc).not.toContain("JBSWY3DPEHPK3PXP");
    expect(isEncryptedSecret(enc)).toBe(true);
    expect(decryptSecret(enc)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("produces a fresh IV each call", () => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });

  it("rejects a tampered ciphertext (auth tag)", () => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const enc = encryptSecret("topsecret");
    const parts = enc.split(".");
    parts[3] = Buffer.from("garbage").toString("base64url");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });

  it("fails to decrypt under a different key", () => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    const enc = encryptSecret("topsecret");
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 2).toString("base64");
    expect(() => decryptSecret(enc)).toThrow();
  });

  it("accepts a passphrase key (folded to 32 bytes)", () => {
    process.env.MFA_ENCRYPTION_KEY = "a-long-passphrase-not-32-bytes";
    expect(decryptSecret(encryptSecret("v"))).toBe("v");
  });

  it("isEncryptedSecret is false for plaintext", () => {
    expect(isEncryptedSecret("JBSWY3DPEHPK3PXP")).toBe(false);
    expect(isEncryptedSecret(null)).toBe(false);
  });
});
