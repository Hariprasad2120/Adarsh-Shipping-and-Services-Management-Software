"use client";

import React, { useState, useEffect } from "react";
import { Target, Award, Heart, MessageSquare, Plus, Save, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

export function PmsView() {
  const [activeTab, setActiveTab] = useState<"goals" | "skills" | "feedback">("goals");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Goal fields
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalDueDate, setNewGoalDueDate] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);

  // New Feedback fields
  const [feedbackTo, setFeedbackTo] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackType, setFeedbackType] = useState("PEER_TO_PEER");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const [colleagues, setColleagues] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/performance");
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      }
    } catch (e) {
      toast.error("Failed to load PMS details");
    } finally {
      setLoading(false);
    }
  };

  const fetchColleagues = async () => {
    try {
      const res = await fetch("/api/hrms/employees");
      const json = await res.json();
      if (json.ok) {
        setColleagues(json.data);
        if (json.data.length > 0) setFeedbackTo(json.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchColleagues();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/hrms/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_goal",
          title: newGoalTitle,
          target: newGoalTarget,
          dueDate: newGoalDueDate,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("OKR/Goal created successfully!");
        setNewGoalTitle("");
        setNewGoalTarget("");
        setNewGoalDueDate("");
        setShowGoalForm(false);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to create Goal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoalProgress = async (goalId: string, value: number) => {
    try {
      const res = await fetch("/api/hrms/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_goal_progress",
          goalId,
          progress: value,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev: any) => ({
          ...prev,
          goals: prev.goals.map((g: any) =>
            g.id === goalId
              ? { ...g, progress: value, status: value >= 100 ? "COMPLETED" : "IN_PROGRESS" }
              : g
          ),
        }));
      }
    } catch (e) {
      toast.error("Failed to update goal progress");
    }
  };

  const handleCreateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/hrms/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_feedback",
          toUserId: feedbackTo,
          content: feedbackContent,
          feedbackType,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Feedback submitted!");
        setFeedbackContent("");
        setShowFeedbackForm(false);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-[#00c4b6]" />
        <p className="text-xs font-semibold tracking-wider">Syncing appraisal records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="relative rounded-3xl border border-slate-800 bg-[#0f121b]/85 p-6 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c4b6]/5 rounded-full blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-[#00c4b6]/10 border border-[#00c4b6]/35 flex items-center justify-center text-[#00c4b6] shadow-sm">
              <Award className="size-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-100 uppercase tracking-widest">PERFORMANCE & APPRAISAL</h1>
              <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Set goals, map skills, and exchange active feedback</p>
            </div>
          </div>

          {/* Quick buttons */}
          <div className="flex items-center gap-3">
            {activeTab === "goals" && (
              <button
                type="button"
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="inline-flex items-center justify-center gap-2 bg-[#00c4b6]/15 hover:bg-[#00c4b6]/25 border border-[#00c4b6]/35 rounded-2xl px-4 py-2 text-xs font-black text-[#00c4b6] cursor-pointer transition-all uppercase tracking-wider"
              >
                <Plus className="size-4" />
                <span>Add Goal</span>
              </button>
            )}
            {activeTab === "feedback" && (
              <button
                type="button"
                onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                className="inline-flex items-center justify-center gap-2 bg-[#00c4b6]/15 hover:bg-[#00c4b6]/25 border border-[#00c4b6]/35 rounded-2xl px-4 py-2 text-xs font-black text-[#00c4b6] cursor-pointer transition-all uppercase tracking-wider"
              >
                <Plus className="size-4" />
                <span>Give Feedback</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Toggle buttons */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-900 pb-1.5 select-none text-xs font-black tracking-wider">
          <button
            onClick={() => setActiveTab("goals")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "goals"
                ? "bg-[#161f28]/80 text-[#00c4b6] border border-[#00c4b6]/25"
                : "text-slate-500 hover:text-slate-350"
            }`}
          >
            OKR & GOALS
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "skills"
                ? "bg-[#161f28]/80 text-[#00c4b6] border border-[#00c4b6]/25"
                : "text-slate-500 hover:text-slate-350"
            }`}
          >
            SKILLS MATRIX
          </button>
          <button
            onClick={() => setActiveTab("feedback")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "feedback"
                ? "bg-[#161f28]/80 text-[#00c4b6] border border-[#00c4b6]/25"
                : "text-slate-500 hover:text-slate-350"
            }`}
          >
            FEEDBACK JOURNAL
          </button>
        </div>
      </div>

      {/* Goal creation Form */}
      {showGoalForm && (
        <form onSubmit={handleCreateGoal} className="rounded-3xl border border-slate-900 bg-[#0e121b]/80 p-5 space-y-4 shadow-xl max-w-xl">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">New Target Goal / OKR</h3>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Goal Title</label>
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              required
              placeholder="e.g. Reduce booking delays by 15%"
              className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Target Key Metric</label>
              <input
                type="text"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                required
                placeholder="e.g. 15% Reduction"
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Target Due Date</label>
              <input
                type="date"
                value={newGoalDueDate}
                onChange={(e) => setNewGoalDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowGoalForm(false)}
              className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 bg-transparent hover:bg-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-[#00c4b6] border-0 rounded-xl text-xs font-black text-slate-950 cursor-pointer transition-all disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Feedback submission Form */}
      {showFeedbackForm && (
        <form onSubmit={handleCreateFeedback} className="rounded-3xl border border-slate-900 bg-[#0e121b]/80 p-5 space-y-4 shadow-xl max-w-xl">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Submit Performance Feedback</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Feedback Recipient</label>
              <select
                value={feedbackTo}
                onChange={(e) => setFeedbackTo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-250 outline-none focus:border-[#00c4b6]"
              >
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.employeeNo})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Feedback Type</label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-250 outline-none focus:border-[#00c4b6]"
              >
                <option value="PEER_TO_PEER">Peer to Peer</option>
                <option value="MANAGER_REVIEW">Manager Review</option>
                <option value="SELF_REVIEW">Self Review</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Remarks / Comments</label>
            <textarea
              rows={3}
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              required
              placeholder="Provide constructive feedback regarding goals, timeline deadlines, and task ownership."
              className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6] resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowFeedbackForm(false)}
              className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 bg-transparent hover:bg-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-[#00c4b6] border-0 rounded-xl text-xs font-black text-slate-950 cursor-pointer transition-all disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      )}

      {/* Tab Contents */}
      {data && (
        <div className="space-y-4">
          
          {activeTab === "goals" && (
            <div className="grid gap-6 sm:grid-cols-2">
              {data.goals.length === 0 ? (
                <div className="sm:col-span-2 text-center py-12 text-xs text-slate-600 font-bold border border-dashed border-slate-900 rounded-3xl">
                  No active goals set. Start adding OKRs to track performance metrics.
                </div>
              ) : (
                data.goals.map((goal: any) => {
                  const isCompleted = goal.status === "COMPLETED" || goal.progress >= 100;
                  return (
                    <div
                      key={goal.id}
                      className="rounded-3xl border border-slate-900 bg-[#0e121b]/50 p-5 space-y-4 transition hover:border-slate-800 backdrop-blur-sm"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 min-w-0">
                          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wide truncate">
                            {goal.title}
                          </h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Target: {goal.target}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        }`}>
                          {goal.status}
                        </span>
                      </div>

                      {/* Slider progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-[#00c4b6]" />
                            <span>Due: {new Date(goal.dueDate).toLocaleDateString()}</span>
                          </span>
                          <span className="font-mono text-slate-300">{Math.round(goal.progress)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={goal.progress}
                          onChange={(e) => handleGoalProgress(goal.id, Number(e.target.value))}
                          className="w-full accent-[#00c4b6] bg-slate-950 rounded-full h-1 cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "skills" && (
            <div className="rounded-3xl border border-slate-900 bg-[#0e121b]/40 p-6 space-y-6">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">My Skills Matrix</h3>
              {data.skills.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-600 font-bold border border-dashed border-slate-900 rounded-3xl">
                  No skills listed on profile yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {data.skills.map((item: any) => {
                    const prof = item.proficiency;
                    const badgeColor =
                      prof === "EXPERT"
                        ? "bg-[#00c4b6]/10 text-[#00c4b6] border-[#00c4b6]/20"
                        : prof === "ADVANCED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                    return (
                      <div
                        key={item.id}
                        className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 ${badgeColor}`}
                      >
                        <Award className="size-4 shrink-0" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider">{item.skill.name}</p>
                          <p className="text-[8px] font-bold opacity-60 uppercase mt-0.5">{prof}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "feedback" && (
            <div className="space-y-4">
              {data.feedbacks.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-600 font-bold border border-dashed border-slate-900 rounded-3xl">
                  No comments or feedback logs found.
                </div>
              ) : (
                data.feedbacks.map((f: any) => (
                  <div
                    key={f.id}
                    className="rounded-3xl border border-slate-900 bg-[#0e121b]/40 p-5 space-y-3 relative overflow-hidden backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[#00c4b6]/10 border border-[#00c4b6]/20 flex items-center justify-center font-bold text-xs text-[#00c4b6]">
                          {f.fromUser.name[0]}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-200">{f.fromUser.name}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">
                            To: {f.toUser.name}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[8px] font-black uppercase tracking-wider">
                        {f.feedbackType.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-[11px] font-medium text-slate-400 pl-11 leading-relaxed">
                      "{f.content}"
                    </p>

                    <div className="text-[8px] font-bold text-slate-600 text-right">
                      {new Date(f.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
