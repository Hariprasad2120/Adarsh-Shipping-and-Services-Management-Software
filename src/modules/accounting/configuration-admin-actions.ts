"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  approveAccountingExchangeRate,
  decideAccountingPeriodLock,
  requestAccountingPeriodLock,
  rejectAccountingExchangeRate,
  saveAccountingAccountControl,
  saveAccountingApprovalPolicy,
  saveAccountingCounterpartyEntityScope,
  saveAccountingBankMatch,
  saveAccountingBankStatementImport,
  saveAccountingCurrency,
  saveAccountingDimensionDefinition,
  saveAccountingDimensionValue,
  saveAccountingDocumentPolicy,
  saveAccountingExchangeRateDraft,
  saveAccountingFiscalYear,
  saveAccountingBankAccount,
  saveAccountingLegalEntity,
  saveAccountingNumberSeries,
  saveAccountingOrganisationProfile,
  saveAccountingPeriod,
  saveAccountingAssetBook,
  saveAccountingAppropriation,
  saveAccountingBudget,
  saveAccountingBudgetLine,
  saveAccountingCustomerProfile,
  saveAccountingDepreciationRun,
  saveAccountingFinancialAsset,
  saveAccountingPeriodCloseRun,
  saveAccountingPartner,
  saveAccountingPartnerTerm,
  saveAccountingPaymentMethod,
  saveAccountingPaymentTerm,
  saveAccountingPriceList,
  saveAccountingReportingTag,
  saveAccountingPortalPublicationProfile,
  saveAccountingReportExportProfile,
  saveAccountingRecurringRun,
  saveAccountingRecurringSchedule,
  saveAccountingRecurringTemplate,
  saveAccountingReconciliationSession,
  saveAccountingSourceMappingProfile,
  saveAccountingStatutoryFilingPeriod,
  saveAccountingStatutoryReturnProfile,
  saveAccountingTaxProfile,
  saveAccountingTaxRule,
  saveAccountingTaxRegistration,
  saveAccountingUnitOfMeasure,
  saveAccountingVendorProfile,
} from "./configuration-admin";
import { mapAccountingError } from "./operational-helpers";

type ActionResponse = { ok: true; data?: unknown } | { ok: false; error: string };

function safeAccountingActionError(error: unknown) {
  return mapAccountingError(error).message;
}

function revalidateConfiguration() {
  revalidatePath("/accounting/configuration");
  revalidatePath("/accounting/configuration/admin");
}

export async function saveAccountingOrganisationProfileAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingOrganisationProfile({
      orgId,
      actorId: session.user.id,
      expectedVersion: Number(String(formData.get("expectedVersion") ?? "").trim() || 0) || undefined,
      functionalCurrencyCode: String(formData.get("functionalCurrencyCode") ?? ""),
      fiscalYearStartMonth: Number(formData.get("fiscalYearStartMonth")),
      fiscalYearStartDay: Number(formData.get("fiscalYearStartDay")),
      inventoryMode: String(formData.get("inventoryMode") ?? ""),
      moneyScale: Number(formData.get("moneyScale")),
      quantityScale: Number(formData.get("quantityScale")),
      exchangeRateScale: Number(formData.get("exchangeRateScale")),
      percentageScale: Number(formData.get("percentageScale")),
      correctionPolicyJson: String(formData.get("correctionPolicyJson") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingLegalEntityAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingLegalEntity({
      id: String(formData.get("entityId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion: Number(String(formData.get("expectedVersion") ?? "").trim() || 0) || undefined,
      code: String(formData.get("code") ?? ""),
      legalName: String(formData.get("legalName") ?? ""),
      entityType: String(formData.get("entityType") ?? ""),
      status: String(formData.get("status") ?? ""),
      isDefault: String(formData.get("isDefault") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim() || null,
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingTaxRegistrationAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingTaxRegistration({
      id: String(formData.get("registrationId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      expectedVersion: Number(String(formData.get("expectedVersion") ?? "").trim() || 0) || undefined,
      registrationCode: String(formData.get("registrationCode") ?? ""),
      registrationType: String(formData.get("registrationType") ?? ""),
      gstin: String(formData.get("gstin") ?? "").trim() || null,
      stateCode: String(formData.get("stateCode") ?? "").trim() || null,
      legalName: String(formData.get("registrationLegalName") ?? "").trim() || null,
      tradeName: String(formData.get("tradeName") ?? "").trim() || null,
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim() || null,
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingCurrencyAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingCurrency({
      id: String(formData.get("currencyId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion: Number(String(formData.get("expectedVersion") ?? "").trim() || 0) || undefined,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      symbol: String(formData.get("symbol") ?? "").trim() || null,
      decimalPlaces: Number(formData.get("decimalPlaces")),
      isFunctional: String(formData.get("isFunctional") ?? "") === "true",
      isEnabled: String(formData.get("isEnabled") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingTaxProfileAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingTaxProfile({
      id: String(formData.get("taxProfileId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId:
        String(formData.get("legalEntityId") ?? "").trim() || null,
      taxRegistrationId: String(formData.get("taxRegistrationId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      version: Number(formData.get("version")),
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      statutoryValidated:
        String(formData.get("statutoryValidated") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingTaxRuleAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingTaxRule({
      id: String(formData.get("taxRuleId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      taxProfileId: String(formData.get("taxProfileId") ?? "").trim(),
      legalEntityId:
        String(formData.get("legalEntityId") ?? "").trim() || null,
      taxRegistrationId: String(formData.get("taxRegistrationId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? ""),
      documentType: String(formData.get("documentType") ?? ""),
      placeOfSupplyType: String(formData.get("placeOfSupplyType") ?? ""),
      counterpartyTreatment: String(formData.get("counterpartyTreatment") ?? ""),
      supplyCategory: String(formData.get("supplyCategory") ?? ""),
      version: Number(formData.get("version")),
      configurationJson: String(formData.get("configurationJson") ?? "{}"),
      componentsJson: String(formData.get("componentsJson") ?? "[]"),
      statutoryValidated:
        String(formData.get("statutoryValidated") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingStatutoryReturnProfileAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingStatutoryReturnProfile({
      id: String(formData.get("statutoryReturnProfileId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId:
        String(formData.get("legalEntityId") ?? "").trim() || null,
      taxRegistrationId: String(formData.get("taxRegistrationId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      returnType: String(formData.get("returnType") ?? ""),
      filingFrequency: String(formData.get("filingFrequency") ?? ""),
      dueDayOfMonth:
        Number(String(formData.get("dueDayOfMonth") ?? "").trim() || 0) || null,
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      statutoryValidated:
        String(formData.get("statutoryValidated") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingStatutoryFilingPeriodAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingStatutoryFilingPeriod({
      id: String(formData.get("statutoryFilingPeriodId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      profileId: String(formData.get("profileId") ?? "").trim(),
      legalEntityId:
        String(formData.get("legalEntityId") ?? "").trim() || null,
      taxRegistrationId: String(formData.get("taxRegistrationId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      returnType: String(formData.get("returnType") ?? ""),
      periodStart: String(formData.get("periodStart") ?? "").trim(),
      periodEnd: String(formData.get("periodEnd") ?? "").trim(),
      dueDate: String(formData.get("dueDate") ?? "").trim() || null,
      status: String(formData.get("status") ?? ""),
      acknowledgementRef:
        String(formData.get("acknowledgementRef") ?? "").trim() || null,
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingDimensionDefinitionAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingDimensionDefinition({
      id: String(formData.get("definitionId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      valueSource: String(formData.get("valueSource") ?? "").trim(),
      isRequired: String(formData.get("isRequired") ?? "") === "true",
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingDimensionValueAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingDimensionValue({
      id: String(formData.get("dimensionValueId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      definitionId: String(formData.get("definitionId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      canonicalType: String(formData.get("canonicalType") ?? "").trim() || null,
      canonicalId: String(formData.get("canonicalId") ?? "").trim() || null,
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim() || null,
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingCounterpartyEntityScopeAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingCounterpartyEntityScope({
      id: String(formData.get("counterpartyScopeId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      partyType: String(formData.get("partyType") ?? "").trim(),
      partyId: String(formData.get("partyId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      isActive: String(formData.get("isActive") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingDocumentPolicyAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingDocumentPolicy({
      id: String(formData.get("documentPolicyId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      documentType: String(formData.get("documentType") ?? "").trim(),
      configurationJson: String(formData.get("configurationJson") ?? ""),
      statutoryValidated:
        String(formData.get("statutoryValidated") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingBankAccountAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingBankAccount({
      id: String(formData.get("bankAccountId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      taxRegistrationId:
        String(formData.get("taxRegistrationId") ?? "").trim() || null,
      ledgerAccountId: String(formData.get("ledgerAccountId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      bankName: String(formData.get("bankName") ?? ""),
      branchName: String(formData.get("branchName") ?? "").trim() || null,
      accountNumberMasked:
        String(formData.get("accountNumberMasked") ?? "").trim(),
      ifsc: String(formData.get("ifsc") ?? "").trim() || null,
      currencyCode: String(formData.get("currencyCode") ?? ""),
      isPrimary: String(formData.get("isPrimary") ?? "") === "true",
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      statutoryValidated:
        String(formData.get("statutoryValidated") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingBankStatementImportAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingBankStatementImport({
      id: String(formData.get("bankStatementImportId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      bankAccountId: String(formData.get("bankAccountId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      sourceFileName: String(formData.get("sourceFileName") ?? ""),
      sourceFileHash:
        String(formData.get("sourceFileHash") ?? "").trim() || null,
      sourceFormat: String(formData.get("sourceFormat") ?? ""),
      statementStart:
        String(formData.get("statementStart") ?? "").trim() || null,
      statementEnd: String(formData.get("statementEnd") ?? "").trim() || null,
      openingBalance:
        String(formData.get("openingBalance") ?? "").trim() || null,
      closingBalance:
        String(formData.get("closingBalance") ?? "").trim() || null,
      importStatus: String(formData.get("importStatus") ?? "").trim(),
      linesJson: String(formData.get("linesJson") ?? ""),
      importExceptionsJson:
        String(formData.get("importExceptionsJson") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingReconciliationSessionAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingReconciliationSession({
      id:
        String(formData.get("reconciliationSessionId") ?? "").trim() ||
        undefined,
      orgId,
      actorId: session.user.id,
      bankAccountId: String(formData.get("bankAccountId") ?? "").trim(),
      statementImportId: String(formData.get("statementImportId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      periodStart: String(formData.get("periodStart") ?? "").trim(),
      periodEnd: String(formData.get("periodEnd") ?? "").trim(),
      statementClosingBalance:
        String(formData.get("statementClosingBalance") ?? "").trim() || null,
      ledgerClosingBalance:
        String(formData.get("ledgerClosingBalance") ?? "").trim() || null,
      status: String(formData.get("status") ?? "").trim(),
      proofJson: String(formData.get("proofJson") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingBankMatchAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingBankMatch({
      id: String(formData.get("bankMatchId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      sessionId: String(formData.get("sessionId") ?? "").trim(),
      statementLineId: String(formData.get("statementLineId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      targetType: String(formData.get("targetType") ?? "").trim(),
      targetDocumentId:
        String(formData.get("targetDocumentId") ?? "").trim() || null,
      targetJournalEntryId:
        String(formData.get("targetJournalEntryId") ?? "").trim() || null,
      matchedAmount: String(formData.get("matchedAmount") ?? "").trim(),
      confidenceScore:
        String(formData.get("confidenceScore") ?? "").trim() || null,
      reasonCode: String(formData.get("reasonCode") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingRecurringTemplateAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingRecurringTemplate({
      id: String(formData.get("recurringTemplateId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      sourceType: String(formData.get("sourceType") ?? "").trim(),
      documentType: String(formData.get("documentType") ?? "").trim(),
      version: Number(String(formData.get("version") ?? "").trim() || 0),
      scheduleMode: String(formData.get("scheduleMode") ?? "").trim(),
      scheduleConfigJson:
        String(formData.get("scheduleConfigJson") ?? "").trim() || null,
      generationPolicyJson:
        String(formData.get("generationPolicyJson") ?? "").trim() || null,
      approvalMode: String(formData.get("approvalMode") ?? "").trim() || null,
      autoSubmit: String(formData.get("autoSubmit") ?? "") === "true",
      isActive: String(formData.get("isActive") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingRecurringScheduleAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingRecurringSchedule({
      id: String(formData.get("recurringScheduleId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      templateId: String(formData.get("templateId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      cadence: String(formData.get("cadence") ?? "").trim(),
      anchorDate: String(formData.get("anchorDate") ?? "").trim(),
      nextDueDate: String(formData.get("nextDueDate") ?? "").trim(),
      lastProcessedDueDate:
        String(formData.get("lastProcessedDueDate") ?? "").trim() || null,
      catchUpMode: String(formData.get("catchUpMode") ?? "").trim(),
      scheduleConfigJson:
        String(formData.get("scheduleConfigJson") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingRecurringRunAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingRecurringRun({
      id: String(formData.get("recurringRunId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      templateId: String(formData.get("templateId") ?? "").trim(),
      scheduleId: String(formData.get("scheduleId") ?? "").trim() || null,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      dueDate: String(formData.get("dueDate") ?? "").trim(),
      runStatus: String(formData.get("runStatus") ?? "").trim(),
      generatedRecordType:
        String(formData.get("generatedRecordType") ?? "").trim() || null,
      generatedRecordId:
        String(formData.get("generatedRecordId") ?? "").trim() || null,
      resultJson: String(formData.get("resultJson") ?? "").trim() || null,
      idempotencyKey: String(formData.get("idempotencyKey") ?? "").trim(),
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingFinancialAssetAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingFinancialAsset({
      id: String(formData.get("financialAssetId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      legacyAssetId: String(formData.get("legacyAssetId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      assetCode: String(formData.get("assetCode") ?? ""),
      assetName: String(formData.get("assetName") ?? ""),
      capitalizationDate: String(formData.get("capitalizationDate") ?? "").trim(),
      capitalizationAmount: String(formData.get("capitalizationAmount") ?? "").trim(),
      salvageValue: String(formData.get("salvageValue") ?? "").trim() || null,
      usefulLifeMonths:
        Number(String(formData.get("usefulLifeMonths") ?? "").trim() || 0) ||
        null,
      sourceAssetVersion:
        Number(String(formData.get("sourceAssetVersion") ?? "").trim() || 0) ||
        null,
      policyJson: String(formData.get("policyJson") ?? "").trim() || null,
      status: String(formData.get("status") ?? "").trim(),
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingAssetBookAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingAssetBook({
      id: String(formData.get("assetBookId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      financialAssetId: String(formData.get("financialAssetId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      bookCode: String(formData.get("bookCode") ?? ""),
      bookType: String(formData.get("bookType") ?? "").trim(),
      depreciationMethod: String(formData.get("depreciationMethod") ?? "").trim(),
      depreciationRate:
        String(formData.get("depreciationRate") ?? "").trim() || null,
      usefulLifeMonths:
        Number(String(formData.get("usefulLifeMonths") ?? "").trim() || 0) ||
        null,
      capitalizationAmount:
        String(formData.get("capitalizationAmount") ?? "").trim(),
      salvageValue: String(formData.get("salvageValue") ?? "").trim() || null,
      accumulatedDepreciation:
        String(formData.get("accumulatedDepreciation") ?? "").trim(),
      netBookValue: String(formData.get("netBookValue") ?? "").trim(),
      assetAccountId: String(formData.get("assetAccountId") ?? "").trim() || null,
      depreciationExpenseAccountId:
        String(formData.get("depreciationExpenseAccountId") ?? "").trim() || null,
      accumulatedDepAccountId:
        String(formData.get("accumulatedDepAccountId") ?? "").trim() || null,
      policyJson: String(formData.get("policyJson") ?? "").trim() || null,
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingDepreciationRunAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingDepreciationRun({
      id: String(formData.get("depreciationRunId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      assetBookId: String(formData.get("assetBookId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      periodStart: String(formData.get("periodStart") ?? "").trim(),
      periodEnd: String(formData.get("periodEnd") ?? "").trim(),
      depreciationDate: String(formData.get("depreciationDate") ?? "").trim(),
      depreciationAmount: String(formData.get("depreciationAmount") ?? "").trim(),
      accumulatedAfter: String(formData.get("accumulatedAfter") ?? "").trim(),
      netBookValueAfter: String(formData.get("netBookValueAfter") ?? "").trim(),
      runStatus: String(formData.get("runStatus") ?? "").trim(),
      journalEntryId: String(formData.get("journalEntryId") ?? "").trim() || null,
      policySnapshotJson:
        String(formData.get("policySnapshotJson") ?? "").trim() || null,
      idempotencyKey: String(formData.get("idempotencyKey") ?? "").trim(),
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingPartnerAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingPartner({
      id: String(formData.get("partnerId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      legacyPartnerId: String(formData.get("legacyPartnerId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      partnerCode: String(formData.get("partnerCode") ?? ""),
      partnerName: String(formData.get("partnerName") ?? ""),
      capitalAccountId: String(formData.get("capitalAccountId") ?? "").trim(),
      currentAccountId: String(formData.get("currentAccountId") ?? "").trim(),
      drawingsAccountId:
        String(formData.get("drawingsAccountId") ?? "").trim() || null,
      status: String(formData.get("status") ?? "").trim(),
      policyJson: String(formData.get("policyJson") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingPartnerTermAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingPartnerTerm({
      id: String(formData.get("partnerTermId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      partnerId: String(formData.get("partnerId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      version: Number(String(formData.get("version") ?? "").trim() || 0),
      profitSharingRatio: String(formData.get("profitSharingRatio") ?? "").trim(),
      interestOnCapitalRate:
        String(formData.get("interestOnCapitalRate") ?? "").trim() || null,
      interestOnDrawingsRate:
        String(formData.get("interestOnDrawingsRate") ?? "").trim() || null,
      salaryAmount: String(formData.get("salaryAmount") ?? "").trim() || null,
      salaryExpenseAccountId:
        String(formData.get("salaryExpenseAccountId") ?? "").trim() || null,
      interestExpenseAccountId:
        String(formData.get("interestExpenseAccountId") ?? "").trim() || null,
      interestIncomeAccountId:
        String(formData.get("interestIncomeAccountId") ?? "").trim() || null,
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      approvedByCA: String(formData.get("approvedByCA") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingAppropriationAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingAppropriation({
      id: String(formData.get("appropriationId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      partnerId: String(formData.get("partnerId") ?? "").trim(),
      termId: String(formData.get("termId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      appropriationType:
        String(formData.get("appropriationType") ?? "").trim(),
      periodStart: String(formData.get("periodStart") ?? "").trim(),
      periodEnd: String(formData.get("periodEnd") ?? "").trim(),
      amount: String(formData.get("amount") ?? "").trim(),
      basisJson: String(formData.get("basisJson") ?? "").trim() || null,
      status: String(formData.get("status") ?? "").trim(),
      journalEntryId: String(formData.get("journalEntryId") ?? "").trim() || null,
      idempotencyKey: String(formData.get("idempotencyKey") ?? "").trim(),
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingCustomerProfileAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingCustomerProfile({
      id: String(formData.get("customerProfileId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      crmAccountId: String(formData.get("crmAccountId") ?? "").trim(),
      receivableAccountId: String(formData.get("receivableAccountId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      currencyCode: String(formData.get("currencyCode") ?? "").trim(),
      creditLimit: String(formData.get("creditLimit") ?? "").trim() || null,
      paymentTermsDays:
        Number(String(formData.get("paymentTermsDays") ?? "").trim() || 0) || null,
      collectionPolicyVersion:
        Number(String(formData.get("collectionPolicyVersion") ?? "").trim() || 0),
      dunningPolicyCode:
        String(formData.get("dunningPolicyCode") ?? "").trim() || null,
      creditHold: String(formData.get("creditHold") ?? "") === "true",
      statementDeliveryMode:
        String(formData.get("statementDeliveryMode") ?? "").trim(),
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingVendorProfileAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingVendorProfile({
      id: String(formData.get("vendorProfileId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      crmVendorId: String(formData.get("crmVendorId") ?? "").trim(),
      payableAccountId: String(formData.get("payableAccountId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      currencyCode: String(formData.get("currencyCode") ?? "").trim(),
      paymentTermsDays:
        Number(String(formData.get("paymentTermsDays") ?? "").trim() || 0) || null,
      paymentPolicyVersion:
        Number(String(formData.get("paymentPolicyVersion") ?? "").trim() || 0),
      taxProfileId: String(formData.get("taxProfileId") ?? "").trim() || null,
      paymentHold: String(formData.get("paymentHold") ?? "") === "true",
      paymentMethod: String(formData.get("paymentMethod") ?? "").trim() || null,
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingPaymentTermAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingPaymentTerm({
      id: String(formData.get("paymentTermId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      dueDays: Number(String(formData.get("dueDays") ?? "").trim() || 0),
      earlyDiscountDays:
        Number(String(formData.get("earlyDiscountDays") ?? "").trim() || 0) ||
        null,
      earlyDiscountPercent:
        String(formData.get("earlyDiscountPercent") ?? "").trim() || null,
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingPaymentMethodAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingPaymentMethod({
      id: String(formData.get("paymentMethodId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      methodType: String(formData.get("methodType") ?? "").trim(),
      clearingAccountId:
        String(formData.get("clearingAccountId") ?? "").trim() || null,
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingPriceListAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingPriceList({
      id: String(formData.get("priceListId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      currencyCode: String(formData.get("currencyCode") ?? "").trim(),
      adjustmentMode: String(formData.get("adjustmentMode") ?? "").trim(),
      defaultAdjustmentPercent:
        String(formData.get("defaultAdjustmentPercent") ?? "").trim() || null,
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingUnitOfMeasureAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingUnitOfMeasure({
      id: String(formData.get("unitOfMeasureId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      symbol: String(formData.get("symbol") ?? "").trim() || null,
      decimalPlaces:
        Number(String(formData.get("decimalPlaces") ?? "").trim() || 0),
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingReportingTagAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingReportingTag({
      id: String(formData.get("reportingTagId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingSourceMappingProfileAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingSourceMappingProfile({
      id: String(formData.get("sourceMappingProfileId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim() || null,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      sourceSystem: String(formData.get("sourceSystem") ?? "").trim(),
      sourceType: String(formData.get("sourceType") ?? "").trim(),
      profileCode: String(formData.get("profileCode") ?? "").trim(),
      targetModule: String(formData.get("targetModule") ?? "").trim(),
      targetDocumentType:
        String(formData.get("targetDocumentType") ?? "").trim() || null,
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingPeriodCloseRunAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingPeriodCloseRun({
      id: String(formData.get("periodCloseRunId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      accountingPeriodId: String(formData.get("accountingPeriodId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      closeDate: String(formData.get("closeDate") ?? "").trim(),
      status: String(formData.get("status") ?? "").trim(),
      checklistJson: String(formData.get("checklistJson") ?? "").trim() || null,
      reportBundleJson:
        String(formData.get("reportBundleJson") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingReportExportProfileAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingReportExportProfile({
      id: String(formData.get("reportExportProfileId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim() || null,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      reportCode: String(formData.get("reportCode") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      exportFormat: String(formData.get("exportFormat") ?? "").trim(),
      deliveryMode: String(formData.get("deliveryMode") ?? "").trim(),
      filtersJson: String(formData.get("filtersJson") ?? "").trim() || null,
      isPortalVisible: String(formData.get("isPortalVisible") ?? "") === "true",
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingPortalPublicationProfileAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingPortalPublicationProfile({
      id:
        String(formData.get("portalPublicationProfileId") ?? "").trim() ||
        undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim() || null,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      documentType: String(formData.get("documentType") ?? "").trim(),
      audienceType: String(formData.get("audienceType") ?? "").trim(),
      exportProfileId:
        String(formData.get("exportProfileId") ?? "").trim() || null,
      deliveryMode: String(formData.get("deliveryMode") ?? "").trim(),
      retentionDays:
        Number(String(formData.get("retentionDays") ?? "").trim() || 0) || null,
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingBudgetAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingBudget({
      id: String(formData.get("budgetId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      fiscalYearId: String(formData.get("fiscalYearId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      scenarioCode: String(formData.get("scenarioCode") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      version: Number(String(formData.get("version") ?? "").trim() || 0),
      currencyCode: String(formData.get("currencyCode") ?? "").trim(),
      periodGranularity: String(formData.get("periodGranularity") ?? "").trim(),
      configurationJson:
        String(formData.get("configurationJson") ?? "").trim() || null,
      approvedByMgmt: String(formData.get("approvedByMgmt") ?? "") === "true",
      isActive: String(formData.get("isActive") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingBudgetLineAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingBudgetLine({
      id: String(formData.get("budgetLineId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      budgetId: String(formData.get("budgetId") ?? "").trim(),
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      lineNumber: Number(String(formData.get("lineNumber") ?? "").trim() || 0),
      periodStart: String(formData.get("periodStart") ?? "").trim(),
      periodEnd: String(formData.get("periodEnd") ?? "").trim(),
      accountId: String(formData.get("accountId") ?? "").trim(),
      dimensionValueId:
        String(formData.get("dimensionValueId") ?? "").trim() || null,
      amount: String(formData.get("amount") ?? "").trim(),
      quantity: String(formData.get("quantity") ?? "").trim() || null,
      assumptionsJson:
        String(formData.get("assumptionsJson") ?? "").trim() || null,
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingApprovalPolicyAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingApprovalPolicy({
      id: String(formData.get("approvalPolicyId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      code: String(formData.get("code") ?? ""),
      documentType: String(formData.get("documentType") ?? "").trim(),
      configurationJson: String(formData.get("configurationJson") ?? ""),
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim() || null,
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingAccountControlAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingAccountControl({
      id: String(formData.get("accountControlId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      accountId: String(formData.get("accountId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      defaultCurrencyId:
        String(formData.get("defaultCurrencyId") ?? "").trim() || null,
      systemRole: String(formData.get("systemRole") ?? "").trim() || null,
      isSystemLocked: String(formData.get("isSystemLocked") ?? "") === "true",
      allowDirectPosting:
        String(formData.get("allowDirectPosting") ?? "") === "true",
      requiresParty: String(formData.get("requiresParty") ?? "") === "true",
      requiresChaJob: String(formData.get("requiresChaJob") ?? "") === "true",
      requiresCostCentre:
        String(formData.get("requiresCostCentre") ?? "") === "true",
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingNumberSeriesAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingNumberSeries({
      id: String(formData.get("seriesId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      taxRegistrationId:
        String(formData.get("taxRegistrationId") ?? "").trim() || null,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      documentType: String(formData.get("documentType") ?? ""),
      prefixTemplate: String(formData.get("prefixTemplate") ?? ""),
      nextNumber: String(formData.get("nextNumber") ?? ""),
      padding: Number(formData.get("padding")),
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      isActive: String(formData.get("isActive") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingFiscalYearAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingFiscalYear({
      id: String(formData.get("fiscalYearId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      name: String(formData.get("name") ?? ""),
      startDate: String(formData.get("startDate") ?? "").trim(),
      endDate: String(formData.get("endDate") ?? "").trim(),
      closed: String(formData.get("closed") ?? "") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingPeriodAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.settings.manage");
    const result = await saveAccountingPeriod({
      id: String(formData.get("periodId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      fiscalYearId: String(formData.get("fiscalYearId") ?? "").trim(),
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      periodNumber: Number(formData.get("periodNumber")),
      name: String(formData.get("name") ?? ""),
      startDate: String(formData.get("startDate") ?? "").trim(),
      endDate: String(formData.get("endDate") ?? "").trim(),
      status: String(formData.get("status") ?? "").trim(),
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function requestAccountingPeriodLockAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.period_lock.request");
    const result = await requestAccountingPeriodLock({
      orgId,
      actorId: session.user.id,
      periodId: String(formData.get("periodId") ?? "").trim(),
      reason: String(formData.get("reason") ?? ""),
      reopenFrom: String(formData.get("reopenFrom") ?? "").trim() || null,
      reopenUntil: String(formData.get("reopenUntil") ?? "").trim() || null,
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function approveAccountingPeriodLockAction(
  requestId: string,
  expectedVersion: number,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.period_lock.approve");
    const result = await decideAccountingPeriodLock({
      orgId,
      actorId: session.user.id,
      requestId,
      expectedVersion,
      decision: "APPROVED",
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function rejectAccountingPeriodLockAction(
  requestId: string,
  expectedVersion: number,
  reason: string,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.period_lock.approve");
    const result = await decideAccountingPeriodLock({
      orgId,
      actorId: session.user.id,
      requestId,
      expectedVersion,
      decision: "REJECTED",
      reason,
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function saveAccountingExchangeRateDraftAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.exchange_rate.maintain");
    const result = await saveAccountingExchangeRateDraft({
      id: String(formData.get("rateId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion: Number(String(formData.get("expectedVersion") ?? "").trim() || 0) || undefined,
      fromCurrencyId: String(formData.get("fromCurrencyId") ?? "").trim(),
      toCurrencyId: String(formData.get("toCurrencyId") ?? "").trim(),
      rateDate: String(formData.get("rateDate") ?? "").trim(),
      rate: String(formData.get("rate") ?? "").trim(),
      source: String(formData.get("source") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function approveAccountingExchangeRateAction(
  rateId: string,
  expectedVersion: number,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.exchange_rate.maintain");
    const result = await approveAccountingExchangeRate({
      orgId,
      actorId: session.user.id,
      rateId,
      expectedVersion,
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function rejectAccountingExchangeRateAction(
  rateId: string,
  expectedVersion: number,
  reason: string,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.exchange_rate.maintain");
    const result = await rejectAccountingExchangeRate({
      orgId,
      actorId: session.user.id,
      rateId,
      expectedVersion,
      reason,
    });
    revalidateConfiguration();
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}
