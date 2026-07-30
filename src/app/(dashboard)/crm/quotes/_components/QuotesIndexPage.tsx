"use client";

import {
  CrmButton,
  CrmInput,
  CrmTable,
} from "@/components/monolith/crm-workspace";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  draft: "bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)]",
  "pending-approval": "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  approved: "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]",
  sent: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  "customer-viewed":
    "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  accepted: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  invoiced: "bg-[var(--mnx-accent)]/20 text-[var(--mnx-accent)]",
  declined: "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]",
  rework: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
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

export function QuotesIndexPage({
  initialQuotes,
}: {
  initialQuotes: QuoteRecord[];
}) {
  const router = useRouter();
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
      const matchesView =
        activeView === "all" ? true : record.status === activeView;
      return matchesView && matchesSearch(record, search);
    });
  }, [activeView, search, quotes]);

  const activeViewLabel =
    quoteViews.find((view) => view.id === activeView)?.label ?? "All";

  return (
    <div className="min-h-screen bg-[var(--mnx-surface)] text-[var(--mnx-text-strong)]">
      <div className="flex min-h-screen min-w-0 flex-col">
        <div className="border-b border-[var(--mnx-border)] bg-mono-card px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <CrmButton
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--mnx-border)] bg-mono-card px-4 py-2 text-sm font-semibold text-[var(--mnx-text-strong)]"
              >
                <span>{activeViewLabel} Quotes</span>
              </CrmButton>
            </div>

            <div className="flex items-center gap-2">
              <div ref={filterRef} className="relative">
                <CrmButton
                  type="button"
                  onClick={() => setFilterOpen((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--mnx-border)] bg-mono-card px-4 text-sm font-semibold text-[var(--mnx-text-strong)]"
                >
                  <SlidersHorizontal className="size-4 text-[var(--mnx-text-muted)]" />
                  <span>Filter</span>
                  <ChevronDown className="size-4 text-[var(--mnx-text-muted)]" />
                </CrmButton>
                {filterOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-[280px] rounded-2xl border border-[var(--mnx-border)] bg-mono-card p-3 mnx-shadow-panel">
                    <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                      Quote Views
                    </div>
                    <div className="max-h-[360px] space-y-1 overflow-y-auto">
                      {quoteViews.map((view) => {
                        const count =
                          view.id === "all"
                            ? quotes.length
                            : quotes.filter(
                                (record) => record.status === view.id,
                              ).length;

                        return (
                          <CrmButton
                            key={view.id}
                            type="button"
                            onClick={() => {
                              setActiveView(view.id);
                              setFilterOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                              activeView === view.id
                                ? "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]"
                                : "text-[var(--mnx-text-muted)] hover:bg-[var(--mnx-surface)]",
                            )}
                          >
                            <span>{view.label}</span>
                            <span className="text-xs text-[var(--mnx-text-muted)]">
                              {count}
                            </span>
                          </CrmButton>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <Link
                href="/crm/quotes/new"
                className="inline-flex h-10 items-center rounded-xl bg-[var(--mnx-accent)] px-4 text-sm font-medium text-mono-text transition-colors hover:bg-[var(--mnx-accent)] "
              >
                <Plus className="mr-1 size-4" />
                New
              </Link>
              <CrmButton
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--mnx-border)] bg-mono-card text-[var(--mnx-text-muted)]"
                aria-label="More actions"
              >
                <MoreHorizontal className="size-4" />
              </CrmButton>
            </div>
          </div>
        </div>

        <div className="border-b border-[var(--mnx-text-muted)] bg-mono-card px-4 py-4">
          <div className="mx-auto w-full max-w-md sm:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--mnx-text-muted)]" />
              <CrmInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quotes"
                className="h-11 w-full rounded-xl border border-[var(--mnx-border)] bg-mono-card pl-10 pr-3 text-sm text-[var(--mnx-text-strong)] outline-none focus:border-[var(--mnx-accent)] focus:ring-2 focus:ring-[var(--mnx-accent)]/20"
              />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--mnx-text-muted)]" />
              <CrmInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quotes"
                className="h-11 w-full rounded-xl border border-[var(--mnx-border)] bg-mono-card pl-10 pr-3 text-sm text-[var(--mnx-text-strong)] outline-none focus:border-[var(--mnx-accent)] focus:ring-2 focus:ring-[var(--mnx-accent)]/20"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 pt-5 sm:p-6 sm:pt-5">
          <div className="overflow-hidden rounded-2xl border border-[var(--mnx-border)] bg-mono-card mnx-shadow-panel">
            <div className="flex items-center justify-between border-b border-[var(--mnx-text-muted)] px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--mnx-text-muted)]">
                <SlidersHorizontal className="size-4" />
                <span>{filteredRecords.length} quotes</span>
              </div>
              <div className="text-xs text-[var(--mnx-text-muted)]">
                Sorted by created time
              </div>
            </div>

            <div className="overflow-x-auto">
              <CrmTable className="mnx-crm-table min-w-[860px]">
                <thead className="bg-[var(--mnx-surface)] text-left text-[11px] uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">
                      <CrmInput
                        type="checkbox"
                        aria-label="Select all quotes"
                      />
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
                <tbody className="text-sm">
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="mnx-row-link"
                      onClick={() => router.push(`/crm/quotes/${record.id}`)}
                    >
                      <td className="px-4 py-3">
                        <CrmInput
                          type="checkbox"
                          aria-label={`Select ${record.quoteNumber}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-[var(--mnx-text-muted)]">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-4 py-3 text-[var(--mnx-text-muted)]">
                        {record.location}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/crm/quotes/${record.id}`}
                          className="font-semibold text-[var(--mnx-accent)] hover:underline"
                        >
                          {record.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--mnx-text-muted)]">
                        {record.referenceNumber ?? "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--mnx-text-strong)]">
                        {record.customerName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            statusTone[record.status],
                          )}
                        >
                          {formatStatus(record.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--mnx-text-strong)]">
                        {formatAmount(record.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/crm/quotes/${record.id}`}
                          className="inline-flex rounded-lg p-1 text-[var(--mnx-text-muted)] hover:bg-[var(--mnx-surface)]"
                          aria-label={`Open ${record.quoteNumber}`}
                        >
                          <ChevronRight className="ml-auto size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-16 text-center text-sm text-[var(--mnx-text-muted)]"
                      >
                        No quotes found for this view.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </CrmTable>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
