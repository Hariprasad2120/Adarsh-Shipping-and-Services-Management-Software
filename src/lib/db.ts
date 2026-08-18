// Bump this when Prisma schema changes need a fresh dev-time singleton.
const PRISMA_CLIENT_SCHEMA_VERSION = "2026-08-18-leave-external-calendar-sync";

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolClient, type PoolConfig } from "pg";
import { recordDatabaseQuery } from "@/lib/request-performance";

type PoolMetrics = {
  poolSize: number;
  peakCheckedOutConnections: number;
  peakQueuedQueries: number;
  acquireCount: number;
  poolWaitMs: number;
  queryCount: number;
  databaseQueryMs: number;
};

const poolMetrics: PoolMetrics = {
  poolSize: 0,
  peakCheckedOutConnections: 0,
  peakQueuedQueries: 0,
  acquireCount: 0,
  poolWaitMs: 0,
  queryCount: 0,
  databaseQueryMs: 0,
};

class InstrumentedPool extends Pool {
  connect(): Promise<PoolClient>;
  connect(
    callback: (
      error: Error | undefined,
      client: PoolClient | undefined,
      done: (release?: unknown) => void,
    ) => void,
  ): void;
  connect(
    callback?: (
      error: Error | undefined,
      client: PoolClient | undefined,
      done: (release?: unknown) => void,
    ) => void,
  ): Promise<PoolClient> | void {
    const startedAt = performance.now();
    const queuedAtStart = this.idleCount === 0 && this.totalCount >= this.options.max;
    poolMetrics.peakQueuedQueries = Math.max(
      poolMetrics.peakQueuedQueries,
      this.waitingCount + (this.idleCount === 0 && this.totalCount >= this.options.max ? 1 : 0),
    );

    const record = () => {
      const waitMs = performance.now() - startedAt;
      poolMetrics.acquireCount += 1;
      if (queuedAtStart) poolMetrics.poolWaitMs += waitMs;
      poolMetrics.peakCheckedOutConnections = Math.max(
        poolMetrics.peakCheckedOutConnections,
        this.totalCount - this.idleCount,
      );
      if (process.env.PERF_DB_METRICS === "true") {
        console.log(JSON.stringify({
          type: "database-pool-acquire",
          poolSize: poolMetrics.poolSize,
          acquireMs: Number(waitMs.toFixed(3)),
          poolWaitMs: queuedAtStart ? Number(waitMs.toFixed(3)) : 0,
          checkedOut: this.totalCount - this.idleCount,
          queued: this.waitingCount,
        }));
      }
    };

    if (callback) {
      return super.connect((error, client, done) => {
        record();
        callback(error, client, done);
      });
    }

    return super.connect().then((client) => {
      record();
      return client;
    });
  }
}

export function getDatabasePoolMetrics() {
  return { ...poolMetrics };
}

function createPrismaClient() {
  const isServerless = Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV,
  );
  // Serverless instances stay at one connection. Local development starts at
  // twelve; long-running production containers use a conservative nine.
  const defaultPoolSize = isServerless
    ? 1
    : process.env.NODE_ENV === "production"
      ? 9
      : 12;
  const poolSize = process.env.DB_POOL_SIZE ? Number(process.env.DB_POOL_SIZE) : defaultPoolSize;
  if (!Number.isInteger(poolSize) || poolSize < 1) {
    throw new Error("DB_POOL_SIZE must be a positive integer");
  }
  poolMetrics.poolSize = poolSize;
  const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL!,
    max: poolSize,
  };
  const adapter = new PrismaPg(new InstrumentedPool(poolConfig));
  const client = new PrismaClient({
    adapter,
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
    ],
  });
  client.$on("query", (event) => {
    poolMetrics.queryCount += 1;
    poolMetrics.databaseQueryMs += event.duration;
    recordDatabaseQuery(event);
    if (process.env.PRISMA_QUERY_LOGS === "true") {
      console.log(JSON.stringify({
        type: "database-query",
        durationMs: event.duration,
        relation:
          event.query.match(
            /(?:FROM|JOIN|INTO|UPDATE)\s+(?:"[^"]+"\.)?"([^"]+)"/i,
          )?.[1] ?? "transaction",
        statement: event.query.slice(0, 160).replace(/\s+/g, " "),
      }));
    }
  });
  return client;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

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
  chaJobDeletionRequest?: unknown;
  googleChatInteractionEvent?: unknown;
  employeeHrmsProfile?: unknown;
  employeeProfileField?: unknown;
  accountingCapabilityPolicy?: unknown;
  accountingItemMaster?: unknown;
  recurringSalesInvoiceProfile?: unknown;
  recurringSalesInvoiceRun?: unknown;
  accountingCustomerAdvanceRequest?: unknown;
  accountingCustomerAdvanceReceipt?: unknown;
  recurringExpenseRun?: unknown;
  accountingCustomFieldDefinition?: unknown;
  accountingAutomationRule?: unknown;
  accountingWorkspaceModule?: unknown;
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
    typeof delegateClient.chaTeamGroup !== "undefined" &&
    typeof delegateClient.chaJobDeletionRequest !== "undefined" &&
    typeof delegateClient.googleChatInteractionEvent !== "undefined" &&
    typeof delegateClient.employeeHrmsProfile !== "undefined" &&
    typeof delegateClient.employeeProfileField !== "undefined" &&
    typeof delegateClient.accountingCapabilityPolicy !== "undefined" &&
    typeof delegateClient.accountingItemMaster !== "undefined" &&
    typeof delegateClient.recurringSalesInvoiceProfile !== "undefined" &&
    typeof delegateClient.recurringSalesInvoiceRun !== "undefined" &&
    typeof delegateClient.accountingCustomerAdvanceRequest !== "undefined" &&
    typeof delegateClient.accountingCustomerAdvanceReceipt !== "undefined" &&
    typeof delegateClient.recurringExpenseRun !== "undefined" &&
    typeof delegateClient.accountingCustomFieldDefinition !== "undefined" &&
    typeof delegateClient.accountingAutomationRule !== "undefined" &&
    typeof delegateClient.accountingWorkspaceModule !== "undefined"
  );
}

const existingPrisma = globalForPrisma.prisma;
const hasCurrentSchemaVersion = globalForPrisma.prismaSchemaVersion === PRISMA_CLIENT_SCHEMA_VERSION;
const shouldRefreshPrisma =
  existingPrisma && (!hasRequiredDelegates(existingPrisma) || !hasCurrentSchemaVersion);

// When refreshing due to stale delegates, save the new client to the global
// so subsequent module evaluations reuse it instead of creating new connections.
export const db = shouldRefreshPrisma
  ? (() => {
      const c = createPrismaClient();
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = c;
        globalForPrisma.prismaSchemaVersion = PRISMA_CLIENT_SCHEMA_VERSION;
      }
      return c;
    })()
  : (existingPrisma ?? createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaSchemaVersion = PRISMA_CLIENT_SCHEMA_VERSION;
}

