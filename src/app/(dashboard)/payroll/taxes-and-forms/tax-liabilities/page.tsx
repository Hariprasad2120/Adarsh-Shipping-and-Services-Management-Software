import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { formatPayrollMoney } from "@/modules/payroll/service";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

// Phase 30: reference taxes-and-forms_tax-liabilities_pending/completed
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, pages 00020/00124).
// TDS per month is recomputed live from the same workspace calc used for
// payroll processing rather than fabricated — this repo does not persist a
// per-component TDS figure per historical batch yet, so this is an accurate
// derived view, not a stored ledger. "Paid" stays empty until Phase 31 (Tax
// Payments) exists to mark a liability settled against a real payment.
export default async function PayrollTaxLiabilitiesPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const batches = await db.payrollBatch.findMany({
    where: { orgId, type: "REGULAR", status: { in: ["APPROVED_HRMS", "FINALIZED", "PAID"] } },
    orderBy: { month: "desc" },
    take: 12,
    select: { month: true },
  });

  const rows = await Promise.all(
    batches.map(async (batch) => {
      const workspace = await getPayrollWorkspaceData(orgId, batch.month);
      return {
        month: batch.month,
        employeesCount: workspace.summary.employeesInPayroll,
        totalTds: workspace.summary.tdsLiability,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/taxes-and-forms"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Taxes &amp; Forms
      </Link>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="01" title="TDS Liabilities — Unpaid" />
        {rows.length === 0 ? (
          <>
            <p className="text-sm text-[var(--mnx-muted)]">You have no liabilities as of now</p>
            <p className="text-sm text-[var(--mnx-muted)]">
              Your liabilities will be displayed here after you approve your next pay run.
            </p>
          </>
        ) : (
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Deposit Period</PeopleTableHead>
                <PeopleTableHead>Tax Authority</PeopleTableHead>
                <PeopleTableHead>Employees Count</PeopleTableHead>
                <PeopleTableHead>Challans</PeopleTableHead>
                <PeopleTableHead>Total TDS</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {rows.map((row) => (
                <PeopleTableRow key={row.month.toISOString()}>
                  <PeopleTableCell>
                    {formatDate(row.month)} - {formatDate(endOfMonth(row.month))}
                  </PeopleTableCell>
                  <PeopleTableCell>Income Tax Department</PeopleTableCell>
                  <PeopleTableCell>{row.employeesCount}</PeopleTableCell>
                  <PeopleTableCell>0</PeopleTableCell>
                  <PeopleTableCell>{formatPayrollMoney(row.totalTds)}</PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-2 p-5">
        <WorkspaceSectionHeading index="02" title="TDS Liabilities — Paid" />
        <p className="text-sm text-[var(--mnx-muted)]">
          No liabilities marked paid yet — this repository has no tax-payment
          association model (Phase 31 gap).
        </p>
        <WorkspaceAlert variant="info">
          Challan tracking (count/reference against each deposit period) is
          not implemented — Challans always shows 0.
        </WorkspaceAlert>
      </WorkspacePanel>
    </div>
  );
}
