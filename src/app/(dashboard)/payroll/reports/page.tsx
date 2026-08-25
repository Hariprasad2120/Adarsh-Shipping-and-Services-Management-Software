import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { REPORT_CATALOG, REPORT_CATEGORIES } from "@/modules/payroll/reports-catalog";

// Phase 37: Reports Centre, matching the captured category/report catalogue
// exactly (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00011).
export default async function PayrollReportsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const implementedCount = REPORT_CATALOG.filter((r) => r.key).length;

  return (
    <div className="space-y-6">
      <WorkspacePanel className="space-y-2 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Reports Centre"
          description={`All Reports ${REPORT_CATALOG.length} — ${implementedCount} backed by real data today, the rest honestly marked unavailable rather than faked.`}
        />
        <div className="flex flex-wrap gap-2">
          <Link className="mnx-button mnx-button-secondary" href="/payroll/reports/reconciliation">
            Open Accounting Reconciliation
          </Link>
          <Link className="mnx-button mnx-button-secondary" href="/payroll/reports/variance">
            Open Variance &amp; Anomaly Review
          </Link>
        </div>
      </WorkspacePanel>

      {REPORT_CATEGORIES.map((category) => {
        const reports = REPORT_CATALOG.filter((r) => r.category === category);
        return (
          <WorkspacePanel key={category} className="space-y-3 p-5">
            <WorkspaceSectionHeading index=" " title={category} />
            <ul className="divide-y divide-[var(--mnx-border)]">
              {reports.map((report) => (
                <li key={report.name} className="flex items-center justify-between py-2 text-sm">
                  {report.key ? (
                    <Link href={`/payroll/reports/${report.key}`} className="text-[var(--mnx-accent-strong)] hover:underline">
                      {report.name}
                    </Link>
                  ) : (
                    <span className="text-[var(--mnx-text)]">{report.name}</span>
                  )}
                  {!report.key ? (
                    <span className="text-xs text-[var(--mnx-muted)]">Not available</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </WorkspacePanel>
        );
      })}
    </div>
  );
}
