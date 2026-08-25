import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  buildPayrollEmployeeExportCsv,
  buildPayrollLoanExportCsv,
  buildPayrollSalaryComponentExportCsv,
  type PayrollExportLoanRow,
} from "@/modules/payroll/payroll-data-export";

// Payroll Settings — Data Backup / Export (Zoho reference settings_data-backup).
// Follows the same shape as src/app/api/hrms/employees/export/route.ts.
const exportQuerySchema = z.object({
  dataset: z.enum(["employees", "salary-components", "loans"]),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.orgId) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 },
      );
    }

    await requirePermission(session.user.id, "hrms.salary.manage");

    const parsed = exportQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid export query",
          },
        },
        { status: 400 },
      );
    }

    const orgId = session.user.orgId;
    const { dataset } = parsed.data;
    let csv: Buffer;
    let filenameStem: string;

    if (dataset === "employees") {
      const users = await db.user.findMany({
        where: { orgId },
        select: {
          employeeNumber: true,
          name: true,
          email: true,
          designation: true,
          department: { select: { name: true } },
          branch: { select: { name: true } },
          employmentRecord: { select: { ctc: true, joinDate: true } },
        },
        orderBy: { name: "asc" },
      });
      csv = buildPayrollEmployeeExportCsv(users);
      filenameStem = "payroll-employees";
    } else if (dataset === "salary-components") {
      const components = await db.salaryComponent.findMany({
        where: { orgId },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      });
      csv = buildPayrollSalaryComponentExportCsv(components);
      filenameStem = "payroll-salary-components";
    } else {
      const loans = await db.payrollLoan.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
      });
      const employeeIds = [...new Set(loans.map((loan) => loan.employeeId))];
      const employees = await db.user.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, name: true, employeeNumber: true },
      });
      const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
      const rows: PayrollExportLoanRow[] = loans.map((loan) => ({
        loanNumber: loan.loanNumber,
        loanName: loan.loanName,
        status: loan.status,
        principalAmount: loan.principalAmount,
        emiAmount: loan.emiAmount,
        disbursedAt: loan.disbursedAt,
        employeeName: employeeMap.get(loan.employeeId)?.name ?? "Unknown",
        employeeNumber: employeeMap.get(loan.employeeId)?.employeeNumber ?? null,
        notes: loan.notes,
      }));
      csv = buildPayrollLoanExportCsv(rows);
      filenameStem = "payroll-loans";
    }

    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(csv), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filenameStem}-${date}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export payroll data";

    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
