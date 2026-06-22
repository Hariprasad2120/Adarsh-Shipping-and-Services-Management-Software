import {
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  Star,
} from "lucide-react";

type ProgressReviewer = {
  kind: string;
  name?: string | null;
  availabilityStatus?: string | null;
  submissionStatus?: string | null;
};

type CycleProgressCardProps = {
  stage: string;
  cycleName?: string;
  cycleYear?: number;
  reviewers?: ProgressReviewer[];
  selfAssessment?: {
    submittedAt?: string | null;
    editCount?: number | null;
  } | null;
  management?: {
    claimedByName?: string | null;
    submitted?: boolean;
  } | null;
  meeting?: {
    scheduledAt?: string | null;
    hasMinutes?: boolean;
  } | null;
  className?: string;
};

const TIMELINE_STAGES = [
  "DUE_NOTIFIED",
  "REVIEWERS_ASSIGNED",
  "SELF_ASSESSMENT_OPEN",
  "REVIEWER_RATING",
  "MANAGEMENT_REVIEW",
  "MEETING_PENDING",
  "MEETING_LIVE",
  "HIKE_FINALISATION",
  "CLOSED",
] as const;

const KIND_LABEL: Record<string, string> = {
  HR: "HR",
  TL: "Team Lead",
  MANAGER: "Manager",
  MANAGEMENT: "Management",
};

const ACTIVE_BADGE_CLASS =
  "border-[rgba(0,148,140,0.3)] bg-[rgba(0,148,140,0.12)] text-[#005f5a]";
const PENDING_BADGE_CLASS =
  "border-[rgba(112,121,119,0.35)] bg-[rgba(112,121,119,0.08)] text-[#56605e]";
const CURRENT_STEP_GLOW_CLASS =
  "shadow-[0_0_0_4px_rgba(0,206,196,0.14),0_0_22px_rgba(0,206,196,0.18)]";

function cardClassName(className?: string) {
  return [
    "card-top-accent rounded-[24px] border border-outline-variant/35 bg-surface p-5",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatCycleLabel(cycleName?: string, cycleYear?: number) {
  if (!cycleName && !cycleYear) return null;
  if (!cycleName) return String(cycleYear);
  if (!cycleYear) return cycleName;

  const yearText = String(cycleYear);
  return cycleName.includes(yearText) ? cycleName : `${cycleName} ${yearText}`;
}

export function CycleProgressCard({
  stage,
  cycleName,
  cycleYear,
  reviewers = [],
  selfAssessment,
  management,
  meeting,
  className,
}: CycleProgressCardProps) {
  const cycleLabel = formatCycleLabel(cycleName, cycleYear);
  const nonManagementReviewers = reviewers.filter((reviewer) => reviewer.kind !== "MANAGEMENT");
  const availableCount = nonManagementReviewers.filter(
    (reviewer) =>
      reviewer.availabilityStatus === "AVAILABLE" || reviewer.availabilityStatus === "FORCED",
  ).length;
  const submittedRatings = nonManagementReviewers.filter(
    (reviewer) => reviewer.submissionStatus === "SUBMITTED",
  ).length;
  const hasAssignedReviewers = nonManagementReviewers.length > 0;
  const currentTimelineKey =
    stage === "REVIEWERS_ASSIGNED" && hasAssignedReviewers
      ? "SELF_ASSESSMENT_OPEN"
      : stage;
  const currentStageIndex = TIMELINE_STAGES.indexOf(
    currentTimelineKey as (typeof TIMELINE_STAGES)[number],
  );
  const stageBadgeLabel =
    stage === "REVIEWERS_ASSIGNED" && hasAssignedReviewers
      ? "REVIEWER AVAILABILITY"
      : stage.replace(/_/g, " ");

  const timelineItems = [
    {
      key: "REVIEWERS_ASSIGNED",
      title: "Reviewers Assigned",
      description:
        nonManagementReviewers.length > 0
          ? nonManagementReviewers
              .map((reviewer) => KIND_LABEL[reviewer.kind] ?? reviewer.kind)
              .join(" · ")
          : "Reviewer chain is waiting to be assigned",
      icon: CheckCircle2,
    },
    {
      key: "SELF_ASSESSMENT_OPEN",
      title: "Reviewer Availability",
      description:
        nonManagementReviewers.length === 0
          ? "No reviewer confirmations yet"
          : availableCount === nonManagementReviewers.length
            ? "All reviewers confirmed available"
            : `${availableCount} / ${nonManagementReviewers.length} reviewers confirmed`,
      icon: CheckCircle2,
    },
    {
      key: "REVIEWER_RATING",
      title: "Self-Assessment",
      description: selfAssessment?.submittedAt
        ? `Submitted ${new Date(selfAssessment.submittedAt).toLocaleDateString("en-IN")}`
        : "Awaiting employee submission",
      icon: FileText,
    },
    {
      key: "MANAGEMENT_REVIEW",
      title: "Reviewer Ratings",
      description: nonManagementReviewers.length > 0
        ? `${submittedRatings} / ${nonManagementReviewers.length} submitted`
        : "Reviewer scoring not started",
      icon: Star,
    },
    {
      key: "MEETING_PENDING",
      title: "Management Review",
      description: management?.submitted
        ? "Management review submitted"
        : management?.claimedByName
          ? `Claimed by ${management.claimedByName}`
          : "Pending management review",
      icon: Circle,
    },
    {
      key: "MEETING_LIVE",
      title: "Meeting Scheduled",
      description: meeting?.scheduledAt
        ? `Scheduled ${new Date(meeting.scheduledAt).toLocaleDateString("en-IN")}`
        : "Meeting not scheduled yet",
      icon: CalendarDays,
    },
    {
      key: "HIKE_FINALISATION",
      title: "MOM Recorded",
      description: meeting?.hasMinutes
        ? "Minutes captured for the discussion"
        : "Awaiting meeting notes",
      icon: ClipboardList,
    },
  ] as const;

  return (
    <section className={cardClassName(className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="ds-h2 text-on-surface">Cycle Progress</h2>
          {cycleLabel && (
            <p className="text-xs text-on-surface-variant">
              {cycleLabel}
            </p>
          )}
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${ACTIVE_BADGE_CLASS}`}>
          {stageBadgeLabel}
        </span>
      </div>

      <div className="space-y-0">
        {timelineItems.map((item, index) => {
          const stageIndex = TIMELINE_STAGES.indexOf(item.key);
          const isDone = currentStageIndex > stageIndex;
          const isCurrent = currentStageIndex === stageIndex;
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="grid grid-cols-[44px_minmax(0,1fr)] gap-4 pb-5 last:pb-0"
            >
              <div className="relative flex min-h-[54px] justify-center">
                {index < timelineItems.length - 1 ? (
                  <span
                    className={`absolute left-1/2 top-8 bottom-[-20px] w-px -translate-x-1/2 ${
                      isDone || isCurrent ? "bg-[rgba(0,148,140,0.28)]" : "bg-outline-variant/80"
                    }`}
                  />
                ) : null}
                <span
                  className={`relative mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    isDone || isCurrent
                      ? ACTIVE_BADGE_CLASS
                      : PENDING_BADGE_CLASS
                  } ${isCurrent ? `animate-pulse ${CURRENT_STEP_GLOW_CLASS}` : ""}`}
                >
                  {isCurrent ? (
                    <span className="absolute inset-[-6px] rounded-full border border-[#00cec4]/35 animate-ping" />
                  ) : null}
                  <Icon className="relative z-10 size-4" />
                </span>
              </div>
              <div className="min-w-0 pt-1">
                <p
                  className={`text-sm font-semibold ${
                    isDone || isCurrent ? "text-on-surface" : "text-on-surface-variant"
                  }`}
                >
                  {item.title}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    isDone || isCurrent ? "text-on-surface-variant" : "text-on-surface-variant/70"
                  }`}
                >
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
