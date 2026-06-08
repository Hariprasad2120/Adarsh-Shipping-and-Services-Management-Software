import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import {
  computeSalaryRevisionStats,
  listSalaryRevisionSummaries,
} from "@/modules/hrms/salary-revisions";
import { SalaryRevisionsClient } from "./salary-revisions-client";

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
          <div className="flex items-center gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
              <FileText className="size-5" />
            </span>
            <div>
              <h1 className="ds-h1 text-on-surface">Salary Revisions</h1>
              <p className="mt-1 text-sm text-on-surface-variant">
                {stats.totalRevisions} revisions across {stats.employees} employees.
              </p>
            </div>
          </div>
        </div>
        <Link href="/ams/appraisals" className="text-sm text-on-surface-variant transition hover:text-on-surface">
          <span className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Appraisals
          </span>
        </Link>
      </div>

      <SalaryRevisionsClient initialEmployeeId={initialEmployeeId} stats={stats} summaries={summaries} />
    </div>
  );
}
