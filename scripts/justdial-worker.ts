import { db } from "../src/lib/db";

const TICK_INTERVAL_MS = 30_000;
const scheduleIntervals: Record<string, number> = {
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
};

let tickRunning = false;
let stopping = false;

async function tick() {
  if (tickRunning || stopping) return;
  tickRunning = true;

  try {
    const configs = await db.crmLeadSourceJustdialConfig.findMany({
      where: { isActive: true, importMode: "SCHEDULED" },
    });

    for (const config of configs) {
      if (stopping || config.isImporting) continue;
      const intervalMs = scheduleIntervals[config.scheduleInterval] ?? 60 * 60_000;
      const lastSyncedAt = config.lastSyncedAt?.getTime() ?? 0;
      if (Date.now() - lastSyncedAt < intervalMs) continue;

      const { createImportLog, setImportingLock } = await import(
        "../src/modules/crm/lead-source.service"
      );
      const { runJustdialImport } = await import(
        "../src/modules/crm/justdial-import.service"
      );

      try {
        await setImportingLock(config.orgId, true);
        const log = await createImportLog(config.orgId);
        await runJustdialImport(config.orgId, config.defaultOwnerId, log.id);
      } catch (error) {
        console.error(`[Justdial worker] Import failed for org ${config.orgId}`, error);
      } finally {
        await setImportingLock(config.orgId, false);
      }
    }
  } catch (error) {
    console.error("[Justdial worker] Scheduled tick failed", error);
  } finally {
    tickRunning = false;
  }
}

const timer = setInterval(() => void tick(), TICK_INTERVAL_MS);
timer.unref();
console.log("[Justdial worker] Started (30 second schedule check)");
void tick();

async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  console.log(`[Justdial worker] ${signal} received; shutting down`);

  while (tickRunning) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await db.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
