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
import { serializeQuotationForPresentation } from "./quotation-presentation";

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; quote?: string; tab?: string }>;
}) {
  const { edit, quote, tab } = await searchParams;
  const { orgId, caps } = await requireAccountingRouteAccess(
    "/accounting/quotations",
    [
      "accounting.quotation.read",
      "accounting.quotation.create",
      "accounting.quotation.edit",
      "accounting.quotation.submit",
      "accounting.quotation.approve",
      "accounting.quotation.send",
      "accounting.quotation.decide",
      "accounting.quotation.cancel",
      "accounting.quotation.convert_invoice",
      "accounting.note.read",
      "accounting.correction.read",
      "crm.invoice.manage",
    ],
  );

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

  const activeTab = tab === "notes" ? "notes" : "quotations";
  const selectedQuotationId =
    activeTab === "quotations" ? quote || quotations[0]?.id || null : null;
  const selectedQuotationRecord = selectedQuotationId
    ? await getQuotation(orgId, selectedQuotationId)
    : null;

  const quotationCaps = {
    canEdit: Boolean(caps["accounting.quotation.edit"]),
    canSubmit: Boolean(caps["accounting.quotation.submit"]),
    canApprove: Boolean(caps["accounting.quotation.approve"]),
    canSend: Boolean(caps["accounting.quotation.send"]),
    canDecide: Boolean(caps["accounting.quotation.decide"]),
    canCancel: Boolean(caps["accounting.quotation.cancel"]),
    canConvert: Boolean(caps["accounting.quotation.convert_invoice"]),
    canConvertToSalesOrder: Boolean(caps["crm.invoice.manage"]),
    canCreate: Boolean(caps["accounting.quotation.create"]),
  };

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
      activeTab={activeTab}
      selectedQuotationId={selectedQuotationId}
      selectedQuotation={
        selectedQuotationRecord
          ? serializeQuotationForPresentation(selectedQuotationRecord)
          : null
      }
      quotationCaps={quotationCaps}
    />
  );
}
