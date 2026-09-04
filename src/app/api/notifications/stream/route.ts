import { getSessionOrUnauth } from "@/lib/api-helpers";
import { listActiveUserNotifications } from "@/modules/notifications/service";
import {
  subscribeToUserNotifications,
  type MonolithNotificationPayload,
} from "@/modules/notifications/realtime";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const userId = session!.user.id;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      unsubscribe = subscribeToUserNotifications(
        userId,
        (notification: MonolithNotificationPayload) => {
          send("notification", notification);
        },
      );

      send("sync", await listActiveUserNotifications(userId));
      heartbeat = setInterval(() => send("ping", { t: Date.now() }), 15000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
