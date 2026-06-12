import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listMyReviewAppraisals } from "@/modules/ams/service";
import { Breadcrumbs } from "@/components/breadcrumbs";
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
      <div className="space-y-3">
        <h1 className="ds-h1 text-gray-900">My Reviews</h1>
        <Breadcrumbs
          items={[
            { label: "AMS", href: "/ams" },
            { label: "My Reviews" },
          ]}
        />
      </div>
      <MyReviewsClient appraisals={safe} />
    </div>
  );
}
