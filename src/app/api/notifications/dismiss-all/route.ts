import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { dismissAllNotifications } from "@/modules/notifications/service";

export async function POST() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  await dismissAllNotifications(session!.user.id);
  return ok({ updated: true });
}
