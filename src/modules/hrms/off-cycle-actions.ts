"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { createOffCyclePayrollRun, type OffCycleEntryInput } from "./off-cycle-payroll";

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function createOffCyclePayrollRunAction(input: {
  payDate: string;
  reason: string;
  entries: OffCycleEntryInput[];
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");
    await requirePermission(session.user.id, "accounting.integration.post");

    await createOffCyclePayrollRun(orgId, session.user.id, input);

    revalidatePath("/payroll/pay-runs");
    revalidatePath("/payroll");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create off-cycle payroll run" };
  }
}
