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
      <h1 className="text-2xl font-bold text-gray-900">My Appraisal</h1>

      {appraisals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-gray-400 text-sm">
          No appraisals found for your account.
        </div>
      ) : (
        <div className="space-y-6">
          {appraisals.map((a) => {
            const deadlinePassed = a.availabilityDeadline
              ? now >= new Date(a.availabilityDeadline)
              : false;

            const nonMgmtReviewers = a.reviewers.filter((r) => r.kind !== "MANAGEMENT");

            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{a.cycle.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Due: {new Date(a.dueDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STAGE_COLOR[a.stage] ?? "bg-gray-100 text-gray-500"}`}>
                    {STAGE_LABEL[a.stage] ?? a.stage.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Reviewers */}
                {nonMgmtReviewers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Reviewers</p>
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
                      {nonMgmtReviewers.map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                          <div>
                            <span className="font-medium text-gray-900">{r.user.name}</span>
                            <span className="ml-2 text-xs text-gray-400 uppercase">{r.kind}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.availabilityStatus] ?? "bg-gray-100 text-gray-500"}`}>
                            {r.availabilityStatus}
                          </span>
                        </div>
                      ))}
                    </div>

                    {a.availabilityDeadline && a.stage === "REVIEWERS_ASSIGNED" && (
                      <p className="text-xs text-gray-400">
                        {deadlinePassed
                          ? "Availability deadline has passed."
                          : `Reviewers have until ${new Date(a.availabilityDeadline).toLocaleDateString("en-IN")} to confirm availability.`}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Reviewers not yet assigned.</p>
                )}

                {/* Self-assessment opening notice */}
                {a.stage === "REVIEWERS_ASSIGNED" && a.availabilityDeadline && (
                  <div className={`rounded-lg border px-4 py-3 text-sm ${
                    deadlinePassed
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-blue-50 border-blue-200 text-blue-700"
                  }`}>
                    {deadlinePassed
                      ? "Your self-assessment window is pending — awaiting reviewer confirmation from admin."
                      : <>Your self-assessment will open on <strong>{new Date(a.availabilityDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>.</>
                    }
                  </div>
                )}

                {/* Self-assessment CTA */}
                {a.stage === "SELF_ASSESSMENT_OPEN" && (
                  <div className="pt-2 space-y-2">
                    {a.selfAssessmentDeadline && (
                      <p className="text-xs text-amber-600">
                        {now >= new Date(a.selfAssessmentDeadline)
                          ? "Self-assessment deadline has passed — awaiting auto-advance."
                          : `Complete by ${new Date(a.selfAssessmentDeadline).toLocaleDateString("en-IN")}`}
                      </p>
                    )}
                    {a.selfAssessment && (
                      <p className="text-xs text-green-700">
                        Draft saved — edited {(a.selfAssessment as { editCount?: number }).editCount ?? 0} time{((a.selfAssessment as { editCount?: number }).editCount ?? 0) !== 1 ? "s" : ""}
                      </p>
                    )}
                    <Link
                      href={`/ams/my-appraisal/${a.id}/self-assessment`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                    >
                      {a.selfAssessment ? "Edit Self-Assessment →" : "Complete Self-Assessment →"}
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
