import { Suspense } from "react";
import { CommercialDocumentsPage } from "../_components/commercial-documents-page";

export default function AccountingInvoicesSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-on-surface-variant">Loading…</div>}>
      <CommercialDocumentsPage
        title="Invoices & Sales"
        description="Manage commercial invoices, sales orders, purchase orders, and related billing documents from Accounting."
        basePath="/accounting/invoices-sales"
        createHref="/accounting/invoices-sales/new"
        searchParams={searchParams}
      />
    </Suspense>
  );
}
