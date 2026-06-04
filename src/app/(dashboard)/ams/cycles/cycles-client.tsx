"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableToolbar,
} from "@/components/data-table";

type Cycle = { id: string; name: string; year: number; status: string; _count: { appraisals: number } };

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-50 text-green-700",
  CLOSED: "bg-red-50 text-red-600",
};

export function CyclesClient({ cycles, currentYear }: { cycles: Cycle[]; currentYear: number }) {
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
    if (!confirm(`${action === "activate" ? "Activate" : "Close"} this cycle?`)) return;
    await fetch(`/api/ams/cycles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
  }

  return (
    <DataTable>
      <DataTableToolbar>
        <p className="font-semibold text-gray-900">All Cycles</p>
        <button
          onClick={createCycle}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          + New Cycle
        </button>
      </DataTableToolbar>

      <DataTableHeader>
        <tr>
          {["Name", "Year", "Status", "Appraisals", ""].map((h) => (
            <DataTableHead key={h}>{h}</DataTableHead>
          ))}
        </tr>
      </DataTableHeader>
      <DataTableBody>
        {cycles.length === 0 ? (
          <DataTableEmpty colSpan={5} message="No cycles yet." />
        ) : (
          cycles.map((c) => (
            <DataTableRow key={c.id}>
              <DataTableCell className="font-medium text-gray-900">{c.name}</DataTableCell>
              <DataTableCell className="text-gray-500">{c.year}</DataTableCell>
              <DataTableCell>
                <Badge className={STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-600"}>{c.status}</Badge>
              </DataTableCell>
              <DataTableCell className="text-gray-500">{c._count.appraisals}</DataTableCell>
              <DataTableCell className="text-right">
                {c.status === "DRAFT" && (
                  <button onClick={() => updateStatus(c.id, "activate")} className="text-xs text-green-600 hover:underline">
                    Activate
                  </button>
                )}
                {c.status === "ACTIVE" && (
                  <button onClick={() => updateStatus(c.id, "close")} className="text-xs text-red-500 hover:underline">
                    Close
                  </button>
                )}
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </DataTableBody>
    </DataTable>
  );
}
