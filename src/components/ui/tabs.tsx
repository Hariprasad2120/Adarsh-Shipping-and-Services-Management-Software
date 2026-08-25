"use client";

/**
 * Minimal accessible tab strip. No dedicated tab primitive existed anywhere in
 * the design system prior to this (tracking-dashboard-view.tsx and other HRMS
 * pages stack panels instead) — added here as a reusable ui/ component rather
 * than a one-off, per pages that need a sub-navigation strip inside a single
 * route (e.g. Location & Field Tracking's Overview/Tracker/Visits/... tabs).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
};

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Section tabs"
      className={cn("mnx-tabs", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const idx = items.findIndex((i) => i.value === value);
              const nextIdx = e.key === "ArrowRight" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
              onChange(items[nextIdx].value);
            }}
            className={cn(
              "mnx-tab",
              active ? "is-active" : null,
            )}
          >
            {item.icon}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}
