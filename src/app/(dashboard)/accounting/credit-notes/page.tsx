import { CanonicalDocumentRegister } from "@/components/monolith/accounting-operational-views";
import {
  AccountingActionLink,
  AccountingAlert,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listCanonicalAccountingDocuments } from "@/modules/accounting/operational-queries";

export default async function CustomerCreditNotesPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/credit-notes",
  );
  const notes = await listCanonicalAccountingDocuments(orgId, {
    documentTypes: ["CUSTOMER_CREDIT_NOTE"],
    pageSize: 50,
  });
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.invoice.create"] ? (
            <div className="flex gap-2">
              <AccountingActionLink href="/accounting/credit-notes/new">
                + Sales Credit Note
              </AccountingActionLink>
              <AccountingActionLink href="/accounting/credit-notes/new?type=purchase">
                + Purchase Credit Note
              </AccountingActionLink>
            </div>
          ) : caps["accounting.credit-note.prepare"] ? (
            <AccountingActionLink href="/accounting/quotations">
              Prepare linked note
            </AccountingActionLink>
          ) : undefined
        }
      />
      <AccountingAlert>
        Credit notes preserve the original posted invoice and create a linked
        correction. Standalone statutory treatment remains policy-gated.
      </AccountingAlert>
      <AccountingSection
        eyebrow="Correction documents"
        title="Customer credit-note register"
        description="Original invoice, correction capacity, allocation impact, journal effect, and audit lineage."
      >
        <CanonicalDocumentRegister
          basePath="/accounting/credit-notes"
          data={notes}
        />
      </AccountingSection>
    </>
  );
}
