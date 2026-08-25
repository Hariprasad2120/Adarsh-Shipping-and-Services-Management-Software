"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

export type SalaryComponentCategory = "EARNING" | "DEDUCTION" | "BENEFIT" | "REIMBURSEMENT";
export type CalculationType = "FIXED_FLAT" | "FIXED_PERCENT" | "VARIABLE_FLAT" | "VARIABLE_PERCENT";

// Phase 7: standard components seen in the captured Zoho Earnings tab
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00106). Loaded on
// demand per org rather than baked into a migration, so no tenant gets rows
// they didn't ask for.
const STANDARD_COMPONENTS: Array<{
  category: SalaryComponentCategory;
  name: string;
  componentType: string;
  calculationType: CalculationType;
  considerForEpf: boolean;
  considerForEsi: boolean;
}> = [
  { category: "EARNING", name: "Basic", componentType: "Basic", calculationType: "FIXED_FLAT", considerForEpf: true, considerForEsi: true },
  { category: "EARNING", name: "House Rent Allowance", componentType: "House Rent Allowance", calculationType: "FIXED_FLAT", considerForEpf: false, considerForEsi: true },
  { category: "EARNING", name: "Conveyance Allowance", componentType: "Conveyance Allowance", calculationType: "FIXED_FLAT", considerForEpf: true, considerForEsi: false },
  { category: "EARNING", name: "Transport Allowance", componentType: "Transport Allowance", calculationType: "FIXED_FLAT", considerForEpf: true, considerForEsi: true },
  { category: "EARNING", name: "Travelling Allowance", componentType: "Travelling Allowance", calculationType: "FIXED_FLAT", considerForEpf: true, considerForEsi: false },
  { category: "EARNING", name: "Fixed Allowance", componentType: "Fixed Allowance", calculationType: "FIXED_FLAT", considerForEpf: true, considerForEsi: true },
  { category: "EARNING", name: "Overtime", componentType: "Overtime Allowance", calculationType: "VARIABLE_FLAT", considerForEpf: false, considerForEsi: false },
  { category: "EARNING", name: "Incentives", componentType: "Custom Allowance", calculationType: "VARIABLE_FLAT", considerForEpf: false, considerForEsi: false },
  { category: "DEDUCTION", name: "Employee PF", componentType: "Provident Fund", calculationType: "FIXED_PERCENT", considerForEpf: true, considerForEsi: false },
  { category: "DEDUCTION", name: "Employee ESI", componentType: "ESI", calculationType: "FIXED_PERCENT", considerForEpf: false, considerForEsi: true },
  { category: "DEDUCTION", name: "Professional Tax", componentType: "Professional Tax", calculationType: "FIXED_FLAT", considerForEpf: false, considerForEsi: false },
  { category: "DEDUCTION", name: "TDS", componentType: "Income Tax", calculationType: "VARIABLE_FLAT", considerForEpf: false, considerForEsi: false },
  { category: "BENEFIT", name: "Employer PF Contribution", componentType: "Provident Fund", calculationType: "FIXED_PERCENT", considerForEpf: true, considerForEsi: false },
  { category: "BENEFIT", name: "Employer ESI Contribution", componentType: "ESI", calculationType: "FIXED_PERCENT", considerForEpf: false, considerForEsi: true },
  { category: "REIMBURSEMENT", name: "Fuel Reimbursement", componentType: "Custom Reimbursement", calculationType: "VARIABLE_FLAT", considerForEpf: false, considerForEsi: false },
];

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function seedStandardSalaryComponentsAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    await db.$transaction(
      STANDARD_COMPONENTS.map((component, index) =>
        db.salaryComponent.upsert({
          where: { orgId_category_name: { orgId, category: component.category, name: component.name } },
          update: {},
          create: { orgId, sortOrder: index, ...component },
        }),
      ),
    );

    revalidatePath("/payroll/settings/salary-components");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to load standard components" };
  }
}

export async function createSalaryComponentAction(input: {
  category: SalaryComponentCategory;
  name: string;
  componentType: string;
  calculationType: CalculationType;
  considerForEpf: boolean;
  considerForEsi: boolean;
  includeInCtc: boolean;
  taxable: boolean;
  fbpEligible?: boolean;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Component name is required" };

    const count = await db.salaryComponent.count({ where: { orgId, category: input.category } });
    await db.salaryComponent.create({
      data: { orgId, sortOrder: count, ...input, name },
    });

    revalidatePath("/payroll/settings/salary-components");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create component" };
  }
}

export async function toggleSalaryComponentActiveAction(
  componentId: string,
  active: boolean,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const component = await db.salaryComponent.findFirst({ where: { id: componentId, orgId } });
    if (!component) return { ok: false, error: "Component not found" };

    await db.salaryComponent.update({ where: { id: componentId }, data: { active } });
    revalidatePath("/payroll/settings/salary-components");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to update component" };
  }
}

export async function toggleFbpEligibleAction(componentId: string, fbpEligible: boolean): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const component = await db.salaryComponent.findFirst({ where: { id: componentId, orgId, category: "REIMBURSEMENT" } });
    if (!component) return { ok: false, error: "Reimbursement component not found" };

    await db.salaryComponent.update({ where: { id: componentId }, data: { fbpEligible } });
    revalidatePath("/payroll/settings/salary-components");
    revalidatePath("/payroll/settings/fbp");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to update component" };
  }
}

export async function listSalaryComponents(orgId: string) {
  return db.salaryComponent.findMany({
    where: { orgId },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}
