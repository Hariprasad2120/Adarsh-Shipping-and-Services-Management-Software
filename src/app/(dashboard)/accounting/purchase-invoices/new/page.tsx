import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NewPurchaseInvoiceClient } from "./new-invoice-client";

export default async function NewPurchaseInvoicePage() {
  const session = await auth();
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
    <div className="p-8 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">Create Purchase Invoice</h2>
          <p className="text-slate-400 text-xs mt-1">
            Log a vendor purchase bill or operational expense, defining expense lines, taxes, and recording outstanding supplier payables.
          </p>
        </div>
      </div>

      <NewPurchaseInvoiceClient suppliers={vendorList} branches={branches} />
    </div>
  );
}
