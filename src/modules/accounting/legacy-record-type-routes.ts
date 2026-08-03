const LEGACY_RECORD_TYPE_REDIRECTS: Record<string, string> = {
  SALES_INVOICE: "/accounting/sales-invoices",
  SalesInvoice: "/accounting/sales-invoices",
  PURCHASE_INVOICE: "/accounting/purchase-invoices",
  PurchaseInvoice: "/accounting/purchase-invoices",
  PAYMENT: "/accounting/payment-entries",
  PAYMENT_ENTRY: "/accounting/payment-entries",
  PaymentEntry: "/accounting/payment-entries",
  JOURNAL_ENTRY: "/accounting/journal-entries",
  JournalEntry: "/accounting/journal-entries",
  CREDIT_NOTE: "/accounting/credit-notes",
  CUSTOMER_CREDIT_NOTE: "/accounting/credit-notes",
  VENDOR_CREDIT_NOTE: "/accounting/credit-notes",
  DEBIT_NOTE: "/accounting/debit-notes",
  CUSTOMER_DEBIT_NOTE: "/accounting/debit-notes",
  VENDOR_DEBIT_NOTE: "/accounting/debit-notes",
};

export function resolveLegacyRecordTypePath(
  legacyRecordType: string | null | undefined,
) {
  if (!legacyRecordType) return null;
  return LEGACY_RECORD_TYPE_REDIRECTS[legacyRecordType] ?? null;
}

const DOCUMENT_TYPE_QUEUE_PATHS: Record<string, string> = {
  SALES_INVOICE: "/accounting/sales-invoices",
  PURCHASE_INVOICE: "/accounting/purchase-invoices",
  CUSTOMER_CREDIT_NOTE: "/accounting/credit-notes",
  VENDOR_CREDIT_NOTE: "/accounting/credit-notes",
  CREDIT_NOTE: "/accounting/credit-notes",
  CUSTOMER_DEBIT_NOTE: "/accounting/debit-notes",
  VENDOR_DEBIT_NOTE: "/accounting/debit-notes",
  DEBIT_NOTE: "/accounting/debit-notes",
};

export function resolveAccountingDocumentQueuePath(
  documentType: string | null | undefined,
) {
  if (!documentType) return null;
  return DOCUMENT_TYPE_QUEUE_PATHS[documentType] ?? null;
}
