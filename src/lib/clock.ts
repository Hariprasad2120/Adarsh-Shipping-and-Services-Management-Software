import { db } from "@/lib/db";
import { cache } from "react";
import { tracePerformance } from "@/lib/performance";

const isSystemClockEnabled = process.env.ENABLE_SYSTEM_CLOCK === "true";

// Memoized per-request only when the DB-backed system clock is explicitly enabled.
export const getNow = cache(async (): Promise<Date> => {
  if (!isSystemClockEnabled) {
    return new Date();
  }

  return tracePerformance("clock:getNow:systemClock", async () => {
    const row = await db.systemClock.findUnique({ where: { id: "global" } });
    return row?.frozenAt ? new Date(row.frozenAt) : new Date();
  });
});

export async function getClockState(): Promise<{ frozenAt: Date | null }> {
  if (!isSystemClockEnabled) {
    return { frozenAt: null };
  }

  const row = await tracePerformance("clock:getClockState", () =>
    db.systemClock.findUnique({ where: { id: "global" } }),
  );
  return { frozenAt: row?.frozenAt ?? null };
}

export async function setFrozenDate(date: Date | null): Promise<void> {
  await tracePerformance("clock:setFrozenDate", () =>
    db.systemClock.upsert({
      where: { id: "global" },
      update: { frozenAt: date },
      create: { id: "global", frozenAt: date },
    }),
  );
}
