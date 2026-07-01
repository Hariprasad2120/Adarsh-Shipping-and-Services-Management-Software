/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { isWorkingDate, calendarFromDb } from "@/lib/working-hours";
import {
  getAttendanceMonthBounds,
  toAttendanceDate as normalizeToISTMidnight,
  toAttendanceDateString as toDateString,
} from "@/lib/attendance-date";

export interface CompOffSlab {
  minHours: number;
  compOffDays: number;
}

export const DEFAULT_COMPOFF_SLABS: CompOffSlab[] = [
  { minHours: 4, compOffDays: 0.5 },
  { minHours: 8, compOffDays: 1.0 },
  { minHours: 11, compOffDays: 1.5 },
];

export const DEFAULT_OT_SETTINGS = {
  standardHours: 8.0,
  otRate: 1.5,
  graceMinutes: 15,
  compOffSlabs: DEFAULT_COMPOFF_SLABS,
};

export { normalizeToISTMidnight, toDateString };

type CalendarSettings = {
  workStart: string;
  workEnd: string;
  timezone: string;
  graceMinutes: number;
  graceBeforeStartMins: number;
  graceAfterEndMins: number;
  defaultWorkingMinutes: number;
  minOvertimeMinutes: number;
  workingDays: string;
  breaks: Array<{ start: string; end: string }>;
};

type ShiftSettings = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  expectedWorkingMinutes: number;
  graceBeforeStartMins: number;
  graceAfterEndMins: number;
  minOvertimeMinutes: number;
  workingDays: string;
  breakRules: Array<{ start: string; end: string }>;
  isDefault: boolean;
};

type TimelineEvent = {
  punchedAt: Date;
  source: string;
  eventType: string;
  status: string | null;
  notes: string | null;
  metadata: unknown;
};

type TimelineSummary = {
  events: TimelineEvent[];
  firstPunchAt: Date | null;
  lastPunchAt: Date | null;
  totalPunchCount: number;
  breakMinutes: number;
  needsReview: boolean;
  reviewNotes: string[];
  workedMinutes: number;
  source: "raw-events" | "synthetic-punch";
};

type OvertimeComputation = {
  dayType: "WORKING_DAY" | "HOLIDAY" | "WEEKEND";
  shift: ShiftSettings | null;
  usedOrgFallback: boolean;
  firstPunchAt: Date | null;
  lastPunchAt: Date | null;
  totalPunchCount: number;
  workedMinutes: number;
  hoursWorked: number;
  expectedMinutes: number;
  differenceMinutes: number;
  otMinutes: number;
  otHours: number;
  otRatePerHour: number;
  otAmount: number;
  compOffDays: number;
  earlyLeavingMins: number;
  calculationStatus:
    | "VALID"
    | "MISSING_CHECK_IN"
    | "MISSING_CHECK_OUT"
    | "INSUFFICIENT_PUNCHES"
    | "NEEDS_REVIEW"
    | "NO_OVERTIME"
    | "MISSING_CONFIGURATION";
  calculationRemarks: string | null;
  calculationDetails: Record<string, unknown>;
};

type PersistedApprovalState = {
  approvalStatus: string;
  approvedById: string | null;
  rejectionRemarks: string | null;
};

type PunchEventInput = {
  punchedAt: Date;
  source: string;
  eventType: string;
  status?: string | null;
  notes?: string | null;
  deviceId?: string | null;
  metadata?: unknown;
};

function roundHours(minutes: number): number {
  return Number((minutes / 60).toFixed(2));
}

function parseClock(clock: string): [number, number] {
  const [hours, minutes] = clock.split(":").map(Number);
  return [hours ?? 0, minutes ?? 0];
}

function startOfShiftOnDate(attendanceDate: Date, clock: string): Date {
  const [hours, minutes] = parseClock(clock);
  return new Date(Date.UTC(
    attendanceDate.getUTCFullYear(),
    attendanceDate.getUTCMonth(),
    attendanceDate.getUTCDate(),
    hours,
    minutes,
    0,
    0,
  ));
}

function endOfShiftOnDate(attendanceDate: Date, startClock: string, endClock: string): Date {
  const start = startOfShiftOnDate(attendanceDate, startClock);
  const end = startOfShiftOnDate(attendanceDate, endClock);
  if (end.getTime() <= start.getTime()) {
    end.setUTCDate(end.getUTCDate() + 1);
  }
  return end;
}

function normalizeBreaks(value: unknown): Array<{ start: string; end: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const start = typeof (item as any).start === "string" ? (item as any).start : null;
      const end = typeof (item as any).end === "string" ? (item as any).end : null;
      return start && end ? { start, end } : null;
    })
    .filter((item): item is { start: string; end: string } => Boolean(item));
}

function pickCompOffDays(hoursWorked: number, slabs: CompOffSlab[]): number {
  const matched = [...slabs]
    .filter((slab) => hoursWorked >= slab.minHours)
    .sort((left, right) => right.minHours - left.minHours)[0];
  return matched?.compOffDays ?? 0;
}

function normalizeEventType(eventType: string): string {
  const value = eventType.toUpperCase();
  if (value === "START_BREAK") return "BREAK_OUT";
  if (value === "RESUME_WORK") return "BREAK_IN";
  return value;
}

function dedupeEvents(events: TimelineEvent[]): TimelineEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = [
      event.punchedAt.toISOString(),
      normalizeEventType(event.eventType),
      event.source.toLowerCase(),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isBreakOut(eventType: string): boolean {
  return normalizeEventType(eventType) === "BREAK_OUT";
}

function isBreakIn(eventType: string): boolean {
  return normalizeEventType(eventType) === "BREAK_IN";
}

async function getCalendarSettings(orgId: string): Promise<CalendarSettings> {
  const record = await db.workingCalendar.findUnique({ where: { orgId } });
  return {
    workStart: record?.workStart ?? "09:30",
    workEnd: record?.workEnd ?? "17:30",
    timezone: record?.timezone ?? "Asia/Kolkata",
    graceMinutes: record?.graceMinutes ?? 15,
    graceBeforeStartMins: record?.graceBeforeStartMins ?? 0,
    graceAfterEndMins: record?.graceAfterEndMins ?? record?.graceMinutes ?? 15,
    defaultWorkingMinutes: record?.defaultWorkingMinutes ?? 480,
    minOvertimeMinutes: record?.minOvertimeMinutes ?? 0,
    workingDays: record?.workingDays ?? "1,2,3,4,5,6",
    breaks: normalizeBreaks(record?.breaks),
  };
}

async function getHolidayDateStrings(orgId: string, attendanceDate: Date): Promise<string[]> {
  const { start, end } = getAttendanceMonthBounds(
    attendanceDate.getUTCFullYear(),
    attendanceDate.getUTCMonth() + 1,
  );
  const holidays = await db.holiday.findMany({
    where: {
      orgId,
      date: { gte: start, lte: end },
    },
    select: { date: true },
  });
  return holidays.map((holiday) => toDateString(holiday.date));
}

async function resolveShiftForDate(userId: string, orgId: string, attendanceDate: Date): Promise<ShiftSettings | null> {
  const assignment = await db.shiftAssignment.findFirst({
    where: {
      userId,
      startDate: { lte: attendanceDate },
      OR: [{ endDate: null }, { endDate: { gte: attendanceDate } }],
      shift: { orgId, isActive: true },
    },
    include: { shift: true },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });

  const shiftRecord = assignment?.shift ?? await db.shift.findFirst({
    where: { orgId, isActive: true, isDefault: true },
    orderBy: { createdAt: "asc" },
  });

  if (!shiftRecord) return null;
  return {
    id: shiftRecord.id,
    name: shiftRecord.name,
    startTime: shiftRecord.startTime,
    endTime: shiftRecord.endTime,
    expectedWorkingMinutes: shiftRecord.expectedWorkingMinutes,
    graceBeforeStartMins: shiftRecord.graceBeforeStartMins,
    graceAfterEndMins: shiftRecord.graceAfterEndMins,
    minOvertimeMinutes: shiftRecord.minOvertimeMinutes,
    workingDays: shiftRecord.workingDays,
    breakRules: normalizeBreaks(shiftRecord.breakRules),
    isDefault: shiftRecord.isDefault,
  };
}

async function getPersistedApprovalState(userId: string, attendanceDate: Date): Promise<PersistedApprovalState> {
  const record = await db.otRecord.findUnique({
    where: { userId_date: { userId, date: attendanceDate } },
    select: {
      approvalStatus: true,
      approvedById: true,
      rejectionRemarks: true,
    },
  });

  return {
    approvalStatus: record?.approvalStatus ?? "PENDING",
    approvedById: record?.approvedById ?? null,
    rejectionRemarks: record?.rejectionRemarks ?? null,
  };
}

async function getFallbackSummary(userId: string, attendanceDate: Date) {
  const punch = await db.attendancePunch.findUnique({
    where: { userId_date: { userId, date: attendanceDate } },
    select: {
      id: true,
      inAt: true,
      outAt: true,
      source: true,
      workingHours: true,
    },
  });

  if (!punch) return null;

  const breaks = punch.id
    ? await db.attendanceBreak.findMany({
        where: { punchId: punch.id },
        orderBy: { breakStart: "asc" },
      })
    : [];

  return { punch, breaks };
}

async function getTimelineSummary(userId: string, orgId: string, attendanceDate: Date): Promise<TimelineSummary | null> {
  const rawEvents = await db.attendancePunchEvent.findMany({
    where: { userId, orgId, attendanceDate },
    orderBy: { punchedAt: "asc" },
  });

  if (rawEvents.length > 0) {
    const events = dedupeEvents(rawEvents.map((event) => ({
      punchedAt: event.punchedAt,
      source: event.source,
      eventType: event.eventType,
      status: event.status,
      notes: event.notes,
      metadata: event.metadata,
    })));

    return summarizeTimeline(events, "raw-events");
  }

  const fallback = await getFallbackSummary(userId, attendanceDate);
  if (!fallback?.punch) return null;

  const syntheticEvents: TimelineEvent[] = [];
  if (fallback.punch.inAt) {
    syntheticEvents.push({
      punchedAt: fallback.punch.inAt,
      source: fallback.punch.source,
      eventType: "CHECK_IN",
      status: "VALID",
      notes: "Synthesized from legacy attendance summary row.",
      metadata: { synthetic: true },
    });
  }
  for (const attendanceBreak of fallback.breaks) {
    syntheticEvents.push({
      punchedAt: attendanceBreak.breakStart,
      source: fallback.punch.source,
      eventType: "BREAK_OUT",
      status: "VALID",
      notes: "Synthesized from stored break interval.",
      metadata: { synthetic: true },
    });
    if (attendanceBreak.breakEnd) {
      syntheticEvents.push({
        punchedAt: attendanceBreak.breakEnd,
        source: fallback.punch.source,
        eventType: "BREAK_IN",
        status: "VALID",
        notes: "Synthesized from stored break interval.",
        metadata: { synthetic: true },
      });
    }
  }
  if (fallback.punch.outAt) {
    syntheticEvents.push({
      punchedAt: fallback.punch.outAt,
      source: fallback.punch.source,
      eventType: "CHECK_OUT",
      status: "VALID",
      notes: "Synthesized from legacy attendance summary row.",
      metadata: { synthetic: true },
    });
  }

  const summary = summarizeTimeline(syntheticEvents, "synthetic-punch");
  if (summary && summary.workedMinutes === 0 && fallback.punch.workingHours && fallback.punch.workingHours > 0) {
    summary.workedMinutes = Math.round(fallback.punch.workingHours * 60);
  }
  return summary;
}

function summarizeTimeline(events: TimelineEvent[], source: TimelineSummary["source"]): TimelineSummary | null {
  if (events.length === 0) return null;

  const orderedEvents = [...events].sort((left, right) => left.punchedAt.getTime() - right.punchedAt.getTime());
  const firstPunchAt = orderedEvents[0]?.punchedAt ?? null;
  const lastPunchAt = orderedEvents[orderedEvents.length - 1]?.punchedAt ?? null;
  const reviewNotes: string[] = [];
  let breakMinutes = 0;
  let breakStartedAt: Date | null = null;

  for (const event of orderedEvents) {
    if (isBreakOut(event.eventType)) {
      if (breakStartedAt) {
        reviewNotes.push("Consecutive break-out punches detected.");
      }
      breakStartedAt = event.punchedAt;
      continue;
    }

    if (isBreakIn(event.eventType)) {
      if (!breakStartedAt) {
        reviewNotes.push("Break-in punch detected without a matching break-out.");
        continue;
      }

      breakMinutes += Math.max(0, Math.round((event.punchedAt.getTime() - breakStartedAt.getTime()) / 60000));
      breakStartedAt = null;
    }
  }

  if (breakStartedAt) {
    reviewNotes.push("Break-out punch has no matching break-in.");
  }

  const spanMinutes = firstPunchAt && lastPunchAt
    ? Math.max(0, Math.round((lastPunchAt.getTime() - firstPunchAt.getTime()) / 60000))
    : 0;

  return {
    events: orderedEvents,
    firstPunchAt,
    lastPunchAt,
    totalPunchCount: orderedEvents.length,
    breakMinutes,
    needsReview: reviewNotes.length > 0,
    reviewNotes,
    workedMinutes: Math.max(0, spanMinutes - breakMinutes),
    source,
  };
}

function countWorkingDaysInMonth(year: number, month: number, calendarConfig: any): number {
  const lastDay = new Date(year, month, 0).getDate();
  let total = 0;

  for (let day = 1; day <= lastDay; day++) {
    const current = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dateKey = toDateString(current);
    if (isWorkingDate(dateKey, calendarConfig)) total++;
  }

  return total || 24;
}

export { countWorkingDaysInMonth };

export async function getEmployeeMinuteSalary(
  userId: string,
  date: Date,
  settings: typeof DEFAULT_OT_SETTINGS,
): Promise<number> {
  const empRecord = await db.employmentRecord.findUnique({
    where: { userId },
    select: { ctc: true },
  });

  const annualCtc = empRecord?.ctc;
  if (!annualCtc || annualCtc <= 0) return 100 / 60;

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthlyGross = annualCtc / 12;
  const dailySalary = monthlyGross / daysInMonth;
  const minuteSalary = dailySalary / (settings.standardHours * 60);

  return Number(minuteSalary.toFixed(4));
}

export async function getEmployeeHourlyOtRate(
  userId: string,
  date: Date,
  settings: typeof DEFAULT_OT_SETTINGS,
  _calendarConfig: any,
): Promise<number> {
  const minuteSalary = await getEmployeeMinuteSalary(userId, date, settings);
  return Number((minuteSalary * 60).toFixed(2));
}

async function computeOvertimeForDate(userId: string, orgId: string, attendanceDate: Date): Promise<OvertimeComputation | null> {
  const [timeline, calendarSettings, holidayDateStrings, otSettings, shift, regularization] = await Promise.all([
    getTimelineSummary(userId, orgId, attendanceDate),
    getCalendarSettings(orgId),
    getHolidayDateStrings(orgId, attendanceDate),
    db.otSettings.findUnique({ where: { orgId } }),
    resolveShiftForDate(userId, orgId, attendanceDate),
    db.attendanceRegularization.findUnique({
      where: { userId_date: { userId, date: attendanceDate } },
      select: { status: true },
    }),
  ]);

  if (!timeline) return null;

  const settings = {
    standardHours: otSettings?.standardHours ?? DEFAULT_OT_SETTINGS.standardHours,
    otRate: otSettings?.otRate ?? DEFAULT_OT_SETTINGS.otRate,
    graceMinutes: otSettings?.graceMinutes ?? DEFAULT_OT_SETTINGS.graceMinutes,
    compOffSlabs: Array.isArray(otSettings?.compOffSlabs)
      ? (otSettings.compOffSlabs as unknown as CompOffSlab[])
      : DEFAULT_OT_SETTINGS.compOffSlabs,
  };

  const workingCalendarConfig = calendarFromDb(
    {
      workStart: calendarSettings.workStart,
      workEnd: calendarSettings.workEnd,
      timezone: calendarSettings.timezone,
      graceMinutes: calendarSettings.graceMinutes,
      workingDays: calendarSettings.workingDays,
      breaks: calendarSettings.breaks,
    },
    holidayDateStrings,
  );
  const dateKey = toDateString(attendanceDate);
  const dayType = isWorkingDate(dateKey, workingCalendarConfig)
    ? "WORKING_DAY"
    : holidayDateStrings.includes(dateKey)
      ? "HOLIDAY"
      : "WEEKEND";

  const isRegularized = regularization?.status === "APPROVED";
  const activeShift = shift;
  const usedOrgFallback = !activeShift;
  const startTime = activeShift?.startTime ?? calendarSettings.workStart;
  const endTime = activeShift?.endTime ?? calendarSettings.workEnd;
  const expectedMinutes = dayType === "WORKING_DAY"
    ? activeShift?.expectedWorkingMinutes ?? calendarSettings.defaultWorkingMinutes
    : 0;
  const minOvertimeMinutes = activeShift?.minOvertimeMinutes ?? calendarSettings.minOvertimeMinutes;
  const graceBeforeStartMins = activeShift?.graceBeforeStartMins ?? calendarSettings.graceBeforeStartMins;
  const graceAfterEndMins = activeShift?.graceAfterEndMins ?? calendarSettings.graceAfterEndMins;
  const scheduledStart = startOfShiftOnDate(attendanceDate, startTime);
  const scheduledEnd = endOfShiftOnDate(attendanceDate, startTime, endTime);

  let calculationStatus: OvertimeComputation["calculationStatus"] = "VALID";
  const remarks: string[] = [];

  if (timeline.totalPunchCount === 1) {
    calculationStatus = "MISSING_CHECK_OUT";
    remarks.push("Only one punch record was found for this day.");
  } else if (!timeline.firstPunchAt) {
    calculationStatus = "MISSING_CHECK_IN";
    remarks.push("No valid first punch was found.");
  } else if (!timeline.lastPunchAt) {
    calculationStatus = "MISSING_CHECK_OUT";
    remarks.push("No valid last punch was found.");
  } else if (timeline.needsReview) {
    calculationStatus = "NEEDS_REVIEW";
    remarks.push(...timeline.reviewNotes);
  }

  if (dayType === "WORKING_DAY" && expectedMinutes <= 0) {
    calculationStatus = "MISSING_CONFIGURATION";
    remarks.push("No shift or organisation working-hour configuration is available.");
  }

  const differenceMinutes = timeline.workedMinutes - expectedMinutes;
  let earlyLeavingMins = 0;
  let otMinutes = 0;
  let compOffDays = 0;

  if (dayType === "WORKING_DAY") {
    if (timeline.lastPunchAt) {
      const earlyCutoff = scheduledEnd.getTime() - graceAfterEndMins * 60000;
      if (timeline.lastPunchAt.getTime() < earlyCutoff) {
        earlyLeavingMins = Math.round((scheduledEnd.getTime() - timeline.lastPunchAt.getTime()) / 60000);
      }
    }

    if (differenceMinutes > 0) {
      otMinutes = differenceMinutes >= minOvertimeMinutes ? differenceMinutes : 0;
    }
  } else if (timeline.workedMinutes > 0) {
    otMinutes = timeline.workedMinutes;
    compOffDays = pickCompOffDays(roundHours(timeline.workedMinutes), settings.compOffSlabs);
  }

  if (isRegularized) {
    if (otMinutes > 0) otMinutes = Math.floor(otMinutes * 0.25);
    if (compOffDays > 0) compOffDays = Number((compOffDays * 0.25).toFixed(2));
    remarks.push("Regularized attendance applied the 75% OT/comp-off penalty.");
  }

  if (calculationStatus === "VALID" && otMinutes <= 0) {
    calculationStatus = "NO_OVERTIME";
    remarks.push("Worked duration does not exceed the expected working duration.");
  }

  const minuteSalary = await getEmployeeMinuteSalary(userId, attendanceDate, settings);
  const otRatePerHour = otMinutes > 0 ? Number((minuteSalary * 60).toFixed(2)) : 0;
  const otAmount = otMinutes > 0
    ? Number((otMinutes * minuteSalary * settings.otRate).toFixed(2))
    : 0;

  const lateMinutes = timeline.firstPunchAt
    ? Math.max(0, Math.round((timeline.firstPunchAt.getTime() - (scheduledStart.getTime() + graceBeforeStartMins * 60000)) / 60000))
    : 0;

  return {
    dayType,
    shift: activeShift,
    usedOrgFallback,
    firstPunchAt: timeline.firstPunchAt,
    lastPunchAt: timeline.lastPunchAt,
    totalPunchCount: timeline.totalPunchCount,
    workedMinutes: timeline.workedMinutes,
    hoursWorked: roundHours(timeline.workedMinutes),
    expectedMinutes,
    differenceMinutes,
    otMinutes,
    otHours: roundHours(otMinutes),
    otRatePerHour,
    otAmount,
    compOffDays,
    earlyLeavingMins,
    calculationStatus,
    calculationRemarks: remarks.length > 0 ? remarks.join(" ") : null,
    calculationDetails: {
      breakMinutes: timeline.breakMinutes,
      reviewNotes: timeline.reviewNotes,
      timelineSource: timeline.source,
      events: timeline.events.map((event) => ({
        punchedAt: event.punchedAt.toISOString(),
        source: event.source,
        eventType: normalizeEventType(event.eventType),
        status: event.status,
        notes: event.notes,
      })),
      shift: activeShift
        ? {
            id: activeShift.id,
            name: activeShift.name,
            startTime: activeShift.startTime,
            endTime: activeShift.endTime,
          }
        : null,
      calendarFallback: {
        workStart: calendarSettings.workStart,
        workEnd: calendarSettings.workEnd,
        defaultWorkingMinutes: calendarSettings.defaultWorkingMinutes,
      },
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      lateMinutes,
      minOvertimeMinutes,
      regularized: isRegularized,
    },
  };
}

export async function ensureAttendanceConfiguration(orgId: string) {
  const calendar = await db.workingCalendar.upsert({
    where: { orgId },
    update: {},
    create: {
      orgId,
      workStart: "09:30",
      workEnd: "17:30",
      timezone: "Asia/Kolkata",
      graceMinutes: 15,
      graceBeforeStartMins: 0,
      graceAfterEndMins: 15,
      defaultWorkingMinutes: 480,
      minOvertimeMinutes: 0,
      workingDays: "1,2,3,4,5,6",
      breaks: [{ start: "13:00", end: "14:00" }],
    },
  });

  const existingShifts = await db.shift.findMany({
    where: { orgId },
    select: { id: true, isDefault: true },
  });

  if (existingShifts.length === 0) {
    await db.shift.createMany({
      data: [
        {
          orgId,
          name: "General Shift 09:30 - 17:30",
          startTime: "09:30",
          endTime: "17:30",
          expectedWorkingMinutes: 480,
          graceBeforeStartMins: 0,
          graceAfterEndMins: 15,
          minOvertimeMinutes: 0,
          workingDays: calendar.workingDays,
          breakRules: [{ start: "13:00", end: "14:00" }],
          isActive: true,
          isDefault: true,
        },
        {
          orgId,
          name: "General Shift 10:00 - 18:00",
          startTime: "10:00",
          endTime: "18:00",
          expectedWorkingMinutes: 480,
          graceBeforeStartMins: 0,
          graceAfterEndMins: 15,
          minOvertimeMinutes: 0,
          workingDays: calendar.workingDays,
          breakRules: [{ start: "13:00", end: "14:00" }],
          isActive: true,
          isDefault: false,
        },
      ],
    });
  } else if (!existingShifts.some((shift) => shift.isDefault)) {
    await db.shift.update({
      where: { id: existingShifts[0]!.id },
      data: { isDefault: true },
    });
  }
}

export async function replaceAttendancePunchEventsForDate(
  userId: string,
  orgId: string,
  date: Date,
  events: PunchEventInput[],
) {
  const attendanceDate = normalizeToISTMidnight(date);
  await db.attendancePunchEvent.deleteMany({
    where: { userId, orgId, attendanceDate },
  });

  if (events.length === 0) return;

  await db.attendancePunchEvent.createMany({
    data: events.map((event) => ({
      orgId,
      userId,
      attendanceDate,
      punchedAt: event.punchedAt,
      source: event.source,
      eventType: event.eventType,
      status: event.status ?? "VALID",
      notes: event.notes ?? null,
      deviceId: event.deviceId ?? null,
      metadata: event.metadata as any,
    })),
  });
}

export async function appendAttendancePunchEvent(
  userId: string,
  orgId: string,
  date: Date,
  event: PunchEventInput,
) {
  const attendanceDate = normalizeToISTMidnight(date);
  await db.attendancePunchEvent.create({
    data: {
      orgId,
      userId,
      attendanceDate,
      punchedAt: event.punchedAt,
      source: event.source,
      eventType: event.eventType,
      status: event.status ?? "VALID",
      notes: event.notes ?? null,
      deviceId: event.deviceId ?? null,
      metadata: event.metadata as any,
    },
  });
}

export async function calculateOtForPunch(userId: string, date: Date): Promise<boolean> {
  const attendanceDate = normalizeToISTMidnight(date);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });

  if (!user?.orgId) return false;
  const orgId = user.orgId;
  await ensureAttendanceConfiguration(orgId);

  const computation = await computeOvertimeForDate(userId, orgId, attendanceDate);
  if (!computation) {
    await db.otRecord.deleteMany({
      where: { userId, date: attendanceDate },
    });
    return false;
  }

  const approvalState = await getPersistedApprovalState(userId, attendanceDate);

  await db.otRecord.upsert({
    where: { userId_date: { userId, date: attendanceDate } },
    update: {
      shiftId: computation.shift?.id ?? null,
      dayType: computation.dayType,
      hoursWorked: computation.hoursWorked,
      otHours: computation.otHours,
      otRatePerHour: computation.otRatePerHour,
      otAmount: computation.otAmount,
      compOffDays: computation.compOffDays,
      earlyLeavingMins: computation.earlyLeavingMins,
      firstPunchAt: computation.firstPunchAt,
      lastPunchAt: computation.lastPunchAt,
      totalPunchCount: computation.totalPunchCount,
      workedMinutes: computation.workedMinutes,
      expectedMinutes: computation.expectedMinutes,
      differenceMinutes: computation.differenceMinutes,
      calculationStatus: computation.calculationStatus,
      calculationRemarks: computation.calculationRemarks,
      calculationDetails: computation.calculationDetails as any,
      usedOrgFallback: computation.usedOrgFallback,
      approvalStatus: approvalState.approvalStatus,
      approvedById: approvalState.approvedById,
      rejectionRemarks: approvalState.rejectionRemarks,
    },
    create: {
      userId,
      date: attendanceDate,
      shiftId: computation.shift?.id ?? null,
      dayType: computation.dayType,
      hoursWorked: computation.hoursWorked,
      otHours: computation.otHours,
      otRatePerHour: computation.otRatePerHour,
      otAmount: computation.otAmount,
      compOffDays: computation.compOffDays,
      earlyLeavingMins: computation.earlyLeavingMins,
      firstPunchAt: computation.firstPunchAt,
      lastPunchAt: computation.lastPunchAt,
      totalPunchCount: computation.totalPunchCount,
      workedMinutes: computation.workedMinutes,
      expectedMinutes: computation.expectedMinutes,
      differenceMinutes: computation.differenceMinutes,
      calculationStatus: computation.calculationStatus,
      calculationRemarks: computation.calculationRemarks,
      calculationDetails: computation.calculationDetails as any,
      usedOrgFallback: computation.usedOrgFallback,
      approvalStatus: approvalState.approvalStatus,
      approvedById: approvalState.approvedById,
      rejectionRemarks: approvalState.rejectionRemarks,
    },
  });

  return true;
}

export async function processMonthOt(orgId: string, monthDate: Date): Promise<{ processed: number }> {
  await ensureAttendanceConfiguration(orgId);

  const { start, end } = getAttendanceMonthBounds(
    monthDate.getUTCFullYear(),
    monthDate.getUTCMonth() + 1,
  );

  const users = await db.user.findMany({
    where: { orgId, active: true, isPlatformAdmin: false },
    select: { id: true },
  });

  if (users.length === 0) return { processed: 0 };
  const userIds = users.map((user) => user.id);

  const [rawEventKeys, punchKeys, existingOtKeys] = await Promise.all([
    db.attendancePunchEvent.findMany({
      where: {
        orgId,
        userId: { in: userIds },
        attendanceDate: { gte: start, lte: end },
      },
      select: { userId: true, attendanceDate: true },
      distinct: ["userId", "attendanceDate"],
    }),
    db.attendancePunch.findMany({
      where: {
        userId: { in: userIds },
        date: { gte: start, lte: end },
      },
      select: { userId: true, date: true },
    }),
    db.otRecord.findMany({
      where: {
        user: { orgId },
        date: { gte: start, lte: end },
      },
      select: { userId: true, date: true },
    }),
  ]);

  const keyMap = new Map<string, { userId: string; attendanceDate: Date }>();
  for (const item of rawEventKeys) {
    keyMap.set(`${item.userId}:${item.attendanceDate.toISOString()}`, {
      userId: item.userId,
      attendanceDate: item.attendanceDate,
    });
  }
  for (const item of punchKeys) {
    const attendanceDate = normalizeToISTMidnight(item.date);
    keyMap.set(`${item.userId}:${attendanceDate.toISOString()}`, {
      userId: item.userId,
      attendanceDate,
    });
  }

  const workItems = [...keyMap.values()];
  const chunkSize = 20;
  for (let index = 0; index < workItems.length; index += chunkSize) {
    const chunk = workItems.slice(index, index + chunkSize);
    await Promise.all(
      chunk.map((item) => calculateOtForPunch(item.userId, item.attendanceDate)),
    );
  }

  const validKeys = new Set(workItems.map((item) => `${item.userId}:${item.attendanceDate.toISOString()}`));
  const staleFilters = existingOtKeys
    .filter((item) => !validKeys.has(`${item.userId}:${normalizeToISTMidnight(item.date).toISOString()}`))
    .map((item) => ({
      userId: item.userId,
      date: normalizeToISTMidnight(item.date),
    }));

  if (staleFilters.length > 0) {
    await db.otRecord.deleteMany({
      where: { OR: staleFilters },
    });
  }

  return { processed: workItems.length };
}

export interface PayrollSummaryRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: number | null;
  department: string | null;
  totalOtHours: number;
  totalOtAmount: number;
  totalCompOffDays: number;
  lopDays: number;
}

export async function generatePayrollSummary(
  orgId: string,
  monthDate: Date,
): Promise<PayrollSummaryRow[]> {
  const { start: monthStart, end: monthEnd } = getAttendanceMonthBounds(
    monthDate.getUTCFullYear(),
    monthDate.getUTCMonth() + 1,
  );

  const [otRecords, lopRecords] = await Promise.all([
    db.otRecord.findMany({
      where: {
        user: { orgId },
        date: { gte: monthStart, lte: monthEnd },
        approvalStatus: "APPROVED",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
    db.employeeLop.findMany({
      where: {
        user: { orgId },
        payrollMonth: monthStart,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const summaryByUser = new Map<string, PayrollSummaryRow>();

  for (const otRecord of otRecords) {
    const current = summaryByUser.get(otRecord.userId) ?? {
      employeeId: otRecord.userId,
      employeeName: otRecord.user.name,
      employeeNumber: otRecord.user.employeeNumber,
      department: otRecord.user.department?.name ?? null,
      totalOtHours: 0,
      totalOtAmount: 0,
      totalCompOffDays: 0,
      lopDays: 0,
    };

    current.totalOtHours += otRecord.otHours;
    current.totalOtAmount += otRecord.otAmount;
    current.totalCompOffDays += otRecord.compOffDays;
    summaryByUser.set(otRecord.userId, current);
  }

  for (const lopRecord of lopRecords) {
    const current = summaryByUser.get(lopRecord.userId) ?? {
      employeeId: lopRecord.userId,
      employeeName: lopRecord.user.name,
      employeeNumber: lopRecord.user.employeeNumber,
      department: lopRecord.user.department?.name ?? null,
      totalOtHours: 0,
      totalOtAmount: 0,
      totalCompOffDays: 0,
      lopDays: 0,
    };

    current.lopDays += lopRecord.lopDays;
    summaryByUser.set(lopRecord.userId, current);
  }

  return [...summaryByUser.values()].sort((left, right) =>
    left.employeeName.localeCompare(right.employeeName),
  );
}
