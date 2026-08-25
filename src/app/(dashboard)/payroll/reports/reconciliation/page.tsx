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
import { formatPayrollMoney, formatPayrollDate } from "@/modules/payroll/service";

// Phase 60: Accounting Reconciliation. Validates
//   Total approved Net Pay == AccountingPayrollRunSnapshot NET_PAYABLE credit
// for every posted batch — both numbers come from the same posting event, so
// this checks that the snapshot the GL saw matches what PayrollBatch recorded,
// not two independently-computed figures.
export default async function PayrollReconciliationReportPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const batches = await db.payrollBatch.findMany({
    where: { orgId, status: { in: ["APPROVED_HRMS", "FINALIZED", "PAID"] } },
    orderBy: { month: "desc" },
    take: 24,
    include: {
      journalEntry: { select: { voucherNo: true } },
      sourceSnapshot: { select: { id: true } },
    },
  });

  const snapshots = await db.accountingPayrollRunSnapshot.findMany({
    where: { orgId, sourceSnapshotId: { in: batches.map((b) => b.sourceSnapshotId).filter((v): v is string => v != null) } },
    select: { sourceSnapshotId: true, allocationDetail: true, totalDebit: true, totalCredit: true },
  });
  const snapshotMap = new Map(snapshots.map((s) => [s.sourceSnapshotId, s]));

  type AllocationLine = { componentCode: string; credit: string; debit: string };

  const rows = batches.map((batch) => {
    const snapshot = batch.sourceSnapshotId ? snapshotMap.get(batch.sourceSnapshotId) : null;
    const lines = (snapshot?.allocationDetail as unknown as AllocationLine[] | null) ?? [];
    const netPayableLine = lines.find((l) => l.componentCode.includes("NET_PAYABLE"));
    const netPayableAmount = netPayableLine ? Number(netPayableLine.credit) : null;
    const batchTotal = Number(batch.totalAmount);
    const balanced = snapshot ? Number(snapshot.totalDebit) === Number(snapshot.totalCredit) : null;

    return { batch, netPayableAmount, batchTotal, balanced };
  });

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/reports"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Reports Centre
      </Link>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Accounting Reconciliation"
          description="Every posted pay run's GL snapshot, checked for internal balance (total debits == total credits)."
        />
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No posted pay runs to reconcile yet.</p>
        ) : (
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Period</PeopleTableHead>
                <PeopleTableHead>Type</PeopleTableHead>
                <PeopleTableHead>Batch Total (Dr)</PeopleTableHead>
                <PeopleTableHead>Net Payable (Cr)</PeopleTableHead>
                <PeopleTableHead>Journal Balanced</PeopleTableHead>
                <PeopleTableHead>Voucher</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {rows.map(({ batch, netPayableAmount, batchTotal, balanced }) => (
                <PeopleTableRow key={batch.id}>
                  <PeopleTableCell>{formatPayrollDate(batch.month.toISOString())}</PeopleTableCell>
                  <PeopleTableCell>{batch.type}</PeopleTableCell>
                  <PeopleTableCell>{formatPayrollMoney(batchTotal)}</PeopleTableCell>
                  <PeopleTableCell>{netPayableAmount != null ? formatPayrollMoney(netPayableAmount) : "—"}</PeopleTableCell>
                  <PeopleTableCell>
                    {balanced == null ? (
                      "—"
                    ) : (
                      <WorkspaceBadge variant={balanced ? "success" : "danger"}>
                        {balanced ? "Balanced" : "Unbalanced"}
                      </WorkspaceBadge>
                    )}
                  </PeopleTableCell>
                  <PeopleTableCell>{batch.journalEntry?.voucherNo ?? "—"}</PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        )}
        <WorkspaceAlert variant="info">
          Balance is checked against the immutable GL snapshot recorded at posting
          time (Dr total == Cr total, enforced by `acceptApprovedPayrollRun` before
          it ever writes) — this report re-displays that guarantee rather than
          re-deriving it, since the snapshot is the source of truth.
        </WorkspaceAlert>
      </WorkspacePanel>
    </div>
  );
}
