import { DateInput } from "@/components/ui/date-input";
import { OperationalLedgerTable } from "@/components/monolith/accounting-operational-views";
import {
  AccountingAction,
  AccountingField,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingToolbar,
} from "@/modules/accounting/components/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getGeneralLedgerOperationalView } from "@/modules/accounting/operational-queries";

export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/general-ledger",
  );
  const query = await searchParams;
  const ledger = await getGeneralLedgerOperationalView(orgId, {
    accountId: query.accountId || undefined,
    dateFrom: query.dateFrom || undefined,
    dateTo: query.dateTo || undefined,
    page: Number(query.page) || 1,
  });
  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingToolbar>
        <form method="get">
          <AccountingField label="Account">
            <AccountingSelect
              defaultValue={query.accountId ?? ""}
              name="accountId"
            >
              <option value="">All accounts</option>
              {ledger.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountCode} — {account.accountName}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="From">
            <DateInput defaultValue={query.dateFrom ?? ""} name="dateFrom" />
          </AccountingField>
          <AccountingField label="To">
            <DateInput defaultValue={query.dateTo ?? ""} name="dateTo" />
          </AccountingField>
          <AccountingAction type="submit">Apply filters</AccountingAction>
        </form>
      </AccountingToolbar>
      <AccountingSection
        eyebrow="General ledger"
        title="Posted ledger facts"
        description="Bounded server query, deterministic date/creation/id ordering, and exact Decimal running balances."
      >
        <OperationalLedgerTable data={ledger} />
      </AccountingSection>
    </>
  );
}
