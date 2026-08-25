"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Phase 34: the summary-card strip matching the captured Zoho pay-run
// summary layout (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md pages
// 00010/00065/00067) — Period/Base Days + Payroll Cost/Total Net Pay, Pay
// Day + employee count, Taxes & Deductions. Extracted out of
// pay-run-summary-client.tsx (regular payroll) so the off-cycle/termination
// batch detail page (src/app/(dashboard)/payroll/pay-runs/[batchId]/page.tsx)
// reuses the same card presentations instead of duplicating markup. Callers
// compose the exact set of cards they have data for inside
// <SummaryCardGrid>.
export function SummaryCardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-3">{children}</div>;
}

export function PeriodCostCard({
  periodLabel,
  baseDays,
  payrollCost,
  totalNetPay,
}: {
  periodLabel: string;
  baseDays: number | null;
  payrollCost: number;
  totalNetPay: number;
}) {
  return (
    <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-4">
      <div className="flex items-center gap-2 text-sm text-[var(--mnx-muted)]">
        <span>
          {periodLabel}
          {baseDays != null ? ` | ${baseDays} Base Days` : ""}
        </span>
        <Pencil className="size-3.5 shrink-0" aria-hidden="true" />
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-[var(--mnx-text)]">{formatMoney(payrollCost)}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Payroll Cost</p>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-[var(--mnx-text)]">{formatMoney(totalNetPay)}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Total Net Pay</p>
      </div>
    </div>
  );
}

export function PayDayCard({ day, monthYear, employeeCount }: { day: string; monthYear: string; employeeCount: number }) {
  return (
    <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Pay Day</p>
      <p className="mt-1 text-3xl font-semibold text-[var(--mnx-text)]">{day}</p>
      <p className="text-sm text-[var(--mnx-muted)]">{monthYear}</p>
      <p className="mt-3 text-sm text-[var(--mnx-text)]">{employeeCount} Employees</p>
    </div>
  );
}

export function TaxesDeductionsCard({
  taxesTotal,
  benefitsTotal,
  otherDeductionsTotal,
}: {
  taxesTotal: number;
  benefitsTotal: number;
  otherDeductionsTotal: number;
}) {
  return (
    <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-4">
      <p className="text-sm font-semibold text-[var(--mnx-text)]">Taxes &amp; Deductions</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-[var(--mnx-muted)]">Taxes</dt>
          <dd className="font-medium text-[var(--mnx-text)]">{formatMoney(taxesTotal)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[var(--mnx-muted)]">Benefits</dt>
          <dd className="font-medium text-[var(--mnx-text)]">{formatMoney(benefitsTotal)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--mnx-border)] pt-2">
          <dt className="text-[var(--mnx-muted)]">Total Deductions</dt>
          <dd className="font-medium text-[var(--mnx-text)]">{formatMoney(otherDeductionsTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}
