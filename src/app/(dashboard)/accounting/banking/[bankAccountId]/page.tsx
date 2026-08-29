import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import {
  defaultBankingWorkspaceFilters,
  getBankAccountWorkspaceData,
  listBankingReferenceData,
} from "@/modules/accounting/banking-service";

import { BankAccountClient } from "./bank-account-client";

type BankAccountPageProps = {
  params: Promise<{ bankAccountId: string }>;
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    search?: string;
    view?: string;
    direction?: string;
  }>;
};

export default async function BankAccountPage({
  params,
  searchParams,
}: BankAccountPageProps) {
  const [{ caps, orgId }, session, routeParams, query] = await Promise.all([
    requireAccountingRouteAccess("/accounting/banking"),
    auth(),
    params,
    searchParams,
  ]);
  const scopedUser = session?.user
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true },
      })
    : null;
  const branchId = scopedUser?.branchId ?? null;
  const filters = defaultBankingWorkspaceFilters(query);

  const [workspace, referenceData] = await Promise.all([
    getBankAccountWorkspaceData(orgId, branchId, routeParams.bankAccountId, filters),
    listBankingReferenceData(orgId, branchId),
  ]);

  return (
    <>
      <AccountingRoutePageHeader
        title={`${workspace.bankAccount.name} · Transactions`}
        description="Posted book transactions for this Banking ledger account, with stable running balances across pages."
        actions={
          <AccountingActionLink href="/accounting/banking" variant="secondary">
            Back to Banking overview
          </AccountingActionLink>
        }
      />
      <BankAccountClient
        canManageBankAccounts={Boolean(caps["accounting.settings.manage"])}
        functionalCurrencyCode={referenceData.functionalCurrencyCode}
        workspace={workspace}
      />
    </>
  );
}
