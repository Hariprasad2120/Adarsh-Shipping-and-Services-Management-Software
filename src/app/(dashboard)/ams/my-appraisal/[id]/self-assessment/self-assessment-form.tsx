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
  // Lock form after first submission; Edit button unlocks
  const [isLocked, setIsLocked] = useState<boolean>(status === "SUBMITTED");
  const { error, success } = useNotifications();

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const deadlinePassed = useMemo(
    () => (selfAssessmentDeadline ? nowMs >= new Date(selfAssessmentDeadline).getTime() : false),
    [nowMs, selfAssessmentDeadline],
  );
  const isEditable = canEdit && !deadlinePassed;

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

    if (action === "SUBMITTED") {
      setIsLocked(true);
      // Redirect to My Appraisal with success flag on first submission
      router.push("/ams/my-appraisal?submitted=1");
      return;
    }

    router.refresh();
  }

  // Locked state: show summary + edit button
  if (isEditable && isLocked) {
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
        <div className="rounded-2xl border border-[#00cec4]/30 bg-[#00cec4]/5 px-6 py-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-base font-semibold text-[#008b85]">Self-assessment submitted</p>
              <p className="text-sm text-on-surface-variant">
                Your self-assessment has been submitted. You can edit it until the deadline.
              </p>
            </div>
            <svg className="mt-0.5 size-6 shrink-0 text-[#00cec4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => setIsLocked(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#00cec4]/40 bg-white px-4 py-2 text-sm font-medium text-[#008b85] transition hover:bg-[#00cec4]/8"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Self-Assessment
          </button>
        </div>
      </div>
    );
  }

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

      {/* In edit mode after a previous submission — show Save Changes label */}
      {isEditable && !isLocked && currentStatus === "SUBMITTED" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          You are editing a submitted self-assessment. Click <strong>Save Changes</strong> to update your submission.
        </div>
      )}

      <CriteriaPointsForm
        mode="self"
        criteria={criteria}
        initialAnswers={initialAnswers ?? undefined}
        supplementary={[]}
        onSaveDraft={(answers) => persist("DRAFT", answers as SelfAssessmentAnswers)}
        onSubmitFinal={(answers) => persist("SUBMITTED", answers as SelfAssessmentAnswers)}
        disabled={!isEditable}
        selfTemplate={template}
        submitLabel={currentStatus === "SUBMITTED" ? "Save Changes" : undefined}
      />
    </div>
  );
}
