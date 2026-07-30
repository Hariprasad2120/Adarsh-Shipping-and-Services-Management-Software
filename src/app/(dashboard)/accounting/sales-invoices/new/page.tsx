import React from "react";
import { db } from "@/lib/db";
import { NewInvoiceClient } from "./new-invoice-client";
import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

export default async function NewSalesInvoicePage() {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/sales-invoices/new",
    ["accounting.invoice.create"],
  );

  // Fetch customers (CRM accounts), branches, products, and bank accounts
  const [customers, branches, products, bankAccounts] = await Promise.all([
    db.crmAccount.findMany({ where: { orgId } }),
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
  ]);

  const customerList = customers.map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const productList = products.map((product) => ({
    ...product,
    price: product.price.toString(),
    taxPercent: product.taxPercent.toString(),
  }));

  return (
    <>
      <AccountingRoutePageHeader />
      <NewInvoiceClient
        customers={customerList}
        branches={branches}
        products={productList}
        bankAccounts={bankAccounts}
      />
    </>
  );
}
