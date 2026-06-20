"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BriefcaseBusiness, CalendarDays, CircleUserRound, ExternalLink, Info, Sparkles, Users } from "lucide-react";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import type { SalaryRevisionSummary } from "@/modules/hrms/salary-revisions-shared";
import { formatINR, formatPercent } from "@/modules/hrms/salary-revisions-shared";

type ReviewerOption = { id: string; name: string };

type ScheduledAppraisal = {
  dueDate: string;
  dueDateLabel: string;
  kind: "ANNUAL" | "INTERMEDIATE";
  descriptor: string;
};

function statusBadgeClass(status: string) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-outline-variant bg-surface-container-high text-on-surface-variant";
}

function kindLabel(kind: "ANNUAL" | "INTERMEDIATE") {
  return kind === "ANNUAL" ? "ANNUAL Appraisal" : "INTERMEDIATE Appraisal";
}

function sectionCardClass(extra = "") {
  return `card-top-accent ds-shell-lg border border-outline-variant/40 bg-surface p-5 shadow-sm sm:p-6 ${extra}`.trim();
}

function ToggleCard({
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
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-2xl border border-outline-variant/35 bg-surface px-4 py-3 text-left transition hover:border-[#00cec4]/45"
    >
      <div>
        <p className="font-medium text-on-surface">{label}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{description}</p>
      </div>
      <span className={`relative inline-flex h-7 w-12 rounded-full transition ${active ? "bg-[#4e909a]" : "bg-outline-variant dark:bg-slate-600"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-surface transition ${active ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function CurrentStepIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#00cec4]/35 bg-[#00cec4]/10 text-[#00a39a] shadow-[0_0_0_4px_rgba(0,206,196,0.12),0_0_18px_rgba(0,206,196,0.14)] animate-pulse">
      <span className="absolute inset-[-6px] rounded-full border border-[#00cec4]/30 animate-ping" />
      <span className="relative z-10 inline-flex items-center justify-center">
        {children}
      </span>
    </span>
  );
}

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
  const activeMonth = monthOptions.some((option) => option.value === selectedMonth) ? selectedMonth : "ALL";

  const rows = useMemo(() => {
    if (!summary?.revisions.length) return [];
    if (activeMonth === "ALL") return summary.revisions;
    return summary.revisions.filter((revision) => revision.effectiveLabel === activeMonth);
  }, [activeMonth, summary]);

  if (!summary || !summary.latestRevision) {
    return (
      <div className={sectionCardClass()}>
        <div className="flex items-center gap-3">
          <IndianRupeeIcon />
          <div>
            <h2 className="ds-h2 text-on-surface">Salary & Revision History</h2>
            <p className="mt-1 text-sm text-on-surface-variant">No salary revision records are available for this employee yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={sectionCardClass()}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <IndianRupeeIcon />
          <h2 className="ds-h2 text-on-surface">Salary & Revision History</h2>
        </div>
        <a
          href={`/hrms/salary-revisions?employeeId=${employeeId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#3b8f9c] transition hover:text-[#256b75]"
        >
          View all
          <ExternalLink className="size-4" />
        </a>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <InlineMetric label="Current Gross (Annual)" value={formatINR(summary.currentGrossAnnual)} />
        <InlineMetric label="Current Gross (Monthly)" value={formatINR(summary.currentGrossMonthly)} />
        <InlineMetric label="CTC (Annual)" value={formatINR(summary.currentCtcAnnual)} />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-[#6f86ad]">Revision History</p>
          {monthOptions.length > 0 ? (
            <div className="w-full max-w-sm">
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
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/30">
                {["Effective", "Gross", "CTC", "Revised CTC", "Rev %", "Status"].map((label) => (
                  <th key={label} className="px-0 py-2 text-left text-xs font-medium text-[#8ca0c2]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((revision) => (
                <tr key={revision.id} className="border-b border-outline-variant/20 last:border-b-0">
                  <td className="py-3 text-on-surface">{revision.effectiveLabel}</td>
                  <td className="ds-numeric py-3 text-on-surface">{formatINR(revision.revisedGrossAnnual ?? revision.grossAnnual)}</td>
                  <td className="ds-numeric py-3 text-on-surface">{formatINR(revision.ctcAnnual)}</td>
                  <td className="ds-numeric py-3 font-semibold text-on-surface">{formatINR(revision.revisedCtcAnnual)}</td>
                  <td className="ds-numeric py-3 text-emerald-600">{formatPercent(revision.revisionPercent)}</td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(revision.status)}`}>
                      {revision.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[#8ca0c2]">{label}</p>
      <p className="mt-1 text-[1rem] font-normal text-on-surface sm:text-[1.05rem]">{value}</p>
    </div>
  );
}

function IndianRupeeIcon() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#f5faf9] text-lg font-semibold text-on-surface">
      ₹
    </span>
  );
}

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

  const [specialKind, setSpecialKind] = useState<"ANNUAL" | "INTERMEDIATE">("ANNUAL");
  const [specialDate, setSpecialDate] = useState(new Date().toISOString().slice(0, 10));
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
    const includeManager = isScheduled ? includeScheduledManager : includeSpecialManager;

    if (!dueDate || !kind || !selectedHR) {
      setErrorMessage("Select an HR reviewer and ensure the appraisal date is available.");
      return;
    }

    const selectedReviewerIds = [
      selectedHR,
      ...(includeTL && selectedTL ? [selectedTL] : []),
      ...(includeManager && selectedManager ? [selectedManager] : []),
    ];
    if (hasDuplicateReviewers(selectedReviewerIds)) {
      setErrorMessage("Each reviewer role must be assigned to a different employee.");
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
        ...(includeTL && selectedTL ? [{ userId: selectedTL, kind: "TL" }] : []),
        ...(includeManager && selectedManager ? [{ userId: selectedManager, kind: "MANAGER" }] : []),
      ];

      const reviewerResponse = await fetch(`/api/ams/appraisals/${appraisal.id}/reviewers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewers }),
      });
      const reviewerResult = await reviewerResponse.json().catch(() => ({}));
      if (!reviewerResponse.ok) {
        throw new Error(reviewerResult.error ?? "Unable to assign reviewers.");
      }

      router.push(`/ams/appraisals/${appraisal.id}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start the appraisal.");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="space-y-5">
      <div className={sectionCardClass()}>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1fr)_auto] xl:items-start">
          <EmployeeInfo icon={<Users className="size-4" />} label="Emp #" value={employee.employeeNumber} />
          <EmployeeInfo icon={<CalendarDays className="size-4" />} label="Joining Date" value={employee.joinDateLabel} />
          <EmployeeInfo icon={<BriefcaseBusiness className="size-4" />} label="Tenure" value={employee.tenureLabel} />
          <EmployeeInfo icon={<Sparkles className="size-4" />} label="Type" value={employee.employeeTypeLabel} accent />
          <div className="xl:justify-self-end">
            <Link
              href={employeeDetailsHref}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-sm font-medium text-on-surface shadow-sm transition hover:border-[#00cec4]/35 hover:text-[#00a79f]"
            >
              <CircleUserRound className="size-4" />
              Employee Details
            </Link>
          </div>
        </div>
      </div>

      <SalaryHistoryCard employeeId={employee.id} summary={salarySummary} />

      {errorMessage ? (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="size-4 shrink-0" />
          {errorMessage}
        </div>
      ) : null}

      <div className={sectionCardClass()}>
        <SectionHeader
          icon={
            <CurrentStepIcon>
              <Users className="size-5" />
            </CurrentStepIcon>
          }
          title="Assign Reviewers"
        />

        {scheduledAppraisal ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
              <span className="inline-flex items-center gap-2">
                <Info className="size-4 shrink-0" />
                <span>
                  System determined: <strong>{kindLabel(scheduledAppraisal.kind)}</strong> - {scheduledAppraisal.descriptor} - {scheduledAppraisal.kind === "ANNUAL" ? "Annual Appraisal" : "6 Month Appraisal"}
                </span>
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ToggleCard
                active={includeScheduledTL}
                label="Include TL Reviewer"
                description="Adds TL as an assigned reviewer"
                onToggle={() => {
                  const next = !includeScheduledTL;
                  setIncludeScheduledTL(next);
                  if (!next) setScheduledTL("");
                }}
              />
              <ToggleCard
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

            <button
              type="button"
              onClick={() => startFlow("scheduled")}
              disabled={saving !== "" || !scheduledReviewersReady}
              className={
                scheduledReviewersReady
                  ? "rounded-2xl bg-[#00cec4] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#00b8af] disabled:cursor-not-allowed disabled:opacity-50"
                  : "rounded-2xl bg-outline-variant px-5 py-3 text-sm font-medium text-on-surface-variant transition disabled:cursor-not-allowed"
              }
            >
              {saving === "scheduled" ? "Assigning..." : "Assign Reviewers"}
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No system-determined appraisal is due for this employee right now. You can still start a special appraisal below if you have admin access.
          </div>
        )}
      </div>

      {canStartSpecial ? (
        <div className={sectionCardClass("card-top-accent-violet border-[#b990ff]/55 shadow-[0_0_0_1px_rgba(185,144,255,0.08)]")}>
          <SectionHeader
            icon={<Sparkles className="size-5 text-[#8a52ff]" />}
            title="Start Special Appraisal"
            titleClassName="text-[#8a52ff]"
            description="Admin-only. Outside normal milestone schedule. Creates a special cycle immediately."
          />

          <div className="mt-6 space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <ToggleCard
                active={includeSpecialTL}
                label="Include TL Reviewer"
                description="Adds TL as an assigned reviewer"
                onToggle={() => {
                  const next = !includeSpecialTL;
                  setIncludeSpecialTL(next);
                  if (!next) setSpecialTL("");
                }}
              />
              <ToggleCard
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

            <div className="grid gap-4 md:grid-cols-2">
              <LabeledField label="Appraisal Type">
                <DropdownSelect
                  ariaLabel="Select appraisal type"
                  onValueChange={(value) => setSpecialKind(value as "ANNUAL" | "INTERMEDIATE")}
                  options={[
                    { value: "ANNUAL", label: "Annual" },
                    { value: "INTERMEDIATE", label: "Intermediate" },
                  ]}
                  value={specialKind}
                />
              </LabeledField>
              <LabeledField label="Effective Date">
                <Input type="date" value={specialDate} onChange={(event) => setSpecialDate(event.target.value)} />
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

            <button
              type="button"
              onClick={() => startFlow("special")}
              disabled={saving !== "" || !specialReviewersReady}
              className={
                specialReviewersReady
                  ? "rounded-2xl bg-[#00cec4] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#00b8af] disabled:cursor-not-allowed disabled:opacity-50"
                  : "rounded-2xl bg-outline-variant px-5 py-3 text-sm font-medium text-on-surface-variant transition disabled:cursor-not-allowed"
              }
            >
              {saving === "special" ? "Starting..." : "Start Special Appraisal"}
            </button>
          </div>
        </div>
      ) : null}
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
    <div className="grid gap-4 xl:grid-cols-3">
      <ReviewerField
        accent="bg-emerald-500"
        ariaLabel={hrLabel}
        label={hrLabel}
        onValueChange={setSelectedHR}
        options={hrUsers}
        value={selectedHR}
      />
      {includeTL ? (
        <ReviewerField
          accent="bg-amber-500"
          ariaLabel="TL Reviewer"
          label="TL Reviewer"
          onValueChange={setSelectedTL}
          options={tlUsers}
          value={selectedTL}
        />
      ) : null}
      {includeManager ? (
        <ReviewerField
          accent="bg-[#4f7cff]"
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
      <div className="flex items-center gap-2 text-sm text-on-surface">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        {label}
      </div>
      <DropdownSelect
        ariaLabel={ariaLabel}
        onValueChange={onValueChange}
        options={[
          { value: "", label: `Select ${label}` },
          ...options.map((option) => ({ value: option.id, label: option.name })),
        ]}
        triggerClassName="py-2.5"
        value={value}
      />
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
      <label className="text-sm font-medium text-on-surface">{label}</label>
      {children}
    </div>
  );
}

function EmployeeInfo({
  accent,
  icon,
  label,
  value,
}: {
  accent?: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-[#8ca0c2]">
        {icon}
        {label}
      </div>
      <div className="mt-2">
        {accent ? (
          <span className="inline-flex rounded-full bg-[#dfe8ff] px-2 py-0.5 text-xs font-medium text-[#4267d6]">
            {value}
          </span>
        ) : (
          <p className="mt-0.5 text-[0.95rem] font-normal text-on-surface sm:text-[1rem]">{value}</p>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  description,
  icon,
  title,
  titleClassName = "text-on-surface",
}: {
  description?: string;
  icon: React.ReactNode;
  title: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-on-surface">{icon}</div>
      <div>
        <h2 className={`ds-h2 ${titleClassName}`}>{title}</h2>
        {description ? <p className="mt-1 text-sm text-on-surface-variant">{description}</p> : null}
      </div>
    </div>
  );
}
