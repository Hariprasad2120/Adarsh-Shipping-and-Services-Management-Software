import { BookOpenText, Calculator, RefreshCcw, Settings2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { AccountingActionLink, AccountingAlert, AccountingEmptyTableRow, AccountingMetric, AccountingMetrics, AccountingRoutePageHeader, AccountingSection, AccountingTable, type AccountingWorkflowCardItem, AccountingWorkflowCards } from "@/components/monolith";
import {
  createForeignExchangeRevaluationDraft,
  recordForeignExchangeReviewOnCloseRun,
} from "@/modules/accounting/foreign-exchange";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingConfigurationOverview } from "@/modules/accounting/operational-queries";
import { getAccountingCurrencyControlWorkspace } from "@/modules/accounting/phase9-workspaces";
import { getForeignExchangeReviewWorkspace } from "@/modules/accounting/foreign-exchange";

export default async function CurrencyAdjustmentsPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/currency-adjustments",
  );
  const [configuration, currencyControls, fxWorkspace] = await Promise.all([
    getAccountingConfigurationOverview(orgId),
    getAccountingCurrencyControlWorkspace(orgId),
    getForeignExchangeReviewWorkspace(orgId),
  ]);
  const enabledCurrencies = configuration.currencies.filter(
    (currency) => currency.isEnabled,
  );

  async function recordFxReviewAction(formData: FormData) {
    "use server";
    const access = await requireAccountingRouteAccess(
      "/accounting/currency-adjustments",
      ["accounting.settings.manage", "accounting.exchange_rate.maintain"],
    );
    await recordForeignExchangeReviewOnCloseRun({
      orgId: access.orgId,
      actorId: access.userId,
      periodCloseRunId: String(formData.get("periodCloseRunId") ?? ""),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      asOfDate: String(formData.get("asOfDate") ?? "").trim() || undefined,
    });
    revalidatePath("/accounting/currency-adjustments");
    revalidatePath("/accounting/tax-settlement");
    revalidatePath("/accounting");
  }

  async function createFxDraftAction(formData: FormData) {
    "use server";
    const access = await requireAccountingRouteAccess(
      "/accounting/currency-adjustments",
      ["accounting.journal.prepare", "accounting.settings.manage"],
    );
    const result = await createForeignExchangeRevaluationDraft({
      orgId: access.orgId,
      actorId: access.userId,
      periodCloseRunId: String(formData.get("periodCloseRunId") ?? ""),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
    });
    revalidatePath("/accounting/currency-adjustments");
    revalidatePath("/accounting/tax-settlement");
    revalidatePath("/accounting");
    revalidatePath(`/accounting/journal-entries/${result.draft.id}`);
    revalidatePath("/accounting/journal-entries");
  }

  const workflows = [
    {
      href: "/accounting/configuration",
      title: "Accounting Configuration",
      description:
        "Review functional currency, fiscal, and control policy settings.",
      icon: Settings2,
    },
    caps["accounting.settings.manage"] || caps["accounting.exchange_rate.maintain"]
      ? {
          href: "/accounting/configuration/admin",
          title: "FX Evidence Admin",
          description:
            "Maintain versioned exchange-rate evidence and approve it independently.",
          icon: Calculator,
        }
      : null,
    caps["accounting.journal.read"] || caps["accounting.ledger.read"]
      ? {
          href: "/accounting/journal-entries",
          title: "Manual Journals",
          description:
            "Use controlled journal drafts when an approved adjustment needs ledger impact.",
          icon: BookOpenText,
        }
      : null,
    {
      href: "/accounting/bulk-update",
      title: "Bulk Update",
      description:
        "Return to the accountant maintenance hub for adjacent controlled updates.",
      icon: RefreshCcw,
    },
  ].filter((value): value is AccountingWorkflowCardItem => value !== null);

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.settings.manage"] || caps["accounting.exchange_rate.maintain"] ? (
            <AccountingActionLink href="/accounting/configuration/admin">
              Manage FX evidence
            </AccountingActionLink>
          ) : undefined
        }
      />
      <AccountingMetrics>
        <AccountingMetric
          label="Functional currency"
          value={configuration.profile?.functionalCurrencyCode ?? "Not set"}
          detail="Organisation reporting currency"
        />
        <AccountingMetric
          label="Enabled currencies"
          value={enabledCurrencies.length}
          detail="Currency definitions currently available"
        />
        <AccountingMetric
          label="FX evidence rows"
          value={configuration.exchangeRates.length}
          detail="Recent approved or pending exchange-rate records"
        />
        <AccountingMetric
          label="Foreign-currency subledgers"
          value={
            currencyControls.customerForeign.length +
            currencyControls.vendorForeign.length
          }
          detail="Customer and vendor finance profiles outside the functional currency"
        />
        <AccountingMetric
          label="Unrealized FX exposures"
          value={fxWorkspace.summary.unrealizedExposureCount}
          detail="Open foreign-currency documents requiring close-date review"
        />
        <AccountingMetric
          label="Realized FX variances"
          value={fxWorkspace.summary.realizedVarianceCount}
          detail="Settlements where document and payment rates differ"
        />
      </AccountingMetrics>
      <AccountingAlert>
        Foreign-currency adjustments remain controlled by approved FX evidence.
        This workspace now surfaces live realized and unrealized FX review data,
        and can stage a draft FX revaluation journal for normal maker-checker
        review instead of auto-posting close adjustments.
      </AccountingAlert>
      <AccountingSection
        eyebrow="Accountant"
        title="Connected currency workflows"
        description="Move between the configuration, FX evidence, and journal workspaces that support controlled currency adjustments."
      >
        <AccountingWorkflowCards items={workflows} />
      </AccountingSection>
      <AccountingSection
        eyebrow="FX evidence"
        title="Recent exchange-rate records"
        description="These rates come from the current Accounting configuration overview."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Rate</th>
              <th>Rate date</th>
              <th>Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {configuration.exchangeRates.length === 0 ? (
              <AccountingEmptyTableRow colSpan={5}>
                No exchange-rate evidence has been configured yet.
              </AccountingEmptyTableRow>
            ) : (
              configuration.exchangeRates.map((rate) => (
                <tr key={rate.id}>
                  <td>{rate.pair}</td>
                  <td>{rate.rate}</td>
                  <td>{new Date(rate.rateDate).toLocaleDateString("en-IN")}</td>
                  <td>{rate.source}</td>
                  <td>{rate.status.replaceAll("_", " ")}</td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Subledger currency control"
        title="Foreign-currency customer and vendor profiles"
        description={`Functional currency is ${currencyControls.functionalCurrencyCode}. These active subledger profiles still require approved FX evidence and controlled settlement handling.`}
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Party type</th>
              <th>Party</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...currencyControls.customerForeign.map((profile) => ({
                id: profile.id,
                partyType: "Customer",
                partyName: profile.crmAccount.name,
                currencyCode: profile.currencyCode,
              })),
              ...currencyControls.vendorForeign.map((profile) => ({
                id: profile.id,
                partyType: "Vendor",
                partyName: profile.crmVendor.name,
                currencyCode: profile.currencyCode,
              })),
            ].length === 0 ? (
              <AccountingEmptyTableRow colSpan={3}>
                No active customer or vendor finance profiles currently use a foreign currency.
              </AccountingEmptyTableRow>
            ) : (
              [
                ...currencyControls.customerForeign.map((profile) => ({
                  id: profile.id,
                  partyType: "Customer",
                  partyName: profile.crmAccount.name,
                  currencyCode: profile.currencyCode,
                })),
                ...currencyControls.vendorForeign.map((profile) => ({
                  id: profile.id,
                  partyType: "Vendor",
                  partyName: profile.crmVendor.name,
                  currencyCode: profile.currencyCode,
                })),
              ].map((row) => (
                <tr key={row.id}>
                  <td>{row.partyType}</td>
                  <td>{row.partyName}</td>
                  <td>{row.currencyCode}</td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Unrealized FX"
        title="Open foreign-currency revaluation review"
        description={`As of ${fxWorkspace.asOfDate}, these posted documents still carry a foreign-currency balance that should be revalued against the latest approved rate before close.`}
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Document</th>
              <th>Legal entity</th>
              <th>Currency</th>
              <th>Outstanding</th>
              <th>Booked base</th>
              <th>Current base</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {fxWorkspace.unrealizedRows.length === 0 ? (
              <AccountingEmptyTableRow colSpan={7}>
                No open foreign-currency document exposures require revaluation review.
              </AccountingEmptyTableRow>
            ) : (
              fxWorkspace.unrealizedRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.documentType}</td>
                  <td>{row.legalEntity}</td>
                  <td>
                    {row.transactionCurrencyCode}/{row.baseCurrencyCode}
                  </td>
                  <td>{row.outstandingAmount}</td>
                  <td>{row.bookedBaseAmount}</td>
                  <td>{row.currentBaseAmount}</td>
                  <td>
                    {row.varianceAmount} {row.varianceDirection}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Realized FX"
        title="Settlement variance review"
        description="These allocations settled a foreign-currency document using a payment posted at a different approved rate, creating a realized FX variance that should be reviewed before close."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Payment</th>
              <th>Document</th>
              <th>Currency</th>
              <th>Allocation</th>
              <th>Document rate</th>
              <th>Settlement rate</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {fxWorkspace.realizedRows.length === 0 ? (
              <AccountingEmptyTableRow colSpan={7}>
                No realized FX settlement variances are currently detected.
              </AccountingEmptyTableRow>
            ) : (
              fxWorkspace.realizedRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.paymentType}</td>
                  <td>{row.documentType}</td>
                  <td>{row.transactionCurrencyCode}</td>
                  <td>{row.allocationAmount}</td>
                  <td>{row.documentRate}</td>
                  <td>{row.settlementRate}</td>
                  <td>
                    {row.varianceAmount} {row.varianceDirection}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Close readiness"
        title="Recent period close runs"
        description="These close runs form the settlement boundary before any final FX or statutory adjustments are considered complete. Record an FX review snapshot here before period close if foreign-currency exposure exists."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Legal entity</th>
              <th>Period</th>
              <th>Close date</th>
              <th>Status</th>
              <th>FX review</th>
            </tr>
          </thead>
          <tbody>
            {fxWorkspace.closeRuns.length === 0 ? (
              <AccountingEmptyTableRow colSpan={5}>
                No period close runs are configured yet.
              </AccountingEmptyTableRow>
            ) : (
              fxWorkspace.closeRuns.map((run) => (
                <tr key={run.id}>
                  <td>{run.legalEntity}</td>
                  <td>{run.periodLabel}</td>
                  <td>{new Date(run.closeDate).toLocaleDateString("en-IN")}</td>
                  <td>{run.status.replaceAll("_", " ")}</td>
                  <td>
                    {["OPEN", "READY", "REOPENED"].includes(run.status) ? (
                      <div className="mnx-inline-flex items-center gap-2">
                        <form action={recordFxReviewAction} className="mnx-inline-flex items-center gap-2">
                          <input type="hidden" name="periodCloseRunId" value={run.id} />
                          <input type="hidden" name="expectedVersion" value={run.rowVersion} />
                          <input type="hidden" name="asOfDate" value={run.closeDate} />
                          <button className="mnx-button mnx-button-secondary" type="submit">
                            {run.hasFxReview ? "Refresh FX review" : "Record FX review"}
                          </button>
                        </form>
                        {run.fxReviewJournalDraftId ? (
                          <AccountingActionLink
                            href={`/accounting/journal-entries/${run.fxReviewJournalDraftId}`}
                          >
                            FX draft {run.fxReviewJournalDraftStatus ?? "DRAFT"}
                          </AccountingActionLink>
                        ) : run.hasFxReview &&
                          (fxWorkspace.summary.unrealizedExposureCount > 0 ||
                            fxWorkspace.summary.realizedVarianceCount > 0) &&
                          (caps["accounting.journal.prepare"] ||
                            caps["accounting.settings.manage"]) ? (
                          <form action={createFxDraftAction} className="mnx-inline-flex items-center gap-2">
                            <input type="hidden" name="periodCloseRunId" value={run.id} />
                            <input type="hidden" name="expectedVersion" value={run.rowVersion} />
                            <button className="mnx-button mnx-button-secondary" type="submit">
                              Create FX draft
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : (
                      "Closed"
                    )}
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
