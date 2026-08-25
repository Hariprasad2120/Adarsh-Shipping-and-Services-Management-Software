import Link from "next/link";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";

// Phase 27-31: Zoho's Taxes & Forms area — Form 16, Form 24Q, Tax
// Liabilities, and Tax Payments (docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md,
// section 4). All four sub-areas are real: identity/deductor verification
// (Form 16), computed quarterly due dates (Form 24Q), recomputed monthly TDS
// (Tax Liabilities), and challan recording/association (Tax Payments).
export default function PayrollTaxesAndFormsPage() {
  return (
    <div className="space-y-6">
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Taxes & Forms"
          description="The Compliance tab shows employee identity (PAN/UAN) readiness for payroll."
        />
        <div className="flex flex-wrap gap-2">
          <Link className="mnx-button mnx-button-secondary" href="/payroll/compliance">
            Open Compliance
          </Link>
          <Link className="mnx-button mnx-button-secondary" href="/payroll/taxes-and-forms/form16">
            Open Form 16
          </Link>
          <Link className="mnx-button mnx-button-secondary" href="/payroll/taxes-and-forms/form24q">
            Open Form 24Q
          </Link>
          <Link className="mnx-button mnx-button-secondary" href="/payroll/taxes-and-forms/tax-liabilities">
            Open Tax Liabilities
          </Link>
          <Link className="mnx-button mnx-button-secondary" href="/payroll/taxes-and-forms/tax-payments">
            Open Tax Payments
          </Link>
        </div>
      </WorkspacePanel>
    </div>
  );
}
