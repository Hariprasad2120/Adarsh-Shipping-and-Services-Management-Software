import { db } from "@/lib/db";

function* eachDate(from: Date, to: Date): Generator<Date> {
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cursor <= end) {
    yield new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

/**
 * Marks each date covered by an approved leave request as AttendancePunch.status
 * = "LEAVE" (or "HALF_DAY" for a half-day request). AttendancePunch already
 * has this status value in its vocabulary (see MONOLITH_INTEGRATION_AUDIT.md
 * §2.3) but no code previously wrote it from the leave approval flow —
 * this closes that gap. Never overwrites a PRESENT day with real punch data;
 * only sets LEAVE on days with no existing in/out punches.
 */
export async function applyLeaveToAttendance(input: {
  userId: string;
  fromDate: Date;
  toDate: Date;
  halfDay: boolean;
}) {
  let updated = 0;
  for (const date of eachDate(input.fromDate, input.toDate)) {
    const existing = await db.attendancePunch.findUnique({
      where: { userId_date: { userId: input.userId, date } },
    });

    if (existing?.inAt || existing?.outAt) {
      // Real punch data already exists for this date — don't overwrite it.
      continue;
    }

    await db.attendancePunch.upsert({
      where: { userId_date: { userId: input.userId, date } },
      update: { status: input.halfDay ? "HALF_DAY" : "LEAVE" },
      create: {
        userId: input.userId,
        date,
        status: input.halfDay ? "HALF_DAY" : "LEAVE",
        source: "manual",
      },
    });
    updated++;
  }
  return { datesUpdated: updated };
}

/**
 * Reverses the LEAVE status marking when a request is cancelled — only
 * clears the status if it's still LEAVE/HALF_DAY (never touches a day that
 * was subsequently regularized with real punch data or a different status).
 */
export async function removeLeaveFromAttendance(input: { userId: string; fromDate: Date; toDate: Date }) {
  let cleared = 0;
  for (const date of eachDate(input.fromDate, input.toDate)) {
    const existing = await db.attendancePunch.findUnique({
      where: { userId_date: { userId: input.userId, date } },
    });
    if (existing && (existing.status === "LEAVE" || existing.status === "HALF_DAY") && !existing.inAt && !existing.outAt) {
      await db.attendancePunch.update({ where: { id: existing.id }, data: { status: null } });
      cleared++;
    }
  }
  return { datesCleared: cleared };
}
