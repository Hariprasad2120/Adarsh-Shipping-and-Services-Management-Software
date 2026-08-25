"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PeopleControlInput } from "@/modules/people/components";

function shiftMonth(period: string, delta: number) {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return period;
  const [, yearStr, monthStr] = match;
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function csvCell(value: string | number) {
  if (typeof value === "number") return String(value);
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Shared Reports Centre toolbar: a month period picker (with a
 * "Previous Month" preset, matching the captured Zoho reports' date-range
 * control) and a CSV export of whatever rows the report page already
 * rendered — no separate/duplicate data path, no faked download.
 */
export function ReportToolbar({
  reportKey,
  period,
  csvFilename,
  csvHeaders,
  csvRows,
}: {
  /** Current report's route key, e.g. "payroll-summary". Omit to hide the period picker. */
  reportKey?: string;
  /** Current period in "YYYY-MM" form. Omit to hide the period picker. */
  period?: string;
  csvFilename: string;
  csvHeaders: string[];
  csvRows: (string | number)[][];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function goToPeriod(next: string) {
    if (!reportKey) return;
    setPending(true);
    router.push(`/payroll/reports/${reportKey}?period=${next}`);
  }

  function exportCsv() {
    const lines = [csvHeaders.map(csvCell).join(",")];
    for (const row of csvRows) {
      lines.push(row.map(csvCell).join(","));
    }
    const csv = `﻿${lines.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${csvFilename}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3">
      {reportKey && period ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="report-period" className="text-[var(--mnx-muted)]">
            Period
          </label>
          <PeopleControlInput
            id="report-period"
            type="month"
            value={period}
            disabled={pending}
            onChange={(event) => {
              if (event.target.value) goToPeriod(event.target.value);
            }}
            className="w-40"
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => goToPeriod(shiftMonth(period, -1))}
          >
            Previous Month
          </Button>
        </div>
      ) : (
        <span />
      )}
      <Button
        type="button"
        variant="outline"
        className="inline-flex items-center gap-1.5"
        onClick={exportCsv}
        disabled={csvRows.length === 0}
      >
        <Download className="size-4" aria-hidden="true" />
        Export CSV
      </Button>
    </div>
  );
}
