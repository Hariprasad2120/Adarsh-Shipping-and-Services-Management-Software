"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CriteriaPointsForm } from "@/components/ams/criteria-points-form";
import type { CriterionPoint } from "@/components/ams/criteria-points-form";
import type { AppraisalSelfFormTemplate, SelfAssessmentAnswers } from "@/modules/ams/criteria-config";
import { useNotifications } from "@/components/notifications/notification-provider";

function DeadlineBanner({ deadline, serverNow }: { deadline: string; serverNow: string }) {
  const passed = new Date(serverNow) >= new Date(deadline);
  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${passed ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
      Self-assessment deadline: <strong>{new Date(deadline).toLocaleDateString("en-IN")}</strong>
      {passed ? " — deadline has passed" : ""}
    </div>
  );
}

export function SelfAssessmentForm({
  appraisalId,
  criteria,
  initialAnswers,
  selfAssessmentDeadline,
  serverNow,
  status,
  template,
}: {
  appraisalId: string;
  criteria: CriterionPoint[];
  initialAnswers: SelfAssessmentAnswers | null;
  selfAssessmentDeadline: string | null;
  serverNow: string;
  status: string | null;
  template: AppraisalSelfFormTemplate;
}) {
  const router = useRouter();
  const [editCount, setEditCount] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const { error } = useNotifications();

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
    setEditCount(data.editCount ?? null);
    setSavedAt(new Date().toLocaleTimeString("en-IN"));
    if (action === "SUBMITTED") {
      router.refresh();
    }
  }

  const deadlinePassed = selfAssessmentDeadline
    ? new Date(serverNow) >= new Date(selfAssessmentDeadline)
    : false;

  return (
    <div className="space-y-4">
      {selfAssessmentDeadline && (
        <DeadlineBanner deadline={selfAssessmentDeadline} serverNow={serverNow} />
      )}

      {savedAt && editCount !== null && selfAssessmentDeadline && (
        <div className="rounded-lg px-3 py-2 text-xs bg-green-50 text-green-700 border border-green-200">
          Saved at {savedAt} — edited {editCount} time{editCount !== 1 ? "s" : ""}.
          {!deadlinePassed && (
            <> Editable until <strong>{new Date(selfAssessmentDeadline).toLocaleDateString("en-IN")}</strong>.</>
          )}
        </div>
      )}

      <CriteriaPointsForm
        mode="self"
        criteria={criteria}
        initialAnswers={initialAnswers ?? undefined}
        supplementary={[]}
        onSaveDraft={(answers) => persist("DRAFT", answers as SelfAssessmentAnswers)}
        onSubmitFinal={(answers) => persist("SUBMITTED", answers as SelfAssessmentAnswers)}
        disabled={deadlinePassed}
        submitted={status === "SUBMITTED"}
        selfTemplate={template}
      />
    </div>
  );
}
