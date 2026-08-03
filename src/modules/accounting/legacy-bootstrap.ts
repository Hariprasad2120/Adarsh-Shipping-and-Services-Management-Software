import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import { payloadHash } from "./request-integrity";

const DEFAULT_CURRENCY_CODE = "INR";
const DEFAULT_EFFECTIVE_FROM = new Date("2026-04-01T00:00:00.000Z");
type DbClient = Prisma.TransactionClient;

type BootstrapResult = {
  legalEntityId: string;
  taxRegistrationId: string | null;
};

function startOfUtcDay(value: Date | string) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Bootstrap date is invalid");
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function fiscalYearStartForDate(
  date: Date,
  fiscalYearStartMonth: number,
  fiscalYearStartDay: number,
) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const startYear =
    month < fiscalYearStartMonth ||
    (month === fiscalYearStartMonth && day < fiscalYearStartDay)
      ? year - 1
      : year;
  return new Date(
    Date.UTC(startYear, fiscalYearStartMonth - 1, fiscalYearStartDay, 0, 0, 0, 0),
  );
}

function addUtcMonths(date: Date, months: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0),
  );
}

function addUtcDays(date: Date, days: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, 0, 0, 0, 0),
  );
}

function fiscalYearName(start: Date) {
  return `${start.getUTCFullYear()}-${start.getUTCFullYear() + 1}`;
}

function periodName(periodNumber: number, periodStart: Date) {
  return `${periodStart.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  })} ${periodStart.getUTCFullYear()}`;
}

async function resolveBootstrapActorId(tx: DbClient, orgId: string) {
  const user = await tx.user.findFirst({
    where: { orgId, active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!user) {
    throw new Error("No active user exists to bootstrap Accounting configuration");
  }
  return user.id;
}

async function ensureAccountingProfile(tx: DbClient, orgId: string) {
  const existing = await tx.accountingOrganisationProfile.findUnique({
    where: { orgId },
  });
  if (existing) {
    return existing;
  }
  return tx.accountingOrganisationProfile.create({
    data: {
      orgId,
      functionalCurrencyCode: DEFAULT_CURRENCY_CODE,
      fiscalYearStartMonth: 4,
      fiscalYearStartDay: 1,
      inventoryMode: "SERVICE_ONLY",
      moneyScale: 4,
      quantityScale: 6,
      exchangeRateScale: 10,
      percentageScale: 6,
      roundingMode: "HALF_UP",
      correctionPolicy: {
        autoBootstrapped: true,
        nextOpenPeriod: true,
      },
      correctionPolicyVersion: 1,
    },
  });
}

async function ensureLegalEntity(
  tx: DbClient,
  input: { orgId: string; legalName: string; effectiveFrom: Date },
) {
  const existingDefault = await tx.accountingLegalEntity.findFirst({
    where: { orgId: input.orgId, status: "ACTIVE", isDefault: true },
    orderBy: { createdAt: "asc" },
  });
  if (existingDefault) {
    return existingDefault;
  }

  const existingActive = await tx.accountingLegalEntity.findFirst({
    where: { orgId: input.orgId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (existingActive) {
    return tx.accountingLegalEntity.update({
      where: { id: existingActive.id },
      data: { isDefault: true, rowVersion: { increment: 1 } },
    });
  }

  const existingLegacy = await tx.accountingLegalEntity.findFirst({
    where: { orgId: input.orgId, code: "LEGACY" },
  });
  if (existingLegacy) {
    return tx.accountingLegalEntity.update({
      where: { id: existingLegacy.id },
      data: {
        legalName: existingLegacy.legalName || input.legalName,
        entityType: existingLegacy.entityType || "COMPANY",
        status: "ACTIVE",
        isDefault: true,
        effectiveFrom: existingLegacy.effectiveFrom ?? input.effectiveFrom,
        rowVersion: { increment: 1 },
      },
    });
  }

  return tx.accountingLegalEntity.create({
    data: {
      orgId: input.orgId,
      code: "LEGACY",
      legalName: input.legalName,
      entityType: "COMPANY",
      status: "ACTIVE",
      isDefault: true,
      effectiveFrom: input.effectiveFrom,
    },
  });
}

async function ensureFunctionalCurrency(
  tx: DbClient,
  input: { orgId: string; actorId: string },
) {
  const existing = await tx.accountingCurrency.findFirst({
    where: { orgId: input.orgId, code: DEFAULT_CURRENCY_CODE },
  });
  if (existing) {
    if (existing.isFunctional && existing.isEnabled) {
      return existing;
    }
    await tx.accountingCurrency.updateMany({
      where: { orgId: input.orgId, isFunctional: true, id: { not: existing.id } },
      data: { isFunctional: false, rowVersion: { increment: 1 } },
    });
    return tx.accountingCurrency.update({
      where: { id: existing.id },
      data: {
        isFunctional: true,
        isEnabled: true,
        rowVersion: { increment: 1 },
      },
    });
  }

  await tx.accountingCurrency.updateMany({
    where: { orgId: input.orgId, isFunctional: true },
    data: { isFunctional: false, rowVersion: { increment: 1 } },
  });
  return tx.accountingCurrency.create({
    data: {
      orgId: input.orgId,
      code: DEFAULT_CURRENCY_CODE,
      name: "Indian Rupee",
      symbol: "Rs",
      decimalPlaces: 2,
      isFunctional: true,
      isEnabled: true,
    },
  });
}

async function ensureFiscalYearForDate(
  tx: DbClient,
  input: {
    orgId: string;
    date: Date;
    fiscalYearStartMonth: number;
    fiscalYearStartDay: number;
  },
) {
  const startDate = fiscalYearStartForDate(
    input.date,
    input.fiscalYearStartMonth,
    input.fiscalYearStartDay,
  );
  const endDate = addUtcDays(addUtcMonths(startDate, 12), -1);
  const existing = await tx.fiscalYear.findFirst({
    where: {
      orgId: input.orgId,
      startDate: { lte: input.date },
      endDate: { gte: input.date },
    },
  });
  if (existing) {
    return existing;
  }
  return tx.fiscalYear.create({
    data: {
      orgId: input.orgId,
      name: fiscalYearName(startDate),
      startDate,
      endDate,
      closed: false,
    },
  });
}

async function ensurePeriodsForFiscalYear(
  tx: DbClient,
  fiscalYear: { id: string; orgId: string; startDate: Date },
) {
  for (let index = 0; index < 12; index += 1) {
    const periodStart = addUtcMonths(fiscalYear.startDate, index);
    const periodEnd = addUtcDays(addUtcMonths(periodStart, 1), -1);
    const existing = await tx.accountingPeriod.findFirst({
      where: {
        orgId: fiscalYear.orgId,
        fiscalYearId: fiscalYear.id,
        periodNumber: index + 1,
      },
      select: { id: true },
    });
    if (existing) {
      continue;
    }
    await tx.accountingPeriod.create({
      data: {
        orgId: fiscalYear.orgId,
        fiscalYearId: fiscalYear.id,
        periodNumber: index + 1,
        name: periodName(index + 1, periodStart),
        startDate: periodStart,
        endDate: periodEnd,
        status: "OPEN",
      },
    });
  }
}

async function resolveAccountingPeriodId(
  tx: DbClient,
  orgId: string,
  postingDate: Date,
) {
  const period = await tx.accountingPeriod.findFirst({
    where: {
      orgId,
      startDate: { lte: postingDate },
      endDate: { gte: postingDate },
    },
    orderBy: { startDate: "asc" },
    select: { id: true },
  });
  return period?.id ?? null;
}

async function ensureApprovalPolicies(
  tx: DbClient,
  orgId: string,
  effectiveFrom: Date,
) {
  const documentTypes = [
    "JOURNAL_ENTRY",
    "SALES_INVOICE",
    "PURCHASE_INVOICE",
    "PAYMENT_ENTRY",
    "CUSTOMER_NOTE",
    "VENDOR_NOTE",
  ];
  for (const documentType of documentTypes) {
    const existing = await tx.accountingApprovalPolicy.findFirst({
      where: {
        orgId,
        documentType,
        isActive: true,
        effectiveFrom: { lte: effectiveFrom },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
      },
      select: { id: true },
    });
    if (existing) {
      continue;
    }
    await tx.accountingApprovalPolicy.create({
      data: {
        orgId,
        code: `LEGACY_AUTO_${documentType}`,
        documentType,
        version: 1,
        configuration: {
          autoBootstrapped: true,
          requireSupportingDocuments: false,
          separatePosterRequired: false,
        },
        isActive: true,
        effectiveFrom,
      },
    });
  }
}

async function ensureNumberSeries(
  tx: DbClient,
  input: {
    orgId: string;
    effectiveFrom: Date;
    taxRegistrationId: string | null;
  },
) {
  const series: Array<{ documentType: string; prefixTemplate: string }> = [
    { documentType: "JOURNAL_ENTRY", prefixTemplate: "JV/{FY}/" },
    { documentType: "SALES_INVOICE", prefixTemplate: "SI/{FY}/" },
    { documentType: "PURCHASE_INVOICE", prefixTemplate: "PI/{FY}/" },
    { documentType: "PAYMENT_ENTRY", prefixTemplate: "PAY/{FY}/" },
    { documentType: "CUSTOMER_NOTE", prefixTemplate: "CN/{FY}/" },
    { documentType: "VENDOR_NOTE", prefixTemplate: "VN/{FY}/" },
  ];

  for (const item of series) {
    const existing = await tx.accountingNumberSeries.findFirst({
      where: {
        orgId: input.orgId,
        documentType: item.documentType,
        isActive: true,
        effectiveFrom: { lte: input.effectiveFrom },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.effectiveFrom } }],
      },
      select: { id: true },
    });
    if (existing) {
      continue;
    }
    await tx.accountingNumberSeries.create({
      data: {
        orgId: input.orgId,
        taxRegistrationId: input.taxRegistrationId,
        documentType: item.documentType,
        prefixTemplate: item.prefixTemplate,
        nextNumber: BigInt(1),
        padding: 4,
        effectiveFrom: input.effectiveFrom,
        isActive: true,
      },
    });
  }
}

async function ensureRoundingPolicy(
  tx: DbClient,
  orgId: string,
  effectiveFrom: Date,
) {
  const existing = await tx.accountingRoundingPolicy.findFirst({
    where: {
      orgId,
      isActive: true,
      effectiveFrom: { lte: effectiveFrom },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
    },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }
  const latest = await tx.accountingRoundingPolicy.findFirst({
    where: { orgId, code: "LEGACY_AUTO_MONEY" },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const created = await tx.accountingRoundingPolicy.create({
    data: {
      orgId,
      code: "LEGACY_AUTO_MONEY",
      version: (latest?.version ?? 0) + 1,
      purpose: "GENERAL_LEDGER_POSTING",
      currencyCode: DEFAULT_CURRENCY_CODE,
      scale: 2,
      roundingMode: "HALF_UP",
      statutoryValidated: true,
      configuration: {
        allowRounding: true,
        autoBootstrapped: true,
      },
      effectiveFrom,
      isActive: true,
    },
  });
  return created.id;
}

async function ensureTaxRegistration(
  tx: DbClient,
  input: {
    orgId: string;
    legalEntityId: string;
    legalName: string;
    effectiveFrom: Date;
  },
) {
  const active = await tx.accountingTaxRegistration.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      isActive: true,
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.effectiveFrom } }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (active) {
    return active;
  }

  const existing = await tx.accountingTaxRegistration.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    return tx.accountingTaxRegistration.update({
      where: { id: existing.id },
      data: {
        legalName: existing.legalName ?? input.legalName,
        registrationType: existing.registrationType || "GST",
        registrationCode: existing.registrationCode || "LEGACY-GST",
        isActive: true,
        effectiveFrom: existing.effectiveFrom ?? input.effectiveFrom,
        rowVersion: { increment: 1 },
      },
    });
  }

  return tx.accountingTaxRegistration.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      registrationCode: "LEGACY-GST",
      registrationType: "GST",
      legalName: input.legalName,
      effectiveFrom: input.effectiveFrom,
      isActive: true,
      configuration: {
        autoBootstrapped: true,
      },
    },
  });
}

async function ensureTaxProfile(
  tx: DbClient,
  input: {
    orgId: string;
    legalEntityId: string;
    taxRegistrationId: string;
    effectiveFrom: Date;
  },
) {
  const existing = await tx.accountingTaxProfile.findFirst({
    where: {
      orgId: input.orgId,
      taxRegistrationId: input.taxRegistrationId,
      legalEntityId: input.legalEntityId,
      isActive: true,
      effectiveFrom: { lte: input.effectiveFrom },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.effectiveFrom } }],
    },
    orderBy: [{ version: "desc" }, { effectiveFrom: "desc" }],
  });
  if (existing) {
    return existing;
  }
  return tx.accountingTaxProfile.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      taxRegistrationId: input.taxRegistrationId,
      code: "LEGACY_GST_DEFAULT",
      name: "Legacy GST Default",
      version: 1,
      configuration: {
        autoBootstrapped: true,
        defaultRatePercent: 18,
      },
      statutoryValidated: true,
      effectiveFrom: input.effectiveFrom,
      isActive: true,
    },
  });
}

async function ensureTaxRules(
  tx: DbClient,
  input: {
    orgId: string;
    legalEntityId: string;
    taxRegistrationId: string;
    taxProfileId: string;
    effectiveFrom: Date;
  },
) {
  const ruleSpecs = [
    {
      documentType: "SALES_INVOICE",
      partyType: "CUSTOMER",
    },
    {
      documentType: "PURCHASE_INVOICE",
      partyType: "SUPPLIER",
    },
    {
      documentType: "CUSTOMER_CREDIT_NOTE",
      partyType: "CUSTOMER",
    },
    {
      documentType: "CUSTOMER_DEBIT_NOTE",
      partyType: "CUSTOMER",
    },
    {
      documentType: "VENDOR_CREDIT_NOTE",
      partyType: "SUPPLIER",
    },
    {
      documentType: "VENDOR_DEBIT_NOTE",
      partyType: "SUPPLIER",
    },
  ] as const;

  for (const spec of ruleSpecs) {
    const counterpartyTreatment =
      spec.partyType === "CUSTOMER" ? "CONSUMER" : "UNREGISTERED_BUSINESS";
    const existing = await tx.accountingTaxRule.findFirst({
      where: {
        orgId: input.orgId,
        taxProfileId: input.taxProfileId,
        legalEntityId: input.legalEntityId,
        taxRegistrationId: input.taxRegistrationId,
        documentType: spec.documentType,
        placeOfSupplyType: "INTER_STATE",
        counterpartyTreatment,
        supplyCategory: "SERVICE",
        isActive: true,
        effectiveFrom: { lte: input.effectiveFrom },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.effectiveFrom } }],
      },
      select: { id: true },
    });
    if (existing) {
      continue;
    }
    await tx.accountingTaxRule.create({
      data: {
        orgId: input.orgId,
        taxProfileId: input.taxProfileId,
        legalEntityId: input.legalEntityId,
        taxRegistrationId: input.taxRegistrationId,
        code: `LEGACY_${spec.documentType}_GST18`,
        documentType: spec.documentType,
        placeOfSupplyType: "INTER_STATE",
        counterpartyTreatment,
        supplyCategory: "SERVICE",
        version: 1,
        configuration: {
          autoBootstrapped: true,
          taxRatePercent: 18,
        },
        statutoryValidated: true,
        effectiveFrom: input.effectiveFrom,
        isActive: true,
        components: {
          create: [
            {
              orgId: input.orgId,
              componentCode: "IGST_18",
              componentType: "TAX",
              ratePercent: "18",
              position: 1,
            },
          ],
        },
      },
    });
  }
}

async function findAccountIdByType(
  tx: DbClient,
  input: {
    orgId: string;
    legalEntityId: string;
    preferredId?: string | null;
    accountTypes: string[];
  },
) {
  const preferredId = input.preferredId?.trim() || null;
  if (preferredId) {
    const preferred = await tx.account.findFirst({
      where: {
        id: preferredId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        isActive: true,
        isGroup: false,
      },
      select: { id: true },
    });
    if (preferred) {
      return preferred.id;
    }
  }

  const fallback = await tx.account.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      isActive: true,
      isGroup: false,
      accountType: { in: input.accountTypes },
    },
    orderBy: { accountCode: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

async function ensureDocumentPolicies(
  tx: DbClient,
  input: {
    orgId: string;
    actorId: string;
    legalEntityId: string;
    effectiveFrom: Date;
  },
) {
  const settings = await tx.accountingSettings.findUnique({
    where: { orgId: input.orgId },
  });

  const receivableAccountId = await findAccountIdByType(tx, {
    orgId: input.orgId,
    legalEntityId: input.legalEntityId,
    preferredId: settings?.defaultReceivableAccountId,
    accountTypes: ["RECEIVABLE"],
  });
  const payableAccountId = await findAccountIdByType(tx, {
    orgId: input.orgId,
    legalEntityId: input.legalEntityId,
    preferredId: settings?.defaultPayableAccountId,
    accountTypes: ["PAYABLE"],
  });
  const salesAccountId = await findAccountIdByType(tx, {
    orgId: input.orgId,
    legalEntityId: input.legalEntityId,
    preferredId: settings?.defaultSalesAccountId,
    accountTypes: ["INCOME"],
  });
  const purchaseAccountId = await findAccountIdByType(tx, {
    orgId: input.orgId,
    legalEntityId: input.legalEntityId,
    preferredId: settings?.defaultPurchaseAccountId,
    accountTypes: ["EXPENSE"],
  });
  const taxAccountId = await findAccountIdByType(tx, {
    orgId: input.orgId,
    legalEntityId: input.legalEntityId,
    preferredId: settings?.defaultTaxAccountId,
    accountTypes: ["TAX"],
  });
  const salaryPayableAccountId = await findAccountIdByType(tx, {
    orgId: input.orgId,
    legalEntityId: input.legalEntityId,
    preferredId: settings?.defaultSalaryPayableAccountId,
    accountTypes: ["PAYABLE"],
  });

  const createPolicy = async (
    documentType: string,
    configuration: Prisma.InputJsonObject,
  ) => {
    const existing = await tx.accountingDocumentPolicy.findFirst({
      where: {
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        documentType,
        isActive: true,
        effectiveFrom: { lte: input.effectiveFrom },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.effectiveFrom } }],
      },
      select: { id: true },
    });
    if (existing) {
      return existing.id;
    }
    const created = await tx.accountingDocumentPolicy.create({
      data: {
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        documentType,
        version: 1,
        configuration,
        configurationHash: payloadHash(configuration),
        statutoryValidated: true,
        approvedById: input.actorId,
        approvedAt: new Date(),
        effectiveFrom: input.effectiveFrom,
        isActive: true,
      },
    });
    return created.id;
  };

  const salesPolicyId = await createPolicy("SALES_INVOICE", {
    autoBootstrapped: true,
    currencyCode: DEFAULT_CURRENCY_CODE,
    receivableAccountId,
    revenueAccountId: salesAccountId,
    taxAccountId,
    allowZeroTax: true,
  });

  const purchasePolicyId = await createPolicy("PURCHASE_INVOICE", {
    autoBootstrapped: true,
    currencyCode: DEFAULT_CURRENCY_CODE,
    payableAccountId,
    expenseAccountId: purchaseAccountId,
    taxAccountId,
    allowZeroTax: true,
  });

  await createPolicy("CUSTOMER_RECEIPT", {
    autoBootstrapped: true,
    currencyCode: DEFAULT_CURRENCY_CODE,
    allowUnappliedPayments: true,
    paymentMethod: "BANK_RECEIPT",
  });
  await createPolicy("VENDOR_PAYMENT", {
    autoBootstrapped: true,
    currencyCode: DEFAULT_CURRENCY_CODE,
    allowUnappliedPayments: true,
    paymentMethod: "BANK_PAYMENT",
  });
  await createPolicy("PAYROLL_PAYMENT", {
    autoBootstrapped: true,
    currencyCode: DEFAULT_CURRENCY_CODE,
    payableAccountId: salaryPayableAccountId ?? payableAccountId,
    paymentMethod: "BANK_TRANSFER",
  });
  await createPolicy("CUSTOMER_CREDIT_NOTE", {
    autoBootstrapped: true,
    currencyCode: DEFAULT_CURRENCY_CODE,
    receivableAccountId,
    revenueAccountId: salesAccountId,
    taxAccountId,
    allowZeroTax: true,
    preserveOriginalPolicyId: salesPolicyId,
  });
  await createPolicy("CUSTOMER_DEBIT_NOTE", {
    autoBootstrapped: true,
    currencyCode: DEFAULT_CURRENCY_CODE,
    receivableAccountId,
    revenueAccountId: salesAccountId,
    taxAccountId,
    allowZeroTax: true,
    preserveOriginalPolicyId: salesPolicyId,
  });
  await createPolicy("VENDOR_CREDIT_NOTE", {
    autoBootstrapped: true,
    currencyCode: DEFAULT_CURRENCY_CODE,
    payableAccountId,
    expenseAccountId: purchaseAccountId,
    taxAccountId,
    allowZeroTax: true,
    preserveOriginalPolicyId: purchasePolicyId,
  });
  await createPolicy("VENDOR_DEBIT_NOTE", {
    autoBootstrapped: true,
    currencyCode: DEFAULT_CURRENCY_CODE,
    payableAccountId,
    expenseAccountId: purchaseAccountId,
    taxAccountId,
    allowZeroTax: true,
    preserveOriginalPolicyId: purchasePolicyId,
  });
}

async function ensureAccountControls(
  tx: DbClient,
  input: {
    orgId: string;
    currencyId: string;
    effectiveFrom: Date;
  },
) {
  const settings = await tx.accountingSettings.findUnique({
    where: { orgId: input.orgId },
    select: {
      defaultReceivableAccountId: true,
      defaultPayableAccountId: true,
    },
  });
  const postingAccounts = await tx.account.findMany({
    where: {
      orgId: input.orgId,
      isActive: true,
      isGroup: false,
    },
    select: {
      id: true,
      accountType: true,
    },
  });

  for (const account of postingAccounts) {
    const existing = await tx.accountingAccountControl.findFirst({
      where: {
        orgId: input.orgId,
        accountId: account.id,
      },
      select: { id: true },
    });
    const requiresParty =
      account.id === settings?.defaultReceivableAccountId ||
      account.id === settings?.defaultPayableAccountId;
    if (existing) {
      await tx.accountingAccountControl.update({
        where: { id: existing.id },
        data: {
          defaultCurrencyId: input.currencyId,
          requiresParty,
          effectiveFrom: input.effectiveFrom,
          rowVersion: { increment: 1 },
        },
      });
      continue;
    }
    await tx.accountingAccountControl.create({
      data: {
        orgId: input.orgId,
        accountId: account.id,
        defaultCurrencyId: input.currencyId,
        isSystemLocked: false,
        allowDirectPosting: true,
        requiresParty,
        requiresChaJob: false,
        requiresCostCentre: false,
        effectiveFrom: input.effectiveFrom,
      },
    });
  }
}

async function ensureCounterpartyScope(
  tx: DbClient,
  input: {
    orgId: string;
    actorId: string;
    legalEntityId: string;
    partyType: "CUSTOMER" | "SUPPLIER";
    partyId: string;
    effectiveFrom: Date;
  },
) {
  const existing = await tx.accountingCounterpartyEntityScope.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      partyType: input.partyType,
      partyId: input.partyId,
      isActive: true,
      effectiveFrom: { lte: input.effectiveFrom },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.effectiveFrom } }],
    },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }
  const latest = await tx.accountingCounterpartyEntityScope.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      partyType: input.partyType,
      partyId: input.partyId,
    },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const created = await tx.accountingCounterpartyEntityScope.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      partyType: input.partyType,
      partyId: input.partyId,
      version: (latest?.version ?? 0) + 1,
      isActive: true,
      effectiveFrom: input.effectiveFrom,
      approvedById: input.actorId,
      approvedAt: new Date(),
    },
  });
  return created.id;
}

export async function ensureLegacyAccountingOperationalBootstrap(
  orgId: string,
  dateInput: Date | string,
): Promise<BootstrapResult> {
  const date = startOfUtcDay(dateInput);
  return db.$transaction(
    async (tx) => {
      const organisation = await tx.organisation.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, createdAt: true },
      });
      if (!organisation) {
        throw new Error("Organization was not found for Accounting bootstrap");
      }
      const actorId = await resolveBootstrapActorId(tx, orgId);
      const profile = await ensureAccountingProfile(tx, orgId);
      const effectiveFrom =
        profile.fiscalYearStartMonth && profile.fiscalYearStartDay
          ? fiscalYearStartForDate(date, profile.fiscalYearStartMonth, profile.fiscalYearStartDay)
          : DEFAULT_EFFECTIVE_FROM;
      const legalEntity = await ensureLegalEntity(tx, {
        orgId,
        legalName: organisation.name,
        effectiveFrom,
      });

      const currency = await ensureFunctionalCurrency(tx, { orgId, actorId });
      if (profile.functionalCurrencyCode !== DEFAULT_CURRENCY_CODE) {
        await tx.accountingOrganisationProfile.update({
          where: { orgId },
          data: {
            functionalCurrencyCode: DEFAULT_CURRENCY_CODE,
            rowVersion: { increment: 1 },
          },
        });
      }

      await tx.account.updateMany({
        where: { orgId, legalEntityId: null },
        data: { legalEntityId: legalEntity.id },
      });
      await ensureAccountControls(tx, {
        orgId,
        currencyId: currency.id,
        effectiveFrom,
      });

      const currentFiscalYear = await ensureFiscalYearForDate(tx, {
        orgId,
        date,
        fiscalYearStartMonth: profile.fiscalYearStartMonth,
        fiscalYearStartDay: profile.fiscalYearStartDay,
      });
      const allFiscalYears = await tx.fiscalYear.findMany({
        where: { orgId },
        select: { id: true, orgId: true, startDate: true },
      });
      for (const fiscalYear of allFiscalYears.length ? allFiscalYears : [currentFiscalYear]) {
        await ensurePeriodsForFiscalYear(tx, fiscalYear);
      }

      const taxRegistration = await ensureTaxRegistration(tx, {
        orgId,
        legalEntityId: legalEntity.id,
        legalName: legalEntity.legalName,
        effectiveFrom,
      });
      const taxProfile = await ensureTaxProfile(tx, {
        orgId,
        legalEntityId: legalEntity.id,
        taxRegistrationId: taxRegistration.id,
        effectiveFrom,
      });

      await ensureApprovalPolicies(tx, orgId, effectiveFrom);
      await ensureNumberSeries(tx, {
        orgId,
        effectiveFrom,
        taxRegistrationId: taxRegistration.id,
      });
      await ensureRoundingPolicy(tx, orgId, effectiveFrom);
      await ensureTaxRules(tx, {
        orgId,
        legalEntityId: legalEntity.id,
        taxRegistrationId: taxRegistration.id,
        taxProfileId: taxProfile.id,
        effectiveFrom,
      });
      await ensureDocumentPolicies(tx, {
        orgId,
        actorId,
        legalEntityId: legalEntity.id,
        effectiveFrom,
      });

      const journals = await tx.journalEntry.findMany({
        where: {
          orgId,
          status: "DRAFT",
          OR: [
            { legalEntityId: null },
            { accountingPeriodId: null },
            { functionalCurrencyCode: null },
          ],
        },
        select: { id: true, postingDate: true },
      });
      for (const journal of journals) {
        const accountingPeriodId = await resolveAccountingPeriodId(tx, orgId, journal.postingDate);
        await tx.journalEntry.update({
          where: { id: journal.id },
          data: {
            legalEntityId: legalEntity.id,
            accountingPeriodId,
            functionalCurrencyCode: DEFAULT_CURRENCY_CODE,
          },
        });
      }

      return {
        legalEntityId: legalEntity.id,
        taxRegistrationId: taxRegistration.id,
      };
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
}

export async function ensureLegacyCounterpartyEntityScope(input: {
  orgId: string;
  legalEntityId: string;
  partyType: "CUSTOMER" | "SUPPLIER";
  partyId: string;
  date: Date | string;
}) {
  const effectiveFrom = startOfUtcDay(input.date);
  return db.$transaction(
    async (tx) => {
      const actorId = await resolveBootstrapActorId(tx, input.orgId);
      return ensureCounterpartyScope(tx, {
        orgId: input.orgId,
        actorId,
        legalEntityId: input.legalEntityId,
        partyType: input.partyType,
        partyId: input.partyId,
        effectiveFrom,
      });
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}
