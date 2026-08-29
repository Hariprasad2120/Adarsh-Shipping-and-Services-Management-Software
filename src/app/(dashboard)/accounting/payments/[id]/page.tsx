import { notFound } from "next/navigation";

import { AccountingActionLink, AccountingRoutePageHeader, CanonicalPaymentDetailView } from "@/components/monolith";
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
