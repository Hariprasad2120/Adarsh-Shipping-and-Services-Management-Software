import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive";

const variants: Record<BadgeVariant, string> = {
  default: "mnx-badge mnx-badge-accent",
  secondary: "mnx-badge mnx-badge-neutral",
  success: "mnx-badge mnx-badge-success",
  warning: "mnx-badge mnx-badge-warning",
  destructive: "mnx-badge mnx-badge-danger",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn(variants[variant], className)} {...props} />;
}
