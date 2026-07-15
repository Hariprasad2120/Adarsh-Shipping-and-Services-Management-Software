import { NextResponse } from "next/server";
import { z } from "zod";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { changeCustomerPortalPassword } from "@/modules/customer-portal/service";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function PATCH(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await request.json());
    await changeCustomerPortalPassword({
      portalUserId: session.portalUserId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password change failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
