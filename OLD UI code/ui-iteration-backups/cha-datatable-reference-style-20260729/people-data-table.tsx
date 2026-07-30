import React, {
  type ComponentProps,
  type HTMLAttributes,
  type ReactNode,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PeoplePerson,
  PeopleStatus,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
  PeopleTableToolbar,
} from "./people-workspace";

export type ColumnDef<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  cell: (row: T) => ReactNode;
};

export function DataTable({
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & {
  tableClassName?: string;
  children: ReactNode;
}) {
  const childArray = React.Children.toArray(children);
  const toolbar = childArray.find(
    (child) => React.isValidElement(child) && child.type === DataTableToolbar,
  );
  const footer = childArray.find(
    (child) => React.isValidElement(child) && child.type === DataTableFooter,
  );
  const tableChildren = childArray.filter(
    (child) =>
      !(
        React.isValidElement(child) &&
        (child.type === DataTableToolbar || child.type === DataTableFooter)
      ),
  );

  return (
    <div className="mnx-people-data-region">
      {toolbar}
      <PeopleTable {...props}>{tableChildren}</PeopleTable>
      {footer}
    </div>
  );
}

export const DataTableHeader = PeopleTableHeader;
export const DataTableBody = PeopleTableBody;
export const DataTableRow = PeopleTableRow;
export const DataTableHead = PeopleTableHead;
export const DataTableCell = PeopleTableCell;

export function DataTableEmpty({
  className,
  colSpan,
  message,
}: {
  className?: string;
  colSpan: number;
  message: ReactNode;
}) {
  return (
    <PeopleTableEmpty
      colSpan={colSpan}
      message={<span className={className}>{message}</span>}
    />
  );
}

export function DataTableToolbar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <PeopleTableToolbar className={className} {...props} />;
}

export function DataTableFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <footer className={cn("mnx-people-table-footer", className)} {...props} />
  );
}

export function DataTablePrimaryLinkCell({
  children,
  className,
  href,
  linkClassName,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & {
  href: ComponentProps<typeof Link>["href"];
  linkClassName?: string;
  children: ReactNode;
}) {
  return (
    <PeopleTableCell className={className} {...props}>
      <Link className={cn("mnx-people-table-link", linkClassName)} href={href}>
        {children}
      </Link>
    </PeopleTableCell>
  );
}

export function Badge({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <PeopleStatus className={className} {...props}>
      {children}
    </PeopleStatus>
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
    <span className="mnx-people-meta" title={title}>
      <strong>{primary}</strong>
      {secondary ? <small>{secondary}</small> : null}
    </span>
  );
}

export function AvatarCell({
  name,
  secondary,
}: {
  name: string;
  secondary?: ReactNode;
  title?: string;
}) {
  return <PeoplePerson name={name} secondary={secondary} />;
}

export type { TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes };
