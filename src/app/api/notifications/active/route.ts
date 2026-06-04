import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { listActiveUserNotifications } from "@/modules/notifications/service";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  return ok(await listActiveUserNotifications(session!.user.id));
}
