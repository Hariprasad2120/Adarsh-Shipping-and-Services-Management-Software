"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Calendar,
  FileText,
  ShieldAlert,
  Loader2,
  CheckCircle,
  XCircle,
  Database,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { submitJournalEntryAction, cancelJournalEntryAction } from "@/modules/accounting/actions";

interface JournalEntryDetailClientProps {
  jv: any;
}

export function JournalEntryDetailClient({ jv }: JournalEntryDetailClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleSubmit = async () => {
    if (!confirm("Are you sure you want to submit this journal entry? This will post double-entry lines permanently to the General Ledger.")) return;
    setIsSubmitting(true);
    try {
      const res = await submitJournalEntryAction(jv.id);
      if (res.ok) {
        toast.success("Journal Entry submitted and posted successfully!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit journal entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this journal entry? This will flag it as cancelled and write offset reversal lines.")) return;
    setIsCancelling(true);
    try {
      const res = await cancelJournalEntryAction(jv.id);
      if (res.ok) {
        toast.success("Journal Entry cancelled and reversal entries written!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel journal entry");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ─── SUMMARY CARD ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Info panel */}
        <div className="md:col-span-2 p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
            <FileText className="size-4.5 text-[#00cec4]" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">Voucher Info Summary</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
            <div>
              <strong className="text-white block mb-0.5">Posting Date:</strong>
              {new Date(jv.postingDate).toLocaleDateString("en-IN")}
            </div>
            <div>
              <strong className="text-white block mb-0.5">Branch:</strong>
              {jv.branch?.name || "Global / Head Office"}
            </div>
            <div className="col-span-2">
              <strong className="text-white block mb-0.5">Remarks / Description:</strong>
              {jv.remarks || "No description provided."}
            </div>
          </div>
        </div>

        {/* Status panel */}
        <div className="md:col-span-1 p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 flex flex-col justify-between card-left-accent">
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Status & Control</span>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase tracking-wider flex items-center gap-1 ${
                jv.status === "SUBMITTED"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : jv.status === "CANCELLED"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}>
                {jv.status}
              </span>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            {jv.status === "DRAFT" && (
              <button
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="w-full bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-4" />}
                <span>Submit & Post JV</span>
              </button>
            )}

            {jv.status === "SUBMITTED" && (
              <button
                disabled={isCancelling}
                onClick={handleCancel}
                className="w-full bg-red-500/10 text-red-450 hover:bg-red-500/20 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isCancelling ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-4" />}
                <span>Cancel & Reverse Entry</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ─── LEDGER LINES TABLE ────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
          <TrendingUp className="size-4.5 text-[#00cec4]" />
          <h3 className="font-bold text-xs text-white uppercase tracking-wider">Debit & Credit Postings</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Account Code / Name</th>
                <th>Party Details</th>
                <th className="text-right">Debit (₹)</th>
                <th className="text-right">Credit (₹)</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {jv.lines.map((l: any) => (
                <tr key={l.id} className="hover:bg-[#161f28]/10 text-xs">
                  <td>
                    <div>
                      <span className="font-semibold text-white block">{l.account.accountName}</span>
                      <span className="text-[10px] font-mono text-slate-400 block tracking-wider mt-0.5">{l.account.accountCode}</span>
                    </div>
                  </td>
                  <td className="text-slate-400">
                    {l.partyType ? `${l.partyType}: ${l.partyId || "—"}` : "—"}
                  </td>
                  <td className="ds-numeric text-white text-right font-semibold">
                    {l.debit > 0 ? `₹${l.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="ds-numeric text-white text-right font-semibold">
                    {l.credit > 0 ? `₹${l.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="text-slate-400 text-xs">
                    {l.remarks || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#1c212a]/50 font-bold bg-[#161f28]/10 text-white text-xs">
                <td>Total</td>
                <td></td>
                <td className="ds-numeric text-right">
                  ₹{jv.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="ds-numeric text-right">
                  ₹{jv.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── GENERAL LEDGER postings list (when posted) ────────────────── */}
      {jv.glEntries && jv.glEntries.length > 0 && (
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
            <Database className="size-4.5 text-[#00cec4]" strokeWidth={2} />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">Posted General Ledger Entries</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Account Code/Name</th>
                  <th>Posting Date</th>
                  <th>Debit (₹)</th>
                  <th>Credit (₹)</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {jv.glEntries.map((gl: any) => (
                  <tr key={gl.id} className="hover:bg-[#161f28]/10 text-xs">
                    <td>
                      <span className="font-semibold text-white block">{gl.account.accountName}</span>
                      <span className="text-[10px] font-mono text-slate-400 block tracking-wider mt-0.5">{gl.account.accountCode}</span>
                    </td>
                    <td className="text-slate-400">
                      {new Date(gl.postingDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="ds-numeric text-white text-right font-semibold">
                      {gl.debit > 0 ? `₹${gl.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="ds-numeric text-white text-right font-semibold">
                      {gl.credit > 0 ? `₹${gl.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="text-slate-450 uppercase">{gl.voucherType}</td>
                    <td>
                      <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider ${
                        gl.isCancelled ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {gl.isCancelled ? "Cancelled" : "Posted"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
