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

  const toCard = (batch: { id: string; month: Date; status: string; totalAmount: unknown }, title: string): BatchCard => {
    const overdueDays = batch.month < now && batch.status !== "PAID" ? Math.floor((now.getTime() - batch.month.getTime()) / 86_400_000) : 0;
    return {
      id: batch.id,
      title,
      status: batch.status === "PAID" ? "PAID" : "PAYMENT_DUE",
      totalAmount: Number(batch.totalAmount),
      paymentDate: batch.month.toISOString(),
      employeeCount: null,
      overdueDays,
    };
  };

  const offCycleCards = offCycleBatches
    .filter((b) => b.status !== "PAID")
    .map((b) => toCard(b, "Off Cycle Payroll"));
  const terminationCards = terminationBatches
    .filter((b) => b.status !== "PAID")
    .map((b) => toCard(b, "Final Settlement Payroll"));

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
        employees={employeeOptions}
        exitingEmployees={exitingEmployeeOptions}
      />
    </div>
  );
}
