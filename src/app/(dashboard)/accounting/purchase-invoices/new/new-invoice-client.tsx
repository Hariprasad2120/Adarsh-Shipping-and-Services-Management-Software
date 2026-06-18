"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar, FileText, User, Receipt, Loader2 } from "lucide-react";
import { createPurchaseInvoiceAction } from "@/modules/accounting/actions";

interface NewPurchaseInvoiceClientProps {
  suppliers: any[];
  branches: any[];
}

export function NewPurchaseInvoiceClient({ suppliers, branches }: NewPurchaseInvoiceClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
  // Header fields
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState("");
  const [submitImmediately, setSubmitImmediately] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);

  // Item lines
  const [items, setItems] = useState<any[]>([
    { itemName: "", qty: 1, rate: 0 },
  ]);

  const handleAddItem = () => {
    setItems([...items, { itemName: "", qty: 1, rate: 0 }]);
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
    if (field === "qty") {
      newItems[idx][field] = parseFloat(value) || 0;
    } else if (field === "rate") {
      newItems[idx][field] = parseFloat(value) || 0;
    } else {
      newItems[idx][field] = value;
    }
    setItems(newItems);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * (taxRate / 100);
  const grandTotal = taxableAmount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }

    if (items.some((item) => !item.itemName || item.qty <= 0 || item.rate <= 0)) {
      toast.error("Please fill in item details with positive quantities and rates");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createPurchaseInvoiceAction({
        supplierId,
        postingDate: new Date(postingDate),
        dueDate: new Date(dueDate),
        branchId: branchId || null,
        discountAmount,
        taxRate,
        remarks: remarks || null,
        submit: submitImmediately,
        items: items.map((item) => ({
          itemName: item.itemName,
          qty: item.qty,
          rate: item.rate,
        })),
      });

      if (res.ok) {
        toast.success(submitImmediately ? "Purchase Invoice created & posted!" : "Purchase Invoice draft saved!");
        router.push("/accounting/purchase-invoices");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create purchase invoice");
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
            <label className="ds-label block text-slate-400">Supplier *</label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="">Select Supplier / Vendor...</option>
              {suppliers.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
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
            <label className="ds-label block text-slate-400">Due Date</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-semibold"
            />
          </div>

        </div>

        <div className="space-y-1 text-xs">
          <label className="ds-label block text-slate-400">Remarks / Description</label>
          <input
            type="text"
            placeholder="e.g. Fuel expenses for logistics fleet"
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
                <label className="ds-label text-slate-500 md:hidden">Expense Item Details</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Rental"
                  value={item.itemName}
                  onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
                />
              </div>

              {/* Quantity */}
              <div className="w-full md:w-24 space-y-1">
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
              <div className="w-full md:w-36 space-y-1">
                <label className="ds-label text-slate-500 md:hidden">Rate (₹)</label>
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
                  ₹{(item.qty * item.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
        <div className="border-t border-[#1c212a]/50 pt-4 flex flex-col sm:flex-row sm:justify-between items-center sm:items-start gap-4 text-xs font-semibold text-white">
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
              <label className="ds-label block text-slate-400">Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                value={taxRate || ""}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2 text-xs font-mono w-20"
              />
            </div>
          </div>

          <div className="w-64 space-y-2 text-xs text-slate-400">
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
            <span>Create Purchase Invoice</span>
          )}
        </button>
      </div>

    </form>
  );
}
