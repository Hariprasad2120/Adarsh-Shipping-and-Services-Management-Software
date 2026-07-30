import React from "react";
import { db } from "@/lib/db";
import { NewPurchaseInvoiceClient } from "./new-invoice-client";
import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

export default async function NewPurchaseInvoicePage() {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/purchase-invoices/new",
    ["accounting.invoice.create"],
  );

  // Fetch vendors (CRM vendors) and branches
  const [suppliers, branches] = await Promise.all([
    db.crmVendor.findMany({ where: { orgId } }),
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const vendorList = suppliers.map((v) => ({
    id: v.id,
    name: v.name,
  }));

  return (
    <>
      <AccountingRoutePageHeader />
      <NewPurchaseInvoiceClient suppliers={vendorList} branches={branches} />
    </>
  );
}
