import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { markAllNotificationsRead } from "@/modules/notifications/service";

export async function POST() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  await markAllNotificationsRead(session!.user.id);
  return ok({ updated: true });
}
