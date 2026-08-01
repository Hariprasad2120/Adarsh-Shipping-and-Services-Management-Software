import { Suspense } from "react";
import { CommercialDocumentFormPage } from "@/modules/accounting/components/routes/commercial-document-form-page";
import { AccountingLoadingState } from "@/modules/accounting/components/accounting-workspace";

export default function NewAccountingPurchaseOrderPage() {
  return (
    <Suspense fallback={<AccountingLoadingState />}>
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
