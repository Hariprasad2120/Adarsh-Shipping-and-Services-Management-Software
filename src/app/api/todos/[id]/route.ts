import { ZodError } from "zod";
import { NextRequest } from "next/server";
import { err, getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { deleteTodoTask, setTodoTaskStatus, updateTodoTask } from "@/modules/todo/service";

function validationError(error: ZodError) {
  const firstIssue = error.issues[0];
  return err(firstIssue?.message ?? "Validation failed.", 400);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json();

    if (body?.mode === "status") {
      const task = await setTodoTaskStatus(session!.user.id, id, body.status);
      return ok(task);
    }

    const task = await updateTodoTask(
      { id: session!.user.id, orgId: session!.user.orgId ?? null },
      id,
      body
    );
    return ok(task);
  } catch (caught) {
    if (caught instanceof ZodError) return validationError(caught);
    return err(caught instanceof Error ? caught.message : "Unable to update task.", 400);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  try {
    const { id } = await context.params;
    await deleteTodoTask(session!.user.id, id);
    return ok({ success: true });
  } catch (caught) {
    return err(caught instanceof Error ? caught.message : "Unable to delete task.", 400);
  }
}
