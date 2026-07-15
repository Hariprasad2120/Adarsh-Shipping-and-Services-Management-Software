import { NextResponse } from "next/server";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { markAllPortalNotificationsRead } from "@/modules/customer-portal/service";

export async function POST() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  await markAllPortalNotificationsRead(session.portalUserId);
  return NextResponse.json({ ok: true });
}
