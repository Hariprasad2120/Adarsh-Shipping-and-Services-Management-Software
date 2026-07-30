import { Prisma } from "@/generated/prisma/client";
import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";

import {
  normalizePayrollCorrection,
  normalizeAccountingDocumentContract,
  normalizeAccountingPaymentContract,
  type AccountingDocumentContractInput,
  type AccountingPaymentContractInput,
} from "./document-contracts";
import { resolveCanonicalPostingConfiguration } from "./integration-adapters";
import {
  add,
  assertBalanced,
  compare,
  decimal,
  multiply,
  quantize,
  subtract,
} from "./money";
import {
  canonicalPostingPayload,
  postCanonicalAccountingRequest,
  reverseCanonicalJournal,
  type CanonicalPostingLine,
  type CanonicalPostingRequest,
} from "./posting-engine";
import { canonicalPayload, payloadHash } from "./request-integrity";

type DocumentPolicyConfiguration = {
  currencyCode?: string;
  receivableAccountId?: string;
  revenueAccountId?: string;
  payableAccountId?: string;
  expenseAccountId?: string;
  taxAccountId?: string;
  taxCategoryRef?: string;
  taxRate?: string;
  allowZeroTax?: boolean;
  allowUnappliedPayments?: boolean;
  paymentMethod?: string;
  preserveOriginalPolicyId?: string;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(canonicalPayload(value)) as Prisma.InputJsonValue;
}

function sourceVersion(updatedAt: Date) {
  return Math.floor(updatedAt.getTime() / 1000);
}

function policyConfiguration(value: Prisma.JsonValue): DocumentPolicyConfiguration {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Accounting document policy configuration is invalid");
  }
  return value as DocumentPolicyConfiguration;
}

async function assertPermissions(orgId: string, userId: string, required: string[]) {
  const rows = await db.permission.findMany({
    where: {
      key: { in: required },
      roles: {
        some: {
          role: {
            orgId,
            userRoles: { some: { userId, user: { orgId, active: true } } },
          },
        },
      },
    },
    select: { key: true },
  });
  const keys = new Set(rows.map(({ key }) => key));
  const missing = required.filter((key) => !keys.has(key));
  if (missing.length) throw new Error(`Missing required permissions: ${missing.join(", ")}`);
}

async function resolveDocumentPolicy(input: {
  orgId: string;
  legalEntityId: string;
  documentType: string;
  date: Date;
}) {
  const policy = await db.accountingDocumentPolicy.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      documentType: input.documentType,
      isActive: true,
      effectiveFrom: { lte: input.date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.date } }],
    },
    orderBy: { version: "desc" },
  });
  if (!policy) {
    throw new Error(
      `CONFIGURATION_REQUIRED: no active versioned ${input.documentType} policy is configured`,
    );
  }
  if (payloadHash(policy.configuration) !== policy.configurationHash) {
    throw new Error("CONFIGURATION_CONFLICT: document policy hash does not match");
  }
  return { policy, configuration: policyConfiguration(policy.configuration) };
}

async function assertCounterpartyEntityScope(input: {
  orgId: string;
  legalEntityId: string;
  partyType: "CUSTOMER" | "SUPPLIER";
  partyId: string;
  date: Date;
}) {
  const scope = await db.accountingCounterpartyEntityScope.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      partyType: input.partyType,
      partyId: input.partyId,
      isActive: true,
      effectiveFrom: { lte: input.date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.date } }],
    },
    orderBy: { version: "desc" },
    select: { id: true },
  });
  if (!scope) {
    throw new Error(
      `CONFIGURATION_REQUIRED: ${input.partyType.toLowerCase()} is not approved for this legal entity`,
    );
  }
}

async function persistPreparedDocument(input: {
  contract: AccountingDocumentContractInput;
  legacyRecordType?: string;
  legacyRecordId?: string;
  ruleId: string;
  journalType: string;
  postingLines: CanonicalPostingLine[];
  narration: string;
  branchId?: string | null;
  correctionOfId?: string | null;
  correctionReason?: string | null;
}) {
  const normalized = normalizeAccountingDocumentContract(input.contract);
  const requestId = `ACCOUNTING:DOCUMENT:${normalized.documentType}:${normalized.sourceId}:${normalized.sourceVersion}`;
  const idempotencyKey = requestId;
  const sourcePayload = {
    ...normalized,
    payloadHash: undefined,
  };
  const provisional: CanonicalPostingRequest = {
    requestId,
    requestVersion: 1,
    idempotencyKey,
    orgId: normalized.orgId,
    legalEntityId: normalized.legalEntityId,
    source: {
      system: normalized.sourceSystem,
      type: normalized.sourceType,
      id: normalized.sourceId,
      version: normalized.sourceVersion,
      occurredAt: normalized.documentDate,
      payload: sourcePayload,
    },
    actor: {
      kind: "USER",
      actorId: normalized.makerId,
      authenticatedOrgId: normalized.orgId,
    },
    makerId: normalized.makerId,
    postingDate: normalized.postingDate,
    documentDate: normalized.documentDate,
    journalType: input.journalType,
    ruleId: input.ruleId,
    narration: input.narration,
    branchId: input.branchId ?? null,
    transactionCurrencyCode: normalized.transactionCurrencyCode,
    baseCurrencyCode: normalized.baseCurrencyCode,
    exchangeRate: null,
    approval: {
      policyId: normalized.approvalPolicyId,
      policyVersion: normalized.approvalPolicyVersion,
      approvedById: "PENDING_APPROVAL",
      approvedAt: normalized.documentDate,
    },
    numberSeriesId: normalized.numberSeriesId,
    roundingPolicy: {
      id: normalized.roundingPolicyId,
      version: normalized.roundingPolicyVersion,
    },
    lines: input.postingLines,
    supportingDocumentRefs: normalized.supportingDocumentRefs,
    correlationId: normalized.correlationId,
    causationId: normalized.causationId,
  };
  const postingPayload = canonicalPostingPayload(provisional);
  const postingHash = payloadHash(postingPayload);

  return db.$transaction(
    async (tx) => {
      const existing = await tx.accountingDocument.findUnique({
        where: {
          orgId_idempotencyKey: {
            orgId: normalized.orgId,
            idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.payloadHash !== normalized.payloadHash) {
          throw new Error("Accounting document idempotency conflict");
        }
        return existing;
      }
      const snapshot = await tx.accountingSourceSnapshot.create({
        data: {
          orgId: normalized.orgId,
          legalEntityId: normalized.legalEntityId,
          sourceSystem: normalized.sourceSystem,
          sourceType: normalized.sourceType,
          sourceId: normalized.sourceId,
          sourceVersion: normalized.sourceVersion,
          requestId,
          payload: json(sourcePayload),
          payloadHash: payloadHash(sourcePayload),
          occurredAt: new Date(normalized.documentDate),
        },
      });
      const document = await tx.accountingDocument.create({
        data: {
          orgId: normalized.orgId,
          legalEntityId: normalized.legalEntityId,
          policyId: normalized.policyId,
          sourceSnapshotId: snapshot.id,
          sourceSystem: normalized.sourceSystem,
          sourceType: normalized.sourceType,
          sourceId: normalized.sourceId,
          sourceVersion: normalized.sourceVersion,
          legacyRecordType: input.legacyRecordType ?? null,
          legacyRecordId: input.legacyRecordId ?? null,
          documentType: normalized.documentType,
          schemaVersion: normalized.schemaVersion,
          status: "PENDING_APPROVAL",
          documentDate: new Date(normalized.documentDate),
          postingDate: new Date(normalized.postingDate),
          dueDate: normalized.dueDate ? new Date(normalized.dueDate) : null,
          counterpartyType: normalized.counterpartyType,
          counterpartyId: normalized.counterpartyId,
          transactionCurrencyCode: normalized.transactionCurrencyCode,
          baseCurrencyCode: normalized.baseCurrencyCode,
          exchangeRateId: normalized.exchangeRateId,
          numberSeriesId: normalized.numberSeriesId,
          approvalPolicyId: normalized.approvalPolicyId,
          approvalPolicyVersion: normalized.approvalPolicyVersion,
          roundingPolicyId: normalized.roundingPolicyId,
          roundingPolicyVersion: normalized.roundingPolicyVersion,
          sourceApprovalVersion: normalized.sourceApprovalVersion,
          subtotal: normalized.subtotal,
          discountAmount: normalized.discountAmount,
          taxAmount: normalized.taxAmount,
          totalAmount: normalized.totalAmount,
          supportingDocumentRefs: json(normalized.supportingDocumentRefs),
          immutablePayload: json(normalized),
          payloadHash: normalized.payloadHash,
          requestId,
          idempotencyKey,
          correlationId: normalized.correlationId,
          causationId: normalized.causationId,
          makerId: normalized.makerId,
          correctionOfId: input.correctionOfId ?? null,
          correctionReason: input.correctionReason ?? null,
          lines: {
            create: normalized.lines.map((line) => ({
              orgId: normalized.orgId,
              lineNumber: line.lineNumber,
              description: line.description,
              quantity: line.quantity,
              unitAmount: line.unitAmount,
              discountAmount: line.discountAmount,
              taxableAmount: line.taxableAmount,
              taxCategoryRef: line.taxCategoryRef,
              taxAmount: line.taxAmount,
              totalAmount: line.totalAmount,
              accountId: line.accountId,
              dimensions: json(line.dimensions),
              sourceLineRef: line.sourceLineRef,
            })),
          },
        },
      });
      await tx.accountingIntegrationInbox.create({
        data: {
          orgId: normalized.orgId,
          legalEntityId: normalized.legalEntityId,
          sourceSystem: normalized.sourceSystem,
          messageType: normalized.sourceType,
          messageVersion: normalized.schemaVersion,
          requestId,
          idempotencyKey,
          payload: json(postingPayload),
          payloadHash: postingHash,
          sourceSnapshotId: snapshot.id,
          correlationId: normalized.correlationId,
          causationId: normalized.causationId,
          status: "PENDING",
        },
      });
      await tx.accountingAuditLog.create({
        data: {
          orgId: normalized.orgId,
          userId: normalized.makerId,
          action: "PREPARE_CANONICAL_ACCOUNTING_DOCUMENT",
          entityType: "AccountingDocument",
          entityId: document.id,
          afterValues: {
            documentType: normalized.documentType,
            sourceSnapshotId: snapshot.id,
            payloadHash: normalized.payloadHash,
            status: "PENDING_APPROVAL",
          },
        },
      });
      return document;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function prepareLegacyCustomerNote(input: {
  orgId: string;
  noteId: string;
  makerId: string;
}) {
  const note = await db.customerNote.findFirst({
    where: { id: input.noteId, orgId: input.orgId, status: "DRAFT" },
    include: { items: true },
  });
  if (!note) throw new Error("Draft Customer Note not found");
  return prepareLegacyCorrectionNote({
    orgId: input.orgId,
    makerId: input.makerId,
    note: {
      id: note.id,
      updatedAt: note.updatedAt,
      postingDate: note.postingDate,
      noteNumber: note.noteNumber,
      noteType: note.noteType,
      partyId: note.customerId,
      originalInvoiceId: note.originalInvoiceId,
      branchId: note.branchId,
      reason: note.reason,
      taxAmount: note.taxAmount,
      grandTotal: note.grandTotal,
      items: note.items,
    },
    partyType: "CUSTOMER",
    legacyRecordType: "CustomerNote",
    originalLegacyRecordType: "SalesInvoice",
  });
}

export async function prepareLegacyVendorNote(input: {
  orgId: string;
  noteId: string;
  makerId: string;
}) {
  const note = await db.vendorNote.findFirst({
    where: { id: input.noteId, orgId: input.orgId, status: "DRAFT" },
    include: { items: true },
  });
  if (!note) throw new Error("Draft Vendor Note not found");
  return prepareLegacyCorrectionNote({
    orgId: input.orgId,
    makerId: input.makerId,
    note: {
      id: note.id,
      updatedAt: note.updatedAt,
      postingDate: note.postingDate,
      noteNumber: note.noteNumber,
      noteType: note.noteType,
      partyId: note.vendorId,
      originalInvoiceId: note.originalInvoiceId,
      branchId: note.branchId,
      reason: note.reason,
      taxAmount: note.taxAmount,
      grandTotal: note.grandTotal,
      items: note.items,
    },
    partyType: "SUPPLIER",
    legacyRecordType: "VendorNote",
    originalLegacyRecordType: "PurchaseInvoice",
  });
}

async function prepareLegacyCorrectionNote(input: {
  orgId: string;
  makerId: string;
  partyType: "CUSTOMER" | "SUPPLIER";
  legacyRecordType: "CustomerNote" | "VendorNote";
  originalLegacyRecordType: "SalesInvoice" | "PurchaseInvoice";
  note: {
    id: string;
    updatedAt: Date;
    postingDate: Date;
    noteNumber: string;
    noteType: string;
    partyId: string;
    originalInvoiceId: string | null;
    branchId: string | null;
    reason: string | null;
    taxAmount: Prisma.Decimal;
    grandTotal: Prisma.Decimal;
    items: Array<{
      id: string;
      itemName: string;
      qty: number;
      rate: Prisma.Decimal;
      amount: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
    }>;
  };
}) {
  if (!["CREDIT", "DEBIT"].includes(input.note.noteType)) {
    throw new Error("Correction note type must be CREDIT or DEBIT");
  }
  await assertPermissions(input.orgId, input.makerId, [
    input.note.noteType === "CREDIT"
      ? "accounting.credit-note.prepare"
      : "accounting.debit-note.prepare",
  ]);
  if (!input.note.reason?.trim()) {
    throw new Error("Correction reason is required");
  }
  if (!input.note.originalInvoiceId) {
    throw new Error("POLICY_GATED: correction notes must reference an original invoice");
  }
  if (input.note.items.length === 0) {
    throw new Error("Correction note requires at least one line");
  }
  const configuration = await resolveCanonicalPostingConfiguration(
    input.orgId,
    input.note.postingDate,
    input.legacyRecordType === "CustomerNote" ? "CUSTOMER_NOTE" : "VENDOR_NOTE",
  );
  const original = await db.accountingDocument.findFirst({
    where: {
      orgId: input.orgId,
      legalEntityId: configuration.legalEntity.id,
      legacyRecordType: input.originalLegacyRecordType,
      legacyRecordId: input.note.originalInvoiceId,
      status: "POSTED",
      counterpartyType: input.partyType,
      counterpartyId: input.note.partyId,
    },
    include: { policy: true },
  });
  if (!original) {
    throw new Error("POLICY_GATED: original invoice is not a canonical posted document");
  }
  const documentType = `${
    input.partyType === "CUSTOMER" ? "CUSTOMER" : "VENDOR"
  }_${input.note.noteType}_NOTE`;
  const { policy, configuration: policyConfig } = await resolveDocumentPolicy({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    documentType,
    date: input.note.postingDate,
  });
  if (policyConfig.preserveOriginalPolicyId !== original.policyId) {
    throw new Error(
      "CONFIGURATION_REQUIRED: correction policy must preserve the original invoice policy",
    );
  }
  if (policyConfig.currencyCode !== original.transactionCurrencyCode) {
    throw new Error(
      "CONFIGURATION_REQUIRED: correction currency must match the original invoice",
    );
  }
  const originalPolicyConfig = policyConfiguration(original.policy.configuration);
  const controlAccountId =
    input.partyType === "CUSTOMER"
      ? policyConfig.receivableAccountId
      : policyConfig.payableAccountId;
  const operatingAccountId =
    input.partyType === "CUSTOMER"
      ? policyConfig.revenueAccountId
      : policyConfig.expenseAccountId;
  if (!controlAccountId || !operatingAccountId || !policyConfig.currencyCode) {
    throw new Error("CONFIGURATION_REQUIRED: correction account/currency mappings are incomplete");
  }
  if (compare(input.note.taxAmount, "0") > 0) {
    if (
      !original.policy.statutoryValidated ||
      !originalPolicyConfig.taxCategoryRef ||
      !policyConfig.taxAccountId
    ) {
      throw new Error("POLICY_GATED: original statutory tax evidence is incomplete");
    }
  } else if (originalPolicyConfig.allowZeroTax !== true) {
    throw new Error("CONFIGURATION_REQUIRED: original zero-tax treatment is not configured");
  }
  const lines = input.note.items.map((item) => {
    const calculated = multiply(String(item.qty), item.rate);
    if (!calculated.equals(item.amount)) {
      throw new Error(`SOURCE_TOTAL_CONFLICT: correction line ${item.id} amount is inconsistent`);
    }
    return {
      sourceLineRef: item.id,
      description: item.itemName,
      quantity: String(item.qty),
      unitAmount: item.rate,
      taxCategoryRef: originalPolicyConfig.taxCategoryRef ?? null,
      taxAmount: item.taxAmount,
      accountId: operatingAccountId,
    };
  });
  const normalized = normalizeAccountingDocumentContract({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    sourceSystem: "ACCOUNTING",
    sourceType: documentType,
    sourceId: input.note.id,
    sourceVersion: sourceVersion(input.note.updatedAt),
    makerId: input.makerId,
    correlationId: `ACCOUNTING:${documentType}:${input.note.id}`,
    causationId: original.requestId,
    documentType,
    documentDate: input.note.postingDate,
    postingDate: input.note.postingDate,
    counterpartyType: input.partyType,
    counterpartyId: input.note.partyId,
    transactionCurrencyCode: policyConfig.currencyCode,
    baseCurrencyCode: configuration.profile.functionalCurrencyCode,
    policyId: policy.id,
    policyVersion: policy.version,
    approvalPolicyId: configuration.approvalPolicy.id,
    approvalPolicyVersion: configuration.approvalPolicy.version,
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicyId: configuration.roundingPolicy.id,
    roundingPolicyVersion: configuration.roundingPolicy.version,
    supportingDocumentRefs: [`${input.originalLegacyRecordType}:${input.note.originalInvoiceId}`],
    lines,
  });
  if (!decimal(normalized.totalAmount).equals(input.note.grandTotal)) {
    throw new Error("SOURCE_TOTAL_CONFLICT: configured Decimal totals differ from the note");
  }
  const isDebitEffect =
    (input.partyType === "CUSTOMER" && input.note.noteType === "DEBIT") ||
    (input.partyType === "SUPPLIER" && input.note.noteType === "CREDIT");
  const operatingAmount = subtract(normalized.totalAmount, normalized.taxAmount);
  const postingLines: CanonicalPostingLine[] = isDebitEffect
    ? [
        {
          accountId: controlAccountId,
          debit: normalized.totalAmount,
          credit: "0",
          partyType: input.partyType,
          partyId: input.note.partyId,
        },
        { accountId: operatingAccountId, debit: "0", credit: operatingAmount },
      ]
    : [
        {
          accountId: controlAccountId,
          debit: "0",
          credit: normalized.totalAmount,
          partyType: input.partyType,
          partyId: input.note.partyId,
        },
        { accountId: operatingAccountId, debit: operatingAmount, credit: "0" },
      ];
  if (!decimal(normalized.taxAmount).isZero()) {
    postingLines.push({
      accountId: policyConfig.taxAccountId!,
      debit: isDebitEffect ? "0" : normalized.taxAmount,
      credit: isDebitEffect ? normalized.taxAmount : "0",
    });
  }
  const ruleId =
    input.partyType === "CUSTOMER"
      ? input.note.noteType === "CREDIT"
        ? "AR-CREDIT-NOTE-v1"
        : "AR-DEBIT-NOTE-v1"
      : input.note.noteType === "CREDIT"
        ? "AP-VENDOR-CREDIT-NOTE-v1"
        : "AP-VENDOR-DEBIT-NOTE-v1";
  return persistPreparedDocument({
    contract: { ...normalized, lines },
    legacyRecordType: input.legacyRecordType,
    legacyRecordId: input.note.id,
    correctionOfId: original.id,
    correctionReason: input.note.reason,
    ruleId,
    journalType: input.partyType === "CUSTOMER" ? "CUSTOMER_NOTE" : "VENDOR_NOTE",
    postingLines,
    narration: `${documentType} ${input.note.noteNumber}`,
    branchId: input.note.branchId,
  });
}

export async function prepareLegacySalesInvoice(input: {
  orgId: string;
  invoiceId: string;
  makerId: string;
}) {
  await assertPermissions(input.orgId, input.makerId, [
    "accounting.sales-invoice.prepare",
  ]);
  const invoice = await db.salesInvoice.findFirst({
    where: { id: input.invoiceId, orgId: input.orgId, status: "DRAFT" },
    include: { items: true, taxLines: true, customer: { select: { id: true } } },
  });
  if (!invoice) throw new Error("Draft Sales Invoice not found");
  if (!invoice.items.length) throw new Error("Sales invoice requires at least one line");
  if (!invoice.discountAmount.isZero()) {
    throw new Error("CONFIGURATION_REQUIRED: legacy document-level discount allocation is not approved");
  }
  const configuration = await resolveCanonicalPostingConfiguration(
    input.orgId,
    invoice.postingDate,
    "SALES_INVOICE",
  );
  const { policy, configuration: policyConfig } = await resolveDocumentPolicy({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    documentType: "SALES_INVOICE",
    date: invoice.postingDate,
  });
  await assertCounterpartyEntityScope({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    partyType: "CUSTOMER",
    partyId: invoice.customerId,
    date: invoice.postingDate,
  });
  if (
    !policyConfig.receivableAccountId ||
    !policyConfig.revenueAccountId ||
    !policyConfig.currencyCode
  ) {
    throw new Error("CONFIGURATION_REQUIRED: sales invoice account/currency mappings are incomplete");
  }
  const taxRate = decimal(policyConfig.taxRate ?? "0", "configured taxRate");
  if (compare(taxRate, "0") > 0 && !policy.statutoryValidated) {
    throw new Error("POLICY_GATED: statutory sales tax policy is not approved");
  }
  if (
    compare(taxRate, "0") > 0 &&
    (!policyConfig.taxAccountId || !policyConfig.taxCategoryRef)
  ) {
    throw new Error("CONFIGURATION_REQUIRED: sales tax account/category mapping is incomplete");
  }
  if (taxRate.isZero() && policyConfig.allowZeroTax !== true) {
    throw new Error("CONFIGURATION_REQUIRED: explicit zero-tax treatment is not configured");
  }
  const lines = invoice.items.map((item) => {
    const taxable = multiply(String(item.qty), item.rate);
    const tax = taxRate.isZero()
      ? decimal("0")
      : quantize(multiply(taxable, taxRate).div(100), {
          scale: configuration.profile.moneyScale,
          allowRounding: true,
          label: "sales invoice tax",
        });
    return {
      sourceLineRef: item.id,
      description: item.itemName,
      quantity: String(item.qty),
      unitAmount: item.rate,
      taxCategoryRef: policyConfig.taxCategoryRef ?? null,
      taxAmount: tax,
      accountId: policyConfig.revenueAccountId!,
    };
  });
  const normalized = normalizeAccountingDocumentContract({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    sourceSystem: "ACCOUNTING",
    sourceType: "SALES_INVOICE",
    sourceId: invoice.id,
    sourceVersion: sourceVersion(invoice.updatedAt),
    makerId: input.makerId,
    correlationId: `ACCOUNTING:SALES_INVOICE:${invoice.id}`,
    documentType: "SALES_INVOICE",
    documentDate: invoice.postingDate,
    postingDate: invoice.postingDate,
    dueDate: invoice.dueDate,
    counterpartyType: "CUSTOMER",
    counterpartyId: invoice.customer.id,
    transactionCurrencyCode: policyConfig.currencyCode,
    baseCurrencyCode: configuration.profile.functionalCurrencyCode,
    policyId: policy.id,
    policyVersion: policy.version,
    approvalPolicyId: configuration.approvalPolicy.id,
    approvalPolicyVersion: configuration.approvalPolicy.version,
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicyId: configuration.roundingPolicy.id,
    roundingPolicyVersion: configuration.roundingPolicy.version,
    lines,
  });
  if (!decimal(normalized.totalAmount).equals(invoice.grandTotal)) {
    throw new Error("SOURCE_TOTAL_CONFLICT: configured Decimal totals differ from the legacy draft");
  }
  const postingLines: CanonicalPostingLine[] = [
    {
      accountId: policyConfig.receivableAccountId,
      debit: normalized.totalAmount,
      credit: "0",
      partyType: "CUSTOMER",
      partyId: invoice.customerId,
    },
    {
      accountId: policyConfig.revenueAccountId,
      debit: "0",
      credit: subtract(normalized.totalAmount, normalized.taxAmount),
    },
  ];
  if (!decimal(normalized.taxAmount).isZero()) {
    postingLines.push({
      accountId: policyConfig.taxAccountId!,
      debit: "0",
      credit: normalized.taxAmount,
    });
  }
  return persistPreparedDocument({
    contract: {
      ...normalized,
      lines,
    },
    legacyRecordType: "SalesInvoice",
    legacyRecordId: invoice.id,
    ruleId: "AR-SALES-INVOICE-v1",
    journalType: "SALES_INVOICE",
    postingLines,
    narration: `Sales Invoice ${invoice.invoiceNumber}`,
    branchId: invoice.branchId,
  });
}

export async function prepareLegacyPurchaseInvoice(input: {
  orgId: string;
  invoiceId: string;
  makerId: string;
}) {
  await assertPermissions(input.orgId, input.makerId, [
    "accounting.purchase-invoice.prepare",
  ]);
  const invoice = await db.purchaseInvoice.findFirst({
    where: { id: input.invoiceId, orgId: input.orgId, status: "DRAFT" },
    include: { items: true, supplier: { select: { id: true } } },
  });
  if (!invoice) throw new Error("Draft Purchase Invoice not found");
  if (!invoice.items.length) throw new Error("Purchase invoice requires at least one line");
  if (!invoice.discountAmount.isZero() || !invoice.taxAmount.isZero()) {
    throw new Error(
      "POLICY_GATED: legacy purchase discount/statutory tax requires an approved line-level policy",
    );
  }
  const configuration = await resolveCanonicalPostingConfiguration(
    input.orgId,
    invoice.postingDate,
    "PURCHASE_INVOICE",
  );
  const { policy, configuration: policyConfig } = await resolveDocumentPolicy({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    documentType: "PURCHASE_INVOICE",
    date: invoice.postingDate,
  });
  await assertCounterpartyEntityScope({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    partyType: "SUPPLIER",
    partyId: invoice.supplierId,
    date: invoice.postingDate,
  });
  if (
    !policyConfig.payableAccountId ||
    !policyConfig.expenseAccountId ||
    !policyConfig.currencyCode ||
    policyConfig.allowZeroTax !== true
  ) {
    throw new Error("CONFIGURATION_REQUIRED: purchase invoice mappings are incomplete");
  }
  const lines = invoice.items.map((item) => ({
    sourceLineRef: item.id,
    description: item.itemName,
    quantity: String(item.qty),
    unitAmount: item.rate,
    taxAmount: "0",
    accountId: policyConfig.expenseAccountId!,
  }));
  const normalized = normalizeAccountingDocumentContract({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    sourceSystem: "ACCOUNTING",
    sourceType: "PURCHASE_INVOICE",
    sourceId: invoice.id,
    sourceVersion: sourceVersion(invoice.updatedAt),
    makerId: input.makerId,
    correlationId: `ACCOUNTING:PURCHASE_INVOICE:${invoice.id}`,
    documentType: "PURCHASE_INVOICE",
    documentDate: invoice.postingDate,
    postingDate: invoice.postingDate,
    dueDate: invoice.dueDate,
    counterpartyType: "SUPPLIER",
    counterpartyId: invoice.supplier.id,
    transactionCurrencyCode: policyConfig.currencyCode,
    baseCurrencyCode: configuration.profile.functionalCurrencyCode,
    policyId: policy.id,
    policyVersion: policy.version,
    approvalPolicyId: configuration.approvalPolicy.id,
    approvalPolicyVersion: configuration.approvalPolicy.version,
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicyId: configuration.roundingPolicy.id,
    roundingPolicyVersion: configuration.roundingPolicy.version,
    lines,
  });
  if (!decimal(normalized.totalAmount).equals(invoice.grandTotal)) {
    throw new Error("SOURCE_TOTAL_CONFLICT: configured Decimal totals differ from the legacy draft");
  }
  return persistPreparedDocument({
    contract: { ...normalized, lines },
    legacyRecordType: "PurchaseInvoice",
    legacyRecordId: invoice.id,
    ruleId: "AP-PURCHASE-BILL-v1",
    journalType: "PURCHASE_INVOICE",
    postingLines: [
      {
        accountId: policyConfig.expenseAccountId,
        debit: normalized.totalAmount,
        credit: "0",
      },
      {
        accountId: policyConfig.payableAccountId,
        debit: "0",
        credit: normalized.totalAmount,
        partyType: "SUPPLIER",
        partyId: invoice.supplierId,
      },
    ],
    narration: `Purchase Invoice ${invoice.invoiceNumber}`,
    branchId: invoice.branchId,
  });
}

async function persistPreparedPayment(input: {
  contract: AccountingPaymentContractInput;
  legacyPaymentEntryId?: string;
  ruleId: string;
  postingLines: CanonicalPostingLine[];
  branchId?: string | null;
  sourceApproval?: { approvedById: string; approvedAt: Date | string };
  actorKind?: "USER" | "TRUSTED_INTEGRATION";
}) {
  const normalized = normalizeAccountingPaymentContract(input.contract);
  const requestId = `ACCOUNTING:PAYMENT:${normalized.paymentType}:${normalized.sourceId}:${normalized.sourceVersion}`;
  const idempotencyKey = requestId;
  const sourcePayload = { ...normalized, payloadHash: undefined };
  const configuration = await resolveCanonicalPostingConfiguration(
    normalized.orgId,
    normalized.transactionDate,
    "PAYMENT_ENTRY",
  );
  const provisional: CanonicalPostingRequest = {
    requestId,
    requestVersion: 1,
    idempotencyKey,
    orgId: normalized.orgId,
    legalEntityId: normalized.legalEntityId,
    source: {
      system: normalized.sourceSystem,
      type: normalized.sourceType,
      id: normalized.sourceId,
      version: normalized.sourceVersion,
      occurredAt: normalized.transactionDate,
      payload: sourcePayload,
      approvedById: input.sourceApproval?.approvedById,
      approvedAt: input.sourceApproval?.approvedAt,
    },
    actor: {
      kind: input.actorKind ?? "USER",
      actorId: normalized.makerId,
      authenticatedOrgId: normalized.orgId,
    },
    makerId: normalized.makerId,
    postingDate: normalized.transactionDate,
    documentDate: normalized.transactionDate,
    journalType: "PAYMENT_ENTRY",
    ruleId: input.ruleId,
    narration: `${normalized.paymentType} ${normalized.externalReference ?? normalized.sourceId}`,
    branchId: input.branchId ?? null,
    transactionCurrencyCode: normalized.transactionCurrencyCode,
    baseCurrencyCode: normalized.baseCurrencyCode,
    exchangeRate: null,
    approval: {
      policyId: configuration.approvalPolicy.id,
      policyVersion: configuration.approvalPolicy.version,
      approvedById: "PENDING_APPROVAL",
      approvedAt: normalized.transactionDate,
    },
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicy: {
      id: configuration.roundingPolicy.id,
      version: configuration.roundingPolicy.version,
    },
    lines: input.postingLines,
    supportingDocumentRefs: normalized.supportingDocumentRefs,
    correlationId: normalized.correlationId,
    causationId: normalized.causationId,
  };
  const postingPayload = canonicalPostingPayload(provisional);
  return db.$transaction(
    async (tx) => {
      const existing = await tx.accountingPayment.findUnique({
        where: { orgId_idempotencyKey: { orgId: normalized.orgId, idempotencyKey } },
      });
      if (existing) {
        if (existing.payloadHash !== normalized.payloadHash) {
          throw new Error("Accounting payment idempotency conflict");
        }
        return existing;
      }
      const snapshot = await tx.accountingSourceSnapshot.create({
        data: {
          orgId: normalized.orgId,
          legalEntityId: normalized.legalEntityId,
          sourceSystem: normalized.sourceSystem,
          sourceType: normalized.sourceType,
          sourceId: normalized.sourceId,
          sourceVersion: normalized.sourceVersion,
          requestId,
          payload: json(sourcePayload),
          payloadHash: payloadHash(sourcePayload),
          approvedById: input.sourceApproval?.approvedById,
          approvedAt: input.sourceApproval
            ? new Date(input.sourceApproval.approvedAt)
            : null,
          occurredAt: new Date(normalized.transactionDate),
        },
      });
      const payment = await tx.accountingPayment.create({
        data: {
          orgId: normalized.orgId,
          legalEntityId: normalized.legalEntityId,
          policyId: normalized.policyId,
          sourceSnapshotId: snapshot.id,
          sourceSystem: normalized.sourceSystem,
          sourceType: normalized.sourceType,
          sourceId: normalized.sourceId,
          sourceVersion: normalized.sourceVersion,
          legacyPaymentEntryId: input.legacyPaymentEntryId ?? null,
          paymentType: normalized.paymentType,
          schemaVersion: normalized.schemaVersion,
          status: "PENDING_APPROVAL",
          payerPayeeType: normalized.payerPayeeType,
          payerPayeeId: normalized.payerPayeeId,
          bankOrCashAccountId: normalized.bankOrCashAccountId,
          controlAccountId: normalized.controlAccountId,
          transactionDate: new Date(normalized.transactionDate),
          valueDate: normalized.valueDate ? new Date(normalized.valueDate) : null,
          transactionCurrencyCode: normalized.transactionCurrencyCode,
          baseCurrencyCode: normalized.baseCurrencyCode,
          exchangeRateId: normalized.exchangeRateId,
          amount: normalized.amount,
          allocatedAmount: normalized.allocatedAmount,
          unappliedAmount: normalized.unappliedAmount,
          paymentMethod: normalized.paymentMethod,
          externalReference: normalized.externalReference,
          dimensions: json(normalized.dimensions),
          supportingDocumentRefs: json(normalized.supportingDocumentRefs),
          immutablePayload: json(normalized),
          payloadHash: normalized.payloadHash,
          requestId,
          idempotencyKey,
          correlationId: normalized.correlationId,
          causationId: normalized.causationId,
          makerId: normalized.makerId,
          allocations: {
            create: normalized.allocations.map((allocation) => ({
              orgId: normalized.orgId,
              targetType: allocation.targetType,
              targetDocumentId: allocation.targetDocumentId,
              targetSourceSnapshotId: allocation.targetSourceSnapshotId,
              targetVersion: allocation.targetVersion,
              amount: allocation.amount,
            })),
          },
        },
      });
      await tx.accountingIntegrationInbox.create({
        data: {
          orgId: normalized.orgId,
          legalEntityId: normalized.legalEntityId,
          sourceSystem: normalized.sourceSystem,
          messageType: normalized.sourceType,
          messageVersion: normalized.schemaVersion,
          requestId,
          idempotencyKey,
          payload: json(postingPayload),
          payloadHash: payloadHash(postingPayload),
          sourceSnapshotId: snapshot.id,
          correlationId: normalized.correlationId,
          causationId: normalized.causationId,
          status: "PENDING",
        },
      });
      return payment;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function prepareLegacyPayment(input: {
  orgId: string;
  paymentEntryId: string;
  makerId: string;
}) {
  const entry = await db.paymentEntry.findFirst({
    where: { id: input.paymentEntryId, orgId: input.orgId, status: "DRAFT" },
    include: { allocations: true },
  });
  if (!entry) throw new Error("Draft Payment Entry not found");
  const paymentType =
    entry.paymentType === "RECEIVE" ? "CUSTOMER_RECEIPT" : "VENDOR_PAYMENT";
  await assertPermissions(input.orgId, input.makerId, [
    paymentType === "CUSTOMER_RECEIPT"
      ? "accounting.receipt.prepare"
      : "accounting.payment.prepare",
  ]);
  if (
    (paymentType === "CUSTOMER_RECEIPT" && entry.partyType !== "CUSTOMER") ||
    (paymentType === "VENDOR_PAYMENT" && entry.partyType !== "SUPPLIER")
  ) {
    throw new Error("Payment type and counterparty type are inconsistent");
  }
  const configuration = await resolveCanonicalPostingConfiguration(
    input.orgId,
    entry.postingDate,
    "PAYMENT_ENTRY",
  );
  const { policy, configuration: policyConfig } = await resolveDocumentPolicy({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    documentType: paymentType,
    date: entry.postingDate,
  });
  await assertCounterpartyEntityScope({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    partyType: entry.partyType as "CUSTOMER" | "SUPPLIER",
    partyId: entry.partyId,
    date: entry.postingDate,
  });
  const bankOrCashAccountId =
    paymentType === "CUSTOMER_RECEIPT"
      ? entry.paidToAccountId
      : entry.paidFromAccountId;
  const controlAccountId =
    paymentType === "CUSTOMER_RECEIPT"
      ? entry.paidFromAccountId
      : entry.paidToAccountId;
  const accounts = await db.account.findMany({
    where: {
      orgId: input.orgId,
      legalEntityId: configuration.legalEntity.id,
      id: { in: [bankOrCashAccountId, controlAccountId] },
      isActive: true,
      isGroup: false,
    },
    select: { id: true, accountType: true },
  });
  if (
    accounts.length !== 2 ||
    !accounts.some(
      (account) =>
        account.id === bankOrCashAccountId &&
        ["BANK", "CASH"].includes(account.accountType),
    )
  ) {
    throw new Error("CONFIGURATION_REQUIRED: payment accounts are invalid or ambiguous");
  }
  const targetLegacyIds = entry.allocations
    .map((allocation) =>
      paymentType === "CUSTOMER_RECEIPT"
        ? allocation.salesInvoiceId
        : allocation.purchaseInvoiceId,
    )
    .filter((id): id is string => Boolean(id));
  const targetDocuments = await db.accountingDocument.findMany({
    where: {
      orgId: input.orgId,
      legacyRecordType:
        paymentType === "CUSTOMER_RECEIPT" ? "SalesInvoice" : "PurchaseInvoice",
      legacyRecordId: { in: targetLegacyIds },
      status: "POSTED",
    },
  });
  if (targetDocuments.length !== targetLegacyIds.length) {
    throw new Error("POLICY_GATED: allocations require canonical posted target documents");
  }
  const targetByLegacyId = new Map(
    targetDocuments.map((document) => [document.legacyRecordId!, document]),
  );
  const allocations = await Promise.all(
    entry.allocations.map(async (allocation) => {
      const legacyId =
        paymentType === "CUSTOMER_RECEIPT"
          ? allocation.salesInvoiceId
          : allocation.purchaseInvoiceId;
      const target = legacyId ? targetByLegacyId.get(legacyId) : null;
      if (!target) throw new Error("Allocation target is not eligible");
      const alreadyAllocated = await db.accountingPaymentAllocation.aggregate({
        where: { targetDocumentId: target.id, status: "ACTIVE" },
        _sum: { amount: true },
      });
      return {
        targetDocumentId: target.id,
        targetVersion: target.sourceVersion,
        targetCurrencyCode: target.transactionCurrencyCode,
        eligibleOpenAmount: subtract(
          target.totalAmount,
          alreadyAllocated._sum.amount ?? "0",
        ),
        amount: allocation.allocatedAmount,
      };
    }),
  );
  const allocatedAmount = add(...allocations.map((allocation) => allocation.amount));
  const unappliedAmount = subtract(entry.amount, allocatedAmount);
  if (unappliedAmount.isNegative()) throw new Error("Payment is over-allocated");
  if (
    compare(unappliedAmount, "0") > 0 &&
    policyConfig.allowUnappliedPayments !== true
  ) {
    throw new Error("CONFIGURATION_REQUIRED: unapplied payments are not enabled");
  }
  const contract: AccountingPaymentContractInput = {
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    sourceSystem: "ACCOUNTING",
    sourceType: paymentType,
    sourceId: entry.id,
    sourceVersion: sourceVersion(entry.updatedAt),
    makerId: input.makerId,
    correlationId: `ACCOUNTING:PAYMENT:${entry.id}`,
    paymentType,
    payerPayeeType: entry.partyType as "CUSTOMER" | "SUPPLIER",
    payerPayeeId: entry.partyId,
    bankOrCashAccountId,
    controlAccountId,
    transactionDate: entry.postingDate,
    transactionCurrencyCode:
      policyConfig.currencyCode ?? configuration.profile.functionalCurrencyCode,
    baseCurrencyCode: configuration.profile.functionalCurrencyCode,
    amount: entry.amount,
    unappliedAmount,
    paymentMethod: policyConfig.paymentMethod ?? "UNSPECIFIED_CONFIGURED_METHOD",
    externalReference: entry.referenceNo,
    policyId: policy.id,
    policyVersion: policy.version,
    allocations,
  };
  const normalized = normalizeAccountingPaymentContract(contract);
  const postingLines: CanonicalPostingLine[] =
    paymentType === "CUSTOMER_RECEIPT"
      ? [
          { accountId: bankOrCashAccountId, debit: normalized.amount, credit: "0" },
          {
            accountId: controlAccountId,
            debit: "0",
            credit: normalized.amount,
            partyType: "CUSTOMER",
            partyId: entry.partyId,
          },
        ]
      : [
          {
            accountId: controlAccountId,
            debit: normalized.amount,
            credit: "0",
            partyType: "SUPPLIER",
            partyId: entry.partyId,
          },
          { accountId: bankOrCashAccountId, debit: "0", credit: normalized.amount },
        ];
  return persistPreparedPayment({
    contract,
    legacyPaymentEntryId: entry.id,
    ruleId:
      paymentType === "CUSTOMER_RECEIPT"
        ? "AR-CUSTOMER-RECEIPT-v1"
        : "AP-VENDOR-PAYMENT-v1",
    postingLines,
    branchId: entry.branchId,
  });
}

export async function approveAndPostAccountingDocument(input: {
  orgId: string;
  documentId: string;
  approverId: string;
}) {
  const document = await db.accountingDocument.findFirst({
    where: { id: input.documentId, orgId: input.orgId, status: "PENDING_APPROVAL" },
  });
  if (!document) throw new Error("Pending Accounting document not found");
  const typePermission =
    document.documentType === "SALES_INVOICE"
      ? "accounting.sales-invoice.approve"
      : document.documentType === "PURCHASE_INVOICE"
        ? "accounting.purchase-invoice.approve"
        : document.correctionOfId
          ? "accounting.correction.approve"
          : "accounting.document.approve";
  await assertPermissions(input.orgId, input.approverId, [
    "accounting.document.approve",
    typePermission,
    "accounting.post",
  ]);
  if (document.makerId === input.approverId) {
    throw new Error("Maker cannot approve their own Accounting document");
  }
  const inbox = await db.accountingIntegrationInbox.findFirst({
    where: {
      orgId: input.orgId,
      requestId: document.requestId,
      status: { in: ["PENDING", "RETRYABLE"] },
    },
  });
  if (!inbox) throw new Error("Prepared Accounting posting request not found");
  const payload = inbox.payload as unknown as CanonicalPostingRequest;
  const now = await getNow();
  return postCanonicalAccountingRequest({
    ...payload,
    actor: {
      kind: "USER",
      actorId: input.approverId,
      authenticatedOrgId: input.orgId,
    },
    approval: {
      policyId: document.approvalPolicyId,
      policyVersion: document.approvalPolicyVersion,
      approvedById: input.approverId,
      approvedAt: now,
    },
  });
}

export async function approveAndPostAccountingPayment(input: {
  orgId: string;
  paymentId: string;
  approverId: string;
}) {
  await assertPermissions(input.orgId, input.approverId, [
    "accounting.payment.approve",
    "accounting.payment.post",
  ]);
  const payment = await db.accountingPayment.findFirst({
    where: { id: input.paymentId, orgId: input.orgId, status: "PENDING_APPROVAL" },
  });
  if (!payment) throw new Error("Pending Accounting payment not found");
  if (payment.makerId === input.approverId) {
    throw new Error("Maker cannot approve their own Accounting payment");
  }
  const inbox = await db.accountingIntegrationInbox.findFirst({
    where: {
      orgId: input.orgId,
      requestId: payment.requestId,
      status: { in: ["PENDING", "RETRYABLE"] },
    },
  });
  if (!inbox) throw new Error("Prepared Accounting payment request not found");
  const payload = inbox.payload as unknown as CanonicalPostingRequest;
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

export async function prepareApprovedPayrollPayment(input: {
  orgId: string;
  integrationActorId: string;
  runId: string;
  runVersion: number;
  instructionId: string;
  instructionVersion: number;
  approvedById: string;
  approvedAt: Date | string;
  postingDate: Date | string;
  bankAccountId: string;
  payrollLiabilityAccountId: string;
  amount: string;
  externalReference?: string | null;
}) {
  await assertPermissions(input.orgId, input.integrationActorId, [
    "accounting.payroll-payment.integrate",
  ]);
  const run = await db.accountingPayrollRunSnapshot.findFirst({
    where: {
      orgId: input.orgId,
      runId: input.runId,
      runVersion: input.runVersion,
    },
    include: { sourceSnapshot: true },
  });
  if (!run) throw new Error("Approved immutable payroll run was not found");
  const postingDate = new Date(input.postingDate);
  if (Number.isNaN(postingDate.getTime())) throw new Error("postingDate is invalid");
  const configuration = await resolveCanonicalPostingConfiguration(
    input.orgId,
    postingDate,
    "PAYMENT_ENTRY",
  );
  if (configuration.legalEntity.id !== run.sourceSnapshot.legalEntityId) {
    throw new Error("Payroll run and payment legal entity do not match");
  }
  const { policy, configuration: policyConfig } = await resolveDocumentPolicy({
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    documentType: "PAYROLL_PAYMENT",
    date: postingDate,
  });
  const paid = await db.accountingPaymentAllocation.aggregate({
    where: {
      orgId: input.orgId,
      targetSourceSnapshotId: run.sourceSnapshotId,
      status: "ACTIVE",
    },
    _sum: { amount: true },
  });
  const eligible = subtract(run.totalCredit, paid._sum.amount ?? "0");
  const amount = decimal(input.amount, "amount");
  if (compare(amount, eligible) > 0) {
    throw new Error("Payroll payment exceeds the eligible approved payroll liability");
  }
  const accounts = await db.account.findMany({
    where: {
      orgId: input.orgId,
      legalEntityId: configuration.legalEntity.id,
      id: { in: [input.bankAccountId, input.payrollLiabilityAccountId] },
      isActive: true,
      isGroup: false,
    },
    select: { id: true, accountType: true },
  });
  if (
    accounts.length !== 2 ||
    !accounts.some(
      (account) =>
        account.id === input.bankAccountId && ["BANK", "CASH"].includes(account.accountType),
    )
  ) {
    throw new Error("CONFIGURATION_REQUIRED: payroll payment accounts are invalid");
  }
  const contract: AccountingPaymentContractInput = {
    orgId: input.orgId,
    legalEntityId: configuration.legalEntity.id,
    sourceSystem: "HRMS",
    sourceType: "APPROVED_PAYROLL_PAYMENT",
    sourceId: input.instructionId,
    sourceVersion: input.instructionVersion,
    makerId: input.integrationActorId,
    correlationId: `HRMS:PAYROLL_RUN:${input.runId}:${input.runVersion}`,
    causationId: run.sourceSnapshot.requestId,
    paymentType: "PAYROLL_PAYMENT",
    payerPayeeType: "OTHER",
    payerPayeeId: `PAYROLL_RUN:${input.runId}:${input.runVersion}`,
    bankOrCashAccountId: input.bankAccountId,
    controlAccountId: input.payrollLiabilityAccountId,
    transactionDate: postingDate,
    transactionCurrencyCode: run.currencyCode,
    baseCurrencyCode: configuration.profile.functionalCurrencyCode,
    amount,
    unappliedAmount: "0",
    paymentMethod: policyConfig.paymentMethod ?? "APPROVED_PAYROLL_INSTRUCTION",
    externalReference: input.externalReference,
    policyId: policy.id,
    policyVersion: policy.version,
    allocations: [
      {
        targetType: "SOURCE_SNAPSHOT",
        targetSourceSnapshotId: run.sourceSnapshotId,
        targetVersion: run.runVersion,
        targetCurrencyCode: run.currencyCode,
        eligibleOpenAmount: eligible,
        amount,
      },
    ],
  };
  return persistPreparedPayment({
    contract,
    ruleId: "PAYROLL-PAYMENT-v1",
    postingLines: [
      {
        accountId: input.payrollLiabilityAccountId,
        debit: amount,
        credit: "0",
      },
      {
        accountId: input.bankAccountId,
        debit: "0",
        credit: amount,
      },
    ],
    sourceApproval: {
      approvedById: input.approvedById,
      approvedAt: input.approvedAt,
    },
    actorKind: "TRUSTED_INTEGRATION",
  });
}

export async function postApprovedPayrollCorrection(input: {
  orgId: string;
  integrationActorId: string;
  legalEntityId: string;
  originalRunId: string;
  originalRunVersion: number;
  correctionId: string;
  correctionVersion: number;
  approvedById: string;
  approvedAt: Date | string;
  postingDate: Date | string;
  reasonCode: string;
  mode: "DELTA" | "REPLACEMENT";
  lines: CanonicalPostingLine[];
}) {
  await assertPermissions(input.orgId, input.integrationActorId, [
    "accounting.payroll-correction.integrate",
  ]);
  if (input.mode !== "DELTA") {
    throw new Error(
      "POLICY_GATED: payroll replacement requires an approved reversal/replacement policy",
    );
  }
  const original = await db.accountingPayrollRunSnapshot.findFirst({
    where: {
      orgId: input.orgId,
      runId: input.originalRunId,
      runVersion: input.originalRunVersion,
      sourceSnapshot: { legalEntityId: input.legalEntityId },
    },
  });
  if (!original) throw new Error("Original approved payroll run was not found");
  const totals = assertBalanced(input.lines);
  const correction = normalizePayrollCorrection({
    orgId: input.orgId,
    legalEntityId: input.legalEntityId,
    originalRunId: input.originalRunId,
    originalRunVersion: input.originalRunVersion,
    correctionId: input.correctionId,
    correctionVersion: input.correctionVersion,
    approvedById: input.approvedById,
    approvedAt: input.approvedAt,
    mode: input.mode,
    totalDebit: totals.debit,
    totalCredit: totals.credit,
    reasonCode: input.reasonCode,
  });
  const configuration = await resolveCanonicalPostingConfiguration(
    input.orgId,
    input.postingDate,
    "JOURNAL_ENTRY",
  );
  if (configuration.legalEntity.id !== input.legalEntityId) {
    throw new Error("Payroll correction legal entity is not the configured posting entity");
  }
  return postCanonicalAccountingRequest({
    requestId: correction.idempotencyKey,
    requestVersion: 1,
    idempotencyKey: correction.idempotencyKey,
    orgId: input.orgId,
    legalEntityId: input.legalEntityId,
    source: {
      system: "HRMS",
      type: "APPROVED_PAYROLL_CORRECTION",
      id: input.correctionId,
      version: input.correctionVersion,
      occurredAt: input.approvedAt,
      approvedById: input.approvedById,
      approvedAt: input.approvedAt,
      payload: correction,
    },
    actor: {
      kind: "TRUSTED_INTEGRATION",
      actorId: input.integrationActorId,
      authenticatedOrgId: input.orgId,
    },
    makerId: input.integrationActorId,
    postingDate: input.postingDate,
    documentDate: input.approvedAt,
    journalType: "JOURNAL_ENTRY",
    ruleId: "PAYROLL-CORRECTION-v1",
    narration: `Approved payroll correction ${input.reasonCode}`,
    transactionCurrencyCode: original.currencyCode,
    baseCurrencyCode: configuration.profile.functionalCurrencyCode,
    exchangeRate: null,
    approval: {
      policyId: configuration.approvalPolicy.id,
      policyVersion: configuration.approvalPolicy.version,
      approvedById: input.approvedById,
      approvedAt: input.approvedAt,
    },
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicy: {
      id: configuration.roundingPolicy.id,
      version: configuration.roundingPolicy.version,
    },
    lines: input.lines,
    correlationId: `HRMS:PAYROLL_RUN:${input.originalRunId}:${input.originalRunVersion}`,
    causationId: original.sourceSnapshotId,
  });
}

export async function cancelCanonicalDocumentByLegacyRecord(input: {
  orgId: string;
  legacyRecordType: "SalesInvoice" | "PurchaseInvoice" | "CustomerNote" | "VendorNote";
  legacyRecordId: string;
  actorId: string;
  reason: string;
}) {
  await assertPermissions(input.orgId, input.actorId, [
    "accounting.correction.approve",
    "accounting.reverse",
  ]);
  const document = await db.accountingDocument.findFirst({
    where: {
      orgId: input.orgId,
      legacyRecordType: input.legacyRecordType,
      legacyRecordId: input.legacyRecordId,
      status: "POSTED",
      journalEntryId: { not: null },
    },
  });
  if (!document?.journalEntryId) throw new Error("Canonical posted document not found");
  if (input.legacyRecordType === "SalesInvoice" || input.legacyRecordType === "PurchaseInvoice") {
    const allocated = await db.accountingPaymentAllocation.count({
      where: { targetDocumentId: document.id, status: "ACTIVE" },
    });
    if (allocated > 0) {
      throw new Error("Document with active allocations must be unallocated by payment reversal first");
    }
  }
  const configuration = await resolveCanonicalPostingConfiguration(
    input.orgId,
    await getNow(),
    "JOURNAL_ENTRY",
  );
  return reverseCanonicalJournal({
    orgId: input.orgId,
    legalEntityId: document.legalEntityId,
    journalEntryId: document.journalEntryId,
    reason: input.reason.trim() || "Controlled document cancellation",
    requestId: `ACCOUNTING:CANCEL:${document.id}:${document.rowVersion}`,
    idempotencyKey: `ACCOUNTING:CANCEL:${document.id}:${document.rowVersion}`,
    actor: {
      kind: "USER",
      actorId: input.actorId,
      authenticatedOrgId: input.orgId,
    },
    makerId: document.makerId,
    approval: {
      policyId: configuration.approvalPolicy.id,
      policyVersion: configuration.approvalPolicy.version,
      approvedById: input.actorId,
      approvedAt: await getNow(),
    },
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicy: {
      id: configuration.roundingPolicy.id,
      version: configuration.roundingPolicy.version,
    },
    correlationId: document.correlationId,
  });
}

export async function reverseCanonicalPaymentByLegacyRecord(input: {
  orgId: string;
  legacyPaymentEntryId: string;
  actorId: string;
  reason: string;
}) {
  await assertPermissions(input.orgId, input.actorId, [
    "accounting.payment.reverse",
    "accounting.reverse",
  ]);
  const payment = await db.accountingPayment.findFirst({
    where: {
      orgId: input.orgId,
      legacyPaymentEntryId: input.legacyPaymentEntryId,
      status: "POSTED",
      journalEntryId: { not: null },
    },
  });
  if (!payment?.journalEntryId) throw new Error("Canonical posted payment not found");
  const configuration = await resolveCanonicalPostingConfiguration(
    input.orgId,
    await getNow(),
    "JOURNAL_ENTRY",
  );
  return reverseCanonicalJournal({
    orgId: input.orgId,
    legalEntityId: payment.legalEntityId,
    journalEntryId: payment.journalEntryId,
    reason: input.reason.trim() || "Controlled payment reversal",
    requestId: `ACCOUNTING:PAYMENT_REVERSAL:${payment.id}:${payment.rowVersion}`,
    idempotencyKey: `ACCOUNTING:PAYMENT_REVERSAL:${payment.id}:${payment.rowVersion}`,
    actor: {
      kind: "USER",
      actorId: input.actorId,
      authenticatedOrgId: input.orgId,
    },
    makerId: payment.makerId,
    approval: {
      policyId: configuration.approvalPolicy.id,
      policyVersion: configuration.approvalPolicy.version,
      approvedById: input.actorId,
      approvedAt: await getNow(),
    },
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicy: {
      id: configuration.roundingPolicy.id,
      version: configuration.roundingPolicy.version,
    },
    correlationId: payment.correlationId,
  });
}
