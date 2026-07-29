"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminBadge,
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminPanelHeader,
  WorkspaceAlert,
} from "@/components/monolith";

type DailyJobResult = {
  created: number;
  opened: number;
  selfAdvanced: number;
  reviewerAdvanced: number;
};

export function SimulationClient({
  initialFrozenAt,
}: {
  initialFrozenAt: string | null;
}) {
  const router = useRouter();
  const [frozenAt, setFrozenAt] = useState(initialFrozenAt);
  const [dateInput, setDateInput] = useState(
    initialFrozenAt ? initialFrozenAt.slice(0, 16) : "",
  );
  const [saving, setSaving] = useState(false);
  const [jobResult, setJobResult] = useState<DailyJobResult | null>(null);
  const [jobRunning, setJobRunning] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  async function freezeDate() {
    if (!dateInput) return;
    setSaving(true);
    const response = await fetch("/api/admin/simulation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frozenAt: new Date(dateInput).toISOString() }),
    });
    setSaving(false);
    if (response.ok) {
      const data = await response.json();
      setFrozenAt(data.frozenAt);
      if (data.job) setJobResult(data.job);
      router.refresh();
    }
  }

  async function clearDate() {
    setSaving(true);
    const response = await fetch("/api/admin/simulation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frozenAt: null }),
    });
    setSaving(false);
    if (response.ok) {
      setFrozenAt(null);
      setDateInput("");
      router.refresh();
    }
  }

  async function runDailyJob() {
    setJobRunning(true);
    setJobResult(null);
    const response = await fetch("/api/admin/simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run-daily-job" }),
    });
    setJobRunning(false);
    if (response.ok) {
      setJobResult(await response.json());
      router.refresh();
    }
  }

  async function resetAmsData() {
    if (resetConfirm !== "DELETE") return;
    setResetting(true);
    const response = await fetch("/api/admin/ams-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    setResetting(false);
    if (response.ok) {
      setFrozenAt(null);
      setDateInput("");
      setResetConfirm("");
      setJobResult(null);
      router.refresh();
    }
  }

  const effectiveNow = frozenAt ? new Date(frozenAt) : null;

  return (
    <div className="mnx-admin-simulation">
      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Clock state"
          title="Current system time"
          actions={
            <AdminBadge variant={effectiveNow ? "warning" : "success"}>
              {effectiveNow ? "Frozen" : "Live"}
            </AdminBadge>
          }
        />
        <div className="mnx-admin-panel-body">
          <strong className="mnx-admin-clock">
            {effectiveNow
              ? effectiveNow.toLocaleString("en-IN")
              : "Using real time"}
          </strong>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Date control"
          title="Freeze system date"
          description="Freezing the date also runs the daily appraisal job so date-driven stages advance consistently."
        />
        <div className="mnx-admin-panel-body">
          <AdminField label="Date and time to freeze to">
            <AdminInput
              type="datetime-local"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
            />
          </AdminField>
          <div className="mnx-admin-form-actions">
            <AdminButton
              onClick={freezeDate}
              disabled={saving || !dateInput}
              variant="primary"
            >
              {saving ? "Saving…" : "Freeze date"}
            </AdminButton>
            {frozenAt ? (
              <AdminButton onClick={clearDate} disabled={saving}>
                Reset to real time
              </AdminButton>
            ) : null}
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Scheduled workflow"
          title="Daily appraisal job"
          description="Run the scheduled creation and stage-advancement logic against the current effective date."
          actions={
            <AdminButton
              onClick={runDailyJob}
              disabled={jobRunning}
              variant="primary"
            >
              {jobRunning ? "Running…" : "Run daily job"}
            </AdminButton>
          }
        />
        {jobResult ? (
          <div className="mnx-admin-panel-body">
            <WorkspaceAlert variant="success">
              <span>
                {jobResult.created} appraisal(s) created and {jobResult.opened}{" "}
                self-assessment(s) opened. {jobResult.selfAdvanced} advanced to
                reviewer rating and {jobResult.reviewerAdvanced} advanced to
                management review.
              </span>
            </WorkspaceAlert>
          </div>
        ) : null}
      </AdminPanel>

      <AdminPanel className="mnx-admin-danger-panel">
        <AdminPanelHeader
          eyebrow="Destructive operation"
          title="Reset appraisal data"
          description="Delete all appraisal cycles, appraisals, reviewers, ratings, reviews, meetings, minutes, and hike decisions for this organisation. This cannot be undone."
        />
        <div className="mnx-admin-panel-body">
          <AdminField
            label="Confirmation"
            hint="Type DELETE to confirm the organisation appraisal reset."
          >
            <AdminInput
              type="text"
              value={resetConfirm}
              onChange={(event) => setResetConfirm(event.target.value)}
              placeholder="DELETE"
            />
          </AdminField>
          <AdminButton
            onClick={resetAmsData}
            disabled={resetting || resetConfirm !== "DELETE"}
            variant="destructive"
          >
            {resetting ? "Deleting…" : "Delete all appraisal data"}
          </AdminButton>
        </div>
      </AdminPanel>
    </div>
  );
}
