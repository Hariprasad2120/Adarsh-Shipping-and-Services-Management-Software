"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Landmark, FileText, Calendar, Wallet, Loader2 } from "lucide-react";
import { createPaymentEntryAction } from "@/modules/accounting/actions";

interface NewPaymentClientProps {
  bankAccounts: any[];
  otherAccounts: any[];
  customers: any[];
  suppliers: any[];
  branches: any[];
  salesInvoices: any[];
  purchaseInvoices: any[];
}

export function NewPaymentClient({
  bankAccounts,
  otherAccounts,
  customers,
  suppliers,
  branches,
  salesInvoices,
  purchaseInvoices,
}: NewPaymentClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [paymentType, setPaymentType] = useState<"RECEIVE" | "PAY">("RECEIVE");
  const [partyType, setPartyType] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [partyId, setPartyId] = useState("");
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState(0);
  const [paidFromAccountId, setPaidFromAccountId] = useState("");
  const [paidToAccountId, setPaidToAccountId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [branchId, setBranchId] = useState("");
  const [submitImmediately, setSubmitImmediately] = useState(false);

  // Allocation states
  const [filteredInvoices, setFilteredInvoices] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Auto-switch party types and accounts when payment type changes
  useEffect(() => {
    if (paymentType === "RECEIVE") {
      setPartyType("CUSTOMER");
      // Destination (Paid To) should be cash/bank
      if (bankAccounts.length > 0) setPaidToAccountId(bankAccounts[0].id);
      // Source (Paid From) should be Accounts Receivable
      const ar = otherAccounts.find((a) => a.accountType === "RECEIVABLE");
      if (ar) setPaidFromAccountId(ar.id);
    } else {
      setPartyType("SUPPLIER");
      // Source (Paid From) should be cash/bank
      if (bankAccounts.length > 0) setPaidFromAccountId(bankAccounts[0].id);
      // Destination (Paid To) should be Accounts Payable
      const ap = otherAccounts.find((a) => a.accountType === "PAYABLE");
      if (ap) setPaidToAccountId(ap.id);
    }
    setPartyId("");
  }, [paymentType]);

  // Fetch invoices for selected party
  useEffect(() => {
    if (!partyId) {
      setFilteredInvoices([]);
      setAllocations({});
      return;
    }

    if (partyType === "CUSTOMER") {
      const filtered = salesInvoices.filter((inv) => inv.customerId === partyId);
      setFilteredInvoices(filtered);
    } else {
      const filtered = purchaseInvoices.filter((inv) => inv.supplierId === partyId);
      setFilteredInvoices(filtered);
    }
    setAllocations({});
  }, [partyId, partyType]);

  const handleAllocationChange = (invoiceId: string, value: string) => {
    const val = parseFloat(value) || 0;
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: val,
    }));
  };

  const handleAutoAllocate = () => {
    let remaining = amount;
    const newAllocations: Record<string, number> = {};

    for (const inv of filteredInvoices) {
      if (remaining <= 0) break;
      const allocate = Math.min(remaining, inv.outstandingAmount);
      newAllocations[inv.id] = parseFloat(allocate.toFixed(2));
      remaining -= allocate;
    }

    setAllocations(newAllocations);
    toast.success("Amount allocated automatically to oldest outstanding bills!");
  };

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + v, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyId) {
      toast.error("Please select a customer or supplier");
      return;
    }

    if (!paidFromAccountId || !paidToAccountId) {
      toast.error("Please select paid from/to accounts");
      return;
    }

    if (amount <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }

    if (totalAllocated > amount + 0.05) {
      toast.error(`Total allocated amount (₹${totalAllocated.toFixed(2)}) cannot exceed payment amount (₹${amount.toFixed(2)})`);
      return;
    }

    // Map allocations array
    const allocArray = Object.entries(allocations)
      .filter(([_, val]) => val > 0)
      .map(([invoiceId, val]) => ({
        salesInvoiceId: partyType === "CUSTOMER" ? invoiceId : null,
        purchaseInvoiceId: partyType === "SUPPLIER" ? invoiceId : null,
        allocatedAmount: val,
      }));

    setIsSaving(true);
    try {
      const res = await createPaymentEntryAction({
        paymentType,
        postingDate: new Date(postingDate),
        partyType,
        partyId,
        paidFromAccountId,
        paidToAccountId,
        amount,
        referenceNo: referenceNo || null,
        remarks: remarks || null,
        branchId: branchId || null,
        submit: submitImmediately,
        allocations: allocArray,
      });

      if (res.ok) {
        toast.success(submitImmediately ? "Payment submitted and ledger cleared!" : "Payment draft saved!");
        router.push("/accounting/payment-entries");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSaving(false);
    }
  };

  const activeParties = partyType === "CUSTOMER" ? customers : suppliers;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* ─── PROPERTIES CARD ───────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
          <Calendar className="size-4.5 text-[#00cec4]" />
          <h3 className="font-bold text-xs text-white uppercase tracking-wider">Payment voucher header</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Payment Type</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as any)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="RECEIVE">Receipt (Receive Cash)</option>
              <option value="PAY">Payment (Disburse Cash)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Party Class</label>
            <select
              value={partyType}
              onChange={(e) => setPartyType(e.target.value as any)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="CUSTOMER">Customer / Client</option>
              <option value="SUPPLIER">Vendor / Supplier</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Select Party *</label>
            <select
              required
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="">Choose Party...</option>
              {activeParties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

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

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Payment Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              placeholder="0.00"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Paid From Account (Source)</label>
            <select
              required
              value={paidFromAccountId}
              onChange={(e) => setPaidFromAccountId(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="">Select Account...</option>
              {paymentType === "RECEIVE" ? (
                otherAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName} ({a.accountType})</option>
                ))
              ) : (
                bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Paid To Account (Destination)</label>
            <select
              required
              value={paidToAccountId}
              onChange={(e) => setPaidToAccountId(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="">Select Account...</option>
              {paymentType === "RECEIVE" ? (
                bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))
              ) : (
                otherAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName} ({a.accountType})</option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Reference No / Chq / TxID</label>
            <input
              type="text"
              placeholder="e.g. CHQ-882310"
              value={referenceNo}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
            />
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Branch Mapping</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
            >
              <option value="">Global / Head Office</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="ds-label block text-slate-400">General Remarks</label>
            <input
              type="text"
              placeholder="Voucher details..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
            />
          </div>
        </div>
      </div>

      {/* ─── ALLOCATIONS SECTION ───────────────────────────────────────── */}
      {filteredInvoices.length > 0 && (
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex justify-between items-center border-b border-[#1c212a]/30 pb-3">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Wallet className="size-4.5 text-[#00cec4]" /> Outstanding bills for allocation
            </h3>
            {amount > 0 && (
              <button
                type="button"
                onClick={handleAutoAllocate}
                className="flex items-center gap-1 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <span>Auto Allocate</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Grand Total</th>
                  <th>Outstanding Balance</th>
                  <th className="text-right w-48">Allocated Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#161f28]/10 text-xs">
                    <td className="font-semibold text-white font-mono">{inv.invoiceNumber}</td>
                    <td className="ds-numeric text-slate-350">₹{inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="ds-numeric text-white font-bold">₹{inv.outstandingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={inv.outstandingAmount}
                        placeholder="0.00"
                        value={allocations[inv.id] || ""}
                        onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                        className="bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2 text-xs font-mono w-40 text-right font-bold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#1c212a]/50 pt-4 flex justify-between items-center text-xs font-semibold text-white">
            <span>Total Allocated: ₹{totalAllocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            <span className={amount - totalAllocated >= 0 ? "text-emerald-400" : "text-[#fb923c]"}>
              Unallocated: ₹{(amount - totalAllocated).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

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
            Post and finalize payment immediately? (Disburse funds and settle invoices)
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
            <span>Record Payment</span>
          )}
        </button>
      </div>

    </form>
  );
}
