"use client";

import React, { useState } from "react";
import { ArrowLeftRight, Coins, Building, Activity, Plus } from "lucide-react";
import { recordBankTransferAction } from "@/modules/accounting/actions";

interface BankAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
}

interface BankTransaction {
  id: string;
  postingDate: Date;
  accountName: string;
  accountCode: string;
  voucherType: string;
  voucherId: string;
  debit: number;
  credit: number;
  remarks: string | null;
}

interface LeafAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
}

interface BankingClientProps {
  bankAccounts: BankAccount[];
  transactions: BankTransaction[];
  leafAccounts: LeafAccount[];
}

export function BankingClient({ bankAccounts, transactions, leafAccounts }: BankingClientProps) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter bank/cash accounts for from/to dropdowns
  const bankCashLeafAccounts = leafAccounts.filter(
    (acc) => acc.accountType === "BANK" || acc.accountType === "CASH"
  );

  const totalLiquidity = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fromAccount || !toAccount) {
      setError("Please select both source and destination accounts.");
      return;
    }
    if (fromAccount === toAccount) {
      setError("Source and destination accounts must be different.");
      return;
    }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError("Please enter a valid transfer amount.");
      return;
    }

    setLoading(true);
    try {
      const res = await recordBankTransferAction({
        fromAccountId: fromAccount,
        toAccountId: toAccount,
        amount: amtNum,
        postingDate,
        remarks,
      });

      if (res.ok) {
        setSuccess("Bank transfer recorded successfully.");
        setAmount("");
        setRemarks("");
        // close modal after a brief timeout
        setTimeout(() => {
          setShowTransferModal(false);
          setSuccess(null);
        }, 1500);
      } else {
        setError(res.error || "Failed to record bank transfer.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Premium Liquidity Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-top-accent bg-[var(--color-surface)] p-6 rounded-xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="ds-label text-slate-400">Total Liquid Cash</p>
              <h3 className="text-3xl font-bold mt-2 ds-numeric text-white">
                ₹{totalLiquidity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <span className="ds-icon-badge">
              <Coins size={18} />
            </span>
          </div>
          <p className="text-slate-500 text-[10px] mt-4 uppercase tracking-wider">
            Combined cash and bank balances
          </p>
        </div>

        <div className="card-top-accent bg-[var(--color-surface)] p-6 rounded-xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="ds-label text-slate-400">Bank Accounts</p>
              <h3 className="text-3xl font-bold mt-2 ds-numeric text-white">
                {bankAccounts.filter((a) => a.accountType === "BANK").length}
              </h3>
            </div>
            <span className="ds-icon-badge">
              <Building size={18} />
            </span>
          </div>
          <p className="text-slate-500 text-[10px] mt-4 uppercase tracking-wider">
            Active financial institutions
          </p>
        </div>

        <div className="card-top-accent bg-[var(--color-surface)] p-6 rounded-xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="ds-label text-slate-400">Cash Ledgers</p>
              <h3 className="text-3xl font-bold mt-2 ds-numeric text-white">
                {bankAccounts.filter((a) => a.accountType === "CASH").length}
              </h3>
            </div>
            <span className="ds-icon-badge">
              <Activity size={18} />
            </span>
          </div>
          <p className="text-slate-500 text-[10px] mt-4 uppercase tracking-wider">
            Handled physical cash drawers
          </p>
        </div>
      </div>

      {/* ─── Action Ribbon ────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-[var(--color-surface-container)] px-6 py-4 rounded-xl shadow-sm border border-outline-variant/10">
        <h4 className="ds-h3 text-white">Accounts &amp; Ledger Summary</h4>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTransferModal(true)}
            className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all flex items-center gap-2"
          >
            <ArrowLeftRight size={14} /> Record Transfer
          </button>
        </div>
      </div>

      {/* ─── Main Content Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Accounts List */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="ds-h2 text-white">Account Balances</h3>
          <div className="space-y-3">
            {bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className="card-left-accent bg-[var(--color-surface)] p-4 rounded-xl shadow-sm border border-outline-variant/10 hover-cyan transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-semibold text-sm text-white uppercase tracking-wider">
                      {acc.accountName}
                    </h5>
                    <p className="ds-label text-[10px] text-slate-400 mt-1">
                      {acc.accountCode} • {acc.accountType}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ds-numeric ${
                      acc.balance >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    ₹{acc.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Recent Transactions */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="ds-h2 text-white">Recent Bank Transactions</h3>
          <div className="bg-[var(--color-surface)] rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Account</th>
                    <th>Voucher</th>
                    <th className="text-right">Debit (Dr)</th>
                    <th className="text-right">Credit (Cr)</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-500 py-8 text-xs uppercase">
                        No transactions recorded
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/10">
                        <td className="ds-numeric text-xs">
                          {new Date(t.postingDate).toLocaleDateString("en-IN")}
                        </td>
                        <td>
                          <div className="font-semibold text-xs text-white uppercase">
                            {t.accountName}
                          </div>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                            {t.accountCode}
                          </span>
                        </td>
                        <td className="ds-label text-[10px]">{t.voucherType}</td>
                        <td className="text-right ds-numeric text-emerald-400 text-xs">
                          {t.debit > 0
                            ? `₹${t.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="text-right ds-numeric text-rose-400 text-xs">
                          {t.credit > 0
                            ? `₹${t.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
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

      {/* ─── Fund Transfer Modal ──────────────────────────────────────────────── */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-outline-variant/10 rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[var(--color-surface-container)] border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="ds-h3 text-white">Record Fund Transfer</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
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
                <label className="ds-label block">From (Source Account)</label>
                <select
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  required
                  className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs uppercase"
                >
                  <option value="">Select Account</option>
                  {bankCashLeafAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.accountCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="ds-label block">To (Destination Account)</label>
                <select
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  required
                  className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs uppercase"
                >
                  <option value="">Select Account</option>
                  {bankCashLeafAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.accountCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="ds-label block">Amount (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs ds-numeric"
                  />
                </div>
                <div className="space-y-2">
                  <label className="ds-label block">Posting Date</label>
                  <input
                    type="date"
                    value={postingDate}
                    onChange={(e) => setPostingDate(e.target.value)}
                    required
                    className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs ds-numeric"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ds-label block">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="E.g., Interbank transfer"
                  className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-xs uppercase tracking-wide transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all disabled:opacity-50"
                >
                  {loading ? "Recording..." : "Record Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
