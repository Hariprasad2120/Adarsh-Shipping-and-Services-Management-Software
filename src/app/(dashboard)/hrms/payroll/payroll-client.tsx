"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CircleDashed,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  History,
  Loader2,
  MailCheck,
  ReceiptIndianRupee,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceMetric,
} from "@/components/layout/workspace";
import { finalizePayrollBatchAction } from "@/modules/accounting/actions";
import { approvePayrollRunAction } from "@/modules/hrms/payroll-actions";
import type {
  PayrollBatchSummary,
  PayrollWorkspaceData,
} from "@/modules/hrms/payroll";
import {
  PeopleField,
  PeopleInput,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSelect,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";

type BatchRow = PayrollBatchSummary;

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMonthLabel(isoDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

function formatDateTime(isoDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function getBatchBadgeVariant(status: string) {
  if (status === "APPROVED_HRMS") {
    return "accent" as const;
  }
  if (status === "FINALIZED" || status === "POSTED") {
    return "success" as const;
  }
  if (status.includes("FAILED") || status.includes("REJECT")) {
    return "danger" as const;
  }
  return "neutral" as const;
}

function getBatchStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function buildPeriodOptions(periodKey: string) {
  const [year, month] = periodKey.split("-").map(Number);
  const anchor = Number.isFinite(year) && Number.isFinite(month)
    ? new Date(Date.UTC(year, month - 1, 1))
    : new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const optionDate = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 5 + index, 1),
    );
    const key = `${optionDate.getUTCFullYear()}-${String(optionDate.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(optionDate),
    };
  });
}

export function PayrollClient({
  canApproveRun,
  canPostAccrual,
  initialBatches,
  workspace,
}: {
  canApproveRun: boolean;
  canPostAccrual: boolean;
  initialBatches: BatchRow[];
  workspace: PayrollWorkspaceData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isApproving, startApproveTransition] = useTransition();
  const [postingBatchId, setPostingBatchId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "READY" | "REVIEW">(
    "ALL",
  );

  const periodOptions = useMemo(
    () => buildPeriodOptions(workspace.period.key),
    [workspace.period.key],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return workspace.rows.filter((row) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        row.employeeName.toLowerCase().includes(normalizedSearch) ||
        row.employeeNumber.toLowerCase().includes(normalizedSearch) ||
        (row.departmentName ?? "").toLowerCase().includes(normalizedSearch) ||
        (row.designation ?? "").toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "ALL" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, workspace.rows]);

  const selectedPeriod = searchParams.get("period") ?? workspace.period.key;

  function changePeriod(periodKey: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", periodKey);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleApproveRun() {
    startApproveTransition(async () => {
      const result = await approvePayrollRunAction(workspace.period.start);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Approved payroll run created for ${workspace.period.label}. You can now post the accrual journal.`,
      );
      router.refresh();
    });
  }

  async function handlePostBatch(batchId: string) {
    setPostingBatchId(batchId);
    try {
      const result = await finalizePayrollBatchAction(batchId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Payroll accrual journal posted successfully.");
      router.refresh();
    } finally {
      setPostingBatchId(null);
    }
  }

  const existingPeriodBatches = initialBatches.filter(
    (batch) => batch.month.slice(0, 7) === workspace.period.key,
  );
  const hasExistingBatch = Boolean(workspace.existingBatch);
  const hasValidationIssues = workspace.issues.length > 0;
  const canCreatePayRun =
    canApproveRun &&
    !hasExistingBatch &&
    !hasValidationIssues &&
    workspace.settingsConfigured;

  let createPayRunHint =
    "Create an immutable payroll run from HRMS attendance, leave, OT, and compensation inputs.";
  if (!canApproveRun) {
    createPayRunHint =
      "Creation requires both HRMS salary management and accounting integration posting permissions.";
  } else if (hasExistingBatch) {
    createPayRunHint =
      "A pay run already exists for this period. Use the existing batch or payroll correction flow.";
  } else if (hasValidationIssues) {
    createPayRunHint =
      "Resolve employee validation issues first, then create the pay run.";
  } else if (!workspace.settingsConfigured) {
    createPayRunHint =
      "Complete accounting defaults before creating the pay run.";
  }

  const currentBatch = workspace.existingBatch;
  const historyBatches = initialBatches.filter(
    (batch) => batch.id !== currentBatch?.id,
  );
  const showCurrentBatchPostAction =
    currentBatch != null &&
    canPostAccrual &&
    currentBatch.status === "APPROVED_HRMS";
  const showCurrentBatchPaymentsAction =
    currentBatch != null &&
    (currentBatch.status === "FINALIZED" || currentBatch.status === "POSTED");
  const currentBatchActionLabel = !currentBatch
    ? "Create pay run"
    : showCurrentBatchPostAction
      ? "Post accrual journal"
      : currentBatch.journalEntryId
        ? "View journal"
        : showCurrentBatchPaymentsAction
          ? "Open payments"
          : "Open payslips";
  const currentBatchActionHint = !currentBatch
    ? createPayRunHint
    : showCurrentBatchPostAction
      ? "The payroll snapshot already exists. Post the accrual journal to hand the run to Accounting."
      : currentBatch.journalEntryId
        ? "The current pay run has a linked accounting journal ready for review."
        : showCurrentBatchPaymentsAction
          ? "The current pay run is ready for payment follow-up and payout tracking."
          : "The current pay run already exists for this period. Review the batch outputs and employee documents.";

  return (
    <div className="space-y-6">
      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Payroll control"
          title="Payroll operations workspace"
          description="Compile the live pay run directly from HRMS employee, leave, attendance, OT, and incentive records. Approve the run in HRMS, then post the accrual through Accounting."
          actions={
            <div className="flex flex-wrap gap-2">
              {workspace.existingBatch?.journalEntryId ? (
                <Link
                  className="mnx-button mnx-button-secondary"
                  href={`/accounting/journal-entries/${workspace.existingBatch.journalEntryId}`}
                >
                  View journal
                </Link>
              ) : null}
              {!currentBatch ? (
                <WorkspaceAction
                  onClick={handleApproveRun}
                  disabled={!canCreatePayRun || isApproving}
                  variant="accent"
                  title={createPayRunHint}
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Creating pay run
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      {currentBatchActionLabel}
                    </>
                  )}
                </WorkspaceAction>
              ) : showCurrentBatchPostAction ? (
                <WorkspaceAction
                  disabled={postingBatchId === currentBatch.id}
                  onClick={() => handlePostBatch(currentBatch.id)}
                  variant="accent"
                  title={currentBatchActionHint}
                >
                  {postingBatchId === currentBatch.id ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Posting journal
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="size-4" aria-hidden="true" />
                      {currentBatchActionLabel}
                    </>
                  )}
                </WorkspaceAction>
              ) : (
                <Link
                  className="mnx-button mnx-button-primary"
                  href={
                    currentBatch.journalEntryId
                      ? `/accounting/journal-entries/${currentBatch.journalEntryId}`
                      : showCurrentBatchPaymentsAction
                        ? "/payroll/payments"
                        : "/payroll/payslips"
                  }
                  title={currentBatchActionHint}
                >
                  {currentBatchActionLabel}
                </Link>
              )}
            </div>
          }
        />
        <p className="text-sm text-[var(--mnx-muted)]">{currentBatchActionHint}</p>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
          <div className="grid gap-4 md:grid-cols-3">
            <PeopleField label="Payroll period">
              <PeopleSelect
                value={selectedPeriod}
                onChange={(event) => changePeriod(event.target.value)}
              >
                {periodOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </PeopleSelect>
            </PeopleField>
            <PeopleField label="Run health">
              <div className="flex h-[42px] items-center rounded-[var(--mn-radius-control)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] px-3 text-sm text-[var(--mnx-text)]">
                {workspace.issues.length === 0
                  ? "Ready for approval"
                  : `${workspace.issues.length} employee exceptions`}
              </div>
            </PeopleField>
            <PeopleField label="Accounting handoff">
              <div className="flex h-[42px] items-center rounded-[var(--mn-radius-control)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] px-3 text-sm text-[var(--mnx-text)]">
                {workspace.existingBatch
                  ? workspace.existingBatch.status
                  : "No approved batch yet"}
              </div>
            </PeopleField>
          </div>

          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--mnx-muted)]">
              Workflow status
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <WorkspaceBadge variant="neutral">{workspace.period.label}</WorkspaceBadge>
              <WorkspaceBadge
                variant={workspace.issues.length === 0 ? "success" : "warning"}
              >
                {workspace.issues.length === 0 ? "Validation clear" : "Needs review"}
              </WorkspaceBadge>
              <WorkspaceBadge
                variant={workspace.settingsConfigured ? "accent" : "danger"}
              >
                {workspace.settingsConfigured
                  ? "Accounting mapped"
                  : "Accounting setup missing"}
              </WorkspaceBadge>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-[var(--mnx-success)]"
                  aria-hidden="true"
                />
                <div>
                  <strong className="block text-[var(--mnx-text)]">1. Build payroll inputs</strong>
                  <span className="text-[var(--mnx-muted)]">
                    HRMS attendance, leave, OT, incentives, and salary structure are ready for this cycle.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {currentBatch ? (
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-[var(--mnx-success)]"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleDashed
                    className="mt-0.5 size-4 shrink-0 text-[var(--mnx-muted)]"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <strong className="block text-[var(--mnx-text)]">2. Create immutable run</strong>
                  <span className="text-[var(--mnx-muted)]">
                    {currentBatch
                      ? `Current batch ${getBatchStatusLabel(currentBatch.status).toLowerCase()} for ${workspace.period.label}.`
                      : "No immutable pay run exists for this payroll period yet."}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {(currentBatch?.status === "FINALIZED" || currentBatch?.status === "POSTED") ? (
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-[var(--mnx-success)]"
                    aria-hidden="true"
                  />
                ) : currentBatch?.status === "APPROVED_HRMS" ? (
                  <Clock3
                    className="mt-0.5 size-4 shrink-0 text-[var(--mnx-warning)]"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleDashed
                    className="mt-0.5 size-4 shrink-0 text-[var(--mnx-muted)]"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <strong className="block text-[var(--mnx-text)]">3. Accounting and payout</strong>
                  <span className="text-[var(--mnx-muted)]">
                    {showCurrentBatchPostAction
                      ? "Post the accrual journal next so Finance can complete payroll handoff."
                      : showCurrentBatchPaymentsAction
                        ? "Accounting handoff is done. Continue with payment execution and payout tracking."
                        : "Accounting and payment actions will appear here once the run advances."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!workspace.settingsConfigured ? (
          <WorkspaceAlert className="mt-4" variant="warning">
            Configure the default salary expense account, salary payable account,
            and bank account in <strong>Accounting Settings</strong> before
            approving a payroll run.
          </WorkspaceAlert>
        ) : null}
      </PeopleSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Current pay run"
            title={
              currentBatch
                ? `${workspace.period.label} payroll batch`
                : `Create ${workspace.period.label} payroll batch`
            }
            description={
              currentBatch
                ? "The current payroll cycle is already on record. Use this workspace to continue approval, accounting, payment, and payslip follow-up."
                : "No pay run has been created for this period yet. The workspace below is ready to compile the current month into an immutable payroll batch."
            }
          />

          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5 shadow-[var(--mnx-shadow-soft)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <WorkspaceBadge variant="neutral">{workspace.period.label}</WorkspaceBadge>
                  <WorkspaceBadge
                    variant={
                      currentBatch ? getBatchBadgeVariant(currentBatch.status) : "warning"
                    }
                  >
                    {currentBatch ? getBatchStatusLabel(currentBatch.status) : "Pending creation"}
                  </WorkspaceBadge>
                  <WorkspaceBadge
                    variant={workspace.issues.length === 0 ? "success" : "warning"}
                  >
                    {workspace.summary.readyEmployees} ready
                  </WorkspaceBadge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-muted)]">
                      Gross payroll
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--mnx-text)]">
                      {formatMoney(workspace.summary.grossPayroll)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-muted)]">
                      Net payroll
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--mnx-text)]">
                      {formatMoney(workspace.summary.netPayroll)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-muted)]">
                      Employees
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--mnx-text)]">
                      {workspace.summary.employeesInPayroll}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-muted)]">
                      Accounting
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--mnx-text)]">
                      {currentBatch?.journalVoucherNo ?? "Not posted"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-w-[220px] rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--mnx-muted)]">
                  Current batch details
                </p>
                <div className="mt-3 space-y-2 text-sm text-[var(--mnx-muted)]">
                  <p>
                    <span className="font-medium text-[var(--mnx-text)]">Batch status:</span>{" "}
                    {currentBatch ? getBatchStatusLabel(currentBatch.status) : "Not created"}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--mnx-text)]">Created:</span>{" "}
                    {currentBatch ? formatDateTime(currentBatch.createdAt) : "Awaiting approval"}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--mnx-text)]">Last updated:</span>{" "}
                    {currentBatch ? formatDateTime(currentBatch.updatedAt) : "No batch activity yet"}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--mnx-text)]">Journal voucher:</span>{" "}
                    {currentBatch?.journalVoucherNo ?? "Not available"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--mnx-muted)]">
                  Next actions
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!currentBatch ? (
                    <WorkspaceAction
                      onClick={handleApproveRun}
                      disabled={!canCreatePayRun || isApproving}
                      variant="accent"
                      title={createPayRunHint}
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          Creating pay run
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                          Create pay run
                        </>
                      )}
                    </WorkspaceAction>
                  ) : null}
                  {currentBatch?.journalEntryId ? (
                    <Link
                      href={`/accounting/journal-entries/${currentBatch.journalEntryId}`}
                      className="mnx-button mnx-button-secondary"
                    >
                      View journal
                    </Link>
                  ) : null}
                  {showCurrentBatchPostAction ? (
                    <WorkspaceAction
                      disabled={postingBatchId === currentBatch.id}
                      onClick={() => handlePostBatch(currentBatch.id)}
                      variant="outline"
                    >
                      {postingBatchId === currentBatch.id ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          Posting
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="size-4" aria-hidden="true" />
                          Post accrual journal
                        </>
                      )}
                    </WorkspaceAction>
                  ) : null}
                  <Link className="mnx-button mnx-button-secondary" href="/payroll/payments">
                    <Wallet className="size-4" aria-hidden="true" />
                    Payments
                  </Link>
                  <Link className="mnx-button mnx-button-secondary" href="/payroll/payslips">
                    <MailCheck className="size-4" aria-hidden="true" />
                    Payslips
                  </Link>
                  <Link className="mnx-button mnx-button-secondary" href="/payroll/reports">
                    <History className="size-4" aria-hidden="true" />
                    Reports and history
                  </Link>
                </div>
                <p className="mt-3 text-sm text-[var(--mnx-muted)]">
                  {currentBatch
                    ? `This page stays anchored to the existing ${getBatchStatusLabel(currentBatch.status).toLowerCase()} batch so the workflow does not disappear after creation.`
                    : "Once the run is created, this card becomes the single control point for journal posting, payments, and payslip distribution."}
                </p>
              </div>

              <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--mnx-muted)]">
                  Period summary
                </p>
                <div className="mt-3 space-y-2 text-sm text-[var(--mnx-muted)]">
                  <p>Employee deductions: {formatMoney(workspace.summary.employeeDeductions)}</p>
                  <p>Employer contribution: {formatMoney(workspace.summary.employerContributions)}</p>
                  <p>Compliance liability: {formatMoney(workspace.summary.complianceLiability)}</p>
                  <p>OT and incentives: {formatMoney(workspace.summary.overtimeAmount + workspace.summary.incentives)}</p>
                  <p>LOP impact: {formatMoney(workspace.summary.lopImpact)}</p>
                </div>
              </div>
            </div>
          </div>
        </PeopleSection>

        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Payroll history"
            title="Recent batches"
            description="Separate the active payroll cycle from prior runs so the current period always stays visible."
          />
          <div className="space-y-3">
            {currentBatch ? (
              <article className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-accent)]/30 bg-[var(--mnx-accent-bg)]/18 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--mnx-text)]">
                      {formatMonthLabel(currentBatch.month)} current period
                    </p>
                    <p className="mt-1 text-xs text-[var(--mnx-muted)]">
                      Total {formatMoney(currentBatch.totalAmount)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--mnx-muted)]">
                      Updated {formatDateTime(currentBatch.updatedAt)}
                    </p>
                  </div>
                  <WorkspaceBadge variant={getBatchBadgeVariant(currentBatch.status)}>
                    {getBatchStatusLabel(currentBatch.status)}
                  </WorkspaceBadge>
                </div>
              </article>
            ) : null}
            {historyBatches.length === 0 ? (
              <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4 text-sm text-[var(--mnx-muted)]">
                No prior payroll batches are available yet.
              </div>
            ) : (
              historyBatches.slice(0, 6).map((batch) => (
                <article
                  key={batch.id}
                  className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--mnx-text)]">
                        {formatMonthLabel(batch.month)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--mnx-muted)]">
                        Total {formatMoney(batch.totalAmount)}
                      </p>
                    </div>
                    <WorkspaceBadge variant={getBatchBadgeVariant(batch.status)}>
                      {getBatchStatusLabel(batch.status)}
                    </WorkspaceBadge>
                  </div>
                  <p className="mt-2 text-xs text-[var(--mnx-muted)]">
                    Updated {formatDateTime(batch.updatedAt)}
                  </p>
                </article>
              ))
            )}
            <Link className="mnx-button mnx-button-secondary w-full justify-center" href="/payroll/reports">
              Open payroll reports
            </Link>
          </div>
        </PeopleSection>
      </div>

      <section className="mnx-workspace-metrics" aria-label="Payroll metrics">
        <WorkspaceMetric
          icon={<Users aria-hidden="true" />}
          label="Employees in payroll"
          value={workspace.summary.employeesInPayroll}
          detail={`${workspace.summary.readyEmployees} ready · ${workspace.summary.reviewEmployees} review`}
        />
        <WorkspaceMetric
          icon={<ReceiptIndianRupee aria-hidden="true" />}
          label="Gross payroll"
          value={formatMoney(workspace.summary.grossPayroll)}
          detail={`Net ${formatMoney(workspace.summary.netPayroll)}`}
        />
        <WorkspaceMetric
          icon={<Wallet aria-hidden="true" />}
          label="Employee deductions"
          value={formatMoney(workspace.summary.employeeDeductions)}
          detail={`Compliance liability ${formatMoney(workspace.summary.complianceLiability)}`}
        />
        <WorkspaceMetric
          icon={<TrendingUp aria-hidden="true" />}
          label="Employer contribution"
          value={formatMoney(workspace.summary.employerContributions)}
          detail={`OT ${formatMoney(workspace.summary.overtimeAmount)} · Incentives ${formatMoney(workspace.summary.incentives)}`}
        />
        <WorkspaceMetric
          icon={<Clock3 aria-hidden="true" />}
          label="LOP impact"
          value={formatMoney(workspace.summary.lopImpact)}
          detail={`${workspace.period.daysInMonth} calendar days in period`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Payroll register"
            title="Employee pay run register"
            description="Review how salary, leave-derived LOP, approved OT, and incentives combine into the current payroll run."
          />

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <PeopleField label="Search employee">
              <PeopleInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee, emp #, department"
              />
            </PeopleField>
            <PeopleField label="Validation status">
              <PeopleSelect
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "ALL" | "READY" | "REVIEW")
                }
              >
                <option value="ALL">All rows</option>
                <option value="READY">Ready</option>
                <option value="REVIEW">Review</option>
              </PeopleSelect>
            </PeopleField>
          </div>

          <div className="mt-4">
            <PeopleTable>
              <PeopleTableHeader>
                <tr>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Attendance inputs</PeopleTableHead>
                  <PeopleTableHead>OT and variable pay</PeopleTableHead>
                  <PeopleTableHead>Gross / deductions / net</PeopleTableHead>
                  <PeopleTableHead>Status</PeopleTableHead>
                </tr>
              </PeopleTableHeader>
              <PeopleTableBody>
                {filteredRows.length === 0 ? (
                  <PeopleTableEmpty
                    colSpan={5}
                    message="No payroll rows match the selected filters."
                  />
                ) : (
                  filteredRows.map((row) => (
                    <PeopleTableRow key={row.employeeId}>
                      <PeopleTableCell>
                        <div className="space-y-1">
                          <strong className="block text-[var(--mnx-text)]">
                            {row.employeeName}
                          </strong>
                          <p className="text-xs text-[var(--mnx-muted)]">
                            {row.employeeNumber} · {row.designation ?? "No designation"}
                          </p>
                          <p className="text-xs text-[var(--mnx-muted)]">
                            {row.departmentName ?? "No department"} ·{" "}
                            {row.branchName ?? "No branch"}
                          </p>
                        </div>
                      </PeopleTableCell>
                      <PeopleTableCell>
                        <div className="space-y-1 text-xs text-[var(--mnx-muted)]">
                          <p>Employment days: {row.employmentDays}</p>
                          <p>Payable days: {row.payableDays}</p>
                          <p>
                            Present {row.presentDays} · Paid leave {row.paidLeaveDays}
                          </p>
                          <p>
                            Unpaid leave {row.unpaidLeaveDays} · Manual LOP {row.manualLopDays}
                          </p>
                        </div>
                      </PeopleTableCell>
                      <PeopleTableCell>
                        <div className="space-y-1 text-xs text-[var(--mnx-muted)]">
                          <p>OT hours: {row.otHours}</p>
                          <p>OT amount: {formatMoney(row.otAmount)}</p>
                          <p>Incentives: {formatMoney(row.incentives)}</p>
                          <p>Payment mode: {row.paymentMode ?? "Missing"}</p>
                        </div>
                      </PeopleTableCell>
                      <PeopleTableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[var(--mnx-text)]">
                            {formatMoney(row.grossEarnings)}
                          </p>
                          <p className="text-xs text-[var(--mnx-muted)]">
                            Deductions {formatMoney(row.employeeDeductions)}
                          </p>
                          {row.loanEmiDeduction > 0 ? (
                            <p className="text-xs text-[var(--mnx-muted)]">
                              Loan EMI {formatMoney(row.loanEmiDeduction)}
                            </p>
                          ) : null}
                          <p className="text-xs text-[var(--mnx-muted)]">
                            Employer {formatMoney(row.employerContributions)}
                          </p>
                          <p className="text-xs font-semibold text-[var(--mnx-accent-strong)]">
                            Net {formatMoney(row.netPay)}
                          </p>
                        </div>
                      </PeopleTableCell>
                      <PeopleTableCell>
                        <div className="space-y-2">
                          <WorkspaceBadge
                            variant={row.status === "READY" ? "success" : "warning"}
                          >
                            {row.status === "READY" ? "Ready" : "Review"}
                          </WorkspaceBadge>
                          {row.issues.length > 0 ? (
                            <ul className="space-y-1 text-xs text-[var(--mnx-warning)]">
                              {row.issues.map((issue) => (
                                <li key={issue}>{issue}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-[var(--mnx-muted)]">
                              Validation clear
                            </p>
                          )}
                        </div>
                      </PeopleTableCell>
                    </PeopleTableRow>
                  ))
                )}
              </PeopleTableBody>
            </PeopleTable>
          </div>
        </PeopleSection>

        <div className="space-y-6">
          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Validation queue"
              title="Review blockers"
              description="Payroll approval is intentionally blocked until these employee-level issues are resolved."
            />
            {workspace.issues.length === 0 ? (
              <div className="flex items-start gap-3 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-success)]/20 bg-[var(--mnx-success-bg)]/20 p-4 text-sm text-[var(--mnx-success)]">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <strong className="block">No validation blockers</strong>
                  This payroll period is clean enough to create an immutable
                  approved run.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {workspace.issues.map((issue) => (
                  <article
                    key={issue.employeeId}
                    className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-warning)]/25 bg-[var(--mnx-warning-bg)]/15 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className="mt-0.5 size-4 shrink-0 text-[var(--mnx-warning)]"
                        aria-hidden="true"
                      />
                      <div>
                        <strong className="block text-[var(--mnx-text)]">
                          {issue.employeeName}
                        </strong>
                        <ul className="mt-2 space-y-1 text-sm text-[var(--mnx-muted)]">
                          {issue.issues.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </PeopleSection>

          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Batch timeline"
              title="Batch timeline"
              description="Track immutable approved runs and accounting posting state across the selected month and prior periods."
            />
            <div className="space-y-3">
              {initialBatches.length === 0 ? (
                <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4 text-sm text-[var(--mnx-muted)]">
                  No payroll batches exist yet.
                </div>
              ) : (
                initialBatches.map((batch) => (
                  <article
                    key={batch.id}
                    className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--mnx-text)]">
                          {formatMonthLabel(batch.month)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--mnx-muted)]">
                          Total {formatMoney(batch.totalAmount)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--mnx-muted)]">
                          Updated {new Date(batch.updatedAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <WorkspaceBadge
                        variant={getBatchBadgeVariant(batch.status)}
                      >
                        {getBatchStatusLabel(batch.status)}
                      </WorkspaceBadge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {batch.journalEntryId ? (
                        <Link
                          href={`/accounting/journal-entries/${batch.journalEntryId}`}
                          className="mnx-button mnx-button-secondary"
                        >
                          Open journal
                        </Link>
                      ) : null}
                      {canPostAccrual && batch.status === "APPROVED_HRMS" ? (
                        <WorkspaceAction
                          disabled={postingBatchId === batch.id}
                          onClick={() => handlePostBatch(batch.id)}
                          variant="outline"
                        >
                          {postingBatchId === batch.id ? (
                            <>
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                              Posting
                            </>
                          ) : (
                            <>
                              <FileSpreadsheet className="size-4" aria-hidden="true" />
                              Post accrual journal
                            </>
                          )}
                        </WorkspaceAction>
                      ) : null}
                      {batch.status === "FINALIZED" || batch.status === "POSTED" ? (
                        <Link
                          href="/accounting/banking"
                          className="mnx-button mnx-button-secondary"
                        >
                          Banking follow-up
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </PeopleSection>
        </div>
      </div>

      <PeopleSection>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
            <div className="flex items-center gap-3">
              <CalendarClock className="size-4 text-[var(--mnx-accent)]" aria-hidden="true" />
              <strong className="text-sm text-[var(--mnx-text)]">Attendance and leave</strong>
            </div>
            <p className="mt-3 text-sm text-[var(--mnx-muted)]">
              This run consumes approved leave, leave-derived LOP, approved OT,
              and attendance records from the existing HRMS stack.
            </p>
            <Link className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--mnx-accent-strong)]" href="/attendance/ot">
              Open attendance operations
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
            <div className="flex items-center gap-3">
              <Building2 className="size-4 text-[var(--mnx-accent)]" aria-hidden="true" />
              <strong className="text-sm text-[var(--mnx-text)]">Compensation master</strong>
            </div>
            <p className="mt-3 text-sm text-[var(--mnx-muted)]">
              Salary breakup and revision history continue to live in the
              existing HRMS compensation workspaces.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="mnx-button mnx-button-secondary" href="/hrms/salary-structure">
                Salary structure
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/hrms/salary-revisions">
                Salary revisions
              </Link>
            </div>
          </div>

          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
            <div className="flex items-center gap-3">
              <BriefcaseBusiness className="size-4 text-[var(--mnx-accent)]" aria-hidden="true" />
              <strong className="text-sm text-[var(--mnx-text)]">Accounting handoff</strong>
            </div>
            <p className="mt-3 text-sm text-[var(--mnx-muted)]">
              Approved runs become immutable accounting snapshots first. Journal
              posting stays in Accounting so we do not duplicate the finance engine.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="mnx-button mnx-button-secondary" href="/accounting/settings">
                Accounting settings
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/accounting/journal-entries">
                Journal register
              </Link>
            </div>
          </div>
        </div>
      </PeopleSection>

      {existingPeriodBatches.length > 0 && workspace.existingBatch?.status === "APPROVED_HRMS" ? (
        <WorkspaceAlert variant="info">
          The current period already has an approved immutable HRMS snapshot.
          Post the accrual journal from the batch timeline when Finance is ready.
        </WorkspaceAlert>
      ) : null}

      {!canApproveRun ? (
        <WorkspaceAlert variant="warning">
          Approval requires both <strong>HRMS salary management</strong> and{" "}
          <strong>accounting integration posting</strong> permissions.
        </WorkspaceAlert>
      ) : null}

      {!canPostAccrual && workspace.existingBatch?.status === "APPROVED_HRMS" ? (
        <WorkspaceAlert variant="warning">
          Posting the accrual journal requires the{" "}
          <strong>accounting.post</strong> permission.
        </WorkspaceAlert>
      ) : null}

      {!workspace.settingsConfigured ? (
        <WorkspaceAlert variant="danger">
          <ShieldAlert className="mr-2 inline size-4" aria-hidden="true" />
          Payroll approval is blocked until accounting defaults are configured.
        </WorkspaceAlert>
      ) : null}
    </div>
  );
}
