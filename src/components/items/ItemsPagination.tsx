"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ItemsPaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export function ItemsPagination({
  total,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
}: ItemsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="sticky bottom-0 z-10 bg-surface border-t border-[var(--color-outline-variant)] px-4 py-2 flex items-center justify-between text-xs text-on-surface-variant">
      <div className="flex items-center gap-2">
        <span>Total Count:</span>
        <span className="font-semibold text-on-surface">{total}</span>
        <button className="text-[#00cec4] hover:underline ml-2">View</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <label htmlFor="perPage" className="sr-only">
            Items per page
          </label>
          <select
            id="perPage"
            value={perPage}
            onChange={(e) => {
              onPerPageChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="border border-[var(--color-outline-variant)] rounded-xl px-2 py-1 text-xs text-on-surface bg-surface focus:outline-none focus:border-[#00cec4]"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-1 rounded-lg border border-[var(--color-outline-variant)] hover:bg-surface-container-low text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        <span className="min-w-[60px] text-center text-on-surface">
          {total === 0 ? "0" : `${start} - ${end}`}
        </span>

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1 rounded-lg border border-[var(--color-outline-variant)] hover:bg-surface-container-low text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
