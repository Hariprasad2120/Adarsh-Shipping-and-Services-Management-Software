/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listQuotations, listCustomerNotes } from "@/modules/accounting/service";
import { QuotationsClient } from "./quotations-client";

export default async function QuotationsPage() {
  const session = await getSession();
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
  );
}
