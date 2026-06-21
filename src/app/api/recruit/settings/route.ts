import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { apiError, requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { db } from "@/lib/db";
import { auditRecruit } from "@/modules/recruit/audit";

export async function GET() {
  try {
    if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    await requirePermission(session!.user.id, "recruit.settings.manage");

    const orgId = session!.user.orgId!;
    const settings = await db.recruitSetting.findUnique({ where: { orgId } });
    return ok({ data: settings ?? { orgId, message: "No settings configured yet" } });
  } catch (error) {
    return apiError(error);
  }
}

const updateSchema = z.object({
  candidateNumberFormat: z.string().max(100).optional(),
  applicationNumberFormat: z.string().max(100).optional(),
  retentionDays: z.number().int().min(1).max(3650).optional(),
  consentText: z.string().max(5000).optional().nullable(),
  maxResumeSizeBytes: z.number().int().min(1048576).max(52428800).optional(),
  duplicateCheckEmail: z.boolean().optional(),
  duplicateCheckPhone: z.boolean().optional(),
  duplicateCheckResumeHash: z.boolean().optional(),
  aiProvider: z.string().max(50).optional(),
  aiModel: z.string().max(100).optional(),
  aiPromptVersion: z.string().max(20).optional(),
  automationBatchSize: z.number().int().min(1).max(500).optional(),
  jobSeekerEnabled: z.boolean().optional(),
  shareExpiryDays: z.number().int().min(1).max(90).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    await requirePermission(session!.user.id, "recruit.settings.manage");

    const orgId = session!.user.orgId!;
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return err("Invalid input: " + parsed.error.message);

    const settings = await db.recruitSetting.upsert({
      where: { orgId },
      create: { orgId, ...parsed.data },
      update: parsed.data,
    });

    await auditRecruit({
      orgId,
      actorId: session!.user.id,
      action: "recruit.settings.updated",
      entityType: "RecruitSetting",
      entityId: orgId,
      changedFields: parsed.data as Record<string, unknown>,
      source: "UI",
    });

    return ok({ data: settings });
  } catch (error) {
    return apiError(error);
  }
}
