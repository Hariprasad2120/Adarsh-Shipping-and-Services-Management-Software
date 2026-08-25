// Direct execution of the payroll test assertions via tsx, bypassing the
// vitest staging-DB guard (calculatePayrollEmployeeRow is a pure function —
// no DB access needed to verify it). Run: npx tsx scripts/payroll-calc-smoketest.ts
import { calculatePayrollEmployeeRow } from "../src/modules/hrms/payroll";
import { normalizeRevision } from "../src/modules/hrms/salary-revisions-shared";

let failures = 0;
function assertEqual(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"} ${label} (actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)})`);
  if (!pass) failures++;
}

const row1 = calculatePayrollEmployeeRow({
  employeeId: "emp-1",
  employeeNumber: "1001",
  employeeName: "Asha Rao",
  designation: "Operations Executive",
  departmentName: "Operations",
  branchName: "Chennai",
  paymentMode: "Bank Transfer",
  employmentDays: 31,
  presentDays: 24,
  holidayDays: 2,
  paidLeaveDays: 2,
  unpaidLeaveDays: 1,
  manualLopDays: 1,
  partialPayDeductionDays: 0.5,
  otHours: 12,
  otAmount: 3600,
  incentives: 2500,
  reimbursements: 0,
  grossMonthly: 62000,
  employeePf: 1800,
  employerPf: 1800,
  esi: 0,
  esiEmployer: 0,
  professionalTax: 200,
  tax: 3200,
  gratuity: 578,
  insurancePremium: 150,
});

assertEqual("row1.payableDays", row1.payableDays, 28.5);
assertEqual("row1.grossEarnings", row1.grossEarnings, 63100);
assertEqual("row1.employeeDeductions", row1.employeeDeductions, 4796.77);
assertEqual("row1.employerContributions", row1.employerContributions, 2336.23);
assertEqual("row1.netPay", row1.netPay, 58303.23);
assertEqual("row1.status", row1.status, "READY");
assertEqual(
  "row1.epfEmployeeAmount + epfEmployerAmount equals combined epfAmount",
  Number((row1.epfEmployeeAmount + row1.epfEmployerAmount).toFixed(2)),
  row1.epfAmount,
);

const row2 = calculatePayrollEmployeeRow({
  employeeId: "emp-2",
  employeeNumber: null,
  employeeName: "Rahul Sen",
  designation: null,
  departmentName: null,
  branchName: null,
  paymentMode: null,
  employmentDays: 31,
  presentDays: 0,
  holidayDays: 0,
  paidLeaveDays: 0,
  unpaidLeaveDays: 0,
  manualLopDays: 0,
  partialPayDeductionDays: 0,
  otHours: 0,
  otAmount: 0,
  incentives: 0,
  reimbursements: 0,
  grossMonthly: 0,
  employeePf: 0,
  employerPf: 0,
  esi: 0,
  esiEmployer: 0,
  professionalTax: 0,
  tax: 0,
  gratuity: 0,
  insurancePremium: 0,
});

assertEqual("row2.status", row2.status, "REVIEW");
assertEqual("row2.issues", row2.issues, ["Missing monthly gross salary", "Payment mode is not configured"]);

// New Phase 23/32 fields — direct, non-DB-dependent verification
const row3 = calculatePayrollEmployeeRow({
  employeeId: "emp-3",
  employeeNumber: "1003",
  employeeName: "Priya K",
  designation: null,
  departmentName: null,
  branchName: null,
  paymentMode: "Direct Deposit",
  employmentDays: 30,
  presentDays: 30,
  holidayDays: 0,
  paidLeaveDays: 0,
  unpaidLeaveDays: 0,
  manualLopDays: 0,
  partialPayDeductionDays: 0,
  otHours: 0,
  otAmount: 0,
  incentives: 0,
  reimbursements: 1500,
  grossMonthly: 30000,
  employeePf: 1800,
  employerPf: 1800,
  esi: 0,
  esiEmployer: 0,
  professionalTax: 200,
  tax: 0,
  gratuity: 0,
  insurancePremium: 0,
  hasBankAccount: false,
});
assertEqual("row3.issues includes bank-account flag", row3.issues.includes("Bank account is not on file for direct deposit"), true);
assertEqual("row3.netPay includes reimbursement after deductions", row3.netPay, Number((row3.grossEarnings - row3.employeeDeductions + 1500).toFixed(2)));

// Loan EMI: reduces net pay alongside statutory deductions.
const row4 = calculatePayrollEmployeeRow({
  employeeId: "emp-4",
  employeeNumber: "1004",
  employeeName: "Vikram N",
  designation: null,
  departmentName: null,
  branchName: null,
  paymentMode: "Bank Transfer",
  employmentDays: 30,
  presentDays: 30,
  holidayDays: 0,
  paidLeaveDays: 0,
  unpaidLeaveDays: 0,
  manualLopDays: 0,
  partialPayDeductionDays: 0,
  otHours: 0,
  otAmount: 0,
  incentives: 0,
  reimbursements: 0,
  loanEmiDeduction: 5000,
  grossMonthly: 30000,
  employeePf: 1800,
  employerPf: 1800,
  esi: 0,
  esiEmployer: 0,
  professionalTax: 200,
  tax: 0,
  gratuity: 0,
  insurancePremium: 0,
});
assertEqual("row4.loanEmiDeduction is applied in full when headroom allows", row4.loanEmiDeduction, 5000);
assertEqual(
  "row4.netPay subtracts loan EMI after statutory deductions",
  row4.netPay,
  Number((row4.grossEarnings - row4.employeeDeductions - 5000).toFixed(2)),
);

// Loan EMI larger than what's left after statutory deductions: clamped so
// net pay never goes negative, and the applied amount reflects that cap.
const row5 = calculatePayrollEmployeeRow({
  employeeId: "emp-5",
  employeeNumber: "1005",
  employeeName: "Low Earner",
  designation: null,
  departmentName: null,
  branchName: null,
  paymentMode: "Bank Transfer",
  employmentDays: 30,
  presentDays: 30,
  holidayDays: 0,
  paidLeaveDays: 0,
  unpaidLeaveDays: 0,
  manualLopDays: 0,
  partialPayDeductionDays: 0,
  otHours: 0,
  otAmount: 0,
  incentives: 0,
  reimbursements: 0,
  loanEmiDeduction: 50000,
  grossMonthly: 8000,
  employeePf: 0,
  employerPf: 0,
  esi: 0,
  esiEmployer: 0,
  professionalTax: 0,
  tax: 0,
  gratuity: 0,
  insurancePremium: 0,
});
assertEqual("row5.loanEmiDeduction is capped at available headroom", row5.loanEmiDeduction, 8000);
assertEqual("row5.netPay floors at zero, never negative", row5.netPay, 0);

// LWF: flat statutory amount, not prorated by days worked.
const row6 = calculatePayrollEmployeeRow({
  employeeId: "emp-6",
  employeeNumber: "1006",
  employeeName: "Lwf Test",
  designation: null,
  departmentName: null,
  branchName: null,
  paymentMode: "Bank Transfer",
  employmentDays: 30,
  presentDays: 30,
  holidayDays: 0,
  paidLeaveDays: 0,
  unpaidLeaveDays: 0,
  manualLopDays: 0,
  partialPayDeductionDays: 0,
  otHours: 0,
  otAmount: 0,
  incentives: 0,
  reimbursements: 0,
  grossMonthly: 30000,
  employeePf: 0,
  employerPf: 0,
  esi: 0,
  esiEmployer: 0,
  professionalTax: 0,
  tax: 0,
  gratuity: 0,
  insurancePremium: 0,
  lwfEmployee: 20,
  lwfEmployer: 40,
});
assertEqual("row6.lwfEmployeeAmount", row6.lwfEmployeeAmount, 20);
assertEqual("row6.lwfEmployerAmount", row6.lwfEmployerAmount, 40);
assertEqual("row6.lwfAmount is combined", row6.lwfAmount, 60);
assertEqual("row6.netPay subtracts LWF employee portion", row6.netPay, 30000 - 20);

// Phase 13-14: normalizeRevision's new Id/Reason fields (added this session
// to support the propose/approve/reject flow with a stable per-row key).
const revision = normalizeRevision({
  Id: "rev-abc-123",
  "Employee Number": "1001",
  Status: "PENDING",
  "Effective From": "2026-09-01",
  "CTC (per annum)": 360000,
  "Revised CTC (per annum)": 420000,
  Reason: "Annual increment",
});
assertEqual("revision.id uses explicit Id when present", revision.id, "rev-abc-123");
assertEqual("revision.status", revision.status, "PENDING");
assertEqual("revision.reason", revision.reason, "Annual increment");

const revisionWithoutId = normalizeRevision({
  "Employee Number": "1002",
  Status: "APPROVED",
  "Effective From": "2026-06-01",
  "CTC (per annum)": 300000,
  "Revised CTC (per annum)": 330000,
});
assertEqual("revision.id falls back to composite key when Id absent", revisionWithoutId.id.startsWith("1002:"), true);
assertEqual("revision.reason defaults to null when absent", revisionWithoutId.reason, null);

console.log(failures === 0 ? "\nAll payroll calc assertions passed." : `\n${failures} assertion(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
