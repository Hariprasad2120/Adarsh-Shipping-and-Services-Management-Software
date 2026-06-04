import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listMyReviewAppraisals } from "@/modules/ams/service";
import { MyReviewsClient } from "./my-reviews-client";

export default async function MyReviewsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const appraisals = await listMyReviewAppraisals(session.user.id);
  const safe = appraisals.map((a) => ({
    ...a,
    dueDate: a.dueDate.toISOString(),
    availabilityDeadline: a.availabilityDeadline?.toISOString() ?? null,
    reviewerRatingDeadline: a.reviewerRatingDeadline?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
      <MyReviewsClient appraisals={safe} />
    </div>
  );
}
