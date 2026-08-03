import { Prisma } from "@/generated/prisma/client";

import { db } from "@/lib/db";

import {
  addDecimalStrings,
  compareDecimalStrings,
  divideDecimalStrings,
  minimumDecimalString,
  multiplyDecimalStrings,
  normalizeDecimalString,
  subtractDecimalStrings,
} from "./operational-helpers";

export const QUOTATION_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "PARTIALLY_CONVERTED",
  "CONVERTED",
  "CANCELLED",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_SEND_STATUSES = [
  "NOT_SENT",
  "QUEUED",
  "FAILED",
  "DELIVERED_INTERNAL",
] as const;

export type QuotationSendStatus = (typeof QUOTATION_SEND_STATUSES)[number];

export type QuotationLifecycleSource = "INTERNAL" | "PORTAL" | "SYSTEM";

export type QuotationLineDraftInput = {
  id?: string;
  itemMasterId?: string | null;
  itemName: string;
  description?: string | null;
  hsnSac?: string | null;
  qty: string;
  uom?: string | null;
  rate: string;
  discountType?: "AMOUNT" | "PERCENT";
  discountValue?: string | null;
  taxRate: string;
  taxMode?: "EXCLUSIVE" | "INCLUSIVE";
  jobId?: string | null;
  reportingTags?: Prisma.InputJsonValue | null;
  customFieldValues?: Prisma.InputJsonValue | null;
};

export type SaveQuotationDraftInput = {
  id?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  quotationNumber?: string | null;
  legalEntityId?: string | null;
  branchId?: string | null;
  customerId: string;
  customerContactId?: string | null;
  postingDate?: string | Date | null;
  validUntil: string | Date;
  referenceNumber?: string | null;
  currencyCode?: string | null;
  exchangeRate?: string | null;
  exchangeRateEvidence?: Prisma.InputJsonValue | null;
  paymentTermId?: string | null;
  paymentTermName?: string | null;
  salespersonId?: string | null;
  jobId?: string | null;
  priceListId?: string | null;
  subject?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  internalRemarks?: string | null;
  customerVisibleRemarks?: string | null;
  remarks?: string | null;
  discountType?: "AMOUNT" | "PERCENT";
  discountValue?: string | null;
  additionalCharges?: string | null;
  roundingAdjustment?: string | null;
  attachmentReferences?: Prisma.InputJsonValue | null;
  templateVersion?: string | null;
  lines: QuotationLineDraftInput[];
};

export type QuotationListFilters = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: QuotationStatus | "ALL";
  customerId?: string | null;
  branchId?: string | null;
  legalEntityId?: string | null;
  salespersonId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  expiringSoon?: boolean;
};

const QUOTATION_TRANSITIONS: Record<
  QuotationStatus,
  readonly QuotationStatus[]
> = {
  DRAFT: ["PENDING_APPROVAL", "SENT", "CANCELLED"],
  PENDING_APPROVAL: ["DRAFT", "SENT", "CANCELLED"],
  SENT: ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"],
  ACCEPTED: ["PARTIALLY_CONVERTED", "CONVERTED"],
  DECLINED: [],
  EXPIRED: [],
  PARTIALLY_CONVERTED: ["CONVERTED"],
  CONVERTED: [],
  CANCELLED: [],
};

function json(value: unknown) {
  return value == null
    ? Prisma.JsonNull
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}

function optionalText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function parseDateValue(value: string | Date | null | undefined, field: string) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field.toUpperCase()}_INVALID`);
  }
  return date;
}

function normalizeMoney(value: string | null | undefined, fallback = "0") {
  return normalizeDecimalString(String(value ?? fallback), { maxScale: 8 });
}

function assertQuotationStatus(status: string): QuotationStatus {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (
    !QUOTATION_STATUSES.includes(normalized as QuotationStatus)
  ) {
    throw new Error("QUOTATION_STATUS_INVALID");
  }
  return normalized as QuotationStatus;
}

export function assertQuotationTransition(
  fromStatus: string,
  toStatus: string,
) {
  const from = assertQuotationStatus(fromStatus);
  const to = assertQuotationStatus(toStatus);
  if (from === to) return to;
  if (!QUOTATION_TRANSITIONS[from].includes(to)) {
    throw new Error(`QUOTATION_TRANSITION_INVALID: ${from} -> ${to}`);
  }
  return to;
}

function serializePartyAddress(input: {
  name?: string | null;
  gstin?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
}) {
  return {
    name: input.name ?? null,
    gstin: input.gstin ?? null,
    billingAddress: input.billingAddress ?? null,
    shippingAddress: input.shippingAddress ?? null,
  };
}

type CalculatedQuotationLine = {
  itemMasterId: string | null;
  itemName: string;
  descriptionSnapshot: string | null;
  hsnSac: string | null;
  qty: string;
  uom: string | null;
  rate: string;
  discountType: "AMOUNT" | "PERCENT";
  discountValue: string;
  taxRate: string;
  taxMode: "EXCLUSIVE" | "INCLUSIVE";
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  itemSnapshot: Prisma.InputJsonValue;
  jobId: string | null;
  reportingTags: Prisma.InputJsonValue | null;
  customFieldValues: Prisma.InputJsonValue | null;
};

export function calculateQuotationTotals(input: {
  currencyCode?: string | null;
  discountType?: "AMOUNT" | "PERCENT";
  discountValue?: string | null;
  additionalCharges?: string | null;
  roundingAdjustment?: string | null;
  lines: Array<{
    qty: string;
    rate: string;
    taxRate: string;
    discountType?: "AMOUNT" | "PERCENT";
    discountValue?: string | null;
    taxMode?: "EXCLUSIVE" | "INCLUSIVE";
  }>;
}) {
  const calculatedLines = input.lines.map((line) => {
    const qty = normalizeMoney(line.qty);
    const rate = normalizeMoney(line.rate);
    const taxRate = normalizeMoney(line.taxRate);
    if (compareDecimalStrings(qty, "0") <= 0) {
      throw new Error("QUOTATION_LINE_QTY_INVALID");
    }
    if (compareDecimalStrings(rate, "0") < 0) {
      throw new Error("QUOTATION_LINE_RATE_INVALID");
    }
    const gross = multiplyDecimalStrings(qty, rate);
    const discountType = line.discountType === "PERCENT" ? "PERCENT" : "AMOUNT";
    const discountValue = normalizeMoney(line.discountValue);
    const lineDiscount =
      discountType === "PERCENT"
        ? divideDecimalStrings(
            multiplyDecimalStrings(gross, discountValue),
            "100",
            8,
          )
        : discountValue;
    const boundedDiscount = minimumDecimalString(lineDiscount, gross);
    const taxMode = line.taxMode === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";
    if (taxMode === "INCLUSIVE") {
      const divisor = addDecimalStrings("1", divideDecimalStrings(taxRate, "100", 8));
      const inclusiveNet = divideDecimalStrings(
        subtractDecimalStrings(gross, boundedDiscount),
        divisor,
        8,
      );
      const taxAmount = subtractDecimalStrings(
        subtractDecimalStrings(gross, boundedDiscount),
        inclusiveNet,
      );
      return {
        gross,
        lineDiscount: boundedDiscount,
        taxableAmount: inclusiveNet,
        taxAmount,
        lineTotal: subtractDecimalStrings(gross, boundedDiscount),
      };
    }
    const taxableAmount = subtractDecimalStrings(gross, boundedDiscount);
    const taxAmount = divideDecimalStrings(
      multiplyDecimalStrings(taxableAmount, taxRate),
      "100",
      8,
    );
    return {
      gross,
      lineDiscount: boundedDiscount,
      taxableAmount,
      taxAmount,
      lineTotal: addDecimalStrings(taxableAmount, taxAmount),
    };
  });

  const grossSubtotal = addDecimalStrings(
    ...calculatedLines.map((line) => line.gross),
  );
  const lineDiscountTotal = addDecimalStrings(
    ...calculatedLines.map((line) => line.lineDiscount),
  );
  const preDocumentTaxable = addDecimalStrings(
    ...calculatedLines.map((line) => line.taxableAmount),
  );
  const documentDiscountType =
    input.discountType === "PERCENT" ? "PERCENT" : "AMOUNT";
  const documentDiscountValue = normalizeMoney(input.discountValue);
  const documentDiscount =
    documentDiscountType === "PERCENT"
      ? divideDecimalStrings(
          multiplyDecimalStrings(preDocumentTaxable, documentDiscountValue),
          "100",
          8,
        )
      : documentDiscountValue;
  const boundedDocumentDiscount = minimumDecimalString(
    documentDiscount,
    preDocumentTaxable,
  );
  const taxableSubtotal = subtractDecimalStrings(
    preDocumentTaxable,
    boundedDocumentDiscount,
  );
  const taxAmount = addDecimalStrings(
    ...calculatedLines.map((line) => line.taxAmount),
  );
  const additionalCharges = normalizeMoney(input.additionalCharges);
  const roundingAdjustment = normalizeMoney(input.roundingAdjustment, "0");
  const grandTotal = addDecimalStrings(
    taxableSubtotal,
    taxAmount,
    additionalCharges,
    roundingAdjustment,
  );

  return {
    currencyCode: (input.currencyCode || "INR").toUpperCase(),
    grossSubtotal,
    lineDiscountTotal,
    discountAmount: boundedDocumentDiscount,
    taxableSubtotal,
    taxAmount,
    additionalCharges,
    roundingAdjustment,
    grandTotal,
    calculatedLines,
  };
}

function deriveApprovalRequirement(input: {
  total: string;
  legalEntityId?: string | null;
  branchId?: string | null;
  discountAmount: string;
  policy:
    | {
        id: string;
        version: number;
        configuration: Prisma.JsonValue;
      }
    | null;
}) {
  if (!input.policy) {
    return {
      approvalRequired: false,
      policyId: null,
      policyVersion: null,
      approvalState: null,
    };
  }
  const config =
    input.policy.configuration &&
    typeof input.policy.configuration === "object" &&
    !Array.isArray(input.policy.configuration)
      ? (input.policy.configuration as Record<string, unknown>)
      : {};
  const threshold = optionalText(String(config.minimumAmountForApproval ?? "")) || "0";
  const maxAutoDiscount =
    optionalText(String(config.maxAutoDiscountAmount ?? "")) || null;
  const needsAmountApproval = compareDecimalStrings(input.total, normalizeMoney(threshold)) > 0;
  const needsDiscountApproval =
    maxAutoDiscount != null &&
    compareDecimalStrings(
      input.discountAmount,
      normalizeMoney(maxAutoDiscount),
    ) > 0;
  const explicitMode = String(config.approvalMode ?? "").trim().toUpperCase();
  const approvalRequired =
    explicitMode === "ALWAYS" ||
    explicitMode === "MAKER_CHECKER" ||
    needsAmountApproval ||
    needsDiscountApproval;
  return {
    approvalRequired,
    policyId: input.policy.id,
    policyVersion: input.policy.version,
    approvalState: approvalRequired
      ? json({
          approvalMode: explicitMode || "THRESHOLD",
          orderedApprovers: Array.isArray(config.orderedApprovers)
            ? config.orderedApprovers
            : [],
          independentApprovalRequired:
            config.independentApprovalRequired !== false,
          amountThreshold: threshold,
          discountThreshold: maxAutoDiscount,
          approvals: [],
        })
      : null,
  };
}

async function resolveQuotationApprovalPolicy(input: {
  orgId: string;
  legalEntityId?: string | null;
  date: Date;
}) {
  return db.accountingApprovalPolicy.findFirst({
    where: {
      orgId: input.orgId,
      documentType: "QUOTATION",
      isActive: true,
      AND: [
        {
          OR: [
            { effectiveFrom: null },
            { effectiveFrom: { lte: input.date } },
          ],
        },
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: input.date } },
          ],
        },
      ],
    },
    orderBy: [{ version: "desc" }],
    select: {
      id: true,
      version: true,
      configuration: true,
    },
  });
}

async function nextQuotationNumber(orgId: string) {
  const count = await db.quotation.count({ where: { orgId } });
  return `QUOT-${1001 + count}`;
}

async function buildCalculatedLines(input: {
  orgId: string;
  currencyCode: string;
  priceListId?: string | null;
  lines: QuotationLineDraftInput[];
}) {
  const itemIds = input.lines
    .map((line) => optionalText(line.itemMasterId))
    .filter((value): value is string => Boolean(value));
  const itemMasters = itemIds.length
    ? await db.accountingItemMaster.findMany({
        where: { orgId: input.orgId, id: { in: itemIds } },
      })
    : [];
  const masterById = new Map(itemMasters.map((item) => [item.id, item]));

  const totals = calculateQuotationTotals({
    currencyCode: input.currencyCode,
    lines: input.lines.map((line) => ({
      qty: line.qty,
      rate: line.rate,
      taxRate: line.taxRate,
      discountType: line.discountType,
      discountValue: line.discountValue,
      taxMode: line.taxMode,
    })),
  });

  const calculatedLines: CalculatedQuotationLine[] = input.lines.map((line, index) => {
    const itemMasterId = optionalText(line.itemMasterId);
    const itemMaster = itemMasterId ? masterById.get(itemMasterId) ?? null : null;
    if (itemMasterId && !itemMaster) {
      throw new Error("QUOTATION_ITEM_MASTER_NOT_FOUND");
    }
    const calculated = totals.calculatedLines[index];
    return {
      itemMasterId,
      itemName: optionalText(line.itemName) || "Unnamed item",
      descriptionSnapshot:
        optionalText(line.description) ||
        itemMaster?.salesDescription ||
        itemMaster?.purchaseDescription ||
        optionalText(line.itemName),
      hsnSac: optionalText(line.hsnSac) || itemMaster?.hsnSac || null,
      qty: normalizeMoney(line.qty),
      uom: optionalText(line.uom) || itemMaster?.usageUnit || null,
      rate: normalizeMoney(line.rate),
      discountType: line.discountType === "PERCENT" ? "PERCENT" : "AMOUNT",
      discountValue: normalizeMoney(line.discountValue),
      taxRate: normalizeMoney(line.taxRate),
      taxMode: line.taxMode === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE",
      taxableAmount: calculated.taxableAmount,
      taxAmount: calculated.taxAmount,
      lineTotal: calculated.lineTotal,
      jobId: optionalText(line.jobId),
      reportingTags:
        (line.reportingTags as Prisma.InputJsonValue | null | undefined) ?? null,
      customFieldValues:
        (line.customFieldValues as Prisma.InputJsonValue | null | undefined) ?? null,
      itemSnapshot: {
        itemMasterId,
        name: itemMaster?.name || line.itemName,
        salesDescription: itemMaster?.salesDescription || null,
        salesRate: itemMaster?.salesRate?.toString() || null,
        hsnSac: itemMaster?.hsnSac || null,
        usageUnit: itemMaster?.usageUnit || null,
        taxPreference: itemMaster?.taxPreference || null,
        salesAccount: itemMaster?.salesAccount || null,
      } as Prisma.InputJsonValue,
    };
  });

  return {
    totals,
    calculatedLines,
  };
}

async function writeQuotationAudit(input: {
  orgId: string;
  actorId: string;
  action: string;
  quotationId: string;
  beforeValues?: unknown;
  afterValues?: unknown;
}) {
  await db.accountingAuditLog.create({
    data: {
      orgId: input.orgId,
      userId: input.actorId,
      action: input.action,
      entityType: "Quotation",
      entityId: input.quotationId,
      beforeValues: input.beforeValues ? json(input.beforeValues) : undefined,
      afterValues: input.afterValues ? json(input.afterValues) : undefined,
    },
  });
}

function requireQuotationRowVersion(current: number, expected?: number) {
  if (expected == null) return;
  if (!Number.isSafeInteger(expected) || expected < 1 || current !== expected) {
    throw new Error("QUOTATION_ROW_VERSION_CONFLICT");
  }
}

function editableQuotationStatus(status: string) {
  return status === "DRAFT";
}

async function resolveQuotationPortalPublicationProfile(input: {
  orgId: string;
  legalEntityId?: string | null;
}) {
  const profiles = await db.accountingPortalPublicationProfile.findMany({
    where: {
      orgId: input.orgId,
      documentType: "QUOTATION",
      audienceType: "CUSTOMER",
      isActive: true,
      OR: [
        input.legalEntityId ? { legalEntityId: input.legalEntityId } : undefined,
        { legalEntityId: null },
      ].filter(Boolean) as Prisma.AccountingPortalPublicationProfileWhereInput[],
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 10,
  });
  return (
    profiles.find((profile) => profile.legalEntityId === input.legalEntityId) ??
    profiles.find((profile) => profile.legalEntityId == null) ??
    null
  );
}

async function prepareQuotationDelivery(input: {
  orgId: string;
  quotationId: string;
  quotationNumber: string;
  legalEntityId?: string | null;
  customerId: string;
  customerContactId?: string | null;
  deliveryMode: "EMAIL" | "PORTAL" | "MANUAL";
}) {
  const customer = await db.crmAccount.findFirst({
    where: { orgId: input.orgId, id: input.customerId },
    select: {
      id: true,
      name: true,
      email: true,
      isPortalEnabled: true,
    },
  });
  if (!customer) {
    throw new Error("QUOTATION_CUSTOMER_NOT_FOUND");
  }

  if (input.deliveryMode === "EMAIL") {
    const contact = input.customerContactId
      ? await db.crmContact.findFirst({
          where: {
            orgId: input.orgId,
            id: input.customerContactId,
            accountId: input.customerId,
            isActive: true,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : await db.crmContact.findFirst({
          where: {
            orgId: input.orgId,
            accountId: input.customerId,
            isActive: true,
            email: { not: null },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });
    const emailTo = optionalText(contact?.email) || optionalText(customer.email);
    if (!emailTo) {
      throw new Error("QUOTATION_EMAIL_RECIPIENT_REQUIRED");
    }
    const contactName =
      contact && [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
    await db.emailQueue.create({
      data: {
        to: emailTo,
        subject: `Quotation ${input.quotationNumber}`,
        html: [
          `<p>Hello ${contactName || customer.name},</p>`,
          `<p>Your quotation <strong>${input.quotationNumber}</strong> is ready.</p>`,
          `<p>Please review it in the Monolith commercial workflow.</p>`,
        ].join(""),
        text: `Quotation ${input.quotationNumber} is ready for ${customer.name}.`,
        metadata: json({
          kind: "ACCOUNTING_QUOTATION",
          quotationId: input.quotationId,
          customerId: input.customerId,
          customerContactId: contact?.id ?? null,
          deliveryMode: "EMAIL",
        }),
      },
    });
    return {
      sendStatus: "QUEUED" as const,
      sendDelivery: {
        mode: "EMAIL",
        state: "QUEUED",
        queuedAt: new Date().toISOString(),
        recipientEmail: emailTo,
        recipientName: contactName || customer.name,
      },
    };
  }

  if (input.deliveryMode === "PORTAL") {
    if (!customer.isPortalEnabled) {
      throw new Error("QUOTATION_CUSTOMER_PORTAL_DISABLED");
    }
    const profile = await resolveQuotationPortalPublicationProfile({
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
    });
    if (!profile) {
      throw new Error("QUOTATION_PORTAL_PUBLICATION_PROFILE_REQUIRED");
    }
    const portalUsers = await db.customerPortalUser.findMany({
      where: {
        orgId: input.orgId,
        customerId: input.customerId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    if (!portalUsers.length) {
      throw new Error("QUOTATION_PORTAL_RECIPIENTS_NOT_FOUND");
    }
    await db.customerPortalNotification.createMany({
      data: portalUsers.map((portalUser) => ({
        orgId: input.orgId,
        customerId: input.customerId,
        portalUserId: portalUser.id,
        kind: "ACCOUNTING_QUOTATION_AVAILABLE",
        title: `Quotation ${input.quotationNumber} is available`,
        body: `A new quotation has been published for ${customer.name}.`,
        link: `/customer-portal/quotations/${input.quotationId}`,
        payload: json({
          quotationId: input.quotationId,
          quotationNumber: input.quotationNumber,
          deliveryMode: "PORTAL",
        }),
      })),
    });
    return {
      sendStatus: "DELIVERED_INTERNAL" as const,
      sendDelivery: {
        mode: "PORTAL",
        state: "PUBLISHED",
        publishedAt: new Date().toISOString(),
        portalPublicationProfileId: profile.id,
        portalUserIds: portalUsers.map((portalUser) => portalUser.id),
      },
    };
  }

  return {
    sendStatus: "DELIVERED_INTERNAL" as const,
    sendDelivery: {
      mode: "MANUAL",
      state: "RECORDED",
      recordedAt: new Date().toISOString(),
    },
  };
}

export async function listAccountingQuotations(
  orgId: string,
  filters: QuotationListFilters = {},
) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const where: Prisma.QuotationWhereInput = { orgId };
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.legalEntityId) where.legalEntityId = filters.legalEntityId;
  if (filters.salespersonId) where.salespersonId = filters.salespersonId;
  if (filters.dateFrom || filters.dateTo) {
    where.postingDate = {};
    if (filters.dateFrom) where.postingDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.postingDate.lte = new Date(filters.dateTo);
  }
  if (filters.expiringSoon) {
    const today = new Date();
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 7);
    where.status = "SENT";
    where.validUntil = { gte: today, lte: soon };
  }
  if (filters.q) {
    where.OR = [
      { quotationNumber: { contains: filters.q, mode: "insensitive" } },
      { referenceNumber: { contains: filters.q, mode: "insensitive" } },
      { subject: { contains: filters.q, mode: "insensitive" } },
      { customer: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    db.quotation.findMany({
      where,
      include: {
        customer: { select: { name: true } },
      },
      orderBy: [{ postingDate: "desc" }, { quotationNumber: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.quotation.count({ where }),
  ]);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAccountingQuotation(orgId: string, id: string) {
  const quotation = await db.quotation.findFirst({
    where: { orgId, id },
    include: {
      customer: true,
      items: true,
    },
  });
  if (!quotation) throw new Error("QUOTATION_NOT_FOUND");
  const audit = await db.accountingAuditLog.findMany({
    where: { orgId, entityType: "Quotation", entityId: id },
    orderBy: { timestamp: "desc" },
    take: 100,
  });
  return { ...quotation, audit };
}

export async function saveQuotationDraft(input: SaveQuotationDraftInput) {
  const postingDate =
    parseDateValue(input.postingDate, "quotation_posting_date") ?? new Date();
  const validUntil = parseDateValue(input.validUntil, "quotation_valid_until");
  if (!validUntil) throw new Error("QUOTATION_VALID_UNTIL_REQUIRED");
  if (validUntil < postingDate) {
    throw new Error("QUOTATION_VALID_UNTIL_BEFORE_POSTING_DATE");
  }
  const currencyCode = (optionalText(input.currencyCode) || "INR").toUpperCase();
  const exchangeRate = optionalText(input.exchangeRate);
  if (currencyCode !== "INR" && !exchangeRate) {
    throw new Error("QUOTATION_FOREIGN_CURRENCY_EVIDENCE_REQUIRED");
  }
  const [customer, branch, legalEntity, contact, paymentTerm, priceList, job, approvalPolicy] =
    await Promise.all([
      db.crmAccount.findFirst({
        where: { orgId: input.orgId, id: input.customerId },
        select: {
          id: true,
          name: true,
          gstin: true,
          billingAddress: true,
          shippingAddress: true,
        },
      }),
      input.branchId
        ? db.branch.findFirst({
            where: { orgId: input.orgId, id: input.branchId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      input.legalEntityId
        ? db.accountingLegalEntity.findFirst({
            where: { orgId: input.orgId, id: input.legalEntityId },
            select: {
              id: true,
              code: true,
              legalName: true,
            },
          })
        : Promise.resolve(null),
      input.customerContactId
        ? db.crmContact.findFirst({
            where: { orgId: input.orgId, id: input.customerContactId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          })
        : Promise.resolve(null),
      input.paymentTermId
        ? db.accountingPaymentTerm.findFirst({
            where: { orgId: input.orgId, id: input.paymentTermId, isActive: true },
            select: { id: true, name: true, dueDays: true },
          })
        : input.paymentTermName
          ? db.accountingPaymentTerm.findFirst({
              where: {
                orgId: input.orgId,
                name: input.paymentTermName,
                isActive: true,
              },
              select: { id: true, name: true, dueDays: true },
            })
          : Promise.resolve(null),
      input.priceListId
        ? db.accountingPriceList.findFirst({
            where: { orgId: input.orgId, id: input.priceListId, isActive: true },
            select: {
              id: true,
              name: true,
              currencyCode: true,
              adjustmentMode: true,
              defaultAdjustmentPercent: true,
            },
          })
        : Promise.resolve(null),
      input.jobId
        ? db.jobCosting.findFirst({
            where: { orgId: input.orgId, id: input.jobId },
            select: { id: true, jobCode: true, jobName: true, customerId: true },
          })
        : Promise.resolve(null),
      resolveQuotationApprovalPolicy({
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        date: postingDate,
      }),
    ]);

  if (!customer) throw new Error("QUOTATION_CUSTOMER_NOT_FOUND");
  if (input.branchId && !branch) throw new Error("QUOTATION_BRANCH_NOT_FOUND");
  if (input.legalEntityId && !legalEntity) {
    throw new Error("QUOTATION_LEGAL_ENTITY_NOT_FOUND");
  }
  if (input.customerContactId && !contact) {
    throw new Error("QUOTATION_CONTACT_NOT_FOUND");
  }
  if (input.paymentTermId && !paymentTerm) {
    throw new Error("QUOTATION_PAYMENT_TERM_NOT_FOUND");
  }
  if (input.priceListId && !priceList) {
    throw new Error("QUOTATION_PRICE_LIST_NOT_FOUND");
  }
  if (input.jobId && !job) {
    throw new Error("QUOTATION_JOB_NOT_FOUND");
  }

  const calculated = await buildCalculatedLines({
    orgId: input.orgId,
    currencyCode,
    priceListId: input.priceListId,
    lines: input.lines,
  });
  const totals = calculateQuotationTotals({
    currencyCode,
    discountType: input.discountType,
    discountValue: input.discountValue,
    additionalCharges: input.additionalCharges,
    roundingAdjustment: input.roundingAdjustment,
    lines: input.lines.map((line) => ({
      qty: line.qty,
      rate: line.rate,
      taxRate: line.taxRate,
      discountType: line.discountType,
      discountValue: line.discountValue,
      taxMode: line.taxMode,
    })),
  });
  const approval = deriveApprovalRequirement({
    total: totals.grandTotal,
    legalEntityId: input.legalEntityId,
    branchId: input.branchId,
    discountAmount: totals.discountAmount,
    policy: approvalPolicy,
  });

  const quotationNumber =
    optionalText(input.quotationNumber) || (await nextQuotationNumber(input.orgId));
  const paymentTermSnapshot =
    paymentTerm || input.paymentTermName
      ? {
          id: paymentTerm?.id ?? null,
          name: paymentTerm?.name ?? input.paymentTermName ?? null,
          dueDays: paymentTerm?.dueDays ?? null,
        }
      : null;

  if (input.id) {
    const existing = await db.quotation.findFirst({
      where: { orgId: input.orgId, id: input.id },
      include: { items: true },
    });
    if (!existing) throw new Error("QUOTATION_NOT_FOUND");
    if (!editableQuotationStatus(existing.status)) {
      throw new Error("QUOTATION_NOT_EDITABLE");
    }
    requireQuotationRowVersion(existing.rowVersion, input.expectedVersion);
    const duplicate = await db.quotation.findFirst({
      where: {
        orgId: input.orgId,
        quotationNumber,
        NOT: { id: existing.id },
      },
      select: { id: true },
    });
    if (duplicate) throw new Error("QUOTATION_NUMBER_DUPLICATE");
    const updated = await db.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: existing.id } });
      const record = await tx.quotation.update({
        where: { id: existing.id },
        data: {
          legalEntityId: input.legalEntityId || null,
          branchId: input.branchId || null,
          customerId: input.customerId,
          customerContactId: input.customerContactId || null,
          quotationNumber,
          referenceNumber: optionalText(input.referenceNumber),
          postingDate,
          validUntil,
          currencyCode,
          exchangeRate:
            exchangeRate != null ? new Prisma.Decimal(exchangeRate) : null,
          exchangeRateEvidence:
            input.exchangeRateEvidence != null ? json(input.exchangeRateEvidence) : Prisma.JsonNull,
          grossSubtotal: new Prisma.Decimal(totals.grossSubtotal),
          subTotal: new Prisma.Decimal(totals.taxableSubtotal),
          discountType: input.discountType || "AMOUNT",
          discountAmount: new Prisma.Decimal(totals.discountAmount),
          taxableSubtotal: new Prisma.Decimal(totals.taxableSubtotal),
          taxAmount: new Prisma.Decimal(totals.taxAmount),
          gstComponentTotals: json({
            totalTax: totals.taxAmount,
          }),
          additionalCharges: new Prisma.Decimal(totals.additionalCharges),
          roundingAdjustment: new Prisma.Decimal(totals.roundingAdjustment),
          grandTotal: new Prisma.Decimal(totals.grandTotal),
          terms: optionalText(input.paymentTermName) || paymentTerm?.name || optionalText(input.remarks),
          paymentTermSnapshot:
            paymentTermSnapshot != null ? json(paymentTermSnapshot) : Prisma.JsonNull,
          priceListId: input.priceListId || null,
          priceListSnapshot:
            priceList != null ? json(priceList) : Prisma.JsonNull,
          salespersonId: input.salespersonId || null,
          jobId: input.jobId || null,
          subject: optionalText(input.subject),
          notes: optionalText(input.notes),
          termsAndConditions: optionalText(input.termsAndConditions),
          internalRemarks: optionalText(input.internalRemarks),
          customerVisibleRemarks: optionalText(input.customerVisibleRemarks),
          remarks: optionalText(input.remarks),
          billingAddressSnapshot: json({
            billingAddress: customer.billingAddress,
          }),
          shippingAddressSnapshot: json({
            shippingAddress: customer.shippingAddress,
          }),
          customerSnapshot: json(serializePartyAddress(customer)),
          branchSnapshot: branch ? json(branch) : Prisma.JsonNull,
          legalEntitySnapshot: legalEntity ? json(legalEntity) : Prisma.JsonNull,
          customerContactSnapshot:
            contact != null ? json(contact) : Prisma.JsonNull,
          approvalPolicyId: approval.policyId,
          approvalPolicyVersion: approval.policyVersion,
          approvalRequired: approval.approvalRequired,
          approvalState:
            approval.approvalState != null
              ? approval.approvalState
              : Prisma.JsonNull,
          attachmentReferences:
            input.attachmentReferences != null
              ? json(input.attachmentReferences)
              : Prisma.JsonNull,
          templateVersion: optionalText(input.templateVersion),
          updatedById: input.actorId,
          version: { increment: 1 },
          rowVersion: { increment: 1 },
          items: {
            create: calculated.calculatedLines.map((line) => ({
              itemMasterId: line.itemMasterId,
              itemName: line.itemName,
              descriptionSnapshot: line.descriptionSnapshot,
              hsnSac: line.hsnSac,
              qty: new Prisma.Decimal(line.qty),
              uom: line.uom,
              rate: new Prisma.Decimal(line.rate),
              discount: new Prisma.Decimal(line.discountValue),
              discountType: line.discountType,
              discountValue: new Prisma.Decimal(line.discountValue),
              taxRate: new Prisma.Decimal(line.taxRate),
              taxMode: line.taxMode,
              taxableAmount: new Prisma.Decimal(line.taxableAmount),
              taxAmount: new Prisma.Decimal(line.taxAmount),
              amount: new Prisma.Decimal(line.taxableAmount),
              lineTotal: new Prisma.Decimal(line.lineTotal),
              jobId: line.jobId,
              reportingTags:
                line.reportingTags != null ? json(line.reportingTags) : Prisma.JsonNull,
              customFieldValues:
                line.customFieldValues != null
                  ? json(line.customFieldValues)
                  : Prisma.JsonNull,
              itemSnapshot: line.itemSnapshot,
            })),
          },
        },
      });
      return record;
    });
    await writeQuotationAudit({
      orgId: input.orgId,
      actorId: input.actorId,
      action: "QUOTATION_UPDATED",
      quotationId: updated.id,
      beforeValues: {
        status: existing.status,
        rowVersion: existing.rowVersion,
        version: existing.version,
      },
      afterValues: {
        status: updated.status,
        rowVersion: updated.rowVersion,
        version: updated.version,
        grandTotal: updated.grandTotal.toString(),
      },
    });
    return updated;
  }

  const duplicate = await db.quotation.findFirst({
    where: { orgId: input.orgId, quotationNumber },
    select: { id: true },
  });
  if (duplicate) throw new Error("QUOTATION_NUMBER_DUPLICATE");

  const created = await db.quotation.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId || null,
      branchId: input.branchId || null,
      customerId: input.customerId,
      customerContactId: input.customerContactId || null,
      quotationNumber,
      referenceNumber: optionalText(input.referenceNumber),
      postingDate,
      validUntil,
      status: "DRAFT",
      currencyCode,
      exchangeRate: exchangeRate != null ? new Prisma.Decimal(exchangeRate) : null,
      exchangeRateEvidence:
        input.exchangeRateEvidence != null ? json(input.exchangeRateEvidence) : Prisma.JsonNull,
      grossSubtotal: new Prisma.Decimal(totals.grossSubtotal),
      subTotal: new Prisma.Decimal(totals.taxableSubtotal),
      discountType: input.discountType || "AMOUNT",
      discountAmount: new Prisma.Decimal(totals.discountAmount),
      taxableSubtotal: new Prisma.Decimal(totals.taxableSubtotal),
      taxAmount: new Prisma.Decimal(totals.taxAmount),
      gstComponentTotals: json({ totalTax: totals.taxAmount }),
      additionalCharges: new Prisma.Decimal(totals.additionalCharges),
      roundingAdjustment: new Prisma.Decimal(totals.roundingAdjustment),
      grandTotal: new Prisma.Decimal(totals.grandTotal),
      terms: optionalText(input.paymentTermName) || paymentTerm?.name || null,
      paymentTermSnapshot:
        paymentTermSnapshot != null ? json(paymentTermSnapshot) : Prisma.JsonNull,
      priceListId: input.priceListId || null,
      priceListSnapshot: priceList != null ? json(priceList) : Prisma.JsonNull,
      salespersonId: input.salespersonId || null,
      jobId: input.jobId || null,
      subject: optionalText(input.subject),
      notes: optionalText(input.notes),
      termsAndConditions: optionalText(input.termsAndConditions),
      internalRemarks: optionalText(input.internalRemarks),
      customerVisibleRemarks: optionalText(input.customerVisibleRemarks),
      remarks: optionalText(input.remarks),
      billingAddressSnapshot: json({ billingAddress: customer.billingAddress }),
      shippingAddressSnapshot: json({ shippingAddress: customer.shippingAddress }),
      customerSnapshot: json(serializePartyAddress(customer)),
      branchSnapshot: branch ? json(branch) : Prisma.JsonNull,
      legalEntitySnapshot: legalEntity ? json(legalEntity) : Prisma.JsonNull,
      customerContactSnapshot: contact ? json(contact) : Prisma.JsonNull,
      approvalPolicyId: approval.policyId,
      approvalPolicyVersion: approval.policyVersion,
      approvalRequired: approval.approvalRequired,
      approvalState:
        approval.approvalState != null ? approval.approvalState : Prisma.JsonNull,
      attachmentReferences:
        input.attachmentReferences != null
          ? json(input.attachmentReferences)
          : Prisma.JsonNull,
      templateVersion: optionalText(input.templateVersion),
      createdById: input.actorId,
      updatedById: input.actorId,
      items: {
        create: calculated.calculatedLines.map((line) => ({
          itemMasterId: line.itemMasterId,
          itemName: line.itemName,
          descriptionSnapshot: line.descriptionSnapshot,
          hsnSac: line.hsnSac,
          qty: new Prisma.Decimal(line.qty),
          uom: line.uom,
          rate: new Prisma.Decimal(line.rate),
          discount: new Prisma.Decimal(line.discountValue),
          discountType: line.discountType,
          discountValue: new Prisma.Decimal(line.discountValue),
          taxRate: new Prisma.Decimal(line.taxRate),
          taxMode: line.taxMode,
          taxableAmount: new Prisma.Decimal(line.taxableAmount),
          taxAmount: new Prisma.Decimal(line.taxAmount),
          amount: new Prisma.Decimal(line.taxableAmount),
          lineTotal: new Prisma.Decimal(line.lineTotal),
          jobId: line.jobId,
          reportingTags:
            line.reportingTags != null ? json(line.reportingTags) : Prisma.JsonNull,
          customFieldValues:
            line.customFieldValues != null
              ? json(line.customFieldValues)
              : Prisma.JsonNull,
          itemSnapshot: line.itemSnapshot,
        })),
      },
    },
  });
  await writeQuotationAudit({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "QUOTATION_CREATED",
    quotationId: created.id,
    afterValues: {
      status: created.status,
      rowVersion: created.rowVersion,
      version: created.version,
      grandTotal: created.grandTotal.toString(),
    },
  });
  return created;
}

async function transitionQuotationStatus(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
  expectedVersion?: number;
  toStatus: QuotationStatus;
  mutate?: (current: Prisma.QuotationGetPayload<{ include: { items: true } }>) => Prisma.QuotationUpdateInput;
  action: string;
}) {
  const quotation = await db.quotation.findFirst({
    where: { orgId: input.orgId, id: input.quotationId },
    include: { items: true },
  });
  if (!quotation) throw new Error("QUOTATION_NOT_FOUND");
  requireQuotationRowVersion(quotation.rowVersion, input.expectedVersion);
  assertQuotationTransition(quotation.status, input.toStatus);
  const updated = await db.quotation.update({
    where: { id: quotation.id },
    data: {
      status: input.toStatus,
      updatedById: input.actorId,
      rowVersion: { increment: 1 },
      ...(input.mutate ? input.mutate(quotation) : {}),
    },
  });
  await writeQuotationAudit({
    orgId: input.orgId,
    actorId: input.actorId,
    action: input.action,
    quotationId: quotation.id,
    beforeValues: { status: quotation.status, rowVersion: quotation.rowVersion },
    afterValues: { status: updated.status, rowVersion: updated.rowVersion },
  });
  return updated;
}

export async function cloneQuotationDraft(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
}) {
  const quotation = await getAccountingQuotation(input.orgId, input.quotationId);
  return saveQuotationDraft({
    orgId: input.orgId,
    actorId: input.actorId,
    legalEntityId: quotation.legalEntityId,
    branchId: quotation.branchId,
    customerId: quotation.customerId,
    customerContactId: quotation.customerContactId,
    validUntil: quotation.validUntil,
    currencyCode: quotation.currencyCode,
    exchangeRate: quotation.exchangeRate?.toString() ?? null,
    exchangeRateEvidence: quotation.exchangeRateEvidence as Prisma.InputJsonValue,
    paymentTermId:
      quotation.paymentTermSnapshot &&
      typeof quotation.paymentTermSnapshot === "object" &&
      !Array.isArray(quotation.paymentTermSnapshot)
        ? String((quotation.paymentTermSnapshot as Record<string, unknown>).id ?? "")
        : null,
    paymentTermName: quotation.terms,
    salespersonId: quotation.salespersonId,
    jobId: quotation.jobId,
    priceListId: quotation.priceListId,
    subject: quotation.subject,
    notes: quotation.notes,
    termsAndConditions: quotation.termsAndConditions,
    internalRemarks: quotation.internalRemarks,
    customerVisibleRemarks: quotation.customerVisibleRemarks,
    remarks: quotation.remarks,
    discountType:
      quotation.discountType === "PERCENT" ? "PERCENT" : "AMOUNT",
    discountValue: quotation.discountAmount.toString(),
    additionalCharges: quotation.additionalCharges.toString(),
    roundingAdjustment: quotation.roundingAdjustment.toString(),
    attachmentReferences:
      quotation.attachmentReferences as Prisma.InputJsonValue | null,
    templateVersion: quotation.templateVersion,
    lines: quotation.items.map((line) => ({
      itemMasterId: line.itemMasterId,
      itemName: line.itemName,
      description: line.descriptionSnapshot,
      hsnSac: line.hsnSac,
      qty: line.qty.toString(),
      uom: line.uom,
      rate: line.rate.toString(),
      discountType:
        line.discountType === "PERCENT" ? "PERCENT" : "AMOUNT",
      discountValue: line.discountValue?.toString() ?? line.discount.toString(),
      taxRate: line.taxRate.toString(),
      taxMode: line.taxMode === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE",
      jobId: line.jobId,
      reportingTags: line.reportingTags as Prisma.InputJsonValue | null,
      customFieldValues: line.customFieldValues as Prisma.InputJsonValue | null,
    })),
  });
}

export async function submitQuotationForApproval(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
  expectedVersion?: number;
}) {
  const quotation = await db.quotation.findFirst({
    where: { orgId: input.orgId, id: input.quotationId },
  });
  if (!quotation) throw new Error("QUOTATION_NOT_FOUND");
  requireQuotationRowVersion(quotation.rowVersion, input.expectedVersion);
  if (!quotation.approvalRequired) {
    throw new Error("QUOTATION_APPROVAL_NOT_REQUIRED");
  }
  return transitionQuotationStatus({
    orgId: input.orgId,
    actorId: input.actorId,
    quotationId: input.quotationId,
    expectedVersion: input.expectedVersion,
    toStatus: "PENDING_APPROVAL",
    action: "QUOTATION_SUBMITTED_FOR_APPROVAL",
    mutate: () => ({
      submittedById: input.actorId,
      submittedAt: new Date(),
    }),
  });
}

export async function returnQuotationForRevision(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
  expectedVersion?: number;
  reason: string;
}) {
  return transitionQuotationStatus({
    orgId: input.orgId,
    actorId: input.actorId,
    quotationId: input.quotationId,
    expectedVersion: input.expectedVersion,
    toStatus: "DRAFT",
    action: "QUOTATION_RETURNED_FOR_REVISION",
    mutate: () => ({
      returnReason: optionalText(input.reason),
      returnedAt: new Date(),
      returnedById: input.actorId,
    }),
  });
}

export async function approveQuotation(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
  expectedVersion?: number;
}) {
  const quotation = await db.quotation.findFirst({
    where: { orgId: input.orgId, id: input.quotationId },
    select: {
      id: true,
      status: true,
      rowVersion: true,
      createdById: true,
      approvalState: true,
    },
  });
  if (!quotation) throw new Error("QUOTATION_NOT_FOUND");
  if (quotation.createdById === input.actorId) {
    throw new Error("QUOTATION_MAKER_SELF_APPROVAL_FORBIDDEN");
  }
  requireQuotationRowVersion(quotation.rowVersion, input.expectedVersion);
  if (quotation.status !== "PENDING_APPROVAL") {
    throw new Error("QUOTATION_NOT_PENDING_APPROVAL");
  }
  const existingApprovals =
    quotation.approvalState &&
    typeof quotation.approvalState === "object" &&
    !Array.isArray(quotation.approvalState)
      ? (quotation.approvalState as Record<string, unknown>)
      : {};
  const approvals = Array.isArray(existingApprovals.approvals)
    ? [...existingApprovals.approvals, { approverId: input.actorId, approvedAt: new Date().toISOString() }]
    : [{ approverId: input.actorId, approvedAt: new Date().toISOString() }];
  const updated = await db.quotation.update({
    where: { id: quotation.id },
    data: {
      approvalState: json({
        ...existingApprovals,
        approvals,
        finalApprovedById: input.actorId,
        finalApprovedAt: new Date().toISOString(),
      }),
      approvedById: input.actorId,
      approvedAt: new Date(),
      updatedById: input.actorId,
      rowVersion: { increment: 1 },
    },
  });
  await writeQuotationAudit({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "QUOTATION_APPROVED",
    quotationId: quotation.id,
    beforeValues: { status: quotation.status, rowVersion: quotation.rowVersion },
    afterValues: { status: updated.status, rowVersion: updated.rowVersion },
  });
  return updated;
}

export async function sendQuotation(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
  expectedVersion?: number;
  templateVersion?: string | null;
  deliveryMode?: "EMAIL" | "PORTAL" | "MANUAL";
}) {
  const quotation = await db.quotation.findFirst({
    where: { orgId: input.orgId, id: input.quotationId },
  });
  if (!quotation) throw new Error("QUOTATION_NOT_FOUND");
  requireQuotationRowVersion(quotation.rowVersion, input.expectedVersion);
  if (quotation.approvalRequired && !quotation.approvedById) {
    throw new Error("QUOTATION_APPROVAL_REQUIRED_BEFORE_SEND");
  }
  if (!["DRAFT", "PENDING_APPROVAL"].includes(quotation.status)) {
    throw new Error("QUOTATION_SEND_INVALID_STATUS");
  }
  const deliveryMode = input.deliveryMode || "EMAIL";
  const nextStatus = assertQuotationTransition(quotation.status, "SENT");
  const delivery = await prepareQuotationDelivery({
    orgId: input.orgId,
    quotationId: quotation.id,
    quotationNumber: quotation.quotationNumber,
    legalEntityId: quotation.legalEntityId,
    customerId: quotation.customerId,
    customerContactId: quotation.customerContactId,
    deliveryMode,
  });
  const updated = await db.quotation.update({
    where: { id: quotation.id },
    data: {
      status: nextStatus,
      sentById: input.actorId,
      sentAt: new Date(),
      sendStatus: delivery.sendStatus,
      sendDelivery: json(delivery.sendDelivery),
      sentVersionSnapshot: json({
        quotationVersion: quotation.version,
        rowVersion: quotation.rowVersion,
        templateVersion: optionalText(input.templateVersion) || quotation.templateVersion || "default",
        deliveryMode,
      }),
      updatedById: input.actorId,
      rowVersion: { increment: 1 },
    },
  });
  await writeQuotationAudit({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "QUOTATION_SENT",
    quotationId: quotation.id,
    beforeValues: { status: quotation.status, rowVersion: quotation.rowVersion },
    afterValues: {
      status: updated.status,
      rowVersion: updated.rowVersion,
      sendStatus: updated.sendStatus,
      deliveryMode,
    },
  });
  return updated;
}

export async function acceptQuotation(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
  expectedVersion?: number;
  source: QuotationLifecycleSource;
  customerReference?: string | null;
}) {
  return transitionQuotationStatus({
    orgId: input.orgId,
    actorId: input.actorId,
    quotationId: input.quotationId,
    expectedVersion: input.expectedVersion,
    toStatus: "ACCEPTED",
    action: "QUOTATION_ACCEPTED",
    mutate: () => ({
      acceptedById: input.actorId,
      acceptedAt: new Date(),
      acceptanceSource: input.source,
      acceptanceComment: optionalText(input.customerReference),
    }),
  });
}

export async function declineQuotation(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
  expectedVersion?: number;
  source: QuotationLifecycleSource;
  reason: string;
}) {
  if (!optionalText(input.reason)) {
    throw new Error("QUOTATION_DECLINE_REASON_REQUIRED");
  }
  return transitionQuotationStatus({
    orgId: input.orgId,
    actorId: input.actorId,
    quotationId: input.quotationId,
    expectedVersion: input.expectedVersion,
    toStatus: "DECLINED",
    action: "QUOTATION_DECLINED",
    mutate: () => ({
      declinedById: input.actorId,
      declinedAt: new Date(),
      declineSource: input.source,
      declineReason: optionalText(input.reason),
    }),
  });
}

export async function cancelQuotation(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
  expectedVersion?: number;
  reason?: string | null;
}) {
  return transitionQuotationStatus({
    orgId: input.orgId,
    actorId: input.actorId,
    quotationId: input.quotationId,
    expectedVersion: input.expectedVersion,
    toStatus: "CANCELLED",
    action: "QUOTATION_CANCELLED",
    mutate: () => ({
      cancelledById: input.actorId,
      cancelledAt: new Date(),
      cancellationReason: optionalText(input.reason),
    }),
  });
}

export async function expireDueQuotations(input: {
  orgId: string;
  actorId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const due = await db.quotation.findMany({
    where: {
      orgId: input.orgId,
      status: "SENT",
      validUntil: { lt: now },
    },
    select: { id: true, rowVersion: true, status: true },
  });
  const actorId = input.actorId || "system";
  const expiredIds: string[] = [];
  for (const quotation of due) {
    await db.quotation.update({
      where: { id: quotation.id },
      data: {
        status: "EXPIRED",
        updatedById: actorId,
        rowVersion: { increment: 1 },
      },
    });
    await writeQuotationAudit({
      orgId: input.orgId,
      actorId,
      action: "QUOTATION_EXPIRED",
      quotationId: quotation.id,
      beforeValues: { status: quotation.status, rowVersion: quotation.rowVersion },
      afterValues: { status: "EXPIRED" },
    });
    expiredIds.push(quotation.id);
  }
  return expiredIds;
}

function deriveConversionStatus(lines: Array<{ qty: Prisma.Decimal; convertedQuantity: Prisma.Decimal }>) {
  const fullyConverted = lines.every(
    (line) =>
      compareDecimalStrings(
        line.qty.toString(),
        line.convertedQuantity.toString(),
      ) === 0,
  );
  return fullyConverted ? "CONVERTED" : "PARTIALLY_CONVERTED";
}

export async function convertQuotationToInvoiceDraft(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
  expectedVersion?: number;
  quantitiesByLineId?: Record<string, string>;
}) {
  const quotation = await db.quotation.findFirst({
    where: { orgId: input.orgId, id: input.quotationId },
    include: { items: true },
  });
  if (!quotation) throw new Error("QUOTATION_NOT_FOUND");
  requireQuotationRowVersion(quotation.rowVersion, input.expectedVersion);
  if (!["ACCEPTED", "PARTIALLY_CONVERTED"].includes(quotation.status)) {
    throw new Error("QUOTATION_CONVERSION_REQUIRES_ACCEPTED_STATUS");
  }
  const requestedLines = quotation.items.map((line) => {
    const remaining = subtractDecimalStrings(
      line.qty.toString(),
      line.convertedQuantity.toString(),
    );
    if (compareDecimalStrings(remaining, "0") <= 0) {
      return { line, remaining, requested: "0" };
    }
    const requested = input.quantitiesByLineId?.[line.id]
      ? normalizeMoney(input.quantitiesByLineId[line.id], "0")
      : remaining;
    if (compareDecimalStrings(requested, "0") < 0) {
      throw new Error("QUOTATION_CONVERSION_QTY_INVALID");
    }
    if (compareDecimalStrings(requested, remaining) > 0) {
      throw new Error("QUOTATION_CONVERSION_EXCEEDS_REMAINING");
    }
    return { line, remaining, requested };
  });
  const invoiceLines = requestedLines.filter(
    ({ requested }) => compareDecimalStrings(requested, "0") > 0,
  );
  if (invoiceLines.length === 0) {
    if (quotation.status === "CONVERTED") {
      const latest = await db.salesInvoice.findFirst({
        where: {
          orgId: input.orgId,
          sourceQuotationId: quotation.id,
        },
        orderBy: { createdAt: "desc" },
      });
      if (latest) return latest;
    }
    throw new Error("QUOTATION_NOTHING_REMAINING_TO_CONVERT");
  }

  const normalizedTaxRates = Array.from(
    new Set(invoiceLines.map(({ line }) => line.taxRate.toString())),
  );
  if (normalizedTaxRates.length !== 1) {
    throw new Error("QUOTATION_CONVERSION_MIXED_TAX_RATES_NOT_SUPPORTED");
  }

  const count = await db.salesInvoice.count({ where: { orgId: input.orgId } });
  const invoiceNumber = `SINV-${1001 + count}`;
  const postingDate = new Date();
  const dueDate = quotation.validUntil >= postingDate ? quotation.validUntil : postingDate;
  const taxableAmount = addDecimalStrings(
    ...invoiceLines.map(({ line, requested }) =>
      multiplyDecimalStrings(requested, line.rate.toString()),
    ),
  );
  const taxAmount = addDecimalStrings(
    ...invoiceLines.map(({ line, requested }) =>
      divideDecimalStrings(
        multiplyDecimalStrings(
          multiplyDecimalStrings(requested, line.rate.toString()),
          line.taxRate.toString(),
        ),
        "100",
        8,
      ),
    ),
  );
  const grandTotal = addDecimalStrings(taxableAmount, taxAmount);

  const invoice = await db.$transaction(async (tx) => {
    const settings = await tx.accountingSettings.findUnique({
      where: { orgId: input.orgId },
    });
    if (!settings?.defaultSalesAccountId || !settings.defaultTaxAccountId) {
      throw new Error("ACCOUNTING_SETTINGS_INCOMPLETE_FOR_QUOTATION_CONVERSION");
    }
    const created = await tx.salesInvoice.create({
      data: {
        orgId: input.orgId,
        branchId: quotation.branchId,
        invoiceNumber,
        customerId: quotation.customerId,
        postingDate,
        dueDate,
        status: "DRAFT",
        grandTotal: new Prisma.Decimal(grandTotal),
        outstandingAmount: new Prisma.Decimal(grandTotal),
        discountAmount: quotation.discountAmount,
        taxAmount: new Prisma.Decimal(taxAmount),
        remarks:
          quotation.customerVisibleRemarks ||
          quotation.remarks ||
          `Converted from quotation ${quotation.quotationNumber}`,
        sourceQuotationId: quotation.id,
        sourceQuotationVersion: quotation.version,
        sourceQuotationNumber: quotation.quotationNumber,
        sourceQuotationSnapshot: json({
          quotationNumber: quotation.quotationNumber,
          version: quotation.version,
          status: quotation.status,
        }),
        createdById: input.actorId,
        items: {
          create: invoiceLines.map(({ line, requested }) => ({
            itemName: line.itemName,
            qty: Number(requested),
            rate: new Prisma.Decimal(line.rate.toString()),
            amount: new Prisma.Decimal(
              multiplyDecimalStrings(requested, line.rate.toString()),
            ),
            currency: quotation.currencyCode,
            exchangeRate: Number(quotation.exchangeRate?.toString() || "1"),
            unit: line.uom,
            taxRate: Number(line.taxRate.toString()),
            sourceQuotationItemId: line.id,
            sourceQuotationQuantity: new Prisma.Decimal(requested),
          })),
        },
        taxLines:
          compareDecimalStrings(taxAmount, "0") > 0
            ? {
                create: [
                  {
                    accountId: settings.defaultTaxAccountId,
                    taxRate: Number(normalizedTaxRates[0]),
                    taxAmount: new Prisma.Decimal(taxAmount),
                  },
                ],
              }
            : undefined,
      },
    });

    for (const { line, requested } of invoiceLines) {
      const newConverted = addDecimalStrings(
        line.convertedQuantity.toString(),
        requested,
      );
      await tx.quotationItem.update({
        where: { id: line.id },
        data: {
          convertedQuantity: new Prisma.Decimal(newConverted),
        },
      });
    }

    const refreshedLines = requestedLines.map(({ line, requested }) => ({
      qty: line.qty,
      convertedQuantity: new Prisma.Decimal(
        addDecimalStrings(line.convertedQuantity.toString(), requested),
      ),
    }));
    const nextStatus = deriveConversionStatus(refreshedLines);
    await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        status: nextStatus,
        updatedById: input.actorId,
        rowVersion: { increment: 1 },
      },
    });
    return created;
  });

  await writeQuotationAudit({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "QUOTATION_CONVERTED_TO_SALES_INVOICE",
    quotationId: quotation.id,
    beforeValues: { status: quotation.status, rowVersion: quotation.rowVersion },
    afterValues: { salesInvoiceId: invoice.id },
  });
  return invoice;
}

export async function convertQuotationToSalesOrderDraft(input: {
  orgId: string;
  actorId: string;
  quotationId: string;
  expectedVersion?: number;
  quantitiesByLineId?: Record<string, string>;
}) {
  const quotation = await db.quotation.findFirst({
    where: { orgId: input.orgId, id: input.quotationId },
    include: { items: true },
  });
  if (!quotation) throw new Error("QUOTATION_NOT_FOUND");
  requireQuotationRowVersion(quotation.rowVersion, input.expectedVersion);
  if (!["ACCEPTED", "PARTIALLY_CONVERTED"].includes(quotation.status)) {
    throw new Error("QUOTATION_CONVERSION_REQUIRES_ACCEPTED_STATUS");
  }

  const requestedLines = quotation.items.map((line) => {
    const remaining = subtractDecimalStrings(
      line.qty.toString(),
      line.convertedQuantity.toString(),
    );
    if (compareDecimalStrings(remaining, "0") <= 0) {
      return { line, remaining, requested: "0" };
    }
    const requested = input.quantitiesByLineId?.[line.id]
      ? normalizeMoney(input.quantitiesByLineId[line.id], "0")
      : remaining;
    if (compareDecimalStrings(requested, "0") < 0) {
      throw new Error("QUOTATION_CONVERSION_QTY_INVALID");
    }
    if (compareDecimalStrings(requested, remaining) > 0) {
      throw new Error("QUOTATION_CONVERSION_EXCEEDS_REMAINING");
    }
    return { line, remaining, requested };
  });

  const orderLines = requestedLines.filter(
    ({ requested }) => compareDecimalStrings(requested, "0") > 0,
  );
  if (orderLines.length === 0) {
    if (quotation.status === "CONVERTED") {
      const latest = await db.crmInvoice.findFirst({
        where: {
          orgId: input.orgId,
          type: "SALES_ORDER",
          sourceQuotationId: quotation.id,
        },
        orderBy: { createdAt: "desc" },
      });
      if (latest) return latest;
    }
    throw new Error("QUOTATION_NOTHING_REMAINING_TO_CONVERT");
  }

  const orderCount = await db.crmInvoice.count({
    where: { orgId: input.orgId, type: "SALES_ORDER" },
  });
  const salesOrderNumber = `CHN-SO-${String(orderCount + 1).padStart(3, "0")}`;
  const orderDate = new Date();

  const salesOrder = await db.$transaction(async (tx) => {
    const created = await tx.crmInvoice.create({
      data: {
        orgId: input.orgId,
        ownerId: quotation.salespersonId || input.actorId,
        invoiceNumber: salesOrderNumber,
        type: "SALES_ORDER",
        date: orderDate,
        dueDate: quotation.validUntil,
        status: "CONFIRMED",
        discount: Number(quotation.discountAmount.toString()),
        tax: Number(quotation.taxAmount.toString()),
        total: Number(quotation.grandTotal.toString()),
        approvalStatus: "APPROVED",
        approvedAt: quotation.acceptedAt ?? orderDate,
        approvedById: quotation.acceptedById || input.actorId,
        accountId: quotation.customerId,
        contactId: quotation.customerContactId,
        manualNotes:
          quotation.customerVisibleRemarks ||
          quotation.remarks ||
          `Converted from quotation ${quotation.quotationNumber}`,
        terms: quotation.termsAndConditions,
        referenceNumber: quotation.referenceNumber,
        sourceQuotationId: quotation.id,
        sourceQuotationVersion: quotation.version,
        sourceQuotationNumber: quotation.quotationNumber,
        sourceQuotationSnapshot: json({
          quotationNumber: quotation.quotationNumber,
          version: quotation.version,
          status: quotation.status,
          acceptedAt: quotation.acceptedAt?.toISOString() ?? null,
          convertedAt: orderDate.toISOString(),
        }),
        createdById: input.actorId,
        updatedById: input.actorId,
        items: {
          create: orderLines.map(({ line, requested }) => {
            const lineAmount = multiplyDecimalStrings(
              requested,
              line.rate.toString(),
            );
            const lineTaxAmount = divideDecimalStrings(
              multiplyDecimalStrings(lineAmount, line.taxRate.toString()),
              "100",
              8,
            );
            return {
              productName: line.itemName,
              qty: Number(requested),
              rate: Number(line.rate.toString()),
              taxPercent: Number(line.taxRate.toString()),
              taxLabel: line.hsnSac,
              unit: line.uom,
              amount: Number(addDecimalStrings(lineAmount, lineTaxAmount)),
              currency: quotation.currencyCode,
              exchangeRate: Number(quotation.exchangeRate?.toString() || "1"),
              sourceQuotationItemId: line.id,
              sourceQuotationQuantity: new Prisma.Decimal(requested),
            };
          }),
        },
      },
    });

    for (const { line, requested } of orderLines) {
      const newConverted = addDecimalStrings(
        line.convertedQuantity.toString(),
        requested,
      );
      await tx.quotationItem.update({
        where: { id: line.id },
        data: {
          convertedQuantity: new Prisma.Decimal(newConverted),
        },
      });
    }

    const refreshedLines = requestedLines.map(({ line, requested }) => ({
      qty: line.qty,
      convertedQuantity: new Prisma.Decimal(
        addDecimalStrings(line.convertedQuantity.toString(), requested),
      ),
    }));
    const nextStatus = deriveConversionStatus(refreshedLines);
    await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        status: nextStatus,
        updatedById: input.actorId,
        rowVersion: { increment: 1 },
      },
    });

    return created;
  });

  await writeQuotationAudit({
    orgId: input.orgId,
    actorId: input.actorId,
    action: "QUOTATION_CONVERTED_TO_SALES_ORDER",
    quotationId: quotation.id,
    beforeValues: { status: quotation.status, rowVersion: quotation.rowVersion },
    afterValues: {
      salesOrderId: salesOrder.id,
      salesOrderNumber: salesOrder.invoiceNumber,
    },
  });
  return salesOrder;
}
