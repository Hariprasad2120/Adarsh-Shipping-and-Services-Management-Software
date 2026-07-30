import { Plus } from "lucide-react";

import {
  CanonicalDocumentRegister,
  LegacyAccountingDraftRegister,
} from "@/components/monolith/accounting-operational-views";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import {
  listCanonicalAccountingDocuments,
  listLegacyAccountingDrafts,
} from "@/modules/accounting/operational-queries";

export default async function SalesInvoicesPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/sales-invoices",
  );
  const [drafts, documents] = await Promise.all([
    listLegacyAccountingDrafts(orgId, "SALES_INVOICE", { pageSize: 50 }),
    listCanonicalAccountingDocuments(orgId, {
      documentTypes: ["SALES_INVOICE"],
      pageSize: 50,
    }),
  ]);
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.invoice.create"] ? (
            <AccountingActionLink
              href="/accounting/sales-invoices/new"
              variant="primary"
            >
              <Plus aria-hidden="true" size={16} />
              New draft
            </AccountingActionLink>
          ) : undefined
        }
      />
      <AccountingSection
        eyebrow="Preparation"
        title="Editable sales-invoice drafts"
        description="Compatibility drafts remain editable only until canonical preparation freezes a version."
      >
        <LegacyAccountingDraftRegister
          data={drafts}
          detailPath="/accounting/sales-invoices"
        />
      </AccountingSection>
      <AccountingSection
        eyebrow="Canonical lifecycle"
        title="Prepared and posted sales invoices"
        description="Server-authoritative totals, approval state, journal link, allocation history, and corrections."
      >
        <CanonicalDocumentRegister
          basePath="/accounting/sales-invoices"
          data={documents}
        />
      </AccountingSection>
    </>
  );
}
