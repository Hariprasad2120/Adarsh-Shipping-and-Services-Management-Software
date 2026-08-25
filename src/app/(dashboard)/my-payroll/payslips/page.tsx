import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";

export default async function PayrollMyPayslipsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const employeeId = session.user.id;

  const batches = await db.payrollBatch.findMany({
    where: { orgId: session.user.orgId, type: "REGULAR", status: { in: ["APPROVED_HRMS", "FINALIZED", "PAID"] } },
    orderBy: { month: "desc" },
    take: 24,
    select: { month: true },
  });

  return (
    <WorkspacePanel className="space-y-4 p-5">
      <WorkspaceSectionHeading index="01" title="Payslips" />
      {batches.length === 0 ? (
        <p className="text-sm text-[var(--mnx-muted)]">No payslips available yet.</p>
      ) : (
        <ul className="space-y-2">
          {batches.map((batch) => {
            const key = `${batch.month.getUTCFullYear()}-${String(batch.month.getUTCMonth() + 1).padStart(2, "0")}`;
            return (
              <li
                key={key}
                className="flex items-center justify-between rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3 text-sm"
              >
                <span className="text-[var(--mnx-text)]">
                  {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(batch.month)}
                </span>
                <a className="mnx-button mnx-button-secondary" href={`/api/payroll/employees/${employeeId}/payslip?period=${key}`}>
                  Download
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </WorkspacePanel>
  );
}
