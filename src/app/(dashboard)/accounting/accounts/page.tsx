/* eslint-disable @typescript-eslint/no-explicit-any */

import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";
import { db } from "@/lib/db";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { AccountsClient } from "./accounts-client";

interface PageSearchParams {
  accountId?: string;
}

interface AccountTreeNode {
  id: string;
  accountCode: string;
  accountName: string;
  parentAccountId: string | null;
  rootType: string;
  accountType: string;
  isGroup: boolean;
  isActive: boolean;
  allowJournalContact: boolean;
  openingDebit: number;
  openingCredit: number;
  branchId: string | null;
  branchName: string | null;
  children: AccountTreeNode[];
}

function buildAccountTree(
  accounts: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    parentAccountId: string | null;
    rootType: string;
    accountType: string;
    isGroup: boolean;
    isActive: boolean;
    allowJournalContact: boolean;
    openingDebit: unknown;
    openingCredit: unknown;
    branchId: string | null;
    branch: { name: string } | null;
  }>,
) {
  const accountMap = new Map<string, AccountTreeNode>();
  for (const account of accounts) {
    accountMap.set(account.id, {
      id: account.id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      parentAccountId: account.parentAccountId,
      rootType: account.rootType,
      accountType: account.accountType,
      isGroup: account.isGroup,
      isActive: account.isActive,
      allowJournalContact: account.allowJournalContact,
      openingDebit: Number(account.openingDebit),
      openingCredit: Number(account.openingCredit),
      branchId: account.branchId,
      branchName: account.branch?.name ?? null,
      children: [],
    });
  }

  const roots: AccountTreeNode[] = [];
  for (const node of accountMap.values()) {
    if (node.parentAccountId) {
      const parent = accountMap.get(node.parentAccountId);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }
    roots.push(node);
  }

  return { roots, accountMap };
}

function collectDescendantIds(node: AccountTreeNode): string[] {
  return [
    node.id,
    ...node.children.flatMap((child) => collectDescendantIds(child)),
  ];
}

function prettifyVoucherType(voucherType: string) {
  return voucherType
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ChartOfAccountsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const { orgId } = await requireAccountingRouteAccess("/accounting/accounts");
  const params = await searchParams;

  const [accounts, branches] = await Promise.all([
    db.account.findMany({
      where: { orgId },
      orderBy: { accountCode: "asc" },
      include: {
        branch: { select: { name: true } },
      },
    }),
    db.branch.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const { roots, accountMap } = buildAccountTree(accounts);
  const defaultAccount =
    Array.from(accountMap.values()).find((account) => !account.isGroup) ??
    roots[0] ??
    null;
  const selectedAccount =
    (params.accountId ? accountMap.get(params.accountId) : null) ?? defaultAccount;
  const selectedIds = selectedAccount ? collectDescendantIds(selectedAccount) : [];

  const [ledgerRows, ledgerTotals] = selectedIds.length
    ? await Promise.all([
        db.generalLedgerEntry.findMany({
          where: {
            orgId,
            isCancelled: false,
            accountId: { in: selectedIds },
          },
          orderBy: [{ postingDate: "desc" }, { createdAt: "desc" }],
          include: {
            account: {
              select: {
                id: true,
                accountCode: true,
                accountName: true,
              },
            },
            branch: { select: { name: true } },
            journalEntry: { select: { voucherNo: true } },
          },
        }),
        db.generalLedgerEntry.aggregate({
          where: {
            orgId,
            isCancelled: false,
            accountId: { in: selectedIds },
          },
          _sum: {
            debit: true,
            credit: true,
          },
        }),
      ])
    : ([[], null] as const);

  const salesInvoiceIds = Array.from(
    new Set(
      ledgerRows
        .filter((entry: any) => entry.voucherType === "SALES_INVOICE")
        .map((entry: any) => entry.voucherId),
    ),
  );
  const purchaseInvoiceIds = Array.from(
    new Set(
      ledgerRows
        .filter((entry: any) => entry.voucherType === "PURCHASE_INVOICE")
        .map((entry: any) => entry.voucherId),
    ),
  );
  const paymentEntryIds = Array.from(
    new Set(
      ledgerRows
        .filter((entry: any) => entry.voucherType === "PAYMENT_ENTRY")
        .map((entry: any) => entry.voucherId),
    ),
  );

  const [salesInvoices, purchaseInvoices, paymentEntries] = await Promise.all([
    salesInvoiceIds.length
      ? db.salesInvoice.findMany({
          where: { orgId, id: { in: salesInvoiceIds } },
          select: {
            id: true,
            invoiceNumber: true,
            customer: { select: { name: true } },
          },
        })
      : [],
    purchaseInvoiceIds.length
      ? db.purchaseInvoice.findMany({
          where: { orgId, id: { in: purchaseInvoiceIds } },
          select: {
            id: true,
            invoiceNumber: true,
            supplier: { select: { name: true } },
          },
        })
      : [],
    paymentEntryIds.length
      ? db.paymentEntry.findMany({
          where: { orgId, id: { in: paymentEntryIds } },
          select: {
            id: true,
            paymentType: true,
            referenceNo: true,
          },
        })
      : [],
  ]);

  const voucherLabels = new Map<string, string>();
  for (const invoice of salesInvoices) {
    voucherLabels.set(
      invoice.id,
      `${invoice.invoiceNumber} · ${invoice.customer?.name ?? "Customer"}`,
    );
  }
  for (const invoice of purchaseInvoices) {
    voucherLabels.set(
      invoice.id,
      `${invoice.invoiceNumber} · ${invoice.supplier?.name ?? "Supplier"}`,
    );
  }
  for (const payment of paymentEntries) {
    voucherLabels.set(
      payment.id,
      payment.referenceNo?.trim() ||
        `${payment.paymentType === "RECEIVE" ? "Receipt" : "Payment"} ${payment.id.slice(-6).toUpperCase()}`,
    );
  }

  const openingDebit = selectedIds.reduce(
    (total, accountId) => total + (accountMap.get(accountId)?.openingDebit ?? 0),
    0,
  );
  const openingCredit = selectedIds.reduce(
    (total, accountId) => total + (accountMap.get(accountId)?.openingCredit ?? 0),
    0,
  );
  const postedDebit = Number(ledgerTotals?._sum?.debit ?? 0);
  const postedCredit = Number(ledgerTotals?._sum?.credit ?? 0);
  const closingBalance = openingDebit + postedDebit - openingCredit - postedCredit;

  const selectedAccountSummary = selectedAccount
    ? {
        ...selectedAccount,
        parentAccountName: selectedAccount.parentAccountId
          ? accountMap.get(selectedAccount.parentAccountId)?.accountName ?? null
          : null,
        openingDebit,
        openingCredit,
        postedDebit,
        postedCredit,
        closingBalance,
        descendantCount: Math.max(selectedIds.length - 1, 0),
      }
    : null;

  const recentTransactions = ledgerRows.map((entry: any) => ({
    id: entry.id,
    postingDate: entry.postingDate.toISOString(),
    detail:
      entry.remarks?.trim() ||
      voucherLabels.get(entry.voucherId) ||
      entry.journalEntry?.voucherNo ||
      `${prettifyVoucherType(entry.voucherType)} · ${entry.account.accountName}`,
    reference:
      voucherLabels.get(entry.voucherId) ||
      entry.journalEntry?.voucherNo ||
      entry.voucherId,
    type: prettifyVoucherType(entry.voucherType),
    voucherType: entry.voucherType,
    branchName: entry.branch?.name ?? "Organisation-wide",
    accountName: entry.account.accountName,
    accountCode: entry.account.accountCode,
    debit: Number(entry.debit),
    credit: Number(entry.credit),
  }));

  return (
    <>
      <AccountingRoutePageHeader />
      <AccountsClient
        branches={branches}
        initialCoa={roots}
        key={selectedAccount?.id ?? "chart-root"}
        recentTransactions={recentTransactions}
        selectedAccount={selectedAccountSummary}
      />
    </>
  );
}
