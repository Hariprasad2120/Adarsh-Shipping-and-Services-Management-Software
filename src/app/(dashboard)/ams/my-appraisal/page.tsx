import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CycleProgressCard } from "@/modules/ams/components/cycle-progress-card";
import { listMyAppraisals } from "@/modules/ams/service";
import { getNow } from "@/lib/clock";
import {
  PerformanceActionLink,
  PerformanceSection,
  PerformanceSectionHeader,
} from "@/modules/performance/components/performance-workspace";
import {
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceState,
} from "@/components/layout/workspace";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

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
  DATE_VOTING: "Meeting Date Voting",
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
        <WorkspaceAlert variant="success">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>
            Self-assessment submitted successfully. Your responses were saved,
            and you can still edit them until the deadline.
          </span>
        </WorkspaceAlert>
      )}
      {appraisals.length === 0 ? (
        <WorkspaceState
          variant="empty"
          eyebrow="Personal performance"
          title="No appraisal records"
          description="No appraisals were found for your account."
          icon={<ClipboardCheck aria-hidden="true" />}
        />
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
              <PerformanceSection key={appraisal.id}>
                <PerformanceSectionHeader
                  eyebrow="Personal performance"
                  title={appraisal.cycle.name}
                  description={`Due ${new Date(appraisal.dueDate).toLocaleDateString("en-IN")}`}
                  actions={
                    <WorkspaceBadge variant="accent">
                      {STAGE_LABEL[appraisal.stage] ??
                        appraisal.stage.replace(/_/g, " ")}
                    </WorkspaceBadge>
                  }
                />

                <div className="space-y-5 px-5 pb-5">

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
                    <PerformanceActionLink
                      href={`/ams/my-appraisal/${appraisal.id}/self-assessment`}
                    >
                      {selfDeadlinePassed
                        ? "View Self-Assessment ->"
                        : appraisal.selfAssessment
                          ? "Edit Self-Assessment ->"
                          : "Complete Self-Assessment ->"}
                    </PerformanceActionLink>
                  </div>
                )}

                {appraisal.stage !== "SELF_ASSESSMENT_OPEN" &&
                  appraisal.selfAssessment && (
                    <div className="pt-2">
                      <PerformanceActionLink
                        href={`/ams/my-appraisal/${appraisal.id}/self-assessment`}
                      >
                        {"View Self-Assessment ->"}
                      </PerformanceActionLink>
                    </div>
                  )}
                </div>
              </PerformanceSection>
            );
          })}
        </div>
      )}
    </div>
  );
}
