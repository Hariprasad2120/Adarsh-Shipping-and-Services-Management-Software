import { describe, expect, it } from "vitest";

import {
  depreciationRunIdentity,
  normalizeAccountingDocumentContract,
  normalizeAccountingPaymentContract,
  normalizePayrollCorrection,
  payrollPaymentIdentity,
  recurringOccurrenceIdentity,
} from "../document-contracts";

const documentBase = {
  orgId: "org",
  legalEntityId: "legal",
  sourceSystem: "ACCOUNTING",
  sourceType: "SALES_INVOICE",
  sourceId: "invoice-1",
  sourceVersion: 1,
  makerId: "maker",
  correlationId: "correlation",
  documentType: "SALES_INVOICE",
  documentDate: "2027-04-01",
  postingDate: "2027-04-01",
  dueDate: "2027-04-30",
  counterpartyType: "CUSTOMER" as const,
  counterpartyId: "customer",
  transactionCurrencyCode: "INR",
  baseCurrencyCode: "INR",
  policyId: "document-policy",
  policyVersion: 1,
  approvalPolicyId: "approval-policy",
  approvalPolicyVersion: 1,
  numberSeriesId: "number-series",
  roundingPolicyId: "rounding-policy",
  roundingPolicyVersion: 1,
  lines: [
    {
      description: "Service",
      quantity: "3",
      unitAmount: "0.10",
      discountAmount: "0.10",
      taxAmount: "0",
      accountId: "revenue",
    },
  ],
};

const paymentBase = {
  orgId: "org",
  legalEntityId: "legal",
  sourceSystem: "ACCOUNTING",
  sourceType: "CUSTOMER_RECEIPT",
  sourceId: "receipt-1",
  sourceVersion: 1,
  makerId: "maker",
  correlationId: "correlation",
  paymentType: "CUSTOMER_RECEIPT" as const,
  payerPayeeType: "CUSTOMER" as const,
  payerPayeeId: "customer",
  bankOrCashAccountId: "bank",
  controlAccountId: "receivable",
  transactionDate: "2027-04-01",
  transactionCurrencyCode: "INR",
  baseCurrencyCode: "INR",
  amount: "100.00",
  unappliedAmount: "25.00",
  paymentMethod: "BANK_TRANSFER",
  policyId: "payment-policy",
  policyVersion: 1,
  allocations: [
    {
      targetDocumentId: "invoice",
      targetVersion: 1,
      targetCurrencyCode: "INR",
      eligibleOpenAmount: "100.00",
      amount: "75.00",
    },
  ],
};

describe("Phase 4 Accounting document contract", () => {
  it("calculates exact Decimal totals without floating-point drift", () => {
    const contract = normalizeAccountingDocumentContract(documentBase);
    expect(contract.subtotal).toBe("0.3");
    expect(contract.discountAmount).toBe("0.1");
    expect(contract.totalAmount).toBe("0.2");
  });

  it("produces the same immutable hash for the same snapshot", () => {
    const first = normalizeAccountingDocumentContract(documentBase);
    const second = normalizeAccountingDocumentContract({
      ...documentBase,
      lines: documentBase.lines.map((line) => ({ ...line })),
    });
    expect(second.payloadHash).toBe(first.payloadHash);
  });

  it("rejects JavaScript-number money", () => {
    expect(() =>
      normalizeAccountingDocumentContract({
        ...documentBase,
        lines: [{ ...documentBase.lines[0], unitAmount: 0.1 as never }],
      }),
    ).toThrow(/JavaScript number is not accepted/);
  });

  it("requires a configured tax category for tax", () => {
    expect(() =>
      normalizeAccountingDocumentContract({
        ...documentBase,
        lines: [{ ...documentBase.lines[0], taxAmount: "0.02" }],
      }),
    ).toThrow(/tax-category reference/);
  });

  it("requires approved FX evidence for foreign currency", () => {
    expect(() =>
      normalizeAccountingDocumentContract({
        ...documentBase,
        transactionCurrencyCode: "USD",
      }),
    ).toThrow(/exchange-rate evidence/);
  });

  it("rejects duplicate dimension definitions", () => {
    expect(() =>
      normalizeAccountingDocumentContract({
        ...documentBase,
        lines: [
          {
            ...documentBase.lines[0],
            dimensions: [
              { definitionId: "job", dimensionValueId: "job-1" },
              { definitionId: "job", dimensionValueId: "job-2" },
            ],
          },
        ],
      }),
    ).toThrow(/assigned more than once/);
  });
});

describe("Phase 4 Accounting payment contract", () => {
  it("accepts exact allocation plus unapplied equality", () => {
    const contract = normalizeAccountingPaymentContract(paymentBase);
    expect(contract.allocatedAmount).toBe("75");
    expect(contract.unappliedAmount).toBe("25");
    expect(contract.amount).toBe("100");
  });

  it("rejects allocation equality drift", () => {
    expect(() =>
      normalizeAccountingPaymentContract({
        ...paymentBase,
        unappliedAmount: "24.99",
      }),
    ).toThrow(/must equal the payment amount exactly/);
  });

  it("rejects over-allocation against eligible open balance", () => {
    expect(() =>
      normalizeAccountingPaymentContract({
        ...paymentBase,
        allocations: [
          {
            ...paymentBase.allocations[0],
            eligibleOpenAmount: "74.99",
          },
        ],
      }),
    ).toThrow(/exceeds the eligible open balance/);
  });

  it("rejects currency mismatch without configured treatment", () => {
    expect(() =>
      normalizeAccountingPaymentContract({
        ...paymentBase,
        allocations: [
          {
            ...paymentBase.allocations[0],
            targetCurrencyCode: "USD",
          },
        ],
      }),
    ).toThrow(/Currency-mismatched allocation/);
  });

  it("produces a deterministic source hash", () => {
    expect(normalizeAccountingPaymentContract(paymentBase).payloadHash).toBe(
      normalizeAccountingPaymentContract(paymentBase).payloadHash,
    );
  });
});

describe("Phase 4 producer identities", () => {
  it("builds a versioned payroll-payment identity", () => {
    expect(
      payrollPaymentIdentity({
        runId: "run",
        runVersion: 2,
        instructionId: "instruction",
        instructionVersion: 3,
      }),
    ).toBe("HRMS:PAYROLL_RUN:run:2:PAYMENT:instruction:3");
  });

  it("requires balanced approved payroll correction totals", () => {
    expect(() =>
      normalizePayrollCorrection({
        orgId: "org",
        legalEntityId: "legal",
        originalRunId: "run",
        originalRunVersion: 1,
        correctionId: "correction",
        correctionVersion: 1,
        approvedById: "approver",
        approvedAt: "2027-04-01",
        mode: "DELTA",
        totalDebit: "10",
        totalCredit: "9",
        reasonCode: "APPROVED_DELTA",
      }),
    ).toThrow(/exactly balanced/);
  });

  it("builds a deterministic recurring occurrence identity", () => {
    expect(
      recurringOccurrenceIdentity({
        templateType: "RECURRING_JOURNAL",
        templateId: "template",
        templateVersion: 4,
        scheduledFor: "2027-04-30",
      }),
    ).toBe("ACCOUNTING:RECURRING_JOURNAL:template:V4:2027-04-30");
  });

  it("builds a deterministic depreciation-run identity", () => {
    expect(
      depreciationRunIdentity({
        assetId: "asset",
        bookId: "companies-act",
        periodId: "period",
        runVersion: 2,
      }),
    ).toBe("AMS:ASSET:asset:BOOK:companies-act:PERIOD:period:RUN:2");
  });
});
