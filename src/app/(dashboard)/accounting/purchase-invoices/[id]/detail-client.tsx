"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  FileText,
  Calendar,
  DollarSign,
  Loader2,
  CheckCircle,
  XCircle,
  Receipt,
  User,
  Database,
  ArrowRight
} from "lucide-react";
import { submitPurchaseInvoiceAction, cancelPurchaseInvoiceAction } from "@/modules/accounting/actions";
import Link from "next/link";

interface PurchaseInvoiceDetailClientProps {
  invoice: any;
}

export function PurchaseInvoiceDetailClient({ invoice }: PurchaseInvoiceDetailClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleSubmit = async () => {
    if (!confirm("Are you sure you want to submit this purchase invoice? This will post ledger lines and record Accounts Payable.")) return;
    setIsSubmitting(true);
    try {
      const res = await submitPurchaseInvoiceAction(invoice.id);
      if (res.ok) {
        toast.success("Purchase Invoice submitted and posted successfully!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit purchase invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (invoice.payments && invoice.payments.length > 0) {
      toast.error("Cannot cancel invoice with active payment allocations. Revert payment entries first.");
      return;
    }
    if (!confirm("Are you sure you want to cancel this purchase invoice? This will post reversal ledger entries.")) return;
    setIsCancelling(true);
    try {
      const res = await cancelPurchaseInvoiceAction(invoice.id);
      if (res.ok) {
        toast.success("Purchase Invoice cancelled and reversed!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel purchase invoice");
    } finally {
      setIsCancelling(false);
    }
  };

  // Calculations
  const subtotal = invoice.items.reduce((sum: number, item: any) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* ─── SUMMARY CARD ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Info panel */}
        <div className="md:col-span-2 p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
            <User className="size-4.5 text-[#00cec4]" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">Supplier & Invoice Profile</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
            <div>
              <strong className="text-white block mb-0.5">Supplier / Vendor:</strong>
              {invoice.supplier?.name || "—"}
            </div>
            <div>
              <strong className="text-white block mb-0.5">Supplier Address:</strong>
              <span className="whitespace-pre-line leading-relaxed">{invoice.supplier?.address || "No address provided"}</span>
            </div>
            <div>
              <strong className="text-white block mb-0.5">Posting Date:</strong>
              {new Date(invoice.postingDate).toLocaleDateString("en-IN")}
            </div>
            <div>
              <strong className="text-white block mb-0.5">Due Date:</strong>
              {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
            </div>
            <div className="col-span-2">
              <strong className="text-white block mb-0.5">Remarks / Description:</strong>
              {invoice.remarks || "No description provided."}
            </div>
          </div>
        </div>

        {/* Status panel */}
        <div className="md:col-span-1 p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 flex flex-col justify-between card-left-accent">
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Status & Control</span>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase tracking-wider flex items-center gap-1 ${
                invoice.status === "PAID"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : invoice.status === "CANCELLED"
                  ? "bg-red-500/10 text-red-400"
                  : invoice.status === "PARTLY_PAID"
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}>
                {invoice.status}
              </span>
            </div>

            <div className="pt-2 text-xs space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Grand Total:</span>
                <span className="font-mono text-white">₹{invoice.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Paid:</span>
                <span className="font-mono text-white">₹{invoice.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-[#1c212a]/30 pt-1 text-white">
                <span className="text-[#00cec4]">Outstanding:</span>
                <span className="font-mono text-[#00cec4]">₹{invoice.outstandingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            {invoice.status === "DRAFT" && (
              <button
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="w-full bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-4" />}
                <span>Submit & Post Bill</span>
              </button>
            )}

            {(invoice.status === "UNPAID" || invoice.status === "PARTLY_PAID") && (
              <button
                disabled={isCancelling}
                onClick={handleCancel}
                className="w-full bg-red-500/10 text-red-450 hover:bg-red-500/20 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isCancelling ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-4" />}
                <span>Cancel & Reverse Bill</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ─── ITEMS LIST TABLE ───────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
          <Receipt className="size-4.5 text-[#00cec4]" />
          <h3 className="font-bold text-xs text-white uppercase tracking-wider">Line Items breakdown</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Rate (₹)</th>
                <th className="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item: any) => (
                <tr key={item.id} className="hover:bg-[#161f28]/10 text-xs">
                  <td className="font-semibold text-white">{item.itemName}</td>
                  <td className="ds-numeric text-right">{item.qty}</td>
                  <td className="ds-numeric text-slate-300 text-right">₹{item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="ds-numeric text-white text-right font-semibold">₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FINANCIAL SUMMARY TOTALS */}
        <div className="flex justify-end pt-2">
          <div className="w-64 space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono text-white">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-orange-400">
                <span>Discount:</span>
                <span className="font-mono">-₹{invoice.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-[#1c212a]/30 pb-1.5">
              <span>Tax (GST {invoice.taxLines[0]?.taxRate || 18}%):</span>
              <span className="font-mono text-white">₹{invoice.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-[#00cec4] pt-1">
              <span>Grand Total:</span>
              <span className="font-mono">₹{invoice.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── LINKED PAYMENTS ───────────────────────────────────────────── */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
            <DollarSign className="size-4.5 text-[#00cec4]" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">Applied Payment Clearances</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Payment Voucher Ref</th>
                  <th>Posting Date</th>
                  <th>Allocated Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[#161f28]/10 text-xs">
                    <td>
                      <Link
                        href={`/accounting/payment-entries/${p.paymentEntry.id}`}
                        className="text-[#00cec4] hover:underline font-mono font-bold"
                      >
                        {p.paymentEntry.referenceNo || `PAY-${p.paymentEntry.id.slice(-6).toUpperCase()}`}
                      </Link>
                    </td>
                    <td className="text-slate-400">
                      {new Date(p.paymentEntry.postingDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="ds-numeric text-white font-bold">
                      ₹{p.allocatedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── POSTED GENERAL LEDGER ENTRIES ─────────────────────────────── */}
      {invoice.glEntries && invoice.glEntries.length > 0 && (
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
            <Database className="size-4.5 text-[#00cec4]" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">General Ledger Postings</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Account Code/Name</th>
                  <th>Debit (₹)</th>
                  <th>Credit (₹)</th>
                  <th>Remarks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoice.glEntries.map((gl: any) => (
                  <tr key={gl.id} className="hover:bg-[#161f28]/10 text-xs">
                    <td>
                      <span className="font-semibold text-white block">{gl.account.accountName}</span>
                      <span className="text-[10px] font-mono text-slate-400 block tracking-wider mt-0.5">{gl.account.accountCode}</span>
                    </td>
                    <td className="ds-numeric text-white text-right font-semibold">
                      {gl.debit > 0 ? `₹${gl.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="ds-numeric text-white text-right font-semibold">
                      {gl.credit > 0 ? `₹${gl.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="text-slate-400 text-xs">{gl.remarks || "—"}</td>
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
