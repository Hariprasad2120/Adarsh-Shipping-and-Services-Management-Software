import * as React from "react";
import { cn } from "@/lib/utils";

export function MonolithPage({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-dashboard-page", className)} {...props} />;
}

export interface MonolithSurfaceProps
  extends React.HTMLAttributes<HTMLElement> {
  as?: "article" | "div" | "section";
  interactive?: boolean;
}

/**
 * @deprecated Prefer `Card` from `@/components/ui/card` (same `.mnx-panel`
 * surface). `MonolithSurface` only adds `as` / `interactive`; kept for the
 * design-system showcase and a few shared shells. Do not use in new code.
 */
export function MonolithSurface({
  as = "article",
  className,
  interactive = false,
  ...props
}: MonolithSurfaceProps) {
  return React.createElement(as, {
    className: cn("mnx-panel", className),
    "data-interactive": interactive ? "true" : undefined,
    ...props,
  });
}

export type MonolithBadgeTone =
  | "accent"
  | "danger"
  | "neutral"
  | "success"
  | "warning";

export interface MonolithBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: MonolithBadgeTone;
}

/**
 * @deprecated Prefer `Badge` from `@/components/ui/badge` (CVA, same
 * `.mnx-badge` classes). Map `tone` → `variant`: accent→default,
 * neutral→secondary, danger→destructive, success→success, warning→warning.
 */
export function MonolithBadge({
  className,
  tone,
  ...props
}: MonolithBadgeProps) {
  return (
    <span
      className={cn("mnx-badge", tone && `mnx-badge-${tone}`, className)}
      {...props}
    />
  );
}

export type MonolithActionVariant =
  | "primary"
  | "accent"
  | "secondary"
  | "outline"
  | "destructive";

export interface MonolithActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: MonolithActionVariant;
}

/**
 * @deprecated Prefer `Button` from `@/components/ui/button` (CVA, same
 * `.mnx-button` classes, plus `size`/`mode`). Map `variant`:
 * primary→default, accent→accent, secondary→inverse, outline→outline,
 * destructive→destructive.
 */
export const MonolithAction = React.forwardRef<
  HTMLButtonElement,
  MonolithActionProps
>(({ className, type = "button", variant, ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn("mnx-button", variant && `mnx-button-${variant}`, className)}
    {...props}
  />
));

MonolithAction.displayName = "MonolithAction";

/**
 * @deprecated Prefer `Button` from `@/components/ui/button` with `mode="icon"`
 * (renders the same `.mnx-icon-button`).
 */
export const MonolithIconAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn("mnx-icon-button", className)}
    {...props}
  />
));

MonolithIconAction.displayName = "MonolithIconAction";

export function MonolithEmptyState({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-empty-state", className)} {...props} />;
}

export interface MonolithSpecLabelProps
  extends React.HTMLAttributes<HTMLElement> {
  as?: "p" | "span";
}

export function MonolithSpecLabel({
  as = "span",
  className,
  ...props
}: MonolithSpecLabelProps) {
  return React.createElement(as, {
    className: cn("mnx-dashboard-spec-label", className),
    ...props,
  });
}
