import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listJournalEntries } from "@/modules/accounting/service";
import NextLink from "next/link";
import { Plus, FileText, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

export default async function JournalEntriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;
  const jvs = await listJournalEntries(orgId);

  return (
    <div className="p-8 space-y-6 max-w-[1500px] mx-auto animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">Journal Entries</h2>
          <p className="text-slate-400 text-xs mt-1">
            Review manual ledger vouchers, record balanced adjustments, and audit double-entry ledger postings.
          </p>
        </div>
        <NextLink
          href="/accounting/journal-entries/new"
          className="flex items-center gap-1.5 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>New Voucher</span>
        </NextLink>
      </div>

      {/* TABLE */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55">
        {jvs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No journal entries created yet. Click "New Voucher" above to record a transaction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Voucher No</th>
                  <th>Posting Date</th>
                  <th>Remarks</th>
                  <th>Branch</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {jvs.map((jv) => (
                  <tr key={jv.id} className="hover:bg-[#161f28]/10 transition-all">
                    <td>
                      <NextLink
                        href={`/accounting/journal-entries/${jv.id}`}
                        className="text-white hover:text-[#00cec4] font-mono font-bold hover:underline transition-colors"
                      >
                        {jv.voucherNo}
                      </NextLink>
                    </td>
                    <td className="text-slate-350 text-xs">
                      {new Date(jv.postingDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="text-slate-400 text-xs max-w-xs truncate">
                      {jv.remarks || "—"}
                    </td>
                    <td className="text-slate-400 text-xs">
                      {jv.branch?.name || "Global / Head Office"}
                    </td>
                    <td className="ds-numeric font-bold text-white">
                      {/* debits = credits so totalDebit represents the transaction size */}
                      {Number(jv.totalDebit) > 0 
                        ? `₹${Number(jv.totalDebit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` 
                        : "₹0.00"
                      }
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                        jv.status === "SUBMITTED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : jv.status === "CANCELLED"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {jv.status === "SUBMITTED" && <CheckCircle2 className="size-3" />}
                        {jv.status === "CANCELLED" && <XCircle className="size-3" />}
                        {jv.status === "DRAFT" && <AlertCircle className="size-3" />}
                        <span>{jv.status}</span>
                      </span>
                    </td>
                    <td className="text-right">
                      <NextLink
                        href={`/accounting/journal-entries/${jv.id}`}
                        className="inline-block bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        Details
                      </NextLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
