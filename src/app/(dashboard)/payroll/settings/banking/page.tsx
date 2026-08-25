import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading, WorkspaceBadge } from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";

// Phase 33: reference settings_employer-bank-accounts / settings_direct-deposit
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, pages 00093/00097).
// Employer bank accounts are canonical Accounting data
// (AccountingBankAccount) — read-only here, managed in Accounting. Direct
// Deposits in the reference are third-party bank payout integrations
// (Zoho Payments, ICICI/HSBC/Axis) — not reproduced. The Monolith-native
// alternative is recording the salary payment against a real bank account
// in Accounting once payroll is approved, not a fabricated external transfer.
export default async function PayrollBankingSettingsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const accounts = await db.accountingBankAccount.findMany({
    where: { orgId: session.user.orgId, isActive: true },
    select: { id: true, name: true, bankName: true, accountNumberMasked: true, ifsc: true, code: true, isPrimary: true },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/settings"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Settings
      </Link>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Employer Bank Accounts"
          description="Canonical Accounting bank accounts. Payroll reads these for salary payment — no duplicate master."
          actions={
            <Link className="mnx-button mnx-button-secondary" href="/accounting/banking">
              Manage in Accounting
            </Link>
          }
        />
        {accounts.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No bank accounts configured yet.</p>
        ) : (
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Account</PeopleTableHead>
                <PeopleTableHead>Bank Name</PeopleTableHead>
                <PeopleTableHead>Account Number</PeopleTableHead>
                <PeopleTableHead>IFSC</PeopleTableHead>
                <PeopleTableHead>Account Code</PeopleTableHead>
                <PeopleTableHead>Status</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {accounts.map((account) => (
                <PeopleTableRow key={account.id}>
                  <PeopleTableCell>{account.name}</PeopleTableCell>
                  <PeopleTableCell>{account.bankName}</PeopleTableCell>
                  <PeopleTableCell>{account.accountNumberMasked}</PeopleTableCell>
                  <PeopleTableCell>{account.ifsc ?? "—"}</PeopleTableCell>
                  <PeopleTableCell>{account.code}</PeopleTableCell>
                  <PeopleTableCell>
                    {account.isPrimary ? <WorkspaceBadge variant="success">Primary</WorkspaceBadge> : null}
                  </PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-2 p-5">
        <WorkspaceSectionHeading index="02" title="Direct Deposits" />
        <WorkspaceAlert variant="info">
          No third-party bank payout integration (Zoho Payments, or a direct
          bank API) exists in this repository. Salary payments are recorded
          against a real bank account in Accounting after payroll approval —
          there is no simulated external transfer.
        </WorkspaceAlert>
        <Link className="mnx-button mnx-button-secondary" href="/payroll/payments">
          Open Payments
        </Link>
      </WorkspacePanel>
    </div>
  );
}
