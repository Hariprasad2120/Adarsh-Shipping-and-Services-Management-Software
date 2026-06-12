"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CriteriaPointsForm, CriteriaPointsView } from "@/components/ams/criteria-points-form";
import { useNotifications } from "@/components/notifications/notification-provider";
import type { ReviewerRatingAnswers } from "@/modules/ams/criteria-config";
import type { CriterionPoint } from "@/modules/ams/types";

type MyReviewDetail = {
  id: string;
  stage: string;
  reviewerKind: string;
  reviewerStatus: string;
  employee: { name: string; designation: string | null };
  cycle: { name: string; year: number };
  availabilityDeadline: string | null;
  reviewerRatingDeadline: string | null;
  selfAssessmentEditCount: number;
  currentRating: ReviewerRatingAnswers | null;
  submittedAt: string | null;
  submissionStatus: string | null;
  assignedReviewers: {
    id: string;
    kind: string;
    availabilityStatus: string;
    name: string | null;
    designation: string | null;
    submissionStatus: string | null;
    submittedAt: string | null;
  }[];
};

const STAGE_COLOR: Record<string, string> = {
  DUE_NOTIFIED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  REVIEWERS_ASSIGNED: "bg-blue-50 text-blue-700 border-blue-200",
  SELF_ASSESSMENT_OPEN: "bg-purple-50 text-purple-700 border-purple-200",
  REVIEWER_RATING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  MANAGEMENT_REVIEW: "bg-orange-50 text-orange-700 border-orange-200",
  MEETING_PENDING: "bg-cyan-50 text-cyan-700 border-cyan-200",
  MEETING_LIVE: "bg-green-50 text-green-700 border-green-200",
  HIKE_FINALISATION: "bg-pink-50 text-pink-700 border-pink-200",
  CLOSED: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  AVAILABLE: "bg-green-100 text-green-700",
  UNAVAILABLE: "bg-red-100 text-red-600",
  FORCED: "bg-orange-100 text-orange-600",
};

const KIND_LABEL: Record<string, string> = {
  HR: "HR",
  TL: "Team Lead",
  MANAGER: "Manager",
};

const REVIEW_SUBMISSION_COLOR: Record<string, string> = {
  SUBMITTED: "bg-[#00cec4]/10 text-[#008b85]",
  DRAFT: "bg-slate-100 text-slate-600",
};

function DeadlineBanner({ deadline, serverNow, label }: { deadline: string; serverNow: string; label: string }) {
  const passed = new Date(serverNow) >= new Date(deadline);
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${passed ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
      {label}: <strong>{new Date(deadline).toLocaleDateString("en-IN")}</strong>
      {passed ? " - deadline has passed" : ""}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-top-accent space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="ds-h2 text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function getWaitingMessage(stage: string): string {
  if (stage === "SELF_ASSESSMENT_OPEN") {
    return "The employee is still completing self-assessment. Your rating window has not opened yet.";
  }
  if (stage === "MANAGEMENT_REVIEW") {
    return "Reviewer ratings are complete. This appraisal is now with management.";
  }
  if (stage === "MEETING_PENDING" || stage === "MEETING_LIVE") {
    return "Your review has been submitted and the appraisal is in the meeting phase.";
  }
  if (stage === "HIKE_FINALISATION" || stage === "CLOSED") {
    return "This appraisal has moved beyond the reviewer stage.";
  }
  return "This appraisal is not currently awaiting reviewer action.";
}

export function MyReviewDetailClient({
  appraisal,
  criteria,
  serverNow,
}: {
  appraisal: MyReviewDetail;
  criteria: CriterionPoint[];
  serverNow: string;
}) {
  const router = useRouter();
  const [statusLoading, setStatusLoading] = useState<"available" | "unavailable" | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => new Date(serverNow).getTime());
  const [currentSubmissionStatus, setCurrentSubmissionStatus] = useState<string | null>(appraisal.submissionStatus);
  const [currentRating, setCurrentRating] = useState<ReviewerRatingAnswers | null>(appraisal.currentRating);
  const [currentSubmittedAt, setCurrentSubmittedAt] = useState<string | null>(appraisal.submittedAt);
  const { success, error } = useNotifications();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  const ratingDeadlinePassed = useMemo(
    () => (appraisal.reviewerRatingDeadline ? nowMs >= new Date(appraisal.reviewerRatingDeadline).getTime() : false),
    [appraisal.reviewerRatingDeadline, nowMs],
  );
  const canRate =
    appraisal.stage === "REVIEWER_RATING" &&
    (appraisal.reviewerStatus === "AVAILABLE" || appraisal.reviewerStatus === "FORCED") &&
    !ratingDeadlinePassed;
  const canSetAvailability =
    appraisal.stage === "REVIEWERS_ASSIGNED" && appraisal.reviewerStatus === "PENDING";

  async function persistRating(action: "DRAFT" | "SUBMITTED", answers: ReviewerRatingAnswers) {
    const res = await fetch(`/api/ams/appraisals/${appraisal.id}/reviewer-rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ratings: answers }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error(data.error ?? (action === "DRAFT" ? "Unable to save reviewer draft" : "Unable to submit reviewer rating"));
      return;
    }
    success(action === "DRAFT" ? "Reviewer draft saved" : "Reviewer rating submitted");
    setCurrentRating(answers);
    setCurrentSubmissionStatus(action);
    const nowIso = new Date().toISOString();
    setSavedAt(new Date(nowIso).toLocaleTimeString("en-IN"));
    if (action === "SUBMITTED") {
      setCurrentSubmittedAt(nowIso);
    }
    router.refresh();
  }

  async function setAvailability(available: boolean) {
    setStatusLoading(available ? "available" : "unavailable");
    const res = await fetch(`/api/ams/appraisals/${appraisal.id}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available }),
    });
    setStatusLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error(data.error ?? "Unable to update availability");
      return;
    }
    success(available ? "Availability confirmed" : "Marked unavailable");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="ds-h1 text-gray-900">{appraisal.employee.name}</h1>
        <p className="text-sm text-gray-500">Reviewer workspace for this appraisal assignment.</p>
      </div>

      <Card title="Review Summary">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">{appraisal.employee.name}</p>
            <p className="text-sm text-gray-500">
              {appraisal.employee.designation ?? "No designation"} - {appraisal.cycle.name} {appraisal.cycle.year}
            </p>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Your role: {KIND_LABEL[appraisal.reviewerKind] ?? appraisal.reviewerKind}
            </p>
            <p className="text-xs text-gray-400">
              Self-assessment edited {appraisal.selfAssessmentEditCount} time{appraisal.selfAssessmentEditCount === 1 ? "" : "s"}.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STAGE_COLOR[appraisal.stage] ?? "border-gray-200 bg-gray-100 text-gray-500"}`}>
              {appraisal.stage.replace(/_/g, " ")}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[appraisal.reviewerStatus] ?? "bg-gray-100 text-gray-500"}`}>
              {appraisal.reviewerStatus}
            </span>
          </div>
        </div>
      </Card>

      <Card title="Assigned Reviewers">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {appraisal.assignedReviewers.map((reviewer) => (
            <div key={reviewer.id} className="rounded-2xl border border-outline-variant/45 bg-surface-container-low px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{reviewer.name ?? KIND_LABEL[reviewer.kind] ?? reviewer.kind}</p>
                  <p className="text-xs text-gray-500">{reviewer.designation ?? KIND_LABEL[reviewer.kind] ?? reviewer.kind}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${STATUS_COLOR[reviewer.availabilityStatus] ?? "bg-gray-100 text-gray-500"}`}>
                  {reviewer.availabilityStatus}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-outline-variant/45 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500">
                  {KIND_LABEL[reviewer.kind] ?? reviewer.kind}
                </span>
                {reviewer.submissionStatus ? (
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${REVIEW_SUBMISSION_COLOR[reviewer.submissionStatus] ?? "bg-slate-100 text-slate-600"}`}>
                    {reviewer.submissionStatus}
                  </span>
                ) : null}
              </div>

              {reviewer.submittedAt ? (
                <p className="mt-3 text-xs text-gray-500">
                  Submitted on {new Date(reviewer.submittedAt).toLocaleString("en-IN")}
                </p>
              ) : (
                <p className="mt-3 text-xs text-gray-400">No rating submitted yet.</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {appraisal.stage === "REVIEWERS_ASSIGNED" && appraisal.availabilityDeadline && (
        <DeadlineBanner deadline={appraisal.availabilityDeadline} serverNow={serverNow} label="Availability deadline" />
      )}
      {appraisal.stage === "REVIEWER_RATING" && appraisal.reviewerRatingDeadline && (
        <DeadlineBanner deadline={appraisal.reviewerRatingDeadline} serverNow={serverNow} label="Rating deadline" />
      )}

      {savedAt && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Reviewer rating saved at {savedAt}.
        </div>
      )}

      {currentSubmissionStatus === "SUBMITTED" && canRate && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          This review is marked as submitted, but you can still edit and resubmit it until the deadline.
        </div>
      )}

      {appraisal.stage === "REVIEWER_RATING" && ratingDeadlinePassed && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Reviewer rating is now view-only because the deadline has passed.
        </div>
      )}

      {currentSubmittedAt && currentRating && appraisal.stage !== "REVIEWERS_ASSIGNED" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Last submitted on <strong>{new Date(currentSubmittedAt).toLocaleString("en-IN")}</strong>.
        </div>
      )}

      {canSetAvailability ? (
        <Card title="Confirm Availability">
          <p className="text-sm text-gray-600">
            Confirm whether you can take this review assignment.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setAvailability(true)}
              disabled={statusLoading !== null}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {statusLoading === "available" ? "Saving..." : "Available"}
            </button>
            <button
              onClick={() => setAvailability(false)}
              disabled={statusLoading !== null}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {statusLoading === "unavailable" ? "Saving..." : "Unavailable"}
            </button>
          </div>
        </Card>
      ) : canRate ? (
        <Card title="Reviewer Rating">
          <CriteriaPointsForm
            mode="reviewer"
            criteria={criteria}
            supplementary={[]}
            initialAnswers={currentRating ?? undefined}
            onSaveDraft={(answers) => persistRating("DRAFT", answers as ReviewerRatingAnswers)}
            onSubmitFinal={(answers) => persistRating("SUBMITTED", answers as ReviewerRatingAnswers)}
            disabled={ratingDeadlinePassed}
          />
        </Card>
      ) : currentRating ? (
        <Card title="Your Submitted Rating">
          <CriteriaPointsView
            criteria={criteria}
            supplementary={[]}
            answers={currentRating}
          />
        </Card>
      ) : (
        <Card title="Review Status">
          <p className="text-sm text-gray-600">{getWaitingMessage(appraisal.stage)}</p>
        </Card>
      )}

      {currentSubmissionStatus === "SUBMITTED" && currentRating && canRate ? (
        <Card title="Latest Submitted Rating">
          <CriteriaPointsView
            criteria={criteria}
            supplementary={[]}
            answers={currentRating}
          />
        </Card>
      ) : null}
    </div>
  );
}
