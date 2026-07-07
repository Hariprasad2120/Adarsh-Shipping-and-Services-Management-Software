import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg border border-transparent text-[var(--text-base)] font-medium shadow-sm transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[#00cec4] bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_16px_rgba(0,206,196,0.5),0_0_5px_rgba(0,206,196,0.3)] hover:animate-[neon-pulse-approve_2s_infinite_ease-in-out]",
        inverse: "bg-transparent text-current hover:bg-black/10",
        outline:
          "border border-[#00cec4]/45 bg-surface text-[#00cec4] hover:border-[#00cec4] hover:bg-[#00cec4]/10 hover:shadow-[0_0_12px_rgba(0,206,196,0.3)]",
        destructive:
          "border-red-500 bg-red-500 text-white hover:bg-red-600 hover:shadow-[0_0_16px_rgba(239,68,68,0.5),0_0_5px_rgba(239,68,68,0.3)] hover:animate-[neon-pulse-reject_2s_infinite_ease-in-out]",
      },
      size: {
        sm: "h-8 px-3 text-[var(--text-sm)]",
        md: "h-10 px-4",
        lg: "h-11 px-5",
      },
      mode: {
        default: "",
        icon: "aspect-square px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      mode: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, mode, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, mode }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
