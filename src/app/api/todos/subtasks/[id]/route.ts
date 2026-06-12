import { NextRequest } from "next/server";
import { err, getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { toggleTodoSubtask } from "@/modules/todo/service";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const task = await toggleTodoSubtask(
      session!.user.id,
      id,
      typeof body?.completed === "boolean" ? body.completed : undefined
    );
    return ok(task);
  } catch (caught) {
    return err(caught instanceof Error ? caught.message : "Unable to update checklist item.", 400);
  }
}
