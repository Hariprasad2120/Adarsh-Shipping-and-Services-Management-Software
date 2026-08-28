"use client";

import {
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
} from "@/modules/performance/components/performance-workspace";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  CircleUserRound,
  ExternalLink,
  Info,
  Sparkles,
  Users,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import type { SalaryRevisionSummary } from "@/modules/hrms/salary-revisions-shared";
import {
  formatINR,
  formatPercent,
} from "@/modules/hrms/salary-revisions-shared";

type ReviewerOption = { id: string; name: string };

type ScheduledAppraisal = {
  dueDate: string;
  dueDateLabel: string;
  kind: "ANNUAL" | "INTERMEDIATE";
  descriptor: string;
};

/* ------------------------------------------------------------------ */
/* shared style tokens                                                  */
/* ------------------------------------------------------------------ */

const CARD =
  "mnx-performance-surface mnx-accent-edge rounded-2xl border border-[var(--mnx-border)] p-5 shadow-sm sm:p-6";

function statusBadgeClass(status: string) {
  if (status === "APPROVED")
    return "border-[var(--mnx-border)] bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]";
  if (status === "PENDING")
    return "border-[var(--mnx-border)] bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]";
  if (status === "REJECTED")
    return "border-[var(--mnx-border)] bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]";
  return "border-[var(--mnx-border)] bg-[var(--mnx-soft)] text-[var(--mnx-text-muted)]";
}

function kindLabel(kind: "ANNUAL" | "INTERMEDIATE") {
  return kind === "ANNUAL" ? "ANNUAL Appraisal" : "INTERMEDIATE Appraisal";
}

/* ------------------------------------------------------------------ */
/* small primitives                                                     */
/* ------------------------------------------------------------------ */

function IconBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent";
}) {
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
        tone === "accent"
          ? "border-[color-mix(in_srgb,var(--mnx-accent)_35%,var(--mnx-border))] bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]"
          : "border-[var(--mnx-border)] bg-[var(--mnx-soft)] text-[var(--mnx-text)]"
      }`}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  description,
  icon,
  title,
  titleClassName = "text-[var(--mnx-text-strong)]",
}: {
  description?: string;
  icon: React.ReactNode;
  title: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div className="min-w-0">
        <h2 className={`mnx-title-3 ${titleClassName}`}>{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-[var(--mnx-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ToggleRow({
  active,
  label,
  description,
  onToggle,
}: {
  active: boolean;
  label: string;
  description: string;
  onToggle: () => void;
}) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- intentional switch widget (card + track), not a standard Button
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      style={{
        borderColor: active ? "var(--frappe-primary)" : "var(--mnx-border)",
        background: "var(--mnx-surface)",
      }}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition hover:border-[var(--mnx-border-strong)]"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--mnx-text-strong)]">
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--mnx-text-muted)]">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        style={{
          background: active
            ? "var(--frappe-primary)"
            : "var(--mnx-border-strong)",
          justifyContent: active ? "flex-end" : "flex-start",
        }}
        className="flex h-6 w-11 shrink-0 items-center rounded-full p-[3px] transition-colors"
      >
        <span
          // eslint-disable-next-line no-restricted-syntax -- knob must stay white on both the grey and primary track
          style={{ background: "#ffffff" }}
          className="block h-[18px] w-[18px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
        />
      </span>
    </button>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-text-muted)]">
        {label}
      </p>
      <p className="mnx-numeric mt-1 text-[1.05rem] text-[var(--mnx-text-strong)]">
        {value}
      </p>
    </div>
  );
}

function RupeeBadge() {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-soft)] text-lg font-semibold text-[var(--mnx-text-strong)]">
      ₹
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* employee context                                                     */
/* ------------------------------------------------------------------ */

function EmployeeStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--mnx-text-muted)]">
        {icon}
        {label}
      </div>
      <div className="mt-1.5">
        {accent ? (
          <span className="inline-flex rounded-full bg-[var(--mnx-accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--mnx-accent-text)]">
            {value}
          </span>
        ) : (
          <p className="truncate text-[0.95rem] text-[var(--mnx-text-strong)]">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function EmployeeCard({
  employee,
  employeeDetailsHref,
}: {
  employee: {
    name: string;
    designation: string | null;
    employeeNumber: string;
    joinDateLabel: string;
    tenureLabel: string;
    employeeTypeLabel: string;
  };
  employeeDetailsHref: string;
}) {
  return (
    <div className={CARD}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <IconBadge tone="accent">
            <CircleUserRound className="size-5" />
          </IconBadge>
          <div className="min-w-0">
            <h2 className="mnx-title-3 truncate text-[var(--mnx-text-strong)]">
              {employee.name}
            </h2>
            <p className="text-sm text-[var(--mnx-text-muted)]">
              {employee.designation ?? "Designation not set"}
            </p>
          </div>
        </div>
        <ButtonLink
          href={employeeDetailsHref}
          variant="outline"
          className="shrink-0"
        >
          <CircleUserRound className="size-4" />
          Employee Details
        </ButtonLink>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--mnx-border)] pt-5 sm:grid-cols-4">
        <EmployeeStat
          icon={<Users className="size-3.5" />}
          label="Emp #"
          value={employee.employeeNumber}
        />
        <EmployeeStat
          icon={<CalendarDays className="size-3.5" />}
          label="Joining Date"
          value={employee.joinDateLabel}
        />
        <EmployeeStat
          icon={<BriefcaseBusiness className="size-3.5" />}
          label="Tenure"
          value={employee.tenureLabel}
        />
        <EmployeeStat
          icon={<Sparkles className="size-3.5" />}
          label="Type"
          value={employee.employeeTypeLabel}
          accent
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* salary history                                                       */
/* ------------------------------------------------------------------ */

function SalaryHistoryCard({
  employeeId,
  summary,
}: {
  employeeId: string;
  summary: SalaryRevisionSummary | null;
}) {
  const monthOptions = useMemo(() => {
    if (!summary?.revisions.length) return [];

    return Array.from(
      new Map(
        summary.revisions.map((revision) => [
          revision.effectiveLabel,
          {
            value: revision.effectiveLabel,
            label: revision.effectiveLabel,
          },
        ]),
      ).values(),
    );
  }, [summary]);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const activeMonth = monthOptions.some(
    (option) => option.value === selectedMonth,
  )
    ? selectedMonth
    : "ALL";

  const rows = useMemo(() => {
    if (!summary?.revisions.length) return [];
    if (activeMonth === "ALL") return summary.revisions;
    return summary.revisions.filter(
      (revision) => revision.effectiveLabel === activeMonth,
    );
  }, [activeMonth, summary]);

  if (!summary || !summary.latestRevision) {
    return (
      <div className={`${CARD} flex items-center gap-3`}>
        <RupeeBadge />
        <div>
          <h2 className="mnx-title-3 text-[var(--mnx-text-strong)]">
            Salary &amp; Revision History
          </h2>
          <p className="mt-0.5 text-sm text-[var(--mnx-text-muted)]">
            No salary revision records are available for this employee yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <RupeeBadge />
          <h2 className="mnx-title-3 text-[var(--mnx-text-strong)]">
            Salary &amp; Revision History
          </h2>
        </div>
        <a
          href={`/hrms/salary-revisions?employeeId=${employeeId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--mnx-accent-text)] transition hover:opacity-80"
        >
          View all
          <ExternalLink className="size-4" />
        </a>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <InlineMetric
          label="Current Gross (Annual)"
          value={formatINR(summary.currentGrossAnnual)}
        />
        <InlineMetric
          label="Current Gross (Monthly)"
          value={formatINR(summary.currentGrossMonthly)}
        />
        <InlineMetric
          label="CTC (Annual)"
          value={formatINR(summary.currentCtcAnnual)}
        />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-[var(--mnx-text-muted)]">
            Revision History
          </p>
          {monthOptions.length > 0 ? (
            <div className="w-full sm:max-w-xs">
              <DropdownSelect
                ariaLabel="Filter revision history by month"
                onValueChange={setSelectedMonth}
                options={[
                  { value: "ALL", label: "All months" },
                  ...monthOptions,
                ]}
                placeholder="Filter by month"
                triggerClassName="py-2.5 text-sm"
                value={activeMonth}
              />
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <PerformanceTable className="min-w-full text-sm">
            <PerformanceTableHeader>
              <PerformanceTableRow className="border-b border-[var(--mnx-border)]">
                {[
                  "Effective",
                  "Gross",
                  "CTC",
                  "Revised CTC",
                  "Rev %",
                  "Status",
                ].map((label) => (
                  <PerformanceTableHead
                    key={label}
                    className="px-0 py-2 text-left text-xs font-medium text-[var(--mnx-text-muted)]"
                  >
                    {label}
                  </PerformanceTableHead>
                ))}
              </PerformanceTableRow>
            </PerformanceTableHeader>
            <PerformanceTableBody>
              {rows.map((revision) => (
                <PerformanceTableRow
                  key={revision.id}
                  className="border-b border-[var(--mnx-border)] last:border-b-0"
                >
                  <PerformanceTableCell className="py-3 text-[var(--mnx-text)]">
                    {revision.effectiveLabel}
                  </PerformanceTableCell>
                  <PerformanceTableCell className="mnx-numeric py-3 text-[var(--mnx-text)]">
                    {formatINR(
                      revision.revisedGrossAnnual ?? revision.grossAnnual,
                    )}
                  </PerformanceTableCell>
                  <PerformanceTableCell className="mnx-numeric py-3 text-[var(--mnx-text)]">
                    {formatINR(revision.ctcAnnual)}
                  </PerformanceTableCell>
                  <PerformanceTableCell className="mnx-numeric py-3 font-semibold text-[var(--mnx-text-strong)]">
                    {formatINR(revision.revisedCtcAnnual)}
                  </PerformanceTableCell>
                  <PerformanceTableCell className="mnx-numeric py-3 text-[var(--mnx-success)]">
                    {formatPercent(revision.revisionPercent)}
                  </PerformanceTableCell>
                  <PerformanceTableCell className="py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(revision.status)}`}
                    >
                      {revision.statusLabel}
                    </span>
                  </PerformanceTableCell>
                </PerformanceTableRow>
              ))}
            </PerformanceTableBody>
          </PerformanceTable>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* reviewer selectors                                                   */
/* ------------------------------------------------------------------ */

function ReviewerField({
  accent,
  ariaLabel,
  label,
  onValueChange,
  options,
  value,
}: {
  accent: string;
  ariaLabel: string;
  label: string;
  onValueChange: (value: string) => void;
  options: ReviewerOption[];
  value: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--mnx-text-strong)]">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        {label}
      </div>
      <DropdownSelect
        ariaLabel={ariaLabel}
        onValueChange={onValueChange}
        options={[
          { value: "", label: `Select ${label}` },
          ...options.map((option) => ({
            value: option.id,
            label: option.name,
          })),
        ]}
        triggerClassName="py-2.5"
        value={value}
      />
    </div>
  );
}

function ReviewerSelectors({
  hrLabel,
  hrUsers,
  includeManager,
  includeTL,
  managerUsers,
  selectedHR,
  selectedManager,
  selectedTL,
  setSelectedHR,
  setSelectedManager,
  setSelectedTL,
  tlUsers,
}: {
  hrLabel: string;
  hrUsers: ReviewerOption[];
  includeManager: boolean;
  includeTL: boolean;
  managerUsers: ReviewerOption[];
  selectedHR: string;
  selectedManager: string;
  selectedTL: string;
  setSelectedHR: (value: string) => void;
  setSelectedManager: (value: string) => void;
  setSelectedTL: (value: string) => void;
  tlUsers: ReviewerOption[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ReviewerField
        accent="bg-[var(--mnx-success)]"
        ariaLabel={hrLabel}
        label={hrLabel}
        onValueChange={setSelectedHR}
        options={hrUsers}
        value={selectedHR}
      />
      {includeTL ? (
        <ReviewerField
          accent="bg-[var(--mnx-warning)]"
          ariaLabel="TL Reviewer"
          label="TL Reviewer"
          onValueChange={setSelectedTL}
          options={tlUsers}
          value={selectedTL}
        />
      ) : null}
      {includeManager ? (
        <ReviewerField
          accent="bg-[var(--frappe-primary)]"
          ariaLabel="Manager Reviewer"
          label="Manager Reviewer"
          onValueChange={setSelectedManager}
          options={managerUsers}
          value={selectedManager}
        />
      ) : null}
    </div>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--mnx-text-strong)]">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* main                                                                 */
/* ------------------------------------------------------------------ */

export function StartAppraisalClient({
  canStartSpecial,
  employee,
  employeeDetailsHref,
  hrUsers,
  managerUsers,
  salarySummary,
  scheduledAppraisal,
  tlUsers,
}: {
  canStartSpecial: boolean;
  employee: {
    id: string;
    name: string;
    designation: string | null;
    employeeNumber: string;
    joinDateLabel: string;
    tenureLabel: string;
    employeeTypeLabel: string;
  };
  employeeDetailsHref: string;
  hrUsers: ReviewerOption[];
  managerUsers: ReviewerOption[];
  salarySummary: SalaryRevisionSummary | null;
  scheduledAppraisal: ScheduledAppraisal | null;
  tlUsers: ReviewerOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<"" | "scheduled" | "special">("");
  const [scheduledHR, setScheduledHR] = useState("");
  const [scheduledTL, setScheduledTL] = useState("");
  const [scheduledManager, setScheduledManager] = useState("");
  const [includeScheduledTL, setIncludeScheduledTL] = useState(false);
  const [includeScheduledManager, setIncludeScheduledManager] = useState(false);

  const [specialKind, setSpecialKind] = useState<"ANNUAL" | "INTERMEDIATE">(
    "ANNUAL",
  );
  const [specialDate, setSpecialDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [specialHR, setSpecialHR] = useState("");
  const [specialTL, setSpecialTL] = useState("");
  const [specialManager, setSpecialManager] = useState("");
  const [includeSpecialTL, setIncludeSpecialTL] = useState(true);
  const [includeSpecialManager, setIncludeSpecialManager] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const scheduledReviewersReady =
    Boolean(scheduledAppraisal?.dueDate) &&
    Boolean(scheduledHR) &&
    (!includeScheduledTL || Boolean(scheduledTL)) &&
    (!includeScheduledManager || Boolean(scheduledManager));

  const specialReviewersReady =
    Boolean(specialDate) &&
    Boolean(specialHR) &&
    (!includeSpecialTL || Boolean(specialTL)) &&
    (!includeSpecialManager || Boolean(specialManager));

  function hasDuplicateReviewers(reviewers: string[]) {
    return new Set(reviewers).size !== reviewers.length;
  }

  async function startFlow(mode: "scheduled" | "special") {
    const isScheduled = mode === "scheduled";
    const dueDate = isScheduled ? scheduledAppraisal?.dueDate : specialDate;
    const kind = isScheduled ? scheduledAppraisal?.kind : specialKind;
    const selectedHR = isScheduled ? scheduledHR : specialHR;
    const selectedTL = isScheduled ? scheduledTL : specialTL;
    const selectedManager = isScheduled ? scheduledManager : specialManager;
    const includeTL = isScheduled ? includeScheduledTL : includeSpecialTL;
    const includeManager = isScheduled
      ? includeScheduledManager
      : includeSpecialManager;

    if (!dueDate || !kind || !selectedHR) {
      setErrorMessage(
        "Select an HR reviewer and ensure the appraisal date is available.",
      );
      return;
    }

    const selectedReviewerIds = [
      selectedHR,
      ...(includeTL && selectedTL ? [selectedTL] : []),
      ...(includeManager && selectedManager ? [selectedManager] : []),
    ];
    if (hasDuplicateReviewers(selectedReviewerIds)) {
      setErrorMessage(
        "Each reviewer role must be assigned to a different employee.",
      );
      return;
    }

    setSaving(mode);
    setErrorMessage("");

    try {
      const createResponse = await fetch("/api/ams/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          dueDate,
          kind,
        }),
      });

      const appraisal = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(appraisal.error ?? "Unable to create appraisal.");
      }

      const reviewers = [
        { userId: selectedHR, kind: "HR" },
        ...(includeTL && selectedTL
          ? [{ userId: selectedTL, kind: "TL" }]
          : []),
        ...(includeManager && selectedManager
          ? [{ userId: selectedManager, kind: "MANAGER" }]
          : []),
      ];

      const reviewerResponse = await fetch(
        `/api/ams/appraisals/${appraisal.id}/reviewers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewers }),
        },
      );
      const reviewerResult = await reviewerResponse.json().catch(() => ({}));
      if (!reviewerResponse.ok) {
        throw new Error(reviewerResult.error ?? "Unable to assign reviewers.");
      }

      router.push(`/ams/appraisals/${appraisal.id}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to start the appraisal.",
      );
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <EmployeeCard
        employee={employee}
        employeeDetailsHref={employeeDetailsHref}
      />

      <SalaryHistoryCard employeeId={employee.id} summary={salarySummary} />

      {errorMessage ? (
        <div className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--mnx-danger)_35%,var(--mnx-border))] bg-[var(--mnx-danger-bg)] px-4 py-3 text-sm text-[var(--mnx-danger)]">
          <AlertCircle className="size-4 shrink-0" />
          {errorMessage}
        </div>
      ) : null}

      <div className={CARD}>
        <SectionHeader
          icon={
            <IconBadge tone="accent">
              <Users className="size-5" />
            </IconBadge>
          }
          title="Assign Reviewers"
          description="System-scheduled appraisal for this employee."
        />

        {scheduledAppraisal ? (
          <div className="mt-5 space-y-5">
            <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--mnx-success)_30%,var(--mnx-border))] bg-[var(--mnx-success-bg)] px-4 py-3 text-sm text-[var(--mnx-success)]">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                System determined:{" "}
                <strong>{kindLabel(scheduledAppraisal.kind)}</strong> —{" "}
                {scheduledAppraisal.descriptor} —{" "}
                {scheduledAppraisal.kind === "ANNUAL"
                  ? "Annual Appraisal"
                  : "6 Month Appraisal"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleRow
                active={includeScheduledTL}
                label="Include TL Reviewer"
                description="Adds TL as an assigned reviewer"
                onToggle={() => {
                  const next = !includeScheduledTL;
                  setIncludeScheduledTL(next);
                  if (!next) setScheduledTL("");
                }}
              />
              <ToggleRow
                active={includeScheduledManager}
                label="Include Manager Reviewer"
                description="Adds Manager as an assigned reviewer"
                onToggle={() => {
                  const next = !includeScheduledManager;
                  setIncludeScheduledManager(next);
                  if (!next) setScheduledManager("");
                }}
              />
            </div>

            <ReviewerSelectors
              hrLabel="HR Reviewer"
              hrUsers={hrUsers}
              includeManager={includeScheduledManager}
              includeTL={includeScheduledTL}
              managerUsers={managerUsers}
              selectedHR={scheduledHR}
              selectedManager={scheduledManager}
              selectedTL={scheduledTL}
              setSelectedHR={setScheduledHR}
              setSelectedManager={setScheduledManager}
              setSelectedTL={setScheduledTL}
              tlUsers={tlUsers}
            />

            <div className="flex justify-end border-t border-[var(--mnx-border)] pt-5">
              <Button
                onClick={() => startFlow("scheduled")}
                disabled={saving !== "" || !scheduledReviewersReady}
              >
                {saving === "scheduled" ? "Assigning…" : "Assign Reviewers"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--mnx-warning)_30%,var(--mnx-border))] bg-[var(--mnx-warning-bg)] px-4 py-3 text-sm text-[var(--mnx-warning)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>
              No system-determined appraisal is due for this employee right now.
              You can still start a special appraisal below if you have admin
              access.
            </span>
          </div>
        )}
      </div>

      {canStartSpecial ? (
        <div className={CARD}>
          <SectionHeader
            icon={
              <IconBadge tone="accent">
                <Sparkles className="size-5" />
              </IconBadge>
            }
            title="Start Special Appraisal"
            titleClassName="text-[var(--mnx-accent-text)]"
            description="Admin-only. Outside the normal milestone schedule. Creates a special cycle immediately."
          />

          <div className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleRow
                active={includeSpecialTL}
                label="Include TL Reviewer"
                description="Adds TL as an assigned reviewer"
                onToggle={() => {
                  const next = !includeSpecialTL;
                  setIncludeSpecialTL(next);
                  if (!next) setSpecialTL("");
                }}
              />
              <ToggleRow
                active={includeSpecialManager}
                label="Include Manager Reviewer"
                description="Adds Manager as an assigned reviewer"
                onToggle={() => {
                  const next = !includeSpecialManager;
                  setIncludeSpecialManager(next);
                  if (!next) setSpecialManager("");
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledField label="Appraisal Type">
                <DropdownSelect
                  ariaLabel="Select appraisal type"
                  onValueChange={(value) =>
                    setSpecialKind(value as "ANNUAL" | "INTERMEDIATE")
                  }
                  options={[
                    { value: "ANNUAL", label: "Annual" },
                    { value: "INTERMEDIATE", label: "Intermediate" },
                  ]}
                  triggerClassName="py-2.5"
                  value={specialKind}
                />
              </LabeledField>
              <LabeledField label="Effective Date">
                <Input
                  type="date"
                  value={specialDate}
                  onChange={(event) => setSpecialDate(event.target.value)}
                />
              </LabeledField>
            </div>

            <ReviewerSelectors
              hrLabel="HR Reviewer"
              hrUsers={hrUsers}
              includeManager={includeSpecialManager}
              includeTL={includeSpecialTL}
              managerUsers={managerUsers}
              selectedHR={specialHR}
              selectedManager={specialManager}
              selectedTL={specialTL}
              setSelectedHR={setSpecialHR}
              setSelectedManager={setSpecialManager}
              setSelectedTL={setSpecialTL}
              tlUsers={tlUsers}
            />

            <div className="flex justify-end border-t border-[var(--mnx-border)] pt-5">
              <Button
                onClick={() => startFlow("special")}
                disabled={saving !== "" || !specialReviewersReady}
              >
                {saving === "special" ? "Starting…" : "Start Special Appraisal"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
