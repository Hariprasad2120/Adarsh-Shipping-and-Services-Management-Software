import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  CONTENT_SECURITY_POLICY,
  STRICT_TRANSPORT_SECURITY,
  securityHeaders,
} from "@/lib/security-headers";

describe("security headers", () => {
  it("CSP keeps the hard framing/object protections", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("form-action 'self'");
  });

  it("never allows bare unsafe-eval in production", () => {
    if (process.env.NODE_ENV === "production") {
      expect(CONTENT_SECURITY_POLICY).not.toMatch(/script-src[^;]*'unsafe-eval'/);
      expect(CONTENT_SECURITY_POLICY).toContain("upgrade-insecure-requests");
    }
  });

  it("HSTS value is long-lived, covers subdomains, is preload-eligible", () => {
    expect(STRICT_TRANSPORT_SECURITY).toMatch(/max-age=\d{7,}/);
    expect(STRICT_TRANSPORT_SECURITY).toContain("includeSubDomains");
    expect(STRICT_TRANSPORT_SECURITY).toContain("preload");
  });

  it("securityHeaders() emits HSTS only when secure", () => {
    expect(securityHeaders({ secure: true })["Strict-Transport-Security"]).toBe(
      STRICT_TRANSPORT_SECURITY,
    );
    expect(
      securityHeaders({ secure: false })["Strict-Transport-Security"],
    ).toBeUndefined();
  });

  it("frameAncestorsSelf relaxes framing consistently", () => {
    const h = securityHeaders({ secure: true, frameAncestorsSelf: true });
    expect(h["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(h["Content-Security-Policy"]).toContain("frame-ancestors 'self'");
    expect(h["Content-Security-Policy"]).not.toContain("frame-ancestors 'none'");
  });

  it("binds inline scripts to a per-request nonce when one is given", () => {
    const withNonce = buildContentSecurityPolicy("abc123");
    expect(withNonce).toMatch(/script-src[^;]*'nonce-abc123'/);
    // The nonce-free form (next.config.ts fallback) has no nonce token.
    expect(CONTENT_SECURITY_POLICY).not.toContain("nonce-");
    // securityHeaders threads the nonce through.
    expect(
      securityHeaders({ nonce: "xyz" })["Content-Security-Policy"],
    ).toMatch(/'nonce-xyz'/);
  });

  it("proxy.ts generates a nonce and sets the CSP on responses", () => {
    const proxy = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");
    expect(proxy).toContain('requestHeaders.set("x-nonce"');
    expect(proxy).toMatch(/securityHeaders\(\{[\s\S]*nonce/);
  });

  it("root layout reads the nonce and applies it to its inline script", () => {
    const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toContain('headers()).get("x-nonce")');
    expect(layout).toMatch(/<script\s+nonce=\{nonce\}/);
  });

  it("next.config.ts no longer sets a static CSP (proxy owns it)", () => {
    const cfg = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(cfg).not.toMatch(/key:\s*["']Content-Security-Policy["']/);
  });
});
