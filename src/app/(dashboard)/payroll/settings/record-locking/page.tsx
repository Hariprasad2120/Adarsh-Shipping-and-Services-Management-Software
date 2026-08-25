import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceAlert, WorkspaceBadge, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { formatPayrollDate } from "@/modules/payroll/service";

// Phase 47: reference settings_payrun_record-locking
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00103). The
// reference itself shows an empty "no configuration created" state — this
// page instead documents the real, already-enforced lock policy rather than
// a configurable rule engine: once a REGULAR batch is approved for a month,
// leave/LOP edits for that month are blocked (PayrollLockedError in
// src/modules/leave/payroll-bridge.ts) and a second regular run for the same
// month is rejected (approvePayrollRun's existingBatch guard).
export default async function PayrollRecordLockingPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const batches = await db.payrollBatch.findMany({
    where: { orgId: session.user.orgId, type: "REGULAR" },
    orderBy: { month: "desc" },
    take: 12,
    select: { month: true, status: true },
  });

  const isLocked = (status: string) => ["APPROVED_HRMS", "FINALIZED", "PAID"].includes(status);

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
          title="Pay Run Record Locking"
          description="Once a regular pay run is approved for a period, that period's leave/LOP records and a second regular run are both locked."
        />
        {batches.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No pay runs processed yet.</p>
        ) : (
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Period</PeopleTableHead>
                <PeopleTableHead>Status</PeopleTableHead>
                <PeopleTableHead>Lock State</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {batches.map((batch) => (
                <PeopleTableRow key={batch.month.toISOString()}>
                  <PeopleTableCell>{formatPayrollDate(batch.month.toISOString())}</PeopleTableCell>
                  <PeopleTableCell>{batch.status}</PeopleTableCell>
                  <PeopleTableCell>
                    <WorkspaceBadge variant={isLocked(batch.status) ? "danger" : "neutral"}>
                      {isLocked(batch.status) ? "Locked" : "Open"}
                    </WorkspaceBadge>
                  </PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-2 p-5">
        <WorkspaceSectionHeading index="02" title="Accounting Period Locks" />
        <WorkspaceAlert variant="warning">
          Accounting has its own period-lock request/approval workflow, but
          the payroll posting path (acceptApprovedPayrollRun) does not
          currently check it before posting — a payroll run can still post
          into a period Accounting has locked. This is a real gap, not yet
          wired.
        </WorkspaceAlert>
        <Link className="mnx-button mnx-button-secondary" href="/accounting/settings">
          Open Accounting Settings
        </Link>
      </WorkspacePanel>
    </div>
  );
}
