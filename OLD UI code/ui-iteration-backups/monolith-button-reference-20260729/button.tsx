import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("mnx-button", {
  variants: {
    variant: {
      default: "mnx-button-primary",
      inverse: "mnx-button-secondary",
      outline: "mnx-button-secondary",
      destructive: "mnx-button-destructive",
    },
    size: {
      sm: "mnx-button-compact",
      md: "",
      lg: "",
    },
    mode: {
      default: "",
      icon: "mnx-icon-button",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    mode: "default",
  },
});

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
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
