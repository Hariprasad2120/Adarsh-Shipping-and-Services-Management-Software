import { describe, expect, it } from "vitest";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  matchRecoveryCode,
  normalizeRecoveryCode,
  RECOVERY_CODE_COUNT,
} from "@/lib/mfa/recovery-codes";

describe("MFA recovery codes", () => {
  it("generates the configured count of unique codes with aligned hashes", () => {
    const { plaintext, hashes } = generateRecoveryCodes();
    expect(plaintext).toHaveLength(RECOVERY_CODE_COUNT);
    expect(hashes).toHaveLength(RECOVERY_CODE_COUNT);
    expect(new Set(plaintext).size).toBe(RECOVERY_CODE_COUNT);
    plaintext.forEach((code, i) => expect(hashRecoveryCode(code)).toBe(hashes[i]));
  });

  it("hash does not contain the plaintext and is stable under formatting", () => {
    const { plaintext, hashes } = generateRecoveryCodes(1);
    expect(hashes[0]).not.toContain(plaintext[0].replace("-", ""));
    const messy = ` ${plaintext[0].toLowerCase().replace("-", " - ")} `;
    expect(hashRecoveryCode(messy)).toBe(hashes[0]);
  });

  it("matchRecoveryCode returns the matching hash exactly once", () => {
    const { plaintext, hashes } = generateRecoveryCodes(5);
    const hit = matchRecoveryCode(plaintext[2], hashes);
    expect(hit).toBe(hashes[2]);
    // Simulate consumption -> no longer matches.
    const remaining = hashes.filter((h) => h !== hit);
    expect(matchRecoveryCode(plaintext[2], remaining)).toBeNull();
  });

  it("rejects an unknown code", () => {
    const { hashes } = generateRecoveryCodes(3);
    expect(matchRecoveryCode("AAAAA-BBBBB", hashes)).toBeNull();
  });

  it("normalizes case and separators", () => {
    expect(normalizeRecoveryCode(" ab3-d 9x ")).toBe("AB3D9X");
  });
});
