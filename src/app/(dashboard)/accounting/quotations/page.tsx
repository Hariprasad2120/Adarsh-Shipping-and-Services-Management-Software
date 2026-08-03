/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { db } from "@/lib/db";
import {
  getQuotation,
  listCustomerNotes,
  listQuotations,
} from "@/modules/accounting/service";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { QuotationsClient } from "./quotations-client";

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const { orgId } = await requireAccountingRouteAccess("/accounting/quotations", [
    "accounting.quotation.read",
    "accounting.quotation.edit",
    "accounting.note.read",
    "accounting.correction.read",
  ]);

  // Fetch quotations, notes, customers, sales invoices, and shared payment terms
  const [quotations, notes, customers, invoices, paymentTerms, editDraft] = await Promise.all([
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
    db.accountingPaymentTerm.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true, dueDays: true },
      orderBy: { name: "asc" },
    }),
    edit ? getQuotation(orgId, edit) : Promise.resolve(null),
  ]);

  const serializedEditDraft =
    editDraft && editDraft.status === "DRAFT"
      ? {
          id: editDraft.id,
          customerId: editDraft.customerId,
          validUntil: editDraft.validUntil.toISOString().slice(0, 10),
          terms: editDraft.terms ?? "",
          remarks: editDraft.remarks ?? "",
          rowVersion: editDraft.rowVersion,
          items: editDraft.items.map((line: any) => ({
            itemName: line.itemName,
            qty: Number(line.qty),
            rate: Number(line.rate),
            taxRate: Number(line.taxRate),
          })),
        }
      : null;

  return (
      <QuotationsClient
        initialQuotations={quotations.map((q: any) => ({
          id: q.id,
          quotationNumber: q.quotationNumber,
          customerName: q.customer?.name || "Unknown Customer",
          postingDate: q.postingDate,
          validUntil: q.validUntil,
          rowVersion: q.rowVersion,
          taxableAmount: Number(q.subTotal),
          taxAmount: Number(q.taxAmount),
          grandTotal: Number(q.grandTotal),
          status: q.status,
          sendStatus: q.sendStatus,
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
        initialEditDraft={serializedEditDraft}
        paymentTerms={paymentTerms}
      />
  );
}
