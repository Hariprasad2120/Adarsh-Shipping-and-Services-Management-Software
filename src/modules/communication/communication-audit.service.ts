"use server";

import { db } from "@/lib/db";

export async function createCommunicationAuditLog(
  orgId: string,
  userId: string,
  action: string,
  details?: Record<string, any>
) {
  return db.communicationAuditLog.create({
    data: {
      orgId,
      userId,
      action,
      details: details ? JSON.stringify(details) : null,
    },
  });
}

export async function listCommunicationAuditLogs(
  userId: string,
  orgId: string,
  filters: {
    targetUserId?: string;
    actionType?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const whereClause: any = { orgId };

  if (filters.targetUserId) {
    whereClause.userId = filters.targetUserId;
  }
  if (filters.actionType) {
    whereClause.action = filters.actionType;
  }

  const [logs, total] = await Promise.all([
    db.communicationAuditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.communicationAuditLog.count({ where: whereClause }),
  ]);

  return { logs, total };
}
