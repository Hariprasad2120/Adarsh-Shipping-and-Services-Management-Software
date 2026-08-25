import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAll, can as hasPermission, requirePermission } from "@/lib/rbac";
import { getPayrollBatches } from "@/modules/accounting/service";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { PayrollClient } from "./payroll-client";

function parsePeriod(searchPeriod: string | undefined) {
  if (!searchPeriod) return new Date();
  const match = searchPeriod.match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date();
  const [, year, month] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  await requirePermission(session.user.id, "hrms.salary.read");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  const params = await searchParams;
  const selectedPeriod = parsePeriod(
    typeof params.period === "string" ? params.period : undefined,
  );

  const [workspace, batches, canApproveRun, canPostAccrual] = await Promise.all([
    getPayrollWorkspaceData(orgId, selectedPeriod),
    getPayrollBatches(orgId),
    canAll(session.user.id, ["hrms.salary.manage", "accounting.integration.post"]),
    hasPermission(session.user.id, "accounting.post"),
  ]);

  const serializedBatches = batches
    .filter((batch) => batch.type === "REGULAR")
    .map((batch) => ({
    id: batch.id,
    month: batch.month.toISOString(),
    type: batch.type,
    status: batch.status,
    totalAmount: Number(batch.totalAmount),
    journalVoucherNo: batch.journalEntry?.voucherNo ?? null,
    journalEntryId: batch.journalEntry?.id ?? null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  }));

  return (
    <PayrollClient
      canApproveRun={canApproveRun}
      canPostAccrual={canPostAccrual}
      initialBatches={serializedBatches}
      workspace={workspace}
    />
  );
}
