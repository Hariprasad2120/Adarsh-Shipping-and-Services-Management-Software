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
import { ReportToolbar } from "@/modules/payroll/components/report-toolbar";
import {
  fiscalYearLabel,
  getActivityLogReport,
  getAnnualProfessionalTaxReport,
  getEpfEcrReport,
  getForm24QReport,
  getFullAndFinalSettlementReport,
  getInvestmentDeclarationReport,
  getProofOfInvestmentReport,
  getScheduledEarningSummary,
  getVariablePayEarningsReport,
} from "@/modules/payroll/reports-data";

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
  const periodKey = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;

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
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`payroll-summary_${periodKey}`}
          csvHeaders={["Metric", "Value"]}
          csvRows={rows}
        />
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
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`${key}_${periodKey}`}
          csvHeaders={["Employee", "Employee Number", "Gross", "Deductions", "Net Pay", "Status"]}
          csvRows={workspace.rows.map((row) => [
            row.employeeName,
            row.employeeNumber,
            row.grossEarnings,
            row.employeeDeductions + row.loanEmiDeduction,
            row.netPay,
            row.status,
          ])}
        />
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
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`loss-of-pay-summary_${periodKey}`}
          csvHeaders={["Employee", "Unpaid Leave", "Manual LOP", "Partial-Pay Deduction"]}
          csvRows={rows.map((row) => [row.employeeName, row.unpaidLeaveDays, row.manualLopDays, row.partialPayDeductionDays])}
        />
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

  if (
    key === "epf-summary" ||
    key === "esi-summary" ||
    key === "professional-tax-summary" ||
    key === "tds-summary" ||
    key === "lwf-summary"
  ) {
    const workspace = await getPayrollWorkspaceData(orgId, monthDate);
    const columnMap = {
      "epf-summary": { label: "EPF", accessor: (r: (typeof workspace.rows)[number]) => r.epfAmount, total: workspace.summary.epfLiability },
      "esi-summary": { label: "ESI", accessor: (r: (typeof workspace.rows)[number]) => r.esiAmount, total: workspace.summary.esiLiability },
      "professional-tax-summary": { label: "Professional Tax", accessor: (r: (typeof workspace.rows)[number]) => r.professionalTaxAmount, total: workspace.summary.professionalTaxLiability },
      "tds-summary": { label: "TDS", accessor: (r: (typeof workspace.rows)[number]) => r.tdsAmount, total: workspace.summary.tdsLiability },
      "lwf-summary": { label: "LWF", accessor: (r: (typeof workspace.rows)[number]) => r.lwfAmount, total: workspace.summary.lwfLiability },
    } as const;
    const col = columnMap[key];
    const rows = workspace.rows.filter((r) => col.accessor(r) > 0);
    return (
      <div className="space-y-4">
        {backLink}
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`${key}_${periodKey}`}
          csvHeaders={["Employee", "Employee Number", col.label]}
          csvRows={rows.map((row) => [row.employeeName, row.employeeNumber, col.accessor(row)])}
        />
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
        <ReportToolbar
          csvFilename={key}
          csvHeaders={["Employee", "Loan Number", "Loan Amount", "Repaid", "Remaining", "Status"]}
          csvRows={rows.map((loan) => [
            loan.employeeName,
            loan.loanNumber,
            loan.principalAmount,
            loan.amountRepaid,
            loan.remainingAmount,
            loan.status,
          ])}
        />
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
        <ReportToolbar
          csvFilename="salary-revision-history"
          csvHeaders={["Employee", "Revised CTC", "Effective From", "Status"]}
          csvRows={rows.flatMap((summary) =>
            summary.revisions.map((rev) => [
              summary.employeeName,
              rev.revisedCtcAnnual ?? "",
              rev.effectiveLabel,
              rev.statusLabel,
            ]),
          )}
        />
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
        <ReportToolbar
          csvFilename="reimbursement-claim-summary"
          csvHeaders={["Employee", "Amount", "Status", "Submitted"]}
          csvRows={claims.map((claim) => [
            claim.user.name,
            claim.amount,
            claim.status,
            formatPayrollDate(claim.createdAt.toISOString()),
          ])}
        />
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
        <ReportToolbar
          csvFilename="payroll-journal-summary"
          csvHeaders={["Period", "Type", "Total", "Voucher No.", "Status"]}
          csvRows={batches.map((batch) => [
            formatPayrollDate(batch.month.toISOString()),
            batch.type,
            Number(batch.totalAmount),
            batch.journalEntry?.voucherNo ?? "",
            batch.status,
          ])}
        />
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

  if (key === "payroll-liability-summary") {
    const workspace = await getPayrollWorkspaceData(orgId, monthDate);
    const s = workspace.summary;
    const rows: [string, string][] = [
      ["EPF — Employee Share", formatPayrollMoney(s.epfEmployeeLiability)],
      ["EPF — Employer Share", formatPayrollMoney(s.epfEmployerLiability)],
      ["EPF — Total", formatPayrollMoney(s.epfLiability)],
      ["ESI — Employee Share", formatPayrollMoney(s.esiEmployeeLiability)],
      ["ESI — Employer Share", formatPayrollMoney(s.esiEmployerLiability)],
      ["ESI — Total", formatPayrollMoney(s.esiLiability)],
      ["Professional Tax", formatPayrollMoney(s.professionalTaxLiability)],
      ["TDS", formatPayrollMoney(s.tdsLiability)],
      ["LWF — Employee Share", formatPayrollMoney(s.lwfEmployeeLiability)],
      ["LWF — Employer Share", formatPayrollMoney(s.lwfEmployerLiability)],
      ["LWF — Total", formatPayrollMoney(s.lwfLiability)],
      ["Total Statutory Liability", formatPayrollMoney(s.complianceLiability)],
    ];
    return (
      <div className="space-y-4">
        {backLink}
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`payroll-liability-summary_${periodKey}`}
          csvHeaders={["Liability", "Amount"]}
          csvRows={rows}
        />
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title="Payroll Liability Summary" description={workspace.period.label} />
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

  if (key === "scheduled-earning-summary") {
    const rows = await getScheduledEarningSummary(orgId, monthDate);
    return (
      <div className="space-y-4">
        {backLink}
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`scheduled-earning-summary_${periodKey}`}
          csvHeaders={["Employee", "Employee Number", "Basic", "HRA", "Conveyance", "Transport", "Travelling", "Fixed Allowance", "Stipend", "Gross Monthly"]}
          csvRows={rows.map((r) => [
            r.employeeName,
            r.employeeNumber,
            r.basic,
            r.hra,
            r.conveyance,
            r.transport,
            r.travelling,
            r.fixedAllowance,
            r.stipend,
            r.grossMonthly,
          ])}
        />
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading
            index="01"
            title="Scheduled Earning Summary"
            description="Each employee's recurring fixed monthly earning components, on file today."
          />
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No employees with a recurring monthly earning on file.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Basic</PeopleTableHead>
                  <PeopleTableHead>HRA</PeopleTableHead>
                  <PeopleTableHead>Other Fixed Allowances</PeopleTableHead>
                  <PeopleTableHead>Gross Monthly</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {rows.map((r) => (
                  <PeopleTableRow key={r.employeeId}>
                    <PeopleTableCell>{r.employeeName} (#{r.employeeNumber})</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.basic)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.hra)}</PeopleTableCell>
                    <PeopleTableCell>
                      {formatPayrollMoney(r.conveyance + r.transport + r.travelling + r.fixedAllowance + r.stipend)}
                    </PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.grossMonthly)}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "variable-pay-earnings-report") {
    const rows = await getVariablePayEarningsReport(orgId, monthDate);
    return (
      <div className="space-y-4">
        {backLink}
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`variable-pay-earnings-report_${periodKey}`}
          csvHeaders={["Employee", "Employee Number", "Type", "Reference", "Amount", "Status", "Eligible Date"]}
          csvRows={rows.map((r) => [
            r.employeeName,
            r.employeeNumber,
            r.incentiveType,
            r.referenceLabel,
            r.amount,
            r.status,
            formatPayrollDate(r.eligibleDate),
          ])}
        />
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading
            index="01"
            title="Variable Pay Earnings Report"
            description="Approved and paid incentive entries eligible in this period."
          />
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No variable pay recorded this period.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Type</PeopleTableHead>
                  <PeopleTableHead>Reference</PeopleTableHead>
                  <PeopleTableHead>Amount</PeopleTableHead>
                  <PeopleTableHead>Status</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {rows.map((r) => (
                  <PeopleTableRow key={r.id}>
                    <PeopleTableCell>{r.employeeName} (#{r.employeeNumber})</PeopleTableCell>
                    <PeopleTableCell>{r.incentiveType}</PeopleTableCell>
                    <PeopleTableCell>{r.referenceLabel}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.amount)}</PeopleTableCell>
                    <PeopleTableCell>{r.status}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "epf-ecr-report") {
    const { period: reportPeriod, rows } = await getEpfEcrReport(orgId, monthDate);
    return (
      <div className="space-y-4">
        {backLink}
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`epf-ecr-report_${periodKey}`}
          csvHeaders={["Employee", "Employee Number", "UAN", "Gross Wages", "Employee Share", "Employer Share", "Total Contribution"]}
          csvRows={rows.map((r) => [
            r.employeeName,
            r.employeeNumber,
            r.uan,
            r.grossWages,
            r.employeeShare,
            r.employerShare,
            r.totalContribution,
          ])}
        />
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title="EPF ECR Report" description={reportPeriod.label} />
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No EPF-liable employees this period.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>UAN</PeopleTableHead>
                  <PeopleTableHead>Gross Wages</PeopleTableHead>
                  <PeopleTableHead>Employee Share</PeopleTableHead>
                  <PeopleTableHead>Employer Share</PeopleTableHead>
                  <PeopleTableHead>Total</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {rows.map((r) => (
                  <PeopleTableRow key={r.employeeId}>
                    <PeopleTableCell>{r.employeeName} (#{r.employeeNumber})</PeopleTableCell>
                    <PeopleTableCell>{r.uan}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.grossWages)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.employeeShare)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.employerShare)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.totalContribution)}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "full-and-final-settlement-report") {
    const rows = await getFullAndFinalSettlementReport(orgId);
    return (
      <div className="space-y-4">
        {backLink}
        <ReportToolbar
          csvFilename="full-and-final-settlement-report"
          csvHeaders={["Employee", "Last Working Day", "Payable Days", "Gross Earnings", "Deductions", "Net Pay", "Batch Status"]}
          csvRows={rows.map((r) => [
            r.employeeName,
            formatPayrollDate(r.lastWorkingDay),
            r.payableDays,
            r.grossEarnings,
            r.deductionsTotal,
            r.netPay,
            r.batchStatus,
          ])}
        />
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="01" title="Full and Final Settlement Report" />
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No finalized settlements on record.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Last Working Day</PeopleTableHead>
                  <PeopleTableHead>Payable Days</PeopleTableHead>
                  <PeopleTableHead>Gross Earnings</PeopleTableHead>
                  <PeopleTableHead>Deductions</PeopleTableHead>
                  <PeopleTableHead>Net Pay</PeopleTableHead>
                  <PeopleTableHead>Status</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {rows.map((r, index) => (
                  <PeopleTableRow key={`${r.batchId}-${r.employeeId}-${index}`}>
                    <PeopleTableCell>{r.employeeName} (#{r.employeeNumber})</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollDate(r.lastWorkingDay)}</PeopleTableCell>
                    <PeopleTableCell>{r.payableDays}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.grossEarnings)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.deductionsTotal)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.netPay)}</PeopleTableCell>
                    <PeopleTableCell>{r.batchStatus}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "investment-declaration-report" || key === "proof-of-investment-report") {
    const fiscalYearStartYear = monthDate.getUTCMonth() >= 3 ? monthDate.getUTCFullYear() : monthDate.getUTCFullYear() - 1;
    const fiscalYear = fiscalYearLabel(fiscalYearStartYear);

    if (key === "investment-declaration-report") {
      const declarations = await getInvestmentDeclarationReport(orgId, fiscalYear);
      return (
        <div className="space-y-4">
          {backLink}
          <ReportToolbar
            reportKey={key}
            period={periodKey}
            csvFilename={`investment-declaration-report_${fiscalYear}`}
            csvHeaders={["Employee", "Employee Number", "Tax Regime", "Status", "Declared Total", "Approved Total"]}
            csvRows={declarations.map((d) => [
              d.employeeName,
              d.employeeNumber,
              d.taxRegime,
              d.status,
              d.declaredTotal,
              d.approvedTotal,
            ])}
          />
          <WorkspacePanel className="space-y-4 p-5">
            <WorkspaceSectionHeading index="01" title="Investment Declaration Report" description={`FY ${fiscalYear}`} />
            {declarations.length === 0 ? (
              <p className="text-sm text-[var(--mnx-muted)]">No investment declarations submitted for FY {fiscalYear}.</p>
            ) : (
              <PeopleTable>
                <PeopleTableHeader>
                  <PeopleTableRow>
                    <PeopleTableHead>Employee</PeopleTableHead>
                    <PeopleTableHead>Tax Regime</PeopleTableHead>
                    <PeopleTableHead>Status</PeopleTableHead>
                    <PeopleTableHead>Declared Total</PeopleTableHead>
                    <PeopleTableHead>Approved Total</PeopleTableHead>
                  </PeopleTableRow>
                </PeopleTableHeader>
                <PeopleTableBody>
                  {declarations.map((d) => (
                    <PeopleTableRow key={d.employeeId}>
                      <PeopleTableCell>{d.employeeName} (#{d.employeeNumber})</PeopleTableCell>
                      <PeopleTableCell>{d.taxRegime}</PeopleTableCell>
                      <PeopleTableCell>{d.status}</PeopleTableCell>
                      <PeopleTableCell>{formatPayrollMoney(d.declaredTotal)}</PeopleTableCell>
                      <PeopleTableCell>{formatPayrollMoney(d.approvedTotal)}</PeopleTableCell>
                    </PeopleTableRow>
                  ))}
                </PeopleTableBody>
              </PeopleTable>
            )}
          </WorkspacePanel>
        </div>
      );
    }

    const proofRows = await getProofOfInvestmentReport(orgId, fiscalYear);
    return (
      <div className="space-y-4">
        {backLink}
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`proof-of-investment-report_${fiscalYear}`}
          csvHeaders={["Employee", "Employee Number", "Category", "Description", "Declared Amount", "Verified Amount", "Status"]}
          csvRows={proofRows.map((r) => [
            r.employeeName,
            r.employeeNumber,
            r.category,
            r.description,
            r.declaredAmount,
            r.verifiedAmount,
            r.status,
          ])}
        />
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading
            index="01"
            title="Proof of Investment Report"
            description={`FY ${fiscalYear} — declaration lines that have been reviewed`}
          />
          {proofRows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No reviewed declaration lines for FY {fiscalYear}.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Category</PeopleTableHead>
                  <PeopleTableHead>Declared</PeopleTableHead>
                  <PeopleTableHead>Verified</PeopleTableHead>
                  <PeopleTableHead>Status</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {proofRows.map((r, index) => (
                  <PeopleTableRow key={`${r.employeeId}-${r.category}-${index}`}>
                    <PeopleTableCell>{r.employeeName} (#{r.employeeNumber})</PeopleTableCell>
                    <PeopleTableCell>{r.category}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.declaredAmount)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.verifiedAmount)}</PeopleTableCell>
                    <PeopleTableCell>{r.status}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "annual-professional-tax-report") {
    const fiscalYearStartYear = monthDate.getUTCMonth() >= 3 ? monthDate.getUTCFullYear() : monthDate.getUTCFullYear() - 1;
    const report = await getAnnualProfessionalTaxReport(orgId, fiscalYearStartYear);
    return (
      <div className="space-y-4">
        {backLink}
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`annual-professional-tax-report_${report.fiscalYear}`}
          csvHeaders={["Employee", "Employee Number", "Months With Liability", "Total PT"]}
          csvRows={report.rows.map((r) => [r.employeeName, r.employeeNumber, r.monthsWithLiability, r.total])}
        />
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading
            index="01"
            title="Annual Professional Tax Report"
            description={`FY ${report.fiscalYear} — ${report.monthsCovered} month(s) computed so far`}
          />
          {report.rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No Professional Tax liability recorded for FY {report.fiscalYear}.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Months With Liability</PeopleTableHead>
                  <PeopleTableHead>Total PT</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {report.rows.map((r) => (
                  <PeopleTableRow key={r.employeeId}>
                    <PeopleTableCell>{r.employeeName} (#{r.employeeNumber})</PeopleTableCell>
                    <PeopleTableCell>{r.monthsWithLiability}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.total)}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "form24q-report") {
    const fiscalYearStartYear = monthDate.getUTCMonth() >= 3 ? monthDate.getUTCFullYear() : monthDate.getUTCFullYear() - 1;
    const report = await getForm24QReport(orgId, fiscalYearStartYear);
    return (
      <div className="space-y-4">
        {backLink}
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`form24q-report_${report.fiscalYear}`}
          csvHeaders={["Employee", "Employee Number", "Q1", "Q2", "Q3", "Q4", "Total TDS"]}
          csvRows={report.rows.map((r) => [r.employeeName, r.employeeNumber, r.q1, r.q2, r.q3, r.q4, r.total])}
        />
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading
            index="01"
            title="Form 24Q"
            description={`FY ${report.fiscalYear} — TDS totals per quarter, ${report.monthsCovered} month(s) computed so far`}
          />
          {report.rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No TDS liability recorded for FY {report.fiscalYear}.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Q1</PeopleTableHead>
                  <PeopleTableHead>Q2</PeopleTableHead>
                  <PeopleTableHead>Q3</PeopleTableHead>
                  <PeopleTableHead>Q4</PeopleTableHead>
                  <PeopleTableHead>Total</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {report.rows.map((r) => (
                  <PeopleTableRow key={r.employeeId}>
                    <PeopleTableCell>{r.employeeName} (#{r.employeeNumber})</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.q1)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.q2)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.q3)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.q4)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(r.total)}</PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          )}
        </WorkspacePanel>
      </div>
    );
  }

  if (key === "activity-logs") {
    const rows = await getActivityLogReport(orgId, monthDate);
    return (
      <div className="space-y-4">
        {backLink}
        <ReportToolbar
          reportKey={key}
          period={periodKey}
          csvFilename={`activity-logs_${periodKey}`}
          csvHeaders={["Date", "User", "Employee Number", "Action", "Details"]}
          csvRows={rows.map((r) => [formatPayrollDate(r.createdAt), r.userName, r.employeeNumber, r.action, r.details])}
        />
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading
            index="01"
            title="Activity Logs"
            description="Org-wide HR activity trail for the selected month (up to 500 most recent entries)."
          />
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--mnx-muted)]">No activity recorded this period.</p>
          ) : (
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Date</PeopleTableHead>
                  <PeopleTableHead>User</PeopleTableHead>
                  <PeopleTableHead>Action</PeopleTableHead>
                  <PeopleTableHead>Details</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {rows.map((r) => (
                  <PeopleTableRow key={r.id}>
                    <PeopleTableCell>{formatPayrollDate(r.createdAt)}</PeopleTableCell>
                    <PeopleTableCell>{r.userName} (#{r.employeeNumber})</PeopleTableCell>
                    <PeopleTableCell>{r.action}</PeopleTableCell>
                    <PeopleTableCell className="max-w-sm truncate">{r.details || "—"}</PeopleTableCell>
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
