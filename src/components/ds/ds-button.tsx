/**
 * DEPRECATED SHIM — do not import from here in new code.
 *
 * There is exactly one Button in the Monolith design system:
 *
 *   import { Button, ButtonLink } from "@/components/ui";
 *
 * This maps the dashboard kit's legacy `primary | secondary | outlined |
 * inverted` names onto the canonical variant set so ported widgets keep
 * working during migration. New code must use <Button> directly.
 */
import * as React from "react";
import {
  Button,
  ButtonLink,
  type ButtonProps as CanonicalButtonProps,
} from "@/components/ui/button";

export type DsButtonVariant = "primary" | "secondary" | "outlined" | "inverted";
export type DsButtonSize = "sm" | "md" | "lg";

const VARIANT_MAP: Record<DsButtonVariant, CanonicalButtonProps["variant"]> = {
  primary: "default",
  secondary: "secondary",
  outlined: "outline",
  inverted: "inverse",
};
const SIZE_MAP: Record<DsButtonSize, CanonicalButtonProps["size"]> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

export interface DsButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: DsButtonVariant;
  size?: DsButtonSize;
  className?: string;
}
export interface DsButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className"> {
  href: string;
  variant?: DsButtonVariant;
  size?: DsButtonSize;
  className?: string;
}

export const DsButton = React.forwardRef<HTMLButtonElement, DsButtonProps>(
  ({ variant = "primary", size = "md", ...rest }, ref) => (
    <Button ref={ref} variant={VARIANT_MAP[variant]} size={SIZE_MAP[size]} {...rest} />
  ),
);
DsButton.displayName = "DsButton";

export function DsButtonLink({
  variant = "primary",
  size = "md",
  ...rest
}: DsButtonLinkProps) {
  return <ButtonLink variant={VARIANT_MAP[variant]} size={SIZE_MAP[size]} {...rest} />;
}
