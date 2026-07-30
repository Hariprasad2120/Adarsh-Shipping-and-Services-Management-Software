import { Plus } from "lucide-react";

import { CanonicalPaymentRegister } from "@/components/monolith/accounting-operational-views";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listCanonicalAccountingPayments } from "@/modules/accounting/operational-queries";

export default async function VendorPaymentsPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/vendor-payments",
  );
  const payments = await listCanonicalAccountingPayments(orgId, {
    paymentTypes: ["VENDOR_PAYMENT"],
    pageSize: 50,
  });
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.payment.create"] ? (
            <AccountingActionLink
              href="/accounting/payment-entries/new?type=PAY"
              variant="primary"
            >
              <Plus aria-hidden="true" size={16} />
              New payment draft
            </AccountingActionLink>
          ) : undefined
        }
      />
      <AccountingSection
        eyebrow="Accounts payable"
        title="Canonical vendor-payment register"
        description="Prepared Accounting disbursements are not marked externally transferred unless a supported external state exists."
      >
        <CanonicalPaymentRegister
          basePath="/accounting/vendor-payments"
          data={payments}
        />
      </AccountingSection>
    </>
  );
}
