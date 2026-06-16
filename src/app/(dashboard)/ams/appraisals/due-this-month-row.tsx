"use client";

import { Badge, DataTableCell, DataTableRow } from "@/components/data-table";
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
  const href = row.appraisalId ? `/ams/appraisals/${row.appraisalId}` : `/ams/appraisals/assign/${row.employeeId}`;

  return (
    <DataTableRow>
      <DataTableCell className="font-medium text-on-surface-variant">
        <Link href={href} className="inline-flex items-center gap-2 transition-colors hover:text-[#00b5ad]">
          <span>{row.employeeName}</span>
        </Link>
      </DataTableCell>
      <DataTableCell className="text-xs text-on-surface-variant">{row.designation ?? "-"}</DataTableCell>
      <DataTableCell className="text-xs text-on-surface-variant">{row.department ?? "-"}</DataTableCell>
      <DataTableCell>
        {row.kind ? (
          <Badge className={row.kind === "INTERMEDIATE" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}>
            {row.kind}
          </Badge>
        ) : (
          <span className="text-xs text-on-surface-variant">-</span>
        )}
      </DataTableCell>
      <DataTableCell className="text-xs text-on-surface-variant">
        {row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-IN") : "-"}
      </DataTableCell>
      <DataTableCell className="text-right">
        <Link
          href={href}
          aria-label={`${row.appraisalId ? "Open" : "Start appraisal for"} ${row.employeeName}`}
          className="inline-flex text-outline-variant transition-colors hover:text-[#00b5ad]"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </DataTableCell>
    </DataTableRow>
  );
}
