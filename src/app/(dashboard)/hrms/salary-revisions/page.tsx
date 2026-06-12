import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import {
  computeSalaryRevisionStats,
  listSalaryRevisionSummaries,
} from "@/modules/hrms/salary-revisions";
import { SalaryRevisionsClient } from "./salary-revisions-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function SalaryRevisionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "hrms.employee.read");

  const params = await searchParams;
  const initialEmployeeId = typeof params.employeeId === "string" ? params.employeeId : undefined;

  const summaries = await listSalaryRevisionSummaries(session.user.orgId!);
  const stats = computeSalaryRevisionStats(summaries);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div>
            <h1 className="ds-h1 text-on-surface">Salary Revisions</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              {stats.totalRevisions} revisions across {stats.employees} employees.
            </p>
          </div>
          <Breadcrumbs
            items={[
              { label: "HRMS", href: "/hrms" },
              { label: "Salary Revisions" },
            ]}
          />
        </div>
      </div>

      <SalaryRevisionsClient initialEmployeeId={initialEmployeeId} stats={stats} summaries={summaries} />
    </div>
  );
}
