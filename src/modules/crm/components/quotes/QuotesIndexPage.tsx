"use client";

import { CrmButton, CrmInput, CrmTable } from "@/modules/crm/components/workspace/crm-workspace";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "@/modules/notifications/client";
import { cn } from "@/lib/utils";
import { quoteViews } from "@/modules/crm/components/quotes/lib/quote-list-data";
import type { QuoteListStatus, QuoteRecord } from "@/modules/crm/components/quotes/lib/types";
import { QuoteMoreActionsMenu } from "@/modules/crm/components/quotes/QuoteMoreActionsMenu";
import { deleteInvoiceActionBulk } from "@/modules/crm/actions";

const statusTone: Record<Exclude<QuoteListStatus, "all">, string> = {
  draft: "bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)]",
  "pending-manager-approval":
    "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  "pending-customer-approval":
    "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent)]",
  "customer-approved":
    "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  "booking-created":
    "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
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
  const [activeView, setActiveView] = useState<QuoteListStatus>("all");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

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
    return initialQuotes.filter((record) => {
      const matchesView =
        activeView === "all" ? true : record.status === activeView;
      return matchesView && matchesSearch(record, search);
    });
  }, [activeView, search, initialQuotes]);

  const activeViewLabel =
    quoteViews.find((view) => view.id === activeView)?.label ?? "All";

  function toggleSelectAll() {
    setSelectedIds((current) => {
      if (current.size === filteredRecords.length && filteredRecords.length > 0) {
        return new Set();
      }
      return new Set(filteredRecords.map((record) => record.id));
    });
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportRecordsToCsv(records: QuoteRecord[]) {
    const header = ["Date", "Location", "Quote Number", "Reference Number", "Customer Name", "Status", "Amount"];
    const rows = records.map((record) => [
      formatDate(record.date),
      record.location,
      record.quoteNumber,
      record.referenceNumber ?? "",
      record.customerName,
      formatStatus(record.status),
      String(record.amount),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quotes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleBulkDeleteDrafts() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected quote(s)? Only draft quotes can be deleted.`)) return;
    setIsBulkDeleting(true);
    try {
      const res = await deleteInvoiceActionBulk(Array.from(selectedIds));
      if (res.ok) {
        toast.success("Selected quotes deleted.");
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "An error occurred.");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--mnx-surface)] text-[var(--mnx-text-strong)]">
      <div className="flex min-h-screen min-w-0 flex-col">
        <div className="border-b border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <CrmButton
                type="button"
                onClick={() => setFilterOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-4 py-2 text-sm font-semibold text-[var(--mnx-text-strong)]"
              >
                <span>{activeViewLabel} Quotes</span>
                <ChevronDown
                  className={cn(
                    "size-4 text-[var(--mnx-text-muted)] transition-transform",
                    filterOpen ? "rotate-180" : "",
                  )}
                />
              </CrmButton>
            </div>

            <div className="flex items-center gap-2">
              <div ref={filterRef} className="relative">
                <CrmButton
                  type="button"
                  onClick={() => setFilterOpen((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-4 text-sm font-semibold text-[var(--mnx-text-strong)]"
                >
                  <SlidersHorizontal className="size-4 text-[var(--mnx-text-muted)]" />
                  <span>Filter</span>
                  <ChevronDown className="size-4 text-[var(--mnx-text-muted)]" />
                </CrmButton>
                {filterOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-[280px] rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-3 mnx-shadow-panel">
                    <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                      Quote Views
                    </div>
                    <div className="max-h-[360px] space-y-1 overflow-y-auto">
                      {quoteViews.map((view) => {
                        const count =
                          view.id === "all"
                            ? initialQuotes.length
                            : initialQuotes.filter(
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
                className="inline-flex h-10 items-center rounded-xl bg-[var(--mnx-accent)] px-4 text-sm font-medium text-[var(--mnx-text-strong)] transition-colors hover:bg-[var(--mnx-accent)] "
              >
                <Plus className="mr-1 size-4" />
                New
              </Link>
              <QuoteMoreActionsMenu
                items={[
                  {
                    key: "export",
                    label: "Export list",
                    icon: Download,
                    onClick: () => exportRecordsToCsv(filteredRecords),
                  },
                  {
                    key: "bulk-delete",
                    label: isBulkDeleting ? "Deleting..." : `Delete selected (${selectedIds.size})`,
                    icon: Trash2,
                    danger: true,
                    disabled: selectedIds.size === 0 || isBulkDeleting,
                    onClick: handleBulkDeleteDrafts,
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {selectedIds.size > 0 ? (
          <div className="flex items-center justify-between border-b border-[var(--mnx-border)] bg-[var(--mnx-accent)]/5 px-4 py-2.5 sm:px-6">
            <span className="text-sm font-medium text-[var(--mnx-text-strong)]">
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-2">
              <CrmButton
                type="button"
                onClick={() => exportRecordsToCsv(filteredRecords.filter((record) => selectedIds.has(record.id)))}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 text-xs font-semibold text-[var(--mnx-text-strong)]"
              >
                <Download className="size-3.5" />
                Export selected
              </CrmButton>
              <CrmButton
                type="button"
                onClick={handleBulkDeleteDrafts}
                disabled={isBulkDeleting}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--mnx-danger)] px-3 text-xs font-semibold text-[var(--mnx-text-strong)] disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                {isBulkDeleting ? "Deleting..." : "Delete selected"}
              </CrmButton>
            </div>
          </div>
        ) : null}

        <div className="border-b border-[var(--mnx-text-muted)] bg-[var(--mnx-surface)] px-4 py-4">
          <div className="mx-auto w-full max-w-md sm:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--mnx-text-muted)]" />
              <CrmInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quotes"
                className="h-11 w-full rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] pl-10 pr-3 text-sm text-[var(--mnx-text-strong)] outline-none focus:border-[var(--mnx-accent)] focus:ring-2 focus:ring-[var(--mnx-accent)]/20"
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
                className="h-11 w-full rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] pl-10 pr-3 text-sm text-[var(--mnx-text-strong)] outline-none focus:border-[var(--mnx-accent)] focus:ring-2 focus:ring-[var(--mnx-accent)]/20"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 pt-5 sm:p-6 sm:pt-5">
          <div className="overflow-hidden rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] mnx-shadow-panel">
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
                        checked={
                          filteredRecords.length > 0 &&
                          selectedIds.size === filteredRecords.length
                        }
                        onChange={toggleSelectAll}
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
                      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        <CrmInput
                          type="checkbox"
                          aria-label={`Select ${record.quoteNumber}`}
                          checked={selectedIds.has(record.id)}
                          onChange={() => toggleSelectOne(record.id)}
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
