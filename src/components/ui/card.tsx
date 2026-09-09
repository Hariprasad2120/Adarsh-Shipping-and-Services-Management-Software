import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card — the single canonical surface primitive for the whole Monolith Engine.
 *
 * THREE families only (see Admin ▸ Design System ▸ 03 Cards):
 *
 *   variant="interactive"  3D / elevated. The whole surface is the control
 *                          (module tiles, primary dashboard actions). Subtle
 *                          lift + focus ring on hover/focus. Add `interactive`
 *                          or render `as="button"/"a"` for real semantics.
 *
 *   variant="flat"         2D. Repeatable stat / KPI / catalogue tiles and
 *                          informational sections. Border, restrained shadow,
 *                          no elevation, no hover motion. (DEFAULT)
 *
 *   variant="plain"        Quiet container. Groups content / forms / settings /
 *                          queues / empty states. No shadow, no hover.
 *
 * `pad`  none | sm | md (default) | lg  — density only, geometry is fixed.
 * `as`   swap the element without losing styles.
 *
 * Backwards compatible: <Card> with no props renders exactly as before
 * (`.mnx-panel`, flat treatment).
 */
export type CardVariant = "interactive" | "flat" | "plain";
export type CardPad = "none" | "sm" | "md" | "lg";

type CardElement = "div" | "section" | "article" | "aside" | "button" | "a";

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  pad?: CardPad;
  as?: CardElement;
  /** Force the interactive hover/focus affordance without changing the visual family. */
  interactive?: boolean;
  href?: string;
}

export const Card = React.forwardRef<HTMLElement, CardProps>(function Card(
  { className, variant, pad, as = "div", interactive, ...props },
  ref,
) {
  const Tag = as as "div";
  const isInteractive = interactive ?? variant === "interactive";
  return (
    <Tag
      // @ts-expect-error — dynamic tag keeps a single ref surface
      ref={ref}
      className={cn("mnx-panel", className)}
      data-slot="card"
      data-variant={variant ?? "flat"}
      data-pad={pad}
      data-interactive={isInteractive ? "true" : undefined}
      {...props}
    />
  );
});

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-card-content", className)} {...props} />;
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-card-header", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("mnx-card-title", className)} {...props} />;
}
