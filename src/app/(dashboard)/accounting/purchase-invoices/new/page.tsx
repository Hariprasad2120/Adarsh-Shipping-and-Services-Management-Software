import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NewPurchaseInvoiceClient } from "./new-invoice-client";
import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";

export default async function NewPurchaseInvoicePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Fetch vendors (CRM vendors) and branches
  const [suppliers, branches] = await Promise.all([
    db.crmVendor.findMany({ where: { orgId } }),
    db.branch.findMany({ where: { orgId } }),
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
