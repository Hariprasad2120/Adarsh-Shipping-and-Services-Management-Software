import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { formatPayrollMoney } from "@/modules/payroll/service";

function currentFiscalYearStart() {
  const now = new Date();
  const fyStartYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return new Date(Date.UTC(fyStartYear, 3, 1));
}

export default async function PayrollMyHomePage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;
  const employeeId = session.user.id;

  const currentWorkspace = await getPayrollWorkspaceData(orgId, new Date());
  const currentRow = currentWorkspace.rows.find((r) => r.employeeId === employeeId);

  const batches = await db.payrollBatch.findMany({
    where: { orgId, type: "REGULAR", status: { in: ["APPROVED_HRMS", "FINALIZED", "PAID"] } },
    orderBy: { month: "desc" },
    take: 4,
    select: { month: true },
  });

  const fyStart = currentFiscalYearStart();
  const fyBatches = await db.payrollBatch.findMany({
    where: { orgId, type: "REGULAR", month: { gte: fyStart }, status: { in: ["APPROVED_HRMS", "FINALIZED", "PAID"] } },
    select: { month: true },
  });
  const fyRows = await Promise.all(fyBatches.map((b) => getPayrollWorkspaceData(orgId, b.month)));
  const ytdEpf = fyRows.reduce((sum, ws) => {
    const row = ws.rows.find((r) => r.employeeId === employeeId);
    return sum + (row?.epfAmount ?? 0);
  }, 0);

  return (
    <div className="space-y-6">
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="01" title="Your Payslips" description={currentWorkspace.period.label} />
        {currentRow ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Take Home</div>
              <div className="mt-1 text-xl font-semibold text-[var(--mnx-text)]">{formatPayrollMoney(currentRow.netPay)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Deductions</div>
              <div className="mt-1 text-xl font-semibold text-[var(--mnx-text)]">{formatPayrollMoney(currentRow.employeeDeductions)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Gross Pay</div>
              <div className="mt-1 text-xl font-semibold text-[var(--mnx-text)]">{formatPayrollMoney(currentRow.grossEarnings)}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--mnx-muted)]">No payroll data for the current period yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {batches.map((batch) => {
            const key = `${batch.month.getUTCFullYear()}-${String(batch.month.getUTCMonth() + 1).padStart(2, "0")}`;
            return (
              <a
                key={key}
                className="mnx-button mnx-button-secondary"
                href={`/api/payroll/employees/${employeeId}/payslip?period=${key}`}
              >
                {new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" }).format(batch.month)}
              </a>
            );
          })}
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="space-y-2 p-5">
        <WorkspaceSectionHeading index="02" title="EPF Summary — Year to Date" />
        <div className="text-xl font-semibold text-[var(--mnx-text)]">{formatPayrollMoney(ytdEpf)}</div>
        <p className="text-sm text-[var(--mnx-muted)]">Combined employee and employer contribution this financial year.</p>
      </WorkspacePanel>

      <div className="flex flex-wrap gap-2">
        <Link className="mnx-button mnx-button-secondary" href="/my-payroll/salary-details">
          Salary Details
        </Link>
        <Link className="mnx-button mnx-button-secondary" href="/my-payroll/investments">
          Investments
        </Link>
      </div>
    </div>
  );
}
