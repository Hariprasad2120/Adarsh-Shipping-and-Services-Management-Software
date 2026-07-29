"use client";

import { CrmButton, CrmTable } from "@/components/monolith/crm-workspace";

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
    <div className="flex items-start py-2.5 border-b border-[var(--mnx-border)] last:border-0">
      <dt className="w-48 flex-shrink-0 text-xs text-[var(--mnx-text-muted)] font-medium uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-[var(--mnx-text-strong)]">{value ?? "—"}</dd>
    </div>
  );
}

export function ItemDetailPage({ item, backPath = "/crm/items" }: ItemDetailPageProps) {
  const router = useRouter();

  return (
    <div className="mnx-item-workspace h-full bg-[var(--mnx-surface)] overflow-y-auto">
      {/* Header */}
      <div className="bg-mono-card border-b border-[var(--mnx-border)] px-6 py-3 flex items-center gap-3">
        <CrmButton
          onClick={() => router.push(backPath)}
          className="p-1.5 rounded border border-[var(--mnx-border)] hover:bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)] hover:text-[var(--mnx-text-strong)] transition-colors"
          aria-label="Back to items"
        >
          <ArrowLeft size={14} />
        </CrmButton>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded border border-[var(--mnx-border)] bg-[var(--mnx-surface)] flex items-center justify-center text-[var(--mnx-text-muted)]">
            <Package size={16} />
          </span>
          <div>
            <h1 className="text-sm font-semibold text-[var(--mnx-text-strong)]">{item.name}</h1>
            <p className="text-xs text-[var(--mnx-text-muted)]">{item.id}</p>
          </div>
        </div>
        <span
          className={`ml-auto text-xs px-2 py-0.5 rounded font-medium ${
            item.status === "Active"
              ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
              : "bg-mono-soft text-mono-muted"
          }`}
        >
          {item.status}
        </span>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Overview */}
        <div className="bg-mono-card border border-[var(--mnx-border)] rounded">
          <div className="px-4 py-2.5 border-b border-[var(--mnx-border)] flex items-center gap-2">
            <Tag size={13} className="text-[var(--mnx-accent)]" />
            <span className="text-xs font-semibold text-[var(--mnx-text-strong)] uppercase tracking-wide">Item Details</span>
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
        <div className="bg-mono-card border border-[var(--mnx-border)] rounded">
          <div className="px-4 py-2.5 border-b border-[var(--mnx-border)] flex items-center gap-2">
            <Hash size={13} className="text-[var(--mnx-accent)]" />
            <span className="text-xs font-semibold text-[var(--mnx-text-strong)] uppercase tracking-wide">Sales Information</span>
          </div>
          <dl className="px-4">
            <Row label="Rate" value={<span className="font-mono font-semibold">{formatINRCompact(item.rate)}</span>} />
            <Row label="Description" value={item.description || "—"} />
          </dl>
        </div>

        {/* Purchase */}
        <div className="bg-mono-card border border-[var(--mnx-border)] rounded">
          <div className="px-4 py-2.5 border-b border-[var(--mnx-border)] flex items-center gap-2">
            <Hash size={13} className="text-[var(--mnx-accent)]" />
            <span className="text-xs font-semibold text-[var(--mnx-text-strong)] uppercase tracking-wide">Purchase Information</span>
          </div>
          <dl className="px-4">
            <Row label="Purchase Rate" value={<span className="font-mono font-semibold">{formatINRCompact(item.purchaseRate)}</span>} />
            <Row label="Purchase Description" value={item.purchaseDescription || "—"} />
          </dl>
        </div>

        {/* Price List */}
        {item.priceList && item.priceList.length > 0 && (
          <div className="bg-mono-card border border-[var(--mnx-border)] rounded">
            <div className="px-4 py-2.5 border-b border-[var(--mnx-border)] flex items-center gap-2">
              <Hash size={13} className="text-[var(--mnx-accent)]" />
              <span className="text-xs font-semibold text-[var(--mnx-text-strong)] uppercase tracking-wide">Multi-Currency Price List</span>
            </div>
            <div className="px-4 py-3">
              <div className="overflow-x-auto">
                <CrmTable className="w-full text-left text-xs text-[var(--mnx-text-strong)]">
                  <thead>
                    <tr className="border-b border-[var(--mnx-border)] text-[10px] uppercase tracking-wider text-mono-muted font-semibold">
                      <th className="pb-2">Currency</th>
                      <th className="pb-2">Exchange Rate (1 Foreign Unit = X INR)</th>
                      <th className="pb-2 text-right">Selling Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--mnx-border)]">
                    {item.priceList.map((pl) => (
                      <tr key={pl.currency} className="hover:bg-mono-soft">
                        <td className="py-2 font-medium text-mono-muted">{pl.currency}</td>
                        <td className="py-2 text-mono-muted font-mono">{pl.exchangeRate.toFixed(4)}</td>
                        <td className="py-2 text-right font-mono font-semibold text-mono-muted">
                          {pl.currency} {pl.customPrice?.toFixed(2) ?? (item.rate / pl.exchangeRate).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </CrmTable>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
