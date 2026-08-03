import { Plus } from "lucide-react";

import { CanonicalPaymentRegister } from "@/components/monolith/accounting-operational-views";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listCanonicalAccountingPayments } from "@/modules/accounting/operational-queries";

export default async function CustomerReceiptsPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/customer-receipts",
  );
  const receipts = await listCanonicalAccountingPayments(orgId, {
    paymentTypes: ["CUSTOMER_RECEIPT"],
    pageSize: 50,
  });
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <div className="mnx-accounting-inline-actions">
            {caps["accounting.payment.create"] ? (
              <AccountingActionLink
                href="/accounting/sales-receipts/new"
                variant="primary"
              >
                <Plus aria-hidden="true" size={16} />
                New sales receipt
              </AccountingActionLink>
            ) : null}
            <AccountingActionLink href="/accounting/customer-advances">
              Customer advances
            </AccountingActionLink>
          </div>
        }
      />
      <AccountingSection
        eyebrow="Accounts receivable"
        title="Canonical receipt register"
        description="Partial and multi-invoice allocations, unapplied amounts, journal effects, and reversal lineage."
      >
        <CanonicalPaymentRegister
          basePath="/accounting/customer-receipts"
          data={receipts}
        />
      </AccountingSection>
    </>
  );
}
