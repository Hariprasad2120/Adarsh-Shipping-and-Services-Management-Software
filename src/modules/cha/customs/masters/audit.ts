import { db } from "@/lib/db";

export async function logCustomsMasterAudit(params: {
  orgId: string;
  actorId: string;
  masterType: string;
  entityId: string;
  event: string;
  prevState?: unknown;
  newState?: unknown;
  remarks?: string;
  metadata?: unknown;
}) {
  return db.chaAuditLog.create({
    data: {
      orgId: params.orgId,
      actorId: params.actorId,
      entityType: `CHA_CUSTOMS_MASTER:${params.masterType}`,
      entityId: params.entityId,
      event: params.event,
      prevState: params.prevState === undefined ? undefined : JSON.stringify(params.prevState),
      newState: params.newState === undefined ? undefined : JSON.stringify(params.newState),
      remarks: params.remarks,
      metadata: params.metadata === undefined ? undefined : JSON.stringify(params.metadata),
    },
  });
}
