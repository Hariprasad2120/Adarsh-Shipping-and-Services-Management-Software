import { AccountingActionLink, AccountingRoutePageHeader, AccountingSection, CanonicalDocumentRegister } from "@/components/monolith";
import { db } from "@/lib/db";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listCanonicalAccountingDocuments } from "@/modules/accounting/operational-queries";
import { listCustomerNotes, listVendorNotes } from "@/modules/accounting/service";
import { CustomerNoteDraftsClient } from "./customer-note-drafts-client";
import { VendorNoteDraftsClient } from "./vendor-note-drafts-client";

export default async function VendorDebitNotesPage() {
  const { orgId, caps } = await requireAccountingRouteAccess(
    "/accounting/debit-notes",
  );
  const [notes, customerNotes, vendorNotes] = await Promise.all([
    listCanonicalAccountingDocuments(orgId, {
      documentTypes: ["CUSTOMER_DEBIT_NOTE", "VENDOR_DEBIT_NOTE"],
      pageSize: 50,
    }),
    listCustomerNotes(orgId),
    listVendorNotes(orgId),
  ]);
  const customerDebitNotes = customerNotes.filter((note) => note.noteType === "DEBIT");
  const vendorDebitNotes = vendorNotes.filter((note) => note.noteType === "DEBIT");
  const [customerCanonicalByLegacyId, vendorCanonicalByLegacyId] = await Promise.all([
    customerDebitNotes.length
      ? db.accountingDocument.findMany({
          where: {
            orgId,
            legacyRecordType: "CustomerNote",
            legacyRecordId: { in: customerDebitNotes.map((note) => note.id) },
          },
          select: { id: true, legacyRecordId: true },
          orderBy: { sourceVersion: "desc" },
        }).then((documents) =>
          new Map(
            documents.flatMap((document) =>
              document.legacyRecordId
                ? [[document.legacyRecordId, document.id] as const]
                : [],
            ),
          ),
        )
      : Promise.resolve(new Map<string, string>()),
    vendorDebitNotes.length
    ? new Map(
        (
          await db.accountingDocument.findMany({
            where: {
              orgId,
              legacyRecordType: "VendorNote",
              legacyRecordId: { in: vendorDebitNotes.map((note) => note.id) },
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
    : new Map<string, string>(),
  ]);
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.invoice.create"] ? (
            <div className="flex gap-2">
              <AccountingActionLink href="/accounting/debit-notes/new">
                + Sales Debit Note
              </AccountingActionLink>
              <AccountingActionLink href="/accounting/debit-notes/new?type=purchase">
                + Purchase Debit Note
              </AccountingActionLink>
            </div>
          ) : undefined
        }
      />
      <AccountingSection
        eyebrow="Draft corrections"
        title="Customer debit-note drafts"
        description="Draft customer debit notes can now be submitted into the canonical correction flow directly from Accounting."
      >
        <CustomerNoteDraftsClient
          notes={customerDebitNotes.map((note) => ({
            id: note.id,
            noteNumber: note.noteNumber,
            noteType: note.noteType,
            postingDate: note.postingDate.toISOString(),
            grandTotal: note.grandTotal.toString(),
            status: note.status,
            reason: note.reason,
            customer: { name: note.customer.name },
            originalInvoice: note.originalInvoice
              ? { invoiceNumber: note.originalInvoice.invoiceNumber }
              : null,
            canonicalDocumentId: customerCanonicalByLegacyId.get(note.id) ?? null,
          }))}
        />
      </AccountingSection>
      <AccountingSection
        eyebrow="Draft corrections"
        title="Vendor debit-note drafts"
        description="Draft vendor debit notes can now be submitted into the canonical correction flow directly from Accounting."
      >
        <VendorNoteDraftsClient
          notes={vendorDebitNotes.map((note) => ({
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
            canonicalDocumentId: vendorCanonicalByLegacyId.get(note.id) ?? null,
          }))}
        />
      </AccountingSection>
      <AccountingSection
        eyebrow="Correction documents"
        title="Debit-note register"
        description="Canonical linked corrections remain visible with journal and audit lineage across customer and vendor debits."
      >
        <CanonicalDocumentRegister
          basePath="/accounting/debit-notes"
          data={notes}
        />
      </AccountingSection>
    </>
  );
}
