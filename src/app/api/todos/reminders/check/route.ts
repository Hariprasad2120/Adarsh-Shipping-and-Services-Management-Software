import { NextRequest } from "next/server";
import { err, getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { tracePerformance } from "@/lib/performance";
import { triggerDueTodoReminders } from "@/modules/todo/service";

export async function POST(req: NextRequest) {
  return tracePerformance("route:POST /api/todos/reminders/check", async () => {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;

    try {
      const body = await req.json().catch(() => ({}));
      const triggered = await triggerDueTodoReminders(session!.user.id, {
        taskId: typeof body?.taskId === "string" ? body.taskId : undefined,
      });
      return ok(triggered);
    } catch (caught) {
      return err(caught instanceof Error ? caught.message : "Unable to trigger reminders.", 400);
    }
  });
}
