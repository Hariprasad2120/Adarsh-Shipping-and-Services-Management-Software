"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * DsButton / DsButtonLink — the Monolith design-system button.
 *
 * Four variants, nothing else:
 *   - primary   filled steel-harbour blue. One per view, the main action.
 *   - secondary filled buoy-marker rust. A second, distinct action.
 *   - outlined  hairline neutral border, transparent fill. Low-emphasis.
 *   - inverted  high-contrast reverse of the current ground.
 *
 * Three sizes: sm | md (default) | lg.
 */

export type DsButtonVariant =
  | "primary"
  | "secondary"
  | "outlined"
  | "inverted";
export type DsButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  variant?: DsButtonVariant;
  size?: DsButtonSize;
};

export interface DsButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    CommonProps {}

export interface DsButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    CommonProps {
  href: string;
}

export const DsButton = React.forwardRef<HTMLButtonElement, DsButtonProps>(
  ({ variant = "primary", size = "md", type = "button", className, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn("ds-btn", className)}
      data-variant={variant}
      data-size={size}
      {...rest}
    />
  ),
);
DsButton.displayName = "DsButton";

export function DsButtonLink({
  variant = "primary",
  size = "md",
  href,
  className,
  ...rest
}: DsButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn("ds-btn", className)}
      data-variant={variant}
      data-size={size}
      {...rest}
    />
  );
}
