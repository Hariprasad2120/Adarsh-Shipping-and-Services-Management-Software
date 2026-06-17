import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NewInvoiceClient } from "./new-invoice-client";

export default async function NewSalesInvoicePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Fetch customers (CRM accounts) and branches
  const [customers, branches] = await Promise.all([
    db.crmAccount.findMany({ where: { orgId } }),
    db.branch.findMany({ where: { orgId } }),
  ]);

  const customerList = customers.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="p-8 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">Create Sales Invoice</h2>
          <p className="text-slate-400 text-xs mt-1">
            Generate a sales bill for a customer, adding service items, taxes, and posting draft or final invoices.
          </p>
        </div>
      </div>

      <NewInvoiceClient customers={customerList} branches={branches} />
    </div>
  );
}
