import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";
import { getMyReviewView, getSelfFormTemplate } from "@/modules/ams/service";
import { loadReviewerCriteria, loadSelfCriteria } from "@/modules/ams/criteria-cache";
import type {
  AppraisalSelfFormTemplate,
  ReviewerRatingAnswers,
  SelfAssessmentAnswers,
} from "@/modules/ams/criteria-config";
import { filterCriteriaPointsByRole, mapCriterionRowToPoint } from "@/modules/ams/form-template";
import { resolveSelfFormTemplate } from "@/modules/ams/self-form-template";
import type { CriterionPoint } from "@/modules/ams/types";
import { notFound, redirect } from "next/navigation";
import { MyReviewDetailClient } from "./my-review-detail-client";

export default async function MyReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const orgId = session.user.orgId!;

  // All four operations are independent once session + id are resolved — run in parallel.
  const [, appraisal, reviewerRows, selfRows, selfTemplate, now] = await Promise.all([
    requirePermission(session.user.id, "ams.appraisal.review"), // also cached via React cache
    getMyReviewView(id, session.user.id),
    loadReviewerCriteria(orgId),
    loadSelfCriteria(orgId),
    getSelfFormTemplate(orgId),
    getNow(),
  ]);

  if (!appraisal) notFound();
  const myReviewer = appraisal.myReviewer;
  if (!myReviewer) notFound();

  const reviewerCriteria: CriterionPoint[] = filterCriteriaPointsByRole(
    myReviewer.kind as "HR" | "TL" | "MANAGER" | "MANAGEMENT",
    reviewerRows,
  );
  const selfCriteria: CriterionPoint[] = selfRows
    .filter((row) => row.kind === "CATEGORY")
    .map(mapCriterionRowToPoint);
  const resolvedSelfTemplate = resolveSelfFormTemplate(selfCriteria, selfTemplate as AppraisalSelfFormTemplate);

  const currentRatingRow = myReviewer.ratings[0] ?? null;

  return (
    <div className="space-y-5">
      <MyReviewDetailClient
        appraisal={{
          id: appraisal.id,
          stage: appraisal.stage,
          reviewerKind: myReviewer.kind,
          reviewerStatus: myReviewer.availabilityStatus,
          employee: {
            name: appraisal.employee.name,
            designation: appraisal.employee.designation,
          },
          cycle: {
            name: appraisal.cycle.name,
            year: appraisal.cycle.year,
          },
          availabilityDeadline: appraisal.availabilityDeadline?.toISOString() ?? null,
          reviewerRatingDeadline: appraisal.reviewerRatingDeadline?.toISOString() ?? null,
          selfAssessmentEditCount: appraisal.selfAssessment?.editCount ?? 0,
          // Do not expose self-assessment answers to reviewer while self-assessment is still open
          selfAssessmentAnswers: appraisal.stage !== "SELF_ASSESSMENT_OPEN"
            ? (appraisal.selfAssessment?.answers as SelfAssessmentAnswers | null)
            : null,
          currentRating: currentRatingRow?.ratings as ReviewerRatingAnswers | null,
          submittedAt: currentRatingRow?.submittedAt?.toISOString() ?? null,
          submissionStatus: currentRatingRow?.status ?? null,
          assignedReviewers: appraisal.reviewers.map((reviewer) => ({
            id: reviewer.id,
            kind: reviewer.kind,
            availabilityStatus: reviewer.availabilityStatus,
            name: reviewer.user.name,
            designation: reviewer.user.designation,
            submissionStatus: reviewer.ratings[0]?.status ?? null,
            submittedAt: reviewer.ratings[0]?.submittedAt?.toISOString() ?? null,
          })),
        }}
        selfCriteria={selfCriteria}
        selfTemplate={resolvedSelfTemplate}
        criteria={reviewerCriteria}
        serverNow={now.toISOString()}
      />
    </div>
  );
}
