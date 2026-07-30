import { notFound } from "next/navigation";

import { CanonicalPaymentDetailView } from "@/components/monolith/accounting-operational-views";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getCanonicalAccountingPayment } from "@/modules/accounting/operational-queries";

export default async function CanonicalPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { caps, orgId, userId } = await requireAccountingRouteAccess(
    "/accounting/payments",
  );
  const { id } = await params;
  const payment = await getCanonicalAccountingPayment(orgId, id);
  if (!payment) notFound();
  return (
    <>
      <AccountingRoutePageHeader
        eyebrow="Canonical Accounting payment"
        title={payment.paymentType.replaceAll("_", " ")}
        description={`Immutable source version ${payment.sourceSnapshot.sourceVersion} · ${payment.status.replaceAll("_", " ")}`}
        actions={
          <AccountingActionLink href="/accounting/payments">
            Back to payments
          </AccountingActionLink>
        }
      />
      <CanonicalPaymentDetailView
        caps={caps}
        payment={payment}
        userId={userId}
      />
    </>
  );
}
