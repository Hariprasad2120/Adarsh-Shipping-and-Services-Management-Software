import { NextResponse } from "next/server";
import { z } from "zod";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { updatePortalNotificationPreferences } from "@/modules/customer-portal/service";

const schema = z.object({
  shipmentUpdatesEmail: z.boolean(),
  documentUpdatesEmail: z.boolean(),
  checklistEmail: z.boolean(),
  queryEmail: z.boolean(),
  ratingEmail: z.boolean(),
  pushEnabled: z.boolean(),
});

export async function PATCH(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await request.json());
    const result = await updatePortalNotificationPreferences(session.portalUserId, body);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preference update failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
