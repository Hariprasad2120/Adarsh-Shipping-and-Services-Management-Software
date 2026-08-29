"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/modules/people/components/people-controls";
import { Input } from "@/components/ui/input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import type {
  LeavePolicyConfig,
  EntitlementConfig,
  ApprovalRoute,
} from "@/modules/leave/policy-config.schema";

type ApplicabilityDimension = "BRANCH" | "DEPARTMENT" | "DIVISION" | "DESIGNATION" | "EMPLOYMENT_TYPE" | "EMPLOYEE";
type ApplicabilityRule = { mode: "INCLUDE" | "EXCLUDE"; dimension: ApplicabilityDimension; value: string };

type Option = { id: string; name: string };

export interface PolicyWizardProps {
  leaveTypes: { id: string; name: string }[];
  departments: Option[];
  branches: Option[];
  divisions: Option[];
  designations: string[];
  employmentTypes: string[];
  employees: Option[];
  roles: Option[];
  onClose: () => void;
}

const STEP_LABELS = [
  "Basics",
  "Entitlement",
  "Proration & Reset",
  "Carry-forward & Encashment",
  "Applicability",
  "Restrictions & Sandwich",
  "Clubbing",
  "Approval Routing",
  "Review & Publish",
];

function defaultConfig(): LeavePolicyConfig {
  return {
    entitlement: { model: "FIXED", amount: 12, creditFrequency: "MONTHLY" },
    proration: { strategy: "START_OF_POLICY", rounding: "NEAREST" },
    reset: { cadence: "CALENDAR_YEAR" },
    carryForward: { mode: "FIXED_MAX", fixedMax: 5, expiryAfterDays: 90 },
    encashment: { mode: "DISABLED", minBalanceRetained: 0 },
    negativeLeave: { mode: "CONVERT_EXCESS_TO_LOP" },
    maxBalance: null,
    effectiveAfterServiceMonths: 0,
    partialPaySlabs: [],
    restrictions: {
      allowPastDated: false,
      allowSameDay: true,
      allowDuringProbation: true,
      waitingPeriodAfterJoiningDays: 0,
      minBalanceRequired: 0,
      requireAttachment: "NEVER",
      requireReason: true,
    },
    sandwich: { enabled: false, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 0 },
    clubbingRules: [],
    approvalRouting: {
      autoApprove: false,
      routes: [{ criteria: {}, steps: [{ sequence: 1, approverType: "MANAGER" }] }],
      mandatoryApprovalComment: false,
      mandatoryRejectionComment: true,
    },
    availabilityStatus: "OUT_OF_OFFICE",
  };
}

const DIMENSION_LABELS: Record<ApplicabilityDimension, string> = {
  BRANCH: "Branch",
  DEPARTMENT: "Department",
  DIVISION: "Division",
  DESIGNATION: "Designation",
  EMPLOYMENT_TYPE: "Employment type",
  EMPLOYEE: "Named employee",
};

/**
 * Full 9-step policy wizard (spec §5), replacing the single-form
 * simplified create-policy flow. Every step edits a slice of the same
 * LeavePolicyConfig object kept in this component's state; only step 9
 * submits, via the same POST /api/leave/policies used by the old form —
 * this is a UI-layer build, no backend change.
 */
export function PolicyWizard({
  leaveTypes,
  departments,
  branches,
  divisions,
  designations,
  employmentTypes,
  employees,
  roles,
  onClose,
}: PolicyWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [classification, setClassification] = useState<
    "PAID" | "UNPAID" | "ON_DUTY" | "RESTRICTED_HOLIDAY" | "PARTIALLY_PAID"
  >("PAID");
  const [unit, setUnit] = useState<"DAY" | "HOUR">("DAY");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [publishNow, setPublishNow] = useState(true);

  const [config, setConfig] = useState<LeavePolicyConfig>(defaultConfig);
  const [applicabilityRules, setApplicabilityRules] = useState<ApplicabilityRule[]>([]);

  function patchConfig(patch: Partial<LeavePolicyConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  const canGoNext = (() => {
    if (step === 0) return name.trim().length > 0 && code.trim().length > 0;
    return true;
  })();

  function addApplicabilityRule() {
    setApplicabilityRules((prev) => [...prev, { mode: "INCLUDE", dimension: "DEPARTMENT", value: "" }]);
  }
  function updateApplicabilityRule(index: number, patch: Partial<ApplicabilityRule>) {
    setApplicabilityRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeApplicabilityRule(index: number) {
    setApplicabilityRules((prev) => prev.filter((_, i) => i !== index));
  }

  function applicabilityValueOptions(dimension: ApplicabilityDimension): { value: string; label: string }[] {
    switch (dimension) {
      case "BRANCH":
        return branches.map((b) => ({ value: b.id, label: b.name }));
      case "DEPARTMENT":
        return departments.map((d) => ({ value: d.id, label: d.name }));
      case "DIVISION":
        return divisions.map((d) => ({ value: d.id, label: d.name }));
      case "DESIGNATION":
        return designations.map((d) => ({ value: d, label: d }));
      case "EMPLOYMENT_TYPE":
        return employmentTypes.map((t) => ({ value: t, label: t }));
      case "EMPLOYEE":
        return employees.map((e) => ({ value: e.id, label: e.name }));
    }
  }

  function addClubbingRule() {
    patchConfig({
      clubbingRules: [...config.clubbingRules, { otherLeaveTypeId: leaveTypes[0]?.id ?? "", mode: "FORBID_COMBINE" }],
    });
  }
  function updateClubbingRule(index: number, patch: Partial<LeavePolicyConfig["clubbingRules"][number]>) {
    patchConfig({
      clubbingRules: config.clubbingRules.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    });
  }
  function removeClubbingRule(index: number) {
    patchConfig({ clubbingRules: config.clubbingRules.filter((_, i) => i !== index) });
  }

  function addApprovalRoute() {
    const route: ApprovalRoute = { criteria: {}, steps: [{ sequence: 1, approverType: "MANAGER" }] };
    patchConfig({ approvalRouting: { ...config.approvalRouting, routes: [...config.approvalRouting.routes, route] } });
  }
  function updateApprovalRoute(index: number, patch: Partial<ApprovalRoute>) {
    patchConfig({
      approvalRouting: {
        ...config.approvalRouting,
        routes: config.approvalRouting.routes.map((r, i) => (i === index ? { ...r, ...patch } : r)),
      },
    });
  }
  function removeApprovalRoute(index: number) {
    patchConfig({
      approvalRouting: { ...config.approvalRouting, routes: config.approvalRouting.routes.filter((_, i) => i !== index) },
    });
  }
  function addApprovalStep(routeIndex: number) {
    const route = config.approvalRouting.routes[routeIndex];
    if (!route || route.steps.length >= 10) return;
    updateApprovalRoute(routeIndex, {
      steps: [...route.steps, { sequence: route.steps.length + 1, approverType: "MANAGER" }],
    });
  }
  function updateApprovalStep(routeIndex: number, stepIndex: number, patch: Partial<ApprovalRoute["steps"][number]>) {
    const route = config.approvalRouting.routes[routeIndex];
    if (!route) return;
    updateApprovalRoute(routeIndex, {
      steps: route.steps.map((s, i) => (i === stepIndex ? { ...s, ...patch } : s)),
    });
  }
  function removeApprovalStep(routeIndex: number, stepIndex: number) {
    const route = config.approvalRouting.routes[routeIndex];
    if (!route || route.steps.length <= 1) return;
    updateApprovalRoute(routeIndex, {
      steps: route.steps.filter((_, i) => i !== stepIndex).map((s, i) => ({ ...s, sequence: i + 1 })),
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          classification,
          unit,
          effectiveFrom: new Date(effectiveFrom).toISOString(),
          configuration: config,
          applicabilityRules: applicabilityRules.filter((r) => r.value),
          publishImmediately: publishNow,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? body.error ?? "Failed to create policy");
      }
      const body = await res.json().catch(() => ({}));
      const warnings: string[] | undefined = body?.version?.warnings;
      toast.success("Leave policy created");
      if (warnings?.length) {
        for (const w of warnings) toast.warning(w);
      }
      router.refresh();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create policy");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 border-b border-[var(--mnx-border)] bg-[var(--mnx-card)] px-5 py-4">
      <nav aria-label="Policy wizard steps" className="flex flex-wrap gap-2 text-xs">
        {STEP_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            aria-current={i === step ? "step" : undefined}
            className={
              i === step
                ? "rounded-full bg-[var(--mnx-info-bg)] px-3 py-1 font-medium text-[var(--mnx-text)]"
                : "rounded-full border border-[var(--mnx-border)] px-3 py-1 text-[var(--mnx-muted)]"
            }
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>

      {step === 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="wiz-name" className="text-xs font-medium text-[var(--mnx-text)]">Name</label>
            <Input id="wiz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Annual Leave" />
          </div>
          <div className="space-y-1">
            <label htmlFor="wiz-code" className="text-xs font-medium text-[var(--mnx-text)]">Code</label>
            <Input id="wiz-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="AL" />
          </div>
          <div className="space-y-1">
            <label htmlFor="wiz-classification" className="text-xs font-medium text-[var(--mnx-text)]">Classification</label>
            <DropdownSelect
              id="wiz-classification"
              value={classification}
              onValueChange={(v) => setClassification(v as typeof classification)}
              options={[
                { value: "PAID", label: "Paid" },
                { value: "UNPAID", label: "Unpaid / LOP" },
                { value: "ON_DUTY", label: "On Duty" },
                { value: "RESTRICTED_HOLIDAY", label: "Restricted Holiday" },
                { value: "PARTIALLY_PAID", label: "Partially Paid" },
              ]}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="wiz-unit" className="text-xs font-medium text-[var(--mnx-text)]">Unit</label>
            <DropdownSelect
              id="wiz-unit"
              value={unit}
              onValueChange={(v) => setUnit(v as typeof unit)}
              options={[
                { value: "DAY", label: "Day" },
                { value: "HOUR", label: "Hour (no automatic hour-level duration calc yet — see §8)" },
              ]}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="wiz-effective-from" className="text-xs font-medium text-[var(--mnx-text)]">Effective from</label>
            <Input id="wiz-effective-from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="wiz-entitlement-model" className="text-xs font-medium text-[var(--mnx-text)]">Entitlement model</label>
            <DropdownSelect
              id="wiz-entitlement-model"
              value={config.entitlement.model}
              onValueChange={(v) => {
                const model = v as EntitlementConfig["model"];
                if (model === "FIXED") patchConfig({ entitlement: { model, amount: 12, creditFrequency: "MONTHLY" } });
                else if (model === "EXPERIENCE_BASED")
                  patchConfig({
                    entitlement: { model, creditFrequency: "MONTHLY", tiers: [{ minServiceMonths: 0, maxServiceMonths: null, amount: 12 }] },
                  });
                else if (model === "GRANT_BASED")
                  patchConfig({ entitlement: { model, maxGrantsPerYear: null, requiresApproval: true } });
                else
                  patchConfig({ entitlement: { model, metric: "WORKED_DAYS", creditFrequency: "MONTHLY", ratio: 1 } });
              }}
              options={[
                { value: "FIXED", label: "Fixed annual amount" },
                { value: "EXPERIENCE_BASED", label: "Experience-based tiers" },
                { value: "GRANT_BASED", label: "Manual grants only" },
                { value: "ATTENDANCE_BASED", label: "Attendance-based (manual crediting — no auto-accrual engine yet)" },
              ]}
            />
          </div>

          {config.entitlement.model === "FIXED" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="wiz-fixed-amount" className="text-xs font-medium text-[var(--mnx-text)]">Annual amount (days)</label>
                <Input
                  id="wiz-fixed-amount"
                  type="number"
                  min="0"
                  value={config.entitlement.amount}
                  onChange={(e) => {
                    if (config.entitlement.model !== "FIXED") return;
                    patchConfig({ entitlement: { ...config.entitlement, amount: Number(e.target.value) || 0 } });
                  }}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="wiz-fixed-frequency" className="text-xs font-medium text-[var(--mnx-text)]">Credit frequency</label>
                <DropdownSelect
                  id="wiz-fixed-frequency"
                  value={config.entitlement.creditFrequency}
                  onValueChange={(v) => {
                    if (config.entitlement.model !== "FIXED") return;
                    patchConfig({ entitlement: { ...config.entitlement, creditFrequency: v as "INSTANT" | "MONTHLY" | "QUARTERLY" | "YEARLY" } });
                  }}
                  options={[
                    { value: "INSTANT", label: "Instant (granted in full immediately)" },
                    { value: "MONTHLY", label: "Monthly" },
                    { value: "QUARTERLY", label: "Quarterly" },
                    { value: "YEARLY", label: "Yearly" },
                  ]}
                />
              </div>
            </div>
          )}

          {config.entitlement.model === "EXPERIENCE_BASED" && (
            <div className="space-y-3">
              <div className="space-y-1 sm:w-64">
                <label htmlFor="wiz-exp-frequency" className="text-xs font-medium text-[var(--mnx-text)]">Credit frequency</label>
                <DropdownSelect
                  id="wiz-exp-frequency"
                  value={config.entitlement.creditFrequency}
                  onValueChange={(v) => {
                    if (config.entitlement.model !== "EXPERIENCE_BASED") return;
                    patchConfig({ entitlement: { ...config.entitlement, creditFrequency: v as "MONTHLY" | "YEARLY" } });
                  }}
                  options={[
                    { value: "MONTHLY", label: "Monthly" },
                    { value: "YEARLY", label: "Yearly" },
                  ]}
                />
              </div>
              <p className="text-xs font-medium text-[var(--mnx-text)]">Service tiers</p>
              {config.entitlement.tiers.map((tier, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--mnx-muted)]">Min service (months)</label>
                    <Input
                      type="number"
                      min="0"
                      value={tier.minServiceMonths}
                      onChange={(e) => {
                        if (config.entitlement.model !== "EXPERIENCE_BASED") return;
                        const tiers = [...config.entitlement.tiers];
                        tiers[i] = { ...tier, minServiceMonths: Number(e.target.value) || 0 };
                        patchConfig({ entitlement: { ...config.entitlement, tiers } });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--mnx-muted)]">Max service (blank = no cap)</label>
                    <Input
                      type="number"
                      min="0"
                      value={tier.maxServiceMonths ?? ""}
                      placeholder="No cap"
                      onChange={(e) => {
                        if (config.entitlement.model !== "EXPERIENCE_BASED") return;
                        const tiers = [...config.entitlement.tiers];
                        tiers[i] = { ...tier, maxServiceMonths: e.target.value ? Number(e.target.value) : null };
                        patchConfig({ entitlement: { ...config.entitlement, tiers } });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--mnx-muted)]">Annual amount</label>
                    <Input
                      type="number"
                      min="0"
                      value={tier.amount}
                      onChange={(e) => {
                        if (config.entitlement.model !== "EXPERIENCE_BASED") return;
                        const tiers = [...config.entitlement.tiers];
                        tiers[i] = { ...tier, amount: Number(e.target.value) || 0 };
                        patchConfig({ entitlement: { ...config.entitlement, tiers } });
                      }}
                    />
                  </div>
                  <MnxAction
                    type="button"
                    onClick={() => {
                      if (config.entitlement.model !== "EXPERIENCE_BASED" || config.entitlement.tiers.length <= 1) return;
                      patchConfig({ entitlement: { ...config.entitlement, tiers: config.entitlement.tiers.filter((_, idx) => idx !== i) } });
                    }}
                    className="rounded border px-2 py-1.5 text-xs text-[var(--mnx-text)]"
                  >
                    Remove tier
                  </MnxAction>
                </div>
              ))}
              <MnxAction
                type="button"
                onClick={() => {
                  if (config.entitlement.model !== "EXPERIENCE_BASED") return;
                  const lastTier = config.entitlement.tiers[config.entitlement.tiers.length - 1];
                  patchConfig({
                    entitlement: {
                      ...config.entitlement,
                      tiers: [...config.entitlement.tiers, { minServiceMonths: (lastTier?.maxServiceMonths ?? 0), maxServiceMonths: null, amount: lastTier?.amount ?? 12 }],
                    },
                  });
                }}
                className="rounded border px-2 py-1 text-xs text-[var(--mnx-text)]"
              >
                + Add tier
              </MnxAction>
            </div>
          )}

          {config.entitlement.model === "GRANT_BASED" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="wiz-grant-max" className="text-xs font-medium text-[var(--mnx-text)]">Max grants per year (blank = unlimited)</label>
                <Input
                  id="wiz-grant-max"
                  type="number"
                  min="0"
                  value={config.entitlement.maxGrantsPerYear ?? ""}
                  onChange={(e) => {
                    if (config.entitlement.model !== "GRANT_BASED") return;
                    patchConfig({ entitlement: { ...config.entitlement, maxGrantsPerYear: e.target.value ? Number(e.target.value) : null } });
                  }}
                />
              </div>
              <label htmlFor="wiz-grant-approval" className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--mnx-text)]">
                <MnxInput
                  id="wiz-grant-approval"
                  type="checkbox"
                  checked={config.entitlement.requiresApproval}
                  onChange={(e) => {
                    if (config.entitlement.model !== "GRANT_BASED") return;
                    patchConfig({ entitlement: { ...config.entitlement, requiresApproval: e.target.checked } });
                  }}
                  className="rounded"
                />
                Grants require approval
              </label>
            </div>
          )}

          {config.entitlement.model === "ATTENDANCE_BASED" && (
            <div className="space-y-3">
              <p role="alert" className="rounded-lg border border-[var(--mnx-warning-text,inherit)] bg-[var(--mnx-warning-bg,inherit)] p-3 text-xs text-[var(--mnx-text)]">
                ⚠ No automatic attendance-linked accrual engine exists yet. This model&apos;s metric/ratio are recorded but
                balances under this policy will not increase unless credited manually via a leave grant or ledger
                adjustment — the same warning is shown again when you publish this policy.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="wiz-att-metric" className="text-xs font-medium text-[var(--mnx-text)]">Metric</label>
                  <DropdownSelect
                    id="wiz-att-metric"
                    value={config.entitlement.metric}
                    onValueChange={(v) => {
                      if (config.entitlement.model !== "ATTENDANCE_BASED") return;
                      patchConfig({ entitlement: { ...config.entitlement, metric: v as "PAYABLE_DAYS" | "WORKED_DAYS" | "PAYABLE_HOURS" | "OVERTIME_HOURS" } });
                    }}
                    options={[
                      { value: "PAYABLE_DAYS", label: "Payable days" },
                      { value: "WORKED_DAYS", label: "Worked days" },
                      { value: "PAYABLE_HOURS", label: "Payable hours" },
                      { value: "OVERTIME_HOURS", label: "Overtime hours" },
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="wiz-att-frequency" className="text-xs font-medium text-[var(--mnx-text)]">Credit frequency</label>
                  <DropdownSelect
                    id="wiz-att-frequency"
                    value={config.entitlement.creditFrequency}
                    onValueChange={(v) => {
                      if (config.entitlement.model !== "ATTENDANCE_BASED") return;
                      patchConfig({ entitlement: { ...config.entitlement, creditFrequency: v as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" } });
                    }}
                    options={[
                      { value: "WEEKLY", label: "Weekly" },
                      { value: "MONTHLY", label: "Monthly" },
                      { value: "QUARTERLY", label: "Quarterly" },
                      { value: "YEARLY", label: "Yearly" },
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="wiz-att-ratio" className="text-xs font-medium text-[var(--mnx-text)]">Ratio (units credited per metric unit)</label>
                  <Input
                    id="wiz-att-ratio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.entitlement.ratio}
                    onChange={(e) => {
                      if (config.entitlement.model !== "ATTENDANCE_BASED") return;
                      patchConfig({ entitlement: { ...config.entitlement, ratio: Number(e.target.value) || 0 } });
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="wiz-proration-strategy" className="text-xs font-medium text-[var(--mnx-text)]">Proration strategy</label>
              <DropdownSelect
                id="wiz-proration-strategy"
                value={config.proration.strategy}
                onValueChange={(v) => patchConfig({ proration: { ...config.proration, strategy: v as "NONE" | "START_OF_POLICY" | "START_AND_END" } })}
                options={[
                  { value: "NONE", label: "None — full entitlement regardless of join date" },
                  { value: "START_OF_POLICY", label: "Prorate from policy start" },
                  { value: "START_AND_END", label: "Prorate at both start and exit" },
                ]}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="wiz-proration-rounding" className="text-xs font-medium text-[var(--mnx-text)]">Proration rounding</label>
              <DropdownSelect
                id="wiz-proration-rounding"
                value={config.proration.rounding}
                onValueChange={(v) => patchConfig({ proration: { ...config.proration, rounding: v as "NEAREST" | "UP" | "DOWN" } })}
                options={[
                  { value: "NEAREST", label: "Nearest" },
                  { value: "UP", label: "Round up" },
                  { value: "DOWN", label: "Round down" },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="wiz-reset-cadence" className="text-xs font-medium text-[var(--mnx-text)]">Reset cadence</label>
              <DropdownSelect
                id="wiz-reset-cadence"
                value={config.reset.cadence}
                onValueChange={(v) => patchConfig({ reset: { ...config.reset, cadence: v as LeavePolicyConfig["reset"]["cadence"] } })}
                options={[
                  { value: "CALENDAR_YEAR", label: "Calendar year (Jan 1)" },
                  { value: "FINANCIAL_YEAR", label: "Financial year" },
                  { value: "ANNIVERSARY", label: "Employee join-date anniversary" },
                  { value: "MONTHLY", label: "Monthly" },
                  { value: "NONE", label: "Never resets" },
                ]}
              />
            </div>
            {config.reset.cadence === "FINANCIAL_YEAR" && (
              <div className="space-y-1">
                <label htmlFor="wiz-fy-start" className="text-xs font-medium text-[var(--mnx-text)]">Financial year start month</label>
                <Input
                  id="wiz-fy-start"
                  type="number"
                  min="1"
                  max="12"
                  value={config.reset.financialYearStartMonth ?? 4}
                  onChange={(e) => patchConfig({ reset: { ...config.reset, financialYearStartMonth: Number(e.target.value) || 4 } })}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="wiz-cf-mode" className="text-xs font-medium text-[var(--mnx-text)]">Carry-forward mode</label>
              <DropdownSelect
                id="wiz-cf-mode"
                value={config.carryForward.mode}
                onValueChange={(v) => patchConfig({ carryForward: { ...config.carryForward, mode: v as LeavePolicyConfig["carryForward"]["mode"] } })}
                options={[
                  { value: "NONE", label: "No carry-forward" },
                  { value: "ALL", label: "Carry forward everything" },
                  { value: "FIXED_MAX", label: "Fixed max units" },
                  { value: "PERCENTAGE", label: "Percentage of balance" },
                ]}
              />
            </div>
            {config.carryForward.mode === "FIXED_MAX" && (
              <div className="space-y-1">
                <label htmlFor="wiz-cf-fixed-max" className="text-xs font-medium text-[var(--mnx-text)]">Max units</label>
                <Input
                  id="wiz-cf-fixed-max"
                  type="number"
                  min="0"
                  value={config.carryForward.fixedMax ?? 0}
                  onChange={(e) => patchConfig({ carryForward: { ...config.carryForward, fixedMax: Number(e.target.value) || 0 } })}
                />
              </div>
            )}
            {config.carryForward.mode === "PERCENTAGE" && (
              <div className="space-y-1">
                <label htmlFor="wiz-cf-percentage" className="text-xs font-medium text-[var(--mnx-text)]">Percentage</label>
                <Input
                  id="wiz-cf-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={config.carryForward.percentage ?? 0}
                  onChange={(e) => patchConfig({ carryForward: { ...config.carryForward, percentage: Number(e.target.value) || 0 } })}
                />
              </div>
            )}
            {config.carryForward.mode !== "NONE" && (
              <div className="space-y-1">
                <label htmlFor="wiz-cf-expiry" className="text-xs font-medium text-[var(--mnx-text)]">Expiry after (days, blank = never)</label>
                <Input
                  id="wiz-cf-expiry"
                  type="number"
                  min="0"
                  value={config.carryForward.expiryAfterDays ?? ""}
                  placeholder="Never"
                  onChange={(e) => patchConfig({ carryForward: { ...config.carryForward, expiryAfterDays: e.target.value ? Number(e.target.value) : null } })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="wiz-enc-mode" className="text-xs font-medium text-[var(--mnx-text)]">Encashment mode</label>
              <DropdownSelect
                id="wiz-enc-mode"
                value={config.encashment.mode}
                onValueChange={(v) => patchConfig({ encashment: { ...config.encashment, mode: v as LeavePolicyConfig["encashment"]["mode"] } })}
                options={[
                  { value: "DISABLED", label: "Disabled" },
                  { value: "EMPLOYEE_INITIATED", label: "Employee can request anytime" },
                  { value: "AUTO_AT_RESET", label: "Automatic at reset" },
                  { value: "HR_INITIATED", label: "HR-initiated only" },
                  { value: "ON_EXIT", label: "On exit only" },
                ]}
              />
            </div>
            {config.encashment.mode !== "DISABLED" && (
              <>
                <div className="space-y-1">
                  <label htmlFor="wiz-enc-max" className="text-xs font-medium text-[var(--mnx-text)]">Max encashable units (blank = no cap)</label>
                  <Input
                    id="wiz-enc-max"
                    type="number"
                    min="0"
                    value={config.encashment.maxEncashableUnits ?? ""}
                    onChange={(e) => patchConfig({ encashment: { ...config.encashment, maxEncashableUnits: e.target.value ? Number(e.target.value) : undefined } })}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="wiz-enc-min-retained" className="text-xs font-medium text-[var(--mnx-text)]">Min balance retained</label>
                  <Input
                    id="wiz-enc-min-retained"
                    type="number"
                    min="0"
                    value={config.encashment.minBalanceRetained}
                    onChange={(e) => patchConfig({ encashment: { ...config.encashment, minBalanceRetained: Number(e.target.value) || 0 } })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="wiz-negative-mode" className="text-xs font-medium text-[var(--mnx-text)]">Negative-balance handling</label>
              <DropdownSelect
                id="wiz-negative-mode"
                value={config.negativeLeave.mode}
                onValueChange={(v) => patchConfig({ negativeLeave: { ...config.negativeLeave, mode: v as LeavePolicyConfig["negativeLeave"]["mode"] } })}
                options={[
                  { value: "REJECT", label: "Reject the request" },
                  { value: "ALLOW_UNLIMITED", label: "Allow unlimited negative balance" },
                  { value: "ALLOW_WITHIN_LIMIT", label: "Allow up to a limit" },
                  { value: "CONVERT_EXCESS_TO_LOP", label: "Convert excess to loss-of-pay" },
                ]}
              />
            </div>
            {config.negativeLeave.mode === "ALLOW_WITHIN_LIMIT" && (
              <div className="space-y-1">
                <label htmlFor="wiz-negative-limit" className="text-xs font-medium text-[var(--mnx-text)]">Negative limit</label>
                <Input
                  id="wiz-negative-limit"
                  type="number"
                  min="0"
                  value={config.negativeLeave.limit ?? 0}
                  onChange={(e) => patchConfig({ negativeLeave: { ...config.negativeLeave, limit: Number(e.target.value) || 0 } })}
                />
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="wiz-max-balance" className="text-xs font-medium text-[var(--mnx-text)]">Max balance cap (blank = no cap)</label>
              <Input
                id="wiz-max-balance"
                type="number"
                min="0"
                value={config.maxBalance ?? ""}
                onChange={(e) => patchConfig({ maxBalance: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--mnx-muted)]">
            No rules = applies to everyone in the org. INCLUDE rules within the same dimension are OR&apos;d together;
            different dimensions with at least one INCLUDE rule must all match (AND). Any EXCLUDE match disqualifies
            regardless of INCLUDE matches.
          </p>
          {applicabilityRules.map((rule, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-end">
              <div className="space-y-1">
                <label className="text-xs text-[var(--mnx-muted)]">Mode</label>
                <DropdownSelect
                  value={rule.mode}
                  onValueChange={(v) => updateApplicabilityRule(i, { mode: v as "INCLUDE" | "EXCLUDE" })}
                  options={[
                    { value: "INCLUDE", label: "Include" },
                    { value: "EXCLUDE", label: "Exclude" },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--mnx-muted)]">Dimension</label>
                <DropdownSelect
                  value={rule.dimension}
                  onValueChange={(v) => updateApplicabilityRule(i, { dimension: v as ApplicabilityDimension, value: "" })}
                  options={Object.entries(DIMENSION_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--mnx-muted)]">Value</label>
                <DropdownSelect
                  value={rule.value}
                  onValueChange={(v) => updateApplicabilityRule(i, { value: v })}
                  options={applicabilityValueOptions(rule.dimension)}
                />
              </div>
              <MnxAction type="button" onClick={() => removeApplicabilityRule(i)} className="rounded border px-2 py-1.5 text-xs text-[var(--mnx-text)]">
                Remove
              </MnxAction>
            </div>
          ))}
          <MnxAction type="button" onClick={addApplicabilityRule} className="rounded border px-2 py-1 text-xs text-[var(--mnx-text)]">
            + Add rule
          </MnxAction>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="wiz-r-max-consecutive" className="text-xs font-medium text-[var(--mnx-text)]">Max consecutive units</label>
              <Input
                id="wiz-r-max-consecutive"
                type="number"
                min="0"
                value={config.restrictions.maxConsecutiveUnits ?? ""}
                onChange={(e) => patchConfig({ restrictions: { ...config.restrictions, maxConsecutiveUnits: e.target.value ? Number(e.target.value) : undefined } })}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="wiz-r-max-occurrences" className="text-xs font-medium text-[var(--mnx-text)]">Max occurrences per year</label>
              <Input
                id="wiz-r-max-occurrences"
                type="number"
                min="0"
                value={config.restrictions.maxOccurrencesPerYear ?? ""}
                onChange={(e) => patchConfig({ restrictions: { ...config.restrictions, maxOccurrencesPerYear: e.target.value ? Number(e.target.value) : undefined } })}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="wiz-r-min-notice" className="text-xs font-medium text-[var(--mnx-text)]">Minimum notice (days)</label>
              <Input
                id="wiz-r-min-notice"
                type="number"
                min="0"
                value={config.restrictions.minNoticeDays ?? ""}
                onChange={(e) => patchConfig({ restrictions: { ...config.restrictions, minNoticeDays: e.target.value ? Number(e.target.value) : undefined } })}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="wiz-r-max-advance" className="text-xs font-medium text-[var(--mnx-text)]">Max advance booking (days)</label>
              <Input
                id="wiz-r-max-advance"
                type="number"
                min="0"
                value={config.restrictions.maxAdvanceBookingDays ?? ""}
                onChange={(e) => patchConfig({ restrictions: { ...config.restrictions, maxAdvanceBookingDays: e.target.value ? Number(e.target.value) : undefined } })}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="wiz-r-waiting-period" className="text-xs font-medium text-[var(--mnx-text)]">Waiting period after joining (days)</label>
              <Input
                id="wiz-r-waiting-period"
                type="number"
                min="0"
                value={config.restrictions.waitingPeriodAfterJoiningDays}
                onChange={(e) => patchConfig({ restrictions: { ...config.restrictions, waitingPeriodAfterJoiningDays: Number(e.target.value) || 0 } })}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="wiz-r-attachment" className="text-xs font-medium text-[var(--mnx-text)]">Require attachment</label>
              <DropdownSelect
                id="wiz-r-attachment"
                value={config.restrictions.requireAttachment}
                onValueChange={(v) => patchConfig({ restrictions: { ...config.restrictions, requireAttachment: v as "NEVER" | "ALWAYS" | "ABOVE_THRESHOLD" } })}
                options={[
                  { value: "NEVER", label: "Never" },
                  { value: "ALWAYS", label: "Always" },
                  { value: "ABOVE_THRESHOLD", label: "Above a threshold" },
                ]}
              />
            </div>
            {config.restrictions.requireAttachment === "ABOVE_THRESHOLD" && (
              <div className="space-y-1">
                <label htmlFor="wiz-r-attachment-threshold" className="text-xs font-medium text-[var(--mnx-text)]">Attachment threshold (units)</label>
                <Input
                  id="wiz-r-attachment-threshold"
                  type="number"
                  min="0"
                  value={config.restrictions.attachmentThresholdUnits ?? ""}
                  onChange={(e) => patchConfig({ restrictions: { ...config.restrictions, attachmentThresholdUnits: e.target.value ? Number(e.target.value) : undefined } })}
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            <label htmlFor="wiz-r-past-dated" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
              <MnxInput id="wiz-r-past-dated" type="checkbox" checked={config.restrictions.allowPastDated} onChange={(e) => patchConfig({ restrictions: { ...config.restrictions, allowPastDated: e.target.checked } })} className="rounded" />
              Allow past-dated requests
            </label>
            <label htmlFor="wiz-r-same-day" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
              <MnxInput id="wiz-r-same-day" type="checkbox" checked={config.restrictions.allowSameDay} onChange={(e) => patchConfig({ restrictions: { ...config.restrictions, allowSameDay: e.target.checked } })} className="rounded" />
              Allow same-day requests
            </label>
            <label htmlFor="wiz-r-probation" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
              <MnxInput id="wiz-r-probation" type="checkbox" checked={config.restrictions.allowDuringProbation} onChange={(e) => patchConfig({ restrictions: { ...config.restrictions, allowDuringProbation: e.target.checked } })} className="rounded" />
              Allow during probation
            </label>
            <label htmlFor="wiz-r-reason" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
              <MnxInput id="wiz-r-reason" type="checkbox" checked={config.restrictions.requireReason} onChange={(e) => patchConfig({ restrictions: { ...config.restrictions, requireReason: e.target.checked } })} className="rounded" />
              Require a reason
            </label>
          </div>

          <div className="space-y-2 border-t border-[var(--mnx-border)] pt-3">
            <label htmlFor="wiz-sandwich-enabled" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
              <MnxInput id="wiz-sandwich-enabled" type="checkbox" checked={config.sandwich.enabled} onChange={(e) => patchConfig({ sandwich: { ...config.sandwich, enabled: e.target.checked } })} className="rounded" />
              Enable sandwich rule (non-working days between/adjacent to leave count as leave)
            </label>
            {config.sandwich.enabled && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label htmlFor="wiz-sandwich-weekends" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
                  <MnxInput id="wiz-sandwich-weekends" type="checkbox" checked={config.sandwich.includeWeekends} onChange={(e) => patchConfig({ sandwich: { ...config.sandwich, includeWeekends: e.target.checked } })} className="rounded" />
                  Include weekends
                </label>
                <label htmlFor="wiz-sandwich-holidays" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
                  <MnxInput id="wiz-sandwich-holidays" type="checkbox" checked={config.sandwich.includeHolidays} onChange={(e) => patchConfig({ sandwich: { ...config.sandwich, includeHolidays: e.target.checked } })} className="rounded" />
                  Include holidays
                </label>
                <div className="space-y-1">
                  <label htmlFor="wiz-sandwich-threshold" className="text-xs font-medium text-[var(--mnx-text)]">Activation threshold (units)</label>
                  <Input
                    id="wiz-sandwich-threshold"
                    type="number"
                    min="0"
                    value={config.sandwich.activationThresholdUnits}
                    onChange={(e) => patchConfig({ sandwich: { ...config.sandwich, activationThresholdUnits: Number(e.target.value) || 0 } })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--mnx-muted)]">
            Controls how this leave type interacts with requests of OTHER leave types nearby in date. FORBID_COMBINE
            blocks an overlapping request; FORBID_ADJACENT blocks a request separated from the other type only by
            non-working days; REQUIRE_APPROVAL_IF_COMBINED flags it for manual review instead of hard-blocking.
          </p>
          {config.clubbingRules.map((rule, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-end">
              <div className="space-y-1">
                <label className="text-xs text-[var(--mnx-muted)]">Other leave type</label>
                <DropdownSelect
                  value={rule.otherLeaveTypeId}
                  onValueChange={(v) => updateClubbingRule(i, { otherLeaveTypeId: v })}
                  options={leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--mnx-muted)]">Rule</label>
                <DropdownSelect
                  value={rule.mode}
                  onValueChange={(v) => updateClubbingRule(i, { mode: v as LeavePolicyConfig["clubbingRules"][number]["mode"] })}
                  options={[
                    { value: "FORBID_COMBINE", label: "Forbid overlapping" },
                    { value: "FORBID_ADJACENT", label: "Forbid adjacent" },
                    { value: "REQUIRE_APPROVAL_IF_COMBINED", label: "Flag for approval if combined" },
                  ]}
                />
              </div>
              <MnxAction type="button" onClick={() => removeClubbingRule(i)} className="rounded border px-2 py-1.5 text-xs text-[var(--mnx-text)]">
                Remove
              </MnxAction>
            </div>
          ))}
          <MnxAction type="button" onClick={addClubbingRule} disabled={leaveTypes.length === 0} className="rounded border px-2 py-1 text-xs text-[var(--mnx-text)] disabled:opacity-50">
            + Add clubbing rule
          </MnxAction>
          {leaveTypes.length === 0 && (
            <p className="text-xs text-[var(--mnx-muted)]">No other leave types exist yet to club against.</p>
          )}
        </div>
      )}

      {step === 7 && (
        <div className="space-y-4">
          <label htmlFor="wiz-auto-approve" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
            <MnxInput
              id="wiz-auto-approve"
              type="checkbox"
              checked={config.approvalRouting.autoApprove}
              onChange={(e) => patchConfig({ approvalRouting: { ...config.approvalRouting, autoApprove: e.target.checked } })}
              className="rounded"
            />
            Auto-approve (skip manual approval entirely)
          </label>

          {!config.approvalRouting.autoApprove && (
            <div className="space-y-4">
              {config.approvalRouting.routes.map((route, ri) => (
                <div key={ri} className="space-y-2 rounded-lg border border-[var(--mnx-border)] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[var(--mnx-text)]">Route {ri + 1}</p>
                    {config.approvalRouting.routes.length > 1 && (
                      <MnxAction type="button" onClick={() => removeApprovalRoute(ri)} className="rounded border px-2 py-1 text-xs text-[var(--mnx-text)]">
                        Remove route
                      </MnxAction>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--mnx-muted)]">Applies when units &le;</label>
                      <Input
                        type="number"
                        min="0"
                        value={route.criteria.maxUnits ?? ""}
                        placeholder="Any"
                        onChange={(e) => updateApprovalRoute(ri, { criteria: { ...route.criteria, maxUnits: e.target.value ? Number(e.target.value) : undefined } })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--mnx-muted)]">Applies when units &ge;</label>
                      <Input
                        type="number"
                        min="0"
                        value={route.criteria.minUnits ?? ""}
                        placeholder="Any"
                        onChange={(e) => updateApprovalRoute(ri, { criteria: { ...route.criteria, minUnits: e.target.value ? Number(e.target.value) : undefined } })}
                      />
                    </div>
                    <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--mnx-text)]">
                      <MnxInput
                        type="checkbox"
                        checked={route.criteria.requiresLop ?? false}
                        onChange={(e) => updateApprovalRoute(ri, { criteria: { ...route.criteria, requiresLop: e.target.checked } })}
                        className="rounded"
                      />
                      Only when LOP is involved
                    </label>
                  </div>

                  <p className="text-xs font-medium text-[var(--mnx-text)]">Steps (in sequence)</p>
                  {route.steps.map((s, si) => (
                    <div key={si} className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-end">
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--mnx-muted)]">Step {s.sequence}: approver type</label>
                        <DropdownSelect
                          value={s.approverType}
                          onValueChange={(v) => updateApprovalStep(ri, si, { approverType: v as LeavePolicyConfig["approvalRouting"]["routes"][number]["steps"][number]["approverType"], roleId: undefined, userId: undefined })}
                          options={[
                            { value: "MANAGER", label: "Direct manager" },
                            { value: "MANAGERS_MANAGER", label: "Manager's manager" },
                            { value: "DEPARTMENT_HEAD", label: "Department head" },
                            { value: "ROLE", label: "Anyone with a specific role" },
                            { value: "NAMED_USER", label: "Named employee" },
                            { value: "HR", label: "HR" },
                          ]}
                        />
                      </div>
                      {s.approverType === "ROLE" && (
                        <div className="space-y-1">
                          <label className="text-xs text-[var(--mnx-muted)]">Role</label>
                          <DropdownSelect
                            value={s.roleId ?? ""}
                            onValueChange={(v) => updateApprovalStep(ri, si, { roleId: v })}
                            options={roles.map((r) => ({ value: r.id, label: r.name }))}
                          />
                        </div>
                      )}
                      {s.approverType === "NAMED_USER" && (
                        <div className="space-y-1">
                          <label className="text-xs text-[var(--mnx-muted)]">Employee</label>
                          <DropdownSelect
                            value={s.userId ?? ""}
                            onValueChange={(v) => updateApprovalStep(ri, si, { userId: v })}
                            options={employees.map((e) => ({ value: e.id, label: e.name }))}
                          />
                        </div>
                      )}
                      {route.steps.length > 1 && (
                        <MnxAction type="button" onClick={() => removeApprovalStep(ri, si)} className="rounded border px-2 py-1.5 text-xs text-[var(--mnx-text)]">
                          Remove step
                        </MnxAction>
                      )}
                    </div>
                  ))}
                  <MnxAction type="button" onClick={() => addApprovalStep(ri)} disabled={route.steps.length >= 10} className="rounded border px-2 py-1 text-xs text-[var(--mnx-text)] disabled:opacity-50">
                    + Add step
                  </MnxAction>
                </div>
              ))}
              <MnxAction type="button" onClick={addApprovalRoute} className="rounded border px-2 py-1 text-xs text-[var(--mnx-text)]">
                + Add another route (different criteria, e.g. a separate route for large requests)
              </MnxAction>

              <div className="flex flex-wrap gap-4 border-t border-[var(--mnx-border)] pt-3">
                <label htmlFor="wiz-mandatory-approval-comment" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
                  <MnxInput id="wiz-mandatory-approval-comment" type="checkbox" checked={config.approvalRouting.mandatoryApprovalComment} onChange={(e) => patchConfig({ approvalRouting: { ...config.approvalRouting, mandatoryApprovalComment: e.target.checked } })} className="rounded" />
                  Require a comment on approval
                </label>
                <label htmlFor="wiz-mandatory-rejection-comment" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
                  <MnxInput id="wiz-mandatory-rejection-comment" type="checkbox" checked={config.approvalRouting.mandatoryRejectionComment} onChange={(e) => patchConfig({ approvalRouting: { ...config.approvalRouting, mandatoryRejectionComment: e.target.checked } })} className="rounded" />
                  Require a comment on rejection
                </label>
                <div className="space-y-1">
                  <label htmlFor="wiz-sla-hours" className="text-xs font-medium text-[var(--mnx-text)]">SLA (hours, blank = none)</label>
                  <Input
                    id="wiz-sla-hours"
                    type="number"
                    min="0"
                    value={config.approvalRouting.slaHours ?? ""}
                    onChange={(e) => patchConfig({ approvalRouting: { ...config.approvalRouting, slaHours: e.target.value ? Number(e.target.value) : undefined } })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 8 && (
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-4 text-xs text-[var(--mnx-text)]">
            <p className="mb-2 font-medium">{name || "(unnamed)"} ({code || "?"}) — {classification}, unit {unit}</p>
            <p>Entitlement: {config.entitlement.model}</p>
            <p>Proration: {config.proration.strategy}, rounding {config.proration.rounding}</p>
            <p>Reset: {config.reset.cadence}</p>
            <p>Carry-forward: {config.carryForward.mode}{config.carryForward.expiryAfterDays != null ? `, expires after ${config.carryForward.expiryAfterDays}d` : ""}</p>
            <p>Encashment: {config.encashment.mode}</p>
            <p>Negative balance: {config.negativeLeave.mode}</p>
            <p>Applicability rules: {applicabilityRules.filter((r) => r.value).length || "none — applies to everyone"}</p>
            <p>Sandwich rule: {config.sandwich.enabled ? "enabled" : "disabled"}</p>
            <p>Clubbing rules: {config.clubbingRules.length}</p>
            <p>Approval: {config.approvalRouting.autoApprove ? "auto-approve" : `${config.approvalRouting.routes.length} route(s)`}</p>
          </div>
          <label htmlFor="wiz-publish-now" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
            <MnxInput id="wiz-publish-now" type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="rounded" />
            Publish immediately (uncheck to save as draft for further review)
          </label>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-[var(--mnx-border)] pt-3">
        <MnxAction type="button" onClick={onClose} className="rounded-lg border px-4 py-1.5 text-sm">
          Cancel
        </MnxAction>
        <div className="flex gap-2">
          {step > 0 && (
            <MnxAction type="button" onClick={() => setStep((s) => s - 1)} className="rounded-lg border px-4 py-1.5 text-sm">
              Back
            </MnxAction>
          )}
          {step < STEP_LABELS.length - 1 ? (
            <MnxAction
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canGoNext}
              className="rounded-lg bg-[var(--mnx-info-bg)] px-4 py-1.5 text-sm text-[var(--mnx-text)] disabled:opacity-50"
            >
              Next
            </MnxAction>
          ) : (
            <MnxAction
              type="button"
              onClick={submit}
              disabled={submitting}
              className="rounded-lg bg-[var(--mnx-info-bg)] px-4 py-1.5 text-sm text-[var(--mnx-text)] disabled:opacity-50"
            >
              {publishNow ? "Create & Publish" : "Save as Draft"}
            </MnxAction>
          )}
        </div>
      </div>
    </div>
  );
}
