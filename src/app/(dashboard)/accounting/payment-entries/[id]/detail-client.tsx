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
  Landmark,
  User,
  Info
} from "lucide-react";
import { submitPaymentEntryAction, cancelPaymentEntryAction } from "@/modules/accounting/actions";
import Link from "next/link";

interface PaymentEntryDetailClientProps {
  payment: any;
}

export function PaymentEntryDetailClient({ payment }: PaymentEntryDetailClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleSubmit = async () => {
    if (!confirm("Are you sure you want to submit this payment? This will update invoice outstanding balances and post GL postings.")) return;
    setIsSubmitting(true);
    try {
      const res = await submitPaymentEntryAction(payment.id);
      if (res.ok) {
        toast.success("Payment Entry submitted and ledger posted!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this payment? This will revert outstanding balances on allocated invoices.")) return;
    setIsCancelling(true);
    try {
      const res = await cancelPaymentEntryAction(payment.id);
      if (res.ok) {
        toast.success("Payment Entry cancelled and reversed!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel payment");
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
            <Landmark className="size-4.5 text-[#00cec4]" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">Payment Transaction Details</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
            <div>
              <strong className="text-white block mb-0.5">Payment Type:</strong>
              <span className="uppercase text-white font-semibold">{payment.paymentType}</span>
            </div>
            <div>
              <strong className="text-white block mb-0.5">Party:</strong>
              <span className="text-white font-semibold">{payment.partyName} ({payment.partyType})</span>
            </div>
            <div>
              <strong className="text-white block mb-0.5">Source Account (Paid From):</strong>
              <span className="text-slate-200">{payment.paidFrom?.accountCode} - {payment.paidFrom?.accountName}</span>
            </div>
            <div>
              <strong className="text-white block mb-0.5">Destination Account (Paid To):</strong>
              <span className="text-slate-200">{payment.paidTo?.accountCode} - {payment.paidTo?.accountName}</span>
            </div>
            <div>
              <strong className="text-white block mb-0.5">Posting Date:</strong>
              {new Date(payment.postingDate).toLocaleDateString("en-IN")}
            </div>
            <div>
              <strong className="text-white block mb-0.5">Reference No / Chq:</strong>
              {payment.referenceNo || "—"}
            </div>
            <div className="col-span-2">
              <strong className="text-white block mb-0.5">Remarks / Description:</strong>
              {payment.remarks || "No description provided."}
            </div>
          </div>
        </div>

        {/* Status panel */}
        <div className="md:col-span-1 p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 flex flex-col justify-between card-left-accent">
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Status & Control</span>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase tracking-wider flex items-center gap-1 ${
                payment.status === "SUBMITTED"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : payment.status === "CANCELLED"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}>
                {payment.status}
              </span>
            </div>

            <div className="pt-2 text-xs space-y-1 text-slate-400">
              <div className="flex justify-between font-bold border-t border-[#1c212a]/30 pt-1 text-white text-sm">
                <span className="text-[#00cec4]">Payment Size:</span>
                <span className="font-mono text-[#00cec4]">₹{payment.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            {payment.status === "DRAFT" && (
              <button
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="w-full bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-4" />}
                <span>Submit Payment</span>
              </button>
            )}

            {payment.status === "SUBMITTED" && (
              <button
                disabled={isCancelling}
                onClick={handleCancel}
                className="w-full bg-red-500/10 text-red-450 hover:bg-red-500/20 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isCancelling ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-4" />}
                <span>Cancel & Reverse Payment</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ─── ALLOCATIONS TABLE ────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
          <FileText className="size-4.5 text-[#00cec4]" />
          <h3 className="font-bold text-xs text-white uppercase tracking-wider">Invoice Allocations Breakdown</h3>
        </div>

        {payment.allocations.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            This payment acts as an on-account payment and is not allocated to any specific sales or purchase invoices.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Posting Date</th>
                  <th>Grand Total</th>
                  <th className="text-right">Allocated Amount</th>
                </tr>
              </thead>
              <tbody>
                {payment.allocations.map((al: any) => {
                  const invoice = al.salesInvoice || al.purchaseInvoice;
                  const path = al.salesInvoice ? `/accounting/sales-invoices/${invoice.id}` : `/accounting/purchase-invoices/${invoice.id}`;
                  return (
                    <tr key={al.id} className="hover:bg-[#161f28]/10 text-xs">
                      <td>
                        <Link href={path} className="text-[#00cec4] hover:underline font-mono font-bold">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="text-slate-450">
                        {new Date(invoice.postingDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="ds-numeric text-slate-300">
                        ₹{invoice.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="ds-numeric text-white font-bold text-right">
                        ₹{al.allocatedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
