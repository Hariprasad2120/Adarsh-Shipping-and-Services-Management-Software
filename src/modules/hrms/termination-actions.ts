"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { createTerminationPayrollRun, type TerminationEntryInput } from "./termination-payroll";

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function createTerminationPayrollRunAction(
  entries: TerminationEntryInput[],
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");
    await requirePermission(session.user.id, "accounting.integration.post");

    await createTerminationPayrollRun(orgId, session.user.id, entries);

    revalidatePath("/payroll/pay-runs");
    revalidatePath("/payroll");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to process settlement" };
  }
}
