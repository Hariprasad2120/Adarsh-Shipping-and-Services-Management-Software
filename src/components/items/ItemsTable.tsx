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
      <table className="ds-table">
        <thead>
          <tr>
            <th className="w-8 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={onToggleAll}
                className="rounded accent-[#00cec4]"
                aria-label="Select all items"
              />
            </th>
            <th className="px-3 py-2 text-left whitespace-nowrap">
              Name
            </th>
            <th className="px-3 py-2 text-left whitespace-nowrap">
              SKU
            </th>
            <th className="px-3 py-2 text-left whitespace-nowrap">
              Purchase Description
            </th>
            <th className="px-3 py-2 text-right whitespace-nowrap">
              Purchase Rate
            </th>
            <th className="px-3 py-2 text-left whitespace-nowrap">
              Description
            </th>
            <th className="px-3 py-2 text-right whitespace-nowrap">
              Rate
            </th>
            <th className="px-3 py-2 text-left whitespace-nowrap">
              HSN/SAC
            </th>
            <th className="px-3 py-2 text-left whitespace-nowrap">
              Usage Unit
            </th>
            <th className="w-10 px-3 py-2 text-center">
              <button
                className="text-on-surface-variant hover:text-on-surface"
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
              <td colSpan={10} className="text-center py-16 text-on-surface-variant">
                <Package size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No items found.</p>
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr
                key={item.id}
                className={`ds-row-link transition-colors ${
                  selectedIds.has(item.id) ? "bg-[rgba(0,206,196,0.06)]" : ""
                }`}
              >
                <td className="px-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleSelect(item.id)}
                    className="rounded accent-[#00cec4]"
                    aria-label={`Select ${item.name}`}
                  />
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded border border-[var(--color-outline-variant)] bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                      <Package size={10} />
                    </span>
                    <button
                      onClick={() => router.push(`${basePath}/${item.id}`)}
                      className="text-[#00cec4] hover:underline font-medium text-left"
                    >
                      {item.name}
                    </button>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-on-surface whitespace-nowrap">{item.sku || "—"}</td>
                <td className="px-3 py-1.5 text-on-surface-variant max-w-[160px] truncate">
                  {item.purchaseDescription || "—"}
                </td>
                <td className="px-3 py-1.5 text-right ds-numeric text-on-surface whitespace-nowrap">
                  {formatINRCompact(item.purchaseRate)}
                </td>
                <td className="px-3 py-1.5 text-on-surface-variant max-w-[160px] truncate">
                  {item.description || "—"}
                </td>
                <td className="px-3 py-1.5 text-right ds-numeric text-on-surface whitespace-nowrap">
                  {formatINRCompact(item.rate)}
                </td>
                <td className="px-3 py-1.5 text-on-surface whitespace-nowrap">{item.hsnSac || "—"}</td>
                <td className="px-3 py-1.5 text-on-surface whitespace-nowrap">{item.usageUnit || "—"}</td>
                <td className="px-3 py-1.5 text-center whitespace-nowrap">
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
