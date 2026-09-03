import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp, rateLimitShared } from "@/lib/security";
import { assertRequestIntegrity } from "@/lib/request-integrity";
import { buildAuthenticationOptions } from "@/lib/mfa/webauthn";

/**
 * Pre-auth WebAuthn challenge for the login MFA step. Returns assertion options
 * and sets an HttpOnly `pk_auth_challenge` cookie that `auth.ts` reads back.
 *
 * Enumeration-safe: always returns options; `allowCredentials` is empty when the
 * email is unknown or has no passkey, so the response shape is identical.
 */

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const blocked = assertRequestIntegrity(req);
  if (blocked) return blocked;

  const ip = getClientIp(req);
  const limited = await rateLimitShared(`pk-challenge:${ip}`, {
    limit: 30,
    windowMs: 15 * 60_000,
  });
  if (!limited.ok) return limited.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  const email = parsed.success ? parsed.data.email.trim().toLowerCase() : "";

  let credentialId: string | null = null;
  if (email) {
    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, active: true },
      select: { id: true },
    });
    if (user) {
      const pk = await db.authenticationFactor.findFirst({
        where: { userId: user.id, type: "webauthn", status: "ACTIVE" },
        select: { credentialId: true },
      });
      credentialId = pk?.credentialId ?? null;
    }
  }

  const options = await buildAuthenticationOptions(credentialId);
  const res = NextResponse.json(options, {
    headers: { "Cache-Control": "no-store" },
  });
  res.cookies.set("pk_auth_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 300,
  });
  return res;
}
