import { Plus } from "lucide-react";

import { CanonicalJournalRegister } from "@/components/monolith/accounting-operational-views";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingField,
  AccountingInput,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingToolbar,
} from "@/modules/accounting/components/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listCanonicalJournals } from "@/modules/accounting/operational-queries";

export default async function JournalEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/journal-entries",
  );
  const query = await searchParams;
  const search = query.search?.trim() ?? "";
  const status = query.status?.trim() ?? "";
  const dateFrom = query.dateFrom?.trim() ?? "";
  const dateTo = query.dateTo?.trim() ?? "";
  const journals = await listCanonicalJournals(orgId, {
    page: Number(query.page) || 1,
    search: search || undefined,
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const totalAmount = journals.rows.reduce((sum, journal) => {
    return sum + Number(journal.totalDebit);
  }, 0);
  const paginationBasePath = (() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const queryString = params.toString();
    return queryString
      ? `/accounting/journal-entries?${queryString}`
      : "/accounting/journal-entries";
  })();

  return (
    <>
      <AccountingRoutePageHeader
        eyebrow="Manual journals"
        title="All manual journals"
        description="Review draft, submitted, posted, cancelled, and superseded journal activity by date, location, maker, and narration."
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
        description={`${journals.total} journal entr${journals.total === 1 ? "y" : "ies"} match the current filters. Visible amount reflects the balanced debit total for each journal.`}
      >
        <form method="GET">
          <AccountingToolbar>
            <AccountingField label="Search journals">
              <AccountingInput
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Voucher, notes, source, or location"
              />
            </AccountingField>
            <AccountingField label="Status">
              <AccountingSelect name="status" defaultValue={status}>
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="POSTED">Posted</option>
                <option value="CANCELLED">Cancelled</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="From date">
              <AccountingInput type="date" name="dateFrom" defaultValue={dateFrom} />
            </AccountingField>
            <AccountingField label="To date">
              <AccountingInput type="date" name="dateTo" defaultValue={dateTo} />
            </AccountingField>
            <AccountingAction type="submit">Apply filters</AccountingAction>
            {search || status || dateFrom || dateTo ? (
              <AccountingActionLink href="/accounting/journal-entries">
                Reset
              </AccountingActionLink>
            ) : null}
          </AccountingToolbar>
        </form>
        <div className="mnx-accounting-journal-register-summary" aria-label="Journal totals">
          <div>
            <span>Visible journals</span>
            <strong>{journals.total}</strong>
          </div>
          <div>
            <span>Balanced value</span>
            <strong>
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                minimumFractionDigits: 2,
              }).format(totalAmount)}
            </strong>
          </div>
        </div>
        <CanonicalJournalRegister
          basePath={paginationBasePath}
          data={journals}
          variant="manual-journal"
        />
      </AccountingSection>
    </>
  );
}
