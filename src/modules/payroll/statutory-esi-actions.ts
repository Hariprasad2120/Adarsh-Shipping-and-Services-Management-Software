"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true } | { ok: false; error: string };

const DEFAULTS = {
  enabled: false,
  employeeContributionPercent: 0.75,
  employerContributionPercent: 3.25,
  wageCeiling: 21000,
};

export async function getEsiConfig(orgId: string) {
  const config = await db.payrollStatutoryEsiConfig.findUnique({ where: { orgId } });
  return config ?? { id: null, orgId, ...DEFAULTS };
}

export async function saveEsiConfigAction(input: {
  enabled: boolean;
  employeeContributionPercent: number;
  employerContributionPercent: number;
  wageCeiling: number;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    await db.payrollStatutoryEsiConfig.upsert({
      where: { orgId },
      update: input,
      create: { orgId, ...input },
    });

    revalidatePath("/payroll/settings/organization");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save ESI configuration" };
  }
}
