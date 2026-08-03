import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  findFirstFilingPeriod: vi.fn(),
  updateFilingPeriod: vi.fn(),
  findFirstCloseRun: vi.fn(),
  countFilingPeriods: vi.fn(),
  findTransactionLock: vi.fn(),
  updateCloseRun: vi.fn(),
  getGSTR1SummaryMock: vi.fn(),
  getGSTR2BSummaryMock: vi.fn(),
  getConsolidatedGSTLedgerMock: vi.fn(),
  assertStatutoryReportAvailabilityMock: vi.fn(),
  createAuditLogMock: vi.fn(),
  getForeignExchangeReviewWorkspaceMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    accountingStatutoryFilingPeriod: {
      findFirst: mocks.findFirstFilingPeriod,
      update: mocks.updateFilingPeriod,
      count: mocks.countFilingPeriods,
    },
    accountingPeriodCloseRun: {
      findFirst: mocks.findFirstCloseRun,
      update: mocks.updateCloseRun,
    },
    transactionLock: {
      findUnique: mocks.findTransactionLock,
    },
  },
}));

vi.mock("../reports", () => ({
  getGSTR1Summary: mocks.getGSTR1SummaryMock,
  getGSTR2BSummary: mocks.getGSTR2BSummaryMock,
  getConsolidatedGSTLedger: mocks.getConsolidatedGSTLedgerMock,
}));

vi.mock("../tax-controls", () => ({
  assertStatutoryReportAvailability: mocks.assertStatutoryReportAvailabilityMock,
}));

vi.mock("../service", () => ({
  createAuditLog: mocks.createAuditLogMock,
}));

vi.mock("../foreign-exchange", () => ({
  getForeignExchangeReviewWorkspace: mocks.getForeignExchangeReviewWorkspaceMock,
}));

import {
  transitionAccountingPeriodCloseRun,
  transitionAccountingStatutoryFilingPeriod,
} from "../tax-settlement";

describe("Accounting tax settlement transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getForeignExchangeReviewWorkspaceMock.mockResolvedValue({
      summary: {
        unrealizedExposureCount: 0,
        realizedVarianceCount: 0,
      },
    });
  });

  it("marks a filing period ready only after report availability and snapshot resolution", async () => {
    mocks.findFirstFilingPeriod.mockResolvedValue({
      id: "filing_1",
      orgId: "org_1",
      taxRegistrationId: "reg_1",
      legalEntityId: "entity_1",
      returnType: "GSTR1",
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      status: "OPEN",
      acknowledgementRef: null,
      filedAt: null,
      filedById: null,
      configuration: null,
      rowVersion: 3,
    });
    mocks.getGSTR1SummaryMock.mockResolvedValue({
      total: { count: 4, taxableValue: "1000.00", taxAmount: "180.00" },
    });
    mocks.updateFilingPeriod.mockResolvedValue({
      id: "filing_1",
      status: "READY",
      acknowledgementRef: null,
      rowVersion: 4,
    });

    await transitionAccountingStatutoryFilingPeriod({
      orgId: "org_1",
      actorId: "user_1",
      filingPeriodId: "filing_1",
      expectedVersion: 3,
      nextStatus: "READY",
      reason: "reviewed",
    });

    expect(mocks.assertStatutoryReportAvailabilityMock).toHaveBeenCalled();
    expect(mocks.getGSTR1SummaryMock).toHaveBeenCalled();
    expect(mocks.updateFilingPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "filing_1" },
        data: expect.objectContaining({
          status: "READY",
          rowVersion: { increment: 1 },
          configuration: expect.objectContaining({
            lastReviewedById: "user_1",
            lastReviewedSnapshot: expect.objectContaining({
              reportType: "GSTR1",
              count: 4,
            }),
          }),
        }),
      }),
    );
  });

  it("requires an acknowledgement reference before filing a ready period", async () => {
    mocks.findFirstFilingPeriod.mockResolvedValue({
      id: "filing_2",
      orgId: "org_1",
      taxRegistrationId: "reg_1",
      legalEntityId: "entity_1",
      returnType: "GSTR2B",
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      status: "READY",
      acknowledgementRef: null,
      filedAt: null,
      filedById: null,
      configuration: {},
      rowVersion: 5,
    });

    await expect(
      transitionAccountingStatutoryFilingPeriod({
        orgId: "org_1",
        actorId: "user_1",
        filingPeriodId: "filing_2",
        expectedVersion: 5,
        nextStatus: "FILED",
      }),
    ).rejects.toThrow(/acknowledgement/i);
  });

  it("blocks period close when overlapping filing periods are still open", async () => {
    mocks.findFirstCloseRun.mockResolvedValue({
      id: "close_1",
      orgId: "org_1",
      legalEntityId: "entity_1",
      closeDate: new Date("2026-07-31"),
      status: "READY",
      checklist: null,
      reportBundle: null,
      closedAt: null,
      closedById: null,
      reopenedAt: null,
      reopenedById: null,
      rowVersion: 2,
      period: {
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-31"),
        name: "July 2026",
        periodNumber: 4,
      },
    });
    mocks.countFilingPeriods.mockResolvedValue(1);
    mocks.findTransactionLock.mockResolvedValue({
      lockDate: new Date("2026-07-31"),
    });

    await expect(
      transitionAccountingPeriodCloseRun({
        orgId: "org_1",
        actorId: "user_1",
        periodCloseRunId: "close_1",
        expectedVersion: 2,
        nextStatus: "CLOSED",
      }),
    ).rejects.toThrow(/filed or superseded/i);
  });

  it("blocks final close when FX exposure exists and no matching FX review snapshot was recorded", async () => {
    mocks.findFirstCloseRun.mockResolvedValue({
      id: "close_2",
      orgId: "org_1",
      legalEntityId: "entity_1",
      closeDate: new Date("2026-07-31"),
      status: "READY",
      checklist: null,
      reportBundle: null,
      closedAt: null,
      closedById: null,
      reopenedAt: null,
      reopenedById: null,
      rowVersion: 4,
      period: {
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-31"),
        name: "July 2026",
        periodNumber: 4,
      },
    });
    mocks.countFilingPeriods.mockResolvedValue(0);
    mocks.findTransactionLock.mockResolvedValue({
      lockDate: new Date("2026-07-31"),
    });
    mocks.getForeignExchangeReviewWorkspaceMock.mockResolvedValue({
      summary: {
        unrealizedExposureCount: 2,
        realizedVarianceCount: 1,
      },
    });

    await expect(
      transitionAccountingPeriodCloseRun({
        orgId: "org_1",
        actorId: "user_1",
        periodCloseRunId: "close_2",
        expectedVersion: 4,
        nextStatus: "CLOSED",
      }),
    ).rejects.toThrow(/FX review snapshot/i);
  });
});
