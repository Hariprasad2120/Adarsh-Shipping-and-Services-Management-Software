import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { listIncentiveEntries } from "@/modules/incentives/service";
import { HrmsIncentivesClient } from "./incentives-client";

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

export default async function HrmsIncentivesPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  await requirePermission(session.user.id, "hrms.salary.read");

  const incentives = await listIncentiveEntries(session.user.orgId);

  return <HrmsIncentivesClient initialIncentives={serializeIncentives(incentives)} />;
}
