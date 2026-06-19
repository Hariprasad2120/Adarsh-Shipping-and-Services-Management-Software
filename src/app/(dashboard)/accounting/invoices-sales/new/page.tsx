import { Suspense } from "react";
import { CommercialDocumentFormPage } from "../../_components/commercial-document-form-page";

export default function NewAccountingInvoiceSalesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-on-surface-variant">Loading…</div>}>
      <CommercialDocumentFormPage
        title="Create Commercial Document"
        description="Generate invoice, sales order, or purchase order records from the Accounting workspace."
        defaultType="INVOICE"
        redirectPath="/accounting/invoices-sales"
        allowedTypes={["INVOICE", "SALES_ORDER", "PURCHASE_ORDER"]}
      />
    </Suspense>
  );
}
