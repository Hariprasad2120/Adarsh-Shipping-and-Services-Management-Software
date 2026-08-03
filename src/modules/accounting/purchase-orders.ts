import { db } from "@/lib/db";
import { createPurchaseInvoice } from "@/modules/accounting/service";

function uniqueTaxRate(lines: Array<{ taxPercent: number }>) {
  const values = Array.from(
    new Set(lines.map((line) => Number(line.taxPercent ?? 0).toFixed(4))),
  );
  if (values.length > 1) {
    throw new Error(
      "PURCHASE_ORDER_MIXED_TAX_RATES_NOT_SUPPORTED_FOR_CONVERSION",
    );
  }
  return Number(values[0] ?? "0");
}

export async function getAccountingPurchaseOrder(orgId: string, id: string) {
  const purchaseOrder = await db.crmInvoice.findFirst({
    where: {
      orgId,
      id,
      type: "PURCHASE_ORDER",
    },
    include: {
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      vendor: { select: { id: true, name: true, email: true, phone: true, address: true } },
      items: true,
      owner: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });
  if (!purchaseOrder) throw new Error("PURCHASE_ORDER_NOT_FOUND");

  const linkedPurchaseInvoices = await db.purchaseInvoice.findMany({
    where: {
      orgId,
      sourcePurchaseOrderId: purchaseOrder.id,
    },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      grandTotal: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return {
    ...purchaseOrder,
    linkedPurchaseInvoices,
  };
}

export async function convertPurchaseOrderToPurchaseInvoiceDraft(input: {
  orgId: string;
  actorId: string;
  purchaseOrderId: string;
}) {
  const purchaseOrder = await db.crmInvoice.findFirst({
    where: {
      orgId: input.orgId,
      id: input.purchaseOrderId,
      type: "PURCHASE_ORDER",
    },
    include: {
      vendor: { select: { id: true, name: true } },
      items: true,
    },
  });
  if (!purchaseOrder) throw new Error("PURCHASE_ORDER_NOT_FOUND");
  if (!purchaseOrder.vendorId || !purchaseOrder.vendor) {
    throw new Error("PURCHASE_ORDER_VENDOR_REQUIRED");
  }
  if (purchaseOrder.status === "CANCELLED") {
    throw new Error("PURCHASE_ORDER_CANCELLED");
  }
  if (purchaseOrder.items.length === 0) {
    throw new Error("PURCHASE_ORDER_ITEMS_REQUIRED");
  }

  const existing = await db.purchaseInvoice.findFirst({
    where: {
      orgId: input.orgId,
      sourcePurchaseOrderId: purchaseOrder.id,
      status: { not: "CANCELLED" },
    },
    select: { id: true, invoiceNumber: true },
  });
  if (existing) {
    throw new Error(
      `PURCHASE_ORDER_ALREADY_CONVERTED:${existing.id}:${existing.invoiceNumber}`,
    );
  }

  const taxRate = uniqueTaxRate(purchaseOrder.items);
  const dueDate = purchaseOrder.dueDate ?? purchaseOrder.date;
  const invoice = await createPurchaseInvoice(
    input.orgId,
    input.actorId,
    {
      supplierId: purchaseOrder.vendorId,
      postingDate: purchaseOrder.date,
      dueDate,
      discountAmount: purchaseOrder.discount,
      taxRate,
      remarks:
        purchaseOrder.manualNotes ||
        `Converted from purchase order ${purchaseOrder.invoiceNumber}`,
      paymentMethod: null,
      orderNumber: purchaseOrder.invoiceNumber,
      terms: purchaseOrder.terms || null,
      items: purchaseOrder.items.map((item) => ({
        itemName: item.productName,
        qty: item.qty,
        rate: item.rate,
        unit: item.unit || null,
        taxRate: item.taxPercent,
        tdsRate: null,
      })),
      sourcePurchaseOrderId: purchaseOrder.id,
      sourcePurchaseOrderNumber: purchaseOrder.invoiceNumber,
      sourcePurchaseOrderSnapshot: {
        id: purchaseOrder.id,
        invoiceNumber: purchaseOrder.invoiceNumber,
        status: purchaseOrder.status,
        approvalStatus: purchaseOrder.approvalStatus,
        vendorId: purchaseOrder.vendorId,
        date: purchaseOrder.date.toISOString(),
        dueDate: purchaseOrder.dueDate?.toISOString() ?? null,
        terms: purchaseOrder.terms,
      },
      sourcePurchaseOrderItems: purchaseOrder.items.map((item) => ({
        sourcePurchaseOrderItemId: item.id,
      })),
    },
  );

  return invoice;
}
