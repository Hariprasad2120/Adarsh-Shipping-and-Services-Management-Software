import { AccountingAllocationRegister } from "@/components/monolith/accounting-operational-views";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listAccountingAllocations } from "@/modules/accounting/operational-queries";

export default async function AccountingAllocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/allocations",
  );
  const { page } = await searchParams;
  const allocations = await listAccountingAllocations(orgId, {
    page: Number(page) || 1,
  });
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.payment.create"] ? (
            <AccountingActionLink href="/accounting/payment-entries/new">
              Allocate in new payment
            </AccountingActionLink>
          ) : undefined
        }
      />
      <AccountingSection
        eyebrow="Allocation workbench"
        title="Canonical allocation history"
        description="Eligibility, capacity, currency, legal entity, and target version are revalidated on the server during payment preparation."
      >
        <AccountingAllocationRegister data={allocations} />
      </AccountingSection>
    </>
  );
}
