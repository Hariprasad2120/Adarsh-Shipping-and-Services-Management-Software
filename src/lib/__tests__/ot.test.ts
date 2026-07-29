import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    user: { findUnique: vi.fn() },
    workingCalendar: { upsert: vi.fn(), findUnique: vi.fn() },
    shift: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    shiftAssignment: { findFirst: vi.fn() },
    holiday: { findMany: vi.fn() },
    otSettings: { findUnique: vi.fn() },
    attendanceRegularization: { findUnique: vi.fn() },
    attendancePunchEvent: { findMany: vi.fn() },
    attendancePunch: { findUnique: vi.fn() },
    attendanceBreak: { findMany: vi.fn() },
    employmentRecord: { findUnique: vi.fn() },
    otRecord: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    workReportSettings: { findUnique: vi.fn() },
    workReport: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

import { calculateOtForPunch } from "@/lib/ot";

const attendanceDate = new Date(Date.UTC(2026, 6, 1, 0, 0, 0));
const assignedShift = {
  id: "shift-1",
  name: "General Shift 09:30 - 17:30",
  startTime: "09:30",
  endTime: "17:30",
  expectedWorkingMinutes: 480,
  graceBeforeStartMins: 0,
  graceAfterEndMins: 15,
  minOvertimeMinutes: 0,
  workingDays: "1,2,3,4,5,6",
  breakRules: [],
  isActive: true,
  isDefault: true,
};

function getUpsertCreatePayload() {
  return dbMock.otRecord.upsert.mock.calls.at(-1)?.[0]?.create as Record<
    string,
    unknown
  >;
}

beforeEach(() => {
  vi.clearAllMocks();

  dbMock.user.findUnique.mockResolvedValue({ orgId: "org-1" });
  dbMock.workingCalendar.upsert.mockResolvedValue({
    orgId: "org-1",
    workStart: "09:30",
    workEnd: "17:30",
    timezone: "Asia/Kolkata",
    graceMinutes: 15,
    graceBeforeStartMins: 0,
    graceAfterEndMins: 15,
    defaultWorkingMinutes: 480,
    minOvertimeMinutes: 0,
    workingDays: "1,2,3,4,5,6",
    breaks: [],
  });
  dbMock.workingCalendar.findUnique.mockResolvedValue({
    orgId: "org-1",
    workStart: "09:30",
    workEnd: "17:30",
    timezone: "Asia/Kolkata",
    graceMinutes: 15,
    graceBeforeStartMins: 0,
    graceAfterEndMins: 15,
    defaultWorkingMinutes: 480,
    minOvertimeMinutes: 0,
    workingDays: "1,2,3,4,5,6",
    breaks: [],
  });
  dbMock.shift.findMany.mockResolvedValue([{ id: "shift-1", isDefault: true }]);
  dbMock.shift.createMany.mockResolvedValue({ count: 0 });
  dbMock.shift.update.mockResolvedValue({ id: "shift-1", isDefault: true });
  dbMock.shift.findFirst.mockResolvedValue(assignedShift);
  dbMock.shiftAssignment.findFirst.mockResolvedValue({ shift: assignedShift });
  dbMock.holiday.findMany.mockResolvedValue([]);
  dbMock.otSettings.findUnique.mockResolvedValue({
    standardHours: 8,
    otRate: 1.5,
    graceMinutes: 15,
    compOffSlabs: [],
  });
  dbMock.attendanceRegularization.findUnique.mockResolvedValue(null);
  dbMock.attendancePunch.findUnique.mockResolvedValue(null);
  dbMock.attendanceBreak.findMany.mockResolvedValue([]);
  dbMock.employmentRecord.findUnique.mockResolvedValue({ ctc: 1200000 });
  dbMock.otRecord.findUnique.mockResolvedValue(null);
  dbMock.otRecord.upsert.mockResolvedValue({});
  dbMock.otRecord.deleteMany.mockResolvedValue({ count: 0 });
  dbMock.workReportSettings.findUnique.mockResolvedValue(null);
  dbMock.workReport.findFirst.mockResolvedValue(null);
});

describe("calculateOtForPunch", () => {
  it("marks single-punch days as missing check-out", async () => {
    dbMock.attendancePunchEvent.findMany.mockResolvedValue([
      {
        punchedAt: new Date(Date.UTC(2026, 6, 1, 4, 0, 0)),
        source: "biometric",
        eventType: "CHECK_IN",
        status: "VALID",
        notes: null,
        metadata: null,
      },
    ]);

    await calculateOtForPunch("user-1", attendanceDate);

    const payload = getUpsertCreatePayload();
    expect(payload.calculationStatus).toBe("MISSING_CHECK_OUT");
    expect(payload.totalPunchCount).toBe(1);
    expect(payload.otHours).toBe(0);
  });

  it("calculates OT from the full punch timeline and subtracts breaks", async () => {
    dbMock.attendancePunchEvent.findMany.mockResolvedValue([
      {
        punchedAt: new Date(Date.UTC(2026, 6, 1, 3, 50, 0)),
        source: "biometric",
        eventType: "CHECK_IN",
        status: "VALID",
        notes: null,
        metadata: null,
      },
      {
        punchedAt: new Date(Date.UTC(2026, 6, 1, 7, 30, 0)),
        source: "biometric",
        eventType: "BREAK_OUT",
        status: "VALID",
        notes: null,
        metadata: null,
      },
      {
        punchedAt: new Date(Date.UTC(2026, 6, 1, 7, 50, 0)),
        source: "biometric",
        eventType: "BREAK_IN",
        status: "VALID",
        notes: null,
        metadata: null,
      },
      {
        punchedAt: new Date(Date.UTC(2026, 6, 1, 13, 30, 0)),
        source: "biometric",
        eventType: "CHECK_OUT",
        status: "VALID",
        notes: null,
        metadata: null,
      },
    ]);

    await calculateOtForPunch("user-1", attendanceDate);

    const payload = getUpsertCreatePayload();
    expect(payload.workedMinutes).toBe(560);
    expect(payload.expectedMinutes).toBe(480);
    expect(payload.differenceMinutes).toBe(80);
    expect(payload.otHours).toBe(1.33);
    expect(payload.calculationStatus).toBe("VALID");
  });

  it("falls back to organisation hours when no shift is assigned", async () => {
    dbMock.shiftAssignment.findFirst.mockResolvedValue(null);
    dbMock.shift.findFirst.mockResolvedValue(null);
    dbMock.attendancePunchEvent.findMany.mockResolvedValue([
      {
        punchedAt: new Date(Date.UTC(2026, 6, 1, 4, 0, 0)),
        source: "mobile",
        eventType: "CHECK_IN",
        status: "VALID",
        notes: null,
        metadata: null,
      },
      {
        punchedAt: new Date(Date.UTC(2026, 6, 1, 12, 0, 0)),
        source: "mobile",
        eventType: "CHECK_OUT",
        status: "VALID",
        notes: null,
        metadata: null,
      },
    ]);

    await calculateOtForPunch("user-1", attendanceDate);

    const payload = getUpsertCreatePayload();
    expect(payload.usedOrgFallback).toBe(true);
    expect(payload.expectedMinutes).toBe(480);
    expect(payload.calculationStatus).toBe("NO_OVERTIME");
  });

  it("omits OT until the daily work report is approved when the gate is enabled", async () => {
    dbMock.workReportSettings.findUnique.mockResolvedValue({
      requireApprovedReportForOt: true,
    });
    dbMock.attendancePunchEvent.findMany.mockResolvedValue([
      {
        punchedAt: new Date(Date.UTC(2026, 6, 1, 3, 30, 0)),
        source: "biometric",
        eventType: "CHECK_IN",
        status: "VALID",
        notes: null,
        metadata: null,
      },
      {
        punchedAt: new Date(Date.UTC(2026, 6, 1, 13, 30, 0)),
        source: "biometric",
        eventType: "CHECK_OUT",
        status: "VALID",
        notes: null,
        metadata: null,
      },
    ]);

    await calculateOtForPunch("user-1", attendanceDate);

    const blockedPayload = getUpsertCreatePayload();
    expect(blockedPayload.calculationStatus).toBe("WORK_REPORT_REQUIRED");
    expect(blockedPayload.otHours).toBe(0);
    expect(blockedPayload.otAmount).toBe(0);

    dbMock.workReport.findFirst.mockResolvedValue({ id: "report-1" });
    await calculateOtForPunch("user-1", attendanceDate);

    const approvedPayload = getUpsertCreatePayload();
    expect(approvedPayload.calculationStatus).toBe("VALID");
    expect(approvedPayload.otHours).toBe(2);
    expect(approvedPayload.otAmount).toBeGreaterThan(0);
  });
});
