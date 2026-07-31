import { db } from "@/lib/db";
import { listAccounts } from "@/modules/accounting/service";
import { BankingClient } from "./banking-client";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

export default async function BankingPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/banking",
  );

  // Parallelize all independent queries; use groupBy for balances to avoid loading all GL entries
  const [bankAccounts, balanceSums, transactions, allAccounts] = await Promise.all([
    db.account.findMany({
      where: {
        orgId,
        isGroup: false,
        isActive: true,
        accountType: { in: ["BANK", "CASH"] },
      },
      select: {
        id: true,
        accountCode: true,
        accountName: true,
        accountType: true,
        openingDebit: true,
        openingCredit: true,
      },
    }),
    db.generalLedgerEntry.groupBy({
      by: ["accountId"],
      where: {
        orgId,
        isCancelled: false,
        account: { accountType: { in: ["BANK", "CASH"] } },
      },
      _sum: { debit: true, credit: true },
    }),
    db.generalLedgerEntry.findMany({
      where: {
        orgId,
        isCancelled: false,
        account: {
          accountType: { in: ["BANK", "CASH"] },
        },
      },
      orderBy: [{ postingDate: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        account: { select: { accountName: true, accountCode: true } },
      },
    }),
    listAccounts(orgId),
  ]);

  const balanceMap = new Map(balanceSums.map((b) => [b.accountId, b._sum]));
  const accountsWithBalances = bankAccounts.map((acc) => {
    const sums = balanceMap.get(acc.id);
    const balance =
      Number(acc.openingDebit) - Number(acc.openingCredit) +
      Number(sums?.debit ?? 0) - Number(sums?.credit ?? 0);
    return {
      id: acc.id,
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      accountType: acc.accountType,
      balance,
    };
  });
  const leafAccounts = allAccounts
    .filter((a) => !a.isGroup && a.isActive)
    .map((a) => ({
      id: a.id,
      accountCode: a.accountCode,
      accountName: a.accountName,
      accountType: a.accountType,
    }));

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <>
            <AccountingActionLink href="/accounting/payments">
              All payments
            </AccountingActionLink>
            {caps["accounting.payment.create"] ? (
              <AccountingActionLink
                href="/accounting/payment-entries/new"
                variant="primary"
              >
                New payment draft
              </AccountingActionLink>
            ) : null}
          </>
        }
      />
      <BankingClient
        bankAccounts={accountsWithBalances}
        canCreatePayment={Boolean(caps["accounting.payment.create"])}
        canPrepareTransfer={Boolean(caps["accounting.payment.prepare"])}
        transactions={transactions.map((t) => ({
          id: t.id,
          postingDate: t.postingDate,
          accountName: t.account.accountName,
          accountCode: t.account.accountCode,
          voucherType: t.voucherType,
          voucherId: t.voucherId,
          debit: Number(t.debit),
          credit: Number(t.credit),
          remarks: t.remarks,
        }))}
        leafAccounts={leafAccounts}
      />
    </>
  );
}
