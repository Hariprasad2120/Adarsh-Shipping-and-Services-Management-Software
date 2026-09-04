"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
  PeopleControlTextarea as MnxTextarea,
} from "@/modules/people/components";

import { WorkspaceDialog } from "@/components/layout/workspace-dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { DateInput } from "@/components/ui/date-input";
import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Loader2,
  Calendar,
  User,
  CheckCircle,
} from "lucide-react";
import { toast } from "@/modules/notifications/client";

export function TasksView() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [colleagues, setColleagues] = useState<any[]>([]);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/tasks");
      const json = await res.json();
      if (json.ok) {
        setTasks(json.data);
      }

      const colRes = await fetch("/api/hrms/employees");
      const colJson = await colRes.json();
      if (colJson.ok) {
        setColleagues(colJson.data);
        if (colJson.data.length > 0) setAssigneeId(colJson.data[0].id);
      }
    } catch (e) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/hrms/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title,
          description,
          dueDate,
          assigneeId,
          priority,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Task created and assigned successfully!");
        setTitle("");
        setDescription("");
        setDueDate("");
        setShowForm(false);
        fetchTasks();
      }
    } catch (err) {
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "PENDING" ? "COMPLETED" : "PENDING";
    try {
      const res = await fetch("/api/hrms/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle",
          taskId,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
        );
        toast.success(
          nextStatus === "COMPLETED"
            ? "Task completed!"
            : "Task marked pending",
        );
      }
    } catch (e) {
      toast.error("Failed to update task status");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--mnx-muted)]">
        <Loader2 className="size-8 animate-spin text-[var(--mnx-accent)]" />
        <p className="text-xs font-semibold tracking-wider">
          Syncing task checklist...
        </p>
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--mnx-border)] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-[var(--frappe-radius-md)] border border-[var(--mnx-border)] bg-[var(--mnx-bg-subtle)] text-[var(--mnx-accent)]">
              <CheckSquare className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mnx-accent)]">
                Assignment board
              </p>
              <p className="mt-1 text-sm text-[var(--mnx-text-muted)]">
                Create tasks, assign owners, and monitor pending versus completed checklist work.
              </p>
            </div>
          </div>

          <MnxAction
            type="button"
            onClick={() => setShowForm(true)}
            variant="primary"
          >
            <Plus className="size-4" />
            <span>Create Task</span>
          </MnxAction>
        </div>
      </div>

      <WorkspaceDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        eyebrow="Checklist task"
        title="Create Checklist Task"
        description="Add a new checklist item, assign the owner, and set the delivery expectation."
        size="wide"
      >
        <form
          onSubmit={handleCreateTask}
          className="space-y-5"
        >
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--mnx-text-muted)]">
              Task Title
            </label>
            <MnxInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Verify custom clearing clearance sheet"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--mnx-text-muted)]">
              Task Description
            </label>
            <MnxTextarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context and notes regarding checklist requirements."
              className="resize-none"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--mnx-text-muted)]">
                Assignee
              </label>
              <NativeSelect
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full"
              >
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--mnx-text-muted)]">
                Due Date
              </label>
              <DateInput
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--mnx-text-muted)]">
                Priority
              </label>
              <NativeSelect
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </NativeSelect>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--mnx-border)] pt-4">
            <MnxAction
              type="button"
              onClick={() => setShowForm(false)}
              variant="secondary"
            >
              Cancel
            </MnxAction>
            <MnxAction
              type="submit"
              disabled={submitting}
              variant="primary"
            >
              {submitting ? "Saving..." : "Create Task"}
            </MnxAction>
          </div>
        </form>
      </WorkspaceDialog>

      {/* Task Checklist grids */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending tasks */}
        <div className="space-y-3">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
            Pending Tasks ({pendingTasks.length})
          </div>
          {pendingTasks.length === 0 ? (
            <div className="border border-dashed border-[var(--mnx-border)] px-4 py-10 text-center text-sm text-[var(--mnx-text-muted)]">
              All tasks cleared!
            </div>
          ) : (
            <div className="border border-[var(--mnx-border)] bg-[var(--mnx-surface)]">
              {pendingTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 border-b border-[var(--mnx-border)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--mnx-bg-subtle)]"
                >
                  <MnxAction
                    type="button"
                    onClick={() => handleToggleTask(t.id, t.status)}
                    variant="secondary"
                    className="mt-0.5 h-auto min-h-0 border-0 px-0 py-0 text-[var(--mnx-accent)] hover:bg-transparent"
                  >
                    <Square className="size-4.5" />
                  </MnxAction>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div>
                      <p className="truncate text-sm font-medium leading-tight text-[var(--mnx-text)]">
                        {t.title}
                      </p>
                      {t.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-normal text-[var(--mnx-text-muted)]">
                          {t.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--mnx-border)] pt-2 text-xs text-[var(--mnx-text-muted)]">
                      <span className="flex items-center gap-1">
                        <User className="size-3 text-[var(--mnx-text-soft)]" />
                        <span>Assignee: {t.assignee.name}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-[var(--mnx-text-soft)]" />
                        <span>
                          Due: {new Date(t.dueDate).toLocaleDateString()}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed tasks */}
        <div className="space-y-3">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
            Completed Tasks ({completedTasks.length})
          </div>
          {completedTasks.length === 0 ? (
            <div className="border border-dashed border-[var(--mnx-border)] px-4 py-10 text-center text-sm text-[var(--mnx-text-muted)]">
              No completed tasks found in log.
            </div>
          ) : (
            <div className="border border-[var(--mnx-border)] bg-[var(--mnx-surface)]">
              {completedTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 border-b border-[var(--mnx-border)] px-4 py-4 opacity-75 transition-colors last:border-b-0 hover:bg-[var(--mnx-bg-subtle)]"
                >
                  <MnxAction
                    type="button"
                    onClick={() => handleToggleTask(t.id, t.status)}
                    variant="secondary"
                    className="mt-0.5 h-auto min-h-0 border-0 px-0 py-0 text-[var(--mnx-success)] hover:bg-transparent"
                  >
                    <CheckCircle className="size-4.5" />
                  </MnxAction>

                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="truncate text-sm font-medium leading-tight text-[var(--mnx-text-muted)] line-through">
                      {t.title}
                    </p>
                    <p className="text-xs text-[var(--mnx-text-muted)]">
                      Assigned to: {t.assignee.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
