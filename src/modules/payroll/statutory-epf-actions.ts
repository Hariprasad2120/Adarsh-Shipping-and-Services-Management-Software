"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true } | { ok: false; error: string };

const DEFAULTS = {
  enabled: true,
  epfNumber: null as string | null,
  deductionCycle: "MONTHLY",
  employeeContributionPercent: 12,
  employerContributionPercent: 12,
  restrictToWageCeiling: true,
  wageCeiling: 15000,
  includeEmployerPfInCtc: true,
  includeEdliInCtc: true,
  includeAdminChargesInCtc: true,
  allowEmployeeOverride: false,
  prorateRestrictedWage: true,
  considerLopForApplicability: false,
  eligibleForAbry: false,
};

export async function getEpfConfig(orgId: string) {
  const config = await db.payrollStatutoryEpfConfig.findUnique({ where: { orgId } });
  return config ?? { id: null, orgId, ...DEFAULTS };
}

export async function saveEpfConfigAction(input: {
  enabled: boolean;
  epfNumber: string;
  deductionCycle: string;
  employeeContributionPercent: number;
  employerContributionPercent: number;
  restrictToWageCeiling: boolean;
  wageCeiling: number;
  includeEmployerPfInCtc: boolean;
  includeEdliInCtc: boolean;
  includeAdminChargesInCtc: boolean;
  allowEmployeeOverride: boolean;
  prorateRestrictedWage: boolean;
  considerLopForApplicability: boolean;
  eligibleForAbry: boolean;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const data = { ...input, epfNumber: input.epfNumber.trim() || null };
    await db.payrollStatutoryEpfConfig.upsert({
      where: { orgId },
      update: data,
      create: { orgId, ...data },
    });

    revalidatePath("/payroll/settings/organization");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save EPF configuration" };
  }
}
