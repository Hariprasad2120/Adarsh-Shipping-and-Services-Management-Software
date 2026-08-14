import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  attendancePunchFindUnique: vi.fn(),
  attendancePunchUpdate: vi.fn(),
  attendancePunchUpsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    attendancePunch: {
      findUnique: mocks.attendancePunchFindUnique,
      update: mocks.attendancePunchUpdate,
      upsert: mocks.attendancePunchUpsert,
    },
  },
}));

import { applyLeaveToAttendance, removeLeaveFromAttendance } from "../attendance-bridge";

describe("attendance reversal on cancellation (spec §19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removeLeaveFromAttendance clears status on a day that is still LEAVE with no real punches", async () => {
    mocks.attendancePunchFindUnique.mockResolvedValue({
      id: "punch-1", status: "LEAVE", inAt: null, outAt: null,
    });

    const result = await removeLeaveFromAttendance({
      userId: "user-1",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-01"),
    });

    expect(result.datesCleared).toBe(1);
    expect(mocks.attendancePunchUpdate).toHaveBeenCalledWith({
      where: { id: "punch-1" },
      data: { status: null },
    });
  });

  it("never overwrites a day that has real punch data (in/out), even if status happens to say LEAVE", async () => {
    // Defensive scenario: someone regularized the day after leave was
    // marked, so real punch times exist. The reversal must not touch it.
    mocks.attendancePunchFindUnique.mockResolvedValue({
      id: "punch-1", status: "LEAVE", inAt: new Date("2026-09-01T09:00:00Z"), outAt: new Date("2026-09-01T18:00:00Z"),
    });

    const result = await removeLeaveFromAttendance({
      userId: "user-1",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-01"),
    });

    expect(result.datesCleared).toBe(0);
    expect(mocks.attendancePunchUpdate).not.toHaveBeenCalled();
  });

  it("never touches a day whose status was changed to something other than LEAVE/HALF_DAY", async () => {
    // e.g. HR later marked the day ABSENT for an unrelated reason — the
    // leave cancellation must not clobber that decision.
    mocks.attendancePunchFindUnique.mockResolvedValue({
      id: "punch-1", status: "ABSENT", inAt: null, outAt: null,
    });

    const result = await removeLeaveFromAttendance({
      userId: "user-1",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-01"),
    });

    expect(result.datesCleared).toBe(0);
    expect(mocks.attendancePunchUpdate).not.toHaveBeenCalled();
  });

  it("applyLeaveToAttendance never overwrites a day with real punch data", async () => {
    mocks.attendancePunchFindUnique.mockResolvedValue({
      id: "punch-1", status: "PRESENT", inAt: new Date("2026-09-01T09:00:00Z"), outAt: null,
    });

    const result = await applyLeaveToAttendance({
      userId: "user-1",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-01"),
      halfDay: false,
    });

    expect(result.datesUpdated).toBe(0);
    expect(mocks.attendancePunchUpsert).not.toHaveBeenCalled();
  });

  it("applyLeaveToAttendance marks HALF_DAY (not LEAVE) when the request is a half-day", async () => {
    mocks.attendancePunchFindUnique.mockResolvedValue(null);

    await applyLeaveToAttendance({
      userId: "user-1",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-01"),
      halfDay: true,
    });

    expect(mocks.attendancePunchUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { status: "HALF_DAY" },
        create: expect.objectContaining({ status: "HALF_DAY" }),
      }),
    );
  });

  it("covers multi-day ranges (approve+cancel across a 3-day leave)", async () => {
    mocks.attendancePunchFindUnique.mockResolvedValue({
      id: "punch-x", status: "LEAVE", inAt: null, outAt: null,
    });

    const result = await removeLeaveFromAttendance({
      userId: "user-1",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-03"),
    });

    expect(result.datesCleared).toBe(3);
    expect(mocks.attendancePunchUpdate).toHaveBeenCalledTimes(3);
  });
});
