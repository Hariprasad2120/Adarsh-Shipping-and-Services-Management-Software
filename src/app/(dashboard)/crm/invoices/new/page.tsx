import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { InvoiceForm } from "../invoice-form";
import { ShieldAlert } from "lucide-react";

export default async function NewInvoicePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
      </div>
    );
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.invoice.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to manage CRM billing sheets.</p>
      </div>
    );
  }

  // Fetch related lookup tables in parallel
  const [accounts, contacts, vendors, employees, products, bankAccounts, quoteCount, invoiceCount, debitNoteCount, salesOrderCount, purchaseOrderCount] = await Promise.all([
    db.crmAccount.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.crmContact.findMany({
      where: { orgId },
      select: { id: true, firstName: true, lastName: true, accountId: true },
      orderBy: { lastName: "asc" },
    }),
    db.crmVendor.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
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
    db.crmInvoice.count({ where: { orgId, type: "QUOTE" } }),
    db.crmInvoice.count({ where: { orgId, type: "INVOICE" } }),
    db.crmInvoice.count({ where: { orgId, type: "DEBIT_NOTE" } }),
    db.crmInvoice.count({ where: { orgId, type: "SALES_ORDER" } }),
    db.crmInvoice.count({ where: { orgId, type: "PURCHASE_ORDER" } }),
  ]);

  const formattedContacts = contacts.map((c) => ({
    id: c.id,
    name: `${c.firstName || ""} ${c.lastName}`.trim(),
    accountId: c.accountId,
  }));

  const nextNumbers = {
    QUOTE: `CHN-Quote-${String(quoteCount + 1).padStart(3, "0")}`,
    INVOICE: `CHN-Invoice-${String(invoiceCount + 1).padStart(3, "0")}`,
    DEBIT_NOTE: `CHN-DN-${String(debitNoteCount + 1).padStart(3, "0")}`,
    SALES_ORDER: `CHN-SO-${String(salesOrderCount + 1).padStart(3, "0")}`,
    PURCHASE_ORDER: `CHN-PO-${String(purchaseOrderCount + 1).padStart(3, "0")}`,
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Generate Quote / Invoice</h2>
        <p className="text-slate-400 text-sm mt-1">Generate a quote, logistics order, purchase order, or sales invoice with dynamic GST line items.</p>
      </div>
      <InvoiceForm
        accounts={accounts}
        contacts={formattedContacts}
        vendors={vendors}
        employees={employees}
        products={products}
        bankAccounts={bankAccounts}
        nextNumbers={nextNumbers}
      />
    </div>
  );
}
