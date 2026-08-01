import { Suspense } from "react";
import { CommercialDocumentsPage } from "@/modules/accounting/components/routes/commercial-documents-page";
import { AccountingLoadingState } from "@/modules/accounting/components/accounting-workspace";

export default function AccountingPurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  return (
    <Suspense fallback={<AccountingLoadingState />}>
      <CommercialDocumentsPage
        title="Purchase Orders"
        description="Track supplier purchase orders from the Accounting module."
        basePath="/accounting/purchase-orders"
        createHref="/accounting/purchase-orders/new"
        typeFilter="PURCHASE_ORDER"
        showTypeFilter={false}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
