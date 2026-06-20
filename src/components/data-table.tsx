import React from "react";
import Link from "next/link";
import type { ComponentProps, HTMLAttributes, ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ColumnDef<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  cell: (row: T) => ReactNode;
};

export function DataTable({
  className,
  tableClassName,
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & {
  tableClassName?: string;
  children: ReactNode;
}) {
  const childrenArray = React.Children.toArray(children);
  const toolbar = childrenArray.find(
    (child) => React.isValidElement(child) && child.type === DataTableToolbar
  );
  const otherChildren = childrenArray.filter(
    (child) => !(React.isValidElement(child) && child.type === DataTableToolbar)
  );

  return (
    <div className={cn("w-full overflow-x-auto rounded-2xl border border-outline-variant/40 bg-surface text-on-surface shadow-sm", className)}>
      {toolbar}
      <table className={cn("min-w-full w-full text-sm", tableClassName)} {...props}>
        {otherChildren}
      </table>
    </div>
  );
}

export function DataTableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-outline-variant/40 bg-surface-container-low text-on-surface",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-outline-variant/30", className)} {...props} />;
}

export function DataTableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("group transition-colors hover:bg-surface-container-low/80", className)} {...props} />;
}

export function DataTableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant",
        className
      )}
      {...props}
    />
  );
}

export function DataTableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-5 py-2.5 align-middle text-sm text-on-surface", className)} {...props} />;
}

export function DataTablePrimaryLinkCell({
  href,
  className,
  linkClassName,
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & {
  href: ComponentProps<typeof Link>["href"];
  linkClassName?: string;
  children: ReactNode;
}) {
  return (
    <DataTableCell className={cn("p-0", className)} {...props}>
      <Link
        href={href}
        className={cn(
          "block w-full px-5 py-2.5 text-inherit transition-colors hover:text-[#00b5ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00cec4]/30",
          linkClassName,
        )}
      >
        {children}
      </Link>
    </DataTableCell>
  );
}

export function DataTableEmpty({
  colSpan,
  message,
  className,
}: {
  colSpan: number;
  message: ReactNode;
  className?: string;
}) {
  return (
    <DataTableRow className="hover:bg-transparent">
      <DataTableCell colSpan={colSpan} className={cn("px-5 py-8 text-center text-on-surface-variant", className)}>
        {message}
      </DataTableCell>
    </DataTableRow>
  );
}

export function DataTableToolbar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-outline-variant/30 px-5 py-4",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2 py-0.5 text-[var(--text-sm)] font-medium", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function MetaText({
  primary,
  secondary,
  title,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  title?: string;
}) {
  return (
    <div className="min-w-0" title={title}>
      <p className="truncate font-normal text-on-surface">{primary}</p>
      {secondary ? <p className="truncate text-xs text-on-surface-variant">{secondary}</p> : null}
    </div>
  );
}

export function AvatarCell({
  name,
  secondary,
  title,
}: {
  name: string;
  secondary?: ReactNode;
  title?: string;
}) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";

  return (
    <div className="flex min-w-0 items-center gap-3" title={title ?? name}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {initials}
      </div>
      <MetaText primary={name} secondary={secondary} />
    </div>
  );
}
