import { Suspense } from "react";
import { CommercialDocumentFormPage } from "../../_components/commercial-document-form-page";

export default function NewAccountingSalesOrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-on-surface-variant">Loading…</div>}>
      <CommercialDocumentFormPage
        title="Create Sales Order"
        description="Generate a confirmed customer sales order inside Accounting."
        defaultType="SALES_ORDER"
        redirectPath="/accounting/sales-orders"
        allowedTypes={["SALES_ORDER"]}
      />
    </Suspense>
  );
}
