import { Plus } from "lucide-react";

import {
  CanonicalDocumentRegister,
  LegacyAccountingDraftRegister,
} from "@/components/monolith";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/modules/accounting/components/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import {
  listCanonicalAccountingDocuments,
  listLegacyAccountingDrafts,
} from "@/modules/accounting/operational-queries";

export default async function PurchaseInvoicesPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/purchase-invoices",
  );
  const [drafts, documents] = await Promise.all([
    listLegacyAccountingDrafts(orgId, "PURCHASE_INVOICE", { pageSize: 50 }),
    listCanonicalAccountingDocuments(orgId, {
      documentTypes: ["PURCHASE_INVOICE"],
      pageSize: 50,
    }),
  ]);
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.invoice.create"] ? (
            <AccountingActionLink
              href="/accounting/purchase-invoices/new"
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
        title="Editable purchase-invoice drafts"
        description="Compatibility drafts remain editable only until canonical preparation freezes a version."
      >
        <LegacyAccountingDraftRegister
          data={drafts}
          detailPath="/accounting/purchase-invoices"
        />
      </AccountingSection>
      <AccountingSection
        eyebrow="Canonical lifecycle"
        title="Prepared and posted purchase invoices"
        description="Statutory purchase tax and discounts remain policy-gated unless approved line-level evidence exists."
      >
        <CanonicalDocumentRegister
          basePath="/accounting/purchase-invoices"
          data={documents}
        />
      </AccountingSection>
    </>
  );
}
