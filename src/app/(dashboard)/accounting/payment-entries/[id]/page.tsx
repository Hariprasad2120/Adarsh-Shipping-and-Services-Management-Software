import React from "react";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getPaymentEntry } from "@/modules/accounting/service";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { PaymentEntryDetailClient } from "./detail-client";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";

interface PaymentEntryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentEntryDetailPage({ params }: PaymentEntryDetailPageProps) {
  const { id } = await params;
  const { orgId } = await requireAccountingRouteAccess(
    `/accounting/payment-entries/${id}`,
    [
      "accounting.payment.read",
      "accounting.payment.prepare",
    ],
  );
  const canonical = await db.accountingPayment.findFirst({
    where: { orgId, legacyPaymentEntryId: id },
    orderBy: { sourceVersion: "desc" },
    select: { id: true },
  });
  if (canonical) redirect(`/accounting/payments/${canonical.id}`);

  const payment = await getPaymentEntry(orgId, id);
  if (!payment) notFound();

  // Serialize values
  const serializedPayment = {
    ...payment,
    amount: payment.amount.toString(),
    postingDate: payment.postingDate.toISOString(),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    allocations: payment.allocations.map(al => {
      const sal = al.salesInvoice ? { ...al.salesInvoice, grandTotal: al.salesInvoice.grandTotal.toString(), paidAmount: al.salesInvoice.paidAmount.toString(), outstandingAmount: al.salesInvoice.outstandingAmount.toString() } : null;
      const pur = al.purchaseInvoice ? { ...al.purchaseInvoice, grandTotal: al.purchaseInvoice.grandTotal.toString(), paidAmount: al.purchaseInvoice.paidAmount.toString(), outstandingAmount: al.purchaseInvoice.outstandingAmount.toString() } : null;
      return {
        ...al,
        allocatedAmount: al.allocatedAmount.toString(),
        salesInvoice: sal,
        purchaseInvoice: pur,
      };
    }),
  };

  return (
    <>
      <AccountingRoutePageHeader
        title={`Payment ${payment.referenceNo || `PAY-${payment.id.slice(-6).toUpperCase()}`}`}
        actions={
          <AccountingActionLink href="/accounting/payment-entries">
            Back to payments
          </AccountingActionLink>
        }
      />
      <PaymentEntryDetailClient payment={serializedPayment} />
    </>
  );
}
