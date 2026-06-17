"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  DollarSign,
  Users,
  ShieldCheck,
  Activity,
  ChevronRight,
  Eye,
  Loader2,
  AlertCircle
} from "lucide-react";
import {
  compilePayrollBatchAction,
  createPayrollBatchAction,
  finalizePayrollBatchAction,
  payPayrollBatchAction
} from "@/modules/accounting/actions";

interface PayrollClientProps {
  initialBatches: any[];
  settingsConfigured: boolean;
}

export function PayrollClient({ initialBatches, settingsConfigured }: PayrollClientProps) {
  const router = useRouter();
  const [batches, setBatches] = useState<any[]>(initialBatches);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"BATCHES" | "PREVIEW">("BATCHES");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleCompilePreview = async () => {
    setIsCompiling(true);
    setPreviewData(null);
    try {
      const monthDate = new Date(Date.UTC(selectedYear, selectedMonth, 1));
      const res = await compilePayrollBatchAction(monthDate);
      if (res.ok) {
        setPreviewData(res.data);
        setActiveTab("PREVIEW");
        toast.success("Salaries compiled successfully!");
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to compile salaries");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!previewData) return;
    setIsCreating(true);
    try {
      const monthDate = new Date(Date.UTC(selectedYear, selectedMonth, 1));
      const res = await createPayrollBatchAction(monthDate);
      if (res.ok) {
        toast.success("Payroll batch created successfully!");
        setPreviewData(null);
        setActiveTab("BATCHES");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create payroll batch");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFinalizeBatch = async (batchId: string) => {
    if (!settingsConfigured) {
      toast.error("Please configure salary accounts in Accounting Settings first.");
      return;
    }
    if (!confirm("Are you sure you want to finalize this payroll batch? This will post accrual ledger entries.")) return;

    setProcessingBatchId(batchId);
    try {
      const res = await finalizePayrollBatchAction(batchId);
      if (res.ok) {
        toast.success("Payroll batch finalized and posted to General Ledger!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize payroll batch");
    } finally {
      setProcessingBatchId(null);
    }
  };

  const handlePayBatch = async (batchId: string) => {
    if (!settingsConfigured) {
      toast.error("Please configure bank and salary accounts in Accounting Settings first.");
      return;
    }
    if (!confirm("Confirm payroll payout? This will record the bank disbursement entries.")) return;

    setProcessingBatchId(batchId);
    try {
      const res = await payPayrollBatchAction(batchId);
      if (res.ok) {
        toast.success("Payroll payout batch executed and bank transactions posted!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to pay payroll batch");
    } finally {
      setProcessingBatchId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ─── CONTROLS PANEL ────────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
          <Calendar className="size-4.5 text-[#00cec4]" />
          <h3 className="font-bold text-sm text-white uppercase tracking-wider">Payroll Control Center</h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 space-y-1">
            <label className="ds-label block text-slate-400">Select Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-sm"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 space-y-1">
            <label className="ds-label block text-slate-400">Select Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-sm"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <button
            disabled={isCompiling}
            onClick={handleCompilePreview}
            className="flex items-center justify-center gap-2 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-5 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 h-[42px]"
          >
            {isCompiling ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Compiling...</span>
              </>
            ) : (
              <span>Compile & Preview Salary Sheet</span>
            )}
          </button>
        </div>
      </div>

      {/* ─── TABS ──────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[#1c212a]/50 pb-1 gap-6 select-none">
        <button
          onClick={() => setActiveTab("BATCHES")}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "BATCHES" ? "border-[#00cec4] text-white" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Payroll Batches ({batches.length})
        </button>
        {previewData && (
          <button
            onClick={() => setActiveTab("PREVIEW")}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "PREVIEW" ? "border-[#00cec4] text-white" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Salary Sheet Compilation
          </button>
        )}
      </div>

      {/* ─── TAB CONTENTS ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        {activeTab === "BATCHES" && (
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
            {batches.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No payroll batches created yet. Compile a salary sheet above to generate a draft.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Payroll Month</th>
                      <th>Gross Payables</th>
                      <th>Status</th>
                      <th>Accrual Voucher (JV)</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => {
                      const batchMonth = new Date(batch.month);
                      const monthLabel = batchMonth.toLocaleString("en-IN", { month: "long", year: "numeric" });
                      return (
                        <tr key={batch.id} className="hover:bg-[#161f28]/20 transition-all">
                          <td className="font-semibold text-white">{monthLabel}</td>
                          <td className="ds-numeric font-bold text-white">
                            ₹{batch.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td>
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                              batch.status === "PAID"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : batch.status === "FINALIZED"
                                ? "bg-[#00cec4]/10 text-[#00cec4]"
                                : "bg-amber-500/10 text-amber-400"
                            }`}>
                              {batch.status}
                            </span>
                          </td>
                          <td>
                            {batch.journalEntry ? (
                              <Link
                                href={`/accounting/journal-entries/${batch.journalEntry.id}`}
                                className="text-[#00cec4] hover:underline font-mono text-xs font-bold"
                              >
                                {batch.journalEntry.voucherNo}
                              </Link>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              {batch.status === "DRAFT" && (
                                <button
                                  disabled={processingBatchId === batch.id}
                                  onClick={() => handleFinalizeBatch(batch.id)}
                                  className="flex items-center gap-1 bg-[#00cec4] text-white hover:bg-[#00b8af] px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wide font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {processingBatchId === batch.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <span>Finalize & Post JV</span>
                                  )}
                                </button>
                              )}
                              {batch.status === "FINALIZED" && (
                                <button
                                  disabled={processingBatchId === batch.id}
                                  onClick={() => handlePayBatch(batch.id)}
                                  className="flex items-center gap-1 bg-[#fb923c] text-white hover:bg-orange-500 px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wide font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {processingBatchId === batch.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <span>Payout salaries (Bank DR)</span>
                                  )}
                                </button>
                              )}
                              {batch.status === "PAID" && (
                                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 py-1 px-2">
                                  <ShieldCheck className="size-4" /> Paid & Settled
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "PREVIEW" && previewData && (
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1c212a]/30 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Salary Sheets Summary — {months[selectedMonth]} {selectedYear}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Employees compiled: {previewData.salarySheets.length} | Net Salary accrual: ₹{previewData.totalAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <button
                disabled={isCreating}
                onClick={handleCreateBatch}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isCreating ? "Generating batch..." : "Confirm & Save Draft Batch"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Emp Number</th>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Basic Pay</th>
                    <th>HRA</th>
                    <th>Allowances</th>
                    <th>Gross Monthly</th>
                    <th>Take Home</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.salarySheets.map((sheet: any) => (
                    <tr key={sheet.userId} className="hover:bg-[#161f28]/10">
                      <td className="ds-numeric font-semibold text-slate-400">#{sheet.employeeNumber || "—"}</td>
                      <td className="font-semibold text-white">{sheet.name}</td>
                      <td className="text-slate-400 text-xs">{sheet.designation || "—"}</td>
                      <td className="ds-numeric text-white">₹{sheet.basic.toLocaleString("en-IN")}</td>
                      <td className="ds-numeric text-white">₹{sheet.hra.toLocaleString("en-IN")}</td>
                      <td className="ds-numeric text-white">₹{sheet.allowances.toLocaleString("en-IN")}</td>
                      <td className="ds-numeric font-bold text-[#00cec4]">₹{sheet.gross.toLocaleString("en-IN")}</td>
                      <td className="ds-numeric font-bold text-white">₹{sheet.inHand.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
