import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { tracePerformance } from "@/lib/performance";
import { listUpcomingTodoAlerts } from "@/modules/todo/service";

export async function GET() {
  return tracePerformance("route:GET /api/todos/reminders/upcoming", async () => {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;

    const tasks = await listUpcomingTodoAlerts(session!.user.id);
    return ok(tasks);
  });
}
