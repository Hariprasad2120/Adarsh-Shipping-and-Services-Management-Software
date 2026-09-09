/**
 * DEPRECATED SHIM — do not import from here in new code.
 *
 * There is now exactly one canonical Card in the Monolith design system:
 *
 *   import { Card } from "@/components/ui";   // variant="interactive" | "flat" | "plain"
 *
 * The dashboard-widget kit's `Card` used to own its own border / surface /
 * shadow. That is gone: this shim renders the canonical `.mnx-panel` surface
 * (so it inherits the three-family treatment and theme tokens) and keeps only
 * the `.ds-card` layout helper (padding + vertical rhythm) from
 * dashboard-widgets.css. Legacy `default | subtle | outlined | dark` variant
 * names map onto the three approved families.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "default" | "subtle" | "outlined" | "dark";
export type CardPad = "none" | "sm" | "md" | "lg";

const VARIANT_MAP: Record<CardVariant, "flat" | "plain"> = {
  default: "flat",
  subtle: "plain",
  outlined: "plain",
  dark: "plain",
};

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  pad?: CardPad;
  as?: "div" | "section" | "article" | "aside";
}

export const Card = React.forwardRef<HTMLElement, CardProps>(function Card(
  { variant = "default", pad, as = "div", className, ...rest },
  ref,
) {
  const Tag = as as "div";
  return (
    <Tag
      // @ts-expect-error dynamic tag / single ref surface
      ref={ref}
      className={cn("mnx-panel", "ds-card", variant === "dark" && "ds-panel--dark", className)}
      data-slot="card"
      data-variant={VARIANT_MAP[variant]}
      data-legacy-variant={variant}
      data-pad={pad}
      {...rest}
    />
  );
});
