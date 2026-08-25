import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { PayslipPdfDocument, type PayslipData } from "./payslip-pdf-document";

function maskSuffix(value: string | null | undefined, visibleDigits = 4) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= visibleDigits) return trimmed;
  return `${"*".repeat(Math.max(0, trimmed.length - visibleDigits))}${trimmed.slice(-visibleDigits)}`;
}

// Phase 34-35: real payslip PDF generation using the same calculated pay-run
// row the engine already produces — no separate calculation path.
export async function generatePayslipPdfBuffer(
  orgId: string,
  employeeId: string,
  monthDate: Date,
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const [workspace, employee, org] = await Promise.all([
    getPayrollWorkspaceData(orgId, monthDate),
    db.user.findFirst({ where: { id: employeeId, orgId }, select: { bankAccount: true } }),
    db.organisation.findUnique({ where: { id: orgId }, select: { name: true } }),
  ]);

  const row = workspace.rows.find((r) => r.employeeId === employeeId);
  if (!row) return null;

  const earnings: PayslipData["earnings"] = [
    { label: "Gross Pay (prorated)", amount: row.grossEarnings - row.otAmount - row.incentives - row.reimbursements },
  ].filter((e) => e.amount > 0);
  if (row.otAmount > 0) earnings.push({ label: "Overtime", amount: row.otAmount });
  if (row.incentives > 0) earnings.push({ label: "Incentives", amount: row.incentives });
  if (row.reimbursements > 0) earnings.push({ label: "Reimbursements", amount: row.reimbursements });

  const deductions: PayslipData["deductions"] = [];
  if (row.epfAmount > 0) deductions.push({ label: "EPF", amount: row.epfAmount });
  if (row.esiAmount > 0) deductions.push({ label: "ESI", amount: row.esiAmount });
  if (row.professionalTaxAmount > 0) deductions.push({ label: "Professional Tax", amount: row.professionalTaxAmount });
  if (row.tdsAmount > 0) deductions.push({ label: "TDS", amount: row.tdsAmount });
  if (row.lwfEmployeeAmount > 0) deductions.push({ label: "Labour Welfare Fund", amount: row.lwfEmployeeAmount });
  if (row.loanEmiDeduction > 0) deductions.push({ label: "Loan EMI", amount: row.loanEmiDeduction });

  const data: PayslipData = {
    organisationName: org?.name ?? "Organisation",
    employeeName: row.employeeName,
    employeeNumber: row.employeeNumber,
    designation: row.designation,
    periodLabel: workspace.period.label,
    payableDays: row.payableDays,
    employmentDays: row.employmentDays,
    unpaidLeaveDays: row.unpaidLeaveDays,
    earnings,
    deductions,
    grossEarnings: row.grossEarnings,
    netPay: row.netPay,
    paymentMode: row.paymentMode,
    bankAccountMasked: maskSuffix(employee?.bankAccount),
  };

  const buffer = await renderToBuffer(<PayslipPdfDocument data={data} />);
  return { buffer, fileName: `Payslip-${row.employeeNumber}-${workspace.period.key}.pdf` };
}
