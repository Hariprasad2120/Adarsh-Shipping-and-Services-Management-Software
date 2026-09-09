"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Chip — a small tappable suggestion / quick-fill pill.
 *
 * Use for one-tap inserts (response templates, saved phrases), quick filter
 * toggles, or removable tags. It is a real <button>; for a static, non-tappable
 * label use <Badge> instead.
 */
export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Renders in the selected/active state. */
  active?: boolean;
  icon?: React.ReactNode;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { className, active, icon, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-slot="chip"
      data-active={active ? "true" : undefined}
      className={cn("mnx-chip", className)}
      {...props}
    >
      {icon ? <span className="mnx-chip-icon" aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
});
