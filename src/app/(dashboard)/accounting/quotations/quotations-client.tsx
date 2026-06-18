"use client";

import React, { useState } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  TrendingUp,
  FileCheck2,
  Undo2,
  Trash2,
} from "lucide-react";
import {
  createQuotationAction,
  convertQuotationToInvoiceAction,
  createCustomerNoteAction,
  submitCustomerNoteAction,
} from "@/modules/accounting/actions";

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  postingDate: Date;
  validUntil: Date;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  remarks: string | null;
}

interface CustomerNote {
  id: string;
  noteNumber: string;
  noteType: string;
  customerName: string;
  postingDate: Date;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  reason: string | null;
}

interface Customer {
  id: string;
  name: string;
  gstin: string | null;
  billingAddress: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  postingDate: Date;
}

interface QuotationsClientProps {
  initialQuotations: Quotation[];
  initialNotes: CustomerNote[];
  customers: Customer[];
  invoices: Invoice[];
}

interface FormItem {
  itemName: string;
  qty: number;
  rate: number;
  taxRate: number;
}

export function QuotationsClient({
  initialQuotations,
  initialNotes,
  customers,
  invoices,
}: QuotationsClientProps) {
  const [activeTab, setActiveTab] = useState<"quotations" | "notes">("quotations");
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [notes, setNotes] = useState<CustomerNote[]>(initialNotes);

  const [showQuotModal, setShowQuotModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Form states - Quotation
  const [quotCustomer, setQuotCustomer] = useState("");
  const [quotValidUntil, setQuotValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]
  );
  const [quotRemarks, setQuotRemarks] = useState("");
  const [quotItems, setQuotItems] = useState<FormItem[]>([
    { itemName: "", qty: 1, rate: 0, taxRate: 18 },
  ]);

  // Form states - Customer Note
  const [noteType, setNoteType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [noteCustomer, setNoteCustomer] = useState("");
  const [noteInvoice, setNoteInvoice] = useState("");
  const [noteReason, setNoteReason] = useState("");
  const [noteRemarks, setNoteRemarks] = useState("");
  const [noteItems, setNoteItems] = useState<FormItem[]>([
    { itemName: "", qty: 1, rate: 0, taxRate: 18 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calculate totals - Quotation
  const quotTaxable = quotItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const quotTax = quotItems.reduce(
    (sum, item) => sum + item.qty * item.rate * (item.taxRate / 100),
    0
  );
  const quotTotal = quotTaxable + quotTax;

  // Calculate totals - Note
  const noteTaxable = noteItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const noteTax = noteItems.reduce(
    (sum, item) => sum + item.qty * item.rate * (item.taxRate / 100),
    0
  );
  const noteTotal = noteTaxable + noteTax;

  const handleAddQuotItem = () => {
    setQuotItems([...quotItems, { itemName: "", qty: 1, rate: 0, taxRate: 18 }]);
  };

  const handleRemoveQuotItem = (index: number) => {
    setQuotItems(quotItems.filter((_, i) => i !== index));
  };

  const handleQuotItemChange = (index: number, field: keyof FormItem, val: any) => {
    const next = [...quotItems];
    next[index] = { ...next[index], [field]: val };
    setQuotItems(next);
  };

  const handleAddNoteItem = () => {
    setNoteItems([...noteItems, { itemName: "", qty: 1, rate: 0, taxRate: 18 }]);
  };

  const handleRemoveNoteItem = (index: number) => {
    setNoteItems(noteItems.filter((_, i) => i !== index));
  };

  const handleNoteItemChange = (index: number, field: keyof FormItem, val: any) => {
    const next = [...noteItems];
    next[index] = { ...next[index], [field]: val };
    setNoteItems(next);
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!quotCustomer) {
      setError("Please select a customer.");
      return;
    }
    if (quotItems.some((it) => !it.itemName.trim() || it.qty <= 0 || it.rate < 0)) {
      setError("Please fill all item lines correctly.");
      return;
    }

    setLoading(true);
    try {
      const res = await createQuotationAction({
        customerId: quotCustomer,
        validUntil: quotValidUntil,
        remarks: quotRemarks,
        items: quotItems,
      });

      if (res.ok) {
        setSuccess("Quotation prepared successfully.");
        setQuotCustomer("");
        setQuotRemarks("");
        setQuotItems([{ itemName: "", qty: 1, rate: 0, taxRate: 18 }]);
        setQuotations([res.data, ...quotations]);
        setTimeout(() => {
          setShowQuotModal(false);
          setSuccess(null);
        }, 1500);
      } else {
        setError(res.error || "Failed to create quotation.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!noteCustomer) {
      setError("Please select a customer.");
      return;
    }
    if (noteItems.some((it) => !it.itemName.trim() || it.qty <= 0 || it.rate < 0)) {
      setError("Please fill all item lines correctly.");
      return;
    }

    setLoading(true);
    try {
      const res = await createCustomerNoteAction({
        noteType,
        customerId: noteCustomer,
        originalInvoiceId: noteInvoice || undefined,
        reason: noteReason,
        remarks: noteRemarks,
        items: noteItems,
      });

      if (res.ok) {
        setSuccess(`${noteType} Note created as DRAFT.`);
        setNoteCustomer("");
        setNoteInvoice("");
        setNoteReason("");
        setNoteRemarks("");
        setNoteItems([{ itemName: "", qty: 1, rate: 0, taxRate: 18 }]);
        setNotes([res.data, ...notes]);
        setTimeout(() => {
          setShowNoteModal(false);
          setSuccess(null);
        }, 1500);
      } else {
        setError(res.error || "Failed to create adjustment note.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleConvertQuotation = async (id: string) => {
    setError(null);
    setSuccess(null);
    if (!confirm("Are you sure you want to convert this Quotation into a Sales Invoice?")) return;

    try {
      const res = await convertQuotationToInvoiceAction(id);
      if (res.ok) {
        alert("Quotation converted to Sales Invoice successfully!");
        setQuotations(
          quotations.map((q) => (q.id === id ? { ...q, status: "CONVERTED" } : q))
        );
      } else {
        alert(res.error || "Failed to convert quotation.");
      }
    } catch (err: any) {
      alert(err.message || "Conversion failed.");
    }
  };

  const handleSubmitNote = async (id: string) => {
    setError(null);
    setSuccess(null);
    if (!confirm("Are you sure you want to SUBMIT this Note? This will lock it and post General Ledger entries.")) return;

    try {
      const res = await submitCustomerNoteAction(id);
      if (res.ok) {
        alert("Credit/Debit note posted successfully!");
        setNotes(notes.map((n) => (n.id === id ? { ...n, status: "SUBMITTED" } : n)));
      } else {
        alert(res.error || "Failed to post adjustment note.");
      }
    } catch (err: any) {
      alert(err.message || "Submission failed.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Navigation Tabs ──────────────────────────────────────────────────── */}
      <div className="flex border-b border-outline-variant/10 gap-2">
        <button
          onClick={() => setActiveTab("quotations")}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "quotations"
              ? "border-[#00cec4] text-[#00cec4]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileText size={14} /> Quotations ({quotations.length})
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "notes"
              ? "border-[#00cec4] text-[#00cec4]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Undo2 size={14} /> Credit/Debit Notes ({notes.length})
        </button>
      </div>

      {/* ─── Tab 1: Quotations ────────────────────────────────────────────────── */}
      {activeTab === "quotations" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[var(--color-surface-container)] px-6 py-4 rounded-xl shadow-sm border border-outline-variant/10">
            <div>
              <h4 className="ds-h3 text-white">Pre-Sales Quotations</h4>
              <p className="text-[10px] text-slate-400 mt-1">
                Provide client pricing. Track open and expired configurations.
              </p>
            </div>
            <button
              onClick={() => setShowQuotModal(true)}
              className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all flex items-center gap-2"
            >
              <Plus size={14} /> New Quotation
            </button>
          </div>

          <div className="bg-[var(--color-surface)] rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Quotation No</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Valid Until</th>
                  <th className="text-right">Taxable</th>
                  <th className="text-right">GST</th>
                  <th className="text-right">Grand Total</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-slate-500 py-8 text-xs uppercase">
                      No quotations found
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-800/10">
                      <td className="font-semibold text-xs text-white ds-numeric">
                        {q.quotationNumber}
                      </td>
                      <td className="text-xs uppercase text-white font-medium">
                        {q.customerName}
                      </td>
                      <td className="ds-numeric text-xs">
                        {new Date(q.postingDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="ds-numeric text-xs">
                        {new Date(q.validUntil).toLocaleDateString("en-IN")}
                      </td>
                      <td className="text-right ds-numeric text-xs text-slate-300">
                        ₹{q.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right ds-numeric text-xs text-slate-400">
                        ₹{q.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right ds-numeric text-xs font-semibold text-white">
                        ₹{q.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                            q.status === "OPEN"
                              ? "bg-sky-950/50 text-sky-400 border border-sky-500/20"
                              : q.status === "CONVERTED"
                              ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-950/50 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="text-right">
                        {q.status === "OPEN" && (
                          <button
                            onClick={() => handleConvertQuotation(q.id)}
                            className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-3 py-1 rounded-lg text-[10px] uppercase tracking-wide transition-all inline-flex items-center gap-1"
                          >
                            <RefreshCw size={10} /> Convert to Invoice
                          </button>
                        )}
                        {q.status !== "OPEN" && (
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Tab 2: Credit/Debit Notes ────────────────────────────────────────── */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[var(--color-surface-container)] px-6 py-4 rounded-xl shadow-sm border border-outline-variant/10">
            <div>
              <h4 className="ds-h3 text-white">Credit &amp; Debit Notes</h4>
              <p className="text-[10px] text-slate-400 mt-1">
                Post sales returns, write-offs, or additional charges directly against accounts receivable.
              </p>
            </div>
            <button
              onClick={() => setShowNoteModal(true)}
              className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all flex items-center gap-2"
            >
              <Plus size={14} /> New Credit/Debit Note
            </button>
          </div>

          <div className="bg-[var(--color-surface)] rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Note Number</th>
                  <th>Type</th>
                  <th>Customer</th>
                  <th>Posting Date</th>
                  <th className="text-right">Taxable</th>
                  <th className="text-right">GST</th>
                  <th className="text-right">Adjusted Amt</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {notes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-slate-500 py-8 text-xs uppercase">
                      No customer notes found
                    </td>
                  </tr>
                ) : (
                  notes.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-800/10">
                      <td className="font-semibold text-xs text-white ds-numeric">
                        {n.noteNumber}
                      </td>
                      <td>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            n.noteType === "CREDIT"
                              ? "bg-rose-950/40 text-rose-400 border border-rose-500/20"
                              : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {n.noteType}
                        </span>
                      </td>
                      <td className="text-xs uppercase text-white font-medium">
                        {n.customerName}
                      </td>
                      <td className="ds-numeric text-xs">
                        {new Date(n.postingDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="text-right ds-numeric text-xs text-slate-300">
                        ₹{n.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right ds-numeric text-xs text-slate-400">
                        ₹{n.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right ds-numeric text-xs font-semibold text-white">
                        ₹{n.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-slate-400 text-xs truncate max-w-[150px]">
                        {n.reason || "—"}
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                            n.status === "DRAFT"
                              ? "bg-slate-900/60 text-slate-400 border border-slate-700/30"
                              : "bg-emerald-955/50 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {n.status}
                        </span>
                      </td>
                      <td className="text-right">
                        {n.status === "DRAFT" && (
                          <button
                            onClick={() => handleSubmitNote(n.id)}
                            className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-3 py-1 rounded-lg text-[10px] uppercase tracking-wide transition-all inline-flex items-center gap-1"
                          >
                            <FileCheck2 size={10} /> Submit &amp; Post
                          </button>
                        )}
                        {n.status !== "DRAFT" && (
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                            Posted to GL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Prepare Quotation Modal ────────────────────────────────────────── */}
      {showQuotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-outline-variant/10 rounded-2xl w-full max-w-[700px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-[var(--color-surface-container)] border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="ds-h3 text-white">Prepare New Quotation</h3>
              <button
                onClick={() => setShowQuotModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="p-6 space-y-4 overflow-y-auto flex-1">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="ds-label block">Customer</label>
                  <select
                    value={quotCustomer}
                    onChange={(e) => setQuotCustomer(e.target.value)}
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
                  <label className="ds-label block">Valid Until</label>
                  <input
                    type="date"
                    value={quotValidUntil}
                    onChange={(e) => setQuotValidUntil(e.target.value)}
                    required
                    className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs ds-numeric"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="ds-label">Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddQuotItem}
                    className="text-[#00cec4] hover:text-[#00b8af] text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Row
                  </button>
                </div>

                <div className="space-y-2 bg-[var(--color-background)] p-4 rounded-xl border border-outline-variant/10">
                  {quotItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          required
                          value={item.itemName}
                          onChange={(e) => handleQuotItemChange(idx, "itemName", e.target.value)}
                          placeholder="Item Name / Description"
                          className="w-full bg-[var(--color-surface)] text-white p-2.5 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleQuotItemChange(idx, "qty", parseInt(e.target.value) || 0)}
                          placeholder="Qty"
                          className="w-full bg-[var(--color-surface)] text-white p-2.5 rounded-lg text-xs ds-numeric text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleQuotItemChange(idx, "rate", parseFloat(e.target.value) || 0)}
                          placeholder="Rate"
                          className="w-full bg-[var(--color-surface)] text-white p-2.5 rounded-lg text-xs ds-numeric text-right"
                        />
                      </div>
                      <div className="col-span-1">
                        <select
                          value={item.taxRate}
                          onChange={(e) => handleQuotItemChange(idx, "taxRate", parseInt(e.target.value) || 0)}
                          className="w-full bg-[var(--color-surface)] text-white p-2.5 rounded-lg text-[10px] text-center"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-center">
                        {quotItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuotItem(idx)}
                            className="text-rose-500 hover:text-rose-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals box */}
              <div className="flex justify-end p-4 bg-[var(--color-surface-container)] rounded-xl border border-outline-variant/10">
                <div className="w-[250px] space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Amount:</span>
                    <span className="ds-numeric text-white">
                      ₹{quotTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST (Estimated):</span>
                    <span className="ds-numeric text-white">
                      ₹{quotTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-outline-variant/10 pt-2 text-white">
                    <span>Grand Total:</span>
                    <span className="ds-numeric text-[#00cec4]">
                      ₹{quotTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="ds-label block">Notes / Terms</label>
                <textarea
                  value={quotRemarks}
                  onChange={(e) => setQuotRemarks(e.target.value)}
                  placeholder="Payment terms, delivery details, etc."
                  className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setShowQuotModal(false)}
                  className="px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-xs uppercase tracking-wide transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all disabled:opacity-50"
                >
                  {loading ? "Preparing..." : "Prepare Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Credit/Debit Note Modal ─────────────────────────────────────────── */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-outline-variant/10 rounded-2xl w-full max-w-[700px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-[var(--color-surface-container)] border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="ds-h3 text-white">Create Adjustment Note</h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="p-6 space-y-4 overflow-y-auto flex-1">
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="ds-label block">Note Type</label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as any)}
                    required
                    className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs"
                  >
                    <option value="CREDIT">Credit Note (Return/Discount)</option>
                    <option value="DEBIT">Debit Note (Extra Charge)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="ds-label block">Customer</label>
                  <select
                    value={noteCustomer}
                    onChange={(e) => setNoteCustomer(e.target.value)}
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
                  <label className="ds-label block">Link Sales Invoice (Optional)</label>
                  <select
                    value={noteInvoice}
                    onChange={(e) => setNoteInvoice(e.target.value)}
                    className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs"
                  >
                    <option value="">Select Invoice</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} (₹{inv.grandTotal})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="ds-label block">Reason for adjustment</label>
                  <input
                    type="text"
                    required
                    value={noteReason}
                    onChange={(e) => setNoteReason(e.target.value)}
                    placeholder="E.g., Item damaged, sales discount correction"
                    className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="ds-label block">Remarks</label>
                  <input
                    type="text"
                    value={noteRemarks}
                    onChange={(e) => setNoteRemarks(e.target.value)}
                    placeholder="Internal reference details"
                    className="w-full bg-[var(--color-background)] text-white p-3 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="ds-label">Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddNoteItem}
                    className="text-[#00cec4] hover:text-[#00b8af] text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Row
                  </button>
                </div>

                <div className="space-y-2 bg-[var(--color-background)] p-4 rounded-xl border border-outline-variant/10">
                  {noteItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          required
                          value={item.itemName}
                          onChange={(e) => handleNoteItemChange(idx, "itemName", e.target.value)}
                          placeholder="Description of adjustment"
                          className="w-full bg-[var(--color-surface)] text-white p-2.5 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleNoteItemChange(idx, "qty", parseInt(e.target.value) || 0)}
                          placeholder="Qty"
                          className="w-full bg-[var(--color-surface)] text-white p-2.5 rounded-lg text-xs ds-numeric text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleNoteItemChange(idx, "rate", parseFloat(e.target.value) || 0)}
                          placeholder="Amount"
                          className="w-full bg-[var(--color-surface)] text-white p-2.5 rounded-lg text-xs ds-numeric text-right"
                        />
                      </div>
                      <div className="col-span-1">
                        <select
                          value={item.taxRate}
                          onChange={(e) => handleNoteItemChange(idx, "taxRate", parseInt(e.target.value) || 0)}
                          className="w-full bg-[var(--color-surface)] text-white p-2.5 rounded-lg text-[10px] text-center"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-center">
                        {noteItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveNoteItem(idx)}
                            className="text-rose-500 hover:text-rose-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals box */}
              <div className="flex justify-end p-4 bg-[var(--color-surface-container)] rounded-xl border border-outline-variant/10">
                <div className="w-[250px] space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Value:</span>
                    <span className="ds-numeric text-white">
                      ₹{noteTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST (Estimated):</span>
                    <span className="ds-numeric text-white">
                      ₹{noteTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-outline-variant/10 pt-2 text-white">
                    <span>Adjustment Amount:</span>
                    <span className="ds-numeric text-[#00cec4]">
                      ₹{noteTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-xs uppercase tracking-wide transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all disabled:opacity-50"
                >
                  {loading ? "Creating..." : `Create ${noteType} Note`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
