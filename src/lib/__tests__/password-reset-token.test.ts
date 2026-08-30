import { describe, expect, it } from "vitest";
import {
  checkResetToken,
  hashResetToken,
  issueResetToken,
  resetTokenMatches,
} from "@/lib/password-reset-token";

describe("password reset token", () => {
  it("issues a high-entropy token stored only as a hash", () => {
    const { token, tokenHash, expiresAt } = issueResetToken(new Date(0), 30);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).not.toContain(token);
    expect(hashResetToken(token)).toBe(tokenHash);
    expect(expiresAt.getTime()).toBe(30 * 60_000);
  });

  it("matches only the exact token, constant-time", () => {
    const { token, tokenHash } = issueResetToken();
    expect(resetTokenMatches(token, tokenHash)).toBe(true);
    expect(resetTokenMatches(`${token}x`, tokenHash)).toBe(false);
    expect(resetTokenMatches("", tokenHash)).toBe(false);
  });

  it("checkResetToken enforces mismatch / expiry / single-use", () => {
    const now = new Date(1_000_000);
    const { token, tokenHash } = issueResetToken(now, 30);

    expect(checkResetToken(token, { tokenHash, expiresAt: new Date(now.getTime() + 60_000), consumedAt: null }, now))
      .toEqual({ valid: true });

    expect(checkResetToken("wrong", { tokenHash, expiresAt: new Date(now.getTime() + 60_000), consumedAt: null }, now))
      .toEqual({ valid: false, reason: "MISMATCH" });

    expect(checkResetToken(token, { tokenHash, expiresAt: new Date(now.getTime() - 1), consumedAt: null }, now))
      .toEqual({ valid: false, reason: "EXPIRED" });

    expect(checkResetToken(token, { tokenHash, expiresAt: new Date(now.getTime() + 60_000), consumedAt: now }, now))
      .toEqual({ valid: false, reason: "CONSUMED" });
  });
});
