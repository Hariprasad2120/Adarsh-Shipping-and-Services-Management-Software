import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  organisationProfileFindUnique: vi.fn(),
  documentFindMany: vi.fn(),
  paymentAllocationFindMany: vi.fn(),
  closeRunFindMany: vi.fn(),
  closeRunFindFirst: vi.fn(),
  closeRunUpdate: vi.fn(),
  customerProfileFindMany: vi.fn(),
  vendorProfileFindMany: vi.fn(),
  exchangeRateFindMany: vi.fn(),
  accountControlFindMany: vi.fn(),
  journalEntryFindFirst: vi.fn(),
  createJournalEntryMock: vi.fn(),
  createAuditLogMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    accountingOrganisationProfile: {
      findUnique: mocks.organisationProfileFindUnique,
    },
    accountingDocument: {
      findMany: mocks.documentFindMany,
    },
    accountingPaymentAllocation: {
      findMany: mocks.paymentAllocationFindMany,
    },
    accountingPeriodCloseRun: {
      findMany: mocks.closeRunFindMany,
      findFirst: mocks.closeRunFindFirst,
      update: mocks.closeRunUpdate,
    },
    accountingCustomerProfile: {
      findMany: mocks.customerProfileFindMany,
    },
    accountingVendorProfile: {
      findMany: mocks.vendorProfileFindMany,
    },
    accountingExchangeRate: {
      findMany: mocks.exchangeRateFindMany,
    },
    accountingAccountControl: {
      findMany: mocks.accountControlFindMany,
    },
    journalEntry: {
      findFirst: mocks.journalEntryFindFirst,
    },
  },
}));

vi.mock("../service", () => ({
  createJournalEntry: mocks.createJournalEntryMock,
  createAuditLog: mocks.createAuditLogMock,
}));

import { createForeignExchangeRevaluationDraft } from "../foreign-exchange";

describe("Foreign exchange revaluation drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.closeRunFindFirst.mockResolvedValue({
      id: "close_1",
      orgId: "org_1",
      legalEntityId: "entity_1",
      closeDate: new Date("2026-07-31T00:00:00.000Z"),
      status: "READY",
      reportBundle: {
        fxReview: { asOfDate: "2026-07-31" },
      },
      rowVersion: 4,
      legalEntity: { code: "LE1", legalName: "Legal Entity 1" },
      period: { periodNumber: 4, name: "July 2026" },
    });
    mocks.journalEntryFindFirst.mockResolvedValue(null);
    mocks.organisationProfileFindUnique.mockResolvedValue({
      functionalCurrencyCode: "INR",
    });
    mocks.documentFindMany.mockResolvedValue([
      {
        id: "doc_1",
        documentType: "SALES_INVOICE",
        counterpartyType: "CUSTOMER",
        counterpartyId: "cust_1",
        transactionCurrencyCode: "USD",
        baseCurrencyCode: "INR",
        exchangeRateId: "rate_hist_1",
        totalAmount: "100.00",
        postingDate: new Date("2026-07-15T00:00:00.000Z"),
        cancelledAt: null,
        legalEntity: { code: "LE1", legalName: "Legal Entity 1" },
        paymentTargets: [],
      },
    ]);
    mocks.paymentAllocationFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.closeRunFindMany.mockResolvedValue([
      {
        id: "close_1",
        rowVersion: 4,
        closeDate: new Date("2026-07-31T00:00:00.000Z"),
        status: "READY",
        reportBundle: { fxReview: { asOfDate: "2026-07-31" } },
        legalEntity: { code: "LE1", legalName: "Legal Entity 1" },
        period: { periodNumber: 4, name: "July 2026" },
      },
    ]);
    mocks.customerProfileFindMany
      .mockResolvedValueOnce([
        { crmAccountId: "cust_1", receivableAccountId: "acc_receivable_1" },
      ])
      .mockResolvedValueOnce([
        { crmAccountId: "cust_1", receivableAccountId: "acc_receivable_1" },
      ]);
    mocks.vendorProfileFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.exchangeRateFindMany
      .mockResolvedValueOnce([
        {
          id: "rate_hist_1",
          rate: "80.00",
          rateDate: new Date("2026-07-15T00:00:00.000Z"),
          source: "BOOKED",
          fromCurrency: { code: "USD" },
          toCurrency: { code: "INR" },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "rate_curr_1",
          rate: "82.00",
          rateDate: new Date("2026-07-31T00:00:00.000Z"),
          source: "APPROVED",
          fromCurrency: { code: "USD" },
          toCurrency: { code: "INR" },
        },
      ]);
    mocks.accountControlFindMany.mockResolvedValue([
      {
        systemRole: "FX_UNREALIZED_GAIN",
        account: {
          id: "acc_fx_unrealized_gain",
          accountName: "FX Unrealized Gain",
          isActive: true,
          isGroup: false,
        },
      },
      {
        systemRole: "FX_UNREALIZED_LOSS",
        account: {
          id: "acc_fx_unrealized_loss",
          accountName: "FX Unrealized Loss",
          isActive: true,
          isGroup: false,
        },
      },
      {
        systemRole: "FX_REALIZED_GAIN",
        account: {
          id: "acc_fx_realized_gain",
          accountName: "FX Realized Gain",
          isActive: true,
          isGroup: false,
        },
      },
      {
        systemRole: "FX_REALIZED_LOSS",
        account: {
          id: "acc_fx_realized_loss",
          accountName: "FX Realized Loss",
          isActive: true,
          isGroup: false,
        },
      },
    ]);
    mocks.createJournalEntryMock.mockResolvedValue({
      id: "jv_1",
      status: "DRAFT",
    });
    mocks.closeRunUpdate.mockResolvedValue({
      id: "close_1",
      status: "READY",
      rowVersion: 5,
    });
  });

  it("creates a draft revaluation journal for unrealized FX exposure", async () => {
    const result = await createForeignExchangeRevaluationDraft({
      orgId: "org_1",
      actorId: "user_1",
      periodCloseRunId: "close_1",
      expectedVersion: 4,
    });

    expect(mocks.createJournalEntryMock).toHaveBeenCalledWith(
      "org_1",
      "user_1",
      expect.objectContaining({
        branchId: null,
        postingDate: "2026-07-31T00:00:00.000Z",
        remarks: "FX revaluation review LE1 July 2026 P4",
        lines: [
          {
            accountId: "acc_receivable_1",
            debit: "200.00000000",
            credit: "0",
            partyType: "CUSTOMER",
            partyId: "cust_1",
            remarks: "Unrealized FX review SALES_INVOICE",
          },
          {
            accountId: "acc_fx_unrealized_gain",
            debit: "0",
            credit: "200.00000000",
            remarks: "Unrealized FX review SALES_INVOICE",
          },
        ],
      }),
    );
    expect(mocks.closeRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "close_1" },
        data: expect.objectContaining({
          rowVersion: { increment: 1 },
          reportBundle: expect.objectContaining({
            fxReviewJournalDraftId: "jv_1",
            fxReviewJournalDraftStatus: "DRAFT",
          }),
        }),
      }),
    );
    expect(result.draft.id).toBe("jv_1");
  });

  it("blocks draft creation when FX posting accounts are not fully configured", async () => {
    mocks.accountControlFindMany.mockResolvedValue([
      {
        systemRole: "FX_UNREALIZED_GAIN",
        account: {
          id: "acc_fx_unrealized_gain",
          accountName: "FX Unrealized Gain",
          isActive: true,
          isGroup: false,
        },
      },
    ]);

    await expect(
      createForeignExchangeRevaluationDraft({
        orgId: "org_1",
        actorId: "user_1",
        periodCloseRunId: "close_1",
        expectedVersion: 4,
      }),
    ).rejects.toThrow(/FX_POSTING_ACCOUNT_REQUIRED:FX_UNREALIZED_LOSS/);
  });
});
