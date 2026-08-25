"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
} from "@/components/layout/workspace";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs } from "@/components/ui/tabs";
import { finalizePayrollBatchAction } from "@/modules/accounting/actions";
import { approvePayrollRunAction } from "@/modules/hrms/payroll-actions";
import type { PayrollEmployeeRow, PayrollWorkspaceData } from "@/modules/hrms/payroll";
import { SummaryCardGrid, PeriodCostCard, PayDayCard, TaxesDeductionsCard } from "@/modules/payroll/components/pay-run-summary-header";

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDeadlineLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

// The payroll pay-day convention used elsewhere in this workspace (see
// pay-runs-list-client.tsx's RegularCard) is "end of the period"; Zoho shows
// the disbursal day as the 1st of the following month. We keep the real
// period-end date as the due date (unchanged business logic) but derive the
// displayed "pay day" tile the way Zoho's UI frames it.
function derivePayDay(periodEndIso: string) {
  const end = new Date(periodEndIso);
  const payDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1));
  return {
    day: String(payDay.getUTCDate()).padStart(2, "0"),
    monthYear: new Intl.DateTimeFormat("en-IN", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
      .format(payDay)
      .toUpperCase(),
  };
}

type TabKey = "summary" | "taxes" | "insights";

export function PayRunSummaryClient({
  workspace,
  canApproveRun,
  canPostAccrual,
}: {
  workspace: PayrollWorkspaceData;
  canApproveRun: boolean;
  canPostAccrual: boolean;
}) {
  const router = useRouter();
  const [isApproving, startApproveTransition] = useTransition();
  const [isPosting, setIsPosting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState<"ALL" | "READY" | "REVIEW">("ALL");
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PayrollEmployeeRow | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const payDay = useMemo(() => derivePayDay(workspace.period.end), [workspace.period.end]);

  const payrollCost = workspace.summary.grossPayroll + workspace.summary.employerContributions;
  const taxesTotal = workspace.summary.tdsLiability + workspace.summary.professionalTaxLiability;
  const benefitsTotal = workspace.summary.epfEmployerLiability + workspace.summary.esiEmployerLiability;
  const otherDeductionsTotal = Math.max(
    0,
    workspace.summary.employeeDeductions - taxesTotal - workspace.summary.epfEmployeeLiability - workspace.summary.esiEmployeeLiability - workspace.summary.lwfEmployeeLiability,
  );

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return workspace.rows.filter((row) => {
      const matchesSearch =
        normalized.length === 0 ||
        row.employeeName.toLowerCase().includes(normalized) ||
        row.employeeNumber.toLowerCase().includes(normalized);
      const matchesFilter = employeeFilter === "ALL" || row.status === employeeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [search, employeeFilter, workspace.rows]);

  const pendingTasks: Array<{ label: string; href?: string }> = [];
  if (workspace.issues.length > 0) {
    pendingTasks.push({
      label: `${workspace.issues.length} employee(s) have unresolved payroll issues and need review.`,
    });
  }
  if (!workspace.settingsConfigured) {
    pendingTasks.push({
      label: "Accounting defaults (salary expense, payable, bank account) are not configured.",
      href: "/accounting/settings",
    });
  }

  function handleApprove() {
    startApproveTransition(async () => {
      const result = await approvePayrollRunAction(workspace.period.start);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Approved payroll run created for ${workspace.period.label}.`);
      router.refresh();
    });
  }

  async function handlePostAccrual() {
    if (!workspace.existingBatch) return;
    setIsPosting(true);
    try {
      const result = await finalizePayrollBatchAction(workspace.existingBatch.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Payroll accrual journal posted successfully.");
      router.refresh();
    } finally {
      setIsPosting(false);
    }
  }

  const canSubmit = canApproveRun && !workspace.existingBatch && workspace.issues.length === 0 && workspace.settingsConfigured;
  const showPostAccrual = workspace.existingBatch?.status === "APPROVED_HRMS" && canPostAccrual;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/payroll/pay-runs"
            aria-label="Back to Pay Runs"
            className="inline-flex size-8 items-center justify-center rounded-full text-[var(--mnx-muted)] hover:bg-[var(--mnx-surface-soft)] hover:text-[var(--mnx-text)]"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-semibold text-[var(--mnx-text)]">
            Regular Payroll for {workspace.period.label}
          </h1>
          <WorkspaceBadge
            variant={
              !workspace.existingBatch
                ? "neutral"
                : workspace.existingBatch.status === "FINALIZED" || workspace.existingBatch.status === "POSTED"
                  ? "success"
                  : "accent"
            }
          >
            {workspace.existingBatch ? workspace.existingBatch.status.replaceAll("_", " ") : "DRAFT"}
          </WorkspaceBadge>
        </div>
        <div className="flex items-center gap-2">
          {!workspace.existingBatch ? (
            <WorkspaceAction
              onClick={handleApprove}
              disabled={!canSubmit || isApproving}
              variant="accent"
              title={
                canSubmit
                  ? "Submit this payroll run for approval"
                  : "Resolve validation issues and accounting setup before approving"
              }
            >
              {isApproving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Submitting
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Submit and Approve
                </>
              )}
            </WorkspaceAction>
          ) : showPostAccrual ? (
            <WorkspaceAction
              onClick={handlePostAccrual}
              disabled={isPosting}
              variant="accent"
              title="Post the accrual journal so Finance can complete the payroll handoff."
            >
              {isPosting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Posting
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Post accrual journal
                </>
              )}
            </WorkspaceAction>
          ) : workspace.existingBatch.journalEntryId ? (
            <ButtonLink href={`/accounting/journal-entries/${workspace.existingBatch.journalEntryId}`} variant="accent">
              View journal
            </ButtonLink>
          ) : null}
          <Button variant="outline" mode="icon" title="Comments">
            <MessageSquare className="size-4" aria-hidden="true" />
          </Button>
          <div className="relative">
            <Button
              variant="outline"
              mode="icon"
              title="More options"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 z-10 mt-1 w-56 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-1 shadow-lg">
                {workspace.existingBatch?.journalEntryId ? (
                  <Link
                    href={`/accounting/journal-entries/${workspace.existingBatch.journalEntryId}`}
                    className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--mnx-surface-soft)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    View journal
                  </Link>
                ) : null}
                <Link
                  href="/payroll/reports"
                  className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--mnx-surface-soft)]"
                  onClick={() => setMenuOpen(false)}
                >
                  Payroll reports
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {!workspace.existingBatch ? (
        <WorkspaceAlert variant="info">
          Please approve this payroll before{" "}
          <strong>{formatDeadlineLabel(workspace.period.end)} IST</strong>. As per labour laws,
          salaries must be credited by the 7th of every month.
        </WorkspaceAlert>
      ) : null}

      {pendingTasks.length > 0 ? (
        <WorkspaceAlert variant="warning">
          <p className="font-medium uppercase tracking-wide text-xs">Pending Tasks</p>
          <p className="mt-1">
            {pendingTasks[0].href ? (
              <Link href={pendingTasks[0].href} className="underline">
                {pendingTasks[0].label}
              </Link>
            ) : (
              pendingTasks[0].label
            )}
          </p>
          {pendingTasks.length > 1 ? (
            <>
              {tasksExpanded ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {pendingTasks.slice(1).map((task) => (
                    <li key={task.label}>
                      {task.href ? (
                        <Link href={task.href} className="underline">
                          {task.label}
                        </Link>
                      ) : (
                        task.label
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              {/* eslint-disable-next-line no-restricted-syntax -- inline expand/collapse toggle, not a standard action button */}
              <button
                type="button"
                onClick={() => setTasksExpanded((v) => !v)}
                className="mt-1 underline"
              >
                {tasksExpanded
                  ? "Show fewer tasks"
                  : `+${pendingTasks.length - 1} more task(s) to be completed before you approve this payroll.`}
              </button>
            </>
          ) : null}
        </WorkspaceAlert>
      ) : null}

      <SummaryCardGrid>
        <PeriodCostCard
          periodLabel={`Period: ${formatDate(workspace.period.start)} - ${formatDate(workspace.period.end)}`}
          baseDays={workspace.period.daysInMonth}
          payrollCost={payrollCost}
          totalNetPay={workspace.summary.netPayroll}
        />
        <PayDayCard day={payDay.day} monthYear={payDay.monthYear} employeeCount={workspace.summary.employeesInPayroll} />
        <TaxesDeductionsCard taxesTotal={taxesTotal} benefitsTotal={benefitsTotal} otherDeductionsTotal={otherDeductionsTotal} />
      </SummaryCardGrid>

      <Tabs
        items={[
          { value: "summary", label: "Employee Summary" },
          { value: "taxes", label: "Taxes & Deductions" },
          { value: "insights", label: "Overall Insights" },
        ]}
        value={activeTab}
        onChange={(value) => setActiveTab(value as TabKey)}
      />

      {activeTab === "summary" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect
                value={employeeFilter}
                onChange={(event) => setEmployeeFilter(event.target.value as "ALL" | "READY" | "REVIEW")}
                className="h-9"
              >
                <option value="ALL">All Employees</option>
                <option value="READY">Ready</option>
                <option value="REVIEW">Review</option>
              </NativeSelect>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--mnx-muted)]"
                  aria-hidden="true"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Employee"
                  className="h-9 pl-8"
                />
              </div>
              <Button variant="outline" mode="icon" title="Filter">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <ButtonLink href="/payroll/employees/import" variant="outline">
              Import / Export
            </ButtonLink>
          </div>

          <div className="mnx-table-wrap overflow-x-auto rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-[var(--mnx-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--mnx-muted)]">
                  <th className="w-10 px-3 py-2">
                    <Input type="checkbox" aria-label="Select all employees" />
                  </th>
                  <th className="px-3 py-2">Employee Name</th>
                  <th className="px-3 py-2">Paid Days</th>
                  <th className="px-3 py-2">Gross Pay</th>
                  <th className="px-3 py-2">Deductions</th>
                  <th className="px-3 py-2">Taxes</th>
                  <th className="px-3 py-2">Benefits</th>
                  <th className="px-3 py-2">Reimbursements</th>
                  <th className="px-3 py-2">Net Pay</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-sm text-[var(--mnx-muted)]">
                      No employees match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.employeeId}
                      onClick={() => setSelectedRow(row)}
                      className="cursor-pointer border-b border-[var(--mnx-border)] last:border-b-0 hover:bg-[var(--mnx-surface-soft)]"
                    >
                      <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                        <Input type="checkbox" aria-label={`Select ${row.employeeName}`} />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-[var(--mnx-accent-strong)]">{row.employeeName}</span>{" "}
                        <span className="text-xs text-[var(--mnx-muted)]">({row.employeeNumber})</span>
                      </td>
                      <td className="px-3 py-2 text-[var(--mnx-text)]">{row.payableDays}</td>
                      <td className="px-3 py-2 text-[var(--mnx-text)]">{formatMoney(row.grossEarnings)}</td>
                      <td className="px-3 py-2 text-[var(--mnx-text)]">
                        {formatMoney(row.employeeDeductions - row.tdsAmount - row.professionalTaxAmount)}
                      </td>
                      <td className="px-3 py-2 text-[var(--mnx-text)]">
                        {formatMoney(row.tdsAmount + row.professionalTaxAmount)}
                      </td>
                      <td className="px-3 py-2 text-[var(--mnx-text)]">
                        {formatMoney(row.epfEmployerAmount + row.esiEmployerAmount)}
                      </td>
                      <td className="px-3 py-2 text-[var(--mnx-text)]">{formatMoney(row.reimbursements)}</td>
                      <td className="px-3 py-2 font-semibold text-[var(--mnx-text)]">{formatMoney(row.netPay)}</td>
                      <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="outline"
                          mode="icon"
                          className="size-7"
                          title="Row actions"
                          onClick={() => setSelectedRow(row)}
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === "taxes" ? (
        <div className="overflow-x-auto rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--mnx-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--mnx-muted)]">
                <th className="px-3 py-2">Employee Name</th>
                <th className="px-3 py-2">Taxes</th>
                <th className="px-3 py-2">Benefits</th>
                <th className="px-3 py-2">Deductions</th>
              </tr>
            </thead>
            <tbody>
              {workspace.rows.map((row) => (
                <tr key={row.employeeId} className="border-b border-[var(--mnx-border)] last:border-b-0">
                  <td className="px-3 py-2 text-[var(--mnx-text)]">
                    {row.employeeName} <span className="text-xs text-[var(--mnx-muted)]">({row.employeeNumber})</span>
                  </td>
                  <td className="px-3 py-2 text-[var(--mnx-text)]">
                    {formatMoney(row.tdsAmount + row.professionalTaxAmount)}
                  </td>
                  <td className="px-3 py-2 text-[var(--mnx-text)]">
                    {formatMoney(row.epfEmployerAmount + row.esiEmployerAmount)}
                  </td>
                  <td className="px-3 py-2 text-[var(--mnx-text)]">
                    {formatMoney(row.employeeDeductions - row.tdsAmount - row.professionalTaxAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeTab === "insights" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Gross Payroll", value: workspace.summary.grossPayroll },
            { label: "Net Payroll", value: workspace.summary.netPayroll },
            { label: "Employee Deductions", value: workspace.summary.employeeDeductions },
            { label: "Employer Contributions", value: workspace.summary.employerContributions },
            { label: "Overtime Paid", value: workspace.summary.overtimeAmount },
            { label: "Incentives", value: workspace.summary.incentives },
            { label: "Reimbursements", value: workspace.summary.reimbursements },
            { label: "LOP Impact", value: workspace.summary.lopImpact },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">{tile.label}</p>
              <p className="mt-1 text-xl font-semibold text-[var(--mnx-text)]">{formatMoney(tile.value)}</p>
            </div>
          ))}
        </div>
      ) : null}

      <EmployeeDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
}

function EmployeeDrawer({
  row,
  onClose,
}: {
  row: PayrollEmployeeRow | null;
  onClose: () => void;
}) {
  const [lopExpanded, setLopExpanded] = useState(false);
  const open = row != null;

  // Saving isn't wired to a mutation yet — no per-employee payroll-line
  // adjustment endpoint exists in this codebase (calculatePayrollEmployeeRow
  // derives every row live from HRMS attendance/leave/OT/comp records on each
  // read; there's nowhere to persist a manual override yet). Save currently
  // just closes the drawer so the UI doesn't lie about persisting an edit.
  function handleSave() {
    toast.info("Payroll line edits aren't wired to a save mutation yet.");
    onClose();
  }

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-[var(--mnx-border)] bg-[var(--mnx-surface)] shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {row ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-[var(--mnx-border)] p-4">
              <div>
                <p className="text-base font-semibold text-[var(--mnx-accent-strong)]">{row.employeeName}</p>
                <p className="mt-0.5 text-xs text-[var(--mnx-muted)]">Emp. ID: {row.employeeNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Net Pay</p>
                <p className="text-lg font-semibold text-[var(--mnx-text)]">{formatMoney(row.netPay)}</p>
              </div>
              <Button variant="outline" mode="icon" onClick={onClose} aria-label="Close" className="shrink-0 rounded-full">
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--mnx-muted)]">Payable Days</span>
                <span className="flex items-center gap-2 font-medium text-[var(--mnx-text)]">
                  {row.payableDays}
                  <Pencil className="size-3.5 text-[var(--mnx-muted)]" aria-hidden="true" />
                </span>
              </div>
              {/* eslint-disable-next-line no-restricted-syntax -- inline expand toggle for the LOP note, not a standard action button */}
              <button
                type="button"
                onClick={() => setLopExpanded((v) => !v)}
                className="mt-2 flex items-center gap-1 text-sm text-[var(--mnx-accent-strong)]"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add LOP
                <ChevronDown
                  className={`size-3.5 transition-transform ${lopExpanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {lopExpanded ? (
                <p className="mt-1 text-xs text-[var(--mnx-muted)]">
                  Manual LOP entry isn&apos;t wired to a mutation yet — LOP days are currently sourced from
                  approved leave and the HRMS LOP register for this period.
                </p>
              ) : null}

              <section className="mt-5">
                <div className="flex items-center justify-between border-b border-[var(--mnx-border)] pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--mnx-success)]">
                  <span>(+) Earnings</span>
                  <span>Amount</span>
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--mnx-text)]">Basic &amp; Fixed Pay</span>
                    <span className="text-[var(--mnx-text)]">
                      {formatMoney(Math.max(0, row.grossEarnings - row.otAmount - row.incentives))}
                    </span>
                  </div>
                  {row.otAmount > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--mnx-text)]">Overtime</span>
                      <span className="text-[var(--mnx-text)]">{formatMoney(row.otAmount)}</span>
                    </div>
                  ) : null}
                  {row.incentives > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--mnx-text)]">Incentives</span>
                      <span className="text-[var(--mnx-text)]">{formatMoney(row.incentives)}</span>
                    </div>
                  ) : null}
                  {row.reimbursements > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--mnx-text)]">Reimbursements</span>
                      <span className="text-[var(--mnx-text)]">{formatMoney(row.reimbursements)}</span>
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 flex items-center gap-1 text-sm text-[var(--mnx-accent-strong)]">
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add Earning
                </p>
              </section>

              <section className="mt-5">
                <div className="flex items-center justify-between border-b border-[var(--mnx-border)] pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--mnx-danger)]">
                  <span>(-) Deductions</span>
                  <span>Amount</span>
                </div>

                {(row.epfEmployeeAmount > 0 || row.esiEmployeeAmount > 0) ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-muted)]">Benefits</p>
                    <div className="mt-1 space-y-2 text-sm">
                      {row.epfEmployeeAmount > 0 ? (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[var(--mnx-text)]">EPF Contribution</p>
                            <p className="text-xs text-[var(--mnx-muted)]">
                              Employer Contribution: {formatMoney(row.epfEmployerAmount)}
                            </p>
                          </div>
                          <span className="flex items-center gap-2 text-[var(--mnx-text)]">
                            {formatMoney(row.epfEmployeeAmount)}
                            <Pencil className="size-3.5 text-[var(--mnx-muted)]" aria-hidden="true" />
                          </span>
                        </div>
                      ) : null}
                      {row.esiEmployeeAmount > 0 ? (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[var(--mnx-text)]">ESI Contribution</p>
                            <p className="text-xs text-[var(--mnx-muted)]">
                              Employer Contribution: {formatMoney(row.esiEmployerAmount)}
                            </p>
                          </div>
                          <span className="text-[var(--mnx-text)]">{formatMoney(row.esiEmployeeAmount)}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {(row.tdsAmount > 0 || row.professionalTaxAmount > 0) ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-muted)]">Taxes</p>
                    <div className="mt-1 space-y-2 text-sm">
                      {row.tdsAmount > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--mnx-text)]">Income Tax</span>
                          <span className="flex items-center gap-2 text-[var(--mnx-text)]">
                            {formatMoney(row.tdsAmount)}
                            <Pencil className="size-3.5 text-[var(--mnx-muted)]" aria-hidden="true" />
                          </span>
                        </div>
                      ) : null}
                      {row.professionalTaxAmount > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--mnx-text)]">Professional Tax</span>
                          <span className="text-[var(--mnx-text)]">{formatMoney(row.professionalTaxAmount)}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {(row.loanEmiDeduction > 0 || row.lwfAmount > 0) ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-muted)]">Deductions</p>
                    <div className="mt-1 space-y-2 text-sm">
                      {row.loanEmiDeduction > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--mnx-text)]">Loan Repayment</span>
                          <span className="flex items-center gap-2 text-[var(--mnx-text)]">
                            {formatMoney(row.loanEmiDeduction)}
                            <Pencil className="size-3.5 text-[var(--mnx-muted)]" aria-hidden="true" />
                          </span>
                        </div>
                      ) : null}
                      {row.lwfAmount > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--mnx-text)]">Labour Welfare Fund</span>
                          <span className="text-[var(--mnx-text)]">{formatMoney(row.lwfAmount)}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <p className="mt-3 flex items-center gap-1 text-sm text-[var(--mnx-accent-strong)]">
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add Deduction
                </p>
              </section>

              <div className="mt-5 flex items-center justify-between rounded-[var(--mn-radius-control)] bg-[var(--mnx-surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--mnx-text)]">
                <span>Net Pay</span>
                <span>{formatMoney(row.netPay)}</span>
              </div>

              {row.issues.length > 0 ? (
                <ul className="mt-3 space-y-1 text-xs text-[var(--mnx-warning)]">
                  {row.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--mnx-border)] p-4">
              <Button variant="accent" onClick={handleSave} className="flex-1 justify-center">
                Save
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1 justify-center">
                Cancel
              </Button>
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
