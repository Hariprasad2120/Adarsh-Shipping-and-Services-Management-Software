"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true } | { ok: false; error: string };

// No bank-transfer/payout provider is integrated in this repository
// (docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md, Phase 33). This marks a
// posted off-cycle/termination batch as paid — a real status change, not a
// simulated external transfer. Regular pay-run payment status is tracked via
// PayrollBatch.status set during approval (unchanged by this action).
export async function markPayrollBatchPaidAction(batchId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.integration.post");

    const batch = await db.payrollBatch.findFirst({ where: { id: batchId, orgId } });
    if (!batch) return { ok: false, error: "Pay run not found" };
    if (batch.status === "PAID") return { ok: false, error: "Already marked paid" };

    await db.payrollBatch.update({ where: { id: batchId }, data: { status: "PAID" } });

    revalidatePath("/payroll/pay-runs");
    revalidatePath("/payroll/pay-runs/history");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to mark pay run as paid" };
  }
}
