import { Calculator, FileSpreadsheet, Lock, Settings2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import {
  type AccountingWorkflowCardItem,
  AccountingWorkflowCards,
} from "@/components/monolith/accounting-workflow-cards";
import {
  AccountingActionLink,
  AccountingEmptyTableRow,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingTable,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingTaxSettlementWorkspace } from "@/modules/accounting/phase9-workspaces";
import {
  transitionAccountingPeriodCloseRun,
  transitionAccountingStatutoryFilingPeriod,
} from "@/modules/accounting/tax-settlement";

export default async function AccountingTaxSettlementPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/tax-settlement",
    ["accounting.reports.view", "accounting.settings.manage"],
  );
  const workspace = await getAccountingTaxSettlementWorkspace(orgId);

  async function markFilingReadyAction(formData: FormData) {
    "use server";
    const access = await requireAccountingRouteAccess(
      "/accounting/tax-settlement",
      ["accounting.settings.manage", "accounting.reports.view"],
    );
    await transitionAccountingStatutoryFilingPeriod({
      orgId: access.orgId,
      actorId: access.userId,
      filingPeriodId: String(formData.get("filingPeriodId") ?? ""),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      nextStatus: "READY",
      reason: "Operational settlement review completed from the tax-settlement workspace.",
    });
    revalidatePath("/accounting/tax-settlement");
    revalidatePath("/accounting");
  }

  async function markFilingOpenAction(formData: FormData) {
    "use server";
    const access = await requireAccountingRouteAccess("/accounting/tax-settlement", [
      "accounting.settings.manage",
      "accounting.reports.view",
    ]);
    await transitionAccountingStatutoryFilingPeriod({
      orgId: access.orgId,
      actorId: access.userId,
      filingPeriodId: String(formData.get("filingPeriodId") ?? ""),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      nextStatus: "OPEN",
      reason: "Returned to open review from the tax-settlement workspace.",
    });
    revalidatePath("/accounting/tax-settlement");
    revalidatePath("/accounting");
  }

  async function markFilingFiledAction(formData: FormData) {
    "use server";
    const access = await requireAccountingRouteAccess("/accounting/tax-settlement", [
      "accounting.settings.manage",
      "accounting.reports.view",
    ]);
    await transitionAccountingStatutoryFilingPeriod({
      orgId: access.orgId,
      actorId: access.userId,
      filingPeriodId: String(formData.get("filingPeriodId") ?? ""),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      acknowledgementRef: String(formData.get("acknowledgementRef") ?? ""),
      nextStatus: "FILED",
      reason: "Marked filed from the tax-settlement workspace.",
    });
    revalidatePath("/accounting/tax-settlement");
    revalidatePath("/accounting");
  }

  async function markCloseRunReadyAction(formData: FormData) {
    "use server";
    const access = await requireAccountingRouteAccess("/accounting/tax-settlement", [
      "accounting.settings.manage",
      "accounting.reports.view",
    ]);
    await transitionAccountingPeriodCloseRun({
      orgId: access.orgId,
      actorId: access.userId,
      periodCloseRunId: String(formData.get("periodCloseRunId") ?? ""),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      nextStatus: "READY",
      reason: "Close checklist reviewed from the tax-settlement workspace.",
    });
    revalidatePath("/accounting/tax-settlement");
    revalidatePath("/accounting");
  }

  async function markCloseRunOpenAction(formData: FormData) {
    "use server";
    const access = await requireAccountingRouteAccess("/accounting/tax-settlement", [
      "accounting.settings.manage",
      "accounting.reports.view",
    ]);
    await transitionAccountingPeriodCloseRun({
      orgId: access.orgId,
      actorId: access.userId,
      periodCloseRunId: String(formData.get("periodCloseRunId") ?? ""),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      nextStatus: "OPEN",
      reason: "Returned close run to open review from the tax-settlement workspace.",
    });
    revalidatePath("/accounting/tax-settlement");
    revalidatePath("/accounting");
  }

  async function markCloseRunClosedAction(formData: FormData) {
    "use server";
    const access = await requireAccountingRouteAccess("/accounting/tax-settlement", [
      "accounting.settings.manage",
      "accounting.reports.view",
    ]);
    await transitionAccountingPeriodCloseRun({
      orgId: access.orgId,
      actorId: access.userId,
      periodCloseRunId: String(formData.get("periodCloseRunId") ?? ""),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      nextStatus: "CLOSED",
      reason: "Closed from the tax-settlement workspace after settlement review.",
    });
    revalidatePath("/accounting/tax-settlement");
    revalidatePath("/accounting");
  }

  async function markCloseRunReopenedAction(formData: FormData) {
    "use server";
    const access = await requireAccountingRouteAccess("/accounting/tax-settlement", [
      "accounting.settings.manage",
      "accounting.reports.view",
    ]);
    await transitionAccountingPeriodCloseRun({
      orgId: access.orgId,
      actorId: access.userId,
      periodCloseRunId: String(formData.get("periodCloseRunId") ?? ""),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      nextStatus: "REOPENED",
      reason: "Reopened from the tax-settlement workspace.",
    });
    revalidatePath("/accounting/tax-settlement");
    revalidatePath("/accounting");
  }

  const workflows = [
    {
      href: "/accounting/reports",
      title: "Accounting Reports",
      description:
        "Run the detailed GSTR and GST ledger reports that feed settlement and filing review.",
      icon: FileSpreadsheet,
    },
    {
      href: "/accounting/transaction-locking",
      title: "Transaction Locking",
      description:
        "Review the active lock boundary before finalizing filing and close controls.",
      icon: Lock,
    },
    caps["accounting.settings.manage"]
      ? {
          href: "/accounting/configuration/admin",
          title: "Tax and Filing Admin",
          description:
            "Maintain registrations, tax profiles, tax rules, statutory return profiles, and period-close runs.",
          icon: Settings2,
        }
      : null,
    {
      href: "/accounting/currency-adjustments",
      title: "Currency Adjustments",
      description:
        "Review FX evidence and foreign-currency subledger readiness before close.",
      icon: Calculator,
    },
  ].filter((value): value is AccountingWorkflowCardItem => value !== null);

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <>
            <AccountingActionLink href="/accounting/reports">
              Open reports
            </AccountingActionLink>
            {caps["accounting.settings.manage"] ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Config admin
              </AccountingActionLink>
            ) : null}
          </>
        }
      />
      <AccountingMetrics>
        <AccountingMetric
          label="Active registrations"
          value={workspace.metrics.activeRegistrations}
          detail="Active GST registrations in scope"
        />
        <AccountingMetric
          label="Open filing periods"
          value={workspace.metrics.openFilingPeriods}
          detail="Return periods still requiring filing or settlement review"
        />
        <AccountingMetric
          label="Validated tax profiles"
          value={workspace.metrics.validatedTaxProfiles}
          detail="Validated tax-profile versions ready for controlled use"
        />
        <AccountingMetric
          label="Current lock date"
          value={workspace.metrics.currentLockDate ?? "Not locked"}
          detail="Current transaction-lock boundary"
        />
      </AccountingMetrics>
      <AccountingSection
        eyebrow="Settlement control"
        title="Connected tax and close workflows"
        description="Keep statutory filing, tax reporting, close runs, and lock controls aligned during settlement review."
      >
        <AccountingWorkflowCards items={workflows} />
      </AccountingSection>
      <AccountingSection
        eyebrow="Current return summaries"
        title="GST reporting snapshot"
        description={`As of ${new Date(workspace.asOfDate).toLocaleDateString("en-IN")}, these summaries show the latest filing-period report outputs that are already available through the canonical report services.`}
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Report</th>
              <th>Period</th>
              <th>Count</th>
              <th>Taxable value</th>
              <th>Tax amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>GSTR-1</td>
              <td>
                {workspace.gstr1Period
                  ? `${workspace.gstr1Period.start} to ${workspace.gstr1Period.end}`
                  : "Unavailable"}
              </td>
              <td>{workspace.gstr1?.total?.count ?? "—"}</td>
              <td>{workspace.gstr1?.total?.taxableValue ?? "—"}</td>
              <td>{workspace.gstr1?.total?.taxAmount ?? "—"}</td>
            </tr>
            <tr>
              <td>GSTR-2B</td>
              <td>
                {workspace.gstr2bPeriod
                  ? `${workspace.gstr2bPeriod.start} to ${workspace.gstr2bPeriod.end}`
                  : "Unavailable"}
              </td>
              <td>{workspace.gstr2b?.count ?? "—"}</td>
              <td>{workspace.gstr2b?.taxableValue ?? "—"}</td>
              <td>{workspace.gstr2b?.taxAmount ?? "—"}</td>
            </tr>
            <tr>
              <td>GST ledger</td>
              <td>
                {workspace.gstLedgerPeriod
                  ? `${workspace.gstLedgerPeriod.start} to ${workspace.gstLedgerPeriod.end}`
                  : "Unavailable"}
              </td>
              <td>{workspace.gstLedgerCount}</td>
              <td>—</td>
              <td>—</td>
            </tr>
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Filing periods"
        title="Recent statutory filing periods"
        description="Review filing status, due dates, and acknowledgement references before period close is treated as complete."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Return</th>
              <th>Legal entity</th>
              <th>Registration</th>
              <th>Period</th>
              <th>Due</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {workspace.filingPeriods.length === 0 ? (
              <AccountingEmptyTableRow colSpan={7}>
                No statutory filing periods are configured yet.
              </AccountingEmptyTableRow>
            ) : (
              workspace.filingPeriods.map((period) => (
                <tr key={period.id}>
                  <td>{period.periodLabel}</td>
                  <td>{period.legalEntity}</td>
                  <td>{period.registration}</td>
                  <td>{period.periodStart} to {period.periodEnd}</td>
                  <td>{period.dueDate ?? "—"}</td>
                  <td>{period.status.replaceAll("_", " ")}</td>
                  <td>
                    {period.status === "OPEN" ? (
                      <form action={markFilingReadyAction} className="mnx-inline-flex items-center gap-2">
                        <input type="hidden" name="filingPeriodId" value={period.id} />
                        <input
                          type="hidden"
                          name="expectedVersion"
                          value={period.rowVersion}
                        />
                        <button className="mnx-button mnx-button-secondary" type="submit">
                          Mark ready
                        </button>
                      </form>
                    ) : null}
                    {period.status === "READY" ? (
                      <form action={markFilingFiledAction} className="mnx-inline-flex items-center gap-2">
                        <input type="hidden" name="filingPeriodId" value={period.id} />
                        <input
                          type="hidden"
                          name="expectedVersion"
                          value={period.rowVersion}
                        />
                        <input
                          className="mnx-input"
                          name="acknowledgementRef"
                          placeholder="Acknowledgement ref"
                          required
                        />
                        <button className="mnx-button mnx-button-primary" type="submit">
                          Mark filed
                        </button>
                      </form>
                    ) : null}
                    {period.status === "READY" ? (
                      <form action={markFilingOpenAction} className="mnx-inline-flex items-center gap-2">
                        <input type="hidden" name="filingPeriodId" value={period.id} />
                        <input
                          type="hidden"
                          name="expectedVersion"
                          value={period.rowVersion}
                        />
                        <button className="mnx-button mnx-button-secondary" type="submit">
                          Reopen review
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Close runs"
        title="Recent period close checkpoints"
        description={`There are ${workspace.metrics.customerProfiles} active customer finance profiles and ${workspace.metrics.vendorProfiles} active vendor finance profiles in the current subledger scope, so close readiness still depends on both AR and AP control coverage.`}
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Legal entity</th>
              <th>Period</th>
              <th>Close date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {workspace.closeRuns.length === 0 ? (
              <AccountingEmptyTableRow colSpan={5}>
                No period close runs are configured yet.
              </AccountingEmptyTableRow>
            ) : (
              workspace.closeRuns.map((run) => (
                <tr key={run.id}>
                  <td>{run.legalEntity}</td>
                  <td>{run.periodLabel}</td>
                  <td>{run.closeDate}</td>
                  <td>{run.status.replaceAll("_", " ")}</td>
                  <td>
                    {run.status === "OPEN" || run.status === "REOPENED" ? (
                      <form action={markCloseRunReadyAction}>
                        <input type="hidden" name="periodCloseRunId" value={run.id} />
                        <input
                          type="hidden"
                          name="expectedVersion"
                          value={run.rowVersion}
                        />
                        <button className="mnx-button mnx-button-secondary" type="submit">
                          Mark ready
                        </button>
                      </form>
                    ) : null}
                    {run.status === "READY" ? (
                      <form action={markCloseRunClosedAction}>
                        <input type="hidden" name="periodCloseRunId" value={run.id} />
                        <input
                          type="hidden"
                          name="expectedVersion"
                          value={run.rowVersion}
                        />
                        <button className="mnx-button mnx-button-primary" type="submit">
                          Close period
                        </button>
                      </form>
                    ) : null}
                    {run.status === "READY" ? (
                      <form action={markCloseRunOpenAction}>
                        <input type="hidden" name="periodCloseRunId" value={run.id} />
                        <input
                          type="hidden"
                          name="expectedVersion"
                          value={run.rowVersion}
                        />
                        <button className="mnx-button mnx-button-secondary" type="submit">
                          Return to open
                        </button>
                      </form>
                    ) : null}
                    {run.status === "CLOSED" ? (
                      <form action={markCloseRunReopenedAction}>
                        <input type="hidden" name="periodCloseRunId" value={run.id} />
                        <input
                          type="hidden"
                          name="expectedVersion"
                          value={run.rowVersion}
                        />
                        <button className="mnx-button mnx-button-secondary" type="submit">
                          Reopen period
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
