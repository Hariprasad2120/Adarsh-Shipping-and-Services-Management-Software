import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { assertRequestIntegrity } from "@/lib/request-integrity";
import { requestPasswordReset } from "@/lib/password-reset";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const blocked = assertRequestIntegrity(req);
  if (blocked) return blocked;

  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  // Rate-limit per IP and (when parseable) per email — controlled backoff, no
  // permanent lock. Response shape is identical whether limited or not.
  const email = parsed.success ? parsed.data.email.trim().toLowerCase() : "";
  const [byIp, byEmail] = await Promise.all([
    checkRateLimit(`pwreset:ip:${ip}`, { limit: 5, windowMs: 15 * 60_000 }),
    email
      ? checkRateLimit(`pwreset:email:${email}`, { limit: 3, windowMs: 60 * 60_000 })
      : Promise.resolve({ ok: true, remaining: 0, retryAfterSeconds: 0 }),
  ]);

  const genericOk = NextResponse.json(
    {
      ok: true,
      message:
        "If that email belongs to a local account, a password reset link is on its way.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );

  if (!byIp.ok || !byEmail.ok) return genericOk; // silently absorb
  if (!parsed.success) return genericOk; // do not reveal validation detail

  const userAgent = req.headers.get("user-agent");
  await requestPasswordReset({ email, ip, userAgent });
  return genericOk;
}
