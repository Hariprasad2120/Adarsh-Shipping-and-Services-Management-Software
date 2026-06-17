import { db } from "@/lib/db";

export async function getNow(): Promise<Date> {
  const row = await db.systemClock.findUnique({ where: { id: "global" } });
  return row?.frozenAt ? new Date(row.frozenAt) : new Date();
}

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
