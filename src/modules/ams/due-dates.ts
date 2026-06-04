export type AppraisalKind = "INTERMEDIATE" | "ANNUAL";

export function addBusinessDays(startDate: Date, days: number, holidayISOSet: Set<string> = new Set()): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    const iso = result.toISOString().split("T")[0];
    if (dow !== 0 && dow !== 6 && !holidayISOSet.has(iso)) added++;
  }
  return result;
}

export type DueSlot = {
  dueDate: Date;
  kind: AppraisalKind;
  cycleIndex: number; // 1-based; INTERMEDIATE = 0
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function computeSchedule(
  joinDate: Date,
  priorExperienceYears: number,
  horizonYears = 10
): DueSlot[] {
  const fresher = !priorExperienceYears || priorExperienceYears <= 0;
  const slots: DueSlot[] = [];

  if (fresher) {
    slots.push({ dueDate: addMonths(joinDate, 6), kind: "INTERMEDIATE", cycleIndex: 0 });
  }

  for (let i = 1; i <= horizonYears; i++) {
    slots.push({ dueDate: addMonths(joinDate, 12 * i), kind: "ANNUAL", cycleIndex: i });
  }

  return slots;
}

export function dueInMonth(
  joinDate: Date,
  priorExperienceYears: number,
  year: number,
  month: number // 0-based (JS Date.getMonth())
): DueSlot | null {
  const schedule = computeSchedule(joinDate, priorExperienceYears, 50);
  return (
    schedule.find(
      (s) => s.dueDate.getFullYear() === year && s.dueDate.getMonth() === month
    ) ?? null
  );
}

export function dueOnDate(
  joinDate: Date,
  priorExperienceYears: number,
  date: Date
): DueSlot | null {
  const schedule = computeSchedule(joinDate, priorExperienceYears, 50);
  return (
    schedule.find(
      (s) =>
        s.dueDate.getFullYear() === date.getFullYear() &&
        s.dueDate.getMonth() === date.getMonth() &&
        s.dueDate.getDate() === date.getDate()
    ) ?? null
  );
}
