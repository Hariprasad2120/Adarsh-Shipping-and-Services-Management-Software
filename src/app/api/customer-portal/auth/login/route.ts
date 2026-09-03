import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, rateLimitShared } from "@/lib/security";
import { loginCustomerPortal } from "@/modules/customer-portal/service";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const limited = await rateLimitShared(`portal-login:${getClientIp(request)}`, {
      limit: 20,
      windowMs: 60_000,
    });
    if (!limited.ok) return limited.response;

    const body = schema.parse(await request.json());
    await loginCustomerPortal(body.email, body.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
