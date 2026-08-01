import * as React from "react";
import { cn } from "@/lib/utils";

export function OperationalDataTable({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("mnx-table-card", className)} {...props}>
      {children}
    </section>
  );
}

export function OperationalDataTableHeader({
  actions,
  children,
  className,
  eyebrow,
  title,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
  actions?: React.ReactNode;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <header className={cn("mnx-operational-table-header", className)} {...props}>
      <div>
        <span>{eyebrow}</span>
        <h3>{title}</h3>
        {children}
      </div>
      {actions ? <div className="mnx-operational-table-actions">{actions}</div> : null}
    </header>
  );
}

export function OperationalDataTableActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-operational-table-actions", className)} {...props} />;
}

export function OperationalFilterGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-operational-filter-group", className)} {...props} />;
}

export function OperationalFilterOption({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(active && "active", className)}
      aria-pressed={active}
      {...props}
    />
  );
}

export function OperationalFilterButton({
  activeCount,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  activeCount?: number;
}) {
  return (
    <button type="button" className={cn("mnx-filter-button", className)} {...props}>
      {children}
      {typeof activeCount === "number" ? (
        <i aria-label={`${activeCount} active filters`}>{activeCount}</i>
      ) : null}
    </button>
  );
}

export function OperationalVisibleRecords({
  className,
  label = "Visible records",
  total,
  visible,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
  total: number;
  visible: number;
}) {
  return (
    <div
      className={cn("mnx-operational-visible-records", className)}
      aria-label={`${label}: ${visible} of ${total}`}
      {...props}
    >
      <strong>{visible}</strong>
      <span>
        {label}
        <small>
          {visible} / {total}
        </small>
      </span>
    </div>
  );
}

export function OperationalDataTableWrap({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-table-wrap", className)} {...props} />;
}

export function OperationalTable({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("mnx-operational-table", className)} {...props} />;
}

export function OperationalTableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={className} {...props} />;
}

export function OperationalTableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={className} {...props} />;
}

export function OperationalPrimaryCell({
  primary,
  secondary,
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <td className={className} {...props}>
      <b>{primary}</b>
      {secondary ? <small>{secondary}</small> : null}
      {children}
    </td>
  );
}

export function OperationalMode({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="mnx-operational-mode">
      <span className="mnx-operational-mode-icon" aria-hidden="true">
        {icon}
      </span>
      {children}
    </span>
  );
}

export function OperationalStatus({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  return <span className={cn("mnx-operational-table-status", `is-${tone}`)}>{children}</span>;
}

export function OperationalRowAction({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("mnx-operational-row-action", className)}
      aria-label={props["aria-label"] ?? "Open row actions"}
      {...props}
    />
  );
}

export function OperationalDataTableFooter({
  children,
  className,
  summary,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  summary: React.ReactNode;
}) {
  return (
    <footer className={cn("mnx-table-footer", className)} {...props}>
      <span>{summary}</span>
      {children}
    </footer>
  );
}

export function OperationalPagination({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mnx-operational-pagination", className)} {...props}>
      {children}
    </div>
  );
}

export function OperationalPageButton({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(active && "active", className)}
      aria-current={active ? "page" : undefined}
      {...props}
    />
  );
}

export function OperationalTableEmpty({
  colSpan,
  children,
  className,
}: {
  colSpan: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn("mnx-table-empty", className)}>
        {children}
      </td>
    </tr>
  );
}
