// Recruit module shared types and constants.
// Do not import from other modules here to keep Recruit isolated.

export const RECRUIT_JOB_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PUBLISHED",
  "PAUSED",
  "CLOSED",
  "CANCELLED",
  "ARCHIVED",
] as const;
export type RecruitJobStatus = (typeof RECRUIT_JOB_STATUSES)[number];

export const RECRUIT_APP_STAGES = [
  "NEW",
  "RESUME_REVIEW",
  "SCREENING",
  "SHORTLISTED",
  "ASSESSMENT",
  "INTERVIEW",
  "HIRING_MANAGER_REVIEW",
  "OFFER_APPROVAL",
  "OFFER_SENT",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
  "ON_HOLD",
  "ARCHIVED",
] as const;
export type RecruitAppStage = (typeof RECRUIT_APP_STAGES)[number];

export const RECRUIT_APP_STAGES_TERMINAL: RecruitAppStage[] = [
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
  "ARCHIVED",
];

export const RECRUIT_OFFER_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "WITHDRAWN",
  "REVISED",
] as const;
export type RecruitOfferStatus = (typeof RECRUIT_OFFER_STATUSES)[number];

export const RECRUIT_JS_APP_STATUSES = [
  "INTERESTED",
  "SAVED",
  "PREPARING",
  "APPLIED",
  "SCREENING",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "NO_RESPONSE",
  "ARCHIVED",
] as const;
export type RecruitJsAppStatus = (typeof RECRUIT_JS_APP_STATUSES)[number];

// Only these statuses may be shown to a job seeker for an internal application
export const RECRUIT_PUBLIC_STAGE_ALLOWLIST: RecruitAppStage[] = [
  "NEW",
  "SCREENING",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER_SENT",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
];

export const RECRUIT_AUTOMATION_STATUSES = [
  "QUEUED",
  "RUNNING",
  "PARTIALLY_COMPLETED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
] as const;
export type RecruitAutomationStatus = (typeof RECRUIT_AUTOMATION_STATUSES)[number];

export const RECRUIT_EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
] as const;

export const RECRUIT_WORKPLACE_TYPES = ["ONSITE", "HYBRID", "REMOTE"] as const;

export const RECRUIT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export interface RecruitPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RecruitListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  stage?: string;
}

export interface RecruitScreeningOutput {
  overallScore: number;
  mandatorySkillScore: number;
  preferredSkillScore: number;
  experienceScore: number;
  educationScore: number;
  locationScore: number;
  screeningQScore: number;
  matchingEvidence: Record<string, unknown>[];
  missingRequirements: string[];
  uncertainties: string[];
  followUpQuestions: string[];
  summary: string;
}

export interface RecruitJobMatchOutput {
  overallScore: number;
  mandatorySkillMatch: { skill: string; found: boolean }[];
  missingSkills: string[];
  experienceAlignment: string;
  locationAlignment: string;
  employmentTypeAlignment: string;
  compensationAlignment?: string;
  evidence: string[];
  uncertainties: string[];
  suggestedQuestions: string[];
}
