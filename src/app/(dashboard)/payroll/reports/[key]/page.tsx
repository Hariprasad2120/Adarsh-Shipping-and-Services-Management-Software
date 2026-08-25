import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { listSalaryRevisionSummaries } from "@/modules/hrms/salary-revisions";
import { listReimbursementClaims } from "@/modules/hrms/on-duty";
import { listPayrollLoans } from "@/modules/payroll/loan-actions";
import { formatPayrollMoney, formatPayrollDate } from "@/modules/payroll/service";
import { REPORT_CATALOG } from "@/modules/payroll/reports-catalog";

function parsePeriod(searchPeriod: string | undefined) {
  if (!searchPeriod) return new Date();
  const match = searchPeriod.match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date();
  const [, year, month] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

// Phase 38-45: report views, all built from real data already computed by
// the payroll engine — no separate/duplicate calculation path.
export default async function PayrollReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const { key } = await params;
  const { period } = await searchParams;
  const entry = REPORT_CATALOG.find((r) => r.key === key);
  if (!entry) notFound();

  const monthDate = parsePeriod(period);

  const backLink = (
    <Link href="/payroll/reports" className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to Reports Centre
    </Link>
  );

  if (key === "payroll-summary") {
    const workspace = await getPayrollWorkspaceData(orgId, monthDate);
    const s = workspace.summary;
    const rows: [string, string][] = [
      ["Gross Payroll", formatPayrollMoney(s.grossPayroll)],
      ["Employee Deductions", formatPayrollMoney(s.employeeDeductions)],
      ["Employer Contributions", formatPayrollMoney(s.employerContributions)],
      ["Reimbursements", formatPayrollMoney(s.reimbursements)],
      ["Loan EMI Deductions", formatPayrollMoney(s.loanEmiDeductions)],
      ["Net Payroll", formatPayrollMoney(s.netPayroll)],
      ["Overtime", formatPayrollMoney(s.overtimeAmount)],
      ["Incentives", formatPayrollMoney(s.incentives)],
      ["EPF Liability", formatPayrollMoney(s.epfLiability)],
      ["ESI Liability", formatPayrollMoney(s.esiLiability)],
      ["Professional Tax Liability", formatPayrollMoney(s.professionalTaxLiability)],
      ["TDS Liability", formatPayrollMoney(s.tdsLiability)],
      ["Employees in Payroll", String(s.employeesInPayroll)],
    ];
    return (
      <div className="space-y-4">
        {backLink}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title="Payroll Summary" description={workspace.period.label} />
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3 text-sm">
                <span className="text-[var(--mnx-muted)]">{label}</span>
                <span className="font-semibold text-[var(--mnx-text)]">{value}</span>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "salary-register" || key === "employees-salary-statement") {
    const workspace = await getPayrollWorkspaceData(orgId, monthDate);
    return (
      <div className="space-y-4">
        {backLink}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title={entry.name} description={workspace.period.label} />
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Employee</PeopleTableHead>
                <PeopleTableHead>Gross</PeopleTableHead>
                <PeopleTableHead>Deductions</PeopleTableHead>
                <PeopleTableHead>Net Pay</PeopleTableHead>
                <PeopleTableHead>Status</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {workspace.rows.map((row) => (
                <PeopleTableRow key={row.employeeId}>
                  <PeopleTableCell>{row.employeeName} (#{row.employeeNumber})</PeopleTableCell>
                  <PeopleTableCell>{formatPayrollMoney(row.grossEarnings)}</PeopleTableCell>
                  <PeopleTableCell>{formatPayrollMoney(row.employeeDeductions + row.loanEmiDeduction)}</PeopleTableCell>
                  <PeopleTableCell>{formatPayrollMoney(row.netPay)}</PeopleTableCell>
                  <PeopleTableCell>{row.status}</PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "loss-of-pay-summary") {
    const workspace = await getPayrollWorkspaceData(orgId, monthDate);
    const rows = workspace.rows.filter((r) => r.unpaidLeaveDays + r.manualLopDays + r.partialPayDeductionDays > 0);
    return (
      <div className="space-y-4">
        {backLink}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title="Loss Of Pay Summary" description={workspace.period.label} />
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No LOP recorded this period.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Unpaid Leave</PeopleTableHead>
                  <PeopleTableHead>Manual LOP</PeopleTableHead>
                  <PeopleTableHead>Partial-Pay Deduction</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {rows.map((row) => (
                  <PeopleTableRow key={row.employeeId}>
                    <PeopleTableCell>{row.employeeName}</PeopleTableCell>
                    <PeopleTableCell>{row.unpaidLeaveDays}</PeopleTableCell>
                    <PeopleTableCell>{row.manualLopDays}</PeopleTableCell>
                    <PeopleTableCell>{row.partialPayDeductionDays}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "epf-summary" || key === "esi-summary" || key === "professional-tax-summary" || key === "tds-summary") {
    const workspace = await getPayrollWorkspaceData(orgId, monthDate);
    const columnMap = {
      "epf-summary": { label: "EPF", accessor: (r: (typeof workspace.rows)[number]) => r.epfAmount, total: workspace.summary.epfLiability },
      "esi-summary": { label: "ESI", accessor: (r: (typeof workspace.rows)[number]) => r.esiAmount, total: workspace.summary.esiLiability },
      "professional-tax-summary": { label: "Professional Tax", accessor: (r: (typeof workspace.rows)[number]) => r.professionalTaxAmount, total: workspace.summary.professionalTaxLiability },
      "tds-summary": { label: "TDS", accessor: (r: (typeof workspace.rows)[number]) => r.tdsAmount, total: workspace.summary.tdsLiability },
    } as const;
    const col = columnMap[key];
    const rows = workspace.rows.filter((r) => col.accessor(r) > 0);
    return (
      <div className="space-y-4">
        {backLink}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title={entry.name} description={`${workspace.period.label} — Total ${formatPayrollMoney(col.total)}`} />
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No {col.label} liability this period.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>{col.label}</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {rows.map((row) => (
                  <PeopleTableRow key={row.employeeId}>
                    <PeopleTableCell>{row.employeeName} (#{row.employeeNumber})</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(col.accessor(row))}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "loan-outstanding-summary" || key === "loan-summary") {
    const loans = await listPayrollLoans(orgId);
    const rows = key === "loan-outstanding-summary" ? loans.filter((l) => l.status === "OPEN") : loans;
    return (
      <div className="space-y-4">
        {backLink}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title={entry.name} />
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No loans to report.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Loan Number</PeopleTableHead>
                  <PeopleTableHead>Loan Amount</PeopleTableHead>
                  <PeopleTableHead>Repaid</PeopleTableHead>
                  <PeopleTableHead>Remaining</PeopleTableHead>
                  <PeopleTableHead>Status</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {rows.map((loan) => (
                  <PeopleTableRow key={loan.id}>
                    <PeopleTableCell>{loan.employeeName} (#{loan.employeeNumber})</PeopleTableCell>
                    <PeopleTableCell>{loan.loanNumber}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(loan.principalAmount)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(loan.amountRepaid)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(loan.remainingAmount)}</PeopleTableCell>
                    <PeopleTableCell>{loan.status}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "salary-revision-history") {
    const revisions = await listSalaryRevisionSummaries(orgId);
    const rows = revisions.filter((r) => r.revisions.length > 0);
    return (
      <div className="space-y-4">
        {backLink}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title={entry.name} />
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No salary revisions on record.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Revised CTC</PeopleTableHead>
                  <PeopleTableHead>Effective From</PeopleTableHead>
                  <PeopleTableHead>Status</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {rows.flatMap((summary) =>
                  summary.revisions.map((rev) => (
                    <PeopleTableRow key={rev.id}>
                      <PeopleTableCell>{summary.employeeName}</PeopleTableCell>
                      <PeopleTableCell>{rev.revisedCtcAnnual != null ? formatPayrollMoney(rev.revisedCtcAnnual) : "—"}</PeopleTableCell>
                      <PeopleTableCell>{rev.effectiveLabel}</PeopleTableCell>
                      <PeopleTableCell>{rev.statusLabel}</PeopleTableCell>
                    </PeopleTableRow>
                  )),
                )}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "reimbursement-claim-summary") {
    const claims = await listReimbursementClaims(orgId);
    return (
      <div className="space-y-4">
        {backLink}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title="Reimbursement Claim Summary" />
          {claims.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No reimbursement claims on record.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Amount</PeopleTableHead>
                  <PeopleTableHead>Status</PeopleTableHead>
                  <PeopleTableHead>Submitted</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {claims.map((claim) => (
                  <PeopleTableRow key={claim.id}>
                    <PeopleTableCell>{claim.user.name}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(claim.amount)}</PeopleTableCell>
                    <PeopleTableCell>{claim.status}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollDate(claim.createdAt.toISOString())}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "payroll-journal-summary") {
    const batches = await db.payrollBatch.findMany({
      where: { orgId, status: { in: ["APPROVED_HRMS", "FINALIZED", "PAID"] } },
      include: { journalEntry: { select: { id: true, voucherNo: true } } },
      orderBy: { month: "desc" },
      take: 24,
    });
    return (
      <div className="space-y-4">
        {backLink}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title="Payroll Journal Summary" />
          {batches.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No payroll journal entries yet.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Period</PeopleTableHead>
                  <PeopleTableHead>Type</PeopleTableHead>
                  <PeopleTableHead>Total</PeopleTableHead>
                  <PeopleTableHead>Voucher No.</PeopleTableHead>
                  <PeopleTableHead>Status</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {batches.map((batch) => (
                  <PeopleTableRow key={batch.id}>
                    <PeopleTableCell>{formatPayrollDate(batch.month.toISOString())}</PeopleTableCell>
                    <PeopleTableCell>{batch.type}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(Number(batch.totalAmount))}</PeopleTableCell>
                    <PeopleTableCell>
                      {batch.journalEntry ? (
                        <Link href="/accounting/journal-entries" className="text-[var(--mnx-accent-strong)] hover:underline">
                          {batch.journalEntry.voucherNo}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </PeopleTableCell>
                    <PeopleTableCell>{batch.status}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  notFound();
}
