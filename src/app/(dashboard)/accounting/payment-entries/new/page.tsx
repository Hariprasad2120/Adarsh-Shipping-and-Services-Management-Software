import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listAccounts } from "@/modules/accounting/service";
import { NewPaymentClient } from "./new-payment-client";

export default async function NewPaymentEntryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Fetch accounts, clients, vendors, branches, and outstanding invoices
  const [accounts, customers, suppliers, branches, salesInvoices, purchaseInvoices] = await Promise.all([
    listAccounts(orgId),
    db.crmAccount.findMany({ where: { orgId } }),
    db.crmVendor.findMany({ where: { orgId } }),
    db.branch.findMany({ where: { orgId } }),
    db.salesInvoice.findMany({
      where: { orgId, status: { in: ["UNPAID", "PARTLY_PAID"] } },
      select: { id: true, invoiceNumber: true, customerId: true, outstandingAmount: true, grandTotal: true },
    }),
    db.purchaseInvoice.findMany({
      where: { orgId, status: { in: ["UNPAID", "PARTLY_PAID"] } },
      select: { id: true, invoiceNumber: true, supplierId: true, outstandingAmount: true, grandTotal: true },
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

  const serializedSalesInvoices = salesInvoices.map((inv) => ({
    ...inv,
    outstandingAmount: Number(inv.outstandingAmount),
    grandTotal: Number(inv.grandTotal),
  }));

  const serializedPurchaseInvoices = purchaseInvoices.map((inv) => ({
    ...inv,
    outstandingAmount: Number(inv.outstandingAmount),
    grandTotal: Number(inv.grandTotal),
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">Record Payment</h2>
          <p className="text-slate-400 text-xs mt-1">
            Log custom cash receipt vouchers or vendor payouts, allocating payments directly against outstanding invoices.
          </p>
        </div>
      </div>

      <NewPaymentClient
        bankAccounts={bankAccounts}
        otherAccounts={otherAccounts}
        customers={customerList}
        suppliers={supplierList}
        branches={branches}
        salesInvoices={serializedSalesInvoices}
        purchaseInvoices={serializedPurchaseInvoices}
      />
    </div>
  );
}
