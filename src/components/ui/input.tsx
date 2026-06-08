import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-full border border-[#00cec4]/30 bg-surface px-4 py-2 text-sm text-on-surface placeholder:text-[var(--color-placeholder)]",
        "focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30",
        "hover:border-[#00cec4]/45",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
