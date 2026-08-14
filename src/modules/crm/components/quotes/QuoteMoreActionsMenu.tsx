"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { CrmButton } from "@/modules/crm/components/workspace/crm-workspace";
import { cn } from "@/lib/utils";

export type QuoteMoreActionItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

export function QuoteMoreActionsMenu({
  items,
  align = "right",
  triggerClassName,
}: {
  items: QuoteMoreActionItem[];
  align?: "left" | "right";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <CrmButton
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          triggerClassName ??
          "inline-flex size-10 items-center justify-center rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)]"
        }
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="size-4" />
      </CrmButton>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute top-12 z-30 w-56 overflow-hidden rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-1 mnx-shadow-panel",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <CrmButton
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  item.danger
                    ? "text-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)]"
                    : "text-[var(--mnx-text-muted)] hover:bg-[var(--mnx-surface)]",
                  item.disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </CrmButton>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
