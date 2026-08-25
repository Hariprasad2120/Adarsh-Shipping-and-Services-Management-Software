import { describe, expect, it } from "vitest";
import { calculatePayrollEmployeeRow } from "../payroll";

describe("HRMS payroll calculation", () => {
  it("prorates payroll and carries approved OT plus incentives into net pay", () => {
    const row = calculatePayrollEmployeeRow({
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

    expect(row.payableDays).toBe(28.5);
    expect(row.grossEarnings).toBe(63100);
    expect(row.employeeDeductions).toBe(4796.77);
    expect(row.employerContributions).toBe(2336.23);
    expect(row.netPay).toBe(58303.23);
    expect(row.status).toBe("READY");
  });

  it("flags employees that are missing compensation or payment setup", () => {
    const row = calculatePayrollEmployeeRow({
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

    expect(row.status).toBe("REVIEW");
    expect(row.issues).toEqual([
      "Missing monthly gross salary",
      "Payment mode is not configured",
    ]);
  });
});
