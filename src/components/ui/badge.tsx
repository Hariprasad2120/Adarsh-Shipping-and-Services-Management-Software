import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive";

const variants: Record<BadgeVariant, string> = {
  default: "info-badge",
  secondary: "neutral",
  success: "success-badge",
  warning: "warning-badge",
  destructive: "danger-badge",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn("badge", variants[variant], className)} {...props} />;
}
