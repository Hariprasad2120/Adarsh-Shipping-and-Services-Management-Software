import React from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getPurchaseInvoice } from "@/modules/accounting/service";
import { PurchaseInvoiceDetailClient } from "./detail-client";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import NextLink from "next/link";

interface PurchaseInvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseInvoiceDetailPage({ params }: PurchaseInvoiceDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;
  const { id } = await params;

  const invoice = (await getPurchaseInvoice(orgId, id)) as any;
  if (!invoice) notFound();

  // Serialize values
  const serializedInvoice = {
    ...invoice,
    grandTotal: Number(invoice.grandTotal),
    paidAmount: Number(invoice.paidAmount),
    outstandingAmount: Number(invoice.outstandingAmount),
    discountAmount: Number(invoice.discountAmount),
    taxAmount: Number(invoice.taxAmount),
    postingDate: invoice.postingDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    items: invoice.items.map((it: any) => ({
      ...it,
      rate: Number(it.rate),
      amount: Number(it.amount),
    })),
    taxLines: invoice.taxLines.map((t: any) => ({
      ...t,
      taxAmount: Number(t.taxAmount),
    })),
    payments: invoice.payments.map((p: any) => ({
      ...p,
      allocatedAmount: Number(p.allocatedAmount),
      paymentEntry: {
        ...p.paymentEntry,
        postingDate: p.paymentEntry.postingDate.toISOString(),
      }
    })),
    glEntries: invoice.glEntries.map((gl: any) => ({
      ...gl,
      debit: Number(gl.debit),
      credit: Number(gl.credit),
      postingDate: gl.postingDate.toISOString(),
    })),
  };

  return (
    <div className="p-8 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-5">
        <NextLink
          href="/accounting/purchase-invoices"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer border border-[#1c212a]/30"
          title="Back to Purchase Invoices"
        >
          <ArrowLeft className="size-5" />
        </NextLink>
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Invoice: {invoice.invoiceNumber}</h2>
          <span className="text-[10px] font-mono text-slate-400 block tracking-wider mt-0.5">Invoice Reference: {invoice.id}</span>
        </div>
      </div>

      <PurchaseInvoiceDetailClient invoice={serializedInvoice} />
    </div>
  );
}
