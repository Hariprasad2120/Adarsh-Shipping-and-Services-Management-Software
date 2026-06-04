"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, DataTableBody, DataTableCell, DataTableEmpty, DataTableHead, DataTableHeader, DataTableRow, DataTableToolbar } from "@/components/data-table";

type Punch = {
  id: string;
  date: string;
  inAt: string | null;
  outAt: string | null;
};

export function PunchCard({ punches, today: todayIso }: { punches: Punch[]; today: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const today = new Date(todayIso);
  const todayStr = today.toISOString().split("T")[0];
  const todayPunch = punches.find((p) => p.date.startsWith(todayStr));

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-";

  async function punch(action: "in" | "out") {
    setLoading(true);
    await fetch("/api/attendance/punch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, date: todayStr }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">{today.toDateString()}</p>
        <div className="flex gap-4 text-sm">
          <div className="flex-1 rounded-lg bg-green-50 p-3 text-center">
            <p className="text-xs text-gray-500">In</p>
            <p className="text-lg font-semibold text-green-700">{fmt(todayPunch?.inAt ?? null)}</p>
          </div>
          <div className="flex-1 rounded-lg bg-orange-50 p-3 text-center">
            <p className="text-xs text-gray-500">Out</p>
            <p className="text-lg font-semibold text-orange-700">{fmt(todayPunch?.outAt ?? null)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => punch("in")}
            disabled={loading || !!todayPunch?.inAt}
            className="flex-1 rounded-lg bg-green-600 py-2.5 font-medium text-white transition hover:bg-green-700 disabled:opacity-40"
          >
            Punch In
          </button>
          <button
            onClick={() => punch("out")}
            disabled={loading || !todayPunch?.inAt || !!todayPunch?.outAt}
            className="flex-1 rounded-lg bg-orange-500 py-2.5 font-medium text-white transition hover:bg-orange-600 disabled:opacity-40"
          >
            Punch Out
          </button>
        </div>
      </div>

      <DataTable>
        <DataTableToolbar className="justify-start">
          <p className="text-sm font-semibold text-gray-900">
            {today.toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </p>
        </DataTableToolbar>
        <DataTableHeader>
          <tr>
            {["Date", "In", "Out", "Hours"].map((h) => (
              <DataTableHead key={h}>{h}</DataTableHead>
            ))}
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {punches.length === 0 ? (
            <DataTableEmpty colSpan={4} message="No records." className="py-6" />
          ) : (
            punches.map((p) => {
              const hours =
                p.inAt && p.outAt
                  ? ((new Date(p.outAt).getTime() - new Date(p.inAt).getTime()) / 3600000).toFixed(1)
                  : "-";

              return (
                <DataTableRow key={p.id}>
                  <DataTableCell>{new Date(p.date).toLocaleDateString("en-IN")}</DataTableCell>
                  <DataTableCell>{fmt(p.inAt)}</DataTableCell>
                  <DataTableCell>{fmt(p.outAt)}</DataTableCell>
                  <DataTableCell>{hours}</DataTableCell>
                </DataTableRow>
              );
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
