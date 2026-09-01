import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card — the structural primitive of the Monolith design system.
 *
 * Every boxed surface on a page is a Card. Padding, radius, border, and the
 * light/dark hierarchy all come from here; callers only choose a `variant`
 * and pass content.
 *
 *   variant="default"   white surface, hairline border, whisper shadow
 *   variant="subtle"    tinted-grey fill, no border, no shadow
 *   variant="outlined"  transparent fill, visible border, no shadow
 *   variant="dark"      the charcoal analytics panel (inverse tokens)
 *
 * `pad` overrides the default padding step: "none" | "sm" | "md" | "lg".
 * `as` swaps the element (e.g. "section", "article") without losing styles.
 */
export type CardVariant = "default" | "subtle" | "outlined" | "dark";
export type CardPad = "none" | "sm" | "md" | "lg";

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
      // @ts-expect-error dynamic tag / ref
      ref={ref}
      className={cn("ds-card", variant === "dark" && "ds-panel--dark", className)}
      data-variant={variant}
      data-pad={pad}
      {...rest}
    />
  );
});
