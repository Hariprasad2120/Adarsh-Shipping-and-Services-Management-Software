import * as React from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DsIcon — the single icon contract for the Monolith design system.
 *
 * - package: lucide-react, always.
 * - size: "sm" (14) | "md" (16, default) | "lg" (18). No other sizes.
 * - stroke: 1.75, fixed. Colour is always currentColor (set it on the parent).
 *
 * Decorative by default (aria-hidden). Pass `label` for a meaningful icon.
 */

export type DsIconSize = "sm" | "md" | "lg";

export interface DsIconProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  icon: LucideIcon | React.ComponentType<LucideProps>;
  size?: DsIconSize;
  label?: string;
}

export function DsIcon({
  icon: Icon,
  size = "md",
  label,
  className,
  ...rest
}: DsIconProps) {
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };

  return (
    <span className={cn("ds-icon", className)} data-size={size} {...a11y} {...rest}>
      <Icon strokeWidth={1.75} />
    </span>
  );
}
