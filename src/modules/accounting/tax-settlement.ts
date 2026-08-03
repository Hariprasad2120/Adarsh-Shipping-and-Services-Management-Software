import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import { createAuditLog } from "./service";
import { assertStatutoryReportAvailability } from "./tax-controls";
import {
  getConsolidatedGSTLedger,
  getGSTR1Summary,
  getGSTR2BSummary,
} from "./reports";
import { getForeignExchangeReviewWorkspace } from "./foreign-exchange";

type FilingStatus = "OPEN" | "READY" | "FILED" | "SUPERSEDED";
type CloseRunStatus = "OPEN" | "READY" | "CLOSED" | "REOPENED";

function asObject(
  value: Prisma.JsonValue | null | undefined,
): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

function asInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function ensureFilingTransition(current: FilingStatus, next: FilingStatus) {
  const allowed: Record<FilingStatus, FilingStatus[]> = {
    OPEN: ["READY", "SUPERSEDED"],
    READY: ["OPEN", "FILED", "SUPERSEDED"],
    FILED: [],
    SUPERSEDED: [],
  };
  if (!allowed[current].includes(next)) {
    throw new Error(
      `SETTLEMENT_FILING_STATUS_TRANSITION_INVALID: cannot move from ${current} to ${next}`,
    );
  }
}

function ensureCloseRunTransition(current: CloseRunStatus, next: CloseRunStatus) {
  const allowed: Record<CloseRunStatus, CloseRunStatus[]> = {
    OPEN: ["READY"],
    READY: ["CLOSED", "OPEN"],
    CLOSED: ["REOPENED"],
    REOPENED: ["READY"],
  };
  if (!allowed[current].includes(next)) {
    throw new Error(
      `SETTLEMENT_CLOSE_RUN_STATUS_TRANSITION_INVALID: cannot move from ${current} to ${next}`,
    );
  }
}

async function buildFilingSnapshot(input: {
  orgId: string;
  returnType: string;
  taxRegistrationId: string;
  legalEntityId?: string | null;
  periodStart: Date;
  periodEnd: Date;
}) {
  if (input.returnType === "GSTR1") {
    const summary = await getGSTR1Summary(input.orgId, {
      fromDate: input.periodStart,
      toDate: input.periodEnd,
    });
    return {
      reportType: "GSTR1",
      count: summary.total.count,
      taxableValue: summary.total.taxableValue,
      taxAmount: summary.total.taxAmount,
    };
  }
  if (input.returnType === "GSTR2B") {
    const summary = await getGSTR2BSummary(input.orgId, {
      fromDate: input.periodStart,
      toDate: input.periodEnd,
    });
    return {
      reportType: "GSTR2B",
      count: summary.count,
      taxableValue: summary.taxableValue,
      taxAmount: summary.taxAmount,
    };
  }
  const ledger = await getConsolidatedGSTLedger(input.orgId, {
    fromDate: input.periodStart,
    toDate: input.periodEnd,
  });
  return {
    reportType: "GST_LEDGER",
    count: ledger.length,
  };
}

export async function transitionAccountingStatutoryFilingPeriod(input: {
  orgId: string;
  actorId: string;
  filingPeriodId: string;
  expectedVersion?: number;
  nextStatus: FilingStatus;
  acknowledgementRef?: string | null;
  reason?: string | null;
}) {
  const filingPeriod = await db.accountingStatutoryFilingPeriod.findFirst({
    where: { id: input.filingPeriodId, orgId: input.orgId },
  });
  if (!filingPeriod) {
    throw new Error("SETTLEMENT_FILING_PERIOD_NOT_FOUND");
  }
  if (
    input.expectedVersion != null &&
    filingPeriod.rowVersion !== input.expectedVersion
  ) {
    throw new Error("SETTLEMENT_FILING_PERIOD_VERSION_CONFLICT");
  }

  const currentStatus = filingPeriod.status as FilingStatus;
  ensureFilingTransition(currentStatus, input.nextStatus);

  const configuration = asObject(filingPeriod.configuration);
  let snapshot = configuration.lastReviewedSnapshot;

  if (input.nextStatus === "READY") {
    await assertStatutoryReportAvailability({
      orgId: input.orgId,
      taxRegistrationId: filingPeriod.taxRegistrationId,
      legalEntityId: filingPeriod.legalEntityId,
      returnType: filingPeriod.returnType,
      date: filingPeriod.periodEnd,
    });
    snapshot = await buildFilingSnapshot({
      orgId: input.orgId,
      returnType: filingPeriod.returnType,
      taxRegistrationId: filingPeriod.taxRegistrationId,
      legalEntityId: filingPeriod.legalEntityId,
      periodStart: filingPeriod.periodStart,
      periodEnd: filingPeriod.periodEnd,
    });
  }

  if (input.nextStatus === "FILED") {
    const acknowledgementRef = String(input.acknowledgementRef ?? "").trim();
    if (!acknowledgementRef) {
      throw new Error("SETTLEMENT_FILING_ACKNOWLEDGEMENT_REQUIRED");
    }
  }

  const nextConfiguration =
    input.nextStatus === "READY"
      ? {
          ...configuration,
          lastReviewedAt: new Date().toISOString(),
          lastReviewedById: input.actorId,
          lastReviewedSnapshot: asInputJsonValue(snapshot),
          lastOperationalReason: String(input.reason ?? "").trim() || null,
        }
      : {
          ...configuration,
          lastOperationalReason: String(input.reason ?? "").trim() || null,
        };

  const updated = await db.accountingStatutoryFilingPeriod.update({
    where: { id: filingPeriod.id },
    data: {
      status: input.nextStatus,
      acknowledgementRef:
        input.nextStatus === "FILED"
          ? String(input.acknowledgementRef ?? "").trim()
          : filingPeriod.acknowledgementRef,
      filedAt: input.nextStatus === "FILED" ? new Date() : filingPeriod.filedAt,
      filedById:
        input.nextStatus === "FILED" ? input.actorId : filingPeriod.filedById,
      configuration: nextConfiguration,
      rowVersion: { increment: 1 },
    },
  });

  await createAuditLog(
    input.orgId,
    input.actorId,
    `ACCOUNTING_SETTLEMENT_FILING_${input.nextStatus}`,
    "AccountingStatutoryFilingPeriod",
    updated.id,
    {
      status: filingPeriod.status,
      rowVersion: filingPeriod.rowVersion,
      acknowledgementRef: filingPeriod.acknowledgementRef,
    },
    {
      status: updated.status,
      rowVersion: updated.rowVersion,
      acknowledgementRef: updated.acknowledgementRef,
      reason: String(input.reason ?? "").trim() || null,
    },
  );

  return updated;
}

export async function transitionAccountingPeriodCloseRun(input: {
  orgId: string;
  actorId: string;
  periodCloseRunId: string;
  expectedVersion?: number;
  nextStatus: CloseRunStatus;
  reason?: string | null;
}) {
  const run = await db.accountingPeriodCloseRun.findFirst({
    where: { id: input.periodCloseRunId, orgId: input.orgId },
    include: {
      period: {
        select: { startDate: true, endDate: true, name: true, periodNumber: true },
      },
    },
  });
  if (!run) {
    throw new Error("SETTLEMENT_PERIOD_CLOSE_NOT_FOUND");
  }
  if (input.expectedVersion != null && run.rowVersion !== input.expectedVersion) {
    throw new Error("SETTLEMENT_PERIOD_CLOSE_VERSION_CONFLICT");
  }

  const currentStatus = run.status as CloseRunStatus;
  ensureCloseRunTransition(currentStatus, input.nextStatus);

  const checklist = asObject(run.checklist);
  const reportBundle = asObject(run.reportBundle);

  const openFilingPeriods = await db.accountingStatutoryFilingPeriod.count({
    where: {
      orgId: input.orgId,
      status: { in: ["OPEN", "READY"] },
      periodStart: { lte: run.period.endDate },
      periodEnd: { gte: run.period.startDate },
      OR: [
        { legalEntityId: run.legalEntityId },
        {
          legalEntityId: null,
          taxRegistration: { legalEntityId: run.legalEntityId },
        },
      ],
    },
  });

  const transactionLock = await db.transactionLock.findUnique({
    where: { orgId: input.orgId },
  });

  if (input.nextStatus === "CLOSED") {
    if (openFilingPeriods > 0) {
      throw new Error(
        "SETTLEMENT_PERIOD_CLOSE_PENDING_FILING: all overlapping filing periods must be filed or superseded before closing",
      );
    }
    if (!transactionLock || transactionLock.lockDate < run.closeDate) {
      throw new Error(
        "SETTLEMENT_PERIOD_CLOSE_LOCK_REQUIRED: transaction lock must cover the close date before closing the period",
      );
    }
    const existingFxReview = reportBundle.fxReview;
    const fxWorkspace = await getForeignExchangeReviewWorkspace(input.orgId, {
      asOfDate: run.closeDate,
    });
    if (
      (fxWorkspace.summary.unrealizedExposureCount > 0 ||
        fxWorkspace.summary.realizedVarianceCount > 0) &&
      (
        !existingFxReview ||
        typeof existingFxReview !== "object" ||
        (existingFxReview as Record<string, unknown>).asOfDate !==
          isoDate(run.closeDate)
      )
    ) {
      throw new Error(
        "SETTLEMENT_PERIOD_CLOSE_FX_REVIEW_REQUIRED: record an FX review snapshot for the close date before closing the period",
      );
    }
  }

  const updated = await db.accountingPeriodCloseRun.update({
    where: { id: run.id },
    data: {
      status: input.nextStatus,
      checklist: {
        ...checklist,
        lastOperationalReviewAt: new Date().toISOString(),
        overlappingOpenFilingPeriods: openFilingPeriods,
        lockDate: transactionLock ? isoDate(transactionLock.lockDate) : null,
        lastOperationalReason: String(input.reason ?? "").trim() || null,
      },
      reportBundle: {
        ...reportBundle,
        periodLabel: `P${run.period.periodNumber} · ${run.period.name}`,
        lastOperationalReviewAt: new Date().toISOString(),
      },
      closedAt: input.nextStatus === "CLOSED" ? new Date() : run.closedAt,
      closedById: input.nextStatus === "CLOSED" ? input.actorId : run.closedById,
      reopenedAt:
        input.nextStatus === "REOPENED" ? new Date() : run.reopenedAt,
      reopenedById:
        input.nextStatus === "REOPENED" ? input.actorId : run.reopenedById,
      rowVersion: { increment: 1 },
    },
  });

  await createAuditLog(
    input.orgId,
    input.actorId,
    `ACCOUNTING_SETTLEMENT_CLOSE_${input.nextStatus}`,
    "AccountingPeriodCloseRun",
    updated.id,
    { status: run.status, rowVersion: run.rowVersion },
    {
      status: updated.status,
      rowVersion: updated.rowVersion,
      overlappingOpenFilingPeriods: openFilingPeriods,
      lockDate: transactionLock ? isoDate(transactionLock.lockDate) : null,
      reason: String(input.reason ?? "").trim() || null,
    },
  );

  return updated;
}
