import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { Prisma } from "@/generated/prisma/client";

import {
  AccountingMoneyError,
  assertBalanced,
  convertToBaseCurrency,
  decimal,
  quantize,
  serialize,
  type AccountingDecimalInput,
} from "./money";
import { canonicalPayload, payloadHash } from "./request-integrity";

type PostingActor = {
  kind: "USER" | "TRUSTED_INTEGRATION";
  actorId: string;
  authenticatedOrgId: string;
};

type CanonicalRuleContract = {
  journalType: string;
  sourceSystem: string;
  sourceType: string;
  requiresSourceApproval: boolean;
};

const CANONICAL_RULE_CONTRACTS: Record<string, CanonicalRuleContract[]> = {
  "GL-MANUAL-JOURNAL-v1": [
    {
      journalType: "JOURNAL_ENTRY",
      sourceSystem: "ACCOUNTING",
      sourceType: "MANUAL_JOURNAL_DRAFT",
      requiresSourceApproval: false,
    },
    {
      journalType: "JOURNAL_ENTRY",
      sourceSystem: "P3_TEST",
      sourceType: "SYNTHETIC_POSTING",
      requiresSourceApproval: false,
    },
  ],
  "BANK-TRANSFER-v1": [
    {
      journalType: "JOURNAL_ENTRY",
      sourceSystem: "ACCOUNTING",
      sourceType: "BANK_TRANSFER",
      requiresSourceApproval: false,
    },
  ],
  "PAYROLL-ACCRUAL-v1": [
    {
      journalType: "JOURNAL_ENTRY",
      sourceSystem: "HRMS",
      sourceType: "APPROVED_PAYROLL_RUN",
      requiresSourceApproval: true,
    },
  ],
  "AR-SALES-INVOICE-v1": [
    {
      journalType: "SALES_INVOICE",
      sourceSystem: "ACCOUNTING",
      sourceType: "SALES_INVOICE",
      requiresSourceApproval: false,
    },
    {
      journalType: "SALES_INVOICE",
      sourceSystem: "CRM",
      sourceType: "APPROVED_INVOICE_REQUEST",
      requiresSourceApproval: true,
    },
  ],
  "AP-PURCHASE-BILL-v1": [
    {
      journalType: "PURCHASE_INVOICE",
      sourceSystem: "ACCOUNTING",
      sourceType: "PURCHASE_INVOICE",
      requiresSourceApproval: false,
    },
  ],
  "AR-CUSTOMER-RECEIPT-v1": [
    {
      journalType: "PAYMENT_ENTRY",
      sourceSystem: "ACCOUNTING",
      sourceType: "CUSTOMER_RECEIPT",
      requiresSourceApproval: false,
    },
  ],
  "AP-VENDOR-PAYMENT-v1": [
    {
      journalType: "PAYMENT_ENTRY",
      sourceSystem: "ACCOUNTING",
      sourceType: "VENDOR_PAYMENT",
      requiresSourceApproval: false,
    },
  ],
  "PAYROLL-PAYMENT-v1": [
    {
      journalType: "PAYMENT_ENTRY",
      sourceSystem: "HRMS",
      sourceType: "APPROVED_PAYROLL_PAYMENT",
      requiresSourceApproval: true,
    },
  ],
  "PAYROLL-CORRECTION-v1": [
    {
      journalType: "JOURNAL_ENTRY",
      sourceSystem: "HRMS",
      sourceType: "APPROVED_PAYROLL_CORRECTION",
      requiresSourceApproval: true,
    },
  ],
  "AR-CREDIT-NOTE-v1": [
    {
      journalType: "CUSTOMER_NOTE",
      sourceSystem: "ACCOUNTING",
      sourceType: "CUSTOMER_CREDIT_NOTE",
      requiresSourceApproval: false,
    },
  ],
  "AR-DEBIT-NOTE-v1": [
    {
      journalType: "CUSTOMER_NOTE",
      sourceSystem: "ACCOUNTING",
      sourceType: "CUSTOMER_DEBIT_NOTE",
      requiresSourceApproval: false,
    },
  ],
  "AP-VENDOR-DEBIT-NOTE-v1": [
    {
      journalType: "VENDOR_NOTE",
      sourceSystem: "ACCOUNTING",
      sourceType: "VENDOR_DEBIT_NOTE",
      requiresSourceApproval: false,
    },
  ],
  "AP-VENDOR-CREDIT-NOTE-v1": [
    {
      journalType: "VENDOR_NOTE",
      sourceSystem: "ACCOUNTING",
      sourceType: "VENDOR_CREDIT_NOTE",
      requiresSourceApproval: false,
    },
  ],
  "ASSET-DEPRECIATE-v1": [
    {
      journalType: "DEPRECIATION_RUN",
      sourceSystem: "AMS",
      sourceType: "APPROVED_DEPRECIATION_RUN",
      requiresSourceApproval: true,
    },
  ],
  "EXP-DIRECT-v1": [
    {
      journalType: "RECURRING_OCCURRENCE",
      sourceSystem: "ACCOUNTING",
      sourceType: "RECURRING_EXPENSE_OCCURRENCE",
      requiresSourceApproval: false,
    },
  ],
  "PARTNER-APPROPRIATION-v1": [
    {
      journalType: "PARTNER_TRANSACTION",
      sourceSystem: "ACCOUNTING",
      sourceType: "APPROVED_PARTNER_TRANSACTION",
      requiresSourceApproval: true,
    },
  ],
  "GL-REVERSAL-v1": [
    {
      journalType: "JOURNAL_ENTRY",
      sourceSystem: "ACCOUNTING",
      sourceType: "JOURNAL_REVERSAL",
      requiresSourceApproval: true,
    },
  ],
};

export type CanonicalPostingLine = {
  accountId: string;
  debit: AccountingDecimalInput;
  credit: AccountingDecimalInput;
  transactionDebit?: AccountingDecimalInput;
  transactionCredit?: AccountingDecimalInput;
  partyType?: string | null;
  partyId?: string | null;
  remarks?: string | null;
  dimensions?: Array<{ definitionId: string; dimensionValueId: string }>;
};

export type CanonicalPostingRequest = {
  requestId: string;
  requestVersion: number;
  idempotencyKey: string;
  orgId: string;
  legalEntityId: string;
  source: {
    system: string;
    type: string;
    id: string;
    version: number;
    occurredAt: Date | string;
    payload: unknown;
    approvedById?: string | null;
    approvedAt?: Date | string | null;
  };
  actor: PostingActor;
  makerId: string;
  postingDate: Date | string;
  documentDate?: Date | string | null;
  journalType: string;
  ruleId: string;
  narration: string;
  branchId?: string | null;
  transactionCurrencyCode: string;
  baseCurrencyCode: string;
  exchangeRate?: {
    id: string;
    rate: AccountingDecimalInput;
    source: string;
    effectiveDate: Date | string;
  } | null;
  approval: {
    policyId: string;
    policyVersion: number;
    approvedById: string;
    approvedAt: Date | string;
  };
  numberSeriesId: string;
  roundingPolicy: {
    id: string;
    version: number;
  };
  lines: CanonicalPostingLine[];
  supportingDocumentRefs?: string[];
  correlationId: string;
  causationId?: string | null;
  reversalOfId?: string | null;
  replacementOfId?: string | null;
  reversalReason?: string | null;
  originalEffectiveDate?: Date | string | null;
  injectFailureAfterJournal?: boolean;
};

export type CanonicalPostingResult = {
  replayed: boolean;
  journalEntryId: string;
  voucherNo: string;
  requestId: string;
  idempotencyKey: string;
};

type PostingFailureClass = "BUSINESS_REJECTION" | "RETRYABLE" | "IDEMPOTENCY_CONFLICT";

export class AccountingPostingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly classification: PostingFailureClass = "BUSINESS_REJECTION",
  ) {
    super(message);
    this.name = "AccountingPostingError";
  }
}

function postingDate(value: Date | string, label: string): Date {
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AccountingPostingError("INVALID_DATE", `${label} is invalid`);
  }
  return parsed;
}

function safePayload(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(canonicalPayload(value)) as Prisma.InputJsonValue;
}

function resolveRuleContract(request: CanonicalPostingRequest): CanonicalRuleContract {
  const contract = CANONICAL_RULE_CONTRACTS[request.ruleId]?.find(
    (candidate) =>
      candidate.journalType === request.journalType &&
      candidate.sourceSystem === request.source.system &&
      candidate.sourceType === request.source.type,
  );
  if (!contract) {
    throw new AccountingPostingError(
      "POSTING_RULE_UNSUPPORTED",
      "The posting rule is not registered for this journal and source contract",
    );
  }
  return contract;
}

async function assertSyntheticPolicyTarget(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ allowed: boolean }>>`
    SELECT (
      current_database() = 'monolith_accounting_staging'
      AND current_user = 'monolith_staging'
      AND COALESCE(host(inet_server_addr()), '') = '127.0.0.1'
      AND inet_server_port() = 56432
      AND COALESCE(
        shobj_description(
          (SELECT oid FROM pg_database WHERE datname = current_database()),
          'pg_database'
        ),
        ''
      ) = 'MONOLITH_ACCOUNTING_STAGING_ONLY'
    ) AS allowed
  `;
  if (rows[0]?.allowed !== true) {
    throw new AccountingPostingError(
      "SYNTHETIC_ROUNDING_POLICY_FORBIDDEN",
      "Synthetic non-statutory rounding policies are restricted to the exact approved staging database",
    );
  }
}

export function canonicalPostingPayload(request: CanonicalPostingRequest) {
  return {
    requestId: request.requestId,
    requestVersion: request.requestVersion,
    idempotencyKey: request.idempotencyKey,
    orgId: request.orgId,
    legalEntityId: request.legalEntityId,
    source: request.source,
    makerId: request.makerId,
    postingDate: request.postingDate,
    documentDate: request.documentDate,
    journalType: request.journalType,
    ruleId: request.ruleId,
    narration: request.narration,
    branchId: request.branchId,
    transactionCurrencyCode: request.transactionCurrencyCode,
    baseCurrencyCode: request.baseCurrencyCode,
    exchangeRate: request.exchangeRate,
    approval: {
      policyId: request.approval.policyId,
      policyVersion: request.approval.policyVersion,
    },
    numberSeriesId: request.numberSeriesId,
    roundingPolicy: request.roundingPolicy,
    lines: request.lines,
    supportingDocumentRefs: request.supportingDocumentRefs,
    correlationId: request.correlationId,
    causationId: request.causationId,
    reversalOfId: request.reversalOfId,
    replacementOfId: request.replacementOfId,
    reversalReason: request.reversalReason,
    originalEffectiveDate: request.originalEffectiveDate,
  };
}

async function authorizeActor(
  tx: Prisma.TransactionClient,
  request: CanonicalPostingRequest,
) {
  if (request.actor.authenticatedOrgId !== request.orgId) {
    throw new AccountingPostingError("TENANT_SCOPE_MISMATCH", "Authenticated organization does not match the request");
  }

  const permission =
    request.actor.kind === "TRUSTED_INTEGRATION"
      ? "accounting.integration.post"
      : request.reversalOfId
        ? "accounting.reverse"
        : request.replacementOfId
          ? "accounting.replace"
        : "accounting.post";
  const rows = await tx.$queryRaw<Array<{ allowed: boolean }>>`
    SELECT TRUE AS allowed
    FROM "User" u
    JOIN "UserRole" ur ON ur."userId" = u.id
    JOIN "Role" r ON r.id = ur."roleId" AND r."orgId" = u."orgId"
    JOIN "RolePermission" rp ON rp."roleId" = r.id
    JOIN "Permission" p ON p.id = rp."permissionId"
    WHERE u.id = ${request.actor.actorId}
      AND u."orgId" = ${request.orgId}
      AND u.active = TRUE
      AND p.key = ${permission}
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw new AccountingPostingError("ACCOUNTING_PERMISSION_REQUIRED", `Missing Accounting permission ${permission}`);
  }
}

async function resolveContext(
  tx: Prisma.TransactionClient,
  request: CanonicalPostingRequest,
) {
  const ruleContract = resolveRuleContract(request);
  const date = postingDate(request.postingDate, "postingDate");
  const document = request.documentDate ? postingDate(request.documentDate, "documentDate") : null;
  const entity = await tx.accountingLegalEntity.findFirst({
    where: { id: request.legalEntityId, orgId: request.orgId, status: "ACTIVE" },
  });
  if (!entity) {
    throw new AccountingPostingError("LEGAL_ENTITY_INVALID", "Legal entity is not active in this organization");
  }
  if (request.branchId) {
    const branch = await tx.branch.findFirst({
      where: { id: request.branchId, orgId: request.orgId },
      select: { id: true },
    });
    if (!branch) {
      throw new AccountingPostingError(
        "BRANCH_INVALID",
        "Branch does not belong to the request organization",
      );
    }
  }

  const lockedPeriods = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT id, status::text
    FROM "AccountingPeriod"
    WHERE "orgId" = ${request.orgId}
      AND "startDate" <= ${date}
      AND "endDate" >= ${date}
    FOR SHARE
  `;
  if (lockedPeriods.length !== 1) {
    throw new AccountingPostingError("ACCOUNTING_PERIOD_NOT_FOUND", "Posting date does not resolve to exactly one period");
  }
  const period = lockedPeriods[0];
  if (period.status !== "OPEN") {
    throw new AccountingPostingError("ACCOUNTING_PERIOD_CLOSED", "Posting requires an open Accounting period");
  }

  const currencies = await tx.accountingCurrency.findMany({
    where: {
      orgId: request.orgId,
      code: { in: [request.transactionCurrencyCode, request.baseCurrencyCode] },
      isEnabled: true,
    },
  });
  const transactionCurrency = currencies.find((currency) => currency.code === request.transactionCurrencyCode);
  const baseCurrency = currencies.find((currency) => currency.code === request.baseCurrencyCode);
  if (!transactionCurrency || !baseCurrency || !baseCurrency.isFunctional) {
    throw new AccountingPostingError("CURRENCY_INVALID", "Transaction and functional currencies must be enabled");
  }

  let rate = decimal("1");
  let rateId: string | null = null;
  let rateSource = "FUNCTIONAL_CURRENCY";
  let rateDate = date;
  if (transactionCurrency.code !== baseCurrency.code) {
    if (!request.exchangeRate) {
      throw new AccountingPostingError("EXCHANGE_RATE_REQUIRED", "Foreign-currency posting requires an approved exchange rate");
    }
    const exchangeDate = postingDate(request.exchangeRate.effectiveDate, "exchangeRate.effectiveDate");
    const master = await tx.accountingExchangeRate.findFirst({
      where: {
        id: request.exchangeRate.id,
        orgId: request.orgId,
        fromCurrencyId: transactionCurrency.id,
        toCurrencyId: baseCurrency.id,
        status: "APPROVED",
        rateDate: exchangeDate,
        source: request.exchangeRate.source,
      },
    });
    if (!master || !master.rate.eq(decimal(request.exchangeRate.rate, "exchangeRate.rate"))) {
      throw new AccountingPostingError("EXCHANGE_RATE_INVALID", "Exchange-rate evidence does not match an approved rate");
    }
    if (master.rateDate > date) {
      throw new AccountingPostingError(
        "EXCHANGE_RATE_DATE_INVALID",
        "Exchange-rate evidence cannot be effective after the posting date",
      );
    }
    rate = master.rate;
    rateId = master.id;
    rateSource = master.source;
    rateDate = master.rateDate;
  }

  const roundingPolicy = await tx.accountingRoundingPolicy.findFirst({
    where: {
      id: request.roundingPolicy.id,
      orgId: request.orgId,
      version: request.roundingPolicy.version,
      isActive: true,
      effectiveFrom: { lte: date },
      AND: [
        {
          OR: [
            { currencyCode: null },
            { currencyCode: transactionCurrency.code },
            { currencyCode: baseCurrency.code },
          ],
        },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] },
      ],
    },
  });
  if (!roundingPolicy) {
    throw new AccountingPostingError("ROUNDING_POLICY_REQUIRED", "An active versioned rounding policy is required");
  }
  const roundingConfiguration = (roundingPolicy.configuration ?? {}) as {
    allowRounding?: boolean;
    syntheticNonStatutory?: boolean;
  };
  if (!roundingPolicy.statutoryValidated && !roundingConfiguration.syntheticNonStatutory) {
    throw new AccountingPostingError(
      "STATUTORY_ROUNDING_NOT_VALIDATED",
      "This posting is gated until the rounding policy is validated or explicitly marked synthetic non-statutory",
    );
  }
  if (roundingConfiguration.syntheticNonStatutory) {
    await assertSyntheticPolicyTarget(tx);
  }
  if (roundingPolicy.roundingMode !== "HALF_UP") {
    throw new AccountingPostingError(
      "ROUNDING_MODE_UNSUPPORTED",
      "The configured rounding mode is not implemented by the canonical decimal boundary",
    );
  }

  const approvalPolicy = await tx.accountingApprovalPolicy.findFirst({
    where: {
      id: request.approval.policyId,
      orgId: request.orgId,
      version: request.approval.policyVersion,
      documentType: request.journalType,
      isActive: true,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
  });
  if (!approvalPolicy) {
    throw new AccountingPostingError("APPROVAL_POLICY_REQUIRED", "An active versioned approval policy is required");
  }
  if (request.makerId === request.approval.approvedById) {
    throw new AccountingPostingError("MAKER_CHECKER_VIOLATION", "Maker cannot approve their own controlled posting");
  }
  const approvalConfiguration = (approvalPolicy.configuration ?? {}) as {
    separatePosterRequired?: boolean;
    requireSupportingDocuments?: boolean;
  };
  if (
    approvalConfiguration.separatePosterRequired === true &&
    request.actor.actorId === request.approval.approvedById
  ) {
    throw new AccountingPostingError(
      "APPROVER_POSTER_SEPARATION_REQUIRED",
      "This approval policy requires a poster who is different from the approver",
    );
  }
  if (
    approvalConfiguration.requireSupportingDocuments === true &&
    (request.supportingDocumentRefs?.filter((reference) => reference.trim()).length ?? 0) === 0
  ) {
    throw new AccountingPostingError(
      "SUPPORTING_DOCUMENT_REQUIRED",
      "This approval policy requires at least one supporting-document reference",
    );
  }

  const [approverPermission, maker] = await Promise.all([
    tx.$queryRaw<Array<{ allowed: boolean }>>`
      SELECT TRUE AS allowed
      FROM "User" u
      JOIN "UserRole" ur ON ur."userId" = u.id
      JOIN "Role" r ON r.id = ur."roleId" AND r."orgId" = u."orgId"
      JOIN "RolePermission" rp ON rp."roleId" = r.id
      JOIN "Permission" p ON p.id = rp."permissionId"
      WHERE u.id = ${request.approval.approvedById}
        AND u."orgId" = ${request.orgId}
        AND u.active = TRUE
        AND p.key IN ('accounting.journal.approve', 'accounting.approve')
      LIMIT 1
    `,
    tx.user.findFirst({
      where: { id: request.makerId, orgId: request.orgId, active: true },
      select: { id: true },
    }),
  ]);
  if (approverPermission.length === 0) {
    throw new AccountingPostingError(
      "APPROVER_INVALID",
      "Approval evidence does not identify an active Accounting approver in this organization",
    );
  }
  if (!maker) {
    throw new AccountingPostingError("MAKER_INVALID", "Maker is not active in this organization");
  }

  return {
    date,
    document,
    period,
    transactionCurrency,
    baseCurrency,
    rate,
    rateId,
    rateSource,
    rateDate,
    roundingPolicy,
    roundingConfiguration,
    approvalPolicy,
    ruleContract,
  };
}

async function validateAndNormalizeLines(
  tx: Prisma.TransactionClient,
  request: CanonicalPostingRequest,
  context: Awaited<ReturnType<typeof resolveContext>>,
) {
  const activeDimensions = await tx.accountingDimensionDefinition.findMany({
    where: { orgId: request.orgId, isActive: true },
    select: { id: true, code: true, isRequired: true },
  });
  const requiredDimensions = activeDimensions.filter(({ isRequired }) => isRequired);
  const chaJobDimensionId = activeDimensions.find(({ code }) => code === "CHA_JOB")?.id;
  const costCentreDimensionId = activeDimensions.find(({ code }) => code === "COST_CENTRE")?.id;
  const normalized = [];

  for (const [index, line] of request.lines.entries()) {
    let normalizedPartyType = line.partyType ?? null;
    const account = await tx.account.findFirst({
      where: {
        id: line.accountId,
        orgId: request.orgId,
        legalEntityId: request.legalEntityId,
        isActive: true,
        isGroup: false,
      },
      include: { accountingControl: true },
    });
    if (!account) {
      throw new AccountingPostingError(
        "ACCOUNT_NOT_POSTABLE",
        `Line ${index + 1} account is inactive, grouped, or outside the organization/legal entity`,
      );
    }
    if (!account.accountingControl) {
      throw new AccountingPostingError(
        "ACCOUNT_CONTROL_REQUIRED",
        `Line ${index + 1} account requires explicit Accounting control configuration`,
      );
    }
    if (
      !account.accountingControl.allowDirectPosting &&
      request.ruleId === "GL-MANUAL-JOURNAL-v1"
    ) {
      throw new AccountingPostingError("CONTROL_ACCOUNT_RESTRICTED", `Line ${index + 1} cannot manually post to a protected account`);
    }

    const dimensions = line.dimensions ?? [];
    const dimensionIds = new Set(dimensions.map((dimension) => dimension.definitionId));
    for (const required of requiredDimensions) {
      if (!dimensionIds.has(required.id)) {
        throw new AccountingPostingError("REQUIRED_DIMENSION_MISSING", `Line ${index + 1} is missing a required dimension`);
      }
    }
    if (account.accountingControl?.requiresParty && (!line.partyType || !line.partyId)) {
      throw new AccountingPostingError("CONTROL_ACCOUNT_PARTY_REQUIRED", `Line ${index + 1} requires a party reference`);
    }
    if ((line.partyType && !line.partyId) || (!line.partyType && line.partyId)) {
      throw new AccountingPostingError(
        "PARTY_REFERENCE_INCOMPLETE",
        `Line ${index + 1} must supply partyType and partyId together`,
      );
    }
    if (line.partyType && line.partyId) {
      const partyType = line.partyType.toUpperCase();
      const party =
        partyType === "CUSTOMER"
          ? await tx.crmAccount.findFirst({
              where: { id: line.partyId, orgId: request.orgId, status: "ACTIVE" },
              select: { id: true },
            })
          : partyType === "SUPPLIER"
            ? await tx.crmVendor.findFirst({
                where: { id: line.partyId, orgId: request.orgId, status: "ACTIVE" },
                select: { id: true },
              })
            : partyType === "EMPLOYEE"
              ? await tx.user.findFirst({
                  where: { id: line.partyId, orgId: request.orgId, active: true },
                  select: { id: true },
                })
              : null;
      if (!party) {
        throw new AccountingPostingError(
          "PARTY_REFERENCE_INVALID",
          `Line ${index + 1} contains an unsupported or cross-tenant party reference`,
        );
      }
      normalizedPartyType = partyType;
    }
    if (
      account.accountingControl?.requiresChaJob &&
      (!chaJobDimensionId || !dimensionIds.has(chaJobDimensionId))
    ) {
      throw new AccountingPostingError("CONTROL_ACCOUNT_JOB_REQUIRED", `Line ${index + 1} requires a CHA job dimension`);
    }
    if (
      account.accountingControl?.requiresCostCentre &&
      (!costCentreDimensionId || !dimensionIds.has(costCentreDimensionId))
    ) {
      throw new AccountingPostingError("CONTROL_ACCOUNT_COST_CENTRE_REQUIRED", `Line ${index + 1} requires a cost-centre dimension`);
    }
    for (const dimension of dimensions) {
      const valid = await tx.accountingDimensionValue.findFirst({
        where: {
          id: dimension.dimensionValueId,
          orgId: request.orgId,
          definitionId: dimension.definitionId,
          isActive: true,
        },
        select: { id: true, canonicalType: true, canonicalId: true },
      });
      if (!valid) {
        throw new AccountingPostingError("DIMENSION_INVALID", `Line ${index + 1} contains an invalid dimension`);
      }
      if (valid.canonicalType === "CHA_JOB" && valid.canonicalId) {
        const job = await tx.chaJob.findFirst({
          where: { id: valid.canonicalId, orgId: request.orgId },
          select: { id: true },
        });
        if (!job) {
          throw new AccountingPostingError(
            "DIMENSION_CANONICAL_REFERENCE_INVALID",
            `Line ${index + 1} contains a CHA job dimension outside the organization`,
          );
        }
      }
    }

    const allowRounding = context.roundingConfiguration.allowRounding === true;
    const debit = quantize(line.debit, {
      scale: context.baseCurrency.decimalPlaces,
      allowRounding,
      label: `lines[${index}].debit`,
    });
    const credit = quantize(line.credit, {
      scale: context.baseCurrency.decimalPlaces,
      allowRounding,
      label: `lines[${index}].credit`,
    });
    if (
      !context.rate.eq(1) &&
      (line.transactionDebit === undefined || line.transactionCredit === undefined)
    ) {
      throw new AccountingPostingError(
        "TRANSACTION_AMOUNTS_REQUIRED",
        `Line ${index + 1} must supply explicit transaction-currency debit and credit amounts`,
      );
    }
    const transactionDebit = quantize(
      line.transactionDebit ?? line.debit,
      {
        scale: context.transactionCurrency.decimalPlaces,
        allowRounding,
        label: `lines[${index}].transactionDebit`,
      },
    );
    const transactionCredit = quantize(
      line.transactionCredit ?? line.credit,
      {
        scale: context.transactionCurrency.decimalPlaces,
        allowRounding,
        label: `lines[${index}].transactionCredit`,
      },
    );
    const expectedDebit = convertToBaseCurrency(transactionDebit, context.rate, {
      scale: context.baseCurrency.decimalPlaces,
      allowRounding,
      label: `lines[${index}].convertedDebit`,
    });
    const expectedCredit = convertToBaseCurrency(transactionCredit, context.rate, {
      scale: context.baseCurrency.decimalPlaces,
      allowRounding,
      label: `lines[${index}].convertedCredit`,
    });
    if (!debit.eq(expectedDebit) || !credit.eq(expectedCredit)) {
      throw new AccountingPostingError(
        "BASE_CURRENCY_CONVERSION_MISMATCH",
        `Line ${index + 1} base amount does not equal transaction amount multiplied by the approved exchange rate`,
      );
    }

    normalized.push({
      ...line,
      partyType: normalizedPartyType,
      debit,
      credit,
      transactionDebit,
      transactionCredit,
      dimensions,
    });
  }

  const functionalTotals = assertBalanced(normalized);
  assertBalanced(
    normalized.map((line) => ({
      debit: line.transactionDebit,
      credit: line.transactionCredit,
    })),
  );

  return { lines: normalized, functionalTotals };
}

async function allocateVoucherNumber(
  tx: Prisma.TransactionClient,
  request: CanonicalPostingRequest,
  date: Date,
) {
  const rows = await tx.$queryRaw<
    Array<{ id: string; prefixTemplate: string; padding: number; allocatedNumber: bigint }>
  >`
    UPDATE "AccountingNumberSeries"
    SET "nextNumber" = "nextNumber" + 1,
        "rowVersion" = "rowVersion" + 1,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${request.numberSeriesId}
      AND "orgId" = ${request.orgId}
      AND "documentType" = ${request.journalType}
      AND "isActive" = TRUE
      AND "effectiveFrom" <= ${date}
      AND ("effectiveTo" IS NULL OR "effectiveTo" >= ${date})
    RETURNING id,
              "prefixTemplate",
              padding,
              ("nextNumber" - 1) AS "allocatedNumber"
  `;
  const allocated = rows[0];
  if (!allocated) {
    throw new AccountingPostingError("NUMBER_SERIES_INVALID", "No active number series matches this journal type and date");
  }

  const fiscalYear = await tx.fiscalYear.findFirst({
    where: { orgId: request.orgId, startDate: { lte: date }, endDate: { gte: date } },
    select: { name: true },
  });
  const prefix = allocated.prefixTemplate.replaceAll("{FY}", fiscalYear?.name ?? "");
  return `${prefix}${allocated.allocatedNumber.toString().padStart(allocated.padding, "0")}`;
}

async function existingResult(
  tx: Prisma.TransactionClient,
  request: CanonicalPostingRequest,
  hash: string,
): Promise<CanonicalPostingResult | null> {
  const existing = await tx.accountingIntegrationInbox.findUnique({
    where: {
      orgId_sourceSystem_idempotencyKey: {
        orgId: request.orgId,
        sourceSystem: request.source.system,
        idempotencyKey: request.idempotencyKey,
      },
    },
  });
  if (!existing) return null;
  if (existing.payloadHash !== hash) {
    throw new AccountingPostingError(
      "IDEMPOTENCY_PAYLOAD_CONFLICT",
      "The idempotency key is already bound to a different payload",
      "IDEMPOTENCY_CONFLICT",
    );
  }
  if (existing.status === "PROCESSED" && existing.processedRecordId) {
    const journal = await tx.journalEntry.findFirst({
      where: { id: existing.processedRecordId, orgId: request.orgId },
      select: { id: true, voucherNo: true },
    });
    if (journal) {
      return {
        replayed: true,
        journalEntryId: journal.id,
        voucherNo: journal.voucherNo,
        requestId: request.requestId,
        idempotencyKey: request.idempotencyKey,
      };
    }
  }
  if (existing.status === "PROCESSING") {
    throw new AccountingPostingError("REQUEST_IN_PROGRESS", "The same request is already processing", "RETRYABLE");
  }
  if (["REJECTED", "FAILED", "DEAD_LETTER", "MANUAL_REVIEW"].includes(existing.status)) {
    throw new AccountingPostingError(
      existing.lastErrorCode ?? "REQUEST_PREVIOUSLY_REJECTED",
      "This deterministic Accounting request has already reached a terminal failure state",
      existing.retryClassification === "IDEMPOTENCY_CONFLICT"
        ? "IDEMPOTENCY_CONFLICT"
        : "BUSINESS_REJECTION",
    );
  }
  return null;
}

async function executePosting(
  tx: Prisma.TransactionClient,
  request: CanonicalPostingRequest,
  hash: string,
): Promise<CanonicalPostingResult> {
  const replay = await existingResult(tx, request, hash);
  if (replay) return replay;

  await authorizeActor(tx, request);
  const context = await resolveContext(tx, request);
  const sourceApprovalIsPartial =
    Boolean(request.source.approvedById) !== Boolean(request.source.approvedAt);
  if (sourceApprovalIsPartial) {
    throw new AccountingPostingError(
      "SOURCE_APPROVAL_EVIDENCE_INCOMPLETE",
      "Source approval identity and timestamp must be supplied together",
    );
  }
  if (context.ruleContract.requiresSourceApproval && !request.source.approvedById) {
    throw new AccountingPostingError(
      "SOURCE_APPROVAL_EVIDENCE_REQUIRED",
      "This posting rule requires immutable source approval evidence",
    );
  }
  if (request.source.approvedById) {
    const sourceApprover = await tx.user.findFirst({
      where: {
        id: request.source.approvedById,
        orgId: request.orgId,
        active: true,
      },
      select: { id: true },
    });
    if (!sourceApprover) {
      throw new AccountingPostingError(
        "SOURCE_APPROVER_INVALID",
        "Source approval evidence does not identify an active user in this organization",
      );
    }
  }
  const sourceHash = payloadHash(request.source.payload);

  const existingSnapshot = await tx.accountingSourceSnapshot.findUnique({
    where: {
      orgId_sourceSystem_sourceType_sourceId_sourceVersion: {
        orgId: request.orgId,
        sourceSystem: request.source.system,
        sourceType: request.source.type,
        sourceId: request.source.id,
        sourceVersion: request.source.version,
      },
    },
  });
  if (existingSnapshot && existingSnapshot.payloadHash !== sourceHash) {
    throw new AccountingPostingError(
      "SOURCE_VERSION_CONFLICT",
      "The immutable source version is already bound to a different snapshot",
      "IDEMPOTENCY_CONFLICT",
    );
  }
  if (existingSnapshot && existingSnapshot.legalEntityId !== request.legalEntityId) {
    throw new AccountingPostingError(
      "SOURCE_LEGAL_ENTITY_CONFLICT",
      "The immutable source version is already assigned to a different legal entity",
      "IDEMPOTENCY_CONFLICT",
    );
  }
  if (existingSnapshot) {
    const priorPosting = await tx.accountingIntegrationInbox.findFirst({
      where: {
        orgId: request.orgId,
        sourceSnapshotId: existingSnapshot.id,
        status: "PROCESSED",
        processedRecordType: "JournalEntry",
        processedRecordId: { not: null },
      },
      orderBy: { processedAt: "asc" },
    });
    if (priorPosting?.processedRecordId) {
      if (priorPosting.payloadHash !== hash) {
        throw new AccountingPostingError(
          "SOURCE_VERSION_POSTING_CONFLICT",
          "The immutable source version is already posted under a different canonical request",
          "IDEMPOTENCY_CONFLICT",
        );
      }
      const journal = await tx.journalEntry.findFirst({
        where: { id: priorPosting.processedRecordId, orgId: request.orgId },
        select: { id: true, voucherNo: true },
      });
      if (journal) {
        return {
          replayed: true,
          journalEntryId: journal.id,
          voucherNo: journal.voucherNo,
          requestId: request.requestId,
          idempotencyKey: request.idempotencyKey,
        };
      }
    }
  }
  const snapshot =
    existingSnapshot ??
    (await tx.accountingSourceSnapshot.create({
      data: {
        orgId: request.orgId,
        legalEntityId: request.legalEntityId,
        sourceSystem: request.source.system,
        sourceType: request.source.type,
        sourceId: request.source.id,
        sourceVersion: request.source.version,
        requestId: request.requestId,
        payload: safePayload(request.source.payload),
        payloadHash: sourceHash,
        approvedById: request.source.approvedById ?? null,
        approvedAt: request.source.approvedAt
          ? postingDate(request.source.approvedAt, "source.approvedAt")
          : null,
        occurredAt: postingDate(request.source.occurredAt, "source.occurredAt"),
      },
    }));

  const inbox = await tx.accountingIntegrationInbox.upsert({
    where: {
      orgId_sourceSystem_idempotencyKey: {
        orgId: request.orgId,
        sourceSystem: request.source.system,
        idempotencyKey: request.idempotencyKey,
      },
    },
    update: {
      status: "PROCESSING",
      processingAt: await getNow(),
      attemptCount: { increment: 1 },
      rowVersion: { increment: 1 },
    },
    create: {
      orgId: request.orgId,
      legalEntityId: request.legalEntityId,
      sourceSystem: request.source.system,
      messageType: request.source.type,
      messageVersion: request.requestVersion,
      requestId: request.requestId,
      idempotencyKey: request.idempotencyKey,
      payload: safePayload(canonicalPostingPayload(request)),
      payloadHash: hash,
      sourceSnapshotId: snapshot.id,
      correlationId: request.correlationId,
      causationId: request.causationId ?? null,
      status: "PROCESSING",
      processingAt: await getNow(),
      attemptCount: 1,
    },
  });

  const preparedPayment = await tx.accountingPayment.findUnique({
    where: {
      orgId_sourceSystem_sourceType_sourceId_sourceVersion: {
        orgId: request.orgId,
        sourceSystem: request.source.system,
        sourceType: request.source.type,
        sourceId: request.source.id,
        sourceVersion: request.source.version,
      },
    },
    include: {
      allocations: {
        where: { status: "ACTIVE" },
        select: { amount: true },
      },
    },
  });
  if (preparedPayment) {
    if (
      preparedPayment.legalEntityId !== request.legalEntityId ||
      preparedPayment.status !== "PENDING_APPROVAL"
    ) {
      throw new AccountingPostingError(
        "PAYMENT_STATE_CONFLICT",
        "The prepared payment is not eligible for canonical posting",
      );
    }
    const allocationTotal = preparedPayment.allocations.reduce(
      (total, allocation) => total.plus(decimal(allocation.amount)),
      decimal("0"),
    );
    if (
      !allocationTotal.equals(decimal(preparedPayment.allocatedAmount)) ||
      !allocationTotal
        .plus(decimal(preparedPayment.unappliedAmount))
        .equals(decimal(preparedPayment.amount))
    ) {
      throw new AccountingPostingError(
        "PAYMENT_ALLOCATION_INTEGRITY_FAILED",
        "Active allocations and unapplied amount do not equal the prepared payment",
      );
    }
  }

  const attempt = await tx.accountingPostingAttempt.create({
    data: {
      orgId: request.orgId,
      inboxId: inbox.id,
      requestId: request.requestId,
      attemptNumber: inbox.attemptCount,
      status: "PROCESSING",
      actorId: request.actor.actorId,
    },
  });

  if (request.reversalOfId) {
    const originalRows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status
      FROM "JournalEntry"
      WHERE id = ${request.reversalOfId}
        AND "orgId" = ${request.orgId}
      FOR UPDATE
    `;
    const original = originalRows[0];
    if (!original || !["POSTED", "SUBMITTED"].includes(original.status)) {
      throw new AccountingPostingError("REVERSAL_ORIGINAL_INVALID", "Only an immutable posted journal can be reversed");
    }
    const priorReversal = await tx.journalEntry.findFirst({
      where: {
        orgId: request.orgId,
        reversalOfId: request.reversalOfId,
        status: { in: ["POSTED", "SUBMITTED"] },
      },
      select: { id: true },
    });
    if (priorReversal) {
      throw new AccountingPostingError("DUPLICATE_REVERSAL", "This journal already has an active reversal");
    }
    if (!request.reversalReason?.trim()) {
      throw new AccountingPostingError("REVERSAL_REASON_REQUIRED", "Reversal reason is required");
    }
  }
  if (request.reversalOfId && request.replacementOfId) {
    throw new AccountingPostingError(
      "CORRECTION_LINEAGE_INVALID",
      "A journal cannot be both a reversal and a replacement",
    );
  }
  if (request.replacementOfId) {
    const originalRows = await tx.$queryRaw<
      Array<{ id: string; status: string; postingDate: Date }>
    >`
      SELECT id, status, "postingDate"
      FROM "JournalEntry"
      WHERE id = ${request.replacementOfId}
        AND "orgId" = ${request.orgId}
        AND "legalEntityId" = ${request.legalEntityId}
      FOR UPDATE
    `;
    const original = originalRows[0];
    if (!original || !["POSTED", "SUBMITTED"].includes(original.status)) {
      throw new AccountingPostingError(
        "REPLACEMENT_ORIGINAL_INVALID",
        "A replacement requires an immutable posted original journal",
      );
    }
    const [reversal, priorReplacement] = await Promise.all([
      tx.journalEntry.findFirst({
        where: {
          orgId: request.orgId,
          reversalOfId: original.id,
          status: { in: ["POSTED", "SUBMITTED"] },
        },
        select: { id: true },
      }),
      tx.journalEntry.findFirst({
        where: {
          orgId: request.orgId,
          replacementOfId: original.id,
          status: { in: ["POSTED", "SUBMITTED"] },
        },
        select: { id: true },
      }),
    ]);
    if (!reversal) {
      throw new AccountingPostingError(
        "REPLACEMENT_REQUIRES_REVERSAL",
        "The original journal must be reversed before a replacement can post",
      );
    }
    if (priorReplacement) {
      throw new AccountingPostingError(
        "DUPLICATE_REPLACEMENT",
        "This journal already has an active replacement",
      );
    }
    if (
      !request.originalEffectiveDate ||
      postingDate(request.originalEffectiveDate, "originalEffectiveDate").getTime() !==
        new Date(original.postingDate).getTime()
    ) {
      throw new AccountingPostingError(
        "ORIGINAL_EFFECTIVE_DATE_REQUIRED",
        "Replacement lineage must preserve the original journal effective date",
      );
    }
  }

  const normalized = await validateAndNormalizeLines(tx, request, context);
  const voucherNo = await allocateVoucherNumber(tx, request, context.date);
  const now = await getNow();
  await tx.$queryRaw`SELECT set_config('monolith.accounting_canonical_posting', 'on', true)`;
  const journal = await tx.journalEntry.create({
    data: {
      orgId: request.orgId,
      legalEntityId: request.legalEntityId,
      branchId: request.branchId ?? null,
      voucherNo,
      journalType: request.journalType,
      postingDate: context.date,
      documentDate: context.document,
      remarks: request.narration,
      status: "POSTED",
      totalDebit: normalized.functionalTotals.debit,
      totalCredit: normalized.functionalTotals.credit,
      createdById: request.makerId,
      accountingPeriodId: context.period.id,
      sourceSystem: request.source.system,
      sourceType: request.source.type,
      sourceId: request.source.id,
      sourceVersion: request.source.version,
      requestId: request.requestId,
      idempotencyKey: request.idempotencyKey,
      sourceSnapshotId: snapshot.id,
      functionalCurrencyCode: context.baseCurrency.code,
      transactionCurrencyCode: context.transactionCurrency.code,
      baseCurrencyCode: context.baseCurrency.code,
      exchangeRateId: context.rateId,
      exchangeRateSource: context.rateSource,
      exchangeRateEffectiveDate: context.rateDate,
      accountingApprovalPolicyId: context.approvalPolicy.id,
      approvalPolicyVersion: context.approvalPolicy.version,
      approvedById: request.approval.approvedById,
      approvedAt: postingDate(request.approval.approvedAt, "approval.approvedAt"),
      numberSeriesId: request.numberSeriesId,
      roundingPolicyId: context.roundingPolicy.id,
      roundingPolicyVersion: context.roundingPolicy.version,
      supportingDocumentRefs: request.supportingDocumentRefs
        ? (request.supportingDocumentRefs as Prisma.InputJsonValue)
        : undefined,
      correlationId: request.correlationId,
      causationId: request.causationId ?? null,
      postedAt: now,
      postedById: request.actor.actorId,
      reversalOfId: request.reversalOfId ?? null,
      replacementOfId: request.replacementOfId ?? null,
      reversalReason: request.reversalReason ?? null,
      originalEffectiveDate: request.originalEffectiveDate
        ? postingDate(request.originalEffectiveDate, "originalEffectiveDate")
        : null,
      lines: {
        create: normalized.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          partyType: line.partyType ?? null,
          partyId: line.partyId ?? null,
          remarks: line.remarks ?? null,
          transactionCurrencyCode: context.transactionCurrency.code,
          transactionDebit: line.transactionDebit,
          transactionCredit: line.transactionCredit,
          exchangeRate: context.rate,
          accountingDimensions: {
            create: line.dimensions.map((dimension) => ({
              orgId: request.orgId,
              definitionId: dimension.definitionId,
              dimensionValueId: dimension.dimensionValueId,
            })),
          },
        })),
      },
    },
  });

  if (request.injectFailureAfterJournal) {
    throw new AccountingPostingError("INJECTED_FAILURE", "Injected transactional rollback");
  }

  await tx.generalLedgerEntry.createMany({
    data: normalized.lines.map((line) => ({
      orgId: request.orgId,
      branchId: request.branchId ?? null,
      postingDate: context.date,
      accountId: line.accountId,
      partyType: line.partyType ?? null,
      partyId: line.partyId ?? null,
      voucherType: "JOURNAL_ENTRY",
      voucherId: journal.id,
      journalEntryId: journal.id,
      debit: line.debit,
      credit: line.credit,
      remarks: line.remarks ?? request.narration,
      createdById: request.actor.actorId,
    })),
  });
  const accountingDocument = await tx.accountingDocument.findUnique({
    where: {
      orgId_sourceSystem_sourceType_sourceId_sourceVersion: {
        orgId: request.orgId,
        sourceSystem: request.source.system,
        sourceType: request.source.type,
        sourceId: request.source.id,
        sourceVersion: request.source.version,
      },
    },
  });
  if (accountingDocument) {
    await tx.accountingDocument.update({
      where: { id: accountingDocument.id },
      data: {
        status: "POSTED",
        approvedById: request.approval.approvedById,
        approvedAt: postingDate(request.approval.approvedAt, "approval.approvedAt"),
        approvalEvidence: safePayload({
          policyId: request.approval.policyId,
          policyVersion: request.approval.policyVersion,
          approvedById: request.approval.approvedById,
          approvedAt: request.approval.approvedAt,
        }),
        journalEntryId: journal.id,
        rowVersion: { increment: 1 },
      },
    });
    const legacy = {
      id: accountingDocument.legacyRecordId ?? "",
      orgId: request.orgId,
      status: "DRAFT",
    };
    if (accountingDocument.legacyRecordType === "SalesInvoice") {
      await tx.salesInvoice.updateMany({ where: legacy, data: { status: "UNPAID" } });
    } else if (accountingDocument.legacyRecordType === "PurchaseInvoice") {
      await tx.purchaseInvoice.updateMany({ where: legacy, data: { status: "UNPAID" } });
    } else if (accountingDocument.legacyRecordType === "CustomerNote") {
      await tx.customerNote.updateMany({ where: legacy, data: { status: "SUBMITTED" } });
    } else if (accountingDocument.legacyRecordType === "VendorNote") {
      await tx.vendorNote.updateMany({ where: legacy, data: { status: "SUBMITTED" } });
    }
  }
  const accountingPayment = await tx.accountingPayment.findUnique({
    where: {
      orgId_sourceSystem_sourceType_sourceId_sourceVersion: {
        orgId: request.orgId,
        sourceSystem: request.source.system,
        sourceType: request.source.type,
        sourceId: request.source.id,
        sourceVersion: request.source.version,
      },
    },
  });
  if (accountingPayment) {
    await tx.accountingPayment.update({
      where: { id: accountingPayment.id },
      data: {
        status: "POSTED",
        approvedById: request.approval.approvedById,
        approvedAt: postingDate(request.approval.approvedAt, "approval.approvedAt"),
        approvalEvidence: safePayload({
          policyId: request.approval.policyId,
          policyVersion: request.approval.policyVersion,
          approvedById: request.approval.approvedById,
          approvedAt: request.approval.approvedAt,
        }),
        journalEntryId: journal.id,
        rowVersion: { increment: 1 },
      },
    });
    if (accountingPayment.legacyPaymentEntryId) {
      await tx.paymentEntry.updateMany({
        where: {
          id: accountingPayment.legacyPaymentEntryId,
          orgId: request.orgId,
          status: "DRAFT",
        },
        data: { status: "SUBMITTED" },
      });
    }
  }
  if (request.reversalOfId) {
    const reversedDocument = await tx.accountingDocument.findUnique({
      where: { journalEntryId: request.reversalOfId },
    });
    if (reversedDocument) {
      await tx.accountingDocument.update({
        where: { id: reversedDocument.id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          rowVersion: { increment: 1 },
        },
      });
      const legacy = {
        id: reversedDocument.legacyRecordId ?? "",
        orgId: request.orgId,
      };
      if (reversedDocument.legacyRecordType === "SalesInvoice") {
        await tx.salesInvoice.updateMany({
          where: legacy,
          data: { status: "CANCELLED", outstandingAmount: new Prisma.Decimal(0) },
        });
      } else if (reversedDocument.legacyRecordType === "PurchaseInvoice") {
        await tx.purchaseInvoice.updateMany({
          where: legacy,
          data: { status: "CANCELLED", outstandingAmount: new Prisma.Decimal(0) },
        });
      } else if (reversedDocument.legacyRecordType === "CustomerNote") {
        await tx.customerNote.updateMany({ where: legacy, data: { status: "CANCELLED" } });
      } else if (reversedDocument.legacyRecordType === "VendorNote") {
        await tx.vendorNote.updateMany({ where: legacy, data: { status: "CANCELLED" } });
      }
    }
    const reversedPayment = await tx.accountingPayment.findUnique({
      where: { journalEntryId: request.reversalOfId },
    });
    if (reversedPayment) {
      await tx.accountingPaymentAllocation.updateMany({
        where: { paymentId: reversedPayment.id, status: "ACTIVE" },
        data: { status: "REVERSED", reversedAt: now },
      });
      await tx.accountingPayment.update({
        where: { id: reversedPayment.id },
        data: {
          status: "REVERSED",
          reversedAt: now,
          rowVersion: { increment: 1 },
        },
      });
      if (reversedPayment.legacyPaymentEntryId) {
        await tx.paymentEntry.updateMany({
          where: { id: reversedPayment.legacyPaymentEntryId, orgId: request.orgId },
          data: { status: "CANCELLED" },
        });
      }
    }
  }
  await tx.accountingAuditLog.create({
    data: {
      orgId: request.orgId,
      userId: request.actor.actorId,
      action: request.reversalOfId ? "POST_CANONICAL_REVERSAL" : "POST_CANONICAL_JOURNAL",
      entityType: "JournalEntry",
      entityId: journal.id,
      afterValues: {
        requestId: request.requestId,
        idempotencyKey: request.idempotencyKey,
        payloadHash: hash,
        sourceSnapshotId: snapshot.id,
        ruleId: request.ruleId,
        approvalPolicyId: context.approvalPolicy.id,
        roundingPolicyId: context.roundingPolicy.id,
      },
    },
  });
  const outboxPayload = {
    requestId: request.requestId,
    journalEntryId: journal.id,
    voucherNo,
    status: "POSTED",
    source: {
      system: request.source.system,
      type: request.source.type,
      id: request.source.id,
      version: request.source.version,
    },
    totals: {
      debit: serialize(normalized.functionalTotals.debit, context.baseCurrency.decimalPlaces),
      credit: serialize(normalized.functionalTotals.credit, context.baseCurrency.decimalPlaces),
      currency: context.baseCurrency.code,
    },
  };
  await tx.accountingIntegrationOutbox.create({
    data: {
      orgId: request.orgId,
      legalEntityId: request.legalEntityId,
      // Phase 4 deliberately has no external publisher. A later approved phase
      // must introduce an explicit provider mapping before removing this guard.
      destination: `SYNTHETIC_${request.source.system}`,
      eventType: request.reversalOfId ? "accounting.journal.reversed" : "accounting.journal.posted",
      eventVersion: 1,
      aggregateType: "JournalEntry",
      aggregateId: journal.id,
      correlationId: request.correlationId,
      causationId: request.requestId,
      idempotencyKey: `ACCOUNTING:JOURNAL:${journal.id}:POSTED:v1`,
      payloadHash: payloadHash(outboxPayload),
      payload: safePayload(outboxPayload),
      status: "PENDING",
    },
  });
  await tx.accountingIntegrationInbox.update({
    where: { id: inbox.id },
    data: {
      status: "PROCESSED",
      processedAt: now,
      processedRecordType: "JournalEntry",
      processedRecordId: journal.id,
      lastErrorCode: null,
      retryClassification: null,
      rowVersion: { increment: 1 },
    },
  });
  await tx.accountingPostingAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "POSTED",
      journalEntryId: journal.id,
      completedAt: now,
    },
  });

  return {
    replayed: false,
    journalEntryId: journal.id,
    voucherNo,
    requestId: request.requestId,
    idempotencyKey: request.idempotencyKey,
  };
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function normalizePostingError(error: unknown) {
  if (error instanceof AccountingPostingError) return error;
  if (error instanceof AccountingMoneyError) {
    return new AccountingPostingError(error.code, error.message);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const metadata = error.meta as
      | {
          code?: string;
          driverAdapterError?: { cause?: { originalCode?: string } };
        }
      | undefined;
    if (
      error.code === "P2034" ||
      (error.code === "P2010" && metadata?.code === "40001") ||
      metadata?.driverAdapterError?.cause?.originalCode === "40001"
    ) {
      return new AccountingPostingError("SERIALIZATION_RETRY", "Concurrent posting must be retried", "RETRYABLE");
    }
  }
  return new AccountingPostingError("POSTING_FAILED", "Accounting posting failed");
}

async function recordFailure(
  request: CanonicalPostingRequest,
  hash: string,
  error: AccountingPostingError,
) {
  const status =
    error.classification === "RETRYABLE"
      ? "RETRYABLE"
      : error.classification === "IDEMPOTENCY_CONFLICT"
        ? "REJECTED"
        : "REJECTED";
  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.accountingIntegrationInbox.findUnique({
        where: {
          orgId_sourceSystem_idempotencyKey: {
            orgId: request.orgId,
            sourceSystem: request.source.system,
            idempotencyKey: request.idempotencyKey,
          },
        },
      });
      if (existing && existing.payloadHash !== hash) return;
      if (
        existing &&
        ["REJECTED", "FAILED", "DEAD_LETTER", "MANUAL_REVIEW"].includes(existing.status) &&
        existing.lastErrorCode === error.code
      ) {
        return;
      }
      const now = await getNow();
      const inbox = await tx.accountingIntegrationInbox.upsert({
        where: {
          orgId_sourceSystem_idempotencyKey: {
            orgId: request.orgId,
            sourceSystem: request.source.system,
            idempotencyKey: request.idempotencyKey,
          },
        },
        update: {
          status,
          attemptCount: { increment: 1 },
          lastErrorCode: error.code,
          retryClassification: error.classification,
          rejectedAt: status === "REJECTED" ? now : null,
          availableAt: now,
          rowVersion: { increment: 1 },
        },
        create: {
          orgId: request.orgId,
          sourceSystem: request.source.system,
          messageType: request.source.type,
          messageVersion: request.requestVersion,
          requestId: request.requestId,
          idempotencyKey: request.idempotencyKey,
          payload: safePayload(canonicalPostingPayload(request)),
          payloadHash: hash,
          correlationId: request.correlationId,
          causationId: request.causationId ?? null,
          status,
          attemptCount: 1,
          lastErrorCode: error.code,
          retryClassification: error.classification,
          rejectedAt: status === "REJECTED" ? now : null,
        },
      });
      await tx.accountingPostingAttempt.create({
        data: {
          orgId: request.orgId,
          inboxId: inbox.id,
          requestId: request.requestId,
          attemptNumber: inbox.attemptCount,
          status,
          actorId: request.actor.actorId,
          errorCode: error.code,
          errorClassification: error.classification,
          completedAt: now,
        },
      });
    });
  } catch {
    // Failure persistence is best effort when the rejection itself is an invalid tenant/entity reference.
  }
}

export async function postCanonicalAccountingRequest(
  request: CanonicalPostingRequest,
): Promise<CanonicalPostingResult> {
  if (!request.requestId || !request.idempotencyKey || !request.correlationId) {
    throw new AccountingPostingError(
      "REQUEST_LINEAGE_REQUIRED",
      "requestId, idempotencyKey, and correlationId are required",
    );
  }
  if (!Number.isInteger(request.requestVersion) || request.requestVersion !== 1) {
    throw new AccountingPostingError("REQUEST_VERSION_UNSUPPORTED", "Only canonical posting request version 1 is supported");
  }
  if (
    !request.source.system ||
    !request.source.type ||
    !request.source.id ||
    !Number.isInteger(request.source.version) ||
    request.source.version < 1
  ) {
    throw new AccountingPostingError(
      "SOURCE_IDENTITY_INVALID",
      "Source system, type, ID, and a positive integer source version are required",
    );
  }
  resolveRuleContract(request);

  const hash = payloadHash(canonicalPostingPayload(request));
  try {
    return await db.$transaction(
      (tx) => executePosting(tx, request, hash),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (isUniqueConflict(error)) {
      try {
        return await db.$transaction(
          (tx) => executePosting(tx, request, hash),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (replayError) {
        const normalizedReplayError = normalizePostingError(replayError);
        await recordFailure(request, hash, normalizedReplayError);
        throw normalizedReplayError;
      }
    }
    const normalized = normalizePostingError(error);
    await recordFailure(request, hash, normalized);
    throw normalized;
  }
}

export async function reverseCanonicalJournal(input: {
  orgId: string;
  legalEntityId: string;
  journalEntryId: string;
  reason: string;
  requestedPostingDate?: Date | string;
  requestId: string;
  idempotencyKey: string;
  actor: PostingActor;
  makerId: string;
  approval: CanonicalPostingRequest["approval"];
  numberSeriesId: string;
  roundingPolicy: CanonicalPostingRequest["roundingPolicy"];
  correlationId: string;
}) {
  const original = await db.journalEntry.findFirst({
    where: {
      id: input.journalEntryId,
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      status: { in: ["POSTED", "SUBMITTED"] },
    },
    include: {
      lines: { include: { accountingDimensions: true } },
      accountingPeriod: true,
    },
  });
  if (!original) {
    throw new AccountingPostingError("REVERSAL_ORIGINAL_INVALID", "Posted journal was not found");
  }
  const priorReversal = await db.journalEntry.findFirst({
    where: {
      orgId: input.orgId,
      reversalOfId: original.id,
      status: { in: ["POSTED", "SUBMITTED"] },
    },
    select: { id: true },
  });
  if (priorReversal) {
    throw new AccountingPostingError("DUPLICATE_REVERSAL", "This journal already has an active reversal");
  }

  let reversalDate = input.requestedPostingDate
    ? postingDate(input.requestedPostingDate, "requestedPostingDate")
    : original.postingDate;
  if (original.accountingPeriod && original.accountingPeriod.status !== "OPEN") {
    const profile = await db.accountingOrganisationProfile.findUnique({ where: { orgId: input.orgId } });
    const policy = (profile?.correctionPolicy ?? {}) as { nextOpenPeriod?: boolean };
    if (!policy.nextOpenPeriod) {
      throw new AccountingPostingError(
        "CLOSED_PERIOD_CORRECTION_POLICY_REQUIRED",
        "Closed-period reversal requires an explicitly configured next-open-period policy",
      );
    }
    const nextOpen = await db.accountingPeriod.findFirst({
      where: { orgId: input.orgId, status: "OPEN", startDate: { gt: original.accountingPeriod.endDate } },
      orderBy: { startDate: "asc" },
    });
    if (!nextOpen) {
      throw new AccountingPostingError("NEXT_OPEN_PERIOD_NOT_FOUND", "No configured next open period is available");
    }
    reversalDate = nextOpen.startDate;
  }
  const transactionCurrencyCode =
    original.transactionCurrencyCode ?? original.functionalCurrencyCode;
  const baseCurrencyCode =
    original.baseCurrencyCode ?? original.functionalCurrencyCode;
  if (!transactionCurrencyCode || !baseCurrencyCode) {
    throw new AccountingPostingError(
      "REVERSAL_CURRENCY_EVIDENCE_REQUIRED",
      "Legacy journals without immutable currency evidence require an approved migration or correction workflow",
    );
  }
  let reversalExchangeRate: CanonicalPostingRequest["exchangeRate"] = null;
  if (transactionCurrencyCode !== baseCurrencyCode) {
    if (!original.exchangeRateId) {
      throw new AccountingPostingError(
        "REVERSAL_EXCHANGE_RATE_EVIDENCE_REQUIRED",
        "Foreign-currency reversal requires the original approved exchange-rate evidence",
      );
    }
    const rate = await db.accountingExchangeRate.findFirst({
      where: {
        id: original.exchangeRateId,
        orgId: input.orgId,
        status: "APPROVED",
      },
    });
    if (!rate) {
      throw new AccountingPostingError(
        "REVERSAL_EXCHANGE_RATE_EVIDENCE_INVALID",
        "The original approved exchange-rate evidence is unavailable",
      );
    }
    reversalExchangeRate = {
      id: rate.id,
      rate: rate.rate,
      source: rate.source,
      effectiveDate: rate.rateDate,
    };
  }

  return postCanonicalAccountingRequest({
    requestId: input.requestId,
    requestVersion: 1,
    idempotencyKey: input.idempotencyKey,
    orgId: input.orgId,
    legalEntityId: input.legalEntityId,
    source: {
      system: "ACCOUNTING",
      type: "JOURNAL_REVERSAL",
      id: original.id,
      version: original.rowVersion,
      occurredAt: await getNow(),
      payload: {
        originalJournalEntryId: original.id,
        originalRequestId: original.requestId,
        originalSourceSnapshotId: original.sourceSnapshotId,
        reason: input.reason,
      },
      approvedById: input.approval.approvedById,
      approvedAt: input.approval.approvedAt,
    },
    actor: input.actor,
    makerId: input.makerId,
    postingDate: reversalDate,
    documentDate: original.documentDate,
    journalType: "JOURNAL_ENTRY",
    ruleId: "GL-REVERSAL-v1",
    narration: `Reversal of ${original.voucherNo}: ${input.reason}`,
    branchId: original.branchId,
    transactionCurrencyCode,
    baseCurrencyCode,
    exchangeRate: reversalExchangeRate,
    approval: input.approval,
    numberSeriesId: input.numberSeriesId,
    roundingPolicy: input.roundingPolicy,
    lines: original.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      transactionDebit: line.transactionCredit ?? line.credit,
      transactionCredit: line.transactionDebit ?? line.debit,
      partyType: line.partyType,
      partyId: line.partyId,
      remarks: `Reversal of ${original.voucherNo}`,
      dimensions: line.accountingDimensions.map((dimension) => ({
        definitionId: dimension.definitionId,
        dimensionValueId: dimension.dimensionValueId,
      })),
    })),
    correlationId: input.correlationId,
    causationId: original.requestId ?? original.id,
    reversalOfId: original.id,
    reversalReason: input.reason,
    originalEffectiveDate: original.postingDate,
  });
}

export async function replaceCanonicalJournal(input: {
  originalJournalEntryId: string;
  request: CanonicalPostingRequest;
}) {
  const original = await db.journalEntry.findFirst({
    where: {
      id: input.originalJournalEntryId,
      orgId: input.request.orgId,
      legalEntityId: input.request.legalEntityId,
      status: { in: ["POSTED", "SUBMITTED"] },
    },
    select: {
      id: true,
      postingDate: true,
      requestId: true,
    },
  });
  if (!original) {
    throw new AccountingPostingError(
      "REPLACEMENT_ORIGINAL_INVALID",
      "Posted journal was not found for replacement",
    );
  }
  return postCanonicalAccountingRequest({
    ...input.request,
    replacementOfId: original.id,
    reversalOfId: null,
    originalEffectiveDate: original.postingDate,
    causationId: input.request.causationId ?? original.requestId ?? original.id,
  });
}
