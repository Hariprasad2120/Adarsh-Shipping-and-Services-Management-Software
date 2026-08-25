// Phase 37: full report catalogue matches the captured Reports Centre
// exactly (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00011 —
// "All Reports 39"). `key` is set only for reports this repo can build from
// real data; the rest stay honestly unavailable rather than faked.
export type ReportCatalogEntry = {
  name: string;
  category: string;
  key?: string;
};

export const REPORT_CATEGORIES = [
  "Payroll Overview",
  "Statutory Reports",
  "Employee/Contractor Reports",
  "Declarations & Investments",
  "Deduction Reports",
  "Taxes and Forms",
  "Loan Reports",
  "Payroll Journal",
  "Activity",
] as const;

export const REPORT_CATALOG: ReportCatalogEntry[] = [
  { name: "Payroll Summary", category: "Payroll Overview", key: "payroll-summary" },
  { name: "Salary Register - Monthly", category: "Payroll Overview", key: "salary-register" },
  { name: "Employees Salary Statement", category: "Payroll Overview", key: "employees-salary-statement" },
  { name: "Employees Pay Summary", category: "Payroll Overview", key: "salary-register" },
  { name: "Payroll Liability Summary", category: "Payroll Overview", key: "payroll-liability-summary" },
  { name: "Leave Encashment Summary", category: "Payroll Overview" },
  { name: "Loss Of Pay Summary", category: "Payroll Overview", key: "loss-of-pay-summary" },
  { name: "Variable Pay Earnings Report", category: "Payroll Overview", key: "variable-pay-earnings-report" },
  { name: "Scheduled Earning Summary", category: "Payroll Overview", key: "scheduled-earning-summary" },

  { name: "EPF Summary", category: "Statutory Reports", key: "epf-summary" },
  { name: "EPF ECR Report", category: "Statutory Reports", key: "epf-ecr-report" },
  { name: "ESI Summary", category: "Statutory Reports", key: "esi-summary" },
  { name: "ESI Monthly summary", category: "Statutory Reports", key: "esi-summary" },
  { name: "Professional Tax Summary", category: "Statutory Reports", key: "professional-tax-summary" },
  { name: "Employee-wise Professional Tax Report", category: "Statutory Reports", key: "professional-tax-summary" },
  { name: "Annual Professional Tax Report", category: "Statutory Reports", key: "annual-professional-tax-report" },
  { name: "Labour Welfare Fund Summary", category: "Statutory Reports", key: "lwf-summary" },

  { name: "Compensation Details", category: "Employee/Contractor Reports", key: "employees-salary-statement" },
  { name: "Reimbursement Claim Summary", category: "Employee/Contractor Reports", key: "reimbursement-claim-summary" },
  { name: "Employee Perquisites Summary", category: "Employee/Contractor Reports" },
  { name: "Full and Final Settlement Report", category: "Employee/Contractor Reports", key: "full-and-final-settlement-report" },
  { name: "Employees Salary Revisions", category: "Employee/Contractor Reports", key: "salary-revision-history" },
  { name: "Salary Revision History", category: "Employee/Contractor Reports", key: "salary-revision-history" },
  { name: "Salary Withhold Report", category: "Employee/Contractor Reports" },

  { name: "FBP declaration Report", category: "Declarations & Investments" },
  { name: "Investment Declaration Report", category: "Declarations & Investments", key: "investment-declaration-report" },
  { name: "Proof of Investment Report", category: "Declarations & Investments", key: "proof-of-investment-report" },

  { name: "Benefits & Deductions Summary", category: "Deduction Reports", key: "payroll-summary" },
  { name: "Employee Deductions Summary", category: "Deduction Reports", key: "salary-register" },
  { name: "Employee Benefits Summary", category: "Deduction Reports" },
  { name: "Employee Donations Summary", category: "Deduction Reports" },

  { name: "TDS Deduction summary", category: "Taxes and Forms", key: "tds-summary" },
  { name: "Form 24Q", category: "Taxes and Forms", key: "form24q-report" },

  { name: "Loan Outstanding Summary", category: "Loan Reports", key: "loan-outstanding-summary" },
  { name: "Loan Perquisite Summary", category: "Loan Reports" },
  { name: "Loan Perquisite Projection", category: "Loan Reports" },
  { name: "Loan Summary Report", category: "Loan Reports", key: "loan-summary" },

  { name: "Payroll Journal Summary", category: "Payroll Journal", key: "payroll-journal-summary" },

  { name: "Activity Logs", category: "Activity", key: "activity-logs" },
];
