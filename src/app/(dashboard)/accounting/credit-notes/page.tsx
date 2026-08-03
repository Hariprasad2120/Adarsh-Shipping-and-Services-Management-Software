import { CanonicalDocumentRegister } from "@/components/monolith/accounting-operational-views";
import {
  AccountingActionLink,
  AccountingAlert,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { db } from "@/lib/db";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listCanonicalAccountingDocuments } from "@/modules/accounting/operational-queries";
import { listVendorNotes } from "@/modules/accounting/service";
import { VendorCreditDraftsClient } from "./vendor-credit-drafts-client";

export default async function CustomerCreditNotesPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/credit-notes",
  );
  const [notes, vendorNotes] = await Promise.all([
    listCanonicalAccountingDocuments(orgId, {
      documentTypes: ["CUSTOMER_CREDIT_NOTE", "VENDOR_CREDIT_NOTE"],
      pageSize: 50,
    }),
    listVendorNotes(orgId),
  ]);
  const vendorCreditNotes = vendorNotes.filter((note) => note.noteType === "CREDIT");
  const canonicalByLegacyId = vendorCreditNotes.length
    ? new Map(
        (
          await db.accountingDocument.findMany({
            where: {
              orgId,
              legacyRecordType: "VendorNote",
              legacyRecordId: { in: vendorCreditNotes.map((note) => note.id) },
            },
            select: { id: true, legacyRecordId: true },
            orderBy: { sourceVersion: "desc" },
          })
        ).flatMap((document) =>
          document.legacyRecordId
            ? [[document.legacyRecordId, document.id] as const]
            : [],
        ),
      )
    : new Map<string, string>();
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
        eyebrow="Draft corrections"
        title="Vendor credit-note drafts"
        description="Draft vendor credit notes can now be submitted into the canonical correction flow directly from Accounting."
      >
        <VendorCreditDraftsClient
          notes={vendorCreditNotes.map((note) => ({
            id: note.id,
            noteNumber: note.noteNumber,
            noteType: note.noteType,
            postingDate: note.postingDate.toISOString(),
            grandTotal: note.grandTotal.toString(),
            status: note.status,
            reason: note.reason,
            vendor: { name: note.vendor.name },
            originalInvoice: note.originalInvoice
              ? { invoiceNumber: note.originalInvoice.invoiceNumber }
              : null,
            canonicalDocumentId: canonicalByLegacyId.get(note.id) ?? null,
          }))}
        />
      </AccountingSection>
      <AccountingSection
        eyebrow="Correction documents"
        title="Credit-note register"
        description="Original invoice, correction capacity, allocation impact, journal effect, and audit lineage across customer and vendor credits."
      >
        <CanonicalDocumentRegister
          basePath="/accounting/credit-notes"
          data={notes}
        />
      </AccountingSection>
    </>
  );
}
