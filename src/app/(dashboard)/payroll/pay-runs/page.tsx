import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getSession } from "@/lib/auth";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { listOffCyclePayrollBatches } from "@/modules/hrms/off-cycle-payroll";
import { listExitingEmployees, listTerminationPayrollBatches } from "@/modules/hrms/termination-payroll";
import { db } from "@/lib/db";
import { PayRunsListClient, type BatchCard, type RegularCard } from "@/modules/payroll/components/pay-runs-list-client";

// Phase 16-21: Pay Runs list, matching the captured card layout exactly
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00009). Previously
// this route stacked type-filter chips + the full processing engine +
// permanently-visible off-cycle/termination panels all at once — the
// reported clutter. Now: one card list, "+New" for creation, each card
// links out to its own detail page.
export default async function PayrollPayRunsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  await requirePermission(session.user.id, "hrms.salary.read");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  const now = new Date();
  const [workspace, offCycleBatches, terminationBatches, employees, exitingEmployees] = await Promise.all([
    getPayrollWorkspaceData(orgId, now),
    listOffCyclePayrollBatches(orgId),
    listTerminationPayrollBatches(orgId),
    db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, employeeNumber: true },
      orderBy: { name: "asc" },
    }),
    listExitingEmployees(orgId),
  ]);

  // Phase 34: a not-yet-processed regular pay run only ever exists as this
  // pre-batch `regularCard` shape (workspace has no persisted "draft in
  // progress but not yet approved" state — see EmployeeDrawer's save-stub
  // note in pay-run-summary-client.tsx), so this is always the Zoho "READY"
  // state, never Zoho's separate "DRAFT already started" state.
  const regularCard: RegularCard | null =
    workspace.hasApprovedBatch || workspace.hasPostedBatch
      ? null
      : {
          periodLabel: workspace.period.label,
          paymentDate: workspace.period.end,
          employeeCount: workspace.summary.employeesInPayroll,
          netPay: workspace.summary.netPayroll,
          dueDate: workspace.period.end,
          href: `/payroll/pay-runs/regular?period=${workspace.period.key}`,
        };

  const toCard = (
    batch: { id: string; month: Date; status: string; totalAmount: unknown; metadata: unknown },
    title: string,
  ): BatchCard => {
    const overdueDays = batch.month < now && batch.status !== "PAID" ? Math.floor((now.getTime() - batch.month.getTime()) / 86_400_000) : 0;
    // No off-cycle/termination batch in this system currently tracks a
    // payment-failure state (grepped prisma/schema.prisma and
    // off-cycle-payroll.ts/termination-payroll.ts for "FAILED" — no hits),
    // only DRAFT/APPROVED_HRMS/FINALIZED/PAID — so PAYMENT_FAILED stays
    // unreachable here pending a real failure-tracking field.
    const metadataEntries = (batch.metadata as { entries?: Array<{ employeeName?: string; employeeNumber?: string }> } | null)
      ?.entries;
    const singleEntry = Array.isArray(metadataEntries) && metadataEntries.length === 1 ? metadataEntries[0] : null;
    return {
      id: batch.id,
      title,
      status: batch.status === "PAID" ? "PAID" : "PAYMENT_DUE",
      totalAmount: Number(batch.totalAmount),
      paymentDate: batch.month.toISOString(),
      employeeCount: Array.isArray(metadataEntries) ? metadataEntries.length : null,
      singleEmployeeName: singleEntry?.employeeName ?? null,
      singleEmployeeNumber: singleEntry?.employeeNumber ?? null,
      overdueDays,
    };
  };

  const offCycleCards = offCycleBatches
    .filter((b) => b.status !== "PAID")
    .map((b) => toCard(b, "Off Cycle Payroll"));
  const terminationCards = terminationBatches
    .filter((b) => b.status !== "PAID" && b.type === "TERMINATION")
    .map((b) => toCard(b, "Final Settlement Payroll"));
  const bulkTerminationCards = terminationBatches
    .filter((b) => b.status !== "PAID" && b.type === "BULK_TERMINATION")
    .map((b) => toCard(b, "Bulk Termination Payroll"));

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    name: e.name,
    employeeNumber: e.employeeNumber == null ? "-" : String(e.employeeNumber),
  }));

  const exitingEmployeeOptions = exitingEmployees
    .filter((e) => e.employmentRecord?.exitDate)
    .map((e) => ({
      id: e.id,
      name: e.name,
      employeeNumber: e.employeeNumber == null ? "-" : String(e.employeeNumber),
      lastWorkingDay: e.employmentRecord!.exitDate!.toISOString(),
    }));

  return (
    <div className="space-y-4">
      <PayRunsListClient
        regularCard={regularCard}
        offCycleCards={offCycleCards}
        terminationCards={terminationCards}
        bulkTerminationCards={bulkTerminationCards}
        employees={employeeOptions}
        exitingEmployees={exitingEmployeeOptions}
      />
    </div>
  );
}
