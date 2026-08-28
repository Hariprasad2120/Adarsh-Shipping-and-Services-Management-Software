"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/modules/notifications/components/notification-provider";
import {
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
} from "@/modules/performance/components/performance-workspace";
import { ARREAR_STATUS_LABELS } from "@/modules/ams/arrears";
import { decideArrearAction } from "./actions";

export type ArrearRow = {
  id: string;
  status: string;
  amount: number;
  arrearDays: number;
  periodFrom: string;
  periodTo: string;
  createdAt: string;
  appraisalId: string;
  employeeName: string;
  designation: string | null;
  cycleLabel: string;
  meetingDate: string | null;
};

export function ArrearsClient({ rows, canDecide }: { rows: ArrearRow[]; canDecide: boolean }) {
  const { success, error } = useNotifications();
  const [pending, startTransition] = useTransition();
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  function run(arrearId: string, action: "APPROVE" | "REJECT" | "MARK_PAID") {
    const fd = new FormData();
    fd.set("arrearId", arrearId);
    fd.set("action", action);
    if (noteById[arrearId]) fd.set("notes", noteById[arrearId]);
    startTransition(async () => {
      const result = await decideArrearAction(fd);
      if (result.ok) success("Arrear updated");
      else error(result.error);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="px-5 py-16 text-center text-sm text-mono-muted">No arrears recorded.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <PerformanceTable className="min-w-[900px] w-full text-left text-sm">
        <PerformanceTableHeader>
          <PerformanceTableRow className="border-b border-mono-border bg-mono-soft text-xs font-bold text-mono-muted">
            <PerformanceTableHead className="px-5 py-3.5">Employee</PerformanceTableHead>
            <PerformanceTableHead className="px-5 py-3.5">Cycle</PerformanceTableHead>
            <PerformanceTableHead className="px-5 py-3.5">Period</PerformanceTableHead>
            <PerformanceTableHead className="px-5 py-3.5">Days</PerformanceTableHead>
            <PerformanceTableHead className="px-5 py-3.5">Amount</PerformanceTableHead>
            <PerformanceTableHead className="px-5 py-3.5">Status</PerformanceTableHead>
            {canDecide && <PerformanceTableHead className="px-5 py-3.5 text-right">Actions</PerformanceTableHead>}
          </PerformanceTableRow>
        </PerformanceTableHeader>
        <PerformanceTableBody className="divide-y divide-mono-border/60 text-mono-muted">
          {rows.map((row) => (
            <PerformanceTableRow key={row.id}>
              <PerformanceTableCell className="px-5 py-3.5 font-semibold text-mono-text">
                <Link href={`/ams/appraisals/${row.appraisalId}`} className="text-mono-accent hover:underline">
                  {row.employeeName}
                </Link>
                {row.designation ? <span className="block text-xs text-mono-muted">{row.designation}</span> : null}
              </PerformanceTableCell>
              <PerformanceTableCell className="px-5 py-3.5">{row.cycleLabel}</PerformanceTableCell>
              <PerformanceTableCell className="px-5 py-3.5">
                {new Date(row.periodFrom).toLocaleDateString("en-IN")} –{" "}
                {new Date(row.periodTo).toLocaleDateString("en-IN")}
              </PerformanceTableCell>
              <PerformanceTableCell className="px-5 py-3.5">{row.arrearDays}</PerformanceTableCell>
              <PerformanceTableCell className="px-5 py-3.5 font-semibold text-mono-text">
                ₹{row.amount.toLocaleString("en-IN")}
              </PerformanceTableCell>
              <PerformanceTableCell className="px-5 py-3.5">
                <span className="rounded-full bg-mono-accent/10 px-2.5 py-1 text-xs font-semibold text-mono-accent">
                  {ARREAR_STATUS_LABELS[row.status] ?? row.status}
                </span>
              </PerformanceTableCell>
              {canDecide && (
                <PerformanceTableCell className="px-5 py-3.5">
                  <div className="flex flex-col items-end gap-2">
                    {(row.status === "PENDING_APPROVAL" || row.status === "APPROVED") && (
                      <Input
                        value={noteById[row.id] ?? ""}
                        onChange={(e) => setNoteById((c) => ({ ...c, [row.id]: e.target.value }))}
                        placeholder={row.status === "APPROVED" ? "Payroll reference" : "Note (optional)"}
                        className="h-9 w-48 text-xs"
                      />
                    )}
                    <div className="flex gap-2">
                      {row.status === "PENDING_APPROVAL" && (
                        <>
                          <Button size="sm" disabled={pending} onClick={() => run(row.id, "APPROVE")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(row.id, "REJECT")}>
                            Reject
                          </Button>
                        </>
                      )}
                      {row.status === "APPROVED" && (
                        <Button size="sm" disabled={pending} onClick={() => run(row.id, "MARK_PAID")}>
                          Mark paid
                        </Button>
                      )}
                    </div>
                  </div>
                </PerformanceTableCell>
              )}
            </PerformanceTableRow>
          ))}
        </PerformanceTableBody>
      </PerformanceTable>
    </div>
  );
}
