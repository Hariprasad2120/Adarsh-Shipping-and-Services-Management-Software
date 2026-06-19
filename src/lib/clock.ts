import { db } from "@/lib/db";
import { cache } from "react";

// Memoized per-request: the SystemClock row rarely changes, so one DB call per
// request is sufficient. In normal production the clock is never frozen and the
// query returns null instantly, but deduplicating it still saves 5-10 round trips
// on pages that call getNow() inside multiple service functions.
export const getNow = cache(async (): Promise<Date> => {
  const row = await db.systemClock.findUnique({ where: { id: "global" } });
  return row?.frozenAt ? new Date(row.frozenAt) : new Date();
});

export async function getClockState(): Promise<{ frozenAt: Date | null }> {
  const row = await db.systemClock.findUnique({ where: { id: "global" } });
  return { frozenAt: row?.frozenAt ?? null };
}

export async function setFrozenDate(date: Date | null): Promise<void> {
  await db.systemClock.upsert({
    where: { id: "global" },
    update: { frozenAt: date },
    create: { id: "global", frozenAt: date },
  });
}
