import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTrialBalance } from "@/modules/accounting/reports";
import { Filter, Scale } from "lucide-react";

interface TBPageProps {
  searchParams: Promise<{
    branchId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

export default async function TrialBalanceReportPage({ searchParams }: TBPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;
  const params = await searchParams;

  const branchId = params.branchId || undefined;
  const fromDate = params.fromDate ? new Date(params.fromDate) : undefined;
  const toDate = params.toDate ? new Date(params.toDate) : undefined;

  const [branches, trialBalance] = await Promise.all([
    db.branch.findMany({ where: { orgId } }),
    getTrialBalance(orgId, { branchId, fromDate, toDate, includeZero: false }),
  ]);

  // Summaries
  let totalOpenDr = 0;
  let totalOpenCr = 0;
  let totalPeriodDr = 0;
  let totalPeriodCr = 0;
  let totalCloseDr = 0;
  let totalCloseCr = 0;

  trialBalance.forEach((row) => {
    totalOpenDr += row.openingDebit;
    totalOpenCr += row.openingCredit;
    totalPeriodDr += row.debit;
    totalPeriodCr += row.credit;
    totalCloseDr += row.closingDebit;
    totalCloseCr += row.closingCredit;
  });

  const openingBalanced = Math.abs(totalOpenDr - totalOpenCr) <= 0.05;
  const periodBalanced = Math.abs(totalPeriodDr - totalPeriodCr) <= 0.05;
  const closingBalanced = Math.abs(totalCloseDr - totalCloseCr) <= 0.05;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">Trial Balance</h2>
          <p className="text-slate-400 text-xs mt-1">
            Compare period-end balances of all ledger accounts. Total Debits must exactly equal Total Credits.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="p-4 rounded-xl bg-[#0f1319] border border-[#1c212a]/55">
        <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
          <div className="space-y-1 md:col-span-2">
            <label className="ds-label block text-slate-400">Branch Dimension</label>
            <select
              name="branchId"
              defaultValue={branchId || ""}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">From Date</label>
              <input
                type="date"
                name="fromDate"
                defaultValue={params.fromDate || ""}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-1.5"
              />
            </div>
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">To Date</label>
              <input
                type="date"
                name="toDate"
                defaultValue={params.toDate || ""}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-1.5"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer w-full h-[38px]"
          >
            <Filter className="size-3.5" />
            <span>Apply Filters</span>
          </button>
        </form>
      </div>

      {/* REPORT PANEL */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <div className="flex justify-between items-center border-b border-[#1c212a]/30 pb-3">
          <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <Scale className="size-4.5 text-[#00cec4]" /> Period Balances Worksheet
          </h3>
        </div>

        {trialBalance.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No accounts have active balances during this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table text-xs">
              <thead>
                <tr className="border-b border-[#1c212a]/30">
                  <th rowSpan={2} className="align-bottom pb-3">Account Code / Name</th>
                  <th rowSpan={2} className="align-bottom pb-3">Root Type</th>
                  <th colSpan={2} className="text-center border-b border-[#1c212a]/30 pb-1">Opening Balances</th>
                  <th colSpan={2} className="text-center border-b border-[#1c212a]/30 pb-1">Period Postings</th>
                  <th colSpan={2} className="text-center border-b border-[#1c212a]/30 pb-1">Closing Balances</th>
                </tr>
                <tr>
                  <th className="text-right">Debit (₹)</th>
                  <th className="text-right">Credit (₹)</th>
                  <th className="text-right">Debit (₹)</th>
                  <th className="text-right">Credit (₹)</th>
                  <th className="text-right">Debit (₹)</th>
                  <th className="text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.map((row) => (
                  <tr key={row.accountId} className="hover:bg-[#161f28]/10 transition-all">
                    <td>
                      <div>
                        <span className="font-semibold text-white block">{row.accountName}</span>
                        <span className="text-[10px] font-mono text-slate-400 block tracking-wider mt-0.5">{row.accountCode}</span>
                      </div>
                    </td>
                    <td className="text-slate-400 font-semibold uppercase">{row.rootType}</td>
                    
                    {/* Opening */}
                    <td className="ds-numeric text-right">
                      {row.openingDebit > 0 ? `₹${row.openingDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="ds-numeric text-right">
                      {row.openingCredit > 0 ? `₹${row.openingCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>

                    {/* Period */}
                    <td className="ds-numeric text-right">
                      {row.debit > 0 ? `₹${row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="ds-numeric text-right">
                      {row.credit > 0 ? `₹${row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>

                    {/* Closing */}
                    <td className="ds-numeric text-right font-semibold text-white">
                      {row.closingDebit > 0 ? `₹${row.closingDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="ds-numeric text-right font-semibold text-white">
                      {row.closingCredit > 0 ? `₹${row.closingCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                
                {/* Total Row */}
                <tr className="border-t-2 border-slate-700 font-bold bg-[#161f28]/15 text-white text-xs">
                  <td>Summary Totals</td>
                  <td></td>
                  <td className="ds-numeric text-right">₹{totalOpenDr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="ds-numeric text-right font-semibold">₹{totalOpenCr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="ds-numeric text-right">₹{totalPeriodDr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="ds-numeric text-right">₹{totalPeriodCr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="ds-numeric text-right text-[#00cec4]">₹{totalCloseDr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="ds-numeric text-right text-[#00cec4]">₹{totalCloseCr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>

                {/* Audit Check Row */}
                <tr className="text-[10px] text-slate-450 border-t border-[#1c212a]/30">
                  <td>Ledger Check</td>
                  <td></td>
                  <td colSpan={2} className={`text-center font-bold ${openingBalanced ? "text-emerald-400" : "text-[#fb923c]"}`}>
                    {openingBalanced ? "Balanced ✓" : `Diff: ₹${Math.abs(totalOpenDr - totalOpenCr).toFixed(2)}`}
                  </td>
                  <td colSpan={2} className={`text-center font-bold ${periodBalanced ? "text-emerald-400" : "text-[#fb923c]"}`}>
                    {periodBalanced ? "Balanced ✓" : `Diff: ₹${Math.abs(totalPeriodDr - totalPeriodCr).toFixed(2)}`}
                  </td>
                  <td colSpan={2} className={`text-center font-bold ${closingBalanced ? "text-emerald-400" : "text-[#fb923c]"}`}>
                    {closingBalanced ? "Balanced ✓" : `Diff: ₹${Math.abs(totalCloseDr - totalCloseCr).toFixed(2)}`}
                  </td>
                </tr>

              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
