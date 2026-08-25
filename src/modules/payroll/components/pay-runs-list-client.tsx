"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceBadge } from "@/components/layout/workspace";
import { OffCycleCreateModal } from "@/modules/payroll/components/off-cycle-client";
import { TerminationCreateModal } from "@/modules/payroll/components/termination-client";

type EmployeeOption = { id: string; name: string; employeeNumber: string };
type ExitingEmployee = { id: string; name: string; employeeNumber: string; lastWorkingDay: string };

export type RegularCard = {
  periodLabel: string;
  paymentDate: string;
  employeeCount: number;
  netPay: number;
  dueDate: string;
  href: string;
};

export type BatchCard = {
  id: string;
  title: string;
  status: "PAYMENT_DUE" | "PAYMENT_FAILED" | "PAID";
  totalAmount: number;
  paymentDate: string;
  employeeCount: number | null;
  overdueDays: number;
};

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

const STATUS_BADGE: Record<BatchCard["status"], { label: string; variant: "warning" | "danger" | "success" }> = {
  PAYMENT_DUE: { label: "PAYMENT DUE", variant: "warning" },
  PAYMENT_FAILED: { label: "PAYMENT FAILED", variant: "danger" },
  PAID: { label: "PAID", variant: "success" },
};

// Phase 16-21 UI cleanup: replaces the previously-stacked
// chips + PayrollClient + OffCycleClient-panel + TerminationClient-panel
// layout (the reported clutter) with a single card list matching the
// captured Zoho Pay Runs page exactly (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md,
// page 00009). Create flows moved behind "+New"; each card links to its own
// detail page instead of everything rendering inline at once.
export function PayRunsListClient({
  regularCard,
  offCycleCards,
  terminationCards,
  employees,
  exitingEmployees,
}: {
  regularCard: RegularCard | null;
  offCycleCards: BatchCard[];
  terminationCards: BatchCard[];
  employees: EmployeeOption[];
  exitingEmployees: ExitingEmployee[];
}) {
  const [filter, setFilter] = React.useState<"ALL" | "REGULAR" | "TERMINATION" | "OFF_CYCLE">("ALL");
  const [newMenuOpen, setNewMenuOpen] = React.useState(false);
  const [offCycleModalOpen, setOffCycleModalOpen] = React.useState(false);
  const [terminationModalOpen, setTerminationModalOpen] = React.useState(false);

  const chips = [
    { key: "ALL" as const, label: "All Pending", count: (regularCard ? 1 : 0) + offCycleCards.length + terminationCards.length },
    { key: "REGULAR" as const, label: "Regular Payroll", count: regularCard ? 1 : 0 },
    { key: "TERMINATION" as const, label: "Final Settlement Payroll", count: terminationCards.length },
    { key: "OFF_CYCLE" as const, label: "Off-Cycle Payroll", count: offCycleCards.length },
  ];

  const showRegular = (filter === "ALL" || filter === "REGULAR") && regularCard;
  const showOffCycle = filter === "ALL" || filter === "OFF_CYCLE";
  const showTermination = filter === "ALL" || filter === "TERMINATION";

  const nothingToShow =
    !showRegular &&
    (!showOffCycle || offCycleCards.length === 0) &&
    (!showTermination || terminationCards.length === 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Pay run type filters" className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            // eslint-disable-next-line no-restricted-syntax -- custom segmented-filter chip, not a standard action button
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={
                filter === chip.key
                  ? "flex items-center gap-2 rounded-full border border-[var(--mnx-accent)] px-3 py-1.5 text-sm font-medium text-[var(--mnx-accent-strong)]"
                  : "flex items-center gap-2 rounded-full border border-[var(--mnx-border)] px-3 py-1.5 text-sm font-medium text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
              }
            >
              {chip.label}
              <span className="rounded-full bg-[var(--mnx-surface-soft)] px-1.5 text-xs">{chip.count}</span>
            </button>
          ))}
        </nav>

        <div className="relative">
          <Button type="button" onClick={() => setNewMenuOpen((v) => !v)}>
            New <ChevronDown className="ml-1 inline size-4" aria-hidden="true" />
          </Button>
          {newMenuOpen ? (
            <div className="absolute right-0 z-10 mt-1 w-52 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-1 shadow-lg">
              <Link
                href="/payroll/pay-runs/regular"
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--mnx-surface-soft)]"
                onClick={() => setNewMenuOpen(false)}
              >
                Regular Payroll
              </Link>
              {/* eslint-disable-next-line no-restricted-syntax -- dropdown menu item, not a standard action button */}
              <button
                type="button"
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--mnx-surface-soft)]"
                onClick={() => {
                  setOffCycleModalOpen(true);
                  setNewMenuOpen(false);
                }}
              >
                Off-Cycle Payment
              </button>
              {/* eslint-disable-next-line no-restricted-syntax -- dropdown menu item, not a standard action button */}
              <button
                type="button"
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--mnx-surface-soft)]"
                onClick={() => {
                  setTerminationModalOpen(true);
                  setNewMenuOpen(false);
                }}
              >
                Final Settlement
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {nothingToShow ? (
        <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-8 text-center text-sm text-[var(--mnx-muted)]">
          No pay runs pending in this category.
        </div>
      ) : (
        <div className="space-y-4">
          {showRegular ? (
            <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-[var(--mnx-text)]">
                  Process Pay Run for <strong>{regularCard!.periodLabel}</strong>
                </h3>
                <WorkspaceBadge variant="neutral">DRAFT</WorkspaceBadge>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-[var(--mnx-muted)]">Employees&apos; Net Pay</div>
                  <div className="mt-1 font-medium text-[var(--mnx-text)]">{formatMoney(regularCard!.netPay)}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--mnx-muted)]">Payment Date</div>
                  <div className="mt-1 font-medium text-[var(--mnx-text)]">{formatDate(regularCard!.paymentDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--mnx-muted)]">No. of Employees</div>
                  <div className="mt-1 font-medium text-[var(--mnx-text)]">{regularCard!.employeeCount}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--mnx-muted)]">
                  Please approve this payroll on or before {formatDate(regularCard!.dueDate)}.
                </p>
                <Link className="mnx-button mnx-button-primary" href={regularCard!.href}>
                  View Details
                </Link>
              </div>
            </div>
          ) : null}

          {showOffCycle
            ? offCycleCards.map((card) => (
                <div key={card.id} className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-[var(--mnx-text)]">{card.title}</h3>
                    <WorkspaceBadge variant={STATUS_BADGE[card.status].variant}>{STATUS_BADGE[card.status].label}</WorkspaceBadge>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-[var(--mnx-muted)]">Employees&apos; Net Pay</div>
                      <div className="mt-1 font-medium text-[var(--mnx-text)]">{formatMoney(card.totalAmount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--mnx-muted)]">Payment Date</div>
                      <div className="mt-1 font-medium text-[var(--mnx-text)]">{formatDate(card.paymentDate)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    {card.overdueDays > 0 ? (
                      <p className="text-xs text-[var(--mnx-muted)]">This payment is overdue by {card.overdueDays} days.</p>
                    ) : (
                      <span />
                    )}
                    <Link className="mnx-button mnx-button-primary" href={`/payroll/pay-runs/${card.id}`}>
                      View Details &amp; Pay
                    </Link>
                  </div>
                </div>
              ))
            : null}

          {showTermination
            ? terminationCards.map((card) => (
                <div key={card.id} className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-[var(--mnx-text)]">{card.title}</h3>
                    <WorkspaceBadge variant={STATUS_BADGE[card.status].variant}>{STATUS_BADGE[card.status].label}</WorkspaceBadge>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-[var(--mnx-muted)]">Employees&apos; Net Pay</div>
                      <div className="mt-1 font-medium text-[var(--mnx-text)]">{formatMoney(card.totalAmount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--mnx-muted)]">Payment Date</div>
                      <div className="mt-1 font-medium text-[var(--mnx-text)]">{formatDate(card.paymentDate)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    {card.overdueDays > 0 ? (
                      <p className="text-xs text-[var(--mnx-muted)]">This payment is overdue by {card.overdueDays} days.</p>
                    ) : (
                      <span />
                    )}
                    <Link className="mnx-button mnx-button-primary" href={`/payroll/pay-runs/${card.id}`}>
                      View Details &amp; Pay
                    </Link>
                  </div>
                </div>
              ))
            : null}
        </div>
      )}

      <OffCycleCreateModal open={offCycleModalOpen} onClose={() => setOffCycleModalOpen(false)} employees={employees} />
      <TerminationCreateModal open={terminationModalOpen} onClose={() => setTerminationModalOpen(false)} exitingEmployees={exitingEmployees} />
    </div>
  );
}
