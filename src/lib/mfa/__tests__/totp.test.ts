import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  generateTotp,
  generateTotpSecret,
  verifyTotp,
} from "@/lib/mfa/totp";

describe("base32", () => {
  it("round-trips arbitrary bytes", () => {
    const buf = Buffer.from("monolith-secret-material");
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });
});

describe("TOTP (RFC 6238)", () => {
  // RFC 6238 appendix B test vector: secret "12345678901234567890" (ASCII) as
  // Base32, SHA1, 8 digits, T=59 -> 94287082.
  const rfcSecret = base32Encode(Buffer.from("12345678901234567890"));

  it("matches the RFC 6238 SHA1 test vector (6-digit truncation of 94287082)", () => {
    expect(generateTotp(rfcSecret, 59_000)).toBe("287082");
    expect(verifyTotp(rfcSecret, "287082", { atMs: 59_000, window: 0 })).toBe(true);
  });

  it("verifies its own current code", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    expect(verifyTotp(secret, generateTotp(secret, now), { atMs: now })).toBe(true);
  });

  it("accepts a code from the adjacent step (clock skew)", () => {
    const secret = generateTotpSecret();
    const now = 1_000_000_000_000;
    const prev = generateTotp(secret, now - 30_000);
    expect(verifyTotp(secret, prev, { atMs: now })).toBe(true);
  });

  it("rejects a code two steps away", () => {
    const secret = generateTotpSecret();
    const now = 1_000_000_000_000;
    const old = generateTotp(secret, now - 90_000);
    expect(verifyTotp(secret, old, { atMs: now })).toBe(false);
  });

  it("rejects malformed input", () => {
    const secret = generateTotpSecret();
    for (const bad of ["", "abcdef", "12345", "1234567890123"]) {
      expect(verifyTotp(secret, bad)).toBe(false);
    }
  });

  it("rejects a code for a different secret", () => {
    const now = Date.now();
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(verifyTotp(b, generateTotp(a, now), { atMs: now })).toBe(false);
  });

  it("builds a standard otpauth URI", () => {
    const uri = buildOtpAuthUri({
      secret: "JBSWY3DPEHPK3PXP",
      accountName: "user@example.com",
      issuer: "Monolith",
    });
    expect(uri).toContain("otpauth://totp/Monolith:user%40example.com");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=Monolith");
    expect(uri).toContain("period=30");
  });
});
