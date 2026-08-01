"use client";

import {
  Badge,
  DataTableCell,
  DataTablePrimaryLinkCell,
  DataTableRow,
} from "@/modules/people/components/workspace-data-table";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type DueRow = {
  employeeId: string;
  employeeName: string;
  designation: string | null;
  department: string | null;
  dueDate: string | null;
  kind: "INTERMEDIATE" | "ANNUAL" | null;
  appraisalId: string | null;
};

export function DueThisMonthRow({ row }: { row: DueRow }) {
  const href = row.appraisalId
    ? `/ams/appraisals/${row.appraisalId}`
    : `/ams/appraisals/assign/${row.employeeId}`;
  const dueDateLabel = row.dueDate
    ? new Intl.DateTimeFormat("en-IN", { timeZone: "UTC" }).format(
        new Date(row.dueDate),
      )
    : "-";

  return (
    <DataTableRow>
      <DataTablePrimaryLinkCell
        href={href}
        className="font-medium text-mono-muted"
      >
        <span>{row.employeeName}</span>
      </DataTablePrimaryLinkCell>
      <DataTableCell className="text-xs text-mono-muted">
        {row.designation ?? "-"}
      </DataTableCell>
      <DataTableCell className="text-xs text-mono-muted">
        {row.department ?? "-"}
      </DataTableCell>
      <DataTableCell>
        {row.kind ? (
          <Badge
            className={
              row.kind === "INTERMEDIATE"
                ? "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                : "bg-mono-accent/10 text-mono-accent"
            }
          >
            {row.kind}
          </Badge>
        ) : (
          <span className="text-xs text-mono-muted">-</span>
        )}
      </DataTableCell>
      <DataTableCell className="text-xs text-mono-muted">
        {dueDateLabel}
      </DataTableCell>
      <DataTableCell className="text-right">
        <Link
          href={href}
          aria-label={`${row.appraisalId ? "Open" : "Start appraisal for"} ${row.employeeName}`}
          className="inline-flex text-outline-variant transition-colors hover:text-mono-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </DataTableCell>
    </DataTableRow>
  );
}
