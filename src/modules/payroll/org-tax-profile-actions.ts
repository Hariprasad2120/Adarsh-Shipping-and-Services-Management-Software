"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function getPayrollOrgTaxProfile(orgId: string) {
  return db.payrollOrganisationTaxProfile.findUnique({ where: { orgId } });
}

export async function savePayrollOrgTaxProfileAction(input: {
  pan: string;
  tan: string;
  tdsCircleAoCode: string;
  taxPaymentFrequency: string;
  deductorType: "EMPLOYEE" | "NON_EMPLOYEE";
  deductorName: string;
  deductorFatherName: string;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const pan = input.pan.trim().toUpperCase();
    if (pan && !PAN_REGEX.test(pan)) {
      return { ok: false, error: "PAN must be in the format AAAAA0000A" };
    }

    await db.payrollOrganisationTaxProfile.upsert({
      where: { orgId },
      update: {
        pan: pan || null,
        tan: input.tan.trim() || null,
        tdsCircleAoCode: input.tdsCircleAoCode.trim() || null,
        taxPaymentFrequency: input.taxPaymentFrequency.trim() || null,
        deductorType: input.deductorType,
        deductorName: input.deductorName.trim() || null,
        deductorFatherName: input.deductorFatherName.trim() || null,
      },
      create: {
        orgId,
        pan: pan || null,
        tan: input.tan.trim() || null,
        tdsCircleAoCode: input.tdsCircleAoCode.trim() || null,
        taxPaymentFrequency: input.taxPaymentFrequency.trim() || null,
        deductorType: input.deductorType,
        deductorName: input.deductorName.trim() || null,
        deductorFatherName: input.deductorFatherName.trim() || null,
      },
    });

    revalidatePath("/payroll/settings/organization");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save tax details" };
  }
}
