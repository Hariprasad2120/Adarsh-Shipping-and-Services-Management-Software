import { Suspense } from "react";
import { CommercialDocumentFormPage } from "../../_components/commercial-document-form-page";

export default function NewAccountingPurchaseOrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-on-surface-variant">Loading…</div>}>
      <CommercialDocumentFormPage
        title="Create Purchase Order"
        description="Generate a supplier purchase order inside Accounting."
        defaultType="PURCHASE_ORDER"
        redirectPath="/accounting/purchase-orders"
        allowedTypes={["PURCHASE_ORDER"]}
      />
    </Suspense>
  );
}
