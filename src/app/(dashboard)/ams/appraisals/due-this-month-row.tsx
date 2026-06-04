"use client";

import { Badge, DataTableCell, DataTableRow } from "@/components/data-table";
import { useCan } from "@/lib/caps-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type DueRow = {
  employeeId: string;
  employeeName: string;
  designation: string | null;
  department: string | null;
  dueDate: string;
  kind: "INTERMEDIATE" | "ANNUAL";
  appraisalId: string | null;
};

export function DueThisMonthRow({ row }: { row: DueRow }) {
  const router = useRouter();
  const canStart = useCan("ams.appraisal.assign_reviewers");
  const [loading, setLoading] = useState(false);

  async function startAppraisal() {
    setLoading(true);
    await fetch("/api/ams/appraisals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: row.employeeId, dueDate: row.dueDate, kind: row.kind }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <DataTableRow>
      <DataTableCell className="font-medium text-gray-900">{row.employeeName}</DataTableCell>
      <DataTableCell className="text-xs text-gray-500">{row.designation ?? "-"}</DataTableCell>
      <DataTableCell className="text-xs text-gray-500">{row.department ?? "-"}</DataTableCell>
      <DataTableCell>
        <Badge className={row.kind === "INTERMEDIATE" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}>
          {row.kind}
        </Badge>
      </DataTableCell>
      <DataTableCell className="text-xs text-gray-500">
        {new Date(row.dueDate).toLocaleDateString("en-IN")}
      </DataTableCell>
      <DataTableCell>
        {row.appraisalId ? (
          <Link href={`/ams/appraisals/${row.appraisalId}`} className="text-xs text-indigo-600 hover:underline">
            Open →
          </Link>
        ) : canStart ? (
          <button
            onClick={startAppraisal}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start Appraisal"}
          </button>
        ) : (
          <span className="text-xs text-gray-400">Pending</span>
        )}
      </DataTableCell>
    </DataTableRow>
  );
}
