import { Suspense } from "react";
import { CommercialDocumentsPage } from "../_components/commercial-documents-page";

// Wrap in Suspense so the layout shell streams to the client immediately while
// data is being fetched, instead of blocking the entire response.
export default function AccountingSalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-on-surface-variant">Loading…</div>}>
      <CommercialDocumentsPage
        title="Sales Orders"
        description="Track confirmed customer sales orders from the Accounting module."
        basePath="/accounting/sales-orders"
        createHref="/accounting/sales-orders/new"
        typeFilter="SALES_ORDER"
        showTypeFilter={false}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
