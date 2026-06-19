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
    <div className="sticky bottom-0 z-10 bg-white border-t border-[#d9dee7] px-4 py-2 flex items-center justify-between text-xs text-[#6b7280]">
      <div className="flex items-center gap-2">
        <span>Total Count:</span>
        <span className="font-semibold text-[#212529]">{total}</span>
        <button className="text-[#2563eb] hover:underline ml-2">View</button>
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
            className="border border-[#d9dee7] rounded px-2 py-1 text-xs text-[#212529] bg-white focus:outline-none focus:border-[#00cec4]"
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
          className="p-1 rounded border border-[#d9dee7] hover:bg-[#f3f5f8] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        <span className="min-w-[60px] text-center">
          {total === 0 ? "0" : `${start} - ${end}`}
        </span>

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1 rounded border border-[#d9dee7] hover:bg-[#f3f5f8] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
