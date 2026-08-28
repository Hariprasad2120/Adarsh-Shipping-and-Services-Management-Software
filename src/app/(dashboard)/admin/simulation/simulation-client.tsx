"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Info,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DailyJobResult = {
  created: number;
  opened: number;
  selfAdvanced: number;
  reviewerAdvanced: number;
};

const CARD =
  "rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5 shadow-sm sm:p-6";

function CardHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-soft)] text-[var(--mnx-text)]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--mnx-text-muted)]">
            {eyebrow}
          </p>
          <h2 className="mt-0.5 text-[1.0625rem] font-semibold leading-tight text-[var(--mnx-text-strong)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 max-w-[56ch] text-[0.8125rem] leading-relaxed text-[var(--mnx-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0 sm:pt-0.5">{action}</div> : null}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--mnx-text-muted)]">
      {children}
    </label>
  );
}

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
    <div className="w-full space-y-5">
      {/* Clock state — full width, readout aligned right on wide screens */}
      <div
        className={`${CARD} flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`}
      >
        <CardHeader
          eyebrow="Clock state"
          title="Current system time"
          icon={<Clock className="size-[18px]" />}
        />
        <div className="flex items-center gap-3 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-soft)] px-4 py-3 lg:min-w-[22rem]">
          <Badge variant={effectiveNow ? "warning" : "success"}>
            {effectiveNow ? "Frozen" : "Live"}
          </Badge>
          <div className="min-w-0">
            <p className="mnx-numeric truncate text-[0.95rem] font-semibold text-[var(--mnx-text-strong)]">
              {effectiveNow
                ? effectiveNow.toLocaleString("en-IN")
                : "Using real time"}
            </p>
            <p className="text-[0.75rem] text-[var(--mnx-text-muted)]">
              {effectiveNow
                ? "Workflow logic runs against this frozen instant."
                : "Workflow logic follows the real server clock."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* Freeze date */}
        <div className={CARD}>
          <CardHeader
            eyebrow="Date control"
            title="Freeze system date"
            description="Freezing also runs the daily appraisal job so date-driven stages advance consistently."
            icon={<CalendarClock className="size-[18px]" />}
          />
          <div className="mt-5 space-y-3">
            <div className="space-y-2">
              <FieldLabel>Date and time to freeze to</FieldLabel>
              <Input
                type="datetime-local"
                value={dateInput}
                onChange={(event) => setDateInput(event.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={freezeDate} disabled={saving || !dateInput}>
                {saving ? "Saving…" : "Freeze date"}
              </Button>
              {frozenAt ? (
                <Button variant="inverse" onClick={clearDate} disabled={saving}>
                  <RotateCcw className="size-4" />
                  Reset to real time
                </Button>
              ) : null}
              {!dateInput ? (
                <span className="text-[0.75rem] text-[var(--mnx-text-muted)]">
                  Pick a date and time to enable.
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Daily job */}
        <div className={CARD}>
          <CardHeader
            eyebrow="Scheduled workflow"
            title="Daily appraisal job"
            description="Run the scheduled creation and stage-advancement logic against the current effective date."
            icon={<Play className="size-[18px]" />}
          />
          <div className="mt-5 space-y-3">
            <Button
              onClick={runDailyJob}
              disabled={jobRunning}
              className="w-full sm:w-auto"
            >
              {jobRunning ? "Running…" : "Run daily job"}
            </Button>
            {jobResult ? (
              <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--mnx-success)_30%,var(--mnx-border))] bg-[var(--mnx-success-bg)] px-4 py-3 text-[0.8125rem] leading-relaxed text-[var(--mnx-success)]">
                <Info className="mt-0.5 size-4 shrink-0" />
                <span>
                  {jobResult.created} appraisal(s) created and {jobResult.opened}{" "}
                  self-assessment(s) opened. {jobResult.selfAdvanced} advanced to
                  reviewer rating and {jobResult.reviewerAdvanced} advanced to
                  management review.
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div
        className={`${CARD} border-[color-mix(in_srgb,var(--mnx-danger)_42%,var(--mnx-border))]`}
      >
        <CardHeader
          eyebrow="Destructive operation"
          title="Reset appraisal data"
          description="Deletes every appraisal cycle, appraisal, reviewer, rating, review, meeting, minute, and hike decision for this organisation. This cannot be undone."
          icon={<AlertTriangle className="size-[18px] text-[var(--mnx-danger)]" />}
        />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2 sm:max-w-xs sm:flex-1">
            <FieldLabel>Confirmation</FieldLabel>
            <Input
              type="text"
              value={resetConfirm}
              onChange={(event) => setResetConfirm(event.target.value)}
              placeholder="Type DELETE"
              className="w-full"
            />
          </div>
          <Button
            variant="destructive"
            onClick={resetAmsData}
            disabled={resetting || resetConfirm !== "DELETE"}
          >
            <Trash2 className="size-4" />
            {resetting ? "Deleting…" : "Delete all appraisal data"}
          </Button>
        </div>
        <p className="mt-2 text-[0.75rem] text-[var(--mnx-text-muted)]">
          Type <span className="font-semibold">DELETE</span> to confirm the
          organisation appraisal reset.
        </p>
      </div>
    </div>
  );
}
