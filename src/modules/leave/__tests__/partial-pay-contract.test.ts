import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  payrollBatchFindUnique: vi.fn(),
  leavePartialPayRecordUpsert: vi.fn(),
  leavePartialPayRecordFindUnique: vi.fn(),
  leavePartialPayRecordDelete: vi.fn(),
  writeLeaveAudit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    payrollBatch: { findUnique: mocks.payrollBatchFindUnique },
    leavePartialPayRecord: {
      upsert: mocks.leavePartialPayRecordUpsert,
      findUnique: mocks.leavePartialPayRecordFindUnique,
      delete: mocks.leavePartialPayRecordDelete,
    },
  },
}));
vi.mock("@/modules/leave/audit", () => ({ writeLeaveAudit: mocks.writeLeaveAudit }));

import { applyPartialPayFromLeaveRequest, reversePartialPayFromLeaveRequest, PayrollLockedError } from "../payroll-bridge";

describe("applyPartialPayFromLeaveRequest (spec §17 structured payroll contract)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.payrollBatchFindUnique.mockResolvedValue(null);
    mocks.leavePartialPayRecordUpsert.mockImplementation(async ({ create }) => ({ id: "record-1", ...create }));
  });

  it("upserts a LeavePartialPayRecord with the exact slab breakdown, not a collapsed number", async () => {
    const result = await applyPartialPayFromLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-08-17"),
      requestId: "req-1",
      actorId: "actor-1",
      slabBreakdown: [
        { payPercentage: 50, units: 3 },
        { payPercentage: 25, units: 2 },
      ],
    });

    expect(result).not.toBeNull();
    expect(mocks.leavePartialPayRecordUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requestId: "req-1" },
        create: expect.objectContaining({
          slabBreakdown: [
            { payPercentage: 50, units: 3 },
            { payPercentage: 25, units: 2 },
          ],
        }),
      }),
    );
    const call = mocks.leavePartialPayRecordUpsert.mock.calls[0][0];
    expect((call.create.totalUnits as Prisma.Decimal).toString()).toBe("5");
  });

  it("does nothing for an empty slab breakdown", async () => {
    const result = await applyPartialPayFromLeaveRequest({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      fromDate: new Date("2026-08-17"),
      requestId: "req-1",
      actorId: "actor-1",
      slabBreakdown: [],
    });

    expect(result).toBeNull();
    expect(mocks.leavePartialPayRecordUpsert).not.toHaveBeenCalled();
  });

  it("refuses to write into a FINALIZED payroll month", async () => {
    mocks.payrollBatchFindUnique.mockResolvedValue({ status: "FINALIZED" });

    await expect(
      applyPartialPayFromLeaveRequest({
        orgId: "org-1",
        userId: "user-1",
        leaveTypeId: "lt-1",
        fromDate: new Date("2026-08-17"),
        requestId: "req-1",
        actorId: "actor-1",
        slabBreakdown: [{ payPercentage: 50, units: 3 }],
      }),
    ).rejects.toThrow(PayrollLockedError);
    expect(mocks.leavePartialPayRecordUpsert).not.toHaveBeenCalled();
  });
});

describe("reversePartialPayFromLeaveRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.payrollBatchFindUnique.mockResolvedValue(null);
  });

  it("deletes the record when one exists for the request", async () => {
    mocks.leavePartialPayRecordFindUnique.mockResolvedValue({ id: "record-1", requestId: "req-1" });

    const result = await reversePartialPayFromLeaveRequest({
      orgId: "org-1",
      requestId: "req-1",
      actorId: "actor-1",
      fromDate: new Date("2026-08-17"),
    });

    expect(result).not.toBeNull();
    expect(mocks.leavePartialPayRecordDelete).toHaveBeenCalledWith({ where: { requestId: "req-1" } });
  });

  it("is a no-op when no record exists for the request", async () => {
    mocks.leavePartialPayRecordFindUnique.mockResolvedValue(null);

    const result = await reversePartialPayFromLeaveRequest({
      orgId: "org-1",
      requestId: "req-1",
      actorId: "actor-1",
      fromDate: new Date("2026-08-17"),
    });

    expect(result).toBeNull();
    expect(mocks.leavePartialPayRecordDelete).not.toHaveBeenCalled();
  });

  it("refuses to reverse into a PAID payroll month", async () => {
    mocks.payrollBatchFindUnique.mockResolvedValue({ status: "PAID" });

    await expect(
      reversePartialPayFromLeaveRequest({
        orgId: "org-1",
        requestId: "req-1",
        actorId: "actor-1",
        fromDate: new Date("2026-08-17"),
      }),
    ).rejects.toThrow(PayrollLockedError);
  });
});
