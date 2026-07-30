import { Plus } from "lucide-react";

import { CanonicalPaymentRegister } from "@/components/monolith/accounting-operational-views";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listCanonicalAccountingPayments } from "@/modules/accounting/operational-queries";

export default async function AccountingPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/payments",
  );
  const { page } = await searchParams;
  const payments = await listCanonicalAccountingPayments(orgId, {
    page: Number(page) || 1,
  });
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.payment.create"] ? (
            <AccountingActionLink
              href="/accounting/payment-entries/new"
              variant="primary"
            >
              <Plus aria-hidden="true" size={16} />
              New draft
            </AccountingActionLink>
          ) : undefined
        }
      />
      <AccountingSection
        eyebrow="Canonical register"
        title="Receipts and payments"
        description="Accounting posting, allocation, and reversal state. External bank execution is deliberately not inferred."
      >
        <CanonicalPaymentRegister
          basePath="/accounting/payments"
          data={payments}
        />
      </AccountingSection>
    </>
  );
}
