"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  Calendar,
  User,
  DollarSign,
  Briefcase,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalActionBar, ApprovalLogList, type ApprovalCaps, type ApprovalLogEntry } from "@/components/crm/ApprovalActionBar";
import type { ApprovalStatus } from "@/modules/crm/approval-workflow";

export type InvoiceDetailRecord = {
  id: string;
  invoiceNumber: string;
  type: "INVOICE" | "SALES_ORDER";
  date: string;
  dueDate: string | null;
  status: string;
  approvalStatus: string;
  discount: number;
  tax: number;
  total: number;
  customerName: string;
  billingAddress?: string;
  shippingAddress?: string;
  notes?: string;
  salesperson: string;
  items: Array<{
    id: string;
    name: string;
    qty: number;
    rate: number;
    taxPercent: number;
    amount: number;
  }>;
  approvalLogs: ApprovalLogEntry[];
  slaDeadline: string | null;
  reworkNote?: string | null;
};

export type SidebarInvoiceRecord = {
  id: string;
  invoiceNumber: string;
  type: "INVOICE" | "SALES_ORDER";
  customerName: string;
  status: string;
  approvalStatus: string;
  total: number;
  date: string;
};

interface InvoiceDetailsPageProps {
  invoice: InvoiceDetailRecord;
  caps: ApprovalCaps;
  allInvoices: SidebarInvoiceRecord[];
}

const statusTone: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REWORK: "bg-orange-100 text-orange-700",
  SENT: "bg-blue-100 text-blue-700",
  CUSTOMER_VIEWED: "bg-violet-100 text-violet-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  INVOICED: "bg-cyan-100 text-cyan-700",
  DECLINED: "bg-red-100 text-red-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

function formatStatus(status: string) {
  return status.replace("_", " ");
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InvoiceDetailsPage({
  invoice,
  caps,
  allInvoices,
}: InvoiceDetailsPageProps) {
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<"all" | "INVOICE" | "SALES_ORDER">("all");
  const [activeTab, setActiveTab] = useState<"details" | "items" | "history">("details");

  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((record) => {
      const matchesType = activeView === "all" ? true : record.type === activeView;
      const matchesSearch =
        record.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        record.customerName.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [activeView, search, allInvoices]);

  const isDeclined = invoice.type === "INVOICE" && invoice.approvalStatus === "DECLINED";
  const isSlaBreached = invoice.slaDeadline && new Date() > new Date(invoice.slaDeadline);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#1f2937]">
      <div className="flex min-h-screen flex-col xl:flex-row">
        {/* Sidebar */}
        <aside className="flex w-full shrink-0 flex-col border-b border-[#dfe6f3] bg-white xl:w-[360px] xl:border-b-0 xl:border-r">
          <div className="border-b border-[#e8edf5] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="ds-h3 font-bold tracking-wide text-[#0f172a]">
                Documents
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-[#dbe3f0] bg-white text-[#5d6c86]"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveView("all")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeView === "all" ? "bg-[#eef4ff] text-[#2563eb]" : "bg-[#f6f8fc] text-[#66758f] hover:bg-[#edf2f9]"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveView("SALES_ORDER")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeView === "SALES_ORDER" ? "bg-[#eef4ff] text-[#2563eb]" : "bg-[#f6f8fc] text-[#66758f] hover:bg-[#edf2f9]"
                )}
              >
                Sales Orders
              </button>
              <button
                type="button"
                onClick={() => setActiveView("INVOICE")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeView === "INVOICE" ? "bg-[#eef4ff] text-[#2563eb]" : "bg-[#f6f8fc] text-[#66758f] hover:bg-[#edf2f9]"
                )}
              >
                Invoices
              </button>
            </div>
          </div>

          <div className="border-b border-[#eef2f7] px-4 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#9aa3b2]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search documents"
                className="h-11 w-full rounded-xl border border-[#dbe3f0] bg-white pl-10 pr-3 text-sm text-[#1f2937] outline-none focus:border-[#00cec4] focus:ring-2 focus:ring-[#00cec4]/15"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredInvoices.map((record) => {
              const active = record.id === invoice.id;
              return (
                <Link
                  key={record.id}
                  href={`/crm/invoices/${record.id}`}
                  className={cn(
                    "block border-b border-[#eef2f7] px-4 py-4 transition-colors",
                    active ? "bg-[#f8fbff]" : "hover:bg-[#fafcff]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[13px] text-[#1f2937]">
                          {record.invoiceNumber}
                        </span>
                        <span className="ds-numeric text-xs font-bold text-[#1f2937]">
                          {formatAmount(record.total)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#7b8798]">
                        <span>{record.customerName}</span>
                        <span>{formatDate(record.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#f1f5f9] text-[#475569]">
                          {record.type.replace("_", " ")}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide",
                            statusTone[record.approvalStatus] ?? "bg-slate-100 text-slate-700"
                          )}
                        >
                          {formatStatus(record.approvalStatus)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            {filteredInvoices.length === 0 && (
              <div className="p-8 text-center text-sm text-[#7b8798]">
                No matching documents found.
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 xl:p-8 space-y-6 overflow-y-auto">
          {/* Back to list */}
          <div className="flex items-center justify-between">
            <Link
              href="/crm/quotes"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#4b5563] hover:text-[#00cec4] transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span>Back to CRM</span>
            </Link>

            {/* Entity Badge and Type Title */}
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-lg bg-white border border-[#d7deeb] text-[#334155]">
                {invoice.type.replace("_", " ")}
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  statusTone[invoice.approvalStatus] ?? "bg-slate-100 text-slate-700"
                )}
              >
                {formatStatus(invoice.approvalStatus)}
              </span>
            </div>
          </div>

          {/* Workflow Action Bar Card (Keep interactive outside gray-out) */}
          <div className="card-left-accent bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="ds-label block mb-1">Workflow Status</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold uppercase tracking-tight text-[#0f172a]">
                    {invoice.invoiceNumber}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ApprovalActionBar
                  invoiceId={invoice.id}
                  entityType={invoice.type}
                  approvalStatus={invoice.approvalStatus as ApprovalStatus}
                  caps={caps}
                  reworkNote={invoice.reworkNote}
                  onSuccess={() => window.location.reload()}
                />
              </div>
            </div>
          </div>

          {/* SLA Banner */}
          {isSlaBreached && (
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-800 shadow-sm card-left-accent-orange">
              <span className="ds-icon-badge mt-0.5 flex-shrink-0" style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>
                <ShieldAlert size={18} />
              </span>
              <div>
                <h4 className="ds-h3 font-semibold text-orange-950">
                  {invoice.type === "SALES_ORDER" ? "30-Day Conversion SLA Breached" : "Response SLA Breached"}
                </h4>
                <p className="text-sm text-orange-900 mt-1">
                  {invoice.type === "SALES_ORDER"
                    ? "This Sales Order has not been converted to an Invoice within 30 business days. An alert has been dispatched to the Accounts Manager."
                    : "No update has been received from the customer on this quote within the 2 business days SLA."}
                </p>
              </div>
            </div>
          )}

          {/* Details Card (Greyed out if Declined) */}
          <div
            className={cn(
              "space-y-6 transition-all duration-300",
              isDeclined && "opacity-60 saturate-50 pointer-events-none select-none"
            )}
          >
            {/* Tabs */}
            <div className="border-b border-[#e5e7eb] flex gap-6">
              <button
                onClick={() => setActiveTab("details")}
                className={cn(
                  "pb-3 text-sm font-semibold tracking-wide uppercase transition-colors relative",
                  activeTab === "details"
                    ? "text-[#00cec4] border-b-2 border-[#00cec4]"
                    : "text-[#6b7280] hover:text-[#00cec4]"
                )}
              >
                Document Details
              </button>
              <button
                onClick={() => setActiveTab("items")}
                className={cn(
                  "pb-3 text-sm font-semibold tracking-wide uppercase transition-colors relative",
                  activeTab === "items"
                    ? "text-[#00cec4] border-b-2 border-[#00cec4]"
                    : "text-[#6b7280] hover:text-[#00cec4]"
                )}
              >
                Line Items ({invoice.items.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={cn(
                  "pb-3 text-sm font-semibold tracking-wide uppercase transition-colors relative",
                  activeTab === "history"
                    ? "text-[#00cec4] border-b-2 border-[#00cec4]"
                    : "text-[#6b7280] hover:text-[#00cec4]"
                )}
              >
                Approval Logs
              </button>
            </div>

            {/* Tab content - Details */}
            {activeTab === "details" && (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Left Columns - Client & General */}
                <div className="md:col-span-2 space-y-6">
                  {/* General Details */}
                  <div className="bg-white p-6 rounded-2xl border border-[#e7edf5] shadow-sm">
                    <h3 className="ds-h3 font-semibold mb-4 text-[#0f172a]">
                      General Information
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <span className="ds-label">Document Date</span>
                        <div className="text-sm font-medium flex items-center gap-2 mt-1">
                          <Calendar className="size-4 text-[#00cec4]" />
                          <span>{formatDate(invoice.date)}</span>
                        </div>
                      </div>
                      <div>
                        <span className="ds-label">Due Date</span>
                        <div className="text-sm font-medium flex items-center gap-2 mt-1">
                          <Calendar className="size-4 text-[#00cec4]" />
                          <span>{formatDate(invoice.dueDate || "")}</span>
                        </div>
                      </div>
                      <div>
                        <span className="ds-label">Salesperson / Owner</span>
                        <div className="text-sm font-medium flex items-center gap-2 mt-1">
                          <User className="size-4 text-[#00cec4]" />
                          <span>{invoice.salesperson}</span>
                        </div>
                      </div>
                      <div>
                        <span className="ds-label">SLA Deadline</span>
                        <div className="text-sm font-medium flex items-center gap-2 mt-1">
                          <ShieldAlert className="size-4 text-[#fb923c]" />
                          <span className={cn(isSlaBreached && "text-red-600 font-bold")}>
                            {formatDate(invoice.slaDeadline || "")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Block */}
                  <div className="bg-white p-6 rounded-2xl border border-[#e7edf5] shadow-sm">
                    <h3 className="ds-h3 font-semibold mb-4 text-[#0f172a]">
                      Customer Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="ds-label">Customer Name</span>
                        <div className="text-sm font-bold text-[#1f2937] mt-1">
                          {invoice.customerName}
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <span className="ds-label">Billing Address</span>
                          <div className="text-xs text-[#4b5563] mt-1 leading-relaxed whitespace-pre-line">
                            {invoice.billingAddress || "No billing address listed."}
                          </div>
                        </div>
                        <div>
                          <span className="ds-label">Shipping / Delivery Address</span>
                          <div className="text-xs text-[#4b5563] mt-1 leading-relaxed whitespace-pre-line">
                            {invoice.shippingAddress || "No shipping address listed."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes Block */}
                  {invoice.notes && (
                    <div className="bg-white p-6 rounded-2xl border border-[#e7edf5] shadow-sm">
                      <h3 className="ds-h3 font-semibold mb-2 text-[#0f172a]">
                        Terms & Notes
                      </h3>
                      <p className="text-xs text-[#4b5563] leading-relaxed whitespace-pre-line">
                        {invoice.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column - Financial Summary */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-[#e7edf5] shadow-sm card-top-accent">
                    <h3 className="ds-h3 font-semibold mb-4 text-[#0f172a]">
                      Financial Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm border-b border-[#f3f4f6] pb-2">
                        <span className="text-[#6b7280]">Subtotal</span>
                        <span className="ds-numeric font-medium text-[#1f2937]">
                          {formatAmount(invoice.total - invoice.tax)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-[#f3f4f6] pb-2">
                        <span className="text-[#6b7280]">GST / Tax</span>
                        <span className="ds-numeric font-medium text-[#1f2937]">
                          {formatAmount(invoice.tax)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-[#f3f4f6] pb-2">
                        <span className="text-[#6b7280]">Discount</span>
                        <span className="ds-numeric font-medium text-[#1f2937]">
                          {formatAmount(invoice.discount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-[#0f172a]">Total</span>
                        <span className="ds-numeric text-lg font-bold text-[#00cec4]">
                          {formatAmount(invoice.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab content - Items */}
            {activeTab === "items" && (
              <div className="bg-white rounded-2xl border border-[#e7edf5] shadow-sm overflow-hidden">
                <table className="ds-table w-full">
                  <thead>
                    <tr>
                      <th className="w-16 text-center">S.No</th>
                      <th>Item Description</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Tax %</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="w-16 text-center text-xs text-[#6b7280]">{idx + 1}</td>
                        <td className="font-medium text-[#1f2937]">{item.name}</td>
                        <td className="text-right ds-numeric">{item.qty}</td>
                        <td className="text-right ds-numeric">{formatAmount(item.rate)}</td>
                        <td className="text-right ds-numeric">{item.taxPercent}%</td>
                        <td className="text-right font-semibold text-[#1f2937] ds-numeric">
                          {formatAmount(item.amount)}
                        </td>
                      </tr>
                    ))}
                    {invoice.items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-sm text-[#7b8798]">
                          No items listed on this document.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab content - History */}
            {activeTab === "history" && (
              <div className="bg-white p-6 rounded-2xl border border-[#e7edf5] shadow-sm">
                <h3 className="ds-h3 font-semibold mb-4 text-[#0f172a] flex items-center gap-2">
                  <History className="size-4 text-[#00cec4]" />
                  <span>Workflow Audit History</span>
                </h3>
                <ApprovalLogList logs={invoice.approvalLogs} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
