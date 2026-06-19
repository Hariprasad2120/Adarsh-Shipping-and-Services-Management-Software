"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Copy,
  FileOutput,
  FileText,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Share2,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { quoteDetails } from "../_lib/quote-details-data";
import { quoteViews } from "../_lib/quote-list-data";
import { bankAccounts } from "../_lib/mock-data";
import type { QuoteDetailRecord, QuoteListStatus, QuoteRecord } from "../_lib/types";
import { ApprovalActionBar, ApprovalLogList, type ApprovalCaps, type ApprovalLogEntry } from "@/components/crm/ApprovalActionBar";
import type { ApprovalStatus } from "@/modules/crm/approval-workflow";
import { toast } from "sonner";
import { deleteInvoiceAction } from "@/modules/crm/actions";
import { getStateCodeForLocation } from "../_lib/gst-states";

// Map mock QuoteListStatus (lowercase-hyphenated) → ApprovalStatus (UPPER_SNAKE)
function toApprovalStatus(s: Exclude<QuoteListStatus, "all">): ApprovalStatus {
  const map: Record<string, ApprovalStatus> = {
    draft: "DRAFT",
    "pending-approval": "PENDING_APPROVAL",
    approved: "APPROVED",
    sent: "SENT",
    "customer-viewed": "CUSTOMER_VIEWED",
    accepted: "ACCEPTED",
    invoiced: "INVOICED",
    declined: "DECLINED",
    rework: "REWORK",
  };
  return map[s] ?? "DRAFT";
}

const statusTone: Record<Exclude<QuoteListStatus, "all">, string> = {
  draft: "bg-[#f1f3f5] text-[#495057]",
  "pending-approval": "bg-amber-100 text-amber-700",
  approved: "bg-sky-100 text-sky-700",
  sent: "bg-indigo-100 text-indigo-700",
  "customer-viewed": "bg-violet-100 text-violet-700",
  accepted: "bg-emerald-100 text-emerald-700",
  invoiced: "bg-cyan-100 text-cyan-700",
  declined: "bg-rose-100 text-rose-700",
  rework: "bg-orange-100 text-orange-700",
};

function formatStatus(status: Exclude<QuoteListStatus, "all">) {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB").format(new Date(value));
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

function matchesSearch(record: QuoteRecord, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [record.quoteNumber, record.customerName, record.referenceNumber ?? "", record.location].some((value) =>
    value.toLowerCase().includes(normalized),
  );
}

export function QuoteDetailsPage({
  quote,
  caps,
  allQuotes,
}: {
  quote: QuoteDetailRecord & { approvalLogs?: ApprovalLogEntry[]; reworkNote?: string | null; slaDeadline?: string | null };
  caps?: ApprovalCaps;
  allQuotes?: QuoteRecord[];
}) {
  const defaultCaps: ApprovalCaps = {
    canSubmit: false,
    canApprove: false,
    canSend: false,
    canManage: false,
    canAdminRestore: false,
  };
  const effectiveCaps = caps ?? defaultCaps;
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<QuoteListStatus>("all");
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [detailMode, setDetailMode] = useState<"details" | "pdf">("details");
  const [displayCurrency, setDisplayCurrency] = useState<"INR" | "foreign">("INR");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this draft quote?")) {
      setIsDeleting(true);
      try {
        const res = await deleteInvoiceAction(quote.id);
        if (res.ok) {
          toast.success("Quote deleted successfully.");
          window.location.href = "/crm/quotes";
        } else {
          toast.error(res.error || "Failed to delete quote.");
        }
      } catch (err) {
        const error = err as Error;
        toast.error(error.message || "An error occurred.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const listData = allQuotes || quoteDetails;
  const filteredQuotes = useMemo(() => {
    return listData.filter((record) => {
      const matchesView = activeView === "all" ? true : record.status === activeView;
      return matchesView && matchesSearch(record as QuoteRecord, search);
    });
  }, [activeView, search, listData]);

  const activeViewLabel = quoteViews.find((view) => view.id === activeView)?.label ?? "All";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#1f2937]">
      <div className="flex min-h-screen flex-col xl:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-[#dfe6f3] bg-white xl:w-[360px] xl:border-b-0 xl:border-r">
          <div className="border-b border-[#e8edf5] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[#dbe3f0] bg-white px-4 py-2 text-sm font-semibold text-[#1f2937]"
              >
                <span>{activeViewLabel} Quotes</span>
                <ChevronDown className="size-4 text-[#71809a]" />
              </button>
              <div className="flex items-center gap-2">
                <Link
                  href="/crm/quotes/new"
                  className="inline-flex size-10 items-center justify-center rounded-xl bg-[#00cec4] text-white transition-colors hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)]"
                  aria-label="Create quote"
                >
                  <Plus className="size-4" />
                </Link>
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
              {quoteViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    activeView === view.id ? "bg-[#00cec4]/10 text-[#00968f]" : "bg-[#f6f8fc] text-[#66758f] hover:bg-[#edf2f9]",
                  )}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-[#eef2f7] px-4 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#9aa3b2]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quotes"
                className="h-11 w-full rounded-xl border border-[#dbe3f0] bg-white pl-10 pr-3 text-sm text-[#1f2937] outline-none focus:border-[#00cec4] focus:ring-2 focus:ring-[#00cec4]/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredQuotes.map((record) => {
              const active = record.id === quote.id;
              return (
                <Link
                  key={record.id}
                  href={`/crm/quotes/${record.id}`}
                  className={cn(
                    "block border-b border-[#eef2f7] px-4 py-4 transition-colors",
                    active ? "bg-[#00cec4]/5 shadow-[inset_3px_0_0_#00cec4]" : "hover:bg-[#fafcff]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 block size-4 rounded border border-[#cdd6e3] bg-white" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-[#1f2937]">{record.customerName}</p>
                        <span className="shrink-0 text-sm font-semibold text-[#1f2937]">{formatAmount(record.amount)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#71809a]">
                        <span className="font-medium text-[#00cec4]">{record.quoteNumber}</span>
                        <span className="size-1 rounded-full bg-[#cbd5e1]" />
                        <span>{formatDate(record.date)}</span>
                      </div>
                      <div className="mt-3">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", statusTone[record.status as Exclude<QuoteListStatus, "all">])}>
                          {formatStatus(record.status as Exclude<QuoteListStatus, "all">)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b border-[#dfe6f3] bg-white">
            <div className="border-b border-[#edf1f6] px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-start gap-3">
                  <Link
                    href="/crm/quotes"
                    className="mt-1 inline-flex size-10 items-center justify-center rounded-xl border border-[#dbe3f0] bg-white text-[#5d6c86]"
                    aria-label="Back to quote list"
                  >
                    <ArrowLeft className="size-4" />
                  </Link>
                  <div>
                    <p className="text-sm text-[#5c6a82]">Location: {quote.location}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#0f172a]">{quote.quoteNumber}</h1>
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", statusTone[quote.status])}>
                        {formatStatus(quote.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[#6b7a90]">Total {formatAmount(quote.total)} for {quote.customerName}</p>
              </div>
            </div>

            <div className="px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-2 text-[#334155]">
                { (quote.status === "draft" || quote.status === "rework" || (quote.status === "pending-approval" && effectiveCaps.canApprove)) ? (
                  <Link
                    href={`/crm/quotes/${quote.id}/edit`}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d7deeb] bg-white px-3.5 text-sm font-medium text-[#334155] shadow-sm hover:bg-[#f8fafc]"
                  >
                    <Pencil className="size-4 text-[#607089]" />
                    <span>Edit</span>
                  </Link>
                ) : (
                  <button
                    disabled
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d7deeb] bg-white px-3.5 text-sm font-medium text-[#334155] shadow-sm opacity-50 cursor-not-allowed"
                  >
                    <Pencil className="size-4 text-[#607089]" />
                    <span>Edit</span>
                  </button>
                ) }
                <ToolbarButton icon={Mail} label="Mails" dropdown />
                <ToolbarButton icon={Share2} label="Share" />
                <ToolbarButton icon={FileOutput} label="PDF/Print" dropdown />
                {/* Approval actions replace the static buttons */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActionsOpen((current) => !current)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d7deeb] bg-white px-3 text-sm font-medium text-[#334155] shadow-sm hover:bg-[#f8fafc]"
                    aria-label="More quote actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {actionsOpen ? (
                    <div className="absolute right-0 top-12 z-30 w-60 overflow-hidden rounded-2xl border border-[#dfe6f3] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
                      <ActionMenuButton icon={Send} label="Mark As Sent" active />
                      <ActionMenuButton icon={Copy} label="Clone" />
                      {quote.status === "draft" && (
                        <ActionMenuButton
                          icon={Trash2}
                          label={isDeleting ? "Deleting..." : "Delete"}
                          disabled={isDeleting}
                          onClick={handleDelete}
                        />
                      )}
                      <div className="border-t border-[#eef2f7] p-2">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-[#475569] hover:bg-[#f8fafc]"
                        >
                          <span className="flex size-6 items-center justify-center rounded-full border border-[#dbe3f0] text-[#5b6b83]">
                            <ChevronRight className="size-3" />
                          </span>
                          Quote Preferences
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid gap-6">
              {/* Approval action bar */}
              <section className="rounded-3xl border border-[#dfe6f3] bg-white px-5 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
                  Workflow
                </p>
                <ApprovalActionBar
                  invoiceId={quote.id}
                  entityType="QUOTE"
                  approvalStatus={toApprovalStatus(quote.status)}
                  caps={effectiveCaps}
                  reworkNote={null}
                />
              </section>

              <section className="overflow-hidden rounded-3xl border border-[#dfe6f3] bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <div className="border-b border-[#eef2f7] px-5 pt-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-8">
                      <button
                        type="button"
                        onClick={() => setActiveTab("details")}
                        className={cn(
                          "border-b-[3px] pb-4 text-base font-semibold transition-colors",
                          activeTab === "details" ? "border-[#00cec4] text-[#0f172a]" : "border-transparent text-[#64748b]",
                        )}
                      >
                        Quote Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("activity")}
                        className={cn(
                          "border-b-[3px] pb-4 text-base font-medium transition-colors",
                          activeTab === "activity" ? "border-[#00cec4] text-[#0f172a]" : "border-transparent text-[#64748b]",
                        )}
                      >
                        Activity Logs
                      </button>
                    </div>

                    {activeTab === "details" ? (
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center rounded-xl border border-[#dbe3f0] bg-[#f4f6fb] p-1">
                          <button
                            type="button"
                            onClick={() => setDisplayCurrency("INR")}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                              displayCurrency === "INR" ? "bg-[#00cec4] text-white shadow-sm" : "text-[#64748b]"
                            )}
                          >
                            INR
                          </button>
                          <button
                            type="button"
                            onClick={() => setDisplayCurrency("foreign")}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                              displayCurrency === "foreign" ? "bg-[#00cec4] text-white shadow-sm" : "text-[#64748b]"
                            )}
                          >
                            Foreign
                          </button>
                        </div>
                        <div className="inline-flex items-center rounded-xl border border-[#dbe3f0] bg-[#f4f6fb] p-1">
                          <button
                            type="button"
                            onClick={() => setDetailMode("details")}
                            className={cn(
                              "rounded-lg px-5 py-2 text-sm font-medium transition-colors",
                              detailMode === "details" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b]",
                            )}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailMode("pdf")}
                            className={cn(
                              "rounded-lg px-5 py-2 text-sm font-medium transition-colors",
                              detailMode === "pdf" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b]",
                            )}
                          >
                            PDF
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {activeTab === "details" ? (
                  detailMode === "details" ? (
                    <div className="space-y-6 p-5">
                      { (quote.status === "sent" || quote.status === "customer-viewed") && quote.slaDeadline && new Date() > new Date(quote.slaDeadline) && (
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-800 shadow-sm">
                          <span className="ds-icon-badge mt-0.5 flex-shrink-0" style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>
                            <ShieldAlert size={18} />
                          </span>
                          <div>
                            <h4 className="ds-h3 font-semibold text-orange-950">2-Day Response SLA Breached</h4>
                            <p className="text-sm text-orange-900 mt-1">
                              No update has been received from the customer on this quote within 2 business days. The owner and accounts department have been notified.
                            </p>
                          </div>
                        </div>
                      ) }
                      <section className="rounded-2xl border border-[#e7edf5] bg-[#fbfcff] p-4">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <DetailPair label="Quote Number" value={quote.quoteNumber} />
                          <DetailPair label="Quote Date" value={formatDate(quote.date)} />
                          <DetailPair label="Creation Date" value={formatDate(quote.creationDate)} />
                          <DetailPair label="Salesperson" value={quote.salesperson || "-"} />
                          <DetailPair label="Place of Supply" value={quote.placeOfSupply} />
                          <DetailPair label="PDF Template" value={quote.pdfTemplate} />
                        </div>
                      </section>

                      <section className="rounded-2xl border border-[#e7edf5] bg-white p-5">
                        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#7b8798]">Customer Details</div>
                        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-full bg-[#00cec4]/10 text-sm font-semibold text-[#00968f]">
                                {quote.customerInitial}
                              </div>
                              <div>
                                <p className="font-semibold text-[#1f2937]">{quote.customerName}</p>
                                <p className="text-sm text-[#71809a]">{quote.referenceNumber}</p>
                              </div>
                            </div>
                          </div>
                          <AddressBlock label="Billing Address" value={quote.billingAddress} />
                          <AddressBlock label="Shipping Address" value={quote.shippingAddress} />
                        </div>
                      </section>

                      <section className="rounded-2xl border border-[#e7edf5] bg-white">
                        <div className="flex items-center justify-between border-b border-[#eef2f7] px-5 py-4">
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#0f172a]">Items</h2>
                            <span className="rounded-full bg-[#00cec4]/10 px-2.5 py-1 text-xs font-semibold text-[#00968f]">{quote.items.length}</span>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f7fb] px-3 py-1.5 text-xs font-medium text-[#67768e]">
                            <FileText className="size-4" />
                            Details View
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[760px]">
                            <thead className="bg-[#fafbfd] text-left text-[11px] uppercase tracking-[0.12em] text-[#7b8798]">
                              <tr>
                                <th className="px-5 py-3">S.No</th>
                                <th className="px-5 py-3">Item</th>
                                <th className="px-5 py-3">HSN/SAC</th>
                                <th className="px-5 py-3 text-right">Qty</th>
                                <th className="px-5 py-3 text-right">Price</th>
                                <th className="px-5 py-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eef2f7] text-sm">
                              {quote.items.map((item, index) => {
                                const showForeign = displayCurrency === "foreign" && item.currency && item.currency !== "INR";
                                const formattedPrice = showForeign
                                  ? (() => {
                                      try {
                                        return new Intl.NumberFormat("en-US", {
                                          style: "currency",
                                          currency: item.currency,
                                          minimumFractionDigits: 2,
                                        }).format(item.price);
                                      } catch {
                                        return `${item.price.toFixed(2)} ${item.currency}`;
                                      }
                                    })()
                                  : formatAmount(item.price * (item.exchangeRate || 1));

                                const formattedAmountVal = showForeign
                                  ? (() => {
                                      try {
                                        return new Intl.NumberFormat("en-US", {
                                          style: "currency",
                                          currency: item.currency,
                                          minimumFractionDigits: 2,
                                        }).format(item.quantity * item.price);
                                      } catch {
                                        return `${(item.quantity * item.price).toFixed(2)} ${item.currency}`;
                                      }
                                    })()
                                  : formatAmount(item.amount);

                                return (
                                  <tr key={item.id}>
                                    <td className="px-5 py-4 text-[#435066]">{index + 1}</td>
                                    <td className="px-5 py-4">
                                      <div className="font-medium text-[#1f2937]">{item.name}</div>
                                      {item.description ? <div className="mt-1 text-xs text-[#7b8798]">{item.description}</div> : null}
                                      {showForeign && (
                                        <div className="mt-1 text-[11px] text-[#71809a]">
                                          Ex. Rate: 1 {item.currency} = ₹{item.exchangeRate ?? 1} INR
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-5 py-4 text-[#435066]">{item.hsnSac || "—"}</td>
                                    <td className="px-5 py-4 text-right text-[#435066]">{item.quantity}</td>
                                    <td className="px-5 py-4 text-right text-[#435066] font-mono">{formattedPrice}</td>
                                    <td className="px-5 py-4 text-right font-medium text-[#1f2937] font-mono">{formattedAmountVal}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="border-t border-[#eef2f7] px-5 py-5">
                          <div className="ml-auto w-full max-w-[360px] space-y-3 text-sm">
                            <SummaryRow label="Sub Total" value={formatAmount(quote.subtotal)} strong />
                            {quote.taxes.map((tax) => (
                              <SummaryRow key={tax.label} label={tax.label} value={formatAmount(tax.amount)} />
                            ))}
                            <SummaryRow label="Discount" value={formatAmount(quote.discount)} />
                            <SummaryRow label="Adjustment" value={String(quote.adjustment)} />
                            <SummaryRow label="Round Off" value={formatAmount(quote.roundOff)} />
                            <div className="mt-3 flex items-center justify-between border-t border-[#dbe3f0] pt-3 text-base font-semibold text-[#0f172a]">
                              <span>Total</span>
                              <span>{formatAmount(quote.total)}</span>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-[#e7edf5] bg-white p-5">
                        <div className="grid gap-6 xl:grid-cols-2">
                          <div>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7b8798]">Notes</div>
                            <p className="text-sm leading-7 text-[#425167]">{quote.notes || "No notes added."}</p>
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7b8798]">Terms and Conditions</div>
                            <p className="text-sm leading-7 text-[#425167]">{quote.terms || "No Terms and Conditions"}</p>
                          </div>
                        </div>
                        {(() => {
                          const bank = bankAccounts.find((b) => b.id === quote.bankDetailsId);
                          if (!bank) return null;
                          return (
                            <div className="mt-5 border-t border-[#e7edf5] pt-5">
                              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#7b8798]">Bank Details</div>
                              <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                <div><span className="text-[#7b8798]">Bank: </span><span className="font-medium text-[#1f2937]">{bank.bankName}</span></div>
                                <div><span className="text-[#7b8798]">Account Name: </span><span className="font-medium text-[#1f2937]">{bank.accountName}</span></div>
                                <div><span className="text-[#7b8798]">Account No: </span><span className="font-medium text-[#1f2937]">{bank.accountNumber}</span></div>
                                <div><span className="text-[#7b8798]">IFSC: </span><span className="font-medium text-[#1f2937]">{bank.ifsc}</span></div>
                                <div><span className="text-[#7b8798]">Branch: </span><span className="font-medium text-[#1f2937]">{bank.branch}</span></div>
                                {bank.upi && <div><span className="text-[#7b8798]">UPI: </span><span className="font-medium text-[#1f2937]">{bank.upi}</span></div>}
                              </div>
                            </div>
                          );
                        })()}
                      </section>
                    </div>
                  ) : (
                    <QuotePdfPreview quote={quote} displayCurrency={displayCurrency} />
                  )
                ) : (
                  <div className="p-6 bg-white rounded-2xl border border-[#e7edf5]">
                    <ApprovalLogList logs={quote.approvalLogs || []} />
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  dropdown = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  dropdown?: boolean;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d7deeb] bg-white px-3.5 text-sm font-medium text-[#334155] shadow-sm hover:bg-[#f8fafc]"
    >
      <Icon className="size-4 text-[#607089]" />
      <span>{label}</span>
      {dropdown ? <ChevronDown className="size-4 text-[#7a889e]" /> : null}
    </button>
  );
}

function ActionMenuButton({
  icon: Icon,
  label,
  active = false,
  onClick,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors",
        active ? "bg-[#5f8fff] text-white" : "text-[#475569] hover:bg-[#f8fafc]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function DetailPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8fafd] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7b8798]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[#1f2937]">{value}</div>
    </div>
  );
}

function AddressBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-[#f8fafd] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7b8798]">{label}</div>
      <div className="mt-2 text-sm leading-6 text-[#425167]">{value || "-"}</div>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4", strong ? "font-semibold text-[#1f2937]" : "text-[#425167]")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function QuotePdfPreview({ quote, displayCurrency }: { quote: QuoteDetailRecord; displayCurrency: "INR" | "foreign" }) {
  const supplierStateCode = quote.location ? getStateCodeForLocation(quote.location) : "";
  const isSameState = supplierStateCode && supplierStateCode === quote.placeOfSupply;

  return (
    <div className="overflow-auto bg-[#fbfcff] p-6 sm:p-8">
      <div className="mx-auto w-full max-w-[1120px] rounded-[28px] border border-[#dfe6f3] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-10">
        <div className="relative mx-auto max-w-[920px] border border-[#d6dde8] bg-white overflow-hidden">
          <StatusWatermark status={quote.status} />

          <div className="grid grid-cols-[220px_1fr_200px] border-b border-[#b8c1ce]">
            <div className="flex items-center justify-center border-r border-[#b8c1ce] px-4 py-6">
              <Image src="/Logo.png" alt="Adarsh Shipping & Services" width={220} height={72} className="h-auto w-[180px]" />
            </div>
            <div className="px-5 py-5 text-[17px] leading-8 text-black">
              <div className="font-semibold">Adarsh shipping and services</div>
              <div>CHOOLAI</div>
              <div>Chennai Tamil Nadu 600112</div>
              <div>India</div>
              <div>GSTIN 33AAAFA4117G1Z5</div>
            </div>
            <div className="flex items-center justify-center px-5 py-5 text-[34px] tracking-wide text-black">QUOTE</div>
          </div>

          <div className="grid grid-cols-2 border-b border-[#b8c1ce] text-[14px] text-black">
            <div className="border-r border-[#b8c1ce]">
              <PdfMetaRow label="#" value={quote.quoteNumber} />
              <PdfMetaRow label="Quote Date" value={formatDate(quote.date)} />
            </div>
            <div>
              <PdfMetaRow label="Place Of Supply" value={quote.placeOfSupply} />
            </div>
          </div>

          <div className="border-b border-[#b8c1ce] px-3 py-2 text-[13px] font-semibold text-black">Bill To</div>
          <div className="border-b border-[#b8c1ce] px-3 py-2 text-[15px] font-semibold text-[#4c6fff]">{quote.customerName}</div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-[13px] text-black min-w-[920px]">
              <thead>
                <tr className="bg-[#fafbfd]">
                  <PdfCell as="th" className="w-[42px] text-center font-semibold">#</PdfCell>
                  <PdfCell as="th" className="min-w-[200px] text-left font-semibold">Item & Description</PdfCell>
                  <PdfCell as="th" className="w-[90px] text-left font-semibold">Unit</PdfCell>
                  <PdfCell as="th" className="w-[80px] text-left font-semibold">HSN/SAC</PdfCell>
                  <PdfCell as="th" className="w-[70px] text-right font-semibold">Qty</PdfCell>
                  <PdfCell as="th" className="w-[90px] text-right font-semibold">Rate</PdfCell>
                  {isSameState ? (
                    <>
                      <PdfCell as="th" className="w-[50px] text-right font-semibold">%</PdfCell>
                      <PdfCell as="th" className="w-[74px] text-right font-semibold">CGST Amt</PdfCell>
                      <PdfCell as="th" className="w-[50px] text-right font-semibold">%</PdfCell>
                      <PdfCell as="th" className="w-[74px] text-right font-semibold">SGST Amt</PdfCell>
                    </>
                  ) : (
                    <>
                      <PdfCell as="th" className="w-[60px] text-right font-semibold">%</PdfCell>
                      <PdfCell as="th" className="w-[80px] text-right font-semibold">IGST Amt</PdfCell>
                    </>
                  )}
                  <PdfCell as="th" className="w-[100px] text-right font-semibold">Amount</PdfCell>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, index) => {
                  const taxPercent = parseFloat(String(item.tax).match(/[\d.]+/)?.[0] ?? "18");
                  const totalTaxAmount = item.amount * (taxPercent / 100);
                  const unit = item.unit || (index % 2 === 0 ? "Container" : "Shipment");
                  const hsn = item.hsnSac || "—";

                  const showForeign = displayCurrency === "foreign" && item.currency && item.currency !== "INR";
                  const formattedPrice = showForeign
                    ? (() => {
                        try {
                          return new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: item.currency,
                            minimumFractionDigits: 2,
                          }).format(item.price);
                        } catch {
                          return `${item.price.toFixed(2)} ${item.currency}`;
                        }
                      })()
                    : formatPdfMoney(item.price * (item.exchangeRate || 1));

                  const formattedAmountVal = showForeign
                    ? (() => {
                        try {
                          return new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: item.currency,
                            minimumFractionDigits: 2,
                          }).format(item.quantity * item.price);
                        } catch {
                          return `${(item.quantity * item.price).toFixed(2)} ${item.currency}`;
                        }
                      })()
                    : formatPdfMoney(item.amount);

                  return (
                    <tr key={item.id}>
                      <PdfCell className="align-top text-center">{index + 1}</PdfCell>
                      <PdfCell className="align-top">
                        <div>{item.name}</div>
                        {item.description ? <div className="mt-1 text-[12px] text-[#4b5563]">{item.description}</div> : null}
                        {showForeign && (
                          <div className="mt-1 text-[10px] text-[#4b5563]">
                            Ex. Rate: 1 {item.currency} = ₹{item.exchangeRate ?? 1} INR
                          </div>
                        )}
                      </PdfCell>
                      <PdfCell className="align-top">{unit}</PdfCell>
                      <PdfCell className="align-top">{hsn}</PdfCell>
                      <PdfCell className="align-top text-right">{item.quantity.toFixed(2)}</PdfCell>
                      <PdfCell className="align-top text-right font-mono">{formattedPrice}</PdfCell>
                      {isSameState ? (
                        <>
                          <PdfCell className="align-top text-right">{(taxPercent / 2).toFixed(1)}%</PdfCell>
                          <PdfCell className="align-top text-right">{formatPdfMoney(totalTaxAmount / 2)}</PdfCell>
                          <PdfCell className="align-top text-right">{(taxPercent / 2).toFixed(1)}%</PdfCell>
                          <PdfCell className="align-top text-right">{formatPdfMoney(totalTaxAmount / 2)}</PdfCell>
                        </>
                      ) : (
                        <>
                          <PdfCell className="align-top text-right">{taxPercent.toFixed(1)}%</PdfCell>
                          <PdfCell className="align-top text-right">{formatPdfMoney(totalTaxAmount)}</PdfCell>
                        </>
                      )}
                      <PdfCell className="align-top text-right font-mono">{formattedAmountVal}</PdfCell>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={isSameState ? 11 : 9} className="border border-[#b8c1ce] p-0">
                    <div className="ml-auto max-w-[360px] space-y-2 px-4 py-4 text-[13px]">
                      <PdfSummaryRow label="Sub Total" value={formatPdfMoney(quote.subtotal)} strong />
                      {quote.taxes.map((tax) => (
                        <PdfSummaryRow key={tax.label} label={tax.label} value={formatPdfMoney(tax.amount)} />
                      ))}
                      <PdfSummaryRow label="Discount" value={formatPdfMoney(quote.discount)} />
                      <PdfSummaryRow label="Adjustment" value={String(quote.adjustment)} />
                      <PdfSummaryRow label="Round Off" value={formatPdfMoney(quote.roundOff)} />
                      <div className="mt-3 flex items-center justify-between border-t border-[#b8c1ce] pt-3 text-[16px] font-semibold">
                        <span>Total</span>
                        <span>{formatPdfMoney(quote.total)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#b8c1ce] px-4 py-4 text-[13px] text-black">
            <div className="mb-2 font-semibold">Notes</div>
            <div>{quote.notes || "Looking forward for your business."}</div>
          </div>

          <div className="border-t border-[#b8c1ce] px-4 py-4 text-[13px] text-black">
            <div className="mb-2 font-semibold">Terms and Conditions</div>
            <div>{quote.terms || "No Terms and Conditions"}</div>
          </div>
          {(() => {
            const bank = bankAccounts.find((b) => b.id === quote.bankDetailsId);
            if (!bank) return null;
            return (
              <div className="border-t border-[#b8c1ce] px-4 py-4 text-[13px] text-black">
                <div className="mb-2 font-semibold">Bank Details</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div><span className="text-[#6b7280]">Bank: </span>{bank.bankName}</div>
                  <div><span className="text-[#6b7280]">Account Name: </span>{bank.accountName}</div>
                  <div><span className="text-[#6b7280]">Account No: </span>{bank.accountNumber}</div>
                  <div><span className="text-[#6b7280]">IFSC: </span>{bank.ifsc}</div>
                  <div><span className="text-[#6b7280]">Branch: </span>{bank.branch}</div>
                  {bank.upi && <div><span className="text-[#6b7280]">UPI: </span>{bank.upi}</div>}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function PdfMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[170px_1fr] border-b border-[#b8c1ce] last:border-b-0">
      <div className="px-3 py-2">{label}</div>
      <div className="px-3 py-2 font-semibold">: {value}</div>
    </div>
  );
}

function PdfCell({
  as = "td",
  className,
  children,
}: {
  as?: "td" | "th";
  className?: string;
  children: React.ReactNode;
}) {
  const Comp = as;
  return <Comp className={cn("border border-[#b8c1ce] px-2 py-2", className)}>{children}</Comp>;
}

function PdfSummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4", strong ? "font-semibold" : "")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function formatPdfMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const watermarkConfig: Record<
  Exclude<QuoteListStatus, "all">,
  { from: string; via: string; to: string; shadow: string; text: string }
> = {
  draft: {
    from: "#94a3b8",
    via: "#64748b",
    to: "#475569",
    shadow: "rgba(71,85,105,0.55)",
    text: "#f1f5f9",
  },
  "pending-approval": {
    from: "#f59e0b",
    via: "#d97706",
    to: "#b45309",
    shadow: "rgba(180,83,9,0.55)",
    text: "#fffbeb",
  },
  approved: {
    from: "#22c55e",
    via: "#16a34a",
    to: "#15803d",
    shadow: "rgba(21,128,61,0.55)",
    text: "#f0fdf4",
  },
  sent: {
    from: "#60a5fa",
    via: "#3b82f6",
    to: "#2563eb",
    shadow: "rgba(37,99,235,0.55)",
    text: "#eff6ff",
  },
  "customer-viewed": {
    from: "#a78bfa",
    via: "#7c3aed",
    to: "#6d28d9",
    shadow: "rgba(109,40,217,0.55)",
    text: "#f5f3ff",
  },
  accepted: {
    from: "#34d399",
    via: "#059669",
    to: "#047857",
    shadow: "rgba(4,120,87,0.55)",
    text: "#ecfdf5",
  },
  invoiced: {
    from: "#22d3ee",
    via: "#0891b2",
    to: "#0e7490",
    shadow: "rgba(14,116,144,0.55)",
    text: "#ecfeff",
  },
  declined: {
    from: "#f87171",
    via: "#ef4444",
    to: "#dc2626",
    shadow: "rgba(220,38,38,0.55)",
    text: "#fef2f2",
  },
  rework: {
    from: "#fb923c",
    via: "#f97316",
    to: "#ea580c",
    shadow: "rgba(234,88,12,0.55)",
    text: "#fff7ed",
  },
};

function StatusWatermark({ status }: { status: Exclude<QuoteListStatus, "all"> }) {
  const cfg = watermarkConfig[status];
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "20px",
        right: "-32px",
        width: "148px",
        zIndex: 20,
        transform: "rotate(45deg)",
        background: `linear-gradient(180deg, ${cfg.from} 0%, ${cfg.via} 50%, ${cfg.to} 100%)`,
        boxShadow: [
          `0 4px 12px ${cfg.shadow}`,
          `0 1px 3px rgba(0,0,0,0.25)`,
          `inset 0 1px 0 rgba(255,255,255,0.28)`,
          `inset 0 -1px 0 rgba(0,0,0,0.18)`,
        ].join(", "),
        padding: "5px 0 4px",
        textAlign: "center",
        color: cfg.text,
        fontWeight: 700,
        fontSize: "10px",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        textShadow: `0 1px 3px rgba(0,0,0,0.40)`,
        borderTop: `1px solid rgba(255,255,255,0.20)`,
        borderBottom: `1px solid rgba(0,0,0,0.15)`,
      }}
    >
      {formatStatus(status)}
    </div>
  );
}
