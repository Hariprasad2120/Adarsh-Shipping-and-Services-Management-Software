import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn inline-flex items-center justify-center gap-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "primary",
        inverse: "ghost",
        outline: "outline",
        destructive: "destructive",
      },
      size: {
        sm: "small",
        md: "",
        lg: "",
      },
      mode: {
        default: "",
        icon: "aspect-square !min-w-0 !px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      mode: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, mode, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-variant={variant ?? "default"}
      data-size={size ?? "md"}
      data-mode={mode ?? "default"}
      className={cn(buttonVariants({ variant, size, mode }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
