"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { computeStatutoryBonusPreview, createStatutoryBonusPayrollRun } from "./bonus-payroll";

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function previewStatutoryBonusAction(fiscalYear: string) {
  const session = await auth();
  if (!session?.user?.orgId) return [];
  await requirePermission(session.user.id, "hrms.salary.manage");
  return computeStatutoryBonusPreview(session.user.orgId, fiscalYear);
}

export async function createStatutoryBonusPayrollRunAction(input: {
  fiscalYear: string;
  payDate: string;
  entries: Array<{ employeeId: string; amount: number }>;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");
    await requirePermission(session.user.id, "accounting.integration.post");

    await createStatutoryBonusPayrollRun(orgId, session.user.id, input);

    revalidatePath("/payroll/pay-runs");
    revalidatePath("/payroll");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create bonus payroll run" };
  }
}
