/**
 * Central security-header definitions.
 *
 * Consumed by `src/proxy.ts` (per-response, authenticated paths) and mirrored
 * by `next.config.ts` `headers()` (global, static). A unit test
 * (`src/__tests__/security/security-headers.test.ts`) asserts the two stay in
 * sync so a change here is not silently lost.
 *
 * Design notes / known follow-ups:
 *  - `script-src` still allows `'unsafe-inline'`. Removing it needs a
 *    nonce/hash migration for Next's inline bootstrap scripts (tracked:
 *    MON-S1-015 follow-up). `'unsafe-eval'` is dropped in production and kept
 *    only for the dev HMR runtime.
 *  - `connect-src`/`img-src` still allow `https:` broadly pending an inventory
 *    of every outbound origin (Google APIs, map tiles, Resend, etc.).
 */

const IS_PROD = process.env.NODE_ENV === "production";

const SCRIPT_SRC = IS_PROD
  ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

/** The Content-Security-Policy value used everywhere. */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  SCRIPT_SRC,
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  ...(IS_PROD ? ["upgrade-insecure-requests"] : []),
].join("; ");

/** HSTS — only meaningful (and only emitted) when serving over TLS in prod. */
export const STRICT_TRANSPORT_SECURITY =
  "max-age=63072000; includeSubDomains; preload";

/**
 * Headers applied to every response. HSTS is added separately, prod-only,
 * by the caller (see `securityHeaders`).
 */
export const BASE_SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Cross-Origin-Opener-Policy": "same-origin",
};

/**
 * Full header set for a given response context.
 * @param opts.secure  emit HSTS (true in production over TLS)
 * @param opts.frameAncestorsSelf  relax framing to same-origin (e.g. the HR
 *   letter preview route that renders inside an in-app iframe)
 */
export function securityHeaders(opts: {
  secure?: boolean;
  frameAncestorsSelf?: boolean;
} = {}): Record<string, string> {
  const headers: Record<string, string> = { ...BASE_SECURITY_HEADERS };

  if (opts.frameAncestorsSelf) {
    headers["X-Frame-Options"] = "SAMEORIGIN";
    headers["Content-Security-Policy"] = CONTENT_SECURITY_POLICY.replace(
      "frame-ancestors 'none'",
      "frame-ancestors 'self'",
    );
  }

  if (opts.secure ?? IS_PROD) {
    headers["Strict-Transport-Security"] = STRICT_TRANSPORT_SECURITY;
  }

  return headers;
}
