"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CriteriaPointsForm } from "@/components/ams/criteria-points-form";
import type { AppraisalSelfFormTemplate, SelfAssessmentAnswers } from "@/modules/ams/criteria-config";
import type { CriterionPoint } from "@/modules/ams/types";
import { useNotifications } from "@/components/notifications/notification-provider";

function DeadlineBanner({ deadline, serverNow }: { deadline: string; serverNow: string }) {
  const passed = new Date(serverNow) >= new Date(deadline);
  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${passed ? "border border-red-200 bg-red-50 text-red-700" : "border border-amber-200 bg-amber-50 text-amber-700"}`}>
      Self-assessment deadline: <strong>{new Date(deadline).toLocaleDateString("en-IN")}</strong>
      {passed ? " - deadline has passed" : ""}
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
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 15000);

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
    <div className="space-y-4">
      {selfAssessmentDeadline && (
        <DeadlineBanner deadline={selfAssessmentDeadline} serverNow={new Date(nowMs).toISOString()} />
      )}

      {savedAt && editCount !== null && selfAssessmentDeadline && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Saved at {savedAt} - edited {editCount} time{editCount !== 1 ? "s" : ""}.
          {!deadlinePassed && (
            <> Editable until <strong>{new Date(selfAssessmentDeadline).toLocaleDateString("en-IN")}</strong>.</>
          )}
        </div>
      )}

      {currentStatus === "SUBMITTED" && isEditable && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          This form is marked as submitted, but you can still edit and resubmit it until the deadline.
        </div>
      )}

      {!isEditable && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          This form is now view-only.
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
      />
    </div>
  );
}
