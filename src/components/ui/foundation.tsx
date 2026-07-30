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
