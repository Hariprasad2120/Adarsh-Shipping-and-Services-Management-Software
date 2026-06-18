"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar, FileText, Landmark, Loader2 } from "lucide-react";
import { createJournalEntryAction } from "@/modules/accounting/actions";

interface NewJVClientProps {
  accounts: any[];
  branches: any[];
}

export function NewJVClient({ accounts, branches }: NewJVClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitImmediately, setSubmitImmediately] = useState(false);

  const [lines, setLines] = useState<any[]>([
    { accountId: "", debit: 0, credit: 0, remarks: "" },
    { accountId: "", debit: 0, credit: 0, remarks: "" },
  ]);

  const handleAddLine = () => {
    setLines([...lines, { accountId: "", debit: 0, credit: 0, remarks: "" }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) {
      toast.error("At least two lines are required for a Journal Entry");
      return;
    }
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[idx][field] = value;
    
    // Auto clear credit if debit is entered, and vice versa
    if (field === "debit" && parseFloat(value) > 0) {
      newLines[idx]["credit"] = 0;
    } else if (field === "credit" && parseFloat(value) > 0) {
      newLines[idx]["debit"] = 0;
    }

    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference <= 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.some((l) => !l.accountId)) {
      toast.error("Please select accounts for all lines");
      return;
    }

    if (totalDebit <= 0) {
      toast.error("Transaction total amount must be greater than zero");
      return;
    }

    if (!isBalanced) {
      toast.error(`Transaction is unbalanced. Debits must equal credits. Difference: ₹${difference.toFixed(2)}`);
      return;
    }

    setIsSaving(true);
    try {
      const res = await createJournalEntryAction({
        postingDate: new Date(postingDate),
        remarks: remarks || null,
        branchId: branchId || null,
        submit: submitImmediately,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          remarks: l.remarks || null,
        })),
      });

      if (res.ok) {
        toast.success(submitImmediately ? "Journal Entry posted successfully!" : "Journal Entry draft saved!");
        router.push("/accounting/journal-entries");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create journal entry");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* ─── VOUCHER PROPERTIES ────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
          <Calendar className="size-4.5 text-[#00cec4]" />
          <h3 className="font-bold text-xs text-white uppercase tracking-wider">Voucher Header Details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Posting Date</label>
            <input
              type="date"
              required
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Branch Dimension</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="">Global / Org-wide</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="ds-label block text-slate-400">General Remarks</label>
            <input
              type="text"
              placeholder="e.g. Month-end depreciation adjustment"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
            />
          </div>
        </div>
      </div>

      {/* ─── TRANSACTION ROWS ───────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <div className="flex justify-between items-center border-b border-[#1c212a]/30 pb-3">
          <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <Landmark className="size-4.5 text-[#00cec4]" /> Debit & Credit Distribution Lines
          </h3>
          <button
            type="button"
            onClick={handleAddLine}
            className="flex items-center gap-1 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="size-3.5 text-[#00cec4]" />
            <span>Add Row</span>
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-3 items-end md:items-center text-xs">
              
              {/* Account Dropdown */}
              <div className="flex-1 space-y-1 w-full">
                <label className="ds-label text-slate-500 md:hidden">Account</label>
                <select
                  required
                  value={line.accountId}
                  onChange={(e) => handleLineChange(idx, "accountId", e.target.value)}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
                >
                  <option value="">Select Account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                  ))}
                </select>
              </div>

              {/* Debit */}
              <div className="w-full md:w-36 space-y-1">
                <label className="ds-label text-slate-500 md:hidden">Debit</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Debit (₹)"
                  value={line.debit || ""}
                  onChange={(e) => handleLineChange(idx, "debit", e.target.value)}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-mono"
                />
              </div>

              {/* Credit */}
              <div className="w-full md:w-36 space-y-1">
                <label className="ds-label text-slate-500 md:hidden">Credit</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Credit (₹)"
                  value={line.credit || ""}
                  onChange={(e) => handleLineChange(idx, "credit", e.target.value)}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-mono"
                />
              </div>

              {/* Row Remarks */}
              <div className="flex-1 space-y-1 w-full">
                <label className="ds-label text-slate-500 md:hidden">Description</label>
                <input
                  type="text"
                  placeholder="Line description..."
                  value={line.remarks}
                  onChange={(e) => handleLineChange(idx, "remarks", e.target.value)}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
                />
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleRemoveLine(idx)}
                className="p-2.5 text-slate-500 hover:text-red-450 hover:bg-red-500/5 rounded-xl transition-all cursor-pointer border border-[#1c212a]/30 mb-[1px]"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        {/* BALANCE SUMMARY BAR */}
        <div className="border-t border-[#1c212a]/50 pt-4 flex flex-col sm:flex-row sm:justify-between items-center gap-4 text-xs font-semibold text-white">
          <div className="flex gap-4">
            <div>
              <span className="text-slate-400 block mb-0.5">Total Debit:</span>
              <span className="ds-numeric text-white text-sm font-bold">₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Total Credit:</span>
              <span className="ds-numeric text-white text-sm font-bold">₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-slate-400 block mb-0.5">Difference:</span>
            <span className={`ds-numeric text-sm font-bold ${isBalanced ? "text-emerald-400" : "text-[#fb923c]"}`}>
              ₹{difference.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              {isBalanced ? " (Balanced)" : " (Unbalanced)"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── FORM ACTIONS ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55">
        <div className="flex items-center gap-2 select-none text-xs">
          <input
            type="checkbox"
            id="submitImmediately"
            checked={submitImmediately}
            onChange={(e) => setSubmitImmediately(e.target.checked)}
            className="size-4 accent-[#00cec4] rounded bg-slate-900 border-[#1c212a] cursor-pointer"
          />
          <label htmlFor="submitImmediately" className="ds-label block text-slate-200 cursor-pointer">
            Post directly to General Ledger? (Skip Draft status)
          </label>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-6 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Voucher</span>
          )}
        </button>
      </div>

    </form>
  );
}
