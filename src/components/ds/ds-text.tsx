import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Typography primitives for the Monolith design system. One font family,
 * three roles:
 *
 *   <DsDisplay>  page & section identity   (tight, 600)
 *   <DsBody>     prose, labels, cells      (1.55 leading, 400)
 *   <DsMeta>     the "manifest stamp" voice — eyebrows, dates, codes, IDs
 *               (uppercase, letter-spaced, small, 500)
 */

type Level = "lg" | "md" | "sm";
type El = keyof React.JSX.IntrinsicElements;

interface DisplayProps extends React.HTMLAttributes<HTMLElement> {
  as?: El;
  level?: Level;
}
export function DsDisplay({
  as = "h2",
  level = "md",
  className,
  ...rest
}: DisplayProps) {
  const Tag = as as El;
  return (
    // @ts-expect-error dynamic tag
    <Tag className={cn("ds-display", `ds-display-${level}`, className)} {...rest} />
  );
}

interface BodyProps extends React.HTMLAttributes<HTMLElement> {
  as?: El;
  level?: Level;
  muted?: boolean;
}
export function DsBody({
  as = "p",
  level = "md",
  muted = false,
  className,
  ...rest
}: BodyProps) {
  const Tag = as as El;
  return (
    // @ts-expect-error dynamic tag
    <Tag
      className={cn("ds-body", `ds-body-${level}`, muted && "ds-body-muted", className)}
      {...rest}
    />
  );
}

interface MetaProps extends React.HTMLAttributes<HTMLElement> {
  as?: El;
  small?: boolean;
}
export function DsMeta({
  as = "span",
  small = false,
  className,
  ...rest
}: MetaProps) {
  const Tag = as as El;
  return (
    // @ts-expect-error dynamic tag
    <Tag className={cn("ds-meta", small && "ds-meta-sm", className)} {...rest} />
  );
}
