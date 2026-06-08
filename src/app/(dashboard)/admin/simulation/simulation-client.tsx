"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function SimulationClient({ initialFrozenAt }: { initialFrozenAt: string | null }) {
  const router = useRouter();
  const [frozenAt, setFrozenAt] = useState(initialFrozenAt);
  const [dateInput, setDateInput] = useState(
    initialFrozenAt ? initialFrozenAt.slice(0, 16) : ""
  );
  const [saving, setSaving] = useState(false);
  const [jobResult, setJobResult] = useState<{ created: number; opened: number; selfAdvanced: number; reviewerAdvanced: number } | null>(null);
  const [jobRunning, setJobRunning] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  async function freezeDate() {
    if (!dateInput) return;
    setSaving(true);
    const res = await fetch("/api/admin/simulation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frozenAt: new Date(dateInput).toISOString() }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setFrozenAt(data.frozenAt);
      if (data.job) setJobResult(data.job);
      router.refresh();
    }
  }

  async function clearDate() {
    setSaving(true);
    const res = await fetch("/api/admin/simulation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frozenAt: null }),
    });
    setSaving(false);
    if (res.ok) {
      setFrozenAt(null);
      setDateInput("");
      router.refresh();
    }
  }

  async function runDailyJob() {
    setJobRunning(true);
    setJobResult(null);
    const res = await fetch("/api/admin/simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run-daily-job" }),
    });
    setJobRunning(false);
    if (res.ok) {
      const data = await res.json();
      setJobResult(data);
      router.refresh();
    }
  }

  async function resetAmsData() {
    if (resetConfirm !== "DELETE") return;
    setResetting(true);
    const res = await fetch("/api/admin/ams-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    setResetting(false);
    if (res.ok) {
      setFrozenAt(null);
      setDateInput("");
      setResetConfirm("");
      setJobResult(null);
      router.refresh();
    }
  }

  const effectiveNow = frozenAt ? new Date(frozenAt) : null;

  return (
    <div className="space-y-6 max-w-lg">
      {/* Current clock status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current System Time</p>
        {effectiveNow ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">FROZEN</span>
            <p className="text-lg font-bold text-gray-900">{effectiveNow.toLocaleString("en-IN")}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">LIVE</span>
            <p className="text-lg font-bold text-gray-900">Real time</p>
          </div>
        )}
      </div>

      {/* Freeze date */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="ds-h2 text-gray-900">Freeze System Date</h2>
        <p className="text-xs text-gray-500">Freezing the date also runs the daily appraisal job automatically — stages advance and self-assessments open without a separate step.</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Date &amp; time to freeze to</label>
            <Input
              type="datetime-local"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full mt-1"
            />
          </div>
          <button
            onClick={freezeDate}
            disabled={saving || !dateInput}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : "Freeze"}
          </button>
        </div>
        {frozenAt && (
          <button
            onClick={clearDate}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Reset to real time
          </button>
        )}
      </div>

      {/* Run daily job */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="ds-h2 text-gray-900">Daily Appraisal Job</h2>
        <p className="text-xs text-gray-500">
          Runs the same logic as the scheduled cron: creates appraisals due on the current
          (possibly frozen) date and opens self-assessments whose availability deadline has passed.
        </p>
        <button
          onClick={runDailyJob}
          disabled={jobRunning}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
        >
          {jobRunning ? "Running…" : "Run daily job now"}
        </button>
        {jobResult && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 space-y-0.5">
            <p>Done — <strong>{jobResult.created}</strong> appraisal(s) created, <strong>{jobResult.opened}</strong> self-assessment(s) opened.</p>
            <p><strong>{jobResult.selfAdvanced}</strong> self-assessment(s) force-advanced to reviewer rating, <strong>{jobResult.reviewerAdvanced}</strong> reviewer rating(s) force-advanced to management review.</p>
          </div>
        )}
      </div>

      {/* Danger zone — AMS data reset */}
      <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
        <h2 className="ds-h2 text-red-700">Danger Zone</h2>
        <p className="text-xs text-gray-500">
          Delete all appraisal cycles, appraisals, reviewers, ratings, reviews, meetings, minutes,
          and hike decisions for this organisation. The simulated date is also cleared.
          <strong className="text-red-600"> This cannot be undone.</strong>
        </p>
        <div className="space-y-2">
          <label className="text-xs text-gray-500">
            Type <code className="bg-gray-100 px-1 rounded">DELETE</code> to confirm
          </label>
          <Input
            type="text"
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full focus:ring-red-400"
          />
        </div>
        <button
          onClick={resetAmsData}
          disabled={resetting || resetConfirm !== "DELETE"}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
        >
          {resetting ? "Deleting…" : "Delete all appraisal data"}
        </button>
      </div>
    </div>
  );
}
