"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function listLwfConfigs(orgId: string) {
  return db.payrollStatutoryLwfConfig.findMany({
    where: { orgId },
    orderBy: { state: "asc" },
  });
}

export async function saveLwfConfigAction(input: {
  state: string;
  enabled: boolean;
  employeeAmount: number;
  employerAmount: number;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const state = input.state.trim();
    if (!state) return { ok: false, error: "State is required" };
    if (!(input.employeeAmount >= 0) || !(input.employerAmount >= 0)) {
      return { ok: false, error: "Amounts must be zero or more" };
    }

    await db.payrollStatutoryLwfConfig.upsert({
      where: { orgId_state: { orgId, state } },
      update: { enabled: input.enabled, employeeAmount: input.employeeAmount, employerAmount: input.employerAmount },
      create: { orgId, state, enabled: input.enabled, employeeAmount: input.employeeAmount, employerAmount: input.employerAmount },
    });

    revalidatePath("/payroll/settings/statutory/lwf");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save LWF configuration" };
  }
}

export async function deleteLwfConfigAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const config = await db.payrollStatutoryLwfConfig.findFirst({ where: { id, orgId }, select: { id: true } });
    if (!config) return { ok: false, error: "Configuration not found" };
    await db.payrollStatutoryLwfConfig.delete({ where: { id: config.id } });

    revalidatePath("/payroll/settings/statutory/lwf");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to delete LWF configuration" };
  }
}
