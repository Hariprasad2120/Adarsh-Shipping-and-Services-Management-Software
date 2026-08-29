import { getAppUrl } from "@/lib/app-url";

/**
 * Any whitespace / C0 control char / DEL / backslash in a redirect target
 * disqualifies it. Backslash matters because some URL parsers treat "/\evil"
 * or "\\evil" as protocol-relative.
 */
function hasUnsafeChars(v: string): boolean {
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c <= 0x20 || c === 0x7f || c === 0x5c) return true;
  }
  return false;
}

/**
 * Open-redirect guard for user-supplied return targets
 * (`callbackUrl`, `returnTo`, `next`, `continue`, OAuth redirects).
 *
 * Accepts:
 *  - same-origin relative paths ("/dashboard", "/cha/jobs?tab=open")
 *  - absolute URLs whose origin is the app origin or an explicit allowlist entry
 *
 * Rejects everything else (protocol-relative "//evil", "https://evil",
 * "javascript:", backslash tricks, whitespace/control chars, missing/blank)
 * and returns `fallback`.
 */
export function safeRedirectPath(
  target: unknown,
  fallback = "/dashboard",
  allowOrigins: string[] = [],
): string {
  if (typeof target !== "string" || target.trim() === "") return fallback;
  const value = target.trim();

  if (hasUnsafeChars(value)) return fallback;

  // Relative path: must start with a single "/" and not "//".
  if (value.startsWith("/")) {
    if (value.startsWith("//")) return fallback;
    return value;
  }

  // Absolute URL: origin must be allowed.
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    const allowed = new Set<string>();
    try {
      allowed.add(new URL(getAppUrl()).origin);
    } catch {
      /* ignore */
    }
    for (const o of allowOrigins) {
      try {
        allowed.add(new URL(o).origin);
      } catch {
        /* ignore */
      }
    }
    if (allowed.has(url.origin)) {
      return `${url.pathname}${url.search}${url.hash}` || "/";
    }
  } catch {
    /* not a URL */
  }
  return fallback;
}

/** Absolute-URL form: always returns a URL on the app origin (or allowlist). */
export function safeRedirectUrl(
  target: unknown,
  fallback = "/dashboard",
  allowOrigins: string[] = [],
): string {
  const path = safeRedirectPath(target, fallback, allowOrigins);
  if (/^https?:\/\//i.test(path)) return path;
  return `${getAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
