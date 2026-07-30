"use client";

import { CrmButton, CrmInput, CrmTable } from "@/modules/crm/components/workspace/crm-workspace";

import Link from "next/link";
import { useMemo, useState } from "react";
import {ArrowLeft,ChevronDown,FileText,MoreHorizontal,Plus,Search,ShieldAlert,Calendar,User,DollarSign,Briefcase,History,} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalActionBar, ApprovalLogList, type ApprovalCaps, type ApprovalLogEntry } from "@/modules/crm/components/ApprovalActionBar";
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
  DRAFT: "bg-mono-soft text-mono-muted",
  PENDING_APPROVAL: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  APPROVED: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  REWORK: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  SENT: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  CUSTOMER_VIEWED: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  ACCEPTED: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  INVOICED: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  DECLINED: "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]",
  ACTIVE: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  COMPLETED: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
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
    <div className="min-h-screen bg-[var(--mnx-surface)] text-[var(--mnx-text-strong)]">
      <div className="flex min-h-screen flex-col xl:flex-row">
        {/* Sidebar */}
        <aside className="flex w-full shrink-0 flex-col border-b border-[var(--mnx-border)] bg-mono-card xl:w-[360px] xl:border-b-0 xl:border-r">
          <div className="border-b border-[var(--mnx-border)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="mnx-title-3 font-bold tracking-wide text-[var(--mnx-text-strong)]">
                Documents
              </span>
              <div className="flex items-center gap-2">
                <CrmButton
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--mnx-border)] bg-mono-card text-[var(--mnx-text-muted)]"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="size-4" />
                </CrmButton>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <CrmButton
                type="button"
                onClick={() => setActiveView("all")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeView === "all" ? "bg-[var(--mnx-text-muted)] text-[var(--mnx-accent)]" : "bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)] hover:bg-[var(--mnx-border)]"
                )}
              >
                All
              </CrmButton>
              <CrmButton
                type="button"
                onClick={() => setActiveView("SALES_ORDER")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeView === "SALES_ORDER" ? "bg-[var(--mnx-text-muted)] text-[var(--mnx-accent)]" : "bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)] hover:bg-[var(--mnx-border)]"
                )}
              >
                Sales Orders
              </CrmButton>
              <CrmButton
                type="button"
                onClick={() => setActiveView("INVOICE")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeView === "INVOICE" ? "bg-[var(--mnx-text-muted)] text-[var(--mnx-accent)]" : "bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)] hover:bg-[var(--mnx-border)]"
                )}
              >
                Invoices
              </CrmButton>
            </div>
          </div>

          <div className="border-b border-[var(--mnx-border)] px-4 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--mnx-text-muted)]" />
              <CrmInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search documents"
                className="h-11 w-full rounded-xl border border-[var(--mnx-border)] bg-mono-card pl-10 pr-3 text-sm text-[var(--mnx-text-strong)] outline-none focus:border-[var(--mnx-accent)] focus:ring-2 focus:ring-[var(--mnx-accent)]/15"
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
                    "block border-b border-[var(--mnx-border)] px-4 py-4 transition-colors",
                    active ? "bg-[var(--mnx-surface)]" : "hover:bg-[var(--mnx-surface)]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[13px] text-[var(--mnx-text-strong)]">
                          {record.invoiceNumber}
                        </span>
                        <span className="mnx-numeric text-xs font-bold text-[var(--mnx-text-strong)]">
                          {formatAmount(record.total)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[var(--mnx-text-muted)]">
                        <span>{record.customerName}</span>
                        <span>{formatDate(record.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--mnx-text-muted)] text-[var(--mnx-text-muted)]">
                          {record.type.replace("_", " ")}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide",
                            statusTone[record.approvalStatus] ?? "bg-mono-soft text-mono-muted"
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
              <div className="p-8 text-center text-sm text-[var(--mnx-text-muted)]">
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
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--mnx-text-muted)] hover:text-[var(--mnx-accent)] transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span>Back to CRM</span>
            </Link>

            {/* Entity Badge and Type Title */}
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-lg bg-mono-card border border-[var(--mnx-border)] text-[var(--mnx-text-muted)]">
                {invoice.type.replace("_", " ")}
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  statusTone[invoice.approvalStatus] ?? "bg-mono-soft text-mono-muted"
                )}
              >
                {formatStatus(invoice.approvalStatus)}
              </span>
            </div>
          </div>

          {/* Workflow Action Bar Card (Keep interactive outside gray-out) */}
          <div className="mnx-crm-panel-surface  bg-mono-card rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="mnx-label block mb-1">Workflow Status</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold uppercase tracking-tight text-[var(--mnx-text-strong)]">
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
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--mnx-warning-bg)] border border-[var(--mnx-warning)] text-[var(--mnx-warning)] shadow-sm mnx-crm-panel-surface mnx-tone-warning">
              <span className="mnx-crm-icon-badge mt-0.5 flex-shrink-0" style={{ background: "var(--mnx-warning-bg)", color: "var(--mnx-accent)" }}>
                <ShieldAlert size={18} />
              </span>
              <div>
                <h4 className="mnx-title-3 font-semibold text-[var(--mnx-warning)]">
                  {invoice.type === "SALES_ORDER" ? "30-Day Conversion SLA Breached" : "Response SLA Breached"}
                </h4>
                <p className="text-sm text-[var(--mnx-warning)] mt-1">
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
            <div className="border-b border-[var(--mnx-border)] flex gap-6">
              <CrmButton
                onClick={() => setActiveTab("details")}
                className={cn(
                  "pb-3 text-sm font-semibold tracking-wide uppercase transition-colors relative",
                  activeTab === "details"
                    ? "text-[var(--mnx-accent)] border-b-2 border-[var(--mnx-accent)]"
                    : "text-[var(--mnx-text-muted)] hover:text-[var(--mnx-accent)]"
                )}
              >
                Document Details
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("items")}
                className={cn(
                  "pb-3 text-sm font-semibold tracking-wide uppercase transition-colors relative",
                  activeTab === "items"
                    ? "text-[var(--mnx-accent)] border-b-2 border-[var(--mnx-accent)]"
                    : "text-[var(--mnx-text-muted)] hover:text-[var(--mnx-accent)]"
                )}
              >
                Line Items ({invoice.items.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("history")}
                className={cn(
                  "pb-3 text-sm font-semibold tracking-wide uppercase transition-colors relative",
                  activeTab === "history"
                    ? "text-[var(--mnx-accent)] border-b-2 border-[var(--mnx-accent)]"
                    : "text-[var(--mnx-text-muted)] hover:text-[var(--mnx-accent)]"
                )}
              >
                Approval Logs
              </CrmButton>
            </div>

            {/* Tab content - Details */}
            {activeTab === "details" && (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Left Columns - Client & General */}
                <div className="md:col-span-2 space-y-6">
                  {/* General Details */}
                  <div className="bg-mono-card p-6 rounded-2xl border border-[var(--mnx-border)] shadow-sm">
                    <h3 className="mnx-title-3 font-semibold mb-4 text-[var(--mnx-text-strong)]">
                      General Information
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <span className="mnx-label">Document Date</span>
                        <div className="text-sm font-medium flex items-center gap-2 mt-1">
                          <Calendar className="size-4 text-[var(--mnx-accent)]" />
                          <span>{formatDate(invoice.date)}</span>
                        </div>
                      </div>
                      <div>
                        <span className="mnx-label">Due Date</span>
                        <div className="text-sm font-medium flex items-center gap-2 mt-1">
                          <Calendar className="size-4 text-[var(--mnx-accent)]" />
                          <span>{formatDate(invoice.dueDate || "")}</span>
                        </div>
                      </div>
                      <div>
                        <span className="mnx-label">Salesperson / Owner</span>
                        <div className="text-sm font-medium flex items-center gap-2 mt-1">
                          <User className="size-4 text-[var(--mnx-accent)]" />
                          <span>{invoice.salesperson}</span>
                        </div>
                      </div>
                      <div>
                        <span className="mnx-label">SLA Deadline</span>
                        <div className="text-sm font-medium flex items-center gap-2 mt-1">
                          <ShieldAlert className="size-4 text-[var(--mnx-accent)]" />
                          <span className={cn(isSlaBreached && "text-[var(--mnx-danger)] font-bold")}>
                            {formatDate(invoice.slaDeadline || "")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Block */}
                  <div className="bg-mono-card p-6 rounded-2xl border border-[var(--mnx-border)] shadow-sm">
                    <h3 className="mnx-title-3 font-semibold mb-4 text-[var(--mnx-text-strong)]">
                      Customer Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="mnx-label">Customer Name</span>
                        <div className="text-sm font-bold text-[var(--mnx-text-strong)] mt-1">
                          {invoice.customerName}
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <span className="mnx-label">Billing Address</span>
                          <div className="text-xs text-[var(--mnx-text-muted)] mt-1 leading-relaxed whitespace-pre-line">
                            {invoice.billingAddress || "No billing address listed."}
                          </div>
                        </div>
                        <div>
                          <span className="mnx-label">Shipping / Delivery Address</span>
                          <div className="text-xs text-[var(--mnx-text-muted)] mt-1 leading-relaxed whitespace-pre-line">
                            {invoice.shippingAddress || "No shipping address listed."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes Block */}
                  {invoice.notes && (
                    <div className="bg-mono-card p-6 rounded-2xl border border-[var(--mnx-border)] shadow-sm">
                      <h3 className="mnx-title-3 font-semibold mb-2 text-[var(--mnx-text-strong)]">
                        Terms & Notes
                      </h3>
                      <p className="text-xs text-[var(--mnx-text-muted)] leading-relaxed whitespace-pre-line">
                        {invoice.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column - Financial Summary */}
                <div className="space-y-6">
                  <div className="bg-mono-card p-6 rounded-2xl border border-[var(--mnx-border)] shadow-sm mnx-crm-panel-surface ">
                    <h3 className="mnx-title-3 font-semibold mb-4 text-[var(--mnx-text-strong)]">
                      Financial Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm border-b border-[var(--mnx-surface)] pb-2">
                        <span className="text-[var(--mnx-text-muted)]">Subtotal</span>
                        <span className="mnx-numeric font-medium text-[var(--mnx-text-strong)]">
                          {formatAmount(invoice.total - invoice.tax)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-[var(--mnx-surface)] pb-2">
                        <span className="text-[var(--mnx-text-muted)]">GST / Tax</span>
                        <span className="mnx-numeric font-medium text-[var(--mnx-text-strong)]">
                          {formatAmount(invoice.tax)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-[var(--mnx-surface)] pb-2">
                        <span className="text-[var(--mnx-text-muted)]">Discount</span>
                        <span className="mnx-numeric font-medium text-[var(--mnx-text-strong)]">
                          {formatAmount(invoice.discount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-[var(--mnx-text-strong)]">Total</span>
                        <span className="mnx-numeric text-lg font-bold text-[var(--mnx-accent)]">
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
              <div className="bg-mono-card rounded-2xl border border-[var(--mnx-border)] shadow-sm overflow-hidden">
                <CrmTable className="mnx-crm-table w-full">
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
                        <td className="w-16 text-center text-xs text-[var(--mnx-text-muted)]">{idx + 1}</td>
                        <td className="font-medium text-[var(--mnx-text-strong)]">{item.name}</td>
                        <td className="text-right mnx-numeric">{item.qty}</td>
                        <td className="text-right mnx-numeric">{formatAmount(item.rate)}</td>
                        <td className="text-right mnx-numeric">{item.taxPercent}%</td>
                        <td className="text-right font-semibold text-[var(--mnx-text-strong)] mnx-numeric">
                          {formatAmount(item.amount)}
                        </td>
                      </tr>
                    ))}
                    {invoice.items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-sm text-[var(--mnx-text-muted)]">
                          No items listed on this document.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </CrmTable>
              </div>
            )}

            {/* Tab content - History */}
            {activeTab === "history" && (
              <div className="bg-mono-card p-6 rounded-2xl border border-[var(--mnx-border)] shadow-sm">
                <h3 className="mnx-title-3 font-semibold mb-4 text-[var(--mnx-text-strong)] flex items-center gap-2">
                  <History className="size-4 text-[var(--mnx-accent)]" />
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
