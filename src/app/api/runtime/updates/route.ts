import { createHash } from "node:crypto";
import { getSessionOrUnauth } from "@/lib/api-helpers";
import { tracePerformance } from "@/lib/performance";
import { listActiveUserNotifications } from "@/modules/notifications/service";
import { listUpcomingTodoAlerts } from "@/modules/todo/service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return tracePerformance("route:GET /api/runtime/updates", async () => {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;

    const [notifications, upcomingTodoReminders] = await Promise.all([
      listActiveUserNotifications(session!.user.id),
      listUpcomingTodoAlerts(session!.user.id),
    ]);
    const body = JSON.stringify({ notifications, upcomingTodoReminders });
    const etag = `"${createHash("sha256").update(body).digest("base64url")}"`;
    const headers = {
      "Cache-Control": "private, no-cache, must-revalidate",
      ETag: etag,
      Vary: "Cookie",
    };

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  });
}
