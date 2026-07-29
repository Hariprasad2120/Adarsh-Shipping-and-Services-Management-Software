import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CycleProgressCard } from "@/components/ams/cycle-progress-card";
import { listMyAppraisals } from "@/modules/ams/service";
import { getNow } from "@/lib/clock";

const STAGE_COLOR: Record<string, string> = {
  DUE_NOTIFIED: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  REVIEWERS_ASSIGNED: "bg-mono-accent/10 text-mono-accent",
  SELF_ASSESSMENT_OPEN: "bg-mono-accent/10 text-mono-accent",
  REVIEWER_RATING: "bg-mono-accent/10 text-mono-accent",
  MANAGEMENT_REVIEW: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  MEETING_PENDING: "bg-mono-accent/10 text-mono-accent",
  MEETING_LIVE: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  HIKE_FINALISATION: "bg-mono-accent/10 text-mono-accent",
  CLOSED: "bg-mono-soft text-mono-muted",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-mono-soft text-mono-muted",
  AVAILABLE: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  UNAVAILABLE: "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]",
  FORCED: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
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

export default async function MyAppraisalPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [appraisals, now, params] = await Promise.all([
    listMyAppraisals(session.user.id),
    getNow(),
    searchParams,
  ]);

  const justSubmitted = params.submitted === "1";

  return (
    <div className="space-y-6">
      {justSubmitted && (
        <div className="rounded-2xl border border-mono-border bg-mono-accent/8 px-5 py-4">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 size-5 shrink-0 text-mono-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-mono-accent">
                Self-assessment submitted successfully
              </p>
              <p className="mt-0.5 text-xs text-mono-muted">
                Your responses have been saved. You can edit your
                self-assessment until the deadline.
              </p>
            </div>
          </div>
        </div>
      )}
      {appraisals.length === 0 ? (
        <div className="rounded-xl border border-mono-border bg-mono-card px-6 py-12 text-center text-sm text-mono-muted/60">
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
            const nonMgmtReviewers = appraisal.reviewers.filter(
              (reviewer) => reviewer.kind !== "MANAGEMENT",
            );

            return (
              <div
                key={appraisal.id}
                className="space-y-5 rounded-xl border border-mono-border bg-mono-card p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-mono-text">
                      {appraisal.cycle.name}
                    </p>
                    <p className="mt-0.5 text-sm text-mono-muted">
                      Due:{" "}
                      {new Date(appraisal.dueDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${STAGE_COLOR[appraisal.stage] ?? "bg-mono-soft text-mono-muted"}`}
                  >
                    {STAGE_LABEL[appraisal.stage] ??
                      appraisal.stage.replace(/_/g, " ")}
                  </span>
                </div>

                <CycleProgressCard
                  stage={appraisal.stage}
                  cycleName={appraisal.cycle.name}
                  cycleYear={appraisal.cycle.year}
                  reviewers={appraisal.reviewers.map((reviewer) => ({
                    kind: reviewer.kind,
                    name: reviewer.user.name,
                    availabilityStatus: reviewer.availabilityStatus,
                  }))}
                  selfAssessment={
                    appraisal.selfAssessment
                      ? {
                          editCount:
                            (appraisal.selfAssessment as { editCount?: number })
                              .editCount ?? 0,
                        }
                      : null
                  }
                />

                {nonMgmtReviewers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-mono-muted">
                      Your Reviewers
                    </p>
                    <div className="overflow-hidden rounded-lg border border-mono-border/40">
                      <div className="divide-y divide-mono-border">
                        {nonMgmtReviewers.map((reviewer) => (
                          <div
                            key={reviewer.id}
                            className="flex items-center justify-between px-4 py-3 text-sm"
                          >
                            <div>
                              <span className="font-medium text-mono-text">
                                {reviewer.user.name}
                              </span>
                              <span className="ml-2 text-xs uppercase text-mono-muted/60">
                                {reviewer.kind}
                              </span>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[reviewer.availabilityStatus] ?? "bg-mono-soft text-mono-muted"}`}
                            >
                              {reviewer.availabilityStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {appraisal.availabilityDeadline &&
                      appraisal.stage === "REVIEWERS_ASSIGNED" && (
                        <p className="text-xs text-mono-muted/60">
                          {availabilityDeadlinePassed
                            ? "Availability deadline has passed."
                            : `Reviewers have until ${new Date(appraisal.availabilityDeadline).toLocaleDateString("en-IN")} to confirm availability.`}
                        </p>
                      )}
                  </div>
                ) : (
                  <p className="text-sm text-mono-muted/60">
                    Reviewers not yet assigned.
                  </p>
                )}

                {appraisal.stage === "REVIEWERS_ASSIGNED" &&
                  appraisal.availabilityDeadline && (
                    <div
                      className={`rounded-lg border px-4 py-3 text-sm ${
                        availabilityDeadlinePassed
                          ? "border-mono-border bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                          : "border-mono-border bg-mono-accent/10 text-mono-accent"
                      }`}
                    >
                      {availabilityDeadlinePassed ? (
                        "Your self-assessment window is pending - awaiting reviewer confirmation from admin."
                      ) : (
                        <>
                          Your self-assessment will open on{" "}
                          <strong>
                            {new Date(
                              appraisal.availabilityDeadline,
                            ).toLocaleDateString("en-IN", {
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
                      <p className="text-xs text-[var(--mnx-warning)]">
                        {selfDeadlinePassed
                          ? "Self-assessment deadline has passed. The form is now view-only until workflow advance."
                          : `Complete by ${new Date(appraisal.selfAssessmentDeadline).toLocaleDateString("en-IN")}`}
                      </p>
                    )}
                    {appraisal.selfAssessment && (
                      <p className="text-xs text-[var(--mnx-success)]">
                        Draft saved - edited{" "}
                        {(appraisal.selfAssessment as { editCount?: number })
                          .editCount ?? 0}{" "}
                        time
                        {((appraisal.selfAssessment as { editCount?: number })
                          .editCount ?? 0) !== 1
                          ? "s"
                          : ""}
                      </p>
                    )}
                    <Link
                      href={`/ams/my-appraisal/${appraisal.id}/self-assessment`}
                      className="inline-flex items-center gap-2 rounded-lg bg-mono-accent/10 px-4 py-2 text-sm font-medium text-mono-text hover:bg-mono-accent/10"
                    >
                      {selfDeadlinePassed
                        ? "View Self-Assessment ->"
                        : appraisal.selfAssessment
                          ? "Edit Self-Assessment ->"
                          : "Complete Self-Assessment ->"}
                    </Link>
                  </div>
                )}

                {appraisal.stage !== "SELF_ASSESSMENT_OPEN" &&
                  appraisal.selfAssessment && (
                    <div className="pt-2">
                      <Link
                        href={`/ams/my-appraisal/${appraisal.id}/self-assessment`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-mono-accent hover:text-mono-accent"
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
