import { NativeSelect } from "@/components/monolith/native-select";
import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getProfitAndLoss } from "@/modules/accounting/reports";
import { Filter, Scale, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { DateInput } from "@/components/monolith/date-input";

interface PLPageProps {
  searchParams: Promise<{
    branchId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

export default async function ProfitLossReportPage({ searchParams }: PLPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;
  const params = await searchParams;

  const branchId = params.branchId || undefined;
  const fromDate = params.fromDate ? new Date(params.fromDate) : undefined;
  const toDate = params.toDate ? new Date(params.toDate) : undefined;

  const [branches, pl] = await Promise.all([
    db.branch.findMany({ where: { orgId } }),
    getProfitAndLoss(orgId, { branchId, fromDate, toDate }),
  ]);

  const netProfit = pl.netProfit;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-mono-border/20 pb-5">
        <div>
          <h2 className="monolith-h1 text-white">Profit & Loss Statement</h2>
          <p className="text-slate-400 text-xs mt-1">
            Analyze operational revenues, expenses, and net profit generation for the organization.
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

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="monolith-label block text-slate-400">From Date</label>
              <DateInput
                name="fromDate"
                defaultValue={params.fromDate || ""}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-1.5"
              />
            </div>
            <div className="space-y-1">
              <label className="monolith-label block text-slate-400">To Date</label>
              <DateInput
                name="toDate"
                defaultValue={params.toDate || ""}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-1.5"
              />
            </div>
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

      {/* PL REPORT LAYOUT */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Statement Box */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-6">
          <div className="flex justify-between items-center border-b border-[#1c212a]/30 pb-3">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Scale className="size-4.5 text-[#F9D972]" /> Income & Expense Statement
            </h3>
          </div>

          {/* INCOME SECTION */}
          <div className="space-y-3">
            <div className="flex justify-between border-b border-[#1c212a]/40 pb-1">
              <span className="font-bold text-xs text-white uppercase tracking-wider">1. Revenue / Income</span>
              <span className="font-bold text-xs text-white"></span>
            </div>

            <div className="space-y-2 pl-4 text-xs">
              {pl.income.accounts.length === 0 ? (
                <p className="text-slate-500 italic">No revenue recorded in this period.</p>
              ) : (
                pl.income.accounts.map((acc, i) => (
                  <div key={i} className="flex justify-between text-slate-300">
                    <span>{acc.name} ({acc.code})</span>
                    <span className="monolith-numeric">₹{acc.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between font-bold text-xs text-white pt-2 border-t border-[#1c212a]/20 pl-4">
              <span>Total Revenue:</span>
              <span className="monolith-numeric text-[#F9D972]">₹{pl.income.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* EXPENSE SECTION */}
          <div className="space-y-3 pt-4">
            <div className="flex justify-between border-b border-[#1c212a]/40 pb-1">
              <span className="font-bold text-xs text-white uppercase tracking-wider">2. Operating Expenses</span>
              <span className="font-bold text-xs text-white"></span>
            </div>

            <div className="space-y-2 pl-4 text-xs">
              {pl.expense.accounts.length === 0 ? (
                <p className="text-slate-500 italic">No expenses recorded in this period.</p>
              ) : (
                pl.expense.accounts.map((acc, i) => (
                  <div key={i} className="flex justify-between text-slate-300">
                    <span>{acc.name} ({acc.code})</span>
                    <span className="monolith-numeric">₹{acc.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between font-bold text-xs text-white pt-2 border-t border-[#1c212a]/20 pl-4">
              <span>Total Operating Expense:</span>
              <span className="monolith-numeric text-[#D88700]">₹{pl.expense.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* NET SURPLUS SUMMARY */}
          <div className="border-t border-[#1c212a]/55 pt-4 flex justify-between items-center bg-[#161f28]/10 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              {netProfit >= 0 ? (
                <ArrowUpRight className="size-5 text-emerald-400 shrink-0" />
              ) : (
                <ArrowDownRight className="size-5 text-red-400 shrink-0" />
              )}
              <span className="font-bold text-sm text-white uppercase tracking-wider">Net Profit / (Loss)</span>
            </div>
            <span className={`monolith-numeric text-base font-bold ${netProfit >= 0 ? "text-emerald-400" : "text-[#D88700]"}`}>
              ₹{netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
