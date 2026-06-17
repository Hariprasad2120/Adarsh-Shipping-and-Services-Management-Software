const ATTENDANCE_TIME_ZONE = "Asia/Kolkata";

function formatPart(value: number): string {
  return String(value).padStart(2, "0");
}

export function toAttendanceDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getAttendanceDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
  dateString: string;
} {
  const dateString = toAttendanceDateString(date);
  const [year, month, day] = dateString.split("-").map(Number);
  return {
    year: year!,
    month: month!,
    day: day!,
    dateString,
  };
}

export function toAttendanceDate(date: Date): Date {
  const { year, month, day } = getAttendanceDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export function attendanceDateFromParts(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export function getAttendanceDayBounds(date: Date): {
  date: Date;
  start: Date;
  end: Date;
  dateString: string;
} {
  const { year, month, day, dateString } = getAttendanceDateParts(date);
  const start = attendanceDateFromParts(year, month, day);
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return { date: start, start, end, dateString };
}

export function getAttendanceMonthBounds(year: number, month: number): {
  start: Date;
  end: Date;
  endExclusive: Date;
} {
  const start = attendanceDateFromParts(year, month, 1);
  const end = new Date(Date.UTC(year, month, 0, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end, endExclusive };
}

export function getEsslDayWindow(date: Date): {
  start: Date;
  end: Date;
  dateString: string;
  year: number;
  month: number;
  day: number;
} {
  const { year, month, day, dateString } = getAttendanceDateParts(date);
  return {
    year,
    month,
    day,
    dateString,
    start: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)),
  };
}

export function getEsslMonthWindow(year: number, month: number): {
  start: Date;
  end: Date;
  endExclusive: Date;
  monthString: string;
} {
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    endExclusive: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
    monthString: `${year}-${formatPart(month)}`,
  };
}
