"use client";

import {
  PerformanceControlButton,
  PerformanceTableRow,
} from "@/modules/performance/components/performance-workspace";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  OperationalDataTable,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";

type Cycle = {
  id: string;
  name: string;
  year: number;
  status: string;
  _count: { appraisals: number };
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-mono-soft text-mono-muted",
  ACTIVE: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  CLOSED: "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]",
};

export function CyclesClient({
  cycles,
  currentYear,
}: {
  cycles: Cycle[];
  currentYear: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createCycle() {
    const name = prompt("Cycle name (e.g. Annual Review 2025):");
    if (!name) return;
    const yearStr = prompt("Year:", String(currentYear));
    if (!yearStr) return;
    setLoading(true);
    await fetch("/api/ams/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, year: Number(yearStr) }),
    });
    setLoading(false);
    router.refresh();
  }

  async function updateStatus(id: string, action: "activate" | "close") {
    if (!confirm(`${action === "activate" ? "Activate" : "Close"} this cycle?`))
      return;
    await fetch(`/api/ams/cycles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
  }

  return (
    <OperationalDataTable>
      <OperationalDataTableHeader
        eyebrow="Performance cycles"
        title="All Cycles"
        actions={
          <PerformanceControlButton
            onClick={createCycle}
            disabled={loading}
            className="rounded-lg bg-mono-accent/10 px-3 py-1.5 text-sm text-mono-text hover:bg-mono-accent/10 disabled:opacity-50"
          >
            + New Cycle
          </PerformanceControlButton>
        }
      />

      <OperationalDataTableWrap>
        <OperationalTable>
          <thead>
            <PerformanceTableRow>
              {["Name", "Year", "Status", "Appraisals", ""].map((h) => (
                <OperationalTableHead key={h}>{h}</OperationalTableHead>
              ))}
            </PerformanceTableRow>
          </thead>
          <tbody>
            {cycles.length === 0 ? (
              <OperationalTableEmpty colSpan={5}>
                No cycles yet.
              </OperationalTableEmpty>
            ) : (
              cycles.map((c) => (
                <tr key={c.id}>
                  <OperationalTableCell className="font-medium text-mono-text">
                    {c.name}
                  </OperationalTableCell>
                  <OperationalTableCell className="text-mono-muted">
                    {c.year}
                  </OperationalTableCell>
                  <OperationalTableCell>
                    <Badge
                      className={
                        STATUS_COLOR[c.status] ?? "bg-mono-soft text-mono-muted"
                      }
                    >
                      {c.status}
                    </Badge>
                  </OperationalTableCell>
                  <OperationalTableCell className="text-mono-muted">
                    {c._count.appraisals}
                  </OperationalTableCell>
                  <OperationalTableCell className="text-right">
                    {c.status === "DRAFT" && (
                      <PerformanceControlButton
                        onClick={() => updateStatus(c.id, "activate")}
                        className="text-xs text-[var(--mnx-success)] hover:underline"
                      >
                        Activate
                      </PerformanceControlButton>
                    )}
                    {c.status === "ACTIVE" && (
                      <PerformanceControlButton
                        onClick={() => updateStatus(c.id, "close")}
                        className="text-xs text-[var(--mnx-danger)] hover:underline"
                      >
                        Close
                      </PerformanceControlButton>
                    )}
                  </OperationalTableCell>
                </tr>
              ))
            )}
          </tbody>
        </OperationalTable>
      </OperationalDataTableWrap>
    </OperationalDataTable>
  );
}
