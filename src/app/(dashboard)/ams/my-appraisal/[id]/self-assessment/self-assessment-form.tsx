"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CriteriaPointsForm } from "@/components/ams/criteria-points-form";
import type { AppraisalSelfFormTemplate, SelfAssessmentAnswers } from "@/modules/ams/criteria-config";
import type { CriterionPoint } from "@/modules/ams/types";
import { useNotifications } from "@/components/notifications/notification-provider";
import { cn } from "@/lib/utils";

function StatusStrip({
  deadline,
  nowMs,
  savedAt,
  editCount,
  currentStatus,
  isEditable,
}: {
  deadline: string | null;
  nowMs: number;
  savedAt: string | null;
  editCount: number | null;
  currentStatus: string | null;
  isEditable: boolean;
}) {
  const passed = deadline ? nowMs >= new Date(deadline).getTime() : false;
  const daysLeft = deadline && !passed
    ? Math.ceil((new Date(deadline).getTime() - nowMs) / 86400000)
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {deadline ? (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
            passed
              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
              : daysLeft !== null && daysLeft <= 3
              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              : "bg-[#00cec4]/10 text-[#008b85] ring-1 ring-[#00cec4]/25",
          )}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 15" />
          </svg>
          {passed
            ? "Deadline passed"
            : daysLeft === 1
            ? "Due tomorrow"
            : daysLeft !== null
            ? `${daysLeft} days left`
            : ""}
          {" · "}
          {new Date(deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ) : null}

      {currentStatus === "SUBMITTED" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00cec4]/10 px-3 py-1.5 text-xs font-medium text-[#008b85] ring-1 ring-[#00cec4]/25">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Submitted
        </span>
      ) : currentStatus === "DRAFT" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant ring-1 ring-outline-variant/40">
          Draft
        </span>
      ) : null}

      {!isEditable && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant ring-1 ring-outline-variant/40">
          View-only
        </span>
      )}

      {savedAt && editCount !== null ? (
        <span className="text-xs text-on-surface-variant/60">
          Saved {savedAt}{editCount > 0 ? ` · ${editCount} edit${editCount !== 1 ? "s" : ""}` : ""}
        </span>
      ) : null}

      {currentStatus === "SUBMITTED" && isEditable ? (
        <span className="text-xs text-sky-600">
          Still editable until deadline.
        </span>
      ) : null}
    </div>
  );
}

export function SelfAssessmentForm({
  appraisalId,
  criteria,
  initialAnswers,
  selfAssessmentDeadline,
  serverNow,
  canEdit,
  status,
  template,
}: {
  appraisalId: string;
  criteria: CriterionPoint[];
  initialAnswers: SelfAssessmentAnswers | null;
  selfAssessmentDeadline: string | null;
  serverNow: string;
  canEdit: boolean;
  status: string | null;
  template: AppraisalSelfFormTemplate;
}) {
  const router = useRouter();
  const [nowMs, setNowMs] = useState(() => new Date(serverNow).getTime());
  const [editCount, setEditCount] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(status);
  const { error } = useNotifications();

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  async function persist(action: "DRAFT" | "SUBMITTED", answers: SelfAssessmentAnswers) {
    const res = await fetch(`/api/ams/appraisals/${appraisalId}/self-assessment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, answers }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      error(d.error ?? (action === "DRAFT" ? "Save failed" : "Submit failed"));
      return;
    }
    const data = await res.json();
    setCurrentStatus(data.status ?? null);
    setEditCount(data.editCount ?? null);
    setSavedAt(new Date().toLocaleTimeString("en-IN"));
    router.refresh();
  }

  const deadlinePassed = useMemo(
    () => (selfAssessmentDeadline ? nowMs >= new Date(selfAssessmentDeadline).getTime() : false),
    [nowMs, selfAssessmentDeadline],
  );
  const isEditable = canEdit && !deadlinePassed;

  return (
    <div className="space-y-5">
      <StatusStrip
        deadline={selfAssessmentDeadline}
        nowMs={nowMs}
        savedAt={savedAt}
        editCount={editCount}
        currentStatus={currentStatus}
        isEditable={isEditable}
      />

      <CriteriaPointsForm
        mode="self"
        criteria={criteria}
        initialAnswers={initialAnswers ?? undefined}
        supplementary={[]}
        onSaveDraft={(answers) => persist("DRAFT", answers as SelfAssessmentAnswers)}
        onSubmitFinal={(answers) => persist("SUBMITTED", answers as SelfAssessmentAnswers)}
        disabled={!isEditable}
        selfTemplate={template}
      />
    </div>
  );
}
