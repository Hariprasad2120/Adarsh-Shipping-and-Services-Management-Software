"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AccountingInvoiceDetail } from "@/modules/accounting/components/accounting-invoice-detail";

export function PurchaseInvoiceDetailClient({ invoice }: { invoice: any }) {
  return <AccountingInvoiceDetail invoice={invoice} kind="purchase" />;
}
