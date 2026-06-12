"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { getNotificationPolicy } from "@/modules/notifications/policy";
import type * as Prisma from "@/generated/prisma/internal/prismaNamespace";
import type { TodoTaskDelegate, TodoTaskModel } from "@/generated/prisma/models/TodoTask";
import type { TodoSubtaskDelegate, TodoSubtaskModel } from "@/generated/prisma/models/TodoSubtask";

export type TodoStatus = "PENDING" | "COMPLETED";
export type TodoFilter = "ALL" | "PENDING" | "COMPLETED" | "UPCOMING_ALERTS";

export type TodoSubtaskView = {
  id: string;
  label: string;
  completed: boolean;
  completedAt: Date | null;
  order: number;
};

export type TodoTaskView = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  reminderEnabled: boolean;
  alertAt: Date | null;
  status: TodoStatus;
  completedAt: Date | null;
  alertTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  subtasks: TodoSubtaskView[];
  progress: {
    total: number;
    completed: number;
    pending: number;
    percent: number;
  };
};

export type TodoReminderToast = {
  id: string;
  taskId: string;
  title: string;
  body: string;
  link: string;
};

type TodoTaskRecord = TodoTaskModel & {
  user: {
    id: string;
    name: string;
    email: string;
  };
  subtasks: TodoSubtaskModel[];
};

const todoTaskDb = db.todoTask as unknown as TodoTaskDelegate;
const todoSubtaskDb = (db as typeof db & { todoSubtask: TodoSubtaskDelegate }).todoSubtask;

const subtaskInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Checklist item cannot be empty.").max(200, "Checklist item is too long."),
  completed: z.boolean().optional().default(false),
});

const todoInputSchema = z
  .object({
    title: z.string().trim().min(1, "Task title is required.").max(160, "Task title is too long."),
    description: z.string().trim().max(2000, "Description is too long.").optional().or(z.literal("")),
    dueDate: z.string().optional().or(z.literal("")),
    reminderEnabled: z.boolean().default(false),
    alertAt: z.string().optional().or(z.literal("")),
    status: z.enum(["PENDING", "COMPLETED"]).optional(),
    subtasks: z.array(subtaskInputSchema).max(50, "Too many checklist items.").optional().default([]),
  })
  .superRefine(async (value, ctx) => {
    if (value.dueDate && normalizeDateOnly(value.dueDate) === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDate"],
        message: "Due date is invalid.",
      });
    }

    if (value.reminderEnabled) {
      if (!value.alertAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["alertAt"],
          message: "Alert date and time is required when reminder is enabled.",
        });
        return;
      }

      const alertAt = new Date(value.alertAt);
      if (Number.isNaN(alertAt.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["alertAt"],
          message: "Alert date and time is invalid.",
        });
        return;
      }

      const now = await getNow();
      if (alertAt.getTime() < now.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["alertAt"],
          message: "Alert date and time cannot be in the past.",
        });
      }
    }

    const normalizedLabels = new Set<string>();
    for (const [index, subtask] of value.subtasks.entries()) {
      const normalized = subtask.label.trim().toLowerCase();
      if (normalizedLabels.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subtasks", index, "label"],
          message: "Checklist items must be unique within a task.",
        });
      }
      normalizedLabels.add(normalized);
    }
  });

function normalizeDateOnly(value?: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDateTime(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toSubtaskView(subtask: TodoSubtaskModel): TodoSubtaskView {
  return {
    id: subtask.id,
    label: subtask.label,
    completed: subtask.completed,
    completedAt: subtask.completedAt,
    order: subtask.order,
  };
}

function computeProgress(subtasks: TodoSubtaskModel[]) {
  const total = subtasks.length;
  const completed = subtasks.filter((subtask) => subtask.completed).length;
  const pending = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, pending, percent };
}

function toTodoView(task: TodoTaskRecord): TodoTaskView {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    reminderEnabled: task.reminderEnabled,
    alertAt: task.alertAt,
    status: task.status as TodoStatus,
    completedAt: task.completedAt,
    alertTriggeredAt: task.alertTriggeredAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    createdBy: task.user,
    subtasks: task.subtasks.sort((left, right) => left.order - right.order).map(toSubtaskView),
    progress: computeProgress(task.subtasks),
  };
}

function buildTodoFilterWhere(userId: string, filter: TodoFilter, now: Date): Prisma.TodoTaskWhereInput {
  if (filter === "PENDING") {
    return { userId, status: "PENDING" };
  }
  if (filter === "COMPLETED") {
    return { userId, status: "COMPLETED" };
  }
  if (filter === "UPCOMING_ALERTS") {
    return {
      userId,
      status: "PENDING",
      reminderEnabled: true,
      alertAt: { gte: now },
    };
  }
  return { userId };
}

function normalizeSubtasks(input: z.infer<typeof subtaskInputSchema>[], now: Date) {
  return input.map((subtask, index) => ({
    id: subtask.id,
    label: subtask.label.trim(),
    completed: Boolean(subtask.completed),
    completedAt: subtask.completed ? now : null,
    order: index,
  }));
}

function deriveTaskStatus(requestedStatus: TodoStatus | undefined, subtasks: ReturnType<typeof normalizeSubtasks>) {
  if (subtasks.length > 0 && subtasks.every((subtask) => subtask.completed)) {
    return "COMPLETED" as const;
  }
  if (requestedStatus === "COMPLETED") {
    return "COMPLETED" as const;
  }
  return "PENDING" as const;
}

async function loadTodoTaskOrThrow(userId: string, taskId: string) {
  const task = await todoTaskDb.findFirst({
    where: { id: taskId, userId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      subtasks: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!task) {
    throw new Error("Todo task not found.");
  }

  return task;
}

export async function listTodoTasks(userId: string, filter: TodoFilter = "ALL") {
  const now = await getNow();
  const tasks = await todoTaskDb.findMany({
    where: buildTodoFilterWhere(userId, filter, now),
    orderBy: [{ status: "asc" }, { alertAt: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      subtasks: {
        orderBy: { order: "asc" },
      },
    },
  });

  return tasks.map(toTodoView);
}

export async function listUpcomingTodoAlerts(userId: string, limit = 20) {
  const now = await getNow();
  return todoTaskDb.findMany({
    where: {
      userId,
      status: "PENDING",
      reminderEnabled: true,
      alertAt: { not: null, gte: now },
      alertTriggeredAt: null,
    },
    orderBy: { alertAt: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      alertAt: true,
    },
  });
}

export async function createTodoTask(user: { id: string; orgId?: string | null }, input: unknown) {
  const parsed = await todoInputSchema.parseAsync(input);
  const dueDate = normalizeDateOnly(parsed.dueDate);
  const alertAt = parsed.reminderEnabled ? normalizeDateTime(parsed.alertAt) : null;
  const now = await getNow();
  const subtasks = normalizeSubtasks(parsed.subtasks, now);
  const nextStatus = deriveTaskStatus(parsed.status, subtasks);

  const task = await todoTaskDb.create({
    data: {
      userId: user.id,
      orgId: user.orgId ?? null,
      title: parsed.title,
      description: parsed.description?.trim() || null,
      dueDate,
      reminderEnabled: parsed.reminderEnabled,
      alertAt,
      status: nextStatus,
      completedAt: nextStatus === "COMPLETED" ? now : null,
      subtasks: {
        create: subtasks.map((subtask) => ({
          label: subtask.label,
          completed: subtask.completed,
          completedAt: subtask.completedAt,
          order: subtask.order,
        })),
      },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      subtasks: {
        orderBy: { order: "asc" },
      },
    },
  });

  return toTodoView(task);
}

export async function updateTodoTask(
  user: { id: string; orgId?: string | null },
  taskId: string,
  input: unknown
) {
  const existing = await loadTodoTaskOrThrow(user.id, taskId);
  const parsed = await todoInputSchema.parseAsync(input);
  const dueDate = normalizeDateOnly(parsed.dueDate);
  const alertAt = parsed.reminderEnabled ? normalizeDateTime(parsed.alertAt) : null;
  const now = await getNow();
  const subtasks = normalizeSubtasks(parsed.subtasks, now);
  const nextStatus = deriveTaskStatus(parsed.status ?? (existing.status as TodoStatus), subtasks);

  const task = await db.$transaction(async (tx) => {
    const transaction = tx as typeof tx & {
      todoTask: TodoTaskDelegate;
      todoSubtask: TodoSubtaskDelegate;
    };

    await transaction.todoSubtask.deleteMany({ where: { taskId } });

    await transaction.todoTask.update({
      where: { id: taskId },
      data: {
        orgId: user.orgId ?? existing.orgId,
        title: parsed.title,
        description: parsed.description?.trim() || null,
        dueDate,
        reminderEnabled: parsed.reminderEnabled,
        alertAt,
        status: nextStatus,
        completedAt: nextStatus === "COMPLETED" ? existing.completedAt ?? now : null,
        alertTriggeredAt:
          parsed.reminderEnabled && alertAt && existing.alertAt?.getTime() === alertAt.getTime()
            ? existing.alertTriggeredAt
            : null,
        alertNotificationId:
          parsed.reminderEnabled && alertAt && existing.alertAt?.getTime() === alertAt.getTime()
            ? existing.alertNotificationId
            : null,
      },
    });

    if (subtasks.length > 0) {
      await transaction.todoSubtask.createMany({
        data: subtasks.map((subtask) => ({
          taskId,
          label: subtask.label,
          completed: subtask.completed,
          completedAt: subtask.completedAt,
          order: subtask.order,
        })),
      });
    }

    return transaction.todoTask.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        subtasks: {
          orderBy: { order: "asc" },
        },
      },
    });
  });

  return toTodoView(task);
}

export async function setTodoTaskStatus(userId: string, taskId: string, status: TodoStatus) {
  await loadTodoTaskOrThrow(userId, taskId);
  const now = await getNow();

  const task = await db.$transaction(async (tx) => {
    const transaction = tx as typeof tx & {
      todoTask: TodoTaskDelegate;
      todoSubtask: TodoSubtaskDelegate;
    };

    await transaction.todoTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? now : null,
      },
    });

    if (status === "COMPLETED") {
      await transaction.todoSubtask.updateMany({
        where: { taskId, completed: false },
        data: { completed: true, completedAt: now },
      });
    }

    return transaction.todoTask.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        subtasks: {
          orderBy: { order: "asc" },
        },
      },
    });
  });

  return toTodoView(task);
}

export async function toggleTodoSubtask(userId: string, subtaskId: string, completed?: boolean) {
  const subtask = await todoSubtaskDb.findFirst({
    where: { id: subtaskId, task: { userId } },
    include: {
      task: true,
    },
  });

  if (!subtask) {
    throw new Error("Checklist item not found.");
  }

  const now = await getNow();
  const nextCompleted = completed ?? !subtask.completed;

  const task = await db.$transaction(async (tx) => {
    const transaction = tx as typeof tx & {
      todoTask: TodoTaskDelegate;
      todoSubtask: TodoSubtaskDelegate;
    };

    await transaction.todoSubtask.update({
      where: { id: subtaskId },
      data: {
        completed: nextCompleted,
        completedAt: nextCompleted ? now : null,
      },
    });

    const subtasks = await transaction.todoSubtask.findMany({
      where: { taskId: subtask.taskId },
      orderBy: { order: "asc" },
    });

    const allCompleted = subtasks.every((item) => (item.id === subtaskId ? nextCompleted : item.completed));
    const taskStatus = allCompleted ? "COMPLETED" : "PENDING";

    await transaction.todoTask.update({
      where: { id: subtask.taskId },
      data: {
        status: taskStatus,
        completedAt: allCompleted ? subtask.task.completedAt ?? now : null,
      },
    });

    return transaction.todoTask.findUniqueOrThrow({
      where: { id: subtask.taskId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        subtasks: {
          orderBy: { order: "asc" },
        },
      },
    });
  });

  return toTodoView(task);
}

export async function deleteTodoTask(userId: string, taskId: string) {
  const existing = await todoTaskDb.findFirst({
    where: { id: taskId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Todo task not found.");
  }

  await todoTaskDb.delete({ where: { id: taskId } });
}

export async function triggerDueTodoReminders(userId: string, options?: { taskId?: string }) {
  const now = await getNow();
  const where: Prisma.TodoTaskWhereInput = {
    userId,
    status: "PENDING",
    reminderEnabled: true,
    alertAt: { not: null, lte: now },
    alertTriggeredAt: null,
    ...(options?.taskId ? { id: options.taskId } : {}),
  };

  const dueTasks = await todoTaskDb.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      subtasks: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { alertAt: "asc" },
  });

  const policy = getNotificationPolicy("TODO_REMINDER");
  const triggered: TodoReminderToast[] = [];

  for (const task of dueTasks) {
    const link = `/todo?taskId=${task.id}`;
    const description = task.description?.trim();
    const firstPendingSubtask = task.subtasks.find((subtask) => !subtask.completed)?.label;
    const body = description
      ? description
      : firstPendingSubtask
        ? `Next checklist item: ${firstPendingSubtask}`
        : task.dueDate
          ? `Due on ${task.dueDate.toLocaleDateString("en-IN")}.`
          : "Your reminder is due now.";

    const result = await db.$transaction(async (tx) => {
      const transaction = tx as typeof tx & {
        todoTask: TodoTaskDelegate;
        todoSubtask: TodoSubtaskDelegate;
      };

      const locked = await transaction.todoTask.findFirst({
        where: {
          id: task.id,
          userId,
          alertTriggeredAt: null,
          status: "PENDING",
        },
        select: {
          id: true,
          orgId: true,
        },
      });

      if (!locked) return null;

      const notification = await tx.notification.create({
        data: {
          userId,
          orgId: locked.orgId,
          kind: "TODO_REMINDER",
          title: task.title,
          body,
          link,
          source: policy.source,
          variant: policy.variant,
          appearance: policy.appearance,
          priority: policy.priority,
          requiresAck: policy.requiresAck,
          presentedAt: now,
          lastSentAt: now,
          payload: {
            todoTaskId: task.id,
            alertAt: task.alertAt?.toISOString(),
          },
        },
      });

      await tx.notificationActivity.create({
        data: {
          notificationId: notification.id,
          orgId: locked.orgId,
          actorId: userId,
          event: "CREATED",
        },
      });

      await tx.notificationActivity.create({
        data: {
          notificationId: notification.id,
          orgId: locked.orgId,
          actorId: userId,
          event: "DISPLAYED",
        },
      });

      await transaction.todoTask.update({
        where: { id: task.id },
        data: {
          alertTriggeredAt: now,
          alertNotificationId: notification.id,
        },
      });

      return notification;
    });

    if (result) {
      triggered.push({
        id: result.id,
        taskId: task.id,
        title: task.title,
        body,
        link,
      });
    }
  }

  return triggered;
}
