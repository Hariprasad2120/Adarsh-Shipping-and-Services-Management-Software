import { Suspense } from "react";
import { CommercialDocumentsPage } from "@/modules/accounting/components/routes/commercial-documents-page";
import { AccountingLoadingState } from "@/modules/accounting/components/accounting-workspace";

// Wrap in Suspense so the layout shell streams to the client immediately while
// data is being fetched, instead of blocking the entire response.
export default function AccountingSalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  return (
    <Suspense fallback={<AccountingLoadingState />}>
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
