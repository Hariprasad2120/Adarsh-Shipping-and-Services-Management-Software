import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { WorkspaceBadge } from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { formatPayrollDate } from "@/modules/payroll/service";

const TYPE_LABELS: Record<string, string> = {
  REGULAR: "Regular Payroll",
  OFF_CYCLE: "Off-Cycle Payroll",
  TERMINATION: "Final Settlement Payroll",
  BONUS: "Statutory Bonus",
};

// Matches captured Payroll History tab exactly
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00066).
export default async function PayrollHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const { type } = await searchParams;
  const typeFilter = type && type !== "ALL" ? type : undefined;

  const batches = await db.payrollBatch.findMany({
    where: { orgId, status: { in: ["APPROVED_HRMS", "FINALIZED", "PAID"] }, ...(typeFilter ? { type: typeFilter } : {}) },
    orderBy: { month: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <form method="get" className="flex items-center gap-2">
        <span className="text-sm text-[var(--mnx-muted)]">Payroll Type:</span>
        <NativeSelect name="type" defaultValue={type ?? "ALL"} className="w-auto">
          <option value="ALL">All</option>
          <option value="REGULAR">Regular Payroll</option>
          <option value="OFF_CYCLE">Off-Cycle Payroll</option>
          <option value="TERMINATION">Final Settlement Payroll</option>
          <option value="BONUS">Statutory Bonus</option>
        </NativeSelect>
        <Button type="submit" variant="inverse" size="sm">
          Apply
        </Button>
      </form>

      {batches.length === 0 ? (
        <p className="text-sm text-[var(--mnx-muted)]">No payroll history yet.</p>
      ) : (
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Payment Date</PeopleTableHead>
              <PeopleTableHead>Payroll Type</PeopleTableHead>
              <PeopleTableHead>Details</PeopleTableHead>
              <PeopleTableHead>Payroll Status</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {batches.map((batch) => (
              <PeopleTableRow key={batch.id}>
                <PeopleTableCell>{formatPayrollDate(batch.month.toISOString())}</PeopleTableCell>
                <PeopleTableCell>{TYPE_LABELS[batch.type] ?? batch.type}</PeopleTableCell>
                <PeopleTableCell>
                  {batch.type === "REGULAR" ? (
                    <Link href={`/payroll/pay-runs/regular?period=${batch.month.getUTCFullYear()}-${String(batch.month.getUTCMonth() + 1).padStart(2, "0")}`} className="text-[var(--mnx-accent-strong)] hover:underline">
                      {formatPayrollDate(batch.month.toISOString())}
                    </Link>
                  ) : (
                    <Link href={`/payroll/pay-runs/${batch.id}`} className="text-[var(--mnx-accent-strong)] hover:underline">
                      {formatPayrollDate(batch.month.toISOString())}
                    </Link>
                  )}
                </PeopleTableCell>
                <PeopleTableCell>
                  <WorkspaceBadge variant={batch.status === "PAID" ? "success" : "neutral"}>
                    {batch.status === "PAID" ? "Paid" : batch.status}
                  </WorkspaceBadge>
                </PeopleTableCell>
              </PeopleTableRow>
            ))}
          </PeopleTableBody>
        </PeopleTable>
      )}
    </div>
  );
}
