"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  CrmButton,
  CrmInput,
  CrmPanel,
  CrmStatus,
} from "@/modules/crm/components/workspace/crm-workspace";
import { saveEnquiryRatesAction } from "@/modules/crm/actions";
import {
  buildDepartmentRateLabels,
  createRatesSignature,
  departmentHasSubmittedRates,
  getDepartmentsWithUnquotedChanges,
  getIncludedDepartmentsForMode,
  getPendingDepartments,
  getRateWorkflowSnapshot,
  normalizeDepartmentRates,
  type CrmQuoteWorkflowMode,
  type CrmRateDepartment,
} from "@/modules/crm/rate-workflow";

type TabKey = CrmRateDepartment;

const TAB_LABELS: Record<TabKey, string> = {
  FREIGHT_FORWARDING: "Freight Forwarding Rate",
  CUSTOMS_CLEARANCE: "Customs Clearance Rate",
};

const TEAM_LABELS: Record<TabKey, string> = {
  FREIGHT_FORWARDING: "Freight Forwarding team",
  CUSTOMS_CLEARANCE: "Customs Clearance team",
};

function formatDepartmentName(value: CrmRateDepartment) {
  return value === "FREIGHT_FORWARDING"
    ? "freight forwarding"
    : "customs clearance";
}

function formatQuotedMode(includedDepartments: CrmRateDepartment[]) {
  if (
    includedDepartments.includes("FREIGHT_FORWARDING") &&
    includedDepartments.includes("CUSTOMS_CLEARANCE")
  ) {
    return "combined";
  }

  return includedDepartments[0] === "CUSTOMS_CLEARANCE"
    ? "customs-only"
    : "freight-only";
}

export function ServiceRateWorkflowPanel({
  lead,
  serviceType,
}: {
  lead: {
    id: string;
    enquiryDetails: unknown;
  };
  serviceType?: CrmRateDepartment | null;
}) {
  const router = useRouter();
  const workflow = useMemo(
    () => getRateWorkflowSnapshot(lead.enquiryDetails),
    [lead.enquiryDetails],
  );
  const pendingDepartments = useMemo(
    () => getPendingDepartments(workflow),
    [workflow],
  );
  const changedDepartments = useMemo(
    () => getDepartmentsWithUnquotedChanges(workflow),
    [workflow],
  );
  const defaultTab: TabKey =
    serviceType ||
    (departmentHasSubmittedRates(workflow, "FREIGHT_FORWARDING")
      ? "FREIGHT_FORWARDING"
      : "CUSTOMS_CLEARANCE");
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [isSaving, setIsSaving] = useState(false);

  const [freightRates, setFreightRates] = useState({
    oceanFreight: workflow.freightRates.oceanFreight ?? 0,
    cfsCharges: workflow.freightRates.cfsCharges ?? 0,
    vgmCharges: workflow.freightRates.vgmCharges ?? 0,
  });
  const [customsRates, setCustomsRates] = useState({
    customsClearance: workflow.customsRates.customsClearance ?? 0,
    doCharges: workflow.customsRates.doCharges ?? 0,
    blCharges: workflow.customsRates.blCharges ?? 0,
  });

  const activeRates =
    activeTab === "FREIGHT_FORWARDING" ? freightRates : customsRates;
  const labels = buildDepartmentRateLabels(activeTab);
  const canEditActiveTab = !serviceType || serviceType === activeTab;
  const activeSubmitted =
    activeTab === "FREIGHT_FORWARDING"
      ? workflow.freightSubmittedAt
      : workflow.customsSubmittedAt;
  const activeSignature = createRatesSignature(
    normalizeDepartmentRates(activeTab, activeRates) as Record<string, number>,
  );
  const lastQuotedSignature =
    activeTab === "FREIGHT_FORWARDING"
      ? workflow.lastQuotedFreightSignature
      : workflow.lastQuotedCustomsSignature;
  const hasUnquotedChangesForActiveTab =
    departmentHasSubmittedRates(workflow, activeTab) &&
    activeSignature !== (lastQuotedSignature ?? "[]");

  const combinedDepartments = getIncludedDepartmentsForMode("combined", workflow);

  async function handleSave(tab: TabKey) {
    const payload = tab === "FREIGHT_FORWARDING" ? freightRates : customsRates;
    setIsSaving(true);
    const result = await saveEnquiryRatesAction(lead.id, tab, payload);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to save department rates.");
      return;
    }

    toast.success(
      tab === "FREIGHT_FORWARDING"
        ? "Freight forwarding rates saved."
        : "Customs clearance rates saved.",
    );
    router.refresh();
  }

  function buildQuoteHref(mode: CrmQuoteWorkflowMode) {
    const search = new URLSearchParams({
      leadId: lead.id,
      mode,
    });

    if (serviceType) {
      search.set("department", serviceType);
    }

    return `/crm/quotes/new?${search.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["FREIGHT_FORWARDING", "CUSTOMS_CLEARANCE"] as const).map((tab) => (
          <CrmButton
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            variant={activeTab === tab ? "primary" : "secondary"}
            size="compact"
          >
            {TAB_LABELS[tab]}
          </CrmButton>
        ))}
      </div>

      {!canEditActiveTab ? (
        <CrmPanel className="border-[var(--mnx-warning)]/30 bg-[var(--mnx-warning-bg)]/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <CrmStatus variant="warning">Restricted entry</CrmStatus>
            <p className="text-sm text-[var(--mnx-text-muted)]">
              Only the {TEAM_LABELS[serviceType as TabKey]} can enter{" "}
              {formatDepartmentName(activeTab)} rates from this queue.
            </p>
          </div>
        </CrmPanel>
      ) : null}

      <CrmPanel className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
              {TAB_LABELS[activeTab]}
            </div>
            <p className="mt-1 text-sm text-[var(--mnx-text-muted)]">
              {activeTab === "FREIGHT_FORWARDING"
                ? "Freight quotes for this testing phase are limited to Ocean Freight, CFS Charges, and VGM Charges."
                : "Clearance quotes for this testing phase are limited to Customs Clearance Charges, DO Charges, and BL Charges."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CrmStatus
              variant={departmentHasSubmittedRates(workflow, activeTab) ? "success" : "warning"}
            >
              {departmentHasSubmittedRates(workflow, activeTab)
                ? "Rates submitted"
                : "Rates pending"}
            </CrmStatus>
            {activeSubmitted ? (
              <span className="text-xs text-[var(--mnx-text-muted)]">
                Last updated {new Date(activeSubmitted).toLocaleString("en-IN")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                {label}
              </label>
              <CrmInput
                type="number"
                value={(activeRates as Record<string, number>)[key] ?? 0}
                onChange={(event) => {
                  const nextValue = Number(event.target.value || 0);
                  if (activeTab === "FREIGHT_FORWARDING") {
                    setFreightRates((current) => ({
                      ...current,
                      [key]: nextValue,
                    }));
                  } else {
                    setCustomsRates((current) => ({
                      ...current,
                      [key]: nextValue,
                    }));
                  }
                }}
                disabled={!canEditActiveTab}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mnx-border)]/40 pt-4">
          <div className="space-y-1">
            <div className="text-xs text-[var(--mnx-text-muted)]">
              Pending departments:{" "}
              <span className="font-semibold text-[var(--mnx-text-strong)]">
                {pendingDepartments.length
                  ? pendingDepartments
                      .map((item) =>
                        item === "FREIGHT_FORWARDING"
                          ? "Freight Forwarding"
                          : "Customs Clearance",
                      )
                      .join(", ")
                  : "None"}
              </span>
            </div>
            {hasUnquotedChangesForActiveTab ? (
              <div className="text-xs text-[var(--mnx-warning)]">
                New or changed {formatDepartmentName(activeTab)} rates are not included in the latest quote version yet.
              </div>
            ) : null}
          </div>
          <CrmButton
            type="button"
            onClick={() => handleSave(activeTab)}
            disabled={isSaving || !canEditActiveTab}
          >
            {isSaving ? "Saving..." : "Save department rates"}
          </CrmButton>
        </div>
      </CrmPanel>

      <CrmPanel className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
              Quotation readiness
            </div>
            <p className="text-sm text-[var(--mnx-text-muted)]">
              {pendingDepartments.length
                ? `${pendingDepartments
                    .map((item) =>
                      item === "FREIGHT_FORWARDING"
                        ? "freight forwarding"
                        : "customs clearance",
                    )
                    .join(" and ")} rates are still pending.`
                : "Both departments have submitted their rates and a combined quotation is ready."}
            </p>
          </div>
          {workflow.latestQuoteVersion ? (
            <CrmStatus variant="accent">
              Latest quotation version V{workflow.latestQuoteVersion}
            </CrmStatus>
          ) : (
            <CrmStatus variant="warning">No quotation created yet</CrmStatus>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {departmentHasSubmittedRates(workflow, "FREIGHT_FORWARDING") ? (
            <Link href={buildQuoteHref("freight-only")}>
              <CrmButton type="button" variant="secondary" size="compact">
                Create freight-only quotation
              </CrmButton>
            </Link>
          ) : null}
          {departmentHasSubmittedRates(workflow, "CUSTOMS_CLEARANCE") ? (
            <Link href={buildQuoteHref("customs-only")}>
              <CrmButton type="button" variant="secondary" size="compact">
                Create customs-only quotation
              </CrmButton>
            </Link>
          ) : null}
          {combinedDepartments.length === 2 ? (
            <Link href={buildQuoteHref("combined")}>
              <CrmButton type="button" size="compact">
                Create combined quotation
              </CrmButton>
            </Link>
          ) : null}
        </div>

        {workflow.latestQuoteVersion && changedDepartments.length > 0 ? (
          <div className="space-y-3 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-warning)]/30 bg-[var(--mnx-warning-bg)]/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <CrmStatus variant="warning">Recreate quotation required</CrmStatus>
              <p className="text-sm text-[var(--mnx-text-muted)]">
                Newly added rates are available from{" "}
                <span className="font-semibold text-[var(--mnx-text-strong)]">
                  {changedDepartments
                    .map((item) =>
                      item === "FREIGHT_FORWARDING"
                        ? "Freight Forwarding"
                        : "Customs Clearance",
                    )
                    .join(" and ")}
                </span>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={buildQuoteHref("newly-added-only")}>
                <CrmButton type="button" variant="secondary" size="compact">
                  Recreate with newly added rates only
                </CrmButton>
              </Link>
              {combinedDepartments.length > 0 ? (
                <Link href={buildQuoteHref("combined")}>
                  <CrmButton type="button" size="compact">
                    Recreate combined quotation
                  </CrmButton>
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {workflow.latestQuoteVersion && pendingDepartments.length > 0 ? (
          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] p-4 text-sm text-[var(--mnx-text-muted)]">
            The current quotation can continue through approval and customer sharing with the already submitted department rates. The remaining department can be added later as a new version.
          </div>
        ) : null}

        {workflow.latestQuoteVersion && combinedDepartments.length > 0 ? (
          <div className="text-xs text-[var(--mnx-text-muted)]">
            Latest quoted mode:{" "}
            <span className="font-semibold text-[var(--mnx-text-strong)]">
              {formatQuotedMode(combinedDepartments)}
            </span>
          </div>
        ) : null}
      </CrmPanel>
    </div>
  );
}
