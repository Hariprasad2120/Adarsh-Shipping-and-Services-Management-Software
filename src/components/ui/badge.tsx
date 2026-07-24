import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive";

const VARIANTS: Record<BadgeVariant, string> = {
  default: "border-[#00cec4]/30 bg-[#00cec4]/10 text-[#008b85] dark:text-[#5eead4]",
  secondary: "bg-surface-container-high text-on-surface-variant border-outline-variant",
  success: "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-300",
  warning: "border-[#fb923c]/25 bg-[#fb923c]/10 text-[#c96a16] dark:text-[#fdba74]",
  destructive: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-200",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium leading-none tracking-[0.14em]",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
