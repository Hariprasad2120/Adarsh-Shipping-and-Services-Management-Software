"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlTable as MnxTable,
} from "@/modules/people/components/people-controls";

import { NativeSelect } from "@/components/ui/native-select";
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
  AlertCircle,
} from "lucide-react";
import {
  compilePayrollBatchAction,
  createPayrollBatchAction,
  finalizePayrollBatchAction,
  payPayrollBatchAction,
} from "@/modules/accounting/actions";

interface PayrollClientProps {
  initialBatches: any[];
  settingsConfigured: boolean;
}

export function PayrollClient({
  initialBatches,
  settingsConfigured,
}: PayrollClientProps) {
  const router = useRouter();
  const [batches, setBatches] = useState<any[]>(initialBatches);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth(),
  );
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"BATCHES" | "PREVIEW">("BATCHES");

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
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
      toast.error(
        "Please configure salary accounts in Accounting Settings first.",
      );
      return;
    }
    if (
      !confirm(
        "Are you sure you want to finalize this payroll batch? This will post accrual ledger entries.",
      )
    )
      return;

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
      toast.error(
        "Please configure bank and salary accounts in Accounting Settings first.",
      );
      return;
    }
    if (
      !confirm(
        "Confirm payroll payout? This will record the bank disbursement entries.",
      )
    )
      return;

    setProcessingBatchId(batchId);
    try {
      const res = await payPayrollBatchAction(batchId);
      if (res.ok) {
        toast.success(
          "Payroll payout batch executed and bank transactions posted!",
        );
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
      <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-surface-muted)]/55 space-y-4">
        <div className="flex items-center gap-3 border-b border-[var(--mnx-surface-muted)]/30 pb-3">
          <Calendar className="size-4.5 text-[var(--mnx-accent)]" />
          <h3 className="font-bold text-sm text-[var(--mnx-text)] uppercase tracking-wider">
            Payroll Control Center
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 space-y-1">
            <label className="mnx-dashboard-spec-label block text-[var(--mnx-muted)]">
              Select Month
            </label>
            <NativeSelect
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full bg-[var(--mnx-surface-soft)] border border-[var(--mnx-surface-muted)] text-[var(--mnx-text)] rounded-xl p-2.5 text-sm"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex-1 space-y-1">
            <label className="mnx-dashboard-spec-label block text-[var(--mnx-muted)]">
              Select Year
            </label>
            <NativeSelect
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full bg-[var(--mnx-surface-soft)] border border-[var(--mnx-surface-muted)] text-[var(--mnx-text)] rounded-xl p-2.5 text-sm"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </NativeSelect>
          </div>

          <MnxAction
            disabled={isCompiling}
            onClick={handleCompilePreview}
            className="flex items-center justify-center gap-2 bg-[var(--mnx-accent)] text-[var(--mnx-text)] hover:bg-[var(--mnx-accent-soft)] hover:shadow-ambient-hover px-5 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 h-[42px]"
          >
            {isCompiling ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Compiling...</span>
              </>
            ) : (
              <span>Compile & Preview Salary Sheet</span>
            )}
          </MnxAction>
        </div>
      </div>

      {/* ─── TABS ──────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[var(--mnx-surface-muted)]/50 pb-1 gap-6 select-none">
        <MnxAction
          onClick={() => setActiveTab("BATCHES")}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "BATCHES"
              ? "border-[var(--mnx-accent)] text-[var(--mnx-text)]"
              : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
          }`}
        >
          Payroll Batches ({batches.length})
        </MnxAction>
        {previewData && (
          <MnxAction
            onClick={() => setActiveTab("PREVIEW")}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "PREVIEW"
                ? "border-[var(--mnx-accent)] text-[var(--mnx-text)]"
                : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
            }`}
          >
            Salary Sheet Compilation
          </MnxAction>
        )}
      </div>

      {/* ─── TAB CONTENTS ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        {activeTab === "BATCHES" && (
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-surface-muted)]/55 space-y-4">
            {batches.length === 0 ? (
              <div className="text-center py-12 text-[var(--mnx-muted)] text-sm">
                No payroll batches created yet. Compile a salary sheet above to
                generate a draft.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <MnxTable className="mnx-workspace-table">
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
                      const monthLabel = batchMonth.toLocaleString("en-IN", {
                        month: "long",
                        year: "numeric",
                      });
                      return (
                        <tr
                          key={batch.id}
                          className="hover:bg-[var(--mnx-surface-soft)]/20 transition-all"
                        >
                          <td className="font-semibold text-[var(--mnx-text)]">
                            {monthLabel}
                          </td>
                          <td className="mnx-numeric font-bold text-[var(--mnx-text)]">
                            ₹
                            {batch.totalAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td>
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                                batch.status === "PAID"
                                  ? "bg-[var(--mnx-success-bg)]/10 text-[var(--mnx-success)]"
                                  : batch.status === "FINALIZED"
                                    ? "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]"
                                    : "bg-[var(--mnx-warning-bg)]/10 text-[var(--mnx-warning)]"
                              }`}
                            >
                              {batch.status}
                            </span>
                          </td>
                          <td>
                            {batch.journalEntry ? (
                              <Link
                                href={`/accounting/journal-entries/${batch.journalEntry.id}`}
                                className="text-[var(--mnx-accent)] hover:underline font-mono text-xs font-bold"
                              >
                                {batch.journalEntry.voucherNo}
                              </Link>
                            ) : (
                              <span className="text-[var(--mnx-muted)]">—</span>
                            )}
                          </td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              {batch.status === "DRAFT" && (
                                <MnxAction
                                  disabled={processingBatchId === batch.id}
                                  onClick={() => handleFinalizeBatch(batch.id)}
                                  className="flex items-center gap-1 bg-[var(--mnx-accent)] text-[var(--mnx-text)] hover:bg-[var(--mnx-accent-soft)] px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wide font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {processingBatchId === batch.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <span>Finalize & Post JV</span>
                                  )}
                                </MnxAction>
                              )}
                              {batch.status === "FINALIZED" && (
                                <MnxAction
                                  disabled={processingBatchId === batch.id}
                                  onClick={() => handlePayBatch(batch.id)}
                                  className="flex items-center gap-1 bg-[var(--mnx-warning)] text-[var(--mnx-text)] hover:bg-[var(--mnx-warning-bg)] px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wide font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {processingBatchId === batch.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <span>Payout salaries (Bank DR)</span>
                                  )}
                                </MnxAction>
                              )}
                              {batch.status === "PAID" && (
                                <span className="text-[var(--mnx-success)] text-xs font-bold flex items-center gap-1 py-1 px-2">
                                  <ShieldCheck className="size-4" /> Paid &
                                  Settled
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </MnxTable>
              </div>
            )}
          </div>
        )}

        {activeTab === "PREVIEW" && previewData && (
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-surface-muted)]/55 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--mnx-surface-muted)]/30 pb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--mnx-text)] uppercase tracking-wider">
                  Salary Sheets Summary — {months[selectedMonth]} {selectedYear}
                </h3>
                <p className="text-[var(--mnx-muted)] text-xs mt-0.5">
                  Employees compiled: {previewData.salarySheets.length} | Net
                  Salary accrual: ₹
                  {previewData.totalAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <MnxAction
                disabled={isCreating}
                onClick={handleCreateBatch}
                className="bg-[var(--mnx-accent)] text-[var(--mnx-text)] hover:bg-[var(--mnx-accent-soft)] hover:shadow-ambient-hover px-4 py-2 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isCreating
                  ? "Generating batch..."
                  : "Confirm & Save Draft Batch"}
              </MnxAction>
            </div>

            <div className="overflow-x-auto">
              <MnxTable className="mnx-workspace-table">
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
                    <tr
                      key={sheet.userId}
                      className="hover:bg-[var(--mnx-surface-soft)]/10"
                    >
                      <td className="mnx-numeric font-semibold text-[var(--mnx-muted)]">
                        #{sheet.employeeNumber || "—"}
                      </td>
                      <td className="font-semibold text-[var(--mnx-text)]">
                        {sheet.name}
                      </td>
                      <td className="text-[var(--mnx-muted)] text-xs">
                        {sheet.designation || "—"}
                      </td>
                      <td className="mnx-numeric text-[var(--mnx-text)]">
                        ₹{sheet.basic.toLocaleString("en-IN")}
                      </td>
                      <td className="mnx-numeric text-[var(--mnx-text)]">
                        ₹{sheet.hra.toLocaleString("en-IN")}
                      </td>
                      <td className="mnx-numeric text-[var(--mnx-text)]">
                        ₹{sheet.allowances.toLocaleString("en-IN")}
                      </td>
                      <td className="mnx-numeric font-bold text-[var(--mnx-accent)]">
                        ₹{sheet.gross.toLocaleString("en-IN")}
                      </td>
                      <td className="mnx-numeric font-bold text-[var(--mnx-text)]">
                        ₹{sheet.inHand.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </MnxTable>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
