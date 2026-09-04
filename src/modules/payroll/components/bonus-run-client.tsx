"use client";

import * as React from "react";
import { toast } from "@/modules/notifications/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PeopleControlInput } from "@/modules/people/components";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { previewStatutoryBonusAction, createStatutoryBonusPayrollRunAction } from "@/modules/hrms/bonus-actions";
import type { BonusPreviewEntry } from "@/modules/hrms/bonus-payroll";

function defaultFiscalYear() {
  const now = new Date();
  const startYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function BonusRunClient() {
  const router = useRouter();
  const [fiscalYear, setFiscalYear] = React.useState(defaultFiscalYear());
  const [payDate, setPayDate] = React.useState("");
  const [preview, setPreview] = React.useState<BonusPreviewEntry[] | null>(null);
  const [excluded, setExcluded] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handlePreview = async () => {
    setIsLoading(true);
    setPreview(null);
    setExcluded(new Set());
    try {
      const result = await previewStatutoryBonusAction(fiscalYear);
      setPreview(result);
      if (result.length === 0) {
        toast.info("No eligible employees for this fiscal year, or Statutory Bonus isn't enabled in settings.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const included = (preview ?? []).filter((e) => !excluded.has(e.employeeId));
  const total = included.reduce((sum, e) => sum + e.bonusAmount, 0);

  const handleConfirm = async () => {
    if (!payDate) {
      toast.error("Set a pay date");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await createStatutoryBonusPayrollRunAction({
        fiscalYear,
        payDate,
        entries: included.map((e) => ({ employeeId: e.employeeId, amount: e.bonusAmount })),
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Bonus run created");
      setPreview(null);
      router.push("/payroll/pay-runs/history");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--mnx-muted)]">Fiscal Year</span>
          <PeopleControlInput value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} placeholder="2026-27" />
        </label>
        <Button type="button" onClick={() => void handlePreview()} disabled={isLoading}>
          {isLoading ? "Computing…" : "Preview"}
        </Button>
      </div>

      {preview && preview.length > 0 ? (
        <div className="space-y-4">
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Include</PeopleTableHead>
                <PeopleTableHead>Employee</PeopleTableHead>
                <PeopleTableHead>Months Employed</PeopleTableHead>
                <PeopleTableHead>Calculation Wage</PeopleTableHead>
                <PeopleTableHead>Bonus Amount</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {preview.map((entry) => (
                <PeopleTableRow key={entry.employeeId}>
                  <PeopleTableCell>
                    {/* eslint-disable-next-line no-restricted-syntax -- row-inclusion toggle, not a text field */}
                    <input
                      type="checkbox"
                      checked={!excluded.has(entry.employeeId)}
                      onChange={(e) =>
                        setExcluded((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.delete(entry.employeeId);
                          else next.add(entry.employeeId);
                          return next;
                        })
                      }
                    />
                  </PeopleTableCell>
                  <PeopleTableCell>{entry.employeeName} (#{entry.employeeNumber})</PeopleTableCell>
                  <PeopleTableCell>{entry.monthsEmployed}</PeopleTableCell>
                  <PeopleTableCell>₹{entry.calculationWage.toLocaleString("en-IN")}</PeopleTableCell>
                  <PeopleTableCell>₹{entry.bonusAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>

          <div className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
            <div>
              <div className="text-xs text-[var(--mnx-muted)]">Total ({included.length} employees)</div>
              <div className="text-lg font-semibold text-[var(--mnx-text)]">₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--mnx-muted)]">Pay Date</span>
              <PeopleControlInput type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </label>
            <Button type="button" onClick={() => void handleConfirm()} disabled={isSubmitting || included.length === 0}>
              {isSubmitting ? "Confirming…" : "Confirm Bonus Run"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
