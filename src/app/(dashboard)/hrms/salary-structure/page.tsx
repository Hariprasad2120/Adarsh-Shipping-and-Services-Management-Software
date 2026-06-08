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
    <div className="space-y-6">
      <div>
        <h1 className="ds-h1 text-on-surface">Salary Structure Generator</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Build the detailed salary sheet, validate take-home, and optionally update an employee&apos;s payroll meta.
        </p>
      </div>
      <SalaryStructureClient employees={employees} />
    </div>
  );
}
