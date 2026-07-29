import React from "react";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getPaymentEntry } from "@/modules/accounting/service";
import { PaymentEntryDetailClient } from "./detail-client";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";

interface PaymentEntryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentEntryDetailPage({ params }: PaymentEntryDetailPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;
  const { id } = await params;

  const payment = await getPaymentEntry(orgId, id);
  if (!payment) notFound();

  // Serialize values
  const serializedPayment = {
    ...payment,
    amount: Number(payment.amount),
    postingDate: payment.postingDate.toISOString(),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    allocations: payment.allocations.map(al => {
      const sal = al.salesInvoice ? { ...al.salesInvoice, grandTotal: Number(al.salesInvoice.grandTotal), paidAmount: Number(al.salesInvoice.paidAmount), outstandingAmount: Number(al.salesInvoice.outstandingAmount) } : null;
      const pur = al.purchaseInvoice ? { ...al.purchaseInvoice, grandTotal: Number(al.purchaseInvoice.grandTotal), paidAmount: Number(al.purchaseInvoice.paidAmount), outstandingAmount: Number(al.purchaseInvoice.outstandingAmount) } : null;
      return {
        ...al,
        allocatedAmount: Number(al.allocatedAmount),
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
