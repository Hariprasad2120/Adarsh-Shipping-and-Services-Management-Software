import { NativeSelect } from "@/components/monolith/native-select";
import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getBalanceSheet } from "@/modules/accounting/reports";
import { Filter, Scale, ShieldCheck, ShieldAlert } from "lucide-react";
import { DateInput } from "@/components/monolith/date-input";

interface BSPageProps {
  searchParams: Promise<{
    branchId?: string;
    toDate?: string;
  }>;
}

export default async function BalanceSheetReportPage({ searchParams }: BSPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;
  const params = await searchParams;

  const branchId = params.branchId || undefined;
  const toDate = params.toDate ? new Date(params.toDate) : undefined;

  const [branches, bs] = await Promise.all([
    db.branch.findMany({ where: { orgId } }),
    getBalanceSheet(orgId, { branchId, toDate }),
  ]);

  const totalAssets = bs.totalAssets;
  const totalLiabilitiesAndEquity = bs.totalLiabilitiesAndEquity;
  const isBalanced = bs.isBalanced;

  return (
    <div className="p-8 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-mono-border/20 pb-5">
        <div>
          <h2 className="monolith-h1 text-white">Balance Sheet Statement</h2>
          <p className="text-slate-400 text-xs mt-1">
            Display corporate Assets, Liabilities, and Owner's Equity. Total Assets must equal Total Liabilities and Equity.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="p-4 rounded-xl bg-[#0f1319] border border-[#1c212a]/55">
        <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
          <div className="space-y-1 md:col-span-2">
            <label className="monolith-label block text-slate-400">Branch Dimension</label>
            <NativeSelect
              name="branchId"
              defaultValue={branchId || ""}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1">
            <label className="monolith-label block text-slate-400">As Of Date</label>
            <DateInput
              name="toDate"
              defaultValue={params.toDate || ""}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-1.5"
            />
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 bg-[#F9D972] text-white hover:bg-[#E8C85D] px-4 py-2 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer w-full h-[38px]"
          >
            <Filter className="size-3.5" />
            <span>Apply Filters</span>
          </button>
        </form>
      </div>

      {/* BALANCE SHEET SHEET */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-6">
        
        <div className="flex justify-between items-center border-b border-[#1c212a]/30 pb-3">
          <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <Scale className="size-4.5 text-[#F9D972]" /> Statement of Financial Position
          </h3>
          <div className="flex items-center gap-1">
            {isBalanced ? (
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                <ShieldCheck className="size-4" /> Balanced
              </span>
            ) : (
              <span className="text-[#D88700] font-bold text-xs flex items-center gap-1">
                <ShieldAlert className="size-4" /> Out of Balance
              </span>
            )}
          </div>
        </div>

        {/* ASSETS SECTION */}
        <div className="space-y-3">
          <div className="flex justify-between border-b border-[#1c212a]/40 pb-1">
            <span className="font-bold text-xs text-white uppercase tracking-wider">1. Assets</span>
          </div>
          <div className="space-y-2 pl-4 text-xs">
            {bs.assets.accounts.length === 0 ? (
              <p className="text-slate-500 italic">No asset balances.</p>
            ) : (
              bs.assets.accounts.map((acc, i) => (
                <div key={i} className="flex justify-between text-slate-350">
                  <span>{acc.name} ({acc.code})</span>
                  <span className="monolith-numeric font-semibold">₹{acc.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-between font-bold text-xs text-white pt-2 border-t border-[#1c212a]/20 pl-4 bg-[#161f28]/10 p-2 rounded-lg">
            <span className="text-[#F9D972]">Total Assets:</span>
            <span className="monolith-numeric text-[#F9D972]">₹{totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* LIABILITIES SECTION */}
        <div className="space-y-3 pt-4">
          <div className="flex justify-between border-b border-[#1c212a]/40 pb-1">
            <span className="font-bold text-xs text-white uppercase tracking-wider">2. Liabilities</span>
          </div>
          <div className="space-y-2 pl-4 text-xs">
            {bs.liabilities.accounts.length === 0 ? (
              <p className="text-slate-500 italic">No liability balances.</p>
            ) : (
              bs.liabilities.accounts.map((acc, i) => (
                <div key={i} className="flex justify-between text-slate-350">
                  <span>{acc.name} ({acc.code})</span>
                  <span className="monolith-numeric font-semibold">₹{acc.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-between font-bold text-xs text-white pt-2 border-t border-[#1c212a]/20 pl-4">
            <span>Total Liabilities:</span>
            <span className="monolith-numeric text-[#D88700]">₹{bs.liabilities.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* EQUITY SECTION */}
        <div className="space-y-3 pt-4">
          <div className="flex justify-between border-b border-[#1c212a]/40 pb-1">
            <span className="font-bold text-xs text-white uppercase tracking-wider">3. Owner's Equity</span>
          </div>
          <div className="space-y-2 pl-4 text-xs">
            {bs.equity.accounts.map((acc, i) => (
              <div key={i} className="flex justify-between text-slate-350">
                <span>{acc.name} ({acc.code})</span>
                <span className="monolith-numeric font-semibold">₹{acc.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            {bs.currentYearProfit !== 0 && (
              <div className="flex justify-between text-slate-350 italic">
                <span>Retained Surplus (Current Year Profit/Loss)</span>
                <span className="monolith-numeric font-semibold">₹{bs.currentYearProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between font-bold text-xs text-white pt-2 border-t border-[#1c212a]/20 pl-4">
            <span>Total Equity:</span>
            <span className="monolith-numeric">₹{bs.equity.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* LIABILITIES & EQUITY SUMMARY */}
        <div className="border-t border-[#1c212a]/55 pt-4 flex justify-between items-center bg-[#161f28]/10 p-4 rounded-xl">
          <span className="font-bold text-sm text-white uppercase tracking-wider text-[#F9D972]">Total Liabilities & Equity</span>
          <span className="monolith-numeric text-base font-bold text-[#F9D972]">
            ₹{totalLiabilitiesAndEquity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

      </div>

    </div>
  );
}
