import { describe, expect, it } from "vitest";
import { assessOAuthProfile, parseAllowedDomains } from "@/lib/oauth-linking";

describe("parseAllowedDomains", () => {
  it("splits, trims, lowercases and strips a leading @", () => {
    expect(parseAllowedDomains(" Example.com, @Corp.io ")).toEqual([
      "example.com",
      "corp.io",
    ]);
    expect(parseAllowedDomains("")).toEqual([]);
    expect(parseAllowedDomains(null)).toEqual([]);
  });
});

describe("assessOAuthProfile", () => {
  it("accepts a verified email and normalises it", () => {
    const r = assessOAuthProfile({ email: "  User@Example.com ", email_verified: true });
    expect(r).toEqual({ ok: true, email: "user@example.com", domain: "example.com" });
  });

  it("accepts the string 'true' for email_verified", () => {
    expect(assessOAuthProfile({ email: "a@b.com", email_verified: "true" }).ok).toBe(true);
  });

  it("rejects an unverified email", () => {
    expect(assessOAuthProfile({ email: "a@b.com", email_verified: false })).toEqual({
      ok: false,
      reason: "EMAIL_UNVERIFIED",
    });
    expect(assessOAuthProfile({ email: "a@b.com" }).ok).toBe(false);
  });

  it("rejects a missing / malformed email", () => {
    expect(assessOAuthProfile({ email: "", email_verified: true }).ok).toBe(false);
    expect(assessOAuthProfile({ email: "notanemail", email_verified: true }).ok).toBe(false);
  });

  it("enforces an allowed-domain policy", () => {
    const opts = { allowedDomains: ["corp.io"] };
    expect(assessOAuthProfile({ email: "a@corp.io", email_verified: true, hd: "corp.io" }, opts).ok).toBe(true);
    expect(assessOAuthProfile({ email: "a@gmail.com", email_verified: true }, opts)).toEqual({
      ok: false,
      reason: "DOMAIN_NOT_ALLOWED",
    });
    // domain matches but the hosted-domain claim does not
    expect(
      assessOAuthProfile({ email: "a@corp.io", email_verified: true, hd: "evil.io" }, opts).ok,
    ).toBe(false);
  });

  it("no policy configured -> any verified domain passes", () => {
    expect(assessOAuthProfile({ email: "a@anywhere.dev", email_verified: true }).ok).toBe(true);
  });
});
