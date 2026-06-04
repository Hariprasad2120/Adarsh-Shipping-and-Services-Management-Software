import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function hasSelfTemplateDelegate(client: PrismaClient) {
  return typeof (client as PrismaClient & { appraisalSelfTemplate?: unknown }).appraisalSelfTemplate !== "undefined";
}

const existingPrisma = globalForPrisma.prisma;
const shouldRefreshPrisma = existingPrisma && !hasSelfTemplateDelegate(existingPrisma);

export const db = shouldRefreshPrisma
  ? createPrismaClient()
  : (existingPrisma ?? createPrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
