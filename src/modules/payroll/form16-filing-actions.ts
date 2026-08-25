"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function listForm16Filings(orgId: string, fiscalYear: string) {
  return db.payrollForm16Filing.findMany({ where: { orgId, fiscalYear } });
}

// Not a real e-filing integration — that needs GSP API credentials and
// DSC-signing infrastructure this repo/org doesn't have. This just records
// that the org filed externally, so status is tracked honestly rather than
// silently absent.
export async function markForm16FiledAction(input: {
  employeeId: string;
  fiscalYear: string;
  acknowledgementNumber: string;
  notes?: string;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    if (!input.acknowledgementNumber.trim()) {
      return { ok: false, error: "Acknowledgement number is required to record a filing" };
    }

    await db.payrollForm16Filing.upsert({
      where: { orgId_employeeId_fiscalYear: { orgId, employeeId: input.employeeId, fiscalYear: input.fiscalYear } },
      update: {
        status: "FILED",
        filedAt: new Date(),
        acknowledgementNumber: input.acknowledgementNumber.trim(),
        filedById: session.user.id,
        notes: input.notes?.trim() || null,
      },
      create: {
        orgId,
        employeeId: input.employeeId,
        fiscalYear: input.fiscalYear,
        status: "FILED",
        filedAt: new Date(),
        acknowledgementNumber: input.acknowledgementNumber.trim(),
        filedById: session.user.id,
        notes: input.notes?.trim() || null,
      },
    });

    revalidatePath("/payroll/taxes-and-forms/form16");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to record filing" };
  }
}

export async function markForm16GeneratedAction(employeeId: string, fiscalYear: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    await db.payrollForm16Filing.upsert({
      where: { orgId_employeeId_fiscalYear: { orgId, employeeId, fiscalYear } },
      update: { status: "GENERATED", generatedAt: new Date() },
      create: { orgId, employeeId, fiscalYear, status: "GENERATED", generatedAt: new Date() },
    });

    revalidatePath("/payroll/taxes-and-forms/form16");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to update status" };
  }
}
