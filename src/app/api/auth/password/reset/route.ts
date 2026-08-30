import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { assertRequestIntegrity } from "@/lib/request-integrity";
import { completePasswordReset } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(12).max(1024),
});

export async function POST(req: Request) {
  const blocked = assertRequestIntegrity(req);
  if (blocked) return blocked;

  const ip = getClientIp(req);
  const limit = await checkRateLimit(`pwreset-consume:ip:${ip}`, {
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "RATE_LIMITED", message: "Too many attempts." } },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID", message: "Invalid request." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await completePasswordReset({
    token: parsed.data.token,
    newPassword: parsed.data.password,
    ip,
    userAgent: req.headers.get("user-agent"),
  });

  if (!result.ok) {
    const status = result.reason === "WEAK_PASSWORD" ? 400 : 400;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: result.reason,
          message:
            result.reason === "WEAK_PASSWORD"
              ? "Choose a password of at least 12 characters."
              : "This reset link is invalid or has expired. Request a new one.",
        },
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Deliberately do NOT sign the user in — they must authenticate with the new
  // password (and MFA, if enabled).
  return NextResponse.json(
    { ok: true, message: "Your password has been reset. Please sign in." },
    { headers: { "Cache-Control": "no-store" } },
  );
}
