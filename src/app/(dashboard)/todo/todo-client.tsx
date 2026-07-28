"use client";

import {
  Fragment,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  WorkspaceAction,
  WorkspaceBadge,
  WorkspaceCheckbox,
  WorkspaceDialog,
  WorkspaceEmptyState,
  WorkspaceField,
  WorkspaceInput,
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceProgress,
  WorkspaceSelect,
  WorkspaceTextarea,
} from "@/components/monolith";
import { useNotifications } from "@/components/notifications/notification-provider";

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

const FILTER_OPTIONS: { value: TodoFilter; label: string }[] = [
  { value: "ALL", label: "All tasks" },
  { value: "PENDING", label: "Pending tasks" },
  { value: "COMPLETED", label: "Completed tasks" },
  { value: "UPCOMING_ALERTS", label: "Upcoming alerts" },
];

function TodoHeaderGraphic() {
  return (
    <div className="mnx-todo-header-graphic" aria-hidden="true">
      <span />
      <span />
      <span />
      <i />
      <i />
      <b />
      <b />
    </div>
  );
}

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

function createEmptyDraft(): TodoDraft {
  return {
    title: "",
    description: "",
    dueDate: "",
    reminderEnabled: false,
    alertAt: "",
    status: "PENDING",
    subtasks: [createDraftSubtask()],
  };
}

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString("en-IN");
}

function formatDateTime(value: string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toDateInputValue(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function normalizeDraft(draft: TodoDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description,
    dueDate: draft.dueDate,
    reminderEnabled: draft.reminderEnabled,
    alertAt: draft.reminderEnabled ? draft.alertAt : "",
    status: draft.status,
    subtasks: draft.subtasks
      .map((subtask) => ({
        id: subtask.id,
        label: subtask.label.trim(),
        completed: subtask.completed,
      }))
      .filter((subtask) => subtask.label.length > 0),
  };
}

function validateDraft(draft: TodoDraft) {
  if (!draft.title.trim()) return "Task title is required.";

  if (draft.reminderEnabled) {
    if (!draft.alertAt) {
      return "Alert date and time is required when reminder is enabled.";
    }
    if (new Date(draft.alertAt).getTime() < Date.now()) {
      return "Alert date and time cannot be in the past.";
    }
  }

  const labels = draft.subtasks
    .map((subtask) => subtask.label.trim())
    .filter(Boolean);
  const uniqueLabels = new Set(labels.map((label) => label.toLowerCase()));
  if (labels.length !== uniqueLabels.size) {
    return "Checklist items must be unique.";
  }

  return null;
}

async function parseApiError(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return data?.error ?? "Something went wrong.";
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
  const [draft, setDraft] = useState<TodoDraft>(() => createEmptyDraft());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!highlightedTaskId) return;
    const task = initialTasks.find((entry) => entry.id === highlightedTaskId);
    if (!task) return;
    startTransition(() => beginEdit(task));
  }, [highlightedTaskId, initialTasks]);

  const filteredTasks = useMemo(() => {
    if (filter === "PENDING") {
      return tasks.filter((task) => task.status === "PENDING");
    }
    if (filter === "COMPLETED") {
      return tasks.filter((task) => task.status === "COMPLETED");
    }
    if (filter === "UPCOMING_ALERTS") {
      return tasks.filter(
        (task) =>
          task.status === "PENDING"
          && task.reminderEnabled
          && task.alertAt
          && new Date(task.alertAt).getTime() >= clockNow,
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
          task.status === "PENDING"
          && task.reminderEnabled
          && task.alertAt
          && new Date(task.alertAt).getTime() >= clockNow,
      ).length,
      checklistCompleted: checklistItems.filter((item) => item.completed).length,
      checklistTotal: checklistItems.length,
    };
  }, [clockNow, tasks]);

  function resetForm() {
    setDraft(createEmptyDraft());
    setEditingTaskId(null);
  }

  function openCreateTask() {
    resetForm();
    setIsTaskFormOpen(true);
  }

  function closeTaskForm() {
    resetForm();
    setIsTaskFormOpen(false);
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
      const subtasks = current.subtasks.filter(
        (subtask) => subtask.localId !== localId,
      );
      return {
        ...current,
        subtasks: subtasks.length > 0 ? subtasks : [createDraftSubtask()],
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
    const response = await fetch(
      editingTaskId ? `/api/todos/${editingTaskId}` : "/api/todos",
      {
        method: editingTaskId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeDraft(draft)),
      },
    );

    if (!response.ok) {
      error("Unable to save task", await parseApiError(response));
      setIsSaving(false);
      return;
    }

    const task = (await response.json()) as TodoTaskRow;
    setTasks((current) => {
      const next = editingTaskId
        ? current.map((entry) => (entry.id === task.id ? task : entry))
        : [task, ...current];
      return next.sort(
        (left, right) =>
          new Date(right.createdAt).getTime()
          - new Date(left.createdAt).getTime(),
      );
    });
    success(editingTaskId ? "Task updated" : "Task created");
    resetForm();
    setIsTaskFormOpen(false);
    setIsSaving(false);
  }

  async function updateStatus(taskId: string, status: TodoStatus) {
    const response = await fetch(`/api/todos/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "status", status }),
    });
    if (!response.ok) {
      error("Unable to update task", await parseApiError(response));
      return;
    }
    const updated = (await response.json()) as TodoTaskRow;
    setTasks((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
    success(status === "COMPLETED" ? "Task completed" : "Task moved to pending");
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    const response = await fetch(`/api/todos/subtasks/${subtaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (!response.ok) {
      error("Unable to update checklist item", await parseApiError(response));
      return;
    }
    const updated = (await response.json()) as TodoTaskRow;
    setTasks((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
    if (editingTaskId === updated.id) beginEdit(updated);
  }

  async function removeTask(taskId: string) {
    if (!window.confirm("Delete this task?")) return;
    const response = await fetch(`/api/todos/${taskId}`, { method: "DELETE" });
    if (!response.ok) {
      error("Unable to delete task", await parseApiError(response));
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
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Personal work queue"
        title="To-Do"
        graphic={<TodoHeaderGraphic />}
        description={`Plan follow-ups, reminders, and nested checklists for ${currentUserName}.`}
        actions={
          <WorkspaceAction onClick={openCreateTask}>
            <Plus size={15} aria-hidden="true" />
            Create task
          </WorkspaceAction>
        }
      />

      <section className="mnx-workspace-metrics" aria-label="Task summary">
        <WorkspaceMetric
          icon={<ListChecks size={17} aria-hidden="true" />}
          label="Total tasks"
          value={stats.total}
          detail="All personal tasks"
        />
        <WorkspaceMetric
          icon={<CalendarClock size={17} aria-hidden="true" />}
          label="Pending"
          value={stats.pending}
          detail="Still in progress"
        />
        <WorkspaceMetric
          icon={<CheckCircle2 size={17} aria-hidden="true" />}
          label="Completed"
          value={stats.completed}
          detail={`${stats.checklistCompleted}/${stats.checklistTotal} checklist items done`}
        />
        <WorkspaceMetric
          icon={<BellRing size={17} aria-hidden="true" />}
          label="Upcoming alerts"
          value={stats.upcomingAlerts}
          detail="Scheduled reminders ahead"
        />
      </section>

      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Task ledger"
          title="Your tasks"
          description="Expand a task to review its checklist, reminder, and actions."
          actions={
            <WorkspaceSelect
              aria-label="Task filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value as TodoFilter)}
            >
              {FILTER_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </WorkspaceSelect>
          }
        />

        {filteredTasks.length === 0 ? (
          <div className="mnx-panel-state">
            <WorkspaceEmptyState
              title="No tasks match this view"
              description="Change the filter or create a task to start your personal work queue."
            />
          </div>
        ) : (
          <div className="mnx-todo-list">
            {filteredTasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              const isHighlighted = highlightedTaskId === task.id;

              return (
                <Fragment key={task.id}>
                  <article
                    className={`mnx-todo-record${isHighlighted ? " is-highlighted" : ""}`}
                  >
                    <button
                      type="button"
                      className="mnx-todo-summary"
                      onClick={() =>
                        setExpandedTaskId(isExpanded ? null : task.id)
                      }
                      aria-expanded={isExpanded}
                    >
                      <span className="mnx-todo-check">
                        {task.status === "COMPLETED" ? (
                          <CheckCircle2 size={18} aria-hidden="true" />
                        ) : (
                          <ListChecks size={18} aria-hidden="true" />
                        )}
                      </span>
                      <span className="mnx-todo-primary">
                        <b>{task.title}</b>
                        <small>
                          Updated {formatDateTime(task.updatedAt)}
                        </small>
                      </span>
                      <span className="mnx-todo-progress">
                        <b>
                          {task.progress.total > 0
                            ? `${task.progress.completed}/${task.progress.total}`
                            : "No checklist"}
                        </b>
                        <WorkspaceProgress
                          label={`${task.title} checklist progress`}
                          value={task.progress.percent}
                        />
                      </span>
                      <span className="mnx-todo-date">
                        <CalendarClock size={13} aria-hidden="true" />
                        {formatDate(task.dueDate)}
                      </span>
                      <WorkspaceBadge
                        variant={task.status === "COMPLETED" ? "success" : "warning"}
                      >
                        {task.status === "COMPLETED" ? "Completed" : "Pending"}
                      </WorkspaceBadge>
                      <ChevronDown
                        size={16}
                        className={isExpanded ? "is-open" : ""}
                        aria-hidden="true"
                      />
                    </button>

                    {isExpanded ? (
                      <div className="mnx-todo-detail">
                        <p>{task.description || "No description added."}</p>
                        <div className="mnx-chip-row">
                          {task.reminderEnabled ? (
                            <WorkspaceBadge variant="accent">Reminder on</WorkspaceBadge>
                          ) : null}
                          {task.alertTriggeredAt ? (
                            <WorkspaceBadge variant="success">Alert sent</WorkspaceBadge>
                          ) : null}
                          <WorkspaceBadge variant="neutral">
                            {formatDateTime(task.alertAt)}
                          </WorkspaceBadge>
                        </div>

                        {task.subtasks.length > 0 ? (
                          <div className="mnx-checklist">
                            {task.subtasks.map((subtask) => (
                              <div className="mnx-checklist-item" key={subtask.id}>
                                <WorkspaceCheckbox
                                  checked={subtask.completed}
                                  onChange={(event) =>
                                    void toggleSubtask(
                                      subtask.id,
                                      event.target.checked,
                                    )
                                  }
                                  label={
                                    <span className={subtask.completed ? "is-complete" : ""}>
                                      {subtask.label}
                                    </span>
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p>No checklist added.</p>
                        )}

                        <div className="mnx-record-actions">
                          <WorkspaceAction
                            size="compact"
                            variant="secondary"
                            onClick={() => beginEdit(task)}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Edit
                          </WorkspaceAction>
                          <WorkspaceAction
                            size="compact"
                            variant="secondary"
                            onClick={() =>
                              void updateStatus(
                                task.id,
                                task.status === "COMPLETED"
                                  ? "PENDING"
                                  : "COMPLETED",
                              )
                            }
                          >
                            {task.status === "COMPLETED" ? "Reopen" : "Complete"}
                          </WorkspaceAction>
                          <WorkspaceAction
                            size="compact"
                            variant="destructive"
                            onClick={() => void removeTask(task.id)}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            Delete
                          </WorkspaceAction>
                        </div>
                      </div>
                    ) : null}
                  </article>
                </Fragment>
              );
            })}
          </div>
        )}
      </WorkspacePanel>

      <WorkspaceDialog
        open={isTaskFormOpen}
        onClose={closeTaskForm}
        eyebrow={editingTaskId ? "Update task" : "New task"}
        title={editingTaskId ? "Edit task" : "Create task"}
        description="Build a standard task or a checklist with an optional scheduled reminder."
        footer={
          <>
            <WorkspaceAction
              variant="secondary"
              onClick={closeTaskForm}
              disabled={isSaving}
            >
              Cancel
            </WorkspaceAction>
            <WorkspaceAction onClick={() => void saveTask()} disabled={isSaving}>
              {isSaving
                ? "Saving…"
                : editingTaskId
                  ? "Save changes"
                  : "Create task"}
            </WorkspaceAction>
          </>
        }
      >
        <div className="mnx-stack">
          <WorkspaceField label="Task title" htmlFor="task-title" required>
            <WorkspaceInput
              id="task-title"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Create a new task"
            />
          </WorkspaceField>

          <WorkspaceField label="Notes" htmlFor="task-description">
            <WorkspaceTextarea
              id="task-description"
              rows={4}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Add details, context, or links"
            />
          </WorkspaceField>

          <div className="mnx-form-grid">
            <WorkspaceField label="Due date" htmlFor="task-due-date">
              <WorkspaceInput
                id="task-due-date"
                type="date"
                value={draft.dueDate}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
              />
            </WorkspaceField>
            <WorkspaceField label="Status" htmlFor="task-status">
              <WorkspaceSelect
                id="task-status"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as TodoStatus,
                  }))
                }
              >
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </WorkspaceSelect>
            </WorkspaceField>
          </div>

          <section className="mnx-form-section">
            <div className="mnx-form-section-header">
              <div>
                <h3>Checklist</h3>
                <p>Add smaller steps and track each one independently.</p>
              </div>
              <WorkspaceAction
                size="compact"
                variant="secondary"
                onClick={addDraftSubtask}
              >
                <Plus size={14} aria-hidden="true" />
                Add item
              </WorkspaceAction>
            </div>
            <div className="mnx-stack">
              {draft.subtasks.map((subtask, index) => (
                <div className="mnx-draft-checklist-item" key={subtask.localId}>
                  <WorkspaceCheckbox
                    checked={subtask.completed}
                    onChange={(event) =>
                      updateDraftSubtask(subtask.localId, {
                        completed: event.target.checked,
                      })
                    }
                  />
                  <WorkspaceInput
                    value={subtask.label}
                    onChange={(event) =>
                      updateDraftSubtask(subtask.localId, {
                        label: event.target.value,
                      })
                    }
                    placeholder={`Checklist item ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="mnx-draft-remove"
                    onClick={() => removeDraftSubtask(subtask.localId)}
                    aria-label={`Remove checklist item ${index + 1}`}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="mnx-form-section">
            <WorkspaceCheckbox
              checked={draft.reminderEnabled}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  reminderEnabled: event.target.checked,
                  alertAt: event.target.checked ? current.alertAt : "",
                }))
              }
              label="Enable reminder"
            />
            <WorkspaceField
              label="Alert date and time"
              htmlFor="task-alert-at"
              hint="Reminders are stored and shown once when triggered."
              required={draft.reminderEnabled}
            >
              <WorkspaceInput
                id="task-alert-at"
                type="datetime-local"
                value={draft.alertAt}
                disabled={!draft.reminderEnabled}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    alertAt: event.target.value,
                  }))
                }
              />
            </WorkspaceField>
          </section>
        </div>
      </WorkspaceDialog>
    </WorkspacePage>
  );
}
