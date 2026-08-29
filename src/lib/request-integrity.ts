import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";

/**
 * Cross-origin request-integrity check for state-changing endpoints.
 *
 * Defence-in-depth on top of SameSite=Lax cookies and the framework's own
 * Server-Action origin check. Use in every mutating Route Handler
 * (POST/PUT/PATCH/DELETE) that is cookie-authenticated.
 *
 * Strategy (any one passing is enough, evaluated in order):
 *  1. Fetch Metadata: `Sec-Fetch-Site` in {same-origin, same-site, none}.
 *     `none` covers direct address-bar / bookmark use. `cross-site` is rejected.
 *  2. `Origin` header exactly matches an allowed origin.
 *  3. No `Origin` and no `Sec-Fetch-*` (non-browser client, e.g. curl / mobile
 *     app / server-to-server) — allowed here because those callers authenticate
 *     with a Bearer token, not an ambient cookie, so CSRF does not apply.
 *
 * Bearer-authenticated requests should pass `bearer: true` to skip the check.
 */

export interface IntegrityOptions {
  /** Extra allowed origins beyond the app's own origin (exact match). */
  allowOrigins?: string[];
  /** Request is authenticated by Authorization: Bearer, not a cookie. */
  bearer?: boolean;
}

function allowedOrigins(extra?: string[]): Set<string> {
  const set = new Set<string>();
  try {
    set.add(new URL(getAppUrl()).origin);
  } catch {
    /* getAppUrl misconfigured — rely on explicit allowlist / Sec-Fetch-Site */
  }
  for (const o of extra ?? []) {
    try {
      set.add(new URL(o).origin);
    } catch {
      /* ignore malformed entry */
    }
  }
  return set;
}

export function checkRequestIntegrity(
  req: Request,
  opts: IntegrityOptions = {},
): { ok: true } | { ok: false; reason: string } {
  if (opts.bearer) return { ok: true };

  const site = req.headers.get("sec-fetch-site");
  if (site) {
    if (site === "same-origin" || site === "same-site" || site === "none") {
      return { ok: true };
    }
    return { ok: false, reason: `sec-fetch-site=${site}` };
  }

  const origin = req.headers.get("origin");
  if (origin) {
    return allowedOrigins(opts.allowOrigins).has(origin)
      ? { ok: true }
      : { ok: false, reason: `origin ${origin} not allowed` };
  }

  // No Fetch-Metadata and no Origin: not a browser-initiated cross-site POST.
  return { ok: true };
}

/**
 * Throwing form for Route Handlers. Returns a 403 `NextResponse` to return
 * directly, or `null` when the check passes.
 */
export function assertRequestIntegrity(
  req: Request,
  opts: IntegrityOptions = {},
): NextResponse | null {
  const result = checkRequestIntegrity(req, opts);
  if (result.ok) return null;
  return NextResponse.json(
    { ok: false, error: { code: "CROSS_ORIGIN_BLOCKED", message: "Request blocked." } },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
