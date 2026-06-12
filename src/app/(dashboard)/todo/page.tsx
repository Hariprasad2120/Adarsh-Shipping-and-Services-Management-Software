import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listTodoTasks } from "@/modules/todo/service";
import { TodoClient } from "./todo-client";

export default async function TodoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const highlightedTaskId = typeof params.taskId === "string" ? params.taskId : undefined;
  const tasks = await listTodoTasks(session.user.id);

  return (
    <TodoClient
      currentUserName={session.user.name}
      highlightedTaskId={highlightedTaskId}
      initialTasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate?.toISOString() ?? null,
        reminderEnabled: task.reminderEnabled,
        alertAt: task.alertAt?.toISOString() ?? null,
        status: task.status,
        completedAt: task.completedAt?.toISOString() ?? null,
        alertTriggeredAt: task.alertTriggeredAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        createdBy: task.createdBy,
        subtasks: task.subtasks.map((subtask) => ({
          id: subtask.id,
          label: subtask.label,
          completed: subtask.completed,
          completedAt: subtask.completedAt?.toISOString() ?? null,
          order: subtask.order,
        })),
        progress: task.progress,
      }))}
    />
  );
}
