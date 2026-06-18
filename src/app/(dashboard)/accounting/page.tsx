import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getProfitAndLoss, getBalanceSheet } from "@/modules/accounting/reports";
import { getAccountingSettings } from "@/modules/accounting/service";
import { DashboardClient } from "./dashboard-client";

export default async function AccountingDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Trigger settings check (seeds Chart of Accounts if missing)
  await getAccountingSettings(orgId);

  // Fetch summaries and recent records
  const [pl, bs, recentJVs, recentInvoices, recentPayments, periodLock, bankAccounts] = await Promise.all([
    getProfitAndLoss(orgId, {}),
    getBalanceSheet(orgId, {}),
    db.journalEntry.findMany({
      where: { orgId },
      orderBy: { postingDate: "desc" },
      take: 5,
    }),
    db.salesInvoice.findMany({
      where: { orgId },
      orderBy: { postingDate: "desc" },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
    db.paymentEntry.findMany({
      where: { orgId },
      orderBy: { postingDate: "desc" },
      take: 5,
    }),
    db.transactionLock.findUnique({
      where: { orgId },
    }),
    db.account.findMany({
      where: { orgId, accountType: { in: ["CASH", "BANK"] } },
      include: {
        glEntries: {
          where: { isCancelled: false },
          select: { debit: true, credit: true },
        },
      },
    }),
  ]);

  // Compute live cash & bank liquidity
  let cashLiquidity = 0;
  bankAccounts.forEach((acc: any) => {
    let bal = Number(acc.openingDebit) - Number(acc.openingCredit);
    acc.glEntries.forEach((entry: any) => {
      bal += Number(entry.debit) - Number(entry.credit);
    });
    cashLiquidity += bal;
  });

  const recentVouchersMapped = recentJVs.map((jv: any) => ({
    id: jv.id,
    voucherNo: jv.voucherNo,
    remarks: jv.remarks || "No remarks",
    totalDebit: Number(jv.totalDebit),
    status: jv.status,
  }));

  const recentInvoicesMapped = recentInvoices.map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customer?.name || "Unknown Customer",
    grandTotal: Number(inv.grandTotal),
    status: inv.status,
  }));

  const recentPaymentsMapped = recentPayments.map((p: any) => ({
    id: p.id,
    referenceNo: p.referenceNo || `PAY-${p.id.slice(-6).toUpperCase()}`,
    paymentType: p.paymentType,
    partyType: p.partyType,
    amount: Number(p.amount),
    postingDate: p.postingDate,
  }));

  return (
    <DashboardClient
      pl={pl}
      bs={bs}
      recentVouchers={recentVouchersMapped}
      recentInvoices={recentInvoicesMapped}
      recentPayments={recentPaymentsMapped}
      cashLiquidity={cashLiquidity}
      initialPeriodLock={
        periodLock
          ? {
              lockDate: periodLock.lockDate,
              lockType: periodLock.lockType,
              lockedBy: periodLock.lockedBy,
            }
          : null
      }
    />
  );
}
