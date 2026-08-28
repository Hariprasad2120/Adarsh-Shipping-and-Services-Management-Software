import { db } from "@/lib/db";

export type ReviewerRoleWeights = { HR: number; TL: number; MANAGER: number };

export type EscalationStep = { afterDays: number; notify: "REVIEWER" | "TL" | "HR" | "ADMIN" };

export type AppraisalSettings = {
  availabilityDeadlineDays: number;
  selfAssessmentWindowDays: number;
  reviewerRatingWindowDays: number;
  dateVotingWindowDays: number;
  arrearBufferDays: number;
  enableDateVoting: boolean;
  enableRatingDisagreement: boolean;
  useRevisedScores: boolean;
  reviewerRoleWeights: ReviewerRoleWeights;
  escalationLadder: EscalationStep[];
  digestDayOfWeek: number; // 0 = Sunday … 6 = Saturday
};

const DEFAULT_WEIGHTS: ReviewerRoleWeights = { HR: 1, TL: 1, MANAGER: 1 };

export const DEFAULT_ESCALATION_LADDER: EscalationStep[] = [
  { afterDays: 1, notify: "REVIEWER" },
  { afterDays: 3, notify: "TL" },
  { afterDays: 5, notify: "HR" },
  { afterDays: 7, notify: "ADMIN" },
];

export const APPRAISAL_SETTINGS_DEFAULTS: AppraisalSettings = {
  availabilityDeadlineDays: 2,
  selfAssessmentWindowDays: 3,
  reviewerRatingWindowDays: 3,
  dateVotingWindowDays: 2,
  arrearBufferDays: 7,
  enableDateVoting: false,
  enableRatingDisagreement: false,
  useRevisedScores: true,
  reviewerRoleWeights: DEFAULT_WEIGHTS,
  escalationLadder: DEFAULT_ESCALATION_LADDER,
  digestDayOfWeek: 1,
};

function coerceWeights(value: unknown): ReviewerRoleWeights {
  const raw = (value ?? {}) as Partial<ReviewerRoleWeights>;
  return {
    HR: Number.isFinite(raw.HR) ? Number(raw.HR) : DEFAULT_WEIGHTS.HR,
    TL: Number.isFinite(raw.TL) ? Number(raw.TL) : DEFAULT_WEIGHTS.TL,
    MANAGER: Number.isFinite(raw.MANAGER) ? Number(raw.MANAGER) : DEFAULT_WEIGHTS.MANAGER,
  };
}

function coerceLadder(value: unknown): EscalationStep[] {
  if (!Array.isArray(value)) return DEFAULT_ESCALATION_LADDER;
  const steps = value
    .map((entry) => entry as Partial<EscalationStep>)
    .filter(
      (entry): entry is EscalationStep =>
        Number.isFinite(entry.afterDays) &&
        (entry.notify === "REVIEWER" || entry.notify === "TL" || entry.notify === "HR" || entry.notify === "ADMIN"),
    )
    .map((entry) => ({ afterDays: Math.max(0, Math.round(entry.afterDays)), notify: entry.notify }))
    .sort((a, b) => a.afterDays - b.afterDays);
  return steps.length > 0 ? steps : DEFAULT_ESCALATION_LADDER;
}

export async function getAppraisalSettings(orgId: string): Promise<AppraisalSettings> {
  const row = await db.orgAppraisalSettings.findUnique({ where: { orgId } });
  if (!row) return APPRAISAL_SETTINGS_DEFAULTS;
  return {
    availabilityDeadlineDays: row.availabilityDeadlineDays ?? APPRAISAL_SETTINGS_DEFAULTS.availabilityDeadlineDays,
    selfAssessmentWindowDays: row.selfAssessmentWindowDays ?? APPRAISAL_SETTINGS_DEFAULTS.selfAssessmentWindowDays,
    reviewerRatingWindowDays: row.reviewerRatingWindowDays ?? APPRAISAL_SETTINGS_DEFAULTS.reviewerRatingWindowDays,
    dateVotingWindowDays: row.dateVotingWindowDays ?? APPRAISAL_SETTINGS_DEFAULTS.dateVotingWindowDays,
    arrearBufferDays: row.arrearBufferDays ?? APPRAISAL_SETTINGS_DEFAULTS.arrearBufferDays,
    enableDateVoting: row.enableDateVoting ?? APPRAISAL_SETTINGS_DEFAULTS.enableDateVoting,
    enableRatingDisagreement: row.enableRatingDisagreement ?? APPRAISAL_SETTINGS_DEFAULTS.enableRatingDisagreement,
    useRevisedScores: row.useRevisedScores ?? APPRAISAL_SETTINGS_DEFAULTS.useRevisedScores,
    reviewerRoleWeights: coerceWeights(row.reviewerRoleWeights),
    escalationLadder: coerceLadder(row.escalationLadder),
    digestDayOfWeek: row.digestDayOfWeek ?? APPRAISAL_SETTINGS_DEFAULTS.digestDayOfWeek,
  };
}

export type AppraisalSettingsInput = Partial<{
  availabilityDeadlineDays: number;
  selfAssessmentWindowDays: number;
  reviewerRatingWindowDays: number;
  dateVotingWindowDays: number;
  arrearBufferDays: number;
  enableDateVoting: boolean;
  enableRatingDisagreement: boolean;
  useRevisedScores: boolean;
  reviewerRoleWeights: ReviewerRoleWeights;
  escalationLadder: EscalationStep[];
  digestDayOfWeek: number;
}>;

export async function upsertAppraisalSettings(orgId: string, data: AppraisalSettingsInput) {
  const update: Record<string, unknown> = { ...data };
  if (data.reviewerRoleWeights) update.reviewerRoleWeights = data.reviewerRoleWeights;
  if (data.escalationLadder) update.escalationLadder = data.escalationLadder;

  return db.orgAppraisalSettings.upsert({
    where: { orgId },
    update,
    create: {
      orgId,
      availabilityDeadlineDays: data.availabilityDeadlineDays ?? APPRAISAL_SETTINGS_DEFAULTS.availabilityDeadlineDays,
      selfAssessmentWindowDays: data.selfAssessmentWindowDays ?? APPRAISAL_SETTINGS_DEFAULTS.selfAssessmentWindowDays,
      reviewerRatingWindowDays: data.reviewerRatingWindowDays ?? APPRAISAL_SETTINGS_DEFAULTS.reviewerRatingWindowDays,
      dateVotingWindowDays: data.dateVotingWindowDays ?? APPRAISAL_SETTINGS_DEFAULTS.dateVotingWindowDays,
      arrearBufferDays: data.arrearBufferDays ?? APPRAISAL_SETTINGS_DEFAULTS.arrearBufferDays,
      enableDateVoting: data.enableDateVoting ?? APPRAISAL_SETTINGS_DEFAULTS.enableDateVoting,
      enableRatingDisagreement: data.enableRatingDisagreement ?? APPRAISAL_SETTINGS_DEFAULTS.enableRatingDisagreement,
      useRevisedScores: data.useRevisedScores ?? APPRAISAL_SETTINGS_DEFAULTS.useRevisedScores,
      reviewerRoleWeights: data.reviewerRoleWeights ?? DEFAULT_WEIGHTS,
      escalationLadder: data.escalationLadder ?? DEFAULT_ESCALATION_LADDER,
      digestDayOfWeek: data.digestDayOfWeek ?? APPRAISAL_SETTINGS_DEFAULTS.digestDayOfWeek,
    },
  });
}
