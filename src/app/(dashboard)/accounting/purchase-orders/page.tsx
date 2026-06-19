import { Suspense } from "react";
import { CommercialDocumentsPage } from "../_components/commercial-documents-page";

export default function AccountingPurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-on-surface-variant">Loading…</div>}>
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
