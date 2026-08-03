import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  addDecimalStrings,
  compareDecimalStrings,
  normalizeDecimalString,
  subtractDecimalStrings,
} from "@/modules/accounting/operational-helpers";
import { createPaymentEntry } from "@/modules/accounting/service";

type AdvanceRequestType = "CUSTOMER_ADVANCE" | "RETAINER_INVOICE";

export type CreateCustomerAdvanceRequestInput = {
  requestType: AdvanceRequestType;
  customerId: string;
  branchId?: string | null;
  postingDate: string | Date;
  dueDate?: string | Date | null;
  requestedAmount: string;
  currencyCode?: string | null;
  referenceNo?: string | null;
  remarks?: string | null;
};

export type CreateCustomerAdvanceReceiptDraftInput = {
  advanceId: string;
  amount?: string | null;
  postingDate?: string | Date | null;
  paidToAccountId?: string | null;
  referenceNo?: string | null;
  remarks?: string | null;
};

function optionalText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function parseDate(value: string | Date | null | undefined, field: string) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field.toUpperCase()}_INVALID`);
  }
  return parsed;
}

function normalizeAmount(value: string) {
  return normalizeDecimalString(String(value ?? ""), { maxScale: 4 });
}

function asDecimalString(value: Prisma.Decimal | string | number) {
  return typeof value === "string" ? value : value.toString();
}

function deriveCollectionState(input: {
  requestStatus: string;
  requestedAmount: string;
  coveredAmount: string;
}) {
  if (input.requestStatus === "CANCELLED") return "CANCELLED";
  const comparison = compareDecimalStrings(
    input.coveredAmount,
    input.requestedAmount,
  );
  if (comparison >= 0) return "FULLY_COVERED";
  if (compareDecimalStrings(input.coveredAmount, "0") > 0) {
    return "PARTIALLY_COVERED";
  }
  return "OPEN";
}

export async function listCustomerAdvanceRequests(
  orgId: string,
  branchId?: string | null,
) {
  const requests = await db.accountingCustomerAdvanceRequest.findMany({
    where: {
      orgId,
      ...(branchId ? { branchId } : {}),
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
      branch: {
        select: { id: true, name: true },
      },
      receipts: {
        orderBy: { createdAt: "desc" },
        include: {
          paymentEntry: {
            select: {
              id: true,
              postingDate: true,
              referenceNo: true,
              amount: true,
              createdAt: true,
            },
          },
        },
      },
    },
    orderBy: [{ postingDate: "desc" }, { createdAt: "desc" }],
  });

  const paymentEntryIds = requests.flatMap((request) =>
    request.receipts.map((receipt) => receipt.paymentEntryId),
  );
  const canonicalPayments = paymentEntryIds.length
    ? await db.accountingPayment.findMany({
        where: {
          orgId,
          legacyPaymentEntryId: { in: paymentEntryIds },
        },
        select: {
          id: true,
          legacyPaymentEntryId: true,
          status: true,
          amount: true,
          allocatedAmount: true,
          unappliedAmount: true,
          transactionDate: true,
        },
      })
    : [];

  const canonicalByLegacyId = new Map(
    canonicalPayments.flatMap((payment) =>
      payment.legacyPaymentEntryId
        ? [[payment.legacyPaymentEntryId, payment] as const]
        : [],
    ),
  );

  const rows = requests.map((request) => {
    let draftReceiptAmount = "0";
    let pendingApprovalReceiptAmount = "0";
    let postedReceiptAmount = "0";
    let reversedReceiptAmount = "0";
    let allocatedAmount = "0";
    let unappliedAmount = "0";

    const receipts = request.receipts.map((receipt) => {
      const canonicalPayment = canonicalByLegacyId.get(receipt.paymentEntryId) ?? null;
      const amount = asDecimalString(receipt.amount);
      if (!canonicalPayment) {
        draftReceiptAmount = addDecimalStrings(draftReceiptAmount, amount);
      } else if (canonicalPayment.status === "PENDING_APPROVAL") {
        pendingApprovalReceiptAmount = addDecimalStrings(
          pendingApprovalReceiptAmount,
          amount,
        );
        allocatedAmount = addDecimalStrings(
          allocatedAmount,
          asDecimalString(canonicalPayment.allocatedAmount),
        );
        unappliedAmount = addDecimalStrings(
          unappliedAmount,
          asDecimalString(canonicalPayment.unappliedAmount),
        );
      } else if (canonicalPayment.status === "POSTED") {
        postedReceiptAmount = addDecimalStrings(postedReceiptAmount, amount);
        allocatedAmount = addDecimalStrings(
          allocatedAmount,
          asDecimalString(canonicalPayment.allocatedAmount),
        );
        unappliedAmount = addDecimalStrings(
          unappliedAmount,
          asDecimalString(canonicalPayment.unappliedAmount),
        );
      } else if (["REVERSED", "REJECTED", "CANCELLED"].includes(canonicalPayment.status)) {
        reversedReceiptAmount = addDecimalStrings(reversedReceiptAmount, amount);
      }
      return {
        id: receipt.id,
        amount,
        createdAt: receipt.createdAt.toISOString(),
        paymentEntry: {
          id: receipt.paymentEntry.id,
          postingDate: receipt.paymentEntry.postingDate.toISOString(),
          referenceNo: receipt.paymentEntry.referenceNo,
          amount: asDecimalString(receipt.paymentEntry.amount),
          createdAt: receipt.paymentEntry.createdAt.toISOString(),
        },
        canonicalPayment: canonicalPayment
          ? {
              id: canonicalPayment.id,
              status: canonicalPayment.status,
              allocatedAmount: asDecimalString(canonicalPayment.allocatedAmount),
              unappliedAmount: asDecimalString(canonicalPayment.unappliedAmount),
              transactionDate: canonicalPayment.transactionDate.toISOString(),
            }
          : null,
      };
    });

    const coveredAmount = addDecimalStrings(
      draftReceiptAmount,
      pendingApprovalReceiptAmount,
      postedReceiptAmount,
    );
    const requestedAmount = asDecimalString(request.requestedAmount);
    const remainingAmount =
      compareDecimalStrings(coveredAmount, requestedAmount) >= 0
        ? "0"
        : subtractDecimalStrings(requestedAmount, coveredAmount);

    return {
      id: request.id,
      requestNumber: request.requestNumber,
      requestType: request.requestType,
      postingDate: request.postingDate.toISOString(),
      dueDate: request.dueDate?.toISOString() ?? null,
      requestedAmount,
      currencyCode: request.currencyCode,
      status: request.status,
      referenceNo: request.referenceNo,
      remarks: request.remarks,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      customer: request.customer,
      branch: request.branch,
      summary: {
        coveredAmount,
        draftReceiptAmount,
        pendingApprovalReceiptAmount,
        postedReceiptAmount,
        reversedReceiptAmount,
        allocatedAmount,
        unappliedAmount,
        remainingAmount,
        collectionState: deriveCollectionState({
          requestStatus: request.status,
          requestedAmount,
          coveredAmount,
        }),
      },
      receipts,
    };
  });

  const summary = {
    total: rows.length,
    open: rows.filter((row) => row.status === "OPEN").length,
    retainers: rows.filter((row) => row.requestType === "RETAINER_INVOICE").length,
    fullyCovered: rows.filter(
      (row) => row.summary.collectionState === "FULLY_COVERED",
    ).length,
    needsCollection: rows.filter(
      (row) =>
        row.status === "OPEN" &&
        row.summary.collectionState !== "FULLY_COVERED",
    ).length,
  };

  return { requests: rows, summary };
}

export async function createCustomerAdvanceRequest(
  orgId: string,
  actorId: string,
  input: CreateCustomerAdvanceRequestInput,
) {
  if (!["CUSTOMER_ADVANCE", "RETAINER_INVOICE"].includes(input.requestType)) {
    throw new Error("ADVANCE_REQUEST_TYPE_INVALID");
  }

  const postingDate = parseDate(input.postingDate, "posting_date");
  if (!postingDate) throw new Error("POSTING_DATE_REQUIRED");
  const dueDate = parseDate(input.dueDate, "due_date");
  if (dueDate && dueDate.getTime() < postingDate.getTime()) {
    throw new Error("ADVANCE_DUE_DATE_BEFORE_POSTING_DATE");
  }

  const requestedAmount = normalizeAmount(input.requestedAmount);
  if (compareDecimalStrings(requestedAmount, "0") <= 0) {
    throw new Error("ADVANCE_REQUEST_AMOUNT_INVALID");
  }

  const [customer, branch] = await Promise.all([
    db.crmAccount.findFirst({
      where: { orgId, id: input.customerId },
      select: { id: true },
    }),
    input.branchId
      ? db.branch.findFirst({
          where: { orgId, id: input.branchId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (!customer) throw new Error("ADVANCE_CUSTOMER_NOT_FOUND");
  if (input.branchId && !branch) throw new Error("ADVANCE_BRANCH_NOT_FOUND");

  const count = await db.accountingCustomerAdvanceRequest.count({
    where: { orgId, requestType: input.requestType },
  });
  const prefix = input.requestType === "RETAINER_INVOICE" ? "RET" : "ADV";

  return db.accountingCustomerAdvanceRequest.create({
    data: {
      orgId,
      branchId: input.branchId || null,
      customerId: input.customerId,
      requestNumber: `${prefix}-${1001 + count}`,
      requestType: input.requestType,
      postingDate,
      dueDate,
      requestedAmount: new Prisma.Decimal(requestedAmount),
      currencyCode: optionalText(input.currencyCode)?.toUpperCase() || "INR",
      referenceNo: optionalText(input.referenceNo),
      remarks: optionalText(input.remarks),
      createdById: actorId,
    },
  });
}

export async function createCustomerAdvanceReceiptDraft(
  orgId: string,
  actorId: string,
  input: CreateCustomerAdvanceReceiptDraftInput,
) {
  const request = await db.accountingCustomerAdvanceRequest.findFirst({
    where: { orgId, id: input.advanceId },
    include: {
      receipts: {
        include: {
          paymentEntry: {
            select: { id: true },
          },
        },
      },
    },
  });
  if (!request) throw new Error("ADVANCE_REQUEST_NOT_FOUND");
  if (request.status !== "OPEN") throw new Error("ADVANCE_REQUEST_NOT_OPEN");

  const current = await listCustomerAdvanceRequests(orgId);
  const currentRequest = current.requests.find((entry) => entry.id === request.id);
  if (!currentRequest) throw new Error("ADVANCE_REQUEST_NOT_FOUND");
  const fallbackAmount =
    compareDecimalStrings(currentRequest.summary.remainingAmount, "0") > 0
      ? currentRequest.summary.remainingAmount
      : currentRequest.requestedAmount;
  const amount = normalizeAmount(optionalText(input.amount) || fallbackAmount);
  if (compareDecimalStrings(amount, "0") <= 0) {
    throw new Error("ADVANCE_RECEIPT_AMOUNT_INVALID");
  }

  const settings = await db.accountingSettings.findUnique({
    where: { orgId },
    select: {
      defaultReceivableAccountId: true,
      defaultBankAccountId: true,
      defaultCashAccountId: true,
    },
  });
  const receivableAccountId = settings?.defaultReceivableAccountId
    ? settings.defaultReceivableAccountId
    : (
        await db.account.findFirst({
          where: {
            orgId,
            accountType: "RECEIVABLE",
            isActive: true,
            isGroup: false,
          },
          select: { id: true },
        })
      )?.id;
  if (!receivableAccountId) {
    throw new Error("ADVANCE_RECEIVABLE_ACCOUNT_NOT_CONFIGURED");
  }

  let paidToAccountId = optionalText(input.paidToAccountId);
  if (paidToAccountId) {
    const account = await db.account.findFirst({
      where: {
        orgId,
        id: paidToAccountId,
        isActive: true,
        isGroup: false,
        accountType: { in: ["BANK", "CASH"] },
      },
      select: { id: true },
    });
    if (!account) throw new Error("ADVANCE_RECEIPT_DESTINATION_ACCOUNT_INVALID");
  } else {
    paidToAccountId =
      settings?.defaultBankAccountId ||
      settings?.defaultCashAccountId ||
      (
        await db.account.findFirst({
          where: {
            orgId,
            isActive: true,
            isGroup: false,
            accountType: { in: ["BANK", "CASH"] },
          },
          orderBy: [{ accountType: "asc" }, { accountCode: "asc" }],
          select: { id: true },
        })
      )?.id ||
      null;
  }
  if (!paidToAccountId) {
    throw new Error("ADVANCE_RECEIPT_BANK_ACCOUNT_NOT_CONFIGURED");
  }

  const payment = await createPaymentEntry(orgId, actorId, {
    paymentType: "RECEIVE",
    postingDate: parseDate(input.postingDate, "posting_date") ?? request.postingDate,
    partyType: "CUSTOMER",
    partyId: request.customerId,
    paidFromAccountId: receivableAccountId,
    paidToAccountId,
    amount,
    referenceNo: optionalText(input.referenceNo) || request.referenceNo || request.requestNumber,
    remarks:
      optionalText(input.remarks) ||
      request.remarks ||
      `${request.requestType === "RETAINER_INVOICE" ? "Retainer" : "Advance"} receipt for ${request.requestNumber}`,
    branchId: request.branchId,
    submit: false,
    allocations: [],
  });

  await db.accountingCustomerAdvanceReceipt.create({
    data: {
      orgId,
      advanceId: request.id,
      paymentEntryId: payment.id,
      amount: new Prisma.Decimal(amount),
    },
  });

  return payment;
}

export async function cancelCustomerAdvanceRequest(
  orgId: string,
  advanceId: string,
) {
  const request = await db.accountingCustomerAdvanceRequest.findFirst({
    where: { orgId, id: advanceId },
    include: {
      receipts: {
        select: { id: true },
      },
    },
  });
  if (!request) throw new Error("ADVANCE_REQUEST_NOT_FOUND");
  if (request.receipts.length > 0) {
    throw new Error("ADVANCE_REQUEST_HAS_RECEIPTS");
  }
  return db.accountingCustomerAdvanceRequest.update({
    where: { id: request.id },
    data: { status: "CANCELLED" },
  });
}
