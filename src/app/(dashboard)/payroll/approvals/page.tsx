import { redirect } from "next/navigation";
import Link from "next/link";
import { FileClock, FileWarning, ReceiptText, TrendingUp } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceMetric, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  PeopleSection,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { listSalaryRevisionSummaries } from "@/modules/hrms/salary-revisions";
import { listReimbursementClaims } from "@/modules/hrms/on-duty";
import { formatPayrollMoney, formatPayrollDate } from "@/modules/payroll/service";
import { RevisionDecisionControl } from "@/modules/payroll/components/revision-decision-control";
import { listPendingDeclarations, countEmployeesYetToSubmit } from "@/modules/payroll/investment-declaration-actions";
import { PoiDecisionControl } from "@/modules/payroll/components/poi-decision-control";

// Phase 14/23/24: Zoho's Approvals area covers Proof of Investment,
// Reimbursements, and Salary Revision. Salary Revision and Reimbursements
// already have real backing data in HRMS — this page aggregates them rather
// than duplicating a second approval engine (docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md).
// Proof of Investment has no backing model yet, so it is shown as a real
// "not implemented" status rather than fake rows.
export default async function PayrollApprovalsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const [salaryRevisions, pendingReimbursements, pendingDeclarations, yetToSubmit] = await Promise.all([
    listSalaryRevisionSummaries(orgId),
    listReimbursementClaims(orgId, "PENDING"),
    listPendingDeclarations(orgId),
    countEmployeesYetToSubmit(orgId),
  ]);

  const pendingRevisions = salaryRevisions.filter(
    (summary) => summary.latestRevision?.status === "PENDING",
  );

  return (
    <div className="space-y-6">
      <section className="mnx-workspace-metrics" aria-label="Payroll approvals metrics">
        <WorkspaceMetric
          icon={<TrendingUp aria-hidden="true" />}
          label="Salary revisions pending"
          value={pendingRevisions.length}
          detail="Awaiting approval before the next payroll run"
        />
        <WorkspaceMetric
          icon={<ReceiptText aria-hidden="true" />}
          label="Reimbursements pending"
          value={pendingReimbursements.length}
          detail="Fuel/expense claims awaiting approval"
        />
        <WorkspaceMetric
          icon={<FileWarning aria-hidden="true" />}
          label="POI reviews pending"
          value={pendingDeclarations.reduce((sum, d) => sum + d.pendingLines, 0)}
          detail={`${yetToSubmit} employee(s) yet to submit`}
        />
        <WorkspaceMetric
          icon={<FileClock aria-hidden="true" />}
          label="Total open items"
          value={pendingRevisions.length + pendingReimbursements.length + pendingDeclarations.length}
          detail="Combined queue across all approval types"
        />
      </section>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Salary Revision"
          description="Reuses the existing HRMS salary-revision engine. Approve/reject from the employee's compensation record."
        />
        {pendingRevisions.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No salary revisions pending approval.</p>
        ) : (
          <PeopleSection>
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Current CTC</PeopleTableHead>
                  <PeopleTableHead>Revised CTC</PeopleTableHead>
                  <PeopleTableHead>Effective from</PeopleTableHead>
                  <PeopleTableHead>Reason</PeopleTableHead>
                  <PeopleTableHead>Action</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {pendingRevisions.map((summary) => (
                  <PeopleTableRow key={summary.userId}>
                    <PeopleTableCell>
                      <div className="font-semibold text-[var(--mnx-text)]">{summary.employeeName}</div>
                      <div className="text-xs text-[var(--mnx-muted)]">#{summary.employeeNumber}</div>
                    </PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(summary.currentCtcAnnual ?? 0)}</PeopleTableCell>
                    <PeopleTableCell>
                      {formatPayrollMoney(summary.latestRevision?.revisedCtcAnnual ?? 0)}
                    </PeopleTableCell>
                    <PeopleTableCell>{summary.latestRevision?.effectiveLabel ?? "—"}</PeopleTableCell>
                    <PeopleTableCell>{summary.latestRevision?.reason ?? "—"}</PeopleTableCell>
                    <PeopleTableCell>
                      {summary.latestRevision ? (
                        <RevisionDecisionControl employeeId={summary.userId} revisionId={summary.latestRevision.id} />
                      ) : null}
                    </PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          </PeopleSection>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="02"
          title="Reimbursements"
          description="Reuses the existing fuel/expense reimbursement claims. Approve/reject from the on-duty reimbursement admin view."
        />
        {pendingReimbursements.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No reimbursement claims pending approval.</p>
        ) : (
          <PeopleSection>
            <PeopleTable>
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Distance</PeopleTableHead>
                  <PeopleTableHead>Amount</PeopleTableHead>
                  <PeopleTableHead>Submitted</PeopleTableHead>
                  <PeopleTableHead>Action</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {pendingReimbursements.map((claim) => (
                  <PeopleTableRow key={claim.id}>
                    <PeopleTableCell>
                      <div className="font-semibold text-[var(--mnx-text)]">{claim.user.name}</div>
                    </PeopleTableCell>
                    <PeopleTableCell>{claim.distanceKm.toFixed(1)} km</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollMoney(claim.amount)}</PeopleTableCell>
                    <PeopleTableCell>{formatPayrollDate(claim.createdAt.toISOString())}</PeopleTableCell>
                    <PeopleTableCell>
                      <Link className="mnx-button mnx-button-secondary" href="/hrms/on-duty">
                        Review
                      </Link>
                    </PeopleTableCell>
                  </PeopleTableRow>
                ))}
              </PeopleTableBody>
            </PeopleTable>
          </PeopleSection>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="03"
          title="Proof of Investments"
          description={`${yetToSubmit} employee(s) yet to submit POI. Employee self-service submission is not built yet — declarations are currently entered on the employee's behalf.`}
        />
        {pendingDeclarations.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No declarations awaiting review.</p>
        ) : (
          <div className="space-y-4">
            {pendingDeclarations.map((declaration) => (
              <div key={declaration.id} className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] p-3">
                <div className="mb-2 text-sm font-semibold text-[var(--mnx-text)]">
                  {declaration.employeeName} · #{declaration.employeeNumber}
                </div>
                <PeopleTable>
                  <PeopleTableHeader>
                    <PeopleTableRow>
                      <PeopleTableHead>Category</PeopleTableHead>
                      <PeopleTableHead>Declared</PeopleTableHead>
                      <PeopleTableHead>Status</PeopleTableHead>
                      <PeopleTableHead>Action</PeopleTableHead>
                    </PeopleTableRow>
                  </PeopleTableHeader>
                  <PeopleTableBody>
                    {declaration.lines.map((line) => (
                      <PeopleTableRow key={line.id}>
                        <PeopleTableCell>{line.category}</PeopleTableCell>
                        <PeopleTableCell>{formatPayrollMoney(line.declaredAmount)}</PeopleTableCell>
                        <PeopleTableCell>{line.status}</PeopleTableCell>
                        <PeopleTableCell>
                          {line.status === "PENDING" ? (
                            <PoiDecisionControl lineId={line.id} declaredAmount={line.declaredAmount} />
                          ) : null}
                        </PeopleTableCell>
                      </PeopleTableRow>
                    ))}
                  </PeopleTableBody>
                </PeopleTable>
              </div>
            ))}
          </div>
        )}
      </WorkspacePanel>
    </div>
  );
}
