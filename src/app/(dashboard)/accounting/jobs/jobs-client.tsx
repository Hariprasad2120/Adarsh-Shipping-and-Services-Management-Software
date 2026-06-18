"use client";

import React, { useState } from "react";
import {
  Ship,
  Plus,
  TrendingUp,
  Percent,
  Calendar,
  DollarSign,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { createJobCostingAction, getJobCostingAction } from "@/modules/accounting/actions";

interface Job {
  id: string;
  jobCode: string;
  jobName: string;
  customerName: string;
  startDate: Date;
  expectedEndDate: Date | null;
  contractValue: number;
  actualRevenue: number;
  actualExpense: number;
  netProfit: number;
  marginPercent: number;
  status: string;
}

interface Customer {
  id: string;
  name: string;
}

interface JobsClientProps {
  jobs: Job[];
  customers: Customer[];
}

export function JobsClient({ jobs, customers }: JobsClientProps) {
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form states
  const [jobName, setJobName] = useState("");
  const [customer, setCustomer] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [costCentre, setCostCentre] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalContractVal = jobs.reduce((sum, j) => sum + j.contractValue, 0);
  const totalNetProfit = jobs.reduce((sum, j) => sum + j.netProfit, 0);
  const activeJobsCount = jobs.filter((j) => j.status === "OPEN").length;
  const avgProfitMargin = jobs.length > 0 ? (totalNetProfit / (totalContractVal || 1)) * 100 : 0;

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!customer) {
      setError("Please select a customer.");
      return;
    }
    const valNum = parseFloat(contractValue);
    if (isNaN(valNum) || valNum < 0) {
      setError("Please enter a valid contract value.");
      return;
    }

    setLoading(true);
    try {
      const res = await createJobCostingAction({
        jobName,
        customerId: customer,
        startDate,
        expectedEndDate: expectedEndDate || undefined,
        contractValue: valNum,
        costCentre,
      });

      if (res.ok) {
        setSuccess("Cargo job created and initialized successfully.");
        setJobName("");
        setCustomer("");
        setContractValue("");
        setCostCentre("");
        setTimeout(() => {
          setShowJobModal(false);
          setSuccess(null);
          // Reload window to fetch updated list
          window.location.reload();
        }, 1500);
      } else {
        setError(res.error || "Failed to create cargo job.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (job: Job) => {
    setLoadingDetails(true);
    try {
      const res = await getJobCostingAction(job.id);
      if (res.ok) {
        setSelectedJob(res.data);
      } else {
        alert(res.error || "Failed to load job details.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Premium Metrics Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-top-accent bg-[var(--color-surface)] p-6 rounded-xl relative overflow-hidden shadow-md">
          <p className="ds-label text-slate-400">Total Contract Value</p>
          <h3 className="text-3xl font-bold mt-2 ds-numeric text-white">
            ₹{totalContractVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-slate-500 text-[10px] mt-4 uppercase tracking-wider">
            Total active contract pipeline
          </p>
        </div>

        <div className="card-top-accent bg-[var(--color-surface)] p-6 rounded-xl relative overflow-hidden shadow-md">
          <p className="ds-label text-slate-400">Total Actual Profit</p>
          <h3 className="text-3xl font-bold mt-2 ds-numeric text-white">
            ₹{totalNetProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-slate-500 text-[10px] mt-4 uppercase tracking-wider">
            Net difference (revenue - expense)
          </p>
        </div>

        <div className="card-top-accent bg-[var(--color-surface)] p-6 rounded-xl relative overflow-hidden shadow-md">
          <p className="ds-label text-slate-400">Avg Profit Margin</p>
          <h3 className="text-3xl font-bold mt-2 ds-numeric text-[#00cec4]">
            {avgProfitMargin.toFixed(1)}%
          </h3>
          <p className="text-slate-500 text-[10px] mt-4 uppercase tracking-wider">
            Calculated across all cargos
          </p>
        </div>

        <div className="card-top-accent bg-[var(--color-surface)] p-6 rounded-xl relative overflow-hidden shadow-md">
          <p className="ds-label text-slate-400">Active Cargo Jobs</p>
          <h3 className="text-3xl font-bold mt-2 ds-numeric text-white">
            {activeJobsCount}
          </h3>
          <p className="text-slate-500 text-[10px] mt-4 uppercase tracking-wider">
            Cargos currently in transit
          </p>
        </div>
      </div>

      {/* ─── Header Action Ribbon ────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-[var(--color-surface-container)] px-6 py-4 rounded-xl shadow-sm border border-outline-variant/10">
        <h4 className="ds-h3 text-white">Cargo Jobs Costing Register</h4>
        <button
          onClick={() => setShowJobModal(true)}
          className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all flex items-center gap-2"
        >
          <Plus size={14} /> New Costing Job
        </button>
      </div>

      {/* ─── Jobs Register Board ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => {
          // If profit is negative, apply orange card indicator
          const isProfitable = job.netProfit >= 0;
          const cardClass = isProfitable ? "card-left-accent" : "card-left-accent-orange";

          return (
            <div
              key={job.id}
              onClick={() => handleViewDetails(job)}
              className={`${cardClass} bg-[var(--color-surface)] p-5 rounded-xl border border-outline-variant/10 shadow-sm hover-cyan cursor-pointer transition-all space-y-4`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white uppercase tracking-wider text-sm">
                    {job.jobName}
                  </h4>
                  <p className="ds-label text-[10px] text-slate-400 mt-1">
                    {job.jobCode} • {job.customerName}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                    job.status === "OPEN"
                      ? "bg-sky-950/50 text-sky-400 border border-sky-500/20"
                      : "bg-slate-900/60 text-slate-400 border border-slate-700/30"
                  }`}
                >
                  {job.status}
                </span>
              </div>

              {/* Progress margins info */}
              <div className="grid grid-cols-3 gap-2 text-center py-2 bg-[var(--color-background)] rounded-lg border border-outline-variant/5">
                <div>
                  <span className="ds-label text-[8px] text-slate-400 block">Contract</span>
                  <span className="ds-numeric text-xs font-semibold text-white">
                    ₹{job.contractValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div>
                  <span className="ds-label text-[8px] text-slate-400 block">Expense</span>
                  <span className="ds-numeric text-xs font-semibold text-rose-400">
                    ₹{job.actualExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div>
                  <span className="ds-label text-[8px] text-slate-400 block">Margin</span>
                  <span
                    className={`ds-numeric text-xs font-bold ${
                      isProfitable ? "text-emerald-400" : "text-orange-400"
                    }`}
                  >
                    {job.marginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-outline-variant/5">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {new Date(job.startDate).toLocaleDateString("en-IN")}
                </span>
                <span
                  className={`font-semibold ${isProfitable ? "text-emerald-400" : "text-orange-400"}`}
                >
                  ₹{job.netProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })} net
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Costing Detail Side Panel (Modal) ─────────────────────────────────── */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-50">
          <div className="bg-[var(--color-surface)] border-l border-outline-variant/10 w-full max-w-[650px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="px-6 py-4 bg-[var(--color-surface-container)] border-b border-outline-variant/10 flex justify-between items-center">
              <div>
                <h3 className="ds-h2 text-white">{selectedJob.jobName} Details</h3>
                <p className="ds-label text-[10px] text-slate-400 mt-1">
                  Code: {selectedJob.jobCode} • Customer: {selectedJob.customer?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-4 bg-[var(--color-background)] p-4 rounded-xl border border-outline-variant/10">
                <div>
                  <span className="ds-label text-slate-400 text-[10px] block">Contract Value</span>
                  <span className="ds-numeric text-lg font-bold text-white">
                    ₹{Number(selectedJob.contractValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="ds-label text-slate-400 text-[10px] block">Total Invoiced</span>
                  <span className="ds-numeric text-lg font-bold text-emerald-400">
                    ₹{selectedJob.salesInvoices.reduce((sum: number, i: any) => sum + Number(i.grandTotal), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="ds-label text-slate-400 text-[10px] block">Total Purchase Cost</span>
                  <span className="ds-numeric text-lg font-bold text-rose-400">
                    ₹{selectedJob.purchaseInvoices.reduce((sum: number, i: any) => sum + Number(i.grandTotal), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Transactions Ledger list */}
              <div className="space-y-3">
                <h4 className="ds-h3 text-white">Linked General Ledger Postings</h4>
                <div className="border border-outline-variant/10 rounded-xl overflow-hidden bg-[var(--color-surface-container-low)]">
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Account</th>
                        <th className="text-right">Debit (Dr)</th>
                        <th className="text-right">Credit (Cr)</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedJob.glEntries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-slate-500 py-8 text-xs uppercase">
                            No ledger transactions linked to this cargo
                          </td>
                        </tr>
                      ) : (
                        selectedJob.glEntries.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-800/10">
                            <td className="ds-numeric text-[11px]">
                              {new Date(t.postingDate).toLocaleDateString("en-IN")}
                            </td>
                            <td>
                              <div className="font-semibold text-xs text-white uppercase">
                                {t.account.accountName}
                              </div>
                              <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                                {t.account.accountCode}
                              </span>
                            </td>
                            <td className="text-right ds-numeric text-emerald-400 text-xs">
                              {Number(t.debit) > 0
                                ? `₹${Number(t.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                : "—"}
                            </td>
                            <td className="text-right ds-numeric text-rose-400 text-xs">
                              {Number(t.credit) > 0
                                ? `₹${Number(t.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                : "—"}
                            </td>
                            <td className="text-slate-400 text-xs">{t.remarks || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Initialize Cargo Job Modal ────────────────────────────────────────── */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-outline-variant/10 rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[var(--color-surface-container)] border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="ds-h3 text-white">Initialize New Cargo Job</h3>
              <button
                onClick={() => setShowJobModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-xl">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs rounded-xl">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <label className="ds-label block">Cargo Job Name</label>
                <input
                  type="text"
                  required
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="E.g., Mumbai to Hamburg - Steel Freight"
                  className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="ds-label block">Customer</label>
                <select
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  required
                  className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs uppercase"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="ds-label block">Contract Value (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs ds-numeric"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="ds-label block">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs ds-numeric"
                  />
                </div>
                <div className="space-y-2">
                  <label className="ds-label block">Expected End Date</label>
                  <input
                    type="date"
                    value={expectedEndDate}
                    onChange={(e) => setExpectedEndDate(e.target.value)}
                    className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs ds-numeric"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ds-label block">Cost Centre Code / Reference</label>
                <input
                  type="text"
                  value={costCentre}
                  onChange={(e) => setCostCentre(e.target.value)}
                  placeholder="E.g., CC-MUM-01"
                  className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-xs uppercase tracking-wide transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all disabled:opacity-50"
                >
                  {loading ? "Initializing..." : "Initialize Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
