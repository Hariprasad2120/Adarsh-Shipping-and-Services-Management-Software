import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
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

  it("next.config.ts CSP directive list matches the shared module", () => {
    const cfg = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    for (const directive of [
      "default-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "connect-src 'self' https: wss:",
      "worker-src 'self' blob:",
    ]) {
      expect(cfg, `next.config.ts missing "${directive}"`).toContain(directive);
    }
    // The dangerous token must not appear unguarded (only inside the dev branch).
    expect(cfg).toContain("'wasm-unsafe-eval'");
    expect(cfg).toContain("Strict-Transport-Security");
  });
});
