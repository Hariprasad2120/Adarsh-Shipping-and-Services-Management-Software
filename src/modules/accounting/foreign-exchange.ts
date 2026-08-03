import "server-only";

import { db } from "@/lib/db";

import {
  add,
  compare,
  convertToBaseCurrency,
  absolute,
  decimal,
  serialize,
  subtract,
} from "./money";
import { createAuditLog, createJournalEntry } from "./service";

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

type ApprovedRate = {
  id: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: string;
  rateDate: string;
  source: string;
};

function pairKey(fromCurrencyCode: string, toCurrencyCode: string) {
  return `${fromCurrencyCode}->${toCurrencyCode}`;
}

async function resolveApprovedRateMap(
  orgId: string,
  pairs: Array<{ fromCurrencyCode: string; toCurrencyCode: string }>,
  asOfDate: Date,
) {
  const uniquePairs = [
    ...new Map(
      pairs.map((pair) => [pairKey(pair.fromCurrencyCode, pair.toCurrencyCode), pair]),
    ).values(),
  ];
  if (!uniquePairs.length) {
    return new Map<string, ApprovedRate>();
  }

  const currencies = [
    ...new Set(
      uniquePairs.flatMap((pair) => [pair.fromCurrencyCode, pair.toCurrencyCode]),
    ),
  ];
  const rows = await db.accountingExchangeRate.findMany({
    where: {
      orgId,
      status: "APPROVED",
      rateDate: { lte: asOfDate },
      fromCurrency: { code: { in: currencies } },
      toCurrency: { code: { in: currencies } },
    },
    orderBy: [{ rateDate: "desc" }, { approvedAt: "desc" }, { createdAt: "desc" }],
    include: {
      fromCurrency: { select: { code: true } },
      toCurrency: { select: { code: true } },
    },
  });

  const map = new Map<string, ApprovedRate>();
  for (const row of rows) {
    const key = pairKey(row.fromCurrency.code, row.toCurrency.code);
    if (map.has(key)) continue;
    map.set(key, {
      id: row.id,
      fromCurrencyCode: row.fromCurrency.code,
      toCurrencyCode: row.toCurrency.code,
      rate: serialize(row.rate, 12),
      rateDate: isoDate(row.rateDate),
      source: row.source,
    });
  }
  return map;
}

async function resolveHistoricalRateMap(
  orgId: string,
  rateIds: string[],
) {
  if (!rateIds.length) return new Map<string, ApprovedRate>();
  const rows = await db.accountingExchangeRate.findMany({
    where: { orgId, id: { in: [...new Set(rateIds)] } },
    include: {
      fromCurrency: { select: { code: true } },
      toCurrency: { select: { code: true } },
    },
  });
  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        fromCurrencyCode: row.fromCurrency.code,
        toCurrencyCode: row.toCurrency.code,
        rate: serialize(row.rate, 12),
        rateDate: isoDate(row.rateDate),
        source: row.source,
      },
    ]),
  );
}

export async function getForeignExchangeReviewWorkspace(
  orgId: string,
  input: { asOfDate?: Date | string } = {},
) {
  const data = await computeForeignExchangeReviewData(orgId, input);

  return {
    asOfDate: data.asOfDate,
    functionalCurrencyCode: data.functionalCurrencyCode,
    summary: data.summary,
    unrealizedRows: data.unrealizedRows,
    realizedRows: data.realizedRows,
    closeRuns: data.closeRuns,
  };
}

async function computeForeignExchangeReviewData(
  orgId: string,
  input: { asOfDate?: Date | string } = {},
) {
  const asOfDate =
    input.asOfDate instanceof Date
      ? input.asOfDate
      : input.asOfDate
        ? new Date(input.asOfDate)
        : new Date();

  const [profile, openDocuments, allocations, closeRuns] = await Promise.all([
    db.accountingOrganisationProfile.findUnique({
      where: { orgId },
      select: { functionalCurrencyCode: true },
    }),
    db.accountingDocument.findMany({
      where: {
        orgId,
        status: "POSTED",
        cancelledAt: null,
        transactionCurrencyCode: { not: undefined as never },
      },
      orderBy: [{ postingDate: "desc" }, { id: "desc" }],
      include: {
        legalEntity: { select: { code: true, legalName: true } },
        paymentTargets: {
          where: { status: "ACTIVE" },
          select: { amount: true },
        },
      },
    }),
    db.accountingPaymentAllocation.findMany({
      where: { orgId, status: "ACTIVE" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        payment: {
          select: {
            id: true,
            paymentType: true,
            transactionDate: true,
            transactionCurrencyCode: true,
            baseCurrencyCode: true,
            amount: true,
            exchangeRateId: true,
          },
        },
        targetDocument: {
          select: {
            id: true,
            documentType: true,
            postingDate: true,
            transactionCurrencyCode: true,
            baseCurrencyCode: true,
            totalAmount: true,
            exchangeRateId: true,
          },
        },
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

  const functionalCurrencyCode = profile?.functionalCurrencyCode?.toUpperCase() ?? "INR";
  const foreignDocuments = openDocuments.filter(
    (document) =>
      document.transactionCurrencyCode.toUpperCase() !==
      document.baseCurrencyCode.toUpperCase(),
  );
  const relevantAllocations = allocations.filter(
    (allocation) =>
      allocation.targetDocument &&
      allocation.payment.transactionCurrencyCode.toUpperCase() ===
        allocation.targetDocument.transactionCurrencyCode.toUpperCase() &&
      allocation.payment.baseCurrencyCode.toUpperCase() ===
        allocation.targetDocument.baseCurrencyCode.toUpperCase() &&
      allocation.payment.transactionCurrencyCode.toUpperCase() !==
        allocation.payment.baseCurrencyCode.toUpperCase(),
  );

  const customerIds = [
    ...new Set(
      foreignDocuments
        .filter((document) => document.counterpartyType === "CUSTOMER")
        .map((document) => document.counterpartyId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const vendorIds = [
    ...new Set(
      foreignDocuments
        .filter((document) => document.counterpartyType === "SUPPLIER")
        .map((document) => document.counterpartyId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const [customerProfiles, vendorProfiles] = await Promise.all([
    customerIds.length
      ? db.accountingCustomerProfile.findMany({
          where: { orgId, crmAccountId: { in: customerIds }, isActive: true },
          select: { crmAccountId: true, receivableAccountId: true },
        })
      : [],
    vendorIds.length
      ? db.accountingVendorProfile.findMany({
          where: { orgId, crmVendorId: { in: vendorIds }, isActive: true },
          select: { crmVendorId: true, payableAccountId: true },
        })
      : [],
  ]);
  const customerControlMap = new Map(
    customerProfiles.map((profile) => [profile.crmAccountId, profile.receivableAccountId]),
  );
  const vendorControlMap = new Map(
    vendorProfiles.map((profile) => [profile.crmVendorId, profile.payableAccountId]),
  );

  const historicalRateMap = await resolveHistoricalRateMap(orgId, [
    ...foreignDocuments.flatMap((document) => (document.exchangeRateId ? [document.exchangeRateId] : [])),
    ...relevantAllocations.flatMap((allocation) => [
      allocation.payment.exchangeRateId,
      allocation.targetDocument?.exchangeRateId,
    ]).filter((value): value is string => Boolean(value)),
  ]);
  const approvedRateMap = await resolveApprovedRateMap(
    orgId,
    [
      ...foreignDocuments.map((document) => ({
        fromCurrencyCode: document.transactionCurrencyCode,
        toCurrencyCode: document.baseCurrencyCode,
      })),
      ...relevantAllocations.map((allocation) => ({
        fromCurrencyCode: allocation.payment.transactionCurrencyCode,
        toCurrencyCode: allocation.payment.baseCurrencyCode,
      })),
    ],
    asOfDate,
  );

  const unrealizedRows = foreignDocuments.flatMap((document) => {
    const allocated = add(
      ...document.paymentTargets.map((allocation) => allocation.amount.toString()),
    );
    const outstanding = subtract(document.totalAmount.toString(), allocated);
    if (compare(outstanding, "0") <= 0) return [];

    const historicalRate =
      (document.exchangeRateId && historicalRateMap.get(document.exchangeRateId)) ??
      null;
    const currentRate =
      approvedRateMap.get(
        pairKey(document.transactionCurrencyCode, document.baseCurrencyCode),
      ) ?? null;
    if (!historicalRate || !currentRate) return [];

    const bookedBase = convertToBaseCurrency(outstanding, historicalRate.rate, {
      scale: 8,
      allowRounding: true,
      label: "historicalBaseOutstanding",
    });
    const currentBase = convertToBaseCurrency(outstanding, currentRate.rate, {
      scale: 8,
      allowRounding: true,
      label: "currentBaseOutstanding",
    });
    const variance = subtract(currentBase, bookedBase);

    const controlAccountId =
      document.counterpartyType === "CUSTOMER"
        ? document.counterpartyId
          ? customerControlMap.get(document.counterpartyId) ?? null
          : null
        : document.counterpartyType === "SUPPLIER"
          ? document.counterpartyId
            ? vendorControlMap.get(document.counterpartyId) ?? null
            : null
          : null;
    return [
      {
        id: document.id,
        documentType: document.documentType,
        legalEntity: `${document.legalEntity.code} — ${document.legalEntity.legalName}`,
        postingDate: isoDate(document.postingDate),
        transactionCurrencyCode: document.transactionCurrencyCode,
        baseCurrencyCode: document.baseCurrencyCode,
        outstandingAmount: serialize(outstanding, 8),
        historicalRate: historicalRate.rate,
        currentRate: currentRate.rate,
        bookedBaseAmount: serialize(bookedBase, 8),
        currentBaseAmount: serialize(currentBase, 8),
        varianceAmount: serialize(variance, 8),
        varianceDirection: compare(variance, "0") >= 0 ? "LOSS" : "GAIN",
        counterpartyType: document.counterpartyType,
        counterpartyId: document.counterpartyId,
        controlAccountId,
      },
    ];
  });

  const realizedRows = relevantAllocations.flatMap((allocation) => {
    const targetDocument = allocation.targetDocument;
    if (!targetDocument) return [];
    const paymentRate =
      (allocation.payment.exchangeRateId &&
        historicalRateMap.get(allocation.payment.exchangeRateId)) ??
      null;
    const documentRate =
      (targetDocument.exchangeRateId &&
        historicalRateMap.get(targetDocument.exchangeRateId)) ??
      null;
    if (!paymentRate || !documentRate) return [];

    const bookedBase = convertToBaseCurrency(allocation.amount.toString(), documentRate.rate, {
      scale: 8,
      allowRounding: true,
      label: "bookedDocumentAllocation",
    });
    const settledBase = convertToBaseCurrency(allocation.amount.toString(), paymentRate.rate, {
      scale: 8,
      allowRounding: true,
      label: "settledPaymentAllocation",
    });
    const variance = subtract(settledBase, bookedBase);
    if (compare(variance, "0") === 0) return [];

    return [
      {
        id: allocation.id,
        paymentId: allocation.payment.id,
        documentId: targetDocument.id,
        paymentType: allocation.payment.paymentType,
        documentType: targetDocument.documentType,
        transactionDate: isoDate(allocation.payment.transactionDate),
        postingDate: isoDate(targetDocument.postingDate),
        transactionCurrencyCode: allocation.payment.transactionCurrencyCode,
        allocationAmount: serialize(allocation.amount, 8),
        documentRate: documentRate.rate,
        settlementRate: paymentRate.rate,
        bookedBaseAmount: serialize(bookedBase, 8),
        settledBaseAmount: serialize(settledBase, 8),
        varianceAmount: serialize(variance, 8),
        varianceDirection: compare(variance, "0") >= 0 ? "LOSS" : "GAIN",
        counterpartyType: targetDocument.documentType.startsWith("PURCHASE")
          ? "SUPPLIER"
          : "CUSTOMER",
        counterpartyId: null,
      },
    ];
  });

  const unrealizedNet = add(
    ...unrealizedRows.map((row) => row.varianceAmount),
    "0",
  );
  const realizedNet = add(...realizedRows.map((row) => row.varianceAmount), "0");

  return {
    asOfDate: isoDate(asOfDate),
    functionalCurrencyCode,
    summary: {
      unrealizedExposureCount: unrealizedRows.length,
      realizedVarianceCount: realizedRows.length,
      unrealizedNetVariance: serialize(unrealizedNet, 8),
      realizedNetVariance: serialize(realizedNet, 8),
    },
    unrealizedRows,
    realizedRows,
    closeRuns: closeRuns.map((run) => {
      const reportBundle = asObject(run.reportBundle);
      return {
        id: run.id,
        rowVersion: run.rowVersion,
        legalEntity: `${run.legalEntity.code} — ${run.legalEntity.legalName}`,
        periodLabel: `P${run.period.periodNumber} · ${run.period.name}`,
        closeDate: isoDate(run.closeDate),
        status: run.status,
        hasFxReview: Boolean(reportBundle.fxReview),
        fxReviewJournalDraftId: asNullableString(reportBundle.fxReviewJournalDraftId),
        fxReviewJournalDraftStatus: asNullableString(reportBundle.fxReviewJournalDraftStatus),
      };
    }),
  };
}

async function resolveFxPostingAccounts(orgId: string) {
  const controls = await db.accountingAccountControl.findMany({
    where: {
      orgId,
      systemRole: {
        in: [
          "FX_UNREALIZED_GAIN",
          "FX_UNREALIZED_LOSS",
          "FX_REALIZED_GAIN",
          "FX_REALIZED_LOSS",
        ],
      },
    },
    include: {
      account: {
        select: { id: true, accountName: true, isActive: true, isGroup: true },
      },
    },
  });
  const map = new Map(controls.map((control) => [control.systemRole, control.account]));
  for (const role of [
    "FX_UNREALIZED_GAIN",
    "FX_UNREALIZED_LOSS",
    "FX_REALIZED_GAIN",
    "FX_REALIZED_LOSS",
  ]) {
    const account = map.get(role);
    if (!account || !account.isActive || account.isGroup) {
      throw new Error(`FX_POSTING_ACCOUNT_REQUIRED:${role}`);
    }
  }
  return {
    unrealizedGain: map.get("FX_UNREALIZED_GAIN")!,
    unrealizedLoss: map.get("FX_UNREALIZED_LOSS")!,
    realizedGain: map.get("FX_REALIZED_GAIN")!,
    realizedLoss: map.get("FX_REALIZED_LOSS")!,
  };
}

function applyFxLinePair(
  lines: Array<{
    accountId: string;
    debit: string;
    credit: string;
    partyType?: string | null;
    partyId?: string | null;
    remarks?: string | null;
  }>,
  input: {
    controlAccountId: string;
    counterpartyType: string | null;
    counterpartyId: string | null;
    varianceAmount: string;
    isRealized: boolean;
    postingKind: "ASSET" | "LIABILITY";
    unrealizedGainAccountId: string;
    unrealizedLossAccountId: string;
    realizedGainAccountId: string;
    realizedLossAccountId: string;
    remarks: string;
  },
) {
  const variance = decimal(input.varianceAmount);
  if (variance.isZero()) return;

  const amount = serialize(absolute(variance), 8);
  const gainAccountId = input.isRealized
    ? input.realizedGainAccountId
    : input.unrealizedGainAccountId;
  const lossAccountId = input.isRealized
    ? input.realizedLossAccountId
    : input.unrealizedLossAccountId;

  const positiveIsGain = input.postingKind === "ASSET";
  const isGain = variance.isPositive() ? positiveIsGain : !positiveIsGain;

  if (isGain) {
    lines.push({
      accountId: input.controlAccountId,
      debit: amount,
      credit: "0",
      partyType: input.counterpartyType,
      partyId: input.counterpartyId,
      remarks: input.remarks,
    });
    lines.push({
      accountId: gainAccountId,
      debit: "0",
      credit: amount,
      remarks: input.remarks,
    });
    return;
  }

  lines.push({
    accountId: lossAccountId,
    debit: amount,
    credit: "0",
    remarks: input.remarks,
  });
  lines.push({
    accountId: input.controlAccountId,
    debit: "0",
    credit: amount,
    partyType: input.counterpartyType,
    partyId: input.counterpartyId,
    remarks: input.remarks,
  });
}

export async function createForeignExchangeRevaluationDraft(input: {
  orgId: string;
  actorId: string;
  periodCloseRunId: string;
  expectedVersion?: number;
}) {
  const run = await db.accountingPeriodCloseRun.findFirst({
    where: { id: input.periodCloseRunId, orgId: input.orgId },
    include: {
      legalEntity: { select: { code: true, legalName: true } },
      period: { select: { periodNumber: true, name: true } },
    },
  });
  if (!run) throw new Error("FX_REVALUATION_CLOSE_RUN_NOT_FOUND");
  if (input.expectedVersion != null && run.rowVersion !== input.expectedVersion) {
    throw new Error("FX_REVALUATION_CLOSE_RUN_VERSION_CONFLICT");
  }
  if (run.status === "CLOSED") {
    throw new Error("FX_REVALUATION_CLOSE_RUN_ALREADY_CLOSED");
  }

  const reportBundle = asObject(run.reportBundle);
  const existingDraftId =
    typeof reportBundle.fxReviewJournalDraftId === "string"
      ? reportBundle.fxReviewJournalDraftId
      : null;
  if (existingDraftId) {
    const existing = await db.journalEntry.findFirst({
      where: {
        id: existingDraftId,
        orgId: input.orgId,
        status: { in: ["DRAFT", "SUBMITTED", "POSTED"] },
      },
    });
    if (existing) {
      throw new Error("FX_REVALUATION_DRAFT_ALREADY_EXISTS");
    }
  }

  const workspace = await computeForeignExchangeReviewData(input.orgId, {
    asOfDate: run.closeDate,
  });
  const accounts = await resolveFxPostingAccounts(input.orgId);
  const lines: Array<{
    accountId: string;
    debit: string;
    credit: string;
    partyType?: string | null;
    partyId?: string | null;
    remarks?: string | null;
  }> = [];

  for (const row of workspace.unrealizedRows) {
    if (!row.controlAccountId || !row.counterpartyType || !row.counterpartyId) {
      continue;
    }
    applyFxLinePair(lines, {
      controlAccountId: row.controlAccountId,
      counterpartyType: row.counterpartyType,
      counterpartyId: row.counterpartyId,
      varianceAmount: row.varianceAmount,
      isRealized: false,
      postingKind: row.counterpartyType === "SUPPLIER" ? "LIABILITY" : "ASSET",
      unrealizedGainAccountId: accounts.unrealizedGain.id,
      unrealizedLossAccountId: accounts.unrealizedLoss.id,
      realizedGainAccountId: accounts.realizedGain.id,
      realizedLossAccountId: accounts.realizedLoss.id,
      remarks: `Unrealized FX review ${row.documentType}`,
    });
  }

  const relevantAllocations = await db.accountingPaymentAllocation.findMany({
    where: { orgId: input.orgId, id: { in: workspace.realizedRows.map((row) => row.id) } },
    include: {
      payment: {
        select: { payerPayeeType: true, payerPayeeId: true },
      },
    },
  });
  const allocationPartyMap = new Map(
    relevantAllocations.map((row) => [row.id, row.payment]),
  );
  const customerProfiles = await db.accountingCustomerProfile.findMany({
    where: { orgId: input.orgId, isActive: true },
    select: { crmAccountId: true, receivableAccountId: true },
  });
  const vendorProfiles = await db.accountingVendorProfile.findMany({
    where: { orgId: input.orgId, isActive: true },
    select: { crmVendorId: true, payableAccountId: true },
  });
  const customerControlMap = new Map(
    customerProfiles.map((profile) => [profile.crmAccountId, profile.receivableAccountId]),
  );
  const vendorControlMap = new Map(
    vendorProfiles.map((profile) => [profile.crmVendorId, profile.payableAccountId]),
  );

  for (const row of workspace.realizedRows) {
    const party = allocationPartyMap.get(row.id);
    const counterpartyType = party?.payerPayeeType ?? null;
    const counterpartyId = party?.payerPayeeId ?? null;
    const controlAccountId =
      counterpartyType === "CUSTOMER"
        ? counterpartyId
          ? customerControlMap.get(counterpartyId) ?? null
          : null
        : counterpartyType === "SUPPLIER"
          ? counterpartyId
            ? vendorControlMap.get(counterpartyId) ?? null
            : null
          : null;
    if (!controlAccountId || !counterpartyType || !counterpartyId) continue;

    applyFxLinePair(lines, {
      controlAccountId,
      counterpartyType,
      counterpartyId,
      varianceAmount: row.varianceAmount,
      isRealized: true,
      postingKind: counterpartyType === "SUPPLIER" ? "LIABILITY" : "ASSET",
      unrealizedGainAccountId: accounts.unrealizedGain.id,
      unrealizedLossAccountId: accounts.unrealizedLoss.id,
      realizedGainAccountId: accounts.realizedGain.id,
      realizedLossAccountId: accounts.realizedLoss.id,
      remarks: `Realized FX settlement ${row.documentType}`,
    });
  }

  if (lines.length < 2) {
    throw new Error("FX_REVALUATION_NOTHING_TO_POST");
  }

  const draft = await createJournalEntry(input.orgId, input.actorId, {
    branchId: null,
    postingDate: run.closeDate.toISOString(),
    remarks: `FX revaluation review ${run.legalEntity.code} ${run.period.name} P${run.period.periodNumber}`,
    lines,
  });

  const updated = await db.accountingPeriodCloseRun.update({
    where: { id: run.id },
    data: {
      reportBundle: {
        ...reportBundle,
        fxReviewJournalDraftId: draft.id,
        fxReviewJournalDraftStatus: draft.status,
        fxReviewJournalDraftCreatedAt: new Date().toISOString(),
      },
      rowVersion: { increment: 1 },
    },
  });

  await createAuditLog(
    input.orgId,
    input.actorId,
    "ACCOUNTING_FX_REVALUATION_DRAFT_CREATED",
    "AccountingPeriodCloseRun",
    updated.id,
    { rowVersion: run.rowVersion, status: run.status },
    { rowVersion: updated.rowVersion, journalDraftId: draft.id, status: updated.status },
  );

  return { closeRun: updated, draft };
}

export async function recordForeignExchangeReviewOnCloseRun(input: {
  orgId: string;
  actorId: string;
  periodCloseRunId: string;
  expectedVersion?: number;
  asOfDate?: string | Date;
}) {
  const run = await db.accountingPeriodCloseRun.findFirst({
    where: { id: input.periodCloseRunId, orgId: input.orgId },
  });
  if (!run) throw new Error("FX_REVIEW_CLOSE_RUN_NOT_FOUND");
  if (input.expectedVersion != null && run.rowVersion !== input.expectedVersion) {
    throw new Error("FX_REVIEW_CLOSE_RUN_VERSION_CONFLICT");
  }
  if (run.status === "CLOSED") {
    throw new Error("FX_REVIEW_CLOSE_RUN_ALREADY_CLOSED");
  }

  const workspace = await getForeignExchangeReviewWorkspace(input.orgId, {
    asOfDate: input.asOfDate ?? run.closeDate,
  });
  const checklist = asObject(run.checklist);
  const reportBundle = asObject(run.reportBundle);
  const fxReview = {
    asOfDate: workspace.asOfDate,
    recordedAt: new Date().toISOString(),
    recordedById: input.actorId,
    functionalCurrencyCode: workspace.functionalCurrencyCode,
    summary: workspace.summary,
    topUnrealizedRows: workspace.unrealizedRows.slice(0, 20),
    topRealizedRows: workspace.realizedRows.slice(0, 20),
  };

  const updated = await db.accountingPeriodCloseRun.update({
    where: { id: run.id },
    data: {
      checklist: {
        ...checklist,
        fxReviewRecordedAt: fxReview.recordedAt,
        fxReviewRecordedById: input.actorId,
      },
      reportBundle: {
        ...reportBundle,
        fxReview,
      },
      rowVersion: { increment: 1 },
    },
  });

  await createAuditLog(
    input.orgId,
    input.actorId,
    "ACCOUNTING_FX_REVIEW_RECORDED",
    "AccountingPeriodCloseRun",
    updated.id,
    { rowVersion: run.rowVersion, status: run.status },
    {
      rowVersion: updated.rowVersion,
      status: updated.status,
      fxReviewAsOfDate: workspace.asOfDate,
      unrealizedExposureCount: workspace.summary.unrealizedExposureCount,
      realizedVarianceCount: workspace.summary.realizedVarianceCount,
    },
  );

  return updated;
}
