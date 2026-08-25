import { db } from "@/lib/db";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { estimateAnnualTax } from "@/modules/payroll/tax-engine";

// v1 simplification (same class as the Bonus module's documented one):
// annualizes the employee's CURRENT monthly gross × 12 rather than summing
// actual historical monthly payroll runs (those aren't stored per-employee
// beyond the current recompute). This is an ESTIMATE for Form 16 Part B,
// not a certified filing computation — label it as such wherever shown.
export async function computeForm16Data(orgId: string, employeeId: string, fiscalYear: string) {
  const [workspace, declaration, org, taxProfile] = await Promise.all([
    getPayrollWorkspaceData(orgId, new Date()),
    db.employeeInvestmentDeclaration.findUnique({
      where: { orgId_employeeId_fiscalYear: { orgId, employeeId, fiscalYear } },
      include: { lines: true },
    }),
    db.organisation.findUnique({ where: { id: orgId }, select: { name: true } }),
    db.payrollOrganisationTaxProfile.findUnique({ where: { orgId } }),
  ]);

  const row = workspace.rows.find((r) => r.employeeId === employeeId);
  if (!row) return null;

  const regime = (declaration?.taxRegime as "OLD" | "NEW" | undefined) ?? "NEW";
  const chapterViaDeductions =
    declaration?.lines.reduce((sum, line) => sum + (line.approvedAmount ?? 0), 0) ?? 0;

  const grossAnnualIncome = Math.round(row.grossMonthly * 12 * 100) / 100;
  const estimate = await estimateAnnualTax(orgId, fiscalYear, regime, grossAnnualIncome, chapterViaDeductions);

  return {
    organisationName: org?.name ?? "Organisation",
    employerPan: taxProfile?.pan ?? null,
    employerTan: taxProfile?.tan ?? null,
    employeeName: row.employeeName,
    employeeNumber: row.employeeNumber,
    fiscalYear,
    estimate,
  };
}
