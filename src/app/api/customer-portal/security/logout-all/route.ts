import { NextResponse } from "next/server";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { logoutCustomerPortalAllDevices } from "@/modules/customer-portal/service";

export async function POST() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  await logoutCustomerPortalAllDevices(session.portalUserId);
  return NextResponse.json({ ok: true });
}
