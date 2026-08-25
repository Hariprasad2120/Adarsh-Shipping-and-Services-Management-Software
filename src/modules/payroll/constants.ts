// Top-level areas match the captured Zoho Payroll sidebar exactly (see
// docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md) rather than exposing every
// internal page as its own top-level tab.
export const PAYROLL_ROUTE_ITEMS = [
  { href: "/payroll", label: "Dashboard" },
  { href: "/payroll/employees", label: "Employees" },
  { href: "/payroll/pay-runs", label: "Pay Runs" },
  { href: "/payroll/approvals", label: "Approvals" },
  { href: "/payroll/loans", label: "Loans" },
  { href: "/payroll/taxes-and-forms", label: "Taxes & Forms" },
  { href: "/payroll/reports", label: "Reports" },
  { href: "/payroll/settings", label: "Settings" },
] as const;

export type PayrollRouteItem = (typeof PAYROLL_ROUTE_ITEMS)[number];

// Secondary tabs nested under a top-level area. Pages here already exist as
// real routes; they're demoted from top-level nav to match Zoho's IA without
// moving/breaking their implementations.
export const PAYROLL_SECTION_TABS: Record<
  string,
  { href: string; label: string }[]
> = {
  "/payroll/employees": [
    { href: "/payroll/employees", label: "Overview" },
    { href: "/payroll/compensation", label: "Compensation" },
    { href: "/payroll/payslips", label: "Payslips & Forms" },
  ],
  "/payroll/pay-runs": [
    { href: "/payroll/pay-runs", label: "Run Payroll" },
    { href: "/payroll/pay-runs/history", label: "Payroll History" },
    { href: "/payroll/inputs", label: "Inputs" },
    { href: "/payroll/payments", label: "Payments" },
  ],
  "/payroll/taxes-and-forms": [
    { href: "/payroll/taxes-and-forms", label: "Overview" },
    { href: "/payroll/compliance", label: "Compliance" },
  ],
};
