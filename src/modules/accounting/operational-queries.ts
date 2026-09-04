import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import {
  resolveAccountingCapabilityReadiness,
  type AccountingCapabilityReadiness,
} from "./capability-policies";
import { add, serialize, subtract } from "./money";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export type AccountingPageInput = {
  page?: number;
  pageSize?: number;
};

function pagination(input: AccountingPageInput = {}) {
  const page =
    Number.isSafeInteger(input.page) && (input.page ?? 0) > 0
      ? input.page!
      : 1;
  const pageSize =
    Number.isSafeInteger(input.pageSize) && (input.pageSize ?? 0) > 0
      ? Math.min(input.pageSize!, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

async function resolvePartyNames(
  orgId: string,
  rows: Array<{ partyType: string | null; partyId: string | null }>,
) {
  const customerIds = [
    ...new Set(
      rows
        .filter((row) => row.partyType === "CUSTOMER" && row.partyId)
        .map((row) => row.partyId!),
    ),
  ];
  const supplierIds = [
    ...new Set(
      rows
        .filter((row) => row.partyType === "SUPPLIER" && row.partyId)
        .map((row) => row.partyId!),
    ),
  ];
  const [customers, suppliers] = await Promise.all([
    customerIds.length
      ? db.crmAccount.findMany({
          where: { orgId, id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : [],
    supplierIds.length
      ? db.crmVendor.findMany({
          where: { orgId, id: { in: supplierIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);
  return new Map<string, string>([
    ...customers.map((party) => [`CUSTOMER:${party.id}`, party.name] as const),
    ...suppliers.map((party) => [`SUPPLIER:${party.id}`, party.name] as const),
  ]);
}

async function resolveUserNames(orgId: string, userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const users = ids.length
    ? await db.user.findMany({
        where: { orgId, id: { in: ids } },
        select: { id: true, name: true, email: true },
      })
    : [];
  return new Map(
    users.map((user) => [user.id, user.name || user.email || "Unknown user"]),
  );
}

export async function getAccountingOperationalDashboard(orgId: string) {
  const asOf = new Date();
  const [
    legacySalesDrafts,
    legacyPurchaseDrafts,
    legacyPaymentDrafts,
    pendingDocuments,
    pendingPayments,
    postingAttention,
    unappliedPayments,
    outboxReview,
    scheduledAttention,
    recentAudit,
  ] = await Promise.all([
    db.salesInvoice.count({ where: { orgId, status: "DRAFT" } }),
    db.purchaseInvoice.count({ where: { orgId, status: "DRAFT" } }),
    db.paymentEntry.count({ where: { orgId, status: "DRAFT" } }),
    db.accountingDocument.count({
      where: { orgId, status: "PENDING_APPROVAL" },
    }),
    db.accountingPayment.count({
      where: { orgId, status: "PENDING_APPROVAL" },
    }),
    db.accountingIntegrationInbox.count({
      where: {
        orgId,
        status: { in: ["RETRYABLE", "FAILED", "MANUAL_REVIEW", "REJECTED"] },
      },
    }),
    db.accountingPayment.count({
      where: {
        orgId,
        status: "POSTED",
        unappliedAmount: { gt: 0 },
      },
    }),
    db.accountingIntegrationOutbox.count({
      where: {
        orgId,
        status: { in: ["MANUAL_REVIEW", "DEAD_LETTER", "FAILED"] },
      },
    }),
    db.accountingScheduledOccurrence.count({
      where: {
        orgId,
        OR: [
          { status: "FAILED" },
          { status: "PENDING", scheduledFor: { lte: asOf } },
        ],
      },
    }),
    db.accountingAuditLog.findMany({
      where: { orgId },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      take: 12,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    asOf: asOf.toISOString(),
    metrics: {
      drafts: legacySalesDrafts + legacyPurchaseDrafts + legacyPaymentDrafts,
      pendingApprovals: pendingDocuments + pendingPayments,
      postingAttention,
      unappliedPayments,
      outboxReview,
      scheduledAttention,
    },
    recentActivity: recentAudit.map((event) => ({
      id: event.id,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      actor: event.user.name || event.user.email || "Unknown user",
      occurredAt: event.timestamp.toISOString(),
    })),
  };
}

export type CanonicalDocumentFilters = AccountingPageInput & {
  documentTypes?: string[];
  status?: string;
  legalEntityId?: string;
  makerId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function listLegacyAccountingDrafts(
  orgId: string,
  type: "SALES_INVOICE" | "PURCHASE_INVOICE" | "PAYMENT",
  input: AccountingPageInput = {},
) {
  const { page, pageSize, skip } = pagination(input);
  const profile = await db.accountingOrganisationProfile.findUnique({
    where: { orgId },
    select: { functionalCurrencyCode: true },
  });
  const currencyCode = profile?.functionalCurrencyCode ?? "—";
  if (type === "SALES_INVOICE") {
    const [total, rows] = await Promise.all([
      db.salesInvoice.count({ where: { orgId, status: "DRAFT" } }),
      db.salesInvoice.findMany({
        where: { orgId, status: "DRAFT" },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
        include: { customer: { select: { name: true } } },
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      rows: rows.map((row) => ({
        id: row.id,
        type,
        reference: row.invoiceNumber,
        party: row.customer.name,
        postingDate: iso(row.postingDate)!,
        currencyCode,
        amount: serialize(row.grandTotal),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }
  if (type === "PURCHASE_INVOICE") {
    const [total, rows] = await Promise.all([
      db.purchaseInvoice.count({ where: { orgId, status: "DRAFT" } }),
      db.purchaseInvoice.findMany({
        where: { orgId, status: "DRAFT" },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
        include: { supplier: { select: { name: true } } },
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      rows: rows.map((row) => ({
        id: row.id,
        type,
        reference: row.invoiceNumber,
        party: row.supplier.name,
        postingDate: iso(row.postingDate)!,
        currencyCode,
        amount: serialize(row.grandTotal),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }
  const [total, rows] = await Promise.all([
    db.paymentEntry.count({ where: { orgId, status: "DRAFT" } }),
    db.paymentEntry.findMany({
      where: { orgId, status: "DRAFT" },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
    }),
  ]);
  const partyNames = await resolvePartyNames(
    orgId,
    rows.map((row) => ({ partyType: row.partyType, partyId: row.partyId })),
  );
  return {
    page,
    pageSize,
    total,
    rows: rows.map((row) => ({
      id: row.id,
      type,
      reference: row.referenceNo || `PAY-${row.id.slice(-6).toUpperCase()}`,
      party:
        partyNames.get(`${row.partyType}:${row.partyId}`) ?? row.partyId,
      postingDate: iso(row.postingDate)!,
      currencyCode,
      amount: serialize(row.amount),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function listCanonicalAccountingDocuments(
  orgId: string,
  filters: CanonicalDocumentFilters = {},
) {
  const { page, pageSize, skip } = pagination(filters);
  const where: Prisma.AccountingDocumentWhereInput = {
    orgId,
    ...(filters.documentTypes?.length
      ? { documentType: { in: filters.documentTypes } }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.legalEntityId
      ? { legalEntityId: filters.legalEntityId }
      : {}),
    ...(filters.makerId ? { makerId: filters.makerId } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          postingDate: {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.accountingDocument.count({ where }),
    db.accountingDocument.findMany({
      where,
      orderBy: [{ postingDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      include: {
        legalEntity: { select: { code: true, legalName: true } },
        _count: { select: { lines: true, paymentTargets: true, corrections: true } },
      },
    }),
  ]);
  const [partyNames, userNames] = await Promise.all([
    resolvePartyNames(
      orgId,
      rows.map((row) => ({
        partyType: row.counterpartyType,
        partyId: row.counterpartyId,
      })),
    ),
    resolveUserNames(
      orgId,
      rows.flatMap((row) => [row.makerId, row.approvedById ?? ""]),
    ),
  ]);
  return {
    page,
    pageSize,
    total,
    rows: rows.map((row) => ({
      id: row.id,
      documentType: row.documentType,
      status: row.status,
      legalEntityId: row.legalEntityId,
      legalEntity: `${row.legalEntity.code} — ${row.legalEntity.legalName}`,
      counterparty:
        partyNames.get(`${row.counterpartyType}:${row.counterpartyId}`) ??
        row.counterpartyId ??
        "—",
      documentDate: iso(row.documentDate)!,
      postingDate: iso(row.postingDate)!,
      dueDate: iso(row.dueDate),
      currencyCode: row.transactionCurrencyCode,
      subtotal: serialize(row.subtotal),
      taxAmount: serialize(row.taxAmount),
      totalAmount: serialize(row.totalAmount),
      makerId: row.makerId,
      maker: userNames.get(row.makerId) ?? "Unknown user",
      approvedBy:
        (row.approvedById && userNames.get(row.approvedById)) ?? null,
      approvedAt: iso(row.approvedAt),
      rowVersion: row.rowVersion,
      journalEntryId: row.journalEntryId,
      correctionOfId: row.correctionOfId,
      lineCount: row._count.lines,
      allocationCount: row._count.paymentTargets,
      correctionCount: row._count.corrections,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getCanonicalAccountingDocument(
  orgId: string,
  documentId: string,
) {
  const document = await db.accountingDocument.findFirst({
    where: { id: documentId, orgId },
    include: {
      legalEntity: { select: { code: true, legalName: true } },
      policy: {
        select: {
          documentType: true,
          version: true,
          statutoryValidated: true,
          configurationHash: true,
        },
      },
      sourceSnapshot: {
        select: {
          sourceSystem: true,
          sourceType: true,
          sourceId: true,
          sourceVersion: true,
          payloadHash: true,
          occurredAt: true,
        },
      },
      lines: { orderBy: { lineNumber: "asc" } },
      correctionOf: {
        select: {
          id: true,
          documentType: true,
          status: true,
          totalAmount: true,
        },
      },
      corrections: {
        select: {
          id: true,
          documentType: true,
          status: true,
          totalAmount: true,
          correctionReason: true,
        },
        orderBy: { createdAt: "asc" },
      },
      paymentTargets: {
        where: { status: "ACTIVE" },
        include: {
          payment: {
            select: {
              id: true,
              paymentType: true,
              status: true,
              amount: true,
              transactionCurrencyCode: true,
            },
          },
        },
      },
      journalEntry: {
        include: {
          legalEntity: { select: { code: true, legalName: true } },
          lines: {
            include: {
              account: { select: { accountCode: true, accountName: true } },
            },
            orderBy: { id: "asc" },
          },
          reversalOf: { select: { id: true, voucherNo: true } },
          reversals: { select: { id: true, voucherNo: true, status: true } },
        },
      },
    },
  });
  if (!document) return null;
  const [partyNames, userNames, audit] = await Promise.all([
    resolvePartyNames(orgId, [
      {
        partyType: document.counterpartyType,
        partyId: document.counterpartyId,
      },
    ]),
    resolveUserNames(
      orgId,
      [document.makerId, document.approvedById ?? ""].filter(Boolean),
    ),
    db.accountingAuditLog.findMany({
      where: {
        orgId,
        OR: [
          { entityType: "AccountingDocument", entityId: document.id },
          ...(document.journalEntryId
            ? [
                {
                  entityType: "JournalEntry",
                  entityId: document.journalEntryId,
                },
              ]
            : []),
        ],
      },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    id: document.id,
    documentType: document.documentType,
    status: document.status,
    legalEntityId: document.legalEntityId,
    legalEntity: `${document.legalEntity.code} — ${document.legalEntity.legalName}`,
    counterparty:
      partyNames.get(
        `${document.counterpartyType}:${document.counterpartyId}`,
      ) ??
      document.counterpartyId ??
      "—",
    documentDate: iso(document.documentDate)!,
    postingDate: iso(document.postingDate)!,
    dueDate: iso(document.dueDate),
    currencyCode: document.transactionCurrencyCode,
    baseCurrencyCode: document.baseCurrencyCode,
    subtotal: serialize(document.subtotal),
    discountAmount: serialize(document.discountAmount),
    taxAmount: serialize(document.taxAmount),
    totalAmount: serialize(document.totalAmount),
    makerId: document.makerId,
    maker: userNames.get(document.makerId) ?? "Unknown user",
    approvedBy:
      (document.approvedById && userNames.get(document.approvedById)) ?? null,
    approvedAt: iso(document.approvedAt),
    rowVersion: document.rowVersion,
    requestId: document.requestId,
    correlationId: document.correlationId,
    payloadHash: document.payloadHash,
    correctionReason: document.correctionReason,
    cancelledAt: iso(document.cancelledAt),
    policy: document.policy,
    sourceSnapshot: {
      ...document.sourceSnapshot,
      occurredAt: document.sourceSnapshot.occurredAt.toISOString(),
    },
    lines: document.lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: serialize(line.quantity),
      unitAmount: serialize(line.unitAmount),
      discountAmount: serialize(line.discountAmount),
      taxableAmount: serialize(line.taxableAmount),
      taxAmount: serialize(line.taxAmount),
      totalAmount: serialize(line.totalAmount),
      accountId: line.accountId,
      taxCategoryRef: line.taxCategoryRef,
    })),
    correctionOf: document.correctionOf
      ? {
          ...document.correctionOf,
          totalAmount: serialize(document.correctionOf.totalAmount),
        }
      : null,
    corrections: document.corrections.map((correction) => ({
      ...correction,
      totalAmount: serialize(correction.totalAmount),
    })),
    allocations: document.paymentTargets.map((allocation) => ({
      id: allocation.id,
      status: allocation.status,
      amount: serialize(allocation.amount),
      payment: {
        ...allocation.payment,
        amount: serialize(allocation.payment.amount),
      },
    })),
    journal: document.journalEntry
      ? {
          id: document.journalEntry.id,
          voucherNo: document.journalEntry.voucherNo,
          status: document.journalEntry.status,
          postingDate: iso(document.journalEntry.postingDate)!,
          totalDebit: serialize(document.journalEntry.totalDebit),
          totalCredit: serialize(document.journalEntry.totalCredit),
          reversalOf: document.journalEntry.reversalOf,
          reversals: document.journalEntry.reversals,
          lines: document.journalEntry.lines.map((line) => ({
            id: line.id,
            account: `${line.account.accountCode} — ${line.account.accountName}`,
            debit: serialize(line.debit),
            credit: serialize(line.credit),
            partyType: line.partyType,
            partyId: line.partyId,
            remarks: line.remarks,
          })),
        }
      : null,
    audit: audit.map((event) => ({
      id: event.id,
      action: event.action,
      actor: event.user.name || event.user.email || "Unknown user",
      occurredAt: event.timestamp.toISOString(),
    })),
  };
}

export type CanonicalPaymentFilters = AccountingPageInput & {
  paymentTypes?: string[];
  status?: string;
  legalEntityId?: string;
};

export async function listCanonicalAccountingPayments(
  orgId: string,
  filters: CanonicalPaymentFilters = {},
) {
  const { page, pageSize, skip } = pagination(filters);
  const where: Prisma.AccountingPaymentWhereInput = {
    orgId,
    ...(filters.paymentTypes?.length
      ? { paymentType: { in: filters.paymentTypes } }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.legalEntityId
      ? { legalEntityId: filters.legalEntityId }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.accountingPayment.count({ where }),
    db.accountingPayment.findMany({
      where,
      orderBy: [
        { transactionDate: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      skip,
      take: pageSize,
      include: {
        legalEntity: { select: { code: true, legalName: true } },
        _count: { select: { allocations: true, reversals: true } },
      },
    }),
  ]);
  const [partyNames, userNames] = await Promise.all([
    resolvePartyNames(
      orgId,
      rows.map((row) => ({
        partyType: row.payerPayeeType,
        partyId: row.payerPayeeId,
      })),
    ),
    resolveUserNames(
      orgId,
      rows.flatMap((row) => [row.makerId, row.approvedById ?? ""]),
    ),
  ]);
  return {
    page,
    pageSize,
    total,
    rows: rows.map((row) => ({
      id: row.id,
      paymentType: row.paymentType,
      status: row.status,
      legalEntity: `${row.legalEntity.code} — ${row.legalEntity.legalName}`,
      party:
        partyNames.get(`${row.payerPayeeType}:${row.payerPayeeId}`) ??
        row.payerPayeeId,
      transactionDate: iso(row.transactionDate)!,
      currencyCode: row.transactionCurrencyCode,
      amount: serialize(row.amount),
      allocatedAmount: serialize(row.allocatedAmount),
      unappliedAmount: serialize(row.unappliedAmount),
      paymentMethod: row.paymentMethod,
      externalReference: row.externalReference,
      makerId: row.makerId,
      maker: userNames.get(row.makerId) ?? "Unknown user",
      approvedBy:
        (row.approvedById && userNames.get(row.approvedById)) ?? null,
      approvedAt: iso(row.approvedAt),
      rowVersion: row.rowVersion,
      journalEntryId: row.journalEntryId,
      allocationCount: row._count.allocations,
      reversalCount: row._count.reversals,
    })),
  };
}

export async function getCanonicalAccountingPayment(
  orgId: string,
  paymentId: string,
) {
  const payment = await db.accountingPayment.findFirst({
    where: { id: paymentId, orgId },
    include: {
      legalEntity: { select: { code: true, legalName: true } },
      policy: {
        select: {
          documentType: true,
          version: true,
          statutoryValidated: true,
          configurationHash: true,
        },
      },
      sourceSnapshot: {
        select: {
          sourceSystem: true,
          sourceType: true,
          sourceId: true,
          sourceVersion: true,
          payloadHash: true,
          occurredAt: true,
        },
      },
      allocations: {
        orderBy: { createdAt: "asc" },
        include: {
          targetDocument: {
            select: {
              id: true,
              documentType: true,
              status: true,
              totalAmount: true,
              transactionCurrencyCode: true,
            },
          },
          reversalOf: { select: { id: true } },
          reversals: { select: { id: true, status: true } },
        },
      },
      reversalOf: {
        select: {
          id: true,
          paymentType: true,
          status: true,
          amount: true,
        },
      },
      reversals: {
        select: {
          id: true,
          paymentType: true,
          status: true,
          amount: true,
        },
        orderBy: { createdAt: "asc" },
      },
      journalEntry: {
        include: {
          lines: {
            include: {
              account: { select: { accountCode: true, accountName: true } },
            },
            orderBy: { id: "asc" },
          },
          reversals: { select: { id: true, voucherNo: true, status: true } },
        },
      },
    },
  });
  if (!payment) return null;
  const [partyNames, userNames, audit] = await Promise.all([
    resolvePartyNames(orgId, [
      {
        partyType: payment.payerPayeeType,
        partyId: payment.payerPayeeId,
      },
    ]),
    resolveUserNames(
      orgId,
      [payment.makerId, payment.approvedById ?? ""].filter(Boolean),
    ),
    db.accountingAuditLog.findMany({
      where: {
        orgId,
        OR: [
          { entityType: "AccountingPayment", entityId: payment.id },
          ...(payment.journalEntryId
            ? [
                {
                  entityType: "JournalEntry",
                  entityId: payment.journalEntryId,
                },
              ]
            : []),
        ],
      },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
  return {
    id: payment.id,
    paymentType: payment.paymentType,
    status: payment.status,
    legalEntity: `${payment.legalEntity.code} — ${payment.legalEntity.legalName}`,
    party:
      partyNames.get(`${payment.payerPayeeType}:${payment.payerPayeeId}`) ??
      payment.payerPayeeId,
    transactionDate: iso(payment.transactionDate)!,
    valueDate: iso(payment.valueDate),
    currencyCode: payment.transactionCurrencyCode,
    baseCurrencyCode: payment.baseCurrencyCode,
    amount: serialize(payment.amount),
    allocatedAmount: serialize(payment.allocatedAmount),
    unappliedAmount: serialize(payment.unappliedAmount),
    paymentMethod: payment.paymentMethod,
    externalReference: payment.externalReference,
    makerId: payment.makerId,
    maker: userNames.get(payment.makerId) ?? "Unknown user",
    approvedBy:
      (payment.approvedById && userNames.get(payment.approvedById)) ?? null,
    approvedAt: iso(payment.approvedAt),
    rowVersion: payment.rowVersion,
    requestId: payment.requestId,
    correlationId: payment.correlationId,
    payloadHash: payment.payloadHash,
    policy: payment.policy,
    sourceSnapshot: {
      ...payment.sourceSnapshot,
      occurredAt: payment.sourceSnapshot.occurredAt.toISOString(),
    },
    allocations: payment.allocations.map((allocation) => ({
      id: allocation.id,
      targetType: allocation.targetType,
      targetVersion: allocation.targetVersion,
      amount: serialize(allocation.amount),
      status: allocation.status,
      reversedAt: iso(allocation.reversedAt),
      reversalOfId: allocation.reversalOf?.id ?? null,
      reversalCount: allocation.reversals.length,
      targetDocument: allocation.targetDocument
        ? {
            ...allocation.targetDocument,
            totalAmount: serialize(allocation.targetDocument.totalAmount),
          }
        : null,
      targetSourceSnapshotId: allocation.targetSourceSnapshotId,
    })),
    reversalOf: payment.reversalOf
      ? {
          ...payment.reversalOf,
          amount: serialize(payment.reversalOf.amount),
        }
      : null,
    reversals: payment.reversals.map((reversal) => ({
      ...reversal,
      amount: serialize(reversal.amount),
    })),
    journal: payment.journalEntry
      ? {
          id: payment.journalEntry.id,
          voucherNo: payment.journalEntry.voucherNo,
          status: payment.journalEntry.status,
          totalDebit: serialize(payment.journalEntry.totalDebit),
          totalCredit: serialize(payment.journalEntry.totalCredit),
          reversals: payment.journalEntry.reversals,
          lines: payment.journalEntry.lines.map((line) => ({
            id: line.id,
            account: `${line.account.accountCode} — ${line.account.accountName}`,
            debit: serialize(line.debit),
            credit: serialize(line.credit),
            remarks: line.remarks,
          })),
        }
      : null,
    audit: audit.map((event) => ({
      id: event.id,
      action: event.action,
      actor: event.user.name || event.user.email || "Unknown user",
      occurredAt: event.timestamp.toISOString(),
    })),
  };
}

export async function listAccountingAllocations(
  orgId: string,
  input: AccountingPageInput & { status?: string } = {},
) {
  const { page, pageSize, skip } = pagination(input);
  const where: Prisma.AccountingPaymentAllocationWhereInput = {
    orgId,
    ...(input.status ? { status: input.status } : {}),
  };
  const [total, rows] = await Promise.all([
    db.accountingPaymentAllocation.count({ where }),
    db.accountingPaymentAllocation.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      include: {
        payment: {
          select: {
            id: true,
            paymentType: true,
            status: true,
            transactionCurrencyCode: true,
            amount: true,
            payerPayeeType: true,
            payerPayeeId: true,
          },
        },
        targetDocument: {
          select: {
            id: true,
            documentType: true,
            status: true,
            totalAmount: true,
            transactionCurrencyCode: true,
          },
        },
        reversalOf: { select: { id: true } },
        reversals: { select: { id: true, status: true, reversedAt: true } },
      },
    }),
  ]);
  const partyNames = await resolvePartyNames(
    orgId,
    rows.map((row) => ({
      partyType: row.payment.payerPayeeType,
      partyId: row.payment.payerPayeeId,
    })),
  );
  return {
    page,
    pageSize,
    total,
    rows: rows.map((row) => ({
      id: row.id,
      status: row.status,
      amount: serialize(row.amount),
      targetVersion: row.targetVersion,
      createdAt: row.createdAt.toISOString(),
      reversedAt: iso(row.reversedAt),
      reversalOfId: row.reversalOf?.id ?? null,
      reversalCount: row.reversals.length,
      payment: {
        ...row.payment,
        amount: serialize(row.payment.amount),
        party:
          partyNames.get(
            `${row.payment.payerPayeeType}:${row.payment.payerPayeeId}`,
          ) ?? row.payment.payerPayeeId,
      },
      targetDocument: row.targetDocument
        ? {
            ...row.targetDocument,
            totalAmount: serialize(row.targetDocument.totalAmount),
          }
        : null,
      targetSourceSnapshotId: row.targetSourceSnapshotId,
    })),
  };
}

export async function listCanonicalJournals(
  orgId: string,
  input: AccountingPageInput & {
    legalEntityId?: string;
    status?: string;
    sourceType?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  } = {},
) {
  const { page, pageSize, skip } = pagination(input);
  const search = input.search?.trim();
  const where: Prisma.JournalEntryWhereInput = {
    orgId,
    ...(input.legalEntityId ? { legalEntityId: input.legalEntityId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.sourceType ? { sourceType: input.sourceType } : {}),
    ...(search
      ? {
          OR: [
            { voucherNo: { contains: search, mode: "insensitive" } },
            { remarks: { contains: search, mode: "insensitive" } },
            { sourceId: { contains: search, mode: "insensitive" } },
            { sourceType: { contains: search, mode: "insensitive" } },
            {
              branch: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
    ...(input.dateFrom || input.dateTo
      ? {
          postingDate: {
            ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
            ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.journalEntry.count({ where }),
    db.journalEntry.findMany({
      where,
      orderBy: [{ postingDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      include: {
        legalEntity: { select: { code: true, legalName: true } },
        branch: { select: { name: true } },
        _count: { select: { lines: true, reversals: true, replacements: true } },
      },
    }),
  ]);
  const userNames = await resolveUserNames(
    orgId,
    rows.map((row) => row.createdById),
  );
  return {
    page,
    pageSize,
    total,
    rows: rows.map((row) => ({
      id: row.id,
      voucherNo: row.voucherNo,
      journalType: row.journalType,
      sourceSystem: row.sourceSystem,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      branchName: row.branch?.name ?? null,
      status: row.status,
      postingDate: iso(row.postingDate)!,
      legalEntity: row.legalEntity
        ? `${row.legalEntity.code} — ${row.legalEntity.legalName}`
        : "Legacy / unassigned",
      remarks: row.remarks,
      currencyCode:
        row.transactionCurrencyCode ?? row.functionalCurrencyCode ?? "INR",
      totalDebit: serialize(row.totalDebit),
      totalCredit: serialize(row.totalCredit),
      createdBy: userNames.get(row.createdById) ?? "Unknown user",
      reversalOfId: row.reversalOfId,
      replacementOfId: row.replacementOfId,
      rowVersion: row.rowVersion,
      lineCount: row._count.lines,
      reversalCount: row._count.reversals,
      replacementCount: row._count.replacements,
    })),
  };
}

export async function getCanonicalJournalDetail(orgId: string, journalId: string) {
  const journal = await db.journalEntry.findFirst({
    where: { id: journalId, orgId },
    include: {
      legalEntity: { select: { code: true, legalName: true } },
      accountingPeriod: {
        select: { name: true, status: true, startDate: true, endDate: true },
      },
      sourceSnapshot: {
        select: {
          sourceSystem: true,
          sourceType: true,
          sourceId: true,
          sourceVersion: true,
          payloadHash: true,
        },
      },
      lines: {
        include: {
          account: { select: { accountCode: true, accountName: true } },
          accountingDimensions: {
            include: {
              definition: { select: { code: true, name: true } },
              dimensionValue: { select: { code: true, name: true } },
            },
          },
        },
        orderBy: { id: "asc" },
      },
      reversalOf: { select: { id: true, voucherNo: true, status: true } },
      reversals: {
        select: { id: true, voucherNo: true, status: true },
        orderBy: { createdAt: "asc" },
      },
      replacementOf: { select: { id: true, voucherNo: true, status: true } },
      replacements: {
        select: { id: true, voucherNo: true, status: true },
        orderBy: { createdAt: "asc" },
      },
      accountingDocuments: {
        select: { id: true, documentType: true, status: true },
      },
      accountingPayments: {
        select: { id: true, paymentType: true, status: true },
      },
    },
  });
  if (!journal) return null;
  const [userNames, audit] = await Promise.all([
    resolveUserNames(
      orgId,
      [
        journal.createdById,
        journal.approvedById ?? "",
        journal.postedById ?? "",
      ].filter(Boolean),
    ),
    db.accountingAuditLog.findMany({
      where: {
        orgId,
        entityType: "JournalEntry",
        entityId: journal.id,
      },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
  return {
    id: journal.id,
    voucherNo: journal.voucherNo,
    journalType: journal.journalType,
    status: journal.status,
    postingDate: iso(journal.postingDate)!,
    documentDate: iso(journal.documentDate),
    remarks: journal.remarks,
    legalEntity: journal.legalEntity
      ? `${journal.legalEntity.code} — ${journal.legalEntity.legalName}`
      : "Legacy / unassigned",
    period: journal.accountingPeriod
      ? {
          name: journal.accountingPeriod.name,
          status: journal.accountingPeriod.status,
          startDate: iso(journal.accountingPeriod.startDate)!,
          endDate: iso(journal.accountingPeriod.endDate)!,
        }
      : null,
    currencyCode:
      journal.functionalCurrencyCode ??
      journal.baseCurrencyCode ??
      journal.transactionCurrencyCode ??
      "INR",
    transactionCurrencyCode: journal.transactionCurrencyCode,
    totalDebit: serialize(journal.totalDebit),
    totalCredit: serialize(journal.totalCredit),
    createdById: journal.createdById,
    createdBy: userNames.get(journal.createdById) ?? "Unknown user",
    approvedBy:
      (journal.approvedById && userNames.get(journal.approvedById)) ?? null,
    postedBy:
      (journal.postedById && userNames.get(journal.postedById)) ?? null,
    approvedAt: iso(journal.approvedAt),
    postedAt: iso(journal.postedAt),
    rowVersion: journal.rowVersion,
    requestId: journal.requestId,
    idempotencyKey: journal.idempotencyKey,
    correlationId: journal.correlationId,
    sourceSnapshot: journal.sourceSnapshot,
    lines: journal.lines.map((line) => ({
      id: line.id,
      account: `${line.account.accountCode} — ${line.account.accountName}`,
      debit: serialize(line.debit),
      credit: serialize(line.credit),
      transactionCurrencyCode: line.transactionCurrencyCode,
      transactionDebit:
        line.transactionDebit == null ? null : serialize(line.transactionDebit),
      transactionCredit:
        line.transactionCredit == null ? null : serialize(line.transactionCredit),
      exchangeRate:
        line.exchangeRate == null ? null : serialize(line.exchangeRate),
      partyType: line.partyType,
      partyId: line.partyId,
      remarks: line.remarks,
      dimensions: line.accountingDimensions.map((dimension) => ({
        definition: `${dimension.definition.code} — ${dimension.definition.name}`,
        value: `${dimension.dimensionValue.code} — ${dimension.dimensionValue.name}`,
      })),
    })),
    reversalOf: journal.reversalOf,
    reversals: journal.reversals,
    replacementOf: journal.replacementOf,
    replacements: journal.replacements,
    documents: journal.accountingDocuments,
    payments: journal.accountingPayments,
    audit: audit.map((event) => ({
      id: event.id,
      action: event.action,
      actor: event.user.name || event.user.email || "Unknown user",
      occurredAt: event.timestamp.toISOString(),
    })),
  };
}

export async function getGeneralLedgerOperationalView(
  orgId: string,
  input: AccountingPageInput & {
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
) {
  const { page, pageSize, skip } = pagination(input);
  const where: Prisma.GeneralLedgerEntryWhereInput = {
    orgId,
    isCancelled: false,
    ...(input.accountId ? { accountId: input.accountId } : {}),
    ...(input.dateFrom || input.dateTo
      ? {
          postingDate: {
            ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
            ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
          },
        }
      : {}),
  };
  const beforeWhere: Prisma.GeneralLedgerEntryWhereInput = {
    orgId,
    isCancelled: false,
    ...(input.accountId ? { accountId: input.accountId } : {}),
    ...(input.dateFrom
      ? { postingDate: { lt: new Date(input.dateFrom) } }
      : { id: "__NO_OPENING_HISTORY__" }),
  };
  const [total, rows, opening, accounts] = await Promise.all([
    db.generalLedgerEntry.count({ where }),
    db.generalLedgerEntry.findMany({
      where,
      orderBy: [{ postingDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      skip,
      take: pageSize,
      include: {
        account: { select: { accountCode: true, accountName: true } },
        journalEntry: { select: { id: true, voucherNo: true, status: true } },
      },
    }),
    input.dateFrom && input.accountId
      ? db.generalLedgerEntry.aggregate({
          where: beforeWhere,
          _sum: { debit: true, credit: true },
        })
      : null,
    db.account.findMany({
      where: { orgId, isGroup: false, isActive: true },
      orderBy: [{ accountCode: "asc" }, { accountName: "asc" }],
      select: { id: true, accountCode: true, accountName: true },
    }),
  ]);
  const firstRow = rows[0];
  const pageCarry =
    skip > 0 && firstRow
      ? await db.generalLedgerEntry.aggregate({
          where: {
            AND: [
              where,
              {
                OR: [
                  { postingDate: { lt: firstRow.postingDate } },
                  {
                    postingDate: firstRow.postingDate,
                    createdAt: { lt: firstRow.createdAt },
                  },
                  {
                    postingDate: firstRow.postingDate,
                    createdAt: firstRow.createdAt,
                    id: { lt: firstRow.id },
                  },
                ],
              },
            ],
          },
          _sum: { debit: true, credit: true },
        })
      : null;
  const openingBalance = opening
    ? subtract(opening._sum.debit ?? "0", opening._sum.credit ?? "0")
    : add("0");
  let running = pageCarry
    ? add(
        openingBalance,
        subtract(
          pageCarry._sum.debit ?? "0",
          pageCarry._sum.credit ?? "0",
        ),
      )
    : openingBalance;
  return {
    page,
    pageSize,
    total,
    openingBalance:
      input.dateFrom && input.accountId ? serialize(openingBalance) : null,
    openingComplete: Boolean(input.dateFrom && input.accountId),
    accounts,
    rows: rows.map((row) => {
      running = add(running, row.debit);
      running = subtract(running, row.credit);
      return {
        id: row.id,
        postingDate: iso(row.postingDate)!,
        accountId: row.accountId,
        account: `${row.account.accountCode} — ${row.account.accountName}`,
        voucherType: row.voucherType,
        voucherId: row.voucherId,
        journal: row.journalEntry,
        debit: serialize(row.debit),
        credit: serialize(row.credit),
        runningBalance: serialize(running),
        partyType: row.partyType,
        partyId: row.partyId,
        remarks: row.remarks,
      };
    }),
  };
}

export async function listAccountingScheduledOperations(
  orgId: string,
  input: AccountingPageInput = {},
) {
  const { page, pageSize, skip } = pagination(input);
  const [total, rows] = await Promise.all([
    db.accountingScheduledOccurrence.count({ where: { orgId } }),
    db.accountingScheduledOccurrence.findMany({
      where: { orgId },
      orderBy: [{ scheduledFor: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      include: {
        legalEntity: { select: { code: true, legalName: true } },
        journalEntry: { select: { id: true, voucherNo: true, status: true } },
      },
    }),
  ]);
  return {
    page,
    pageSize,
    total,
    rows: rows.map((row) => ({
      id: row.id,
      templateType: row.templateType,
      templateId: row.templateId,
      templateVersion: row.templateVersion,
      legalEntity: `${row.legalEntity.code} — ${row.legalEntity.legalName}`,
      scheduledFor: iso(row.scheduledFor)!,
      status: row.status,
      generatedRecordType: row.generatedRecordType,
      generatedRecordId: row.generatedRecordId,
      failureCode: row.failureCode,
      journal: row.journalEntry,
      rowVersion: row.rowVersion,
    })),
  };
}

export async function listAccountingOutbox(
  orgId: string,
  input: AccountingPageInput & {
    status?: string;
    manualReviewOnly?: boolean;
  } = {},
) {
  const { page, pageSize, skip } = pagination(input);
  const where: Prisma.AccountingIntegrationOutboxWhereInput = {
    orgId,
    ...(input.manualReviewOnly
      ? { status: { in: ["MANUAL_REVIEW", "DEAD_LETTER", "FAILED"] } }
      : input.status
        ? { status: input.status as never }
        : {}),
  };
  const [total, rows] = await Promise.all([
    db.accountingIntegrationOutbox.count({ where }),
    db.accountingIntegrationOutbox.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      include: {
        legalEntity: { select: { code: true, legalName: true } },
      },
    }),
  ]);
  return {
    page,
    pageSize,
    total,
    rows: rows.map((row) => ({
      id: row.id,
      status: row.status,
      destination: row.destination,
      eventType: row.eventType,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      attempts: row.attemptCount,
      availableAt: row.availableAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      publishedAt: iso(row.publishedAt),
      manualReviewAt: iso(row.manualReviewAt),
      lastErrorCode: row.lastErrorCode,
      publicationResultCode: row.publicationResultCode,
      correlationId: row.correlationId,
      idempotencyKey: row.idempotencyKey,
      rowVersion: row.rowVersion,
      legalEntity: row.legalEntity
        ? `${row.legalEntity.code} — ${row.legalEntity.legalName}`
        : "Organisation scope",
    })),
  };
}

export async function getAccountingConfigurationOverview(orgId: string) {
  const [
    profile,
    legalEntities,
    periods,
    currencies,
    exchangeRates,
    numberSeries,
    documentPolicies,
    approvalPolicies,
    accountControls,
    assets,
    partners,
    recurringReadiness,
    depreciationReadiness,
    partnerReadiness,
    outboxReadiness,
  ] = await Promise.all([
    db.accountingOrganisationProfile.findUnique({ where: { orgId } }),
    db.accountingLegalEntity.findMany({
      where: { orgId },
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
      include: { _count: { select: { taxRegistrations: true } } },
    }),
    db.accountingPeriod.findMany({
      where: { orgId },
      orderBy: { startDate: "desc" },
      take: 24,
    }),
    db.accountingCurrency.findMany({
      where: { orgId },
      orderBy: [{ isFunctional: "desc" }, { code: "asc" }],
    }),
    db.accountingExchangeRate.findMany({
      where: { orgId },
      orderBy: { rateDate: "desc" },
      take: 20,
      include: {
        fromCurrency: { select: { code: true } },
        toCurrency: { select: { code: true } },
      },
    }),
    db.accountingNumberSeries.findMany({
      where: { orgId },
      orderBy: [{ documentType: "asc" }, { effectiveFrom: "desc" }],
      take: 50,
    }),
    db.accountingDocumentPolicy.findMany({
      where: { orgId },
      orderBy: [{ documentType: "asc" }, { version: "desc" }],
      include: { legalEntity: { select: { code: true } } },
    }),
    db.accountingApprovalPolicy.findMany({
      where: { orgId },
      orderBy: [{ documentType: "asc" }, { version: "desc" }],
    }),
    db.accountingAccountControl.count({ where: { orgId } }),
    db.asset.count({ where: { orgId } }),
    db.partnerAccount.count({ where: { orgId } }),
    resolveAccountingCapabilityReadiness({
      orgId,
      capability: "RECURRING_GENERATION",
    }),
    resolveAccountingCapabilityReadiness({
      orgId,
      capability: "ASSET_DEPRECIATION",
    }),
    resolveAccountingCapabilityReadiness({
      orgId,
      capability: "PARTNER_ACCOUNTING",
    }),
    resolveAccountingCapabilityReadiness({
      orgId,
      capability: "PRODUCTION_OUTBOX",
    }),
  ]);

  const activeDocumentTypes = new Set(
    documentPolicies
      .filter((policy) => policy.isActive)
      .map((policy) => policy.documentType),
  );
  return {
    profile: profile
      ? {
          functionalCurrencyCode: profile.functionalCurrencyCode,
          fiscalYearStartMonth: profile.fiscalYearStartMonth,
          fiscalYearStartDay: profile.fiscalYearStartDay,
          inventoryMode: profile.inventoryMode,
          moneyScale: profile.moneyScale,
          quantityScale: profile.quantityScale,
          exchangeRateScale: profile.exchangeRateScale,
          roundingMode: profile.roundingMode,
          correctionPolicyConfigured: Boolean(profile.correctionPolicy),
        }
      : null,
    legalEntities: legalEntities.map((entity) => ({
      id: entity.id,
      code: entity.code,
      legalName: entity.legalName,
      entityType: entity.entityType,
      status: entity.status,
      isDefault: entity.isDefault,
      taxRegistrationCount: entity._count.taxRegistrations,
    })),
    periods: periods.map((period) => ({
      id: period.id,
      name: period.name,
      startDate: iso(period.startDate)!,
      endDate: iso(period.endDate)!,
      status: period.status,
    })),
    currencies: currencies.map((currency) => ({
      id: currency.id,
      code: currency.code,
      name: currency.name,
      decimalPlaces: currency.decimalPlaces,
      isFunctional: currency.isFunctional,
      isEnabled: currency.isEnabled,
    })),
    exchangeRates: exchangeRates.map((rate) => ({
      id: rate.id,
      pair: `${rate.fromCurrency.code}/${rate.toCurrency.code}`,
      rate: serialize(rate.rate),
      rateDate: iso(rate.rateDate)!,
      source: rate.source,
      status: rate.status,
    })),
    numberSeries: numberSeries.map((series) => ({
      id: series.id,
      documentType: series.documentType,
      prefixTemplate: series.prefixTemplate,
      nextNumber: series.nextNumber.toString(),
      isActive: series.isActive,
      rowVersion: series.rowVersion,
    })),
    documentPolicies: documentPolicies.map((policy) => ({
      id: policy.id,
      documentType: policy.documentType,
      legalEntityCode: policy.legalEntity.code,
      version: policy.version,
      statutoryValidated: policy.statutoryValidated,
      isActive: policy.isActive,
    })),
    approvalPolicies: approvalPolicies.map((policy) => ({
      id: policy.id,
      code: policy.code,
      documentType: policy.documentType,
      version: policy.version,
      isActive: policy.isActive,
    })),
    accountControlCount: accountControls,
    policyGates: {
      salesInvoice: activeDocumentTypes.has("SALES_INVOICE"),
      purchaseInvoice: activeDocumentTypes.has("PURCHASE_INVOICE"),
      customerReceipt: activeDocumentTypes.has("CUSTOMER_RECEIPT"),
      vendorPayment: activeDocumentTypes.has("VENDOR_PAYMENT"),
      depreciation: depreciationReadiness.enabled,
      recurringGeneration: recurringReadiness.enabled,
      partnerTransactions: partnerReadiness.enabled,
      productionOutbox: outboxReadiness.enabled,
    },
    capabilityReadiness: {
      recurringGeneration: recurringReadiness,
      depreciation: depreciationReadiness,
      partnerTransactions: partnerReadiness,
      productionOutbox: outboxReadiness,
    } satisfies Record<
      | "recurringGeneration"
      | "depreciation"
      | "partnerTransactions"
      | "productionOutbox",
      AccountingCapabilityReadiness
    >,
    sourceCounts: { assets, partners },
  };
}
