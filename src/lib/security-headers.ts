/**
 * Central security-header definitions.
 *
 * `src/proxy.ts` owns the per-response headers (it generates a per-request CSP
 * nonce). `next.config.ts` keeps only the static, non-CSP headers as a fallback
 * for asset responses the proxy does not touch. A unit test
 * (`src/lib/__tests__/security-headers.test.ts`) keeps them consistent.
 *
 * Design notes / known follow-ups:
 *  - `script-src` carries a per-request `'nonce-…'`. Modern browsers ignore
 *    `'unsafe-inline'` when a nonce is present; the token is kept only as a
 *    safety net for pre-CSP3 browsers. `'unsafe-eval'` is dropped in production
 *    (only `'wasm-unsafe-eval'`); dev keeps `'unsafe-eval'` for the HMR runtime.
 *  - `connect-src`/`img-src` still allow `https:` broadly pending an inventory
 *    of every outbound origin (Google APIs, map tiles, Resend, etc.).
 */

const IS_PROD = process.env.NODE_ENV === "production";

/** Build the CSP string, optionally binding inline scripts to a nonce. */
export function buildContentSecurityPolicy(nonce?: string): string {
  const scriptSrc = [
    "script-src 'self'",
    nonce ? `'nonce-${nonce}'` : "",
    "'unsafe-inline'", // ignored by CSP3 browsers when a nonce is present
    IS_PROD ? "'wasm-unsafe-eval'" : "'unsafe-eval'",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    scriptSrc,
    "connect-src 'self' https: wss:",
    "worker-src 'self' blob:",
    ...(IS_PROD ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** Nonce-free CSP — used by `next.config.ts` and the sync tests. */
export const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy();

/** HSTS — only meaningful (and only emitted) when serving over TLS in prod. */
export const STRICT_TRANSPORT_SECURITY =
  "max-age=63072000; includeSubDomains; preload";

export const BASE_SECURITY_HEADERS: Record<string, string> = {
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
 * @param opts.nonce  per-request CSP nonce for inline scripts
 */
export function securityHeaders(opts: {
  secure?: boolean;
  frameAncestorsSelf?: boolean;
  nonce?: string;
} = {}): Record<string, string> {
  let csp = buildContentSecurityPolicy(opts.nonce);
  if (opts.frameAncestorsSelf) {
    csp = csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'");
  }

  const headers: Record<string, string> = {
    ...BASE_SECURITY_HEADERS,
    "Content-Security-Policy": csp,
  };
  if (opts.frameAncestorsSelf) headers["X-Frame-Options"] = "SAMEORIGIN";
  if (opts.secure ?? IS_PROD) {
    headers["Strict-Transport-Security"] = STRICT_TRANSPORT_SECURITY;
  }
  return headers;
}
