import * as React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StatusBadge — a small pill communicating state. Tone sets the colour;
 * the text carries the meaning (never colour alone).
 *
 *   tone="success" | "warning" | "danger" | "info" | "neutral"
 */
export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: React.ReactNode;
}

export function StatusBadge({
  tone = "neutral",
  icon,
  className,
  children,
  ...rest
}: StatusBadgeProps) {
  return (
    <span className={cn("ds-badge", className)} data-tone={tone} {...rest}>
      {icon}
      {children}
    </span>
  );
}

/**
 * TrendBadge — a delta pill: direction arrow + signed value. `value` is a
 * pre-formatted string ("+8%", "-29%"). `direction` drives colour AND the
 * arrow glyph, so meaning survives without colour. Pass "flat" for no change.
 */
export type TrendDirection = "up" | "down" | "flat";

export interface TrendBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  direction: TrendDirection;
  value: string;
  /** screen-reader phrasing, e.g. "up 8% versus previous period" */
  srLabel?: string;
}

const TREND_ICON: Record<TrendDirection, React.ReactNode> = {
  up: <ArrowUp aria-hidden="true" />,
  down: <ArrowDown aria-hidden="true" />,
  flat: <Minus aria-hidden="true" />,
};

export function TrendBadge({
  direction,
  value,
  srLabel,
  className,
  ...rest
}: TrendBadgeProps) {
  return (
    <span
      className={cn("ds-badge", "ds-trend", className)}
      data-dir={direction}
      {...rest}
    >
      {TREND_ICON[direction]}
      <span aria-hidden={srLabel ? "true" : undefined}>{value}</span>
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
    </span>
  );
}
