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
      <SalaryRevisionsClient initialEmployeeId={initialEmployeeId} stats={stats} summaries={summaries} />
    </div>
  );
}
