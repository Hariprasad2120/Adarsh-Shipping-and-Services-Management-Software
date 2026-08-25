"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true } | { ok: false; error: string };

function currentFiscalYear() {
  const now = new Date();
  const startYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export async function getEmployeeDeclaration(orgId: string, employeeId: string, fiscalYear = currentFiscalYear()) {
  return db.employeeInvestmentDeclaration.findUnique({
    where: { orgId_employeeId_fiscalYear: { orgId, employeeId, fiscalYear } },
    include: { lines: { orderBy: { createdAt: "asc" } } },
  });
}

export async function listPendingDeclarations(orgId: string, fiscalYear = currentFiscalYear()) {
  const declarations = await db.employeeInvestmentDeclaration.findMany({
    where: { orgId, fiscalYear, status: "SUBMITTED" },
    include: { lines: true },
  });
  const employeeIds = declarations.map((d) => d.employeeId);
  const employees = await db.user.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, name: true, employeeNumber: true },
  });
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  return declarations.map((d) => ({
    id: d.id,
    employeeId: d.employeeId,
    employeeName: employeeMap.get(d.employeeId)?.name ?? "Unknown",
    employeeNumber: employeeMap.get(d.employeeId)?.employeeNumber == null ? "-" : String(employeeMap.get(d.employeeId)?.employeeNumber),
    declaredTotal: d.lines.reduce((sum, l) => sum + l.declaredAmount, 0),
    pendingLines: d.lines.filter((l) => l.status === "PENDING").length,
    lines: d.lines.map((l) => ({
      id: l.id,
      category: l.category,
      description: l.description,
      declaredAmount: l.declaredAmount,
      approvedAmount: l.approvedAmount,
      status: l.status,
    })),
  }));
}

export async function countEmployeesYetToSubmit(orgId: string, fiscalYear = currentFiscalYear()) {
  const [totalActive, submitted] = await Promise.all([
    db.user.count({ where: { orgId, active: true } }),
    db.employeeInvestmentDeclaration.count({ where: { orgId, fiscalYear, status: "SUBMITTED" } }),
  ]);
  return Math.max(0, totalActive - submitted);
}

export async function submitDeclarationAction(input: {
  employeeId: string;
  fiscalYear?: string;
  taxRegime?: string;
  lines: { category: string; description?: string; declaredAmount: number }[];
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    // Self-service: an employee submitting their own declaration doesn't
    // need the HR "manage" permission — only submitting on someone else's
    // behalf does.
    if (input.employeeId !== session.user.id) {
      await requirePermission(session.user.id, "hrms.salary.manage");
    }

    const fiscalYear = input.fiscalYear ?? currentFiscalYear();
    const validLines = input.lines.filter((l) => l.category.trim() && l.declaredAmount > 0);
    if (validLines.length === 0) return { ok: false, error: "Add at least one declaration line" };

    const employee = await db.user.findFirst({ where: { id: input.employeeId, orgId }, select: { id: true } });
    if (!employee) return { ok: false, error: "Employee not found" };

    await db.employeeInvestmentDeclaration.upsert({
      where: { orgId_employeeId_fiscalYear: { orgId, employeeId: input.employeeId, fiscalYear } },
      update: {
        taxRegime: input.taxRegime,
        status: "SUBMITTED",
        submittedAt: new Date(),
        lines: { deleteMany: {}, create: validLines },
      },
      create: {
        orgId,
        employeeId: input.employeeId,
        fiscalYear,
        taxRegime: input.taxRegime,
        status: "SUBMITTED",
        submittedAt: new Date(),
        lines: { create: validLines },
      },
    });

    revalidatePath("/payroll/approvals");
    revalidatePath(`/payroll/employees/${input.employeeId}/investments`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to submit declaration" };
  }
}

export async function reviewDeclarationLineAction(input: {
  lineId: string;
  decision: "APPROVED" | "REJECTED" | "PARTIALLY_APPROVED";
  approvedAmount?: number;
  reviewNotes?: string;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const line = await db.employeeInvestmentDeclarationLine.findFirst({
      where: { id: input.lineId, declaration: { orgId } },
      include: { declaration: true },
    });
    if (!line) return { ok: false, error: "Declaration line not found" };

    const approvedAmount =
      input.decision === "REJECTED"
        ? 0
        : input.decision === "APPROVED"
          ? line.declaredAmount
          : Math.min(input.approvedAmount ?? 0, line.declaredAmount);

    await db.employeeInvestmentDeclarationLine.update({
      where: { id: input.lineId },
      data: { status: input.decision, approvedAmount, reviewNotes: input.reviewNotes?.trim() || null },
    });

    revalidatePath("/payroll/approvals");
    revalidatePath(`/payroll/employees/${line.declaration.employeeId}/investments`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to review declaration line" };
  }
}
