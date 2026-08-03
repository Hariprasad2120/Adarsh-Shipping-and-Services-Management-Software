import { ForbiddenError, requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function getActorOrgId(actorId: string) {
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { orgId: true, active: true },
  });

  if (!actor?.orgId || !actor.active) {
    throw new ForbiddenError("cha.access");
  }

  return actor.orgId;
}

export async function requireCustomsMasterPermission(actorId: string, permission: string) {
  await requirePermission(actorId, permission);
  return getActorOrgId(actorId);
}
