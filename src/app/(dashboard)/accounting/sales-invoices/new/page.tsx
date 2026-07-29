import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NewInvoiceClient } from "./new-invoice-client";
import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";

export default async function NewSalesInvoicePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Fetch customers (CRM accounts), branches, products, and bank accounts
  const [customers, branches, products, bankAccounts] = await Promise.all([
    db.crmAccount.findMany({ where: { orgId } }),
    db.branch.findMany({ where: { orgId } }),
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

  return (
    <>
      <AccountingRoutePageHeader />
      <NewInvoiceClient
        customers={customerList}
        branches={branches}
        products={products}
        bankAccounts={bankAccounts}
      />
    </>
  );
}
