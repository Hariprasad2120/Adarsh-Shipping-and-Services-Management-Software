import { db } from "@/lib/db";
import { cache } from "react";
import { tracePerformance } from "@/lib/performance";

// The DB-backed system clock is ON by default so the Time Simulation tools work
// in every environment (local, preview, production). Set ENABLE_SYSTEM_CLOCK
// to "false" to opt out and skip the per-request lookup entirely.
const isSystemClockDisabled = process.env.ENABLE_SYSTEM_CLOCK === "false";

async function readFrozenAt(): Promise<Date | null> {
  try {
    const row = await db.systemClock.findUnique({ where: { id: "global" } });
    return row?.frozenAt ? new Date(row.frozenAt) : null;
  } catch {
    // Table missing / DB unreachable — fall back to real time rather than 500.
    return null;
  }
}

// Memoized per-request so repeated getNow() calls cost a single lookup.
export const getNow = cache(async (): Promise<Date> => {
  if (isSystemClockDisabled) {
    return new Date();
  }

  return tracePerformance("clock:getNow:systemClock", async () => {
    return (await readFrozenAt()) ?? new Date();
  });
});

export async function getClockState(): Promise<{ frozenAt: Date | null }> {
  if (isSystemClockDisabled) {
    return { frozenAt: null };
  }

  const frozenAt = await tracePerformance("clock:getClockState", () =>
    readFrozenAt(),
  );
  return { frozenAt };
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
