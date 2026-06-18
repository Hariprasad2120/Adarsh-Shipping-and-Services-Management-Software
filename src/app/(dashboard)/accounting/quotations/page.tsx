import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listQuotations, listCustomerNotes } from "@/modules/accounting/service";
import { QuotationsClient } from "./quotations-client";

export default async function QuotationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Fetch quotations, notes, customers and sales invoices
  const [quotations, notes, customers, invoices] = await Promise.all([
    listQuotations(orgId),
    listCustomerNotes(orgId),
    db.crmAccount.findMany({
      where: { orgId, type: "Customer" },
      select: { id: true, name: true, gstin: true, billingAddress: true },
      orderBy: { name: "asc" },
    }),
    db.salesInvoice.findMany({
      where: { orgId },
      select: { id: true, invoiceNumber: true, grandTotal: true, postingDate: true },
      orderBy: { invoiceNumber: "desc" },
    }),
  ]);

  return (
    <div className="p-8 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-200">
      <div>
        <h2 className="ds-h1 text-white">Quotations &amp; Credit/Debit Notes</h2>
        <p className="text-slate-400 text-xs mt-1">
          Prepare pre-sales quotations, convert them to sales invoices, and issue customer adjustments.
        </p>
      </div>

      <QuotationsClient
        initialQuotations={quotations.map((q: any) => ({
          id: q.id,
          quotationNumber: q.quotationNumber,
          customerName: q.customer?.name || "Unknown Customer",
          postingDate: q.postingDate,
          validUntil: q.validUntil,
          taxableAmount: Number(q.taxableAmount),
          taxAmount: Number(q.taxAmount),
          grandTotal: Number(q.grandTotal),
          status: q.status,
          remarks: q.remarks,
        }))}
        initialNotes={notes.map((n: any) => ({
          id: n.id,
          noteNumber: n.noteNumber,
          noteType: n.noteType,
          customerName: n.customer?.name || "Unknown Customer",
          postingDate: n.postingDate,
          taxableAmount: Number(n.taxableAmount),
          taxAmount: Number(n.taxAmount),
          grandTotal: Number(n.grandTotal),
          status: n.status,
          reason: n.reason,
        }))}
        customers={customers}
        invoices={invoices.map((i: any) => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          grandTotal: Number(i.grandTotal),
          postingDate: i.postingDate,
        }))}
      />
    </div>
  );
}
