import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, rateLimitShared } from "@/lib/security";
import {
  requestCustomerPortalPasswordReset,
  resetCustomerPortalPassword,
} from "@/modules/customer-portal/service";

const requestSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const limited = await rateLimitShared(`portal-reset-request:${getClientIp(request)}`, {
      limit: 10,
      windowMs: 60_000,
    });
    if (!limited.ok) return limited.response;

    const body = requestSchema.parse(await request.json());
    await requestCustomerPortalPasswordReset(body.email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

export async function PATCH(request: Request) {
  try {
    const limited = await rateLimitShared(`portal-reset:${getClientIp(request)}`, {
      limit: 10,
      windowMs: 60_000,
    });
    if (!limited.ok) return limited.response;

    const body = resetSchema.parse(await request.json());
    await resetCustomerPortalPassword(body.token, body.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password reset failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
