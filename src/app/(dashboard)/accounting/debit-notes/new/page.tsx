import React from "react";
import { db } from "@/lib/db";
import { NewDebitNoteClient } from "./new-note-client";
import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function NewDebitNotePage({ searchParams }: PageProps) {
  const { orgId, session, caps } = await requireAccountingRouteAccess(
    "/accounting/debit-notes/new",
    ["accounting.invoice.create"],
  );

  const isAdmin = session.user.isPlatformAdmin || !!caps["admin.org.manage"];
  const resolvedParams = await searchParams;
  const isPurchase = resolvedParams.type === "purchase";
  const noteKind = isPurchase ? "purchase-debit" as const : "sales-debit" as const;

  // Fetch parties, original invoices, branches, products, bank accounts, users, units, and exchange rates
  const [
    customers,
    vendors,
    salesInvoices,
    purchaseInvoices,
    branches,
    products,
    bankAccounts,
    users,
    units,
    paymentTerms,
    paymentMethods,
    exchangeRates,
  ] = await Promise.all([
    isPurchase
      ? Promise.resolve([])
      : db.crmAccount.findMany({
          where: { orgId },
          select: {
            id: true,
            name: true,
            gstin: true,
            gstTreatment: true,
            placeOfSupply: true,
            billingAddress: true,
            shippingAddress: true,
          },
          orderBy: { name: "asc" },
        }),
    isPurchase
      ? db.crmVendor.findMany({
          where: { orgId },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    isPurchase
      ? Promise.resolve([])
      : db.salesInvoice.findMany({
          where: { orgId, status: { in: ["UNPAID", "PARTLY_PAID", "PAID", "OVERDUE"] } },
          select: { id: true, invoiceNumber: true, customerId: true },
          orderBy: { invoiceNumber: "asc" },
        }),
    isPurchase
      ? db.purchaseInvoice.findMany({
          where: { orgId, status: { in: ["UNPAID", "PARTLY_PAID", "PAID", "OVERDUE"] } },
          select: { id: true, invoiceNumber: true, supplierId: true },
          orderBy: { invoiceNumber: "asc" },
        })
      : Promise.resolve([]),
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.crmProduct.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, price: true, taxPercent: true },
      orderBy: { name: "asc" },
    }),
    db.account.findMany({
      where: { orgId, accountType: "BANK", isActive: true },
      select: { id: true, accountName: true, accountCode: true },
      orderBy: { accountName: "asc" },
    }),
    db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.accountingUnitOfMeasure.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.accountingPaymentTerm.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true, dueDays: true },
      orderBy: { name: "asc" },
    }),
    db.accountingPaymentMethod.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true, methodType: true },
      orderBy: { name: "asc" },
    }),
    db.accountingExchangeRate.findMany({
      where: { orgId, status: "APPROVED" },
      select: {
        fromCurrency: { select: { code: true } },
        toCurrency: { select: { code: true } },
        rate: true,
      },
      orderBy: { rateDate: "desc" },
    }),
  ]);

  // Build party list
  const parties = isPurchase
    ? vendors.map((v) => ({
        id: v.id,
        name: v.name,
        gstin: v.gstin || null,
        gstTreatment: v.gstin ? "Registered Business - Regular" : "Unregistered Business",
        placeOfSupply: v.gstin ? v.gstin.substring(0, 2) : null,
        billingAddress: v.address || null,
        shippingAddress: v.address || null,
      }))
    : customers;

  // Build original invoices list
  const originalInvoices = isPurchase
    ? purchaseInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        supplierId: inv.supplierId,
        customerId: null,
      }))
    : salesInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        supplierId: null,
      }));

  const productList = products.map((product) => ({
    ...product,
    price: product.price.toString(),
    taxPercent: product.taxPercent.toString(),
  }));

  const serializableExchangeRates = exchangeRates.map((r) => ({
    from: r.fromCurrency.code,
    to: r.toCurrency.code,
    rate: r.rate.toString(),
  }));

  return (
    <>
      <AccountingRoutePageHeader />
      <NewDebitNoteClient
        noteKind={noteKind}
        parties={parties}
        branches={branches}
        paymentTerms={paymentTerms}
        paymentMethods={paymentMethods}
        products={productList}
        bankAccounts={bankAccounts}
        users={users}
        units={units}
        exchangeRates={serializableExchangeRates}
        isAdmin={isAdmin}
        originalInvoices={originalInvoices}
      />
    </>
  );
}
