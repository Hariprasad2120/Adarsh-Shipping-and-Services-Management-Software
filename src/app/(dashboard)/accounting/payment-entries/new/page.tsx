import React from "react";
import { db } from "@/lib/db";
import { listAccounts } from "@/modules/accounting/service";
import { NewPaymentClient } from "./new-payment-client";
import { AccountingRoutePageHeader } from "@/modules/accounting/components/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

export default async function NewPaymentEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/payment-entries/new",
    ["accounting.payment.create"],
  );
  const requestedType = (await searchParams).type;
  const initialPaymentType = requestedType === "PAY" ? "PAY" : "RECEIVE";

  const [
    accounts,
    customers,
    suppliers,
    branches,
    canonicalSalesInvoices,
    canonicalPurchaseInvoices,
  ] = await Promise.all([
    listAccounts(orgId),
    db.crmAccount.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.crmVendor.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.accountingDocument.findMany({
      where: {
        orgId,
        status: "POSTED",
        documentType: "SALES_INVOICE",
        legacyRecordType: "SalesInvoice",
        legacyRecordId: { not: null },
      },
      orderBy: [{ postingDate: "asc" }, { id: "asc" }],
      take: 200,
      select: {
        legacyRecordId: true,
        counterpartyId: true,
        totalAmount: true,
        paymentTargets: {
          where: { status: "ACTIVE" },
          select: { amount: true },
        },
      },
    }),
    db.accountingDocument.findMany({
      where: {
        orgId,
        status: "POSTED",
        documentType: "PURCHASE_INVOICE",
        legacyRecordType: "PurchaseInvoice",
        legacyRecordId: { not: null },
      },
      orderBy: [{ postingDate: "asc" }, { id: "asc" }],
      take: 200,
      select: {
        legacyRecordId: true,
        counterpartyId: true,
        totalAmount: true,
        paymentTargets: {
          where: { status: "ACTIVE" },
          select: { amount: true },
        },
      },
    }),
  ]);
  const [salesNumberRows, purchaseNumberRows] = await Promise.all([
    db.salesInvoice.findMany({
      where: {
        orgId,
        id: {
          in: canonicalSalesInvoices.flatMap((invoice) =>
            invoice.legacyRecordId ? [invoice.legacyRecordId] : [],
          ),
        },
      },
      select: { id: true, invoiceNumber: true },
    }),
    db.purchaseInvoice.findMany({
      where: {
        orgId,
        id: {
          in: canonicalPurchaseInvoices.flatMap((invoice) =>
            invoice.legacyRecordId ? [invoice.legacyRecordId] : [],
          ),
        },
      },
      select: { id: true, invoiceNumber: true },
    }),
  ]);

  // Filter bank/cash accounts
  const bankAccounts = accounts
    .filter((a) => !a.isGroup && a.isActive && (a.accountType === "BANK" || a.accountType === "CASH"))
    .map((a) => ({ id: a.id, accountCode: a.accountCode, accountName: a.accountName }));

  const otherAccounts = accounts
    .filter((a) => !a.isGroup && a.isActive)
    .map((a) => ({ id: a.id, accountCode: a.accountCode, accountName: a.accountName, accountType: a.accountType }));

  const customerList = customers.map((c) => ({ id: c.id, name: c.name }));
  const supplierList = suppliers.map((s) => ({ id: s.id, name: s.name }));

  const salesNumbers = new Map(
    salesNumberRows.map((invoice) => [invoice.id, invoice.invoiceNumber]),
  );
  const purchaseNumbers = new Map(
    purchaseNumberRows.map((invoice) => [invoice.id, invoice.invoiceNumber]),
  );
  const serializedSalesInvoices = canonicalSalesInvoices.flatMap((invoice) => {
    if (!invoice.legacyRecordId || !invoice.counterpartyId) return [];
    const outstandingAmount = invoice.paymentTargets.reduce(
      (remaining, allocation) => remaining.sub(allocation.amount),
      invoice.totalAmount,
    );
    if (!outstandingAmount.isPositive()) return [];
    return [
      {
        id: invoice.legacyRecordId,
        invoiceNumber:
          salesNumbers.get(invoice.legacyRecordId) ??
          `SINV-${invoice.legacyRecordId.slice(-6).toUpperCase()}`,
        customerId: invoice.counterpartyId,
        outstandingAmount: outstandingAmount.toString(),
        grandTotal: invoice.totalAmount.toString(),
      },
    ];
  });
  const serializedPurchaseInvoices = canonicalPurchaseInvoices.flatMap(
    (invoice) => {
      if (!invoice.legacyRecordId || !invoice.counterpartyId) return [];
      const outstandingAmount = invoice.paymentTargets.reduce(
        (remaining, allocation) => remaining.sub(allocation.amount),
        invoice.totalAmount,
      );
      if (!outstandingAmount.isPositive()) return [];
      return [
        {
          id: invoice.legacyRecordId,
          invoiceNumber:
            purchaseNumbers.get(invoice.legacyRecordId) ??
            `PINV-${invoice.legacyRecordId.slice(-6).toUpperCase()}`,
          supplierId: invoice.counterpartyId,
          outstandingAmount: outstandingAmount.toString(),
          grandTotal: invoice.totalAmount.toString(),
        },
      ];
    },
  );

  return (
    <>
      <AccountingRoutePageHeader />
      <NewPaymentClient
        bankAccounts={bankAccounts}
        otherAccounts={otherAccounts}
        customers={customerList}
        suppliers={supplierList}
        branches={branches}
        salesInvoices={serializedSalesInvoices}
        purchaseInvoices={serializedPurchaseInvoices}
        initialPaymentType={initialPaymentType}
      />
    </>
  );
}
