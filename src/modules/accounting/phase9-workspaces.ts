import { db } from "@/lib/db";
import {
  getConsolidatedGSTLedger,
  getGSTR1Summary,
  getGSTR2BSummary,
} from "./reports";

const REPORT_CATALOG = [
  { code: "pnl", name: "Profit & loss", route: "/accounting/profit-loss" },
  { code: "balance-sheet", name: "Balance sheet", route: "/accounting/balance-sheet" },
  { code: "trial-balance", name: "Trial balance", route: "/accounting/trial-balance" },
  { code: "general-ledger", name: "General ledger", route: "/accounting/general-ledger" },
  { code: "sales-reg", name: "Sales register", route: "/accounting/reports" },
  { code: "purchase-reg", name: "Purchase register", route: "/accounting/reports" },
  { code: "gstr1", name: "GSTR-1", route: "/accounting/reports" },
  { code: "gstr2b", name: "GSTR-2B", route: "/accounting/reports" },
] as const;

export async function getAccountingApprovalWorkflowSummary(orgId: string) {
  const [policies, documents, payments, journals] = await Promise.all([
    db.accountingApprovalPolicy.findMany({
      where: { orgId, isActive: true },
      orderBy: [{ documentType: "asc" }, { version: "desc" }],
    }),
    db.accountingDocument.groupBy({
      by: ["documentType"],
      where: { orgId, status: "PENDING_APPROVAL" },
      _count: { _all: true },
    }),
    db.accountingPayment.groupBy({
      by: ["paymentType"],
      where: { orgId, status: "PENDING_APPROVAL" },
      _count: { _all: true },
    }),
    db.journalEntry.count({ where: { orgId, status: "SUBMITTED" } }),
  ]);

  return {
    activePolicyCount: policies.length,
    policyCoverage: policies.map((policy) => ({
      id: policy.id,
      code: policy.code,
      documentType: policy.documentType,
      version: policy.version,
      configuration: policy.configuration,
    })),
    pendingDocuments: documents.map((row) => ({
      documentType: row.documentType,
      count: row._count._all,
    })),
    pendingPayments: payments.map((row) => ({
      paymentType: row.paymentType,
      count: row._count._all,
    })),
    submittedJournals: journals,
  };
}

export async function getAccountingCommunicationWorkspace(orgId: string) {
  const [exportProfiles, portalProfiles, portalUsers, quotations, queuedEmails] =
    await Promise.all([
      db.accountingReportExportProfile.findMany({
        where: { orgId },
        orderBy: [{ isActive: "desc" }, { reportCode: "asc" }, { name: "asc" }],
        include: { legalEntity: { select: { code: true } } },
      }),
      db.accountingPortalPublicationProfile.findMany({
        where: { orgId },
        orderBy: [{ isActive: "desc" }, { documentType: "asc" }],
        include: {
          legalEntity: { select: { code: true } },
          exportProfile: { select: { name: true, reportCode: true } },
        },
      }),
      db.customerPortalUser.count({ where: { orgId, status: "ACTIVE" } }),
      db.quotation.count({
        where: {
          orgId,
          status: "SENT",
          sentAt: { not: null },
        },
      }),
      db.emailQueue.count({
        where: {
          subject: { contains: "Quotation " },
        },
      }),
    ]);

  return {
    activePortalUsers: portalUsers,
    portalPublishedQuotations: quotations,
    queuedAccountingEmails: queuedEmails,
    exportProfiles: exportProfiles.map((profile) => ({
      id: profile.id,
      reportCode: profile.reportCode,
      name: profile.name,
      deliveryMode: profile.deliveryMode,
      exportFormat: profile.exportFormat,
      legalEntityCode: profile.legalEntity?.code ?? "ORG",
      isPortalVisible: profile.isPortalVisible,
      isActive: profile.isActive,
    })),
    portalProfiles: portalProfiles.map((profile) => ({
      id: profile.id,
      documentType: profile.documentType,
      audienceType: profile.audienceType,
      deliveryMode: profile.deliveryMode,
      exportProfile:
        profile.exportProfile == null
          ? null
          : `${profile.exportProfile.reportCode} · ${profile.exportProfile.name}`,
      legalEntityCode: profile.legalEntity?.code ?? "ORG",
      isActive: profile.isActive,
    })),
  };
}

export async function getAccountingCustomizationWorkspace(orgId: string) {
  const [customFields, automationRules, workspaceModules] = await Promise.all([
    db.accountingCustomFieldDefinition.findMany({
      where: { orgId },
      orderBy: [{ scope: "asc" }, { position: "asc" }, { label: "asc" }],
    }),
    db.accountingAutomationRule.findMany({
      where: { orgId },
      orderBy: [{ targetScope: "asc" }, { name: "asc" }],
    }),
    db.accountingWorkspaceModule.findMany({
      where: { orgId },
      orderBy: [{ isActive: "desc" }, { code: "asc" }],
    }),
  ]);

  return {
    customFields,
    automationRules,
    workspaceModules,
  };
}

export async function getAccountingReportBuilderWorkspace(orgId: string) {
  const [profiles, reportActivity] = await Promise.all([
    db.accountingReportExportProfile.findMany({
      where: { orgId },
      orderBy: [{ isActive: "desc" }, { reportCode: "asc" }, { name: "asc" }],
    }),
    db.accountingPeriodCloseRun.findMany({
      where: { orgId },
      orderBy: [{ closeDate: "desc" }, { createdAt: "desc" }],
      take: 8,
      include: {
        legalEntity: { select: { code: true, legalName: true } },
      },
    }),
  ]);

  return {
    catalog: REPORT_CATALOG.map((report) => ({
      ...report,
      profileCount: profiles.filter((profile) => profile.reportCode === report.code)
        .length,
    })),
    exportProfiles: profiles.map((profile) => ({
      id: profile.id,
      reportCode: profile.reportCode,
      name: profile.name,
      exportFormat: profile.exportFormat,
      deliveryMode: profile.deliveryMode,
      isPortalVisible: profile.isPortalVisible,
      isActive: profile.isActive,
    })),
    latestCloseRuns: reportActivity.map((run) => ({
      id: run.id,
      legalEntity: `${run.legalEntity.code} — ${run.legalEntity.legalName}`,
      status: run.status,
      closeDate: run.closeDate.toISOString(),
    })),
  };
}

export async function getAccountingIntegrationWorkspace(orgId: string) {
  const [sourceMappings, outbox, inbox, recentAttempts] = await Promise.all([
    db.accountingSourceMappingProfile.findMany({
      where: { orgId },
      orderBy: [{ isActive: "desc" }, { sourceSystem: "asc" }, { sourceType: "asc" }],
    }),
    db.accountingIntegrationOutbox.findMany({
      where: { orgId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12,
    }),
    db.accountingIntegrationInbox.findMany({
      where: { orgId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12,
    }),
    db.accountingPostingAttempt.findMany({
      where: { orgId },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: 12,
    }),
  ]);

  return {
    sourceMappings: sourceMappings.map((profile) => ({
      id: profile.id,
      sourceSystem: profile.sourceSystem,
      sourceType: profile.sourceType,
      targetDocumentType: profile.targetDocumentType,
      targetModule: profile.targetModule,
      isActive: profile.isActive,
    })),
    outbox,
    inbox,
    recentAttempts,
  };
}

export function listAccountingReportCatalog() {
  return REPORT_CATALOG;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function safeSettlementSummary<T>(loader: () => Promise<T>) {
  try {
    return await loader();
  } catch {
    return null;
  }
}

export async function getAccountingCurrencyControlWorkspace(orgId: string) {
  const [configuration, foreignCustomerProfiles, foreignVendorProfiles, recentCloseRuns] =
    await Promise.all([
      db.accountingOrganisationProfile.findUnique({
        where: { orgId },
        select: { functionalCurrencyCode: true },
      }),
      db.accountingCustomerProfile.findMany({
        where: { orgId, isActive: true },
        orderBy: [{ updatedAt: "desc" }],
        take: 12,
        select: {
          id: true,
          currencyCode: true,
          crmAccount: { select: { name: true } },
        },
      }),
      db.accountingVendorProfile.findMany({
        where: { orgId, isActive: true },
        orderBy: [{ updatedAt: "desc" }],
        take: 12,
        select: {
          id: true,
          currencyCode: true,
          crmVendor: { select: { name: true } },
        },
      }),
      db.accountingPeriodCloseRun.findMany({
        where: { orgId },
        orderBy: [{ closeDate: "desc" }, { createdAt: "desc" }],
        take: 8,
        include: {
          legalEntity: { select: { code: true, legalName: true } },
          period: { select: { periodNumber: true, name: true } },
        },
      }),
    ]);

  const functionalCurrencyCode =
    configuration?.functionalCurrencyCode?.toUpperCase() ?? "INR";
  const customerForeign = foreignCustomerProfiles.filter(
    (profile) => profile.currencyCode.toUpperCase() !== functionalCurrencyCode,
  );
  const vendorForeign = foreignVendorProfiles.filter(
    (profile) => profile.currencyCode.toUpperCase() !== functionalCurrencyCode,
  );

  return {
    functionalCurrencyCode,
    customerForeign,
    vendorForeign,
    recentCloseRuns: recentCloseRuns.map((run) => ({
      id: run.id,
      rowVersion: run.rowVersion,
      legalEntity: `${run.legalEntity.code} — ${run.legalEntity.legalName}`,
      periodLabel: `P${run.period.periodNumber} · ${run.period.name}`,
      closeDate: run.closeDate.toISOString(),
      status: run.status,
    })),
  };
}

export async function getAccountingTaxSettlementWorkspace(orgId: string) {
  const [
    registrations,
    validatedTaxProfiles,
    validatedReturnProfiles,
    filingPeriods,
    closeRuns,
    transactionLock,
    customerProfiles,
    vendorProfiles,
  ] = await Promise.all([
    db.accountingTaxRegistration.findMany({
      where: { orgId, isActive: true },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        legalEntity: { select: { code: true, legalName: true } },
      },
    }),
    db.accountingTaxProfile.count({
      where: { orgId, isActive: true, statutoryValidated: true },
    }),
    db.accountingStatutoryReturnProfile.count({
      where: { orgId, isActive: true, statutoryValidated: true },
    }),
    db.accountingStatutoryFilingPeriod.findMany({
      where: { orgId },
      orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: {
        profile: { select: { returnType: true, filingFrequency: true } },
        legalEntity: { select: { code: true, legalName: true } },
        taxRegistration: {
          select: { registrationType: true, registrationCode: true },
        },
      },
    }),
    db.accountingPeriodCloseRun.findMany({
      where: { orgId },
      orderBy: [{ closeDate: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: {
        legalEntity: { select: { code: true, legalName: true } },
        period: { select: { periodNumber: true, name: true } },
      },
    }),
    db.transactionLock.findUnique({ where: { orgId } }),
    db.accountingCustomerProfile.count({ where: { orgId, isActive: true } }),
    db.accountingVendorProfile.count({ where: { orgId, isActive: true } }),
  ]);

  const gstr1Period =
    filingPeriods.find((period) => period.returnType === "GSTR1") ?? null;
  const gstr2bPeriod =
    filingPeriods.find((period) => period.returnType === "GSTR2B") ?? null;
  const gstLedgerPeriod = filingPeriods[0] ?? null;

  const [gstr1, gstr2b, gstLedger] = await Promise.all([
    gstr1Period
      ? safeSettlementSummary(() =>
          getGSTR1Summary(orgId, {
            fromDate: gstr1Period.periodStart,
            toDate: gstr1Period.periodEnd,
          }),
        )
      : Promise.resolve(null),
    gstr2bPeriod
      ? safeSettlementSummary(() =>
          getGSTR2BSummary(orgId, {
            fromDate: gstr2bPeriod.periodStart,
            toDate: gstr2bPeriod.periodEnd,
          }),
        )
      : Promise.resolve(null),
    gstLedgerPeriod
      ? safeSettlementSummary(() =>
          getConsolidatedGSTLedger(orgId, {
            fromDate: gstLedgerPeriod.periodStart,
            toDate: gstLedgerPeriod.periodEnd,
          }),
        )
      : Promise.resolve(null),
  ]);

  return {
    metrics: {
      activeRegistrations: registrations.length,
      validatedTaxProfiles,
      validatedReturnProfiles,
      openFilingPeriods: filingPeriods.filter((period) =>
        ["OPEN", "DUE", "READY", "IN_PROGRESS"].includes(period.status),
      ).length,
      customerProfiles,
      vendorProfiles,
      currentLockDate: transactionLock?.lockDate.toISOString().slice(0, 10) ?? null,
    },
    registrations: registrations.map((registration) => ({
      id: registration.id,
      legalEntity: `${registration.legalEntity.code} — ${registration.legalEntity.legalName}`,
      registrationType: registration.registrationType,
      registrationCode: registration.registrationCode,
      effectiveFrom: registration.effectiveFrom
        ? registration.effectiveFrom.toISOString().slice(0, 10)
        : null,
      effectiveTo: registration.effectiveTo?.toISOString().slice(0, 10) ?? null,
    })),
    filingPeriods: filingPeriods.map((period) => ({
      id: period.id,
      rowVersion: period.rowVersion,
      returnType: period.returnType,
      periodLabel: `${period.profile.returnType} · ${period.profile.filingFrequency}`,
      legalEntity: period.legalEntity
        ? `${period.legalEntity.code} — ${period.legalEntity.legalName}`
        : "Registration default",
      registration: `${period.taxRegistration.registrationType} · ${period.taxRegistration.registrationCode}`,
      periodStart: period.periodStart.toISOString().slice(0, 10),
      periodEnd: period.periodEnd.toISOString().slice(0, 10),
      dueDate: period.dueDate?.toISOString().slice(0, 10) ?? null,
      status: period.status,
      acknowledgementRef: period.acknowledgementRef,
      filedAt: period.filedAt?.toISOString() ?? null,
    })),
    closeRuns: closeRuns.map((run) => ({
      id: run.id,
      rowVersion: run.rowVersion,
      legalEntity: `${run.legalEntity.code} — ${run.legalEntity.legalName}`,
      periodLabel: `P${run.period.periodNumber} · ${run.period.name}`,
      closeDate: run.closeDate.toISOString().slice(0, 10),
      status: run.status,
    })),
    gstr1Period: gstr1Period
      ? {
          start: gstr1Period.periodStart.toISOString().slice(0, 10),
          end: gstr1Period.periodEnd.toISOString().slice(0, 10),
        }
      : null,
    gstr1,
    gstr2bPeriod: gstr2bPeriod
      ? {
          start: gstr2bPeriod.periodStart.toISOString().slice(0, 10),
          end: gstr2bPeriod.periodEnd.toISOString().slice(0, 10),
        }
      : null,
    gstr2b,
    gstLedgerPeriod: gstLedgerPeriod
      ? {
          start: gstLedgerPeriod.periodStart.toISOString().slice(0, 10),
          end: gstLedgerPeriod.periodEnd.toISOString().slice(0, 10),
        }
      : null,
    gstLedgerCount: gstLedger?.length ?? 0,
    asOfDate: todayIsoDate(),
  };
}
