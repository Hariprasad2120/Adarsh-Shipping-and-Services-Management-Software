import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listAccounts } from "@/modules/accounting/service";
import { BankingClient } from "./banking-client";

export default async function BankingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Fetch bank and cash accounts
  const bankAccounts = await db.account.findMany({
    where: {
      orgId,
      isGroup: false,
      isActive: true,
      accountType: { in: ["BANK", "CASH"] },
    },
    include: {
      glEntries: {
        where: { isCancelled: false },
        select: { debit: true, credit: true },
      },
    },
  });

  const accountsWithBalances = bankAccounts.map((acc) => {
    let balance = Number(acc.openingDebit) - Number(acc.openingCredit);
    acc.glEntries.forEach((entry) => {
      balance += Number(entry.debit) - Number(entry.credit);
    });
    return {
      id: acc.id,
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      accountType: acc.accountType,
      balance,
    };
  });

  // Fetch recent transactions for bank/cash accounts
  const transactions = await db.generalLedgerEntry.findMany({
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
  });

  // Fetch all active leaf accounts for the transfer dropdown
  const allAccounts = await listAccounts(orgId);
  const leafAccounts = allAccounts
    .filter((a) => !a.isGroup && a.isActive)
    .map((a) => ({
      id: a.id,
      accountCode: a.accountCode,
      accountName: a.accountName,
      accountType: a.accountType,
    }));

  return (
    <div className="p-8 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-200">
      <div>
        <h2 className="ds-h1 text-white">Banking &amp; Cash</h2>
        <p className="text-slate-400 text-xs mt-1">
          Monitor your liquidity, reconcile bank transactions, and perform internal transfers.
        </p>
      </div>

      <BankingClient
        bankAccounts={accountsWithBalances}
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
    </div>
  );
}
