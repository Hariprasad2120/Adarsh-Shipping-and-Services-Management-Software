import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getGeneralLedger } from "@/modules/accounting/reports";
import { listAccounts } from "@/modules/accounting/service";
import NextLink from "next/link";
import { Filter, Scale } from "lucide-react";

interface GLPageProps {
  searchParams: Promise<{
    accountId?: string;
    branchId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

export default async function GeneralLedgerReportPage({ searchParams }: GLPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;
  const params = await searchParams;

  const accountId = params.accountId || undefined;
  const branchId = params.branchId || undefined;
  const fromDate = params.fromDate ? new Date(params.fromDate) : undefined;
  const toDate = params.toDate ? new Date(params.toDate) : undefined;

  // Fetch accounts, branches, and GL postings
  const [accounts, branches, glEntries] = await Promise.all([
    listAccounts(orgId),
    db.branch.findMany({ where: { orgId } }),
    getGeneralLedger(orgId, { accountId, branchId, fromDate, toDate }),
  ]);

  const leafAccounts = accounts.filter((a) => !a.isGroup && a.isActive);

  // Total debits & credits in the period
  let periodDebit = 0;
  let periodCredit = 0;
  glEntries.forEach((ent) => {
    if (!ent.isCancelled) {
      periodDebit += ent.debit;
      periodCredit += ent.credit;
    }
  });

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">General Ledger</h2>
          <p className="text-slate-400 text-xs mt-1">
            Audit comprehensive ledger entries, track running balances, and filter by accounts, dates, and branches.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="p-4 rounded-xl bg-[#0f1319] border border-[#1c212a]/55">
        <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Ledger Account</label>
            <select
              name="accountId"
              defaultValue={accountId || ""}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2"
            >
              <option value="">All Accounts</option>
              {leafAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
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

      {/* GL ENTRIES TABLE */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <div className="flex justify-between items-center border-b border-[#1c212a]/30 pb-3">
          <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <Scale className="size-4.5 text-[#00cec4]" /> Audit Posting Records
          </h3>
        </div>

        {glEntries.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No general ledger postings match the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Posting Date</th>
                  <th>Account Code / Name</th>
                  <th>Voucher Ref</th>
                  <th>Remarks / Narration</th>
                  <th className="text-right">Debit (₹)</th>
                  <th className="text-right">Credit (₹)</th>
                  <th className="text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {glEntries.map((ent) => {
                  let path = "/accounting/journal-entries";
                  if (ent.voucherType === "SALES_INVOICE") path = `/accounting/sales-invoices/${ent.voucherId}`;
                  else if (ent.voucherType === "PURCHASE_INVOICE") path = `/accounting/purchase-invoices/${ent.voucherId}`;
                  else if (ent.voucherType === "PAYMENT_ENTRY") path = `/accounting/payment-entries/${ent.voucherId}`;
                  else path = `/accounting/journal-entries/${ent.voucherId}`;

                  return (
                    <tr
                      key={ent.id}
                      className={`hover:bg-[#161f28]/10 transition-all text-xs ${
                        ent.isCancelled ? "opacity-45 line-through" : ""
                      }`}
                    >
                      <td className="text-slate-350">{new Date(ent.postingDate).toLocaleDateString("en-IN")}</td>
                      <td>
                        <div>
                          <span className="font-semibold text-white block">{ent.accountName}</span>
                          <span className="text-[10px] font-mono text-slate-400 block tracking-wider mt-0.5">{ent.accountCode}</span>
                        </div>
                      </td>
                      <td>
                        <NextLink href={path} className="text-[#00cec4] hover:underline font-mono font-bold">
                          {ent.voucherType.replace("_", " ")}
                        </NextLink>
                      </td>
                      <td className="text-slate-400 max-w-xs truncate">{ent.remarks || "—"}</td>
                      <td className="ds-numeric text-white text-right font-semibold">
                        {ent.debit > 0 ? `₹${ent.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="ds-numeric text-white text-right font-semibold">
                        {ent.credit > 0 ? `₹${ent.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="ds-numeric text-white text-right font-bold text-[#00cec4]">
                        ₹{ent.runningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#1c212a]/50 font-bold bg-[#161f28]/10 text-white text-xs">
                  <td>Period Summary</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="ds-numeric text-right">₹{periodDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="ds-numeric text-right">₹{periodCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
