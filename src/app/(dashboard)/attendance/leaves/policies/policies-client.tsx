"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  OperationalDataTable,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/modules/people/components/people-controls";
import { Input } from "@/components/ui/input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import type { LeavePolicyConfig } from "@/modules/leave/policy-config.schema";

type PolicyVersionRow = {
  id: string;
  version: number;
  status: string;
  classification: string;
  entitlementModel: string;
  effectiveFrom: string;
};

type LeaveTypeRow = {
  id: string;
  name: string;
  code: string | null;
  isCompOffType: boolean;
  activeVersionId: string | null;
  versions: PolicyVersionRow[];
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  PUBLISHED: "success",
  DRAFT: "warning",
  ARCHIVED: "neutral",
};

function buildDefaultConfig(annualAmount: number): LeavePolicyConfig {
  return {
    entitlement: { model: "FIXED", amount: annualAmount, creditFrequency: "MONTHLY" },
    proration: { strategy: "START_OF_POLICY", rounding: "NEAREST" },
    reset: { cadence: "CALENDAR_YEAR" },
    carryForward: { mode: "FIXED_MAX", fixedMax: Math.min(5, annualAmount), expiryAfterDays: 90 },
    encashment: { mode: "DISABLED", minBalanceRetained: 0 },
    negativeLeave: { mode: "CONVERT_EXCESS_TO_LOP" },
    maxBalance: annualAmount * 2,
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
      routes: [
        {
          criteria: {},
          steps: [{ sequence: 1, approverType: "MANAGER" }],
        },
      ],
      mandatoryApprovalComment: false,
      mandatoryRejectionComment: true,
    },
    availabilityStatus: "OUT_OF_OFFICE",
  };
}

export function PoliciesClient({
  leaveTypes,
  departments,
  branches,
}: {
  leaveTypes: LeaveTypeRow[];
  departments: { id: string; name: string }[];
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [classification, setClassification] = useState<string>("PAID");
  const [annualAmount, setAnnualAmount] = useState("12");
  const [publishNow, setPublishNow] = useState(true);
  const [restrictToDepartmentId, setRestrictToDepartmentId] = useState("");
  const [restrictToBranchId, setRestrictToBranchId] = useState("");
  const [requireAttachmentAbove, setRequireAttachmentAbove] = useState("");
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState("");
  const [minNoticeDays, setMinNoticeDays] = useState("");

  async function createPolicy(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const config = buildDefaultConfig(Number(annualAmount) || 0);
      if (requireAttachmentAbove) {
        config.restrictions.requireAttachment = "ABOVE_THRESHOLD";
        config.restrictions.attachmentThresholdUnits = Number(requireAttachmentAbove);
      }
      if (maxConsecutiveDays) {
        config.restrictions.maxConsecutiveUnits = Number(maxConsecutiveDays);
      }
      if (minNoticeDays) {
        config.restrictions.minNoticeDays = Number(minNoticeDays);
      }

      const applicabilityRules = [
        ...(restrictToDepartmentId
          ? [{ mode: "INCLUDE" as const, dimension: "DEPARTMENT" as const, value: restrictToDepartmentId }]
          : []),
        ...(restrictToBranchId
          ? [{ mode: "INCLUDE" as const, dimension: "BRANCH" as const, value: restrictToBranchId }]
          : []),
      ];

      const res = await fetch("/api/leave/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          classification,
          unit: "DAY",
          effectiveFrom: new Date().toISOString(),
          configuration: config,
          applicabilityRules,
          publishImmediately: publishNow,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? body.error ?? "Failed to create policy");
      }
      toast.success("Leave policy created");
      setShowForm(false);
      setName("");
      setCode("");
      setAnnualAmount("12");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create policy");
    } finally {
      setLoading(false);
    }
  }

  async function publish(versionId: string) {
    try {
      const res = await fetch(`/api/leave/policies/${versionId}/publish`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to publish");
      toast.success("Policy version published");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish");
    }
  }

  return (
    <div className="space-y-6">
      <OperationalDataTable>
        <OperationalDataTableHeader
          eyebrow="Settings → Leave Management"
          title="Leave Types & Policies"
          actions={
            <MnxAction
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-[var(--mnx-info-bg)] px-3 py-1.5 text-sm text-[var(--mnx-text)]"
            >
              + New Leave Type
            </MnxAction>
          }
        />

        {showForm && (
          <form
            onSubmit={createPolicy}
            className="space-y-3 border-b border-[var(--mnx-border)] bg-[var(--mnx-card)] px-5 py-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <label htmlFor="policy-name" className="text-xs font-medium text-[var(--mnx-text)]">Name</label>
                <Input id="policy-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Annual Leave" />
              </div>
              <div className="space-y-1">
                <label htmlFor="policy-code" className="text-xs font-medium text-[var(--mnx-text)]">Code</label>
                <Input id="policy-code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="AL" />
              </div>
              <div className="space-y-1">
                <label htmlFor="policy-classification" className="text-xs font-medium text-[var(--mnx-text)]">Classification</label>
                <DropdownSelect
                  id="policy-classification"
                  value={classification}
                  onValueChange={setClassification}
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
                <label htmlFor="policy-annual-amount" className="text-xs font-medium text-[var(--mnx-text)]">Annual entitlement (days)</label>
                <Input
                  id="policy-annual-amount"
                  type="number"
                  min="0"
                  value={annualAmount}
                  onChange={(e) => setAnnualAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <p className="text-xs font-medium text-[var(--mnx-text)]">Applicability (optional)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="policy-department" className="text-xs font-medium text-[var(--mnx-text)]">Restrict to department</label>
                <DropdownSelect
                  id="policy-department"
                  value={restrictToDepartmentId}
                  onValueChange={setRestrictToDepartmentId}
                  options={[{ value: "", label: "All departments" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="policy-branch" className="text-xs font-medium text-[var(--mnx-text)]">Restrict to branch</label>
                <DropdownSelect
                  id="policy-branch"
                  value={restrictToBranchId}
                  onValueChange={setRestrictToBranchId}
                  options={[{ value: "", label: "All branches" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
                />
              </div>
            </div>

            <p className="text-xs font-medium text-[var(--mnx-text)]">Restrictions (optional)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="policy-attachment-above" className="text-xs font-medium text-[var(--mnx-text)]">
                  Require attachment above (days)
                </label>
                <Input
                  id="policy-attachment-above"
                  type="number"
                  min="0"
                  value={requireAttachmentAbove}
                  onChange={(e) => setRequireAttachmentAbove(e.target.value)}
                  placeholder="e.g. 3"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="policy-max-consecutive" className="text-xs font-medium text-[var(--mnx-text)]">Max consecutive days</label>
                <Input
                  id="policy-max-consecutive"
                  type="number"
                  min="0"
                  value={maxConsecutiveDays}
                  onChange={(e) => setMaxConsecutiveDays(e.target.value)}
                  placeholder="e.g. 15"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="policy-min-notice" className="text-xs font-medium text-[var(--mnx-text)]">Minimum notice (days)</label>
                <Input
                  id="policy-min-notice"
                  type="number"
                  min="0"
                  value={minNoticeDays}
                  onChange={(e) => setMinNoticeDays(e.target.value)}
                  placeholder="e.g. 2"
                />
              </div>
            </div>

            <p className="text-xs text-[var(--mnx-muted)]">
              Creates a policy with monthly accrual, calendar-year reset, up to 5 days carry-forward (90-day
              expiry), manager-only approval, and LOP conversion beyond balance. Experience-based tiers, sandwich
              rules, and multi-level approval routing beyond a single manager step can be refined afterward via
              the API — a full step-by-step wizard for those is a follow-up.
            </p>
            <label htmlFor="policy-publish-now" className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
              <MnxInput
                id="policy-publish-now"
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="rounded"
              />
              Publish immediately
            </label>
            <div className="flex gap-2">
              <MnxAction
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[var(--mnx-info-bg)] px-4 py-1.5 text-sm text-[var(--mnx-text)] disabled:opacity-50"
              >
                Create
              </MnxAction>
              <MnxAction
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border px-4 py-1.5 text-sm"
              >
                Cancel
              </MnxAction>
            </div>
          </form>
        )}

        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                {["Name", "Code", "Active Version", "Status", "Classification", "Model", ""].map((h) => (
                  <OperationalTableHead key={h}>{h}</OperationalTableHead>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaveTypes.length === 0 ? (
                <OperationalTableEmpty colSpan={7}>No leave types configured yet.</OperationalTableEmpty>
              ) : (
                leaveTypes.map((lt) => {
                  const latest = lt.versions[0];
                  return (
                    <tr key={lt.id}>
                      <OperationalTableCell className="font-medium text-[var(--mnx-text)]">
                        {lt.name}
                      </OperationalTableCell>
                      <OperationalTableCell>{lt.code ?? "-"}</OperationalTableCell>
                      <OperationalTableCell>{latest ? `v${latest.version}` : "-"}</OperationalTableCell>
                      <OperationalTableCell>
                        {latest && (
                          <OperationalStatus tone={STATUS_TONE[latest.status] ?? "neutral"}>
                            {latest.status}
                          </OperationalStatus>
                        )}
                      </OperationalTableCell>
                      <OperationalTableCell>{latest?.classification ?? "-"}</OperationalTableCell>
                      <OperationalTableCell>{latest?.entitlementModel ?? "-"}</OperationalTableCell>
                      <OperationalTableCell>
                        {latest && latest.status === "DRAFT" && (
                          <MnxAction
                            onClick={() => publish(latest.id)}
                            className="rounded bg-[var(--mnx-success-bg)] px-2 py-1 text-xs text-[var(--mnx-text)]"
                          >
                            Publish
                          </MnxAction>
                        )}
                      </OperationalTableCell>
                    </tr>
                  );
                })
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      </OperationalDataTable>
    </div>
  );
}
