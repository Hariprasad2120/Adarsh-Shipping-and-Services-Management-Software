import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { listPayrollTaxChallans } from "@/modules/payroll/tax-challan-actions";
import { TaxChallansClient } from "@/modules/payroll/components/tax-challans-client";

// Phase 31: reference taxes-and-forms_tax-payments_unassociated/associated
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, pages 00021/00126).
export default async function PayrollTaxPaymentsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const [challans, batches] = await Promise.all([
    listPayrollTaxChallans(orgId),
    db.payrollBatch.findMany({
      where: { orgId, type: "REGULAR", status: { in: ["APPROVED_HRMS", "FINALIZED", "PAID"] } },
      orderBy: { month: "desc" },
      take: 12,
      select: { month: true },
    }),
  ]);

  const liabilityOptions = await Promise.all(
    batches.map(async (batch) => {
      const workspace = await getPayrollWorkspaceData(orgId, batch.month);
      return {
        month: batch.month.toISOString(),
        label: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(batch.month),
        outstanding: workspace.summary.tdsLiability,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/taxes-and-forms"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Taxes &amp; Forms
      </Link>
      <TaxChallansClient challans={challans} liabilityOptions={liabilityOptions.filter((o) => o.outstanding > 0)} />
    </div>
  );
}
