import React from "react";
import { db } from "@/lib/db";
import { NewInvoiceClient } from "./new-invoice-client";
import { AccountingRoutePageHeader } from "@/modules/accounting/components/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

export default async function NewSalesInvoicePage() {
  const { orgId, session, caps } = await requireAccountingRouteAccess(
    "/accounting/sales-invoices/new",
    ["accounting.invoice.create"],
  );

  const isAdmin = session.user.isPlatformAdmin || !!caps["admin.org.manage"];

  // Fetch customers (CRM accounts), branches, products, bank accounts, users (salespersons), and units
  const [
    customers,
    branches,
    products,
    bankAccounts,
    users,
    units,
    paymentTerms,
    paymentMethods,
    exchangeRates,
  ] = await Promise.all([
    db.crmAccount.findMany({
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
      <NewInvoiceClient
        customers={customers}
        branches={branches}
        products={productList}
        bankAccounts={bankAccounts}
        users={users}
        units={units}
        paymentTerms={paymentTerms}
        paymentMethods={paymentMethods}
        exchangeRates={serializableExchangeRates}
        isAdmin={isAdmin}
      />
    </>
  );
}
