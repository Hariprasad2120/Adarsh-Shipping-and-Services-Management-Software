import { notFound } from "next/navigation";

import { AccountingActionLink, AccountingRoutePageHeader, CanonicalDocumentDetailView } from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getCanonicalAccountingDocument } from "@/modules/accounting/operational-queries";

export default async function CanonicalDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const path = "/accounting/sales-invoices";
  const { caps, orgId, userId } = await requireAccountingRouteAccess(path, [
    "accounting.document.read",
    "accounting.document.approve",
    "accounting.invoice.read",
  ]);
  const { id } = await params;
  const document = await getCanonicalAccountingDocument(orgId, id);
  if (!document) notFound();
  return (
    <>
      <AccountingRoutePageHeader
        eyebrow="Canonical Accounting document"
        title={document.documentType.replaceAll("_", " ")}
        description={`Immutable source version ${document.sourceSnapshot.sourceVersion} · ${document.status.replaceAll("_", " ")}`}
        actions={
          <AccountingActionLink href="/accounting/approvals">
            Back to approval inbox
          </AccountingActionLink>
        }
      />
      <CanonicalDocumentDetailView
        caps={caps}
        document={document}
        userId={userId}
      />
    </>
  );
}
