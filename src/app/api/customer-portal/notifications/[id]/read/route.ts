import { NextResponse } from "next/server";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { markPortalNotificationRead } from "@/modules/customer-portal/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await markPortalNotificationRead(session.portalUserId, id);
  return NextResponse.json({ ok: true });
}
