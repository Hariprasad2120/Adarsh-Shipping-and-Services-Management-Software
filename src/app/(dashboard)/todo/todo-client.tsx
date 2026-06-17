"use client";

import { Fragment, startTransition, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-table";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Button } from "@/components/ui/button-1";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TodoStatus = "PENDING" | "COMPLETED";
type TodoFilter = "ALL" | "PENDING" | "COMPLETED" | "UPCOMING_ALERTS";

type TodoSubtaskRow = {
  id: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
  order: number;
};

type TodoTaskRow = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  reminderEnabled: boolean;
  alertAt: string | null;
  status: TodoStatus;
  completedAt: string | null;
  alertTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  subtasks: TodoSubtaskRow[];
  progress: {
    total: number;
    completed: number;
    pending: number;
    percent: number;
  };
};

type TodoDraftSubtask = {
  localId: string;
  id?: string;
  label: string;
  completed: boolean;
};

type TodoDraft = {
  title: string;
  description: string;
  dueDate: string;
  reminderEnabled: boolean;
  alertAt: string;
  status: TodoStatus;
  subtasks: TodoDraftSubtask[];
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
] as const;

const FILTER_OPTIONS = [
  { value: "ALL", label: "All tasks" },
  { value: "PENDING", label: "Pending tasks" },
  { value: "COMPLETED", label: "Completed tasks" },
  { value: "UPCOMING_ALERTS", label: "Upcoming alerts" },
] as const;

const todoFieldClassName =
  "border-[#00cec4]/55 hover:border-[#00cec4]/85 hover:shadow-[0_4px_12px_rgba(0,206,196,0.08)] focus:border-[#00cec4] focus:ring-[#00cec4]/15";

function createDraftSubtask(
  partial?: Partial<TodoDraftSubtask>,
): TodoDraftSubtask {
  return {
    localId: crypto.randomUUID(),
    label: "",
    completed: false,
    ...partial,
  };
}

const EMPTY_DRAFT: TodoDraft = {
  title: "",
  description: "",
  dueDate: "",
  reminderEnabled: false,
  alertAt: "",
  status: "PENDING",
  subtasks: [createDraftSubtask()],
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function getTaskStatusTone(status: TodoStatus) {
  if (status === "COMPLETED")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function normalizeDraft(draft: TodoDraft) {
  const subtasks = draft.subtasks
    .map((subtask) => ({
      id: subtask.id,
      label: subtask.label.trim(),
      completed: subtask.completed,
    }))
    .filter((subtask) => subtask.label.length > 0);

  return {
    title: draft.title.trim(),
    description: draft.description,
    dueDate: draft.dueDate,
    reminderEnabled: draft.reminderEnabled,
    alertAt: draft.reminderEnabled ? draft.alertAt : "",
    status: draft.status,
    subtasks,
  };
}

function validateDraft(draft: TodoDraft) {
  if (!draft.title.trim()) return "Task title is required.";

  if (draft.reminderEnabled) {
    if (!draft.alertAt)
      return "Alert date and time is required when reminder is enabled.";

    if (new Date(draft.alertAt).getTime() < Date.now()) {
      return "Alert date and time cannot be in the past.";
    }
  }

  const labels = draft.subtasks
    .map((subtask) => subtask.label.trim())
    .filter(Boolean);

  if (
    labels.length !== new Set(labels.map((label) => label.toLowerCase())).size
  ) {
    return "Checklist items must be unique.";
  }

  return null;
}

async function parseApiError(res: Response) {
  const data = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? "Something went wrong.";
}

function StatsCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article
      className="group rounded-[24px] border border-outline-variant/35 bg-surface p-5 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-22px_rgba(15,23,42,0.28)]"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00cec4]/10 transition duration-300 group-hover:scale-105 group-hover:bg-[#00cec4]/16">
          {icon}
        </div>

        <span className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant transition duration-300 group-hover:text-on-surface">
          Live
        </span>
      </div>

      <p className="mt-6 text-[2.2rem] font-extralight leading-none tracking-[-0.04em] text-on-surface transition duration-300 group-hover:text-[#008f88]">
        {value}
      </p>

      <p className="mt-1.5 text-sm text-on-surface-variant transition duration-300 group-hover:text-on-surface">
        {label}
      </p>
    </article>
  );
}

export function TodoClient({
  currentUserName,
  highlightedTaskId,
  initialTasks,
}: {
  currentUserName: string;
  highlightedTaskId?: string;
  initialTasks: TodoTaskRow[];
}) {
  const { success, error } = useNotifications();

  const [tasks, setTasks] = useState<TodoTaskRow[]>(initialTasks);
  const [filter, setFilter] = useState<TodoFilter>("ALL");
  const [draft, setDraft] = useState<TodoDraft>(EMPTY_DRAFT);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!highlightedTaskId) return;

    const task = initialTasks.find((entry) => entry.id === highlightedTaskId);
    if (!task) return;

    startTransition(() => {
      beginEdit(task);
    });
  }, [highlightedTaskId, initialTasks]);

  const filteredTasks = useMemo(() => {
    if (filter === "PENDING")
      return tasks.filter((task) => task.status === "PENDING");

    if (filter === "COMPLETED")
      return tasks.filter((task) => task.status === "COMPLETED");

    if (filter === "UPCOMING_ALERTS") {
      return tasks.filter(
        (task) =>
          task.status === "PENDING" &&
          task.reminderEnabled &&
          task.alertAt &&
          new Date(task.alertAt).getTime() >= clockNow,
      );
    }

    return tasks;
  }, [clockNow, filter, tasks]);

  const stats = useMemo(() => {
    const checklistItems = tasks.flatMap((task) => task.subtasks);

    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "PENDING").length,
      completed: tasks.filter((task) => task.status === "COMPLETED").length,
      upcomingAlerts: tasks.filter(
        (task) =>
          task.status === "PENDING" &&
          task.reminderEnabled &&
          task.alertAt &&
          new Date(task.alertAt).getTime() >= clockNow,
      ).length,
      checklistCompleted: checklistItems.filter((item) => item.completed)
        .length,
    };
  }, [clockNow, tasks]);

  function openCreateTask() {
    resetForm();
    setIsTaskFormOpen(true);
  }

  function closeTaskForm() {
    resetForm();
    setIsTaskFormOpen(false);
  }

  function resetForm() {
    setDraft({
      ...EMPTY_DRAFT,
      subtasks: [createDraftSubtask()],
    });
    setEditingTaskId(null);
  }

  function beginEdit(task: TodoTaskRow) {
    setEditingTaskId(task.id);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      dueDate: toDateInputValue(task.dueDate),
      reminderEnabled: task.reminderEnabled,
      alertAt: toDateTimeLocalValue(task.alertAt),
      status: task.status,
      subtasks:
        task.subtasks.length > 0
          ? task.subtasks.map((subtask) =>
              createDraftSubtask({
                id: subtask.id,
                label: subtask.label,
                completed: subtask.completed,
              }),
            )
          : [createDraftSubtask()],
    });
    setIsTaskFormOpen(true);
  }

  function updateDraftSubtask(
    localId: string,
    patch: Partial<TodoDraftSubtask>,
  ) {
    setDraft((current) => ({
      ...current,
      subtasks: current.subtasks.map((subtask) =>
        subtask.localId === localId ? { ...subtask, ...patch } : subtask,
      ),
    }));
  }

  function addDraftSubtask() {
    setDraft((current) => ({
      ...current,
      subtasks: [...current.subtasks, createDraftSubtask()],
    }));
  }

  function removeDraftSubtask(localId: string) {
    setDraft((current) => {
      const nextSubtasks = current.subtasks.filter(
        (subtask) => subtask.localId !== localId,
      );

      return {
        ...current,
        subtasks:
          nextSubtasks.length > 0 ? nextSubtasks : [createDraftSubtask()],
      };
    });
  }

  async function saveTask() {
    const validationMessage = validateDraft(draft);

    if (validationMessage) {
      error("Validation failed", validationMessage);
      return;
    }

    setIsSaving(true);

    const payload = normalizeDraft(draft);

    const res = await fetch(
      editingTaskId ? `/api/todos/${editingTaskId}` : "/api/todos",
      {
        method: editingTaskId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      error("Unable to save task", await parseApiError(res));
      setIsSaving(false);
      return;
    }

    const task = (await res.json()) as TodoTaskRow;

    setTasks((current) => {
      const next = editingTaskId
        ? current.map((entry) => (entry.id === task.id ? task : entry))
        : [task, ...current];

      return next.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
    });

    success(editingTaskId ? "Task updated" : "Task created");
    resetForm();
    setIsTaskFormOpen(false);
    setIsSaving(false);
  }

  async function updateStatus(taskId: string, status: TodoStatus) {
    const res = await fetch(`/api/todos/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "status", status }),
    });

    if (!res.ok) {
      error("Unable to update task", await parseApiError(res));
      return;
    }

    const updated = (await res.json()) as TodoTaskRow;

    setTasks((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );

    success(
      status === "COMPLETED" ? "Task completed" : "Task moved to pending",
    );
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    const res = await fetch(`/api/todos/subtasks/${subtaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });

    if (!res.ok) {
      error("Unable to update checklist item", await parseApiError(res));
      return;
    }

    const updated = (await res.json()) as TodoTaskRow;

    setTasks((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );

    if (editingTaskId === updated.id) {
      beginEdit(updated);
    }
  }

  async function removeTask(taskId: string) {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;

    const res = await fetch(`/api/todos/${taskId}`, { method: "DELETE" });

    if (!res.ok) {
      error("Unable to delete task", await parseApiError(res));
      return;
    }

    setTasks((current) => current.filter((entry) => entry.id !== taskId));

    if (editingTaskId === taskId) {
      resetForm();
      setIsTaskFormOpen(false);
    }

    success("Task deleted");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={openCreateTask}
          className="border-0 bg-cyan-500 text-white shadow-[0_14px_28px_-18px_rgba(6,182,212,0.55)] hover:bg-cyan-600"
        >
          <Plus className="mr-1 size-4" />
          Create task
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={
            <CheckCircle2 className="size-5 text-[#00cec4]" strokeWidth={1.9} />
          }
          label="Total tasks"
          value={stats.total}
        />
        <StatsCard
          icon={<Plus className="size-5 text-amber-600" strokeWidth={1.9} />}
          label="Pending"
          value={stats.pending}
        />
        <StatsCard
          icon={
            <CheckCircle2
              className="size-5 text-emerald-600"
              strokeWidth={1.9}
            />
          }
          label="Completed"
          value={stats.completed}
        />
        <StatsCard
          icon={
            <ListChecks className="size-5 text-sky-600" strokeWidth={1.9} />
          }
          label="Checklist done"
          value={stats.checklistCompleted}
        />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-outline-variant/40 bg-surface shadow-sm">
        <div className="space-y-4 border-b border-outline-variant/30 px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-on-surface">Your tasks</p>
              <p className="text-xs text-on-surface-variant">
                Build normal tasks, nested checklists, and quick checkbox-style
                follow-ups.
              </p>
            </div>

            <div className="w-full max-w-[260px]">
              <DropdownSelect
                ariaLabel="Task filter"
                onValueChange={(value) => setFilter(value as TodoFilter)}
                options={[...FILTER_OPTIONS]}
                value={filter}
              />
            </div>
          </div>
        </div>

        <DataTable className="rounded-none border-0 shadow-none">
          <DataTableHeader>
            <tr>
              <DataTableHead>Task</DataTableHead>
              <DataTableHead>Progress</DataTableHead>
              <DataTableHead>Due date</DataTableHead>
              <DataTableHead>Alert</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Updated</DataTableHead>
              <DataTableHead className="text-right">Actions</DataTableHead>
            </tr>
          </DataTableHeader>

          <DataTableBody>
            {filteredTasks.length === 0 ? (
              <DataTableEmpty
                colSpan={7}
                message="No tasks match the current filter."
              />
            ) : (
              filteredTasks.map((task) => {
                const isHighlighted = highlightedTaskId === task.id;
                const isExpanded = expandedTaskId === task.id;

                return (
                  <Fragment key={task.id}>
                    <DataTableRow
                      onClick={() =>
                        setExpandedTaskId(isExpanded ? null : task.id)
                      }
                      className={`cursor-pointer transition-colors hover:bg-surface-container-low ${
                        isHighlighted ? "bg-[#00cec4]/6" : ""
                      }`}
                    >
                      <DataTableCell className="min-w-[260px] align-middle">
                        <p className="truncate font-medium text-on-surface">
                          {task.title}
                        </p>
                      </DataTableCell>

                      <DataTableCell className="align-middle">
                        {task.progress.total > 0 ? (
                          <div className="min-w-[130px] space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-on-surface">
                                {task.progress.completed}/{task.progress.total}
                              </span>
                              <span className="text-on-surface-variant">
                                {task.progress.percent}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                              <div
                                className="h-full rounded-full bg-[#00cec4] transition-[width]"
                                style={{ width: `${task.progress.percent}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-on-surface-variant">
                            No checklist
                          </span>
                        )}
                      </DataTableCell>

                      <DataTableCell className="whitespace-nowrap align-middle">
                        {formatDate(task.dueDate)}
                      </DataTableCell>

                      <DataTableCell className="whitespace-nowrap align-middle">
                        <div className="inline-flex items-center gap-2 text-sm text-on-surface">
                          <CalendarClock className="size-4 text-on-surface-variant" />
                          {formatDateTime(task.alertAt)}
                        </div>
                      </DataTableCell>

                      <DataTableCell className="align-middle">
                        <Badge
                          className={`border ${getTaskStatusTone(task.status)}`}
                        >
                          {task.status === "COMPLETED"
                            ? "Completed"
                            : "Pending"}
                        </Badge>
                      </DataTableCell>

                      <DataTableCell className="whitespace-nowrap align-middle">
                        {formatDateTime(task.updatedAt)}
                      </DataTableCell>

                      <DataTableCell className="text-right align-middle">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedTaskId(isExpanded ? null : task.id);
                          }}
                          className="inline-flex text-outline-variant transition-colors hover:text-[#00b5ad]"
                          aria-label={`Expand task ${task.title}`}
                        >
                          <ChevronRight
                            className={`size-4 transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                      </DataTableCell>
                    </DataTableRow>

                    {isExpanded ? (
                      <DataTableRow
                        className={isHighlighted ? "bg-[#00cec4]/6" : undefined}
                      >
                        <DataTableCell
                          colSpan={7}
                          className="bg-surface-container-low/30 px-6 py-5"
                        >
                          <div className="space-y-4">
                            {task.description ? (
                              <p className="max-w-3xl text-sm text-on-surface-variant">
                                {task.description}
                              </p>
                            ) : (
                              <p className="text-sm text-on-surface-variant">
                                No description added.
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {task.reminderEnabled ? (
                                <Badge className="border border-sky-200 bg-sky-50 text-sky-700">
                                  Reminder on
                                </Badge>
                              ) : null}

                              {task.alertTriggeredAt ? (
                                <Badge className="border border-violet-200 bg-violet-50 text-violet-700">
                                  Alert sent
                                </Badge>
                              ) : null}

                              {task.subtasks.length > 0 ? (
                                <Badge className="border border-[#00cec4]/25 bg-[#00cec4]/10 text-[#008f88]">
                                  {task.subtasks.length} items
                                </Badge>
                              ) : null}
                            </div>

                            {task.subtasks.length > 0 ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                {task.subtasks.map((subtask) => (
                                  <label
                                    key={subtask.id}
                                    onClick={(event) => event.stopPropagation()}
                                    className="flex items-center gap-3 rounded-xl border border-outline-variant/25 bg-surface px-3 py-2 text-sm text-on-surface"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={subtask.completed}
                                      onChange={(event) =>
                                        void toggleSubtask(
                                          subtask.id,
                                          event.target.checked,
                                        )
                                      }
                                      className="h-4 w-4 rounded border-outline-variant text-[#00cec4] focus:ring-[#00cec4]"
                                    />

                                    <span
                                      className={
                                        subtask.completed
                                          ? "text-on-surface-variant line-through"
                                          : ""
                                      }
                                    >
                                      {subtask.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-on-surface-variant">
                                No checklist added.
                              </p>
                            )}

                            <div
                              onClick={(event) => event.stopPropagation()}
                              className="flex flex-wrap gap-2 pt-2"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => beginEdit(task)}
                              >
                                <Pencil className="mr-1 size-3.5" />
                                Edit
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void updateStatus(
                                    task.id,
                                    task.status === "COMPLETED"
                                      ? "PENDING"
                                      : "COMPLETED",
                                  )
                                }
                              >
                                {task.status === "COMPLETED"
                                  ? "Reopen"
                                  : "Complete"}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void removeTask(task.id)}
                              >
                                <Trash2 className="mr-1 size-3.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </div>

      {isTaskFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border-outline-variant/40 bg-surface shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-outline-variant/30">
              <div>
                <CardTitle>
                  {editingTaskId ? "Edit Task" : "Create Task"}
                </CardTitle>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Build standard tasks or checklist-style to-dos with subtasks
                  and reminders.
                </p>
              </div>

              <button
                type="button"
                onClick={closeTaskForm}
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
                aria-label="Close task form"
              >
                <X className="size-5" />
              </button>
            </CardHeader>

            <CardContent className="max-h-[calc(90vh-96px)] space-y-4 overflow-y-auto p-6">
              <div className="space-y-2">
                <Label htmlFor="task-title">Task title</Label>
                <Input
                  id="task-title"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Create a new task"
                  className={todoFieldClassName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Notes</Label>
                <textarea
                  id="task-description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Add details, context, or links"
                  rows={4}
                  className="w-full resize-none overflow-y-auto rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-3 text-sm text-on-surface shadow-sm outline-none transition hover:border-[#00cec4]/85 hover:shadow-[0_4px_12px_rgba(0,206,196,0.08)] focus:border-[#00cec4] focus:ring-2 focus:ring-[#00cec4]/15"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="task-due-date">Due date</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={draft.dueDate}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                    className={todoFieldClassName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-status">Status</Label>
                  <DropdownSelect
                    ariaLabel="Task status"
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        status: value as TodoStatus,
                      }))
                    }
                    options={[...STATUS_OPTIONS]}
                    triggerClassName={todoFieldClassName}
                    value={draft.status}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-[22px] border border-outline-variant/35 bg-surface-container-low/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      Checklist
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Add subtasks and track them with checkboxes.
                    </p>
                  </div>

                  <Button size="sm" variant="outline" onClick={addDraftSubtask}>
                    <Plus className="mr-1 size-3.5" />
                    Add item
                  </Button>
                </div>

                <div className="space-y-2">
                  {draft.subtasks.map((subtask, index) => (
                    <div
                      key={subtask.localId}
                      className="flex items-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface px-3 py-2.5"
                    >
                      <input
                        checked={subtask.completed}
                        className="h-4 w-4 rounded border-outline-variant text-[#00cec4] focus:ring-[#00cec4]"
                        onChange={(event) =>
                          updateDraftSubtask(subtask.localId, {
                            completed: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />

                      <Input
                        value={subtask.label}
                        onChange={(event) =>
                          updateDraftSubtask(subtask.localId, {
                            label: event.target.value,
                          })
                        }
                        placeholder={`Checklist item ${index + 1}`}
                        className={`${todoFieldClassName} h-10 border-0 shadow-none hover:shadow-none focus:ring-0`}
                      />

                      <button
                        type="button"
                        onClick={() => removeDraftSubtask(subtask.localId)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Remove checklist item ${index + 1}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-outline-variant/35 bg-surface-container-low/70 px-4 py-3 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={draft.reminderEnabled}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      reminderEnabled: event.target.checked,
                      alertAt: event.target.checked ? current.alertAt : "",
                    }))
                  }
                  className="h-4 w-4 rounded border-outline-variant text-[#00cec4] focus:ring-[#00cec4]"
                />
                Enable reminder
              </label>

              <div className="space-y-2">
                <Label htmlFor="task-alert-at">Alert date and time</Label>
                <Input
                  id="task-alert-at"
                  type="datetime-local"
                  value={draft.alertAt}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      alertAt: event.target.value,
                    }))
                  }
                  disabled={!draft.reminderEnabled}
                  className={todoFieldClassName}
                />
                <p className="text-xs text-on-surface-variant">
                  Reminders are stored in the database and shown once when
                  triggered.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/30 pt-4">
                <Button
                  variant="outline"
                  onClick={closeTaskForm}
                  disabled={isSaving}
                >
                  Cancel
                </Button>

                <Button
                  onClick={() => void saveTask()}
                  disabled={isSaving}
                  className="border-0 bg-[#00cec4] text-white shadow-[0_14px_28px_-18px_rgba(0,174,198,0.45)] hover:bg-[#00b8af]"
                >
                  {editingTaskId ? "Save changes" : "Create task"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
