// Trigger recompilation after schema updates: 2026-06-20-v4
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  // On Vercel serverless each function instance creates its own connection.
  // max:1 ensures we never open more connections than the instance needs.
  // For long-running containers (Docker/Railway) increase via DB_POOL_SIZE.
  const poolSize = process.env.DB_POOL_SIZE ? Number(process.env.DB_POOL_SIZE) : 1;
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: poolSize,
  });
  return new PrismaClient({
    adapter,
    log: process.env.PRISMA_QUERY_LOGS === "true" ? ["query", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

type PrismaClientWithDelegates = PrismaClient & {
  appraisalSelfTemplate?: unknown;
  appraisalSchedule?: unknown;
  todoTask?: unknown;
  todoSubtask?: unknown;
  crmLead?: unknown;
  account?: unknown;
  transactionLock?: unknown;
  crmWorkTimeLog?: unknown;
  chaTeamGroup?: unknown;
};

function hasRequiredDelegates(client: PrismaClient) {
  const delegateClient = client as PrismaClientWithDelegates;
  return (
    typeof delegateClient.appraisalSelfTemplate !== "undefined" &&
    typeof delegateClient.appraisalSchedule !== "undefined" &&
    typeof delegateClient.todoTask !== "undefined" &&
    typeof delegateClient.todoSubtask !== "undefined" &&
    typeof delegateClient.crmLead !== "undefined" &&
    typeof delegateClient.account !== "undefined" &&
    typeof delegateClient.transactionLock !== "undefined" &&
    typeof delegateClient.crmWorkTimeLog !== "undefined" &&
    typeof delegateClient.chaTeamGroup !== "undefined"
  );
}

const existingPrisma = globalForPrisma.prisma;
const shouldRefreshPrisma = existingPrisma && !hasRequiredDelegates(existingPrisma);

export const db = shouldRefreshPrisma
  ? createPrismaClient()
  : (existingPrisma ?? createPrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Background Scheduler for Justdial Importer
const globalForScheduler = globalThis as unknown as { justdialSchedulerStarted?: boolean };
const shouldStartJustdialScheduler =
  process.env.NODE_ENV === "development" && !process.env.VERCEL;

if (shouldStartJustdialScheduler && !globalForScheduler.justdialSchedulerStarted) {
  globalForScheduler.justdialSchedulerStarted = true;
  console.log("[Justdial Scheduler] Starting local background scheduler loop (checks every 30 seconds)...");

  // Start the background interval
  setInterval(async () => {
    try {
      // Query active scheduled configs
      const configs = await db.crmLeadSourceJustdialConfig.findMany({
        where: {
          isActive: true,
          importMode: "SCHEDULED",
        },
      });

      for (const config of configs) {
        if (config.isImporting) {
          continue;
        }

        // Calculate interval in ms
        let intervalMs = 60 * 60 * 1000; // default 1h
        if (config.scheduleInterval === "5m") {
          intervalMs = 5 * 60 * 1000;
        } else if (config.scheduleInterval === "15m") {
          intervalMs = 15 * 60 * 1000;
        } else if (config.scheduleInterval === "30m") {
          intervalMs = 30 * 60 * 1000;
        } else if (config.scheduleInterval === "1h") {
          intervalMs = 60 * 60 * 1000;
        }

        const lastSynced = config.lastSyncedAt ? new Date(config.lastSyncedAt).getTime() : 0;
        const now = Date.now();

        if (now - lastSynced >= intervalMs) {
          console.log(`[Justdial Scheduler] Config for org ${config.orgId} is due. Triggering import...`);

          // Dynamically import to avoid circular dependency
          const { runJustdialImport } = await import("../modules/crm/justdial-import.service");
          const { setImportingLock, createImportLog } = await import("../modules/crm/lead-source.service");

          // Run asynchronously in background
          (async () => {
            let logId = "";
            try {
              await setImportingLock(config.orgId, true);
              const log = await createImportLog(config.orgId);
              logId = log.id;
              await runJustdialImport(config.orgId, config.defaultOwnerId, logId);
            } catch (err: any) {
              console.error(`[Justdial Scheduler] Background import failed for org ${config.orgId}:`, err);
            } finally {
              await setImportingLock(config.orgId, false);
            }
          })();
        }
      }
    } catch (err) {
      console.error("[Justdial Scheduler] Error checking scheduled configs:", err);
    }
  }, 30000); // check every 30 seconds
}

