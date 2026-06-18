"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { quoteViews } from "../_lib/quote-list-data";
import type { QuoteListStatus, QuoteRecord } from "../_lib/types";

const statusTone: Record<Exclude<QuoteListStatus, "all">, string> = {
  draft: "bg-[#f1f3f5] text-[#495057]",
  "pending-approval": "bg-amber-100 text-amber-700",
  approved: "bg-[#00cec4]/10 text-[#00968f]",
  sent: "bg-indigo-100 text-indigo-700",
  "customer-viewed": "bg-violet-100 text-violet-700",
  accepted: "bg-emerald-100 text-emerald-700",
  invoiced: "bg-[#00cec4]/20 text-[#00968f]",
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

  return [
    record.quoteNumber,
    record.customerName,
    record.location,
    record.referenceNumber ?? "",
    formatStatus(record.status),
  ].some((value) => value.toLowerCase().includes(normalized));
}

export function QuotesIndexPage({ initialQuotes }: { initialQuotes: QuoteRecord[] }) {
  const [quotes, setQuotes] = useState<QuoteRecord[]>(initialQuotes);
  const [activeView, setActiveView] = useState<QuoteListStatus>("all");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuotes(initialQuotes);
  }, [initialQuotes]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredRecords = useMemo(() => {
    return quotes.filter((record) => {
      const matchesView = activeView === "all" ? true : record.status === activeView;
      return matchesView && matchesSearch(record, search);
    });
  }, [activeView, search, quotes]);

  const activeViewLabel = quoteViews.find((view) => view.id === activeView)?.label ?? "All";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#1f2937]">
      <div className="flex min-h-screen min-w-0 flex-col">
        <div className="border-b border-[#e5e9f2] bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[#dbe3f0] bg-white px-4 py-2 text-sm font-semibold text-[#1f2937]"
              >
                <span>{activeViewLabel} Quotes</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div ref={filterRef} className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe3f0] bg-white px-4 text-sm font-semibold text-[#1f2937]"
                >
                  <SlidersHorizontal className="size-4 text-[#5d6c86]" />
                  <span>Filter</span>
                  <ChevronDown className="size-4 text-[#71809a]" />
                </button>
                {filterOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-[280px] rounded-2xl border border-[#dfe6f3] bg-white p-3 shadow-[0_16px_48px_rgba(15,23,42,0.14)]">
                    <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7b8798]">
                      Quote Views
                    </div>
                    <div className="max-h-[360px] space-y-1 overflow-y-auto">
                      {quoteViews.map((view) => {
                        const count =
                          view.id === "all" ? quotes.length : quotes.filter((record) => record.status === view.id).length;

                        return (
                          <button
                            key={view.id}
                            type="button"
                            onClick={() => {
                              setActiveView(view.id);
                              setFilterOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                              activeView === view.id ? "bg-[#00cec4]/10 text-[#00968f]" : "text-[#334155] hover:bg-[#f8fafc]",
                            )}
                          >
                            <span>{view.label}</span>
                            <span className="text-xs text-[#94a3b8]">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <Link
                href="/crm/quotes/new"
                className="inline-flex h-10 items-center rounded-xl bg-[#00cec4] px-4 text-sm font-medium text-white transition-colors hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)]"
              >
                <Plus className="mr-1 size-4" />
                New
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
        </div>

        <div className="border-b border-[#edf1f6] bg-white px-4 py-4">
          <div className="mx-auto w-full max-w-md sm:hidden">
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
          <div className="hidden sm:block">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#9aa3b2]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quotes"
                className="h-11 w-full rounded-xl border border-[#dbe3f0] bg-white pl-10 pr-3 text-sm text-[#1f2937] outline-none focus:border-[#00cec4] focus:ring-2 focus:ring-[#00cec4]/20"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="overflow-hidden rounded-2xl border border-[#dfe6f3] bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between border-b border-[#edf1f6] px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#5d6c86]">
                <SlidersHorizontal className="size-4" />
                <span>{filteredRecords.length} quotes</span>
              </div>
              <div className="text-xs text-[#97a2b4]">Sorted by created time</div>
            </div>

            <div className="overflow-x-auto">
              <table className="ds-table min-w-[860px]">
                <thead className="bg-[#fafbfd] text-left text-[11px] uppercase tracking-[0.12em] text-[#7b8798]">
                  <tr>
                    <th className="px-4 py-3">
                      <input type="checkbox" aria-label="Select all quotes" />
                    </th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Quote Number</th>
                    <th className="px-4 py-3">Reference Number</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">
                      <SlidersHorizontal className="ml-auto size-4" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f6] text-sm">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="ds-row-link transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" aria-label={`Select ${record.quoteNumber}`} />
                      </td>
                      <td className="px-4 py-3 text-[#435066]">{formatDate(record.date)}</td>
                      <td className="px-4 py-3 text-[#435066]">{record.location}</td>
                      <td className="px-4 py-3">
                        <Link href={`/crm/quotes/${record.id}`} className="font-semibold text-[#00cec4] hover:underline">
                          {record.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#7b8798]">{record.referenceNumber ?? "-"}</td>
                      <td className="px-4 py-3 font-medium text-[#1f2937]">{record.customerName}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", statusTone[record.status])}>
                          {formatStatus(record.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#1f2937]">{formatAmount(record.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/crm/quotes/${record.id}`}
                          className="inline-flex rounded-lg p-1 text-[#9aa3b2] hover:bg-[#f3f6fb]"
                          aria-label={`Open ${record.quoteNumber}`}
                        >
                          <ChevronRight className="ml-auto size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center text-sm text-[#7b8798]">
                        No quotes found for this view.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
