"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AccountingInvoiceForm } from "@/modules/accounting/components/accounting-invoice-form";

export function NewInvoiceClient({
  bankAccounts = [],
  branches,
  customers,
  products = [],
}: {
  customers: any[];
  branches: any[];
  products?: any[];
  bankAccounts?: any[];
}) {
  return (
    <AccountingInvoiceForm
      kind="sales"
      parties={customers}
      branches={branches}
      products={products}
      bankAccounts={bankAccounts}
    />
  );
}
