import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { listIncentiveEntries } from "@/modules/incentives/service";
import { CrmIncentivesClient } from "./incentives-client";

function serializeIncentives(
  incentives: Awaited<ReturnType<typeof listIncentiveEntries>>,
) {
  return incentives.map((row) => ({
    id: row.id,
    employee: {
      id: row.employee.id,
      name: row.employee.name,
      email: row.employee.email,
      employeeNumber: row.employee.employeeNumber,
      departmentName: row.employee.department?.name ?? null,
    },
    createdBy: row.createdBy,
    processedBy: row.processedBy,
    incentiveType: row.incentiveType,
    referenceLabel: row.referenceLabel,
    customerName: row.customerName,
    amount: row.amount,
    currency: row.currency,
    eligibleDate: row.eligibleDate.toISOString(),
    status: row.status,
    notes: row.notes,
    hrNotes: row.hrNotes,
    processedAt: row.processedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export default async function CrmIncentivesPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  await requirePermission(session.user.id, "crm.access");

  const [employees, incentives] = await Promise.all([
    db.user.findMany({
      where: {
        orgId: session.user.orgId,
        active: true,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        employeeNumber: true,
        department: { select: { name: true } },
      },
    }),
    listIncentiveEntries(session.user.orgId),
  ]);

  return (
    <CrmIncentivesClient
      employees={employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeNumber: employee.employeeNumber,
        departmentName: employee.department?.name ?? null,
      }))}
      initialIncentives={serializeIncentives(incentives)}
    />
  );
}
