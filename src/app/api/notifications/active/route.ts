import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { tracePerformance } from "@/lib/performance";
import { listActiveUserNotifications } from "@/modules/notifications/service";

export async function GET() {
  return tracePerformance("route:GET /api/notifications/active", async () => {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;

    return ok(await listActiveUserNotifications(session!.user.id));
  });
}
