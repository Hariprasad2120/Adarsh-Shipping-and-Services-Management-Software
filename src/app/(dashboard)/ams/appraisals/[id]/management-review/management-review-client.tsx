"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CycleProgressCard } from "@/modules/ams/components/cycle-progress-card";
import { FormPreviewModal } from "@/modules/ams/components/form-preview-modal";
import {
  CriteriaPointsForm,
  CriteriaPointsView,
} from "@/modules/ams/components/criteria-points-form";
import { DemoFillButton } from "@/components/forms/development/demo-fill-button";
import { useNotifications } from "@/modules/notifications/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildReviewerDemoAnswers,
  demoPerformanceProfiles,
  type DemoPerformanceProfile,
} from "@/lib/demo-fill";
import type {
  AppraisalSelfFormTemplate,
  ManagementReviewAnswers,
  ReviewerRatingAnswers,
  SelfAssessmentAnswers,
} from "@/modules/ams/criteria-config";
import type { CriterionPoint } from "@/modules/ams/types";

type ManagementReviewDetail = {
  id: string;
  stage: string;
  employee: { name: string; designation: string | null };
  cycle: { name: string; year: number };
  canClaim: boolean;
  isClaimant: boolean;
  claimedByName: string | null;
  selfAssessment: { answers: SelfAssessmentAnswers; editCount?: number } | null;
  reviewerRatings: {
    id: string;
    ratings: ReviewerRatingAnswers;
    status: string | null;
    submittedAt: string | null;
    updatedAt: string | null;
    reviewer: { kind: string; user: { name: string } };
  }[];
  currentRating: ManagementReviewAnswers | null;
  proposedDates: string[];
  submittedAt: string | null;
  updatedAt: string | null;
  submissionStatus: string | null;
};

type ScorePreview = {
  finalNormalized: number | null;
  flooredScore: number | null;
  grade: string | null;
  gradeLabel: string | null;
  hikePercent: number | null;
  slabLabel: string | null;
  slabRange: string | null;
};

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-mono-border bg-mono-card p-5 shadow-sm sm:p-6">
      <h2 className="mnx-title-3 text-mono-text">{title}</h2>
      {children}
    </div>
  );
}

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

function getStatusMessage(appraisal: ManagementReviewDetail): string {
  if (appraisal.stage === "MANAGEMENT_REVIEW" && !appraisal.isClaimant) {
    return appraisal.claimedByName
      ? `This appraisal is currently claimed by ${appraisal.claimedByName}.`
      : "Claim this appraisal to complete the management review.";
  }
  if (
    appraisal.stage === "MEETING_PENDING" ||
    appraisal.stage === "MEETING_LIVE"
  ) {
    return "Your management review has been submitted and the appraisal is now in the meeting phase.";
  }
  if (appraisal.stage === "HIKE_FINALISATION" || appraisal.stage === "CLOSED") {
    return "This appraisal has moved beyond management review.";
  }
  return "Management review is not currently available.";
}

export function ManagementReviewClient({
  appraisal,
  selfTemplate,
  selfCriteria,
  selfSupplementary,
  reviewerCriteria,
  managementCriteria,
}: {
  appraisal: ManagementReviewDetail;
  selfTemplate: AppraisalSelfFormTemplate;
  selfCriteria: CriterionPoint[];
  selfSupplementary: CriterionPoint[];
  reviewerCriteria: CriterionPoint[];
  managementCriteria: CriterionPoint[];
}) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [currentRating, setCurrentRating] =
    useState<ManagementReviewAnswers | null>(appraisal.currentRating);
  const [currentSubmissionStatus, setCurrentSubmissionStatus] = useState<
    string | null
  >(appraisal.submissionStatus);
  const [currentSubmittedAt, setCurrentSubmittedAt] = useState<string | null>(
    appraisal.submittedAt,
  );
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState<string | null>(
    appraisal.updatedAt,
  );
  const [isEditing, setIsEditing] = useState<boolean>(
    appraisal.submissionStatus !== "SUBMITTED",
  );
  const [demoProfile, setDemoProfile] =
    useState<DemoPerformanceProfile>("average");
  const [formSeed, setFormSeed] = useState(0);
  const [formPreviewOpen, setFormPreviewOpen] = useState(false);
  const [scorePreview, setScorePreview] = useState<ScorePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [proposedDates, setProposedDates] = useState<string[]>(() => {
    const initial = appraisal.proposedDates.slice(0, 3);
    while (initial.length < 3) initial.push("");
    return initial;
  });
  const { success, error } = useNotifications();

  const canSubmit =
    appraisal.stage === "MANAGEMENT_REVIEW" && appraisal.isClaimant;
  const hasRequiredMeetingDates = proposedDates.filter(Boolean).length > 0;

  useEffect(() => {
    if (!canSubmit || !currentRating) {
      setScorePreview(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setPreviewLoading(true);
      const res = await fetch(
        `/api/ams/appraisals/${appraisal.id}/score-preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ratings: currentRating }),
        },
      );
      if (cancelled) return;
      setPreviewLoading(false);
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      setScorePreview(data?.data ?? data ?? null);
    };

    const timeout = window.setTimeout(run, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [appraisal.id, canSubmit, currentRating]);

  async function claimReview() {
    setClaiming(true);
    const res = await fetch(
      `/api/ams/appraisals/${appraisal.id}/claim-management`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    setClaiming(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error(data.error ?? "Unable to claim appraisal");
      return;
    }
    success("Management review claimed");
    router.refresh();
  }

  async function persistRating(
    action: "DRAFT" | "SUBMITTED",
    answers: ManagementReviewAnswers,
  ) {
    if (action === "SUBMITTED" && !hasRequiredMeetingDates) {
      error("Select the required meeting date options before submitting.");
      return;
    }
    const res = await fetch(
      `/api/ams/appraisals/${appraisal.id}/management-review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ratings: answers,
          proposedDates: proposedDates.filter(Boolean),
        }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error(
        data.error ??
          (action === "DRAFT"
            ? "Unable to save management draft"
            : "Unable to submit management review"),
      );
      return;
    }
    success(
      action === "DRAFT"
        ? "Management draft saved"
        : "Management review submitted",
    );
    setCurrentRating(answers);
    setCurrentSubmissionStatus(action);
    const nowIso = new Date().toISOString();
    setCurrentUpdatedAt(nowIso);
    if (action === "SUBMITTED") {
      setCurrentSubmittedAt(nowIso);
      setIsEditing(false);
    }
    setSavedAt(new Date().toLocaleTimeString("en-IN"));
    router.refresh();
  }

  function buildDemoMeetingDates() {
    const start = new Date();
    return Array.from({ length: 3 }, (_, index) => {
      const next = new Date(start);
      next.setDate(start.getDate() + index + 1);
      return next.toISOString().slice(0, 10);
    });
  }

  function fillManagementDemoData() {
    setCurrentRating(
      buildReviewerDemoAnswers(
        managementCriteria,
        demoProfile,
      ) as ManagementReviewAnswers,
    );
    setProposedDates(buildDemoMeetingDates());
    setFormSeed((current) => current + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/ams/appraisals/${appraisal.id}`}
          className="text-sm text-mono-muted hover:text-mono-text"
        >
          {"< Appraisal Detail"}
        </Link>
        <span className="text-mono-muted/40">/</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
        <CycleProgressCard
          stage={appraisal.stage}
          cycleName={appraisal.cycle.name}
          cycleYear={appraisal.cycle.year}
          reviewers={appraisal.reviewerRatings.map((row) => ({
            kind: row.reviewer.kind,
            name: row.reviewer.user.name,
            submissionStatus: row.status,
          }))}
          selfAssessment={
            appraisal.selfAssessment
              ? { editCount: appraisal.selfAssessment.editCount ?? 0 }
              : null
          }
          management={{
            claimedByName: appraisal.claimedByName,
            submitted: appraisal.submissionStatus === "SUBMITTED",
          }}
          meeting={{
            scheduledAt: appraisal.proposedDates[0] ?? null,
            hasMinutes:
              appraisal.stage === "HIKE_FINALISATION" ||
              appraisal.stage === "CLOSED",
          }}
        />

        <Card title="Review Summary">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-mono-text">
                  {appraisal.employee.name}
                </p>
                <p className="text-sm text-mono-muted">
                  {appraisal.employee.designation ?? "No designation"} ·{" "}
                  {appraisal.cycle.name} {appraisal.cycle.year}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${STAGE_COLOR[appraisal.stage] ?? "border-mono-border bg-mono-soft text-mono-muted"}`}
              >
                {appraisal.stage.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="border-mono-border text-mono-accent hover:bg-mono-accent/8"
                onClick={() => setFormPreviewOpen(true)}
              >
                View Forms
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {savedAt && (
        <div className="rounded-lg border border-mono-border bg-[var(--mnx-success-bg)] px-3 py-2 text-xs text-[var(--mnx-success)]">
          Management review saved at {savedAt}.
        </div>
      )}

      {appraisal.submittedAt &&
        appraisal.currentRating &&
        appraisal.stage !== "MANAGEMENT_REVIEW" && (
          <div className="rounded-lg border border-mono-border bg-[var(--mnx-success-bg)] px-3 py-2 text-xs text-[var(--mnx-success)]">
            Last submitted on{" "}
            <strong>
              {new Date(appraisal.submittedAt).toLocaleString("en-IN")}
            </strong>
            .
          </div>
        )}

      <Card title="Forms Access">
        <p className="text-sm text-mono-muted">
          The self-assessment and reviewer forms are available in the popup
          window. Use <strong>View Forms</strong> to open them.
        </p>
      </Card>

      {appraisal.canClaim ? (
        <Card title="Claim Management Review">
          <p className="text-sm text-mono-muted">
            Claim this appraisal to open your separate management rating form.
          </p>
          <Button onClick={() => void claimReview()} disabled={claiming}>
            {claiming ? "Claiming…" : "Claim this appraisal"}
          </Button>
        </Card>
      ) : canSubmit && isEditing ? (
        <Card title="Your Management Rating">
          <div className="space-y-4">
            <div className="flex justify-end">
              <DemoFillButton
                profiles={demoPerformanceProfiles}
                selectedProfile={demoProfile}
                onProfileChange={setDemoProfile}
                onClick={fillManagementDemoData}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-mono-muted">
                Proposed Meeting Dates
              </p>
              {proposedDates.map((value, index) => (
                <Input
                  key={index}
                  type="date"
                  value={value}
                  onChange={(e) =>
                    setProposedDates((current) =>
                      current.map((item, i) =>
                        i === index ? e.target.value : item,
                      ),
                    )
                  }
                  className="w-full"
                />
              ))}
              <p className="text-xs text-mono-muted">
                Final submission stays disabled until at least one meeting date
                is selected.
              </p>
            </div>
            {scorePreview ? (
              <div className="rounded-2xl border border-mono-border bg-mono-accent/8 px-4 py-4 text-sm">
                <p className="font-semibold text-mono-accent">
                  Live Hike Preview
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <p className="text-mono-text">
                    Current calculated rating:{" "}
                    <strong>
                      {scorePreview.finalNormalized?.toFixed(2) ?? "-"}
                    </strong>
                  </p>
                  <p className="text-mono-text">
                    Floored rating:{" "}
                    <strong>{scorePreview.flooredScore ?? "-"}</strong>
                  </p>
                  <p className="text-mono-text">
                    Grade: <strong>{scorePreview.grade ?? "-"}</strong>
                    {scorePreview.gradeLabel
                      ? ` · ${scorePreview.gradeLabel}`
                      : ""}
                  </p>
                  <p className="text-mono-text">
                    Slab:{" "}
                    <strong>
                      {scorePreview.slabLabel ?? "Not configured"}
                    </strong>
                    {scorePreview.slabRange
                      ? ` (${scorePreview.slabRange})`
                      : ""}
                  </p>
                  <p className="text-mono-text md:col-span-2">
                    Suggested hike percentage:{" "}
                    <strong>
                      {scorePreview.hikePercent != null
                        ? `${scorePreview.hikePercent}%`
                        : "No matching slab"}
                    </strong>
                  </p>
                </div>
                {scorePreview.hikePercent == null ? (
                  <p className="mt-2 text-xs text-[var(--mnx-danger)]">
                    No increment slab matches this score. Fix the slab
                    configuration before final submission.
                  </p>
                ) : null}
              </div>
            ) : previewLoading ? (
              <div className="rounded-2xl border border-mono-border/35 bg-mono-soft px-4 py-3 text-sm text-mono-muted">
                Calculating live hike preview…
              </div>
            ) : null}
            <CriteriaPointsForm
              key={`management-rating-form:${formSeed}`}
              mode="management"
              criteria={managementCriteria}
              supplementary={[]}
              initialAnswers={currentRating ?? undefined}
              onAnswersChange={(answers) =>
                setCurrentRating(answers as ManagementReviewAnswers)
              }
              onSaveDraft={(answers) =>
                persistRating("DRAFT", answers as ManagementReviewAnswers)
              }
              onSubmitFinal={(answers) =>
                persistRating("SUBMITTED", answers as ManagementReviewAnswers)
              }
              isResubmission={currentSubmissionStatus === "SUBMITTED"}
              submitDisabled={
                !hasRequiredMeetingDates ||
                previewLoading ||
                !scorePreview ||
                scorePreview.hikePercent === null
              }
              showDemoFill={false}
            />
          </div>
        </Card>
      ) : canSubmit && !isEditing && currentRating ? (
        <Card title="Your Submitted Management Rating">
          <>
            {appraisal.proposedDates.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-mono-muted">
                  Proposed Meeting Dates
                </p>
                {appraisal.proposedDates.map((value, index) => (
                  <p key={index} className="text-sm text-mono-text">
                    {new Date(value).toLocaleDateString("en-IN")}
                  </p>
                ))}
              </div>
            )}
            <CriteriaPointsView
              criteria={managementCriteria}
              supplementary={[]}
              answers={currentRating}
            />
            <div className="border-t border-mono-border/40 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit form
              </Button>
            </div>
          </>
        </Card>
      ) : currentRating ? (
        <Card title="Your Submitted Management Rating">
          <>
            {appraisal.proposedDates.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-mono-muted">
                  Proposed Meeting Dates
                </p>
                {appraisal.proposedDates.map((value, index) => (
                  <p key={index} className="text-sm text-mono-text">
                    {new Date(value).toLocaleDateString("en-IN")}
                  </p>
                ))}
              </div>
            )}
            <CriteriaPointsView
              criteria={managementCriteria}
              supplementary={[]}
              answers={currentRating}
            />
          </>
        </Card>
      ) : (
        <Card title="Review Status">
          <p className="text-sm text-mono-muted">
            {getStatusMessage(appraisal)}
          </p>
        </Card>
      )}

      <FormPreviewModal
        open={formPreviewOpen}
        onClose={() => setFormPreviewOpen(false)}
        title="Management Form Popup"
        appraisee={appraisal.employee}
        cycle={appraisal.cycle}
        selfTemplate={selfTemplate}
        selfCriteria={selfCriteria}
        reviewerCriteria={reviewerCriteria}
        managementCriteria={managementCriteria}
        selfPreview={{
          answers: appraisal.selfAssessment?.answers ?? null,
          editCount: appraisal.selfAssessment?.editCount,
        }}
        reviewerPreviews={[
          ...appraisal.reviewerRatings.map((row) => ({
            id: row.id,
            reviewerName: row.reviewer.user.name,
            reviewerRole: row.reviewer.kind,
            status: row.status,
            submittedAt: row.submittedAt,
            updatedAt: row.updatedAt,
            answers: row.ratings,
          })),
          {
            id: `${appraisal.id}:management`,
            reviewerName: appraisal.claimedByName ?? "Management Review",
            reviewerRole: "MANAGEMENT",
            status: currentSubmissionStatus,
            submittedAt: currentSubmittedAt,
            updatedAt: currentUpdatedAt,
            answers: currentRating,
          },
        ]}
      />
    </div>
  );
}
