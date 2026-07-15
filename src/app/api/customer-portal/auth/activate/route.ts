import { NextResponse } from "next/server";
import { z } from "zod";
import { activateCustomerPortalAccount } from "@/modules/customer-portal/service";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await activateCustomerPortalAccount(body.token, body.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Activation failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
