"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true; data?: unknown } | { ok: false; error: string };

export async function listSalaryTemplates(orgId: string) {
  return db.salaryTemplate.findMany({
    where: { orgId },
    include: { components: { include: { salaryComponent: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });
}

export async function getSalaryTemplate(orgId: string, templateId: string) {
  return db.salaryTemplate.findFirst({
    where: { id: templateId, orgId },
    include: { components: { include: { salaryComponent: true }, orderBy: { sortOrder: "asc" } } },
  });
}

export async function createSalaryTemplateAction(input: {
  name: string;
  description: string;
  components: { salaryComponentId: string; monthlyAmount: number }[];
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Template name is required" };
    if (input.components.length === 0) return { ok: false, error: "Add at least one component" };

    const template = await db.salaryTemplate.create({
      data: {
        orgId,
        name,
        description: input.description.trim() || null,
        components: {
          create: input.components.map((c, index) => ({
            salaryComponentId: c.salaryComponentId,
            monthlyAmount: c.monthlyAmount,
            sortOrder: index,
          })),
        },
      },
    });

    revalidatePath("/payroll/settings/salary-templates");
    return { ok: true, data: { id: template.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create template" };
  }
}

export async function duplicateSalaryTemplateAction(templateId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const source = await db.salaryTemplate.findFirst({
      where: { id: templateId, orgId },
      include: { components: true },
    });
    if (!source) return { ok: false, error: "Template not found" };

    let copyName = `${source.name} (Copy)`;
    let suffix = 2;
    while (await db.salaryTemplate.findUnique({ where: { orgId_name: { orgId, name: copyName } } })) {
      copyName = `${source.name} (Copy ${suffix})`;
      suffix += 1;
    }

    await db.salaryTemplate.create({
      data: {
        orgId,
        name: copyName,
        description: source.description,
        components: {
          create: source.components.map((c) => ({
            salaryComponentId: c.salaryComponentId,
            monthlyAmount: c.monthlyAmount,
            sortOrder: c.sortOrder,
          })),
        },
      },
    });

    revalidatePath("/payroll/settings/salary-templates");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to duplicate template" };
  }
}

export async function deleteSalaryTemplateAction(templateId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const template = await db.salaryTemplate.findFirst({ where: { id: templateId, orgId } });
    if (!template) return { ok: false, error: "Template not found" };

    await db.salaryTemplate.delete({ where: { id: templateId } });
    revalidatePath("/payroll/settings/salary-templates");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to delete template" };
  }
}

const COMPONENT_FIELD_MAP: Record<string, "basic" | "hra" | "conveyance" | "transport" | "travelling" | "fixedAllowance" | "stipend"> = {
  Basic: "basic",
  "House Rent Allowance": "hra",
  "Conveyance Allowance": "conveyance",
  "Transport Allowance": "transport",
  "Travelling Allowance": "travelling",
  "Fixed Allowance": "fixedAllowance",
  Stipend: "stipend",
};

// Assigns a template's earning components onto an employee's EmploymentRecord.
// Only components that map to a real compensation column are applied —
// unmapped custom earnings are stored in payrollMeta.breakup so no data is
// silently dropped.
export async function assignSalaryTemplateToEmployeeAction(
  templateId: string,
  employeeId: string,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const template = await db.salaryTemplate.findFirst({
      where: { id: templateId, orgId },
      include: { components: { include: { salaryComponent: true } } },
    });
    if (!template) return { ok: false, error: "Template not found" };

    const employee = await db.user.findFirst({
      where: { id: employeeId, orgId },
      select: { employmentRecord: { select: { payrollMeta: true } } },
    });
    if (!employee?.employmentRecord) {
      return { ok: false, error: "Employee has no HRMS employment record yet" };
    }

    const columnUpdates: Record<string, number> = {};
    const customEarnings: Record<string, number> = {};

    for (const item of template.components) {
      if (item.salaryComponent.category !== "EARNING") continue;
      const column = COMPONENT_FIELD_MAP[item.salaryComponent.name];
      if (column) {
        columnUpdates[column] = (columnUpdates[column] ?? 0) + item.monthlyAmount;
      } else {
        customEarnings[item.salaryComponent.name] = item.monthlyAmount;
      }
    }

    const totalMonthly = template.components
      .filter((c) => c.salaryComponent.category === "EARNING")
      .reduce((sum, c) => sum + c.monthlyAmount, 0);

    const existingMeta = (employee.employmentRecord.payrollMeta ?? {}) as Record<string, unknown>;

    await db.employmentRecord.update({
      where: { userId: employeeId },
      data: {
        ...columnUpdates,
        ctc: totalMonthly * 12,
        payrollMeta: {
          ...existingMeta,
          templateId: template.id,
          templateName: template.name,
          customEarnings,
        },
      },
    });

    revalidatePath(`/payroll/employees/${employeeId}`);
    revalidatePath(`/payroll/employees/${employeeId}/salary-details`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to assign template" };
  }
}
