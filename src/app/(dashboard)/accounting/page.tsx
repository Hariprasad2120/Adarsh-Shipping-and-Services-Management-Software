import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getProfitAndLoss, getBalanceSheet } from "@/modules/accounting/reports";
import { getAccountingSettings } from "@/modules/accounting/service";
import NextLink from "next/link";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Receipt,
  ArrowRight,
  FileText,
  Clock,
  Settings
} from "lucide-react";

export default async function AccountingDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Trigger settings check (seeds COA if missing)
  const settings = await getAccountingSettings(orgId);

  // Fetch P&L and Balance Sheet summaries
  const [pl, bs, recentJVs, recentInvoices, recentPayments] = await Promise.all([
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
  ]);

  // Calculate Cash & Bank Liquidity
  const bankAccounts = await db.account.findMany({
    where: { orgId, accountType: { in: ["CASH", "BANK"] } }
  });

  let cashLiquidity = 0;
  for (const acc of bankAccounts) {
    const dir = acc.rootType === "ASSET" ? "DR" : "CR";
    const openingDb = Number(acc.openingDebit);
    const openingCr = Number(acc.openingCredit);
    let bal = dir === "DR" ? (openingDb - openingCr) : (openingCr - openingDb);

    const postings = await db.generalLedgerEntry.findMany({
      where: { orgId, accountId: acc.id, isCancelled: false }
    });

    postings.forEach(ent => {
      const deb = Number(ent.debit);
      const cred = Number(ent.credit);
      if (dir === "DR") {
        bal += (deb - cred);
      } else {
        bal += (cred - deb);
      }
    });

    cashLiquidity += bal;
  }

  const netProfit = pl.netProfit;
  const totalAssets = bs.totalAssets;
  const totalLiabilities = bs.liabilities.total;

  const stats = [
    {
      label: "Total Assets",
      value: `₹${totalAssets.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      icon: Scale,
      color: "text-[#00cec4]",
      bg: "bg-[#00cec4]/10",
      border: "card-top-accent",
    },
    {
      label: "Total Liabilities",
      value: `₹${totalLiabilities.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      icon: Scale,
      color: "text-[#fb923c]",
      bg: "bg-[#fb923c]/10",
      border: "card-top-accent-orange",
    },
    {
      label: "Cash & Bank Liquidity",
      value: `₹${cashLiquidity.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      icon: Wallet,
      color: "text-[#00cec4]",
      bg: "bg-[#00cec4]/10",
      border: "card-top-accent",
    },
    {
      label: "Net Profit / Loss",
      value: `₹${netProfit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      icon: netProfit >= 0 ? ArrowUpRight : ArrowDownRight,
      color: netProfit >= 0 ? "text-emerald-400" : "text-red-400",
      bg: netProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      border: "card-top-accent",
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">Finance & Accounting</h2>
          <p className="text-slate-400 text-xs mt-1">
            Real-time double-entry general ledger dashboard, cash liquidity tracking, and financial statements.
          </p>
        </div>
        <NextLink
          href="/accounting/settings"
          className="flex items-center gap-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
        >
          <Settings className="size-3.5 text-[#00cec4]" />
          <span>Accounting Settings</span>
        </NextLink>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={`rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-5 flex flex-col justify-between shadow-ambient ${stat.border}`}
            >
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                  <Icon className="size-4.5" />
                </div>
              </div>
              <p className="mt-4 text-xl font-bold font-mono text-white tracking-tight">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* THREE COLUMN DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Invoices */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="size-4.5 text-[#00cec4]" />
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">Recent Invoices</h3>
            </div>
            <NextLink href="/accounting/sales-invoices" className="text-xs text-[#00cec4] hover:underline flex items-center gap-1">
              View All <ArrowRight className="size-3" />
            </NextLink>
          </div>

          <div className="space-y-3">
            {recentInvoices.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No invoices created.</p>
            ) : (
              recentInvoices.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center text-xs p-2.5 bg-[#161f28]/35 rounded-lg border border-[#1c212a]/20">
                  <div>
                    <NextLink href={`/accounting/sales-invoices/${inv.id}`} className="font-mono text-white font-bold hover:underline">
                      {inv.invoiceNumber}
                    </NextLink>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{inv.customer.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-white font-bold block">₹{Number(inv.grandTotal).toLocaleString("en-IN")}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider block mt-1 inline-block ${
                      inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Entries */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="size-4.5 text-[#00cec4]" />
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">Recent Payments</h3>
            </div>
            <NextLink href="/accounting/payment-entries" className="text-xs text-[#00cec4] hover:underline flex items-center gap-1">
              View All <ArrowRight className="size-3" />
            </NextLink>
          </div>

          <div className="space-y-3">
            {recentPayments.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No payments recorded.</p>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="flex justify-between items-center text-xs p-2.5 bg-[#161f28]/35 rounded-lg border border-[#1c212a]/20">
                  <div>
                    <NextLink href={`/accounting/payment-entries/${p.id}`} className="font-mono text-white font-bold hover:underline">
                      {p.referenceNo || `PAY-${p.id.slice(-6).toUpperCase()}`}
                    </NextLink>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{p.paymentType} - {p.partyType}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-white font-bold block">₹{Number(p.amount).toLocaleString("en-IN")}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(p.postingDate).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Journal Vouchers */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4.5 text-[#00cec4]" />
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">Recent Vouchers</h3>
            </div>
            <NextLink href="/accounting/journal-entries" className="text-xs text-[#00cec4] hover:underline flex items-center gap-1">
              View All <ArrowRight className="size-3" />
            </NextLink>
          </div>

          <div className="space-y-3">
            {recentJVs.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No journal vouchers created.</p>
            ) : (
              recentJVs.map((jv) => (
                <div key={jv.id} className="flex justify-between items-center text-xs p-2.5 bg-[#161f28]/35 rounded-lg border border-[#1c212a]/20">
                  <div>
                    <NextLink href={`/accounting/journal-entries/${jv.id}`} className="font-mono text-white font-bold hover:underline">
                      {jv.voucherNo}
                    </NextLink>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{jv.remarks || "No remarks"}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-white font-bold block">₹{Number(jv.totalDebit).toLocaleString("en-IN")}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider block mt-1 inline-block ${
                      jv.status === "SUBMITTED" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {jv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
