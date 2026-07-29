/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSalesInvoice } from "@/modules/accounting/service";
import { SalesInvoiceDetailClient } from "./detail-client";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";

interface SalesInvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SalesInvoiceDetailPage({ params }: SalesInvoiceDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;
  const { id } = await params;

  const invoice = (await getSalesInvoice(orgId, id)) as any;
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
    updatedAt: invoice.updatedAt.toISOString(),
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
    <>
      <AccountingRoutePageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        actions={
          <AccountingActionLink href="/accounting/sales-invoices">
            Back to sales invoices
          </AccountingActionLink>
        }
      />
      <SalesInvoiceDetailClient invoice={serializedInvoice} />
    </>
  );
}
