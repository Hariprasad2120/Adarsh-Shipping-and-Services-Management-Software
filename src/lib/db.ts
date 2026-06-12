import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
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
};

function hasRequiredDelegates(client: PrismaClient) {
  const delegateClient = client as PrismaClientWithDelegates;
  return (
    typeof delegateClient.appraisalSelfTemplate !== "undefined" &&
    typeof delegateClient.appraisalSchedule !== "undefined" &&
    typeof delegateClient.todoTask !== "undefined" &&
    typeof delegateClient.todoSubtask !== "undefined"
  );
}

const existingPrisma = globalForPrisma.prisma;
const shouldRefreshPrisma = existingPrisma && !hasRequiredDelegates(existingPrisma);

export const db = shouldRefreshPrisma
  ? createPrismaClient()
  : (existingPrisma ?? createPrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
