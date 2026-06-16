"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CriteriaPointsForm, CriteriaPointsView } from "@/components/ams/criteria-points-form";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Button } from "@/components/ui/button-1";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppraisalSelfFormTemplate, ReviewerRatingAnswers, SelfAssessmentAnswers } from "@/modules/ams/criteria-config";
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
  selfAssessmentAnswers: SelfAssessmentAnswers | null;
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
  PENDING: "bg-surface-container text-on-surface-variant border-outline-variant/40",
  AVAILABLE: "bg-green-100 text-green-700 border-green-200",
  UNAVAILABLE: "bg-red-100 text-red-600 border-red-200",
  FORCED: "bg-orange-100 text-orange-600 border-orange-200",
};

const KIND_LABEL: Record<string, string> = {
  HR: "HR",
  TL: "Team Lead",
  MANAGER: "Manager",
};

const REVIEW_SUBMISSION_COLOR: Record<string, string> = {
  SUBMITTED: "bg-[#00cec4]/10 text-[#008b85] border-[#00cec4]/25",
  DRAFT: "bg-surface-container text-on-surface-variant border-outline-variant/40",
};

function DeadlineBanner({
  deadline,
  serverNow,
  label,
}: {
  deadline: string;
  serverNow: string;
  label: string;
}) {
  const passed = new Date(serverNow) >= new Date(deadline);
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        passed
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {label}:{" "}
      <strong>{new Date(deadline).toLocaleDateString("en-IN")}</strong>
      {passed ? " — deadline has passed" : ""}
    </div>
  );
}

function getWaitingMessage(stage: string): string {
  if (stage === "SELF_ASSESSMENT_OPEN")
    return "The employee is still completing self-assessment. Your rating window has not opened yet.";
  if (stage === "MANAGEMENT_REVIEW")
    return "Reviewer ratings are complete. This appraisal is now with management.";
  if (stage === "MEETING_PENDING" || stage === "MEETING_LIVE")
    return "Your review has been submitted and the appraisal is in the meeting phase.";
  if (stage === "HIKE_FINALISATION" || stage === "CLOSED")
    return "This appraisal has moved beyond the reviewer stage.";
  return "This appraisal is not currently awaiting reviewer action.";
}

export function MyReviewDetailClient({
  appraisal,
  selfCriteria,
  selfTemplate,
  criteria,
  serverNow,
}: {
  appraisal: MyReviewDetail;
  selfCriteria: CriterionPoint[];
  selfTemplate: AppraisalSelfFormTemplate;
  criteria: CriterionPoint[];
  serverNow: string;
}) {
  const router = useRouter();
  const [statusLoading, setStatusLoading] = useState<"available" | "unavailable" | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => new Date(serverNow).getTime());
  const [currentSubmissionStatus, setCurrentSubmissionStatus] = useState<string | null>(
    appraisal.submissionStatus,
  );
  const [currentRating, setCurrentRating] = useState<ReviewerRatingAnswers | null>(
    appraisal.currentRating,
  );
  const [currentSubmittedAt, setCurrentSubmittedAt] = useState<string | null>(
    appraisal.submittedAt,
  );
  const [isEditing, setIsEditing] = useState<boolean>(
    appraisal.submissionStatus !== "SUBMITTED",
  );
  const [latestSubmissionOpen, setLatestSubmissionOpen] = useState(false);
  const latestSubmissionRef = useRef<HTMLDivElement | null>(null);
  const { success, error } = useNotifications();

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const ratingDeadlinePassed = useMemo(
    () =>
      appraisal.reviewerRatingDeadline
        ? nowMs >= new Date(appraisal.reviewerRatingDeadline).getTime()
        : false,
    [appraisal.reviewerRatingDeadline, nowMs],
  );
  const canRate =
    appraisal.stage === "REVIEWER_RATING" &&
    (appraisal.reviewerStatus === "AVAILABLE" || appraisal.reviewerStatus === "FORCED") &&
    !ratingDeadlinePassed;
  const canSetAvailability =
    appraisal.stage === "REVIEWERS_ASSIGNED" && appraisal.reviewerStatus === "PENDING";

  async function persistRating(action: "DRAFT" | "SUBMITTED", answers: ReviewerRatingAnswers) {
    const wasSubmitted = currentSubmissionStatus === "SUBMITTED";
    const res = await fetch(`/api/ams/appraisals/${appraisal.id}/reviewer-rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ratings: answers }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error(
        data.error ??
          (action === "DRAFT" ? "Unable to save reviewer draft" : "Unable to submit reviewer rating"),
      );
      return;
    }
    success(action === "DRAFT" ? "Reviewer draft saved" : "Reviewer rating submitted");
    setCurrentRating(answers);
    setCurrentSubmissionStatus(action);
    if (action === "SUBMITTED") {
      setIsEditing(false);
    }
    const nowIso = new Date().toISOString();
    setSavedAt(new Date(nowIso).toLocaleTimeString("en-IN"));
    if (action === "SUBMITTED") {
      setCurrentSubmittedAt(nowIso);
      setLatestSubmissionOpen(true);
      if (!wasSubmitted) {
        requestAnimationFrame(() => {
          if (latestSubmissionRef.current) scrollToElement(latestSubmissionRef.current);
        });
      }
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

  const showRatingEditor = canRate && isEditing;
  const showSubmittedPreview = currentSubmissionStatus === "SUBMITTED" && currentRating && canRate && isEditing;
  const showEditableSubmitted = canRate && !isEditing && currentSubmissionStatus === "SUBMITTED" && !!currentRating;
  const showReadOnlyRating = !canRate && !!currentRating;
  const showStatusCard = !canRate && !currentRating;

  function scrollToElement(target: HTMLElement) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleReviewerFieldNavigate(fieldId: string) {
    const selector =
      fieldId.startsWith("reviewer-criterion:")
        ? `#reviewer-criterion-${fieldId.split(":")[1]}`
        : `[data-field-id="${fieldId}"]`;
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    scrollToElement(target);
    const input = target.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    input?.focus({ preventScroll: true });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <p className="text-sm text-on-surface-variant">
          Reviewer workspace for this appraisal assignment.
        </p>
      </div>

      {/* Review Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Review Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[15px] font-semibold text-on-surface">
                {appraisal.employee.name}
              </p>
              <p className="text-sm text-on-surface-variant">
                {appraisal.employee.designation ?? "No designation"} — {appraisal.cycle.name}{" "}
                {appraisal.cycle.year}
              </p>
              <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant/70">
                Your role: {KIND_LABEL[appraisal.reviewerKind] ?? appraisal.reviewerKind}
              </p>
              <p className="text-xs text-on-surface-variant/60">
                Self-assessment edited {appraisal.selfAssessmentEditCount} time
                {appraisal.selfAssessmentEditCount === 1 ? "" : "s"}.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  STAGE_COLOR[appraisal.stage] ?? "border-outline-variant/40 bg-surface-container text-on-surface-variant"
                }`}
              >
                {appraisal.stage.replace(/_/g, " ")}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  STATUS_COLOR[appraisal.reviewerStatus] ??
                  "bg-surface-container text-on-surface-variant border-outline-variant/40"
                }`}
              >
                {appraisal.reviewerStatus}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {appraisal.stage === "REVIEWERS_ASSIGNED" && appraisal.availabilityDeadline ? (
              <DeadlineBanner
                deadline={appraisal.availabilityDeadline}
                serverNow={serverNow}
                label="Availability deadline"
              />
            ) : null}
            {appraisal.stage === "REVIEWER_RATING" && appraisal.reviewerRatingDeadline ? (
              <DeadlineBanner
                deadline={appraisal.reviewerRatingDeadline}
                serverNow={serverNow}
                label="Rating deadline"
              />
            ) : null}

            {savedAt ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Reviewer rating saved at {savedAt}.
              </div>
            ) : null}

            {currentSubmissionStatus === "SUBMITTED" && canRate ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                This review is marked as submitted, but you can still edit and resubmit it until
                the deadline.
              </div>
            ) : null}

            {appraisal.stage === "REVIEWER_RATING" && ratingDeadlinePassed ? (
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
                Reviewer rating is now view-only because the deadline has passed.
              </div>
            ) : null}

            {currentSubmittedAt && currentRating && appraisal.stage !== "REVIEWERS_ASSIGNED" ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Last submitted on{" "}
                <strong>{new Date(currentSubmittedAt).toLocaleString("en-IN")}</strong>.
              </div>
            ) : null}

            {showSubmittedPreview ? (
              <div ref={latestSubmissionRef} className="">
                <button
                  type="button"
                  onClick={() => setLatestSubmissionOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Latest Submitted Rating</p>
                    <p className="text-xs text-on-surface-variant">
                      Expand to review the last submitted answers and jump back to any criterion.
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-[#008b85] transition-transform duration-200 ${
                      latestSubmissionOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                {latestSubmissionOpen ? (
                  <div className="px-5 pb-4">
                    <CriteriaPointsView
                      criteria={criteria}
                      supplementary={[]}
                      answers={currentRating}
                      onReviewerFieldNavigate={handleReviewerFieldNavigate}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Assigned Reviewers */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Reviewers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {appraisal.assignedReviewers.map((reviewer) => (
              <div
                key={reviewer.id}
                className="rounded-2xl border border-outline-variant/40 bg-surface-container-low px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-on-surface">
                      {reviewer.name ?? KIND_LABEL[reviewer.kind] ?? reviewer.kind}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {reviewer.designation ?? KIND_LABEL[reviewer.kind] ?? reviewer.kind}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                      STATUS_COLOR[reviewer.availabilityStatus] ??
                      "bg-surface-container text-on-surface-variant border-outline-variant/40"
                    }`}
                  >
                    {reviewer.availabilityStatus}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-outline-variant/40 bg-surface px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                    {KIND_LABEL[reviewer.kind] ?? reviewer.kind}
                  </span>
                  {reviewer.submissionStatus ? (
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                        REVIEW_SUBMISSION_COLOR[reviewer.submissionStatus] ??
                        "bg-surface-container text-on-surface-variant border-outline-variant/40"
                      }`}
                    >
                      {reviewer.submissionStatus}
                    </span>
                  ) : null}
                </div>

                {reviewer.submittedAt ? (
                  <p className="mt-3 text-xs text-on-surface-variant">
                    Submitted on {new Date(reviewer.submittedAt).toLocaleString("en-IN")}
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-on-surface-variant/60">
                    No rating submitted yet.
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main columns */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] xl:items-start">
        {/* Left — self-assessment view */}
        <Card>
          <CardHeader>
            <CardTitle>Appraisee Self-Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            {appraisal.selfAssessmentAnswers ? (
              <CriteriaPointsView
                criteria={selfCriteria}
                supplementary={[]}
                answers={appraisal.selfAssessmentAnswers}
                editCount={appraisal.selfAssessmentEditCount}
                selfTemplate={selfTemplate}
              />
            ) : (
              <p className="text-sm italic text-on-surface-variant/70">
                The appraisee has not submitted a self-assessment yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Right — actions */}
        <div className="space-y-6">
          {canSetAvailability ? (
            <Card>
              <CardHeader>
                <CardTitle>Confirm Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-on-surface-variant">
                  Confirm whether you can take this review assignment.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Button
                    variant="default"
                    onClick={() => setAvailability(true)}
                    disabled={statusLoading !== null}
                    className="bg-[#00cec4] hover:bg-[#00b8af] border-0"
                  >
                    {statusLoading === "available" ? "Saving…" : "Available"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAvailability(false)}
                    disabled={statusLoading !== null}
                    className="border-[#00cec4]/40 text-[#008b85] hover:bg-[#00cec4]/5"
                  >
                    {statusLoading === "unavailable" ? "Saving…" : "Unavailable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {showRatingEditor ? (
            <Card className="card-top-accent-violet">
              <CardHeader>
                <CardTitle>Reviewer Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <CriteriaPointsForm
                  mode="reviewer"
                  criteria={criteria}
                  supplementary={[]}
                  initialAnswers={currentRating ?? undefined}
                  onSaveDraft={(answers) => persistRating("DRAFT", answers as ReviewerRatingAnswers)}
                  onSubmitFinal={(answers) =>
                    persistRating("SUBMITTED", answers as ReviewerRatingAnswers)
                  }
                  disabled={ratingDeadlinePassed}
                  isResubmission={currentSubmissionStatus === "SUBMITTED"}
                />
              </CardContent>
            </Card>
          ) : null}

          {showEditableSubmitted ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Submitted Rating</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CriteriaPointsView
                  criteria={criteria}
                  supplementary={[]}
                  answers={currentRating}
                />
                <div className="border-t border-outline-variant/40 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#00cec4]/40 px-4 py-2 text-sm font-medium text-[#008b85] transition hover:bg-[#00cec4]/8"
                  >
                    Edit Rating
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {showReadOnlyRating ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Submitted Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <CriteriaPointsView
                  criteria={criteria}
                  supplementary={[]}
                  answers={currentRating}
                />
              </CardContent>
            </Card>
          ) : null}

          {showStatusCard ? (
            <Card>
              <CardHeader>
                <CardTitle>Review Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-on-surface-variant">
                  {getWaitingMessage(appraisal.stage)}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

    </div>
  );
}
