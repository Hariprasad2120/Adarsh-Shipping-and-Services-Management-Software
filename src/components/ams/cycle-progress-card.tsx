"use client";

import {
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
};

function describeAssignedReviewers(reviewers: ProgressReviewer[]) {
  if (reviewers.length === 0) {
    return "Reviewer chain is waiting to be assigned";
  }

  const roleList = reviewers
    .map((reviewer) => KIND_LABEL[reviewer.kind] ?? reviewer.kind)
    .filter((value, index, array) => array.indexOf(value) === index);

  return `${reviewers.length} reviewer${reviewers.length === 1 ? "" : "s"} assigned${roleList.length ? ` · ${roleList.join(", ")}` : ""}`;
}

type ProgressReviewer = {
  kind: string;
  name?: string | null;
  availabilityStatus: string;
  submissionStatus?: string | null;
};

export function CycleProgressCard({
  className,
  stage,
  reviewers,
  selfAssessmentSubmittedAt,
  managementReviewCount,
  meetingScheduledAt,
  meetingMinutesCount,
}: {
  className?: string;
  stage: string;
  reviewers: ProgressReviewer[];
  selfAssessmentSubmittedAt?: string | null;
  managementReviewCount?: number;
  meetingScheduledAt?: string | null;
  meetingMinutesCount?: number;
}) {
  const activeIndex = TIMELINE_STAGES.indexOf(stage as (typeof TIMELINE_STAGES)[number]);
  const nonManagementReviewers = reviewers.filter((reviewer) => reviewer.kind !== "MANAGEMENT");
  const availableCount = nonManagementReviewers.filter(
    (reviewer) => reviewer.availabilityStatus === "AVAILABLE" || reviewer.availabilityStatus === "FORCED",
  ).length;
  const submittedRatings = nonManagementReviewers.filter(
    (reviewer) => reviewer.submissionStatus === "SUBMITTED",
  ).length;
  const totalRatings = nonManagementReviewers.length;

  const timelineItems = [
    {
      id: "reviewers-assigned",
      key: "REVIEWERS_ASSIGNED",
      title: "Reviewers Assigned",
      description: describeAssignedReviewers(nonManagementReviewers),
      icon: CheckCircle2,
    },
    {
      id: "availability-confirmed",
      key: "SELF_ASSESSMENT_OPEN",
      title: "Reviewer Availability Confirmed",
      description:
        nonManagementReviewers.length === 0
          ? "No reviewer confirmations yet"
          : availableCount === nonManagementReviewers.length
            ? "All reviewers confirmed available"
            : `${availableCount} / ${nonManagementReviewers.length} reviewers confirmed`,
      icon: CheckCircle2,
    },
    {
      id: "self-assessment",
      key: "SELF_ASSESSMENT_OPEN",
      title: "Self-Assessment",
      description: selfAssessmentSubmittedAt
        ? `Submitted ${new Date(selfAssessmentSubmittedAt).toLocaleDateString("en-IN")}`
        : "Awaiting employee submission",
      icon: FileText,
    },
    {
      id: "reviewer-ratings",
      key: "REVIEWER_RATING",
      title: "Reviewer Ratings",
      description: `${submittedRatings} / ${Math.max(totalRatings, 1)} submitted`,
      icon: Star,
    },
    {
      id: "management-decision",
      key: "MANAGEMENT_REVIEW",
      title: "Management Decision",
      description:
        (managementReviewCount ?? 0) > 0 ? "Management review submitted" : "Pending management review",
      icon: Circle,
    },
    {
      id: "meeting-scheduled",
      key: "MEETING_PENDING",
      title: "Meeting Scheduled",
      description: meetingScheduledAt
        ? `Scheduled ${new Date(meetingScheduledAt).toLocaleDateString("en-IN")}`
        : "Tentative dates not yet proposed",
      icon: CalendarDays,
    },
    {
      id: "mom-recorded",
      key: "MEETING_LIVE",
      title: "MOM Recorded",
      description: (meetingMinutesCount ?? 0) > 0 ? "Minutes captured for the discussion" : "Awaiting meeting",
      icon: ClipboardList,
    },
  ] as const;

  const currentItemIndex = timelineItems.reduce((lastMatch, item, index) => (
    TIMELINE_STAGES.indexOf(item.key) === activeIndex ? index : lastMatch
  ), -1);

  return (
    <Card className={cn("card-top-accent h-full", className)}>
      <CardHeader>
        <CardTitle>Cycle Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {timelineItems.map((item, index) => {
          const stageIndex = TIMELINE_STAGES.indexOf(item.key);
          const isCurrent = index === currentItemIndex;
          const isDone = activeIndex > stageIndex || (activeIndex === stageIndex && index < currentItemIndex);
          const Icon = item.icon;

          return (
            <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="relative flex w-8 shrink-0 justify-center">
                {index < timelineItems.length - 1 ? (
                  <span className="absolute top-9 h-[calc(100%-0.25rem)] w-px bg-outline-variant" />
                ) : null}
                <span
                  className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    isCurrent
                      ? "border-[#00cec4] bg-[#00cec4]/10 text-[#008b85] shadow-[0_0_0_4px_rgba(0,206,196,0.12)] animate-pulse"
                      : isDone
                        ? "border-[#00cec4] text-[#00cec4]"
                      : "border-outline-variant text-on-surface-variant/40"
                  }`}
                >
                  {isCurrent ? (
                    <span className="absolute inset-[-6px] rounded-full border border-[#00cec4]/35 animate-ping" />
                  ) : null}
                  <Icon className="size-4" />
                </span>
              </div>
              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-sm font-semibold uppercase tracking-[0.04em] ${
                    isCurrent
                      ? "text-[#008b85]"
                      : isDone
                        ? "text-on-surface"
                        : "text-on-surface-variant/60"
                  }`}
                >
                  {item.title}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    isCurrent
                      ? "text-on-surface"
                      : isDone
                        ? "text-on-surface-variant"
                        : "text-on-surface-variant/60"
                  }`}
                >
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
