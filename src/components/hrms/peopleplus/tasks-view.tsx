"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare, Square, Plus, Save, Loader2, Calendar, User, Trash, CheckCircle } from "lucide-react";
import { toast } from "sonner";

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
      const res = await fetch("/api/hrms/peopleplus/tasks");
      const json = await res.json();
      if (json.ok) {
        setTasks(json.data);
      }

      const colRes = await fetch("/api/hrms/peopleplus/employees");
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
      const res = await fetch("/api/hrms/peopleplus/tasks", {
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
      const res = await fetch("/api/hrms/peopleplus/tasks", {
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
          prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
        );
        toast.success(nextStatus === "COMPLETED" ? "Task completed!" : "Task marked pending");
      }
    } catch (e) {
      toast.error("Failed to update task status");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-[#00c4b6]" />
        <p className="text-xs font-semibold tracking-wider">Syncing task checklist...</p>
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-3xl border border-slate-800 bg-[#0f121b]/85 p-6 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c4b6]/5 rounded-full blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-[#00c4b6]/10 border border-[#00c4b6]/35 flex items-center justify-center text-[#00c4b6] shadow-sm">
              <CheckSquare className="size-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-100 uppercase tracking-widest">TASK CHECKLISTS</h1>
              <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Assign work checklist tasks and coordinate delivery schedules</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center gap-2 bg-[#00c4b6]/15 hover:bg-[#00c4b6]/25 border border-[#00c4b6]/35 rounded-2xl px-4 py-2 text-xs font-black text-[#00c4b6] cursor-pointer transition-all uppercase tracking-wider"
          >
            <Plus className="size-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Task Creation Form */}
      {showForm && (
        <form onSubmit={handleCreateTask} className="rounded-3xl border border-slate-900 bg-[#0e121b]/80 p-5 space-y-4 shadow-xl max-w-xl">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Create Checklist Task</h3>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Verify custom clearing clearance sheet"
              className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Task Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context and notes regarding checklist requirements."
              className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6] resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-250 outline-none focus:border-[#00c4b6]"
              >
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-250 outline-none focus:border-[#00c4b6]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 bg-transparent hover:bg-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-[#00c4b6] border-0 rounded-xl text-xs font-black text-slate-950 cursor-pointer transition-all disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Create Task"}
            </button>
          </div>
        </form>
      )}

      {/* Task Checklist grids */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending tasks */}
        <div className="space-y-3">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Pending Tasks ({pendingTasks.length})
          </div>
          {pendingTasks.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-600 font-bold border border-dashed border-slate-900 rounded-3xl">
              All tasks cleared!
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-900 bg-[#0e121b]/40 p-4 flex items-start gap-3 transition hover:border-slate-850 backdrop-blur-sm"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(t.id, t.status)}
                    className="mt-0.5 text-[#00c4b6] hover:scale-105 transition bg-transparent border-0 cursor-pointer p-0"
                  >
                    <Square className="size-4.5" />
                  </button>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div>
                      <p className="text-xs font-black text-slate-200 uppercase tracking-wide leading-tight truncate">
                        {t.title}
                      </p>
                      {t.description && (
                        <p className="text-[10.5px] font-bold text-slate-500 mt-1 leading-normal line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-[9px] font-bold text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <User className="size-3 text-slate-500" />
                        <span>Assignee: {t.assignee.name}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-slate-500" />
                        <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
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
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Completed Tasks ({completedTasks.length})
          </div>
          {completedTasks.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-600 font-bold border border-dashed border-slate-900 rounded-3xl">
              No completed tasks found in log.
            </div>
          ) : (
            <div className="space-y-2">
              {completedTasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-emerald-950/20 bg-[#0e121b]/20 p-4 flex items-start gap-3 backdrop-blur-sm opacity-60"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(t.id, t.status)}
                    className="mt-0.5 text-emerald-400 hover:scale-105 transition bg-transparent border-0 cursor-pointer p-0"
                  >
                    <CheckCircle className="size-4.5" />
                  </button>

                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wide leading-tight line-through truncate">
                      {t.title}
                    </p>
                    <p className="text-[8px] font-bold text-slate-650 uppercase tracking-wider font-mono">
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
