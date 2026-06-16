"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { createActivityAction } from "@/modules/crm/actions";
import {
  Calendar,
  CheckSquare,
  PhoneCall,
  Plus,
  Clock,
  MapPin,
  Trash2,
  CheckCircle2,
  X
} from "lucide-react";

interface Activity {
  id: string;
  type: string; // TASK | EVENT | CALL
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: Date | null;
  startAt: Date | null;
  endAt: Date | null;
  location: string | null;
  callResult: string | null;
  durationMins: number | null;
  owner?: { id: string; name: string } | null;
}

interface ActivitiesPanelProps {
  relatedToType: string;
  relatedToId: string;
  initialActivities: Activity[];
}

export function ActivitiesPanel({ relatedToType, relatedToId, initialActivities }: ActivitiesPanelProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [activeForm, setActiveForm] = useState<"NONE" | "TASK" | "EVENT" | "CALL">("NONE");

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [dueAt, setDueAt] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [callResult, setCallResult] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("NORMAL");
    setDueAt("");
    setStartAt("");
    setEndAt("");
    setLocation("");
    setDurationMins("");
    setCallResult("");
    setActiveForm("NONE");
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();
    fd.append("title", title);
    fd.append("type", activeForm);
    fd.append("description", description);
    fd.append("priority", priority);
    fd.append("relatedToType", relatedToType);
    fd.append("relatedToId", relatedToId);

    if (activeForm === "TASK" && dueAt) fd.append("dueAt", dueAt);
    if (activeForm === "EVENT") {
      if (startAt) fd.append("startAt", startAt);
      if (endAt) fd.append("endAt", endAt);
      fd.append("location", location);
    }
    if (activeForm === "CALL") {
      fd.append("durationMins", durationMins);
      fd.append("callResult", callResult);
    }

    const res = await createActivityAction(fd);
    setIsSubmitting(false);

    if (res.ok) {
      toast.success(`${activeForm} created successfully`);
      setActivities((prev) => [res.data, ...prev]);
      resetForm();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1c212a]/30 pb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="size-4.5 text-[#00c4b6]" />
          <h3 className="font-bold text-sm text-white uppercase tracking-wider">Scheduled Activities</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveForm("TASK")}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-[11px] font-bold text-[#00c4b6] rounded cursor-pointer"
          >
            <Plus className="size-3" />
            <span>Task</span>
          </button>
          <button
            onClick={() => setActiveForm("EVENT")}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-[11px] font-bold text-purple-400 rounded cursor-pointer"
          >
            <Plus className="size-3" />
            <span>Meeting</span>
          </button>
          <button
            onClick={() => setActiveForm("CALL")}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-[11px] font-bold text-amber-400 rounded cursor-pointer"
          >
            <Plus className="size-3" />
            <span>Call Log</span>
          </button>
        </div>
      </div>

      {/* Activity Create Forms */}
      {activeForm !== "NONE" && (
        <div className="p-4 bg-[#0f1319] border border-[#1c212a] rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {activeForm === "TASK" ? "Schedule a Task" : activeForm === "EVENT" ? "Schedule a Meeting" : "Log a Call"}
            </span>
            <button onClick={resetForm} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleCreateActivity} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Title *</label>
              <input
                type="text"
                placeholder={activeForm === "TASK" ? "e.g. Email quote document" : activeForm === "EVENT" ? "e.g. Final pricing negotiation" : "e.g. Cold intro pitch"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-sm text-white focus:outline-none focus:border-[#00c4b6]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {activeForm === "TASK" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-sm text-white focus:outline-none focus:border-[#00c4b6]"
                  />
                </div>
              )}

              {activeForm === "EVENT" && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-sm text-white focus:outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-sm text-white focus:outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                </>
              )}

              {activeForm === "CALL" && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      placeholder="e.g. 15"
                      value={durationMins}
                      onChange={(e) => setDurationMins(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-sm text-white focus:outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Call Result</label>
                    <input
                      type="text"
                      placeholder="e.g. Busy, Answered, Left message"
                      value={callResult}
                      onChange={(e) => setCallResult(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-sm text-white focus:outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-sm text-white focus:outline-none focus:border-[#00c4b6]"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            {activeForm === "EVENT" && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Conference room, Google Meet link"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-sm text-white focus:outline-none focus:border-[#00c4b6]"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Description</label>
              <textarea
                placeholder="Log follow-up details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full p-2.5 bg-[#0a0d12] border border-[#1c212a] rounded text-sm text-white focus:outline-none focus:border-[#00c4b6]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-1.5 bg-[#161f28] hover:bg-[#1f2d3a] text-slate-300 border border-[#1c212a] rounded text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-[#00c4b6] hover:bg-[#00b0a3] text-white rounded text-xs font-bold transition-all cursor-pointer"
              >
                {isSubmitting ? "Saving..." : "Save Activity"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activities List */}
      {activities.length === 0 ? (
        <div className="p-6 text-center text-on-surface-variant text-sm border border-dashed border-[#1c212a]/50 rounded-lg">
          No activities planned yet.
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="p-4 bg-[#0f1319] border border-[#1c212a]/40 rounded-lg hover:border-[#1c212a] transition-all flex gap-3 items-start"
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  activity.type === "TASK"
                    ? "bg-blue-500/10 text-blue-400"
                    : activity.type === "EVENT"
                    ? "bg-purple-500/10 text-purple-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {activity.type === "TASK" ? (
                  <CheckSquare className="size-4.5" />
                ) : activity.type === "EVENT" ? (
                  <Calendar className="size-4.5" />
                ) : (
                  <PhoneCall className="size-4.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-white text-sm block truncate leading-tight">
                    {activity.title}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider shrink-0 ${
                      activity.priority === "HIGH"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {activity.priority}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1">{activity.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-[10px] text-on-surface-variant mt-2">
                  {activity.type === "TASK" && activity.dueAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-on-surface-variant" />
                      <span>Due: {new Date(activity.dueAt).toLocaleDateString("en-IN")}</span>
                    </span>
                  )}
                  {activity.type === "EVENT" && activity.startAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-on-surface-variant" />
                      <span>
                        Time: {new Date(activity.startAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </span>
                  )}
                  {activity.type === "CALL" && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-on-surface-variant" />
                      <span>
                        Duration: {activity.durationMins || "0"}m • {activity.callResult || "No result"}
                      </span>
                    </span>
                  )}
                  {activity.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-on-surface-variant" />
                      <span>{activity.location}</span>
                    </span>
                  )}
                  <span>•</span>
                  <span>Owner: {activity.owner?.name || "Unknown"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
