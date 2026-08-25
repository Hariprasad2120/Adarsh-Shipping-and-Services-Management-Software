"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { employeeHrmsProfileDataSchema } from "@/modules/hrms/employee-profile";

type ActionResponse = { ok: true } | { ok: false; error: string };

// Phase 5 follow-up: Payroll "Edit Personal Details" (Zoho reference page
// 00138). Father's Name, Differently Abled Type, Personal Email, and
// Residential Address all live on EmployeeHrmsProfile.data — the SAME JSON
// record the HRMS employee profile screen edits (src/modules/hrms/employee-profile.ts)
// — so this action merges into that record rather than creating a second,
// payroll-only copy of the same data. DOB and PAN are intentionally not
// accepted here: they are HRMS-synced and edited from the HRMS profile.
const personalDetailsSchema = z.object({
  employeeId: z.string().trim().min(1),
  fatherName: z.string().trim().max(200).default(""),
  differentlyAbledType: z.string().trim().max(100).default(""),
  personalEmail: z.union([z.literal(""), z.email()]).default(""),
  presentAddress: z.string().trim().max(2000).default(""),
  presentStateCode: z.string().trim().max(100).default(""),
});

export type PersonalDetailsInput = z.infer<typeof personalDetailsSchema>;

export async function updatePayrollEmployeePersonalDetailsAction(
  input: PersonalDetailsInput,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const parsed = personalDetailsSchema.parse(input);
    if (!parsed.fatherName) {
      return { ok: false, error: "Father's Name is required" };
    }

    const employee = await db.user.findFirst({
      where: { id: parsed.employeeId, orgId },
      select: { id: true, employeeProfile: { select: { data: true } } },
    });
    if (!employee) return { ok: false, error: "Employee not found" };

    const existingData = employeeHrmsProfileDataSchema.parse(
      employee.employeeProfile?.data ?? {},
    );
    const mergedData = {
      ...existingData,
      fatherName: parsed.fatherName,
      differentlyAbledType: parsed.differentlyAbledType,
      personalEmail: parsed.personalEmail,
      presentAddress: parsed.presentAddress,
      presentStateCode: parsed.presentStateCode,
    };

    await db.employeeHrmsProfile.upsert({
      where: { userId: parsed.employeeId },
      update: {
        data: mergedData as unknown as Prisma.InputJsonValue,
        modifiedById: session.user.id,
      },
      create: {
        userId: parsed.employeeId,
        data: mergedData as unknown as Prisma.InputJsonValue,
        customValues: {},
        createdById: session.user.id,
        modifiedById: session.user.id,
      },
    });

    revalidatePath(`/payroll/employees/${parsed.employeeId}`);
    revalidatePath(`/payroll/employees/${parsed.employeeId}/edit-personal-details`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save personal details",
    };
  }
}

// Phase 5 follow-up: Payroll "Edit Statutory Details" (Zoho reference page
// 00139). PF Account Number, UAN, "Contribute to EPS", ESI Insurance
// Number, and the Professional Tax opt-in are genuinely new payroll-owned
// columns on User (see prisma/migrations/20260825150000_payroll_employee_personal_statutory_fields).
const statutoryDetailsSchema = z.object({
  employeeId: z.string().trim().min(1),
  pfAccountNumber: z.string().trim().max(50).default(""),
  uan: z.string().trim().max(20).default(""),
  contributeToEps: z.boolean().default(true),
  esiInsuranceNumber: z.string().trim().max(50).default(""),
  professionalTaxOptIn: z.boolean().default(true),
});

export type StatutoryDetailsInput = z.infer<typeof statutoryDetailsSchema>;

export async function updatePayrollEmployeeStatutoryDetailsAction(
  input: StatutoryDetailsInput,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const parsed = statutoryDetailsSchema.parse(input);

    const employee = await db.user.findFirst({
      where: { id: parsed.employeeId, orgId },
      select: { id: true },
    });
    if (!employee) return { ok: false, error: "Employee not found" };

    await db.user.update({
      where: { id: parsed.employeeId },
      data: {
        pfAccountNumber: parsed.pfAccountNumber || null,
        uan: parsed.uan || null,
        contributeToEps: parsed.contributeToEps,
        esiInsuranceNumber: parsed.esiInsuranceNumber || null,
        professionalTaxOptIn: parsed.professionalTaxOptIn,
      },
    });

    revalidatePath(`/payroll/employees/${parsed.employeeId}`);
    revalidatePath(`/payroll/employees/${parsed.employeeId}/edit-statutory-details`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save statutory details",
    };
  }
}
