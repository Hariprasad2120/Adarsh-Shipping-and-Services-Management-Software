"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CycleProgressCard } from "@/modules/ams/components/cycle-progress-card";
import {
  CriteriaPointsForm,
  CriteriaPointsView,
} from "@/modules/ams/components/criteria-points-form";
import { useNotifications } from "@/modules/notifications/components/notification-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ratingDisagreementEnabled: boolean;
  myRatingReview: {
    selfEval: "AGREE" | "OVERRATED" | "UNDERRATED";
    reason: string | null;
    status: string;
    revisedCategoryPoints: Record<string, number> | null;
  } | null;
};

const ACCENT_CHIP =
  "border-[var(--mnx-border)] bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]";
const NEUTRAL_CHIP =
  "border-[var(--mnx-border)] bg-[var(--mnx-soft)] text-[var(--mnx-text-muted)]";
const SUCCESS_CHIP =
  "border-[var(--mnx-border)] bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]";
const WARNING_CHIP =
  "border-[var(--mnx-border)] bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]";
const DANGER_CHIP =
  "border-[var(--mnx-border)] bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]";

const STAGE_COLOR: Record<string, string> = {
  DUE_NOTIFIED: WARNING_CHIP,
  REVIEWERS_ASSIGNED: ACCENT_CHIP,
  SELF_ASSESSMENT_OPEN: ACCENT_CHIP,
  REVIEWER_RATING: ACCENT_CHIP,
  MANAGEMENT_REVIEW: WARNING_CHIP,
  DATE_VOTING: ACCENT_CHIP,
  MEETING_PENDING: ACCENT_CHIP,
  MEETING_LIVE: SUCCESS_CHIP,
  HIKE_FINALISATION: ACCENT_CHIP,
  CLOSED: NEUTRAL_CHIP,
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: NEUTRAL_CHIP,
  AVAILABLE: SUCCESS_CHIP,
  UNAVAILABLE: DANGER_CHIP,
  FORCED: WARNING_CHIP,
};

const KIND_LABEL: Record<string, string> = {
  HR: "HR",
  TL: "Team Lead",
  MANAGER: "Manager",
};

const REVIEW_SUBMISSION_COLOR: Record<string, string> = {
  SUBMITTED: ACCENT_CHIP,
  DRAFT: NEUTRAL_CHIP,
};

function Chip({
  className = NEUTRAL_CHIP,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

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
        passed ? DANGER_CHIP : WARNING_CHIP
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

  const roleLabel = KIND_LABEL[appraisal.reviewerKind] ?? appraisal.reviewerKind;

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--mnx-text-muted)]">
        Reviewer workspace for this appraisal assignment.
      </p>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
        {/* Left rail — progress */}
        <div className="xl:sticky xl:top-4">
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
          />
        </div>

        {/* Main column */}
        <div className="space-y-6">
          {/* Review summary */}
          <Card>
            <CardHeader>
              <CardTitle>Review summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-[var(--mnx-text-strong)]">
                    {appraisal.employee.name}
                  </p>
                  <p className="text-sm text-[var(--mnx-text-muted)]">
                    {appraisal.employee.designation ?? "No designation"} ·{" "}
                    {appraisal.cycle.name} {appraisal.cycle.year}
                  </p>
                  <p className="text-xs text-[var(--mnx-text-muted)]">
                    Self-assessment edited {appraisal.selfAssessmentEditCount}{" "}
                    time
                    {appraisal.selfAssessmentEditCount === 1 ? "" : "s"}.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Chip
                    className={
                      STAGE_COLOR[appraisal.stage] ?? NEUTRAL_CHIP
                    }
                  >
                    {appraisal.stage.replace(/_/g, " ")}
                  </Chip>
                  <Chip
                    className={
                      STATUS_COLOR[appraisal.reviewerStatus] ?? NEUTRAL_CHIP
                    }
                  >
                    {appraisal.reviewerStatus}
                  </Chip>
                </div>
              </div>
              <div className="mt-4 border-t border-[var(--mnx-border)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--mnx-text-muted)]">
                  Your role
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--mnx-text-strong)]">
                  {roleLabel}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Banners */}
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
            <div className={`rounded-xl border px-4 py-3 text-sm ${SUCCESS_CHIP}`}>
              Reviewer rating saved at {savedAt}.
            </div>
          ) : null}
          {currentSubmissionStatus === "SUBMITTED" && canRate ? (
            <div className={`rounded-xl border px-4 py-3 text-sm ${ACCENT_CHIP}`}>
              This review is marked as submitted, but you can still edit and
              resubmit it until the deadline.
            </div>
          ) : null}
          {appraisal.stage === "REVIEWER_RATING" && ratingDeadlinePassed ? (
            <div className={`rounded-xl border px-4 py-3 text-sm ${NEUTRAL_CHIP}`}>
              Reviewer rating is now view-only because the deadline has passed.
            </div>
          ) : null}
          {currentSubmittedAt &&
          currentRating &&
          appraisal.stage !== "REVIEWERS_ASSIGNED" ? (
            <div className={`rounded-xl border px-4 py-3 text-sm ${SUCCESS_CHIP}`}>
              Last submitted on{" "}
              <strong>
                {new Date(currentSubmittedAt).toLocaleString("en-IN")}
              </strong>
              .
            </div>
          ) : null}

          {/* Assigned reviewers */}
          <Card>
            <CardHeader>
              <CardTitle>Assigned reviewers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {appraisal.assignedReviewers.map((reviewer) => (
                  <div
                    key={reviewer.id}
                    className="rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-soft)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--mnx-text-strong)]">
                          {reviewer.name ??
                            KIND_LABEL[reviewer.kind] ??
                            reviewer.kind}
                        </p>
                        <p className="truncate text-xs text-[var(--mnx-text-muted)]">
                          {reviewer.designation ??
                            KIND_LABEL[reviewer.kind] ??
                            reviewer.kind}
                        </p>
                      </div>
                      <Chip
                        className={
                          STATUS_COLOR[reviewer.availabilityStatus] ??
                          NEUTRAL_CHIP
                        }
                      >
                        {reviewer.availabilityStatus}
                      </Chip>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Chip className={NEUTRAL_CHIP}>
                        {KIND_LABEL[reviewer.kind] ?? reviewer.kind}
                      </Chip>
                      {reviewer.submissionStatus ? (
                        <Chip
                          className={
                            REVIEW_SUBMISSION_COLOR[reviewer.submissionStatus] ??
                            NEUTRAL_CHIP
                          }
                        >
                          {reviewer.submissionStatus}
                        </Chip>
                      ) : null}
                    </div>

                    <p className="mt-3 text-xs text-[var(--mnx-text-muted)]">
                      {reviewer.submittedAt
                        ? `Submitted ${new Date(reviewer.submittedAt).toLocaleString("en-IN")}`
                        : "No rating submitted yet."}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Latest submitted rating (collapsible) */}
      {showSubmittedPreview ? (
        <Card>
          <div ref={latestSubmissionRef}>
            {/* eslint-disable-next-line no-restricted-syntax -- disclosure header, not a standard Button */}
            <button
              type="button"
              onClick={() => setLatestSubmissionOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--mnx-text-strong)]">
                  Latest submitted rating
                </p>
                <p className="text-xs text-[var(--mnx-text-muted)]">
                  Expand to review the last submitted answers and jump back to
                  any criterion.
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-[var(--mnx-accent-text)] transition-transform duration-200 ${
                  latestSubmissionOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
            {latestSubmissionOpen ? (
              <div className="border-t border-[var(--mnx-border)] px-5 py-4">
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

      {/* Self-assessment + reviewer action */}
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Appraisee self-assessment</CardTitle>
          </CardHeader>
          <CardContent>
            {appraisal.stage === "SELF_ASSESSMENT_OPEN" ? (
              appraisal.selfAssessmentAnswers ? (
                <div className="space-y-2">
                  <Chip className={ACCENT_CHIP}>Self-assessment submitted</Chip>
                  <p className="text-xs text-[var(--mnx-text-muted)]">
                    The self-assessment content is available after the
                    self-assessment deadline.
                  </p>
                </div>
              ) : (
                <p className="text-sm italic text-[var(--mnx-text-muted)]">
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
              <p className="text-sm italic text-[var(--mnx-text-muted)]">
                The appraisee has not submitted a self-assessment yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canSetAvailability ? (
            <Card>
              <CardHeader>
                <CardTitle>Confirm availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-[var(--mnx-text-muted)]">
                  Confirm whether you can take this review assignment.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => setAvailability(true)}
                    disabled={statusLoading !== null}
                  >
                    {statusLoading === "available" ? "Saving…" : "Available"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAvailability(false)}
                    disabled={statusLoading !== null}
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
            <Card>
              <CardHeader>
                <CardTitle>Reviewer rating</CardTitle>
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
                <CardTitle>Your submitted rating</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CriteriaPointsView
                  criteria={criteria}
                  supplementary={[]}
                  answers={currentRating}
                />
                <div className="border-t border-[var(--mnx-border)] pt-4">
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit rating
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {showReadOnlyRating ? (
            <Card>
              <CardHeader>
                <CardTitle>Your submitted rating</CardTitle>
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
                <CardTitle>Review status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--mnx-text-muted)]">
                  {getWaitingMessage(appraisal.stage)}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {appraisal.ratingDisagreementEnabled &&
      appraisal.stage === "MANAGEMENT_REVIEW" &&
      appraisal.submissionStatus === "SUBMITTED" ? (
        <RatingAccuracyCard
          appraisalId={appraisal.id}
          criteria={criteria}
          existing={appraisal.myRatingReview}
          onDone={() => router.refresh()}
          notify={{ success, error }}
        />
      ) : null}
    </div>
  );
}

const SELF_EVAL_OPTIONS: { value: "AGREE" | "OVERRATED" | "UNDERRATED"; label: string; hint: string }[] = [
  { value: "AGREE", label: "My rating was accurate", hint: "No change needed." },
  { value: "OVERRATED", label: "I rated too high", hint: "Enter revised, lower scores below." },
  { value: "UNDERRATED", label: "I rated too low", hint: "Enter revised, higher scores below." },
];

function RatingAccuracyCard({
  appraisalId,
  criteria,
  existing,
  onDone,
  notify,
}: {
  appraisalId: string;
  criteria: CriterionPoint[];
  existing: MyReviewDetail["myRatingReview"];
  onDone: () => void;
  notify: { success: (m: string) => void; error: (m: string) => void };
}) {
  const submitted = existing?.status === "SUBMITTED";
  const [editing, setEditing] = useState(!submitted);
  const [selfEval, setSelfEval] = useState<"AGREE" | "OVERRATED" | "UNDERRATED">(
    existing?.selfEval ?? "AGREE",
  );
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [revised, setRevised] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const [id, value] of Object.entries(existing?.revisedCategoryPoints ?? {})) {
      seed[id] = String(value);
    }
    return seed;
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const revisedCategoryPoints: Record<string, number> = {};
    if (selfEval !== "AGREE") {
      for (const [id, value] of Object.entries(revised)) {
        const numeric = Number(value);
        if (value !== "" && Number.isFinite(numeric)) revisedCategoryPoints[id] = numeric;
      }
    }
    const res = await fetch(`/api/ams/appraisals/${appraisalId}/rating-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SUBMITTED", selfEval, reason, revisedCategoryPoints }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notify.error(data.error ?? "Unable to save rating review");
      return;
    }
    notify.success("Rating review submitted");
    setEditing(false);
    onDone();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating accuracy review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[var(--mnx-text-muted)]">
          All ratings are in and the aggregate is visible to management. Confirm whether your rating
          held up, or submit revised scores.
        </p>

        {submitted && !editing ? (
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-[var(--mnx-text-strong)]">
              {SELF_EVAL_OPTIONS.find((option) => option.value === selfEval)?.label}
            </p>
            {existing?.reason ? (
              <p className="text-[var(--mnx-text-muted)]">{existing.reason}</p>
            ) : null}
            {existing?.revisedCategoryPoints &&
            Object.keys(existing.revisedCategoryPoints).length > 0 ? (
              <ul className="text-[var(--mnx-text-muted)]">
                {criteria
                  .filter((criterion) => existing.revisedCategoryPoints?.[criterion.id] != null)
                  .map((criterion) => (
                    <li key={criterion.id}>
                      {criterion.label}: {existing.revisedCategoryPoints?.[criterion.id]}
                    </li>
                  ))}
              </ul>
            ) : null}
            <Button variant="outline" onClick={() => setEditing(true)}>
              Update
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {SELF_EVAL_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-3 rounded-xl border border-[var(--mnx-border)] p-3"
                >
                  {/* eslint-disable-next-line no-restricted-syntax -- native radio input */}
                  <input
                    type="radio"
                    name="selfEval"
                    className="mt-0.5 h-4 w-4"
                    checked={selfEval === option.value}
                    onChange={() => setSelfEval(option.value)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--mnx-text-strong)]">
                      {option.label}
                    </span>
                    <span className="block text-xs text-[var(--mnx-text-muted)]">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {selfEval !== "AGREE" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--mnx-text-muted)]">Reason</label>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 py-2 text-sm"
                    placeholder="Explain what changed your assessment."
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[var(--mnx-text-muted)]">
                    Revised scores (leave blank to keep the original)
                  </p>
                  {criteria.map((criterion) => (
                    <div key={criterion.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[var(--mnx-text-strong)]">{criterion.label}</span>
                      {/* eslint-disable-next-line no-restricted-syntax -- compact numeric field */}
                      <input
                        type="number"
                        min={0}
                        max={criterion.maxPoints || undefined}
                        value={revised[criterion.id] ?? ""}
                        onChange={(event) =>
                          setRevised((current) => ({ ...current, [criterion.id]: event.target.value }))
                        }
                        className="h-9 w-24 rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-2 text-sm"
                        placeholder={criterion.maxPoints ? `/ ${criterion.maxPoints}` : ""}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Submit rating review"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
