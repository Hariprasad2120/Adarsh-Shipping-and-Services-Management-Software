import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "./states";

/**
 * DataTable — one responsive table architecture for the whole app.
 *
 * Column-driven: pass `columns` (header, accessor/render, alignment) and
 * `rows`. Handles loading / empty / error inline, a click-to-navigate row
 * (`rowHref`), right/centre alignment, and a primary+sub two-line cell via
 * the <DataTableCell> helper. Horizontal overflow is contained to the table.
 *
 * It is deliberately unopinionated about pagination and sorting — those are
 * passed in as `footer` / controlled `onSort` when a page needs them.
 */
export interface DataTableColumn<Row> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "right" | "center";
  /** render a cell; falls back to String(row[key]) */
  render?: (row: Row) => React.ReactNode;
  /** column width hint, any CSS length */
  width?: string;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[] | undefined;
  getRowKey: (row: Row, index: number) => string;
  /** navigate here on row click / Enter */
  rowHref?: (row: Row) => string | null | undefined;
  caption?: string;
  loading?: boolean;
  error?: React.ReactNode;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  /** render inside a dark panel — inherits inverse tokens */
  footer?: React.ReactNode;
  className?: string;
  skeletonRows?: number;
}

export function DataTableCell({
  primary,
  sub,
  href,
}: {
  primary: React.ReactNode;
  sub?: React.ReactNode;
  href?: string | null;
}) {
  return (
    <>
      <span className="ds-td-primary">
        {href ? <a href={href}>{primary}</a> : primary}
      </span>
      {sub ? <span className="ds-td-sub">{sub}</span> : null}
    </>
  );
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  rowHref,
  caption,
  loading = false,
  error,
  emptyTitle = "Nothing to show",
  emptyDescription,
  footer,
  className,
  skeletonRows = 4,
}: DataTableProps<Row>) {
  const router = useRouter();
  const colCount = columns.length;

  const body = () => {
    if (error) {
      return (
        <tbody>
          <tr>
            <td colSpan={colCount} className="ds-table-empty">
              <ErrorState
                title="Couldn’t load this table"
                description={typeof error === "string" ? error : undefined}
              />
            </td>
          </tr>
        </tbody>
      );
    }
    if (loading || rows === undefined) {
      return (
        <tbody>
          {Array.from({ length: skeletonRows }).map((_, r) => (
            <tr key={`sk-${r}`}>
              {columns.map((c, i) => (
                <td key={c.key} data-align={c.align}>
                  <Skeleton width={i === 0 ? "70%" : "45%"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      );
    }
    if (rows.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={colCount} className="ds-table-empty">
              <EmptyState
                title={emptyTitle}
                description={emptyDescription}
              />
            </td>
          </tr>
        </tbody>
      );
    }
    return (
      <tbody>
        {rows.map((row, index) => {
          const href = rowHref?.(row) ?? undefined;
          return (
            <tr
              key={getRowKey(row, index)}
              data-clickable={href ? "true" : undefined}
              tabIndex={href ? 0 : undefined}
              onClick={href ? () => router.push(href) : undefined}
              onKeyDown={
                href
                  ? (e) => {
                      if (e.key === "Enter") router.push(href);
                    }
                  : undefined
              }
            >
              {columns.map((c) => (
                <td key={c.key} data-align={c.align}>
                  {c.render
                    ? c.render(row)
                    : String((row as Record<string, unknown>)[c.key] ?? "")}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    );
  };

  return (
    <div className={cn("ds-table-scroll", className)}>
      <table className="ds-table">
        {caption ? (
          <caption className="sr-only">{caption}</caption>
        ) : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                data-align={c.align}
                style={c.width ? { width: c.width } : undefined}
                scope="col"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        {body()}
      </table>
      {footer}
    </div>
  );
}

export { LoadingState as DataTableLoading };
