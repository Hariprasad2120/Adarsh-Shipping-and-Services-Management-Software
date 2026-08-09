"use client";

import { Badge } from "@/components/ui/badge";
import { OperationalTableCell } from "@/components/data-display/operational-data-table";
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
    <tr>
      <OperationalTableCell className="px-0 py-0">
        <Link
          href={href}
          className="block px-5 py-3.5 font-medium text-mono-muted"
        >
          <span>{row.employeeName}</span>
        </Link>
      </OperationalTableCell>
      <OperationalTableCell className="text-xs text-mono-muted">
        {row.designation ?? "-"}
      </OperationalTableCell>
      <OperationalTableCell className="text-xs text-mono-muted">
        {row.department ?? "-"}
      </OperationalTableCell>
      <OperationalTableCell>
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
      </OperationalTableCell>
      <OperationalTableCell className="text-xs text-mono-muted">
        {dueDateLabel}
      </OperationalTableCell>
      <OperationalTableCell className="text-right">
        <Link
          href={href}
          aria-label={`${row.appraisalId ? "Open" : "Start appraisal for"} ${row.employeeName}`}
          className="inline-flex text-outline-variant transition-colors hover:text-mono-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </OperationalTableCell>
    </tr>
  );
}
