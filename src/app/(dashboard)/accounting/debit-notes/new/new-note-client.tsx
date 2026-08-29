"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AccountingInvoiceForm } from "@/components/monolith";

export function NewDebitNoteClient({
  noteKind,
  parties,
  branches,
  paymentMethods,
  paymentTerms,
  products,
  bankAccounts,
  users,
  units,
  exchangeRates,
  isAdmin,
  originalInvoices,
}: {
  noteKind: "sales-debit" | "purchase-debit";
  parties: any[];
  branches: any[];
  paymentTerms: any[];
  paymentMethods: any[];
  products: any[];
  bankAccounts: any[];
  users: any[];
  units: any[];
  exchangeRates: any[];
  isAdmin: boolean;
  originalInvoices: any[];
}) {
  return (
    <AccountingInvoiceForm
      kind={noteKind}
      parties={parties}
      branches={branches}
      products={products}
      bankAccounts={bankAccounts}
      users={users}
      units={units}
      paymentTerms={paymentTerms}
      paymentMethods={paymentMethods}
      exchangeRates={exchangeRates}
      isAdmin={isAdmin}
      originalInvoices={originalInvoices}
    />
  );
}
