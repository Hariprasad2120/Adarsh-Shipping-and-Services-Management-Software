import { Suspense } from "react";
import { CommercialDocumentFormPage } from "@/modules/accounting/components/routes/commercial-document-form-page";
import { AccountingLoadingState } from "@/modules/accounting/components/accounting-workspace";

export default function NewAccountingSalesOrderPage() {
  return (
    <Suspense fallback={<AccountingLoadingState />}>
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
