import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listMyAppraisals } from "@/modules/ams/service";
import { getNow } from "@/lib/clock";

const STAGE_COLOR: Record<string, string> = {
  DUE_NOTIFIED: "bg-yellow-50 text-yellow-700",
  REVIEWERS_ASSIGNED: "bg-blue-50 text-blue-700",
  SELF_ASSESSMENT_OPEN: "bg-purple-50 text-purple-700",
  REVIEWER_RATING: "bg-indigo-50 text-indigo-700",
  MANAGEMENT_REVIEW: "bg-orange-50 text-orange-700",
  MEETING_PENDING: "bg-cyan-50 text-cyan-700",
  MEETING_LIVE: "bg-green-50 text-green-700",
  HIKE_FINALISATION: "bg-pink-50 text-pink-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  AVAILABLE: "bg-green-100 text-green-700",
  UNAVAILABLE: "bg-red-100 text-red-600",
  FORCED: "bg-orange-100 text-orange-600",
};

const STAGE_LABEL: Record<string, string> = {
  DUE_NOTIFIED: "Appraisal Started",
  REVIEWERS_ASSIGNED: "Reviewers Assigned",
  SELF_ASSESSMENT_OPEN: "Self-Assessment Open",
  REVIEWER_RATING: "Under Review",
  MANAGEMENT_REVIEW: "Management Review",
  MEETING_PENDING: "Meeting Pending",
  MEETING_LIVE: "Meeting in Progress",
  HIKE_FINALISATION: "Hike Finalisation",
  CLOSED: "Closed",
};

export default async function MyAppraisalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [appraisals, now] = await Promise.all([
    listMyAppraisals(session.user.id),
    getNow(),
  ]);

  return (
    <div className="space-y-6">
      {appraisals.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-400">
          No appraisals found for your account.
        </div>
      ) : (
        <div className="space-y-6">
          {appraisals.map((appraisal) => {
            const availabilityDeadlinePassed = appraisal.availabilityDeadline
              ? now >= new Date(appraisal.availabilityDeadline)
              : false;
            const selfDeadlinePassed = appraisal.selfAssessmentDeadline
              ? now >= new Date(appraisal.selfAssessmentDeadline)
              : false;
            const nonMgmtReviewers = appraisal.reviewers.filter((reviewer) => reviewer.kind !== "MANAGEMENT");

            return (
              <div key={appraisal.id} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{appraisal.cycle.name}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Due: {new Date(appraisal.dueDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STAGE_COLOR[appraisal.stage] ?? "bg-gray-100 text-gray-500"}`}>
                    {STAGE_LABEL[appraisal.stage] ?? appraisal.stage.replace(/_/g, " ")}
                  </span>
                </div>

                {nonMgmtReviewers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your Reviewers</p>
                    <div className="overflow-hidden rounded-lg border border-gray-100">
                      <div className="divide-y divide-gray-100">
                        {nonMgmtReviewers.map((reviewer) => (
                          <div key={reviewer.id} className="flex items-center justify-between px-4 py-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-900">{reviewer.user.name}</span>
                              <span className="ml-2 text-xs uppercase text-gray-400">{reviewer.kind}</span>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[reviewer.availabilityStatus] ?? "bg-gray-100 text-gray-500"}`}>
                              {reviewer.availabilityStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {appraisal.availabilityDeadline && appraisal.stage === "REVIEWERS_ASSIGNED" && (
                      <p className="text-xs text-gray-400">
                        {availabilityDeadlinePassed
                          ? "Availability deadline has passed."
                          : `Reviewers have until ${new Date(appraisal.availabilityDeadline).toLocaleDateString("en-IN")} to confirm availability.`}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Reviewers not yet assigned.</p>
                )}

                {appraisal.stage === "REVIEWERS_ASSIGNED" && appraisal.availabilityDeadline && (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      availabilityDeadlinePassed
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {availabilityDeadlinePassed ? (
                      "Your self-assessment window is pending - awaiting reviewer confirmation from admin."
                    ) : (
                      <>
                        Your self-assessment will open on{" "}
                        <strong>
                          {new Date(appraisal.availabilityDeadline).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </strong>
                        .
                      </>
                    )}
                  </div>
                )}

                {appraisal.stage === "SELF_ASSESSMENT_OPEN" && (
                  <div className="space-y-2 pt-2">
                    {appraisal.selfAssessmentDeadline && (
                      <p className="text-xs text-amber-600">
                        {selfDeadlinePassed
                          ? "Self-assessment deadline has passed. The form is now view-only until workflow advance."
                          : `Complete by ${new Date(appraisal.selfAssessmentDeadline).toLocaleDateString("en-IN")}`}
                      </p>
                    )}
                    {appraisal.selfAssessment && (
                      <p className="text-xs text-green-700">
                        Draft saved - edited {(appraisal.selfAssessment as { editCount?: number }).editCount ?? 0} time{((appraisal.selfAssessment as { editCount?: number }).editCount ?? 0) !== 1 ? "s" : ""}
                      </p>
                    )}
                    <Link
                      href={`/ams/my-appraisal/${appraisal.id}/self-assessment`}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      {selfDeadlinePassed
                        ? "View Self-Assessment ->"
                        : appraisal.selfAssessment
                          ? "Edit Self-Assessment ->"
                          : "Complete Self-Assessment ->"}
                    </Link>
                  </div>
                )}

                {appraisal.stage !== "SELF_ASSESSMENT_OPEN" && appraisal.selfAssessment && (
                  <div className="pt-2">
                    <Link
                      href={`/ams/my-appraisal/${appraisal.id}/self-assessment`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {"View Self-Assessment ->"}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
