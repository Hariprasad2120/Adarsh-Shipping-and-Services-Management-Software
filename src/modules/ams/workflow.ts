// AMS appraisal state machine

export type Stage =
  | "DUE_NOTIFIED"
  | "REVIEWERS_ASSIGNED"
  | "SELF_ASSESSMENT_OPEN"
  | "REVIEWER_RATING"
  | "MANAGEMENT_REVIEW"
  | "MEETING_PENDING"
  | "MEETING_LIVE"
  | "HIKE_FINALISATION"
  | "CLOSED";

export type ReviewerKind = "HR" | "TL" | "MANAGER" | "MANAGEMENT";

// Valid transitions: [from, to]
const TRANSITIONS: [Stage, Stage][] = [
  ["DUE_NOTIFIED", "REVIEWERS_ASSIGNED"],
  ["REVIEWERS_ASSIGNED", "SELF_ASSESSMENT_OPEN"],
  ["REVIEWERS_ASSIGNED", "DUE_NOTIFIED"],     // re-assign loop
  ["SELF_ASSESSMENT_OPEN", "REVIEWER_RATING"],
  ["REVIEWER_RATING", "MANAGEMENT_REVIEW"],
  ["MANAGEMENT_REVIEW", "MEETING_PENDING"],
  ["MEETING_PENDING", "MEETING_LIVE"],
  ["MEETING_LIVE", "HIKE_FINALISATION"],
  ["HIKE_FINALISATION", "CLOSED"],
];

export function canTransition(from: Stage, to: Stage): boolean {
  return TRANSITIONS.some(([f, t]) => f === from && t === to);
}

export function assertTransition(from: Stage, to: Stage): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }
}

// Which roles may trigger each transition
export const TRANSITION_PERMISSIONS: Partial<Record<Stage, string>> = {
  REVIEWERS_ASSIGNED: "ams.appraisal.assign_reviewers",
  SELF_ASSESSMENT_OPEN: "ams.appraisal.assign_reviewers",
  REVIEWER_RATING: "ams.appraisal.self_assess",
  MANAGEMENT_REVIEW: "ams.appraisal.review",
  MEETING_PENDING: "ams.appraisal.management_review",
  MEETING_LIVE: "ams.meeting.confirm",
  HIKE_FINALISATION: "ams.meeting.minutes",
  CLOSED: "ams.hike.finalise",
};
