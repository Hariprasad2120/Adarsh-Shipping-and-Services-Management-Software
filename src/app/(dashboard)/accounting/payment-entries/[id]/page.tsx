import React from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getPaymentEntry } from "@/modules/accounting/service";
import { PaymentEntryDetailClient } from "./detail-client";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import NextLink from "next/link";

interface PaymentEntryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentEntryDetailPage({ params }: PaymentEntryDetailPageProps) {
  const session = await auth();
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
    <div className="p-8 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-5">
        <NextLink
          href="/accounting/payment-entries"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer border border-[#1c212a]/30"
          title="Back to Payments"
        >
          <ArrowLeft className="size-5" />
        </NextLink>
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            Payment Ref: {payment.referenceNo || `PAY-${payment.id.slice(-6).toUpperCase()}`}
          </h2>
          <span className="text-[10px] font-mono text-slate-400 block tracking-wider mt-0.5">Voucher Reference: {payment.id}</span>
        </div>
      </div>

      <PaymentEntryDetailClient payment={serializedPayment} />
    </div>
  );
}
