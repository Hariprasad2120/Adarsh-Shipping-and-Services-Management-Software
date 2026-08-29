/* eslint-disable @typescript-eslint/no-explicit-any */

import { notFound } from "next/navigation";

import { AccountingActionLink, AccountingRoutePageHeader } from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingPurchaseOrder } from "@/modules/accounting/purchase-orders";
import { PurchaseOrderDetailClient } from "./detail-client";

interface PurchaseOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseOrderDetailPage({
  params,
}: PurchaseOrderDetailPageProps) {
  const { id } = await params;
  const { orgId } = await requireAccountingRouteAccess(`/accounting/purchase-orders/${id}`, [
    "crm.invoice.manage",
    "accounting.purchase-invoice.prepare",
  ]);

  let purchaseOrder: any;
  try {
    purchaseOrder = await getAccountingPurchaseOrder(orgId, id);
  } catch {
    notFound();
  }

  const serialized = {
    ...purchaseOrder,
    date: purchaseOrder.date.toISOString(),
    dueDate: purchaseOrder.dueDate?.toISOString() ?? null,
    submittedAt: purchaseOrder.submittedAt?.toISOString() ?? null,
    approvedAt: purchaseOrder.approvedAt?.toISOString() ?? null,
    createdAt: purchaseOrder.createdAt.toISOString(),
    updatedAt: purchaseOrder.updatedAt.toISOString(),
    items: purchaseOrder.items.map((item: any) => ({
      ...item,
      createdAt: item.createdAt?.toISOString?.() ?? null,
      updatedAt: item.updatedAt?.toISOString?.() ?? null,
    })),
    linkedPurchaseInvoices: purchaseOrder.linkedPurchaseInvoices.map((invoice: any) => ({
      ...invoice,
      grandTotal: invoice.grandTotal.toString(),
      createdAt: invoice.createdAt.toISOString(),
    })),
  };

  return (
    <>
      <AccountingRoutePageHeader
        title={`Purchase order ${purchaseOrder.invoiceNumber}`}
        actions={
          <AccountingActionLink href="/accounting/purchase-orders">
            Back to purchase orders
          </AccountingActionLink>
        }
      />
      <PurchaseOrderDetailClient purchaseOrder={serialized} />
    </>
  );
}
