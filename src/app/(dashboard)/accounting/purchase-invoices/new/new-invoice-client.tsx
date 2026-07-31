"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AccountingInvoiceForm } from "@/components/monolith/accounting-invoice-form";

export function NewPurchaseInvoiceClient({
  suppliers,
  branches,
  paymentMethods,
  paymentTerms,
  products,
  bankAccounts,
  users,
  units,
  exchangeRates,
  isAdmin,
}: {
  suppliers: any[];
  branches: any[];
  paymentTerms: any[];
  paymentMethods: any[];
  products: any[];
  bankAccounts: any[];
  users: any[];
  units: any[];
  exchangeRates: any[];
  isAdmin: boolean;
}) {
  return (
    <AccountingInvoiceForm
      kind="purchase"
      parties={suppliers}
      branches={branches}
      products={products}
      bankAccounts={bankAccounts}
      users={users}
      units={units}
      paymentTerms={paymentTerms}
      paymentMethods={paymentMethods}
      exchangeRates={exchangeRates}
      isAdmin={isAdmin}
    />
  );
}
