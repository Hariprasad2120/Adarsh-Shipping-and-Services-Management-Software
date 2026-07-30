import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { Prisma } from "@/generated/prisma/client";

import { assertBalanced, decimal, serialize } from "./money";
import {
  canonicalPostingPayload,
  postCanonicalAccountingRequest,
  type CanonicalPostingRequest,
} from "./posting-engine";
import { canonicalPayload, newAccountingRequestId, payloadHash } from "./request-integrity";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(canonicalPayload(value)) as Prisma.InputJsonValue;
}

async function assertUserPermissions(orgId: string, userId: string, requiredKeys: string[]) {
  const granted = await db.permission.findMany({
    where: {
      key: { in: requiredKeys },
      roles: {
        some: {
          role: {
            orgId,
            userRoles: {
              some: {
                userId,
                user: { orgId, active: true },
              },
            },
          },
        },
      },
    },
    select: { key: true },
  });
  const grantedKeys = new Set(granted.map(({ key }) => key));
  const missing = requiredKeys.filter((key) => !grantedKeys.has(key));
  if (missing.length > 0) {
    throw new Error(`Missing required permissions: ${missing.join(", ")}`);
  }
}

function validDate(value: Date | string, label: string) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid`);
  return date;
}

export async function resolveCanonicalPostingConfiguration(
  orgId: string,
  dateInput: Date | string,
  journalType = "JOURNAL_ENTRY",
  legalEntityId?: string,
) {
  const date = validDate(dateInput, "postingDate");
  const explicitLegalEntityId = legalEntityId?.trim();
  if (legalEntityId != null && !explicitLegalEntityId) {
    throw new Error("Canonical Accounting legal entity is required");
  }
  const [legalEntity, approvalPolicy, numberSeries, roundingPolicy, profile] = await Promise.all([
    db.accountingLegalEntity.findFirst({
      where: explicitLegalEntityId
        ? { id: explicitLegalEntityId, orgId, status: "ACTIVE" }
        : { orgId, status: "ACTIVE", isDefault: true },
      orderBy: { createdAt: "asc" },
    }),
    db.accountingApprovalPolicy.findFirst({
      where: {
        orgId,
        documentType: journalType,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { version: "desc" },
    }),
    db.accountingNumberSeries.findFirst({
      where: {
        orgId,
        documentType: journalType,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    db.accountingRoundingPolicy.findFirst({
      where: {
        orgId,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { version: "desc" },
    }),
    db.accountingOrganisationProfile.findUnique({ where: { orgId } }),
  ]);

  if (!legalEntity) {
    throw new Error(
      explicitLegalEntityId
        ? "Requested Accounting legal entity is not active in this organization"
        : "No active default Accounting legal entity is configured",
    );
  }
  if (!approvalPolicy) throw new Error(`No active approval policy is configured for ${journalType}`);
  if (!numberSeries) throw new Error(`No active number series is configured for ${journalType}`);
  if (!roundingPolicy) throw new Error("No active versioned Accounting rounding policy is configured");
  if (!profile) throw new Error("Accounting organization profile is not configured");

  return {
    legalEntity,
    approvalPolicy,
    numberSeries,
    roundingPolicy,
    profile,
  };
}

export async function recoverStaleAccountingRequest(input: {
  orgId: string;
  inboxId: string;
  actorId: string;
  staleBefore: Date | string;
}) {
  await assertUserPermissions(input.orgId, input.actorId, ["accounting.integration.retry"]);
  const staleBefore = validDate(input.staleBefore, "staleBefore");
  const now = await getNow();
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; status: string; processingAt: Date | null }>
    >`
      SELECT id, status::text, "processingAt"
      FROM "AccountingIntegrationInbox"
      WHERE id = ${input.inboxId}
        AND "orgId" = ${input.orgId}
      FOR UPDATE
    `;
    const inbox = rows[0];
    if (!inbox) throw new Error("Accounting integration request not found");
    if (
      inbox.status !== "PROCESSING" ||
      !inbox.processingAt ||
      inbox.processingAt >= staleBefore
    ) {
      throw new Error("Accounting integration request does not have a stale processing claim");
    }
    const recovered = await tx.accountingIntegrationInbox.update({
      where: { id: inbox.id },
      data: {
        status: "RETRYABLE",
        processingAt: null,
        availableAt: now,
        lastErrorCode: "STALE_PROCESSING_CLAIM_RECOVERED",
        retryClassification: "RETRYABLE",
        rowVersion: { increment: 1 },
      },
    });
    await tx.accountingAuditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.actorId,
        action: "RECOVER_ACCOUNTING_INTEGRATION_REQUEST",
        entityType: "AccountingIntegrationInbox",
        entityId: inbox.id,
        afterValues: {
          status: "RETRYABLE",
          errorCode: "STALE_PROCESSING_CLAIM_RECOVERED",
        },
      },
    });
    return recovered;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function moveAccountingRequestToManualReview(input: {
  orgId: string;
  inboxId: string;
  actorId: string;
  reasonCode: string;
}) {
  await assertUserPermissions(input.orgId, input.actorId, [
    "accounting.integration.manual-review",
  ]);
  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(input.reasonCode)) {
    throw new Error("Manual-review reasonCode must be a stable non-sensitive code");
  }
  const now = await getNow();
  return db.$transaction(async (tx) => {
    const inbox = await tx.accountingIntegrationInbox.findFirst({
      where: {
        id: input.inboxId,
        orgId: input.orgId,
        status: { not: "PROCESSED" },
      },
    });
    if (!inbox) throw new Error("Eligible Accounting integration request not found");
    const reviewed = await tx.accountingIntegrationInbox.update({
      where: { id: inbox.id },
      data: {
        status: "MANUAL_REVIEW",
        processingAt: null,
        manualReviewAt: now,
        lastErrorCode: input.reasonCode,
        retryClassification: "MANUAL_REVIEW",
        rowVersion: { increment: 1 },
      },
    });
    await tx.accountingAuditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.actorId,
        action: "MOVE_ACCOUNTING_REQUEST_TO_MANUAL_REVIEW",
        entityType: "AccountingIntegrationInbox",
        entityId: inbox.id,
        afterValues: {
          status: "MANUAL_REVIEW",
          reasonCode: input.reasonCode,
        },
      },
    });
    return reviewed;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function prepareBankTransferRequest(input: {
  orgId: string;
  makerId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  postingDate: Date | string;
  remarks?: string | null;
  requestId?: string;
  idempotencyKey?: string;
}) {
  await assertUserPermissions(input.orgId, input.makerId, ["accounting.journal.prepare"]);
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("Source and destination accounts must be different");
  }
  const amount = decimal(input.amount, "amount");
  if (!amount.isPositive() || amount.isZero()) {
    throw new Error("Bank transfer amount must be positive");
  }
  const date = validDate(input.postingDate, "postingDate");
  const [configuration, accounts] = await Promise.all([
    resolveCanonicalPostingConfiguration(input.orgId, date),
    db.account.findMany({
      where: {
        orgId: input.orgId,
        id: { in: [input.fromAccountId, input.toAccountId] },
        isActive: true,
        isGroup: false,
        accountType: { in: ["BANK", "CASH"] },
      },
      select: { id: true },
    }),
  ]);
  if (accounts.length !== 2) {
    throw new Error("Both transfer accounts must be active bank or cash accounts in this organization");
  }

  const sourcePayload = {
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    amount: serialize(amount),
    postingDate: date.toISOString(),
    remarks: input.remarks?.trim() || "Bank transfer",
  };
  const sourceHash = payloadHash(sourcePayload);
  const requestId = input.requestId ?? newAccountingRequestId();
  const idempotencyKey =
    input.idempotencyKey ?? `ACCOUNTING:BANK_TRANSFER:${input.makerId}:${sourceHash}`;
  const provisionalRequest: CanonicalPostingRequest = {
    requestId,
    requestVersion: 1,
    idempotencyKey,
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    source: {
      system: "ACCOUNTING",
      type: "BANK_TRANSFER",
      id: requestId,
      version: 1,
      occurredAt: await getNow(),
      payload: sourcePayload,
    },
    actor: {
      kind: "USER",
      actorId: input.makerId,
      authenticatedOrgId: input.orgId,
    },
    makerId: input.makerId,
    postingDate: date,
    documentDate: date,
    journalType: "JOURNAL_ENTRY",
    ruleId: "BANK-TRANSFER-v1",
    narration: sourcePayload.remarks,
    transactionCurrencyCode: configuration.profile.functionalCurrencyCode,
    baseCurrencyCode: configuration.profile.functionalCurrencyCode,
    exchangeRate: null,
    approval: {
      policyId: configuration.approvalPolicy.id,
      policyVersion: configuration.approvalPolicy.version,
      approvedById: "PENDING_APPROVAL",
      approvedAt: date,
    },
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicy: {
      id: configuration.roundingPolicy.id,
      version: configuration.roundingPolicy.version,
    },
    lines: [
      {
        accountId: input.toAccountId,
        debit: serialize(amount),
        credit: "0",
        remarks: "Transfer in",
      },
      {
        accountId: input.fromAccountId,
        debit: "0",
        credit: serialize(amount),
        remarks: "Transfer out",
      },
    ],
    correlationId: requestId,
  };
  const canonicalPayloadValue = canonicalPostingPayload(provisionalRequest);
  const requestHash = payloadHash(canonicalPayloadValue);

  return db.$transaction(async (tx) => {
    const existing = await tx.accountingIntegrationInbox.findUnique({
      where: {
        orgId_sourceSystem_idempotencyKey: {
          orgId: input.orgId,
          sourceSystem: "ACCOUNTING",
          idempotencyKey,
        },
      },
    });
    if (existing) {
      if (existing.payloadHash !== requestHash) {
        throw new Error("Bank transfer idempotency key conflicts with another payload");
      }
      return existing;
    }

    const snapshot = await tx.accountingSourceSnapshot.create({
      data: {
        orgId: input.orgId,
        legalEntityId: configuration.legalEntity.id,
        sourceSystem: "ACCOUNTING",
        sourceType: "BANK_TRANSFER",
        sourceId: requestId,
        sourceVersion: 1,
        requestId,
        payload: json(sourcePayload),
        payloadHash: sourceHash,
        occurredAt: await getNow(),
      },
    });
    const inbox = await tx.accountingIntegrationInbox.create({
      data: {
        orgId: input.orgId,
        legalEntityId: configuration.legalEntity.id,
        sourceSystem: "ACCOUNTING",
        messageType: "BANK_TRANSFER",
        messageVersion: 1,
        requestId,
        idempotencyKey,
        payload: json(canonicalPayloadValue),
        payloadHash: requestHash,
        sourceSnapshotId: snapshot.id,
        correlationId: requestId,
        status: "PENDING",
      },
    });
    await tx.accountingAuditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.makerId,
        action: "PREPARE_BANK_TRANSFER_REQUEST",
        entityType: "AccountingIntegrationInbox",
        entityId: inbox.id,
        afterValues: {
          requestId,
          idempotencyKey,
          payloadHash: requestHash,
          sourceSnapshotId: snapshot.id,
          status: "PENDING",
        },
      },
    });
    return inbox;
  });
}

export async function approveAndPostPreparedRequest(input: {
  orgId: string;
  inboxId: string;
  approverId: string;
}) {
  const inbox = await db.accountingIntegrationInbox.findFirst({
    where: { id: input.inboxId, orgId: input.orgId, status: { in: ["PENDING", "RETRYABLE"] } },
  });
  if (!inbox) throw new Error("Pending Accounting request not found");

  const payload = inbox.payload as unknown as Omit<CanonicalPostingRequest, "actor" | "approval"> & {
    approval: { policyId: string; policyVersion: number };
  };
  if (payload.makerId === input.approverId) {
    throw new Error("Maker cannot approve their own Accounting request");
  }
  const now = await getNow();
  return postCanonicalAccountingRequest({
    ...payload,
    actor: {
      kind: "USER",
      actorId: input.approverId,
      authenticatedOrgId: input.orgId,
    },
    approval: {
      policyId: payload.approval.policyId,
      policyVersion: payload.approval.policyVersion,
      approvedById: input.approverId,
      approvedAt: now,
    },
  });
}

export async function prepareCrmDealInvoiceRequest(input: {
  orgId: string;
  actorId: string;
  dealId: string;
}) {
  await assertUserPermissions(input.orgId, input.actorId, [
    "crm.invoice.manage",
    "accounting.invoice.create",
  ]);
  const deal = await db.crmDeal.findFirst({
    where: { id: input.dealId, orgId: input.orgId },
    include: { owner: { select: { branchId: true } }, account: true },
  });
  if (!deal) throw new Error("Deal not found");
  if (deal.stage !== "WON") throw new Error("Only WON deals can prepare an Accounting invoice request");
  if (!deal.accountId) throw new Error("Deal must have a canonical CRM account");

  const sourceVersion = Math.floor(deal.updatedAt.getTime() / 1000);
  const requestId = `CRM-DEAL-${deal.id}-V${sourceVersion}`;
  const idempotencyKey = `CRM:DEAL_INVOICE_REQUEST:${deal.id}:${sourceVersion}`;
  const sourcePayload = {
    dealId: deal.id,
    dealVersion: sourceVersion,
    accountId: deal.accountId,
    branchId: deal.owner?.branchId ?? null,
    dealName: deal.name,
    serviceType: deal.serviceType,
    amount: String(deal.amount),
    currency: null,
    requestedDocumentDate: null,
    requestedDueDate: null,
    taxInputs: null,
    policyResolutionRequired: true,
  };
  const hash = payloadHash(sourcePayload);
  const configuration = await db.accountingLegalEntity.findFirst({
    where: { orgId: input.orgId, status: "ACTIVE", isDefault: true },
  });
  if (!configuration) throw new Error("No active default Accounting legal entity is configured");

  return db.$transaction(async (tx) => {
    const existing = await tx.accountingIntegrationInbox.findUnique({
      where: {
        orgId_sourceSystem_idempotencyKey: {
          orgId: input.orgId,
          sourceSystem: "CRM",
          idempotencyKey,
        },
      },
    });
    if (existing) {
      if (existing.payloadHash !== hash) throw new Error("CRM request idempotency conflict");
      return existing;
    }
    const snapshot = await tx.accountingSourceSnapshot.create({
      data: {
        orgId: input.orgId,
        legalEntityId: configuration.id,
        sourceSystem: "CRM",
        sourceType: "CRM_INVOICE_REQUEST",
        sourceId: deal.id,
        sourceVersion,
        requestId,
        payload: json(sourcePayload),
        payloadHash: hash,
        occurredAt: deal.updatedAt,
      },
    });
    const inbox = await tx.accountingIntegrationInbox.create({
      data: {
        orgId: input.orgId,
        legalEntityId: configuration.id,
        sourceSystem: "CRM",
        messageType: "crm.invoice-request.prepared",
        messageVersion: 1,
        requestId,
        idempotencyKey,
        payload: json(sourcePayload),
        payloadHash: hash,
        sourceSnapshotId: snapshot.id,
        correlationId: requestId,
        status: "PROCESSED",
        processedAt: await getNow(),
        processedRecordType: "AccountingInvoiceRequest",
        processedRecordId: snapshot.id,
      },
    });
    await tx.accountingAuditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.actorId,
        action: "PREPARE_CRM_INVOICE_REQUEST",
        entityType: "AccountingSourceSnapshot",
        entityId: snapshot.id,
        afterValues: {
          requestId,
          idempotencyKey,
          payloadHash: hash,
          policyResolutionRequired: true,
        },
      },
    });
    return inbox;
  });
}

export type ApprovedPayrollRunInput = {
  orgId: string;
  actorId: string;
  runId: string;
  runVersion: number;
  payPeriodStart: Date | string;
  payPeriodEnd: Date | string;
  currencyCode: string;
  approvedById: string;
  approvedAt: Date | string;
  eventId: string;
  correlationId: string;
  lines: Array<{
    employeeId?: string | null;
    componentCode: string;
    accountId: string;
    debit: string;
    credit: string;
    dimensions?: Array<{ definitionId: string; dimensionValueId: string }>;
  }>;
};

export async function acceptApprovedPayrollRun(input: ApprovedPayrollRunInput) {
  await assertUserPermissions(input.orgId, input.actorId, ["accounting.integration.post"]);
  if (!Number.isInteger(input.runVersion) || input.runVersion < 1) {
    throw new Error("Payroll run version must be a positive integer");
  }
  const start = validDate(input.payPeriodStart, "payPeriodStart");
  const end = validDate(input.payPeriodEnd, "payPeriodEnd");
  if (end < start) throw new Error("Payroll pay period is invalid");
  if (!input.runId.trim() || !input.eventId.trim() || !input.correlationId.trim()) {
    throw new Error("Payroll run, event, and correlation identities are required");
  }
  if (input.lines.length < 2) {
    throw new Error("Approved HRMS payroll run requires at least two allocation lines");
  }
  for (const [index, line] of input.lines.entries()) {
    if (!line.accountId || !line.componentCode.trim()) {
      throw new Error(`Payroll allocation line ${index + 1} requires an account and component code`);
    }
  }
  const configuration = await resolveCanonicalPostingConfiguration(input.orgId, end);
  const exactTotals = assertBalanced(input.lines);
  const totals = input.lines.reduce(
    (current, line) => ({
      debit: current.debit.add(decimal(line.debit, "payroll debit")),
      credit: current.credit.add(decimal(line.credit, "payroll credit")),
    }),
    { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) },
  );
  if (!totals.debit.eq(totals.credit) || totals.debit.isZero()) {
    throw new Error("Approved HRMS payroll run must contain positive balanced totals");
  }
  if (!totals.debit.eq(exactTotals.debit) || !totals.credit.eq(exactTotals.credit)) {
    throw new Error("Approved HRMS payroll totals could not be validated exactly");
  }

  const sourcePayload = {
    runId: input.runId,
    runVersion: input.runVersion,
    payPeriodStart: start.toISOString(),
    payPeriodEnd: end.toISOString(),
    currencyCode: input.currencyCode,
    approvedById: input.approvedById,
    approvedAt: validDate(input.approvedAt, "approvedAt").toISOString(),
    eventId: input.eventId,
    lines: input.lines,
    totalDebit: serialize(totals.debit),
    totalCredit: serialize(totals.credit),
  };
  const hash = payloadHash(sourcePayload);
  const requestId = input.eventId;
  const idempotencyKey = `HRMS:PAYROLL_RUN:${input.runId}:${input.runVersion}:RECEIVED`;

  return db.$transaction(async (tx) => {
    const approver = await tx.user.findFirst({
      where: {
        id: input.approvedById,
        orgId: input.orgId,
        active: true,
      },
      select: { id: true },
    });
    if (!approver) {
      throw new Error("Payroll approval evidence does not identify an active user in this organization");
    }
    const existing = await tx.accountingPayrollRunSnapshot.findUnique({
      where: {
        orgId_runId_runVersion: {
          orgId: input.orgId,
          runId: input.runId,
          runVersion: input.runVersion,
        },
      },
      include: { sourceSnapshot: true },
    });
    if (existing) {
      if (existing.sourceSnapshot.payloadHash !== hash) throw new Error("Payroll run version payload conflict");
      return existing;
    }
    const existingCompatibilityBatch = await tx.payrollBatch.findUnique({
      where: { orgId_month: { orgId: input.orgId, month: start } },
      select: {
        id: true,
        status: true,
        sourceRunId: true,
        sourceRunVersion: true,
      },
    });
    if (existingCompatibilityBatch) {
      throw new Error(
        "PAYROLL_CORRECTION_WORKFLOW_REQUIRED: an accepted payroll run already exists for this period; submit a correction event and reverse/replace its Accounting journal",
      );
    }
    const snapshot = await tx.accountingSourceSnapshot.create({
      data: {
        orgId: input.orgId,
        legalEntityId: configuration.legalEntity.id,
        sourceSystem: "HRMS",
        sourceType: "APPROVED_PAYROLL_RUN",
        sourceId: input.runId,
        sourceVersion: input.runVersion,
        requestId,
        payload: json(sourcePayload),
        payloadHash: hash,
        approvedById: input.approvedById,
        approvedAt: validDate(input.approvedAt, "approvedAt"),
        occurredAt: validDate(input.approvedAt, "approvedAt"),
      },
    });
    const payrollSnapshot = await tx.accountingPayrollRunSnapshot.create({
      data: {
        orgId: input.orgId,
        sourceSnapshotId: snapshot.id,
        runId: input.runId,
        runVersion: input.runVersion,
        payPeriodStart: start,
        payPeriodEnd: end,
        currencyCode: input.currencyCode,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        allocationDetail: json(input.lines),
        approvedById: input.approvedById,
        approvedAt: validDate(input.approvedAt, "approvedAt"),
      },
    });
    await tx.payrollBatch.create({
      data: {
        orgId: input.orgId,
        month: start,
        status: "APPROVED_HRMS",
        totalAmount: totals.debit,
        sourceSnapshotId: snapshot.id,
        sourceRunId: input.runId,
        sourceRunVersion: input.runVersion,
      },
    });
    await tx.accountingIntegrationInbox.create({
      data: {
        orgId: input.orgId,
        legalEntityId: configuration.legalEntity.id,
        sourceSystem: "HRMS",
        messageType: "hrms.payroll-run.approved",
        messageVersion: 1,
        requestId,
        idempotencyKey,
        payload: json(sourcePayload),
        payloadHash: hash,
        sourceSnapshotId: snapshot.id,
        correlationId: input.correlationId,
        causationId: input.eventId,
        status: "PENDING",
      },
    });
    return payrollSnapshot;
  });
}

export async function postApprovedPayrollRun(input: {
  orgId: string;
  runId: string;
  runVersion: number;
  posterId: string;
  approval: { approvedById: string; approvedAt: Date | string };
}) {
  const payroll = await db.accountingPayrollRunSnapshot.findUnique({
    where: {
      orgId_runId_runVersion: {
        orgId: input.orgId,
        runId: input.runId,
        runVersion: input.runVersion,
      },
    },
    include: { sourceSnapshot: true },
  });
  if (!payroll) throw new Error("Approved immutable HRMS payroll run was not found");
  const lines = payroll.allocationDetail as unknown as ApprovedPayrollRunInput["lines"];
  const configuration = await resolveCanonicalPostingConfiguration(input.orgId, payroll.payPeriodEnd);
  const inbox = await db.accountingIntegrationInbox.findUnique({
    where: {
      orgId_sourceSystem_idempotencyKey: {
        orgId: input.orgId,
        sourceSystem: "HRMS",
        idempotencyKey: `HRMS:PAYROLL_RUN:${input.runId}:${input.runVersion}:RECEIVED`,
      },
    },
  });
  if (!inbox) throw new Error("Payroll integration inbox request is missing");

  const result = await postCanonicalAccountingRequest({
    requestId: `${payroll.sourceSnapshot.requestId}:ACCRUAL`,
    requestVersion: 1,
    idempotencyKey: `HRMS:PAYROLL_RUN:${input.runId}:${input.runVersion}:ACCRUAL`,
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    source: {
      system: "HRMS",
      type: "APPROVED_PAYROLL_RUN",
      id: input.runId,
      version: input.runVersion,
      occurredAt: payroll.approvedAt,
      payload: payroll.sourceSnapshot.payload,
      approvedById: payroll.approvedById,
      approvedAt: payroll.approvedAt,
    },
    actor: {
      kind: "USER",
      actorId: input.posterId,
      authenticatedOrgId: input.orgId,
    },
    makerId: payroll.approvedById,
    postingDate: payroll.payPeriodEnd,
    documentDate: payroll.payPeriodEnd,
    journalType: "JOURNAL_ENTRY",
    ruleId: "PAYROLL-ACCRUAL-v1",
    narration: `Approved HRMS payroll run ${input.runId} version ${input.runVersion}`,
    transactionCurrencyCode: payroll.currencyCode,
    baseCurrencyCode: configuration.profile.functionalCurrencyCode,
    exchangeRate: null,
    approval: {
      policyId: configuration.approvalPolicy.id,
      policyVersion: configuration.approvalPolicy.version,
      approvedById: input.approval.approvedById,
      approvedAt: input.approval.approvedAt,
    },
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicy: {
      id: configuration.roundingPolicy.id,
      version: configuration.roundingPolicy.version,
    },
    lines: lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      partyType: line.employeeId ? "EMPLOYEE" : null,
      partyId: line.employeeId ?? null,
      remarks: line.componentCode,
      dimensions: line.dimensions,
    })),
    correlationId: inbox.correlationId ?? payroll.sourceSnapshot.requestId,
    causationId: inbox.causationId,
  });
  await db.payrollBatch.updateMany({
    where: {
      orgId: input.orgId,
      sourceRunId: input.runId,
      sourceRunVersion: input.runVersion,
      status: "APPROVED_HRMS",
    },
    data: { status: "FINALIZED", journalEntryId: result.journalEntryId },
  });
  return result;
}
