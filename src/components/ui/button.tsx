"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva("mnx-button", {
  variants: {
    variant: {
      default: "mnx-button-primary",
      accent: "mnx-button-accent",
      inverse: "mnx-button-secondary",
      outline: "mnx-button-outline",
      destructive: "mnx-button-destructive",
      ghost: "mnx-button-outline mnx-button-ghost",
      secondary: "mnx-button-secondary",
      link: "mnx-button-link",
    },
    size: {
      xs: "mnx-button-compact",
      sm: "mnx-button-compact",
      md: "",
      default: "",
      lg: "",
      icon: "mnx-icon-button",
      "icon-xs": "mnx-icon-button mnx-icon-button-xs",
      "icon-sm": "mnx-icon-button",
      "icon-lg": "mnx-icon-button mnx-icon-button-lg",
    },
    mode: {
      default: "",
      icon: "mnx-icon-button",
    },
  },
  compoundVariants: [
    {
      mode: "icon",
      className: "mnx-icon-button",
    },
  ],
  defaultVariants: {
    variant: "default",
    size: "md",
    mode: "default",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export interface ButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    VariantProps<typeof buttonVariants> {
  href: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, mode, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "md"}
      data-mode={mode ?? "default"}
      className={cn(buttonVariants({ variant, size, mode }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";

export function ButtonLink({
  className,
  href,
  variant,
  size,
  mode,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "md"}
      data-mode={mode ?? "default"}
      className={cn(buttonVariants({ variant, size, mode }), className)}
      {...props}
    />
  );
}

export const LinkButton = ButtonLink;
