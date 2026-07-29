"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AccountingInvoiceForm } from "@/components/monolith/accounting-invoice-form";

export function NewPurchaseInvoiceClient({
  branches,
  suppliers,
}: {
  suppliers: any[];
  branches: any[];
}) {
  return (
    <AccountingInvoiceForm
      kind="purchase"
      parties={suppliers}
      branches={branches}
    />
  );
}
