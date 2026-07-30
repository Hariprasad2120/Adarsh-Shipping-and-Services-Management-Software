import { CanonicalDocumentRegister } from "@/components/monolith/accounting-operational-views";
import {
  AccountingAlert,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listCanonicalAccountingDocuments } from "@/modules/accounting/operational-queries";

export default async function VendorDebitNotesPage() {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/debit-notes",
  );
  const notes = await listCanonicalAccountingDocuments(orgId, {
    documentTypes: ["VENDOR_DEBIT_NOTE"],
    pageSize: 50,
  });
  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingAlert variant="warning">
        The canonical vendor-debit-note adapter exists, but no accepted vendor
        submit caller was discovered. Creation remains fail-closed until that
        product boundary is approved.
      </AccountingAlert>
      <AccountingSection
        eyebrow="Correction documents"
        title="Vendor debit-note register"
        description="Canonical linked corrections remain visible with journal and audit lineage."
      >
        <CanonicalDocumentRegister
          basePath="/accounting/debit-notes"
          data={notes}
        />
      </AccountingSection>
    </>
  );
}
