"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

// Payroll Settings — Loan Custom Fields (Zoho reference
// settings_loan_custom-field_list). This repository already has a generic
// custom-field-definition table — AccountingCustomFieldDefinition — with a
// plain String `scope` discriminator (not a Prisma/DB enum), used today for
// Accounting entities (CUSTOMER, VENDOR, ITEM, SALES_INVOICE, ...). Because
// `scope` is a free-form string, extending it to cover payroll loans needs
// no schema migration: we just add a new scope value, "PAYROLL_LOAN", that
// never collides with the Accounting scopes (their admin UI has its own
// hardcoded dropdown of accounting-only scope values). This reuses the
// existing table rather than duplicating a parallel custom-field model.
const LOAN_SCOPE = "PAYROLL_LOAN";

export type LoanCustomFieldType = "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN";

type ActionResponse = { ok: true } | { ok: false; error: string };

function fieldKey(label: string) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || "field";
}

export async function listLoanCustomFields(orgId: string) {
  return db.accountingCustomFieldDefinition.findMany({
    where: { orgId, scope: LOAN_SCOPE },
    orderBy: [{ position: "asc" }, { label: "asc" }],
  });
}

export async function createLoanCustomFieldAction(input: {
  label: string;
  dataType: LoanCustomFieldType;
  helpText?: string;
  required: boolean;
  active: boolean;
  options: string[];
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const label = input.label.trim();
    if (!label) return { ok: false, error: "Field label is required" };

    const stem = fieldKey(label);
    const existing = await db.accountingCustomFieldDefinition.findMany({
      where: { orgId, scope: LOAN_SCOPE, key: { startsWith: stem } },
      select: { key: true },
    });
    const keys = new Set(existing.map((row) => row.key));
    let key = stem;
    let suffix = 2;
    while (keys.has(key)) {
      key = `${stem}_${suffix}`;
      suffix += 1;
    }

    const count = await db.accountingCustomFieldDefinition.count({
      where: { orgId, scope: LOAN_SCOPE },
    });

    await db.accountingCustomFieldDefinition.create({
      data: {
        orgId,
        scope: LOAN_SCOPE,
        key,
        label,
        dataType: input.dataType,
        helpText: input.helpText?.trim() || null,
        options: input.dataType === "SELECT" ? input.options.filter((option) => option.trim()) : [],
        required: input.required,
        isActive: input.active,
        position: count,
      },
    });

    revalidatePath("/payroll/settings/loan-custom-fields");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create loan custom field",
    };
  }
}

export async function toggleLoanCustomFieldActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const result = await db.accountingCustomFieldDefinition.updateMany({
      where: { id, orgId, scope: LOAN_SCOPE },
      data: { isActive: active, rowVersion: { increment: 1 } },
    });
    if (result.count === 0) return { ok: false, error: "Loan custom field not found" };

    revalidatePath("/payroll/settings/loan-custom-fields");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update loan custom field",
    };
  }
}

export async function deleteLoanCustomFieldAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const result = await db.accountingCustomFieldDefinition.deleteMany({
      where: { id, orgId, scope: LOAN_SCOPE },
    });
    if (result.count === 0) return { ok: false, error: "Loan custom field not found" };

    revalidatePath("/payroll/settings/loan-custom-fields");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete loan custom field",
    };
  }
}
