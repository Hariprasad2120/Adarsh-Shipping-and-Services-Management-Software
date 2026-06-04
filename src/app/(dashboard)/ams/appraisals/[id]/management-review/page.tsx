import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getAppraisal, getSelfFormTemplate } from "@/modules/ams/service";
import type {
  AppraisalSelfFormTemplate,
  ManagementReviewAnswers,
  ReviewerRatingAnswers,
  SelfAssessmentAnswers,
} from "@/modules/ams/criteria-config";
import { filterCriteriaPointsByRole, mapCriterionRowToPoint } from "@/modules/ams/form-template";
import { notFound, redirect } from "next/navigation";
import { ManagementReviewClient } from "./management-review-client";

export default async function ManagementReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "ams.appraisal.management_review");

  const { id } = await params;
  const orgId = session.user.orgId!;

  const [appraisal, selfRows, reviewerRows, managementRows, selfTemplate] = await Promise.all([
    getAppraisal(id),
    db.appraisalCriterion.findMany({
      where: { orgId, phase: "SELF", parentId: null },
      orderBy: { order: "asc" },
      include: { children: { orderBy: { order: "asc" } } },
    }),
    db.appraisalCriterion.findMany({
      where: { orgId, phase: "REVIEWER", parentId: null },
      orderBy: { order: "asc" },
      include: { children: { orderBy: { order: "asc" } } },
    }),
    db.appraisalCriterion.findMany({
      where: { orgId, phase: "MANAGEMENT", parentId: null },
      orderBy: { order: "asc" },
      include: { children: { orderBy: { order: "asc" } } },
    }),
    getSelfFormTemplate(orgId),
  ]);

  if (!appraisal) notFound();

  const managementClaim = appraisal.reviewers.find((reviewer) => reviewer.kind === "MANAGEMENT");
  const isClaimant = managementClaim?.userId === session.user.id;
  const canClaim = appraisal.stage === "MANAGEMENT_REVIEW" && !managementClaim;
  const mySubmittedReview = appraisal.managementReviews.find((review) => review.reviewer.id === session.user.id) ?? null;

  if (!canClaim && !isClaimant && !mySubmittedReview) {
    redirect(`/ams/appraisals/${id}`);
  }

  const selfCriteria = selfRows.filter((row) => row.kind === "CATEGORY").map(mapCriterionRowToPoint);
  const reviewerCriteria = filterCriteriaPointsByRole("MANAGEMENT", reviewerRows);
  const managementCriteria = filterCriteriaPointsByRole("MANAGEMENT", managementRows);

  return (
    <ManagementReviewClient
      appraisal={{
        id: appraisal.id,
        stage: appraisal.stage,
        employee: {
          name: appraisal.employee.name,
          designation: appraisal.employee.designation,
        },
        cycle: {
          name: appraisal.cycle.name,
          year: appraisal.cycle.year,
        },
        canClaim,
        isClaimant,
        claimedByName: managementClaim?.user.name ?? null,
        selfAssessment: appraisal.selfAssessment
          ? {
              answers: appraisal.selfAssessment.answers as SelfAssessmentAnswers,
              editCount: appraisal.selfAssessment.editCount,
            }
          : null,
        reviewerRatings: appraisal.reviewerRatings.map((row) => ({
          id: row.id,
          ratings: row.ratings as ReviewerRatingAnswers,
          reviewer: {
            kind: row.reviewer.kind,
            user: { name: row.reviewer.user.name },
          },
        })),
        currentRating: mySubmittedReview?.ratings as ManagementReviewAnswers | null,
        proposedDates: mySubmittedReview?.proposedDates.map((date) => date.toISOString()) ?? [],
        submittedAt: mySubmittedReview?.submittedAt?.toISOString() ?? null,
        submissionStatus: mySubmittedReview?.status ?? null,
      }}
      selfTemplate={selfTemplate as AppraisalSelfFormTemplate}
      selfCriteria={selfCriteria}
      selfSupplementary={[]}
      reviewerCriteria={reviewerCriteria}
      managementCriteria={managementCriteria}
    />
  );
}
