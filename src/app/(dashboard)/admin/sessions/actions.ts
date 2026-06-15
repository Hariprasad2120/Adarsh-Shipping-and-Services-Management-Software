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

export async function saveTimeoutAction(minutes: number) {
  await requireAdmin();
  
  await db.systemSetting.upsert({
    where: { key: "SESSION_TIMEOUT_MINUTES" },
    update: { value: String(minutes) },
    create: { key: "SESSION_TIMEOUT_MINUTES", value: String(minutes) },
  });

  revalidatePath("/admin/sessions");
}
