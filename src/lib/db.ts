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

type RuntimeModel = {
  fields?: Array<{ name?: string }> | Record<string, unknown>;
};

type PrismaClientWithDelegates = PrismaClient & {
  appraisalSelfTemplate?: unknown;
  appraisalSchedule?: unknown;
  todoTask?: unknown;
  todoSubtask?: unknown;
  crmLead?: unknown;
  _runtimeDataModel?: {
    models?: Record<string, RuntimeModel>;
  };
};

function runtimeModelHasField(model: RuntimeModel | undefined, fieldName: string) {
  if (!model?.fields) return false;

  if (Array.isArray(model.fields)) {
    return model.fields.some((field) => field?.name === fieldName);
  }

  return Object.prototype.hasOwnProperty.call(model.fields, fieldName);
}

function hasRequiredCrmLeadFields(client: PrismaClient) {
  const runtimeClient = client as PrismaClientWithDelegates;
  const crmLeadModel =
    runtimeClient._runtimeDataModel?.models?.CrmLead ??
    runtimeClient._runtimeDataModel?.models?.crmLead;

  return (
    runtimeModelHasField(crmLeadModel, "owner") &&
    runtimeModelHasField(crmLeadModel, "crmExternalLead")
  );
}

function hasRequiredDelegates(client: PrismaClient) {
  const delegateClient = client as PrismaClientWithDelegates;
  return (
    typeof delegateClient.appraisalSelfTemplate !== "undefined" &&
    typeof delegateClient.appraisalSchedule !== "undefined" &&
    typeof delegateClient.todoTask !== "undefined" &&
    typeof delegateClient.todoSubtask !== "undefined" &&
    typeof delegateClient.crmLead !== "undefined"
  );
}

const existingPrisma = globalForPrisma.prisma;
const shouldRefreshPrisma =
  existingPrisma &&
  (!hasRequiredDelegates(existingPrisma) || !hasRequiredCrmLeadFields(existingPrisma));

if (shouldRefreshPrisma) {
  void existingPrisma.$disconnect().catch(() => undefined);
}

export const db = shouldRefreshPrisma
  ? createPrismaClient()
  : (existingPrisma ?? createPrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
