"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  await requirePermission(session.user.id, "admin.org.manage");
  return session;
}

export async function getActiveSessionsAction() {
  const session = await requireAdmin();
  const orgId = session.user.orgId;

  const renderNow = new Date();
  const cutoff = new Date(renderNow);
  cutoff.setMinutes(cutoff.getMinutes() - 2);

  const activeSessions = await db.userSession.findMany({
    where: { 
      status: "ACTIVE", 
      lastSeenAt: { gte: cutoff },
      user: { orgId }
    },
    include: { 
      user: { 
        select: { 
          id: true, 
          name: true, 
          email: true, 
          roles: { 
            include: { 
              role: true 
            } 
          } 
        } 
      } 
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return activeSessions.map((s) => ({
    id: s.id,
    userId: s.userId,
    userName: s.user.name,
    userEmail: s.user.email,
    userRole: s.user.roles[0]?.role.name ?? "Employee",
    loginAt: s.loginAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    ipAddress: s.ipAddress,
    location: s.location,
    durationMs: s.lastSeenAt.getTime() - s.loginAt.getTime(),
  }));
}

/** Force-logout a single session (admin). Audit-logged. */
export async function adminRevokeSessionAction(sessionId: string) {
  const session = await requireAdmin();
  const { revokeSessionById } = await import("@/lib/session-service");

  const target = await db.userSession.findUnique({
    where: { id: sessionId },
    select: { user: { select: { orgId: true } } },
  });
  if (!target || target.user.orgId !== session.user.orgId) {
    return { ok: false as const, error: "Session not found" };
  }

  await revokeSessionById({
    sessionId,
    actorUserId: session.user.id,
    reason: "ADMIN_REVOKED",
    byAdmin: true,
  });
  revalidatePath("/admin/sessions");
  return { ok: true as const };
}

/** Force-logout ALL sessions of a user (admin). Audit-logged. */
export async function adminRevokeAllUserSessionsAction(userId: string) {
  const session = await requireAdmin();
  const { revokeAllSessionsForUser } = await import("@/lib/session-service");

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });
  if (!target || target.orgId !== session.user.orgId) {
    return { ok: false as const, error: "User not found" };
  }

  const count = await revokeAllSessionsForUser({
    userId,
    actorUserId: session.user.id,
    reason: "ADMIN_REVOKED",
  });
  revalidatePath("/admin/sessions");
  return { ok: true as const, count };
}

export async function saveTimeoutAction(minutes: number) {
  await requireAdmin();
  
  await db.systemSetting.upsert({
    where: { key: "SESSION_TIMEOUT_MINUTES" },
    update: { value: String(minutes) },
    create: { key: "SESSION_TIMEOUT_MINUTES", value: String(minutes) },
  });

  revalidatePath("/admin/sessions");
}
