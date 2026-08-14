"use client";

import {
  OperationalDataTable,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";

type Entry = {
  id: string;
  employeeName: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  status: string;
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  pending_approval: "warning",
  approved: "success",
};

export function TeamCalendarClient({
  monthLabel,
  reports,
  entries,
}: {
  monthLabel: string;
  monthStart: string;
  monthEnd: string;
  reports: { id: string; name: string }[];
  entries: Entry[];
}) {
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  // Detect overlapping leave (two or more team members out on the same
  // days) — a staffing-availability warning per spec §29.
  const overlapWarnings: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.employeeName === b.employeeName) continue;
      const overlap = new Date(a.fromDate) <= new Date(b.toDate) && new Date(b.fromDate) <= new Date(a.toDate);
      if (overlap) {
        overlapWarnings.push(`${a.employeeName} and ${b.employeeName} have overlapping leave`);
      }
    }
  }

  return (
    <div className="space-y-4">
      <OperationalDataTable>
        <OperationalDataTableHeader eyebrow={monthLabel} title="Team Leave Calendar" />

        {overlapWarnings.length > 0 && (
          <div className="border-b border-[var(--mnx-border)] bg-[var(--mnx-warning-bg,inherit)] px-5 py-3 text-xs text-[var(--mnx-text)]">
            {[...new Set(overlapWarnings)].map((w) => (
              <p key={w}>⚠ {w}</p>
            ))}
          </div>
        )}

        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                {["Employee", "Leave Type", "From", "To", "Status"].map((h) => (
                  <OperationalTableHead key={h}>{h}</OperationalTableHead>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <OperationalTableEmpty colSpan={5}>
                  {reports.length === 0 ? "No direct reports." : "No leave scheduled this month."}
                </OperationalTableEmpty>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <OperationalTableCell className="font-medium text-[var(--mnx-text)]">
                      {e.employeeName}
                    </OperationalTableCell>
                    <OperationalTableCell>{e.leaveTypeName}</OperationalTableCell>
                    <OperationalTableCell>{fmtDate(e.fromDate)}</OperationalTableCell>
                    <OperationalTableCell>{fmtDate(e.toDate)}</OperationalTableCell>
                    <OperationalTableCell>
                      <OperationalStatus tone={STATUS_TONE[e.status.toLowerCase()] ?? "neutral"}>
                        {e.status}
                      </OperationalStatus>
                    </OperationalTableCell>
                  </tr>
                ))
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      </OperationalDataTable>
    </div>
  );
}
