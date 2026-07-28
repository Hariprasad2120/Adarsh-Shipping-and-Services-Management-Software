"use client";

import { PerformanceControlButton } from "@/components/monolith/performance-workspace";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CycleProgressCard } from "@/components/ams/cycle-progress-card";
import {
  CriteriaPointsForm,
  CriteriaPointsView,
} from "@/components/ams/criteria-points-form";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Button } from "@/components/monolith/button-1";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/monolith/card";
import type {
  AppraisalSelfFormTemplate,
  ReviewerRatingAnswers,
  SelfAssessmentAnswers,
} from "@/modules/ams/criteria-config";
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
  DUE_NOTIFIED:
    "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] border-mono-border",
  REVIEWERS_ASSIGNED: "bg-mono-accent/10 text-mono-accent border-mono-border",
  SELF_ASSESSMENT_OPEN: "bg-mono-accent/10 text-mono-accent border-mono-border",
  REVIEWER_RATING: "bg-mono-accent/10 text-mono-accent border-mono-border",
  MANAGEMENT_REVIEW:
    "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] border-mono-border",
  MEETING_PENDING: "bg-mono-accent/10 text-mono-accent border-mono-border",
  MEETING_LIVE:
    "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] border-mono-border",
  HIKE_FINALISATION: "bg-mono-accent/10 text-mono-accent border-mono-border",
  CLOSED: "bg-mono-soft text-mono-muted border-mono-border",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-mono-soft text-mono-muted border-mono-border/40",
  AVAILABLE:
    "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] border-mono-border",
  UNAVAILABLE:
    "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] border-mono-border",
  FORCED:
    "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] border-mono-border",
};

const KIND_LABEL: Record<string, string> = {
  HR: "HR",
  TL: "Team Lead",
  MANAGER: "Manager",
};

const REVIEW_SUBMISSION_COLOR: Record<string, string> = {
  SUBMITTED: "bg-mono-accent/10 text-mono-accent border-mono-border",
  DRAFT: "bg-mono-soft text-mono-muted border-mono-border/40",
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
          ? "border-mono-border bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
          : "border-mono-border bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
      }`}
    >
      {label}: <strong>{new Date(deadline).toLocaleDateString("en-IN")}</strong>
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
  const [statusLoading, setStatusLoading] = useState<
    "available" | "unavailable" | null
  >(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => new Date(serverNow).getTime());
  const [currentSubmissionStatus, setCurrentSubmissionStatus] = useState<
    string | null
  >(appraisal.submissionStatus);
  const [currentRating, setCurrentRating] =
    useState<ReviewerRatingAnswers | null>(appraisal.currentRating);
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
    (appraisal.reviewerStatus === "AVAILABLE" ||
      appraisal.reviewerStatus === "FORCED") &&
    !ratingDeadlinePassed;
  const canSetAvailability =
    appraisal.stage === "REVIEWERS_ASSIGNED" &&
    appraisal.reviewerStatus === "PENDING";

  async function persistRating(
    action: "DRAFT" | "SUBMITTED",
    answers: ReviewerRatingAnswers,
  ) {
    const wasSubmitted = currentSubmissionStatus === "SUBMITTED";
    const res = await fetch(
      `/api/ams/appraisals/${appraisal.id}/reviewer-rating`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ratings: answers }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error(
        data.error ??
          (action === "DRAFT"
            ? "Unable to save reviewer draft"
            : "Unable to submit reviewer rating"),
      );
      return;
    }
    success(
      action === "DRAFT" ? "Reviewer draft saved" : "Reviewer rating submitted",
    );
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
          if (latestSubmissionRef.current)
            scrollToElement(latestSubmissionRef.current);
        });
      }
    }
    router.refresh();
  }

  async function setAvailability(available: boolean) {
    setStatusLoading(available ? "available" : "unavailable");
    const res = await fetch(
      `/api/ams/appraisals/${appraisal.id}/availability`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available }),
      },
    );
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
  const showSubmittedPreview =
    currentSubmissionStatus === "SUBMITTED" &&
    currentRating &&
    canRate &&
    isEditing;
  const showEditableSubmitted =
    canRate &&
    !isEditing &&
    currentSubmissionStatus === "SUBMITTED" &&
    !!currentRating;
  const showReadOnlyRating = !canRate && !!currentRating;
  const showStatusCard = !canRate && !currentRating;

  function scrollToElement(target: HTMLElement) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleReviewerFieldNavigate(fieldId: string) {
    const selector = fieldId.startsWith("reviewer-criterion:")
      ? `#reviewer-criterion-${fieldId.split(":")[1]}`
      : `[data-field-id="${fieldId}"]`;
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    scrollToElement(target);
    const input = target.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea",
    );
    input?.focus({ preventScroll: true });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-mono-muted">
          Reviewer workspace for this appraisal assignment.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
        <CycleProgressCard
          stage={appraisal.stage}
          cycleName={appraisal.cycle.name}
          cycleYear={appraisal.cycle.year}
          reviewers={appraisal.assignedReviewers.map((reviewer) => ({
            kind: reviewer.kind,
            name: reviewer.name,
            availabilityStatus: reviewer.availabilityStatus,
            submissionStatus: reviewer.submissionStatus,
          }))}
          selfAssessment={
            appraisal.selfAssessmentAnswers
              ? { editCount: appraisal.selfAssessmentEditCount }
              : null
          }
          management={{
            submitted:
              appraisal.stage !== "REVIEWER_RATING" &&
              appraisal.stage !== "SELF_ASSESSMENT_OPEN" &&
              appraisal.stage !== "REVIEWERS_ASSIGNED",
          }}
          meeting={{
            scheduledAt: null,
            hasMinutes:
              appraisal.stage === "HIKE_FINALISATION" ||
              appraisal.stage === "CLOSED",
          }}
          className="h-full"
        />

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Review Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[15px] font-semibold text-mono-text">
                  {appraisal.employee.name}
                </p>
                <p className="text-sm text-mono-muted">
                  {appraisal.employee.designation ?? "No designation"} —{" "}
                  {appraisal.cycle.name} {appraisal.cycle.year}
                </p>
                <p className="text-xs uppercase tracking-[0.14em] text-mono-muted/70">
                  Your role:{" "}
                  {KIND_LABEL[appraisal.reviewerKind] ?? appraisal.reviewerKind}
                </p>
                <p className="text-xs text-mono-muted/60">
                  Self-assessment edited {appraisal.selfAssessmentEditCount}{" "}
                  time
                  {appraisal.selfAssessmentEditCount === 1 ? "" : "s"}.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    STAGE_COLOR[appraisal.stage] ??
                    "border-mono-border/40 bg-mono-soft text-mono-muted"
                  }`}
                >
                  {appraisal.stage.replace(/_/g, " ")}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    STATUS_COLOR[appraisal.reviewerStatus] ??
                    "bg-mono-soft text-mono-muted border-mono-border/40"
                  }`}
                >
                  {appraisal.reviewerStatus}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Assigned Reviewers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appraisal.assignedReviewers.map((reviewer) => (
                <div
                  key={reviewer.id}
                  className="rounded-2xl border border-mono-border/40 bg-mono-soft px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-mono-text">
                        {reviewer.name ??
                          KIND_LABEL[reviewer.kind] ??
                          reviewer.kind}
                      </p>
                      <p className="text-xs text-mono-muted">
                        {reviewer.designation ??
                          KIND_LABEL[reviewer.kind] ??
                          reviewer.kind}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                        STATUS_COLOR[reviewer.availabilityStatus] ??
                        "bg-mono-soft text-mono-muted border-mono-border/40"
                      }`}
                    >
                      {reviewer.availabilityStatus}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-mono-border/40 bg-mono-card px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-mono-muted">
                      {KIND_LABEL[reviewer.kind] ?? reviewer.kind}
                    </span>
                    {reviewer.submissionStatus ? (
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                          REVIEW_SUBMISSION_COLOR[reviewer.submissionStatus] ??
                          "bg-mono-soft text-mono-muted border-mono-border/40"
                        }`}
                      >
                        {reviewer.submissionStatus}
                      </span>
                    ) : null}
                  </div>

                  {reviewer.submittedAt ? (
                    <p className="mt-3 text-xs text-mono-muted">
                      Submitted on{" "}
                      {new Date(reviewer.submittedAt).toLocaleString("en-IN")}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-mono-muted/60">
                      No rating submitted yet.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {appraisal.stage === "REVIEWERS_ASSIGNED" &&
        appraisal.availabilityDeadline ? (
          <DeadlineBanner
            deadline={appraisal.availabilityDeadline}
            serverNow={serverNow}
            label="Availability deadline"
          />
        ) : null}
        {appraisal.stage === "REVIEWER_RATING" &&
        appraisal.reviewerRatingDeadline ? (
          <DeadlineBanner
            deadline={appraisal.reviewerRatingDeadline}
            serverNow={serverNow}
            label="Rating deadline"
          />
        ) : null}

        {savedAt ? (
          <div className="rounded-xl border border-mono-border bg-[var(--mnx-success-bg)] px-4 py-3 text-sm text-[var(--mnx-success)]">
            Reviewer rating saved at {savedAt}.
          </div>
        ) : null}

        {currentSubmissionStatus === "SUBMITTED" && canRate ? (
          <div className="rounded-xl border border-mono-border bg-mono-accent/10 px-4 py-3 text-sm text-mono-accent">
            This review is marked as submitted, but you can still edit and
            resubmit it until the deadline.
          </div>
        ) : null}

        {appraisal.stage === "REVIEWER_RATING" && ratingDeadlinePassed ? (
          <div className="rounded-xl border border-mono-border/40 bg-mono-soft px-4 py-3 text-sm text-mono-muted">
            Reviewer rating is now view-only because the deadline has passed.
          </div>
        ) : null}

        {currentSubmittedAt &&
        currentRating &&
        appraisal.stage !== "REVIEWERS_ASSIGNED" ? (
          <div className="rounded-xl border border-mono-border bg-[var(--mnx-success-bg)] px-4 py-3 text-sm text-[var(--mnx-success)]">
            Last submitted on{" "}
            <strong>
              {new Date(currentSubmittedAt).toLocaleString("en-IN")}
            </strong>
            .
          </div>
        ) : null}

        {showSubmittedPreview ? (
          <Card>
            <div ref={latestSubmissionRef}>
              <PerformanceControlButton
                type="button"
                onClick={() => setLatestSubmissionOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-mono-text">
                    Latest Submitted Rating
                  </p>
                  <p className="text-xs text-mono-muted">
                    Expand to review the last submitted answers and jump back to
                    any criterion.
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-mono-accent transition-transform duration-200 ${
                    latestSubmissionOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </PerformanceControlButton>

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
          </Card>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Appraisee Self-Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            {appraisal.stage === "SELF_ASSESSMENT_OPEN" ? (
              appraisal.selfAssessmentAnswers ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-mono-accent/10 px-3 py-1.5 text-xs font-medium text-mono-accent ring-1 ring-primary/20">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Self-assessment submitted
                    </span>
                  </div>
                  <p className="text-xs text-mono-muted/70">
                    The self-assessment content is available after the
                    self-assessment deadline.
                  </p>
                </div>
              ) : (
                <p className="text-sm italic text-mono-muted/70">
                  The appraisee has not submitted a self-assessment yet.
                </p>
              )
            ) : appraisal.selfAssessmentAnswers ? (
              <CriteriaPointsView
                criteria={selfCriteria}
                supplementary={[]}
                answers={appraisal.selfAssessmentAnswers}
                editCount={appraisal.selfAssessmentEditCount}
                selfTemplate={selfTemplate}
              />
            ) : (
              <p className="text-sm italic text-mono-muted/70">
                The appraisee has not submitted a self-assessment yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canSetAvailability ? (
            <Card>
              <CardHeader>
                <CardTitle>Confirm Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-mono-muted">
                  Confirm whether you can take this review assignment.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Button
                    variant="default"
                    onClick={() => setAvailability(true)}
                    disabled={statusLoading !== null}
                    className="bg-mono-accent/10 hover:bg-mono-accent/10 border-0"
                  >
                    {statusLoading === "available" ? "Saving…" : "Available"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAvailability(false)}
                    disabled={statusLoading !== null}
                    className="border-mono-border text-mono-accent hover:bg-mono-accent/5"
                  >
                    {statusLoading === "unavailable"
                      ? "Saving…"
                      : "Unavailable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {showRatingEditor ? (
            <Card className="mnx-performance-surface mnx-accent-edge-violet">
              <CardHeader>
                <CardTitle>Reviewer Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <CriteriaPointsForm
                  mode="reviewer"
                  criteria={criteria}
                  supplementary={[]}
                  initialAnswers={currentRating ?? undefined}
                  onSaveDraft={(answers) =>
                    persistRating("DRAFT", answers as ReviewerRatingAnswers)
                  }
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
                <div className="border-t border-mono-border/40 pt-4">
                  <PerformanceControlButton
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-mono-border px-4 py-2 text-sm font-medium text-mono-accent transition hover:bg-mono-accent/8"
                  >
                    Edit Rating
                  </PerformanceControlButton>
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
                <p className="text-sm text-mono-muted">
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
