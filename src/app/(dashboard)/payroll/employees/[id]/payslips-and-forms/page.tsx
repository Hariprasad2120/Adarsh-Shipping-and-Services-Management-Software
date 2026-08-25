import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getPayrollBatches } from "@/modules/accounting/service";
import { getPayrollEmployeeDetail } from "@/modules/payroll/employee-detail-service";

// Phase 34-35: real payslip PDF, generated server-side from the same
// calculated pay-run row the engine already produces
// (src/modules/payroll/pdf/generate-payslip.tsx).
export default async function PayrollEmployeePayslipsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { id } = await params;
  const employee = await getPayrollEmployeeDetail(session.user.orgId, id);
  if (!employee) notFound();

  const batches = (await getPayrollBatches(session.user.orgId)).filter((b) => b.type === "REGULAR");

  return (
    <div className="space-y-6">
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="01" title="Payslips and TDS Sheets" />
        {batches.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No payroll batches processed yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {batches.slice(0, 12).map((batch) => {
              const periodKey = `${batch.month.getUTCFullYear()}-${String(batch.month.getUTCMonth() + 1).padStart(2, "0")}`;
              return (
                <li
                  key={batch.id}
                  className="flex items-center justify-between rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3"
                >
                  <span className="text-[var(--mnx-text)]">
                    {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(batch.month)}
                  </span>
                  <a
                    className="mnx-button mnx-button-secondary"
                    href={`/api/payroll/employees/${id}/payslip?period=${periodKey}`}
                  >
                    Download Payslip
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="02" title="Form 16" />
        <p className="text-sm text-[var(--mnx-muted)]">
          Form 16 hasn&apos;t been generated for this employee yet — Form 16
          generation is not implemented (Phase 28).
        </p>
      </WorkspacePanel>
    </div>
  );
}
