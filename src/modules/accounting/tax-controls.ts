import { db } from "@/lib/db";

function activeDateWhere(date: Date) {
  return {
    effectiveFrom: { lte: date },
    OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
  };
}

function validDate(value: Date | string, label: string) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} is invalid`);
  }
  return date;
}

async function resolveScopedActiveProfile<T>(input: {
  exactLegalEntityId?: string | null;
  findExact: () => Promise<T | null>;
  findDefault: () => Promise<T | null>;
}) {
  if (input.exactLegalEntityId) {
    const exact = await input.findExact();
    if (exact) return exact;
  }
  return input.findDefault();
}

export async function resolveActiveTaxProfile(input: {
  orgId: string;
  taxRegistrationId: string;
  legalEntityId?: string | null;
  date: Date | string;
}) {
  const date = validDate(input.date, "tax profile date");
  return resolveScopedActiveProfile({
    exactLegalEntityId: input.legalEntityId,
    findExact: () =>
      db.accountingTaxProfile.findFirst({
        where: {
          orgId: input.orgId,
          taxRegistrationId: input.taxRegistrationId,
          legalEntityId: input.legalEntityId!,
          isActive: true,
          ...activeDateWhere(date),
        },
        orderBy: [{ version: "desc" }, { effectiveFrom: "desc" }],
      }),
    findDefault: () =>
      db.accountingTaxProfile.findFirst({
        where: {
          orgId: input.orgId,
          taxRegistrationId: input.taxRegistrationId,
          legalEntityId: null,
          isActive: true,
          ...activeDateWhere(date),
        },
        orderBy: [{ version: "desc" }, { effectiveFrom: "desc" }],
      }),
  });
}

export async function resolveActiveTaxRegistration(input: {
  orgId: string;
  legalEntityId: string;
  date: Date | string;
}) {
  const date = validDate(input.date, "tax registration date");
  return db.accountingTaxRegistration.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      isActive: true,
      ...activeDateWhere(date),
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function resolveActiveTaxRule(input: {
  orgId: string;
  taxProfileId: string;
  taxRegistrationId: string;
  legalEntityId?: string | null;
  documentType: string;
  placeOfSupplyType: string;
  counterpartyTreatment: string;
  supplyCategory: string;
  date: Date | string;
}) {
  const date = validDate(input.date, "tax rule date");
  return resolveScopedActiveProfile({
    exactLegalEntityId: input.legalEntityId,
    findExact: () =>
      db.accountingTaxRule.findFirst({
        where: {
          orgId: input.orgId,
          taxProfileId: input.taxProfileId,
          taxRegistrationId: input.taxRegistrationId,
          legalEntityId: input.legalEntityId!,
          documentType: input.documentType,
          placeOfSupplyType: input.placeOfSupplyType,
          counterpartyTreatment: input.counterpartyTreatment,
          supplyCategory: input.supplyCategory,
          isActive: true,
          ...activeDateWhere(date),
        },
        orderBy: [{ version: "desc" }, { effectiveFrom: "desc" }],
        include: {
          components: {
            orderBy: [{ position: "asc" }, { componentCode: "asc" }],
          },
        },
      }),
    findDefault: () =>
      db.accountingTaxRule.findFirst({
        where: {
          orgId: input.orgId,
          taxProfileId: input.taxProfileId,
          taxRegistrationId: input.taxRegistrationId,
          legalEntityId: null,
          documentType: input.documentType,
          placeOfSupplyType: input.placeOfSupplyType,
          counterpartyTreatment: input.counterpartyTreatment,
          supplyCategory: input.supplyCategory,
          isActive: true,
          ...activeDateWhere(date),
        },
        orderBy: [{ version: "desc" }, { effectiveFrom: "desc" }],
        include: {
          components: {
            orderBy: [{ position: "asc" }, { componentCode: "asc" }],
          },
        },
      }),
  });
}

export async function resolveActiveStatutoryReturnProfile(input: {
  orgId: string;
  taxRegistrationId: string;
  legalEntityId?: string | null;
  returnType: string;
  date: Date | string;
}) {
  const date = validDate(input.date, "statutory return date");
  return resolveScopedActiveProfile({
    exactLegalEntityId: input.legalEntityId,
    findExact: () =>
      db.accountingStatutoryReturnProfile.findFirst({
        where: {
          orgId: input.orgId,
          taxRegistrationId: input.taxRegistrationId,
          legalEntityId: input.legalEntityId!,
          returnType: input.returnType,
          isActive: true,
          ...activeDateWhere(date),
        },
        orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
      }),
    findDefault: () =>
      db.accountingStatutoryReturnProfile.findFirst({
        where: {
          orgId: input.orgId,
          taxRegistrationId: input.taxRegistrationId,
          legalEntityId: null,
          returnType: input.returnType,
          isActive: true,
          ...activeDateWhere(date),
        },
        orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
      }),
  });
}

export async function assertStatutoryReportAvailability(input: {
  orgId: string;
  taxRegistrationId: string;
  legalEntityId?: string | null;
  returnType: "GSTR1" | "GSTR2B" | "GST_LEDGER" | string;
  date: Date | string;
}) {
  const profile = await resolveActiveStatutoryReturnProfile(input);
  if (!profile) {
    throw new Error(
      `CONFIGURATION_REQUIRED: no active statutory return profile is configured for ${input.returnType}`,
    );
  }
  if (!profile.statutoryValidated) {
    throw new Error(
      `CONFIGURATION_REQUIRED: statutory return profile for ${input.returnType} is not validated`,
    );
  }
  return profile;
}

export async function resolveDocumentTaxConfiguration(input: {
  orgId: string;
  taxRegistrationId: string;
  legalEntityId?: string | null;
  documentType: string;
  placeOfSupplyType: string;
  counterpartyTreatment: string;
  supplyCategory: string;
  date: Date | string;
}) {
  const profile = await resolveActiveTaxProfile(input);
  if (!profile) {
    throw new Error(
      `CONFIGURATION_REQUIRED: no active tax profile is configured for registration ${input.taxRegistrationId}`,
    );
  }
  if (!profile.statutoryValidated) {
    throw new Error("CONFIGURATION_REQUIRED: active tax profile is not validated");
  }
  const rule = await resolveActiveTaxRule({
    ...input,
    taxProfileId: profile.id,
  });
  if (!rule) {
    throw new Error(
      `CONFIGURATION_REQUIRED: no active tax rule is configured for ${input.documentType}`,
    );
  }
  if (!rule.statutoryValidated) {
    throw new Error("CONFIGURATION_REQUIRED: active tax rule is not validated");
  }
  return { profile, rule };
}
