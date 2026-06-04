import { db } from "@/lib/db";
import { cache } from "react";

const readClockRow = cache(async () => {
  return db.systemClock.findUnique({ where: { id: "global" } });
});

export async function getNow(): Promise<Date> {
  const row = await readClockRow();
  return row?.frozenAt ? new Date(row.frozenAt) : new Date();
}

export async function getClockState(): Promise<{ frozenAt: Date | null }> {
  const row = await readClockRow();
  return { frozenAt: row?.frozenAt ?? null };
}

export async function setFrozenDate(date: Date | null): Promise<void> {
  await db.systemClock.upsert({
    where: { id: "global" },
    update: { frozenAt: date },
    create: { id: "global", frozenAt: date },
  });
}
