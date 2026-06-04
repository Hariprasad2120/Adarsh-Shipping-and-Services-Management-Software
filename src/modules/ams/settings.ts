import { db } from "@/lib/db";

export type ReviewerRoleWeights = { HR: number; TL: number; MANAGER: number };

export type AppraisalSettings = {
  availabilityDeadlineDays: number;
  reviewerRoleWeights: ReviewerRoleWeights;
};

const DEFAULT_WEIGHTS: ReviewerRoleWeights = { HR: 1, TL: 1, MANAGER: 1 };

export async function getAppraisalSettings(orgId: string): Promise<AppraisalSettings> {
  const row = await db.orgAppraisalSettings.findUnique({ where: { orgId } });
  return {
    availabilityDeadlineDays: row?.availabilityDeadlineDays ?? 2,
    reviewerRoleWeights: (row?.reviewerRoleWeights as ReviewerRoleWeights | null) ?? DEFAULT_WEIGHTS,
  };
}

export async function upsertAppraisalSettings(
  orgId: string,
  data: Partial<{ availabilityDeadlineDays: number; reviewerRoleWeights: ReviewerRoleWeights }>,
) {
  return db.orgAppraisalSettings.upsert({
    where: { orgId },
    update: data,
    create: { orgId, availabilityDeadlineDays: 2, ...data },
  });
}
