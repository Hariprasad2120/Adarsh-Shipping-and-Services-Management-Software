/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AccountingAction,
  AccountingActionLink,
  AccountingAlert,
  AccountingField,
  AccountingInput,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
  AccountingTextarea,
} from "@/components/monolith/accounting-workspace";
import {
  approveAccountingExchangeRateAction,
  approveAccountingPeriodLockAction,
  rejectAccountingExchangeRateAction,
  rejectAccountingPeriodLockAction,
  requestAccountingPeriodLockAction,
  saveAccountingAccountControlAction,
  saveAccountingApprovalPolicyAction,
  saveAccountingAssetBookAction,
  saveAccountingAppropriationAction,
  saveAccountingBankAccountAction,
  saveAccountingBankMatchAction,
  saveAccountingBankStatementImportAction,
  saveAccountingBudgetAction,
  saveAccountingBudgetLineAction,
  saveAccountingCustomerProfileAction,
  saveAccountingCounterpartyEntityScopeAction,
  saveAccountingCurrencyAction,
  saveAccountingDepreciationRunAction,
  saveAccountingDimensionDefinitionAction,
  saveAccountingDimensionValueAction,
  saveAccountingDocumentPolicyAction,
  saveAccountingExchangeRateDraftAction,
  saveAccountingFinancialAssetAction,
  saveAccountingFiscalYearAction,
  saveAccountingLegalEntityAction,
  saveAccountingNumberSeriesAction,
  saveAccountingOrganisationProfileAction,
  saveAccountingPartnerAction,
  saveAccountingPartnerTermAction,
  saveAccountingPaymentMethodAction,
  saveAccountingPaymentTermAction,
  saveAccountingPeriodAction,
  saveAccountingPeriodCloseRunAction,
  saveAccountingPortalPublicationProfileAction,
  saveAccountingPriceListAction,
  saveAccountingRecurringRunAction,
  saveAccountingRecurringScheduleAction,
  saveAccountingRecurringTemplateAction,
  saveAccountingReportExportProfileAction,
  saveAccountingReconciliationSessionAction,
  saveAccountingReportingTagAction,
  saveAccountingSourceMappingProfileAction,
  saveAccountingTaxProfileAction,
  saveAccountingTaxRuleAction,
  saveAccountingStatutoryFilingPeriodAction,
  saveAccountingStatutoryReturnProfileAction,
  saveAccountingTaxRegistrationAction,
  saveAccountingUnitOfMeasureAction,
  saveAccountingVendorProfileAction,
} from "@/modules/accounting/configuration-admin-actions";
import { getAccountingConfigurationAdminSnapshot } from "@/modules/accounting/configuration-admin";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AccountingConfigurationAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    editEntity?: string;
    editRegistration?: string;
    editCurrency?: string;
    editRate?: string;
    editFiscalYear?: string;
    editPeriod?: string;
    editDefinition?: string;
    editDimensionValue?: string;
    editSeries?: string;
    editApprovalPolicy?: string;
    editAccountControl?: string;
    editCounterpartyScope?: string;
    editDocumentPolicy?: string;
    editTaxProfile?: string;
    editTaxRule?: string;
    editStatutoryReturnProfile?: string;
    editStatutoryFilingPeriod?: string;
    editBankAccount?: string;
    editBankStatementImport?: string;
    editReconciliationSession?: string;
    editBankMatch?: string;
    editRecurringTemplate?: string;
    editRecurringSchedule?: string;
    editRecurringRun?: string;
    editFinancialAsset?: string;
    editAssetBook?: string;
    editDepreciationRun?: string;
    editPartner?: string;
    editPartnerTerm?: string;
    editAppropriation?: string;
    editBudget?: string;
    editBudgetLine?: string;
    editCustomerProfile?: string;
    editVendorProfile?: string;
    editPaymentTerm?: string;
    editPaymentMethod?: string;
    editPriceList?: string;
    editUnitOfMeasure?: string;
    editReportingTag?: string;
    editSourceMappingProfile?: string;
    editPeriodCloseRun?: string;
    editReportExportProfile?: string;
    editPortalPublicationProfile?: string;
  }>;
}) {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/configuration/admin",
  );
  const params = await searchParams;
  const snapshot = await getAccountingConfigurationAdminSnapshot(orgId);

  const editingEntity =
    snapshot.legalEntities.find((entity: any) => entity.id === params.editEntity) ??
    null;
  const allRegistrations = snapshot.legalEntities.flatMap((entity: any) =>
    entity.registrations.map((registration: any) => ({
      ...registration,
      legalEntityId: entity.id,
      legalEntityCode: entity.code,
    })),
  );
  const editingRegistration =
    allRegistrations.find(
      (registration: any) => registration.id === params.editRegistration,
    ) ?? null;
  const editingCurrency =
    snapshot.currencies.find((currency: any) => currency.id === params.editCurrency) ??
    null;
  const editingRate =
    snapshot.exchangeRates.find((rate: any) => rate.id === params.editRate) ?? null;
  const editingFiscalYear =
    snapshot.fiscalYears.find((year: any) => year.id === params.editFiscalYear) ??
    null;
  const editingPeriod =
    snapshot.periods.find((period: any) => period.id === params.editPeriod) ??
    null;
  const editingDefinition =
    snapshot.dimensionDefinitions.find(
      (definition: any) => definition.id === params.editDefinition,
    ) ?? null;
  const allDimensionValues = snapshot.dimensionDefinitions.flatMap(
    (definition: any) =>
      definition.values.map((value: any) => ({
        ...value,
        definitionCode: definition.code,
        definitionName: definition.name,
      })),
  );
  const editingDimensionValue =
    allDimensionValues.find(
      (value: any) => value.id === params.editDimensionValue,
    ) ?? null;
  const editingSeries =
    snapshot.numberSeries.find((series: any) => series.id === params.editSeries) ??
    null;
  const editingApprovalPolicy =
    snapshot.approvalPolicies.find(
      (policy: any) => policy.id === params.editApprovalPolicy,
    ) ?? null;
  const editingAccountControl =
    snapshot.accountControls.find(
      (control: any) => control.id === params.editAccountControl,
    ) ?? null;
  const editingCounterpartyScope =
    snapshot.counterpartyScopes.find(
      (scope: any) => scope.id === params.editCounterpartyScope,
    ) ?? null;
  const editingDocumentPolicy =
    snapshot.documentPolicies.find(
      (policy: any) => policy.id === params.editDocumentPolicy,
    ) ?? null;
  const editingTaxProfile =
    snapshot.taxProfiles.find(
      (profile: any) => profile.id === params.editTaxProfile,
    ) ?? null;
  const editingTaxRule =
    snapshot.taxRules.find((rule: any) => rule.id === params.editTaxRule) ?? null;
  const editingStatutoryReturnProfile =
    snapshot.statutoryReturnProfiles.find(
      (profile: any) => profile.id === params.editStatutoryReturnProfile,
    ) ?? null;
  const editingStatutoryFilingPeriod =
    snapshot.statutoryFilingPeriods.find(
      (period: any) => period.id === params.editStatutoryFilingPeriod,
    ) ?? null;
  const editingBankAccount =
    snapshot.bankAccounts.find(
      (account: any) => account.id === params.editBankAccount,
    ) ?? null;
  const editingBankStatementImport =
    snapshot.bankStatementImports.find(
      (entry: any) => entry.id === params.editBankStatementImport,
    ) ?? null;
  const editingReconciliationSession =
    snapshot.reconciliationSessions.find(
      (session: any) => session.id === params.editReconciliationSession,
    ) ?? null;
  const editingBankMatch =
    snapshot.bankMatches.find((match: any) => match.id === params.editBankMatch) ??
    null;
  const editingRecurringTemplate =
    snapshot.recurringTemplates.find(
      (template: any) => template.id === params.editRecurringTemplate,
    ) ?? null;
  const editingRecurringSchedule =
    snapshot.recurringSchedules.find(
      (schedule: any) => schedule.id === params.editRecurringSchedule,
    ) ?? null;
  const editingRecurringRun =
    snapshot.recurringRuns.find((run: any) => run.id === params.editRecurringRun) ??
    null;
  const editingFinancialAsset =
    snapshot.financialAssets.find(
      (asset: any) => asset.id === params.editFinancialAsset,
    ) ?? null;
  const editingAssetBook =
    snapshot.assetBooks.find((book: any) => book.id === params.editAssetBook) ?? null;
  const editingDepreciationRun =
    snapshot.depreciationRuns.find(
      (run: any) => run.id === params.editDepreciationRun,
    ) ?? null;
  const editingPartner =
    snapshot.partners.find((partner: any) => partner.id === params.editPartner) ??
    null;
  const editingPartnerTerm =
    snapshot.partnerTerms.find((term: any) => term.id === params.editPartnerTerm) ??
    null;
  const editingAppropriation =
    snapshot.appropriations.find(
      (entry: any) => entry.id === params.editAppropriation,
    ) ?? null;
  const editingBudget =
    snapshot.budgets.find((budget: any) => budget.id === params.editBudget) ?? null;
  const editingBudgetLine =
    snapshot.budgetLines.find((line: any) => line.id === params.editBudgetLine) ??
    null;
  const editingCustomerProfile =
    snapshot.customerProfiles.find(
      (profile: any) => profile.id === params.editCustomerProfile,
    ) ?? null;
  const editingVendorProfile =
    snapshot.vendorProfiles.find(
      (profile: any) => profile.id === params.editVendorProfile,
    ) ?? null;
  const editingPaymentTerm =
    snapshot.paymentTerms.find((term: any) => term.id === params.editPaymentTerm) ??
    null;
  const editingPaymentMethod =
    snapshot.paymentMethods.find(
      (method: any) => method.id === params.editPaymentMethod,
    ) ?? null;
  const editingPriceList =
    snapshot.priceLists.find((priceList: any) => priceList.id === params.editPriceList) ??
    null;
  const editingUnitOfMeasure =
    snapshot.unitsOfMeasure.find(
      (unit: any) => unit.id === params.editUnitOfMeasure,
    ) ?? null;
  const editingReportingTag =
    snapshot.reportingTags.find(
      (tag: any) => tag.id === params.editReportingTag,
    ) ?? null;
  const editingSourceMappingProfile =
    snapshot.sourceMappingProfiles.find(
      (profile: any) => profile.id === params.editSourceMappingProfile,
    ) ?? null;
  const editingPeriodCloseRun =
    snapshot.periodCloseRuns.find(
      (run: any) => run.id === params.editPeriodCloseRun,
    ) ?? null;
  const editingReportExportProfile =
    snapshot.reportExportProfiles.find(
      (profile: any) => profile.id === params.editReportExportProfile,
    ) ?? null;
  const editingPortalPublicationProfile =
    snapshot.portalPublicationProfiles.find(
      (profile: any) => profile.id === params.editPortalPublicationProfile,
    ) ?? null;
  const registrationOptions = snapshot.legalEntities.flatMap((entity: any) =>
    entity.registrations.map((registration: any) => ({
      id: registration.id,
      label: `${entity.code} · ${registration.registrationType} · ${registration.registrationCode}`,
    })),
  );

  async function saveProfile(formData: FormData) {
    "use server";
    await saveAccountingOrganisationProfileAction(formData);
  }

  async function saveEntity(formData: FormData) {
    "use server";
    await saveAccountingLegalEntityAction(formData);
  }

  async function saveRegistration(formData: FormData) {
    "use server";
    await saveAccountingTaxRegistrationAction(formData);
  }

  async function saveCurrency(formData: FormData) {
    "use server";
    await saveAccountingCurrencyAction(formData);
  }

  async function saveTaxProfile(formData: FormData) {
    "use server";
    await saveAccountingTaxProfileAction(formData);
  }

  async function saveTaxRule(formData: FormData) {
    "use server";
    await saveAccountingTaxRuleAction(formData);
  }

  async function saveStatutoryReturnProfile(formData: FormData) {
    "use server";
    await saveAccountingStatutoryReturnProfileAction(formData);
  }

  async function saveStatutoryFilingPeriod(formData: FormData) {
    "use server";
    await saveAccountingStatutoryFilingPeriodAction(formData);
  }

  async function saveDimensionDefinition(formData: FormData) {
    "use server";
    await saveAccountingDimensionDefinitionAction(formData);
  }

  async function saveDimensionValue(formData: FormData) {
    "use server";
    await saveAccountingDimensionValueAction(formData);
  }

  async function saveNumberSeries(formData: FormData) {
    "use server";
    await saveAccountingNumberSeriesAction(formData);
  }

  async function saveApprovalPolicy(formData: FormData) {
    "use server";
    await saveAccountingApprovalPolicyAction(formData);
  }

  async function saveAccountControl(formData: FormData) {
    "use server";
    await saveAccountingAccountControlAction(formData);
  }

  async function saveBankAccount(formData: FormData) {
    "use server";
    await saveAccountingBankAccountAction(formData);
  }

  async function saveBankStatementImport(formData: FormData) {
    "use server";
    await saveAccountingBankStatementImportAction(formData);
  }

  async function saveReconciliationSession(formData: FormData) {
    "use server";
    await saveAccountingReconciliationSessionAction(formData);
  }

  async function saveBankMatch(formData: FormData) {
    "use server";
    await saveAccountingBankMatchAction(formData);
  }

  async function saveRecurringTemplate(formData: FormData) {
    "use server";
    await saveAccountingRecurringTemplateAction(formData);
  }

  async function saveRecurringSchedule(formData: FormData) {
    "use server";
    await saveAccountingRecurringScheduleAction(formData);
  }

  async function saveRecurringRun(formData: FormData) {
    "use server";
    await saveAccountingRecurringRunAction(formData);
  }

  async function saveFinancialAsset(formData: FormData) {
    "use server";
    await saveAccountingFinancialAssetAction(formData);
  }

  async function saveAssetBook(formData: FormData) {
    "use server";
    await saveAccountingAssetBookAction(formData);
  }

  async function saveDepreciationRun(formData: FormData) {
    "use server";
    await saveAccountingDepreciationRunAction(formData);
  }

  async function savePartner(formData: FormData) {
    "use server";
    await saveAccountingPartnerAction(formData);
  }

  async function savePartnerTerm(formData: FormData) {
    "use server";
    await saveAccountingPartnerTermAction(formData);
  }

  async function saveAppropriation(formData: FormData) {
    "use server";
    await saveAccountingAppropriationAction(formData);
  }

  async function saveBudget(formData: FormData) {
    "use server";
    await saveAccountingBudgetAction(formData);
  }

  async function saveBudgetLine(formData: FormData) {
    "use server";
    await saveAccountingBudgetLineAction(formData);
  }

  async function saveCustomerProfile(formData: FormData) {
    "use server";
    await saveAccountingCustomerProfileAction(formData);
  }

  async function saveVendorProfile(formData: FormData) {
    "use server";
    await saveAccountingVendorProfileAction(formData);
  }

  async function savePaymentTerm(formData: FormData) {
    "use server";
    await saveAccountingPaymentTermAction(formData);
  }

  async function savePaymentMethod(formData: FormData) {
    "use server";
    await saveAccountingPaymentMethodAction(formData);
  }

  async function savePriceList(formData: FormData) {
    "use server";
    await saveAccountingPriceListAction(formData);
  }

  async function saveUnitOfMeasure(formData: FormData) {
    "use server";
    await saveAccountingUnitOfMeasureAction(formData);
  }

  async function saveReportingTag(formData: FormData) {
    "use server";
    await saveAccountingReportingTagAction(formData);
  }

  async function saveSourceMappingProfile(formData: FormData) {
    "use server";
    await saveAccountingSourceMappingProfileAction(formData);
  }

  async function savePeriodCloseRun(formData: FormData) {
    "use server";
    await saveAccountingPeriodCloseRunAction(formData);
  }

  async function saveReportExportProfile(formData: FormData) {
    "use server";
    await saveAccountingReportExportProfileAction(formData);
  }

  async function savePortalPublicationProfile(formData: FormData) {
    "use server";
    await saveAccountingPortalPublicationProfileAction(formData);
  }

  async function saveCounterpartyScope(formData: FormData) {
    "use server";
    await saveAccountingCounterpartyEntityScopeAction(formData);
  }

  async function saveDocumentPolicy(formData: FormData) {
    "use server";
    await saveAccountingDocumentPolicyAction(formData);
  }

  async function saveExchangeRate(formData: FormData) {
    "use server";
    await saveAccountingExchangeRateDraftAction(formData);
  }

  async function saveFiscalYear(formData: FormData) {
    "use server";
    await saveAccountingFiscalYearAction(formData);
  }

  async function savePeriod(formData: FormData) {
    "use server";
    await saveAccountingPeriodAction(formData);
  }

  async function requestPeriodLock(formData: FormData) {
    "use server";
    await requestAccountingPeriodLockAction(formData);
  }

  async function approveRate() {
    "use server";
    if (!editingRate) return;
    await approveAccountingExchangeRateAction(
      editingRate.id,
      editingRate.rowVersion,
    );
  }

  async function rejectRate(formData: FormData) {
    "use server";
    if (!editingRate) return;
    await rejectAccountingExchangeRateAction(
      editingRate.id,
      editingRate.rowVersion,
      String(formData.get("reason") ?? ""),
    );
  }

  async function approvePeriodLock(requestId: string, expectedVersion: number) {
    "use server";
    await approveAccountingPeriodLockAction(requestId, expectedVersion);
  }

  async function rejectPeriodLock(
    requestId: string,
    expectedVersion: number,
    formData: FormData,
  ) {
    "use server";
    await rejectAccountingPeriodLockAction(
      requestId,
      expectedVersion,
      String(formData.get("reason") ?? ""),
    );
  }

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <>
            <AccountingActionLink href="/accounting/configuration">
              Back to configuration
            </AccountingActionLink>
            <AccountingActionLink href="/accounting/capabilities">
              Capability policies
            </AccountingActionLink>
          </>
        }
      />

      <AccountingAlert>
        This admin hub is the Slice 9.2 control plane batch for organisation
        profile, legal entities, GST registrations, currencies, approved FX
        evidence, accounting dimensions, period workflows, configuration audit
        history, Slice 9.3 tax/statutory controls, and the contained Slice 9.4
        banking import and reconciliation workflows, extended through Slice 9.8
        budget headers and management-control budget lines.
      </AccountingAlert>

      <AccountingSection
        eyebrow="Organisation profile"
        title="Functional accounting profile"
        description="Update fiscal-year anchors, precision, inventory mode, and optional correction-policy JSON with optimistic concurrency and audit reason capture."
      >
        <form action={saveProfile} className="mnx-accounting-form">
          <input
            type="hidden"
            name="expectedVersion"
            value={snapshot.profile?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField
              label="Functional currency"
              htmlFor="functionalCurrencyCode"
            >
              <AccountingSelect
                id="functionalCurrencyCode"
                name="functionalCurrencyCode"
                defaultValue={
                  snapshot.profile?.functionalCurrencyCode ??
                  snapshot.currencies.find((currency: any) => currency.isFunctional)
                    ?.code ??
                  "INR"
                }
              >
                {snapshot.currencies.map((currency: any) => (
                  <option key={currency.id} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Fiscal year start month"
              htmlFor="fiscalYearStartMonth"
            >
              <AccountingInput
                id="fiscalYearStartMonth"
                name="fiscalYearStartMonth"
                type="number"
                min="1"
                max="12"
                defaultValue={snapshot.profile?.fiscalYearStartMonth ?? 4}
              />
            </AccountingField>
            <AccountingField
              label="Fiscal year start day"
              htmlFor="fiscalYearStartDay"
            >
              <AccountingInput
                id="fiscalYearStartDay"
                name="fiscalYearStartDay"
                type="number"
                min="1"
                max="31"
                defaultValue={snapshot.profile?.fiscalYearStartDay ?? 1}
              />
            </AccountingField>
            <AccountingField label="Inventory mode" htmlFor="inventoryMode">
              <AccountingSelect
                id="inventoryMode"
                name="inventoryMode"
                defaultValue={snapshot.profile?.inventoryMode ?? "SERVICE_ONLY"}
              >
                {snapshot.inventoryModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Money scale" htmlFor="moneyScale">
              <AccountingInput
                id="moneyScale"
                name="moneyScale"
                type="number"
                min="0"
                max="12"
                defaultValue={snapshot.profile?.moneyScale ?? 2}
              />
            </AccountingField>
            <AccountingField label="Quantity scale" htmlFor="quantityScale">
              <AccountingInput
                id="quantityScale"
                name="quantityScale"
                type="number"
                min="0"
                max="12"
                defaultValue={snapshot.profile?.quantityScale ?? 3}
              />
            </AccountingField>
            <AccountingField
              label="Exchange-rate scale"
              htmlFor="exchangeRateScale"
            >
              <AccountingInput
                id="exchangeRateScale"
                name="exchangeRateScale"
                type="number"
                min="0"
                max="12"
                defaultValue={snapshot.profile?.exchangeRateScale ?? 6}
              />
            </AccountingField>
            <AccountingField
              label="Percentage scale"
              htmlFor="percentageScale"
            >
              <AccountingInput
                id="percentageScale"
                name="percentageScale"
                type="number"
                min="0"
                max="12"
                defaultValue={snapshot.profile?.percentageScale ?? 2}
              />
            </AccountingField>
          </div>
          <AccountingField
            label="Correction policy JSON"
            htmlFor="correctionPolicyJson"
          >
            <AccountingTextarea
              id="correctionPolicyJson"
              name="correctionPolicyJson"
              rows={8}
              defaultValue={snapshot.profile?.correctionPolicyJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="profile-reason">
            <AccountingTextarea id="profile-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              Save organisation profile
            </AccountingAction>
          </div>
        </form>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingFiscalYear ? "Edit fiscal year" : "New fiscal year"}
        title="Fiscal years"
        description="Maintain explicit Accounting financial-year boundaries and closure status with optimistic concurrency."
      >
        <form action={saveFiscalYear} className="mnx-accounting-form">
          <input
            type="hidden"
            name="fiscalYearId"
            value={editingFiscalYear?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingFiscalYear?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Name" htmlFor="fiscal-year-name">
              <AccountingInput
                id="fiscal-year-name"
                name="name"
                defaultValue={editingFiscalYear?.name ?? ""}
              />
            </AccountingField>
            <AccountingField label="Start date" htmlFor="fiscal-year-start">
              <AccountingInput
                id="fiscal-year-start"
                name="startDate"
                type="date"
                defaultValue={editingFiscalYear?.startDate ?? ""}
              />
            </AccountingField>
            <AccountingField label="End date" htmlFor="fiscal-year-end">
              <AccountingInput
                id="fiscal-year-end"
                name="endDate"
                type="date"
                defaultValue={editingFiscalYear?.endDate ?? ""}
              />
            </AccountingField>
            <AccountingField label="Closed" htmlFor="fiscal-year-closed">
              <AccountingSelect
                id="fiscal-year-closed"
                name="closed"
                defaultValue={editingFiscalYear?.closed ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="fiscal-year-reason">
            <AccountingTextarea id="fiscal-year-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingFiscalYear ? "Update fiscal year" : "Create fiscal year"}
            </AccountingAction>
            {editingFiscalYear ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear fiscal-year editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.fiscalYears.length === 0 ? (
              <tr>
                <td colSpan={5}>No fiscal years are configured yet.</td>
              </tr>
            ) : (
              snapshot.fiscalYears.map((year: any) => (
                <tr key={year.id}>
                  <td>{year.name}</td>
                  <td>{year.startDate}</td>
                  <td>{year.endDate}</td>
                  <td>
                    <AccountingStatus status={year.closed ? "CLOSED" : "OPEN"} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editFiscalYear=${year.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingPeriod ? "Edit period" : "New period"}
        title="Accounting periods"
        description="Manage explicit period boundaries and operational lock status."
      >
        <form action={savePeriod} className="mnx-accounting-form">
          <input type="hidden" name="periodId" value={editingPeriod?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingPeriod?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Fiscal year" htmlFor="period-fiscal-year">
              <AccountingSelect
                id="period-fiscal-year"
                name="fiscalYearId"
                defaultValue={
                  editingPeriod?.fiscalYearId ?? snapshot.fiscalYears[0]?.id ?? ""
                }
              >
                {snapshot.fiscalYears.map((year: any) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Period number" htmlFor="period-number">
              <AccountingInput
                id="period-number"
                name="periodNumber"
                type="number"
                min="1"
                max="24"
                defaultValue={editingPeriod?.periodNumber ?? 1}
              />
            </AccountingField>
            <AccountingField label="Name" htmlFor="period-name">
              <AccountingInput
                id="period-name"
                name="name"
                defaultValue={editingPeriod?.name ?? ""}
              />
            </AccountingField>
            <AccountingField label="Start date" htmlFor="period-start">
              <AccountingInput
                id="period-start"
                name="startDate"
                type="date"
                defaultValue={editingPeriod?.startDate ?? ""}
              />
            </AccountingField>
            <AccountingField label="End date" htmlFor="period-end">
              <AccountingInput
                id="period-end"
                name="endDate"
                type="date"
                defaultValue={editingPeriod?.endDate ?? ""}
              />
            </AccountingField>
            <AccountingField label="Status" htmlFor="period-status">
              <AccountingSelect
                id="period-status"
                name="status"
                defaultValue={editingPeriod?.status ?? "OPEN"}
              >
                <option value="OPEN">Open</option>
                <option value="SOFT_LOCKED">Soft locked</option>
                <option value="HARD_LOCKED">Hard locked</option>
                <option value="CLOSED">Closed</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="period-reason">
            <AccountingTextarea id="period-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingPeriod ? "Update period" : "Create period"}
            </AccountingAction>
            {editingPeriod ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear period editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Fiscal year</th>
              <th>Period</th>
              <th>Window</th>
              <th>Status</th>
              <th>Hard lock</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.periods.length === 0 ? (
              <tr>
                <td colSpan={6}>No accounting periods are configured yet.</td>
              </tr>
            ) : (
              snapshot.periods.map((period: any) => (
                <tr key={period.id}>
                  <td>{period.fiscalYearName}</td>
                  <td>
                    {period.periodNumber}
                    <small>{period.name}</small>
                  </td>
                  <td>
                    {period.startDate}
                    <small>{period.endDate}</small>
                  </td>
                  <td>
                    <AccountingStatus status={period.status} />
                  </td>
                  <td>{period.hardLockedAt ? formatDateTime(period.hardLockedAt) : "—"}</td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editPeriod=${period.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Period lock workflow"
        title="Request and decide period locks"
        description="Requests stay maker-checker controlled. Approval updates the period state with audited lineage."
      >
        <form action={requestPeriodLock} className="mnx-accounting-form">
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Period" htmlFor="lock-periodId">
              <AccountingSelect id="lock-periodId" name="periodId" defaultValue={snapshot.periods[0]?.id ?? ""}>
                {snapshot.periods.map((period: any) => (
                  <option key={period.id} value={period.id}>
                    {period.fiscalYearName} · P{period.periodNumber} — {period.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Reopen from" htmlFor="lock-reopenFrom">
              <AccountingInput id="lock-reopenFrom" name="reopenFrom" type="date" />
            </AccountingField>
            <AccountingField label="Reopen until" htmlFor="lock-reopenUntil">
              <AccountingInput id="lock-reopenUntil" name="reopenUntil" type="date" />
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="lock-reason">
            <AccountingTextarea id="lock-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              Submit lock / reopen request
            </AccountingAction>
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Period</th>
              <th>Requested by</th>
              <th>Window</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Decision</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.periodLockRequests.length === 0 ? (
              <tr>
                <td colSpan={7}>No period-lock requests are recorded yet.</td>
              </tr>
            ) : (
              snapshot.periodLockRequests.map((request: any) => (
                <tr key={request.id}>
                  <td>{request.periodLabel}</td>
                  <td>
                    {request.requestedBy}
                    <small>{formatDateTime(request.requestedAt)}</small>
                  </td>
                  <td>
                    {request.reopenFrom ?? "Lock request"}
                    <small>{request.reopenUntil ?? "No reopen window"}</small>
                  </td>
                  <td>{request.reason}</td>
                  <td>
                    <AccountingStatus status={request.status} />
                  </td>
                  <td>
                    {request.decidedBy ? `${request.decidedBy} · ${request.decidedAt ? formatDateTime(request.decidedAt) : "—"}` : "Pending"}
                  </td>
                  <td>
                    {request.status === "PENDING" ? (
                      <div className="mnx-accounting-form-actions">
                        <form action={approvePeriodLock.bind(null, request.id, request.rowVersion)}>
                          <AccountingAction type="submit" variant="secondary">
                            Approve
                          </AccountingAction>
                        </form>
                        <form action={rejectPeriodLock.bind(null, request.id, request.rowVersion)} className="mnx-accounting-form">
                          <AccountingField label="Reject reason" htmlFor={`reject-${request.id}`}>
                            <AccountingTextarea id={`reject-${request.id}`} name="reason" rows={2} />
                          </AccountingField>
                          <AccountingAction type="submit" variant="destructive">
                            Reject
                          </AccountingAction>
                        </form>
                      </div>
                    ) : (
                      "Resolved"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingEntity ? "Edit legal entity" : "New legal entity"}
        title="Legal entities"
        description="Maintain explicit legal-entity scope and default-entity designation without code defaults."
      >
        <form action={saveEntity} className="mnx-accounting-form">
          <input type="hidden" name="entityId" value={editingEntity?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingEntity?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Code" htmlFor="entity-code">
              <AccountingInput
                id="entity-code"
                name="code"
                defaultValue={editingEntity?.code ?? ""}
              />
            </AccountingField>
            <AccountingField label="Legal name" htmlFor="entity-legalName">
              <AccountingInput
                id="entity-legalName"
                name="legalName"
                defaultValue={editingEntity?.legalName ?? ""}
              />
            </AccountingField>
            <AccountingField label="Entity type" htmlFor="entity-type">
              <AccountingSelect
                id="entity-type"
                name="entityType"
                defaultValue={editingEntity?.entityType ?? "PRIVATE_LIMITED"}
              >
                {snapshot.entityTypes.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {entityType.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Status" htmlFor="entity-status">
              <AccountingSelect
                id="entity-status"
                name="status"
                defaultValue={editingEntity?.status ?? "DRAFT"}
              >
                {snapshot.legalEntityStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Default entity" htmlFor="entity-default">
              <AccountingSelect
                id="entity-default"
                name="isDefault"
                defaultValue={editingEntity?.isDefault ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Effective from"
              htmlFor="entity-effectiveFrom"
            >
              <AccountingInput
                id="entity-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingEntity?.effectiveFrom ?? ""}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="entity-effectiveTo">
              <AccountingInput
                id="entity-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingEntity?.effectiveTo ?? ""}
              />
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="entity-reason">
            <AccountingTextarea id="entity-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingEntity ? "Update legal entity" : "Create legal entity"}
            </AccountingAction>
            {editingEntity ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear entity editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Default</th>
              <th>Registrations</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.legalEntities.map((entity: any) => (
              <tr key={entity.id}>
                <td>{entity.code}</td>
                <td>{entity.legalName}</td>
                <td>{entity.entityType.replaceAll("_", " ")}</td>
                <td>
                  <AccountingStatus status={entity.status} />
                </td>
                <td>{entity.isDefault ? "Yes" : "No"}</td>
                <td>{entity.registrations.length}</td>
                <td>
                  <AccountingActionLink
                    className="mnx-button-compact"
                    href={`/accounting/configuration/admin?editEntity=${entity.id}`}
                  >
                    Edit
                  </AccountingActionLink>
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={
          editingRegistration ? "Edit GST registration" : "New GST registration"
        }
        title="GST registrations"
        description="Capture legal-entity registrations explicitly, including active-window evidence."
      >
        <form action={saveRegistration} className="mnx-accounting-form">
          <input
            type="hidden"
            name="registrationId"
            value={editingRegistration?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingRegistration?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="registration-entity">
              <AccountingSelect
                id="registration-entity"
                name="legalEntityId"
                defaultValue={
                  editingRegistration?.legalEntityId ??
                  editingEntity?.id ??
                  snapshot.legalEntities[0]?.id ??
                  ""
                }
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Registration code"
              htmlFor="registration-code"
            >
              <AccountingInput
                id="registration-code"
                name="registrationCode"
                defaultValue={editingRegistration?.registrationCode ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Registration type"
              htmlFor="registration-type"
            >
              <AccountingSelect
                id="registration-type"
                name="registrationType"
                defaultValue={editingRegistration?.registrationType ?? "GST"}
              >
                {snapshot.registrationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="GSTIN" htmlFor="registration-gstin">
              <AccountingInput
                id="registration-gstin"
                name="gstin"
                defaultValue={editingRegistration?.gstin ?? ""}
              />
            </AccountingField>
            <AccountingField label="State code" htmlFor="registration-stateCode">
              <AccountingInput
                id="registration-stateCode"
                name="stateCode"
                defaultValue={editingRegistration?.stateCode ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Registration legal name"
              htmlFor="registration-legal-name"
            >
              <AccountingInput
                id="registration-legal-name"
                name="registrationLegalName"
                defaultValue={editingRegistration?.legalName ?? ""}
              />
            </AccountingField>
            <AccountingField label="Trade name" htmlFor="registration-tradeName">
              <AccountingInput
                id="registration-tradeName"
                name="tradeName"
                defaultValue={editingRegistration?.tradeName ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Effective from"
              htmlFor="registration-effectiveFrom"
            >
              <AccountingInput
                id="registration-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingRegistration?.effectiveFrom ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Effective to"
              htmlFor="registration-effectiveTo"
            >
              <AccountingInput
                id="registration-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingRegistration?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Active" htmlFor="registration-active">
              <AccountingSelect
                id="registration-active"
                name="isActive"
                defaultValue={editingRegistration?.isActive ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="registration-reason">
            <AccountingTextarea
              id="registration-reason"
              name="reason"
              rows={3}
            />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingRegistration
                ? "Update registration"
                : "Create registration"}
            </AccountingAction>
            {editingRegistration ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear registration editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Entity</th>
              <th>Code</th>
              <th>Type</th>
              <th>GSTIN</th>
              <th>Window</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {allRegistrations.length === 0 ? (
              <tr>
                <td colSpan={7}>No GST registrations are configured yet.</td>
              </tr>
            ) : (
              allRegistrations.map((registration: any) => (
                <tr key={registration.id}>
                  <td>{registration.legalEntityCode}</td>
                  <td>{registration.registrationCode}</td>
                  <td>{registration.registrationType}</td>
                  <td>{registration.gstin ?? "—"}</td>
                  <td>
                    {registration.effectiveFrom ?? "—"}
                    <small>{registration.effectiveTo ?? "Open ended"}</small>
                  </td>
                  <td>
                    <AccountingStatus
                      status={registration.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editRegistration=${registration.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingCurrency ? "Edit currency" : "New currency"}
        title="Currencies"
        description="Manage enabled currencies and the single functional-currency designation explicitly."
      >
        <form action={saveCurrency} className="mnx-accounting-form">
          <input type="hidden" name="currencyId" value={editingCurrency?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingCurrency?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Code" htmlFor="currency-code">
              <AccountingInput
                id="currency-code"
                name="code"
                defaultValue={editingCurrency?.code ?? ""}
              />
            </AccountingField>
            <AccountingField label="Name" htmlFor="currency-name">
              <AccountingInput
                id="currency-name"
                name="name"
                defaultValue={editingCurrency?.name ?? ""}
              />
            </AccountingField>
            <AccountingField label="Symbol" htmlFor="currency-symbol">
              <AccountingInput
                id="currency-symbol"
                name="symbol"
                defaultValue={editingCurrency?.symbol ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Decimal places"
              htmlFor="currency-decimals"
            >
              <AccountingInput
                id="currency-decimals"
                name="decimalPlaces"
                type="number"
                min="0"
                max="8"
                defaultValue={editingCurrency?.decimalPlaces ?? 2}
              />
            </AccountingField>
            <AccountingField label="Functional" htmlFor="currency-functional">
              <AccountingSelect
                id="currency-functional"
                name="isFunctional"
                defaultValue={editingCurrency?.isFunctional ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Enabled" htmlFor="currency-enabled">
              <AccountingSelect
                id="currency-enabled"
                name="isEnabled"
                defaultValue={editingCurrency?.isEnabled ? "true" : "false"}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="currency-reason">
            <AccountingTextarea id="currency-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingCurrency ? "Update currency" : "Create currency"}
            </AccountingAction>
            {editingCurrency ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear currency editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Decimals</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.currencies.map((currency: any) => (
              <tr key={currency.id}>
                <td>{currency.code}</td>
                <td>{currency.name}</td>
                <td>{currency.decimalPlaces}</td>
                <td>{currency.isFunctional ? "Functional" : "Enabled"}</td>
                <td>
                  <AccountingStatus
                    status={currency.isEnabled ? "ACTIVE" : "INACTIVE"}
                  />
                </td>
                <td>
                  <AccountingActionLink
                    className="mnx-button-compact"
                    href={`/accounting/configuration/admin?editCurrency=${currency.id}`}
                  >
                    Edit
                  </AccountingActionLink>
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={
          editingDefinition ? "Edit dimension" : "New accounting dimension"
        }
        title="Accounting dimensions"
        description="Define shared journal dimensions and the controlled source system each dimension is allowed to draw from."
      >
        <form action={saveDimensionDefinition} className="mnx-accounting-form">
          <input
            type="hidden"
            name="definitionId"
            value={editingDefinition?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingDefinition?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Code" htmlFor="dimension-code">
              <AccountingInput
                id="dimension-code"
                name="code"
                defaultValue={editingDefinition?.code ?? ""}
              />
            </AccountingField>
            <AccountingField label="Name" htmlFor="dimension-name">
              <AccountingInput
                id="dimension-name"
                name="name"
                defaultValue={editingDefinition?.name ?? ""}
              />
            </AccountingField>
            <AccountingField label="Value source" htmlFor="dimension-source">
              <AccountingSelect
                id="dimension-source"
                name="valueSource"
                defaultValue={editingDefinition?.valueSource ?? "MANUAL"}
              >
                {snapshot.dimensionValueSources.map((valueSource: string) => (
                  <option key={valueSource} value={valueSource}>
                    {valueSource.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Required" htmlFor="dimension-required">
              <AccountingSelect
                id="dimension-required"
                name="isRequired"
                defaultValue={editingDefinition?.isRequired ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Active" htmlFor="dimension-active">
              <AccountingSelect
                id="dimension-active"
                name="isActive"
                defaultValue={editingDefinition?.isActive ? "true" : "false"}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="dimension-reason">
            <AccountingTextarea id="dimension-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingDefinition ? "Update dimension" : "Create dimension"}
            </AccountingAction>
            {editingDefinition ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear dimension editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Source</th>
              <th>Required</th>
              <th>Status</th>
              <th>Values</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.dimensionDefinitions.length === 0 ? (
              <tr>
                <td colSpan={7}>No accounting dimensions are configured yet.</td>
              </tr>
            ) : (
              snapshot.dimensionDefinitions.map((definition: any) => (
                <tr key={definition.id}>
                  <td>{definition.code}</td>
                  <td>{definition.name}</td>
                  <td>{definition.valueSource.replaceAll("_", " ")}</td>
                  <td>{definition.isRequired ? "Yes" : "No"}</td>
                  <td>
                    <AccountingStatus
                      status={definition.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                  <td>{definition.values.length}</td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editDefinition=${definition.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={
          editingDimensionValue ? "Edit dimension value" : "New dimension value"
        }
        title="Dimension values"
        description="Manage allowed values, optional canonical master bindings, and active date windows without hardcoding journal-only lookups."
      >
        <form action={saveDimensionValue} className="mnx-accounting-form">
          <input
            type="hidden"
            name="dimensionValueId"
            value={editingDimensionValue?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingDimensionValue?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Dimension" htmlFor="dimension-value-definition">
              <AccountingSelect
                id="dimension-value-definition"
                name="definitionId"
                defaultValue={
                  editingDimensionValue?.definitionId ??
                  editingDefinition?.id ??
                  snapshot.dimensionDefinitions[0]?.id ??
                  ""
                }
              >
                {snapshot.dimensionDefinitions.map((definition: any) => (
                  <option key={definition.id} value={definition.id}>
                    {definition.code} — {definition.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Code" htmlFor="dimension-value-code">
              <AccountingInput
                id="dimension-value-code"
                name="code"
                defaultValue={editingDimensionValue?.code ?? ""}
              />
            </AccountingField>
            <AccountingField label="Name" htmlFor="dimension-value-name">
              <AccountingInput
                id="dimension-value-name"
                name="name"
                defaultValue={editingDimensionValue?.name ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Canonical type"
              htmlFor="dimension-value-canonicalType"
            >
              <AccountingInput
                id="dimension-value-canonicalType"
                name="canonicalType"
                defaultValue={editingDimensionValue?.canonicalType ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Canonical ID"
              htmlFor="dimension-value-canonicalId"
            >
              <AccountingInput
                id="dimension-value-canonicalId"
                name="canonicalId"
                defaultValue={editingDimensionValue?.canonicalId ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Effective from"
              htmlFor="dimension-value-effectiveFrom"
            >
              <AccountingInput
                id="dimension-value-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingDimensionValue?.effectiveFrom ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Effective to"
              htmlFor="dimension-value-effectiveTo"
            >
              <AccountingInput
                id="dimension-value-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingDimensionValue?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Active" htmlFor="dimension-value-active">
              <AccountingSelect
                id="dimension-value-active"
                name="isActive"
                defaultValue={editingDimensionValue?.isActive ? "true" : "false"}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="dimension-value-reason">
            <AccountingTextarea
              id="dimension-value-reason"
              name="reason"
              rows={3}
            />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingDimensionValue
                ? "Update dimension value"
                : "Create dimension value"}
            </AccountingAction>
            {editingDimensionValue ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear value editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Code</th>
              <th>Name</th>
              <th>Canonical binding</th>
              <th>Window</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {allDimensionValues.length === 0 ? (
              <tr>
                <td colSpan={7}>No dimension values are configured yet.</td>
              </tr>
            ) : (
              allDimensionValues.map((value: any) => (
                <tr key={value.id}>
                  <td>{value.definitionCode}</td>
                  <td>{value.code}</td>
                  <td>{value.name}</td>
                  <td>
                    {value.canonicalType && value.canonicalId
                      ? `${value.canonicalType} · ${value.canonicalId}`
                      : "Manual only"}
                  </td>
                  <td>
                    {value.effectiveFrom ?? "—"}
                    <small>{value.effectiveTo ?? "Open ended"}</small>
                  </td>
                  <td>
                    <AccountingStatus
                      status={value.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editDimensionValue=${value.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={
          editingCounterpartyScope
            ? "Edit counterparty scope"
            : "New counterparty scope"
        }
        title="Counterparty to legal-entity scopes"
        description="Approve which customer or supplier masters are allowed to transact with each legal entity, using effective dates and explicit active state."
      >
        <form action={saveCounterpartyScope} className="mnx-accounting-form">
          <input
            type="hidden"
            name="counterpartyScopeId"
            value={editingCounterpartyScope?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingCounterpartyScope?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="scope-legalEntityId">
              <AccountingSelect
                id="scope-legalEntityId"
                name="legalEntityId"
                defaultValue={
                  editingCounterpartyScope?.legalEntityId ??
                  snapshot.legalEntities[0]?.id ??
                  ""
                }
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Party type" htmlFor="scope-partyType">
              <AccountingSelect
                id="scope-partyType"
                name="partyType"
                defaultValue={editingCounterpartyScope?.partyType ?? "CUSTOMER"}
              >
                {snapshot.counterpartyTypes.map((partyType: string) => (
                  <option key={partyType} value={partyType}>
                    {partyType}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Party ID" htmlFor="scope-partyId">
              <AccountingSelect
                id="scope-partyId"
                name="partyId"
                defaultValue={editingCounterpartyScope?.partyId ?? ""}
              >
                <option value="">Select customer or supplier</option>
                {snapshot.customers.map((customer: any) => (
                  <option key={`CUSTOMER:${customer.id}`} value={customer.id}>
                    CUSTOMER — {customer.name}
                  </option>
                ))}
                {snapshot.vendors.map((vendor: any) => (
                  <option key={`SUPPLIER:${vendor.id}`} value={vendor.id}>
                    SUPPLIER — {vendor.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Effective from" htmlFor="scope-effectiveFrom">
              <AccountingInput
                id="scope-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={
                  editingCounterpartyScope?.effectiveFrom ?? "2026-07-31"
                }
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="scope-effectiveTo">
              <AccountingInput
                id="scope-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingCounterpartyScope?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Active" htmlFor="scope-isActive">
              <AccountingSelect
                id="scope-isActive"
                name="isActive"
                defaultValue={editingCounterpartyScope?.isActive ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="scope-reason">
            <AccountingTextarea id="scope-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingCounterpartyScope
                ? "Update counterparty scope"
                : "Create counterparty scope"}
            </AccountingAction>
            {editingCounterpartyScope ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear counterparty-scope editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Legal entity</th>
              <th>Party type</th>
              <th>Party</th>
              <th>Version</th>
              <th>Window</th>
              <th>Status</th>
              <th>Approved</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.counterpartyScopes.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  No counterparty-to-legal-entity scopes are configured yet.
                </td>
              </tr>
            ) : (
              snapshot.counterpartyScopes.map((scope: any) => (
                <tr key={scope.id}>
                  <td>{scope.legalEntityLabel}</td>
                  <td>{scope.partyType}</td>
                  <td>{scope.partyLabel}</td>
                  <td>{scope.version}</td>
                  <td>
                    {scope.effectiveFrom}
                    <small>{scope.effectiveTo ?? "Open ended"}</small>
                  </td>
                  <td>
                    <AccountingStatus
                      status={scope.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                  <td>{formatDateTime(scope.approvedAt)}</td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editCounterpartyScope=${scope.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={
          editingAccountControl ? "Edit account control" : "New account control"
        }
        title="Chart-of-accounts controls"
        description="Attach protected posting rules, optional system-role mappings, and dimension requirements to existing accounts without rewriting the chart itself."
      >
        <form action={saveAccountControl} className="mnx-accounting-form">
          <input
            type="hidden"
            name="accountControlId"
            value={editingAccountControl?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingAccountControl?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Account" htmlFor="account-control-accountId">
              <AccountingSelect
                id="account-control-accountId"
                name="accountId"
                defaultValue={editingAccountControl?.accountId ?? ""}
              >
                <option value="">Select account</option>
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Default currency"
              htmlFor="account-control-defaultCurrencyId"
            >
              <AccountingSelect
                id="account-control-defaultCurrencyId"
                name="defaultCurrencyId"
                defaultValue={editingAccountControl?.defaultCurrencyId ?? ""}
              >
                <option value="">No forced currency</option>
                {snapshot.currencies.map((currency: any) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="System role"
              htmlFor="account-control-systemRole"
            >
              <AccountingInput
                id="account-control-systemRole"
                name="systemRole"
                defaultValue={editingAccountControl?.systemRole ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Effective from"
              htmlFor="account-control-effectiveFrom"
            >
              <AccountingInput
                id="account-control-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={
                  editingAccountControl?.effectiveFrom ?? "2026-07-31"
                }
              />
            </AccountingField>
            <AccountingField
              label="System locked"
              htmlFor="account-control-isSystemLocked"
            >
              <AccountingSelect
                id="account-control-isSystemLocked"
                name="isSystemLocked"
                defaultValue={editingAccountControl?.isSystemLocked ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Allow direct posting"
              htmlFor="account-control-allowDirectPosting"
            >
              <AccountingSelect
                id="account-control-allowDirectPosting"
                name="allowDirectPosting"
                defaultValue={editingAccountControl?.allowDirectPosting ? "true" : "false"}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Requires party"
              htmlFor="account-control-requiresParty"
            >
              <AccountingSelect
                id="account-control-requiresParty"
                name="requiresParty"
                defaultValue={editingAccountControl?.requiresParty ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Requires CHA job"
              htmlFor="account-control-requiresChaJob"
            >
              <AccountingSelect
                id="account-control-requiresChaJob"
                name="requiresChaJob"
                defaultValue={editingAccountControl?.requiresChaJob ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Requires cost centre"
              htmlFor="account-control-requiresCostCentre"
            >
              <AccountingSelect
                id="account-control-requiresCostCentre"
                name="requiresCostCentre"
                defaultValue={editingAccountControl?.requiresCostCentre ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="account-control-reason">
            <AccountingTextarea
              id="account-control-reason"
              name="reason"
              rows={3}
            />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingAccountControl
                ? "Update account control"
                : "Create account control"}
            </AccountingAction>
            {editingAccountControl ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear account-control editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Account</th>
              <th>System role</th>
              <th>Currency</th>
              <th>Posting</th>
              <th>Requirements</th>
              <th>Effective from</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.accountControls.length === 0 ? (
              <tr>
                <td colSpan={7}>No chart-of-account controls are configured yet.</td>
              </tr>
            ) : (
              snapshot.accountControls.map((control: any) => (
                <tr key={control.id}>
                  <td>{control.accountLabel}</td>
                  <td>{control.systemRole ?? "—"}</td>
                  <td>{control.defaultCurrencyCode ?? "Flexible"}</td>
                  <td>
                    <AccountingStatus
                      status={
                        control.allowDirectPosting
                          ? "DIRECT_ALLOWED"
                          : "DIRECT_BLOCKED"
                      }
                    />
                    <small>
                      {control.isSystemLocked ? "System locked" : "Editable"}
                    </small>
                  </td>
                  <td>
                    {[
                      control.requiresParty ? "Party" : null,
                      control.requiresChaJob ? "CHA job" : null,
                      control.requiresCostCentre ? "Cost centre" : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "None"}
                  </td>
                  <td>{control.effectiveFrom}</td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editAccountControl=${control.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={
          editingApprovalPolicy ? "Edit approval policy" : "New approval policy"
        }
        title="Approval policies"
        description="Maintain versioned maker-checker policy definitions and role-routing configuration as explicit JSON, not hardcoded workflow defaults."
      >
        <form action={saveApprovalPolicy} className="mnx-accounting-form">
          <input
            type="hidden"
            name="approvalPolicyId"
            value={editingApprovalPolicy?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingApprovalPolicy?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Policy code" htmlFor="approval-policy-code">
              <AccountingInput
                id="approval-policy-code"
                name="code"
                defaultValue={editingApprovalPolicy?.code ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Document type"
              htmlFor="approval-policy-documentType"
            >
              <AccountingSelect
                id="approval-policy-documentType"
                name="documentType"
                defaultValue={
                  editingApprovalPolicy?.documentType ?? "SALES_INVOICE"
                }
              >
                {snapshot.approvalPolicyDocumentTypes.map(
                  (documentType: string) => (
                    <option key={documentType} value={documentType}>
                      {documentType.replaceAll("_", " ")}
                    </option>
                  ),
                )}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Effective from"
              htmlFor="approval-policy-effectiveFrom"
            >
              <AccountingInput
                id="approval-policy-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingApprovalPolicy?.effectiveFrom ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Effective to"
              htmlFor="approval-policy-effectiveTo"
            >
              <AccountingInput
                id="approval-policy-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingApprovalPolicy?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Active" htmlFor="approval-policy-active">
              <AccountingSelect
                id="approval-policy-active"
                name="isActive"
                defaultValue={editingApprovalPolicy?.isActive ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField
            label="Configuration JSON"
            htmlFor="approval-policy-configuration"
            hint="Use this to store role assignments, minimum reviewers, escalation steps, and allowed approval flow metadata."
          >
            <AccountingTextarea
              id="approval-policy-configuration"
              name="configurationJson"
              rows={12}
              defaultValue={
                editingApprovalPolicy?.configurationJson ??
                JSON.stringify(
                  {
                    roleAssignments: [
                      {
                        stage: 1,
                        roleCode: "ACCOUNTING_MANAGER",
                        minApprovals: 1,
                      },
                    ],
                    escalationDays: 0,
                    autoEscalate: false,
                  },
                  null,
                  2,
                )
              }
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="approval-policy-reason">
            <AccountingTextarea
              id="approval-policy-reason"
              name="reason"
              rows={3}
            />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingApprovalPolicy
                ? "Update approval policy"
                : "Create approval policy"}
            </AccountingAction>
            {editingApprovalPolicy ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear approval-policy editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Code</th>
              <th>Document type</th>
              <th>Version</th>
              <th>Window</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.approvalPolicies.length === 0 ? (
              <tr>
                <td colSpan={6}>No approval policies are configured yet.</td>
              </tr>
            ) : (
              snapshot.approvalPolicies.map((policy: any) => (
                <tr key={policy.id}>
                  <td>{policy.code}</td>
                  <td>{policy.documentType.replaceAll("_", " ")}</td>
                  <td>{policy.version}</td>
                  <td>
                    {policy.effectiveFrom ?? "—"}
                    <small>{policy.effectiveTo ?? "Open ended"}</small>
                  </td>
                  <td>
                    <AccountingStatus
                      status={policy.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editApprovalPolicy=${policy.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={
          editingDocumentPolicy ? "Edit document policy" : "New document policy"
        }
        title="Document and payment policies"
        description="Maintain legal-entity-scoped configuration snapshots for documents and payments, including statutory validation markers and effective dates."
      >
        <form action={saveDocumentPolicy} className="mnx-accounting-form">
          <input
            type="hidden"
            name="documentPolicyId"
            value={editingDocumentPolicy?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingDocumentPolicy?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="document-policy-legalEntityId">
              <AccountingSelect
                id="document-policy-legalEntityId"
                name="legalEntityId"
                defaultValue={
                  editingDocumentPolicy?.legalEntityId ??
                  snapshot.legalEntities[0]?.id ??
                  ""
                }
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Document type" htmlFor="document-policy-documentType">
              <AccountingSelect
                id="document-policy-documentType"
                name="documentType"
                defaultValue={editingDocumentPolicy?.documentType ?? "SALES_INVOICE"}
              >
                {snapshot.documentPolicyTypes.map((documentType: string) => (
                  <option key={documentType} value={documentType}>
                    {documentType.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Effective from" htmlFor="document-policy-effectiveFrom">
              <AccountingInput
                id="document-policy-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingDocumentPolicy?.effectiveFrom ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="document-policy-effectiveTo">
              <AccountingInput
                id="document-policy-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingDocumentPolicy?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Statutory validated" htmlFor="document-policy-statutoryValidated">
              <AccountingSelect
                id="document-policy-statutoryValidated"
                name="statutoryValidated"
                defaultValue={editingDocumentPolicy?.statutoryValidated ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Active" htmlFor="document-policy-isActive">
              <AccountingSelect
                id="document-policy-isActive"
                name="isActive"
                defaultValue={editingDocumentPolicy?.isActive ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="document-policy-configuration">
            <AccountingTextarea
              id="document-policy-configuration"
              name="configurationJson"
              rows={12}
              defaultValue={
                editingDocumentPolicy?.configurationJson ??
                JSON.stringify(
                  {
                    approvalPolicyCode: "STANDARD_REVIEW",
                    numberSeriesCode: "DEFAULT",
                    roundingPolicyCode: "MONEY_STANDARD",
                    allowStandaloneCorrections: false,
                    requireCounterpartyScope: true,
                  },
                  null,
                  2,
                )
              }
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="document-policy-reason">
            <AccountingTextarea id="document-policy-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingDocumentPolicy
                ? "Update document policy"
                : "Create document policy"}
            </AccountingAction>
            {editingDocumentPolicy ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear document-policy editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Legal entity</th>
              <th>Document type</th>
              <th>Version</th>
              <th>Hash</th>
              <th>Window</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.documentPolicies.length === 0 ? (
              <tr>
                <td colSpan={7}>No document or payment policies are configured yet.</td>
              </tr>
            ) : (
              snapshot.documentPolicies.map((policy: any) => (
                <tr key={policy.id}>
                  <td>{policy.legalEntityLabel}</td>
                  <td>{policy.documentType.replaceAll("_", " ")}</td>
                  <td>{policy.version}</td>
                  <td><code>{policy.configurationHash}</code></td>
                  <td>
                    {policy.effectiveFrom}
                    <small>{policy.effectiveTo ?? "Open ended"}</small>
                  </td>
                  <td>
                    <AccountingStatus
                      status={
                        policy.isActive
                          ? policy.statutoryValidated
                            ? "ACTIVE_VALIDATED"
                            : "ACTIVE_UNVALIDATED"
                          : "INACTIVE"
                      }
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editDocumentPolicy=${policy.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Tax foundation"
        title={editingTaxProfile ? "Edit tax profile" : "Tax profiles"}
        description="Define registration-scoped tax profiles with explicit effective dates, optional legal-entity overrides, and versioned statutory metadata."
      >
        <form action={saveTaxProfile} className="mnx-accounting-form">
          <input
            type="hidden"
            name="taxProfileId"
            value={editingTaxProfile?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingTaxProfile?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField
              label="Registration"
              htmlFor="tax-profile-taxRegistrationId"
            >
              <AccountingSelect
                id="tax-profile-taxRegistrationId"
                name="taxRegistrationId"
                defaultValue={editingTaxProfile?.taxRegistrationId ?? ""}
              >
                <option value="">Select registration</option>
                {registrationOptions.map((registration: any) => (
                  <option key={registration.id} value={registration.id}>
                    {registration.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Legal entity override"
              htmlFor="tax-profile-legalEntityId"
            >
              <AccountingSelect
                id="tax-profile-legalEntityId"
                name="legalEntityId"
                defaultValue={editingTaxProfile?.legalEntityId ?? ""}
              >
                <option value="">Registration default</option>
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Profile code" htmlFor="tax-profile-code">
              <AccountingInput
                id="tax-profile-code"
                name="code"
                defaultValue={editingTaxProfile?.code ?? ""}
              />
            </AccountingField>
            <AccountingField label="Profile name" htmlFor="tax-profile-name">
              <AccountingInput
                id="tax-profile-name"
                name="name"
                defaultValue={editingTaxProfile?.name ?? ""}
              />
            </AccountingField>
            <AccountingField label="Version" htmlFor="tax-profile-version">
              <AccountingInput
                id="tax-profile-version"
                name="version"
                type="number"
                min="1"
                defaultValue={editingTaxProfile?.version ?? 1}
              />
            </AccountingField>
            <AccountingField
              label="Statutory validated"
              htmlFor="tax-profile-statutoryValidated"
            >
              <AccountingSelect
                id="tax-profile-statutoryValidated"
                name="statutoryValidated"
                defaultValue={
                  editingTaxProfile?.statutoryValidated ? "true" : "false"
                }
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Effective from"
              htmlFor="tax-profile-effectiveFrom"
            >
              <AccountingInput
                id="tax-profile-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingTaxProfile?.effectiveFrom ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Effective to"
              htmlFor="tax-profile-effectiveTo"
            >
              <AccountingInput
                id="tax-profile-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingTaxProfile?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Active" htmlFor="tax-profile-isActive">
              <AccountingSelect
                id="tax-profile-isActive"
                name="isActive"
                defaultValue={editingTaxProfile?.isActive ? "true" : "false"}
              >
                <option value="false">Draft / inactive</option>
                <option value="true">Active</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="tax-profile-configurationJson">
            <AccountingTextarea
              id="tax-profile-configurationJson"
              name="configurationJson"
              rows={8}
              defaultValue={editingTaxProfile?.configurationJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="tax-profile-reason">
            <AccountingTextarea id="tax-profile-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingTaxProfile ? "Update tax profile" : "Create tax profile"}
            </AccountingAction>
            {editingTaxProfile ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear tax-profile editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Profile</th>
              <th>Registration</th>
              <th>Scope</th>
              <th>Window</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.taxProfiles.length === 0 ? (
              <tr>
                <td colSpan={6}>No tax profiles are configured yet.</td>
              </tr>
            ) : (
              snapshot.taxProfiles.map((profile: any) => (
                <tr key={profile.id}>
                  <td>
                    <div>{profile.code}</div>
                    <small>
                      v{profile.version} · {profile.name}
                    </small>
                  </td>
                  <td>{profile.taxRegistrationLabel}</td>
                  <td>{profile.legalEntityLabel}</td>
                  <td>
                    {profile.effectiveFrom}
                    <small>{profile.effectiveTo ?? "Open ended"}</small>
                  </td>
                  <td>
                    <AccountingStatus
                      status={
                        profile.isActive
                          ? profile.statutoryValidated
                            ? "ACTIVE_VALIDATED"
                            : "ACTIVE_UNVALIDATED"
                          : "INACTIVE"
                      }
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editTaxProfile=${profile.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Tax rules"
        title={editingTaxRule ? "Edit tax rule" : "Tax rules and components"}
        description="Capture document-level tax applicability and explicit component breakdowns as versioned configuration, without embedding rates in code."
      >
        <form action={saveTaxRule} className="mnx-accounting-form">
          <input type="hidden" name="taxRuleId" value={editingTaxRule?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingTaxRule?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Tax profile" htmlFor="tax-rule-taxProfileId">
              <AccountingSelect
                id="tax-rule-taxProfileId"
                name="taxProfileId"
                defaultValue={editingTaxRule?.taxProfileId ?? ""}
              >
                <option value="">Select tax profile</option>
                {snapshot.taxProfiles.map((profile: any) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.code} · v{profile.version} · {profile.taxRegistrationLabel}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Registration"
              htmlFor="tax-rule-taxRegistrationId"
            >
              <AccountingSelect
                id="tax-rule-taxRegistrationId"
                name="taxRegistrationId"
                defaultValue={editingTaxRule?.taxRegistrationId ?? ""}
              >
                <option value="">Select registration</option>
                {registrationOptions.map((registration: any) => (
                  <option key={registration.id} value={registration.id}>
                    {registration.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Legal entity override"
              htmlFor="tax-rule-legalEntityId"
            >
              <AccountingSelect
                id="tax-rule-legalEntityId"
                name="legalEntityId"
                defaultValue={editingTaxRule?.legalEntityId ?? ""}
              >
                <option value="">Registration default</option>
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Rule code" htmlFor="tax-rule-code">
              <AccountingInput
                id="tax-rule-code"
                name="code"
                defaultValue={editingTaxRule?.code ?? ""}
              />
            </AccountingField>
            <AccountingField label="Document type" htmlFor="tax-rule-documentType">
              <AccountingSelect
                id="tax-rule-documentType"
                name="documentType"
                defaultValue={editingTaxRule?.documentType ?? "SALES_INVOICE"}
              >
                {snapshot.taxRuleDocumentTypes.map((value: string) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Place of supply"
              htmlFor="tax-rule-placeOfSupplyType"
            >
              <AccountingSelect
                id="tax-rule-placeOfSupplyType"
                name="placeOfSupplyType"
                defaultValue={editingTaxRule?.placeOfSupplyType ?? "INTRA_STATE"}
              >
                {snapshot.taxRulePlaceOfSupplyTypes.map((value: string) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Counterparty treatment"
              htmlFor="tax-rule-counterpartyTreatment"
            >
              <AccountingSelect
                id="tax-rule-counterpartyTreatment"
                name="counterpartyTreatment"
                defaultValue={
                  editingTaxRule?.counterpartyTreatment ?? "REGISTERED_BUSINESS"
                }
              >
                {snapshot.taxRuleCounterpartyTreatments.map((value: string) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField
              label="Supply category"
              htmlFor="tax-rule-supplyCategory"
            >
              <AccountingSelect
                id="tax-rule-supplyCategory"
                name="supplyCategory"
                defaultValue={editingTaxRule?.supplyCategory ?? "SERVICE"}
              >
                {snapshot.taxRuleSupplyCategories.map((value: string) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Version" htmlFor="tax-rule-version">
              <AccountingInput
                id="tax-rule-version"
                name="version"
                type="number"
                min="1"
                defaultValue={editingTaxRule?.version ?? 1}
              />
            </AccountingField>
            <AccountingField label="Effective from" htmlFor="tax-rule-effectiveFrom">
              <AccountingInput
                id="tax-rule-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingTaxRule?.effectiveFrom ?? ""}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="tax-rule-effectiveTo">
              <AccountingInput
                id="tax-rule-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingTaxRule?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Statutory validated"
              htmlFor="tax-rule-statutoryValidated"
            >
              <AccountingSelect
                id="tax-rule-statutoryValidated"
                name="statutoryValidated"
                defaultValue={editingTaxRule?.statutoryValidated ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Active" htmlFor="tax-rule-isActive">
              <AccountingSelect
                id="tax-rule-isActive"
                name="isActive"
                defaultValue={editingTaxRule?.isActive ? "true" : "false"}
              >
                <option value="false">Draft / inactive</option>
                <option value="true">Active</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Rule configuration JSON" htmlFor="tax-rule-configurationJson">
            <AccountingTextarea
              id="tax-rule-configurationJson"
              name="configurationJson"
              rows={8}
              defaultValue={editingTaxRule?.configurationJson ?? "{}"}
            />
          </AccountingField>
          <AccountingField label="Components JSON" htmlFor="tax-rule-componentsJson">
            <AccountingTextarea
              id="tax-rule-componentsJson"
              name="componentsJson"
              rows={10}
              defaultValue={
                editingTaxRule?.componentsJson ??
                JSON.stringify(
                  [
                    {
                      componentCode: "CGST_STANDARD",
                      componentType: "CGST",
                      ratePercent: "9.000000",
                      recoverablePercent: "100.000000",
                      position: 1,
                    },
                    {
                      componentCode: "SGST_STANDARD",
                      componentType: "SGST",
                      ratePercent: "9.000000",
                      recoverablePercent: "100.000000",
                      position: 2,
                    },
                  ],
                  null,
                  2,
                )
              }
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="tax-rule-reason">
            <AccountingTextarea id="tax-rule-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingTaxRule ? "Update tax rule" : "Create tax rule"}
            </AccountingAction>
            {editingTaxRule ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear tax-rule editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Rule</th>
              <th>Profile</th>
              <th>Applicability</th>
              <th>Components</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.taxRules.length === 0 ? (
              <tr>
                <td colSpan={6}>No tax rules are configured yet.</td>
              </tr>
            ) : (
              snapshot.taxRules.map((rule: any) => (
                <tr key={rule.id}>
                  <td>
                    <div>{rule.code}</div>
                    <small>
                      v{rule.version} · {rule.documentType.replaceAll("_", " ")}
                    </small>
                  </td>
                  <td>{rule.taxProfileLabel}</td>
                  <td>
                    <div>{rule.placeOfSupplyType.replaceAll("_", " ")}</div>
                    <small>
                      {rule.counterpartyTreatment.replaceAll("_", " ")} ·{" "}
                      {rule.supplyCategory.replaceAll("_", " ")}
                    </small>
                  </td>
                  <td>
                    {rule.components.map((component: any) => (
                      <div
                        key={`${rule.id}-${component.componentCode}-${component.position}`}
                      >
                        {component.componentType}: {component.ratePercent}%
                      </div>
                    ))}
                  </td>
                  <td>
                    <AccountingStatus
                      status={
                        rule.isActive
                          ? rule.statutoryValidated
                            ? "ACTIVE_VALIDATED"
                            : "ACTIVE_UNVALIDATED"
                          : "INACTIVE"
                      }
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editTaxRule=${rule.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Statutory reporting"
        title={
          editingStatutoryReturnProfile
            ? "Edit statutory return profile"
            : "Statutory return profiles"
        }
        description="Govern filing cadence and approved return configuration for GST and related statutory outputs without enabling external filing."
      >
        <form action={saveStatutoryReturnProfile} className="mnx-accounting-form">
          <input
            type="hidden"
            name="statutoryReturnProfileId"
            value={editingStatutoryReturnProfile?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingStatutoryReturnProfile?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Registration" htmlFor="statutory-profile-taxRegistrationId">
              <AccountingSelect
                id="statutory-profile-taxRegistrationId"
                name="taxRegistrationId"
                defaultValue={editingStatutoryReturnProfile?.taxRegistrationId ?? ""}
              >
                <option value="">Select registration</option>
                {registrationOptions.map((registration: any) => (
                  <option key={registration.id} value={registration.id}>
                    {registration.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Legal entity override" htmlFor="statutory-profile-legalEntityId">
              <AccountingSelect
                id="statutory-profile-legalEntityId"
                name="legalEntityId"
                defaultValue={editingStatutoryReturnProfile?.legalEntityId ?? ""}
              >
                <option value="">Registration default</option>
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Return type" htmlFor="statutory-profile-returnType">
              <AccountingSelect
                id="statutory-profile-returnType"
                name="returnType"
                defaultValue={editingStatutoryReturnProfile?.returnType ?? "GSTR1"}
              >
                {snapshot.statutoryReturnTypes.map((value: string) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Filing frequency" htmlFor="statutory-profile-filingFrequency">
              <AccountingSelect
                id="statutory-profile-filingFrequency"
                name="filingFrequency"
                defaultValue={
                  editingStatutoryReturnProfile?.filingFrequency ?? "MONTHLY"
                }
              >
                {snapshot.statutoryFilingFrequencies.map((value: string) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Due day" htmlFor="statutory-profile-dueDayOfMonth">
              <AccountingInput
                id="statutory-profile-dueDayOfMonth"
                name="dueDayOfMonth"
                type="number"
                min="1"
                max="31"
                defaultValue={editingStatutoryReturnProfile?.dueDayOfMonth ?? ""}
              />
            </AccountingField>
            <AccountingField label="Statutory validated" htmlFor="statutory-profile-statutoryValidated">
              <AccountingSelect
                id="statutory-profile-statutoryValidated"
                name="statutoryValidated"
                defaultValue={
                  editingStatutoryReturnProfile?.statutoryValidated ? "true" : "false"
                }
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Effective from" htmlFor="statutory-profile-effectiveFrom">
              <AccountingInput
                id="statutory-profile-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingStatutoryReturnProfile?.effectiveFrom ?? ""}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="statutory-profile-effectiveTo">
              <AccountingInput
                id="statutory-profile-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingStatutoryReturnProfile?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Active" htmlFor="statutory-profile-isActive">
              <AccountingSelect
                id="statutory-profile-isActive"
                name="isActive"
                defaultValue={editingStatutoryReturnProfile?.isActive ? "true" : "false"}
              >
                <option value="false">Draft / inactive</option>
                <option value="true">Active</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="statutory-profile-configurationJson">
            <AccountingTextarea
              id="statutory-profile-configurationJson"
              name="configurationJson"
              rows={8}
              defaultValue={editingStatutoryReturnProfile?.configurationJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="statutory-profile-reason">
            <AccountingTextarea id="statutory-profile-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingStatutoryReturnProfile
                ? "Update statutory return profile"
                : "Create statutory return profile"}
            </AccountingAction>
            {editingStatutoryReturnProfile ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear statutory return editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Return</th>
              <th>Registration</th>
              <th>Cadence</th>
              <th>Window</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.statutoryReturnProfiles.length === 0 ? (
              <tr>
                <td colSpan={6}>No statutory return profiles are configured yet.</td>
              </tr>
            ) : (
              snapshot.statutoryReturnProfiles.map((profile: any) => (
                <tr key={profile.id}>
                  <td>{profile.returnType.replaceAll("_", " ")}</td>
                  <td>{profile.taxRegistrationLabel}</td>
                  <td>
                    {profile.filingFrequency.replaceAll("_", " ")}
                    <small>
                      {profile.dueDayOfMonth ? `Due day ${profile.dueDayOfMonth}` : "No fixed due day"}
                    </small>
                  </td>
                  <td>
                    {profile.effectiveFrom}
                    <small>{profile.effectiveTo ?? "Open ended"}</small>
                  </td>
                  <td>
                    <AccountingStatus
                      status={
                        profile.isActive
                          ? profile.statutoryValidated
                            ? "ACTIVE_VALIDATED"
                            : "ACTIVE_UNVALIDATED"
                          : "INACTIVE"
                      }
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editStatutoryReturnProfile=${profile.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Filing periods"
        title={
          editingStatutoryFilingPeriod
            ? "Edit statutory filing period"
            : "Statutory filing periods"
        }
        description="Track filing windows, due dates, and filed evidence references as internal configuration records only."
      >
        <form action={saveStatutoryFilingPeriod} className="mnx-accounting-form">
          <input
            type="hidden"
            name="statutoryFilingPeriodId"
            value={editingStatutoryFilingPeriod?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingStatutoryFilingPeriod?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Return profile" htmlFor="statutory-period-profileId">
              <AccountingSelect
                id="statutory-period-profileId"
                name="profileId"
                defaultValue={editingStatutoryFilingPeriod?.profileId ?? ""}
              >
                <option value="">Select profile</option>
                {snapshot.statutoryReturnProfiles.map((profile: any) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.returnType} · {profile.filingFrequency} · {profile.taxRegistrationLabel}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Registration" htmlFor="statutory-period-taxRegistrationId">
              <AccountingSelect
                id="statutory-period-taxRegistrationId"
                name="taxRegistrationId"
                defaultValue={editingStatutoryFilingPeriod?.taxRegistrationId ?? ""}
              >
                <option value="">Select registration</option>
                {registrationOptions.map((registration: any) => (
                  <option key={registration.id} value={registration.id}>
                    {registration.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Legal entity override" htmlFor="statutory-period-legalEntityId">
              <AccountingSelect
                id="statutory-period-legalEntityId"
                name="legalEntityId"
                defaultValue={editingStatutoryFilingPeriod?.legalEntityId ?? ""}
              >
                <option value="">Registration default</option>
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Return type" htmlFor="statutory-period-returnType">
              <AccountingSelect
                id="statutory-period-returnType"
                name="returnType"
                defaultValue={editingStatutoryFilingPeriod?.returnType ?? "GSTR1"}
              >
                {snapshot.statutoryReturnTypes.map((value: string) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Period start" htmlFor="statutory-period-periodStart">
              <AccountingInput
                id="statutory-period-periodStart"
                name="periodStart"
                type="date"
                defaultValue={editingStatutoryFilingPeriod?.periodStart ?? ""}
              />
            </AccountingField>
            <AccountingField label="Period end" htmlFor="statutory-period-periodEnd">
              <AccountingInput
                id="statutory-period-periodEnd"
                name="periodEnd"
                type="date"
                defaultValue={editingStatutoryFilingPeriod?.periodEnd ?? ""}
              />
            </AccountingField>
            <AccountingField label="Due date" htmlFor="statutory-period-dueDate">
              <AccountingInput
                id="statutory-period-dueDate"
                name="dueDate"
                type="date"
                defaultValue={editingStatutoryFilingPeriod?.dueDate ?? ""}
              />
            </AccountingField>
            <AccountingField label="Status" htmlFor="statutory-period-status">
              <AccountingSelect
                id="statutory-period-status"
                name="status"
                defaultValue={editingStatutoryFilingPeriod?.status ?? "OPEN"}
              >
                {snapshot.statutoryFilingStatuses.map((value: string) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Acknowledgement ref" htmlFor="statutory-period-acknowledgementRef">
              <AccountingInput
                id="statutory-period-acknowledgementRef"
                name="acknowledgementRef"
                defaultValue={editingStatutoryFilingPeriod?.acknowledgementRef ?? ""}
              />
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="statutory-period-configurationJson">
            <AccountingTextarea
              id="statutory-period-configurationJson"
              name="configurationJson"
              rows={8}
              defaultValue={editingStatutoryFilingPeriod?.configurationJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="statutory-period-reason">
            <AccountingTextarea id="statutory-period-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingStatutoryFilingPeriod
                ? "Update filing period"
                : "Create filing period"}
            </AccountingAction>
            {editingStatutoryFilingPeriod ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear filing-period editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Return</th>
              <th>Profile</th>
              <th>Period</th>
              <th>Due</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.statutoryFilingPeriods.length === 0 ? (
              <tr>
                <td colSpan={6}>No statutory filing periods are configured yet.</td>
              </tr>
            ) : (
              snapshot.statutoryFilingPeriods.map((period: any) => (
                <tr key={period.id}>
                  <td>{period.returnType.replaceAll("_", " ")}</td>
                  <td>{period.profileLabel}</td>
                  <td>
                    {period.periodStart} → {period.periodEnd}
                  </td>
                  <td>{period.dueDate ?? "Not set"}</td>
                  <td>
                    <AccountingStatus status={period.status} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editStatutoryFilingPeriod=${period.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Banking foundation"
        title={editingBankAccount ? "Edit bank account" : "Bank accounts"}
        description="Register Accounting-owned bank accounts against legal entities and bank ledgers as the first 9.4 reconciliation foundation."
      >
        <form action={saveBankAccount} className="mnx-accounting-form">
          <input
            type="hidden"
            name="bankAccountId"
            value={editingBankAccount?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingBankAccount?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="bank-account-legalEntityId">
              <AccountingSelect
                id="bank-account-legalEntityId"
                name="legalEntityId"
                defaultValue={editingBankAccount?.legalEntityId ?? ""}
              >
                <option value="">Select legal entity</option>
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Registration" htmlFor="bank-account-taxRegistrationId">
              <AccountingSelect
                id="bank-account-taxRegistrationId"
                name="taxRegistrationId"
                defaultValue={editingBankAccount?.taxRegistrationId ?? ""}
              >
                <option value="">Optional</option>
                {registrationOptions.map((registration: any) => (
                  <option key={registration.id} value={registration.id}>
                    {registration.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Bank ledger account" htmlFor="bank-account-ledgerAccountId">
              <AccountingSelect
                id="bank-account-ledgerAccountId"
                name="ledgerAccountId"
                defaultValue={editingBankAccount?.ledgerAccountId ?? ""}
              >
                <option value="">Select bank ledger</option>
                {snapshot.accounts
                  .filter((account: any) => account.accountType === "BANK")
                  .map((account: any) => (
                    <option key={account.id} value={account.id}>
                      {account.accountCode} — {account.accountName}
                    </option>
                  ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Code" htmlFor="bank-account-code">
              <AccountingInput
                id="bank-account-code"
                name="code"
                defaultValue={editingBankAccount?.code ?? ""}
              />
            </AccountingField>
            <AccountingField label="Name" htmlFor="bank-account-name">
              <AccountingInput
                id="bank-account-name"
                name="name"
                defaultValue={editingBankAccount?.name ?? ""}
              />
            </AccountingField>
            <AccountingField label="Bank name" htmlFor="bank-account-bankName">
              <AccountingInput
                id="bank-account-bankName"
                name="bankName"
                defaultValue={editingBankAccount?.bankName ?? ""}
              />
            </AccountingField>
            <AccountingField label="Branch" htmlFor="bank-account-branchName">
              <AccountingInput
                id="bank-account-branchName"
                name="branchName"
                defaultValue={editingBankAccount?.branchName ?? ""}
              />
            </AccountingField>
            <AccountingField label="Masked account number" htmlFor="bank-account-accountNumberMasked">
              <AccountingInput
                id="bank-account-accountNumberMasked"
                name="accountNumberMasked"
                defaultValue={editingBankAccount?.accountNumberMasked ?? ""}
              />
            </AccountingField>
            <AccountingField label="IFSC" htmlFor="bank-account-ifsc">
              <AccountingInput
                id="bank-account-ifsc"
                name="ifsc"
                defaultValue={editingBankAccount?.ifsc ?? ""}
              />
            </AccountingField>
            <AccountingField label="Currency" htmlFor="bank-account-currencyCode">
              <AccountingSelect
                id="bank-account-currencyCode"
                name="currencyCode"
                defaultValue={editingBankAccount?.currencyCode ?? "INR"}
              >
                {snapshot.currencies.map((currency: any) => (
                  <option key={currency.id} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Primary" htmlFor="bank-account-isPrimary">
              <AccountingSelect
                id="bank-account-isPrimary"
                name="isPrimary"
                defaultValue={editingBankAccount?.isPrimary ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Statutory validated" htmlFor="bank-account-statutoryValidated">
              <AccountingSelect
                id="bank-account-statutoryValidated"
                name="statutoryValidated"
                defaultValue={
                  editingBankAccount?.statutoryValidated ? "true" : "false"
                }
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Effective from" htmlFor="bank-account-effectiveFrom">
              <AccountingInput
                id="bank-account-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingBankAccount?.effectiveFrom ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="bank-account-effectiveTo">
              <AccountingInput
                id="bank-account-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingBankAccount?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Active" htmlFor="bank-account-isActive">
              <AccountingSelect
                id="bank-account-isActive"
                name="isActive"
                defaultValue={editingBankAccount?.isActive ? "true" : "false"}
              >
                <option value="false">Draft / inactive</option>
                <option value="true">Active</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="bank-account-configurationJson">
            <AccountingTextarea
              id="bank-account-configurationJson"
              name="configurationJson"
              rows={8}
              defaultValue={editingBankAccount?.configurationJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="bank-account-reason">
            <AccountingTextarea id="bank-account-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingBankAccount ? "Update bank account" : "Create bank account"}
            </AccountingAction>
            {editingBankAccount ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear bank-account editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Bank account</th>
              <th>Ledger</th>
              <th>Scope</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.bankAccounts.length === 0 ? (
              <tr>
                <td colSpan={6}>No Accounting bank accounts are configured yet.</td>
              </tr>
            ) : (
              snapshot.bankAccounts.map((account: any) => (
                <tr key={account.id}>
                  <td>
                    <div>{account.code}</div>
                    <small>
                      {account.bankName} · {account.accountNumberMasked}
                    </small>
                  </td>
                  <td>{account.ledgerAccountLabel}</td>
                  <td>{account.legalEntityLabel}</td>
                  <td>{account.currencyCode}</td>
                  <td>
                    <AccountingStatus
                      status={
                        account.isActive
                          ? account.statutoryValidated
                            ? "ACTIVE_VALIDATED"
                            : "ACTIVE_UNVALIDATED"
                          : "INACTIVE"
                      }
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editBankAccount=${account.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Statement imports"
        title="Verified statement import workflow"
        description="Capture statement metadata, verify the imported payload, and register normalized statement lines in one controlled step."
      >
        <form action={saveBankStatementImport} className="mnx-accounting-form">
          <input
            type="hidden"
            name="bankStatementImportId"
            value={editingBankStatementImport?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingBankStatementImport?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Bank account" htmlFor="statement-import-bankAccountId">
              <AccountingSelect
                id="statement-import-bankAccountId"
                name="bankAccountId"
                defaultValue={editingBankStatementImport?.bankAccountId ?? snapshot.bankAccounts[0]?.id ?? ""}
              >
                {snapshot.bankAccounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.code} — {account.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Source file name" htmlFor="statement-import-sourceFileName">
              <AccountingInput
                id="statement-import-sourceFileName"
                name="sourceFileName"
                defaultValue={editingBankStatementImport?.sourceFileName ?? ""}
              />
            </AccountingField>
            <AccountingField label="Source format" htmlFor="statement-import-sourceFormat">
              <AccountingInput
                id="statement-import-sourceFormat"
                name="sourceFormat"
                defaultValue={editingBankStatementImport?.sourceFormat ?? "CSV"}
              />
            </AccountingField>
            <AccountingField label="Optional source hash override" htmlFor="statement-import-sourceFileHash">
              <AccountingInput
                id="statement-import-sourceFileHash"
                name="sourceFileHash"
                defaultValue={editingBankStatementImport?.sourceFileHash ?? ""}
              />
            </AccountingField>
            <AccountingField label="Statement start" htmlFor="statement-import-statementStart">
              <AccountingInput
                id="statement-import-statementStart"
                name="statementStart"
                type="date"
                defaultValue={editingBankStatementImport?.statementStart ?? ""}
              />
            </AccountingField>
            <AccountingField label="Statement end" htmlFor="statement-import-statementEnd">
              <AccountingInput
                id="statement-import-statementEnd"
                name="statementEnd"
                type="date"
                defaultValue={editingBankStatementImport?.statementEnd ?? ""}
              />
            </AccountingField>
            <AccountingField label="Opening balance" htmlFor="statement-import-openingBalance">
              <AccountingInput
                id="statement-import-openingBalance"
                name="openingBalance"
                defaultValue={editingBankStatementImport?.openingBalance ?? ""}
              />
            </AccountingField>
            <AccountingField label="Closing balance" htmlFor="statement-import-closingBalance">
              <AccountingInput
                id="statement-import-closingBalance"
                name="closingBalance"
                defaultValue={editingBankStatementImport?.closingBalance ?? ""}
              />
            </AccountingField>
            <AccountingField label="Import status" htmlFor="statement-import-importStatus">
              <AccountingSelect
                id="statement-import-importStatus"
                name="importStatus"
                defaultValue={editingBankStatementImport?.importStatus ?? "PENDING_REVIEW"}
              >
                {snapshot.bankStatementImportStatuses.map((status: string) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField
            label="Statement lines JSON"
            htmlFor="statement-import-linesJson"
          >
            <AccountingTextarea
              id="statement-import-linesJson"
              name="linesJson"
              rows={16}
              defaultValue={
                editingBankStatementImport?.linesJson ??
                `[
  {
    "sequenceNumber": 1,
    "lineDate": "2026-07-31",
    "valueDate": "2026-07-31",
    "reference": "BANK-REF-001",
    "description": "Customer receipt",
    "creditAmount": "12500.00",
    "runningBalance": "98500.00"
  }
]`
              }
            />
          </AccountingField>
          <AccountingField
            label="Import exceptions JSON"
            htmlFor="statement-import-importExceptionsJson"
          >
            <AccountingTextarea
              id="statement-import-importExceptionsJson"
              name="importExceptionsJson"
              rows={6}
              defaultValue={editingBankStatementImport?.importExceptionsJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="statement-import-reason">
            <AccountingTextarea id="statement-import-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingBankStatementImport ? "Update import" : "Create import"}
            </AccountingAction>
            {editingBankStatementImport ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear import editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Bank account</th>
              <th>Source file</th>
              <th>Format</th>
              <th>Window</th>
              <th>Status</th>
              <th>Lines</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.bankStatementImports.length === 0 ? (
              <tr>
                <td colSpan={7}>No bank statement imports are recorded yet.</td>
              </tr>
            ) : (
              snapshot.bankStatementImports.map((entry: any) => (
                <tr key={entry.id}>
                  <td>{entry.bankAccountLabel}</td>
                  <td>
                    <div>{entry.sourceFileName}</div>
                    <small>{entry.sourceFileHash}</small>
                  </td>
                  <td>{entry.sourceFormat}</td>
                  <td>
                    {entry.statementStart ?? "Unknown"} → {entry.statementEnd ?? "Unknown"}
                  </td>
                  <td>
                    <AccountingStatus status={entry.importStatus} />
                  </td>
                  <td>{entry.lineCount}</td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editBankStatementImport=${entry.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Statement lines"
        title="Imported statement lines"
        description="Review normalized imported lines, exception flags, and live reconciliation status before creating match records."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Import</th>
              <th>Line</th>
              <th>Reference</th>
              <th>Amount</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.bankStatementLines.length === 0 ? (
              <tr>
                <td colSpan={6}>No statement lines are recorded yet.</td>
              </tr>
            ) : (
              snapshot.bankStatementLines.map((line: any) => (
                <tr key={line.id}>
                  <td>
                    <div>{line.bankAccountLabel}</div>
                    <small>{line.sourceFileName}</small>
                  </td>
                  <td>
                    <div>#{line.sequenceNumber}</div>
                    <small>{line.lineDate}</small>
                  </td>
                  <td>
                    <div>{line.reference ?? "—"}</div>
                    <small>{line.description}</small>
                  </td>
                  <td>{line.debitAmount ?? line.creditAmount ?? "0"}</td>
                  <td>{line.runningBalance ?? "—"}</td>
                  <td>
                    <AccountingStatus status={line.reconciliationStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Reconciliation"
        title="Reconciliation sessions"
        description="Create bank-account statement sessions, preserve balance proof, and explicitly mark balanced versus exception cases."
      >
        <form action={saveReconciliationSession} className="mnx-accounting-form">
          <input
            type="hidden"
            name="reconciliationSessionId"
            value={editingReconciliationSession?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingReconciliationSession?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Bank account" htmlFor="reconciliation-bankAccountId">
              <AccountingSelect
                id="reconciliation-bankAccountId"
                name="bankAccountId"
                defaultValue={editingReconciliationSession?.bankAccountId ?? snapshot.bankAccounts[0]?.id ?? ""}
              >
                {snapshot.bankAccounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.code} — {account.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Statement import" htmlFor="reconciliation-statementImportId">
              <AccountingSelect
                id="reconciliation-statementImportId"
                name="statementImportId"
                defaultValue={editingReconciliationSession?.statementImportId ?? snapshot.bankStatementImports[0]?.id ?? ""}
              >
                {snapshot.bankStatementImports.map((entry: any) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.bankAccountLabel} · {entry.sourceFileName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Period start" htmlFor="reconciliation-periodStart">
              <AccountingInput
                id="reconciliation-periodStart"
                name="periodStart"
                type="date"
                defaultValue={editingReconciliationSession?.periodStart ?? "2026-07-01"}
              />
            </AccountingField>
            <AccountingField label="Period end" htmlFor="reconciliation-periodEnd">
              <AccountingInput
                id="reconciliation-periodEnd"
                name="periodEnd"
                type="date"
                defaultValue={editingReconciliationSession?.periodEnd ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Statement closing balance" htmlFor="reconciliation-statementClosingBalance">
              <AccountingInput
                id="reconciliation-statementClosingBalance"
                name="statementClosingBalance"
                defaultValue={editingReconciliationSession?.statementClosingBalance ?? ""}
              />
            </AccountingField>
            <AccountingField label="Ledger closing balance" htmlFor="reconciliation-ledgerClosingBalance">
              <AccountingInput
                id="reconciliation-ledgerClosingBalance"
                name="ledgerClosingBalance"
                defaultValue={editingReconciliationSession?.ledgerClosingBalance ?? ""}
              />
            </AccountingField>
            <AccountingField label="Status" htmlFor="reconciliation-status">
              <AccountingSelect
                id="reconciliation-status"
                name="status"
                defaultValue={editingReconciliationSession?.status ?? "OPEN"}
              >
                {snapshot.reconciliationSessionStatuses.map((status: string) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Proof JSON" htmlFor="reconciliation-proofJson">
            <AccountingTextarea
              id="reconciliation-proofJson"
              name="proofJson"
              rows={8}
              defaultValue={editingReconciliationSession?.proofJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="reconciliation-reason">
            <AccountingTextarea id="reconciliation-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingReconciliationSession ? "Update session" : "Create session"}
            </AccountingAction>
            {editingReconciliationSession ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear reconciliation editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Bank account</th>
              <th>Statement import</th>
              <th>Period</th>
              <th>Difference</th>
              <th>Status</th>
              <th>Matches</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.reconciliationSessions.length === 0 ? (
              <tr>
                <td colSpan={7}>No reconciliation sessions are recorded yet.</td>
              </tr>
            ) : (
              snapshot.reconciliationSessions.map((session: any) => (
                <tr key={session.id}>
                  <td>{session.bankAccountLabel}</td>
                  <td>{session.statementImportLabel}</td>
                  <td>
                    {session.periodStart} → {session.periodEnd}
                  </td>
                  <td>{session.differenceAmount ?? "Not computed"}</td>
                  <td>
                    <AccountingStatus status={session.status} />
                  </td>
                  <td>{session.matchCount}</td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editReconciliationSession=${session.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Matching"
        title="Controlled bank matches"
        description="Link imported bank lines to posted canonical documents or posted journal entries with explicit matched amounts and confidence evidence."
      >
        <form action={saveBankMatch} className="mnx-accounting-form">
          <input type="hidden" name="bankMatchId" value={editingBankMatch?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingBankMatch?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Session" htmlFor="bank-match-sessionId">
              <AccountingSelect
                id="bank-match-sessionId"
                name="sessionId"
                defaultValue={editingBankMatch?.sessionId ?? snapshot.reconciliationSessions[0]?.id ?? ""}
              >
                {snapshot.reconciliationSessions.map((session: any) => (
                  <option key={session.id} value={session.id}>
                    {session.bankAccountLabel} · {session.statementImportLabel} · {session.periodStart}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Statement line" htmlFor="bank-match-statementLineId">
              <AccountingSelect
                id="bank-match-statementLineId"
                name="statementLineId"
                defaultValue={editingBankMatch?.statementLineId ?? snapshot.bankStatementLines[0]?.id ?? ""}
              >
                {snapshot.bankStatementLines.map((line: any) => (
                  <option key={line.id} value={line.id}>
                    {line.bankAccountLabel} · #{line.sequenceNumber} · {line.reference ?? line.description} · {line.debitAmount ?? line.creditAmount ?? "0"}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Target type" htmlFor="bank-match-targetType">
              <AccountingSelect
                id="bank-match-targetType"
                name="targetType"
                defaultValue={editingBankMatch?.targetType ?? "DOCUMENT"}
              >
                {snapshot.bankMatchTargetTypes.map((type: string) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Target document" htmlFor="bank-match-targetDocumentId">
              <AccountingSelect
                id="bank-match-targetDocumentId"
                name="targetDocumentId"
                defaultValue={editingBankMatch?.targetDocumentId ?? ""}
              >
                <option value="">Not used</option>
                {snapshot.recentDocuments.map((document: any) => (
                  <option key={document.id} value={document.id}>
                    {document.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Target journal entry" htmlFor="bank-match-targetJournalEntryId">
              <AccountingSelect
                id="bank-match-targetJournalEntryId"
                name="targetJournalEntryId"
                defaultValue={editingBankMatch?.targetJournalEntryId ?? ""}
              >
                <option value="">Not used</option>
                {snapshot.recentJournalEntries.map((entry: any) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Matched amount" htmlFor="bank-match-matchedAmount">
              <AccountingInput
                id="bank-match-matchedAmount"
                name="matchedAmount"
                defaultValue={editingBankMatch?.matchedAmount ?? ""}
              />
            </AccountingField>
            <AccountingField label="Confidence score" htmlFor="bank-match-confidenceScore">
              <AccountingInput
                id="bank-match-confidenceScore"
                name="confidenceScore"
                defaultValue={editingBankMatch?.confidenceScore ?? ""}
              />
            </AccountingField>
            <AccountingField label="Reason code" htmlFor="bank-match-reasonCode">
              <AccountingInput
                id="bank-match-reasonCode"
                name="reasonCode"
                defaultValue={editingBankMatch?.reasonCode ?? ""}
              />
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="bank-match-reason">
            <AccountingTextarea id="bank-match-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingBankMatch ? "Update match" : "Create match"}
            </AccountingAction>
            {editingBankMatch ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear match editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Session</th>
              <th>Statement line</th>
              <th>Target</th>
              <th>Matched amount</th>
              <th>Confidence</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.bankMatches.length === 0 ? (
              <tr>
                <td colSpan={6}>No bank matches are recorded yet.</td>
              </tr>
            ) : (
              snapshot.bankMatches.map((match: any) => (
                <tr key={match.id}>
                  <td>{match.sessionLabel}</td>
                  <td>{match.statementLineLabel}</td>
                  <td>
                    {match.targetType === "DOCUMENT"
                      ? match.targetDocumentLabel ?? "Missing document"
                      : match.targetJournalEntryLabel ?? "Missing journal entry"}
                  </td>
                  <td>{match.matchedAmount}</td>
                  <td>{match.confidenceScore ?? "—"}</td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editBankMatch=${match.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Recurring templates"
        title="Canonical recurring templates"
        description="Define versioned recurring source metadata, schedule mode, and generation policy evidence without enabling legacy direct recurring writers."
      >
        <form action={saveRecurringTemplate} className="mnx-accounting-form">
          <input
            type="hidden"
            name="recurringTemplateId"
            value={editingRecurringTemplate?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingRecurringTemplate?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="recurring-template-legalEntityId">
              <AccountingSelect
                id="recurring-template-legalEntityId"
                name="legalEntityId"
                defaultValue={editingRecurringTemplate?.legalEntityId ?? snapshot.legalEntities[0]?.id ?? ""}
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Code" htmlFor="recurring-template-code">
              <AccountingInput
                id="recurring-template-code"
                name="code"
                defaultValue={editingRecurringTemplate?.code ?? ""}
              />
            </AccountingField>
            <AccountingField label="Name" htmlFor="recurring-template-name">
              <AccountingInput
                id="recurring-template-name"
                name="name"
                defaultValue={editingRecurringTemplate?.name ?? ""}
              />
            </AccountingField>
            <AccountingField label="Source type" htmlFor="recurring-template-sourceType">
              <AccountingSelect
                id="recurring-template-sourceType"
                name="sourceType"
                defaultValue={editingRecurringTemplate?.sourceType ?? "RECURRING_EXPENSE"}
              >
                {snapshot.recurringSourceTypes.map((type: string) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Document type" htmlFor="recurring-template-documentType">
              <AccountingSelect
                id="recurring-template-documentType"
                name="documentType"
                defaultValue={editingRecurringTemplate?.documentType ?? "PURCHASE_INVOICE"}
              >
                {snapshot.recurringDocumentTypes.map((type: string) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Version" htmlFor="recurring-template-version">
              <AccountingInput
                id="recurring-template-version"
                name="version"
                type="number"
                min="1"
                defaultValue={editingRecurringTemplate?.version ?? 1}
              />
            </AccountingField>
            <AccountingField label="Schedule mode" htmlFor="recurring-template-scheduleMode">
              <AccountingSelect
                id="recurring-template-scheduleMode"
                name="scheduleMode"
                defaultValue={editingRecurringTemplate?.scheduleMode ?? "FIXED"}
              >
                {snapshot.recurringScheduleModes.map((mode: string) => (
                  <option key={mode} value={mode}>
                    {mode.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Approval mode" htmlFor="recurring-template-approvalMode">
              <AccountingInput
                id="recurring-template-approvalMode"
                name="approvalMode"
                defaultValue={editingRecurringTemplate?.approvalMode ?? ""}
              />
            </AccountingField>
            <AccountingField label="Auto submit" htmlFor="recurring-template-autoSubmit">
              <AccountingSelect
                id="recurring-template-autoSubmit"
                name="autoSubmit"
                defaultValue={editingRecurringTemplate?.autoSubmit ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Active" htmlFor="recurring-template-isActive">
              <AccountingSelect
                id="recurring-template-isActive"
                name="isActive"
                defaultValue={editingRecurringTemplate?.isActive ? "true" : "false"}
              >
                <option value="false">Draft / inactive</option>
                <option value="true">Active</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Effective from" htmlFor="recurring-template-effectiveFrom">
              <AccountingInput
                id="recurring-template-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingRecurringTemplate?.effectiveFrom ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="recurring-template-effectiveTo">
              <AccountingInput
                id="recurring-template-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingRecurringTemplate?.effectiveTo ?? ""}
              />
            </AccountingField>
          </div>
          <AccountingField label="Schedule config JSON" htmlFor="recurring-template-scheduleConfigJson">
            <AccountingTextarea
              id="recurring-template-scheduleConfigJson"
              name="scheduleConfigJson"
              rows={6}
              defaultValue={editingRecurringTemplate?.scheduleConfigJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Generation policy JSON" htmlFor="recurring-template-generationPolicyJson">
            <AccountingTextarea
              id="recurring-template-generationPolicyJson"
              name="generationPolicyJson"
              rows={8}
              defaultValue={editingRecurringTemplate?.generationPolicyJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="recurring-template-reason">
            <AccountingTextarea id="recurring-template-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingRecurringTemplate ? "Update template" : "Create template"}
            </AccountingAction>
            {editingRecurringTemplate ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear template editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Template</th>
              <th>Scope</th>
              <th>Source</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.recurringTemplates.length === 0 ? (
              <tr>
                <td colSpan={6}>No recurring templates are configured yet.</td>
              </tr>
            ) : (
              snapshot.recurringTemplates.map((template: any) => (
                <tr key={template.id}>
                  <td>
                    <div>{template.code}</div>
                    <small>{template.name} · v{template.version}</small>
                  </td>
                  <td>{template.legalEntityLabel}</td>
                  <td>{template.sourceType.replaceAll("_", " ")}</td>
                  <td>{template.scheduleMode.replaceAll("_", " ")}</td>
                  <td>
                    <AccountingStatus status={template.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editRecurringTemplate=${template.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Recurring schedules"
        title="Template schedules"
        description="Maintain next due dates, catch-up behavior, and activation state for canonical recurring templates."
      >
        <form action={saveRecurringSchedule} className="mnx-accounting-form">
          <input
            type="hidden"
            name="recurringScheduleId"
            value={editingRecurringSchedule?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingRecurringSchedule?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Template" htmlFor="recurring-schedule-templateId">
              <AccountingSelect
                id="recurring-schedule-templateId"
                name="templateId"
                defaultValue={editingRecurringSchedule?.templateId ?? snapshot.recurringTemplates[0]?.id ?? ""}
              >
                {snapshot.recurringTemplates.map((template: any) => (
                  <option key={template.id} value={template.id}>
                    {template.code} — {template.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Cadence" htmlFor="recurring-schedule-cadence">
              <AccountingSelect
                id="recurring-schedule-cadence"
                name="cadence"
                defaultValue={editingRecurringSchedule?.cadence ?? "MONTHLY"}
              >
                {snapshot.recurringCadences.map((cadence: string) => (
                  <option key={cadence} value={cadence}>
                    {cadence.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Anchor date" htmlFor="recurring-schedule-anchorDate">
              <AccountingInput
                id="recurring-schedule-anchorDate"
                name="anchorDate"
                type="date"
                defaultValue={editingRecurringSchedule?.anchorDate ?? "2026-08-01"}
              />
            </AccountingField>
            <AccountingField label="Next due date" htmlFor="recurring-schedule-nextDueDate">
              <AccountingInput
                id="recurring-schedule-nextDueDate"
                name="nextDueDate"
                type="date"
                defaultValue={editingRecurringSchedule?.nextDueDate ?? "2026-08-31"}
              />
            </AccountingField>
            <AccountingField label="Last processed due date" htmlFor="recurring-schedule-lastProcessedDueDate">
              <AccountingInput
                id="recurring-schedule-lastProcessedDueDate"
                name="lastProcessedDueDate"
                type="date"
                defaultValue={editingRecurringSchedule?.lastProcessedDueDate ?? ""}
              />
            </AccountingField>
            <AccountingField label="Catch-up mode" htmlFor="recurring-schedule-catchUpMode">
              <AccountingSelect
                id="recurring-schedule-catchUpMode"
                name="catchUpMode"
                defaultValue={editingRecurringSchedule?.catchUpMode ?? "SKIP"}
              >
                {snapshot.recurringCatchUpModes.map((mode: string) => (
                  <option key={mode} value={mode}>
                    {mode.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Active" htmlFor="recurring-schedule-isActive">
              <AccountingSelect
                id="recurring-schedule-isActive"
                name="isActive"
                defaultValue={editingRecurringSchedule?.isActive ? "true" : "false"}
              >
                <option value="false">Inactive</option>
                <option value="true">Active</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Schedule config JSON" htmlFor="recurring-schedule-scheduleConfigJson">
            <AccountingTextarea
              id="recurring-schedule-scheduleConfigJson"
              name="scheduleConfigJson"
              rows={6}
              defaultValue={editingRecurringSchedule?.scheduleConfigJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="recurring-schedule-reason">
            <AccountingTextarea id="recurring-schedule-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingRecurringSchedule ? "Update schedule" : "Create schedule"}
            </AccountingAction>
            {editingRecurringSchedule ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear schedule editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Template</th>
              <th>Cadence</th>
              <th>Next due</th>
              <th>Catch-up</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.recurringSchedules.length === 0 ? (
              <tr>
                <td colSpan={6}>No recurring schedules are configured yet.</td>
              </tr>
            ) : (
              snapshot.recurringSchedules.map((schedule: any) => (
                <tr key={schedule.id}>
                  <td>{schedule.templateLabel}</td>
                  <td>{schedule.cadence}</td>
                  <td>{schedule.nextDueDate}</td>
                  <td>{schedule.catchUpMode}</td>
                  <td>
                    <AccountingStatus status={schedule.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editRecurringSchedule=${schedule.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Recurring runs"
        title="Run register"
        description="Record generated, skipped, failed, and manual-review recurring run outcomes with stable idempotency and result evidence."
      >
        <form action={saveRecurringRun} className="mnx-accounting-form">
          <input type="hidden" name="recurringRunId" value={editingRecurringRun?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingRecurringRun?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Template" htmlFor="recurring-run-templateId">
              <AccountingSelect
                id="recurring-run-templateId"
                name="templateId"
                defaultValue={editingRecurringRun?.templateId ?? snapshot.recurringTemplates[0]?.id ?? ""}
              >
                {snapshot.recurringTemplates.map((template: any) => (
                  <option key={template.id} value={template.id}>
                    {template.code} — {template.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Schedule" htmlFor="recurring-run-scheduleId">
              <AccountingSelect
                id="recurring-run-scheduleId"
                name="scheduleId"
                defaultValue={editingRecurringRun?.scheduleId ?? ""}
              >
                <option value="">Ad hoc / not schedule-bound</option>
                {snapshot.recurringSchedules.map((schedule: any) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.templateLabel} · {schedule.cadence} · {schedule.nextDueDate}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Due date" htmlFor="recurring-run-dueDate">
              <AccountingInput
                id="recurring-run-dueDate"
                name="dueDate"
                type="date"
                defaultValue={editingRecurringRun?.dueDate ?? "2026-08-31"}
              />
            </AccountingField>
            <AccountingField label="Run status" htmlFor="recurring-run-runStatus">
              <AccountingSelect
                id="recurring-run-runStatus"
                name="runStatus"
                defaultValue={editingRecurringRun?.runStatus ?? "PENDING"}
              >
                {snapshot.recurringRunStatuses.map((status: string) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Generated record type" htmlFor="recurring-run-generatedRecordType">
              <AccountingInput
                id="recurring-run-generatedRecordType"
                name="generatedRecordType"
                defaultValue={editingRecurringRun?.generatedRecordType ?? ""}
              />
            </AccountingField>
            <AccountingField label="Generated record id" htmlFor="recurring-run-generatedRecordId">
              <AccountingInput
                id="recurring-run-generatedRecordId"
                name="generatedRecordId"
                defaultValue={editingRecurringRun?.generatedRecordId ?? ""}
              />
            </AccountingField>
            <AccountingField label="Idempotency key" htmlFor="recurring-run-idempotencyKey">
              <AccountingInput
                id="recurring-run-idempotencyKey"
                name="idempotencyKey"
                defaultValue={editingRecurringRun?.idempotencyKey ?? ""}
              />
            </AccountingField>
          </div>
          <AccountingField label="Result JSON" htmlFor="recurring-run-resultJson">
            <AccountingTextarea
              id="recurring-run-resultJson"
              name="resultJson"
              rows={8}
              defaultValue={editingRecurringRun?.resultJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="recurring-run-reason">
            <AccountingTextarea id="recurring-run-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingRecurringRun ? "Update run" : "Create run"}
            </AccountingAction>
            {editingRecurringRun ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear run editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Template</th>
              <th>Schedule</th>
              <th>Due date</th>
              <th>Status</th>
              <th>Generated record</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.recurringRuns.length === 0 ? (
              <tr>
                <td colSpan={6}>No recurring runs are recorded yet.</td>
              </tr>
            ) : (
              snapshot.recurringRuns.map((run: any) => (
                <tr key={run.id}>
                  <td>{run.templateLabel}</td>
                  <td>{run.scheduleLabel}</td>
                  <td>{run.dueDate}</td>
                  <td>
                    <AccountingStatus status={run.runStatus} />
                  </td>
                  <td>
                    {run.generatedRecordType && run.generatedRecordId
                      ? `${run.generatedRecordType} · ${run.generatedRecordId}`
                      : "Not generated"}
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editRecurringRun=${run.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Financial assets"
        title="Canonical financial asset master"
        description="Map AMS/legacy assets into Accounting-owned financial assets with legal-entity scope, capitalization facts, and explicit policy evidence."
      >
        <form action={saveFinancialAsset} className="mnx-accounting-form">
          <input type="hidden" name="financialAssetId" value={editingFinancialAsset?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingFinancialAsset?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="financial-asset-legalEntityId">
              <AccountingSelect
                id="financial-asset-legalEntityId"
                name="legalEntityId"
                defaultValue={editingFinancialAsset?.legalEntityId ?? snapshot.legalEntities[0]?.id ?? ""}
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Legacy asset" htmlFor="financial-asset-legacyAssetId">
              <AccountingSelect
                id="financial-asset-legacyAssetId"
                name="legacyAssetId"
                defaultValue={editingFinancialAsset?.legacyAssetId ?? snapshot.legacyAssets[0]?.id ?? ""}
              >
                {snapshot.legacyAssets.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Asset code" htmlFor="financial-asset-assetCode">
              <AccountingInput
                id="financial-asset-assetCode"
                name="assetCode"
                defaultValue={editingFinancialAsset?.assetCode ?? ""}
              />
            </AccountingField>
            <AccountingField label="Asset name" htmlFor="financial-asset-assetName">
              <AccountingInput
                id="financial-asset-assetName"
                name="assetName"
                defaultValue={editingFinancialAsset?.assetName ?? ""}
              />
            </AccountingField>
            <AccountingField label="Capitalization date" htmlFor="financial-asset-capitalizationDate">
              <AccountingInput
                id="financial-asset-capitalizationDate"
                name="capitalizationDate"
                type="date"
                defaultValue={editingFinancialAsset?.capitalizationDate ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Capitalization amount" htmlFor="financial-asset-capitalizationAmount">
              <AccountingInput
                id="financial-asset-capitalizationAmount"
                name="capitalizationAmount"
                defaultValue={editingFinancialAsset?.capitalizationAmount ?? ""}
              />
            </AccountingField>
            <AccountingField label="Salvage value" htmlFor="financial-asset-salvageValue">
              <AccountingInput
                id="financial-asset-salvageValue"
                name="salvageValue"
                defaultValue={editingFinancialAsset?.salvageValue ?? ""}
              />
            </AccountingField>
            <AccountingField label="Useful life (months)" htmlFor="financial-asset-usefulLifeMonths">
              <AccountingInput
                id="financial-asset-usefulLifeMonths"
                name="usefulLifeMonths"
                type="number"
                min="0"
                defaultValue={editingFinancialAsset?.usefulLifeMonths ?? ""}
              />
            </AccountingField>
            <AccountingField label="Source asset version" htmlFor="financial-asset-sourceAssetVersion">
              <AccountingInput
                id="financial-asset-sourceAssetVersion"
                name="sourceAssetVersion"
                type="number"
                min="0"
                defaultValue={editingFinancialAsset?.sourceAssetVersion ?? ""}
              />
            </AccountingField>
            <AccountingField label="Status" htmlFor="financial-asset-status">
              <AccountingSelect
                id="financial-asset-status"
                name="status"
                defaultValue={editingFinancialAsset?.status ?? "ACTIVE"}
              >
                {snapshot.financialAssetStatuses.map((status: string) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Policy JSON" htmlFor="financial-asset-policyJson">
            <AccountingTextarea
              id="financial-asset-policyJson"
              name="policyJson"
              rows={8}
              defaultValue={editingFinancialAsset?.policyJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="financial-asset-reason">
            <AccountingTextarea id="financial-asset-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingFinancialAsset ? "Update financial asset" : "Create financial asset"}
            </AccountingAction>
            {editingFinancialAsset ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear financial-asset editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Legacy source</th>
              <th>Scope</th>
              <th>Capitalized</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.financialAssets.length === 0 ? (
              <tr>
                <td colSpan={6}>No financial assets are configured yet.</td>
              </tr>
            ) : (
              snapshot.financialAssets.map((asset: any) => (
                <tr key={asset.id}>
                  <td>
                    <div>{asset.assetCode}</div>
                    <small>{asset.assetName}</small>
                  </td>
                  <td>{asset.legacyAssetLabel}</td>
                  <td>{asset.legalEntityLabel}</td>
                  <td>{asset.capitalizationAmount}</td>
                  <td>
                    <AccountingStatus status={asset.status} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editFinancialAsset=${asset.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Asset books"
        title="Depreciation books"
        description="Maintain book-specific depreciation methods, accounts, carrying values, and effective policy controls for each financial asset."
      >
        <form action={saveAssetBook} className="mnx-accounting-form">
          <input type="hidden" name="assetBookId" value={editingAssetBook?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingAssetBook?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="asset-book-legalEntityId">
              <AccountingSelect
                id="asset-book-legalEntityId"
                name="legalEntityId"
                defaultValue={editingAssetBook?.legalEntityId ?? snapshot.legalEntities[0]?.id ?? ""}
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Financial asset" htmlFor="asset-book-financialAssetId">
              <AccountingSelect
                id="asset-book-financialAssetId"
                name="financialAssetId"
                defaultValue={editingAssetBook?.financialAssetId ?? snapshot.financialAssets[0]?.id ?? ""}
              >
                {snapshot.financialAssets.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.assetCode} — {asset.assetName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Book code" htmlFor="asset-book-bookCode">
              <AccountingInput
                id="asset-book-bookCode"
                name="bookCode"
                defaultValue={editingAssetBook?.bookCode ?? ""}
              />
            </AccountingField>
            <AccountingField label="Book type" htmlFor="asset-book-bookType">
              <AccountingSelect
                id="asset-book-bookType"
                name="bookType"
                defaultValue={editingAssetBook?.bookType ?? "COMPANIES_ACT"}
              >
                {snapshot.assetBookTypes.map((type: string) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Depreciation method" htmlFor="asset-book-depreciationMethod">
              <AccountingSelect
                id="asset-book-depreciationMethod"
                name="depreciationMethod"
                defaultValue={editingAssetBook?.depreciationMethod ?? "STRAIGHT_LINE"}
              >
                {snapshot.assetDepreciationMethods.map((method: string) => (
                  <option key={method} value={method}>
                    {method.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Depreciation rate" htmlFor="asset-book-depreciationRate">
              <AccountingInput
                id="asset-book-depreciationRate"
                name="depreciationRate"
                defaultValue={editingAssetBook?.depreciationRate ?? ""}
              />
            </AccountingField>
            <AccountingField label="Useful life (months)" htmlFor="asset-book-usefulLifeMonths">
              <AccountingInput
                id="asset-book-usefulLifeMonths"
                name="usefulLifeMonths"
                type="number"
                min="0"
                defaultValue={editingAssetBook?.usefulLifeMonths ?? ""}
              />
            </AccountingField>
            <AccountingField label="Capitalization amount" htmlFor="asset-book-capitalizationAmount">
              <AccountingInput
                id="asset-book-capitalizationAmount"
                name="capitalizationAmount"
                defaultValue={editingAssetBook?.capitalizationAmount ?? ""}
              />
            </AccountingField>
            <AccountingField label="Salvage value" htmlFor="asset-book-salvageValue">
              <AccountingInput
                id="asset-book-salvageValue"
                name="salvageValue"
                defaultValue={editingAssetBook?.salvageValue ?? ""}
              />
            </AccountingField>
            <AccountingField label="Accumulated depreciation" htmlFor="asset-book-accumulatedDepreciation">
              <AccountingInput
                id="asset-book-accumulatedDepreciation"
                name="accumulatedDepreciation"
                defaultValue={editingAssetBook?.accumulatedDepreciation ?? "0"}
              />
            </AccountingField>
            <AccountingField label="Net book value" htmlFor="asset-book-netBookValue">
              <AccountingInput
                id="asset-book-netBookValue"
                name="netBookValue"
                defaultValue={editingAssetBook?.netBookValue ?? ""}
              />
            </AccountingField>
            <AccountingField label="Asset account" htmlFor="asset-book-assetAccountId">
              <AccountingSelect
                id="asset-book-assetAccountId"
                name="assetAccountId"
                defaultValue={editingAssetBook?.assetAccountId ?? ""}
              >
                <option value="">Not assigned</option>
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Depreciation expense account" htmlFor="asset-book-depreciationExpenseAccountId">
              <AccountingSelect
                id="asset-book-depreciationExpenseAccountId"
                name="depreciationExpenseAccountId"
                defaultValue={editingAssetBook?.depreciationExpenseAccountId ?? ""}
              >
                <option value="">Not assigned</option>
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Accumulated depreciation account" htmlFor="asset-book-accumulatedDepAccountId">
              <AccountingSelect
                id="asset-book-accumulatedDepAccountId"
                name="accumulatedDepAccountId"
                defaultValue={editingAssetBook?.accumulatedDepAccountId ?? ""}
              >
                <option value="">Not assigned</option>
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Effective from" htmlFor="asset-book-effectiveFrom">
              <AccountingInput
                id="asset-book-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingAssetBook?.effectiveFrom ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="asset-book-effectiveTo">
              <AccountingInput
                id="asset-book-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingAssetBook?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Active" htmlFor="asset-book-isActive">
              <AccountingSelect
                id="asset-book-isActive"
                name="isActive"
                defaultValue={editingAssetBook?.isActive ? "true" : "false"}
              >
                <option value="false">Inactive</option>
                <option value="true">Active</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Policy JSON" htmlFor="asset-book-policyJson">
            <AccountingTextarea
              id="asset-book-policyJson"
              name="policyJson"
              rows={8}
              defaultValue={editingAssetBook?.policyJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="asset-book-reason">
            <AccountingTextarea id="asset-book-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingAssetBook ? "Update asset book" : "Create asset book"}
            </AccountingAction>
            {editingAssetBook ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear asset-book editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Book</th>
              <th>Asset</th>
              <th>Method</th>
              <th>NBV</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.assetBooks.length === 0 ? (
              <tr>
                <td colSpan={6}>No asset books are configured yet.</td>
              </tr>
            ) : (
              snapshot.assetBooks.map((book: any) => (
                <tr key={book.id}>
                  <td>
                    <div>{book.bookCode}</div>
                    <small>{book.bookType.replaceAll("_", " ")}</small>
                  </td>
                  <td>{book.financialAssetLabel}</td>
                  <td>{book.depreciationMethod.replaceAll("_", " ")}</td>
                  <td>{book.netBookValue}</td>
                  <td>
                    <AccountingStatus status={book.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editAssetBook=${book.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Depreciation runs"
        title="Depreciation run evidence"
        description="Register approved depreciation run outcomes, resulting carrying values, and any canonical journal lineage without enabling legacy direct posting."
      >
        <form action={saveDepreciationRun} className="mnx-accounting-form">
          <input type="hidden" name="depreciationRunId" value={editingDepreciationRun?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingDepreciationRun?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="depreciation-run-legalEntityId">
              <AccountingSelect
                id="depreciation-run-legalEntityId"
                name="legalEntityId"
                defaultValue={editingDepreciationRun?.legalEntityId ?? snapshot.legalEntities[0]?.id ?? ""}
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Asset book" htmlFor="depreciation-run-assetBookId">
              <AccountingSelect
                id="depreciation-run-assetBookId"
                name="assetBookId"
                defaultValue={editingDepreciationRun?.assetBookId ?? snapshot.assetBooks[0]?.id ?? ""}
              >
                {snapshot.assetBooks.map((book: any) => (
                  <option key={book.id} value={book.id}>
                    {book.financialAssetLabel} · {book.bookCode}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Period start" htmlFor="depreciation-run-periodStart">
              <AccountingInput
                id="depreciation-run-periodStart"
                name="periodStart"
                type="date"
                defaultValue={editingDepreciationRun?.periodStart ?? "2026-07-01"}
              />
            </AccountingField>
            <AccountingField label="Period end" htmlFor="depreciation-run-periodEnd">
              <AccountingInput
                id="depreciation-run-periodEnd"
                name="periodEnd"
                type="date"
                defaultValue={editingDepreciationRun?.periodEnd ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Depreciation date" htmlFor="depreciation-run-depreciationDate">
              <AccountingInput
                id="depreciation-run-depreciationDate"
                name="depreciationDate"
                type="date"
                defaultValue={editingDepreciationRun?.depreciationDate ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Depreciation amount" htmlFor="depreciation-run-depreciationAmount">
              <AccountingInput
                id="depreciation-run-depreciationAmount"
                name="depreciationAmount"
                defaultValue={editingDepreciationRun?.depreciationAmount ?? ""}
              />
            </AccountingField>
            <AccountingField label="Accumulated after" htmlFor="depreciation-run-accumulatedAfter">
              <AccountingInput
                id="depreciation-run-accumulatedAfter"
                name="accumulatedAfter"
                defaultValue={editingDepreciationRun?.accumulatedAfter ?? ""}
              />
            </AccountingField>
            <AccountingField label="Net book value after" htmlFor="depreciation-run-netBookValueAfter">
              <AccountingInput
                id="depreciation-run-netBookValueAfter"
                name="netBookValueAfter"
                defaultValue={editingDepreciationRun?.netBookValueAfter ?? ""}
              />
            </AccountingField>
            <AccountingField label="Run status" htmlFor="depreciation-run-runStatus">
              <AccountingSelect
                id="depreciation-run-runStatus"
                name="runStatus"
                defaultValue={editingDepreciationRun?.runStatus ?? "PENDING"}
              >
                {snapshot.depreciationRunStatuses.map((status: string) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Journal entry" htmlFor="depreciation-run-journalEntryId">
              <AccountingSelect
                id="depreciation-run-journalEntryId"
                name="journalEntryId"
                defaultValue={editingDepreciationRun?.journalEntryId ?? ""}
              >
                <option value="">Not linked</option>
                {snapshot.recentJournalEntries.map((entry: any) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Idempotency key" htmlFor="depreciation-run-idempotencyKey">
              <AccountingInput
                id="depreciation-run-idempotencyKey"
                name="idempotencyKey"
                defaultValue={editingDepreciationRun?.idempotencyKey ?? ""}
              />
            </AccountingField>
          </div>
          <AccountingField label="Policy snapshot JSON" htmlFor="depreciation-run-policySnapshotJson">
            <AccountingTextarea
              id="depreciation-run-policySnapshotJson"
              name="policySnapshotJson"
              rows={8}
              defaultValue={editingDepreciationRun?.policySnapshotJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="depreciation-run-reason">
            <AccountingTextarea id="depreciation-run-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingDepreciationRun ? "Update depreciation run" : "Create depreciation run"}
            </AccountingAction>
            {editingDepreciationRun ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear depreciation-run editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Asset book</th>
              <th>Period</th>
              <th>Amount</th>
              <th>NBV after</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.depreciationRuns.length === 0 ? (
              <tr>
                <td colSpan={6}>No depreciation runs are recorded yet.</td>
              </tr>
            ) : (
              snapshot.depreciationRuns.map((run: any) => (
                <tr key={run.id}>
                  <td>{run.assetBookLabel}</td>
                  <td>
                    {run.periodStart} → {run.periodEnd}
                  </td>
                  <td>{run.depreciationAmount}</td>
                  <td>{run.netBookValueAfter}</td>
                  <td>
                    <AccountingStatus status={run.runStatus} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editDepreciationRun=${run.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Partners"
        title="Canonical partner master"
        description="Map legacy partner accounts into Accounting-owned partner masters with legal-entity scope, control-account mapping, and policy evidence."
      >
        <form action={savePartner} className="mnx-accounting-form">
          <input type="hidden" name="partnerId" value={editingPartner?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingPartner?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="partner-legalEntityId">
              <AccountingSelect
                id="partner-legalEntityId"
                name="legalEntityId"
                defaultValue={editingPartner?.legalEntityId ?? snapshot.legalEntities[0]?.id ?? ""}
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Legacy partner" htmlFor="partner-legacyPartnerId">
              <AccountingSelect
                id="partner-legacyPartnerId"
                name="legacyPartnerId"
                defaultValue={editingPartner?.legacyPartnerId ?? snapshot.legacyPartners[0]?.id ?? ""}
              >
                {snapshot.legacyPartners.map((partner: any) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Partner code" htmlFor="partner-partnerCode">
              <AccountingInput
                id="partner-partnerCode"
                name="partnerCode"
                defaultValue={editingPartner?.partnerCode ?? ""}
              />
            </AccountingField>
            <AccountingField label="Partner name" htmlFor="partner-partnerName">
              <AccountingInput
                id="partner-partnerName"
                name="partnerName"
                defaultValue={editingPartner?.partnerName ?? ""}
              />
            </AccountingField>
            <AccountingField label="Capital account" htmlFor="partner-capitalAccountId">
              <AccountingSelect
                id="partner-capitalAccountId"
                name="capitalAccountId"
                defaultValue={editingPartner?.capitalAccountId ?? ""}
              >
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Current account" htmlFor="partner-currentAccountId">
              <AccountingSelect
                id="partner-currentAccountId"
                name="currentAccountId"
                defaultValue={editingPartner?.currentAccountId ?? ""}
              >
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Drawings account" htmlFor="partner-drawingsAccountId">
              <AccountingSelect
                id="partner-drawingsAccountId"
                name="drawingsAccountId"
                defaultValue={editingPartner?.drawingsAccountId ?? ""}
              >
                <option value="">Not assigned</option>
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Status" htmlFor="partner-status">
              <AccountingSelect
                id="partner-status"
                name="status"
                defaultValue={editingPartner?.status ?? "ACTIVE"}
              >
                {snapshot.partnerStatuses.map((status: string) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Policy JSON" htmlFor="partner-policyJson">
            <AccountingTextarea
              id="partner-policyJson"
              name="policyJson"
              rows={8}
              defaultValue={editingPartner?.policyJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="partner-reason">
            <AccountingTextarea id="partner-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingPartner ? "Update partner" : "Create partner"}
            </AccountingAction>
            {editingPartner ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear partner editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Partner</th>
              <th>Legacy source</th>
              <th>Scope</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.partners.length === 0 ? (
              <tr>
                <td colSpan={5}>No canonical partners are configured yet.</td>
              </tr>
            ) : (
              snapshot.partners.map((partner: any) => (
                <tr key={partner.id}>
                  <td>
                    <div>{partner.partnerCode}</div>
                    <small>{partner.partnerName}</small>
                  </td>
                  <td>{partner.legacyPartnerLabel}</td>
                  <td>{partner.legalEntityLabel}</td>
                  <td>
                    <AccountingStatus status={partner.status} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editPartner=${partner.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Partner terms"
        title="Effective-dated partner terms"
        description="Maintain CA-approved profit sharing, salary, and interest terms with explicit effective dates and ledger mappings."
      >
        <form action={savePartnerTerm} className="mnx-accounting-form">
          <input type="hidden" name="partnerTermId" value={editingPartnerTerm?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingPartnerTerm?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="partner-term-legalEntityId">
              <AccountingSelect
                id="partner-term-legalEntityId"
                name="legalEntityId"
                defaultValue={editingPartnerTerm?.legalEntityId ?? snapshot.legalEntities[0]?.id ?? ""}
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Partner" htmlFor="partner-term-partnerId">
              <AccountingSelect
                id="partner-term-partnerId"
                name="partnerId"
                defaultValue={editingPartnerTerm?.partnerId ?? snapshot.partners[0]?.id ?? ""}
              >
                {snapshot.partners.map((partner: any) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.partnerCode} — {partner.partnerName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Version" htmlFor="partner-term-version">
              <AccountingInput
                id="partner-term-version"
                name="version"
                type="number"
                min="1"
                defaultValue={editingPartnerTerm?.version ?? 1}
              />
            </AccountingField>
            <AccountingField label="Profit-sharing ratio" htmlFor="partner-term-profitSharingRatio">
              <AccountingInput
                id="partner-term-profitSharingRatio"
                name="profitSharingRatio"
                defaultValue={editingPartnerTerm?.profitSharingRatio ?? ""}
              />
            </AccountingField>
            <AccountingField label="Interest on capital rate" htmlFor="partner-term-interestOnCapitalRate">
              <AccountingInput
                id="partner-term-interestOnCapitalRate"
                name="interestOnCapitalRate"
                defaultValue={editingPartnerTerm?.interestOnCapitalRate ?? ""}
              />
            </AccountingField>
            <AccountingField label="Interest on drawings rate" htmlFor="partner-term-interestOnDrawingsRate">
              <AccountingInput
                id="partner-term-interestOnDrawingsRate"
                name="interestOnDrawingsRate"
                defaultValue={editingPartnerTerm?.interestOnDrawingsRate ?? ""}
              />
            </AccountingField>
            <AccountingField label="Salary amount" htmlFor="partner-term-salaryAmount">
              <AccountingInput
                id="partner-term-salaryAmount"
                name="salaryAmount"
                defaultValue={editingPartnerTerm?.salaryAmount ?? ""}
              />
            </AccountingField>
            <AccountingField label="Salary expense account" htmlFor="partner-term-salaryExpenseAccountId">
              <AccountingSelect
                id="partner-term-salaryExpenseAccountId"
                name="salaryExpenseAccountId"
                defaultValue={editingPartnerTerm?.salaryExpenseAccountId ?? ""}
              >
                <option value="">Not assigned</option>
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Interest expense account" htmlFor="partner-term-interestExpenseAccountId">
              <AccountingSelect
                id="partner-term-interestExpenseAccountId"
                name="interestExpenseAccountId"
                defaultValue={editingPartnerTerm?.interestExpenseAccountId ?? ""}
              >
                <option value="">Not assigned</option>
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Interest income account" htmlFor="partner-term-interestIncomeAccountId">
              <AccountingSelect
                id="partner-term-interestIncomeAccountId"
                name="interestIncomeAccountId"
                defaultValue={editingPartnerTerm?.interestIncomeAccountId ?? ""}
              >
                <option value="">Not assigned</option>
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="CA approved" htmlFor="partner-term-approvedByCA">
              <AccountingSelect
                id="partner-term-approvedByCA"
                name="approvedByCA"
                defaultValue={editingPartnerTerm?.approvedByCA ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Effective from" htmlFor="partner-term-effectiveFrom">
              <AccountingInput
                id="partner-term-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingPartnerTerm?.effectiveFrom ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="partner-term-effectiveTo">
              <AccountingInput
                id="partner-term-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingPartnerTerm?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Active" htmlFor="partner-term-isActive">
              <AccountingSelect
                id="partner-term-isActive"
                name="isActive"
                defaultValue={editingPartnerTerm?.isActive ? "true" : "false"}
              >
                <option value="false">Inactive</option>
                <option value="true">Active</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="partner-term-configurationJson">
            <AccountingTextarea
              id="partner-term-configurationJson"
              name="configurationJson"
              rows={8}
              defaultValue={editingPartnerTerm?.configurationJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="partner-term-reason">
            <AccountingTextarea id="partner-term-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingPartnerTerm ? "Update partner term" : "Create partner term"}
            </AccountingAction>
            {editingPartnerTerm ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear partner-term editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Partner</th>
              <th>Version</th>
              <th>Effective window</th>
              <th>Profit share</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.partnerTerms.length === 0 ? (
              <tr>
                <td colSpan={6}>No partner terms are configured yet.</td>
              </tr>
            ) : (
              snapshot.partnerTerms.map((term: any) => (
                <tr key={term.id}>
                  <td>{term.partnerLabel}</td>
                  <td>v{term.version}</td>
                  <td>
                    {term.effectiveFrom} → {term.effectiveTo ?? "Open"}
                  </td>
                  <td>{term.profitSharingRatio}</td>
                  <td>
                    <AccountingStatus
                      status={term.isActive ? (term.approvedByCA ? "ACTIVE_VALIDATED" : "ACTIVE_UNVALIDATED") : "INACTIVE"}
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editPartnerTerm=${term.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Appropriations"
        title="Partner appropriation register"
        description="Capture canonical partner appropriations with effective term linkage, period coverage, idempotency, and optional journal lineage while legacy posting stays fail-closed."
      >
        <form action={saveAppropriation} className="mnx-accounting-form">
          <input type="hidden" name="appropriationId" value={editingAppropriation?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingAppropriation?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="appropriation-legalEntityId">
              <AccountingSelect
                id="appropriation-legalEntityId"
                name="legalEntityId"
                defaultValue={editingAppropriation?.legalEntityId ?? snapshot.legalEntities[0]?.id ?? ""}
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Partner" htmlFor="appropriation-partnerId">
              <AccountingSelect
                id="appropriation-partnerId"
                name="partnerId"
                defaultValue={editingAppropriation?.partnerId ?? snapshot.partners[0]?.id ?? ""}
              >
                {snapshot.partners.map((partner: any) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.partnerCode} — {partner.partnerName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Partner term" htmlFor="appropriation-termId">
              <AccountingSelect
                id="appropriation-termId"
                name="termId"
                defaultValue={editingAppropriation?.termId ?? snapshot.partnerTerms[0]?.id ?? ""}
              >
                {snapshot.partnerTerms.map((term: any) => (
                  <option key={term.id} value={term.id}>
                    {term.partnerLabel} · v{term.version}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Appropriation type" htmlFor="appropriation-appropriationType">
              <AccountingSelect
                id="appropriation-appropriationType"
                name="appropriationType"
                defaultValue={editingAppropriation?.appropriationType ?? "PROFIT_SHARE"}
              >
                {snapshot.appropriationTypes.map((type: string) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Period start" htmlFor="appropriation-periodStart">
              <AccountingInput
                id="appropriation-periodStart"
                name="periodStart"
                type="date"
                defaultValue={editingAppropriation?.periodStart ?? "2026-07-01"}
              />
            </AccountingField>
            <AccountingField label="Period end" htmlFor="appropriation-periodEnd">
              <AccountingInput
                id="appropriation-periodEnd"
                name="periodEnd"
                type="date"
                defaultValue={editingAppropriation?.periodEnd ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Amount" htmlFor="appropriation-amount">
              <AccountingInput
                id="appropriation-amount"
                name="amount"
                defaultValue={editingAppropriation?.amount ?? ""}
              />
            </AccountingField>
            <AccountingField label="Status" htmlFor="appropriation-status">
              <AccountingSelect
                id="appropriation-status"
                name="status"
                defaultValue={editingAppropriation?.status ?? "DRAFT"}
              >
                {snapshot.appropriationStatuses.map((status: string) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Journal entry" htmlFor="appropriation-journalEntryId">
              <AccountingSelect
                id="appropriation-journalEntryId"
                name="journalEntryId"
                defaultValue={editingAppropriation?.journalEntryId ?? ""}
              >
                <option value="">Not linked</option>
                {snapshot.recentJournalEntries.map((entry: any) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Idempotency key" htmlFor="appropriation-idempotencyKey">
              <AccountingInput
                id="appropriation-idempotencyKey"
                name="idempotencyKey"
                defaultValue={editingAppropriation?.idempotencyKey ?? ""}
              />
            </AccountingField>
          </div>
          <AccountingField label="Basis JSON" htmlFor="appropriation-basisJson">
            <AccountingTextarea
              id="appropriation-basisJson"
              name="basisJson"
              rows={8}
              defaultValue={editingAppropriation?.basisJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="appropriation-reason">
            <AccountingTextarea id="appropriation-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingAppropriation ? "Update appropriation" : "Create appropriation"}
            </AccountingAction>
            {editingAppropriation ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear appropriation editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Partner</th>
              <th>Type</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.appropriations.length === 0 ? (
              <tr>
                <td colSpan={6}>No appropriations are recorded yet.</td>
              </tr>
            ) : (
              snapshot.appropriations.map((entry: any) => (
                <tr key={entry.id}>
                  <td>{entry.partnerLabel}</td>
                  <td>{entry.appropriationType.replaceAll("_", " ")}</td>
                  <td>
                    {entry.periodStart} → {entry.periodEnd}
                  </td>
                  <td>{entry.amount}</td>
                  <td>
                    <AccountingStatus status={entry.status} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editAppropriation=${entry.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingBudget ? "Edit budget" : "New budget"}
        title="Budget scenarios and versions"
        description="Maintain canonical management budgets by legal entity, fiscal year, scenario, and version. Activating a version only changes the active planning version for that scope; it does not write journals."
      >
        <form action={saveBudget} className="mnx-accounting-form">
          <input type="hidden" name="budgetId" value={editingBudget?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingBudget?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="budget-legalEntityId">
              <AccountingSelect
                id="budget-legalEntityId"
                name="legalEntityId"
                defaultValue={editingBudget?.legalEntityId ?? snapshot.legalEntities[0]?.id ?? ""}
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Fiscal year" htmlFor="budget-fiscalYearId">
              <AccountingSelect
                id="budget-fiscalYearId"
                name="fiscalYearId"
                defaultValue={editingBudget?.fiscalYearId ?? snapshot.fiscalYears[0]?.id ?? ""}
              >
                {snapshot.fiscalYears.map((year: any) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Scenario" htmlFor="budget-scenarioCode">
              <AccountingSelect
                id="budget-scenarioCode"
                name="scenarioCode"
                defaultValue={editingBudget?.scenarioCode ?? "BASE"}
              >
                {snapshot.budgetScenarioCodes.map((scenario: string) => (
                  <option key={scenario} value={scenario}>
                    {scenario.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Budget name" htmlFor="budget-name">
              <AccountingInput
                id="budget-name"
                name="name"
                defaultValue={editingBudget?.name ?? ""}
              />
            </AccountingField>
            <AccountingField label="Version" htmlFor="budget-version">
              <AccountingInput
                id="budget-version"
                name="version"
                type="number"
                min="1"
                defaultValue={editingBudget?.version ?? 1}
              />
            </AccountingField>
            <AccountingField label="Currency" htmlFor="budget-currencyCode">
              <AccountingSelect
                id="budget-currencyCode"
                name="currencyCode"
                defaultValue={
                  editingBudget?.currencyCode ??
                  snapshot.profile?.functionalCurrencyCode ??
                  snapshot.currencies[0]?.code ??
                  "INR"
                }
              >
                {snapshot.currencies.map((currency: any) => (
                  <option key={currency.id} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Period granularity" htmlFor="budget-periodGranularity">
              <AccountingSelect
                id="budget-periodGranularity"
                name="periodGranularity"
                defaultValue={editingBudget?.periodGranularity ?? "MONTHLY"}
              >
                {snapshot.budgetPeriodGranularities.map((value: string) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Effective from" htmlFor="budget-effectiveFrom">
              <AccountingInput
                id="budget-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingBudget?.effectiveFrom ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="budget-effectiveTo">
              <AccountingInput
                id="budget-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingBudget?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Management approved" htmlFor="budget-approvedByMgmt">
              <AccountingSelect
                id="budget-approvedByMgmt"
                name="approvedByMgmt"
                defaultValue={editingBudget?.approvedByMgmt ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Active version" htmlFor="budget-isActive">
              <AccountingSelect
                id="budget-isActive"
                name="isActive"
                defaultValue={editingBudget?.isActive ? "true" : "false"}
              >
                <option value="false">Inactive</option>
                <option value="true">Active</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="budget-configurationJson">
            <AccountingTextarea
              id="budget-configurationJson"
              name="configurationJson"
              rows={8}
              defaultValue={editingBudget?.configurationJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="budget-reason">
            <AccountingTextarea id="budget-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingBudget ? "Update budget" : "Create budget"}
            </AccountingAction>
            {editingBudget ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear budget editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Budget</th>
              <th>Scope</th>
              <th>Version</th>
              <th>Window</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.budgets.length === 0 ? (
              <tr>
                <td colSpan={6}>No budgets are configured yet.</td>
              </tr>
            ) : (
              snapshot.budgets.map((budget: any) => (
                <tr key={budget.id}>
                  <td>
                    {budget.name}
                    <small>{budget.scenarioCode.replaceAll("_", " ")}</small>
                  </td>
                  <td>
                    {budget.legalEntityLabel}
                    <small>{budget.fiscalYearLabel}</small>
                  </td>
                  <td>
                    v{budget.version}
                    <small>{budget.lineCount} lines</small>
                  </td>
                  <td>
                    {budget.effectiveFrom} → {budget.effectiveTo ?? "Open"}
                  </td>
                  <td>
                    <AccountingStatus
                      status={
                        budget.isActive
                          ? budget.approvedByMgmt
                            ? "ACTIVE_APPROVED"
                            : "ACTIVE_DRAFT"
                          : budget.approvedByMgmt
                            ? "INACTIVE_APPROVED"
                            : "INACTIVE"
                      }
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editBudget=${budget.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingBudgetLine ? "Edit budget line" : "New budget line"}
        title="Budget line register"
        description="Capture periodized account and optional dimension budgets against a selected header. These lines stay planning-only and never post by themselves."
      >
        <form action={saveBudgetLine} className="mnx-accounting-form">
          <input
            type="hidden"
            name="budgetLineId"
            value={editingBudgetLine?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingBudgetLine?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Budget header" htmlFor="budget-line-budgetId">
              <AccountingSelect
                id="budget-line-budgetId"
                name="budgetId"
                defaultValue={editingBudgetLine?.budgetId ?? snapshot.budgets[0]?.id ?? ""}
              >
                {snapshot.budgets.map((budget: any) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name} · {budget.scenarioCode} · v{budget.version}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Legal entity" htmlFor="budget-line-legalEntityId">
              <AccountingSelect
                id="budget-line-legalEntityId"
                name="legalEntityId"
                defaultValue={
                  editingBudgetLine?.legalEntityId ??
                  editingBudget?.legalEntityId ??
                  snapshot.budgets[0]?.legalEntityId ??
                  snapshot.legalEntities[0]?.id ??
                  ""
                }
              >
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Line number" htmlFor="budget-line-lineNumber">
              <AccountingInput
                id="budget-line-lineNumber"
                name="lineNumber"
                type="number"
                min="1"
                defaultValue={editingBudgetLine?.lineNumber ?? 1}
              />
            </AccountingField>
            <AccountingField label="Period start" htmlFor="budget-line-periodStart">
              <AccountingInput
                id="budget-line-periodStart"
                name="periodStart"
                type="date"
                defaultValue={editingBudgetLine?.periodStart ?? "2026-07-01"}
              />
            </AccountingField>
            <AccountingField label="Period end" htmlFor="budget-line-periodEnd">
              <AccountingInput
                id="budget-line-periodEnd"
                name="periodEnd"
                type="date"
                defaultValue={editingBudgetLine?.periodEnd ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Account" htmlFor="budget-line-accountId">
              <AccountingSelect
                id="budget-line-accountId"
                name="accountId"
                defaultValue={editingBudgetLine?.accountId ?? snapshot.accounts[0]?.id ?? ""}
              >
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Dimension value" htmlFor="budget-line-dimensionValueId">
              <AccountingSelect
                id="budget-line-dimensionValueId"
                name="dimensionValueId"
                defaultValue={editingBudgetLine?.dimensionValueId ?? ""}
              >
                <option value="">Not assigned</option>
                {allDimensionValues.map((value: any) => (
                  <option key={value.id} value={value.id}>
                    {value.definitionCode} · {value.code} — {value.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Amount" htmlFor="budget-line-amount">
              <AccountingInput
                id="budget-line-amount"
                name="amount"
                defaultValue={editingBudgetLine?.amount ?? ""}
              />
            </AccountingField>
            <AccountingField label="Quantity" htmlFor="budget-line-quantity">
              <AccountingInput
                id="budget-line-quantity"
                name="quantity"
                defaultValue={editingBudgetLine?.quantity ?? ""}
              />
            </AccountingField>
          </div>
          <AccountingField label="Assumptions JSON" htmlFor="budget-line-assumptionsJson">
            <AccountingTextarea
              id="budget-line-assumptionsJson"
              name="assumptionsJson"
              rows={8}
              defaultValue={editingBudgetLine?.assumptionsJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="budget-line-reason">
            <AccountingTextarea id="budget-line-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingBudgetLine ? "Update budget line" : "Create budget line"}
            </AccountingAction>
            {editingBudgetLine ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear budget-line editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Budget</th>
              <th>Line</th>
              <th>Period</th>
              <th>Account / dimension</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.budgetLines.length === 0 ? (
              <tr>
                <td colSpan={6}>No budget lines are configured yet.</td>
              </tr>
            ) : (
              snapshot.budgetLines.map((line: any) => (
                <tr key={line.id}>
                  <td>{line.budgetLabel}</td>
                  <td>
                    #{line.lineNumber}
                    <small>{line.legalEntityLabel}</small>
                  </td>
                  <td>
                    {line.periodStart} → {line.periodEnd}
                  </td>
                  <td>
                    {line.accountLabel}
                    <small>{line.dimensionValueLabel ?? "No dimension override"}</small>
                  </td>
                  <td>
                    {line.amount}
                    <small>{line.quantity ? `Qty ${line.quantity}` : "Qty —"}</small>
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editBudgetLine=${line.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={
          editingCustomerProfile ? "Edit customer finance profile" : "New customer finance profile"
        }
        title="Customer finance profiles"
        description="Maintain finance-owned customer extensions for receivable control, credit discipline, and statement handling without creating a duplicate customer master or alternate subledger writer."
      >
        <form action={saveCustomerProfile} className="mnx-accounting-form">
          <input
            type="hidden"
            name="customerProfileId"
            value={editingCustomerProfile?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingCustomerProfile?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Customer" htmlFor="customer-profile-crmAccountId">
              <AccountingSelect
                id="customer-profile-crmAccountId"
                name="crmAccountId"
                defaultValue={editingCustomerProfile?.crmAccountId ?? snapshot.customers[0]?.id ?? ""}
              >
                {snapshot.customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Receivable account" htmlFor="customer-profile-receivableAccountId">
              <AccountingSelect
                id="customer-profile-receivableAccountId"
                name="receivableAccountId"
                defaultValue={editingCustomerProfile?.receivableAccountId ?? snapshot.accounts[0]?.id ?? ""}
              >
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Currency" htmlFor="customer-profile-currencyCode">
              <AccountingSelect
                id="customer-profile-currencyCode"
                name="currencyCode"
                defaultValue={
                  editingCustomerProfile?.currencyCode ??
                  snapshot.profile?.functionalCurrencyCode ??
                  snapshot.currencies[0]?.code ??
                  "INR"
                }
              >
                {snapshot.currencies.map((currency: any) => (
                  <option key={currency.id} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Credit limit" htmlFor="customer-profile-creditLimit">
              <AccountingInput
                id="customer-profile-creditLimit"
                name="creditLimit"
                defaultValue={editingCustomerProfile?.creditLimit ?? ""}
              />
            </AccountingField>
            <AccountingField label="Payment terms (days)" htmlFor="customer-profile-paymentTermsDays">
              <AccountingInput
                id="customer-profile-paymentTermsDays"
                name="paymentTermsDays"
                type="number"
                min="0"
                defaultValue={editingCustomerProfile?.paymentTermsDays ?? ""}
              />
            </AccountingField>
            <AccountingField label="Collection policy version" htmlFor="customer-profile-collectionPolicyVersion">
              <AccountingInput
                id="customer-profile-collectionPolicyVersion"
                name="collectionPolicyVersion"
                type="number"
                min="1"
                defaultValue={editingCustomerProfile?.collectionPolicyVersion ?? 1}
              />
            </AccountingField>
            <AccountingField label="Dunning policy code" htmlFor="customer-profile-dunningPolicyCode">
              <AccountingInput
                id="customer-profile-dunningPolicyCode"
                name="dunningPolicyCode"
                defaultValue={editingCustomerProfile?.dunningPolicyCode ?? ""}
              />
            </AccountingField>
            <AccountingField label="Statement delivery" htmlFor="customer-profile-statementDeliveryMode">
              <AccountingSelect
                id="customer-profile-statementDeliveryMode"
                name="statementDeliveryMode"
                defaultValue={editingCustomerProfile?.statementDeliveryMode ?? "EMAIL"}
              >
                {snapshot.customerStatementDeliveryModes.map((mode: string) => (
                  <option key={mode} value={mode}>
                    {mode.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Credit hold" htmlFor="customer-profile-creditHold">
              <AccountingSelect
                id="customer-profile-creditHold"
                name="creditHold"
                defaultValue={editingCustomerProfile?.creditHold ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Active" htmlFor="customer-profile-isActive">
              <AccountingSelect
                id="customer-profile-isActive"
                name="isActive"
                defaultValue={
                  editingCustomerProfile
                    ? editingCustomerProfile.isActive
                      ? "true"
                      : "false"
                    : "true"
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="customer-profile-configurationJson">
            <AccountingTextarea
              id="customer-profile-configurationJson"
              name="configurationJson"
              rows={8}
              defaultValue={editingCustomerProfile?.configurationJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="customer-profile-reason">
            <AccountingTextarea id="customer-profile-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingCustomerProfile ? "Update customer profile" : "Create customer profile"}
            </AccountingAction>
            {editingCustomerProfile ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear customer-profile editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Control account</th>
              <th>Credit controls</th>
              <th>Collection controls</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.customerProfiles.length === 0 ? (
              <tr>
                <td colSpan={6}>No customer finance profiles are configured yet.</td>
              </tr>
            ) : (
              snapshot.customerProfiles.map((profile: any) => (
                <tr key={profile.id}>
                  <td>
                    {profile.customerLabel}
                    <small>{profile.customerGstin ?? "GSTIN not recorded"}</small>
                  </td>
                  <td>
                    {profile.receivableAccountLabel}
                    <small>{profile.currencyCode}</small>
                  </td>
                  <td>
                    Limit {profile.creditLimit ?? "—"}
                    <small>{profile.paymentTermsDays != null ? `${profile.paymentTermsDays} days` : "Terms —"}</small>
                  </td>
                  <td>
                    v{profile.collectionPolicyVersion}
                    <small>{profile.dunningPolicyCode ?? profile.statementDeliveryMode}</small>
                  </td>
                  <td>
                    <AccountingStatus
                      status={
                        profile.isActive
                          ? profile.creditHold
                            ? "ACTIVE_ON_HOLD"
                            : "ACTIVE"
                          : "INACTIVE"
                      }
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editCustomerProfile=${profile.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={
          editingVendorProfile ? "Edit vendor finance profile" : "New vendor finance profile"
        }
        title="Vendor finance profiles"
        description="Maintain finance-owned vendor extensions for payable control, payment discipline, and optional tax-profile linkage without creating a duplicate vendor master or alternate AP posting path."
      >
        <form action={saveVendorProfile} className="mnx-accounting-form">
          <input
            type="hidden"
            name="vendorProfileId"
            value={editingVendorProfile?.id ?? ""}
          />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingVendorProfile?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Vendor" htmlFor="vendor-profile-crmVendorId">
              <AccountingSelect
                id="vendor-profile-crmVendorId"
                name="crmVendorId"
                defaultValue={editingVendorProfile?.crmVendorId ?? snapshot.vendors[0]?.id ?? ""}
              >
                {snapshot.vendors.map((vendor: any) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Payable account" htmlFor="vendor-profile-payableAccountId">
              <AccountingSelect
                id="vendor-profile-payableAccountId"
                name="payableAccountId"
                defaultValue={editingVendorProfile?.payableAccountId ?? snapshot.accounts[0]?.id ?? ""}
              >
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Currency" htmlFor="vendor-profile-currencyCode">
              <AccountingSelect
                id="vendor-profile-currencyCode"
                name="currencyCode"
                defaultValue={
                  editingVendorProfile?.currencyCode ??
                  snapshot.profile?.functionalCurrencyCode ??
                  snapshot.currencies[0]?.code ??
                  "INR"
                }
              >
                {snapshot.currencies.map((currency: any) => (
                  <option key={currency.id} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Payment terms (days)" htmlFor="vendor-profile-paymentTermsDays">
              <AccountingInput
                id="vendor-profile-paymentTermsDays"
                name="paymentTermsDays"
                type="number"
                min="0"
                defaultValue={editingVendorProfile?.paymentTermsDays ?? ""}
              />
            </AccountingField>
            <AccountingField label="Payment policy version" htmlFor="vendor-profile-paymentPolicyVersion">
              <AccountingInput
                id="vendor-profile-paymentPolicyVersion"
                name="paymentPolicyVersion"
                type="number"
                min="1"
                defaultValue={editingVendorProfile?.paymentPolicyVersion ?? 1}
              />
            </AccountingField>
            <AccountingField label="Tax profile" htmlFor="vendor-profile-taxProfileId">
              <AccountingSelect
                id="vendor-profile-taxProfileId"
                name="taxProfileId"
                defaultValue={editingVendorProfile?.taxProfileId ?? ""}
              >
                <option value="">Not assigned</option>
                {snapshot.taxProfiles.map((profile: any) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.code} — {profile.name} · v{profile.version}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Payment method" htmlFor="vendor-profile-paymentMethod">
              <AccountingInput
                id="vendor-profile-paymentMethod"
                name="paymentMethod"
                defaultValue={editingVendorProfile?.paymentMethod ?? ""}
              />
            </AccountingField>
            <AccountingField label="Payment hold" htmlFor="vendor-profile-paymentHold">
              <AccountingSelect
                id="vendor-profile-paymentHold"
                name="paymentHold"
                defaultValue={editingVendorProfile?.paymentHold ? "true" : "false"}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Active" htmlFor="vendor-profile-isActive">
              <AccountingSelect
                id="vendor-profile-isActive"
                name="isActive"
                defaultValue={
                  editingVendorProfile
                    ? editingVendorProfile.isActive
                      ? "true"
                      : "false"
                    : "true"
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="vendor-profile-configurationJson">
            <AccountingTextarea
              id="vendor-profile-configurationJson"
              name="configurationJson"
              rows={8}
              defaultValue={editingVendorProfile?.configurationJson ?? ""}
            />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="vendor-profile-reason">
            <AccountingTextarea id="vendor-profile-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingVendorProfile ? "Update vendor profile" : "Create vendor profile"}
            </AccountingAction>
            {editingVendorProfile ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear vendor-profile editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Control account</th>
              <th>Payment controls</th>
              <th>Tax / method</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.vendorProfiles.length === 0 ? (
              <tr>
                <td colSpan={6}>No vendor finance profiles are configured yet.</td>
              </tr>
            ) : (
              snapshot.vendorProfiles.map((profile: any) => (
                <tr key={profile.id}>
                  <td>
                    {profile.vendorLabel}
                    <small>{profile.vendorGstin ?? "GSTIN not recorded"}</small>
                  </td>
                  <td>
                    {profile.payableAccountLabel}
                    <small>{profile.currencyCode}</small>
                  </td>
                  <td>
                    v{profile.paymentPolicyVersion}
                    <small>{profile.paymentTermsDays != null ? `${profile.paymentTermsDays} days` : "Terms —"}</small>
                  </td>
                  <td>
                    {profile.taxProfileLabel ?? "No tax profile"}
                    <small>{profile.paymentMethod ?? "Method —"}</small>
                  </td>
                  <td>
                    <AccountingStatus
                      status={
                        profile.isActive
                          ? profile.paymentHold
                            ? "ACTIVE_ON_HOLD"
                            : "ACTIVE"
                          : "INACTIVE"
                      }
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editVendorProfile=${profile.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingPaymentTerm ? "Edit payment term" : "New payment term"}
        title="Payment terms"
        description="Standardize due-date and early-payment discount masters for shared Sales and Purchases use without duplicating policy logic in each transaction form."
      >
        <form action={savePaymentTerm} className="mnx-accounting-form">
          <input type="hidden" name="paymentTermId" value={editingPaymentTerm?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingPaymentTerm?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Code" htmlFor="payment-term-code">
              <AccountingInput id="payment-term-code" name="code" defaultValue={editingPaymentTerm?.code ?? ""} />
            </AccountingField>
            <AccountingField label="Name" htmlFor="payment-term-name">
              <AccountingInput id="payment-term-name" name="name" defaultValue={editingPaymentTerm?.name ?? ""} />
            </AccountingField>
            <AccountingField label="Due days" htmlFor="payment-term-dueDays">
              <AccountingInput id="payment-term-dueDays" name="dueDays" type="number" min="0" defaultValue={editingPaymentTerm?.dueDays ?? 0} />
            </AccountingField>
            <AccountingField label="Early discount days" htmlFor="payment-term-earlyDiscountDays">
              <AccountingInput id="payment-term-earlyDiscountDays" name="earlyDiscountDays" type="number" min="0" defaultValue={editingPaymentTerm?.earlyDiscountDays ?? ""} />
            </AccountingField>
            <AccountingField label="Early discount %" htmlFor="payment-term-earlyDiscountPercent">
              <AccountingInput id="payment-term-earlyDiscountPercent" name="earlyDiscountPercent" defaultValue={editingPaymentTerm?.earlyDiscountPercent ?? ""} />
            </AccountingField>
            <AccountingField label="Active" htmlFor="payment-term-isActive">
              <AccountingSelect id="payment-term-isActive" name="isActive" defaultValue={editingPaymentTerm ? (editingPaymentTerm.isActive ? "true" : "false") : "true"}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="payment-term-configurationJson">
            <AccountingTextarea id="payment-term-configurationJson" name="configurationJson" rows={5} defaultValue={editingPaymentTerm?.configurationJson ?? ""} />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="payment-term-reason">
            <AccountingTextarea id="payment-term-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">{editingPaymentTerm ? "Update payment term" : "Create payment term"}</AccountingAction>
            {editingPaymentTerm ? <AccountingActionLink href="/accounting/configuration/admin">Clear payment-term editor</AccountingActionLink> : null}
          </div>
        </form>
        <AccountingTable>
          <thead><tr><th>Term</th><th>Due</th><th>Early discount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {snapshot.paymentTerms.length === 0 ? (
              <tr><td colSpan={5}>No payment terms are configured yet.</td></tr>
            ) : snapshot.paymentTerms.map((term: any) => (
              <tr key={term.id}>
                <td>{term.name}<small>{term.code}</small></td>
                <td>{term.dueDays} day(s)</td>
                <td>{term.earlyDiscountPercent ? `${term.earlyDiscountPercent}% in ${term.earlyDiscountDays ?? 0} day(s)` : "None"}</td>
                <td><AccountingStatus status={term.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                <td><AccountingActionLink className="mnx-button-compact" href={`/accounting/configuration/admin?editPaymentTerm=${term.id}`}>Edit</AccountingActionLink></td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingPaymentMethod ? "Edit payment method" : "New payment method"}
        title="Payment methods"
        description="Maintain reusable collection and settlement method masters, including optional clearing-account linkage for controlled reconciliation use."
      >
        <form action={savePaymentMethod} className="mnx-accounting-form">
          <input type="hidden" name="paymentMethodId" value={editingPaymentMethod?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingPaymentMethod?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Code" htmlFor="payment-method-code">
              <AccountingInput id="payment-method-code" name="code" defaultValue={editingPaymentMethod?.code ?? ""} />
            </AccountingField>
            <AccountingField label="Name" htmlFor="payment-method-name">
              <AccountingInput id="payment-method-name" name="name" defaultValue={editingPaymentMethod?.name ?? ""} />
            </AccountingField>
            <AccountingField label="Method type" htmlFor="payment-method-methodType">
              <AccountingSelect id="payment-method-methodType" name="methodType" defaultValue={editingPaymentMethod?.methodType ?? "BANK_TRANSFER"}>
                {snapshot.paymentMethodTypes.map((type: string) => (
                  <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Clearing account" htmlFor="payment-method-clearingAccountId">
              <AccountingSelect id="payment-method-clearingAccountId" name="clearingAccountId" defaultValue={editingPaymentMethod?.clearingAccountId ?? ""}>
                <option value="">Not assigned</option>
                {snapshot.accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>{account.accountCode} — {account.accountName}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Active" htmlFor="payment-method-isActive">
              <AccountingSelect id="payment-method-isActive" name="isActive" defaultValue={editingPaymentMethod ? (editingPaymentMethod.isActive ? "true" : "false") : "true"}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="payment-method-configurationJson">
            <AccountingTextarea id="payment-method-configurationJson" name="configurationJson" rows={5} defaultValue={editingPaymentMethod?.configurationJson ?? ""} />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="payment-method-reason">
            <AccountingTextarea id="payment-method-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">{editingPaymentMethod ? "Update payment method" : "Create payment method"}</AccountingAction>
            {editingPaymentMethod ? <AccountingActionLink href="/accounting/configuration/admin">Clear payment-method editor</AccountingActionLink> : null}
          </div>
        </form>
        <AccountingTable>
          <thead><tr><th>Method</th><th>Type</th><th>Clearing account</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {snapshot.paymentMethods.length === 0 ? (
              <tr><td colSpan={5}>No payment methods are configured yet.</td></tr>
            ) : snapshot.paymentMethods.map((method: any) => (
              <tr key={method.id}>
                <td>{method.name}<small>{method.code}</small></td>
                <td>{method.methodType.replaceAll("_", " ")}</td>
                <td>{method.clearingAccountLabel ?? "Not assigned"}</td>
                <td><AccountingStatus status={method.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                <td><AccountingActionLink className="mnx-button-compact" href={`/accounting/configuration/admin?editPaymentMethod=${method.id}`}>Edit</AccountingActionLink></td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingPriceList ? "Edit price list" : "New price list"}
        title="Price lists"
        description="Define reusable commercial price-list masters with currency and default adjustment behavior instead of embedding ad-hoc overrides in each workflow."
      >
        <form action={savePriceList} className="mnx-accounting-form">
          <input type="hidden" name="priceListId" value={editingPriceList?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingPriceList?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Code" htmlFor="price-list-code">
              <AccountingInput id="price-list-code" name="code" defaultValue={editingPriceList?.code ?? ""} />
            </AccountingField>
            <AccountingField label="Name" htmlFor="price-list-name">
              <AccountingInput id="price-list-name" name="name" defaultValue={editingPriceList?.name ?? ""} />
            </AccountingField>
            <AccountingField label="Currency" htmlFor="price-list-currencyCode">
              <AccountingSelect id="price-list-currencyCode" name="currencyCode" defaultValue={editingPriceList?.currencyCode ?? snapshot.profile?.functionalCurrencyCode ?? snapshot.currencies[0]?.code ?? "INR"}>
                {snapshot.currencies.map((currency: any) => (
                  <option key={currency.id} value={currency.code}>{currency.code} — {currency.name}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Adjustment mode" htmlFor="price-list-adjustmentMode">
              <AccountingSelect id="price-list-adjustmentMode" name="adjustmentMode" defaultValue={editingPriceList?.adjustmentMode ?? "MANUAL_OVERRIDE"}>
                {snapshot.priceListAdjustmentModes.map((mode: string) => (
                  <option key={mode} value={mode}>{mode.replaceAll("_", " ")}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Default adjustment %" htmlFor="price-list-defaultAdjustmentPercent">
              <AccountingInput id="price-list-defaultAdjustmentPercent" name="defaultAdjustmentPercent" defaultValue={editingPriceList?.defaultAdjustmentPercent ?? ""} />
            </AccountingField>
            <AccountingField label="Active" htmlFor="price-list-isActive">
              <AccountingSelect id="price-list-isActive" name="isActive" defaultValue={editingPriceList ? (editingPriceList.isActive ? "true" : "false") : "true"}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="price-list-configurationJson">
            <AccountingTextarea id="price-list-configurationJson" name="configurationJson" rows={5} defaultValue={editingPriceList?.configurationJson ?? ""} />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="price-list-reason">
            <AccountingTextarea id="price-list-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">{editingPriceList ? "Update price list" : "Create price list"}</AccountingAction>
            {editingPriceList ? <AccountingActionLink href="/accounting/configuration/admin">Clear price-list editor</AccountingActionLink> : null}
          </div>
        </form>
        <AccountingTable>
          <thead><tr><th>Price list</th><th>Currency</th><th>Adjustment</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {snapshot.priceLists.length === 0 ? (
              <tr><td colSpan={5}>No price lists are configured yet.</td></tr>
            ) : snapshot.priceLists.map((priceList: any) => (
              <tr key={priceList.id}>
                <td>{priceList.name}<small>{priceList.code}</small></td>
                <td>{priceList.currencyCode}</td>
                <td>{priceList.adjustmentMode.replaceAll("_", " ")}<small>{priceList.defaultAdjustmentPercent ? `${priceList.defaultAdjustmentPercent}%` : "No default adjustment"}</small></td>
                <td><AccountingStatus status={priceList.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                <td><AccountingActionLink className="mnx-button-compact" href={`/accounting/configuration/admin?editPriceList=${priceList.id}`}>Edit</AccountingActionLink></td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingUnitOfMeasure ? "Edit unit of measure" : "New unit of measure"}
        title="Units of measure"
        description="Maintain reusable unit masters for item and transaction quantity handling, including decimal precision where operations require it."
      >
        <form action={saveUnitOfMeasure} className="mnx-accounting-form">
          <input type="hidden" name="unitOfMeasureId" value={editingUnitOfMeasure?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingUnitOfMeasure?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Code" htmlFor="uom-code">
              <AccountingInput id="uom-code" name="code" defaultValue={editingUnitOfMeasure?.code ?? ""} />
            </AccountingField>
            <AccountingField label="Name" htmlFor="uom-name">
              <AccountingInput id="uom-name" name="name" defaultValue={editingUnitOfMeasure?.name ?? ""} />
            </AccountingField>
            <AccountingField label="Symbol" htmlFor="uom-symbol">
              <AccountingInput id="uom-symbol" name="symbol" defaultValue={editingUnitOfMeasure?.symbol ?? ""} />
            </AccountingField>
            <AccountingField label="Decimal places" htmlFor="uom-decimalPlaces">
              <AccountingInput id="uom-decimalPlaces" name="decimalPlaces" type="number" min="0" max="6" defaultValue={editingUnitOfMeasure?.decimalPlaces ?? 0} />
            </AccountingField>
            <AccountingField label="Active" htmlFor="uom-isActive">
              <AccountingSelect id="uom-isActive" name="isActive" defaultValue={editingUnitOfMeasure ? (editingUnitOfMeasure.isActive ? "true" : "false") : "true"}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="uom-configurationJson">
            <AccountingTextarea id="uom-configurationJson" name="configurationJson" rows={5} defaultValue={editingUnitOfMeasure?.configurationJson ?? ""} />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="uom-reason">
            <AccountingTextarea id="uom-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">{editingUnitOfMeasure ? "Update unit" : "Create unit"}</AccountingAction>
            {editingUnitOfMeasure ? <AccountingActionLink href="/accounting/configuration/admin">Clear unit editor</AccountingActionLink> : null}
          </div>
        </form>
        <AccountingTable>
          <thead><tr><th>Unit</th><th>Symbol</th><th>Precision</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {snapshot.unitsOfMeasure.length === 0 ? (
              <tr><td colSpan={5}>No units of measure are configured yet.</td></tr>
            ) : snapshot.unitsOfMeasure.map((unit: any) => (
              <tr key={unit.id}>
                <td>{unit.name}<small>{unit.code}</small></td>
                <td>{unit.symbol ?? "—"}</td>
                <td>{unit.decimalPlaces}</td>
                <td><AccountingStatus status={unit.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                <td><AccountingActionLink className="mnx-button-compact" href={`/accounting/configuration/admin?editUnitOfMeasure=${unit.id}`}>Edit</AccountingActionLink></td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingReportingTag ? "Edit reporting tag" : "New reporting tag"}
        title="Reporting tags"
        description="Create shared reporting-tag masters for later statement, analysis, and report-builder slicing without hardcoding tags into documents."
      >
        <form action={saveReportingTag} className="mnx-accounting-form">
          <input type="hidden" name="reportingTagId" value={editingReportingTag?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingReportingTag?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Code" htmlFor="reporting-tag-code">
              <AccountingInput id="reporting-tag-code" name="code" defaultValue={editingReportingTag?.code ?? ""} />
            </AccountingField>
            <AccountingField label="Name" htmlFor="reporting-tag-name">
              <AccountingInput id="reporting-tag-name" name="name" defaultValue={editingReportingTag?.name ?? ""} />
            </AccountingField>
            <AccountingField label="Description" htmlFor="reporting-tag-description">
              <AccountingInput id="reporting-tag-description" name="description" defaultValue={editingReportingTag?.description ?? ""} />
            </AccountingField>
            <AccountingField label="Active" htmlFor="reporting-tag-isActive">
              <AccountingSelect id="reporting-tag-isActive" name="isActive" defaultValue={editingReportingTag ? (editingReportingTag.isActive ? "true" : "false") : "true"}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="reporting-tag-configurationJson">
            <AccountingTextarea id="reporting-tag-configurationJson" name="configurationJson" rows={5} defaultValue={editingReportingTag?.configurationJson ?? ""} />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="reporting-tag-reason">
            <AccountingTextarea id="reporting-tag-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">{editingReportingTag ? "Update tag" : "Create tag"}</AccountingAction>
            {editingReportingTag ? <AccountingActionLink href="/accounting/configuration/admin">Clear reporting-tag editor</AccountingActionLink> : null}
          </div>
        </form>
        <AccountingTable>
          <thead><tr><th>Tag</th><th>Description</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {snapshot.reportingTags.length === 0 ? (
              <tr><td colSpan={4}>No reporting tags are configured yet.</td></tr>
            ) : snapshot.reportingTags.map((tag: any) => (
              <tr key={tag.id}>
                <td>{tag.name}<small>{tag.code}</small></td>
                <td>{tag.description ?? "—"}</td>
                <td><AccountingStatus status={tag.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                <td><AccountingActionLink className="mnx-button-compact" href={`/accounting/configuration/admin?editReportingTag=${tag.id}`}>Edit</AccountingActionLink></td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingSeries ? "Edit number series" : "New number series"}
        title="Number series"
        description="Configure document-number allocation windows by document type, with optional tax-registration scope and optimistic row-version checks."
      >
        <form action={saveNumberSeries} className="mnx-accounting-form">
          <input type="hidden" name="seriesId" value={editingSeries?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingSeries?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField
              label="Tax registration scope"
              htmlFor="series-taxRegistrationId"
            >
              <AccountingSelect
                id="series-taxRegistrationId"
                name="taxRegistrationId"
                defaultValue={editingSeries?.taxRegistrationId ?? ""}
              >
                <option value="">Organisation-wide</option>
                {registrationOptions.map((registration: any) => (
                  <option key={registration.id} value={registration.id}>
                    {registration.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Document type" htmlFor="series-documentType">
              <AccountingInput
                id="series-documentType"
                name="documentType"
                defaultValue={editingSeries?.documentType ?? ""}
              />
            </AccountingField>
            <AccountingField
              label="Prefix template"
              htmlFor="series-prefixTemplate"
            >
              <AccountingInput
                id="series-prefixTemplate"
                name="prefixTemplate"
                defaultValue={editingSeries?.prefixTemplate ?? ""}
              />
            </AccountingField>
            <AccountingField label="Next number" htmlFor="series-nextNumber">
              <AccountingInput
                id="series-nextNumber"
                name="nextNumber"
                defaultValue={editingSeries?.nextNumber ?? "1"}
              />
            </AccountingField>
            <AccountingField label="Padding" htmlFor="series-padding">
              <AccountingInput
                id="series-padding"
                name="padding"
                type="number"
                min="1"
                max="12"
                defaultValue={editingSeries?.padding ?? 4}
              />
            </AccountingField>
            <AccountingField
              label="Effective from"
              htmlFor="series-effectiveFrom"
            >
              <AccountingInput
                id="series-effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={editingSeries?.effectiveFrom ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="series-effectiveTo">
              <AccountingInput
                id="series-effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={editingSeries?.effectiveTo ?? ""}
              />
            </AccountingField>
            <AccountingField label="Active" htmlFor="series-active">
              <AccountingSelect
                id="series-active"
                name="isActive"
                defaultValue={editingSeries?.isActive ? "true" : "false"}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="series-reason">
            <AccountingTextarea id="series-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingSeries ? "Update number series" : "Create number series"}
            </AccountingAction>
            {editingSeries ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear series editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        <AccountingTable>
          <thead>
            <tr>
              <th>Document type</th>
              <th>Scope</th>
              <th>Prefix</th>
              <th>Next</th>
              <th>Window</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.numberSeries.length === 0 ? (
              <tr>
                <td colSpan={7}>No document number series are configured yet.</td>
              </tr>
            ) : (
              snapshot.numberSeries.map((series: any) => (
                <tr key={series.id}>
                  <td>{series.documentType}</td>
                  <td>{series.taxRegistrationLabel}</td>
                  <td>{series.prefixTemplate}</td>
                  <td>
                    {series.nextNumber}
                    <small>Pad {series.padding}</small>
                  </td>
                  <td>
                    {series.effectiveFrom}
                    <small>{series.effectiveTo ?? "Open ended"}</small>
                  </td>
                  <td>
                    <AccountingStatus
                      status={series.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editSeries=${series.id}`}
                    >
                      Edit
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingRate ? "Edit or decide rate" : "New FX evidence"}
        title="Exchange-rate evidence"
        description="Maintain versioned FX evidence and approve it independently before canonical foreign-currency posting can rely on it."
      >
        <form action={saveExchangeRate} className="mnx-accounting-form">
          <input type="hidden" name="rateId" value={editingRate?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editingRate?.rowVersion ?? ""}
          />
          <div className="mnx-accounting-form-grid">
            <AccountingField label="From currency" htmlFor="rate-fromCurrencyId">
              <AccountingSelect
                id="rate-fromCurrencyId"
                name="fromCurrencyId"
                defaultValue={editingRate?.fromCurrencyId ?? snapshot.currencies[0]?.id ?? ""}
              >
                {snapshot.currencies.map((currency: any) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="To currency" htmlFor="rate-toCurrencyId">
              <AccountingSelect
                id="rate-toCurrencyId"
                name="toCurrencyId"
                defaultValue={editingRate?.toCurrencyId ?? snapshot.currencies[1]?.id ?? snapshot.currencies[0]?.id ?? ""}
              >
                {snapshot.currencies.map((currency: any) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Rate date" htmlFor="rate-rateDate">
              <AccountingInput
                id="rate-rateDate"
                name="rateDate"
                type="date"
                defaultValue={editingRate?.rateDate ?? "2026-07-31"}
              />
            </AccountingField>
            <AccountingField label="Rate" htmlFor="rate-rate">
              <AccountingInput
                id="rate-rate"
                name="rate"
                defaultValue={editingRate?.rate ?? ""}
              />
            </AccountingField>
            <AccountingField label="Source" htmlFor="rate-source">
              <AccountingInput
                id="rate-source"
                name="source"
                defaultValue={editingRate?.source ?? ""}
              />
            </AccountingField>
          </div>
          <AccountingField label="Reason" htmlFor="rate-reason">
            <AccountingTextarea id="rate-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingRate ? "Update draft" : "Create draft"}
            </AccountingAction>
            {editingRate ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Clear FX editor
              </AccountingActionLink>
            ) : null}
          </div>
        </form>

        {editingRate?.status === "DRAFT" ? (
          <div className="mnx-accounting-form-actions">
            <form action={approveRate}>
              <AccountingAction type="submit" variant="secondary">
                Approve FX evidence
              </AccountingAction>
            </form>
            <form action={rejectRate} className="mnx-accounting-form">
              <AccountingField label="Rejection reason" htmlFor="rate-reject-reason">
                <AccountingTextarea id="rate-reject-reason" name="reason" rows={3} />
              </AccountingField>
              <AccountingAction type="submit" variant="destructive">
                Reject FX evidence
              </AccountingAction>
            </form>
          </div>
        ) : null}

        <AccountingTable>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Date</th>
              <th>Rate</th>
              <th>Source</th>
              <th>Status</th>
              <th>Approved</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.exchangeRates.length === 0 ? (
              <tr>
                <td colSpan={7}>No exchange-rate evidence is configured yet.</td>
              </tr>
            ) : (
              snapshot.exchangeRates.map((rate: any) => (
                <tr key={rate.id}>
                  <td>{rate.pair}</td>
                  <td>{rate.rateDate}</td>
                  <td>{rate.rate}</td>
                  <td>{rate.source}</td>
                  <td>
                    <AccountingStatus status={rate.status} />
                  </td>
                  <td>{rate.approvedAt ? formatDateTime(rate.approvedAt) : "—"}</td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/configuration/admin?editRate=${rate.id}`}
                    >
                      Review
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingSourceMappingProfile ? "Edit source mapping" : "New source mapping"}
        title="Cross-module source mappings"
        description="Define fail-closed source-to-Accounting mapping profiles for approved upstream modules without enabling uncontrolled writers."
      >
        <form action={saveSourceMappingProfile} className="mnx-accounting-form">
          <input type="hidden" name="sourceMappingProfileId" value={editingSourceMappingProfile?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingSourceMappingProfile?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="source-map-legalEntityId">
              <AccountingSelect id="source-map-legalEntityId" name="legalEntityId" defaultValue={editingSourceMappingProfile?.legalEntityId ?? ""}>
                <option value="">Organisation scope</option>
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>{entity.code} — {entity.legalName}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Source system" htmlFor="source-map-sourceSystem">
              <AccountingInput id="source-map-sourceSystem" name="sourceSystem" defaultValue={editingSourceMappingProfile?.sourceSystem ?? ""} />
            </AccountingField>
            <AccountingField label="Source type" htmlFor="source-map-sourceType">
              <AccountingInput id="source-map-sourceType" name="sourceType" defaultValue={editingSourceMappingProfile?.sourceType ?? ""} />
            </AccountingField>
            <AccountingField label="Profile code" htmlFor="source-map-profileCode">
              <AccountingInput id="source-map-profileCode" name="profileCode" defaultValue={editingSourceMappingProfile?.profileCode ?? ""} />
            </AccountingField>
            <AccountingField label="Target module" htmlFor="source-map-targetModule">
              <AccountingSelect id="source-map-targetModule" name="targetModule" defaultValue={editingSourceMappingProfile?.targetModule ?? "CRM"}>
                {snapshot.sourceTargetModules.map((module: string) => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Target document type" htmlFor="source-map-targetDocumentType">
              <AccountingInput id="source-map-targetDocumentType" name="targetDocumentType" defaultValue={editingSourceMappingProfile?.targetDocumentType ?? ""} />
            </AccountingField>
            <AccountingField label="Active" htmlFor="source-map-isActive">
              <AccountingSelect id="source-map-isActive" name="isActive" defaultValue={editingSourceMappingProfile ? (editingSourceMappingProfile.isActive ? "true" : "false") : "true"}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="source-map-configurationJson">
            <AccountingTextarea id="source-map-configurationJson" name="configurationJson" rows={8} defaultValue={editingSourceMappingProfile?.configurationJson ?? ""} />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="source-map-reason">
            <AccountingTextarea id="source-map-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">
              {editingSourceMappingProfile ? "Update mapping" : "Create mapping"}
            </AccountingAction>
            {editingSourceMappingProfile ? (
              <AccountingActionLink href="/accounting/configuration/admin">Clear mapping editor</AccountingActionLink>
            ) : null}
          </div>
        </form>
        <AccountingTable>
          <thead><tr><th>Source</th><th>Scope</th><th>Target</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {snapshot.sourceMappingProfiles.length === 0 ? (
              <tr><td colSpan={5}>No source mapping profiles are configured yet.</td></tr>
            ) : snapshot.sourceMappingProfiles.map((profile: any) => (
              <tr key={profile.id}>
                <td>{profile.sourceSystem} · {profile.sourceType}<small>{profile.profileCode}</small></td>
                <td>{profile.legalEntityLabel}</td>
                <td>{profile.targetModule}<small>{profile.targetDocumentType ?? "No target document type"}</small></td>
                <td><AccountingStatus status={profile.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                <td><AccountingActionLink className="mnx-button-compact" href={`/accounting/configuration/admin?editSourceMappingProfile=${profile.id}`}>Edit</AccountingActionLink></td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Integration runtime"
        title="Inbound and outbound integration evidence"
        description="Review canonical inbound envelopes, outbound publication envelopes, posting attempts, and approved payroll snapshots without changing runtime state from this admin surface."
      >
        <AccountingTable>
          <thead><tr><th>Inbox source</th><th>Status</th><th>Attempts</th><th>Processed record</th><th>Created</th></tr></thead>
          <tbody>
            {snapshot.integrationInbox.length === 0 ? (
              <tr><td colSpan={5}>No inbound integration messages are recorded yet.</td></tr>
            ) : snapshot.integrationInbox.slice(0, 12).map((entry: any) => (
              <tr key={entry.id}>
                <td>{entry.sourceSystem}<small>{entry.messageType} · {entry.legalEntityLabel}</small></td>
                <td><AccountingStatus status={entry.status} /></td>
                <td>{entry.attemptCount}</td>
                <td>{entry.processedRecordType ?? "—"}<small>{entry.processedRecordId ?? entry.lastErrorCode ?? "No result yet"}</small></td>
                <td>{formatDateTime(entry.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
        <AccountingTable>
          <thead><tr><th>Outbox destination</th><th>Status</th><th>Aggregate</th><th>Attempts</th><th>Created</th></tr></thead>
          <tbody>
            {snapshot.integrationOutbox.length === 0 ? (
              <tr><td colSpan={5}>No outbound integration messages are recorded yet.</td></tr>
            ) : snapshot.integrationOutbox.slice(0, 12).map((entry: any) => (
              <tr key={entry.id}>
                <td>{entry.destination}<small>{entry.eventType} · {entry.legalEntityLabel}</small></td>
                <td><AccountingStatus status={entry.status} /></td>
                <td>{entry.aggregateType}<small>{entry.aggregateId}</small></td>
                <td>{entry.attemptCount}</td>
                <td>{formatDateTime(entry.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
        <AccountingTable>
          <thead><tr><th>Posting attempt</th><th>Status</th><th>Journal</th><th>Error</th><th>Started</th></tr></thead>
          <tbody>
            {snapshot.postingAttempts.length === 0 ? (
              <tr><td colSpan={5}>No posting attempts are recorded yet.</td></tr>
            ) : snapshot.postingAttempts.slice(0, 12).map((attempt: any) => (
              <tr key={attempt.id}>
                <td>{attempt.sourceLabel}<small>Attempt {attempt.attemptNumber} · {attempt.requestId}</small></td>
                <td><AccountingStatus status={attempt.status} /></td>
                <td>{attempt.journalLabel ?? "—"}</td>
                <td>{attempt.errorCode ?? "—"}<small>{attempt.errorClassification ?? "No classification"}</small></td>
                <td>{formatDateTime(attempt.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
        <AccountingTable>
          <thead><tr><th>Payroll run</th><th>Period</th><th>Currency</th><th>Totals</th><th>Approved</th></tr></thead>
          <tbody>
            {snapshot.payrollRunSnapshots.length === 0 ? (
              <tr><td colSpan={5}>No payroll run snapshots are recorded yet.</td></tr>
            ) : snapshot.payrollRunSnapshots.slice(0, 12).map((run: any) => (
              <tr key={run.id}>
                <td>{run.runId}<small>v{run.runVersion}</small></td>
                <td>{run.payPeriodStart} → {run.payPeriodEnd}</td>
                <td>{run.currencyCode}</td>
                <td>Dr {run.totalDebit}<small>Cr {run.totalCredit}</small></td>
                <td>{formatDateTime(run.approvedAt)}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingPeriodCloseRun ? "Edit period close" : "New period close"}
        title="Period close runs"
        description="Capture close-readiness, checklist evidence, and reopen/close state for legal-entity periods without bypassing the existing lock workflow."
      >
        <form action={savePeriodCloseRun} className="mnx-accounting-form">
          <input type="hidden" name="periodCloseRunId" value={editingPeriodCloseRun?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingPeriodCloseRun?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="period-close-legalEntityId">
              <AccountingSelect id="period-close-legalEntityId" name="legalEntityId" defaultValue={editingPeriodCloseRun?.legalEntityId ?? snapshot.legalEntities[0]?.id ?? ""}>
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>{entity.code} — {entity.legalName}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Accounting period" htmlFor="period-close-accountingPeriodId">
              <AccountingSelect id="period-close-accountingPeriodId" name="accountingPeriodId" defaultValue={editingPeriodCloseRun?.accountingPeriodId ?? snapshot.periods[0]?.id ?? ""}>
                {snapshot.periods.map((period: any) => (
                  <option key={period.id} value={period.id}>P{period.periodNumber} · {period.name} · {period.startDate}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Close date" htmlFor="period-close-closeDate">
              <AccountingInput id="period-close-closeDate" name="closeDate" type="date" defaultValue={editingPeriodCloseRun?.closeDate ?? "2026-07-31"} />
            </AccountingField>
            <AccountingField label="Status" htmlFor="period-close-status">
              <AccountingSelect id="period-close-status" name="status" defaultValue={editingPeriodCloseRun?.status ?? "OPEN"}>
                {snapshot.periodCloseRunStatuses.map((status: string) => (
                  <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Checklist JSON" htmlFor="period-close-checklistJson">
            <AccountingTextarea id="period-close-checklistJson" name="checklistJson" rows={6} defaultValue={editingPeriodCloseRun?.checklistJson ?? ""} />
          </AccountingField>
          <AccountingField label="Report bundle JSON" htmlFor="period-close-reportBundleJson">
            <AccountingTextarea id="period-close-reportBundleJson" name="reportBundleJson" rows={6} defaultValue={editingPeriodCloseRun?.reportBundleJson ?? ""} />
          </AccountingField>
          <AccountingField label="Notes" htmlFor="period-close-notes">
            <AccountingTextarea id="period-close-notes" name="notes" rows={3} defaultValue={editingPeriodCloseRun?.notes ?? ""} />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="period-close-reason">
            <AccountingTextarea id="period-close-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">{editingPeriodCloseRun ? "Update close run" : "Create close run"}</AccountingAction>
            {editingPeriodCloseRun ? <AccountingActionLink href="/accounting/configuration/admin">Clear period-close editor</AccountingActionLink> : null}
          </div>
        </form>
        <AccountingTable>
          <thead><tr><th>Period</th><th>Legal entity</th><th>Close date</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {snapshot.periodCloseRuns.length === 0 ? (
              <tr><td colSpan={5}>No period close runs are configured yet.</td></tr>
            ) : snapshot.periodCloseRuns.map((run: any) => (
              <tr key={run.id}>
                <td>{run.periodLabel}</td>
                <td>{run.legalEntityLabel}</td>
                <td>{run.closeDate}</td>
                <td><AccountingStatus status={run.status} /></td>
                <td><AccountingActionLink className="mnx-button-compact" href={`/accounting/configuration/admin?editPeriodCloseRun=${run.id}`}>Edit</AccountingActionLink></td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingReportExportProfile ? "Edit report export profile" : "New report export profile"}
        title="Report export profiles"
        description="Standardize Accounting report/export presets and delivery modes for operators and downstream publication profiles."
      >
        <form action={saveReportExportProfile} className="mnx-accounting-form">
          <input type="hidden" name="reportExportProfileId" value={editingReportExportProfile?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingReportExportProfile?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="report-profile-legalEntityId">
              <AccountingSelect id="report-profile-legalEntityId" name="legalEntityId" defaultValue={editingReportExportProfile?.legalEntityId ?? ""}>
                <option value="">Organisation scope</option>
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>{entity.code} — {entity.legalName}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Report code" htmlFor="report-profile-reportCode">
              <AccountingInput id="report-profile-reportCode" name="reportCode" defaultValue={editingReportExportProfile?.reportCode ?? ""} />
            </AccountingField>
            <AccountingField label="Name" htmlFor="report-profile-name">
              <AccountingInput id="report-profile-name" name="name" defaultValue={editingReportExportProfile?.name ?? ""} />
            </AccountingField>
            <AccountingField label="Export format" htmlFor="report-profile-exportFormat">
              <AccountingSelect id="report-profile-exportFormat" name="exportFormat" defaultValue={editingReportExportProfile?.exportFormat ?? "CSV"}>
                {snapshot.reportExportFormats.map((format: string) => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Delivery mode" htmlFor="report-profile-deliveryMode">
              <AccountingSelect id="report-profile-deliveryMode" name="deliveryMode" defaultValue={editingReportExportProfile?.deliveryMode ?? "DOWNLOAD"}>
                {snapshot.deliveryModes.map((mode: string) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Portal visible" htmlFor="report-profile-isPortalVisible">
              <AccountingSelect id="report-profile-isPortalVisible" name="isPortalVisible" defaultValue={editingReportExportProfile?.isPortalVisible ? "true" : "false"}>
                <option value="false">No</option><option value="true">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Active" htmlFor="report-profile-isActive">
              <AccountingSelect id="report-profile-isActive" name="isActive" defaultValue={editingReportExportProfile ? (editingReportExportProfile.isActive ? "true" : "false") : "true"}>
                <option value="true">Active</option><option value="false">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Filters JSON" htmlFor="report-profile-filtersJson">
            <AccountingTextarea id="report-profile-filtersJson" name="filtersJson" rows={6} defaultValue={editingReportExportProfile?.filtersJson ?? ""} />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="report-profile-reason">
            <AccountingTextarea id="report-profile-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">{editingReportExportProfile ? "Update export profile" : "Create export profile"}</AccountingAction>
            {editingReportExportProfile ? <AccountingActionLink href="/accounting/configuration/admin">Clear export-profile editor</AccountingActionLink> : null}
          </div>
        </form>
        <AccountingTable>
          <thead><tr><th>Profile</th><th>Scope</th><th>Format / delivery</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {snapshot.reportExportProfiles.length === 0 ? (
              <tr><td colSpan={5}>No report export profiles are configured yet.</td></tr>
            ) : snapshot.reportExportProfiles.map((profile: any) => (
              <tr key={profile.id}>
                <td>{profile.name}<small>{profile.reportCode}</small></td>
                <td>{profile.legalEntityLabel}</td>
                <td>{profile.exportFormat}<small>{profile.deliveryMode}</small></td>
                <td><AccountingStatus status={profile.isActive ? (profile.isPortalVisible ? "ACTIVE_PORTAL" : "ACTIVE") : "INACTIVE"} /></td>
                <td><AccountingActionLink className="mnx-button-compact" href={`/accounting/configuration/admin?editReportExportProfile=${profile.id}`}>Edit</AccountingActionLink></td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow={editingPortalPublicationProfile ? "Edit portal publication" : "New portal publication"}
        title="Portal publication profiles"
        description="Control which Accounting document categories can surface through portal-facing delivery profiles and exported bundles."
      >
        <form action={savePortalPublicationProfile} className="mnx-accounting-form">
          <input type="hidden" name="portalPublicationProfileId" value={editingPortalPublicationProfile?.id ?? ""} />
          <input type="hidden" name="expectedVersion" value={editingPortalPublicationProfile?.rowVersion ?? ""} />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Legal entity" htmlFor="portal-profile-legalEntityId">
              <AccountingSelect id="portal-profile-legalEntityId" name="legalEntityId" defaultValue={editingPortalPublicationProfile?.legalEntityId ?? ""}>
                <option value="">Organisation scope</option>
                {snapshot.legalEntities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>{entity.code} — {entity.legalName}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Document type" htmlFor="portal-profile-documentType">
              <AccountingInput id="portal-profile-documentType" name="documentType" defaultValue={editingPortalPublicationProfile?.documentType ?? ""} />
            </AccountingField>
            <AccountingField label="Audience type" htmlFor="portal-profile-audienceType">
              <AccountingSelect id="portal-profile-audienceType" name="audienceType" defaultValue={editingPortalPublicationProfile?.audienceType ?? "CUSTOMER"}>
                {snapshot.portalAudienceTypes.map((type: string) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Export profile" htmlFor="portal-profile-exportProfileId">
              <AccountingSelect id="portal-profile-exportProfileId" name="exportProfileId" defaultValue={editingPortalPublicationProfile?.exportProfileId ?? ""}>
                <option value="">Not linked</option>
                {snapshot.reportExportProfiles.map((profile: any) => (
                  <option key={profile.id} value={profile.id}>{profile.name} · {profile.reportCode}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Delivery mode" htmlFor="portal-profile-deliveryMode">
              <AccountingSelect id="portal-profile-deliveryMode" name="deliveryMode" defaultValue={editingPortalPublicationProfile?.deliveryMode ?? "PORTAL"}>
                {snapshot.deliveryModes.map((mode: string) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Retention days" htmlFor="portal-profile-retentionDays">
              <AccountingInput id="portal-profile-retentionDays" name="retentionDays" type="number" min="0" defaultValue={editingPortalPublicationProfile?.retentionDays ?? ""} />
            </AccountingField>
            <AccountingField label="Active" htmlFor="portal-profile-isActive">
              <AccountingSelect id="portal-profile-isActive" name="isActive" defaultValue={editingPortalPublicationProfile ? (editingPortalPublicationProfile.isActive ? "true" : "false") : "true"}>
                <option value="true">Active</option><option value="false">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Configuration JSON" htmlFor="portal-profile-configurationJson">
            <AccountingTextarea id="portal-profile-configurationJson" name="configurationJson" rows={6} defaultValue={editingPortalPublicationProfile?.configurationJson ?? ""} />
          </AccountingField>
          <AccountingField label="Reason" htmlFor="portal-profile-reason">
            <AccountingTextarea id="portal-profile-reason" name="reason" rows={3} />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <AccountingAction type="submit">{editingPortalPublicationProfile ? "Update portal profile" : "Create portal profile"}</AccountingAction>
            {editingPortalPublicationProfile ? <AccountingActionLink href="/accounting/configuration/admin">Clear portal-profile editor</AccountingActionLink> : null}
          </div>
        </form>
        <AccountingTable>
          <thead><tr><th>Document type</th><th>Audience</th><th>Scope</th><th>Delivery</th><th>Action</th></tr></thead>
          <tbody>
            {snapshot.portalPublicationProfiles.length === 0 ? (
              <tr><td colSpan={5}>No portal publication profiles are configured yet.</td></tr>
            ) : snapshot.portalPublicationProfiles.map((profile: any) => (
              <tr key={profile.id}>
                <td>{profile.documentType}</td>
                <td>{profile.audienceType}</td>
                <td>{profile.legalEntityLabel}<small>{profile.exportProfileLabel ?? "No export profile"}</small></td>
                <td><AccountingStatus status={profile.isActive ? profile.deliveryMode : "INACTIVE"} /></td>
                <td><AccountingActionLink className="mnx-button-compact" href={`/accounting/configuration/admin?editPortalPublicationProfile=${profile.id}`}>Edit</AccountingActionLink></td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Integration destinations"
        title="Disabled and synthetic integration destinations"
        description="Production-facing destinations remain fail-closed here. Synthetic destinations are visible for safe canonical contract verification only."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Destination</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Seen in outbox</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.integrationDestinations.map((destination: any) => (
              <tr key={destination.code}>
                <td>{destination.code}</td>
                <td>{destination.kind}</td>
                <td>
                  <AccountingStatus status={destination.status} />
                </td>
                <td>{destination.seenInOutbox ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Comparisons"
        title="Recent configuration comparisons"
        description="Review before-and-after snapshots from the Accounting audit trail to compare configuration changes without touching the database directly."
      >
        <ul className="mnx-accounting-list">
          {snapshot.audit.filter((event: any) => event.beforeValues || event.afterValues).length === 0 ? (
            <li>No before-and-after comparisons are available yet.</li>
          ) : (
            snapshot.audit
              .filter((event: any) => event.beforeValues || event.afterValues)
              .slice(0, 10)
              .map((event: any) => (
                <li className="mnx-accounting-list-row" key={`${event.id}-compare`}>
                  <div>
                    <b>{event.action.replaceAll("_", " ")}</b>
                    <small>{event.entityType} · {event.actor}</small>
                    <small>
                      Before: {event.beforeValues ? JSON.stringify(event.beforeValues) : "—"}
                    </small>
                    <small>
                      After: {event.afterValues ? JSON.stringify(event.afterValues) : "—"}
                    </small>
                  </div>
                  <span>{formatDateTime(event.timestamp)}</span>
                </li>
              ))
          )}
        </ul>
      </AccountingSection>

      <AccountingSection
        eyebrow="Audit"
        title="Recent configuration history"
        description="Configuration changes are preserved as immutable Accounting audit events."
      >
        <ul className="mnx-accounting-list">
          {snapshot.audit.length === 0 ? (
            <li>No configuration audit events are available yet.</li>
          ) : (
            snapshot.audit.map((event: any) => (
              <li className="mnx-accounting-list-row" key={event.id}>
                <div>
                  <b>{event.action.replaceAll("_", " ")}</b>
                  <small>
                    {event.entityType} · {event.actor}
                  </small>
                </div>
                <span>{formatDateTime(event.timestamp)}</span>
              </li>
            ))
          )}
        </ul>
      </AccountingSection>
    </>
  );
}
