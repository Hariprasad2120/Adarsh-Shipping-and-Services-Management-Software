"use client";

import React, { useState, useEffect, useRef } from "react";
import NextLink from "next/link";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Receipt,
  ArrowRight,
  FileText,
  Clock,
  Settings,
  Lock,
  Unlock,
  Ship,
  FileSpreadsheet,
} from "lucide-react";
import { updateTransactionLockAction } from "@/modules/accounting/actions";

interface DashboardClientProps {
  pl: any;
  bs: any;
  recentVouchers: any[];
  recentInvoices: any[];
  recentPayments: any[];
  cashLiquidity: number;
  initialPeriodLock: {
    lockDate: Date;
    lockType: string;
    lockedBy: string;
  } | null;
}

export function DashboardClient({
  pl,
  bs,
  recentVouchers,
  recentInvoices,
  recentPayments,
  cashLiquidity,
  initialPeriodLock,
}: DashboardClientProps) {
  const [periodLock, setPeriodLock] = useState<any | null>(initialPeriodLock);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockDate, setLockDate] = useState(
    initialPeriodLock
      ? new Date(initialPeriodLock.lockDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [lockPassword, setLockPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profitCanvasRef = useRef<HTMLCanvasElement>(null);

  const totalAssets = bs.totalAssets;
  const totalLiabilities = bs.liabilities.total;
  const netProfit = pl.netProfit;

  // Render 3D-styled cash liquidity gauge
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const x = canvas.width / 2;
      const y = canvas.height / 2;
      const radius = 55;

      // Draw background track
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(0, 206, 196, 0.08)";
      ctx.stroke();

      // Draw value arc
      const pct = totalAssets > 0 ? Math.min(1, Math.max(0, cashLiquidity / totalAssets)) : 0;
      const endAngle = pct * 2 * Math.PI - Math.PI / 2;

      ctx.shadowBlur = 12;
      ctx.shadowColor = "#00cec4";

      ctx.beginPath();
      ctx.arc(x, y, radius, -Math.PI / 2, endAngle);
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#00cec4";
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw center percentage text dynamically
      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#f0f6fc" : "#191c1e";
      ctx.font = "bold 14px var(--font-sans)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${(pct * 100).toFixed(0)}%`, x, y);
    };

    draw();

    // Observe dark/light mode toggle
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, [cashLiquidity, totalAssets]);

  // Render 3D-styled net profit gauge
  useEffect(() => {
    const canvas = profitCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const x = canvas.width / 2;
      const y = canvas.height / 2;
      const radius = 55;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(251, 146, 60, 0.08)";
      ctx.stroke();

      // Calculate profit margin on total assets
      const pct = totalAssets > 0 ? Math.min(1, Math.max(0, netProfit / totalAssets)) : 0;
      const endAngle = pct * 2 * Math.PI - Math.PI / 2;

      ctx.shadowBlur = 12;
      ctx.shadowColor = "#fb923c";

      ctx.beginPath();
      ctx.arc(x, y, radius, -Math.PI / 2, endAngle);
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#fb923c";
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Draw center percentage text dynamically
      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#f0f6fc" : "#191c1e";
      ctx.font = "bold 14px var(--font-sans)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${(pct * 100).toFixed(1)}%`, x, y);
    };

    draw();

    // Observe dark/light mode toggle
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, [netProfit, totalAssets]);

  const handleUpdateLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await updateTransactionLockAction({
        lockDate,
        password: lockPassword || undefined,
        lockType: "FULL",
        lockedBy: "Administrator",
      });

      if (res.ok) {
        setPeriodLock(res.data);
        setShowLockModal(false);
        setLockPassword("");
      } else {
        setError(res.error || "Failed to update period lock.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ─── Header Console ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-[var(--color-on-surface)]">Finance &amp; Accounting</h2>

          <p className="text-slate-400 text-xs mt-1">
            Real-time double-entry general ledger dashboard, cash liquidity tracking, and financial statements.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLockModal(true)}
            className={`border border-outline-variant/20 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              periodLock
                ? "bg-orange-950/20 text-[#fb923c] border-orange-500/20"
                : "bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            {periodLock ? <Lock size={13} /> : <Unlock size={13} />}
            <span>{periodLock ? "Period Locked" : "Lock Period"}</span>
          </button>
          <NextLink
            href="/accounting/settings"
            className="flex items-center gap-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <Settings className="size-3.5 text-[#00cec4]" />
            <span>Settings</span>
          </NextLink>
        </div>
      </div>

      {/* ─── Navigation Shortcuts Hub ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <NextLink
          href="/accounting/banking"
          className="bg-[var(--color-surface)] border border-outline-variant/10 p-4 rounded-xl flex items-center gap-3 hover-cyan hover:scale-[1.02] transition-all"
        >
          <span className="ds-icon-badge">
            <Wallet size={16} />
          </span>
          <span className="text-xs uppercase font-bold text-[var(--color-on-surface)] tracking-wider">Banking &amp; Cash</span>
        </NextLink>

        <NextLink
          href="/accounting/quotations"
          className="bg-[var(--color-surface)] border border-outline-variant/10 p-4 rounded-xl flex items-center gap-3 hover-cyan hover:scale-[1.02] transition-all"
        >
          <span className="ds-icon-badge">
            <FileText size={16} />
          </span>
          <span className="text-xs uppercase font-bold text-[var(--color-on-surface)] tracking-wider">Quotations &amp; Notes</span>
        </NextLink>

        <NextLink
          href="/accounting/jobs"
          className="bg-[var(--color-surface)] border border-outline-variant/10 p-4 rounded-xl flex items-center gap-3 hover-cyan hover:scale-[1.02] transition-all"
        >
          <span className="ds-icon-badge">
            <Ship size={16} />
          </span>
          <span className="text-xs uppercase font-bold text-[var(--color-on-surface)] tracking-wider">Cargo Job Costing</span>
        </NextLink>

        <NextLink
          href="/accounting/reports"
          className="bg-[var(--color-surface)] border border-outline-variant/10 p-4 rounded-xl flex items-center gap-3 hover-cyan hover:scale-[1.02] transition-all"
        >
          <span className="ds-icon-badge">
            <FileSpreadsheet size={16} />
          </span>
          <span className="text-xs uppercase font-bold text-[var(--color-on-surface)] tracking-wider">Reports Center</span>
        </NextLink>

        <NextLink
          href="/accounting/accounts"
          className="bg-[var(--color-surface)] border border-outline-variant/10 p-4 rounded-xl flex items-center gap-3 hover-cyan hover:scale-[1.02] transition-all col-span-2 md:col-span-1"
        >
          <span className="ds-icon-badge">
            <Scale size={16} />
          </span>
          <span className="text-xs uppercase font-bold text-[var(--color-on-surface)] tracking-wider">Chart of Accounts</span>
        </NextLink>
      </div>

      {/* ─── Financial Gauges and Highlights ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-left-accent bg-[var(--color-surface)] p-6 rounded-xl border border-outline-variant/10 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="ds-label text-slate-400">Liquid Cash Ratio</span>
            <h4 className="text-sm font-bold text-[var(--color-on-surface)] uppercase tracking-wider">Liquid-to-Asset</h4>
            <p className="ds-numeric text-lg font-semibold text-[#00cec4] mt-1">
              ₹{cashLiquidity.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-slate-500">Live bank/cash index</p>
          </div>
          <canvas ref={canvasRef} width={130} height={130} className="w-[130px] h-[130px]" />
        </div>

        <div className="card-left-accent bg-[var(--color-surface)] p-6 rounded-xl border border-outline-variant/10 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="ds-label text-slate-400">Profitability Ratio</span>
            <h4 className="text-sm font-bold text-[var(--color-on-surface)] uppercase tracking-wider">Asset Margin (YTD)</h4>
            <p className="ds-numeric text-lg font-semibold text-[#fb923c] mt-1">
              ₹{netProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-slate-500">Operating margins</p>
          </div>
          <canvas ref={profitCanvasRef} width={130} height={130} className="w-[130px] h-[130px]" />
        </div>

        <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-between ${
          periodLock
            ? "card-left-accent-orange bg-orange-950/10 border-orange-500/20"
            : "card-left-accent bg-[var(--color-surface)] border-outline-variant/10"
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="ds-label text-slate-400">Transaction Posting Lock</span>
              <h4 className={`text-sm font-bold uppercase mt-1 ${periodLock ? "text-[#fb923c]" : "text-[var(--color-on-surface)]"}`}>
                {periodLock ? "Full Lock Active" : "No Locks Configured"}
              </h4>
            </div>
            <span className="ds-icon-badge" style={periodLock ? { background: 'rgba(251,146,60,0.10)', color: '#fb923c' } : undefined}>
              <Lock size={16} />
            </span>
          </div>

          <div className="mt-4">
            {periodLock ? (
              <p className="text-xs text-slate-300">
                All records posted on or before <strong className="ds-numeric">{new Date(periodLock.lockDate).toLocaleDateString("en-IN")}</strong> are locked against edit/deletion.
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Ensure historical accounting books are safe. Create a period lock to secure finalized postings.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Core Ledger Metrics ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-5 flex flex-col justify-between shadow-sm card-top-accent">
          <span className="ds-label text-slate-400">Total Assets</span>
          <h3 className="mt-2 text-2xl font-bold ds-numeric text-[var(--color-on-surface)]">
            ₹{totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-5 flex flex-col justify-between shadow-sm card-top-accent-orange">
          <span className="ds-label text-slate-400">Total Liabilities</span>
          <h3 className="mt-2 text-2xl font-bold ds-numeric text-[#fb923c]">
            ₹{totalLiabilities.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-5 flex flex-col justify-between shadow-sm card-top-accent">
          <span className="ds-label text-slate-400">Net Profit Statement</span>
          <h3 className={`mt-2 text-2xl font-bold ds-numeric ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ₹{netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* ─── Detail Lists Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Invoices */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-[#00cec4]" />
              <h3 className="font-bold text-xs text-[var(--color-on-surface)] uppercase tracking-wider">Recent Invoices</h3>
            </div>
            <NextLink href="/accounting/sales-invoices" className="text-[11px] text-[#00cec4] hover:underline flex items-center gap-1 uppercase tracking-wider font-semibold">
              View All <ArrowRight className="size-3" />
            </NextLink>
          </div>

          <div className="space-y-3">
            {recentInvoices.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No invoices created.</p>
            ) : (
              recentInvoices.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center text-xs p-2.5 bg-[#161f28]/35 rounded-lg border border-[#1c212a]/20">
                  <div>
                    <NextLink href={`/accounting/sales-invoices/${inv.id}`} className="font-mono text-[var(--color-on-surface)] font-bold hover:underline">
                      {inv.invoiceNumber}
                    </NextLink>
                    <span className="text-[10px] text-slate-400 block mt-0.5 uppercase truncate max-w-[150px]">{inv.customerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[var(--color-on-surface)] font-bold block ds-numeric">₹{inv.grandTotal.toLocaleString("en-IN")}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider block mt-1 inline-block ${
                      inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Entries */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-[#00cec4]" />
              <h3 className="font-bold text-xs text-[var(--color-on-surface)] uppercase tracking-wider">Recent Payments</h3>
            </div>
            <NextLink href="/accounting/payment-entries" className="text-[11px] text-[#00cec4] hover:underline flex items-center gap-1 uppercase tracking-wider font-semibold">
              View All <ArrowRight className="size-3" />
            </NextLink>
          </div>

          <div className="space-y-3">
            {recentPayments.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No payments recorded.</p>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="flex justify-between items-center text-xs p-2.5 bg-[#161f28]/35 rounded-lg border border-[#1c212a]/20">
                  <div>
                    <NextLink href={`/accounting/payment-entries/${p.id}`} className="font-mono text-[var(--color-on-surface)] font-bold hover:underline">
                      {p.referenceNo}
                    </NextLink>
                    <span className="text-[10px] text-slate-400 block mt-0.5 uppercase">{p.paymentType} - {p.partyType}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[var(--color-on-surface)] font-bold block ds-numeric">₹{p.amount.toLocaleString("en-IN")}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(p.postingDate).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Journal Vouchers */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[#00cec4]" />
              <h3 className="font-bold text-xs text-[var(--color-on-surface)] uppercase tracking-wider">Recent Vouchers</h3>
            </div>
            <NextLink href="/accounting/journal-entries" className="text-[11px] text-[#00cec4] hover:underline flex items-center gap-1 uppercase tracking-wider font-semibold">
              View All <ArrowRight className="size-3" />
            </NextLink>
          </div>

          <div className="space-y-3">
            {recentVouchers.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No journal vouchers created.</p>
            ) : (
              recentVouchers.map((jv) => (
                <div key={jv.id} className="flex justify-between items-center text-xs p-2.5 bg-[#161f28]/35 rounded-lg border border-[#1c212a]/20">
                  <div>
                    <NextLink href={`/accounting/journal-entries/${jv.id}`} className="font-mono text-[var(--color-on-surface)] font-bold hover:underline">
                      {jv.voucherNo}
                    </NextLink>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[150px]">{jv.remarks}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[var(--color-on-surface)] font-bold block ds-numeric">₹{jv.totalDebit.toLocaleString("en-IN")}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider block mt-1 inline-block ${
                      jv.status === "SUBMITTED" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {jv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Lock Period Modal ───────────────────────────────────────────────── */}
      {showLockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-outline-variant/10 rounded-2xl w-full max-w-[450px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[var(--color-surface-container)] border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="ds-h3 text-white">Configure Period Lock</h3>
              <button
                onClick={() => setShowLockModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateLock} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="ds-label block">Lock Postings On Or Before</label>
                <input
                  type="date"
                  value={lockDate}
                  onChange={(e) => setLockDate(e.target.value)}
                  required
                  className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs ds-numeric"
                />
              </div>

              <div className="space-y-2">
                <label className="ds-label block">Authorized Password (Optional)</label>
                <input
                  type="password"
                  value={lockPassword}
                  onChange={(e) => setLockPassword(e.target.value)}
                  placeholder="Leave empty for none"
                  className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs"
                />
                <p className="text-[10px] text-slate-500">
                  Required when administrators or audit managers edit historically locked records.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setShowLockModal(false)}
                  className="px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-xs uppercase tracking-wide transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all disabled:opacity-50"
                >
                  {loading ? "Saving Lock..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
