"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function listPtSlabs(orgId: string) {
  return db.payrollStatutoryPtSlab.findMany({
    where: { orgId },
    orderBy: [{ state: "asc" }, { minGross: "asc" }],
  });
}

export async function savePtSlabAction(input: {
  state: string;
  minGross: number;
  maxGross: number | null;
  monthlyAmount: number;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const state = input.state.trim();
    if (!state) return { ok: false, error: "State is required" };
    if (!(input.minGross >= 0)) return { ok: false, error: "Minimum gross must be zero or more" };
    if (input.maxGross != null && input.maxGross <= input.minGross) {
      return { ok: false, error: "Maximum gross must be greater than minimum gross" };
    }
    if (!(input.monthlyAmount >= 0)) return { ok: false, error: "Monthly amount must be zero or more" };

    await db.payrollStatutoryPtSlab.create({
      data: { orgId, state, minGross: input.minGross, maxGross: input.maxGross, monthlyAmount: input.monthlyAmount },
    });

    revalidatePath("/payroll/settings/statutory/pt");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save PT slab" };
  }
}

export async function deletePtSlabAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const slab = await db.payrollStatutoryPtSlab.findFirst({ where: { id, orgId }, select: { id: true } });
    if (!slab) return { ok: false, error: "Slab not found" };
    await db.payrollStatutoryPtSlab.delete({ where: { id: slab.id } });

    revalidatePath("/payroll/settings/statutory/pt");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to delete PT slab" };
  }
}
