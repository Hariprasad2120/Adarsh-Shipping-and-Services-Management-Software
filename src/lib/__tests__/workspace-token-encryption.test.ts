import { describe, expect, it } from "vitest";
import {
  encryptAccessToken,
  encryptToken,
  isEncryptedToken,
  readAccessToken,
} from "@/lib/workspace-oauth";

describe("Google access-token encryption at rest (MON-S1-030)", () => {
  it("encryptAccessToken produces the iv:tag:ciphertext format, not the token", () => {
    const enc = encryptAccessToken("ya29.a0AfB_exampleAccessTokenValue");
    expect(enc).not.toContain("ya29.");
    expect(isEncryptedToken(enc)).toBe(true);
    expect(enc.split(":")).toHaveLength(3);
  });

  it("readAccessToken round-trips an encrypted value", () => {
    const token = "ya29.some-access-token-1234567890";
    expect(readAccessToken(encryptAccessToken(token))).toBe(token);
  });

  it("readAccessToken passes through a legacy plaintext value unchanged", () => {
    const legacy = "ya29.legacy-plaintext-token.with.dots";
    expect(isEncryptedToken(legacy)).toBe(false);
    expect(readAccessToken(legacy)).toBe(legacy);
  });

  it("empty / null are handled", () => {
    expect(encryptAccessToken(null)).toBe("");
    expect(encryptAccessToken("")).toBe("");
    expect(readAccessToken(null)).toBe("");
    expect(readAccessToken("")).toBe("");
    expect(isEncryptedToken(null)).toBe(false);
  });

  it("a refresh-token ciphertext is also recognised as encrypted", () => {
    expect(isEncryptedToken(encryptToken("1//refresh-token-value"))).toBe(true);
  });
});
