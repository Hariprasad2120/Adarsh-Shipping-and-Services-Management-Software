import { Plus } from "lucide-react";

import { CanonicalJournalRegister } from "@/components/monolith/accounting-operational-views";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listCanonicalJournals } from "@/modules/accounting/operational-queries";

export default async function JournalEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/journal-entries",
  );
  const { page } = await searchParams;
  const journals = await listCanonicalJournals(orgId, {
    page: Number(page) || 1,
  });
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.journal.prepare"] ? (
            <AccountingActionLink
              href="/accounting/journal-entries/new"
              variant="primary"
            >
              <Plus aria-hidden="true" size={16} />
              New journal draft
            </AccountingActionLink>
          ) : undefined
        }
      />
      <AccountingSection
        eyebrow="Immutable journal"
        title="Journal-entry register"
        description="Canonical and legacy-compatible journals with source, legal entity, exact totals, and correction lineage."
      >
        <CanonicalJournalRegister data={journals} />
      </AccountingSection>
    </>
  );
}
