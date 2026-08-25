"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true } | { ok: false; error: string };

const DEFAULTS = {
  enabled: false,
  percent: 8.33,
  eligibilityWageCeiling: 21000,
  calculationWageCeiling: 7000,
};

export async function getBonusConfig(orgId: string) {
  const config = await db.payrollStatutoryBonusConfig.findUnique({ where: { orgId } });
  return config ?? { id: null, orgId, ...DEFAULTS };
}

export async function saveBonusConfigAction(input: {
  enabled: boolean;
  percent: number;
  eligibilityWageCeiling: number;
  calculationWageCeiling: number;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    if (input.percent < 8.33 || input.percent > 20) {
      return { ok: false, error: "Bonus percent must be between the statutory minimum 8.33% and maximum 20%" };
    }

    await db.payrollStatutoryBonusConfig.upsert({
      where: { orgId },
      update: input,
      create: { orgId, ...input },
    });

    revalidatePath("/payroll/settings/organization");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save Bonus configuration" };
  }
}
