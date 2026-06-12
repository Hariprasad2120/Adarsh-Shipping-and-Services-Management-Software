import { ZodError } from "zod";
import { NextRequest } from "next/server";
import { err, getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { createTodoTask, listTodoTasks, type TodoFilter } from "@/modules/todo/service";

function toFilter(value: string | null): TodoFilter {
  if (value === "PENDING" || value === "COMPLETED" || value === "UPCOMING_ALERTS") return value;
  return "ALL";
}

function validationError(error: ZodError) {
  const firstIssue = error.issues[0];
  return err(firstIssue?.message ?? "Validation failed.", 400);
}

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const filter = toFilter(new URL(req.url).searchParams.get("filter"));
  const tasks = await listTodoTasks(session!.user.id, filter);
  return ok(tasks);
}

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  try {
    const body = await req.json();
    const task = await createTodoTask(
      { id: session!.user.id, orgId: session!.user.orgId ?? null },
      body
    );
    return ok(task, 201);
  } catch (caught) {
    if (caught instanceof ZodError) return validationError(caught);
    return err(caught instanceof Error ? caught.message : "Unable to create task.", 400);
  }
}
