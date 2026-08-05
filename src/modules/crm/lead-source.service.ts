import { db } from "@/lib/db";

const DEFAULT_LEAD_SOURCES = [
  "Cold Call",
  "Web Site",
  "Partner Referral",
  "Employee Referral",
  "Trade Show",
  "External Agency",
  "Existing Client",
  "Web Enquiry",
] as const;

export async function ensureDefaultLeadSources(orgId: string) {
  const existing = await db.crmLeadSource.count({
    where: { orgId },
  });

  if (existing > 0) {
    return;
  }

  await db.crmLeadSource.createMany({
    data: DEFAULT_LEAD_SOURCES.map((name) => ({
      orgId,
      name,
      isActive: true,
      isSystem: true,
    })),
    skipDuplicates: true,
  });
}

export async function listActiveLeadSources(orgId: string) {
  await ensureDefaultLeadSources(orgId);

  return db.crmLeadSource.findMany({
    where: {
      orgId,
      isActive: true,
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      isSystem: true,
    },
  });
}

export async function getJustdialConfig(orgId: string) {
  return db.crmLeadSourceJustdialConfig.findFirst({
    where: { orgId },
    include: {
      defaultOwner: { select: { id: true, name: true } }
    }
  });
}

export async function saveJustdialConfig(orgId: string, data: {
  dashboardUrl: string;
  importMode: string;
  scheduleInterval: string;
  maxLeads: number;
  duplicateHandling: string;
  defaultOwnerId: string;
  defaultStage: string;
  cookiesJson?: string | null;
  isActive?: boolean;
}) {
  return db.crmLeadSourceJustdialConfig.upsert({
    where: { orgId },
    update: data,
    create: {
      orgId,
      ...data
    }
  });
}

export async function setImportingLock(orgId: string, isImporting: boolean) {
  return db.crmLeadSourceJustdialConfig.updateMany({
    where: { orgId },
    data: { isImporting }
  });
}

export async function getImportLogs(orgId: string, limit = 50) {
  return db.crmLeadImportLog.findMany({
    where: { orgId, source: "JUSTDIAL" },
    orderBy: { startedAt: "desc" },
    take: limit
  });
}

export async function createImportLog(orgId: string) {
  return db.crmLeadImportLog.create({
    data: {
      orgId,
      source: "JUSTDIAL",
      startedAt: new Date(),
      status: "RUNNING",
    }
  });
}

export async function updateImportLog(
  logId: string,
  data: {
    status: string;
    totalScanned?: number;
    newLeads?: number;
    updatedLeads?: number;
    failedLeads?: number;
    errorMessage?: string | null;
  }
) {
  return db.crmLeadImportLog.update({
    where: { id: logId },
    data: {
      ...data,
      completedAt: new Date()
    }
  });
}
