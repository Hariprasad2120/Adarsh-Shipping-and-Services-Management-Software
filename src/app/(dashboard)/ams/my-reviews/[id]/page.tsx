import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";
import { getMyReviewView } from "@/modules/ams/service";
import { loadReviewerCriteria } from "@/modules/ams/criteria-cache";
import type { ReviewerRatingAnswers } from "@/modules/ams/criteria-config";
import type { CriterionPoint } from "@/components/ams/criteria-points-form";
import { filterCriteriaPointsByRole } from "@/modules/ams/form-template";
import { notFound, redirect } from "next/navigation";
import { MyReviewDetailClient } from "./my-review-detail-client";

export default async function MyReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  console.time("mr:total");

  console.time("mr:auth");
  const session = await auth();
  console.timeEnd("mr:auth");
  if (!session) redirect("/login");

  const { id } = await params;

  // All four operations are independent once session + id are resolved — run in parallel.
  console.time("mr:parallel");
  const [, appraisal, reviewerRows, now] = await Promise.all([
    requirePermission(session.user.id, "ams.appraisal.review"), // also cached via React cache
    getMyReviewView(id, session.user.id),
    loadReviewerCriteria(session.user.orgId!),
    getNow(),
  ]);
  console.timeEnd("mr:parallel");

  if (!appraisal) notFound();
  // getMyReviewView filters reviewers to this user + non-MANAGEMENT at the DB level
  const myReviewer = appraisal.reviewers[0] ?? null;
  if (!myReviewer) notFound();

  console.time("mr:transform");
  const reviewerCriteria: CriterionPoint[] = filterCriteriaPointsByRole(
    myReviewer.kind as "HR" | "TL" | "MANAGER" | "MANAGEMENT",
    reviewerRows,
  );

  const currentRatingRow = myReviewer.ratings[0] ?? null;
  console.timeEnd("mr:transform");

  console.timeEnd("mr:total");

  return (
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
        currentRating: currentRatingRow?.ratings as ReviewerRatingAnswers | null,
        submittedAt: currentRatingRow?.submittedAt?.toISOString() ?? null,
        submissionStatus: currentRatingRow?.status ?? null,
      }}
      criteria={reviewerCriteria}
      serverNow={now.toISOString()}
    />
  );
}
