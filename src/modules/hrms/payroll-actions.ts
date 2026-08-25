"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { approvePayrollRun } from "./payroll";

type ActionResponse = { ok: true; data?: unknown } | { ok: false; error: string };

export async function approvePayrollRunAction(
  monthIso: string,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "hrms.salary.manage");
    await requirePermission(session.user.id, "accounting.integration.post");

    const result = await approvePayrollRun(orgId, session.user.id, monthIso);
    revalidatePath("/hrms/payroll");
    revalidatePath("/payroll");
    revalidatePath("/payroll/pay-runs");
    revalidatePath("/payroll/payments");
    revalidatePath("/payroll/payslips");
    revalidatePath("/accounting/journal-entries");
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to approve payroll run",
    };
  }
}
