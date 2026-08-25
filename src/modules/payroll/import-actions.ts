"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type PayrollImportRow = {
  employeeNumber: string;
  ctc?: string;
  basic?: string;
  hra?: string;
  conveyance?: string;
  transport?: string;
  travelling?: string;
  fixedAllowance?: string;
  paymentMode?: string;
  bankName?: string;
  bankAccount?: string;
  ifsc?: string;
  pan?: string;
  uan?: string;
};

export type PayrollImportRowResult = {
  employeeNumber: string;
  status: "IMPORTED" | "SKIPPED" | "ERROR";
  message: string;
};

export type PayrollImportResult = {
  imported: number;
  skipped: number;
  errors: number;
  rows: PayrollImportRowResult[];
};

// Phase 6: this is a Payroll *enrichment* import — it never creates a new
// employee. Canonical employee creation belongs to HRMS (see
// /admin/data-tools for that bulk onboarding import). This only writes
// payroll-owned fields (compensation breakup, payment/tax identity) onto an
// existing EmploymentRecord/User, matched by employee number.
// docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md, section 1.
function toNumber(value: string | undefined) {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

// "skip" only fills fields that aren't already configured; "overwrite"
// replaces with the file value whenever the file provides one.
function resolveNumeric(
  duplicateMode: "skip" | "overwrite",
  fileValue: string | undefined,
  currentValue: number | null,
) {
  const parsed = toNumber(fileValue);
  if (parsed === undefined) return undefined;
  if (duplicateMode === "overwrite") return parsed;
  return currentValue == null || currentValue === 0 ? parsed : undefined;
}

function resolveText(
  duplicateMode: "skip" | "overwrite",
  fileValue: string | undefined,
  currentValue: string | null | undefined,
) {
  const trimmed = fileValue?.trim();
  if (!trimmed) return undefined;
  if (duplicateMode === "overwrite") return trimmed;
  return currentValue ? undefined : trimmed;
}

export async function importPayrollEmployeeDataAction(
  rows: PayrollImportRow[],
  duplicateMode: "skip" | "overwrite",
): Promise<{ ok: true; data: PayrollImportResult } | { ok: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "hrms.salary.manage");

    if (rows.length === 0) {
      return { ok: false, error: "No rows to import" };
    }
    if (rows.length > 2000) {
      return { ok: false, error: "Import file is too large (max 2000 rows)" };
    }

    const results: PayrollImportRowResult[] = [];

    for (const row of rows) {
      const employeeNumber = row.employeeNumber?.trim();
      if (!employeeNumber) {
        results.push({ employeeNumber: "", status: "ERROR", message: "Missing employee number" });
        continue;
      }

      const numeric = Number(employeeNumber);
      if (!Number.isFinite(numeric)) {
        results.push({ employeeNumber, status: "ERROR", message: "Employee number must be numeric" });
        continue;
      }

      const user = await db.user.findFirst({
        where: { orgId, employeeNumber: numeric },
        select: {
          id: true,
          employmentRecord: {
            select: {
              id: true,
              payrollMeta: true,
              ctc: true,
              basic: true,
              hra: true,
              conveyance: true,
              transport: true,
              travelling: true,
              fixedAllowance: true,
            },
          },
        },
      });

      if (!user) {
        results.push({ employeeNumber, status: "ERROR", message: "No matching employee found in HRMS" });
        continue;
      }
      if (!user.employmentRecord) {
        results.push({
          employeeNumber,
          status: "ERROR",
          message: "Employee has no HRMS employment record yet — set join date in HRMS first",
        });
        continue;
      }

      const existing = user.employmentRecord;
      const existingMeta = (existing.payrollMeta ?? {}) as Record<string, unknown>;

      const resolvedPaymentMode = resolveText(
        duplicateMode,
        row.paymentMode,
        existingMeta.paymentMode as string | undefined,
      );
      const nextMeta = resolvedPaymentMode
        ? { ...existingMeta, paymentMode: resolvedPaymentMode }
        : existingMeta;

      const userRow = await db.user.findUnique({
        where: { id: user.id },
        select: { bankName: true, bankAccount: true, ifsc: true, pan: true, uan: true },
      });

      await db.$transaction([
        db.employmentRecord.update({
          where: { userId: user.id },
          data: {
            ctc: resolveNumeric(duplicateMode, row.ctc, existing.ctc),
            basic: resolveNumeric(duplicateMode, row.basic, existing.basic),
            hra: resolveNumeric(duplicateMode, row.hra, existing.hra),
            conveyance: resolveNumeric(duplicateMode, row.conveyance, existing.conveyance),
            transport: resolveNumeric(duplicateMode, row.transport, existing.transport),
            travelling: resolveNumeric(duplicateMode, row.travelling, existing.travelling),
            fixedAllowance: resolveNumeric(duplicateMode, row.fixedAllowance, existing.fixedAllowance),
            payrollMeta: nextMeta as Prisma.InputJsonValue,
          },
        }),
        db.user.update({
          where: { id: user.id },
          data: {
            bankName: resolveText(duplicateMode, row.bankName, userRow?.bankName),
            bankAccount: resolveText(duplicateMode, row.bankAccount, userRow?.bankAccount),
            ifsc: resolveText(duplicateMode, row.ifsc, userRow?.ifsc),
            pan: resolveText(duplicateMode, row.pan, userRow?.pan),
            uan: resolveText(duplicateMode, row.uan, userRow?.uan),
          },
        }),
      ]);

      results.push({ employeeNumber, status: "IMPORTED", message: "Compensation updated" });
    }

    revalidatePath("/payroll/employees");
    revalidatePath("/payroll/compensation");
    revalidatePath("/payroll");

    return {
      ok: true,
      data: {
        imported: results.filter((r) => r.status === "IMPORTED").length,
        skipped: results.filter((r) => r.status === "SKIPPED").length,
        errors: results.filter((r) => r.status === "ERROR").length,
        rows: results,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to import payroll data",
    };
  }
}
