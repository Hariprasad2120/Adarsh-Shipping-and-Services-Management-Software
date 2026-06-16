import { db } from "@/lib/db";

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
