"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AccountingInvoiceForm } from "@/components/monolith/accounting-invoice-form";

export function NewInvoiceClient({
  bankAccounts = [],
  branches,
  customers,
  paymentMethods = [],
  paymentTerms = [],
  products = [],
  users = [],
  units = [],
  exchangeRates = [],
  isAdmin = false,
}: {
  customers: any[];
  branches: any[];
  paymentTerms?: any[];
  paymentMethods?: any[];
  products?: any[];
  bankAccounts?: any[];
  users?: any[];
  units?: any[];
  exchangeRates?: any[];
  isAdmin?: boolean;
}) {
  return (
    <AccountingInvoiceForm
      kind="sales"
      parties={customers}
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
