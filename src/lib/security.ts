import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateBucket>();

export function requireProductionSecret(name: string, value: string | undefined, fallback?: string) {
  if (process.env.NODE_ENV !== "production") return value ?? fallback;
  if (!value || value === fallback) {
    throw new Error(`${name} is required in production.`);
  }
  return value;
}

export function isDebugRouteEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_DEBUG_ROUTES === "true";
}

export function forbiddenJson(message = "Forbidden", status = 403) {
  return NextResponse.json(
    { ok: false, error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export function requireCronSecret(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return forbiddenJson("Cron secret is not configured.", 503);
  }
  if (!cronSecret) return null;

  // Header-only. Secrets in the query string leak via access logs, proxy logs,
  // Referer headers and browser history. Vercel Cron sends the Bearer header.
  const provided =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return provided && provided === cronSecret
    ? null
    : forbiddenJson("Unauthorized", 401);
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; response: NextResponse };

function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

/**
 * Shared, cross-instance rate limit backed by the `RateLimitCounter` table
 * (MON-S1-011). Prefer this over `rateLimit()` for anything security-relevant
 * (login, reset, invitation, credential flows) — the in-process `rateLimit()`
 * below does not hold across serverless instances.
 */
export async function rateLimitShared(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const { checkRateLimit } = await import("@/lib/rate-limit-store");
  const r = await checkRateLimit(key, options);
  if (r.ok) return { ok: true };
  return { ok: false, retryAfterSeconds: r.retryAfterSeconds, response: tooManyRequests(r.retryAfterSeconds) };
}

/** @deprecated in-process only — use `rateLimitShared` for security flows. */
export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): { ok: true } | { ok: false; retryAfterSeconds: number; response: NextResponse } {
  const now = Date.now();
  const hit = rateBuckets.get(key);

  if (!hit || hit.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }

  if (hit.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((hit.resetAt - now) / 1000));
    const response = NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
    return { ok: false, retryAfterSeconds, response };
  }

  hit.count += 1;
  return { ok: true };
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function sanitizeText(value: string, maxLength = 4000) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizedString(maxLength = 4000) {
  return z.string().transform((value) => sanitizeText(value, maxLength));
}

export function sanitizeFilename(filename: string) {
  const base = (filename || "download").split(/[\\/]/).pop() || "download";
  const cleaned = base
    .replace(/[\r\n"]/g, "_")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim()
    .slice(0, 160);
  return cleaned || "download";
}

export function contentDisposition(filename: string, mode: "inline" | "attachment") {
  const safe = sanitizeFilename(filename);
  const encoded = encodeURIComponent(safe).replace(/['()]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${mode}; filename="${safe.replace(/"/g, "'")}"; filename*=UTF-8''${encoded}`;
}

export function resolveInside(root: string, ...segments: string[]) {
  const rootResolved = path.resolve(root);
  const target = path.resolve(rootResolved, ...segments);
  if (target !== rootResolved && !target.startsWith(`${rootResolved}${path.sep}`)) {
    throw new Error("Unsafe file path.");
  }
  return target;
}

export function assertAllowedFile(params: {
  file: File;
  allowedTypes: ReadonlySet<string>;
  allowedExtensions?: ReadonlySet<string>;
  maxSizeBytes: number;
}) {
  if (!params.allowedTypes.has(params.file.type)) {
    throw new Error("Unsupported file type.");
  }
  if (params.allowedExtensions) {
    const ext = path.extname(sanitizeFilename(params.file.name)).toLowerCase();
    if (!params.allowedExtensions.has(ext)) {
      throw new Error("Unsupported file extension.");
    }
  }
  if (params.file.size <= 0) {
    throw new Error("File is required.");
  }
  if (params.file.size > params.maxSizeBytes) {
    throw new Error(`File exceeds the ${Math.floor(params.maxSizeBytes / 1024 / 1024)} MB upload limit.`);
  }
}

export function resetSecurityRateLimitsForTests() {
  rateBuckets.clear();
}
