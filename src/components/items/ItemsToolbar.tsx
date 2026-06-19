"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, ChevronDown, Search, X } from "lucide-react";
import type { ItemFilter } from "@/lib/items/types";

const FILTER_LABELS: Record<ItemFilter, string> = {
  all: "All Items",
  active: "Active Items",
  inactive: "Inactive Items",
  goods: "Goods",
  services: "Services",
  sales: "Sales Items",
  purchase: "Purchase Items",
};

const FILTER_OPTIONS: ItemFilter[] = ["all", "active", "inactive", "goods", "services", "sales", "purchase"];

const MORE_ACTIONS = [
  "Import Items",
  "Export Items",
  "Preferences",
  "Refresh",
  "---",
  "Mark as Active",
  "Mark as Inactive",
  "Delete Selected",
];

interface ItemsToolbarProps {
  filter: ItemFilter;
  onFilterChange: (f: ItemFilter) => void;
  search: string;
  onSearchChange: (s: string) => void;
  selectedCount: number;
  newPath?: string;
  onAction?: (action: string) => void;
}

export function ItemsToolbar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  selectedCount,
  newPath = "/crm/items/new",
  onAction,
}: ItemsToolbarProps) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="bg-white border-b border-[#d9dee7]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 gap-3">
        {/* Left: filter dropdown + selected count */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-1 font-semibold text-sm text-[#212529] hover:text-[#00cec4] transition-colors"
              aria-haspopup="listbox"
              aria-expanded={filterOpen}
            >
              {FILTER_LABELS[filter]}
              <ChevronDown size={14} className={`transition-transform ${filterOpen ? "rotate-180" : ""}`} />
            </button>

            {filterOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-30 bg-white border border-[#d9dee7] rounded shadow-lg min-w-[160px] py-1"
                role="listbox"
              >
                {FILTER_OPTIONS.map((f) => (
                  <button
                    key={f}
                    role="option"
                    aria-selected={filter === f}
                    onClick={() => {
                      onFilterChange(f);
                      setFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#f7f9fb] transition-colors ${
                      filter === f ? "text-[#00cec4] font-semibold" : "text-[#212529]"
                    }`}
                  >
                    {FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCount > 0 && (
            <span className="text-xs bg-[#00cec4]/10 text-[#00cec4] font-semibold px-2 py-0.5 rounded">
              {selectedCount} selected
            </span>
          )}
        </div>

        {/* Right: New + More */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => router.push(newPath)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00cec4] hover:bg-[#00b8af] text-white text-xs font-semibold rounded transition-colors"
            aria-label="Create new item"
          >
            <Plus size={14} />
            New
          </button>

          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen((o) => !o)}
              className="p-1.5 border border-[#d9dee7] rounded hover:bg-[#f3f5f8] text-[#6b7280] hover:text-[#212529] transition-colors"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
            >
              <MoreHorizontal size={16} />
            </button>

            {moreOpen && (
              <div
                className="absolute top-full right-0 mt-1 z-30 bg-white border border-[#d9dee7] rounded shadow-lg min-w-[180px] py-1"
                role="menu"
              >
                {MORE_ACTIONS.map((action, i) =>
                  action === "---" ? (
                    <hr key={i} className="border-[#d9dee7] my-1" />
                  ) : (
                    <button
                      key={action}
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        if (onAction) onAction(action);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#f7f9fb] transition-colors ${
                        action === "Delete Selected" ? "text-[#fe4242]" : "text-[#212529]"
                      }`}
                    >
                      {action}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-2.5 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b7280]" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-8 pr-8 py-1.5 text-xs border border-[#d9dee7] rounded bg-white focus:outline-none focus:border-[#00cec4] text-[#212529] placeholder-[#6b7280]"
            aria-label="Search items"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#212529]"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
