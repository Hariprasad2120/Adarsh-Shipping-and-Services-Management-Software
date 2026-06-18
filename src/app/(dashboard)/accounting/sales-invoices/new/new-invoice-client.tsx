"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar, FileText, User, Receipt, Loader2 } from "lucide-react";
import { createSalesInvoiceAction } from "@/modules/accounting/actions";

interface NewInvoiceClientProps {
  customers: any[];
  branches: any[];
  products?: { id: string; name: string; price: number; taxPercent: number }[];
  bankAccounts?: { id: string; accountName: string; accountCode: string }[];
}

export function NewInvoiceClient({
  customers,
  branches,
  products = [],
  bankAccounts = []
}: NewInvoiceClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
  // Header fields
  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState("");
  const [submitImmediately, setSubmitImmediately] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [bankDetails, setBankDetails] = useState("");
  const [manualNotes, setManualNotes] = useState("Thanks for your business.");

  // Item lines
  const [items, setItems] = useState<any[]>([
    { itemName: "", qty: 1, rate: 0, currency: "INR", exchangeRate: 1 },
  ]);

  useEffect(() => {
    if (postingDate) {
      const d = new Date(postingDate);
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split("T")[0]);
    }
  }, [postingDate]);

  const handleAddItem = () => {
    setItems([...items, { itemName: "", qty: 1, rate: 0, currency: "INR", exchangeRate: 1 }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) {
      toast.error("At least one line item is required");
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === "qty" || field === "rate" || field === "exchangeRate") {
      newItems[idx][field] = parseFloat(value) || 0;
    } else {
      newItems[idx][field] = value;
    }

    if (field === "itemName") {
      const match = products.find(p => p.name.toLowerCase() === value.trim().toLowerCase());
      if (match) {
        newItems[idx].rate = match.price;
        if (match.taxPercent !== undefined) {
          setTaxRate(match.taxPercent);
        }
      }
    }

    if (field === "currency") {
      if (value === "INR") {
        newItems[idx].exchangeRate = 1;
      }
    }

    setItems(newItems);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate * (item.exchangeRate || 1)), 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * (taxRate / 100);
  const grandTotal = taxableAmount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (items.some((item) => !item.itemName || item.qty <= 0 || item.rate <= 0)) {
      toast.error("Please fill in item details with positive quantities and rates");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createSalesInvoiceAction({
        customerId,
        postingDate: new Date(postingDate),
        dueDate: new Date(dueDate),
        branchId: branchId || null,
        discountAmount,
        taxRate,
        remarks: remarks || null,
        submit: submitImmediately,
        bankDetails: bankDetails || null,
        manualNotes: manualNotes || null,
        items: items.map((item) => ({
          itemName: item.itemName,
          qty: item.qty,
          rate: item.rate,
          currency: item.currency || "INR",
          exchangeRate: item.exchangeRate || 1,
        })),
      });

      if (res.ok) {
        toast.success(submitImmediately ? "Sales Invoice created & posted!" : "Sales Invoice draft saved!");
        router.push("/accounting/sales-invoices");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
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
          <h3 className="font-bold text-xs text-white uppercase tracking-wider">Invoice Properties</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Customer *</label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="">Select Customer Account...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="ds-label block text-slate-400">Branch Mapping</label>
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
            <label className="ds-label block text-slate-400">Bank Details</label>
            <select
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="">Select Bank Account...</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={`${acc.accountName} (A/C: ${acc.accountCode})`}>
                  {acc.accountName} ({acc.accountCode})
                </option>
              ))}
            </select>
          </div>

          {/* Hidden Due Date (will default to postingDate + 30 days) */}
          <input type="hidden" value={dueDate} />

        </div>

        <div className="space-y-1 text-xs">
          <label className="ds-label block text-slate-400">Remarks / Description</label>
          <input
            type="text"
            placeholder="e.g. Ocean freight services for Singapore shipment"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
          />
        </div>
      </div>

      {/* ─── TRANSACTION ROWS ───────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <div className="flex justify-between items-center border-b border-[#1c212a]/30 pb-3">
          <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <Receipt className="size-4.5 text-[#00cec4]" /> Line items grid
          </h3>
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="size-3.5 text-[#00cec4]" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-3 items-end md:items-center text-xs">
              
              {/* Item Description */}
              <div className="flex-1 space-y-1 w-full">
                <label className="ds-label text-slate-500 md:hidden">Service Item Details</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customs CHA filing, Local transport..."
                  value={item.itemName}
                  list="products-datalist"
                  onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
                />
              </div>

              {/* Currency */}
              <div className="w-full md:w-24 space-y-1">
                <label className="ds-label text-slate-500 md:hidden">Currency</label>
                <select
                  value={item.currency || "INR"}
                  onChange={(e) => handleItemChange(idx, "currency", e.target.value)}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="SGD">SGD</option>
                </select>
              </div>

              {/* Exchange Rate */}
              <div className="w-full md:w-24 space-y-1">
                <label className="ds-label text-slate-500 md:hidden">Exch Rate</label>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  required
                  disabled={(item.currency || "INR") === "INR"}
                  value={item.exchangeRate || ""}
                  onChange={(e) => handleItemChange(idx, "exchangeRate", e.target.value)}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-mono disabled:opacity-50"
                />
              </div>

              {/* Quantity */}
              <div className="w-full md:w-20 space-y-1">
                <label className="ds-label text-slate-500 md:hidden">Qty</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="1"
                  value={item.qty}
                  onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-mono"
                />
              </div>

              {/* Rate */}
              <div className="w-full md:w-28 space-y-1">
                <label className="ds-label text-slate-500 md:hidden">Rate</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={item.rate || ""}
                  onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-mono"
                />
              </div>

              {/* Total Row Amount */}
              <div className="w-full md:w-36 space-y-1 text-right">
                <span className="ds-label text-slate-500 block mb-1">Total (₹)</span>
                <div className="w-full bg-[#161f28]/40 border border-[#1c212a]/30 text-white rounded-xl p-2 text-xs font-mono font-bold">
                  ₹{(item.qty * item.rate * (item.exchangeRate || 1)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="p-2.5 text-slate-500 hover:text-red-450 hover:bg-red-500/5 rounded-xl transition-all cursor-pointer border border-[#1c212a]/30 mb-[1px]"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        {/* FINANCIAL SUMMARY TOTALS */}
        <div className="border-t border-[#1c212a]/50 pt-4 flex flex-col md:flex-row md:justify-between items-start gap-6 text-xs font-semibold text-white">
          
          {/* Left side: Notes and Global Parameters (Discount, Tax) */}
          <div className="w-full md:w-1/2 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Customer Notes</label>
              <textarea
                placeholder="Type any manual notes here..."
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                rows={3}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
              />
            </div>

            <div className="flex gap-4">
              <div className="space-y-1">
                <label className="ds-label block text-slate-400">Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2 text-xs font-mono w-28"
                />
              </div>
              <div className="space-y-1">
                <label className="ds-label block text-slate-400">Tax Rate (GST)</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-mono w-28 text-white"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right side: Totals summary */}
          <div className="w-64 space-y-2 text-xs text-slate-400 self-end">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono text-white">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-orange-400">
                <span>Discount:</span>
                <span className="font-mono">-₹{discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-[#1c212a]/30 pb-1.5">
              <span>Tax (GST {taxRate}%):</span>
              <span className="font-mono text-white">₹{taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-[#00cec4] pt-1">
              <span>Grand Total:</span>
              <span className="font-mono">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
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
            Post and finalize invoice immediately? (UNPAID ledger postings)
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
            <span>Create Sales Invoice</span>
          )}
        </button>
      </div>

      {/* Autocomplete Datalist */}
      <datalist id="products-datalist">
        {products.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

    </form>
  );
}
