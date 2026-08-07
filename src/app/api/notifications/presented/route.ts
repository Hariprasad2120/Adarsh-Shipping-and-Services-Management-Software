import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { timeBlock } from "@/lib/performance";
import {
  attachRequestPerformanceHeaders,
  withRequestPerformance,
} from "@/lib/request-performance";
import { markNotificationsPresented } from "@/modules/notifications/service";

export async function POST(req: Request) {
  return withRequestPerformance("POST /api/notifications/presented", async () => {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;

    try {
      const payload = await timeBlock("notifications:parsePresentedPayload", () =>
        req.json(),
      );
      const ids = Array.isArray(payload?.ids) ? payload.ids : [];
      if (ids.length > 0) {
        await markNotificationsPresented(session!.user.id, ids);
      }
      return attachRequestPerformanceHeaders(ok({ success: true }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return attachRequestPerformanceHeaders(ok({ success: false, error: message }));
    }
  });
}
