import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountingRoutePageHeader } from "@/modules/accounting/components/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import {
  defaultBankingOverviewFilters,
  getBankingOverviewData,
  listBankingReferenceData,
} from "@/modules/accounting/banking-service";

import { BankingClient } from "./banking-client";

type BankingPageProps = {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    search?: string;
    status?: string;
  }>;
};

export default async function BankingPage({ searchParams }: BankingPageProps) {
  const [{ caps, orgId }, session, params] = await Promise.all([
    requireAccountingRouteAccess("/accounting/banking"),
    getSession(),
    searchParams,
  ]);
  const scopedUser = session?.user
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true },
      })
    : null;
  const branchId = scopedUser?.branchId ?? null;
  const filters = defaultBankingOverviewFilters(params);

  const [overview, referenceData] = await Promise.all([
    getBankingOverviewData(orgId, branchId, filters),
    listBankingReferenceData(orgId, branchId),
  ]);

  return (
    <>
      <AccountingRoutePageHeader />
      <BankingClient
        canManageBankAccounts={Boolean(caps["accounting.settings.manage"])}
        functionalCurrencyCode={referenceData.functionalCurrencyCode}
        bankAccounts={referenceData.bankAccounts}
        ledgerAccounts={referenceData.ledgerAccounts}
        mappedLedgerAccountIds={referenceData.mappedLedgerAccountIds}
        overview={overview}
      />
    </>
  );
}
