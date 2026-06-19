"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, Tag, Hash } from "lucide-react";
import type { ItemListItem } from "@/lib/items/types";
import { formatINRCompact } from "@/lib/items/formatters";

interface ItemDetailPageProps {
  item: ItemListItem;
  backPath?: string;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start py-2.5 border-b border-[#d9dee7] last:border-0">
      <dt className="w-48 flex-shrink-0 text-xs text-[#6b7280] font-medium uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-[#212529]">{value ?? "—"}</dd>
    </div>
  );
}

export function ItemDetailPage({ item, backPath = "/crm/items" }: ItemDetailPageProps) {
  const router = useRouter();

  return (
    <div className="h-full bg-[#f7f9fb] overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-[#d9dee7] px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push(backPath)}
          className="p-1.5 rounded border border-[#d9dee7] hover:bg-[#f3f5f8] text-[#6b7280] hover:text-[#212529] transition-colors"
          aria-label="Back to items"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded border border-[#d9dee7] bg-[#f3f5f8] flex items-center justify-center text-[#6b7280]">
            <Package size={16} />
          </span>
          <div>
            <h1 className="text-sm font-semibold text-[#212529]">{item.name}</h1>
            <p className="text-xs text-[#6b7280]">{item.id}</p>
          </div>
        </div>
        <span
          className={`ml-auto text-xs px-2 py-0.5 rounded font-medium ${
            item.status === "Active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {item.status}
        </span>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Overview */}
        <div className="bg-white border border-[#d9dee7] rounded">
          <div className="px-4 py-2.5 border-b border-[#d9dee7] flex items-center gap-2">
            <Tag size={13} className="text-[#00cec4]" />
            <span className="text-xs font-semibold text-[#212529] uppercase tracking-wide">Item Details</span>
          </div>
          <dl className="px-4">
            <Row label="Name" value={item.name} />
            <Row label="Type" value={item.type} />
            <Row label="SKU" value={item.sku || "—"} />
            <Row label="HSN/SAC" value={item.hsnSac || "—"} />
            <Row label="Usage Unit" value={item.usageUnit || "—"} />
            <Row label="Tax Preference" value={item.taxPreference} />
          </dl>
        </div>

        {/* Sales */}
        <div className="bg-white border border-[#d9dee7] rounded">
          <div className="px-4 py-2.5 border-b border-[#d9dee7] flex items-center gap-2">
            <Hash size={13} className="text-[#00cec4]" />
            <span className="text-xs font-semibold text-[#212529] uppercase tracking-wide">Sales Information</span>
          </div>
          <dl className="px-4">
            <Row label="Rate" value={<span className="font-mono font-semibold">{formatINRCompact(item.rate)}</span>} />
            <Row label="Description" value={item.description || "—"} />
          </dl>
        </div>

        {/* Purchase */}
        <div className="bg-white border border-[#d9dee7] rounded">
          <div className="px-4 py-2.5 border-b border-[#d9dee7] flex items-center gap-2">
            <Hash size={13} className="text-[#00cec4]" />
            <span className="text-xs font-semibold text-[#212529] uppercase tracking-wide">Purchase Information</span>
          </div>
          <dl className="px-4">
            <Row label="Purchase Rate" value={<span className="font-mono font-semibold">{formatINRCompact(item.purchaseRate)}</span>} />
            <Row label="Purchase Description" value={item.purchaseDescription || "—"} />
          </dl>
        </div>

        {/* Price List */}
        {item.priceList && item.priceList.length > 0 && (
          <div className="bg-white border border-[#d9dee7] rounded">
            <div className="px-4 py-2.5 border-b border-[#d9dee7] flex items-center gap-2">
              <Hash size={13} className="text-[#00cec4]" />
              <span className="text-xs font-semibold text-[#212529] uppercase tracking-wide">Multi-Currency Price List</span>
            </div>
            <div className="px-4 py-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#374151]">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                      <th className="pb-2">Currency</th>
                      <th className="pb-2">Exchange Rate (1 Foreign Unit = X INR)</th>
                      <th className="pb-2 text-right">Selling Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb]">
                    {item.priceList.map((pl) => (
                      <tr key={pl.currency} className="hover:bg-gray-50/50">
                        <td className="py-2 font-medium text-gray-900">{pl.currency}</td>
                        <td className="py-2 text-gray-500 font-mono">{pl.exchangeRate.toFixed(4)}</td>
                        <td className="py-2 text-right font-mono font-semibold text-gray-900">
                          {pl.currency} {pl.customPrice?.toFixed(2) ?? (item.rate / pl.exchangeRate).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
