"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Package, Search } from "lucide-react";
import type { ItemListItem } from "@/lib/items/types";
import { formatINRCompact } from "@/lib/items/formatters";

interface ItemsTableProps {
  items: ItemListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  basePath?: string;
  onEditItem?: (item: ItemListItem) => void;
}

export function ItemsTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  basePath = "/crm/items",
  onEditItem,
}: ItemsTableProps) {
  const router = useRouter();
  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someSelected = items.some((i) => selectedIds.has(i.id));

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10 bg-[#f3f5f8]">
          <tr>
            <th className="w-8 px-3 py-2.5 border-b border-[#d9dee7]">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={onToggleAll}
                className="rounded border-[#d9dee7] accent-[#00cec4]"
                aria-label="Select all items"
              />
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-[#6b7280] uppercase tracking-wide border-b border-[#d9dee7] whitespace-nowrap">
              Name
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-[#6b7280] uppercase tracking-wide border-b border-[#d9dee7] whitespace-nowrap">
              SKU
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-[#6b7280] uppercase tracking-wide border-b border-[#d9dee7] whitespace-nowrap">
              Purchase Description
            </th>
            <th className="px-3 py-2.5 text-right font-semibold text-[#6b7280] uppercase tracking-wide border-b border-[#d9dee7] whitespace-nowrap">
              Purchase Rate
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-[#6b7280] uppercase tracking-wide border-b border-[#d9dee7] whitespace-nowrap">
              Description
            </th>
            <th className="px-3 py-2.5 text-right font-semibold text-[#6b7280] uppercase tracking-wide border-b border-[#d9dee7] whitespace-nowrap">
              Rate
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-[#6b7280] uppercase tracking-wide border-b border-[#d9dee7] whitespace-nowrap">
              HSN/SAC
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-[#6b7280] uppercase tracking-wide border-b border-[#d9dee7] whitespace-nowrap">
              Usage Unit
            </th>
            <th className="w-10 px-3 py-2.5 text-center border-b border-[#d9dee7]">
              <button
                className="text-[#6b7280] hover:text-[#212529]"
                aria-label="Advanced search"
                title="Advanced search"
              >
                <Search size={13} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={10} className="text-center py-16 text-[#6b7280]">
                <Package size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No items found.</p>
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr
                key={item.id}
                className={`border-b border-[#d9dee7] hover:bg-[#f7f9fb] transition-colors ${
                  selectedIds.has(item.id) ? "bg-blue-50" : "bg-white"
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleSelect(item.id)}
                    className="rounded border-[#d9dee7] accent-[#00cec4]"
                    aria-label={`Select ${item.name}`}
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-7 h-7 rounded border border-[#d9dee7] bg-[#f3f5f8] flex items-center justify-center text-[#6b7280]">
                      <Package size={12} />
                    </span>
                    <button
                      onClick={() => router.push(`${basePath}/${item.id}`)}
                      className="text-[#2563eb] hover:underline font-medium text-left"
                    >
                      {item.name}
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2 text-[#212529] whitespace-nowrap">{item.sku || "—"}</td>
                <td className="px-3 py-2 text-[#6b7280] max-w-[160px] truncate">
                  {item.purchaseDescription || "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[#212529] whitespace-nowrap">
                  {formatINRCompact(item.purchaseRate)}
                </td>
                <td className="px-3 py-2 text-[#6b7280] max-w-[160px] truncate">
                  {item.description || "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[#212529] whitespace-nowrap">
                  {formatINRCompact(item.rate)}
                </td>
                <td className="px-3 py-2 text-[#212529] whitespace-nowrap">{item.hsnSac || "—"}</td>
                <td className="px-3 py-2 text-[#212529] whitespace-nowrap">{item.usageUnit || "—"}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  {onEditItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditItem(item);
                      }}
                      className="text-[#00cec4] hover:text-[#00b8af] font-medium transition-colors cursor-pointer"
                      title="Edit item"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
