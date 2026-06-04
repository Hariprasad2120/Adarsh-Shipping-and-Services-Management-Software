import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { listUsers } from "@/modules/core/user/service";
import { SalaryStructureClient } from "./salary-structure-client";

export default async function SalaryStructurePage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "hrms.employee.create");

  const orgId = session.user.orgId!;
  const allUsers = await listUsers(orgId, { active: true });

  const employees = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    designation: u.designation ?? null,
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Salary Structure Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Compute full CTC breakup. Optionally update an employee&apos;s salary record.
        </p>
      </div>
      <SalaryStructureClient employees={employees} />
    </div>
  );
}
