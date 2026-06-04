import type { HTMLAttributes, ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

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
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-gray-200 bg-white", className)}>
      <table className={cn("min-w-full text-sm", tableClassName)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function DataTableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-gray-200 bg-gray-50", className)} {...props} />;
}

export function DataTableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-gray-100", className)} {...props} />;
}

export function DataTableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-gray-50", className)} {...props} />;
}

export function DataTableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500",
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
  return <td className={cn("px-4 py-3 align-middle text-gray-700", className)} {...props} />;
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
      <DataTableCell colSpan={colSpan} className={cn("px-4 py-8 text-center text-gray-400", className)}>
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
        "flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4",
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
      className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", className)}
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
      <p className="truncate font-medium text-gray-900">{primary}</p>
      {secondary ? <p className="truncate text-xs text-gray-400">{secondary}</p> : null}
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
        {initials}
      </div>
      <MetaText primary={name} secondary={secondary} />
    </div>
  );
}
