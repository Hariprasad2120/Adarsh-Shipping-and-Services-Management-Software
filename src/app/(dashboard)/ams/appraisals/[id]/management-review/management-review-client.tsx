"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CriteriaPointsForm, CriteriaPointsView } from "@/components/ams/criteria-points-form";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Input } from "@/components/ui/input";
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
    reviewer: { kind: string; user: { name: string } };
  }[];
  currentRating: ManagementReviewAnswers | null;
  proposedDates: string[];
  submittedAt: string | null;
  submissionStatus: string | null;
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-cyan-100 bg-white p-5">
      <h2 className="ds-h2 text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

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

function getStatusMessage(appraisal: ManagementReviewDetail): string {
  if (appraisal.stage === "MANAGEMENT_REVIEW" && !appraisal.isClaimant) {
    return appraisal.claimedByName
      ? `This appraisal is currently claimed by ${appraisal.claimedByName}.`
      : "Claim this appraisal to complete the management review.";
  }
  if (appraisal.stage === "MEETING_PENDING" || appraisal.stage === "MEETING_LIVE") {
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
  const [currentRating, setCurrentRating] = useState<ManagementReviewAnswers | null>(
    appraisal.currentRating,
  );
  const [currentSubmissionStatus, setCurrentSubmissionStatus] = useState<string | null>(
    appraisal.submissionStatus,
  );
  const [isEditing, setIsEditing] = useState<boolean>(
    appraisal.submissionStatus !== "SUBMITTED",
  );
  const [proposedDates, setProposedDates] = useState<string[]>(() => {
    const initial = appraisal.proposedDates.slice(0, 3);
    while (initial.length < 3) initial.push("");
    return initial;
  });
  const { success, error } = useNotifications();

  const canSubmit = appraisal.stage === "MANAGEMENT_REVIEW" && appraisal.isClaimant;

  async function claimReview() {
    setClaiming(true);
    const res = await fetch(`/api/ams/appraisals/${appraisal.id}/claim-management`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setClaiming(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error(data.error ?? "Unable to claim appraisal");
      return;
    }
    success("Management review claimed");
    router.refresh();
  }

  async function persistRating(action: "DRAFT" | "SUBMITTED", answers: ManagementReviewAnswers) {
    const res = await fetch(`/api/ams/appraisals/${appraisal.id}/management-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ratings: answers,
        proposedDates: proposedDates.filter(Boolean),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error(data.error ?? (action === "DRAFT" ? "Unable to save management draft" : "Unable to submit management review"));
      return;
    }
    success(action === "DRAFT" ? "Management draft saved" : "Management review submitted");
    setCurrentRating(answers);
    setCurrentSubmissionStatus(action);
    if (action === "SUBMITTED") {
      setIsEditing(false);
    }
    setSavedAt(new Date().toLocaleTimeString("en-IN"));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/ams/appraisals/${appraisal.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          {"< Appraisal Detail"}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="ds-h1 text-gray-900">Management Review</h1>
      </div>

      <Card title="Review Summary">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">{appraisal.employee.name}</p>
            <p className="text-sm text-gray-500">
              {appraisal.employee.designation ?? "No designation"} · {appraisal.cycle.name} {appraisal.cycle.year}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STAGE_COLOR[appraisal.stage] ?? "border-gray-200 bg-gray-100 text-gray-500"}`}>
            {appraisal.stage.replace(/_/g, " ")}
          </span>
        </div>
      </Card>

      {savedAt && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Management review saved at {savedAt}.
        </div>
      )}

      {appraisal.submittedAt && appraisal.currentRating && appraisal.stage !== "MANAGEMENT_REVIEW" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Last submitted on <strong>{new Date(appraisal.submittedAt).toLocaleString("en-IN")}</strong>.
        </div>
      )}

      <Card title="Self Assessment">
        <CriteriaPointsView
          criteria={selfCriteria}
          supplementary={selfSupplementary}
          answers={appraisal.selfAssessment?.answers ?? null}
          editCount={appraisal.selfAssessment?.editCount}
          selfTemplate={selfTemplate}
        />
      </Card>

      <Card title="Reviewer Ratings">
        {appraisal.reviewerRatings.length > 0 ? (
          <div className="space-y-6">
            {appraisal.reviewerRatings.map((row) => (
              <div key={row.id} className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">
                  {row.reviewer.user.name} ({row.reviewer.kind})
                </p>
                <CriteriaPointsView criteria={reviewerCriteria} supplementary={[]} answers={row.ratings} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Reviewer ratings are not available yet.</p>
        )}
      </Card>

      {appraisal.canClaim ? (
        <Card title="Claim Management Review">
          <p className="text-sm text-gray-600">
            Claim this appraisal to open your separate management rating form.
          </p>
          <button
            onClick={() => void claimReview()}
            disabled={claiming}
            className="rounded-lg bg-[#00cec4] px-4 py-2 text-sm font-medium text-white hover:bg-[#00b8af] disabled:opacity-50"
          >
            {claiming ? "Claiming..." : "Claim this appraisal"}
          </button>
        </Card>
      ) : canSubmit && isEditing ? (
        <Card title="Your Management Rating">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Proposed Meeting Dates</p>
              {proposedDates.map((value, index) => (
                <Input
                  key={index}
                  type="date"
                  value={value}
                  onChange={(e) => setProposedDates((current) => current.map((item, i) => (i === index ? e.target.value : item)))}
                  className="w-full"
                />
              ))}
            </div>
            <CriteriaPointsForm
              mode="management"
              criteria={managementCriteria}
              supplementary={[]}
              initialAnswers={currentRating ?? undefined}
              onSaveDraft={(answers) => persistRating("DRAFT", answers as ManagementReviewAnswers)}
              onSubmitFinal={(answers) => persistRating("SUBMITTED", answers as ManagementReviewAnswers)}
              isResubmission={currentSubmissionStatus === "SUBMITTED"}
            />
          </div>
        </Card>
      ) : canSubmit && !isEditing && currentRating ? (
        <Card title="Your Submitted Management Rating">
          <>
            {appraisal.proposedDates.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Proposed Meeting Dates</p>
                {appraisal.proposedDates.map((value, index) => (
                  <p key={index} className="text-sm text-gray-700">
                    {new Date(value).toLocaleDateString("en-IN")}
                  </p>
                ))}
              </div>
            )}
            <CriteriaPointsView criteria={managementCriteria} supplementary={[]} answers={currentRating} />
            <div className="border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-[#00cec4]/40 px-4 py-2 text-sm font-medium text-[#008b85] transition hover:bg-[#00cec4]/8"
              >
                Edit Form
              </button>
            </div>
          </>
        </Card>
      ) : currentRating ? (
        <Card title="Your Submitted Management Rating">
          <>
            {appraisal.proposedDates.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Proposed Meeting Dates</p>
                {appraisal.proposedDates.map((value, index) => (
                  <p key={index} className="text-sm text-gray-700">
                    {new Date(value).toLocaleDateString("en-IN")}
                  </p>
                ))}
              </div>
            )}
            <CriteriaPointsView criteria={managementCriteria} supplementary={[]} answers={currentRating} />
          </>
        </Card>
      ) : (
        <Card title="Review Status">
          <p className="text-sm text-gray-600">{getStatusMessage(appraisal)}</p>
        </Card>
      )}
    </div>
  );
}
