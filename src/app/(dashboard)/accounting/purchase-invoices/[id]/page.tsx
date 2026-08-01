/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getPurchaseInvoice } from "@/modules/accounting/service";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { PurchaseInvoiceDetailClient } from "./detail-client";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/modules/accounting/components/accounting-workspace";

interface PurchaseInvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseInvoiceDetailPage({ params }: PurchaseInvoiceDetailPageProps) {
  const { id } = await params;
  const { orgId } = await requireAccountingRouteAccess(
    `/accounting/purchase-invoices/${id}`,
    [
      "accounting.document.read",
      "accounting.invoice.read",
      "accounting.purchase-invoice.prepare",
    ],
  );
  const canonical = await db.accountingDocument.findFirst({
    where: {
      orgId,
      legacyRecordType: "PurchaseInvoice",
      legacyRecordId: id,
    },
    orderBy: { sourceVersion: "desc" },
    select: { id: true },
  });
  if (canonical) redirect(`/accounting/documents/${canonical.id}`);

  const invoice = (await getPurchaseInvoice(orgId, id)) as any;
  if (!invoice) notFound();

  // Serialize values
  const serializedInvoice = {
    ...invoice,
    grandTotal: invoice.grandTotal.toString(),
    paidAmount: invoice.paidAmount.toString(),
    outstandingAmount: invoice.outstandingAmount.toString(),
    discountAmount: invoice.discountAmount.toString(),
    taxAmount: invoice.taxAmount.toString(),
    postingDate: invoice.postingDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    items: invoice.items.map((it: any) => ({
      ...it,
      rate: it.rate.toString(),
      amount: it.amount.toString(),
    })),
    taxLines: invoice.taxLines.map((t: any) => ({
      ...t,
      taxAmount: t.taxAmount.toString(),
    })),
    payments: invoice.payments.map((p: any) => ({
      ...p,
      allocatedAmount: p.allocatedAmount.toString(),
      paymentEntry: {
        ...p.paymentEntry,
        postingDate: p.paymentEntry.postingDate.toISOString(),
      }
    })),
    glEntries: invoice.glEntries.map((gl: any) => ({
      ...gl,
      debit: gl.debit.toString(),
      credit: gl.credit.toString(),
      postingDate: gl.postingDate.toISOString(),
    })),
  };

  return (
    <>
      <AccountingRoutePageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        actions={
          <AccountingActionLink href="/accounting/purchase-invoices">
            Back to purchase invoices
          </AccountingActionLink>
        }
      />
      <PurchaseInvoiceDetailClient invoice={serializedInvoice} />
    </>
  );
}
