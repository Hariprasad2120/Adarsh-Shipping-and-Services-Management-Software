import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { markNotificationsPresented } from "@/modules/notifications/service";

export async function POST(req: Request) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  try {
    const { ids } = await req.json();
    if (Array.isArray(ids)) {
      await markNotificationsPresented(session!.user.id, ids);
    }
    return ok({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return ok({ success: false, error: message });
  }
}
