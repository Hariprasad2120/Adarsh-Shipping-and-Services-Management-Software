import * as XLSX from "xlsx";

// Phase: Payroll Settings — Data Backup / Export (Zoho reference
// settings_data-backup). Follows the same row-building + CSV-encoding shape
// as src/modules/hrms/employee-directory-export.ts: DB access stays in the
// caller (the API route), this module only shapes rows and encodes CSV so
// the formatting logic is unit-testable without a database.

export type PayrollExportEmployeeRow = {
  employeeNumber: number | null;
  name: string;
  email: string;
  designation: string | null;
  department: { name: string } | null;
  branch: { name: string } | null;
  employmentRecord: { ctc: number | null; joinDate: Date | string | null } | null;
};

export type PayrollExportSalaryComponentRow = {
  category: string;
  name: string;
  componentType: string;
  calculationType: string;
  considerForEpf: boolean;
  considerForEsi: boolean;
  includeInCtc: boolean;
  taxable: boolean;
  active: boolean;
};

export type PayrollExportLoanRow = {
  loanNumber: string;
  loanName: string;
  status: string;
  principalAmount: number;
  emiAmount: number;
  disbursedAt: Date | string;
  employeeName: string;
  employeeNumber: number | null;
  notes: string | null;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

// CSV-injection guard: a cell that starts with =, +, -, @ or a control
// character can be interpreted as a formula by spreadsheet software. Mirrors
// spreadsheetSafe() in employee-directory-export.ts.
function spreadsheetSafe(value: string | number) {
  if (typeof value !== "string") return value;
  return /^(?:[\t\r\n]|[\s]*[=+\-@])/.test(value) ? `'${value}` : value;
}

function toCsvBuffer(rows: Record<string, string | number>[], columns: readonly string[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...columns] });
  const text = XLSX.utils.sheet_to_csv(worksheet);
  return Buffer.from(`﻿${text}`, "utf8");
}

const EMPLOYEE_COLUMNS = [
  "Employee ID",
  "Name",
  "Email",
  "Designation",
  "Department",
  "Location",
  "Date of Joining",
  "Gross / Year",
] as const;

export function buildPayrollEmployeeExportRows(users: PayrollExportEmployeeRow[]) {
  return users.map((user) => {
    const row: Record<(typeof EMPLOYEE_COLUMNS)[number], string | number> = {
      "Employee ID": user.employeeNumber?.toString() ?? "",
      Name: user.name,
      Email: user.email,
      Designation: user.designation ?? "",
      Department: user.department?.name ?? "",
      Location: user.branch?.name ?? "",
      "Date of Joining": formatDate(user.employmentRecord?.joinDate ?? null),
      "Gross / Year": user.employmentRecord?.ctc ?? "",
    };
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, spreadsheetSafe(value)]),
    );
  });
}

export function buildPayrollEmployeeExportCsv(users: PayrollExportEmployeeRow[]) {
  return toCsvBuffer(buildPayrollEmployeeExportRows(users), EMPLOYEE_COLUMNS);
}

const SALARY_COMPONENT_COLUMNS = [
  "Category",
  "Name",
  "Component Type",
  "Calculation Type",
  "Consider For EPF",
  "Consider For ESI",
  "Include In CTC",
  "Taxable",
  "Status",
] as const;

export function buildPayrollSalaryComponentExportRows(
  components: PayrollExportSalaryComponentRow[],
) {
  return components.map((component) => {
    const row: Record<(typeof SALARY_COMPONENT_COLUMNS)[number], string | number> = {
      Category: component.category,
      Name: component.name,
      "Component Type": component.componentType,
      "Calculation Type": component.calculationType,
      "Consider For EPF": component.considerForEpf ? "Yes" : "No",
      "Consider For ESI": component.considerForEsi ? "Yes" : "No",
      "Include In CTC": component.includeInCtc ? "Yes" : "No",
      Taxable: component.taxable ? "Yes" : "No",
      Status: component.active ? "Active" : "Inactive",
    };
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, spreadsheetSafe(value)]),
    );
  });
}

export function buildPayrollSalaryComponentExportCsv(
  components: PayrollExportSalaryComponentRow[],
) {
  return toCsvBuffer(
    buildPayrollSalaryComponentExportRows(components),
    SALARY_COMPONENT_COLUMNS,
  );
}

const LOAN_COLUMNS = [
  "Loan Number",
  "Loan Name",
  "Status",
  "Employee",
  "Employee ID",
  "Principal Amount",
  "EMI Amount",
  "Disbursed On",
  "Notes",
] as const;

export function buildPayrollLoanExportRows(loans: PayrollExportLoanRow[]) {
  return loans.map((loan) => {
    const row: Record<(typeof LOAN_COLUMNS)[number], string | number> = {
      "Loan Number": loan.loanNumber,
      "Loan Name": loan.loanName,
      Status: loan.status,
      Employee: loan.employeeName,
      "Employee ID": loan.employeeNumber?.toString() ?? "",
      "Principal Amount": loan.principalAmount,
      "EMI Amount": loan.emiAmount,
      "Disbursed On": formatDate(loan.disbursedAt),
      Notes: loan.notes ?? "",
    };
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, spreadsheetSafe(value)]),
    );
  });
}

export function buildPayrollLoanExportCsv(loans: PayrollExportLoanRow[]) {
  return toCsvBuffer(buildPayrollLoanExportRows(loans), LOAN_COLUMNS);
}
